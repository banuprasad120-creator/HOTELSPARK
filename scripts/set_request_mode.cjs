const postgres = require(require.resolve('postgres', { paths: ['packages/database'] }));
const sql = postgres(process.env.DATABASE_URL || 'postgresql://haip:haip@localhost:5432/haip');

async function main() {
  const propertyId = 'a0000001-0000-4000-a000-000000000001';
  await sql`
    UPDATE booking_engine_config SET
      booking_mode = 'request',
      payment_method_collection = 'disabled',
      auto_confirm = false,
      updated_at = NOW()
    WHERE property_id = ${propertyId}
  `;
  console.log('booking_engine_config set to booking_mode: request, auto_confirm: false');
  await sql.end();
}
main().catch(console.error);
