const fs = require('fs');
const path = require('path');
const postgres = require(path.resolve(__dirname, '../packages/database/node_modules/postgres'));

const sql = postgres('postgresql://haip:haip@localhost:5432/haip');
const migration = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20261115220000_spark_hotel_single_pms_extensions.sql'), 'utf8');

async function run() {
  try {
    console.log('Applying Spark Hotel Single PMS extensions to local database...');
    await sql.unsafe(migration);
    console.log('✅ Migration applied successfully!');

    const depts = await sql`SELECT name, code FROM departments`;
    console.log('Departments in DB:', depts.map(d => d.name));

    const emps = await sql`SELECT name, role FROM employees`;
    console.log('Employees in DB:', emps.map(e => e.name + ' (' + e.role + ')'));

    await sql.end();
  } catch (err) {
    console.error('Error applying migration:', err);
    process.exit(1);
  }
}

run();
