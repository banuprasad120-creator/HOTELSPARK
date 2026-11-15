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

CREATE TRIGGER trg_hotels_updated_at
  BEFORE UPDATE ON hotels
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
CREATE TRIGGER trg_sync_hotel_to_property
  AFTER INSERT OR UPDATE ON hotels
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

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
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

CREATE TRIGGER trg_hotel_members_updated_at
  BEFORE UPDATE ON hotel_members
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

CREATE TRIGGER trg_hotel_settings_updated_at
  BEFORE UPDATE ON hotel_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indexes for Core
CREATE INDEX IF NOT EXISTS idx_hotels_code ON hotels(code);
CREATE INDEX IF NOT EXISTS idx_profiles_hotel ON profiles(hotel_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_hotel_members_hotel ON hotel_members(hotel_id);
CREATE INDEX IF NOT EXISTS idx_hotel_members_user ON hotel_members(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_hotel ON user_roles(user_id, hotel_id);
