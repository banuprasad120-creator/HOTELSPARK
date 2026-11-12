const postgres = require(require.resolve('postgres', { paths: ['packages/database'] }));
const sql = postgres('postgresql://haip:haip@localhost:5432/haip');

async function run() {
  const notifs = await sql`SELECT id, title, message, severity, created_at FROM staff_notifications ORDER BY created_at DESC LIMIT 3`;
  console.log('LATEST STAFF NOTIFICATIONS:', notifs);
  await sql.end();
}
run().catch(console.error);

