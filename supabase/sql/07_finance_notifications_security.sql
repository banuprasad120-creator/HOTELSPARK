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

CREATE TRIGGER trg_expenses_updated_at
  BEFORE UPDATE ON expenses
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
