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
