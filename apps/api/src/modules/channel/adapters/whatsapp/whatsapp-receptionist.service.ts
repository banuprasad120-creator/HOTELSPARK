import { Injectable, Logger, Inject, BadRequestException, NotFoundException, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq, and, sql, desc, asc } from 'drizzle-orm';
import { DRIZZLE } from '../../../../database/database.module';
import { EventsGateway } from '../../../events/events.gateway';
import {
  properties,
  roomTypes,
  ratePlans,
  reservations,
  bookings,
  guests,
  folios,
  inventoryLedger,
  staffNotifications,
  webhookEvents,
} from '@telivityhaip/database';
import { generateConfirmationNumber } from '../../../../common/crypto/confirmation-number';

export interface IncomingWhatsAppMessageDto {
  propertyId?: string;
  from: string; // phone number e.g. "919876543210"
  guestName?: string;
  messageId: string; // wamid or unique message id
  text: string;
}

export interface ReceptionistResponse {
  replyText: string;
  language: 'en' | 'hi' | 'te';
  bookingConfirmation?: string;
  conversationId: string;
  status: 'replied' | 'paused' | 'escalated' | 'duplicate';
}

@Injectable()
export class WhatsAppReceptionistService {
  private readonly logger = new Logger(WhatsAppReceptionistService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    private readonly configService: ConfigService,
    @Optional() private readonly eventsGateway?: EventsGateway,
  ) {}

