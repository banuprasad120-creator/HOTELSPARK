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

CREATE TRIGGER trg_guests_updated_at
  BEFORE UPDATE ON guests
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

CREATE TRIGGER trg_guest_documents_updated_at
  BEFORE UPDATE ON guest_documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indexes for Guest Management
CREATE INDEX IF NOT EXISTS idx_guests_email ON guests(email);
CREATE INDEX IF NOT EXISTS idx_guests_phone ON guests(phone);
CREATE INDEX IF NOT EXISTS idx_guests_hotel ON guests(hotel_id);
CREATE INDEX IF NOT EXISTS idx_guest_documents_guest ON guest_documents(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_documents_hotel ON guest_documents(hotel_id);
