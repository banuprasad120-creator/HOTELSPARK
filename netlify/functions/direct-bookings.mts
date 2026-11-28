import type { Handler } from '@netlify/functions';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://erzzqhzjtdhzrwpzbflr.supabase.co';
const PUBLIC_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-booking-key',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const reply = (statusCode: number, data: unknown) => ({ statusCode, headers, body: JSON.stringify(data) });
  const token = event.headers.authorization || event.headers.Authorization;
  if (!token || !/^Bearer [^ ]+$/.test(token)) return reply(401, { error: 'Staff sign-in required.' });
  if (!PUBLIC_KEY) return reply(503, { error: 'Booking API public key is not configured.' });
  const dbHeaders = { apikey: PUBLIC_KEY, Authorization: token, 'Content-Type': 'application/json' };
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  try {
    const user = await fetch(SUPABASE_URL + '/auth/v1/user', { headers: dbHeaders });
    if (!user.ok) return reply(401, { error: 'Invalid staff session.' });
    const body = event.body ? JSON.parse(event.body) : {};
    const propertyId = event.queryStringParameters?.propertyId || body.propertyId;
    if (typeof propertyId !== 'string' || !uuid.test(propertyId)) return reply(400, { error: 'Valid property ID required.' });
    const requestPath = event.path || '';
    const match = requestPath.match(/direct-bookings\/([^/]+)\/(approve|reject|deny)\/?$/);
    if (event.httpMethod === 'POST' && match) {
      const [, id, action] = match;
      if (!uuid.test(id)) return reply(400, { error: 'Invalid booking ID.' });
      if (action === 'approve' && (!body.roomId || !uuid.test(body.roomId))) return reply(400, { error: 'Select an available room.' });
      if (action !== 'approve' && !String(body.reason || '').trim()) return reply(400, { error: 'Rejection reason required.' });
      const payload = action === 'approve' ? { p_booking_request_id: id, p_hotel_id: propertyId, p_room_id: body.roomId, p_custom_total: body.customTotal ?? null, p_custom_price_reason: body.customPriceReason ?? null } : { p_booking_request_id: id, p_hotel_id: propertyId, p_reason: String(body.reason).trim() };
      const res = await fetch(SUPABASE_URL + '/rest/v1/rpc/' + (action === 'approve' ? 'approve_direct_booking' : 'reject_direct_booking'), { method: 'POST', headers: dbHeaders, body: JSON.stringify(payload) });
      if (!res.ok) return reply(res.status, { error: 'Booking update rejected by database.' });
      const result = await res.json();
      if (result?.success !== true || (action === 'approve' && !result.reservation_id)) return reply(502, { error: 'Database did not confirm booking update.' });
      return reply(200, { ...result, roomNumber: result.room_number, confirmationNumber: result.confirmation_number });
    }
    if (event.httpMethod !== 'GET' || !/direct-bookings\/?$/.test(requestPath)) return reply(404, { error: 'Unknown booking endpoint.' });
    const res = await fetch(SUPABASE_URL + '/rest/v1/booking_requests?select=*&or=(hotel_id.eq.' + propertyId + ',property_id.eq.' + propertyId + ')&order=created_at.desc', { headers: dbHeaders });
    if (!res.ok) return reply(res.status, { error: 'Unable to load booking requests.' });
    const rows = await res.json();
    return reply(200, rows.map((r: any) => ({ id: r.id, propertyId: r.property_id || r.hotel_id, status: r.status, reference: r.submission_idempotency_key, submissionIdempotencyKey: r.submission_idempotency_key, arrivalDate: r.arrival_date, departureDate: r.departure_date, roomTypeId: r.room_type_id, ratePlanId: r.rate_plan_id, adults: r.adults, children: r.children, guestFirstName: r.guest_first_name, guestLastName: r.guest_last_name, guestEmail: r.guest_email, guestPhone: r.guest_phone, specialRequests: r.special_requests, submittedTotal: String(r.accepted_total ?? r.submitted_total ?? 0), currencyCode: r.currency_code, acceptedReservationId: r.accepted_reservation_id, denialReason: r.denial_reason, decidedAt: r.decided_at, createdAt: r.created_at })));
  } catch { return reply(500, { error: 'Booking request failed.' }); }
};
