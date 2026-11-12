const postgres = require(require.resolve('postgres', { paths: ['packages/database'] }));
const sql = postgres(process.env.DATABASE_URL || 'postgresql://haip:haip@localhost:5432/haip');

async function checkCounts() {
  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `;
  console.log('Tables with data:');
  for (const t of tables) {
    try {
      const res = await sql.unsafe(`SELECT COUNT(*)::int as cnt FROM "${t.table_name}"`);
      if (res[0].cnt > 0) {
        console.log(`  ${t.table_name}: ${res[0].cnt}`);
      }
    } catch (e) {
      console.log(`  ${t.table_name}: error reading (${e.message})`);
    }
  }
  await sql.end();
}

checkCounts().catch(console.error);
