-- ============================================================================
-- HOTEL SPARK / HAIP – SUPABASE SQL MIGRATION
-- 10_seed_hotel_spark_data.sql: Default Production Seed Data for Hotel Spark
-- ============================================================================

DO $$
DECLARE
  v_hotel_id uuid := 'a0000001-0000-4000-a000-000000000001';
  v_admin_id uuid := '00000000-0000-0000-0000-000000000001';
  
  v_rt_deluxe uuid := 'b0000001-0000-4000-a000-000000000001';
  v_rt_suite  uuid := 'b0000002-0000-4000-a000-000000000001';
  v_rt_std    uuid := 'b0000003-0000-4000-a000-000000000001';

  v_rp_deluxe uuid := 'c0000001-0000-4000-a000-000000000001';
  v_rp_suite  uuid := 'c0000002-0000-4000-a000-000000000001';
  v_rp_std    uuid := 'c0000003-0000-4000-a000-000000000001';
BEGIN
  -- 1. Insert Hotel Spark
  INSERT INTO hotels (
    id,
    name,
    code,
    description,
    address_line_1,
    city,
    state_province,
    postal_code,
    country_code,
    timezone,
    currency_code,
    phone,
    email,
    website,
    star_rating,
    total_rooms,
    check_in_time,
    check_out_time,
    is_active,
    settings
  ) VALUES (
    v_hotel_id,
    'Hotel Spark',
    'SPARK01',
    'Premium modern boutique hotel offering high-comfort stays, seamless digital check-in, and authentic hospitality in Bengaluru.',
    '124 M.G. Road, Ashok Nagar',
    'Bengaluru',
    'Karnataka',
    '560001',
    'IN',
    'Asia/Kolkata',
    'INR',
    '+91 98765 43210',
    'reservations@hotelspark.com',
    'https://hotelspark.com',
    4,
    10,
    '14:00',
    '11:00',
    true,
    '{"upi_id": "sparkhotel@upi", "upi_merchant_name": "Hotel Spark", "allow_instant_booking": false, "require_approval": true}'::jsonb
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    code = EXCLUDED.code,
    currency_code = EXCLUDED.currency_code,
    updated_at = now();

  -- 2. Insert Property (Compatibility Record)
  INSERT INTO properties (
    id,
    hotel_id,
    name,
    code,
    description,
    address_line_1,
    city,
    state_province,
    postal_code,
    country_code,
    timezone,
    currency_code,
    phone,
    email,
    website,
    star_rating,
    total_rooms,
    check_in_time,
    check_out_time,
    guest_registration_required
  ) VALUES (
    v_hotel_id,
    v_hotel_id,
    'Hotel Spark',
    'SPARK01',
    'Premium modern boutique hotel in Bengaluru.',
    '124 M.G. Road, Ashok Nagar',
    'Bengaluru',
    'Karnataka',
    '560001',
    'IN',
    'Asia/Kolkata',
    'INR',
    '+91 98765 43210',
    'reservations@hotelspark.com',
    'https://hotelspark.com',
    4,
    10,
    '14:00',
    '11:00',
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    hotel_id = EXCLUDED.hotel_id,
    updated_at = now();

  -- 3. Hotel Settings
  INSERT INTO hotel_settings (
    hotel_id,
    property_id,
    upi_qr_string,
    upi_payee_name,
    direct_booking_requires_approval,
    booking_notification_sound,
    whatsapp_enabled
  ) VALUES (
    v_hotel_id,
    v_hotel_id,
    'upi://pay?pa=sparkhotel@upi&pn=Hotel%20Spark&mc=7011&cu=INR',
    'Hotel Spark',
    true,
    true,
    true
  )
  ON CONFLICT (hotel_id) DO UPDATE SET
    direct_booking_requires_approval = true,
    booking_notification_sound = true,
    updated_at = now();

  -- 4. Default Admin Profile & Hotel Member
  INSERT INTO profiles (
    id,
    email,
    full_name,
    role
  ) VALUES (
    v_admin_id,
    'admin@hotelspark.com',
    'Spark Admin',
    'hotel_admin'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    updated_at = now();

  INSERT INTO hotel_members (
    hotel_id,
    property_id,
    user_id,
    role,
    status
  ) VALUES (
    v_hotel_id,
    v_hotel_id,
    v_admin_id,
    'hotel_admin',
    'active'
  )
  ON CONFLICT (hotel_id, user_id) DO UPDATE SET
    role = 'hotel_admin',
    status = 'active',
    updated_at = now();

  -- 5. Room Types
  INSERT INTO room_types (
    id,
    hotel_id,
    property_id,
    name,
    code,
    description,
    max_occupancy,
    default_occupancy,
    bed_type,
    bed_count,
    square_meters,
    amenities,
    sort_order
  ) VALUES
  (
    v_rt_deluxe,
    v_hotel_id,
    v_hotel_id,
    'Deluxe King Room',
    'DLX',
    'Spacious air-conditioned room featuring an ultra-comfortable king-size bed, private ensuite bathroom, smart LED TV, and high-speed Wi-Fi.',
    2,
    2,
    'king',
    1,
    32,
    '["AC", "King Bed", "Smart TV", "High-speed Wi-Fi", "Work Desk", "Coffee Maker", "Safe"]'::jsonb,
    1
  ),
  (
    v_rt_suite,
    v_hotel_id,
    v_hotel_id,
    'Executive Spark Suite',
    'SUT',
    'Luxurious suite with separate living room, panoramic city views, premium Italian marble bathroom, bathtub, and complimentary minibar.',
    4,
    2,
    'king',
    2,
    55,
    '["AC", "King Bed", "Living Area", "Balcony", "Bathtub", "Mini-bar", "Smart TV", "Wi-Fi"]'::jsonb,
    2
  ),
  (
    v_rt_std,
    v_hotel_id,
    v_hotel_id,
    'Standard Queen Room',
    'STD',
    'Cozy, stylish, and peaceful room tailored for business travelers and short city getaways with queen-size bed.',
    2,
    2,
    'queen',
    1,
    24,
    '["AC", "Queen Bed", "Ensuite Bath", "Smart TV", "High-speed Wi-Fi"]'::jsonb,
    3
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    amenities = EXCLUDED.amenities,
    updated_at = now();

  -- 6. Rate Plans
  INSERT INTO rate_plans (
    id,
    hotel_id,
    property_id,
    room_type_id,
    name,
    code,
    description,
    type,
    currency_code,
    base_rate,
    base_amount,
    is_active
  ) VALUES
  (
    v_rp_deluxe,
    v_hotel_id,
    v_hotel_id,
    v_rt_deluxe,
    'Deluxe Best Flexible Rate',
    'BAR-DLX',
    'Best available rate for Deluxe King Room including high-speed Wi-Fi.',
    'bar',
    'INR',
    3500.00,
    3500.00,
    true
  ),
  (
    v_rp_suite,
    v_hotel_id,
    v_hotel_id,
    v_rt_suite,
    'Suite Best Flexible Rate',
    'BAR-SUT',
    'Best available rate for Executive Spark Suite with complimentary breakfast.',
    'bar',
    'INR',
    6500.00,
    6500.00,
    true
  ),
  (
    v_rp_std,
    v_hotel_id,
    v_hotel_id,
    v_rt_std,
    'Standard Best Flexible Rate',
    'BAR-STD',
    'Best available rate for Standard Queen Room.',
    'bar',
    'INR',
    2500.00,
    2500.00,
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    base_rate = EXCLUDED.base_rate,
    base_amount = EXCLUDED.base_amount,
    updated_at = now();

  -- 7. Physical Rooms (10 rooms)
  INSERT INTO rooms (hotel_id, property_id, room_type_id, number, floor, status) VALUES
    (v_hotel_id, v_hotel_id, v_rt_deluxe, '101', '1', 'vacant_clean'),
    (v_hotel_id, v_hotel_id, v_rt_deluxe, '102', '1', 'vacant_clean'),
    (v_hotel_id, v_hotel_id, v_rt_deluxe, '103', '1', 'vacant_clean'),
    (v_hotel_id, v_hotel_id, v_rt_deluxe, '104', '1', 'vacant_clean'),
    (v_hotel_id, v_hotel_id, v_rt_suite,  '201', '2', 'vacant_clean'),
    (v_hotel_id, v_hotel_id, v_rt_suite,  '202', '2', 'vacant_clean'),
    (v_hotel_id, v_hotel_id, v_rt_suite,  '203', '2', 'vacant_clean'),
    (v_hotel_id, v_hotel_id, v_rt_std,    '301', '3', 'vacant_clean'),
    (v_hotel_id, v_hotel_id, v_rt_std,    '302', '3', 'vacant_clean'),
    (v_hotel_id, v_hotel_id, v_rt_std,    '303', '3', 'vacant_clean')
  ON CONFLICT DO NOTHING;

  -- 8. Room Images
  INSERT INTO room_images (hotel_id, property_id, room_type_id, url, caption, is_primary) VALUES
    (v_hotel_id, v_hotel_id, v_rt_deluxe, 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80', 'Deluxe King Bedroom', true),
    (v_hotel_id, v_hotel_id, v_rt_suite,  'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80', 'Executive Suite Living & Bed Area', true),
    (v_hotel_id, v_hotel_id, v_rt_std,    'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80', 'Standard Queen Room', true)
  ON CONFLICT DO NOTHING;

  -- 9. Cash Drawer for Front Desk
  INSERT INTO cash_drawers (hotel_id, property_id, name, location, currency_code, is_active) VALUES
    (v_hotel_id, v_hotel_id, 'Front Desk Main Drawer', 'Reception Counter', 'INR', true)
  ON CONFLICT DO NOTHING;

END $$;
