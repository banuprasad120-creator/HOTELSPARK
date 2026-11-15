import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { eq, and, desc, or, ilike, sql } from 'drizzle-orm';
import {
  rooms,
  roomTypes,
  ratePlans,
  guests,
  bookings,
  reservations,
  folios,
  staffNotifications,
  auditLogs,
} from '@telivityhaip/database';
import { bookingRequests } from '@telivityhaip/booking-requests';
import { DRIZZLE } from '../../database/database.module';
import { generateConfirmationNumber } from '../../common/crypto/confirmation-number';
import { EventsGateway } from '../events/events.gateway';
import { WhatsAppReceptionistService } from '../channel/adapters/whatsapp/whatsapp-receptionist.service';

@Injectable()
export class DirectBookingService {
  private readonly logger = new Logger(DirectBookingService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    private readonly eventsGateway: EventsGateway,
    private readonly whatsAppService: WhatsAppReceptionistService,
  ) {}

  /**
   * List all direct booking requests with filters, status counts, and real-time room availability
   */
  async list(propertyId: string, query: { status?: string; search?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const offset = (page - 1) * limit;

    // 1. Calculate status summary counts for property
    const countRows = await this.db.execute(sql`
      SELECT 
        COUNT(*)::int as total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END)::int as pending,
        COUNT(CASE WHEN status = 'accepted' THEN 1 END)::int as accepted,
        COUNT(CASE WHEN status = 'denied' THEN 1 END)::int as denied
      FROM booking_requests
      WHERE property_id = ${propertyId}
    `);
    const counts = countRows[0] || { total: 0, pending: 0, accepted: 0, denied: 0 };

    // 2. Query booking requests with filters
    const conditions = [eq(bookingRequests.propertyId, propertyId)];

    if (query.status && ['pending', 'accepted', 'denied'].includes(query.status)) {
      conditions.push(eq(bookingRequests.status, query.status as any));
    }

    if (query.search?.trim()) {
      const q = `%${query.search.trim()}%`;
      conditions.push(
        or(
          ilike(bookingRequests.guestFirstName, q),
          ilike(bookingRequests.guestLastName, q),
          ilike(bookingRequests.guestEmail, q),
          ilike(bookingRequests.guestPhone, q),
          ilike(bookingRequests.submissionIdempotencyKey, q),
        )!,
      );
    }

    const rows = await this.db
      .select({
        id: bookingRequests.id,
        propertyId: bookingRequests.propertyId,
        status: bookingRequests.status,
        submissionIdempotencyKey: bookingRequests.submissionIdempotencyKey,
        arrivalDate: bookingRequests.arrivalDate,
        departureDate: bookingRequests.departureDate,
        roomTypeId: bookingRequests.roomTypeId,
        ratePlanId: bookingRequests.ratePlanId,
        adults: bookingRequests.adults,
        children: bookingRequests.children,
        guestFirstName: bookingRequests.guestFirstName,
        guestLastName: bookingRequests.guestLastName,
        guestEmail: bookingRequests.guestEmail,
        guestPhone: bookingRequests.guestPhone,
        specialRequests: bookingRequests.specialRequests,
        submittedTotal: bookingRequests.submittedTotal,
        currencyCode: bookingRequests.currencyCode,
        cardBrand: bookingRequests.cardBrand,
        cardLastFour: bookingRequests.cardLastFour,
        acceptedReservationId: bookingRequests.acceptedReservationId,
        denialReason: bookingRequests.denialReason,
        decidedAt: bookingRequests.decidedAt,
        createdAt: bookingRequests.createdAt,
        updatedAt: bookingRequests.updatedAt,
      })
      .from(bookingRequests)
      .where(and(...conditions))
      .orderBy(desc(bookingRequests.createdAt))
      .limit(limit)
      .offset(offset);

    // 3. Enrich with Room Type, Rate Plan, and Reservation info
    const enriched = await Promise.all(
      rows.map(async (item: any) => {
        // Room type
        const [rt] = await this.db.select().from(roomTypes).where(eq(roomTypes.id, item.roomTypeId));
        // Rate plan
        const [rp] = await this.db.select().from(ratePlans).where(eq(ratePlans.id, item.ratePlanId));

        // Reservation & assigned room if approved
        let confirmedReservation: any = null;
        let assignedRoom: any = null;
        if (item.acceptedReservationId) {
          const [res] = await this.db.select().from(reservations).where(eq(reservations.id, item.acceptedReservationId));
          confirmedReservation = res;
          if (res?.roomId) {
            const [rm] = await this.db.select().from(rooms).where(eq(rooms.id, res.roomId));
            assignedRoom = rm;
          }
        }

        // Available rooms count for this category & date window
        const availableRooms = await this.getAvailableRoomsForStay(
          propertyId,
          item.roomTypeId,
          item.arrivalDate,
          item.departureDate,
        );

        // Derive clean reference
        const reference = item.submissionIdempotencyKey?.startsWith('SPK-REQ')
          ? item.submissionIdempotencyKey
          : `SPK-REQ-${item.id.slice(0, 8).toUpperCase()}`;

        return {
          ...item,
          reference,
          roomTypeName: rt?.name || 'Standard Room',
          roomTypeCode: rt?.code || 'STD',
          ratePlanName: rp?.name || 'Standard Rate',
          availableRoomsCount: availableRooms.length,
          confirmedReservationNumber: confirmedReservation?.confirmationNumber || null,
          assignedRoomNumber: assignedRoom?.number || null,
          assignedRoomFloor: assignedRoom?.floor || null,
        };
      }),
    );

    return {
      data: enriched,
      counts: {
        total: Number(counts.total || 0),
        pending: Number(counts.pending || 0),
        accepted: Number(counts.accepted || 0),
        denied: Number(counts.denied || 0),
      },
      pagination: {
        page,
        limit,
        total: query.status ? (counts as any)[query.status] || 0 : Number(counts.total || 0),
      },
    };
  }

  /**
   * Get single booking request details with available rooms
   */
  async getDetails(id: string, propertyId: string) {
    const [request] = await this.db
      .select()
      .from(bookingRequests)
      .where(and(eq(bookingRequests.id, id), eq(bookingRequests.propertyId, propertyId)));

    if (!request) {
      throw new NotFoundException(`Booking request ${id} not found`);
    }

    const [rt] = await this.db.select().from(roomTypes).where(eq(roomTypes.id, request.roomTypeId));
    const [rp] = await this.db.select().from(ratePlans).where(eq(ratePlans.id, request.ratePlanId));

    const availableRooms = await this.getAvailableRoomsForStay(
      propertyId,
      request.roomTypeId,
      request.arrivalDate,
      request.departureDate,
    );

    let confirmedReservation: any = null;
    let assignedRoom: any = null;
    if (request.acceptedReservationId) {
      const [res] = await this.db.select().from(reservations).where(eq(reservations.id, request.acceptedReservationId));
      confirmedReservation = res;
      if (res?.roomId) {
        const [rm] = await this.db.select().from(rooms).where(eq(rooms.id, res.roomId));
        assignedRoom = rm;
      }
    }

    const reference = request.submissionIdempotencyKey?.startsWith('SPK-REQ')
      ? request.submissionIdempotencyKey
      : `SPK-REQ-${request.id.slice(0, 8).toUpperCase()}`;

    return {
      ...request,
      reference,
      roomTypeName: rt?.name || 'Room',
      ratePlanName: rp?.name || 'Standard Rate',
      availableRooms,
      confirmedReservation,
      assignedRoom,
    };
  }

  /**
   * Helper: calculate available physical rooms for a room category across stay dates
   */
  async getAvailableRoomsForStay(
    propertyId: string,
    roomTypeId: string,
    arrivalDate: string,
    departureDate: string,
  ) {
    // 1. All active rooms for this category
    const categoryRooms = await this.db
      .select({
        id: rooms.id,
        number: rooms.number,
        floor: rooms.floor,
        status: rooms.status,
        hkOccupancy: rooms.hkOccupancy,
      })
      .from(rooms)
      .where(
        and(
          eq(rooms.propertyId, propertyId),
          eq(rooms.roomTypeId, roomTypeId),
          eq(rooms.isActive, true),
        ),
      );

    // 2. Conflicting assigned rooms in confirmed/checked_in reservations
    const conflicts = await this.db.execute(sql`
      SELECT room_id FROM reservations
      WHERE property_id = ${propertyId}
        AND room_id IS NOT NULL
        AND status IN ('confirmed', 'assigned', 'checked_in')
        AND NOT (departure_date <= ${arrivalDate}::date OR arrival_date >= ${departureDate}::date)
    `);

    const busyRoomIds = new Set((conflicts as any[]).map((c: any) => c.room_id).filter(Boolean));

    return categoryRooms.filter((r: any) => !busyRoomIds.has(r.id));
  }

  /**
   * APPROVE WORKFLOW:
   * 1. Revalidate room availability (prevent double booking)
   * 2. Assign available room
   * 3. Change status to Confirmed (accepted)
   * 4. Move reservation into existing Reservations dashboard
   * 5. Notify guest through WhatsApp
   */
  async approve(id: string, propertyId: string, body: { roomId?: string; customTotal?: number }) {
    // 1. Verify existence & status
    const [request] = await this.db
      .select()
      .from(bookingRequests)
      .where(and(eq(bookingRequests.id, id), eq(bookingRequests.propertyId, propertyId)));

    if (!request) {
      throw new NotFoundException(`Booking request ${id} not found`);
    }

    if (request.status === 'accepted') {
      throw new ConflictException('This booking request has already been approved and confirmed');
    }

    if (request.status === 'denied') {
      throw new ConflictException('Cannot approve a previously rejected booking request');
    }

    // 2. Revalidate availability to prevent double-booking
    const availableRooms = await this.getAvailableRoomsForStay(
      propertyId,
      request.roomTypeId,
      request.arrivalDate,
      request.departureDate,
    );

    if (availableRooms.length === 0) {
      throw new ConflictException(
        'Double-booking prevented: No physical rooms are currently available for this room category across the requested dates.',
      );
    }

    // 3. Assign room (either explicitly chosen by admin or best available)
    let selectedRoom = availableRooms[0];
    if (body.roomId) {
      const found = availableRooms.find((r: any) => r.id === body.roomId);
      if (!found) {
        throw new ConflictException(
          `Room ${body.roomId} is not available for these stay dates. Please choose an available room.`,
        );
      }
      selectedRoom = found;
    }

    // 4. Create or link Guest record (guests table is global, no propertyId)
    let guestId: string;
    const [existingGuest] = await this.db
      .select()
      .from(guests)
      .where(eq(guests.email, request.guestEmail));

    if (existingGuest) {
      guestId = existingGuest.id;
    } else {
      const [newGuest] = await this.db
        .insert(guests)
        .values({
          firstName: request.guestFirstName,
          lastName: request.guestLastName,
          email: request.guestEmail,
          phone: request.guestPhone || undefined,
        })
        .returning();
      guestId = newGuest.id;
    }

    // 5. Generate official confirmation number
    const confirmationNumber = generateConfirmationNumber();
    const finalTotal = body.customTotal != null ? String(body.customTotal) : request.submittedTotal;

    const nights = Math.max(
      1,
      Math.round(
        (new Date(request.departureDate).getTime() - new Date(request.arrivalDate).getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );

    // 6. Create Booking header
    const [booking] = await this.db
      .insert(bookings)
      .values({
        propertyId,
        guestId,
        confirmationNumber,
        source: 'direct',
        channelCode: 'direct_booking',
      })
      .returning();

    // 7. Create Confirmed & Assigned Reservation (moves into PMS Reservations board)
    const [reservation] = await this.db
      .insert(reservations)
      .values({
        propertyId,
        bookingId: booking.id,
        guestId,
        roomId: selectedRoom.id,
        roomTypeId: request.roomTypeId,
        ratePlanId: request.ratePlanId,
        arrivalDate: request.arrivalDate,
        departureDate: request.departureDate,
        nights,
        adults: request.adults,
        children: request.children ?? 0,
        totalAmount: finalTotal,
        currencyCode: request.currencyCode || 'INR',
        status: 'assigned', // Confirmed and room assigned!
        specialRequests: request.specialRequests,
      })
      .returning();

    // 8. Create initial Folio for billing
    const folioNumber = `FOL-${confirmationNumber.slice(-8)}`;
    const [folio] = await this.db
      .insert(folios)
      .values({
        propertyId,
        reservationId: reservation.id,
        bookingId: booking.id,
        guestId,
        folioNumber,
        type: 'guest',
        currencyCode: request.currencyCode || 'INR',
        status: 'open',
        totalCharges: finalTotal,
        balance: finalTotal,
      })
      .returning();

    // 9. Update Booking Request status to accepted (Approved)
    const [updatedRequest] = await this.db
      .update(bookingRequests)
      .set({
        status: 'accepted',
        acceptedReservationId: reservation.id,
        acceptedFolioId: folio.id,
        acceptedTotal: finalTotal,
        decidedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(bookingRequests.id, id))
      .returning();

    // 10. Create Audit Log
    try {
      await this.db.insert(auditLogs).values({
        propertyId,
        action: 'approve',
        entityType: 'booking_request',
        entityId: id,
        description: `Booking request APPROVED. Assigned Room ${selectedRoom.number}, Confirmation: ${confirmationNumber}`,
        newValue: {
          status: 'accepted',
          reservationId: reservation.id,
          roomId: selectedRoom.id,
          roomNumber: selectedRoom.number,
          totalAmount: finalTotal,
        },
      });
    } catch (e: any) {
      this.logger.warn(`Audit log insert note: ${e.message}`);
    }

    // 11. Staff Notification
    const guestName = `${request.guestFirstName} ${request.guestLastName}`.trim();
    const [rt] = await this.db.select().from(roomTypes).where(eq(roomTypes.id, request.roomTypeId));
    const roomName = rt?.name || 'Room';

    try {
      await this.db.insert(staffNotifications).values({
        id: crypto.randomUUID(),
        propertyId,
        type: 'booking_request_approved',
        severity: 'info',
        title: 'Booking Request Approved',
        message: `Direct booking for ${guestName} (${roomName}) was APPROVED. Room ${selectedRoom.number} assigned. Ref: ${confirmationNumber}.`,
        sourceEvent: 'booking_request.approved',
        sourceEntityType: 'reservation',
        sourceEntityId: reservation.id,
      });
    } catch (e: any) {
      this.logger.warn(`Staff notification insert note: ${e.message}`);
    }

    // 12. Emit real-time WebSocket events to dashboard
    try {
      this.eventsGateway?.server?.to(`property:${propertyId}`).emit('reservation.created', {
        id: reservation.id,
        confirmationNumber,
        guestName,
        status: 'assigned',
        roomNumber: selectedRoom.number,
      });
      this.eventsGateway?.server?.to(`property:${propertyId}`).emit('booking_request.accepted', {
        id,
        reservationId: reservation.id,
        confirmationNumber,
        roomNumber: selectedRoom.number,
      });
    } catch (e: any) {
      this.logger.warn(`WebSocket notification skipped: ${e.message}`);
    }

    // 13. Send official WhatsApp confirmation to guest!
    if (request.guestPhone) {
      const arrivalFormatted = request.arrivalDate;
      const departureFormatted = request.departureDate;

      const guestMessage =
        `🎉 *HOTEL SPARK — BOOKING APPROVED & CONFIRMED*\n\n` +
        `Dear ${guestName},\n` +
        `We are delighted to confirm that your direct reservation at Hotel Spark has been *APPROVED*!\n\n` +
        `📌 *Booking Reference:* ${confirmationNumber}\n` +
        `🛏️ *Room Category:* ${roomName}\n` +
        `🚪 *Assigned Room:* Room ${selectedRoom.number} (Floor ${selectedRoom.floor || '1'})\n` +
        `📅 *Dates:* ${arrivalFormatted} to ${departureFormatted} (${nights} nights)\n` +
        `👥 *Guests:* ${request.adults} Adults${request.children > 0 ? `, ${request.children} Children` : ''}\n` +
        `💰 *Total Amount:* ₹${Number(finalTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n\n` +
        `📍 *Hotel Address:* Road No. 1, Banjara Hills, Hyderabad, Telangana 500034\n` +
        `📞 *Front Desk:* +91 98765 43210\n\n` +
        `We look forward to welcoming you to Hotel Spark!`;

      try {
        await this.whatsAppService.sendWhatsAppMessage(request.guestPhone, guestMessage);
        this.logger.log(`WhatsApp confirmation delivered to guest ${request.guestPhone} for ${confirmationNumber}`);
      } catch (err: any) {
        this.logger.error(`Failed to send guest WhatsApp confirmation safely: ${err.message}`);
      }
    }

    return {
      success: true,
      message: 'Booking request approved and confirmed successfully',
      reservationId: reservation.id,
      confirmationNumber,
      roomNumber: selectedRoom.number,
      updatedRequest,
    };
  }

  /**
   * REJECT WORKFLOW:
   * 1. Require mandatory rejection reason
   * 2. Change status to Rejected (denied)
   * 3. Release any temporary room hold
   * 4. Notify the guest through WhatsApp
   */
  async reject(id: string, propertyId: string, body: { reason: string }) {
    const reason = body.reason?.trim();
    if (!reason) {
      throw new BadRequestException('A mandatory rejection reason is required to reject a booking request');
    }

    // 1. Fetch the request
    const [request] = await this.db
      .select()
      .from(bookingRequests)
      .where(and(eq(bookingRequests.id, id), eq(bookingRequests.propertyId, propertyId)));

    if (!request) {
      throw new NotFoundException(`Booking request ${id} not found`);
    }

    if (request.status === 'accepted') {
      throw new ConflictException('Cannot reject a booking request that has already been approved');
    }

    if (request.status === 'denied') {
      return { success: true, message: 'Booking request is already rejected', request };
    }

    // 2. Update status to denied
    const [updatedRequest] = await this.db
      .update(bookingRequests)
      .set({
        status: 'denied',
        denialReason: reason,
        decidedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(bookingRequests.id, id))
      .returning();

    // 3. Create Audit Log
    try {
      await this.db.insert(auditLogs).values({
        propertyId,
        action: 'reject',
        entityType: 'booking_request',
        entityId: id,
        description: `Booking request REJECTED. Reason: ${reason}`,
        newValue: {
          status: 'denied',
          reason,
        },
      });
    } catch (e: any) {
      this.logger.warn(`Audit log insert note: ${e.message}`);
    }

    // 4. Staff Notification
    const guestName = `${request.guestFirstName} ${request.guestLastName}`.trim();
    try {
      await this.db.insert(staffNotifications).values({
        id: crypto.randomUUID(),
        propertyId,
        type: 'booking_request_rejected',
        severity: 'info',
        title: 'Booking Request Rejected',
        message: `Direct booking request for ${guestName} was REJECTED. Reason: ${reason}`,
        sourceEvent: 'booking_request.rejected',
        sourceEntityType: 'booking_request',
        sourceEntityId: id,
      });
    } catch (e: any) {
      this.logger.warn(`Staff notification insert note: ${e.message}`);
    }

    // 5. Emit real-time WebSocket event
    try {
      this.eventsGateway?.server?.to(`property:${propertyId}`).emit('booking_request.rejected', {
        id,
        reason,
        guestName,
      });
    } catch (e: any) {
      this.logger.warn(`WebSocket notification skipped: ${e.message}`);
    }

    // 6. Notify guest through WhatsApp
    if (request.guestPhone) {
      const guestMessage =
        `🏨 *HOTEL SPARK — BOOKING REQUEST UPDATE*\n\n` +
        `Dear ${guestName},\n` +
        `Thank you for your interest in staying at Hotel Spark.\n\n` +
        `We regret to inform you that your booking request for ${request.arrivalDate} to ${request.departureDate} could not be confirmed.\n\n` +
        `📌 *Reason:* ${reason}\n\n` +
        `If you would like to select alternative dates or have any queries, please reply to this message or contact us at +91 98765 43210.\n\n` +
        `Warm regards,\n` +
        `Hotel Spark Reservations Team`;

      try {
        await this.whatsAppService.sendWhatsAppMessage(request.guestPhone, guestMessage);
        this.logger.log(`WhatsApp rejection notification sent to guest ${request.guestPhone}`);
      } catch (err: any) {
        this.logger.error(`Failed to send guest WhatsApp rejection safely: ${err.message}`);
      }
    }

    return {
      success: true,
      message: 'Booking request rejected successfully',
      updatedRequest,
    };
  }

  /**
   * Full booking history and audit trail
   */
  async history(propertyId: string, page = 1, limit = 50) {
    const offset = (Math.max(1, page) - 1) * limit;

    const logs = await this.db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.propertyId, propertyId),
          eq(auditLogs.entityType, 'booking_request'),
        ),
      )
      .orderBy(desc(auditLogs.occurredAt))
      .limit(limit)
      .offset(offset);

    return { data: logs, page, limit };
  }
}
