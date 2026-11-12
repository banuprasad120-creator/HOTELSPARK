const postgres = require(require.resolve('postgres', { paths: ['packages/database'] }));
const sql = postgres(process.env.DATABASE_URL || 'postgresql://haip:haip@localhost:5432/haip');

async function main() {
  console.log('Cleaning old demo reservations and setting up clean Hotel Spark...');

  const propertyId = 'a0000001-0000-4000-a000-000000000001';

  // 1. Delete dependent transactional records
  await sql`DELETE FROM staff_notification_reads WHERE notification_id IN (SELECT id FROM staff_notifications WHERE property_id = ${propertyId})`;
  await sql`DELETE FROM staff_notifications WHERE property_id = ${propertyId}`;
  await sql`DELETE FROM service_requests WHERE property_id = ${propertyId}`;
  await sql`DELETE FROM room_discrepancy_cases WHERE property_id = ${propertyId}`;
  await sql`DELETE FROM rooming_list_entries WHERE property_id = ${propertyId}`;
  await sql`DELETE FROM waitlist_entries WHERE property_id = ${propertyId}`;
  await sql`DELETE FROM turnaways WHERE property_id = ${propertyId}`;
  await sql`DELETE FROM channel_reservations WHERE property_id = ${propertyId}`;
  await sql`DELETE FROM reservation_services WHERE property_id = ${propertyId}`;
  await sql`DELETE FROM reservation_notes WHERE property_id = ${propertyId}`;
  await sql`DELETE FROM reservation_guests WHERE property_id = ${propertyId}`;
  await sql`DELETE FROM inventory_ledger WHERE property_id = ${propertyId}`;
  await sql`DELETE FROM deposit_ledger_entries WHERE property_id = ${propertyId}`;
  await sql`DELETE FROM folio_routing_rules WHERE property_id = ${propertyId}`;
  await sql`DELETE FROM folio_inbound_posts WHERE property_id = ${propertyId}`;
  await sql`DELETE FROM fiscal_documents WHERE property_id = ${propertyId}`;
  await sql`DELETE FROM payments WHERE property_id = ${propertyId}`;
  await sql`DELETE FROM charges WHERE property_id = ${propertyId}`;
  await sql`DELETE FROM folios WHERE property_id = ${propertyId}`;
  await sql`DELETE FROM reservations WHERE property_id = ${propertyId}`;
  await sql`DELETE FROM bookings WHERE property_id = ${propertyId}`;
  console.log('Cleaned old transactional demo reservations/folios/bookings.');

  // 2. Update Hotel Spark property details
  await sql`
    UPDATE properties SET
      name = 'Hotel Spark',
      code = 'SPK',
      description = 'Spark Hotel — Luxury Boutique Hospitality with AI-first Guest Experience.',
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
      staff_display_name = 'Hotel Spark',
      settings = jsonb_build_object(
        'taxRate', 0.12,
        'earlyCheckInFee', 500,
        'lateCheckoutFee', 750,
        'noShowFeeAmount', 1500,
        'noShowCutoffHour', 18,
        'depositPercentage', 0,
        'requireInspection', true
      ),
      updated_at = NOW()
    WHERE id = ${propertyId}
  `;
  console.log('Updated Hotel Spark property settings.');

  // 3. Update Booking Engine config
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
  console.log('Updated booking engine config.');

  // 4. Update room categories descriptions and amenities
  await sql`
    UPDATE room_types SET
      description = 'Comfortable and elegantly appointed king room featuring plush bedding, high-speed Wi-Fi, work desk, and city views.',
      amenities = '["wifi", "tv", "minibar", "safe", "room_service", "air_conditioning"]'::jsonb
    WHERE id = 'b0000001-0000-4000-a000-000000000001'
  `;

  await sql`
    UPDATE room_types SET
      description = 'Spacious premium room with panoramic scenic views, private balcony, luxury king bed, and artisanal minibar.',
      amenities = '["wifi", "tv", "minibar", "safe", "balcony", "city_view", "espresso_machine"]'::jsonb
    WHERE id = 'b0000001-0000-4000-a000-000000000002'
  `;

  await sql`
    UPDATE room_types SET
      description = 'Refined open-plan suite with dedicated living lounge, espresso bar, marble bathroom, and premium amenities.',
      amenities = '["wifi", "tv", "minibar", "safe", "living_area", "espresso_machine", "bathtub"]'::jsonb
    WHERE id = 'b0000001-0000-4000-a000-000000000003'
  `;

  await sql`
    UPDATE room_types SET
      description = 'Our crown jewel featuring private terrace, master bedroom, living and dining areas, jacuzzi, and butler service.',
      amenities = '["wifi", "tv", "minibar", "safe", "terrace", "living_area", "dining_area", "espresso_machine", "jacuzzi", "butler_service"]'::jsonb
    WHERE id = 'b0000001-0000-4000-a000-000000000004'
  `;
  console.log('Updated room type descriptions and amenities.');

  // 5. Update rate plans
  await sql`
    UPDATE rate_plans SET
      currency_code = 'INR',
      base_amount = CASE
        WHEN code = 'STK-BAR' THEN 2999
        WHEN code = 'DOV-BAR' THEN 4499
        WHEN code = 'DOV-SUM' THEN 3999
        WHEN code = 'JST-BAR' THEN 6999
        WHEN code = 'PHS-BAR' THEN 14999
        ELSE 2999
      END
    WHERE property_id = ${propertyId}
  `;
  console.log('Updated rate plans to INR base amounts.');

  // 6. Reset all physical rooms to vacant_clean status
  await sql`
    UPDATE rooms SET
      status = 'vacant_clean'
    WHERE property_id = ${propertyId}
  `;
  console.log('Reset physical rooms to vacant_clean.');

  await sql.end();
  console.log('Clean Spark Hotel setup complete!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