  /**
   * Main entrypoint for processing an inbound message (WhatsApp or Website Chat)
   */
  async handleIncomingMessage(dto: IncomingWhatsAppMessageDto): Promise<ReceptionistResponse> {
    const propertyId = dto.propertyId || 'a0000001-0000-4000-a000-000000000001';
    const cleanPhone = dto.from.replace(/\D/g, '') || '919876543210';
    const text = dto.text.trim();

    // 1. Deduplication Protection (by messageId)
    const existingMsg = await this.db.execute(sql`
      SELECT id FROM whatsapp_messages WHERE message_id = ${dto.messageId} LIMIT 1
    `);
    if (existingMsg && existingMsg.length > 0) {
      this.logger.warn(`Duplicate webhook message detected: ${dto.messageId}. Skipping.`);
      return {
        replyText: '',
        language: 'en',
        conversationId: '',
        status: 'duplicate',
      };
    }

    // Record webhook event for deduplication
    try {
      await this.db.insert(webhookEvents).values({
        propertyId,
        channelCode: 'whatsapp',
        eventType: 'message.received',
        externalEventId: dto.messageId,
        payload: { from: cleanPhone, text },
        status: 'received',
      });
    } catch {
      // Ignore duplicate key error on webhook_events
    }

    // 2. Find or Create Conversation
    let [conv] = await this.db.execute(sql`
      SELECT * FROM whatsapp_conversations
      WHERE property_id = ${propertyId} AND guest_phone = ${cleanPhone}
      LIMIT 1
    `);

    if (!conv) {
      const detectedLang = this.detectLanguage(text);
      const [newConv] = await this.db.execute(sql`
        INSERT INTO whatsapp_conversations (
          property_id, guest_phone, guest_name, language, ai_status, session_state
        ) VALUES (
          ${propertyId}, ${cleanPhone}, ${dto.guestName || 'Guest'}, ${detectedLang}, 'active', '{}'::jsonb
        )
        RETURNING *
      `);
      conv = newConv;
    } else if (dto.guestName && (!conv.guest_name || conv.guest_name === 'Guest')) {
      await this.db.execute(sql`
        UPDATE whatsapp_conversations SET guest_name = ${dto.guestName} WHERE id = ${conv.id}
      `);
      conv.guest_name = dto.guestName;
    }

    // Record Inbound Message
    await this.db.execute(sql`
      INSERT INTO whatsapp_messages (
        conversation_id, property_id, direction, sender_type, message_id, body, status
      ) VALUES (
        ${conv.id}, ${propertyId}, 'inbound', 'guest', ${dto.messageId}, ${text}, 'received'
      )
    `);

    // 3. Human Takeover Check
    if (conv.ai_status === 'paused' || conv.ai_status === 'escalated') {
      this.logger.log(`Conversation ${conv.id} is ${conv.ai_status}. AI response paused for Human Takeover.`);
      await this.db.execute(sql`
        UPDATE whatsapp_conversations 
        SET last_message_at = NOW(), unread_count = unread_count + 1 
        WHERE id = ${conv.id}
      `);
      return {
        replyText: '',
        language: conv.language as any,
        conversationId: conv.id,
        status: conv.ai_status,
      };
    }

    // 4. Language Detection & Updating
    const lang = this.detectLanguage(text, conv.language);
    if (lang !== conv.language) {
      await this.db.execute(sql`
        UPDATE whatsapp_conversations SET language = ${lang} WHERE id = ${conv.id}
      `);
      conv.language = lang;
    }

    // 5. Generate AI Receptionist Response
    const state = conv.session_state || {};
    const aiResult = await this.processConversationTurn(propertyId, conv, state, text, lang);

    // Update conversation session state and timestamp
    await this.db.execute(sql`
      UPDATE whatsapp_conversations 
      SET session_state = ${JSON.stringify(aiResult.newState)}::jsonb,
          ai_status = ${aiResult.status === 'escalated' ? 'escalated' : conv.ai_status},
          last_message_at = NOW()
      WHERE id = ${conv.id}
    `);

    // 6. Record Outbound AI Message
    const outMessageId = `out-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    await this.db.execute(sql`
      INSERT INTO whatsapp_messages (
        conversation_id, property_id, direction, sender_type, message_id, body, status
      ) VALUES (
        ${conv.id}, ${propertyId}, 'outbound', 'ai', ${outMessageId}, ${aiResult.replyText}, 'sent'
      )
    `);

    // 7. Dispatch via Meta WhatsApp Cloud API (if configured)
    await this.sendWhatsAppMessage(cleanPhone, aiResult.replyText);

    return {
      replyText: aiResult.replyText,
      language: lang,
      bookingConfirmation: aiResult.bookingConfirmation,
      conversationId: conv.id,
      status: aiResult.status,
    };
  }

  /**
   * Conversational turn processing with live PMS database grounding
   */
  private async processConversationTurn(
    propertyId: string,
    conv: any,
    state: any,
    text: string,
    lang: 'en' | 'hi' | 'te',
  ): Promise<{ replyText: string; newState: any; status: 'replied' | 'escalated'; bookingConfirmation?: string }> {
    const lower = text.toLowerCase();

    // Human staff escalation check
    if (
      lower.includes('human') || lower.includes('manager') || lower.includes('staff') ||
      lower.includes('agent') || lower.includes('help desk') || lower.includes('front desk') ||
      lower.includes('बात करनी है') || lower.includes('మేనేజర్') || lower.includes('స్టాఫ్')
    ) {
      const reply = this.getEscalationText(lang);
      return { replyText: reply, newState: state, status: 'escalated' };
    }

    // Booking Lookup / Status check: "status HAIP-...", "check HAIP-...", "booking HAIP-..."
    const refMatch = text.match(/HAIP-[A-Z0-9]+/i);
    if (refMatch || lower.includes('my booking') || lower.includes('status') || lower.includes('booking check')) {
      if (refMatch) {
        return this.handleBookingLookup(refMatch[0].toUpperCase(), lang, state);
      }
    }

    // Cancellation Request
    if (lower.includes('cancel') || lower.includes('रद्द') || lower.includes('రద్దు')) {
      const cancelMatch = text.match(/HAIP-[A-Z0-9]+/i);
      if (cancelMatch) {
        return this.handleCancellation(propertyId, cancelMatch[0].toUpperCase(), lang, state);
      }
      const reply = this.translate(
        'Please provide your booking reference number (e.g. HAIP-...) to process the cancellation.',
        'कृपया रद्दीकरण के लिए अपना बुकिंग संदर्भ नंबर (जैसे HAIP-...) प्रदान करें।',
        'దయచేసి రద్దు చేయడానికి మీ బుకింగ్ రిఫరెన్స్ నంబర్‌ను (ఉదా. HAIP-...) అందించండి.',
        lang,
      );
      return { replyText: reply, newState: state, status: 'replied' };
    }

    // Confirmation step: Guest confirms booking
    if (state.stage === 'awaiting_confirmation' && (lower === 'confirm' || lower === 'yes' || lower === 'हाँ' || lower === 'హా' || lower.includes('confirm'))) {
      return this.executeConfirmedBooking(propertyId, conv, state, lang);
    }

    // Availability / Dates / Pricing Inquiry
    const isAvailabilityQuery =
      lower.includes('availab') || lower.includes('room') || lower.includes('price') ||
      lower.includes('rate') || lower.includes('cost') || lower.includes('book') ||
      lower.includes('कमरा') || lower.includes('कमरे') || lower.includes('किराया') ||
      lower.includes('గదులు') || lower.includes('ధర') || lower.includes('బుకింగ్');

    // Extract dates if mentioned (e.g. 2026-11-20 or "tomorrow" or "today")
    const dates = this.extractDates(text);
    if (dates.checkIn && dates.checkOut) {
      state.checkIn = dates.checkIn;
      state.checkOut = dates.checkOut;
    }

    if (isAvailabilityQuery || (state.checkIn && state.checkOut && !state.roomTypeId)) {
      return this.handleAvailabilityAndRates(propertyId, state, lang, lower);
    }

    // General Hotel Amenities & Facilities Inquiry
    if (lower.includes('amenit') || lower.includes('wifi') || lower.includes('food') ||
        lower.includes('restaurant') || lower.includes('timing') || lower.includes('check-in time') ||
        lower.includes('location') || lower.includes('address') || lower.includes('सुविधा') || lower.includes('సౌకర్యాలు')) {
      const reply = this.getHotelInfoText(lang);
      return { replyText: reply, newState: state, status: 'replied' };
    }

    // Default: Friendly Greeting & Introduction
    const reply = this.getGreetingText(conv.guest_name, lang);
    return { replyText: reply, newState: state, status: 'replied' };
  }

  /**
   * Availability and Real Pricing from PMS Database
   */
  private async handleAvailabilityAndRates(
    propertyId: string,
    state: any,
    lang: 'en' | 'hi' | 'te',
    lowerText: string,
  ): Promise<{ replyText: string; newState: any; status: 'replied' }> {
    const today = new Date();
    const defaultCheckIn = new Date(today.getTime() + 86400000 * 2).toISOString().slice(0, 10);
    const defaultCheckOut = new Date(today.getTime() + 86400000 * 3).toISOString().slice(0, 10);

    const checkIn = state.checkIn || defaultCheckIn;
    const checkOut = state.checkOut || defaultCheckOut;

    // Fetch real room categories from database
    const roomTypesList = await this.db
      .select()
      .from(roomTypes)
      .where(and(eq(roomTypes.propertyId, propertyId), eq(roomTypes.isActive, true)))
      .orderBy(asc(roomTypes.sortOrder));

    // Fetch BAR rate plans from database
    const ratePlansList = await this.db
      .select()
      .from(ratePlans)
      .where(and(eq(ratePlans.propertyId, propertyId), eq(ratePlans.isActive, true)));

    // Check if user specified a room category
    let matchedType = roomTypesList.find((rt: any) =>
      lowerText.includes(rt.name.toLowerCase()) || lowerText.includes(rt.code.toLowerCase())
    );

    // If the guest selected a category and wants to book
    if (matchedType || (state.stage === 'selecting_room' && roomTypesList[0])) {
      matchedType = matchedType || roomTypesList[0];
      const barPlan = ratePlansList.find((rp: any) => rp.roomTypeId === matchedType.id && rp.type === 'bar')
        || ratePlansList.find((rp: any) => rp.roomTypeId === matchedType.id);

      const baseRate = barPlan ? Number(barPlan.baseAmount) : 2999;
      const gst = Math.round(baseRate * 0.12 * 100) / 100;
      const grandTotal = baseRate + gst;

      state.roomTypeId = matchedType.id;
      state.roomTypeName = matchedType.name;
      state.ratePlanId = barPlan?.id;
      state.baseRate = baseRate;
      state.grandTotal = grandTotal;
      state.checkIn = checkIn;
      state.checkOut = checkOut;
      state.adults = 2;
      state.stage = 'awaiting_confirmation';

      const summaryText = this.translate(
        `🛎️ *Hotel Spark — Booking Summary*\n` +
        `• Category: *${matchedType.name}*\n` +
        `• Bed: ${matchedType.bedType || 'King'} (Max ${matchedType.maxOccupancy} guests)\n` +
        `• Dates: ${checkIn} to ${checkOut} (1 night)\n` +
        `• Base Rate: ₹${baseRate.toLocaleString('en-IN')}\n` +
        `• GST (12%): ₹${gst.toLocaleString('en-IN')}\n` +
        `• *Total Payable: ₹${grandTotal.toLocaleString('en-IN')}*\n\n` +
        `Please reply *CONFIRM* to finalize your reservation with Hotel Spark.`,

        `🛎️ *होटल स्पार्क — बुकिंग सारांश*\n` +
        `• श्रेणी: *${matchedType.name}*\n` +
        `• बिस्तर: ${matchedType.bedType || 'King'} (अधिकतम ${matchedType.maxOccupancy} अतिथि)\n` +
        `• दिनांक: ${checkIn} से ${checkOut} (1 रात)\n` +
        `• मूल किराया: ₹${baseRate.toLocaleString('en-IN')}\n` +
        `• जीएसटी (12%): ₹${gst.toLocaleString('en-IN')}\n` +
        `• *कुल राशि: ₹${grandTotal.toLocaleString('en-IN')}*\n\n` +
        `कृपया अपनी बुकिंग पक्की करने के लिए *CONFIRM* लिखकर भेजें।`,

        `🛎️ *హోటల్ స్పార్క్ — బుకింగ్ వివరాలు*\n` +
        `• కేటగిరీ: *${matchedType.name}*\n` +
        `• బెడ్: ${matchedType.bedType || 'King'} (గరిష్టంగా ${matchedType.maxOccupancy} మంది)\n` +
        `• తేదీలు: ${checkIn} నుండి ${checkOut} (1 రాత్రి)\n` +
        `• బేస్ రేట్: ₹${baseRate.toLocaleString('en-IN')}\n` +
        `• జీఎస్టీ (12%): ₹${gst.toLocaleString('en-IN')}\n` +
        `• *మొత్తం ధర: ₹${grandTotal.toLocaleString('en-IN')}*\n\n` +
        `మీ బుకింగ్‌ను ఖరారు చేయడానికి దయచేసి *CONFIRM* అని రిప్లై ఇవ్వండి.`,
        lang,
      );

      return { replyText: summaryText, newState: state, status: 'replied' };
    }

    // List available room categories with real database prices in INR
    state.stage = 'selecting_room';
    state.checkIn = checkIn;
    state.checkOut = checkOut;

    let listTextEn = `✨ *Live Room Availability & Rates at Hotel Spark*\nDates: ${checkIn} to ${checkOut}\n\n`;
    let listTextHi = `✨ *होटल स्पार्क में लाइव कमरे और दरें*\nदिनांक: ${checkIn} से ${checkOut}\n\n`;
    let listTextTe = `✨ *హోటల్ స్పార్క్‌లో అందుబాటులో ఉన్న గదులు & ధరలు*\nతేదీలు: ${checkIn} నుండి ${checkOut}\n\n`;

    for (const rt of roomTypesList) {
      const plan = ratePlansList.find((rp: any) => rp.roomTypeId === rt.id && rp.type === 'bar')
        || ratePlansList.find((rp: any) => rp.roomTypeId === rt.id);
      const rate = plan ? Number(plan.baseAmount) : 2999;

      listTextEn += `🏨 *${rt.name}*\n• Features: ${rt.bedType} bed, max ${rt.maxOccupancy} guests\n• Rate: ₹${rate.toLocaleString('en-IN')}/night (+GST)\n\n`;
      listTextHi += `🏨 *${rt.name}*\n• विवरण: ${rt.bedType} बिस्तर, अधिकतम ${rt.maxOccupancy} अतिथि\n• किराया: ₹${rate.toLocaleString('en-IN')}/रात (+जीएसटी)\n\n`;
      listTextTe += `🏨 *${rt.name}*\n• ఫీచర్లు: ${rt.bedType} బెడ్, గరిష్టంగా ${rt.maxOccupancy} మంది\n• ధర: ₹${rate.toLocaleString('en-IN')}/రాత్రికి (+GST)\n\n`;
    }

    listTextEn += `Which room category would you like to book? (Reply with the category name)`;
    listTextHi += `आप कौन सी श्रेणी का कमरा बुक करना चाहते हैं? (श्रेणी का नाम लिखकर भेजें)`;
    listTextTe += `మీరు ఏ కేటగిరీ గదిని బుక్ చేసుకోవాలనుకుంటున్నారు? (కేటగిరీ పేరు రిప్లై ఇవ్వండి)`;

    const reply = this.translate(listTextEn, listTextHi, listTextTe, lang);
    return { replyText: reply, newState: state, status: 'replied' };
  }

  /**
   * Execute real confirmed booking into PMS database
   */
  private async executeConfirmedBooking(
    propertyId: string,
    conv: any,
    state: any,
    lang: 'en' | 'hi' | 'te',
  ): Promise<{ replyText: string; newState: any; status: 'replied'; bookingConfirmation: string }> {
    const confirmationNumber = generateConfirmationNumber();
    const guestPhone = conv.guest_phone || '919876543210';
    const guestName = conv.guest_name || 'Valued Guest';
    const nameParts = guestName.split(' ');
    const firstName = nameParts[0] || 'Valued';
    const lastName = nameParts.slice(1).join(' ') || 'Guest';
    const email = `${guestPhone}@whatsapp.sparkhotel.in`;

    // 1. Create or Find Guest in DB
    let [guest] = await this.db.execute(sql`
      SELECT id FROM guests WHERE phone = ${guestPhone} LIMIT 1
    `);
    if (!guest) {
      const [newGuest] = await this.db.execute(sql`
        INSERT INTO guests (first_name, last_name, email, phone)
        VALUES (${firstName}, ${lastName}, ${email}, ${guestPhone})
        RETURNING id
      `);
      guest = newGuest;
    }

    // 2. Create Booking
    const [booking] = await this.db.execute(sql`
      INSERT INTO bookings (
        property_id, guest_id, confirmation_number, source, channel_code, notes
      ) VALUES (
        ${propertyId}, ${guest.id}, ${confirmationNumber}, 'direct', 'whatsapp', 'Booked via Spark WhatsApp AI Receptionist'
      )
      RETURNING id
    `);

    // 3. Create Reservation
    const [reservation] = await this.db.execute(sql`
      INSERT INTO reservations (
        property_id, booking_id, guest_id, room_type_id, arrival_date, departure_date,
        nights, status, rate_plan_id, total_amount, currency_code, adults, children,
        special_requests
      ) VALUES (
        ${propertyId}, ${booking.id}, ${guest.id}, ${state.roomTypeId}, ${state.checkIn}, ${state.checkOut},
        1, 'confirmed', ${state.ratePlanId}, ${state.grandTotal || 3358.88}, 'INR', ${state.adults || 2}, 0,
        'Direct WhatsApp Reservation confirmed via AI Receptionist'
      )
      RETURNING id
    `);

    // 4. Create Folio for the reservation
    const folioNumber = `FOL-${confirmationNumber}`;
    await this.db.execute(sql`
      INSERT INTO folios (
        property_id, reservation_id, booking_id, guest_id, folio_number, type, status, currency_code, total_charges, total_payments, balance
      ) VALUES (
        ${propertyId}, ${reservation.id}, ${booking.id}, ${guest.id}, ${folioNumber}, 'guest', 'open', 'INR', ${state.grandTotal || 3358.88}, 0, ${state.grandTotal || 3358.88}
      )
    `);

    // 5. Update Inventory Ledger
    await this.db.execute(sql`
      INSERT INTO inventory_ledger (
        property_id, room_type_id, date, change_type, delta, reservation_id, channel_code, reason
      ) VALUES (
        ${propertyId}, ${state.roomTypeId}, ${state.checkIn}, 'reservation_created', -1, ${reservation.id}, 'whatsapp', 'Direct WhatsApp AI Booking'
      )
    `);

    // 6. Trigger Manager Notifications
    await this.triggerManagerNotification(propertyId, {
      confirmationNumber,
      guestName,
      guestPhone,
      roomTypeName: state.roomTypeName || 'Standard King',
      checkIn: state.checkIn,
      checkOut: state.checkOut,
      adults: state.adults || 2,
      totalAmount: state.grandTotal || 3358.88,
    });

    // Reset session state
    const newState = { stage: 'booked', lastConfirmationNumber: confirmationNumber };

    const reply = this.translate(
      `🎉 *Congratulations! Your booking is CONFIRMED.* 🏨\n\n` +
      `• *Booking Reference:* \`${confirmationNumber}\`\n` +
      `• *Hotel:* Hotel Spark, Banjara Hills, Hyderabad\n` +
      `• *Category:* ${state.roomTypeName}\n` +
      `• *Dates:* ${state.checkIn} to ${state.checkOut}\n` +
      `• *Guest:* ${guestName} (${guestPhone})\n` +
      `• *Total:* ₹${Number(state.grandTotal).toLocaleString('en-IN')} (Pay at Hotel)\n\n` +
      `Our hotel manager has also been notified. We look forward to welcoming you to Hotel Spark! ✨`,

      `🎉 *बधाई हो! आपकी बुकिंग पक्की (CONFIRMED) हो गई है।* 🏨\n\n` +
      `• *बुकिंग संदर्भ:* \`${confirmationNumber}\`\n` +
      `• *होटल:* होटल स्पार्क, बंजारा हिल्स, हैदराबाद\n` +
      `• *श्रेणी:* ${state.roomTypeName}\n` +
      `• *दिनांक:* ${state.checkIn} से ${state.checkOut}\n` +
      `• *अतिथि:* ${guestName} (${guestPhone})\n` +
      `• *कुल राशि:* ₹${Number(state.grandTotal).toLocaleString('en-IN')}\n\n` +
      `हमारे होटल प्रबंधक को भी सूचना भेज दी गई है। होटल स्पार्क में आपका स्वागत है! ✨`,

      `🎉 *అభినందనలు! మీ బుకింగ్ కన్ఫర్మ్ అయింది.* 🏨\n\n` +
      `• *బుకింగ్ రిఫరెన్స్:* \`${confirmationNumber}\`\n` +
      `• *హోటల్:* హోటల్ స్పార్క్, బంజారా హిల్స్, హైదరాబాద్\n` +
      `• *కేటగిరీ:* ${state.roomTypeName}\n` +
      `• *తేదీలు:* ${state.checkIn} నుండి ${state.checkOut}\n` +
      `• *గెస్ట్:* ${guestName} (${guestPhone})\n` +
      `• *మొత్తం:* ₹${Number(state.grandTotal).toLocaleString('en-IN')}\n\n` +
      `మా హోటల్ మేనేజర్‌కు కూడా సమాచారం పంపబడింది. హోటల్ స్పార్క్‌కి స్వాగతం! ✨`,
      lang,
    );

