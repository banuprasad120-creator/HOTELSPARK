import postgres from 'postgres';

async function main() {
  const adminUrl = process.env['ADMIN_DATABASE_URL'] ?? 'postgresql://haip@localhost:5432/postgres';
  console.log('Connecting to admin database:', adminUrl);
  const sql = postgres(adminUrl);

  const reset = process.argv.includes('--reset');

  if (reset) {
    console.log('Resetting databases...');
    try {
      await sql.unsafe('DROP DATABASE IF EXISTS haip WITH (FORCE);');
      console.log('Dropped haip database.');
    } catch (e: any) {
      console.log('Drop haip error:', e.message);
    }
    try {
      await sql.unsafe('DROP DATABASE IF EXISTS haip_test WITH (FORCE);');
      console.log('Dropped haip_test database.');
    } catch (e: any) {
      console.log('Drop haip_test error:', e.message);
    }
  }

  try {
    await sql.unsafe('CREATE DATABASE haip;');
    console.log('Successfully created database: haip');
  } catch (err: any) {
    console.log('haip database status:', err.message);
  }

  try {
    await sql.unsafe('CREATE DATABASE haip_test;');
    console.log('Successfully created database: haip_test');
  } catch (err: any) {
    console.log('haip_test database status:', err.message);
  }

  try {
    await sql.unsafe("ALTER USER haip WITH PASSWORD 'haip';");
    console.log("Set password 'haip' for user haip.");
  } catch (err: any) {
    console.log('Role alter status:', err.message);
  }

  const dbs = await sql`SELECT datname FROM pg_database;`;
  console.log('Existing databases:', dbs.map((r: any) => r.datname));
  await sql.end();
}

main().catch((err) => {
  console.error('Failed to create databases:', err);
  process.exit(1);
});
