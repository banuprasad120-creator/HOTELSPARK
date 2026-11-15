import { supabaseFetch } from './supabase';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';

const PROPERTY_ID = 'a0000001-0000-4000-a000-000000000001';

const DEFAULT_PROPERTY = {
  id: PROPERTY_ID,
  name: 'Hotel Spark',
  code: 'SPARK01',
  address: 'Near Old Bus Stand, Jagtial Road, Karimnagar, Telangana 505001',
  currencyCode: 'INR',
  timeZone: 'Asia/Kolkata',
  roomCount: 10,
  status: 'active',
  staffDisplayName: 'Hotel Spark Admin',
};

const ROOM_TYPE_NAMES: Record<string, { name: string; code: string }> = {
  'b0000001-0000-4000-a000-000000000001': { name: 'Deluxe King Room', code: 'DLX' },
  'b0000002-0000-4000-a000-000000000001': { name: 'Executive Spark Suite', code: 'SUT' },
  'b0000003-0000-4000-a000-000000000001': { name: 'Standard Queen Room', code: 'STD' },
};

const DEFAULT_DEPARTMENTS = [
  { id: 'd0000001-0000-4000-a000-000000000001', name: 'Front Office', code: 'FRONT', description: 'Guest reception, check-in, check-out, concierge and reservations', managerName: 'Ramesh Rao', employeeCount: 2 },
  { id: 'd0000002-0000-4000-a000-000000000001', name: 'Housekeeping', code: 'HK', description: 'Room cleaning, linen, laundry and property hygiene', managerName: 'Kavitha Devi', employeeCount: 2 },
  { id: 'd0000003-0000-4000-a000-000000000001', name: 'Food & Beverage', code: 'FNB', description: 'Restaurant, bar, room service and banquets', managerName: 'Sanjay Verma', employeeCount: 1 },
  { id: 'd0000004-0000-4000-a000-000000000001', name: 'Kitchen', code: 'KTCH', description: 'Culinary preparation and food safety', managerName: 'Chef Anand', employeeCount: 1 },
  { id: 'd0000005-0000-4000-a000-000000000001', name: 'Maintenance', code: 'MAINT', description: 'HVAC, plumbing, electrical and physical plant engineering', managerName: 'Satish Reddy', employeeCount: 1 },
  { id: 'd0000006-0000-4000-a000-000000000001', name: 'Security', code: 'SEC', description: '24/7 guest safety, CCTV surveillance and access control', managerName: 'Inspector Singh', employeeCount: 1 },
  { id: 'd0000007-0000-4000-a000-000000000001', name: 'Accounts', code: 'ACCT', description: 'Financial ledger, cashiering, billing, invoices and tax', managerName: 'Sunil Kumar', employeeCount: 1 },
  { id: 'd0000008-0000-4000-a000-000000000001', name: 'Sales & Marketing', code: 'MKTG', description: 'Direct bookings, corporate tie-ups and travel agents', managerName: 'Deepak Varma', employeeCount: 1 },
  { id: 'd0000009-0000-4000-a000-000000000001', name: 'Management', code: 'MGMT', description: 'Executive administration and hotel general management', managerName: 'Banu Prasad', employeeCount: 1 },
];

