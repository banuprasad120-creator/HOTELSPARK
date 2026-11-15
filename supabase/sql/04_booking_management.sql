-- ============================================================================
-- HOTEL SPARK / HAIP – SUPABASE SQL MIGRATION
-- 04_booking_management.sql: Direct Booking Requests, Bookings & Reservations
-- ============================================================================

-- Enums
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reservation_status') THEN
    CREATE TYPE reservation_status AS ENUM (
      'pending',
      'confirmed',
      'assigned',
      'checked_in',
      'stayover',
      'due_out',
      'checked_out',
      'no_show',
      'cancelled'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_source') THEN
    CREATE TYPE booking_source AS ENUM (
      'direct',
      'ota',
      'gds',
      'phone',
      'walk_in',
      'agent',
      'group',
      'corporate'
    );
  END IF;
END $$;

-- 1. Direct Booking Requests (Status: pending by default)
CREATE TABLE IF NOT EXISTS booking_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  submission_idempotency_key varchar(255) NOT NULL UNIQUE,
  submission_fingerprint varchar(255),
  status varchar(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'denied', 'cancelled', 'rejected')),
  arrival_date date NOT NULL,
  departure_date date NOT NULL,
  room_type_id uuid NOT NULL REFERENCES room_types(id),
  rate_plan_id uuid REFERENCES rate_plans(id),
  adults integer NOT NULL DEFAULT 1,
  children integer NOT NULL DEFAULT 0,
  guest_first_name varchar(100) NOT NULL,
  guest_last_name varchar(100) NOT NULL,
  guest_email varchar(255) NOT NULL,
  guest_phone varchar(50),
  special_requests text,
  service_ids jsonb DEFAULT '[]'::jsonb,
  form_snapshot jsonb DEFAULT '[]'::jsonb,
  application_answers jsonb DEFAULT '{}'::jsonb,
  submitted_quote_snapshot jsonb,
  submitted_total numeric(12, 2) NOT NULL,
  current_quote_snapshot jsonb,
  currency_code varchar(3) NOT NULL DEFAULT 'INR',
  setup_intent_id varchar(255),
  stripe_customer_id varchar(255),
  stripe_payment_method_id varchar(255),
  card_brand varchar(50),
  card_last_four varchar(10),
  consent_text text,
  consent_version varchar(50),
  consented_at timestamptz,
  accepted_price_source varchar(50),
  accepted_total numeric(12, 2),
  custom_price_reason text,
  accepted_reservation_id uuid,
  accepted_folio_id uuid,
  decided_by uuid,
  decided_at timestamptz,
  denial_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE booking_requests ADD COLUMN IF NOT EXISTS hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE;
ALTER TABLE booking_requests ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id) ON DELETE CASCADE;
ALTER TABLE booking_requests ALTER COLUMN rate_plan_id DROP NOT NULL;
ALTER TABLE booking_requests ALTER COLUMN submitted_quote_snapshot DROP NOT NULL;
ALTER TABLE booking_requests ALTER COLUMN form_snapshot DROP NOT NULL;
ALTER TABLE booking_requests ALTER COLUMN application_answers DROP NOT NULL;

CREATE TRIGGER trg_booking_requests_updated_at
  BEFORE UPDATE ON booking_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2. Bookings Header (Party identifier wrapper)
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL REFERENCES guests(id) ON DELETE RESTRICT,
  confirmation_number varchar(50) NOT NULL UNIQUE,
  external_confirmation varchar(100),
  source booking_source NOT NULL DEFAULT 'direct',
  channel_code varchar(50) DEFAULT 'direct_booking',
  group_id uuid,
  group_name varchar(255),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id) ON DELETE CASCADE;

CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 3. Reservations (Unit-level stay records)
CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL REFERENCES guests(id) ON DELETE RESTRICT,
  arrival_date date NOT NULL,
  departure_date date NOT NULL,
  nights integer NOT NULL,
  room_type_id uuid NOT NULL REFERENCES room_types(id) ON DELETE RESTRICT,
  room_id uuid REFERENCES rooms(id) ON DELETE SET NULL,
  status reservation_status NOT NULL DEFAULT 'confirmed',
  group_profile_id uuid,
  rate_plan_id uuid NOT NULL REFERENCES rate_plans(id) ON DELETE RESTRICT,
  total_amount numeric(12, 2) NOT NULL,
  currency_code varchar(3) NOT NULL DEFAULT 'INR',
  accepted_pricing_snapshot jsonb,
  adults integer NOT NULL DEFAULT 1,
  children integer NOT NULL DEFAULT 0,
  special_requests text,
  preferences jsonb,
  checked_in_at timestamptz,
  checked_out_at timestamptz,
  checked_in_by uuid,
  checked_out_by uuid,
  cancellation_reason text,
  cancelled_at timestamptz,
  cancelled_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reservations ADD COLUMN IF NOT EXISTS hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id) ON DELETE CASCADE;

CREATE TRIGGER trg_reservations_updated_at
  BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 4. Reservation Rooms (Nightly room allocations & room rates)
CREATE TABLE IF NOT EXISTS reservation_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  room_id uuid REFERENCES rooms(id) ON DELETE SET NULL,
  room_type_id uuid NOT NULL REFERENCES room_types(id) ON DELETE RESTRICT,
  rate_plan_id uuid REFERENCES rate_plans(id) ON DELETE RESTRICT,
  arrival_date date NOT NULL,
  departure_date date NOT NULL,
  room_rate numeric(12, 2) NOT NULL,
  status varchar(30) NOT NULL DEFAULT 'assigned',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_reservation_rooms_updated_at
  BEFORE UPDATE ON reservation_rooms
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indexes for Booking Management
CREATE INDEX IF NOT EXISTS idx_booking_requests_hotel_status ON booking_requests(hotel_id, status);
CREATE INDEX IF NOT EXISTS idx_booking_requests_ref ON booking_requests(submission_idempotency_key);
CREATE INDEX IF NOT EXISTS idx_bookings_hotel ON bookings(hotel_id);
CREATE INDEX IF NOT EXISTS idx_bookings_conf ON bookings(confirmation_number);
CREATE INDEX IF NOT EXISTS idx_reservations_hotel_status ON reservations(hotel_id, status);
CREATE INDEX IF NOT EXISTS idx_reservations_dates ON reservations(arrival_date, departure_date);
CREATE INDEX IF NOT EXISTS idx_reservations_room ON reservations(room_id);
CREATE INDEX IF NOT EXISTS idx_reservations_guest ON reservations(guest_id);
CREATE INDEX IF NOT EXISTS idx_reservation_rooms_res ON reservation_rooms(reservation_id);

-- Ensure submitted_quote_snapshot has grandTotal for NestJS DTO compatibility
UPDATE booking_requests 
SET submitted_quote_snapshot = jsonb_build_object('grandTotal', submitted_total, 'total', submitted_total)
WHERE submitted_quote_snapshot IS NULL OR NOT (submitted_quote_snapshot ? 'grandTotal');

-- Tenancy synchronization
UPDATE booking_requests SET hotel_id = property_id WHERE hotel_id IS NULL AND property_id IS NOT NULL;
UPDATE booking_requests SET property_id = hotel_id WHERE property_id IS NULL AND hotel_id IS NOT NULL;
UPDATE bookings SET hotel_id = property_id WHERE hotel_id IS NULL AND property_id IS NOT NULL;
UPDATE bookings SET property_id = hotel_id WHERE property_id IS NULL AND hotel_id IS NOT NULL;
UPDATE reservations SET hotel_id = property_id WHERE hotel_id IS NULL AND property_id IS NOT NULL;
UPDATE reservations SET property_id = hotel_id WHERE property_id IS NULL AND hotel_id IS NOT NULL;
