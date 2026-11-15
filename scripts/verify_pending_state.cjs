const postgres = require(require.resolve('postgres', { paths: ['packages/database'] }));
const sql = postgres(process.env.DATABASE_URL || 'postgresql://haip:haip@localhost:5432/haip');

async function check() {
  const [resCount] = await sql`SELECT COUNT(*)::int as c FROM reservations`;
  const [reqCount] = await sql`SELECT COUNT(*)::int as c FROM booking_requests WHERE status = 'pending'`;
  const notifs = await sql`SELECT title, message, severity FROM staff_notifications ORDER BY created_at DESC LIMIT 2`;

  console.log('Confirmed Reservations count (MUST BE 0):', resCount.c);
  console.log('Pending Booking Requests count (MUST BE 1):', reqCount.c);
  console.log('Staff Notifications generated:');
  console.log(notifs);
  await sql.end();
}
check().catch(console.error);
