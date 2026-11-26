-- ============================================================================
-- HOTEL SPARK – COMPLETE SUPABASE POSTGRESQL BACKEND AUDIT & REPAIR MIGRATION
-- Idempotent migration repairing schema, FKs, indexes, exclusion constraints,
-- triggers, RLS policies, storage policies, and atomic PMS RPCs.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Pin safe helper trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 1. REPAIR & COMPLETE CORE, STAFF, ATTENDANCE, HANDOVER, PRICING & BILLING
-- ============================================================================

-- Ensure booking_source allows walk_in and lowercase values consistently
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reservation_status') THEN
    BEGIN
      ALTER TYPE reservation_status ADD VALUE IF NOT EXISTS 'pending';
      ALTER TYPE reservation_status ADD VALUE IF NOT EXISTS 'confirmed';
      ALTER TYPE reservation_status ADD VALUE IF NOT EXISTS 'assigned';
      ALTER TYPE reservation_status ADD VALUE IF NOT EXISTS 'checked_in';
      ALTER TYPE reservation_status ADD VALUE IF NOT EXISTS 'stayover';
      ALTER TYPE reservation_status ADD VALUE IF NOT EXISTS 'due_out';
      ALTER TYPE reservation_status ADD VALUE IF NOT EXISTS 'checked_out';
      ALTER TYPE reservation_status ADD VALUE IF NOT EXISTS 'no_show';
      ALTER TYPE reservation_status ADD VALUE IF NOT EXISTS 'cancelled';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END $$;

