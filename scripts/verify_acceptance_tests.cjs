const postgres = require(require.resolve('postgres', { paths: ['packages/database'] }));
const sql = postgres(process.env.DATABASE_URL || 'postgresql://haip:haip@localhost:5432/haip');

const API_BASE = 'http://localhost:3000/api/v1';
const BOOKING_KEY = 'pk_live_HAIPDEMO0000000000000000';
const PROPERTY_ID = 'a0000001-0000-4000-a000-000000000001';

async function run() {
  console.log('================================================================');
  console.log('SPARK HOTEL: 10/10 ACCEPTANCE VERIFICATION RUN');
  console.log('================================================================\n');

  let passed = 0;

  // TEST 1: Property Settings & Currency in PMS
  console.log('--- TEST 1: Property Settings & Currency (INR / ₹) ---');
  const [prop] = await sql`SELECT id, name, code, currency_code, city, state_province FROM properties WHERE id = ${PROPERTY_ID}`;
  if (prop && prop.name === 'Hotel Spark' && prop.currency_code === 'INR') {
    console.log(`[PASS] Property is "${prop.name}" in ${prop.city}, Currency is ${prop.currency_code}`);
    passed++;
  } else {
    console.error('[FAIL] Property settings invalid:', prop);
  }

  // TEST 2: PMS Room Categories & Rate Plans in INR
  console.log('\n--- TEST 2: Real Room Categories & INR Rates in PMS DB ---');
  const ratePlans = await sql`SELECT id, name, code, currency_code, base_amount FROM rate_plans WHERE property_id = ${PROPERTY_ID}`;
  console.log(`Found ${ratePlans.length} active rate plans in DB:`);
  ratePlans.forEach(rp => console.log(`  • ${rp.name} (${rp.code}): ₹${rp.base_amount} ${rp.currency_code}`));
  if (ratePlans.length >= 4 && ratePlans.every(rp => rp.currency_code === 'INR')) {
    console.log('[PASS] All rate plans have real base amounts in INR (₹).');
    passed++;
  } else {
    console.error('[FAIL] Rate plans missing or not in INR');
  }

  // TEST 3: Room Category Cover Photos in Media Table
  console.log('\n--- TEST 3: Room Type Photographs in Media Table ---');
  const mediaRows = await sql`SELECT id, owner_id, url, caption, is_primary FROM media WHERE owner_type = 'room_type'`;
  console.log(`Found ${mediaRows.length} uploaded room photos in DB:`);
  mediaRows.forEach(m => console.log(`  • ${m.caption} (Primary: ${m.is_primary}): ${m.url.substring(0, 60)}...`));
  if (mediaRows.length >= 4) {
    console.log('[PASS] Room photographs exist and are linked to room types.');
    passed++;
  } else {
    console.error('[FAIL] Insufficient room photos in media table');
  }

  // TEST 4: Website Live Search & Pricing in INR
  console.log('\n--- TEST 4: Website Live Search & Pricing (Connect + Inventory Engine) ---');
  const searchRes = await fetch(`${API_BASE}/booking-engine/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-booking-key': BOOKING_KEY },
    body: JSON.stringify({ checkIn: '2026-11-20', checkOut: '2026-11-21', adults: 2, children: 0 }),
  }).then(r => r.json());

  const roomTypes = searchRes.results?.[0]?.roomTypes ?? [];
  console.log(`Search returned ${roomTypes.length} sellable room categories for Hotel Spark:`);
  roomTypes.forEach(rt => {
    const rate = rt.rates?.[0];
    console.log(`  • ${rt.roomTypeName}: ${rate?.currencyCode === 'INR' ? '₹' : '$'}${rate?.totalAmount} (Photos: ${rt.images?.length ?? 0})`);
  });

  const hasInr = roomTypes.length > 0 && roomTypes.every(rt => rt.rates[0]?.currencyCode === 'INR');
  const hasPhotos = roomTypes.every(rt => rt.images?.length > 0);
  if (hasInr && hasPhotos) {
    console.log('[PASS] Website returns real PMS room records with real images and INR (₹) rates.');
    passed++;
  } else {
    console.error('[FAIL] Search response did not return INR rates or images', searchRes);
  }

  // TEST 5: Direct Website Booking & Immediate PMS Reflection
  console.log('\n--- TEST 5: Direct Website Reservation & Immediate PMS Reflection ---');
  const selectedRoom = roomTypes[0];
  const bookRes = await fetch(`${API_BASE}/booking-engine/book`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-booking-key': BOOKING_KEY, 'x-publishable-key': BOOKING_KEY },
    body: JSON.stringify({
      roomTypeId: selectedRoom.roomTypeId,
      ratePlanId: selectedRoom.rates[0].ratePlanId,
      checkIn: '2026-11-20',
      checkOut: '2026-11-21',
      adults: 2,
      children: 0,
      guestFirstName: 'Ananya',
      guestLastName: 'Sharma',
      guestEmail: 'ananya.sharma@example.in',
      guestPhone: '+91 98765 11111',
      paymentToken: 'tok_mock_site',
    }),
  }).then(r => r.json());

  console.log(`Direct Booking Result: Confirmation=${bookRes.confirmationNumber}, Status=${bookRes.status}`);
  const [pmsRes] = await sql`SELECT r.id, b.confirmation_number, r.status, r.arrival_date, r.departure_date, r.total_amount, r.currency_code 
    FROM reservations r 
    JOIN bookings b ON r.booking_id = b.id 
    WHERE b.confirmation_number = ${bookRes.confirmationNumber}`;

  if (pmsRes && pmsRes.confirmation_number === bookRes.confirmationNumber) {
    console.log(`[PASS] Booking ${pmsRes.confirmation_number} immediately exists in PMS DB. Total: ₹${pmsRes.total_amount} ${pmsRes.currency_code}`);
    passed++;
  } else {
    console.error('[FAIL] Booking not found in PMS reservations table');
  }

  // TEST 6: WhatsApp Cloud API Webhook Verification (GET)
  console.log('\n--- TEST 6: WhatsApp Cloud API Webhook Verification (hub.challenge) ---');
  const challenge = 'spark_challenge_998877';
  const verifyRes = await fetch(`${API_BASE}/channels/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=spark_hotel_webhook_secret_2026&hub.challenge=${challenge}`)
    .then(r => r.text());

  if (verifyRes === challenge) {
    console.log(`[PASS] Webhook verification returned plain challenge: "${verifyRes}"`);
    passed++;
  } else {
    console.error(`[FAIL] Webhook verification failed: "${verifyRes}"`);
  }

  // TEST 7: WhatsApp Receptionist Multilingual Enquiry (English / Hindi / Telugu)
  console.log('\n--- TEST 7: WhatsApp Multilingual AI Receptionist Enquiry ---');
  const waChatRes = await fetch(`${API_BASE}/channels/whatsapp/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'హోటల్ స్పార్క్‌లో గదులు మరియు ధరల వివరాలు చెప్పండి',
      guestPhone: '919876599999',
      guestName: 'వెంకట్ రావు',
    }),
  }).then(r => r.json());

  console.log(`Telugu WhatsApp Reply preview:\n"${waChatRes.replyText?.substring(0, 100)}..."`);
  if (waChatRes.language === 'te' && waChatRes.replyText?.includes('₹')) {
    console.log('[PASS] AI receptionist understood Telugu and responded with live ₹ room rates.');
    passed++;
  } else {
    console.error('[FAIL] Multilingual WhatsApp response invalid', waChatRes);
  }

  // TEST 8: Full WhatsApp Booking Flow & PMS Persistence
  console.log('\n--- TEST 8: Full WhatsApp Autonomous Booking Flow & PMS Persistence ---');
  const waPhone = '919876588888';
  // Step 1: Request room
  await fetch(`${API_BASE}/channels/whatsapp/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'I want to book Standard King from 2026-11-22 to 2026-11-23 for 2 guests', guestPhone: waPhone, guestName: 'Vikram Varma' }),
  });
  // Step 2: Confirm
  const waConfirmRes = await fetch(`${API_BASE}/channels/whatsapp/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'CONFIRM', guestPhone: waPhone, guestName: 'Vikram Varma' }),
  }).then(r => r.json());

  const matchRef = waConfirmRes.replyText?.match(/HAIP-[A-Z0-9]+/);
  const waBookingRef = matchRef ? matchRef[0] : null;
  console.log(`WhatsApp Generated Booking Reference: ${waBookingRef}`);

  if (waBookingRef) {
    const [waPms] = await sql`SELECT b.confirmation_number, b.channel_code, r.total_amount, r.currency_code 
      FROM reservations r 
      JOIN bookings b ON r.booking_id = b.id 
      WHERE b.confirmation_number = ${waBookingRef}`;

    if (waPms && waPms.channel_code === 'whatsapp') {
      console.log(`[PASS] WhatsApp booking ${waPms.confirmation_number} confirmed in PMS DB with channel "whatsapp"!`);
      passed++;
    } else {
      console.error('[FAIL] WhatsApp booking not found in PMS reservations', waPms);
    }
  } else {
    console.error('[FAIL] Confirmation reference not generated by WhatsApp receptionist');
  }

  // TEST 9: Manager Notification Dispatch & Staff Notification Record
  console.log('\n--- TEST 9: Manager Alert Dispatch & PMS Staff Notification ---');
  const [staffNotif] = await sql`SELECT id, type, title, message, created_at 
    FROM staff_notifications 
    WHERE property_id = ${PROPERTY_ID} AND message LIKE ${'%' + waBookingRef + '%'} 
    ORDER BY created_at DESC LIMIT 1`;

  if (staffNotif) {
    console.log(`[PASS] PMS Staff Notification recorded: "${staffNotif.title}" (Type: ${staffNotif.type})`);
    console.log(`  Notification text: "${staffNotif.message}"`);
    passed++;
  } else {
    console.error('[FAIL] Staff notification not created for WhatsApp booking');
  }

  // TEST 10: Human Takeover Flow (Pause AI, Staff Reply, Resume AI)
  console.log('\n--- TEST 10: Human Takeover Flow (Pause, Staff Reply, Resume) ---');
  const [conv] = await sql`SELECT id, guest_phone, ai_status FROM whatsapp_conversations WHERE guest_phone = ${waPhone}`;
  
  // Pause
  const pauseRes = await fetch(`${API_BASE}/channels/whatsapp/conversations/${conv.id}/pause`, { method: 'POST' }).then(r => r.json());
  // Staff Reply
  const replyRes = await fetch(`${API_BASE}/channels/whatsapp/conversations/${conv.id}/reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body: 'Hello Vikram, this is the General Manager. Your airport pickup is arranged!' }),
  }).then(r => r.json());
  // Resume
  const resumeRes = await fetch(`${API_BASE}/channels/whatsapp/conversations/${conv.id}/resume`, { method: 'POST' }).then(r => r.json());

  const [resumedConv] = await sql`SELECT ai_status FROM whatsapp_conversations WHERE id = ${conv.id}`;
  const [staffMsg] = await sql`SELECT sender_type, body FROM whatsapp_messages WHERE conversation_id = ${conv.id} AND sender_type = 'staff' LIMIT 1`;

  console.log('Pause Res:', pauseRes);
  console.log('Reply Res:', replyRes);
  console.log('Resume Res:', resumeRes);
  console.log('Staff Msg:', staffMsg);
  console.log('Resumed Conv ai_status:', resumedConv?.ai_status);

  if (
    (pauseRes.ai_status === 'paused' || pauseRes.status === 'paused') &&
    replyRes.success &&
    (resumeRes.ai_status === 'active' || resumeRes.status === 'active') &&
    staffMsg
  ) {
    console.log(`[PASS] Human Takeover verified: AI successfully paused, Staff message stored ("${staffMsg.body.substring(0, 45)}..."), and AI resumed.`);
    passed++;
  } else {
    console.error('[FAIL] Human takeover verification failed');
  }

  console.log('\n================================================================');
  console.log(`RESULTS: ${passed}/10 ACCEPTANCE TESTS PASSED`);
  console.log('================================================================');

  await sql.end();
}

run().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