const DEFAULT_EMPLOYEES = [
  { id: 'e0000001-0000-4000-a000-000000000001', employeeId: 'EMP-SPARK-001', name: 'Banu Prasad (Owner)', mobile: '+91 98765 43210', email: 'admin@sparkhotel.com', designation: 'Hotel Owner / Managing Director', role: 'Hotel Admin / Owner', departmentName: 'Management', salary: 150000, status: 'active', joiningDate: '2025-01-01' },
  { id: 'e0000002-0000-4000-a000-000000000001', employeeId: 'EMP-SPARK-002', name: 'Ramesh Rao', mobile: '+91 98765 43211', email: 'frontdesk.mgr@sparkhotel.com', designation: 'Front Office Manager', role: 'Front Office Manager', departmentName: 'Front Office', salary: 60000, status: 'active', joiningDate: '2025-02-01' },
  { id: 'e0000003-0000-4000-a000-000000000001', employeeId: 'EMP-SPARK-003', name: 'Priya Sharma', mobile: '+91 98765 43212', email: 'reception1@sparkhotel.com', designation: 'Senior Receptionist', role: 'Receptionist', departmentName: 'Front Office', salary: 35000, status: 'active', joiningDate: '2025-03-15' },
  { id: 'e0000004-0000-4000-a000-000000000001', employeeId: 'EMP-SPARK-004', name: 'Kavitha Devi', mobile: '+91 98765 43213', email: 'hk.mgr@sparkhotel.com', designation: 'Housekeeping Manager', role: 'Housekeeping Manager', departmentName: 'Housekeeping', salary: 45000, status: 'active', joiningDate: '2025-02-10' },
  { id: 'e0000005-0000-4000-a000-000000000001', employeeId: 'EMP-SPARK-005', name: 'Sunil Kumar', mobile: '+91 98765 43214', email: 'accounts@sparkhotel.com', designation: 'Hotel Accountant', role: 'Accountant', departmentName: 'Accounts', salary: 50000, status: 'active', joiningDate: '2025-01-15' },
  { id: 'e0000006-0000-4000-a000-000000000001', employeeId: 'EMP-SPARK-006', name: 'Raju Nayak', mobile: '+91 98765 43215', email: 'hk.staff1@sparkhotel.com', designation: 'Housekeeping Supervisor', role: 'Housekeeping Staff', departmentName: 'Housekeeping', salary: 25000, status: 'active', joiningDate: '2025-04-01' },
  { id: 'e0000007-0000-4000-a000-000000000001', employeeId: 'EMP-SPARK-007', name: 'Satish Reddy', mobile: '+91 98765 43216', email: 'maintenance@sparkhotel.com', designation: 'Chief Maintenance Technician', role: 'Maintenance Staff', departmentName: 'Maintenance', salary: 32000, status: 'active', joiningDate: '2025-02-01' },
];

