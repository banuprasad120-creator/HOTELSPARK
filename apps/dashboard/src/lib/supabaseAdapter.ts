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

const RATE_STORAGE_KEY = 'hotel_spark_rates_cache';

function getStoredRateCache(): Record<string, number> {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(RATE_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    }
  } catch (e) {
    void e;
  }
  return {};
}

function setStoredRate(key: string, price: number) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const cache = getStoredRateCache();
      cache[key] = price;
      window.localStorage.setItem(RATE_STORAGE_KEY, JSON.stringify(cache));
    }
  } catch (e) {
    void e;
  }
}

const ratePlanPriceCache: Record<string, number> = getStoredRateCache();

export interface StoredRoom {
  id: string;
  propertyId: string;
  roomTypeId: string;
  roomTypeName?: string;
  number: string;
  floor: string;
  status: string;
  hkOccupancy?: string;
  isActive: boolean;
  guestName?: string;
  isAccessible?: boolean;
  amenities: string[];
}

export const DEFAULT_ROOM_TYPES = [
  { id: 'b0000001-0000-4000-a000-000000000001', name: 'Deluxe King Room', code: 'DLX', description: 'Spacious king-size bed room with ensuite bath', max_occupancy: 2, default_occupancy: 2, bed_type: 'king', amenities: ['wifi', 'tv', 'ac', 'safe'], basePrice: 3500 },
  { id: 'b0000002-0000-4000-a000-000000000001', name: 'Executive Spark Suite', code: 'SUT', description: 'Luxurious suite with separate living room', max_occupancy: 4, default_occupancy: 2, bed_type: 'king', amenities: ['wifi', 'tv', 'ac', 'bathtub', 'minibar'], basePrice: 6500 },
  { id: 'b0000003-0000-4000-a000-000000000001', name: 'Standard Queen Room', code: 'STD', description: 'Cozy queen-size bed room', max_occupancy: 2, default_occupancy: 2, bed_type: 'queen', amenities: ['wifi', 'tv', 'ac'], basePrice: 2500 },
];

