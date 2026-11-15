-- ============================================================================
-- HOTEL SPARK / HAIP – COMPLETE SUPABASE PRODUCTION DATABASE SCHEMA
-- Target Database: Supabase PostgreSQL (or Local HAIP Database)
-- Generated: 2026-11-15T13:51:10.723Z
-- Modules:
--   1. Core (hotels, properties, profiles, hotel_members, user_roles, hotel_settings)
--   2. Room Management (room_types, rooms, room_images, rate_plans, room_blocks)
--   3. Guest Management (guests, guest_documents)
--   4. Booking Management (booking_requests, bookings, reservations, reservation_rooms)
--   5. Payments & Billing (folios, payments, invoices, refunds, cashier_transactions)
--   6. Front Desk & Ops (check_ins, check_outs, housekeeping_tasks, maintenance_requests)
--   7. Finance, Notifications & Security (expenses, notifications, audit_logs)
--   8. Direct Booking Workflow Functions (submit, approve, reject, revalidate)
--   9. Supabase Row Level Security (RLS) & Multi-Tenant Access Policies
--  10. Hotel Spark Seed Data (Property a0000001-0000-4000-a000-000000000001)
--  11. Supabase Storage Buckets & Policies
-- ============================================================================


-- ----------------------------------------------------------------------------
-- SECTION: 01_core.sql
-- ----------------------------------------------------------------------------

