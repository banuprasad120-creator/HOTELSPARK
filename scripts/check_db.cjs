const postgres = require(require.resolve('postgres', { paths: ['packages/database'] }));
const sql = postgres('postgresql://haip:haip@localhost:5432/haip');

async function run() {
  const props = await sql`SELECT id, name, currency_code, default_language FROM properties`;
  console.log('PROPERTIES:', props);
  const rps = await sql`SELECT id, name, code, base_amount, currency_code FROM rate_plans`;
  console.log('RATE PLANS:', rps);
  const media = await sql`SELECT id, owner_type, owner_id, url FROM media`;
  console.log('MEDIA ITEMS:', media);
  const reservations = await sql`SELECT r.id, r.property_id, r.status, r.total_amount, b.confirmation_number, g.first_name, g.last_name, g.email FROM reservations r JOIN bookings b ON b.id = r.booking_id JOIN guests g ON g.id = r.guest_id ORDER BY r.created_at DESC LIMIT 5`;
  console.log('RESERVATIONS:', reservations);
  const cfg = await sql`SELECT * FROM booking_engine_config`;
  console.log('CONFIG:', cfg);
  await sql.end();
}
run().catch(console.error);
