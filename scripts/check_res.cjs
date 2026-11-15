const postgres = require(require.resolve('postgres', { paths: ['packages/database'] }));
const sql = postgres(process.env.DATABASE_URL || 'postgresql://haip:haip@localhost:5432/haip');

async function main() {
  const rows = await sql`SELECT r.id, b.confirmation_number, r.status, r.arrival_date, r.created_at FROM reservations r LEFT JOIN bookings b ON r.booking_id = b.id`;
  console.log('Reservations in DB:', rows);
  await sql.end();
}
main().catch(console.error);
