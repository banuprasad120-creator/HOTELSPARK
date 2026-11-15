const postgres = require(require.resolve('postgres', { paths: ['packages/database'] }));
const sql = postgres(process.env.DATABASE_URL || 'postgresql://haip:haip@localhost:5432/haip');

async function testApproveExact() {
  const propertyId = 'a0000001-0000-4000-a000-000000000001';
  const id = '858c15ee-eef2-4a6e-a444-76e8313d60b5';

  await sql.begin(async (tx) => {
    // 1. Fetch request
    const [request] = await tx`SELECT * FROM booking_requests WHERE id = ${id} AND property_id = ${propertyId} FOR UPDATE`;
    console.log('1. Locked request:', request.id);

    // 2. Available rooms
    const categoryRooms = await tx`
      SELECT id, number, floor, status, hk_occupancy
      FROM rooms
      WHERE property_id = ${propertyId}
        AND room_type_id = ${request.room_type_id}
        AND is_active = true
    `;
    const conflicts = await tx`
      SELECT room_id FROM reservations
      WHERE property_id = ${propertyId}
        AND status IN ('confirmed', 'assigned', 'checked_in')
        AND NOT (departure_date <= ${request.arrival_date}::date OR arrival_date >= ${request.departure_date}::date)
    `;
    const busySet = new Set(conflicts.map(c => c.room_id).filter(Boolean));
    const available = categoryRooms.filter(r => !busySet.has(r.id));
    console.log('2. Available rooms:', available.map(r => r.number));

    const selectedRoom = available[0];

    // Check guest (guests table has no property_id)
    const [existingGuest] = await tx`SELECT * FROM guests WHERE email = ${request.guest_email}`;
    let guestId = existingGuest ? existingGuest.id : null;
    if (!guestId) {
      const [newGuest] = await tx`
        INSERT INTO guests (first_name, last_name, email, phone)
        VALUES (${request.guest_first_name}, ${request.guest_last_name}, ${request.guest_email}, ${request.guest_phone})
        RETURNING id
      `;
      guestId = newGuest.id;
    }
    console.log('3. Guest id:', guestId);

    const confirmationNumber = 'SPK-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const finalTotal = request.submitted_total;
    const nights = Math.max(1, Math.round((new Date(request.departure_date) - new Date(request.arrival_date)) / (1000*60*60*24)));

    // Insert booking
    const [booking] = await tx`
      INSERT INTO bookings (property_id, guest_id, confirmation_number, source, channel_code)
      VALUES (${propertyId}, ${guestId}, ${confirmationNumber}, 'direct', 'direct_booking')
      RETURNING id
    `;
    console.log('4. Booking created:', booking.id);

    // Insert reservation
    const [reservation] = await tx`
      INSERT INTO reservations (
        property_id, booking_id, guest_id, room_id, room_type_id, rate_plan_id,
        arrival_date, departure_date, nights, adults, children, total_amount, currency_code,
        status, special_requests
      ) VALUES (
        ${propertyId}, ${booking.id}, ${guestId}, ${selectedRoom.id}, ${request.room_type_id}, ${request.rate_plan_id},
        ${request.arrival_date}, ${request.departure_date}, ${nights}, ${request.adults}, ${request.children || 0},
        ${finalTotal}, ${request.currency_code || 'INR'}, 'assigned', ${request.special_requests}
      ) RETURNING id
    `;
    console.log('5. Reservation created:', reservation.id);

    // Insert folio
    const folioNumber = `FOL-${confirmationNumber.slice(-8)}`;
    const [folio] = await tx`
      INSERT INTO folios (
        property_id, reservation_id, booking_id, guest_id, folio_number,
        type, currency_code, status, total_charges, balance
      ) VALUES (
        ${propertyId}, ${reservation.id}, ${booking.id}, ${guestId}, ${folioNumber},
        'guest', ${request.currency_code || 'INR'}, 'open', ${finalTotal}, ${finalTotal}
      ) RETURNING id
    `;
    console.log('6. Folio created:', folio.id);

    // Update booking request
    await tx`
      UPDATE booking_requests
      SET status = 'accepted',
          accepted_reservation_id = ${reservation.id},
          accepted_folio_id = ${folio.id},
          accepted_total = ${finalTotal},
          decided_at = NOW(),
          updated_at = NOW()
      WHERE id = ${id}
    `;
    console.log('7. Booking request updated to accepted');

    // Audit log (using column names in audit_logs)
    await tx`
      INSERT INTO audit_logs (
        property_id, action, entity_type, entity_id, description, new_value, occurred_at
      ) VALUES (
        ${propertyId}, 'approve', 'booking_request', ${id},
        ${'Booking request APPROVED. Assigned Room ' + selectedRoom.number},
        ${JSON.stringify({ status: 'accepted', reservationId: reservation.id, roomNumber: selectedRoom.number })},
        NOW()
      )
    `;
    console.log('8. Audit log inserted');

    // Notification
    await tx`
      INSERT INTO staff_notifications (
        id, property_id, type, severity, title, message, source_event, source_entity_type, source_entity_id, created_at
      ) VALUES (
        gen_random_uuid(), ${propertyId}, 'booking_request_approved', 'info',
        'Booking Request Approved',
        ${'Booking request approved for ' + request.guest_first_name + ' ' + request.guest_last_name},
        'booking_request.approved', 'reservation', ${reservation.id}, NOW()
      )
    `;
    console.log('9. Staff notification inserted');

    // Rollback for testing
    throw new Error('TEST_ROLLBACK_SUCCESS');
  }).catch(err => {
    if (err.message === 'TEST_ROLLBACK_SUCCESS') {
      console.log('SUCCESS: All SQL operations passed without error!');
    } else {
      console.error('FAILED SQL:', err);
    }
  });

  await sql.end();
}

testApproveExact();
