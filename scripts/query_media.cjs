const postgres = require(require.resolve('postgres', { paths: ['packages/database'] }));
const sql = postgres('postgresql://haip:haip@localhost:5432/haip');
async function run() {
  const m = await sql`SELECT id, owner_type, owner_id, url, caption, is_primary FROM media`;
  console.log(m);
  await sql.end();
}
run();

