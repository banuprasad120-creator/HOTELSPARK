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

CREATE TRIGGER trg_housekeeping_tasks_updated_at
  BEFORE UPDATE ON housekeeping_tasks
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

CREATE TRIGGER trg_maintenance_requests_updated_at
  BEFORE UPDATE ON maintenance_requests
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
CREATE TRIGGER trg_after_check_in
  AFTER INSERT ON check_ins
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
CREATE TRIGGER trg_after_check_out
  AFTER INSERT ON check_outs
  FOR EACH ROW EXECUTE FUNCTION on_check_out_created();

-- Indexes for Front Desk & Ops
CREATE INDEX IF NOT EXISTS idx_check_ins_hotel_res ON check_ins(hotel_id, reservation_id);
CREATE INDEX IF NOT EXISTS idx_check_outs_hotel_res ON check_outs(hotel_id, reservation_id);
CREATE INDEX IF NOT EXISTS idx_hk_tasks_hotel_status ON housekeeping_tasks(hotel_id, status);
CREATE INDEX IF NOT EXISTS idx_hk_tasks_room ON housekeeping_tasks(room_id);
CREATE INDEX IF NOT EXISTS idx_maint_hotel_status ON maintenance_requests(hotel_id, status);
