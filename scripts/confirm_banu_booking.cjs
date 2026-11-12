const postgres = require(require.resolve('postgres', { paths: ['packages/database'] }));
const sql = postgres('postgresql://haip:haip@localhost:5432/haip');

async function run() {
  const [res] = await sql`
    SELECT r.id, r.property_id, r.status, r.arrival_date, r.departure_date, r.adults, r.total_amount,
           b.confirmation_number, g.first_name, g.last_name, g.phone, g.email,
           rt.name as room_type_name
    FROM reservations r
    JOIN bookings b ON b.id = r.booking_id
    JOIN guests g ON g.id = r.guest_id
    JOIN room_types rt ON rt.id = r.room_type_id
    WHERE b.confirmation_number = 'HAIP-N32042S6E3V771P2E5M7Q0R344D0E370'
  `;

  if (!res) {
    console.error('Reservation not found!');
    process.exit(1);
  }

  console.log('Found reservation for Banu Prasad:', res);

  // 1. Update status to confirmed
  await sql`UPDATE reservations SET status = 'confirmed', updated_at = NOW() WHERE id = ${res.id}`;
  console.log('Updated reservation status to confirmed');

  // 2. Insert into staff_notifications
  await sql`
    INSERT INTO staff_notifications (
      property_id, type, title, message, severity, source_event, source_entity_type, source_entity_id
    ) VALUES (
      ${res.property_id},
      'reservation_created',
      ${'New Website Direct Booking — ' + res.first_name + ' ' + res.last_name},
      ${'Booking ' + res.confirmation_number + ' confirmed for ' + res.room_type_name + ' (' + res.arrival_date + ' → ' + res.departure_date + ', ₹' + Number(res.total_amount).toLocaleString('en-IN') + '). Guest: ' + res.first_name + ' ' + res.last_name + ' (' + (res.phone || res.email) + '). Source: Spark Website Direct.'},
      'info',
      'booking.created',
      'reservation',
      ${res.id}
    )
  `;
  console.log('Inserted staff notification successfully');

  // Also confirm any other pending reservations
  const otherPending = await sql`
    SELECT r.id, b.confirmation_number, g.first_name, g.last_name
    FROM reservations r
    JOIN bookings b ON b.id = r.booking_id
    JOIN guests g ON g.id = r.guest_id
    WHERE r.status = 'pending' AND r.property_id = ${res.property_id}
  `;
  console.log('Other pending reservations to confirm:', otherPending);
  for (const op of otherPending) {
    await sql`UPDATE reservations SET status = 'confirmed', updated_at = NOW() WHERE id = ${op.id}`;
    console.log('Auto-confirmed pending reservation:', op.confirmation_number, op.first_name, op.last_name);
  }

  await sql.end();
}

run().catch(console.error);
