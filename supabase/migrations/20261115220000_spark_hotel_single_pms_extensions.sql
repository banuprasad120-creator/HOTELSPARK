-- ============================================================================
-- SPARK HOTEL – SINGLE HOTEL MANAGEMENT SYSTEM
-- MASTER DATABASE EXTENSIONS: DEPARTMENTS, EMPLOYEES & BILLING
-- ============================================================================

-- 1. Departments table
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL DEFAULT 'a0000001-0000-4000-a000-000000000001'::uuid,
  name text NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  description text,
  manager_name text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Employees table
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL DEFAULT 'a0000001-0000-4000-a000-000000000001'::uuid,
  employee_id text NOT NULL UNIQUE,
  name text NOT NULL,
  photo_url text,
  mobile text NOT NULL,
  email text NOT NULL UNIQUE,
  address text,
  joining_date date NOT NULL DEFAULT CURRENT_DATE,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  designation text NOT NULL,
  reporting_manager_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  salary numeric(12,2) DEFAULT 0.00,
  role text NOT NULL DEFAULT 'Receptionist',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Additional Charges table (minibar, laundry, room service, etc.)
CREATE TABLE IF NOT EXISTS additional_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL DEFAULT 'a0000001-0000-4000-a000-000000000001'::uuid,
  reservation_id uuid REFERENCES reservations(id) ON DELETE CASCADE,
  folio_id uuid REFERENCES folios(id) ON DELETE CASCADE,
  charge_type text NOT NULL DEFAULT 'room_service',
  description text NOT NULL,
  amount numeric(10,2) NOT NULL,
  tax_amount numeric(10,2) NOT NULL DEFAULT 0.00,
  recorded_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Seed Standard Departments for Spark Hotel
INSERT INTO departments (name, code, description)
VALUES 
  ('Front Office', 'FRONT', 'Guest reception, check-in, check-out, concierge and reservations'),
  ('Housekeeping', 'HK', 'Room cleaning, linen, laundry and property hygiene'),
  ('Food & Beverage', 'FNB', 'Restaurant, bar, room service and banquets'),
  ('Kitchen', 'KTCH', 'Culinary preparation and food safety'),
  ('Maintenance', 'MAINT', 'HVAC, plumbing, electrical and physical plant engineering'),
  ('Security', 'SEC', '24/7 guest safety, CCTV surveillance and access control'),
  ('Accounts', 'ACCT', 'Financial ledger, cashiering, billing, invoices and tax'),
  ('Sales & Marketing', 'MKTG', 'Direct bookings, corporate tie-ups and travel agents'),
  ('Management', 'MGMT', 'Executive administration and hotel general management')
ON CONFLICT (code) DO NOTHING;

-- 5. Seed Core Employees for Spark Hotel
INSERT INTO employees (employee_id, name, mobile, email, designation, role, salary, status)
VALUES
  ('EMP-SPARK-001', 'Banu Prasad (Owner)', '+91 98765 43210', 'admin@sparkhotel.com', 'Hotel Owner / Managing Director', 'Hotel Admin / Owner', 150000, 'active'),
  ('EMP-SPARK-002', 'Ramesh Rao', '+91 98765 43211', 'frontdesk.mgr@sparkhotel.com', 'Front Office Manager', 'Front Office Manager', 60000, 'active'),
  ('EMP-SPARK-003', 'Priya Sharma', '+91 98765 43212', 'reception1@sparkhotel.com', 'Senior Receptionist', 'Receptionist', 35000, 'active'),
  ('EMP-SPARK-004', 'Kavitha Devi', '+91 98765 43213', 'hk.mgr@sparkhotel.com', 'Housekeeping Manager', 'Housekeeping Manager', 45000, 'active'),
  ('EMP-SPARK-005', 'Sunil Kumar', '+91 98765 43214', 'accounts@sparkhotel.com', 'Hotel Accountant', 'Accountant', 50000, 'active'),
  ('EMP-SPARK-006', 'Raju Nayak', '+91 98765 43215', 'hk.staff1@sparkhotel.com', 'Housekeeping Supervisor', 'Housekeeping Staff', 25000, 'active'),
  ('EMP-SPARK-007', 'Satish Reddy', '+91 98765 43216', 'maintenance@sparkhotel.com', 'Chief Maintenance Technician', 'Maintenance Staff', 32000, 'active')
ON CONFLICT (employee_id) DO NOTHING;

-- Associate department IDs with employees
UPDATE employees e
SET department_id = d.id
FROM departments d
WHERE (e.role = 'Hotel Admin / Owner' AND d.code = 'MGMT')
   OR (e.role IN ('Front Office Manager', 'Receptionist') AND d.code = 'FRONT')
   OR (e.role IN ('Housekeeping Manager', 'Housekeeping Staff') AND d.code = 'HK')
   OR (e.role = 'Accountant' AND d.code = 'ACCT')
   OR (e.role = 'Maintenance Staff' AND d.code = 'MAINT');

-- 6. Indexes for ultra-fast PMS queries
CREATE INDEX IF NOT EXISTS idx_employees_dept ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);
CREATE INDEX IF NOT EXISTS idx_add_charges_resv ON additional_charges(reservation_id);