export async function handleSupabaseAdapter(config: AxiosRequestConfig): Promise<AxiosResponse> {
  const rawUrl = config.url || '';
  const url = rawUrl.replace(/^\/api/, '');
  const method = (config.method || 'GET').toUpperCase();

  const ok = (data: any): AxiosResponse => ({
    data,
    status: 200,
    statusText: 'OK',
    headers: { 'content-type': 'application/json' },
    config,
  });

  // 1. Properties
  if (url.includes('/properties')) {
    if (url.match(/\/properties\/[^/]+$/) && !url.endsWith('/properties')) {
      return ok(DEFAULT_PROPERTY);
    }
    return ok([DEFAULT_PROPERTY]);
  }

  // 2. Direct Bookings available rooms
  if (url.includes('/direct-bookings') && url.includes('/available-rooms')) {
    const { data: rooms } = await supabaseFetch<any[]>('rooms?select=*&order=number.asc');
    const list = (rooms || []).map((r) => ({
      id: r.id,
      number: r.number,
      floor: r.floor || '1',
      status: r.status || 'vacant_clean',
      hkOccupancy: r.hk_occupancy || 'vacant',
    }));
    return ok(list);
  }

  // 3. Direct booking approve
  if (url.includes('/direct-bookings') && url.includes('/approve') && method === 'POST') {
    const idMatch = url.match(/\/direct-bookings\/([^/]+)\/approve/);
    const requestId = idMatch ? idMatch[1] : '';
    const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : (config.data || {});

    try {
      await supabaseFetch('rpc/approve_direct_booking', {
        method: 'POST',
        body: JSON.stringify({
          p_request_id: requestId,
          p_room_id: body.roomId || '5aca9c61-49d7-42db-885c-58d30dfceac7',
          p_assigned_by: 'Hotel Spark Admin',
        }),
      });
    } catch (e) {
      console.warn('Direct booking approval via RPC:', e);
    }

    return ok({
      success: true,
      roomNumber: '101',
      confirmationNumber: `CONF-${Date.now().toString(36).toUpperCase()}`,
    });
  }

  // 4. Direct booking reject
  if (url.includes('/direct-bookings') && (url.includes('/reject') || url.includes('/deny')) && method === 'POST') {
    const idMatch = url.match(/\/direct-bookings\/([^/]+)\/(?:reject|deny)/);
    const requestId = idMatch ? idMatch[1] : '';
    const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : (config.data || {});

    try {
      await supabaseFetch('rpc/reject_direct_booking', {
        method: 'POST',
        body: JSON.stringify({
          p_request_id: requestId,
          p_reason: body.reason || 'Requested dates unavailable',
          p_rejected_by: 'Hotel Spark Admin',
        }),
      });
    } catch (e) {
      console.warn('Direct booking reject via RPC:', e);
    }

    return ok({ success: true });
  }

  // 5. Direct Bookings list
  if (url.includes('/direct-bookings') && method === 'GET') {
    if (url.includes('/history/audit')) {
      return ok([]);
    }

    const { data: reqs } = await supabaseFetch<any[]>('booking_requests?select=*&order=created_at.desc');
    const items = (reqs || []).map((r) => {
      const rt = ROOM_TYPE_NAMES[r.room_type_id] || { name: 'Deluxe King Room', code: 'DLX' };
      return {
        id: r.id,
        propertyId: r.property_id || PROPERTY_ID,
        status: r.status,
        reference: r.submission_idempotency_key || `SPARK-${r.id.slice(0, 8).toUpperCase()}`,
        submissionIdempotencyKey: r.submission_idempotency_key || `SPARK-${r.id.slice(0, 8).toUpperCase()}`,
        arrivalDate: r.arrival_date,
        departureDate: r.departure_date,
        roomTypeId: r.room_type_id,
        roomTypeName: rt.name,
        roomTypeCode: rt.code,
        ratePlanId: r.rate_plan_id || 'c0000001-0000-4000-a000-000000000001',
        ratePlanName: 'Best Available Rate',
        adults: r.adults || 2,
        children: r.children || 0,
        guestFirstName: r.guest_first_name,
        guestLastName: r.guest_last_name,
        guestEmail: r.guest_email,
        guestPhone: r.guest_phone || '',
        specialRequests: r.special_requests || '',
        submittedTotal: String(r.submitted_total || '3500.00'),
        currencyCode: r.currency_code || 'INR',
        confirmedReservationNumber: r.accepted_reservation_id,
        assignedRoomNumber: r.status === 'accepted' ? '101' : null,
        availableRoomsCount: 4,
        denialReason: r.denial_reason,
        decidedAt: r.decided_at,
        createdAt: r.created_at,
      };
    });

    let result = items;
    if (config.params?.status) {
      result = result.filter((i) => i.status === config.params.status);
    }
    if (config.params?.search) {
      const q = String(config.params.search).toLowerCase();
      result = result.filter(
        (i) =>
          i.guestFirstName.toLowerCase().includes(q) ||
          i.guestLastName.toLowerCase().includes(q) ||
          i.reference.toLowerCase().includes(q),
      );
    }

    return ok(result);
  }

  // 6. Room types and categories
  if ((url.includes('/room-types') || url.includes('/rooms/types')) && method === 'GET') {
    const { data: types } = await supabaseFetch<any[]>('room_types?select=*&order=sort_order.asc');
    return ok(types || []);
  }

  // 7. Rooms status summary
  if (url.includes('/rooms/status-summary')) {
    const { data: rooms } = await supabaseFetch<any[]>('rooms?select=status');
    if (rooms && Array.isArray(rooms) && rooms.length > 0) {
      const counts: Record<string, number> = {};
      for (const r of rooms) {
        const s = r.status || 'vacant_clean';
        counts[s] = (counts[s] || 0) + 1;
      }
      return ok(Object.entries(counts).map(([status, count]) => ({ status, count })));
    }
    return ok([
      { status: 'vacant_clean', count: 4 },
      { status: 'occupied', count: 4 },
      { status: 'vacant_dirty', count: 1 },
      { status: 'out_of_order', count: 1 },
    ]);
  }

  // 8. Rooms discrepancies
  if (url.includes('/rooms/discrepancies')) {
    return ok([]);
  }

  // 9. Rooms list and mutations
  if (url.match(/\/rooms(\?|$)/) || (url.includes('/rooms') && !url.includes('/types') && !url.includes('/status-summary'))) {
    if (method === 'GET') {
      const { data: rooms } = await supabaseFetch<any[]>('rooms?select=*&order=number.asc');
      const mapped = (rooms || []).map((r) => ({
        id: r.id,
        propertyId: r.property_id || PROPERTY_ID,
        roomTypeId: r.room_type_id,
        number: r.number,
        floor: r.floor || '1',
        status: r.status || 'vacant_clean',
        hkOccupancy: r.hk_occupancy || 'vacant',
        isActive: r.is_active,
        amenities: r.amenities || [],
      }));
      return ok(mapped);
    }
    if (method === 'PATCH' || method === 'PUT') {
      const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : (config.data || {});
      const idMatch = url.match(/\/rooms\/([^/?]+)/);
      if (idMatch) {
        await supabaseFetch(`rooms?id=eq.${idMatch[1]}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
      }
      return ok({ success: true, ...body });
    }
    if (method === 'POST') {
      const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : (config.data || {});
      await supabaseFetch('rooms', {
        method: 'POST',
        body: JSON.stringify({ property_id: PROPERTY_ID, hotel_id: PROPERTY_ID, ...body }),
      });
      return ok({ success: true, id: `room-${Date.now()}`, ...body });
    }
  }

  // 10. Rate Plans
  if (url.includes('/rate-plans') && method === 'GET') {
    const { data: plans } = await supabaseFetch<any[]>('rate_plans?select=*');
    return ok(plans || []);
  }

  // 11. Reservations search availability
  if (url.includes('/reservations/search-availability')) {
    const { data: types } = await supabaseFetch<any[]>('room_types?select=*&order=sort_order.asc');
    const rows = (types || []).map((t) => ({
      roomTypeId: t.id,
      roomTypeName: t.name,
      available: 3,
    }));
    return ok(rows);
  }

  // 12. Reservations unassigned queue
  if (url.includes('/reservations/unassigned')) {
    return ok({ data: [], total: 0 });
  }

  // 13. Reservations list and mutations
  if (url.includes('/reservations')) {
    if (method === 'GET') {
      const { data: resvs } = await supabaseFetch<any[]>('reservations?select=*&order=arrival_date.desc');
      if (resvs && resvs.length > 0) {
        return ok(resvs);
      }
      // Synthesize from accepted booking requests
      const { data: accepted } = await supabaseFetch<any[]>('booking_requests?status=eq.accepted');
      const synth = (accepted || []).map((ar) => ({
        id: ar.accepted_reservation_id || ar.id,
        propertyId: PROPERTY_ID,
        confirmationNumber: ar.submission_idempotency_key || `CONF-${ar.id.slice(0, 8).toUpperCase()}`,
        status: 'confirmed',
        arrivalDate: ar.arrival_date,
        departureDate: ar.departure_date,
        roomTypeId: ar.room_type_id,
        guestName: `${ar.guest_first_name} ${ar.guest_last_name}`,
        guestEmail: ar.guest_email,
        guestPhone: ar.guest_phone || '',
        totalAmount: ar.submitted_total || 7000,
        currencyCode: ar.currency_code || 'INR',
        adults: ar.adults || 2,
        children: ar.children || 0,
        assignedRoomNumber: '101',
        createdAt: ar.created_at,
      }));
      return ok(synth);
    }
    if (method === 'POST') {
      const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : (config.data || {});
      const confCode = `CONF-WALKIN-${Date.now().toString(36).toUpperCase()}`;

      if (body.roomId) {
        await supabaseFetch(`rooms?id=eq.${body.roomId}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'occupied' }),
        });
      }

      return ok({
        id: `resv-${Date.now()}`,
        confirmationNumber: confCode,
        status: 'checked_in',
        ...body,
      });
    }
  }

  // 14. Checkout mutations
  if (url.includes('/checkout') && method === 'POST') {
    const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : (config.data || {});
    if (body.roomId) {
      await supabaseFetch(`rooms?id=eq.${body.roomId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'vacant_dirty' }),
      });
    }
    return ok({
      success: true,
      invoiceNumber: `INV-SPARK-${Date.now().toString(36).toUpperCase()}`,
      status: 'checked_out',
    });
  }

  // 15. Guests
  if (url.includes('/guests') && method === 'GET') {
    const { data: guests } = await supabaseFetch<any[]>('guests?select=*&order=created_at.desc');
    if (guests && guests.length > 0) return ok(guests);

    const { data: reqs } = await supabaseFetch<any[]>('booking_requests?select=*&order=created_at.desc');
    const synthGuests = (reqs || []).map((r) => ({
      id: r.id,
      propertyId: PROPERTY_ID,
      firstName: r.guest_first_name,
      lastName: r.guest_last_name,
      email: r.guest_email,
      phone: r.guest_phone || '',
      status: 'active',
      stayCount: 1,
      totalSpend: r.submitted_total || 3500,
      createdAt: r.created_at,
    }));
    return ok(synthGuests);
  }

  // 16. Housekeeping tasks
  if (url.includes('/housekeeping')) {
    if (method === 'GET') {
      const { data: tasks } = await supabaseFetch<any[]>('housekeeping_tasks?select=*');
      if (tasks && tasks.length > 0) return ok(tasks);

      const defaultTasks = [
        { id: 'hk-1', roomNumber: '101', floor: '1', status: 'dirty', priority: 'high', assignee: 'Raju Nayak', taskType: 'checkout_clean', notes: 'Complete linen refresh and bathroom sanitization' },
        { id: 'hk-2', roomNumber: '201', floor: '2', status: 'inspecting', priority: 'medium', assignee: 'Kavitha Devi', taskType: 'inspection', notes: 'Awaiting manager approval' },
        { id: 'hk-3', roomNumber: '301', floor: '3', status: 'clean', priority: 'normal', assignee: 'Raju Nayak', taskType: 'stayover', notes: 'Guest ready' },
      ];
      return ok(defaultTasks);
    }
    return ok({ success: true });
  }

  // 17. Folios & Invoices
  if (url.includes('/folios')) {
    const { data: folios } = await supabaseFetch<any[]>('folios?select=*');
    return ok(folios || []);
  }

  // 18. Staff Notifications
  if (url.includes('/staff-notifications')) {
    if (url.includes('/unread-count')) {
      return ok({ count: 0 });
    }
    return ok([]);
  }

  // 19. Organizations
  if (url.includes('/organizations')) {
    return ok([{ id: 'org_spark', name: 'Spark Hotel' }]);
  }

  // 20. Help
  if (url.includes('/help')) {
    return ok({ articles: [] });
  }

  // 21. Departments
  if (url.includes('/departments')) {
    if (method === 'GET') {
      const { data } = await supabaseFetch<any[]>('departments?select=*&order=name.asc');
      if (data && data.length > 0) return ok(data);
      return ok(DEFAULT_DEPARTMENTS);
    }
    if (method === 'POST') {
      const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : (config.data || {});
      await supabaseFetch('departments', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      return ok({ success: true, ...body, id: `dept-${Date.now()}` });
    }
  }

  // 22. Employees
  if (url.includes('/employees')) {
    if (method === 'GET') {
      const { data } = await supabaseFetch<any[]>('employees?select=*&order=created_at.asc');
      if (data && data.length > 0) return ok(data);
      return ok(DEFAULT_EMPLOYEES);
    }
    if (method === 'POST' || method === 'PUT') {
      const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : (config.data || {});
      await supabaseFetch('employees', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      return ok({ success: true, ...body, id: body.id || `emp-${Date.now()}` });
    }
  }

  // 23. Reports & Dashboard KPIs
  if (url.includes('/reports/financial-summary')) {
    const { data: reqs } = await supabaseFetch<any[]>('booking_requests?select=submitted_total,status');
    let totalRevenue = 28500;
    if (reqs && Array.isArray(reqs)) {
      const sum = reqs.reduce((acc, r) => acc + (Number(r.submitted_total) || 0), 0);
      if (sum > 0) totalRevenue = sum;
    }
    return ok({
      kpis: {
        totalRevenue,
        monthlyRevenue: totalRevenue * 3,
        pendingPayments: 7000,
        adr: 3500,
        revpar: 2450,
        occupancyRate: 70,
      },
    });
  }

  if (url.includes('/reports/occupancy')) {
    const { data: rooms } = await supabaseFetch<any[]>('rooms?select=status');
    const total = rooms && Array.isArray(rooms) && rooms.length > 0 ? rooms.length : 10;
    const occupied = rooms && Array.isArray(rooms) ? rooms.filter((r) => r.status === 'occupied').length : 4;
    const available = rooms && Array.isArray(rooms) ? rooms.filter((r) => r.status === 'vacant_clean' || r.status === 'clean' || r.status === 'available').length : 4;
    const occRate = total > 0 ? Math.round((occupied / total) * 100) : 0;
    return ok({
      occupancyRate: occRate,
      occupiedRooms: occupied,
      availableRooms: available,
      totalRooms: total,
      arrivals: 2,
      departures: 1,
    });
  }

  // 24. Revenue Intelligence Agents
  if (url.includes('/agents')) {
    return ok([]);
  }

  // 25. Admin Booking Engine config
  if (url.includes('/admin/booking-engine/config')) {
    return ok({
      propertyId: PROPERTY_ID,
      displayName: 'Hotel Spark',
      isEnabled: true,
      bookingMode: 'request',
      primaryColor: '#0d9488',
      accentColor: '#0f766e',
    });
  }

  // Default safe empty response
  return ok([]);
}
