import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';

const connectionString = process.env.DATABASE_URL || 'postgresql://haip:haip@localhost:5432/haip';
const sql = postgres(connectionString);

async function main() {
  console.log('Auditing database...');
  const properties = await sql`SELECT id, name, code, currency_code, country_code FROM properties`;
  console.log('Properties:', properties);

  const roomTypes = await sql`SELECT id, property_id, name, code, bed_type, max_occupancy FROM room_types`;
  console.log('Room Types count:', roomTypes.length);

  const rooms = await sql`SELECT id, property_id, room_number, room_type_id, status FROM rooms`;
  console.log('Physical Rooms count:', rooms.length);

  const reservations = await sql`SELECT id, property_id, guest_id, room_id, status, check_in_date, check_out_date, total_amount FROM reservations`;
  console.log('Reservations count:', reservations.length);

  const bookings = await sql`SELECT id, property_id, status, guest_id, total_amount, currency_code FROM bookings`;
  console.log('Bookings count:', bookings.length);

  const guests = await sql`SELECT id, first_name, last_name, email, phone FROM guests`;
  console.log('Guests count:', guests.length);

  const media = await sql`SELECT id, property_id, owner_type, owner_id, url, caption, is_primary, sort_order FROM media`;
  console.log('Media count:', media.length);

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
  };

  const backupDir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  const backupPath = path.join(backupDir, 'backup_demo_data.json');
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf-8');
  console.log(`Verified backup written to ${backupPath}`);

  await sql.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

