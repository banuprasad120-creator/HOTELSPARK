const postgres = require(require.resolve('postgres', { paths: ['packages/database'] }));
const sql = postgres('postgresql://haip:haip@localhost:5432/haip');

async function inspect() {
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
      (SELECT count(*) FROM folios) as folios,
      (SELECT count(*) FROM staff_notifications) as staff_notifications,
      (SELECT count(*) FROM whatsapp_conversations) as whatsapp_conversations,
      (SELECT count(*) FROM whatsapp_messages) as whatsapp_messages
  `;
  console.log('CURRENT COUNTS:', counts);

  const resList = await sql`
    SELECT r.id, b.confirmation_number, g.first_name, g.last_name, r.status, b.source
    FROM reservations r
    JOIN bookings b ON b.id = r.booking_id
    JOIN guests g ON g.id = r.guest_id
  `;
  console.log('RESERVATIONS:', resList);

  const guestsList = await sql`SELECT id, first_name, last_name, email, phone FROM guests`;
  console.log('GUESTS:', guestsList);

  await sql.end();
}

inspect().catch(console.error);