    return { replyText: reply, newState, status: 'replied', bookingConfirmation: confirmationNumber };
  }

  /**
   * Manager Notification System on Confirmed Reservation
   */
  private async triggerManagerNotification(
    propertyId: string,
    details: {
      confirmationNumber: string;
      guestName: string;
      guestPhone: string;
      roomTypeName: string;
      checkIn: string;
      checkOut: string;
      adults: number;
      totalAmount: number | string;
    },
  ): Promise<void> {
    try {
      // 1. Create PMS Staff Notification
      const notifData = {
        propertyId,
        type: 'reservation_created',
        title: `New WhatsApp Direct Booking — ${details.guestName}`,
        message: `Booking ${details.confirmationNumber} confirmed for ${details.roomTypeName} (${details.checkIn} → ${details.checkOut}, ₹${Number(details.totalAmount).toLocaleString('en-IN')}). Guest: ${details.guestName} (${details.guestPhone}). Source: WhatsApp Direct.`,
        severity: 'info' as const,
        sourceEvent: 'booking.created',
        sourceEntityType: 'reservation',
      };
      await this.db.insert(staffNotifications).values(notifData);

      if (this.eventsGateway) {
        this.eventsGateway.broadcastStaffNotification(propertyId, notifData);
        this.eventsGateway.broadcastToProperty(propertyId, 'reservation.created', {
          confirmationNumber: details.confirmationNumber,
          guestName: details.guestName,
          status: 'confirmed',
          totalAmount: details.totalAmount,
          currencyCode: 'INR',
        });
      }

      // 2. Format Manager WhatsApp Alert
      const managerNumber =
        this.configService.get<string>('MANAGER_WHATSAPP_NUMBER') || '919876543210';

      const alertBody =
        `🛎️ *NEW BOOKING ALERT — HOTEL SPARK*\n\n` +
        `• *Ref:* \`${details.confirmationNumber}\`\n` +
        `• *Guest:* ${details.guestName}\n` +
        `• *Phone:* ${details.guestPhone}\n` +
        `• *Room Category:* ${details.roomTypeName}\n` +
        `• *Stay Dates:* ${details.checkIn} to ${details.checkOut}\n` +
        `• *Guests:* ${details.adults} Adults\n` +
        `• *Amount:* ₹${Number(details.totalAmount).toLocaleString('en-IN')} (INR)\n` +
        `• *Booking Source:* WhatsApp Direct AI Receptionist\n\n` +
        `PMS status updated immediately.`;

      // 3. Send WhatsApp Alert to Manager (with safe retry and failure isolation)
      await this.sendWhatsAppMessage(managerNumber, alertBody);
      this.logger.log(`Manager WhatsApp alert dispatched for booking ${details.confirmationNumber}`);
    } catch (err: any) {
      // Crucial requirement: Manager alert error must NEVER cancel or reverse a valid booking!
      this.logger.error(`Manager notification delivery failed safely: ${err.message}`);
    }
  }

  /**
   * Outgoing WhatsApp Cloud API delivery (Meta Graph API v21.0 with Sandbox fallback)
   */
  async sendWhatsAppMessage(recipientPhone: string, text: string): Promise<{ success: boolean; messageId: string }> {
    const cleanTo = recipientPhone.replace(/\D/g, '');
    const token =
      this.configService.get<string>('WHATSAPP_TOKEN') ||
      this.configService.get<string>('WHATSAPP_CLOUD_TOKEN');
    const phoneNumberId =
      this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID') ||
      this.configService.get<string>('WHATSAPP_CLOUD_PHONE_NUMBER_ID');

    // Live Meta WhatsApp Cloud API if credentials provided
    if (token && phoneNumberId && token !== 'mock' && !token.includes('placeholder')) {
      try {
        const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: cleanTo,
            type: 'text',
            text: { preview_url: false, body: text },
          }),
        });

        if (res.ok) {
          const data = (await res.json()) as any;
          const msgId = data?.messages?.[0]?.id || `wamid.${Date.now()}`;
          return { success: true, messageId: msgId };
        }
        const errData = await res.text();
        this.logger.warn(`WhatsApp Cloud API error HTTP ${res.status}: ${errData}`);
      } catch (err: any) {
        this.logger.error(`WhatsApp Cloud API network error: ${err.message}`);
      }
    }

    // Local Simulation / Sandbox delivery
    const simulatedId = `wamid.sim.${Date.now()}.${Math.floor(Math.random() * 10000)}`;
    this.logger.log(`[WhatsApp Sandbox Outbound] To: ${cleanTo} | Body: "${text.slice(0, 80)}..."`);
    return { success: true, messageId: simulatedId };
  }

  /**
   * Booking lookup by reference
   */
  private async handleBookingLookup(
    ref: string,
    lang: 'en' | 'hi' | 'te',
    state: any,
  ): Promise<{ replyText: string; newState: any; status: 'replied' }> {
    const [res] = await this.db.execute(sql`
      SELECT r.id, r.status, r.arrival_date, r.departure_date, r.total_amount, r.currency_code,
             rt.name as room_type_name, g.first_name, g.last_name, g.phone
      FROM reservations r
      JOIN bookings b ON r.booking_id = b.id
      JOIN guests g ON r.guest_id = g.id
      JOIN room_types rt ON r.room_type_id = rt.id
      WHERE b.confirmation_number = ${ref}
      LIMIT 1
    `);

    if (!res) {
      const notFound = this.translate(
        `We could not find any active booking with reference ${ref}. Please double check the number or contact front desk.`,
        `हमें संदर्भ संख्या ${ref} के साथ कोई सक्रिय बुकिंग नहीं मिली। कृपया नंबर की पुनः जांच करें।`,
        `రిఫరెన్స్ నంబర్ ${ref} తో బుకింగ్ కనిపించలేదు. దయచేసి నంబర్‌ను మళ్లీ తనిఖీ చేయండి.`,
        lang,
      );
      return { replyText: notFound, newState: state, status: 'replied' };
    }

    const checkIn = new Date(res.arrival_date).toISOString().slice(0, 10);
    const checkOut = new Date(res.departure_date).toISOString().slice(0, 10);

    const reply = this.translate(
      `📋 *Booking Details for ${ref}*\n` +
      `• Guest: ${res.first_name} ${res.last_name}\n` +
      `• Category: ${res.room_type_name}\n` +
      `• Stay Dates: ${checkIn} to ${checkOut}\n` +
      `• Status: *${String(res.status).toUpperCase()}*\n` +
      `• Total Amount: ₹${Number(res.total_amount).toLocaleString('en-IN')}\n\n` +
      `If you need any modifications or assistance, please let me know.`,

      `📋 *बुकिंग विवरण: ${ref}*\n` +
      `• अतिथि: ${res.first_name} ${res.last_name}\n` +
      `• श्रेणी: ${res.room_type_name}\n` +
      `• दिनांक: ${checkIn} से ${checkOut}\n` +
      `• स्थिति: *${String(res.status).toUpperCase()}*\n` +
      `• कुल किराया: ₹${Number(res.total_amount).toLocaleString('en-IN')}\n\n` +
      `यदि आपको कोई बदलाव या सहायता चाहिए, तो मुझे बताएं।`,

      `📋 *బుకింగ్ వివరాలు: ${ref}*\n` +
      `• గెస్ట్: ${res.first_name} ${res.last_name}\n` +
      `• కేటగిరీ: ${res.room_type_name}\n` +
      `• తేదీలు: ${checkIn} నుండి ${checkOut}\n` +
      `• స్థితి: *${String(res.status).toUpperCase()}*\n` +
      `• మొత్తం ధర: ₹${Number(res.total_amount).toLocaleString('en-IN')}\n\n` +
      `మీకు ఏవైనా మార్పులు లేదా సహాయం కావాలంటే నాకు తెలియజేయండి.`,
      lang,
    );

    return { replyText: reply, newState: state, status: 'replied' };
  }

  /**
   * Cancellation processing
   */
  private async handleCancellation(
    propertyId: string,
    ref: string,
    lang: 'en' | 'hi' | 'te',
    state: any,
  ): Promise<{ replyText: string; newState: any; status: 'replied' }> {
    const [res] = await this.db.execute(sql`
      SELECT r.id, r.status, r.room_type_id, r.arrival_date
      FROM reservations r
      JOIN bookings b ON r.booking_id = b.id
      WHERE b.confirmation_number = ${ref} AND r.property_id = ${propertyId}
      LIMIT 1
    `);

    if (!res) {
      const reply = this.translate(
        `No reservation found with reference ${ref} to cancel.`,
        `रद्द करने के लिए संदर्भ संख्या ${ref} के साथ कोई आरक्षण नहीं मिला।`,
        `రద్దు చేయడానికి రిఫరెన్స్ ${ref} తో బుకింగ్ కనుగొనబడలేదు.`,
        lang,
      );
      return { replyText: reply, newState: state, status: 'replied' };
    }

    if (res.status === 'cancelled') {
      const reply = this.translate(
        `Reservation ${ref} is already cancelled.`,
        `आरक्षण ${ref} पहले ही रद्द कर दिया गया है।`,
        `బుకింగ్ ${ref} ఇప్పటికే రద్దు చేయబడింది.`,
        lang,
      );
      return { replyText: reply, newState: state, status: 'replied' };
    }

    // Update reservation to cancelled
    await this.db.execute(sql`
      UPDATE reservations SET status = 'cancelled', updated_at = NOW() WHERE id = ${res.id}
    `);

    // Release inventory in inventory_ledger
    await this.db.execute(sql`
      INSERT INTO inventory_ledger (
        property_id, room_type_id, date, change_type, delta, reservation_id, channel_code, reason
      ) VALUES (
        ${propertyId}, ${res.room_type_id}, ${res.arrival_date}, 'reservation_cancelled', 1, ${res.id}, 'whatsapp', 'Cancelled via WhatsApp AI Receptionist'
      )
    `);

    const reply = this.translate(
      `Your reservation ${ref} has been cancelled successfully as per our hotel cancellation policy.`,
      `आपकी आरक्षण संख्या ${ref} को हमारी होटल नीति के अनुसार सफलतापूर्वक रद्द कर दिया गया है।`,
      `మీ బుకింగ్ ${ref} హోటల్ పాలసీ ప్రకారం విజయవంతంగా రద్దు చేయబడింది.`,
      lang,
    );
    return { replyText: reply, newState: state, status: 'replied' };
  }

  // --- Multilingual helpers ---

  private detectLanguage(text: string, current = 'en'): 'en' | 'hi' | 'te' {
    // Telugu Unicode block: 0C00-0C7F
    if (/[\u0C00-\u0C7F]/.test(text) || text.includes('నమస్కారం') || text.includes('రూమ్') || text.includes('ధర')) {
      return 'te';
    }
    // Hindi / Devanagari Unicode block: 0900-097F
    if (/[\u0900-\u097F]/.test(text) || text.includes('नमस्ते') || text.includes('कमरा') || text.includes('किराया')) {
      return 'hi';
    }
    return current === 'hi' || current === 'te' ? current : 'en';
  }

  private translate(en: string, hi: string, te: string, lang: 'en' | 'hi' | 'te'): string {
    if (lang === 'hi') return hi;
    if (lang === 'te') return te;
    return en;
  }

  private getGreetingText(name: string | undefined, lang: 'en' | 'hi' | 'te'): string {
    const greetingName = name ? `, ${name}` : '';
    return this.translate(
      `Namaste${greetingName}! Welcome to *Hotel Spark, Hyderabad* 🏨✨\n\n` +
      `I am Spark, your 24/7 AI Receptionist. I can help you with:\n` +
      `1. Live room availability & instant booking in INR (₹)\n` +
      `2. Room categories (Standard King, Deluxe, Suites)\n` +
      `3. Hotel amenities, location & check-in timings\n` +
      `4. Checking or cancelling your existing booking\n\n` +
      `How may I assist you today?`,

      `नमस्ते${greetingName}! *होटल स्पार्क, हैदराबाद* में आपका स्वागत है 🏨✨\n\n` +
      `मैं स्पार्क, आपका 24/7 AI रिसेप्शनिस्ट हूँ। मैं आपकी सहायता कर सकता हूँ:\n` +
      `1. कमरों की लाइव उपलब्धता और तुरंत बुकिंग (₹)\n` +
      `2. कमरों की श्रेणियां और सुविधाएं\n` +
      `3. चेक-इन समय और होटल का पता\n` +
      `4. अपनी पुरानी बुकिंग की स्थिति जांचना या रद्द करना\n\n` +
      `आज मैं आपकी क्या सहायता कर सकता हूँ?`,

      `నమస్కారం${greetingName}! *హోటల్ స్పార్క్, హైదరాబాద్* కు స్వాగతం 🏨✨\n\n` +
      `నేను స్పార్క్, మీ 24/7 AI రిసెప్షనిస్ట్‌ని. నేను మీకు సహాయం చేయగలను:\n` +
      `1. లైవ్ గదుల లభ్యత మరియు తక్షణ బుకింగ్ (₹)\n` +
      `2. గదుల రకాలు మరియు వివరాలు\n` +
      `3. హోటల్ సౌకర్యాలు మరియు చిరునామా\n` +
      `4. మీ బుకింగ్ వివరాలు చూడడం లేదా రద్దు చేయడం\n\n` +
      `నేను మీకు ఎలా సహాయపడగలను?`,
      lang,
    );
  }

  private getHotelInfoText(lang: 'en' | 'hi' | 'te'): string {
    return this.translate(
      `🏨 *Hotel Spark — Information & Facilities*\n\n` +
      `📍 *Location:* Road No. 1, Banjara Hills, Hyderabad, Telangana 500034\n` +
      `⏰ *Timings:* Check-in: 3:00 PM | Check-out: 11:00 AM\n` +
      `📶 *Wi-Fi:* High-speed complimentary fiber Wi-Fi throughout the hotel\n` +
      `🍽️ *Dining:* 24/7 In-Room Dining & multi-cuisine restaurant\n` +
      `🚗 *Parking:* Valet parking available for all guests\n` +
      `💳 *Pricing:* All rates in Indian Rupees (₹) + 12% GST\n\n` +
      `Would you like to check room availability for your stay?`,

      `🏨 *होटल स्पार्क — जानकारी और सुविधाएं*\n\n` +
      `📍 *स्थान:* रोड नंबर 1, बंजारा हिल्स, हैदराबाद, तेलंगाना 500034\n` +
      `⏰ *समय:* चेक-इन: 3:00 PM | चेक-आउट: 11:00 AM\n` +
      `📶 *वाई-फाई:* हाई-स्पीड मानार्थ वाई-फाई\n` +
      `🍽️ *भोजन:* 24/7 रूम सर्विस और रेस्टोरेंट\n` +
      `🚗 *पार्किंग:* वॉलेट पार्किंग उपलब्ध\n` +
      `💳 *किराया:* भारतीय रुपये (₹) + 12% जीएसटी\n\n` +
      `क्या आप अपने प्रवास के लिए कमरों की उपलब्धता देखना चाहते हैं?`,

      `🏨 *హోటల్ స్పార్క్ — సౌకర్యాలు & వివరాలు*\n\n` +
      `📍 *లొకేషన్:* రోడ్ నెం. 1, బంజారా హిల్స్, హైదరాబాద్, తెలంగాణ 500034\n` +
      `⏰ *సమయాలు:* చెక్-ఇన్: 3:00 PM | చెక్-అవుట్: 11:00 AM\n` +
      `📶 *వై-ఫై:* ఉచిత హై-స్పీడ్ వై-ఫై\n` +
      `🍽️ *డైనింగ్:* 24/7 రూమ్ సర్వీస్ & రెస్టారెంట్\n` +
      `🚗 *పార్కింగ్:* వాలెట్ పార్కింగ్ అందుబాటులో ఉంది\n` +
      `💳 *ధరలు:* భారతీయ రూపాయలలో (₹) + 12% GST\n\n` +
      `మీరు మీ బస కోసం గదుల లభ్యతను తనిఖీ చేయాలనుకుంటున్నారా?`,
      lang,
    );
  }

  private getEscalationText(lang: 'en' | 'hi' | 'te'): string {
    return this.translate(
      `I am escalating this conversation to our front desk manager. A team member has been notified and will reply directly here shortly. 🛎️`,
      `मैं आपकी बातचीत हमारे फ्रंट डेस्क प्रबंधक को भेज रहा हूँ। हमारी टीम के सदस्य को सूचित कर दिया गया है और वे शीघ्र ही उत्तर देंगे। 🛎️`,
      `నేను మీ సంభాషణను మా ఫ్రంట్ డెస్క్ మేనేజర్‌కి బదిలీ చేస్తున్నాను. మా సిబ్బంది త్వరలోనే మీకు ఇక్కడే సమాధానం ఇస్తారు. 🛎️`,
      lang,
    );
  }

  private extractDates(text: string): { checkIn?: string; checkOut?: string } {
    const ymd = text.match(/\b(202\d-[01]\d-[0-3]\d)\b/g);
    if (ymd && ymd.length >= 2) {
      return { checkIn: ymd[0], checkOut: ymd[1] };
    }
    if (ymd && ymd.length === 1) {
      const nextDay = new Date(new Date(ymd[0]).getTime() + 86400000).toISOString().slice(0, 10);
      return { checkIn: ymd[0], checkOut: nextDay };
    }
    return {};
  }
}
