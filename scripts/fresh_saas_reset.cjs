const postgres = require(require.resolve('postgres', { paths: ['packages/database'] }));
const sql = postgres(process.env.DATABASE_URL || 'postgresql://haip:haip@localhost:5432/haip');

async function resetAllData() {
  console.log('--- STARTING TOTAL FRESH DATA RESET ---');

  const propertyId = 'a0000001-0000-4000-a000-000000000001';

  // 1. Delete all notifications and reads
  try {
    await sql`DELETE FROM staff_notification_reads`;
    await sql`DELETE FROM staff_notifications`;
    console.log('✓ Cleared all staff notifications');
  } catch (e) {
    console.log('Note on notifications:', e.message);
  }

  // 2. Delete WhatsApp messages & conversations
  try {
    await sql`DELETE FROM whatsapp_messages`;
    await sql`DELETE FROM whatsapp_conversations`;
    console.log('✓ Cleared all WhatsApp messages and conversations');
  } catch (e) {
    console.log('Note on whatsapp:', e.message);
  }

  // 3. Delete Webhooks and sync logs
  try {
    await sql`DELETE FROM webhook_deliveries`;
    await sql`DELETE FROM webhook_events`;
    await sql`DELETE FROM ari_sync_logs`;
    await sql`DELETE FROM sync_jobs`;
    await sql`DELETE FROM agent_decisions`;
    await sql`DELETE FROM audit_logs`;
    await sql`DELETE FROM audit_runs`;
    console.log('✓ Cleared logs, webhooks, audit runs, and agent decisions');
  } catch (e) {
    console.log('Note on logs:', e.message);
  }

  // 4. Delete Housekeeping tasks & discrepancies
  try {
    await sql`DELETE FROM housekeeping_tasks`;
    await sql`DELETE FROM room_discrepancy_cases`;
    await sql`DELETE FROM service_requests`;
    console.log('✓ Cleared housekeeping tasks and service requests');
  } catch (e) {
    console.log('Note on housekeeping:', e.message);
  }

  // 5. Delete Bookings, Reservations, Folios, Charges, Payments
  try {
    await sql`DELETE FROM channel_reservations`;
    await sql`DELETE FROM reservation_services`;
    await sql`DELETE FROM reservation_notes`;
    await sql`DELETE FROM reservation_guests`;
    await sql`DELETE FROM rooming_list_entries`;
    await sql`DELETE FROM waitlist_entries`;
    await sql`DELETE FROM turnaways`;
    await sql`DELETE FROM inventory_ledger`;
    await sql`DELETE FROM deposit_ledger_entries`;
    await sql`DELETE FROM folio_routing_rules`;
    await sql`DELETE FROM folio_inbound_posts`;
    await sql`DELETE FROM fiscal_documents`;
    await sql`DELETE FROM payments`;
    await sql`DELETE FROM charges`;
    await sql`DELETE FROM folios`;
    await sql`DELETE FROM reservations`;
    await sql`DELETE FROM bookings`;
    console.log('✓ Cleared all reservations, bookings, folios, charges, and payments');
  } catch (e) {
    console.log('Note on reservations/folios:', e.message);
  }

  // 6. Delete Guest profiles and Group profiles
  try {
    await sql`DELETE FROM guest_reviews`;
  } catch (e) {}
  try {
    await sql`DELETE FROM guests`;
    console.log('✓ Cleared all guest profiles');
  } catch (e) {
    console.log('Note on guests:', e.message);
  }
  try {
    await sql`DELETE FROM group_profiles`;
    console.log('✓ Cleared all group profiles');
  } catch (e) {
    console.log('Note on groups:', e.message);
  }
  try {
    await sql`DELETE FROM ar_ledgers`;
    console.log('✓ Cleared AR ledgers');
  } catch (e) {
    console.log('Note on ar_ledgers:', e.message);
  }

  // 7. Reset all 40 physical rooms to vacant_clean
  await sql`
    UPDATE rooms SET
      status = 'vacant_clean',
      hk_occupancy = 'vacant',
      hk_observed_persons = NULL,
      hk_observed_at = NULL,
      maintenance_notes = NULL,
      updated_at = NOW()
    WHERE property_id = ${propertyId}
  `;
  console.log('✓ Reset all 40 physical rooms to pristine vacant_clean status');

  // 8. Ensure Property is Hotel Spark (INR ₹, Hyderabad)
  await sql`
    UPDATE properties SET
      name = 'Hotel Spark',
      code = 'SPK',
      description = 'Hotel Spark — Luxury Boutique Hospitality with AI-first Guest Experience.',
      address_line_1 = 'Road No. 1, Banjara Hills',
      address_line_2 = '',
      city = 'Hyderabad',
      state_province = 'Telangana',
      postal_code = '500034',
      country_code = 'IN',
      timezone = 'Asia/Kolkata',
      currency_code = 'INR',
      default_language = 'en',
      star_rating = 5,
      phone = '+91 98765 43210',
      email = 'stay@sparkhotel.in',
      website = 'http://localhost:5174/booking/',
      staff_display_name = 'Hotel Spark Staff',
      settings = jsonb_build_object(
        'taxRate', 0.12,
        'earlyCheckInFee', 500,
        'lateCheckoutFee', 750,
        'noShowFeeAmount', 1500,
        'noShowCutoffHour', 18,
        'depositPercentage', 0,
        'requireInspection', false
      ),
      updated_at = NOW()
    WHERE id = ${propertyId}
  `;
  console.log('✓ Verified Hotel Spark property configuration (INR, 5-Star)');

  // 9. Ensure Room Categories have fresh photos and INR pricing
  const roomTypesData = [
    {
      id: 'b0000001-0000-4000-a000-000000000001',
      name: 'Standard King',
      desc: 'Comfortable and elegantly appointed king room featuring plush bedding, high-speed Wi-Fi, work desk, and city views.',
      amenities: ['wifi', 'tv', 'minibar', 'safe', 'room_service', 'air_conditioning']
    },
    {
      id: 'b0000001-0000-4000-a000-000000000002',
      name: 'Deluxe Ocean View',
      desc: 'Spacious premium room with panoramic scenic views, private balcony, luxury king bed, and artisanal minibar.',
      amenities: ['wifi', 'tv', 'minibar', 'safe', 'balcony', 'city_view', 'espresso_machine']
    },
    {
      id: 'b0000001-0000-4000-a000-000000000003',
      name: 'Junior Suite',
      desc: 'Refined open-plan suite with dedicated living lounge, espresso bar, marble bathroom, and premium amenities.',
      amenities: ['wifi', 'tv', 'minibar', 'safe', 'living_area', 'espresso_machine', 'bathtub']
    },
    {
      id: 'b0000001-0000-4000-a000-000000000004',
      name: 'Penthouse Suite',
      desc: 'Our crown jewel featuring private terrace, master bedroom, living and dining areas, jacuzzi, and butler service.',
      amenities: ['wifi', 'tv', 'minibar', 'safe', 'terrace', 'living_area', 'dining_area', 'espresso_machine', 'jacuzzi', 'butler_service']
    }
  ];

  for (const rt of roomTypesData) {
    await sql`
      UPDATE room_types SET
        name = ${rt.name},
        description = ${rt.desc},
        amenities = ${sql.json(rt.amenities)},
        updated_at = NOW()
      WHERE id = ${rt.id}
    `;
  }
  console.log('✓ Verified all 4 room categories');

  // 10. Ensure Rate plans are in INR
  await sql`
    UPDATE rate_plans SET
      currency_code = 'INR',
      base_amount = CASE
        WHEN code = 'STK-BAR' THEN 3000
        WHEN code = 'DOV-BAR' THEN 5500
        WHEN code = 'DOV-SUM' THEN 4999
        WHEN code = 'JST-BAR' THEN 8500
        WHEN code = 'PHS-BAR' THEN 14999
        ELSE 3000
      END,
      updated_at = NOW()
    WHERE property_id = ${propertyId}
  `;
  console.log('✓ Verified rate plans (INR ₹3,000 to ₹14,999)');

  // 11. Booking Engine Config
  await sql`
    UPDATE booking_engine_config SET
      display_name = 'Hotel Spark',
      primary_color = '#0F172A',
      accent_color = '#0D9488',
      deposit_policy = jsonb_build_object('type', 'none', 'refundable', true),
      payment_method_collection = 'disabled',
      auto_confirm = true,
      updated_at = NOW()
    WHERE property_id = ${propertyId}
  `;
  console.log('✓ Verified Booking Engine configuration');

  // Verify final counts
  const finalBookings = await sql`SELECT COUNT(*)::int as c FROM bookings`;
  const finalReservations = await sql`SELECT COUNT(*)::int as c FROM reservations`;
  const finalGuests = await sql`SELECT COUNT(*)::int as c FROM guests`;
  const finalNotifs = await sql`SELECT COUNT(*)::int as c FROM staff_notifications`;
  const finalMessages = await sql`SELECT COUNT(*)::int as c FROM whatsapp_messages`;
  const finalRooms = await sql`SELECT COUNT(*)::int as c FROM rooms WHERE status = 'vacant_clean'`;

  console.log('\n--- VERIFICATION OF PRISTINE FRESH STATE ---');
  console.log(`Bookings: ${finalBookings[0].c}`);
  console.log(`Reservations: ${finalReservations[0].c}`);
  console.log(`Guests: ${finalGuests[0].c}`);
  console.log(`Staff Notifications: ${finalNotifs[0].c}`);
  console.log(`WhatsApp Messages: ${finalMessages[0].c}`);
  console.log(`Pristine Available Rooms: ${finalRooms[0].c} / 40`);
  console.log('---------------------------------------------');

  await sql.end();
}

resetAllData().catch(err => {
  console.error('Reset error:', err);
  process.exit(1);
});
