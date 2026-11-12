const postgres = require(require.resolve('postgres', { paths: ['packages/database'] }));
const sql = postgres(process.env.DATABASE_URL || 'postgresql://haip:haip@localhost:5432/haip');

async function run() {
  const latestBookings = await sql`
    SELECT b.id, b.confirmation_number, b.channel_code, b.source, b.created_at,
           r.status as res_status, r.arrival_date, r.departure_date, r.total_amount, r.currency_code,
           g.first_name, g.last_name, g.email, g.phone
    FROM bookings b
    LEFT JOIN reservations r ON r.booking_id = b.id
    LEFT JOIN guests g ON r.guest_id = g.id
    ORDER BY b.created_at DESC LIMIT 10
  `;
  console.log('LATEST 10 BOOKINGS IN DB:');
  console.table(latestBookings);
  await sql.end();
}
run();
