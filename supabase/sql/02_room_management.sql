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

CREATE TRIGGER trg_room_types_updated_at
  BEFORE UPDATE ON room_types
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

CREATE TRIGGER trg_rooms_updated_at
  BEFORE UPDATE ON rooms
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

CREATE TRIGGER trg_room_images_updated_at
  BEFORE UPDATE ON room_images
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

CREATE TRIGGER trg_room_blocks_updated_at
  BEFORE UPDATE ON room_blocks
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
