const postgres = require(require.resolve('postgres', { paths: ['packages/database'] }));
const sql = postgres('postgresql://haip:haip@localhost:5432/haip');

async function run() {
  const cols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'staff_notifications'`;
  console.log('staff_notifications columns:', cols.map(c => `${c.column_name} (${c.data_type})`));
  await sql.end();
}
run().catch(console.error);