-- ============================================================================
-- HOTEL SPARK / HAIP – SUPABASE SQL MIGRATION
-- 01_core.sql: Core Hotel Entities, Profiles, Members, Roles & Settings
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Supabase Auth Compatibility (Safe fallback only for local vanilla postgres; bypassed entirely on Supabase)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    EXECUTE 'CREATE SCHEMA auth';
    EXECUTE 'CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $f$ SELECT nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid; $f$ LANGUAGE sql STABLE;';
    EXECUTE 'CREATE OR REPLACE FUNCTION auth.role() RETURNS text AS $f$ SELECT coalesce(nullif(current_setting(''request.jwt.claim.role'', true), ''''), ''anon''); $f$ LANGUAGE sql STABLE;';
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- On managed Supabase, auth schema is managed by Supabase and functions already exist natively
  NULL;
END $$;

-- Generic Updated At Trigger Function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Enums
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_enum') THEN
    CREATE TYPE user_role_enum AS ENUM (
      'super_admin',
      'hotel_admin',
      'manager',
      'receptionist',
      'accountant',
      'housekeeping'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'member_status_enum') THEN
    CREATE TYPE member_status_enum AS ENUM ('active', 'invited', 'suspended');
  END IF;
END $$;

-- 1. Hotels (Primary multi-tenant root)
CREATE TABLE IF NOT EXISTS hotels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  code varchar(20) NOT NULL UNIQUE,
  description text,
  address_line_1 varchar(255),
  address_line_2 varchar(255),
  city varchar(100),
  state_province varchar(100),
  postal_code varchar(20),
  country_code varchar(2) NOT NULL DEFAULT 'IN',
  timezone varchar(50) NOT NULL DEFAULT 'Asia/Kolkata',
  currency_code varchar(3) NOT NULL DEFAULT 'INR',
  default_language varchar(5) NOT NULL DEFAULT 'en',
  phone varchar(30),
  email varchar(255),
  website varchar(500),
  star_rating integer CHECK (star_rating BETWEEN 1 AND 5),
  total_rooms integer NOT NULL DEFAULT 10,
  check_in_time varchar(5) NOT NULL DEFAULT '14:00',
  check_out_time varchar(5) NOT NULL DEFAULT '11:00',
  is_active boolean NOT NULL DEFAULT true,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_hotels_updated_at ON hotels;
CREATE TRIGGER trg_hotels_updated_at BEFORE UPDATE ON hotels
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2. Backward Compatibility: Properties Table
-- If properties exists as table, ensure hotel_id is populated; otherwise create properties table synced with hotels
CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  code varchar(20) NOT NULL UNIQUE,
  description text,
  address_line_1 varchar(255),
  address_line_2 varchar(255),
  city varchar(100),
  state_province varchar(100),
  postal_code varchar(20),
  country_code varchar(2) NOT NULL DEFAULT 'IN',
  timezone varchar(50) NOT NULL DEFAULT 'Asia/Kolkata',
  currency_code varchar(3) NOT NULL DEFAULT 'INR',
  default_language varchar(5) NOT NULL DEFAULT 'en',
  star_rating integer,
  total_rooms integer NOT NULL DEFAULT 10,
  phone varchar(30),
  email varchar(255),
  website varchar(500),
  tax_jurisdiction varchar(100),
  guest_registration_required boolean NOT NULL DEFAULT true,
  guest_registration_config jsonb,
  check_in_time varchar(5) NOT NULL DEFAULT '14:00',
  check_out_time varchar(5) NOT NULL DEFAULT '11:00',
  overbooking_percentage integer NOT NULL DEFAULT 0,
  night_audit_time varchar(5) NOT NULL DEFAULT '02:00',
  staff_display_name varchar(200),
  staff_logo_media_id uuid,
  staff_primary_color varchar(9),
  staff_accent_color varchar(9),
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure hotel_id column exists on properties
ALTER TABLE properties ADD COLUMN IF NOT EXISTS hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE;

-- Sync function between hotels and properties
-- Ensure columns exist if table already pre-existed
ALTER TABLE properties ADD COLUMN IF NOT EXISTS hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION sync_hotel_to_property()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO properties (
    id, hotel_id, name, code, description, address_line_1, address_line_2,
    city, state_province, postal_code, country_code, timezone, currency_code,
    default_language, phone, email, website, total_rooms, check_in_time,
    check_out_time, is_active, settings, created_at, updated_at
  ) VALUES (
    NEW.id, NEW.id, NEW.name, NEW.code, NEW.description, NEW.address_line_1, NEW.address_line_2,
    NEW.city, NEW.state_province, NEW.postal_code, NEW.country_code, NEW.timezone, NEW.currency_code,
    NEW.default_language, NEW.phone, NEW.email, NEW.website, NEW.total_rooms, NEW.check_in_time,
    NEW.check_out_time, NEW.is_active, NEW.settings, NEW.created_at, NEW.updated_at
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    code = EXCLUDED.code,
    description = EXCLUDED.description,
    address_line_1 = EXCLUDED.address_line_1,
    city = EXCLUDED.city,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    currency_code = EXCLUDED.currency_code,
    settings = EXCLUDED.settings,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_hotel_to_property ON hotels;
CREATE TRIGGER trg_sync_hotel_to_property AFTER INSERT OR UPDATE ON hotels
  FOR EACH ROW EXECUTE FUNCTION sync_hotel_to_property();

-- 3. Profiles (User identity, maps to auth.users if Supabase Auth is active)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) ON DELETE SET NULL,
  property_id uuid REFERENCES properties(id) ON DELETE SET NULL,
  email varchar(255) NOT NULL UNIQUE,
  full_name varchar(255) NOT NULL,
  avatar_url text,
  phone varchar(30),
  role user_role_enum NOT NULL DEFAULT 'receptionist',
  status member_status_enum NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hotel_id uuid REFERENCES hotels(id) ON DELETE SET NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id) ON DELETE SET NULL;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 4. Hotel Members (Staff linkage to hotel property)
CREATE TABLE IF NOT EXISTS hotel_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role user_role_enum NOT NULL DEFAULT 'receptionist',
  status member_status_enum NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_hotel_members UNIQUE (hotel_id, user_id)
);

DROP TRIGGER IF EXISTS trg_hotel_members_updated_at ON hotel_members;
CREATE TRIGGER trg_hotel_members_updated_at BEFORE UPDATE ON hotel_members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 5. User Roles (Granular RBAC)
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role user_role_enum NOT NULL,
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE;
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id) ON DELETE CASCADE;

-- 6. Hotel Settings
CREATE TABLE IF NOT EXISTS hotel_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL UNIQUE REFERENCES hotels(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  booking_mode varchar(20) NOT NULL DEFAULT 'request' CHECK (booking_mode IN ('request', 'instant')),
  auto_confirm boolean NOT NULL DEFAULT false,
  require_deposit boolean NOT NULL DEFAULT false,
  deposit_percentage numeric(5,2) DEFAULT 0.00,
  cancellation_policy text DEFAULT 'Free cancellation up to 24 hours before check-in. First night charged thereafter.',
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE hotel_settings ADD COLUMN IF NOT EXISTS hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE;
ALTER TABLE hotel_settings ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id) ON DELETE CASCADE;
ALTER TABLE hotel_settings ADD COLUMN IF NOT EXISTS direct_booking_requires_approval boolean NOT NULL DEFAULT true;
ALTER TABLE hotel_settings ADD COLUMN IF NOT EXISTS booking_notification_sound boolean NOT NULL DEFAULT true;
ALTER TABLE hotel_settings ADD COLUMN IF NOT EXISTS whatsapp_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE hotel_settings ADD COLUMN IF NOT EXISTS upi_qr_string text;
ALTER TABLE hotel_settings ADD COLUMN IF NOT EXISTS upi_payee_name varchar(255);

DROP TRIGGER IF EXISTS trg_hotel_settings_updated_at ON hotel_settings;
CREATE TRIGGER trg_hotel_settings_updated_at BEFORE UPDATE ON hotel_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indexes for Core
CREATE INDEX IF NOT EXISTS idx_hotels_code ON hotels(code);
CREATE INDEX IF NOT EXISTS idx_profiles_hotel ON profiles(hotel_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_hotel_members_hotel ON hotel_members(hotel_id);
CREATE INDEX IF NOT EXISTS idx_hotel_members_user ON hotel_members(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_hotel ON user_roles(user_id, hotel_id);


-- ----------------------------------------------------------------------------
-- SECTION: 02_room_management.sql
-- ----------------------------------------------------------------------------

-- ============================================================================
-- HOTEL SPARK / HAIP – SUPABASE SQL MIGRATION
-- 02_room_management.sql: Room Types, Physical Rooms, Images & Room Blocks
-- ============================================================================

-- Enums
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'room_status') THEN
    CREATE TYPE room_status AS ENUM (
      'vacant_clean',
      'vacant_dirty',
      'clean',
      'inspected',
      'guest_ready',
      'occupied',
      'out_of_order',
      'out_of_service'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hk_occupancy') THEN
    CREATE TYPE hk_occupancy AS ENUM ('unknown', 'vacant', 'occupied');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rate_plan_type') THEN
    CREATE TYPE rate_plan_type AS ENUM ('bar', 'derived', 'negotiated', 'package', 'promotional');
  END IF;
END $$;

-- 1. Room Types
CREATE TABLE IF NOT EXISTS room_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL,
  code varchar(20) NOT NULL,
  description text,
  max_occupancy integer NOT NULL DEFAULT 2,
  default_occupancy integer NOT NULL DEFAULT 2,
  bed_type varchar(50) DEFAULT 'king',
  bed_count integer NOT NULL DEFAULT 1,
  square_meters integer,
  floor varchar(10),
  amenities jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_accessible boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure hotel_id column exists
ALTER TABLE room_types ADD COLUMN IF NOT EXISTS hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE;
ALTER TABLE room_types ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id) ON DELETE CASCADE;
ALTER TABLE room_types ADD COLUMN IF NOT EXISTS bed_type varchar(50) DEFAULT 'king';
ALTER TABLE room_types ADD COLUMN IF NOT EXISTS bed_count integer NOT NULL DEFAULT 1;
ALTER TABLE room_types ADD COLUMN IF NOT EXISTS square_meters integer;
ALTER TABLE room_types ADD COLUMN IF NOT EXISTS amenities jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE room_types ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

DROP TRIGGER IF EXISTS trg_room_types_updated_at ON room_types;
CREATE TRIGGER trg_room_types_updated_at BEFORE UPDATE ON room_types
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2. Physical Rooms
CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  room_type_id uuid NOT NULL REFERENCES room_types(id) ON DELETE RESTRICT,
  number varchar(20) NOT NULL,
  floor varchar(10) DEFAULT '1',
  building varchar(50),
  status room_status NOT NULL DEFAULT 'vacant_clean',
  hk_occupancy hk_occupancy NOT NULL DEFAULT 'unknown',
  hk_observed_persons integer,
  hk_observed_at timestamptz,
  hk_observed_by uuid,
  is_accessible boolean NOT NULL DEFAULT false,
  is_connecting boolean NOT NULL DEFAULT false,
  connecting_room_id uuid REFERENCES rooms(id) ON DELETE SET NULL,
  amenities jsonb DEFAULT '[]'::jsonb,
  maintenance_notes text,
  last_inspected_at timestamptz,
  external_lock_id varchar(100),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rooms ADD COLUMN IF NOT EXISTS hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id) ON DELETE CASCADE;

DROP TRIGGER IF EXISTS trg_rooms_updated_at ON rooms;
CREATE TRIGGER trg_rooms_updated_at BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 3. Room Images
CREATE TABLE IF NOT EXISTS room_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  room_type_id uuid REFERENCES room_types(id) ON DELETE CASCADE,
  room_id uuid REFERENCES rooms(id) ON DELETE CASCADE,
  url text NOT NULL,
  storage_path text,
  caption varchar(255),
  category varchar(50) NOT NULL DEFAULT 'room',
  is_primary boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE room_images ADD COLUMN IF NOT EXISTS hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE;
ALTER TABLE room_images ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id) ON DELETE CASCADE;
ALTER TABLE room_images ADD COLUMN IF NOT EXISTS room_type_id uuid REFERENCES room_types(id) ON DELETE CASCADE;
ALTER TABLE room_images ADD COLUMN IF NOT EXISTS room_id uuid REFERENCES rooms(id) ON DELETE CASCADE;
ALTER TABLE room_images ADD COLUMN IF NOT EXISTS caption varchar(255);
ALTER TABLE room_images ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false;

DROP TRIGGER IF EXISTS trg_room_images_updated_at ON room_images;
CREATE TRIGGER trg_room_images_updated_at BEFORE UPDATE ON room_images
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 4. Media (Polymorphic compatibility table for existing HAIP components)
CREATE TABLE IF NOT EXISTS media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  owner_type varchar(30) NOT NULL DEFAULT 'room_type',
  owner_id uuid NOT NULL,
  url text NOT NULL,
  storage_key text,
  mime_type varchar(100),
  byte_size integer,
  width integer,
  height integer,
  alt_text text,
  caption text,
  category varchar(50) DEFAULT 'room',
  sort_order integer DEFAULT 0,
  is_primary boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Rate Plans
CREATE TABLE IF NOT EXISTS rate_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL,
  code varchar(20) NOT NULL,
  description text,
  type rate_plan_type NOT NULL DEFAULT 'bar',
  base_rate numeric(12, 2) NOT NULL DEFAULT 3000.00,
  currency_code varchar(3) NOT NULL DEFAULT 'INR',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rate_plans ADD COLUMN IF NOT EXISTS hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE;
ALTER TABLE rate_plans ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id) ON DELETE CASCADE;
ALTER TABLE rate_plans ADD COLUMN IF NOT EXISTS room_type_id uuid REFERENCES room_types(id) ON DELETE SET NULL;
ALTER TABLE rate_plans ADD COLUMN IF NOT EXISTS base_rate numeric(12, 2) DEFAULT 3000.00;
ALTER TABLE rate_plans ADD COLUMN IF NOT EXISTS base_amount numeric(12, 2) DEFAULT 3000.00;
ALTER TABLE rate_plans ADD COLUMN IF NOT EXISTS currency_code varchar(3) NOT NULL DEFAULT 'INR';
ALTER TABLE rate_plans ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- 6. Room Blocks / Allotment Blocks (Holds inventory for groups/events)
CREATE TABLE IF NOT EXISTS room_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  room_type_id uuid REFERENCES room_types(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  status varchar(30) NOT NULL DEFAULT 'tentative' CHECK (status IN ('tentative', 'definite', 'released', 'cancelled')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  release_date date,
  total_rooms_allocated integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_room_blocks_updated_at ON room_blocks;
CREATE TRIGGER trg_room_blocks_updated_at BEFORE UPDATE ON room_blocks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE room_blocks ADD COLUMN IF NOT EXISTS hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE;
ALTER TABLE room_blocks ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id) ON DELETE CASCADE;
ALTER TABLE room_blocks ADD COLUMN IF NOT EXISTS room_id uuid REFERENCES rooms(id) ON DELETE CASCADE;
ALTER TABLE room_blocks ADD COLUMN IF NOT EXISTS room_type_id uuid REFERENCES room_types(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS allotment_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  group_profile_id uuid,
  name varchar(255) NOT NULL,
  status varchar(30) NOT NULL DEFAULT 'tentative',
  start_date date NOT NULL,
  end_date date NOT NULL,
  cutoff_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for Room Management
CREATE INDEX IF NOT EXISTS idx_room_types_hotel ON room_types(hotel_id);
CREATE INDEX IF NOT EXISTS idx_rooms_hotel ON rooms(hotel_id);
CREATE INDEX IF NOT EXISTS idx_rooms_room_type ON rooms(room_type_id);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_room_images_room_type ON room_images(room_type_id);
CREATE INDEX IF NOT EXISTS idx_room_images_room ON room_images(room_id);
CREATE INDEX IF NOT EXISTS idx_room_blocks_hotel_dates ON room_blocks(hotel_id, start_date, end_date);

-- Sync hotel_id and property_id for room entities
UPDATE room_types SET hotel_id = property_id WHERE hotel_id IS NULL AND property_id IS NOT NULL;
UPDATE room_types SET property_id = hotel_id WHERE property_id IS NULL AND hotel_id IS NOT NULL;
UPDATE rooms SET hotel_id = property_id WHERE hotel_id IS NULL AND property_id IS NOT NULL;
UPDATE rooms SET property_id = hotel_id WHERE property_id IS NULL AND hotel_id IS NOT NULL;
UPDATE rate_plans SET hotel_id = property_id WHERE hotel_id IS NULL AND property_id IS NOT NULL;
UPDATE rate_plans SET property_id = hotel_id WHERE property_id IS NULL AND hotel_id IS NOT NULL;


-- ----------------------------------------------------------------------------
-- SECTION: 03_guest_management.sql
-- ----------------------------------------------------------------------------

-- ============================================================================
-- HOTEL SPARK / HAIP – SUPABASE SQL MIGRATION
-- 03_guest_management.sql: Guests & Guest Identification Documents
-- ============================================================================

-- Enums
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vip_level') THEN
    CREATE TYPE vip_level AS ENUM ('none', 'silver', 'gold', 'platinum', 'diamond');
  END IF;
END $$;

-- 1. Guests
CREATE TABLE IF NOT EXISTS guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) ON DELETE SET NULL,
  property_id uuid REFERENCES properties(id) ON DELETE SET NULL,
  first_name varchar(100) NOT NULL,
  last_name varchar(100) NOT NULL,
  email varchar(255),
  phone varchar(30),
  id_type varchar(30),
  id_number varchar(50),
  id_country varchar(2),
  id_expiry timestamptz,
  nationality varchar(2),
  date_of_birth date,
  gender varchar(20),
  profession varchar(100),
  tax_id varchar(50),
  registration_data jsonb,
  address_line_1 varchar(255),
  address_line_2 varchar(255),
  city varchar(100),
  state_province varchar(100),
  postal_code varchar(20),
  country_code varchar(2) DEFAULT 'IN',
  vip_level vip_level NOT NULL DEFAULT 'none',
  company_name varchar(255),
  loyalty_number varchar(50),
  preferences jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE guests ADD COLUMN IF NOT EXISTS hotel_id uuid REFERENCES hotels(id) ON DELETE SET NULL;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id) ON DELETE SET NULL;

DROP TRIGGER IF EXISTS trg_guests_updated_at ON guests;
CREATE TRIGGER trg_guests_updated_at BEFORE UPDATE ON guests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2. Guest Documents (Compliance & Registration)
CREATE TABLE IF NOT EXISTS guest_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  document_type varchar(50) NOT NULL, -- "aadhaar", "passport", "driving_license", "voter_id", "pan"
  document_number varchar(100) NOT NULL,
  issue_date date,
  expiry_date date,
  issuing_country varchar(2) DEFAULT 'IN',
  file_url text,
  storage_path text,
  verification_status varchar(30) NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
  verified_at timestamptz,
  verified_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_guest_documents_updated_at ON guest_documents;
CREATE TRIGGER trg_guest_documents_updated_at BEFORE UPDATE ON guest_documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indexes for Guest Management
CREATE INDEX IF NOT EXISTS idx_guests_email ON guests(email);
CREATE INDEX IF NOT EXISTS idx_guests_phone ON guests(phone);
CREATE INDEX IF NOT EXISTS idx_guests_hotel ON guests(hotel_id);
CREATE INDEX IF NOT EXISTS idx_guest_documents_guest ON guest_documents(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_documents_hotel ON guest_documents(hotel_id);


-- ----------------------------------------------------------------------------
-- SECTION: 04_booking_management.sql
-- ----------------------------------------------------------------------------

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

DROP TRIGGER IF EXISTS trg_booking_requests_updated_at ON booking_requests;
CREATE TRIGGER trg_booking_requests_updated_at BEFORE UPDATE ON booking_requests
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

DROP TRIGGER IF EXISTS trg_bookings_updated_at ON bookings;
CREATE TRIGGER trg_bookings_updated_at BEFORE UPDATE ON bookings
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

DROP TRIGGER IF EXISTS trg_reservations_updated_at ON reservations;
CREATE TRIGGER trg_reservations_updated_at BEFORE UPDATE ON reservations
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

DROP TRIGGER IF EXISTS trg_reservation_rooms_updated_at ON reservation_rooms;
CREATE TRIGGER trg_reservation_rooms_updated_at BEFORE UPDATE ON reservation_rooms
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


-- ----------------------------------------------------------------------------
-- SECTION: 05_payments_and_billing.sql
-- ----------------------------------------------------------------------------

-- ============================================================================
-- HOTEL SPARK / HAIP – SUPABASE SQL MIGRATION
-- 05_payments_and_billing.sql: Folios, Payments, Invoices, Refunds & Cashier
-- ============================================================================

-- 1. Folios (Billing containers)
CREATE TABLE IF NOT EXISTS folios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  reservation_id uuid REFERENCES reservations(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  guest_id uuid NOT NULL REFERENCES guests(id) ON DELETE RESTRICT,
  folio_number varchar(50) NOT NULL,
  type varchar(30) NOT NULL DEFAULT 'guest' CHECK (type IN ('guest', 'master', 'city_ledger')),
  status varchar(30) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'settled', 'closed')),
  total_charges numeric(12, 2) NOT NULL DEFAULT 0.00,
  total_payments numeric(12, 2) NOT NULL DEFAULT 0.00,
  balance numeric(12, 2) NOT NULL DEFAULT 0.00,
  currency_code varchar(3) NOT NULL DEFAULT 'INR',
  company_name varchar(255),
  billing_address text,
  payment_terms_days varchar(10),
  notes text,
  settled_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE folios ADD COLUMN IF NOT EXISTS hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE;
ALTER TABLE folios ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id) ON DELETE CASCADE;

DROP TRIGGER IF EXISTS trg_folios_updated_at ON folios;
CREATE TRIGGER trg_folios_updated_at BEFORE UPDATE ON folios
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2. Payments (Financial Transactions)
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  reservation_id uuid REFERENCES reservations(id) ON DELETE SET NULL,
  folio_id uuid REFERENCES folios(id) ON DELETE SET NULL,
  guest_id uuid REFERENCES guests(id) ON DELETE SET NULL,
  amount numeric(12, 2) NOT NULL,
  currency_code varchar(3) NOT NULL DEFAULT 'INR',
  payment_method varchar(50) NOT NULL DEFAULT 'credit_card', -- "upi", "credit_card", "cash", "bank_transfer"
  status varchar(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'authorized', 'captured', 'settled', 'refunded', 'partially_refunded', 'failed', 'voided')),
  transaction_reference varchar(255),
  gateway_response jsonb,
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE payments ADD COLUMN IF NOT EXISTS hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id) ON DELETE CASCADE;

DROP TRIGGER IF EXISTS trg_payments_updated_at ON payments;
CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 3. Invoices (Tax Invoices & Billing Statements)
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  reservation_id uuid REFERENCES reservations(id) ON DELETE SET NULL,
  folio_id uuid REFERENCES folios(id) ON DELETE SET NULL,
  guest_id uuid REFERENCES guests(id) ON DELETE SET NULL,
  invoice_number varchar(100) NOT NULL UNIQUE,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  subtotal numeric(12, 2) NOT NULL DEFAULT 0.00,
  tax_total numeric(12, 2) NOT NULL DEFAULT 0.00,
  total_amount numeric(12, 2) NOT NULL DEFAULT 0.00,
  amount_paid numeric(12, 2) NOT NULL DEFAULT 0.00,
  balance_due numeric(12, 2) NOT NULL DEFAULT 0.00,
  status varchar(30) NOT NULL DEFAULT 'issued'
    CHECK (status IN ('draft', 'issued', 'paid', 'partially_paid', 'void', 'cancelled')),
  currency_code varchar(3) NOT NULL DEFAULT 'INR',
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id) ON DELETE CASCADE;

DROP TRIGGER IF EXISTS trg_invoices_updated_at ON invoices;
CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 4. Refunds (Payment Reversals)
CREATE TABLE IF NOT EXISTS refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
  amount numeric(12, 2) NOT NULL,
  currency_code varchar(3) NOT NULL DEFAULT 'INR',
  reason text NOT NULL,
  status varchar(30) NOT NULL DEFAULT 'completed'
    CHECK (status IN ('pending', 'completed', 'failed')),
  refund_reference varchar(255),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE refunds ADD COLUMN IF NOT EXISTS hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE;
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id) ON DELETE CASCADE;

DROP TRIGGER IF EXISTS trg_refunds_updated_at ON refunds;
CREATE TRIGGER trg_refunds_updated_at BEFORE UPDATE ON refunds
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 5. Cashier Transactions & Cash Drawer
CREATE TABLE IF NOT EXISTS cashier_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  session_id uuid,
  drawer_id uuid,
  user_id uuid,
  type varchar(50) NOT NULL, -- "paid_in", "paid_out", "drop", "opening_float", "closing_count"
  amount numeric(12, 2) NOT NULL,
  currency_code varchar(3) NOT NULL DEFAULT 'INR',
  reason text,
  reference varchar(100),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cashier_transactions ADD COLUMN IF NOT EXISTS hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE;
ALTER TABLE cashier_transactions ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS cash_drawers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL,
  location varchar(100),
  currency_code varchar(3) NOT NULL DEFAULT 'INR',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cash_drawers ADD COLUMN IF NOT EXISTS hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE;
ALTER TABLE cash_drawers ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id) ON DELETE CASCADE;
ALTER TABLE cash_drawers ADD COLUMN IF NOT EXISTS location varchar(100);
ALTER TABLE cash_drawers ADD COLUMN IF NOT EXISTS currency_code varchar(3) NOT NULL DEFAULT 'INR';
ALTER TABLE cash_drawers ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS cash_drawer_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  drawer_id uuid REFERENCES cash_drawers(id) ON DELETE CASCADE,
  user_id uuid,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  opening_float numeric(12, 2) NOT NULL DEFAULT 0.00,
  closing_cash_counted numeric(12, 2),
  expected_closing_cash numeric(12, 2),
  cash_discrepancy numeric(12, 2),
  status varchar(20) NOT NULL DEFAULT 'open',
  notes text
);

ALTER TABLE cash_drawer_sessions ADD COLUMN IF NOT EXISTS hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE;
ALTER TABLE cash_drawer_sessions ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS cash_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  session_id uuid REFERENCES cash_drawer_sessions(id) ON DELETE CASCADE,
  drawer_id uuid REFERENCES cash_drawers(id) ON DELETE CASCADE,
  user_id uuid,
  type varchar(30) NOT NULL,
  amount numeric(12, 2) NOT NULL,
  reason text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cash_movements ADD COLUMN IF NOT EXISTS hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE;
ALTER TABLE cash_movements ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id) ON DELETE CASCADE;

-- Indexes for Payments & Billing
CREATE INDEX IF NOT EXISTS idx_folios_res ON folios(reservation_id);
CREATE INDEX IF NOT EXISTS idx_folios_hotel ON folios(hotel_id);
CREATE INDEX IF NOT EXISTS idx_payments_folio ON payments(folio_id);
CREATE INDEX IF NOT EXISTS idx_payments_hotel ON payments(hotel_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_invoices_hotel ON invoices(hotel_id);
CREATE INDEX IF NOT EXISTS idx_invoices_num ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_cashier_hotel ON cashier_transactions(hotel_id);


-- ----------------------------------------------------------------------------
-- SECTION: 06_front_desk_and_ops.sql
-- ----------------------------------------------------------------------------

-- ============================================================================
-- HOTEL SPARK / HAIP – SUPABASE SQL MIGRATION
-- 06_front_desk_and_ops.sql: Front Desk (Check-in/out) & Hotel Operations
-- ============================================================================

-- 1. Housekeeping Tasks
CREATE TABLE IF NOT EXISTS housekeeping_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  task_type varchar(50) NOT NULL DEFAULT 'checkout', -- "checkout", "stayover", "deep_clean", "inspection", "turndown"
  status varchar(50) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'inspected', 'skipped')),
  priority varchar(20) NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_to uuid,
  scheduled_date date NOT NULL DEFAULT CURRENT_DATE,
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE housekeeping_tasks ADD COLUMN IF NOT EXISTS hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE;
ALTER TABLE housekeeping_tasks ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id) ON DELETE CASCADE;

DROP TRIGGER IF EXISTS trg_housekeeping_tasks_updated_at ON housekeeping_tasks;
CREATE TRIGGER trg_housekeeping_tasks_updated_at BEFORE UPDATE ON housekeeping_tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2. Maintenance Requests (Engineering & Facilities)
CREATE TABLE IF NOT EXISTS maintenance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  room_id uuid REFERENCES rooms(id) ON DELETE SET NULL,
  category varchar(50) NOT NULL DEFAULT 'general', -- "plumbing", "electrical", "hvac", "carpentry", "appliance", "general"
  priority varchar(20) NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status varchar(50) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'resolved', 'cancelled')),
  title varchar(255) NOT NULL,
  description text,
  reported_by uuid,
  assigned_to uuid,
  resolution_notes text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_maintenance_requests_updated_at ON maintenance_requests;
CREATE TRIGGER trg_maintenance_requests_updated_at BEFORE UPDATE ON maintenance_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 3. Service Requests (Compatibility table with existing HAIP ops schema)
CREATE TABLE IF NOT EXISTS service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  room_id uuid REFERENCES rooms(id) ON DELETE SET NULL,
  category varchar(50) DEFAULT 'service_request',
  status varchar(30) DEFAULT 'open',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Check-Ins
CREATE TABLE IF NOT EXISTS check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
  guest_id uuid NOT NULL REFERENCES guests(id) ON DELETE RESTRICT,
  checked_in_at timestamptz NOT NULL DEFAULT now(),
  checked_in_by uuid,
  key_cards_issued integer NOT NULL DEFAULT 1,
  deposit_amount numeric(12, 2) DEFAULT 0.00,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger to update reservation status and room status on check-in
CREATE OR REPLACE FUNCTION on_check_in_created()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark reservation checked_in
  UPDATE reservations
  SET status = 'checked_in',
      checked_in_at = NEW.checked_in_at,
      checked_in_by = NEW.checked_in_by,
      updated_at = now()
  WHERE id = NEW.reservation_id;

  -- Mark physical room occupied
  UPDATE rooms
  SET status = 'occupied',
      hk_occupancy = 'occupied',
      updated_at = now()
  WHERE id = NEW.room_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_after_check_in ON check_ins;
CREATE TRIGGER trg_after_check_in AFTER INSERT ON check_ins
  FOR EACH ROW EXECUTE FUNCTION on_check_in_created();

-- 5. Check-Outs
CREATE TABLE IF NOT EXISTS check_outs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
  guest_id uuid NOT NULL REFERENCES guests(id) ON DELETE RESTRICT,
  checked_out_at timestamptz NOT NULL DEFAULT now(),
  checked_out_by uuid,
  folio_balance_at_checkout numeric(12, 2) NOT NULL DEFAULT 0.00,
  settlement_status varchar(30) NOT NULL DEFAULT 'settled'
    CHECK (settlement_status IN ('settled', 'city_ledger', 'unsettled')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger to update reservation and room status on check-out
CREATE OR REPLACE FUNCTION on_check_out_created()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark reservation checked_out
  UPDATE reservations
  SET status = 'checked_out',
      checked_out_at = NEW.checked_out_at,
      checked_out_by = NEW.checked_out_by,
      updated_at = now()
  WHERE id = NEW.reservation_id;

  -- Mark physical room vacant_dirty for housekeeping
  UPDATE rooms
  SET status = 'vacant_dirty',
      hk_occupancy = 'vacant',
      updated_at = now()
  WHERE id = NEW.room_id;

  -- Auto-generate a checkout cleaning task
  INSERT INTO housekeeping_tasks (
    hotel_id, property_id, room_id, task_type, status, priority, scheduled_date
  ) VALUES (
    NEW.hotel_id, NEW.property_id, NEW.room_id, 'checkout', 'pending', 'high', CURRENT_DATE
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_after_check_out ON check_outs;
CREATE TRIGGER trg_after_check_out AFTER INSERT ON check_outs
  FOR EACH ROW EXECUTE FUNCTION on_check_out_created();

-- Indexes for Front Desk & Ops
CREATE INDEX IF NOT EXISTS idx_check_ins_hotel_res ON check_ins(hotel_id, reservation_id);
CREATE INDEX IF NOT EXISTS idx_check_outs_hotel_res ON check_outs(hotel_id, reservation_id);
CREATE INDEX IF NOT EXISTS idx_hk_tasks_hotel_status ON housekeeping_tasks(hotel_id, status);
CREATE INDEX IF NOT EXISTS idx_hk_tasks_room ON housekeeping_tasks(room_id);
CREATE INDEX IF NOT EXISTS idx_maint_hotel_status ON maintenance_requests(hotel_id, status);


-- ----------------------------------------------------------------------------
-- SECTION: 07_finance_notifications_security.sql
-- ----------------------------------------------------------------------------

-- ============================================================================
-- HOTEL SPARK / HAIP – SUPABASE SQL MIGRATION
-- 07_finance_notifications_security.sql: Expenses, Notifications & Audit Logs
-- ============================================================================

-- 1. Expenses (Operating Expenses & Vendor Payments)
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  category varchar(100) NOT NULL, -- "supplies", "utilities", "maintenance", "linens", "food_beverage", "software", "staff"
  amount numeric(12, 2) NOT NULL,
  currency_code varchar(3) NOT NULL DEFAULT 'INR',
  vendor varchar(255),
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method varchar(50) NOT NULL DEFAULT 'bank_transfer',
  status varchar(30) NOT NULL DEFAULT 'approved'
    CHECK (status IN ('pending', 'approved', 'rejected', 'reimbursed')),
  receipt_url text,
  approved_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_expenses_updated_at ON expenses;
CREATE TRIGGER trg_expenses_updated_at BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2. Notifications (In-App Alerts for Staff & Management)
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  user_id uuid,
  type varchar(100) NOT NULL, -- "booking_request_created", "booking_request_approved", "booking_request_rejected", "payment_received"
  severity varchar(20) NOT NULL DEFAULT 'info'
    CHECK (severity IN ('info', 'warning', 'critical')),
  title varchar(255) NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Compatibility: Staff Notifications table for existing HAIP backend
CREATE TABLE IF NOT EXISTS staff_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  type varchar(100) NOT NULL,
  severity varchar(20) NOT NULL DEFAULT 'info',
  title varchar(255) NOT NULL,
  message text NOT NULL,
  source_event varchar(100),
  source_entity_type varchar(50),
  source_entity_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE staff_notifications ADD COLUMN IF NOT EXISTS hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE;
ALTER TABLE staff_notifications ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id) ON DELETE CASCADE;

-- 3. Notification Logs (Delivery tracking for WhatsApp, Email, Webhooks)
CREATE TABLE IF NOT EXISTS notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  channel varchar(50) NOT NULL, -- "whatsapp", "email", "sms", "webhook"
  recipient varchar(255) NOT NULL,
  subject varchar(255),
  content text NOT NULL,
  status varchar(30) NOT NULL DEFAULT 'sent'
    CHECK (status IN ('pending', 'sent', 'failed')),
  error_message text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Audit Logs (GDPR / PCI DSS compliance immutable audit trail)
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) ON DELETE SET NULL,
  property_id uuid REFERENCES properties(id) ON DELETE SET NULL,
  user_id uuid,
  user_email varchar(255),
  ip_address varchar(45),
  action varchar(50) NOT NULL, -- "create", "update", "delete", "approve", "reject", "access"
  entity_type varchar(50) NOT NULL, -- "booking_request", "reservation", "guest", "folio", "payment", "room"
  entity_id uuid,
  previous_value jsonb,
  new_value jsonb,
  description text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS hotel_id uuid REFERENCES hotels(id) ON DELETE SET NULL;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id) ON DELETE SET NULL;

-- Indexes for Finance, Notifications & Security
CREATE INDEX IF NOT EXISTS idx_expenses_hotel ON expenses(hotel_id);
CREATE INDEX IF NOT EXISTS idx_notifications_hotel ON notifications(hotel_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_staff_notifs_hotel ON staff_notifications(hotel_id);
CREATE INDEX IF NOT EXISTS idx_notif_logs_hotel ON notification_logs(hotel_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_hotel_entity ON audit_logs(hotel_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_time ON audit_logs(occurred_at DESC);


-- ----------------------------------------------------------------------------
-- SECTION: 08_direct_booking_workflow_functions.sql
-- ----------------------------------------------------------------------------

-- ============================================================================
-- HOTEL SPARK / HAIP – SUPABASE SQL MIGRATION
-- 08_direct_booking_workflow_functions.sql: Direct Booking Workflow Functions
-- ============================================================================

-- 1. Helper function: Revalidate room availability for given dates & room type
CREATE OR REPLACE FUNCTION revalidate_room_availability(
  p_hotel_id uuid,
  p_room_type_id uuid,
  p_arrival_date date,
  p_departure_date date
)
RETURNS TABLE (
  room_id uuid,
  room_number varchar(20),
  room_floor varchar(10),
  room_status room_status,
  is_available boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id AS room_id,
    r.number AS room_number,
    r.floor AS room_floor,
    r.status AS room_status,
    (
      -- Not occupied or out_of_order
      r.status NOT IN ('out_of_order', 'out_of_service')
      -- Not having an overlapping confirmed reservation
      AND NOT EXISTS (
        SELECT 1
        FROM reservations res
        WHERE res.room_id = r.id
          AND res.hotel_id = p_hotel_id
          AND res.status IN ('confirmed', 'assigned', 'checked_in', 'stayover')
          AND res.arrival_date < p_departure_date
          AND res.departure_date > p_arrival_date
      )
      -- Not blocked
      AND NOT EXISTS (
        SELECT 1
        FROM room_blocks rb
        WHERE rb.room_id = r.id
          AND rb.start_date < p_departure_date
          AND rb.end_date > p_arrival_date
      )
    ) AS is_available
  FROM rooms r
  WHERE r.hotel_id = p_hotel_id
    AND r.room_type_id = p_room_type_id
    AND r.is_active = true
  ORDER BY is_available DESC, r.number ASC;
END;
$$;

-- 2. Website Booking Request Submission Function (Publicly Executable)
CREATE OR REPLACE FUNCTION submit_website_booking_request(
  p_hotel_id uuid,
  p_room_type_id uuid,
  p_arrival_date date,
  p_departure_date date,
  p_guest_first_name varchar(100),
  p_guest_last_name varchar(100),
  p_guest_email varchar(255),
  p_guest_phone varchar(50),
  p_submitted_total numeric(12, 2),
  p_adults integer DEFAULT 1,
  p_children integer DEFAULT 0,
  p_special_requests text DEFAULT NULL,
  p_currency_code varchar(3) DEFAULT 'INR',
  p_idempotency_key varchar(255) DEFAULT NULL,
  p_form_snapshot jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_property_id uuid;
  v_key varchar(255);
  v_existing_id uuid;
  v_booking_request_id uuid;
  v_room_type_name varchar(100);
  v_rate_plan_id uuid;
BEGIN
  -- Validate dates
  IF p_arrival_date >= p_departure_date THEN
    RAISE EXCEPTION 'Departure date must be after arrival date.';
  END IF;

  -- Ensure hotel exists
  SELECT id INTO p_hotel_id FROM hotels WHERE id = p_hotel_id;
  IF p_hotel_id IS NULL THEN
    RAISE EXCEPTION 'Invalid hotel_id.';
  END IF;

  -- Get corresponding property_id
  SELECT id INTO v_property_id FROM properties WHERE hotel_id = p_hotel_id LIMIT 1;
  IF v_property_id IS NULL THEN
    v_property_id := p_hotel_id;
  END IF;

  -- Verify room type exists
  SELECT name INTO v_room_type_name
  FROM room_types
  WHERE id = p_room_type_id
    AND (hotel_id = p_hotel_id OR property_id = p_hotel_id);
  IF v_room_type_name IS NULL THEN
    RAISE EXCEPTION 'Room type not found for this hotel.';
  END IF;

  -- Get Rate Plan for room type
  SELECT id INTO v_rate_plan_id
  FROM rate_plans
  WHERE (hotel_id = p_hotel_id OR property_id = p_hotel_id)
    AND (room_type_id = p_room_type_id OR room_type_id IS NULL)
    AND is_active = true
  LIMIT 1;

  IF v_rate_plan_id IS NULL THEN
    SELECT id INTO v_rate_plan_id
    FROM rate_plans
    WHERE (hotel_id = p_hotel_id OR property_id = p_hotel_id)
    LIMIT 1;
  END IF;

  -- Idempotency key generation or check
  IF p_idempotency_key IS NOT NULL AND TRIM(p_idempotency_key) <> '' THEN
    v_key := TRIM(p_idempotency_key);
    SELECT id INTO v_existing_id FROM booking_requests WHERE submission_idempotency_key = v_key LIMIT 1;
    IF v_existing_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', true,
        'id', v_existing_id,
        'reference', v_key,
        'status', 'pending',
        'is_duplicate', true,
        'message', 'Booking request already received and pending review.'
      );
    END IF;
  ELSE
    v_key := 'REQ-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 6));
  END IF;

  -- Insert Booking Request with status 'pending'
  INSERT INTO booking_requests (
    hotel_id,
    property_id,
    submission_idempotency_key,
    submission_fingerprint,
    status,
    arrival_date,
    departure_date,
    room_type_id,
    rate_plan_id,
    adults,
    children,
    guest_first_name,
    guest_last_name,
    guest_email,
    guest_phone,
    special_requests,
    form_snapshot,
    submitted_quote_snapshot,
    submitted_total,
    currency_code,
    created_at,
    updated_at
  ) VALUES (
    p_hotel_id,
    v_property_id,
    v_key,
    v_key,
    'pending',
    p_arrival_date,
    p_departure_date,
    p_room_type_id,
    v_rate_plan_id,
    p_adults,
    p_children,
    TRIM(p_guest_first_name),
    TRIM(p_guest_last_name),
    LOWER(TRIM(p_guest_email)),
    TRIM(p_guest_phone),
    p_special_requests,
    p_form_snapshot,
    jsonb_build_object(
      'grandTotal', p_submitted_total,
      'total', p_submitted_total,
      'room_type_id', p_room_type_id,
      'rate_plan_id', v_rate_plan_id,
      'currency', p_currency_code,
      'arrival', p_arrival_date,
      'departure', p_departure_date
    ),
    p_submitted_total,
    p_currency_code,
    now(),
    now()
  )
  RETURNING id INTO v_booking_request_id;

  -- Create Notification for Hotel Staff
  INSERT INTO notifications (
    hotel_id,
    property_id,
    type,
    severity,
    title,
    message,
    metadata
  ) VALUES (
    p_hotel_id,
    v_property_id,
    'booking_request_created',
    'info',
    'New Direct Booking Request: ' || v_key,
    p_guest_first_name || ' ' || p_guest_last_name || ' requested ' || v_room_type_name || ' for ' || p_currency_code || ' ' || p_submitted_total,
    jsonb_build_object(
      'booking_request_id', v_booking_request_id,
      'reference', v_key,
      'guest_name', p_guest_first_name || ' ' || p_guest_last_name,
      'guest_phone', p_guest_phone,
      'arrival', p_arrival_date,
      'departure', p_departure_date,
      'total', p_submitted_total
    )
  );

  -- Create Staff Notification
  INSERT INTO staff_notifications (
    hotel_id,
    property_id,
    type,
    severity,
    title,
    message,
    source_event,
    source_entity_type,
    source_entity_id
  ) VALUES (
    p_hotel_id,
    v_property_id,
    'booking_request_pending',
    'info',
    'New Booking Request: ' || v_key,
    p_guest_first_name || ' ' || p_guest_last_name || ' submitted booking request for ' || v_room_type_name,
    'booking_request_created',
    'booking_request',
    v_booking_request_id
  );

  -- Log Audit Trail
  INSERT INTO audit_logs (
    hotel_id,
    property_id,
    action,
    entity_type,
    entity_id,
    new_value,
    description
  ) VALUES (
    p_hotel_id,
    v_property_id,
    'create',
    'booking_request',
    v_booking_request_id,
    jsonb_build_object('reference', v_key, 'guest_email', p_guest_email, 'total', p_submitted_total),
    'Guest submitted online booking request'
  );

  RETURN jsonb_build_object(
    'success', true,
    'id', v_booking_request_id,
    'reference', v_key,
    'status', 'pending',
    'message', 'Booking request submitted successfully! Awaiting hotel confirmation.'
  );
END;
$$;

-- 3. Direct Booking Approval Function (Atomic Transaction & Double-Booking Prevention)
CREATE OR REPLACE FUNCTION approve_direct_booking(
  p_booking_request_id uuid,
  p_hotel_id uuid,
  p_room_id uuid,
  p_decided_by uuid DEFAULT NULL,
  p_custom_total numeric(12, 2) DEFAULT NULL,
  p_custom_price_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_req record;
  v_property_id uuid;
  v_guest_id uuid;
  v_booking_id uuid;
  v_reservation_id uuid;
  v_folio_id uuid;
  v_confirmation_number varchar(50);
  v_folio_number varchar(50);
  v_rate_plan_id uuid;
  v_nights integer;
  v_final_total numeric(12, 2);
  v_room_conflict boolean;
  v_room_number varchar(20);
BEGIN
  -- Lock and fetch booking request
  SELECT * INTO v_req
  FROM booking_requests
  WHERE id = p_booking_request_id AND (hotel_id = p_hotel_id OR property_id = p_hotel_id)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking request not found for hotel.';
  END IF;

  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'Booking request is already processed (current status: %).', v_req.status;
  END IF;

  v_property_id := COALESCE(v_req.property_id, p_hotel_id);
  v_nights := GREATEST(1, (v_req.departure_date - v_req.arrival_date));
  v_final_total := COALESCE(p_custom_total, v_req.submitted_total);

  -- Double-Booking Prevention: Lock room and verify availability
  SELECT number INTO v_room_number
  FROM rooms
  WHERE id = p_room_id AND (hotel_id = p_hotel_id OR property_id = p_hotel_id)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Selected room does not exist in this hotel.';
  END IF;

  -- Check for existing active reservation for the requested dates
  SELECT EXISTS (
    SELECT 1
    FROM reservations r
    WHERE r.room_id = p_room_id
      AND (r.hotel_id = p_hotel_id OR r.property_id = p_hotel_id)
      AND r.status IN ('confirmed', 'assigned', 'checked_in', 'stayover')
      AND r.arrival_date < v_req.departure_date
      AND r.departure_date > v_req.arrival_date
  ) INTO v_room_conflict;

  IF v_room_conflict THEN
    RAISE EXCEPTION 'Room % is already reserved for overlapping dates. Double booking prevented.', v_room_number;
  END IF;

  -- Find or create Guest
  SELECT id INTO v_guest_id
  FROM guests
  WHERE (hotel_id = p_hotel_id OR property_id = p_hotel_id)
    AND (
      (email IS NOT NULL AND lower(email) = lower(v_req.guest_email))
      OR (phone IS NOT NULL AND phone = v_req.guest_phone)
    )
  LIMIT 1;

  IF v_guest_id IS NULL THEN
    INSERT INTO guests (
      hotel_id,
      property_id,
      first_name,
      last_name,
      email,
      phone,
      country_code
    ) VALUES (
      p_hotel_id,
      v_property_id,
      v_req.guest_first_name,
      v_req.guest_last_name,
      v_req.guest_email,
      v_req.guest_phone,
      'IN'
    ) RETURNING id INTO v_guest_id;
  END IF;

  -- Get or fallback Rate Plan
  SELECT id INTO v_rate_plan_id
  FROM rate_plans
  WHERE hotel_id = p_hotel_id AND room_type_id = v_req.room_type_id AND is_active = true
  LIMIT 1;

  IF v_rate_plan_id IS NULL THEN
    SELECT id INTO v_rate_plan_id FROM rate_plans WHERE hotel_id = p_hotel_id LIMIT 1;
  END IF;

  -- Generate Unique Confirmation & Folio Numbers
  v_confirmation_number := 'SPARK-' || to_char(v_req.arrival_date, 'YYMM') || '-' || upper(substr(md5(random()::text), 1, 5));
  v_folio_number := 'FOL-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 4));

  -- 1. Insert Bookings Header
  INSERT INTO bookings (
    hotel_id,
    property_id,
    guest_id,
    confirmation_number,
    source,
    channel_code,
    notes
  ) VALUES (
    p_hotel_id,
    v_property_id,
    v_guest_id,
    v_confirmation_number,
    'direct',
    'spark_direct_booking_approval',
    'Approved from direct booking request ' || v_req.submission_idempotency_key
  ) RETURNING id INTO v_booking_id;

  -- 2. Insert Confirmed Reservation
  INSERT INTO reservations (
    hotel_id,
    property_id,
    booking_id,
    guest_id,
    arrival_date,
    departure_date,
    nights,
    room_type_id,
    room_id,
    status,
    rate_plan_id,
    total_amount,
    currency_code,
    adults,
    children,
    special_requests
  ) VALUES (
    p_hotel_id,
    v_property_id,
    v_booking_id,
    v_guest_id,
    v_req.arrival_date,
    v_req.departure_date,
    v_nights,
    v_req.room_type_id,
    p_room_id,
    'confirmed',
    v_rate_plan_id,
    v_final_total,
    v_req.currency_code,
    v_req.adults,
    v_req.children,
    v_req.special_requests
  ) RETURNING id INTO v_reservation_id;

  -- 3. Insert Reservation Rooms
  INSERT INTO reservation_rooms (
    hotel_id,
    property_id,
    reservation_id,
    room_id,
    room_type_id,
    rate_plan_id,
    arrival_date,
    departure_date,
    room_rate,
    status
  ) VALUES (
    p_hotel_id,
    v_property_id,
    v_reservation_id,
    p_room_id,
    v_req.room_type_id,
    v_rate_plan_id,
    v_req.arrival_date,
    v_req.departure_date,
    (v_final_total / v_nights),
    'assigned'
  );

  -- 4. Create Folio
  INSERT INTO folios (
    hotel_id,
    property_id,
    reservation_id,
    booking_id,
    guest_id,
    folio_number,
    type,
    status,
    total_charges,
    total_payments,
    balance,
    currency_code
  ) VALUES (
    p_hotel_id,
    v_property_id,
    v_reservation_id,
    v_booking_id,
    v_guest_id,
    v_folio_number,
    'guest',
    'open',
    v_final_total,
    0.00,
    v_final_total,
    v_req.currency_code
  ) RETURNING id INTO v_folio_id;

  -- 5. Update Booking Request Status to accepted
  UPDATE booking_requests
  SET status = 'accepted',
      accepted_reservation_id = v_reservation_id,
      accepted_folio_id = v_folio_id,
      accepted_total = v_final_total,
      custom_price_reason = p_custom_price_reason,
      decided_by = p_decided_by,
      decided_at = now(),
      updated_at = now()
  WHERE id = p_booking_request_id;

  -- 6. Notifications for Staff & Guest WhatsApp Log
  INSERT INTO notifications (
    hotel_id,
    property_id,
    type,
    severity,
    title,
    message,
    metadata
  ) VALUES (
    p_hotel_id,
    v_property_id,
    'booking_request_approved',
    'info',
    'Booking Request Approved: ' || v_confirmation_number,
    'Booking for ' || v_req.guest_first_name || ' ' || v_req.guest_last_name || ' confirmed in Room ' || v_room_number,
    jsonb_build_object(
      'booking_id', v_booking_id,
      'reservation_id', v_reservation_id,
      'confirmation_number', v_confirmation_number,
      'room_number', v_room_number
    )
  );

  -- Guest WhatsApp notification log
  INSERT INTO notification_logs (
    hotel_id,
    property_id,
    channel,
    recipient,
    subject,
    content,
    status
  ) VALUES (
    p_hotel_id,
    v_property_id,
    'whatsapp',
    COALESCE(v_req.guest_phone, v_req.guest_email),
    'Reservation Confirmed - Hotel Spark',
    'Hello ' || v_req.guest_first_name || ', your booking at Hotel Spark is CONFIRMED! Confirmation No: ' || v_confirmation_number || '. Check-in: ' || to_char(v_req.arrival_date, 'YYYY-MM-DD') || ', Room: ' || v_room_number || '. Total: ₹' || v_final_total || '.',
    'sent'
  );

  -- Audit Log
  INSERT INTO audit_logs (
    hotel_id,
    property_id,
    user_id,
    action,
    entity_type,
    entity_id,
    new_value,
    description
  ) VALUES (
    p_hotel_id,
    v_property_id,
    p_decided_by,
    'approve',
    'booking_request',
    p_booking_request_id,
    jsonb_build_object(
      'reservation_id', v_reservation_id,
      'confirmation_number', v_confirmation_number,
      'room_id', p_room_id,
      'room_number', v_room_number,
      'total', v_final_total
    ),
    'Admin approved booking request and confirmed reservation'
  );

  RETURN jsonb_build_object(
    'success', true,
    'booking_request_id', p_booking_request_id,
    'booking_id', v_booking_id,
    'reservation_id', v_reservation_id,
    'confirmation_number', v_confirmation_number,
    'room_id', p_room_id,
    'room_number', v_room_number,
    'status', 'confirmed',
    'message', 'Booking request successfully approved and reservation confirmed.'
  );
END;
$$;

-- 4. Direct Booking Rejection Function (Mandatory Reason Enforced)
CREATE OR REPLACE FUNCTION reject_direct_booking(
  p_booking_request_id uuid,
  p_hotel_id uuid,
  p_reason text,
  p_decided_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_req record;
  v_property_id uuid;
  v_clean_reason text;
BEGIN
  v_clean_reason := TRIM(COALESCE(p_reason, ''));

  IF v_clean_reason = '' THEN
    RAISE EXCEPTION 'Rejection reason is mandatory.';
  END IF;

  SELECT * INTO v_req
  FROM booking_requests
  WHERE id = p_booking_request_id AND (hotel_id = p_hotel_id OR property_id = p_hotel_id)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking request not found for hotel.';
  END IF;

  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'Booking request is already processed (current status: %).', v_req.status;
  END IF;

  v_property_id := COALESCE(v_req.property_id, p_hotel_id);

  -- Update booking request status to denied
  UPDATE booking_requests
  SET status = 'denied',
      denial_reason = v_clean_reason,
      decided_by = p_decided_by,
      decided_at = now(),
      updated_at = now()
  WHERE id = p_booking_request_id;

  -- Create Notification for Hotel Staff
  INSERT INTO notifications (
    hotel_id,
    property_id,
    type,
    severity,
    title,
    message,
    metadata
  ) VALUES (
    p_hotel_id,
    v_property_id,
    'booking_request_rejected',
    'warning',
    'Booking Request Rejected: ' || v_req.submission_idempotency_key,
    'Request for ' || v_req.guest_first_name || ' ' || v_req.guest_last_name || ' was rejected. Reason: ' || v_clean_reason,
    jsonb_build_object(
      'booking_request_id', p_booking_request_id,
      'reason', v_clean_reason
    )
  );

  -- Log Guest WhatsApp Rejection Message
  INSERT INTO notification_logs (
    hotel_id,
    property_id,
    channel,
    recipient,
    subject,
    content,
    status
  ) VALUES (
    p_hotel_id,
    v_property_id,
    'whatsapp',
    COALESCE(v_req.guest_phone, v_req.guest_email),
    'Update on your booking request - Hotel Spark',
    'Hello ' || v_req.guest_first_name || ', we regret to inform you that we could not accept your booking request (' || v_req.submission_idempotency_key || ') for ' || to_char(v_req.arrival_date, 'YYYY-MM-DD') || '. Reason: ' || v_clean_reason || '. Please contact us for alternate dates.',
    'sent'
  );

  -- Audit Log
  INSERT INTO audit_logs (
    hotel_id,
    property_id,
    user_id,
    action,
    entity_type,
    entity_id,
    new_value,
    description
  ) VALUES (
    p_hotel_id,
    v_property_id,
    p_decided_by,
    'reject',
    'booking_request',
    p_booking_request_id,
    jsonb_build_object('reason', v_clean_reason),
    'Admin rejected booking request: ' || v_clean_reason
  );

  RETURN jsonb_build_object(
    'success', true,
    'booking_request_id', p_booking_request_id,
    'status', 'rejected',
    'reason', v_clean_reason,
    'message', 'Booking request has been rejected.'
  );
END;
$$;


-- ----------------------------------------------------------------------------
-- SECTION: 09_row_level_security.sql
-- ----------------------------------------------------------------------------

-- ============================================================================
-- HOTEL SPARK / HAIP – SUPABASE SQL MIGRATION
-- 09_row_level_security.sql: Supabase Row Level Security (RLS) Policies
-- ============================================================================

-- 1. Helper functions to inspect authenticated user roles and hotel tenancy

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM hotel_members
    WHERE user_id = auth.uid()
      AND role = 'super_admin'
      AND status = 'active'
  );
END;
$$;

CREATE OR REPLACE FUNCTION has_hotel_access(check_hotel_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  RETURN is_super_admin() OR EXISTS (
    SELECT 1 FROM hotel_members
    WHERE user_id = auth.uid()
      AND (hotel_id = check_hotel_id OR property_id = check_hotel_id)
      AND status = 'active'
  );
END;
$$;

CREATE OR REPLACE FUNCTION get_user_role(check_hotel_id uuid)
RETURNS user_role_enum
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_role user_role_enum;
BEGIN
  IF is_super_admin() THEN
    RETURN 'super_admin'::user_role_enum;
  END IF;

  SELECT role INTO v_role
  FROM hotel_members
  WHERE user_id = auth.uid()
    AND (hotel_id = check_hotel_id OR property_id = check_hotel_id)
    AND status = 'active'
  LIMIT 1;

  RETURN v_role;
END;
$$;

-- 2. Enable Row Level Security on all sensitive tables

ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_settings ENABLE ROW LEVEL SECURITY;

ALTER TABLE room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_blocks ENABLE ROW LEVEL SECURITY;

ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_documents ENABLE ROW LEVEL SECURITY;

ALTER TABLE booking_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_rooms ENABLE ROW LEVEL SECURITY;

ALTER TABLE folios ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashier_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_drawers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_drawer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;

ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_outs ENABLE ROW LEVEL SECURITY;
ALTER TABLE housekeeping_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 3. Public Website Read Policies (Anonymous & Authenticated)
-- Hotel details, room types, rate plans and room images must be readable on website

DROP POLICY IF EXISTS "Public can view active hotels" ON hotels;
CREATE POLICY "Public can view active hotels"
  ON hotels FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Public can view active properties" ON properties;
CREATE POLICY "Public can view active properties"
  ON properties FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public can view active room types" ON room_types;
CREATE POLICY "Public can view active room types"
  ON room_types FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Public can view room images" ON room_images;
CREATE POLICY "Public can view room images"
  ON room_images FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public can view rate plans" ON rate_plans;
CREATE POLICY "Public can view rate plans"
  ON rate_plans FOR SELECT
  USING (is_active = true);

-- 4. Profiles RLS
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid() OR is_super_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- 5. Hotel Members RLS
DROP POLICY IF EXISTS "Staff can view members in their hotel" ON hotel_members;
CREATE POLICY "Staff can view members in their hotel"
  ON hotel_members FOR SELECT
  USING (has_hotel_access(hotel_id));

DROP POLICY IF EXISTS "Admins can manage members in their hotel" ON hotel_members;
CREATE POLICY "Admins can manage members in their hotel"
  ON hotel_members FOR ALL
  USING (
    is_super_admin() OR
    get_user_role(hotel_id) IN ('hotel_admin', 'manager')
  );

-- 6. Hotel Settings RLS
DROP POLICY IF EXISTS "Staff can read hotel settings" ON hotel_settings;
CREATE POLICY "Staff can read hotel settings"
  ON hotel_settings FOR SELECT
  USING (has_hotel_access(hotel_id));

DROP POLICY IF EXISTS "Admins can update hotel settings" ON hotel_settings;
CREATE POLICY "Admins can update hotel settings"
  ON hotel_settings FOR ALL
  USING (
    is_super_admin() OR
    get_user_role(hotel_id) IN ('hotel_admin', 'manager')
  );

-- 7. Room Management RLS
DROP POLICY IF EXISTS "Staff can view all rooms in their hotel" ON rooms;
CREATE POLICY "Staff can view all rooms in their hotel"
  ON rooms FOR SELECT
  USING (has_hotel_access(hotel_id));

DROP POLICY IF EXISTS "Staff can update room cleanliness and status" ON rooms;
CREATE POLICY "Staff can update room cleanliness and status"
  ON rooms FOR UPDATE
  USING (has_hotel_access(hotel_id));

DROP POLICY IF EXISTS "Admins can manage rooms" ON rooms;
CREATE POLICY "Admins can manage rooms"
  ON rooms FOR ALL
  USING (
    is_super_admin() OR
    get_user_role(hotel_id) IN ('hotel_admin', 'manager')
  );

-- 8. Guests & Guest Documents RLS
DROP POLICY IF EXISTS "Hotel staff can access guests" ON guests;
CREATE POLICY "Hotel staff can access guests"
  ON guests FOR ALL
  USING (has_hotel_access(hotel_id));

DROP POLICY IF EXISTS "Hotel staff can access guest documents" ON guest_documents;
CREATE POLICY "Hotel staff can access guest documents"
  ON guest_documents FOR ALL
  USING (has_hotel_access(hotel_id));

-- 9. Direct Booking Requests RLS
DROP POLICY IF EXISTS "Staff can view and manage booking requests" ON booking_requests;
CREATE POLICY "Staff can view and manage booking requests"
  ON booking_requests FOR ALL
  USING (has_hotel_access(hotel_id));

-- 10. Bookings & Reservations RLS
DROP POLICY IF EXISTS "Staff can view bookings" ON bookings;
CREATE POLICY "Staff can view bookings"
  ON bookings FOR ALL
  USING (has_hotel_access(hotel_id));

DROP POLICY IF EXISTS "Staff can view and manage reservations" ON reservations;
CREATE POLICY "Staff can view and manage reservations"
  ON reservations FOR ALL
  USING (has_hotel_access(hotel_id));

DROP POLICY IF EXISTS "Staff can view and manage reservation rooms" ON reservation_rooms;
CREATE POLICY "Staff can view and manage reservation rooms"
  ON reservation_rooms FOR ALL
  USING (has_hotel_access(hotel_id));

-- 11. Payments, Folios, Invoices & Refunds RLS
DROP POLICY IF EXISTS "Staff can view folios" ON folios;
CREATE POLICY "Staff can view folios"
  ON folios FOR SELECT
  USING (has_hotel_access(hotel_id));

DROP POLICY IF EXISTS "Front desk and accountants can update folios" ON folios;
CREATE POLICY "Front desk and accountants can update folios"
  ON folios FOR ALL
  USING (
    is_super_admin() OR
    get_user_role(hotel_id) IN ('hotel_admin', 'manager', 'receptionist', 'accountant')
  );

DROP POLICY IF EXISTS "Financial staff can view payments" ON payments;
CREATE POLICY "Financial staff can view payments"
  ON payments FOR SELECT
  USING (has_hotel_access(hotel_id));

DROP POLICY IF EXISTS "Financial staff can manage payments" ON payments;
CREATE POLICY "Financial staff can manage payments"
  ON payments FOR ALL
  USING (
    is_super_admin() OR
    get_user_role(hotel_id) IN ('hotel_admin', 'manager', 'receptionist', 'accountant')
  );

DROP POLICY IF EXISTS "Financial staff can manage invoices" ON invoices;
CREATE POLICY "Financial staff can manage invoices"
  ON invoices FOR ALL
  USING (
    is_super_admin() OR
    get_user_role(hotel_id) IN ('hotel_admin', 'manager', 'receptionist', 'accountant')
  );

DROP POLICY IF EXISTS "Accountants and admins can manage refunds" ON refunds;
CREATE POLICY "Accountants and admins can manage refunds"
  ON refunds FOR ALL
  USING (
    is_super_admin() OR
    get_user_role(hotel_id) IN ('hotel_admin', 'manager', 'accountant')
  );

-- 12. Front Desk & Ops RLS
DROP POLICY IF EXISTS "Front desk staff can manage check-ins" ON check_ins;
CREATE POLICY "Front desk staff can manage check-ins"
  ON check_ins FOR ALL
  USING (has_hotel_access(hotel_id));

DROP POLICY IF EXISTS "Front desk staff can manage check-outs" ON check_outs;
CREATE POLICY "Front desk staff can manage check-outs"
  ON check_outs FOR ALL
  USING (has_hotel_access(hotel_id));

DROP POLICY IF EXISTS "Operations staff can manage housekeeping" ON housekeeping_tasks;
CREATE POLICY "Operations staff can manage housekeeping"
  ON housekeeping_tasks FOR ALL
  USING (has_hotel_access(hotel_id));

DROP POLICY IF EXISTS "Operations staff can manage maintenance" ON maintenance_requests;
CREATE POLICY "Operations staff can manage maintenance"
  ON maintenance_requests FOR ALL
  USING (has_hotel_access(hotel_id));

-- 13. Finance (Expenses) RLS
DROP POLICY IF EXISTS "Accountants and admins can manage expenses" ON expenses;
CREATE POLICY "Accountants and admins can manage expenses"
  ON expenses FOR ALL
  USING (
    is_super_admin() OR
    get_user_role(hotel_id) IN ('hotel_admin', 'manager', 'accountant')
  );

-- 14. Notifications RLS
DROP POLICY IF EXISTS "Users can view notifications for their hotel" ON notifications;
CREATE POLICY "Users can view notifications for their hotel"
  ON notifications FOR SELECT
  USING (has_hotel_access(hotel_id));

DROP POLICY IF EXISTS "Users can mark own notifications as read" ON notifications;
CREATE POLICY "Users can mark own notifications as read"
  ON notifications FOR UPDATE
  USING (has_hotel_access(hotel_id));

DROP POLICY IF EXISTS "Users can view staff notifications" ON staff_notifications;
CREATE POLICY "Users can view staff notifications"
  ON staff_notifications FOR ALL
  USING (has_hotel_access(hotel_id));

DROP POLICY IF EXISTS "Users can view notification logs" ON notification_logs;
CREATE POLICY "Users can view notification logs"
  ON notification_logs FOR SELECT
  USING (has_hotel_access(hotel_id));

-- 15. Audit Logs RLS (Read only for Admins & Managers)
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;
CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (
    is_super_admin() OR
    get_user_role(hotel_id) IN ('hotel_admin', 'manager')
  );

-- Note: In Supabase, if auth is disabled (demo/testing mode or local service_role),
-- service_role bypasses RLS automatically.


-- ----------------------------------------------------------------------------
-- SECTION: 10_seed_hotel_spark_data.sql
-- ----------------------------------------------------------------------------

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


-- ----------------------------------------------------------------------------
-- SECTION: 11_storage_setup.sql
-- ----------------------------------------------------------------------------

-- ============================================================================
-- HOTEL SPARK / HAIP – SUPABASE SQL MIGRATION
-- 11_storage_setup.sql: Supabase Storage Buckets & Access Policies
-- ============================================================================

-- Create Storage Buckets if storage schema exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    -- 1. Public bucket for hotel logos, banners, branding assets
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'hotel-assets',
      'hotel-assets',
      true,
      10485760, -- 10MB
      ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
    )
    ON CONFLICT (id) DO UPDATE SET
      public = true,
      file_size_limit = 10485760;

    -- 2. Public bucket for room photos & gallery
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'room-photos',
      'room-photos',
      true,
      15728640, -- 15MB
      ARRAY['image/jpeg', 'image/png', 'image/webp']
    )
    ON CONFLICT (id) DO UPDATE SET
      public = true,
      file_size_limit = 15728640;

    -- 3. Private bucket for Guest Documents (Government IDs, Passports, Aadhaar)
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'guest-documents',
      'guest-documents',
      false, -- Private bucket
      20971520, -- 20MB
      ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    )
    ON CONFLICT (id) DO UPDATE SET
      public = false,
      file_size_limit = 20971520;
  END IF;
END $$;

-- Storage Policies (Active when Supabase storage is initialized)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'objects') THEN

    -- hotel-assets public read
    DROP POLICY IF EXISTS "Public can view hotel assets" ON storage.objects;
    CREATE POLICY "Public can view hotel assets"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'hotel-assets');

    -- room-photos public read
    DROP POLICY IF EXISTS "Public can view room photos" ON storage.objects;
    CREATE POLICY "Public can view room photos"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'room-photos');

    -- staff can upload to hotel-assets and room-photos
    DROP POLICY IF EXISTS "Staff can upload hotel media" ON storage.objects;
    CREATE POLICY "Staff can upload hotel media"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id IN ('hotel-assets', 'room-photos')
        AND auth.role() = 'authenticated'
      );

    -- guest-documents: only authenticated staff can view and upload
    DROP POLICY IF EXISTS "Staff can view guest documents" ON storage.objects;
    CREATE POLICY "Staff can view guest documents"
      ON storage.objects FOR SELECT
      USING (
        bucket_id = 'guest-documents'
        AND auth.role() = 'authenticated'
      );

    DROP POLICY IF EXISTS "Staff can upload guest documents" ON storage.objects;
    CREATE POLICY "Staff can upload guest documents"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'guest-documents'
        AND auth.role() = 'authenticated'
      );

  END IF;
END $$;