export const DEFAULT_ROOMS: StoredRoom[] = [
  // Floor 1 — Deluxe King Rooms (DLX - ₹3,500/night)
  {
    id: 'r0000101-0000-4000-a000-000000000001',
    propertyId: PROPERTY_ID,
    number: '101',
    floor: '1',
    roomTypeId: 'b0000001-0000-4000-a000-000000000001',
    roomTypeName: 'Deluxe King Room',
    status: 'occupied',
    guestName: 'Rahul Verma',
    hkOccupancy: 'occupied',
    isActive: true,
    amenities: ['wifi', 'tv', 'ac', 'safe', 'balcony'],
  },
  {
    id: 'r0000102-0000-4000-a000-000000000001',
    propertyId: PROPERTY_ID,
    number: '102',
    floor: '1',
    roomTypeId: 'b0000001-0000-4000-a000-000000000001',
    roomTypeName: 'Deluxe King Room',
    status: 'occupied',
    guestName: 'Priya Sharma',
    hkOccupancy: 'occupied',
    isActive: true,
    amenities: ['wifi', 'tv', 'ac', 'safe'],
  },
  {
    id: 'r0000103-0000-4000-a000-000000000001',
    propertyId: PROPERTY_ID,
    number: '103',
    floor: '1',
    roomTypeId: 'b0000001-0000-4000-a000-000000000001',
    roomTypeName: 'Deluxe King Room',
    status: 'vacant_clean',
    hkOccupancy: 'vacant',
    isActive: true,
    amenities: ['wifi', 'tv', 'ac', 'safe'],
  },
  {
    id: 'r0000104-0000-4000-a000-000000000001',
    propertyId: PROPERTY_ID,
    number: '104',
    floor: '1',
    roomTypeId: 'b0000001-0000-4000-a000-000000000001',
    roomTypeName: 'Deluxe King Room',
    status: 'vacant_dirty',
    hkOccupancy: 'vacant',
    isActive: true,
    amenities: ['wifi', 'tv', 'ac', 'safe'],
  },
  // Floor 2 — Executive Spark Suites (SUT - ₹6,500/night)
  {
    id: 'r0000201-0000-4000-a000-000000000001',
    propertyId: PROPERTY_ID,
    number: '201',
    floor: '2',
    roomTypeId: 'b0000002-0000-4000-a000-000000000001',
    roomTypeName: 'Executive Spark Suite',
    status: 'occupied',
    guestName: 'Vikram Malhotra',
    hkOccupancy: 'occupied',
    isActive: true,
    amenities: ['wifi', 'tv', 'ac', 'bathtub', 'minibar', 'balcony'],
  },
  {
    id: 'r0000202-0000-4000-a000-000000000001',
    propertyId: PROPERTY_ID,
    number: '202',
    floor: '2',
    roomTypeId: 'b0000002-0000-4000-a000-000000000001',
    roomTypeName: 'Executive Spark Suite',
    status: 'vacant_clean',
    hkOccupancy: 'vacant',
    isActive: true,
    amenities: ['wifi', 'tv', 'ac', 'bathtub', 'minibar'],
  },
  {
    id: 'r0000203-0000-4000-a000-000000000001',
    propertyId: PROPERTY_ID,
    number: '203',
    floor: '2',
    roomTypeId: 'b0000002-0000-4000-a000-000000000001',
    roomTypeName: 'Executive Spark Suite',
    status: 'out_of_order',
    hkOccupancy: 'vacant',
    isActive: true,
    amenities: ['wifi', 'tv', 'ac', 'bathtub'],
  },
  // Floor 3 — Standard Queen Rooms (STD - ₹2,500/night)
  {
    id: 'r0000301-0000-4000-a000-000000000001',
    propertyId: PROPERTY_ID,
    number: '301',
    floor: '3',
    roomTypeId: 'b0000003-0000-4000-a000-000000000001',
    roomTypeName: 'Standard Queen Room',
    status: 'occupied',
    guestName: 'Anita Rao',
    hkOccupancy: 'occupied',
    isActive: true,
    amenities: ['wifi', 'tv', 'ac'],
  },
  {
    id: 'r0000302-0000-4000-a000-000000000001',
    propertyId: PROPERTY_ID,
    number: '302',
    floor: '3',
    roomTypeId: 'b0000003-0000-4000-a000-000000000001',
    roomTypeName: 'Standard Queen Room',
    status: 'vacant_clean',
    hkOccupancy: 'vacant',
    isActive: true,
    amenities: ['wifi', 'tv', 'ac'],
  },
  {
    id: 'r0000303-0000-4000-a000-000000000001',
    propertyId: PROPERTY_ID,
    number: '303',
    floor: '3',
    roomTypeId: 'b0000003-0000-4000-a000-000000000001',
    roomTypeName: 'Standard Queen Room',
    status: 'vacant_clean',
    hkOccupancy: 'vacant',
    isActive: true,
    amenities: ['wifi', 'tv', 'ac'],
  },
];

const ROOMS_STORAGE_KEY = 'hotel_spark_rooms_list';

export function getStoredRooms(): StoredRoom[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(ROOMS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    }
  } catch (e) {
    void e;
  }
  return [...DEFAULT_ROOMS];
}

export function saveStoredRooms(rooms: StoredRoom[]) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(rooms));
    }
  } catch (e) {
    void e;
  }
}

