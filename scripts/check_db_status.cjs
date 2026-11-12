const postgres = require(require.resolve('postgres', { paths: ['packages/database'] }));
const sql = postgres(process.env.DATABASE_URL || 'postgresql://haip:haip@localhost:5432/haip');

async function main() {
  const props = await sql`SELECT id, name, code, currency_code FROM properties`;
  console.log('PROPERTIES:');
  console.table(props);

  const rps = await sql`SELECT id, name, code, currency_code, base_amount FROM rate_plans`;
  console.log('RATE PLANS:');
  console.table(rps);

  const rts = await sql`SELECT id, name, code, base_price_cents FROM room_types`;
  console.log('ROOM TYPES:');
  console.table(rts);

  const media = await sql`SELECT id, owner_type, owner_id, url, is_primary FROM media WHERE owner_type = 'room_type'`;
  console.log('ROOM MEDIA:');
  console.table(media);

  await sql.end();
}
main();
