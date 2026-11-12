const postgres = require(require.resolve('postgres', { paths: ['packages/database'] }));
const sql = postgres('postgresql://haip:haip@localhost:5432/haip');

async function cleanMockData() {
  console.log('--- PURGING ALL MOCK DATA FROM HOTEL SPARK DATABASE ---');

  // 1. WhatsApp conversations and messages
  await sql`DELETE FROM whatsapp_messages`;
  await sql`DELETE FROM whatsapp_conversations`;
  console.log('✓ Cleaned whatsapp_messages and whatsapp_conversations');

  // 2. Staff notifications and reads
  await sql`DELETE FROM staff_notification_reads`;
  await sql`DELETE FROM staff_notifications`;
  console.log('✓ Cleaned staff_notifications and staff_notification_reads');

  // 3. Webhook events and deliveries
  await sql`DELETE FROM webhook_deliveries`;
  await sql`DELETE FROM webhook_events`;
  console.log('✓ Cleaned webhook_events and webhook_deliveries');

  // 4. Folios, charges, payments, deposit ledgers
  await sql`DELETE FROM deposit_ledger_entries`;
  await sql`DELETE FROM folio_inbound_posts`;
  await sql`DELETE FROM charges`;
  await sql`DELETE FROM payments`;
  await sql`DELETE FROM folios`;
  console.log('✓ Cleaned folios, charges, payments, and deposit ledger');

  // 5. Reservation dependents
  await sql`DELETE FROM inventory_ledger`;
  await sql`DELETE FROM reservation_services`;
  await sql`DELETE FROM reservation_notes`;
  await sql`DELETE FROM reservation_guests`;
  await sql`DELETE FROM channel_reservations`;

  // 6. Reservations and Bookings
  await sql`DELETE FROM reservations`;
  await sql`DELETE FROM bookings`;
  console.log('✓ Cleaned reservations, bookings, and inventory_ledger');

  // 8. Guests
  await sql`DELETE FROM guest_reviews`;
  await sql`DELETE FROM loyalty_transactions`;
  await sql`DELETE FROM loyalty_accounts`;
  await sql`DELETE FROM guests`;
  console.log('✓ Cleaned all mock guests');

  // Verify clean state
  const [counts] = await sql`
    SELECT
      (SELECT count(*) FROM properties) as properties,
      (SELECT count(*) FROM room_types) as room_types,
      (SELECT count(*) FROM rooms) as rooms,
      (SELECT count(*) FROM rate_plans) as rate_plans,
      (SELECT count(*) FROM media) as media,
      (SELECT count(*) FROM reservations) as reservations,
      (SELECT count(*) FROM bookings) as bookings,
      (SELECT count(*) FROM guests) as guests,
      (SELECT count(*) FROM staff_notifications) as staff_notifications,
      (SELECT count(*) FROM whatsapp_conversations) as whatsapp_conversations
  `;
  console.log('CLEAN SLATE VERIFIED:', counts);

  await sql.end();
}

cleanMockData().catch((err) => {
  console.error('Error cleaning mock data:', err);
  process.exit(1);
});