export async function handleSupabaseAdapter(config: AxiosRequestConfig): Promise<AxiosResponse> {
  const rawUrl = config.url || '';
  const url = rawUrl.replace(/^\/api/, '');
  const method = (config.method || 'GET').toUpperCase();

  const ok = (data: any): AxiosResponse => ({
    data,
    status: 200,
    statusText: 'OK',
    headers: { 'content-type': 'application/json' },
    config: config as any,
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
    const rooms = getStoredRooms();
    const list = rooms
      .filter((r) => r.status === 'vacant_clean' || r.status === 'clean' || r.status === 'available')
      .map((r) => ({
        id: r.id,
        number: r.number,
        floor: r.floor || '1',
        status: r.status,
        roomTypeId: r.roomTypeId,
        roomTypeName: r.roomTypeName || 'Deluxe King Room',
        hkOccupancy: r.hkOccupancy || 'vacant',
      }));
    return ok(list);
  }

  // 3. Direct booking approve
  if (url.includes('/direct-bookings') && url.includes('/approve') && method === 'POST') {
    const idMatch = url.match(/\/direct-bookings\/([^/]+)\/approve/);
    const requestId = idMatch ? idMatch[1] : '';
    const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : (config.data || {});
    const roomId = body.roomId || '5aca9c61-49d7-42db-885c-58d30dfceac7';

    // 1. Mark booking request accepted in Supabase
    if (requestId) {
      await supabaseFetch(`booking_requests?id=eq.${requestId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'accepted',
          decided_at: new Date().toISOString(),
          decided_by: 'Hotel Spark Admin',
        }),
      });
    }

    // 2. Update room status to occupied in Supabase
    await supabaseFetch(`rooms?id=eq.${roomId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'occupied' }),
    });

    const confCode = `CONF-${Date.now().toString(36).toUpperCase()}`;

    // 3. Insert reservation in Supabase
    try {
      const { data: reqData } = await supabaseFetch<any[]>(`booking_requests?id=eq.${requestId}`);
      const req = reqData?.[0];
      if (req) {
        await supabaseFetch('reservations', {
          method: 'POST',
          body: JSON.stringify({
            hotel_id: PROPERTY_ID,
            property_id: PROPERTY_ID,
            arrival_date: req.arrival_date,
            departure_date: req.departure_date,
            room_type_id: req.room_type_id,
            room_id: roomId,
            status: 'confirmed',
            total_amount: req.submitted_total || 3920,
            currency_code: 'INR',
            adults: req.adults || 2,
            children: req.children || 0,
            special_requests: req.special_requests || '',
          }),
        });
      }
    } catch (e) {
      console.warn('Reservation sync error:', e);
    }

    return ok({
      success: true,
      roomNumber: '101',
      confirmationNumber: confCode,
    });
  }

  // 4. Direct booking reject
  if (url.includes('/direct-bookings') && (url.includes('/reject') || url.includes('/deny')) && method === 'POST') {
    const idMatch = url.match(/\/direct-bookings\/([^/]+)\/(?:reject|deny)/);
    const requestId = idMatch ? idMatch[1] : '';
    const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : (config.data || {});

    if (requestId) {
      await supabaseFetch(`booking_requests?id=eq.${requestId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'denied',
          denial_reason: body.reason || 'Requested dates unavailable',
          decided_at: new Date().toISOString(),
          decided_by: 'Hotel Spark Admin',
        }),
      });
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
  if (url.includes('/room-types') || url.includes('/rooms/types')) {
    if (method === 'GET') {
      const [typesResult, plansResult] = await Promise.all([
        supabaseFetch<any[]>('room_types?select=*&order=sort_order.asc'),
        supabaseFetch<any[]>('rate_plans?select=*'),
      ]);

      const plans = plansResult.data || [];
      const planPriceByRoomType: Record<string, number> = {};
      for (const p of plans) {
        if (p.room_type_id) {
          const cached = ratePlanPriceCache[p.id] ?? ratePlanPriceCache[p.room_type_id];
          planPriceByRoomType[p.room_type_id] = cached !== undefined ? cached : Number(p.base_amount || p.base_rate || 3500);
        }
      }

      const typesList = typesResult.data && typesResult.data.length > 0
        ? typesResult.data
        : [
            { id: 'b0000001-0000-4000-a000-000000000001', name: 'Deluxe King Room', code: 'DLX', description: 'Spacious king-size bed room with ensuite bath', max_occupancy: 2, bed_type: 'king', amenities: ['wifi', 'tv', 'ac', 'safe'] },
            { id: 'b0000002-0000-4000-a000-000000000001', name: 'Executive Spark Suite', code: 'SUT', description: 'Luxurious suite with separate living room', max_occupancy: 4, bed_type: 'king', amenities: ['wifi', 'tv', 'ac', 'bathtub', 'minibar'] },
            { id: 'b0000003-0000-4000-a000-000000000001', name: 'Standard Queen Room', code: 'STD', description: 'Cozy queen-size bed room', max_occupancy: 2, bed_type: 'queen', amenities: ['wifi', 'tv', 'ac'] },
          ];

      const mapped = typesList.map((t) => {
        const cached = ratePlanPriceCache[t.id];
        const defaultPrice = t.code === 'SUT' ? 6500 : t.code === 'STD' ? 2500 : 3500;
        const price = cached !== undefined ? cached : (planPriceByRoomType[t.id] ?? defaultPrice);
        return {
          id: t.id,
          roomTypeId: t.id,
          name: t.name,
          code: t.code,
          description: t.description || '',
          maxOccupancy: t.max_occupancy || 2,
          defaultOccupancy: t.default_occupancy || 2,
          bedType: t.bed_type || 'king',
          amenities: t.amenities || [],
          basePrice: price,
          baseAmount: price,
          price: price,
          sortOrder: t.sort_order || 1,
          isActive: t.is_active !== false,
        };
      });

      return ok(mapped);
    }

    if (method === 'PATCH' || method === 'PUT') {
      const idMatch = url.match(/(?:\/rooms\/types|\/room-types)\/([^/?]+)/);
      const typeId = idMatch ? idMatch[1] : '';
      const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : (config.data || {});

      if (typeId) {
        await supabaseFetch(`room_types?id=eq.${typeId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: body.name,
            description: body.description,
            max_occupancy: body.maxOccupancy,
            bed_type: body.bedType,
            amenities: body.amenities,
          }),
        });
      }
      return ok({ success: true, id: typeId, ...body });
    }

    if (method === 'POST') {
      const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : (config.data || {});
      const newId = `b${Date.now().toString().slice(-7)}-0000-4000-a000-000000000001`;
      await supabaseFetch('room_types', {
        method: 'POST',
        body: JSON.stringify({
          id: newId,
          property_id: PROPERTY_ID,
          hotel_id: PROPERTY_ID,
          name: body.name,
          code: body.code,
          description: body.description,
          max_occupancy: body.maxOccupancy || 2,
          bed_type: body.bedType || 'king',
          amenities: body.amenities || [],
        }),
      });

      return ok({ success: true, id: newId, ...body });
    }
  }

  // 7. Rooms status summary
  if (url.includes('/rooms/status-summary')) {
    const rooms = getStoredRooms();
    const counts: Record<string, number> = {};
    for (const r of rooms) {
      const s = r.status || 'vacant_clean';
      counts[s] = (counts[s] || 0) + 1;
    }
    return ok(Object.entries(counts).map(([status, count]) => ({ status, count })));
  }

  // 8. Rooms discrepancies
  if (url.includes('/rooms/discrepancies')) {
    return ok([]);
  }

  // 8b. Rooms by status (e.g. /rooms/by-status?status=guest_ready)
  if (url.includes('/rooms/by-status')) {
    const rooms = getStoredRooms();
    const urlObj = new URL(url, 'http://localhost');
    const reqStatus = (urlObj.searchParams.get('status') || '').toLowerCase();
    const filtered = reqStatus
      ? rooms.filter((r) => {
          if (reqStatus === 'guest_ready' || reqStatus === 'available') {
            return r.status === 'guest_ready' || r.status === 'vacant_clean' || r.status === 'clean' || r.status === 'available';
          }
          return r.status.toLowerCase() === reqStatus;
        })
      : rooms;
    return ok(filtered);
  }

  // 9. Rooms list and mutations
  if (url.match(/\/rooms(\?|$)/) || (url.includes('/rooms') && !url.includes('/types') && !url.includes('/status-summary') && !url.includes('/discrepancies') && !url.includes('/by-status'))) {
    if (method === 'GET') {
      const stored = getStoredRooms();
      const statusFilter = (config.params?.status || '').toLowerCase();
      let result = stored;
      if (statusFilter) {
        if (statusFilter === 'available' || statusFilter === 'guest_ready') {
          result = stored.filter((r) => r.status === 'guest_ready' || r.status === 'vacant_clean' || r.status === 'clean' || r.status === 'available');
        } else {
          result = stored.filter((r) => r.status.toLowerCase() === statusFilter);
        }
      }

      try {
        const { data: remoteRooms } = await supabaseFetch<any[]>('rooms?select=*&order=number.asc');
        if (remoteRooms && Array.isArray(remoteRooms) && remoteRooms.length > 0) {
          const merged = [...stored];
          for (const rem of remoteRooms) {
            const idx = merged.findIndex((m) => m.id === rem.id || m.number === rem.number);
            const mappedRoom: StoredRoom = {
              id: rem.id,
              propertyId: rem.property_id || PROPERTY_ID,
              roomTypeId: rem.room_type_id || DEFAULT_ROOM_TYPES[0].id,
              roomTypeName: DEFAULT_ROOM_TYPES.find((t) => t.id === rem.room_type_id)?.name || 'Deluxe King Room',
              number: rem.number,
              floor: rem.floor || '1',
              status: rem.status || 'vacant_clean',
              hkOccupancy: rem.hk_occupancy || 'vacant',
              isActive: rem.is_active !== false,
              amenities: rem.amenities || ['wifi', 'tv', 'ac'],
            };
            if (idx >= 0) {
              merged[idx] = { ...merged[idx], ...mappedRoom };
            } else {
              merged.push(mappedRoom);
            }
          }
          saveStoredRooms(merged);
          let filteredMerged = merged;
          if (statusFilter) {
            if (statusFilter === 'available' || statusFilter === 'guest_ready') {
              filteredMerged = merged.filter((r) => r.status === 'guest_ready' || r.status === 'vacant_clean' || r.status === 'clean' || r.status === 'available');
            } else {
              filteredMerged = merged.filter((r) => r.status.toLowerCase() === statusFilter);
            }
          }
          return ok(filteredMerged);
        }
      } catch (err) {
        void err;
      }
      return ok(result);
    }

    if (method === 'PATCH' || method === 'PUT') {
      const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : (config.data || {});
      const idMatch = url.match(/\/rooms\/([^/?]+)/);
      const roomId = idMatch ? idMatch[1] : '';
      const rooms = getStoredRooms();
      const idx = rooms.findIndex((r) => r.id === roomId || r.number === roomId);

      if (idx >= 0) {
        if (body.status) rooms[idx].status = body.status;
        if (body.floor) rooms[idx].floor = String(body.floor);
        if (body.roomTypeId || body.room_type_id) {
          const rtId = body.roomTypeId || body.room_type_id;
          rooms[idx].roomTypeId = rtId;
          const matchedType = DEFAULT_ROOM_TYPES.find((t) => t.id === rtId);
          if (matchedType) rooms[idx].roomTypeName = matchedType.name;
        }
        if (body.amenities) rooms[idx].amenities = body.amenities;
        if (body.guestName !== undefined) rooms[idx].guestName = body.guestName;
        saveStoredRooms(rooms);
      }

      if (roomId) {
        try {
          const supabasePayload: Record<string, any> = {};
          if (body.status) supabasePayload.status = body.status;
          if (body.floor) supabasePayload.floor = body.floor;
          if (body.roomTypeId || body.room_type_id) supabasePayload.room_type_id = body.roomTypeId || body.room_type_id;
          if (body.amenities) supabasePayload.amenities = body.amenities;
          if (Object.keys(supabasePayload).length > 0) {
            await supabaseFetch(`rooms?id=eq.${roomId}`, {
              method: 'PATCH',
              body: JSON.stringify(supabasePayload),
            });
          }
        } catch (err) {
          void err;
        }
      }

      return ok({ success: true, ...(idx >= 0 ? rooms[idx] : body) });
    }

    if (method === 'POST') {
      const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : (config.data || {});
      const rooms = getStoredRooms();
      const roomNumber = String(body.number || '').trim();
      const roomTypeId = body.roomTypeId || body.room_type_id || DEFAULT_ROOM_TYPES[0].id;
      const floor = String(body.floor || (roomNumber.length >= 3 ? roomNumber[0] : '1'));
      const status = body.status || 'vacant_clean';
      const amenities = Array.isArray(body.amenities) && body.amenities.length > 0 ? body.amenities : ['wifi', 'tv', 'ac'];
      const matchedType = DEFAULT_ROOM_TYPES.find((t) => t.id === roomTypeId);
      const roomTypeName = matchedType ? matchedType.name : (body.roomTypeName || 'Deluxe King Room');

      const newId = body.id || `r${Date.now().toString().slice(-7)}-0000-4000-a000-000000000001`;

      const newRoom: StoredRoom = {
        id: newId,
        propertyId: PROPERTY_ID,
        roomTypeId,
        roomTypeName,
        number: roomNumber,
        floor,
        status,
        hkOccupancy: 'vacant',
        isActive: true,
        amenities,
      };

      const existingIdx = rooms.findIndex((r) => r.number.toLowerCase() === roomNumber.toLowerCase());
      if (existingIdx >= 0) {
        rooms[existingIdx] = { ...rooms[existingIdx], ...newRoom };
      } else {
        rooms.push(newRoom);
      }
      saveStoredRooms(rooms);

      try {
        await supabaseFetch('rooms', {
          method: 'POST',
          body: JSON.stringify({
            id: newId,
            property_id: PROPERTY_ID,
            hotel_id: PROPERTY_ID,
            room_type_id: roomTypeId,
            number: roomNumber,
            floor,
            status,
            amenities,
            is_active: true,
          }),
        });
      } catch (err) {
        void err;
      }

      return ok(newRoom);
    }

    if (method === 'DELETE') {
      const idMatch = url.match(/\/rooms\/([^/?]+)/);
      const roomId = idMatch ? idMatch[1] : '';
      if (roomId) {
        const rooms = getStoredRooms();
        const filtered = rooms.filter((r) => r.id !== roomId && r.number !== roomId);
        saveStoredRooms(filtered);
        try {
          await supabaseFetch(`rooms?id=eq.${roomId}`, { method: 'DELETE' });
        } catch (err) {
          void err;
        }
      }
      return ok({ success: true, message: 'Room deleted' });
    }
  }

  // 10. Rate Plans
  if (url.includes('/rate-plans')) {
    if (method === 'GET') {
      const { data: plans } = await supabaseFetch<any[]>('rate_plans?select=*');
      const defaultPlans = [
        { id: 'c0000001-0000-4000-a000-000000000001', room_type_id: 'b0000001-0000-4000-a000-000000000001', name: 'Deluxe Best Flexible Rate', code: 'BAR-DLX', type: 'bar', base_amount: 3500, base_rate: 3500, currency_code: 'INR' },
        { id: 'c0000002-0000-4000-a000-000000000001', room_type_id: 'b0000002-0000-4000-a000-000000000001', name: 'Suite Best Flexible Rate', code: 'BAR-SUT', type: 'bar', base_amount: 6500, base_rate: 6500, currency_code: 'INR' },
        { id: 'c0000003-0000-4000-a000-000000000001', room_type_id: 'b0000003-0000-4000-a000-000000000001', name: 'Standard Best Flexible Rate', code: 'BAR-STD', type: 'bar', base_amount: 2500, base_rate: 2500, currency_code: 'INR' },
      ];
      const list = plans && plans.length > 0 ? plans : defaultPlans;
      const mapped = list.map((p) => {
        const cached = ratePlanPriceCache[p.id] ?? (p.room_type_id ? ratePlanPriceCache[p.room_type_id] : undefined);
        const price = cached !== undefined ? cached : Number(p.base_amount || p.base_rate || 3500);
        return {
          id: p.id,
          roomTypeId: p.room_type_id,
          room_type_id: p.room_type_id,
          name: p.name,
          code: p.code,
          type: p.type || 'bar',
          baseAmount: price,
          baseRate: price,
          base_amount: price,
          base_rate: price,
          currencyCode: p.currency_code || 'INR',
          isActive: p.is_active !== false,
        };
      });
      return ok(mapped);
    }

    if (method === 'PATCH' || method === 'PUT') {
      const idMatch = url.match(/\/rate-plans\/([^/?]+)/);
      const planId = idMatch ? idMatch[1] : '';
      const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : (config.data || {});
      const newPrice = Number(body.baseAmount || body.baseRate || body.base_amount || body.base_rate);

      if (!isNaN(newPrice) && newPrice > 0) {
        if (planId) {
          ratePlanPriceCache[planId] = newPrice;
          setStoredRate(planId, newPrice);
        }
        if (body.roomTypeId || body.room_type_id) {
          const rtId = body.roomTypeId || body.room_type_id;
          ratePlanPriceCache[rtId] = newPrice;
          setStoredRate(rtId, newPrice);
          await supabaseFetch(`rate_plans?room_type_id=eq.${rtId}`, {
            method: 'PATCH',
            headers: { Prefer: 'return=representation' },
            body: JSON.stringify({
              base_amount: newPrice,
              base_rate: newPrice,
            }),
          });
        }
        if (planId) {
          await supabaseFetch(`rate_plans?id=eq.${planId}`, {
            method: 'PATCH',
            headers: { Prefer: 'return=representation' },
            body: JSON.stringify({
              base_amount: newPrice,
              base_rate: newPrice,
            }),
          });
        }
      }
      return ok({ success: true, id: planId, baseAmount: newPrice, baseRate: newPrice, ...body });
    }

    if (method === 'POST') {
      const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : (config.data || {});
      const newId = `c${Date.now().toString().slice(-7)}-0000-4000-a000-000000000001`;
      const price = Number(body.baseAmount || body.baseRate || 3500);

      ratePlanPriceCache[newId] = price;
      setStoredRate(newId, price);
      if (body.roomTypeId || body.room_type_id) {
        ratePlanPriceCache[body.roomTypeId || body.room_type_id] = price;
        setStoredRate(body.roomTypeId || body.room_type_id, price);
      }

      await supabaseFetch('rate_plans', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          id: newId,
          property_id: PROPERTY_ID,
          hotel_id: PROPERTY_ID,
          room_type_id: body.roomTypeId || body.room_type_id,
          name: body.name || 'BAR Rate',
          code: body.code || 'BAR',
          type: body.type || 'bar',
          base_amount: price,
          base_rate: price,
          currency_code: 'INR',
        }),
      });
      return ok({ success: true, id: newId, ...body });
    }
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

  // 13. Reservations list and mutations (Unified with online booking requests)
  if (url.includes('/reservations')) {
    if (method === 'GET') {
      const [resvsResult, reqsResult, roomsResult] = await Promise.all([
        supabaseFetch<any[]>('reservations?select=*&order=arrival_date.desc'),
        supabaseFetch<any[]>('booking_requests?select=*&order=created_at.desc'),
        supabaseFetch<any[]>('rooms?select=id,number,room_type_id'),
      ]);

      const storedRooms = getStoredRooms();
      const roomsMap = new Map([
        ...storedRooms.map((rm) => [rm.id, rm.number] as [string, string]),
        ...((roomsResult.data || []).map((rm: any) => [rm.id, rm.number] as [string, string])),
      ]);
      const list: any[] = [];

      // 1. Merge booking requests from website
      for (const b of (reqsResult.data || [])) {
        if (b.status === 'denied') continue;
        const rt = ROOM_TYPE_NAMES[b.room_type_id] || { name: 'Deluxe King Room', code: 'DLX' };
        list.push({
          id: b.id,
          propertyId: b.property_id || PROPERTY_ID,
          confirmationNumber: b.submission_idempotency_key || `SPARK-${b.id.slice(0, 8).toUpperCase()}`,
          status: b.status === 'accepted' ? 'confirmed' : 'pending',
          arrivalDate: b.arrival_date,
          departureDate: b.departure_date,
          roomId: b.status === 'accepted' ? '5aca9c61-49d7-42db-885c-58d30dfceac7' : undefined,
          roomNumber: b.status === 'accepted' ? '101' : 'Unassigned (Website)',
          roomTypeId: b.room_type_id,
          roomTypeName: rt.name,
          guestName: `${b.guest_first_name} ${b.guest_last_name}`,
          guest: {
            firstName: b.guest_first_name,
            lastName: b.guest_last_name,
            email: b.guest_email,
            phone: b.guest_phone || '',
          },
          guestEmail: b.guest_email,
          guestPhone: b.guest_phone || '',
          totalAmount: b.submitted_total || 3920,
          currencyCode: b.currency_code || 'INR',
          adults: b.adults || 2,
          children: b.children || 0,
          source: 'WEBSITE',
          specialRequests: b.special_requests || '',
          createdAt: b.created_at,
        });
      }

      // 2. Merge database reservations
      for (const r of (resvsResult.data || [])) {
        const rt = ROOM_TYPE_NAMES[r.room_type_id] || { name: 'Deluxe King Room', code: 'DLX' };
        list.push({
          id: r.id,
          propertyId: r.property_id || PROPERTY_ID,
          confirmationNumber: r.booking_id ? `CONF-${r.booking_id.slice(0, 8).toUpperCase()}` : `CONF-${r.id.slice(0, 8).toUpperCase()}`,
          status: r.status || 'confirmed',
          arrivalDate: r.arrival_date,
          departureDate: r.departure_date,
          roomId: r.room_id,
          roomNumber: roomsMap.get(r.room_id) || '101',
          roomTypeId: r.room_type_id,
          roomTypeName: rt.name,
          guestName: 'Banu Prasad',
          guest: { firstName: 'Banu', lastName: 'Prasad', email: 'banu.prasad0607@gmail.com', phone: '+91 98765 43210' },
          totalAmount: r.total_amount || 7000,
          currencyCode: r.currency_code || 'INR',
          adults: r.adults || 2,
          children: r.children || 0,
          source: 'WALK_IN',
          createdAt: r.created_at,
        });
      }

      let filtered = list;

      // Filter by status if specified
      if (config.params?.status) {
        filtered = filtered.filter((r) => r.status === config.params.status);
      }

      // If Front Desk is looking for today's arrivals (arrivalDateFrom == arrivalDateTo == today)
      // include both today's arrivals AND pending website bookings so staff never misses them!
      if (config.params?.arrivalDateFrom && config.params?.arrivalDateTo) {
        const from = config.params.arrivalDateFrom;
        const to = config.params.arrivalDateTo;
        filtered = filtered.filter(
          (r) =>
            (r.arrivalDate >= from && r.arrivalDate <= to) ||
            r.source === 'WEBSITE',
        );
      }

      return ok(filtered);
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
    const rooms = getStoredRooms();
    const total = rooms.length;
    const occupied = rooms.filter((r) => r.status === 'occupied').length;
    const available = rooms.filter((r) => r.status === 'vacant_clean' || r.status === 'clean' || r.status === 'available').length;
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
