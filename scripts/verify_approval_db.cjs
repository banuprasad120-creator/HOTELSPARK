const postgres = require(require.resolve('postgres', { paths: ['packages/database'] }));
const sql = postgres(process.env.DATABASE_URL || 'postgresql://haip:haip@localhost:5432/haip');

async function check() {
  const [res] = await sql`SELECT * FROM reservations WHERE id = 'ed1191b4-6e4b-45d5-a858-a3523a1dd6d8'`;
  console.log('Confirmed reservation:', {
    id: res?.id,
    arrival: res?.arrival_date,
    departure: res?.departure_date,
    room_id: res?.room_id,
    status: res?.status,
    total_amount: res?.total_amount
  });

  const [rm] = await sql`SELECT number, floor FROM rooms WHERE id = ${res.room_id}`;
  console.log('Assigned physical room:', rm);

  const [fol] = await sql`SELECT * FROM folios WHERE reservation_id = ${res.id}`;
  console.log('Folio created:', {
    id: fol?.id,
    number: fol?.folio_number,
    charges: fol?.total_charges,
    balance: fol?.balance
  });

  const audits = await sql`SELECT action, entity_type, description, occurred_at FROM audit_logs ORDER BY occurred_at DESC LIMIT 3`;
  console.log('Recent audit logs:', audits);

  const notifs = await sql`SELECT type, title, message FROM staff_notifications ORDER BY created_at DESC LIMIT 3`;
  console.log('Recent staff notifications:', notifs);

  await sql.end();
}

check();
