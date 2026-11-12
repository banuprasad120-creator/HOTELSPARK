const fs = require('fs');
const path = require('path');
const postgres = require(require.resolve('postgres', { paths: ['packages/database'] }));

const connectionString = process.env.DATABASE_URL || 'postgresql://haip:haip@localhost:5432/haip';
const sql = postgres(connectionString);

async function main() {
  console.log('Auditing database...');
  const properties = await sql`SELECT * FROM properties`;
  console.log('Properties:', properties.map(p => ({ id: p.id, name: p.name, code: p.code, currency: p.currency_code })));

  const roomTypes = await sql`SELECT * FROM room_types`;
  console.log('Room Types count:', roomTypes.length);

  const rooms = await sql`SELECT * FROM rooms`;
  console.log('Physical Rooms count:', rooms.length);

  const reservations = await sql`SELECT * FROM reservations`;
  console.log('Reservations count:', reservations.length);

  const bookings = await sql`SELECT * FROM bookings`;
  console.log('Bookings count:', bookings.length);

  const guests = await sql`SELECT * FROM guests`;
  console.log('Guests count:', guests.length);

  const media = await sql`SELECT * FROM media`;
  console.log('Media count:', media.length);

  const folios = await sql`SELECT * FROM folios`;
  console.log('Folios count:', folios.length);

  // Backup existing data to data/backup_demo_data.json
  const backup = {
    timestamp: new Date().toISOString(),
    properties,
    roomTypes,
    rooms,
    reservations,
    bookings,
    guests,
    media,
    folios,
  };

  const backupDir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  const backupPath = path.join(backupDir, 'backup_demo_data.json');
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf-8');
  console.log(`Verified backup successfully written to ${backupPath}`);

  await sql.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
