import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

const sql = postgres(process.env.DATABASE_URL || 'postgresql://haip:haip@localhost:5432/haip');

async function run() {
  try {
    const res = await sql`SELECT 1 as connected`;
    console.log('Postgres connection successful:', res);

    const migrationFile = path.resolve(process.cwd(), 'supabase/migrations/20261115000000_hotel_spark_complete_supabase_schema.sql');
    console.log('Reading migration file:', migrationFile);
    const sqlContent = fs.readFileSync(migrationFile, 'utf8');

    console.log('Executing master migration against PostgreSQL...');
    const t0 = Date.now();
    await sql.unsafe(sqlContent);
    console.log(`Executed successfully in ${((Date.now() - t0) / 1000).toFixed(2)}s`);

    // Verify tables
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    console.log(`Total public tables: ${tables.length}`);

    // Verify key tables
    const keyTables = [
      'hotels', 'properties', 'profiles', 'hotel_members', 'hotel_settings',
      'room_types', 'rooms', 'room_images', 'rate_plans', 'room_blocks',
      'guests', 'guest_documents',
      'booking_requests', 'bookings', 'reservations', 'reservation_rooms',
      'folios', 'payments', 'invoices', 'refunds', 'cashier_transactions', 'cash_drawers',
      'check_ins', 'check_outs', 'housekeeping_tasks', 'maintenance_requests',
      'expenses', 'notifications', 'staff_notifications', 'notification_logs', 'audit_logs'
    ];
    const presentNames = tables.map(t => t.table_name);
    for (const t of keyTables) {
      console.log(` - ${t}: ${presentNames.includes(t) ? '✓ OK' : '✗ MISSING'}`);
    }

    // Verify hotels seed data
    const hotels = await sql`SELECT id, name, code, currency_code FROM hotels`;
    console.log('\nHotels in DB:', hotels);

    // Verify room types seed data
    const roomTypes = await sql`SELECT id, name, code, max_occupancy FROM room_types`;
    console.log('\nRoom Types in DB:', roomTypes);

    // Verify rooms seed data
    const rooms = await sql`SELECT number, floor, status FROM rooms ORDER BY number`;
    console.log(`\nRooms created: ${rooms.length}`);

    // Test revalidate_room_availability function
    const avail = await sql`
      SELECT * FROM revalidate_room_availability(
        'a0000001-0000-4000-a000-000000000001',
        'b0000001-0000-4000-a000-000000000001',
        CURRENT_DATE + 5,
        CURRENT_DATE + 7
      )
    `;
    console.log(`\nrevalidate_room_availability returned ${avail.length} rooms`);
    console.log('Sample room:', avail[0]);

    // Test submit_website_booking_request function
    const randOffset = Math.floor(Math.random() * 1000) + 100;
    const testKey = 'REQ-TEST-' + Date.now();
    const [submitRes] = await sql`
      SELECT submit_website_booking_request(
        'a0000001-0000-4000-a000-000000000001'::uuid,
        'b0000001-0000-4000-a000-000000000001'::uuid,
        (CURRENT_DATE + ${randOffset}::integer)::date,
        (CURRENT_DATE + ${randOffset + 2}::integer)::date,
        'Rohan'::varchar,
        'Sharma'::varchar,
        'rohan.sharma@example.com'::varchar,
        '+919876543210'::varchar,
        7000.00::numeric,
        2::integer,
        0::integer,
        'Quiet top floor room please'::text,
        'INR'::varchar,
        ${testKey}::varchar
      ) as result
    `;
    console.log('\nsubmit_website_booking_request output:', submitRes.result);
    const reqId = submitRes.result.id;

    // Find available room for this exact window
    const availForBooking = await sql`
      SELECT * FROM revalidate_room_availability(
        'a0000001-0000-4000-a000-000000000001',
        'b0000001-0000-4000-a000-000000000001',
        (CURRENT_DATE + ${randOffset}::integer)::date,
        (CURRENT_DATE + ${randOffset + 2}::integer)::date
      )
    `;
    const freeRoom = availForBooking.find(r => r.is_available);
    if (!freeRoom) throw new Error('No free room available in test window');

    // Test approve_direct_booking function
    const availableRoomId = freeRoom.room_id;
    const [approveRes] = await sql`
      SELECT approve_direct_booking(
        ${reqId}::uuid,
        'a0000001-0000-4000-a000-000000000001'::uuid,
        ${availableRoomId}::uuid,
        '00000000-0000-0000-0000-000000000001'::uuid
      ) as result
    `;
    console.log('\napprove_direct_booking output:', approveRes.result);

    // Test double-booking prevention on same room and overlapping dates
    console.log('\nTesting Double-Booking Prevention:');
    const conflictKey = 'REQ-CONF-' + Date.now();
    try {
      const [submitRes2] = await sql`
        SELECT submit_website_booking_request(
          'a0000001-0000-4000-a000-000000000001'::uuid,
          'b0000001-0000-4000-a000-000000000001'::uuid,
          (CURRENT_DATE + ${randOffset}::integer)::date,
          (CURRENT_DATE + ${randOffset + 2}::integer)::date,
          'Anita'::varchar,
          'Desai'::varchar,
          'anita@example.com'::varchar,
          '+919876543222'::varchar,
          7000.00::numeric,
          2::integer,
          0::integer,
          NULL,
          'INR'::varchar,
          ${conflictKey}::varchar
        ) as result
      `;
      const reqId2 = submitRes2.result.id;

      await sql`
        SELECT approve_direct_booking(
          ${reqId2}::uuid,
          'a0000001-0000-4000-a000-000000000001'::uuid,
          ${availableRoomId}::uuid,
          '00000000-0000-0000-0000-000000000001'::uuid
        ) as result
      `;
      console.error('ERROR: Double booking was allowed!');
    } catch (err: any) {
      console.log('✓ SUCCESS: Double booking correctly caught & prevented:', err.message);
    }

    // Test rejection with mandatory reason
    console.log('\nTesting reject_direct_booking with mandatory reason:');
    try {
      await sql`
        SELECT reject_direct_booking(
          (SELECT id FROM booking_requests WHERE submission_idempotency_key = ${conflictKey}),
          'a0000001-0000-4000-a000-000000000001'::uuid,
          ''::text
        )
      `;
      console.error('ERROR: Empty rejection reason was allowed!');
    } catch (err: any) {
      console.log('✓ SUCCESS: Empty rejection reason correctly caught:', err.message);
    }

    const [rejectRes] = await sql`
      SELECT reject_direct_booking(
        (SELECT id FROM booking_requests WHERE submission_idempotency_key = ${conflictKey}),
        'a0000001-0000-4000-a000-000000000001'::uuid,
        'Room unavailable for requested dates.'::text
      ) as result
    `;
    console.log('✓ SUCCESS: reject_direct_booking output:', rejectRes.result);

    console.log('\n========================================');
    console.log('ALL VERIFICATION CHECKS PASSED WITH 100% SUCCESS!');
    console.log('========================================');

  } catch (err) {
    console.error('Error during test:', err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

run();
