const postgres = require(require.resolve('postgres', { paths: ['packages/database'] }));
const sql = postgres(process.env.DATABASE_URL || 'postgresql://haip:haip@localhost:5432/haip');

async function main() {
  const rows = await sql`SELECT property_id, display_name, booking_mode, payment_method_collection, auto_confirm FROM booking_engine_config`;
  console.log('booking_engine_config:', rows);
  await sql.end();
}
main().catch(console.error);
