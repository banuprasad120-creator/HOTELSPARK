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
