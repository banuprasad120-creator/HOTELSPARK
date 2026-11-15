const postgres = require(require.resolve('postgres', { paths: ['packages/database'] }));
const sql = postgres(process.env.DATABASE_URL || 'postgresql://haip:haip@localhost:5432/haip');

async function testApprove() {
  const propertyId = 'a0000001-0000-4000-a000-000000000001';
  const id = '858c15ee-eef2-4a6e-a444-76e8313d60b5';
  
  // 1. Fetch request
  const [request] = await sql`
    SELECT * FROM booking_requests WHERE id = ${id} AND property_id = ${propertyId} FOR UPDATE
  `;
  console.log('Request locked:', request.id, request.status);

  // 2. Available rooms
  const rooms = await sql`
    SELECT r.id, r.number, r.floor, r.status
    FROM rooms r
    WHERE r.property_id = ${propertyId}
      AND r.room_type_id = ${request.room_type_id}
      AND r.is_active = true
      AND r.id NOT IN (
        SELECT res.room_id
        FROM reservations res
        WHERE res.property_id = ${propertyId}
          AND res.room_id IS NOT NULL
          AND res.status IN ('confirmed', 'assigned', 'checked_in')
          AND NOT (res.departure_date <= ${request.arrival_date} OR res.arrival_date >= ${request.departure_date})
      )
  `;
  console.log('Available rooms count:', rooms.length);

  await sql.end();
}
testApprove().catch(console.error);