-- Ensure core hotel and properties baseline tables exist if starting on a clean database
CREATE TABLE IF NOT EXISTS hotels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  code varchar(50) UNIQUE NOT NULL,
  currency varchar(10) NOT NULL DEFAULT 'INR',
  timezone varchar(100) NOT NULL DEFAULT 'Asia/Kolkata',
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  code varchar(50),
  address varchar(500),
  city varchar(100),
  state varchar(100),
  country varchar(100) DEFAULT 'India',
  postal_code varchar(20),
  phone varchar(50),
  email varchar(255),
  star_rating numeric(2, 1),
  check_in_time varchar(20) DEFAULT '12:00 PM',
  check_out_time varchar(20) DEFAULT '11:00 AM',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hotel_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  booking_mode varchar(50) DEFAULT 'request',
  auto_confirm boolean DEFAULT false,
  require_deposit boolean DEFAULT false,
  deposit_percentage numeric(5, 2) DEFAULT 0,
  cancellation_policy text DEFAULT 'Free cancellation up to 24 hours before check-in. First night charged thereafter.',
  settings jsonb DEFAULT '{}'::jsonb,
  direct_booking_requires_approval boolean DEFAULT true,
  booking_notification_sound boolean DEFAULT true,
  whatsapp_enabled boolean DEFAULT true,
  upi_qr_string text DEFAULT 'upi://pay?pa=sparkhotel@upi&pn=Hotel%20Spark&mc=7011&cu=INR',
  upi_payee_name text DEFAULT 'Hotel Spark',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS room_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  code varchar(50) NOT NULL,
  description text,
  max_occupancy integer NOT NULL DEFAULT 2,
  bed_type varchar(100),
  amenities text[] DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rate_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  room_type_id uuid REFERENCES room_types(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  code varchar(50) NOT NULL,
  base_rate numeric(12, 2) NOT NULL DEFAULT 0,
  currency varchar(10) NOT NULL DEFAULT 'INR',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  code varchar(50),
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  employee_id varchar(50),
  name varchar(255) NOT NULL,
  email varchar(255),
  mobile varchar(50),
  role varchar(100),
  designation varchar(100),
  salary numeric(12, 2) DEFAULT 0,
  status varchar(50) DEFAULT 'active',
  joining_date date DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Hotel settings extensions for GST, Tariffs, Reports & Invoicing
ALTER TABLE hotel_settings ADD COLUMN IF NOT EXISTS gstin varchar(30) DEFAULT '36MOTPS2621J2Z3';
ALTER TABLE hotel_settings ADD COLUMN IF NOT EXISTS hsn_sac varchar(20) DEFAULT '996311';
ALTER TABLE hotel_settings ADD COLUMN IF NOT EXISTS gst_percentage numeric(5, 2) NOT NULL DEFAULT 5.00;
ALTER TABLE hotel_settings ADD COLUMN IF NOT EXISTS tax_inclusive boolean NOT NULL DEFAULT true;
ALTER TABLE hotel_settings ADD COLUMN IF NOT EXISTS extra_person_charge numeric(10, 2) NOT NULL DEFAULT 399.00;
ALTER TABLE hotel_settings ADD COLUMN IF NOT EXISTS child_charge numeric(10, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE hotel_settings ADD COLUMN IF NOT EXISTS invoice_header_name text DEFAULT 'HOTEL SPARK Karimnagar';
ALTER TABLE hotel_settings ADD COLUMN IF NOT EXISTS invoice_address text DEFAULT 'BLD NO - 2-6-169/1, Market Road Karimnagar';
ALTER TABLE hotel_settings ADD COLUMN IF NOT EXISTS report_favorites jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Rate plans: store Single & Double occupancy pricing + tax config in DB
ALTER TABLE rate_plans ADD COLUMN IF NOT EXISTS single_occupancy_rate numeric(12, 2);
ALTER TABLE rate_plans ADD COLUMN IF NOT EXISTS double_occupancy_rate numeric(12, 2);
ALTER TABLE rate_plans ADD COLUMN IF NOT EXISTS extra_person_charge numeric(10, 2) NOT NULL DEFAULT 399.00;
ALTER TABLE rate_plans ADD COLUMN IF NOT EXISTS gst_percentage numeric(5, 2) NOT NULL DEFAULT 5.00;
ALTER TABLE rate_plans ADD COLUMN IF NOT EXISTS tax_inclusive boolean NOT NULL DEFAULT true;

-- Backfill single/double occupancy rates cleanly where missing
UPDATE rate_plans
SET
  single_occupancy_rate = COALESCE(single_occupancy_rate, CASE WHEN code = 'BAR-DLX' THEN 1799 WHEN code = 'BAR-EXE' THEN 2199 ELSE base_rate END),
  double_occupancy_rate = COALESCE(double_occupancy_rate, CASE WHEN code = 'BAR-BGT' THEN NULL ELSE base_rate END)
WHERE single_occupancy_rate IS NULL AND double_occupancy_rate IS NULL;

-- Departments FKs to hotels/properties
ALTER TABLE departments ADD COLUMN IF NOT EXISTS property_id uuid;
UPDATE departments SET property_id = hotel_id WHERE property_id IS NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_departments_hotel') THEN
    ALTER TABLE departments ADD CONSTRAINT fk_departments_hotel FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_departments_property') THEN
    ALTER TABLE departments ADD CONSTRAINT fk_departments_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Employees: link auth_user_id, shift, property_id, last_login_at
ALTER TABLE employees ADD COLUMN IF NOT EXISTS property_id uuid;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS auth_user_id uuid;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS shift varchar(20) NOT NULL DEFAULT 'morning';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS last_login_at timestamptz;
UPDATE employees SET property_id = hotel_id WHERE property_id IS NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_employees_shift') THEN
    ALTER TABLE employees ADD CONSTRAINT chk_employees_shift CHECK (shift IN ('morning', 'evening', 'night', 'general'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_employees_hotel') THEN
    ALTER TABLE employees ADD CONSTRAINT fk_employees_hotel FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_employees_property') THEN
    ALTER TABLE employees ADD CONSTRAINT fk_employees_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE;
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_employees_updated_at ON employees;
CREATE TRIGGER trg_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_departments_updated_at ON departments;
CREATE TRIGGER trg_departments_updated_at
  BEFORE UPDATE ON departments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Staff Attendance table (replaces localStorage hotel_spark_daily_attendance)
CREATE TABLE IF NOT EXISTS staff_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL DEFAULT 'a0000001-0000-4000-a000-000000000001'::uuid REFERENCES hotels(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  attendance_date date NOT NULL DEFAULT CURRENT_DATE,
  shift varchar(20) NOT NULL DEFAULT 'morning' CHECK (shift IN ('morning', 'evening', 'night', 'general')),
  clock_in_at timestamptz,
  clock_out_at timestamptz,
  working_hours numeric(5, 2) NOT NULL DEFAULT 0.00 CHECK (working_hours >= 0),
  status varchar(20) NOT NULL DEFAULT 'on_duty' CHECK (status IN ('on_duty', 'completed', 'absent', 'on_leave', 'present')),
  notes text,
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_staff_attendance_emp_date UNIQUE (hotel_id, employee_id, attendance_date)
);

DROP TRIGGER IF EXISTS trg_staff_attendance_updated_at ON staff_attendance;
CREATE TRIGGER trg_staff_attendance_updated_at
  BEFORE UPDATE ON staff_attendance
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Shift Handover Notes table (replaces localStorage spark_manager_notes & hotel_spark_handover_notes)
CREATE TABLE IF NOT EXISTS shift_handover_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL DEFAULT 'a0000001-0000-4000-a000-000000000001'::uuid REFERENCES hotels(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  shift varchar(20) NOT NULL DEFAULT 'morning' CHECK (shift IN ('morning', 'evening', 'night', 'general')),
  department varchar(50) NOT NULL DEFAULT 'management',
  author_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  author_user_id uuid,
  author_name text NOT NULL,
  note text NOT NULL,
  acknowledged boolean NOT NULL DEFAULT false,
  acknowledged_by uuid,
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_shift_handover_notes_updated_at ON shift_handover_notes;
CREATE TRIGGER trg_shift_handover_notes_updated_at
  BEFORE UPDATE ON shift_handover_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Reservations enhancements & validity checks
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS booking_source varchar(30) DEFAULT 'walk_in';
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS base_amount numeric(12, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS tax_amount numeric(12, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS extra_charges numeric(12, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS discount_amount numeric(12, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS occupancy_type varchar(20) NOT NULL DEFAULT 'double';
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS notes text;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_reservations_dates') THEN
    ALTER TABLE reservations ADD CONSTRAINT chk_reservations_dates CHECK (departure_date > arrival_date);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_booking_requests_dates') THEN
    ALTER TABLE booking_requests ADD CONSTRAINT chk_booking_requests_dates CHECK (departure_date > arrival_date);
  END IF;
END $$;

ALTER TABLE booking_requests ADD COLUMN IF NOT EXISTS occupancy_type varchar(20) DEFAULT 'double';

-- Clean up orphan pointers in booking_requests where accepted_reservation_id / accepted_folio_id no longer exist
UPDATE booking_requests br
SET accepted_reservation_id = NULL
WHERE accepted_reservation_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM reservations r WHERE r.id = br.accepted_reservation_id);

UPDATE booking_requests br
SET accepted_folio_id = NULL
WHERE accepted_folio_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM folios f WHERE f.id = br.accepted_folio_id);

-- Additional Charges & Folio Charges synchronization columns
ALTER TABLE additional_charges ADD COLUMN IF NOT EXISTS property_id uuid;
ALTER TABLE additional_charges ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1;
ALTER TABLE additional_charges ADD COLUMN IF NOT EXISTS unit_price numeric(12, 2);
ALTER TABLE additional_charges ADD COLUMN IF NOT EXISTS tax_rate numeric(5, 2) NOT NULL DEFAULT 5.00;
ALTER TABLE additional_charges ADD COLUMN IF NOT EXISTS hsn_sac varchar(20) DEFAULT '996311';
ALTER TABLE additional_charges ADD COLUMN IF NOT EXISTS service_date date NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE additional_charges ADD COLUMN IF NOT EXISTS voided_at timestamptz;
ALTER TABLE additional_charges ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
UPDATE additional_charges SET property_id = hotel_id WHERE property_id IS NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_additional_charges_hotel') THEN
    ALTER TABLE additional_charges ADD CONSTRAINT fk_additional_charges_hotel FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_additional_charges_property') THEN
    ALTER TABLE additional_charges ADD CONSTRAINT fk_additional_charges_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE;
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_additional_charges_updated_at ON additional_charges;
CREATE TRIGGER trg_additional_charges_updated_at
  BEFORE UPDATE ON additional_charges
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Invoices GST & Hotel Spark breakdown columns
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cgst_amount numeric(12, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sgst_amount numeric(12, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS igst_amount numeric(12, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS gst_rate numeric(5, 2) NOT NULL DEFAULT 5.00;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_mode varchar(20) NOT NULL DEFAULT 'inclusive';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_amount numeric(12, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS extra_charges numeric(12, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS guest_gstin varchar(30);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS guest_name varchar(255);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS guest_address text;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS room_number varchar(20);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS hsn_sac varchar(20) DEFAULT '996311';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cashier_name varchar(255);

-- Payments receipt and safety check
ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_number varchar(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS recorded_by uuid;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_payments_non_negative') THEN
    ALTER TABLE payments ADD CONSTRAINT chk_payments_non_negative CHECK (amount >= 0);
  END IF;
END $$;

-- ============================================================================
-- 2. DATABASE-LEVEL DOUBLE-BOOKING PREVENTION (EXCLUSION CONSTRAINTS)
-- ============================================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'excl_no_double_booking_room') THEN
    ALTER TABLE reservations
      ADD CONSTRAINT excl_no_double_booking_room
      EXCLUDE USING gist (
        room_id WITH =,
        daterange(arrival_date, departure_date, '[)') WITH &&
      )
      WHERE (room_id IS NOT NULL AND status IN ('pending', 'confirmed', 'assigned', 'checked_in', 'stayover', 'due_out'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'excl_no_double_booking_res_room') THEN
    ALTER TABLE reservation_rooms
      ADD CONSTRAINT excl_no_double_booking_res_room
      EXCLUDE USING gist (
        room_id WITH =,
        daterange(arrival_date, departure_date, '[)') WITH &&
      )
      WHERE (room_id IS NOT NULL AND status IN ('assigned', 'checked_in', 'stayover'));
  END IF;
END $$;

-- ============================================================================
-- 3. INDEXES FOR FOREIGN KEYS & HIGH-FREQUENCY PMS QUERIES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_employees_auth_user ON employees(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_employees_hotel_status ON employees(hotel_id, status);
CREATE INDEX IF NOT EXISTS idx_staff_att_hotel_date ON staff_attendance(hotel_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_staff_att_employee ON staff_attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_handover_hotel_created ON shift_handover_notes(hotel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_additional_charges_folio ON additional_charges(folio_id) WHERE voided_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_additional_charges_hotel ON additional_charges(hotel_id);
CREATE INDEX IF NOT EXISTS idx_payments_reservation ON payments(reservation_id);
CREATE INDEX IF NOT EXISTS idx_payments_guest ON payments(guest_id);
CREATE INDEX IF NOT EXISTS idx_invoices_folio ON invoices(folio_id);
CREATE INDEX IF NOT EXISTS idx_invoices_reservation ON invoices(reservation_id);
CREATE INDEX IF NOT EXISTS idx_rate_plans_room_type ON rate_plans(hotel_id, room_type_id, is_active);
CREATE INDEX IF NOT EXISTS idx_room_types_hotel_active ON room_types(hotel_id, is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_rooms_hotel_active_num ON rooms(hotel_id, is_active, number);
CREATE INDEX IF NOT EXISTS idx_notifications_hotel_unread ON notifications(hotel_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_notifications_hotel_unread ON staff_notifications(hotel_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_hotel_occurred ON audit_logs(hotel_id, occurred_at DESC);

-- ============================================================================
-- 4. TRIGGERS FOR FOLIO BALANCE INTEGRITY & AUTH SYNC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.recalculate_folio_totals(p_folio_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_extra numeric(12, 2);
  v_res_total numeric(12, 2);
  v_paid numeric(12, 2);
  v_refunded numeric(12, 2);
  v_total_charges numeric(12, 2);
  v_net_payments numeric(12, 2);
  v_balance numeric(12, 2);
  v_res_id uuid;
BEGIN
  IF p_folio_id IS NULL THEN
    RETURN;
  END IF;

  SELECT reservation_id INTO v_res_id FROM folios WHERE id = p_folio_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT COALESCE(total_amount, 0) INTO v_res_total
  FROM reservations WHERE id = v_res_id;

  SELECT COALESCE(SUM(amount + tax_amount), 0) INTO v_extra
  FROM additional_charges
  WHERE folio_id = p_folio_id AND voided_at IS NULL;

  SELECT COALESCE(SUM(amount), 0) INTO v_paid
  FROM payments
  WHERE folio_id = p_folio_id
    AND status IN ('paid', 'captured', 'settled');

  SELECT COALESCE(SUM(r.amount), 0) INTO v_refunded
  FROM refunds r
  JOIN payments p ON p.id = r.payment_id
  WHERE p.folio_id = p_folio_id AND r.status = 'completed';

  -- If folio has line-item additional_charges matching total, use sum; otherwise preserve base reservation + extras cleanly
  v_total_charges := GREATEST(COALESCE(v_res_total, 0), 0) + v_extra;
  v_net_payments := GREATEST(0, v_paid - v_refunded);
  v_balance := GREATEST(0, v_total_charges - v_net_payments);

  UPDATE folios
  SET total_charges = v_total_charges,
      total_payments = v_net_payments,
      balance = v_balance,
      status = CASE WHEN v_balance <= 0 AND total_charges > 0 THEN 'settled' ELSE CASE WHEN status = 'closed' THEN 'closed' ELSE 'open' END END,
      settled_at = CASE WHEN v_balance <= 0 AND total_charges > 0 THEN COALESCE(settled_at, now()) ELSE NULL END,
      updated_at = now()
  WHERE id = p_folio_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_sync_folio_from_child()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_folio_id uuid;
BEGIN
  v_folio_id := COALESCE(NEW.folio_id, OLD.folio_id);
  IF v_folio_id IS NOT NULL THEN
    PERFORM public.recalculate_folio_totals(v_folio_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_charges_sync_folio ON additional_charges;
CREATE TRIGGER trg_charges_sync_folio
  AFTER INSERT OR UPDATE OR DELETE ON additional_charges
  FOR EACH ROW EXECUTE FUNCTION public.trg_sync_folio_from_child();

DROP TRIGGER IF EXISTS trg_payments_sync_folio ON payments;
CREATE TRIGGER trg_payments_sync_folio
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION public.trg_sync_folio_from_child();

-- Missing updated_at triggers on existing tables
DROP TRIGGER IF EXISTS trg_rate_plans_updated_at ON rate_plans;
CREATE TRIGGER trg_rate_plans_updated_at BEFORE UPDATE ON rate_plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_media_updated_at ON media;
CREATE TRIGGER trg_media_updated_at BEFORE UPDATE ON media FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_service_requests_updated_at ON service_requests;
CREATE TRIGGER trg_service_requests_updated_at BEFORE UPDATE ON service_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_cash_drawers_updated_at ON cash_drawers;
CREATE TRIGGER trg_cash_drawers_updated_at BEFORE UPDATE ON cash_drawers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_allotment_blocks_updated_at ON allotment_blocks;
CREATE TRIGGER trg_allotment_blocks_updated_at BEFORE UPDATE ON allotment_blocks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 5. SECURITY HELPERS & AUTH ROLE RESOLUTION (NEVER USE user_metadata IN RLS)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE((auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin'), false)
    OR EXISTS (
      SELECT 1 FROM public.hotel_members hm
      WHERE hm.user_id = auth.uid()
        AND hm.role = 'super_admin'
        AND hm.status = 'active'
    );
$$;

CREATE OR REPLACE FUNCTION public.has_hotel_access(check_hotel_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.is_super_admin()
    OR (
      (auth.jwt() -> 'app_metadata' ->> 'hotel_id')::uuid = check_hotel_id
      AND COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') <> ''
    )
    OR EXISTS (
      SELECT 1 FROM public.hotel_members hm
      WHERE hm.user_id = auth.uid()
        AND (hm.hotel_id = check_hotel_id OR hm.property_id = check_hotel_id)
        AND hm.status = 'active'
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(check_hotel_id uuid)
RETURNS user_role_enum
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role user_role_enum;
  v_claim_role text;
BEGIN
  IF public.is_super_admin() THEN
    RETURN 'super_admin'::user_role_enum;
  END IF;

  SELECT role INTO v_role
  FROM public.hotel_members
  WHERE user_id = auth.uid()
    AND (hotel_id = check_hotel_id OR property_id = check_hotel_id)
    AND status = 'active'
  LIMIT 1;

  IF v_role IS NOT NULL THEN
    RETURN v_role;
  END IF;

  v_claim_role := auth.jwt() -> 'app_metadata' ->> 'role';
  IF v_claim_role = 'admin' THEN RETURN 'hotel_admin'::user_role_enum;
  ELSIF v_claim_role = 'hotel_admin' THEN RETURN 'hotel_admin'::user_role_enum;
  ELSIF v_claim_role = 'manager' THEN RETURN 'manager'::user_role_enum;
  ELSIF v_claim_role = 'front_office' OR v_claim_role = 'receptionist' THEN RETURN 'receptionist'::user_role_enum;
  ELSIF v_claim_role = 'accountant' THEN RETURN 'accountant'::user_role_enum;
  ELSIF v_claim_role = 'housekeeping' THEN RETURN 'housekeeping'::user_role_enum;
  END IF;

  RETURN NULL;
END;
$$;

-- Link auth_user_id on employees and ensure active hotel_members rows for existing auth users
DO $$
DECLARE
  v_default_hotel uuid := 'a0000001-0000-4000-a000-000000000001'::uuid;
  v_rec record;
  v_mapped_role user_role_enum;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    FOR v_rec IN
      SELECT id, email, raw_app_meta_data, raw_user_meta_data
      FROM auth.users
    LOOP
      v_mapped_role := CASE
        WHEN lower(v_rec.email) LIKE 'admin%' OR (v_rec.raw_app_meta_data->>'role') IN ('admin','hotel_admin','super_admin') THEN 'hotel_admin'::user_role_enum
        WHEN lower(v_rec.email) LIKE 'manager%' OR (v_rec.raw_app_meta_data->>'role') = 'manager' THEN 'manager'::user_role_enum
        ELSE 'receptionist'::user_role_enum
      END;

      INSERT INTO public.profiles (id, hotel_id, property_id, email, full_name, role, status)
      VALUES (
        v_rec.id,
        v_default_hotel,
        v_default_hotel,
        lower(v_rec.email),
        COALESCE(v_rec.raw_user_meta_data->>'name', split_part(v_rec.email, '@', 1)),
        v_mapped_role,
        'active'
      )
      ON CONFLICT (id) DO UPDATE SET
        hotel_id = COALESCE(profiles.hotel_id, EXCLUDED.hotel_id),
        property_id = COALESCE(profiles.property_id, EXCLUDED.property_id),
        role = EXCLUDED.role,
        status = 'active';

      INSERT INTO public.hotel_members (hotel_id, property_id, user_id, role, status)
      VALUES (v_default_hotel, v_default_hotel, v_rec.id, v_mapped_role, 'active')
      ON CONFLICT (hotel_id, user_id) DO UPDATE SET role = EXCLUDED.role, status = 'active';

      UPDATE public.employees
      SET auth_user_id = v_rec.id
      WHERE lower(email) = lower(v_rec.email) AND auth_user_id IS NULL;
    END LOOP;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ============================================================================
-- 6. ATOMIC PUBLIC & STAFF RPC WORKFLOWS
-- ============================================================================

-- A. Public hotel catalog for booking website (NO hardcoded frontend prices or rooms)
CREATE OR REPLACE FUNCTION public.get_public_hotel_catalog(
  p_hotel_id uuid DEFAULT 'a0000001-0000-4000-a000-000000000001'::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_hotel jsonb;
  v_settings jsonb;
  v_room_types jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', p.id,
    'name', p.name,
    'code', p.code,
    'description', p.description,
    'addressLine1', p.address_line_1,
    'city', p.city,
    'stateProvince', p.state_province,
    'postalCode', p.postal_code,
    'countryCode', p.country_code,
    'timezone', p.timezone,
    'currencyCode', p.currency_code,
    'phone', p.phone,
    'email', p.email,
    'checkInTime', p.check_in_time,
    'checkOutTime', p.check_out_time,
    'settings', jsonb_build_object(
      'upi_id', COALESCE(p.settings->>'upi_id', ''),
      'upi_merchant_name', COALESCE(p.settings->>'upi_merchant_name', p.name)
    )
  )
  INTO v_hotel
  FROM public.properties p
  WHERE p.id = p_hotel_id AND p.is_active = true
  LIMIT 1;

  IF v_hotel IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'bookingMode', hs.booking_mode,
    'autoConfirm', hs.auto_confirm,
    'requireDeposit', hs.require_deposit,
    'depositPercentage', hs.deposit_percentage,
    'cancellationPolicy', hs.cancellation_policy,
    'gstPercentage', hs.gst_percentage,
    'taxInclusive', hs.tax_inclusive,
    'extraPersonCharge', hs.extra_person_charge,
    'upiQrString', hs.upi_qr_string,
    'upiPayeeName', hs.upi_payee_name
  )
  INTO v_settings
  FROM public.hotel_settings hs
  WHERE hs.hotel_id = p_hotel_id
  LIMIT 1;

  SELECT COALESCE(jsonb_agg(rt_obj ORDER BY (rt_obj->>'sortOrder')::int ASC), '[]'::jsonb)
  INTO v_room_types
  FROM (
    SELECT jsonb_build_object(
      'id', rt.id,
      'name', rt.name,
      'code', rt.code,
      'description', rt.description,
      'maxOccupancy', rt.max_occupancy,
      'defaultOccupancy', rt.default_occupancy,
      'bedType', rt.bed_type,
      'bedCount', rt.bed_count,
      'squareMeters', rt.square_meters,
      'amenities', rt.amenities,
      'sortOrder', rt.sort_order,
      'roomCount', (SELECT count(*) FROM public.rooms r WHERE r.room_type_id = rt.id AND r.is_active = true),
      'images', COALESCE((
        SELECT jsonb_agg(img.url ORDER BY img.is_primary DESC, img.sort_order ASC)
        FROM public.room_images img
        WHERE img.room_type_id = rt.id
      ), '[]'::jsonb),
      'ratePlans', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', rp.id,
          'name', rp.name,
          'code', rp.code,
          'description', rp.description,
          'baseRate', rp.base_rate,
          'singleOccupancyRate', rp.single_occupancy_rate,
          'doubleOccupancyRate', rp.double_occupancy_rate,
          'extraPersonCharge', rp.extra_person_charge,
          'gstPercentage', rp.gst_percentage,
          'taxInclusive', rp.tax_inclusive,
          'currencyCode', rp.currency_code
        ))
        FROM public.rate_plans rp
        WHERE rp.room_type_id = rt.id AND rp.is_active = true
      ), '[]'::jsonb)
    ) AS rt_obj
    FROM public.room_types rt
    WHERE (rt.hotel_id = p_hotel_id OR rt.property_id = p_hotel_id)
      AND rt.is_active = true
      AND EXISTS (SELECT 1 FROM public.rooms r WHERE r.room_type_id = rt.id AND r.is_active = true)
  ) sub;

  RETURN jsonb_build_object(
    'hotel', v_hotel,
    'settings', COALESCE(v_settings, '{}'::jsonb),
    'roomTypes', v_room_types
  );
END;
$$;

-- B. Guest booking lookup without opening PII tables to anon SELECT
CREATE OR REPLACE FUNCTION public.get_public_booking_status(
  p_reference text,
  p_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ref text := upper(trim(coalesce(p_reference, '')));
  v_email text := lower(trim(coalesce(p_email, '')));
  v_res record;
  v_req record;
BEGIN
  IF v_ref = '' OR v_email = '' THEN
    RAISE EXCEPTION 'Booking reference and email are required.';
  END IF;

  SELECT
    b.confirmation_number,
    r.id AS reservation_id,
    r.status::text AS status,
    r.arrival_date,
    r.departure_date,
    r.nights,
    r.adults,
    r.children,
    r.total_amount,
    r.currency_code,
    rt.name AS room_type_name,
    rm.number AS room_number,
    g.first_name,
    g.last_name
  INTO v_res
  FROM public.bookings b
  JOIN public.reservations r ON r.booking_id = b.id
  JOIN public.guests g ON g.id = r.guest_id
  JOIN public.room_types rt ON rt.id = r.room_type_id
  LEFT JOIN public.rooms rm ON rm.id = r.room_id
  WHERE upper(b.confirmation_number) = v_ref
    AND lower(coalesce(g.email, '')) = v_email
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'type', 'reservation',
      'confirmationNumber', v_res.confirmation_number,
      'status', v_res.status,
      'arrivalDate', v_res.arrival_date,
      'departureDate', v_res.departure_date,
      'nights', v_res.nights,
      'adults', v_res.adults,
      'children', v_res.children,
      'totalAmount', v_res.total_amount,
      'currencyCode', v_res.currency_code,
      'roomTypeName', v_res.room_type_name,
      'roomNumber', v_res.room_number,
      'guestName', trim(v_res.first_name || ' ' || v_res.last_name)
    );
  END IF;

  SELECT
    br.submission_idempotency_key AS reference,
    br.status,
    br.arrival_date,
    br.departure_date,
    br.adults,
    br.children,
    br.submitted_total,
    br.accepted_total,
    br.currency_code,
    br.denial_reason,
    rt.name AS room_type_name,
    br.guest_first_name,
    br.guest_last_name
  INTO v_req
  FROM public.booking_requests br
  JOIN public.room_types rt ON rt.id = br.room_type_id
  WHERE upper(br.submission_idempotency_key) = v_ref
    AND lower(br.guest_email) = v_email
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'type', 'request',
      'confirmationNumber', v_req.reference,
      'status', v_req.status,
      'arrivalDate', v_req.arrival_date,
      'departureDate', v_req.departure_date,
      'adults', v_req.adults,
      'children', v_req.children,
      'totalAmount', COALESCE(v_req.accepted_total, v_req.submitted_total),
      'currencyCode', v_req.currency_code,
      'roomTypeName', v_req.room_type_name,
      'denialReason', v_req.denial_reason,
      'guestName', trim(v_req.guest_first_name || ' ' || v_req.guest_last_name)
    );
  END IF;

  RETURN NULL;
END;
$$;

-- C. Harden revalidate_room_availability with pinned search_path
CREATE OR REPLACE FUNCTION public.revalidate_room_availability(
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
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id AS room_id,
    r.number AS room_number,
    r.floor AS room_floor,
    r.status AS room_status,
    (
      r.status NOT IN ('out_of_order', 'out_of_service')
      AND NOT EXISTS (
        SELECT 1
        FROM public.reservations res
        WHERE res.room_id = r.id
          AND (res.hotel_id = p_hotel_id OR res.property_id = p_hotel_id)
          AND res.status IN ('confirmed', 'assigned', 'checked_in', 'stayover', 'due_out')
          AND res.arrival_date < p_departure_date
          AND res.departure_date > p_arrival_date
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.room_blocks rb
        WHERE rb.room_id = r.id
          AND rb.status IN ('tentative', 'definite')
          AND rb.start_date < p_departure_date
          AND rb.end_date > p_arrival_date
      )
    ) AS is_available
  FROM public.rooms r
  WHERE (r.hotel_id = p_hotel_id OR r.property_id = p_hotel_id)
    AND r.room_type_id = p_room_type_id
    AND r.is_active = true
  ORDER BY is_available DESC, r.number ASC;
END;
$$;

-- D. Harden submit_website_booking_request (check availability + pinned search_path)
CREATE OR REPLACE FUNCTION public.submit_website_booking_request(
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
SET search_path = public, pg_temp
AS $$
DECLARE
  v_property_id uuid;
  v_key varchar(255);
  v_existing_id uuid;
  v_booking_request_id uuid;
  v_room_type_name varchar(100);
  v_rate_plan_id uuid;
  v_available_count integer;
BEGIN
  IF p_arrival_date >= p_departure_date THEN
    RAISE EXCEPTION 'Departure date must be after arrival date.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.hotels WHERE id = p_hotel_id AND is_active = true) THEN
    RAISE EXCEPTION 'Invalid or inactive hotel_id.';
  END IF;

  SELECT id INTO v_property_id FROM public.properties WHERE hotel_id = p_hotel_id LIMIT 1;
  v_property_id := COALESCE(v_property_id, p_hotel_id);

  SELECT name INTO v_room_type_name
  FROM public.room_types
  WHERE id = p_room_type_id
    AND (hotel_id = p_hotel_id OR property_id = p_hotel_id)
    AND is_active = true;
  IF v_room_type_name IS NULL THEN
    RAISE EXCEPTION 'Room type not found for this hotel.';
  END IF;

  SELECT COUNT(*) INTO v_available_count
  FROM public.revalidate_room_availability(p_hotel_id, p_room_type_id, p_arrival_date, p_departure_date)
  WHERE is_available = true;
  IF v_available_count < 1 THEN
    RAISE EXCEPTION 'No % rooms available for the selected dates (% to %).', v_room_type_name, p_arrival_date, p_departure_date;
  END IF;

  SELECT id INTO v_rate_plan_id
  FROM public.rate_plans
  WHERE (hotel_id = p_hotel_id OR property_id = p_hotel_id)
    AND (room_type_id = p_room_type_id OR room_type_id IS NULL)
    AND is_active = true
  ORDER BY (room_type_id = p_room_type_id) DESC
  LIMIT 1;

  IF p_idempotency_key IS NOT NULL AND TRIM(p_idempotency_key) <> '' THEN
    v_key := TRIM(p_idempotency_key);
    SELECT id INTO v_existing_id FROM public.booking_requests WHERE submission_idempotency_key = v_key LIMIT 1;
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
    v_key := 'SPARK-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 6));
  END IF;

  INSERT INTO public.booking_requests (
    hotel_id, property_id, submission_idempotency_key, submission_fingerprint,
    status, arrival_date, departure_date, room_type_id, rate_plan_id,
    adults, children, guest_first_name, guest_last_name, guest_email, guest_phone,
    special_requests, form_snapshot, submitted_quote_snapshot, submitted_total, currency_code
  ) VALUES (
    p_hotel_id, v_property_id, v_key, v_key,
    'pending', p_arrival_date, p_departure_date, p_room_type_id, v_rate_plan_id,
    GREATEST(1, p_adults), GREATEST(0, p_children),
    TRIM(p_guest_first_name), TRIM(p_guest_last_name), LOWER(TRIM(p_guest_email)), TRIM(p_guest_phone),
    p_special_requests, COALESCE(p_form_snapshot, '{}'::jsonb),
    jsonb_build_object(
      'grandTotal', p_submitted_total,
      'total', p_submitted_total,
      'room_type_id', p_room_type_id,
      'rate_plan_id', v_rate_plan_id,
      'currency', p_currency_code,
      'arrival', p_arrival_date,
      'departure', p_departure_date
    ),
    p_submitted_total, p_currency_code
  ) RETURNING id INTO v_booking_request_id;

  INSERT INTO public.notifications (
    hotel_id, property_id, type, severity, title, message, metadata
  ) VALUES (
    p_hotel_id, v_property_id, 'booking_request_created', 'info',
    'New Website Booking Request: ' || v_key,
    TRIM(p_guest_first_name) || ' ' || TRIM(p_guest_last_name) || ' requested ' || v_room_type_name || ' (' || p_arrival_date || ' to ' || p_departure_date || ').',
    jsonb_build_object('booking_request_id', v_booking_request_id, 'reference', v_key, 'total', p_submitted_total)
  );

  INSERT INTO public.staff_notifications (
    hotel_id, property_id, type, severity, title, message, source_event, source_entity_type, source_entity_id
  ) VALUES (
    p_hotel_id, v_property_id, 'booking_request_pending', 'info',
    'New Booking Request: ' || v_key,
    TRIM(p_guest_first_name) || ' ' || TRIM(p_guest_last_name) || ' submitted booking request for ' || v_room_type_name,
    'booking_request_created', 'booking_request', v_booking_request_id
  );

  INSERT INTO public.audit_logs (
    hotel_id, property_id, action, entity_type, entity_id, new_value, description
  ) VALUES (
    p_hotel_id, v_property_id, 'create', 'booking_request', v_booking_request_id,
    jsonb_build_object('reference', v_key, 'guest_email', LOWER(TRIM(p_guest_email)), 'total', p_submitted_total),
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

-- E. Harden approve_direct_booking & reject_direct_booking with caller authorization check
CREATE OR REPLACE FUNCTION public.approve_direct_booking(
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
SET search_path = public, pg_temp
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
  v_decider uuid := COALESCE(p_decided_by, auth.uid());
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.has_hotel_access(p_hotel_id) THEN
    RAISE EXCEPTION 'Unauthorized: hotel staff authentication required.';
  END IF;

  SELECT * INTO v_req
  FROM public.booking_requests
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

  SELECT number INTO v_room_number
  FROM public.rooms
  WHERE id = p_room_id AND (hotel_id = p_hotel_id OR property_id = p_hotel_id)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Selected room does not exist in this hotel.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.reservations r
    WHERE r.room_id = p_room_id
      AND (r.hotel_id = p_hotel_id OR r.property_id = p_hotel_id)
      AND r.status IN ('pending', 'confirmed', 'assigned', 'checked_in', 'stayover', 'due_out')
      AND r.arrival_date < v_req.departure_date
      AND r.departure_date > v_req.arrival_date
  ) INTO v_room_conflict;

  IF v_room_conflict THEN
    RAISE EXCEPTION 'Room % is already booked during dates (% to %).', v_room_number, v_req.arrival_date, v_req.departure_date;
  END IF;

  SELECT id INTO v_guest_id
  FROM public.guests
  WHERE (hotel_id = p_hotel_id OR property_id = p_hotel_id)
    AND LOWER(email) = LOWER(v_req.guest_email)
  LIMIT 1;

  IF v_guest_id IS NULL THEN
    INSERT INTO public.guests (hotel_id, property_id, first_name, last_name, email, phone)
    VALUES (p_hotel_id, v_property_id, v_req.guest_first_name, v_req.guest_last_name, LOWER(v_req.guest_email), v_req.guest_phone)
    RETURNING id INTO v_guest_id;
  END IF;

  v_rate_plan_id := v_req.rate_plan_id;
  IF v_rate_plan_id IS NULL THEN
    SELECT id INTO v_rate_plan_id FROM public.rate_plans WHERE (hotel_id = p_hotel_id OR property_id = p_hotel_id) LIMIT 1;
  END IF;

  v_confirmation_number := 'SPARK-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 5));
  v_folio_number := 'FOL-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4));

  INSERT INTO public.bookings (hotel_id, property_id, guest_id, confirmation_number, source, channel_code, notes)
  VALUES (p_hotel_id, v_property_id, v_guest_id, v_confirmation_number, 'direct', 'website', v_req.special_requests)
  RETURNING id INTO v_booking_id;

  INSERT INTO public.reservations (
    hotel_id, property_id, booking_id, guest_id, arrival_date, departure_date, nights,
    room_type_id, room_id, status, rate_plan_id, total_amount, base_amount, currency_code,
    adults, children, special_requests, booking_source
  ) VALUES (
    p_hotel_id, v_property_id, v_booking_id, v_guest_id, v_req.arrival_date, v_req.departure_date, v_nights,
    v_req.room_type_id, p_room_id, 'confirmed', v_rate_plan_id, v_final_total, v_final_total, v_req.currency_code,
    v_req.adults, v_req.children, v_req.special_requests, 'website'
  ) RETURNING id INTO v_reservation_id;

  INSERT INTO public.reservation_rooms (
    hotel_id, property_id, reservation_id, room_id, room_type_id, rate_plan_id,
    arrival_date, departure_date, room_rate, status
  ) VALUES (
    p_hotel_id, v_property_id, v_reservation_id, p_room_id, v_req.room_type_id, v_rate_plan_id,
    v_req.arrival_date, v_req.departure_date, (v_final_total / v_nights), 'assigned'
  );

  INSERT INTO public.folios (
    hotel_id, property_id, reservation_id, booking_id, guest_id, folio_number,
    type, status, total_charges, total_payments, balance, currency_code
  ) VALUES (
    p_hotel_id, v_property_id, v_reservation_id, v_booking_id, v_guest_id, v_folio_number,
    'guest', 'open', v_final_total, 0.00, v_final_total, v_req.currency_code
  ) RETURNING id INTO v_folio_id;

  UPDATE public.booking_requests
  SET status = 'accepted',
      accepted_reservation_id = v_reservation_id,
      accepted_folio_id = v_folio_id,
      accepted_total = v_final_total,
      custom_price_reason = p_custom_price_reason,
      decided_by = v_decider,
      decided_at = now(),
      updated_at = now()
  WHERE id = p_booking_request_id;

  INSERT INTO public.notifications (hotel_id, property_id, type, severity, title, message, metadata)
  VALUES (
    p_hotel_id, v_property_id, 'booking_request_approved', 'info',
    'Booking Confirmed: ' || v_confirmation_number,
    v_req.guest_first_name || ' ' || v_req.guest_last_name || ' assigned to Room ' || v_room_number,
    jsonb_build_object('booking_request_id', p_booking_request_id, 'reservation_id', v_reservation_id, 'room_number', v_room_number)
  );

  INSERT INTO public.audit_logs (hotel_id, property_id, user_id, action, entity_type, entity_id, new_value, description)
  VALUES (
    p_hotel_id, v_property_id, v_decider, 'approve', 'booking_request', p_booking_request_id,
    jsonb_build_object('confirmation_number', v_confirmation_number, 'room_number', v_room_number, 'total', v_final_total),
    'Staff approved website booking request and assigned Room ' || v_room_number
  );

  RETURN jsonb_build_object(
    'success', true,
    'booking_request_id', p_booking_request_id,
    'reservation_id', v_reservation_id,
    'folio_id', v_folio_id,
    'confirmation_number', v_confirmation_number,
    'room_number', v_room_number,
    'total_amount', v_final_total
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_direct_booking(
  p_booking_request_id uuid,
  p_hotel_id uuid,
  p_reason text,
  p_decided_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_req record;
  v_property_id uuid;
  v_clean_reason text := TRIM(COALESCE(p_reason, ''));
  v_decider uuid := COALESCE(p_decided_by, auth.uid());
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.has_hotel_access(p_hotel_id) THEN
    RAISE EXCEPTION 'Unauthorized: hotel staff authentication required.';
  END IF;
  IF v_clean_reason = '' THEN
    RAISE EXCEPTION 'Rejection reason is mandatory.';
  END IF;

  SELECT * INTO v_req
  FROM public.booking_requests
  WHERE id = p_booking_request_id AND (hotel_id = p_hotel_id OR property_id = p_hotel_id)
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Booking request not found for hotel.'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'Booking request is already processed (current status: %).', v_req.status; END IF;

  v_property_id := COALESCE(v_req.property_id, p_hotel_id);

  UPDATE public.booking_requests
  SET status = 'denied', denial_reason = v_clean_reason, decided_by = v_decider, decided_at = now(), updated_at = now()
  WHERE id = p_booking_request_id;

  INSERT INTO public.notifications (hotel_id, property_id, type, severity, title, message, metadata)
  VALUES (
    p_hotel_id, v_property_id, 'booking_request_rejected', 'warning',
    'Booking Request Rejected: ' || v_req.submission_idempotency_key,
    'Request for ' || v_req.guest_first_name || ' ' || v_req.guest_last_name || ' rejected. Reason: ' || v_clean_reason,
    jsonb_build_object('booking_request_id', p_booking_request_id, 'reason', v_clean_reason)
  );

  INSERT INTO public.audit_logs (hotel_id, property_id, user_id, action, entity_type, entity_id, new_value, description)
  VALUES (
    p_hotel_id, v_property_id, v_decider, 'reject', 'booking_request', p_booking_request_id,
    jsonb_build_object('reason', v_clean_reason), 'Staff rejected booking request: ' || v_clean_reason
  );

  RETURN jsonb_build_object('success', true, 'booking_request_id', p_booking_request_id, 'status', 'denied', 'reason', v_clean_reason);
END;
$$;

-- F. Atomic Walk-In / Desk Check-In RPC (Prevents double bookings & keeps Folio/Guest/Room synced)
CREATE OR REPLACE FUNCTION public.create_walk_in_stay(
  p_hotel_id uuid,
  p_room_id uuid,
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_email text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_state text DEFAULT NULL,
  p_id_type text DEFAULT 'Aadhaar Card',
  p_id_number text DEFAULT NULL,
  p_id_front_url text DEFAULT NULL,
  p_id_back_url text DEFAULT NULL,
  p_arrival_date date DEFAULT CURRENT_DATE,
  p_departure_date date DEFAULT (CURRENT_DATE + 1),
  p_adults integer DEFAULT 1,
  p_children integer DEFAULT 0,
  p_price_per_night numeric(12, 2) DEFAULT 0,
  p_extra_charges numeric(12, 2) DEFAULT 0,
  p_discount numeric(12, 2) DEFAULT 0,
  p_advance_paid numeric(12, 2) DEFAULT 0,
  p_payment_method text DEFAULT 'cash',
  p_notes text DEFAULT NULL,
  p_occupancy_type text DEFAULT 'double'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_room record;
  v_guest_id uuid;
  v_rate_plan_id uuid;
  v_booking_id uuid;
  v_reservation_id uuid;
  v_folio_id uuid;
  v_nights integer := GREATEST(1, COALESCE(p_departure_date - p_arrival_date, 1));
  v_base_total numeric(12, 2);
  v_total numeric(12, 2);
  v_conf text;
  v_folio_num text;
  v_conflict boolean;
  v_actor uuid := auth.uid();
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.has_hotel_access(p_hotel_id) THEN
    RAISE EXCEPTION 'Unauthorized: hotel staff authentication required.';
  END IF;

  IF p_departure_date <= p_arrival_date THEN
    p_departure_date := p_arrival_date + 1;
  END IF;
  v_nights := GREATEST(1, p_departure_date - p_arrival_date);

  SELECT r.*, rt.name AS room_type_name INTO v_room
  FROM public.rooms r
  JOIN public.room_types rt ON rt.id = r.room_type_id
  WHERE r.id = p_room_id AND (r.hotel_id = p_hotel_id OR r.property_id = p_hotel_id)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found for this property.';
  END IF;
  IF v_room.status IN ('occupied', 'out_of_order', 'out_of_service') THEN
    RAISE EXCEPTION 'Room % is currently % and cannot be checked in.', v_room.number, v_room.status;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.reservations res
    WHERE res.room_id = p_room_id
      AND res.status IN ('confirmed', 'assigned', 'checked_in', 'stayover', 'due_out')
      AND res.arrival_date < p_departure_date
      AND res.departure_date > p_arrival_date
  ) INTO v_conflict;

  IF v_conflict THEN
    RAISE EXCEPTION 'Room % already has an active overlapping reservation.', v_room.number;
  END IF;

  SELECT id INTO v_rate_plan_id
  FROM public.rate_plans
  WHERE (hotel_id = p_hotel_id OR property_id = p_hotel_id)
    AND (room_type_id = v_room.room_type_id OR room_type_id IS NULL)
    AND is_active = true
  ORDER BY (room_type_id = v_room.room_type_id) DESC
  LIMIT 1;

  IF v_rate_plan_id IS NULL THEN
    RAISE EXCEPTION 'No active rate plan configured for room type %.', v_room.room_type_name;
  END IF;

  v_base_total := GREATEST(0, (COALESCE(p_price_per_night, 0) * v_nights) - COALESCE(p_discount, 0));
  v_total := v_base_total + GREATEST(0, COALESCE(p_extra_charges, 0));

  -- Upsert guest profile by phone or email within hotel
  SELECT id INTO v_guest_id
  FROM public.guests
  WHERE (hotel_id = p_hotel_id OR property_id = p_hotel_id)
    AND ((NULLIF(TRIM(p_phone), '') IS NOT NULL AND phone = TRIM(p_phone))
      OR (NULLIF(LOWER(TRIM(p_email)), '') IS NOT NULL AND LOWER(email) = LOWER(TRIM(p_email))))
  LIMIT 1;

  IF v_guest_id IS NULL THEN
    INSERT INTO public.guests (
      hotel_id, property_id, first_name, last_name, email, phone,
      id_type, id_number, address_line_1, city, state_province,
      registration_data
    ) VALUES (
      p_hotel_id, p_hotel_id, TRIM(p_first_name), COALESCE(NULLIF(TRIM(p_last_name), ''), 'Guest'),
      NULLIF(LOWER(TRIM(p_email)), ''), TRIM(p_phone),
      p_id_type, NULLIF(TRIM(p_id_number), ''), NULLIF(TRIM(p_address), ''),
      NULLIF(TRIM(p_city), ''), NULLIF(TRIM(p_state), ''),
      jsonb_strip_nulls(jsonb_build_object(
        'idProofType', p_id_type,
        'idProofNumber', NULLIF(TRIM(p_id_number), ''),
        'idProofFrontUrl', NULLIF(p_id_front_url, ''),
        'idProofBackUrl', NULLIF(p_id_back_url, '')
      ))
    ) RETURNING id INTO v_guest_id;
  ELSE
    UPDATE public.guests
    SET first_name = COALESCE(NULLIF(TRIM(p_first_name), ''), first_name),
        last_name = COALESCE(NULLIF(TRIM(p_last_name), ''), last_name),
        email = COALESCE(NULLIF(LOWER(TRIM(p_email)), ''), email),
        id_type = COALESCE(NULLIF(p_id_type, ''), id_type),
        id_number = COALESCE(NULLIF(TRIM(p_id_number), ''), id_number),
        address_line_1 = COALESCE(NULLIF(TRIM(p_address), ''), address_line_1),
        city = COALESCE(NULLIF(TRIM(p_city), ''), city),
        state_province = COALESCE(NULLIF(TRIM(p_state), ''), state_province),
        updated_at = now()
    WHERE id = v_guest_id;
  END IF;

  IF NULLIF(TRIM(p_id_number), '') IS NOT NULL OR NULLIF(p_id_front_url, '') IS NOT NULL THEN
    INSERT INTO public.guest_documents (
      hotel_id, property_id, guest_id, document_type, document_number, file_url, storage_path, verification_status, verified_by, verified_at
    ) VALUES (
      p_hotel_id, p_hotel_id, v_guest_id,
      COALESCE(lower(replace(p_id_type, ' ', '_')), 'aadhaar'),
      COALESCE(NULLIF(TRIM(p_id_number), ''), 'ON_FILE'),
      NULLIF(p_id_front_url, ''), NULLIF(p_id_back_url, ''),
      'verified', v_actor, now()
    );
  END IF;

  v_conf := 'WALKIN-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 5));
  v_folio_num := 'FOL-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4));

  INSERT INTO public.bookings (hotel_id, property_id, guest_id, confirmation_number, source, channel_code, notes)
  VALUES (p_hotel_id, p_hotel_id, v_guest_id, v_conf, 'walk_in', 'front_desk', p_notes)
  RETURNING id INTO v_booking_id;

  INSERT INTO public.reservations (
    hotel_id, property_id, booking_id, guest_id, arrival_date, departure_date, nights,
    room_type_id, room_id, status, rate_plan_id, total_amount, base_amount, extra_charges, discount_amount,
    occupancy_type, currency_code, adults, children, special_requests, booking_source, checked_in_at, checked_in_by, notes
  ) VALUES (
    p_hotel_id, p_hotel_id, v_booking_id, v_guest_id, p_arrival_date, p_departure_date, v_nights,
    v_room.room_type_id, p_room_id, 'checked_in', v_rate_plan_id, v_base_total, v_base_total, GREATEST(0, COALESCE(p_extra_charges, 0)), GREATEST(0, COALESCE(p_discount, 0)),
    COALESCE(p_occupancy_type, 'double'), 'INR', GREATEST(1, p_adults), GREATEST(0, p_children), p_notes, 'walk_in', now(), v_actor, p_notes
  ) RETURNING id INTO v_reservation_id;

  INSERT INTO public.reservation_rooms (
    hotel_id, property_id, reservation_id, room_id, room_type_id, rate_plan_id,
    arrival_date, departure_date, room_rate, status
  ) VALUES (
    p_hotel_id, p_hotel_id, v_reservation_id, p_room_id, v_room.room_type_id, v_rate_plan_id,
    p_arrival_date, p_departure_date, COALESCE(p_price_per_night, 0), 'checked_in'
  );

  INSERT INTO public.folios (
    hotel_id, property_id, reservation_id, booking_id, guest_id, folio_number,
    type, status, total_charges, total_payments, balance, currency_code, notes
  ) VALUES (
    p_hotel_id, p_hotel_id, v_reservation_id, v_booking_id, v_guest_id, v_folio_num,
    'guest', 'open', v_base_total, 0.00, v_base_total, 'INR', p_notes
  ) RETURNING id INTO v_folio_id;

  IF COALESCE(p_extra_charges, 0) > 0 THEN
    INSERT INTO public.additional_charges (
      hotel_id, property_id, reservation_id, folio_id, charge_type, description, amount, tax_amount, recorded_by
    ) VALUES (
      p_hotel_id, p_hotel_id, v_reservation_id, v_folio_id, 'extra', 'Additional Check-In Charges / Extra Person', p_extra_charges, 0, COALESCE(v_actor::text, 'front_desk')
    );
  END IF;

  IF COALESCE(p_advance_paid, 0) > 0 THEN
    INSERT INTO public.payments (
      hotel_id, property_id, booking_id, reservation_id, folio_id, guest_id,
      amount, currency_code, payment_method, status, paid_at, recorded_by, notes
    ) VALUES (
      p_hotel_id, p_hotel_id, v_booking_id, v_reservation_id, v_folio_id, v_guest_id,
      p_advance_paid, 'INR', lower(replace(COALESCE(p_payment_method, 'cash'), ' ', '_')), 'paid', now(), v_actor, 'Advance paid at check-in'
    );
  END IF;

  INSERT INTO public.check_ins (
    hotel_id, property_id, reservation_id, room_id, guest_id, checked_in_by, deposit_amount, notes
  ) VALUES (
    p_hotel_id, p_hotel_id, v_reservation_id, p_room_id, v_guest_id, v_actor, COALESCE(p_advance_paid, 0), p_notes
  );

  INSERT INTO public.staff_notifications (
    hotel_id, property_id, type, severity, title, message, source_event, source_entity_type, source_entity_id
  ) VALUES (
    p_hotel_id, p_hotel_id, 'guest_checked_in', 'info',
    'Walk-In Check-In: Room ' || v_room.number,
    TRIM(p_first_name || ' ' || COALESCE(p_last_name, '')) || ' checked into Room ' || v_room.number,
    'walk_in_check_in', 'reservation', v_reservation_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'reservation_id', v_reservation_id,
    'folio_id', v_folio_id,
    'guest_id', v_guest_id,
    'confirmation_number', v_conf,
    'folio_number', v_folio_num,
    'room_number', v_room.number
  );
END;
$$;

-- G. Atomic Check-Out & Tax Invoice Generation RPC
CREATE OR REPLACE FUNCTION public.complete_stay_checkout(
  p_hotel_id uuid,
  p_reservation_id uuid,
  p_final_payment numeric(12, 2) DEFAULT 0,
  p_payment_method text DEFAULT 'cash',
  p_nights integer DEFAULT NULL,
  p_price_per_night numeric(12, 2) DEFAULT NULL,
  p_extra_charges numeric(12, 2) DEFAULT 0,
  p_discount numeric(12, 2) DEFAULT 0,
  p_tax_mode text DEFAULT 'inclusive',
  p_gst_rate numeric(5, 2) DEFAULT 5.00
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_res record;
  v_folio record;
  v_guest record;
  v_room record;
  v_eff_nights integer;
  v_eff_rate numeric(12, 2);
  v_gross numeric(12, 2);
  v_subtotal numeric(12, 2);
  v_tax_total numeric(12, 2);
  v_cgst numeric(12, 2);
  v_sgst numeric(12, 2);
  v_paid numeric(12, 2);
  v_balance numeric(12, 2);
  v_invoice_num text;
  v_invoice_id uuid;
  v_actor uuid := auth.uid();
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.has_hotel_access(p_hotel_id) THEN
    RAISE EXCEPTION 'Unauthorized: hotel staff authentication required.';
  END IF;

  SELECT * INTO v_res FROM public.reservations
  WHERE id = p_reservation_id AND (hotel_id = p_hotel_id OR property_id = p_hotel_id)
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Reservation not found.'; END IF;
  IF v_res.status = 'checked_out' THEN RAISE EXCEPTION 'Reservation is already checked out.'; END IF;

  SELECT * INTO v_folio FROM public.folios WHERE reservation_id = p_reservation_id FOR UPDATE;
  SELECT * INTO v_guest FROM public.guests WHERE id = v_res.guest_id;
  SELECT * INTO v_room FROM public.rooms WHERE id = v_res.room_id FOR UPDATE;

  v_eff_nights := GREATEST(1, COALESCE(p_nights, v_res.nights, 1));
  v_eff_rate := COALESCE(p_price_per_night, CASE WHEN v_res.nights > 0 THEN ROUND(v_res.total_amount / v_res.nights, 2) ELSE v_res.total_amount END);

  IF COALESCE(p_tax_mode, 'inclusive') = 'inclusive' THEN
    v_gross := GREATEST(0, (v_eff_nights * v_eff_rate) + COALESCE(p_extra_charges, 0) - COALESCE(p_discount, 0));
    v_subtotal := ROUND(v_gross / (1 + (COALESCE(p_gst_rate, 5.0) / 100.0)), 2);
    v_tax_total := v_gross - v_subtotal;
  ELSE
    v_subtotal := GREATEST(0, (v_eff_nights * v_eff_rate) + COALESCE(p_extra_charges, 0) - COALESCE(p_discount, 0));
    v_tax_total := ROUND(v_subtotal * (COALESCE(p_gst_rate, 5.0) / 100.0), 2);
    v_gross := v_subtotal + v_tax_total;
  END IF;
  v_cgst := ROUND(v_tax_total / 2.0, 2);
  v_sgst := v_tax_total - v_cgst;

  UPDATE public.reservations
  SET nights = v_eff_nights,
      total_amount = v_gross,
      base_amount = v_subtotal,
      tax_amount = v_tax_total,
      extra_charges = COALESCE(p_extra_charges, 0),
      discount_amount = COALESCE(p_discount, 0),
      updated_at = now()
  WHERE id = p_reservation_id;

  IF COALESCE(p_final_payment, 0) > 0 AND v_folio.id IS NOT NULL THEN
    INSERT INTO public.payments (
      hotel_id, property_id, booking_id, reservation_id, folio_id, guest_id,
      amount, currency_code, payment_method, status, paid_at, recorded_by, notes
    ) VALUES (
      p_hotel_id, p_hotel_id, v_res.booking_id, p_reservation_id, v_folio.id, v_res.guest_id,
      p_final_payment, v_res.currency_code, lower(replace(COALESCE(p_payment_method, 'cash'), ' ', '_')), 'paid', now(), v_actor, 'Checkout settlement payment'
    );
  END IF;

  IF v_folio.id IS NOT NULL THEN
    PERFORM public.recalculate_folio_totals(v_folio.id);
    SELECT * INTO v_folio FROM public.folios WHERE id = v_folio.id;
  END IF;

  v_paid := COALESCE(v_folio.total_payments, 0);
  v_balance := GREATEST(0, v_gross - v_paid);
  v_invoice_num := 'INV-SPARK-' || to_char(now(), 'YYYY') || '-' || COALESCE(v_room.number, 'GEN') || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4));

  INSERT INTO public.invoices (
    hotel_id, property_id, reservation_id, folio_id, guest_id, invoice_number,
    subtotal, tax_total, cgst_amount, sgst_amount, gst_rate, tax_mode,
    discount_amount, extra_charges, total_amount, amount_paid, balance_due,
    status, currency_code, guest_name, room_number, hsn_sac,
    line_items
  ) VALUES (
    p_hotel_id, p_hotel_id, p_reservation_id, v_folio.id, v_res.guest_id, v_invoice_num,
    v_subtotal, v_tax_total, v_cgst, v_sgst, COALESCE(p_gst_rate, 5.0), COALESCE(p_tax_mode, 'inclusive'),
    COALESCE(p_discount, 0), COALESCE(p_extra_charges, 0), v_gross, LEAST(v_gross, v_paid), v_balance,
    CASE WHEN v_balance <= 0 THEN 'paid' ELSE 'partially_paid' END,
    v_res.currency_code,
    trim(COALESCE(v_guest.first_name, '') || ' ' || COALESCE(v_guest.last_name, '')),
    v_room.number,
    '996311',
    jsonb_build_array(jsonb_build_object(
      'particular', 'RoomCharges',
      'hsnSac', '996311',
      'nights', v_eff_nights,
      'rate', v_eff_rate,
      'extraCharges', COALESCE(p_extra_charges, 0),
      'discount', COALESCE(p_discount, 0),
      'taxable', v_subtotal,
      'cgst', v_cgst,
      'sgst', v_sgst,
      'total', v_gross
    ))
  ) RETURNING id INTO v_invoice_id;

  -- Inserting into check_outs triggers trg_after_check_out -> updates reservation, marks room vacant_dirty, creates housekeeping task
  INSERT INTO public.check_outs (
    hotel_id, property_id, reservation_id, room_id, guest_id, checked_out_by,
    folio_balance_at_checkout, settlement_status
  ) VALUES (
    p_hotel_id, p_hotel_id, p_reservation_id, v_res.room_id, v_res.guest_id, v_actor,
    v_balance, CASE WHEN v_balance <= 0 THEN 'settled' ELSE 'unsettled' END
  );

  RETURN jsonb_build_object(
    'success', true,
    'reservation_id', p_reservation_id,
    'invoice_id', v_invoice_id,
    'invoice_number', v_invoice_num,
    'total_amount', v_gross,
    'amount_paid', v_paid,
    'balance_due', v_balance
  );
END;
$$;

-- ============================================================================
-- 7. COMPLETE RLS POLICIES (STRICT TENANCY + ROLE GUARDS + ZERO ANON PII LEAKS)
-- ============================================================================

-- Enable RLS across ALL tables (including missing ones from earlier scripts)
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_handover_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE additional_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE allotment_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_requests ENABLE ROW LEVEL SECURITY;

-- Public Website Read Policies (non-PII catalog only)
DROP POLICY IF EXISTS "Public can view active hotels" ON hotels;
CREATE POLICY "Public can view active hotels" ON hotels FOR SELECT TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "Public can view active properties" ON properties;
CREATE POLICY "Public can view active properties" ON properties FOR SELECT TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "Public can view active room types" ON room_types;
CREATE POLICY "Public can view active room types" ON room_types FOR SELECT TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "Public can view room images" ON room_images;
CREATE POLICY "Public can view room images" ON room_images FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public can view media" ON media;
CREATE POLICY "Public can view media" ON media FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public can view rate plans" ON rate_plans;
CREATE POLICY "Public can view rate plans" ON rate_plans FOR SELECT TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "Public can view non-sensitive hotel settings" ON hotel_settings;
-- Only staff can query full hotel_settings directly; website uses get_public_hotel_catalog()
DROP POLICY IF EXISTS "Staff can read hotel settings" ON hotel_settings;
CREATE POLICY "Staff can read hotel settings" ON hotel_settings FOR SELECT TO authenticated USING (public.has_hotel_access(hotel_id));

DROP POLICY IF EXISTS "Admins can manage hotel settings" ON hotel_settings;
CREATE POLICY "Admins can manage hotel settings" ON hotel_settings FOR ALL TO authenticated
  USING (public.is_super_admin() OR public.get_user_role(hotel_id) IN ('hotel_admin', 'manager'))
  WITH CHECK (public.is_super_admin() OR public.get_user_role(hotel_id) IN ('hotel_admin', 'manager'));

-- Staff manage room types, rate plans, room images, media
DROP POLICY IF EXISTS "Staff can manage room types" ON room_types;
CREATE POLICY "Staff can manage room types" ON room_types FOR ALL TO authenticated
  USING (public.has_hotel_access(hotel_id)) WITH CHECK (public.has_hotel_access(hotel_id));

DROP POLICY IF EXISTS "Staff can manage rate plans" ON rate_plans;
CREATE POLICY "Staff can manage rate plans" ON rate_plans FOR ALL TO authenticated
  USING (public.has_hotel_access(hotel_id)) WITH CHECK (public.has_hotel_access(hotel_id));

DROP POLICY IF EXISTS "Staff can manage room images" ON room_images;
CREATE POLICY "Staff can manage room images" ON room_images FOR ALL TO authenticated
  USING (public.has_hotel_access(hotel_id)) WITH CHECK (public.has_hotel_access(hotel_id));

DROP POLICY IF EXISTS "Staff can manage media" ON media;
CREATE POLICY "Staff can manage media" ON media FOR ALL TO authenticated
  USING (public.has_hotel_access(hotel_id)) WITH CHECK (public.has_hotel_access(hotel_id));

-- Booking requests: strictly NO anon SELECT/INSERT/UPDATE/DELETE (anon submits only via SECURITY DEFINER RPC)
DROP POLICY IF EXISTS "Anon can view booking requests" ON booking_requests;
DROP POLICY IF EXISTS "Public can view booking requests" ON booking_requests;
DROP POLICY IF EXISTS "Enable read access for all users" ON booking_requests;
DROP POLICY IF EXISTS "Enable insert for all users" ON booking_requests;
DROP POLICY IF EXISTS "Staff can view and manage booking requests" ON booking_requests;
CREATE POLICY "Staff can view and manage booking requests" ON booking_requests FOR ALL TO authenticated
  USING (public.has_hotel_access(hotel_id))
  WITH CHECK (public.has_hotel_access(hotel_id));

-- Profiles & User Roles & Members
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view hotel or own profile" ON profiles;
CREATE POLICY "Users can view hotel or own profile" ON profiles FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()) OR public.has_hotel_access(hotel_id));

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid())) WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Staff can view user roles" ON user_roles;
CREATE POLICY "Staff can view user roles" ON user_roles FOR SELECT TO authenticated
  USING (public.has_hotel_access(hotel_id));

DROP POLICY IF EXISTS "Admins can manage user roles" ON user_roles;
CREATE POLICY "Admins can manage user roles" ON user_roles FOR ALL TO authenticated
  USING (public.is_super_admin() OR public.get_user_role(hotel_id) IN ('hotel_admin', 'manager'))
  WITH CHECK (public.is_super_admin() OR public.get_user_role(hotel_id) IN ('hotel_admin', 'manager'));

-- Departments, Employees, Attendance & Handover Notes
DROP POLICY IF EXISTS "Staff can view departments" ON departments;
CREATE POLICY "Staff can view departments" ON departments FOR SELECT TO authenticated
  USING (public.has_hotel_access(hotel_id));

DROP POLICY IF EXISTS "Admins can manage departments" ON departments;
CREATE POLICY "Admins can manage departments" ON departments FOR ALL TO authenticated
  USING (public.is_super_admin() OR public.get_user_role(hotel_id) IN ('hotel_admin', 'manager'))
  WITH CHECK (public.is_super_admin() OR public.get_user_role(hotel_id) IN ('hotel_admin', 'manager'));

DROP POLICY IF EXISTS "Staff can view employees" ON employees;
CREATE POLICY "Staff can view employees" ON employees FOR SELECT TO authenticated
  USING (public.has_hotel_access(hotel_id));

DROP POLICY IF EXISTS "Admins and managers can manage employees" ON employees;
CREATE POLICY "Admins and managers can manage employees" ON employees FOR ALL TO authenticated
  USING (public.is_super_admin() OR public.get_user_role(hotel_id) IN ('hotel_admin', 'manager'))
  WITH CHECK (public.is_super_admin() OR public.get_user_role(hotel_id) IN ('hotel_admin', 'manager'));

DROP POLICY IF EXISTS "Staff can view attendance" ON staff_attendance;
CREATE POLICY "Staff can view attendance" ON staff_attendance FOR SELECT TO authenticated
  USING (public.has_hotel_access(hotel_id));

DROP POLICY IF EXISTS "Staff can clock or update attendance" ON staff_attendance;
DROP POLICY IF EXISTS "Staff can manage attendance" ON staff_attendance;
CREATE POLICY "Staff can manage attendance" ON staff_attendance FOR ALL TO authenticated
  USING (public.has_hotel_access(hotel_id))
  WITH CHECK (public.has_hotel_access(hotel_id));

DROP POLICY IF EXISTS "Staff can manage shift handover notes" ON shift_handover_notes;
CREATE POLICY "Staff can manage shift handover notes" ON shift_handover_notes FOR ALL TO authenticated
  USING (public.has_hotel_access(hotel_id))
  WITH CHECK (public.has_hotel_access(hotel_id));

-- Financial tables: additional_charges, allotment_blocks, service_requests
DROP POLICY IF EXISTS "Staff can manage additional charges" ON additional_charges;
CREATE POLICY "Staff can manage additional charges" ON additional_charges FOR ALL TO authenticated
  USING (public.has_hotel_access(hotel_id))
  WITH CHECK (public.has_hotel_access(hotel_id));

DROP POLICY IF EXISTS "Staff can manage allotment blocks" ON allotment_blocks;
CREATE POLICY "Staff can manage allotment blocks" ON allotment_blocks FOR ALL TO authenticated
  USING (public.has_hotel_access(hotel_id))
  WITH CHECK (public.has_hotel_access(hotel_id));

DROP POLICY IF EXISTS "Staff can manage service requests" ON service_requests;
CREATE POLICY "Staff can manage service requests" ON service_requests FOR ALL TO authenticated
  USING (public.has_hotel_access(hotel_id))
  WITH CHECK (public.has_hotel_access(hotel_id));

-- Staff notifications & notifications INSERT/UPDATE policies
DROP POLICY IF EXISTS "Staff can manage notifications" ON notifications;
CREATE POLICY "Staff can manage notifications" ON notifications FOR ALL TO authenticated
  USING (public.has_hotel_access(hotel_id)) WITH CHECK (public.has_hotel_access(hotel_id));

DROP POLICY IF EXISTS "Staff can insert audit logs" ON audit_logs;
CREATE POLICY "Staff can insert audit logs" ON audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.has_hotel_access(hotel_id));

-- ============================================================================
-- 8. FUNCTION EXECUTE PRIVILEGES & STORAGE POLICIES
-- ============================================================================

REVOKE ALL ON FUNCTION public.approve_direct_booking(uuid, uuid, uuid, uuid, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_direct_booking(uuid, uuid, uuid, uuid, numeric, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.reject_direct_booking(uuid, uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_direct_booking(uuid, uuid, text, uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.create_walk_in_stay(uuid, uuid, text, text, text, text, text, text, text, text, text, text, text, date, date, integer, integer, numeric, numeric, numeric, numeric, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_walk_in_stay(uuid, uuid, text, text, text, text, text, text, text, text, text, text, text, date, date, integer, integer, numeric, numeric, numeric, numeric, text, text, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.complete_stay_checkout(uuid, uuid, numeric, text, integer, numeric, numeric, numeric, text, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_stay_checkout(uuid, uuid, numeric, text, integer, numeric, numeric, numeric, text, numeric) TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.get_public_hotel_catalog(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_public_booking_status(text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.revalidate_room_availability(uuid, uuid, date, date) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_website_booking_request(uuid, uuid, date, date, varchar, varchar, varchar, varchar, numeric, integer, integer, text, varchar, varchar, jsonb) TO anon, authenticated, service_role;

-- Complete Storage policies including UPDATE/DELETE for authenticated staff
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'objects') THEN
    DROP POLICY IF EXISTS "Staff can update hotel media" ON storage.objects;
    CREATE POLICY "Staff can update hotel media"
      ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id IN ('hotel-assets', 'room-photos'))
      WITH CHECK (bucket_id IN ('hotel-assets', 'room-photos'));

    DROP POLICY IF EXISTS "Staff can delete hotel media" ON storage.objects;
    CREATE POLICY "Staff can delete hotel media"
      ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id IN ('hotel-assets', 'room-photos'));

    DROP POLICY IF EXISTS "Staff can update guest documents" ON storage.objects;
    CREATE POLICY "Staff can update guest documents"
      ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id = 'guest-documents')
      WITH CHECK (bucket_id = 'guest-documents');

    DROP POLICY IF EXISTS "Staff can delete guest documents" ON storage.objects;
    CREATE POLICY "Staff can delete guest documents"
      ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'guest-documents');
  END IF;
END $$;
