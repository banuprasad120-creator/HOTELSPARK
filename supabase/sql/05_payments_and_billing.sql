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

CREATE TRIGGER trg_folios_updated_at
  BEFORE UPDATE ON folios
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

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments
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

CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON invoices
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

CREATE TRIGGER trg_refunds_updated_at
  BEFORE UPDATE ON refunds
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
