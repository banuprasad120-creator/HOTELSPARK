import { supabaseFetch } from './supabase';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';

const PROPERTY_ID = 'a0000001-0000-4000-a000-000000000001';

const DEFAULT_PROPERTY = {
  id: PROPERTY_ID,
  name: 'Hotel Spark',
  code: 'SPARK01',
  address: 'Near Old Bus Stand, Jagtial Road, Karimnagar, Telangana 505001',
  countryCode: 'IN',
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
  { id: 'e0000001-0000-4000-a000-000000000001', employeeId: 'EMP-SPARK-001', name: 'Banu Prasad (Owner)', mobile: '+91 98765 43210', email: 'admin@sparkhotel.com', designation: 'Hotel Owner / Managing Director', role: 'Hotel Admin / Owner', departmentName: 'Management', salary: 150000, status: 'active', joiningDate: '2025-01-01', shift: 'morning' },
  { id: 'e0000002-0000-4000-a000-000000000001', employeeId: 'EMP-SPARK-002', name: 'Ramesh Rao', mobile: '+91 98765 43211', email: 'frontdesk.mgr@sparkhotel.com', designation: 'Front Office Manager', role: 'Front Office Manager', departmentName: 'Front Office', salary: 60000, status: 'active', joiningDate: '2025-02-01', shift: 'morning' },
  { id: 'e0000003-0000-4000-a000-000000000001', employeeId: 'EMP-SPARK-003', name: 'Priya Sharma', mobile: '+91 98765 43212', email: 'reception1@sparkhotel.com', designation: 'Senior Receptionist', role: 'Receptionist', departmentName: 'Front Office', salary: 35000, status: 'active', joiningDate: '2025-03-15', shift: 'evening' },
  { id: 'e0000004-0000-4000-a000-000000000001', employeeId: 'EMP-SPARK-004', name: 'Kavitha Devi', mobile: '+91 98765 43213', email: 'hk.mgr@sparkhotel.com', designation: 'Housekeeping Manager', role: 'Housekeeping Manager', departmentName: 'Housekeeping', salary: 45000, status: 'active', joiningDate: '2025-02-10', shift: 'morning' },
  { id: 'e0000005-0000-4000-a000-000000000001', employeeId: 'EMP-SPARK-005', name: 'Sunil Kumar', mobile: '+91 98765 43214', email: 'accounts@sparkhotel.com', designation: 'Hotel Accountant', role: 'Accountant', departmentName: 'Accounts', salary: 50000, status: 'active', joiningDate: '2025-01-15', shift: 'general' },
  { id: 'e0000006-0000-4000-a000-000000000001', employeeId: 'EMP-SPARK-006', name: 'Raju Nayak', mobile: '+91 98765 43215', email: 'hk.staff1@sparkhotel.com', designation: 'Housekeeping Supervisor', role: 'Housekeeping Staff', departmentName: 'Housekeeping', salary: 25000, status: 'active', joiningDate: '2025-04-01', shift: 'night' },
  { id: 'e0000007-0000-4000-a000-000000000001', employeeId: 'EMP-SPARK-007', name: 'Satish Reddy', mobile: '+91 98765 43216', email: 'maintenance@sparkhotel.com', designation: 'Chief Maintenance Technician', role: 'Maintenance Staff', departmentName: 'Maintenance', salary: 32000, status: 'active', joiningDate: '2025-02-01', shift: 'evening' },
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

export interface RoomCategoryTariff {
  id: string;
  name: string;
  code: string;
  description: string;
  singleOccupancyPrice: number | null;
  doubleOccupancyPrice: number | null;
  maxOccupancy: number;
  assignedRoomsCount: number;
  amenities: string[];
}

export interface HotelTariffConfig {
  totalRooms: number;
  extraPersonCharge: number;
  gstPercentage: number;
  isTaxInclusive: boolean;
  childrenPolicy: string;
  cancellationPolicy: string;
  paymentPolicy: string;
  categories: RoomCategoryTariff[];
}

export const TARIFF_CONFIG_STORAGE_KEY = 'hotel_spark_tariff_config';

export const DEFAULT_TARIFF_CONFIG: HotelTariffConfig = {
  totalRooms: 28,
  extraPersonCharge: 399,
  gstPercentage: 12,
  isTaxInclusive: true,
  childrenPolicy: 'Children below 7 years: Free stay without an extra bed.',
  cancellationPolicy: 'No cancellation policy for room reservations.',
  paymentPolicy: 'All major credit/debit cards (Visa, MasterCard, RuPay), UPI & Cash accepted.',
  categories: [
    {
      id: 'b0000001-0000-4000-a000-000000000001',
      name: 'Budget Room',
      code: 'BGT',
      description: 'Comfortable compact room optimized for single traveler convenience with essential amenities.',
      singleOccupancyPrice: 1599,
      doubleOccupancyPrice: null,
      maxOccupancy: 1,
      assignedRoomsCount: 6,
      amenities: ['wifi', 'tv', 'ac', 'room_service'],
    },
    {
      id: 'b0000002-0000-4000-a000-000000000002',
      name: 'Deluxe Room',
      code: 'DLX',
      description: 'Elegant deluxe room with plush bedding, dedicated workspace, and private ensuite bath.',
      singleOccupancyPrice: 1799,
      doubleOccupancyPrice: 2099,
      maxOccupancy: 2,
      assignedRoomsCount: 10,
      amenities: ['wifi', 'tv', 'ac', 'safe', 'tea_maker', 'balcony'],
    },
    {
      id: 'b0000003-0000-4000-a000-000000000003',
      name: 'Executive Room',
      code: 'EXE',
      description: 'Sophisticated executive room featuring panoramic views, ergonomic desk and seating area.',
      singleOccupancyPrice: 2199,
      doubleOccupancyPrice: 2499,
      maxOccupancy: 3,
      assignedRoomsCount: 8,
      amenities: ['wifi', 'tv', 'ac', 'safe', 'minibar', 'city_view'],
    },
    {
      id: 'b0000004-0000-4000-a000-000000000004',
      name: 'Suite',
      code: 'SUT',
      description: 'Spacious signature suite featuring a master bedroom, living hall, luxury bathtub and pantry.',
      singleOccupancyPrice: null,
      doubleOccupancyPrice: 2799,
      maxOccupancy: 4,
      assignedRoomsCount: 4,
      amenities: ['wifi', 'tv', 'ac', 'safe', 'minibar', 'living_area', 'bathtub'],
    },
  ],
};

export const DEFAULT_ROOM_TYPES = DEFAULT_TARIFF_CONFIG.categories.map((c) => ({
  id: c.id,
  name: c.name,
  code: c.code,
  description: c.description,
  max_occupancy: c.maxOccupancy,
  default_occupancy: c.singleOccupancyPrice ? 1 : 2,
  bed_type: c.code === 'SUT' ? 'king' : c.code === 'EXE' ? 'queen' : c.code === 'DLX' ? 'double' : 'single',
  amenities: c.amenities,
  basePrice: c.doubleOccupancyPrice || c.singleOccupancyPrice || 1799,
  singlePrice: c.singleOccupancyPrice,
  doublePrice: c.doubleOccupancyPrice,
  roomCount: c.assignedRoomsCount,
}));

export const DEFAULT_ROOMS: StoredRoom[] = [
  // Floor 1 (14 Rooms: 101 to 114)
  // Budget Rooms (6 Rooms: 101-106, Single ₹1,599)
  {
    id: 'r0000101-0000-4000-a000-000000000001',
    propertyId: PROPERTY_ID,
    number: '101',
    floor: '1',
    roomTypeId: 'b0000001-0000-4000-a000-000000000001',
    roomTypeName: 'Budget Room',
    status: 'vacant_clean',
    hkOccupancy: 'vacant',
    isActive: true,
    amenities: ['wifi', 'tv', 'ac', 'room_service'],
  },
  {
    id: 'r0000102-0000-4000-a000-000000000001',
    propertyId: PROPERTY_ID,
    number: '102',
    floor: '1',
    roomTypeId: 'b0000001-0000-4000-a000-000000000001',
    roomTypeName: 'Budget Room',
    status: 'occupied',
    guestName: 'Banu Prasad',
    hkOccupancy: 'occupied',
    isActive: true,
    amenities: ['wifi', 'tv', 'ac', 'room_service'],
  },
  {
    id: 'r0000103-0000-4000-a000-000000000001',
    propertyId: PROPERTY_ID,
    number: '103',
    floor: '1',
    roomTypeId: 'b0000001-0000-4000-a000-000000000001',
    roomTypeName: 'Budget Room',
    status: 'vacant_clean',
    hkOccupancy: 'vacant',
    isActive: true,
    amenities: ['wifi', 'tv', 'ac', 'room_service'],
  },
  {
    id: 'r0000104-0000-4000-a000-000000000001',
    propertyId: PROPERTY_ID,
    number: '104',
    floor: '1',
    roomTypeId: 'b0000001-0000-4000-a000-000000000001',
    roomTypeName: 'Budget Room',
    status: 'vacant_dirty',
    hkOccupancy: 'vacant',
    isActive: true,
    amenities: ['wifi', 'tv', 'ac', 'room_service'],
  },
  {
    id: 'r0000105-0000-4000-a000-000000000001',
    propertyId: PROPERTY_ID,
    number: '105',
    floor: '1',
    roomTypeId: 'b0000001-0000-4000-a000-000000000001',
    roomTypeName: 'Budget Room',
    status: 'booked',
    guestName: 'Kiran Kumar',
    hkOccupancy: 'vacant',
    isActive: true,
    amenities: ['wifi', 'tv', 'ac', 'room_service'],
  },
  {
    id: 'r0000106-0000-4000-a000-000000000001',
    propertyId: PROPERTY_ID,
    number: '106',
    floor: '1',
    roomTypeId: 'b0000001-0000-4000-a000-000000000001',
    roomTypeName: 'Budget Room',
    status: 'vacant_clean',
    hkOccupancy: 'vacant',
    isActive: true,
    amenities: ['wifi', 'tv', 'ac', 'room_service'],
  },
  // Deluxe Rooms (Floor 1: Rooms 107-114, 8 Rooms, Single ₹1,799 / Double ₹2,099)
  {
    id: 'r0000107-0000-4000-a000-000000000001',
    propertyId: PROPERTY_ID,
    number: '107',
    floor: '1',
    roomTypeId: 'b0000002-0000-4000-a000-000000000002',
    roomTypeName: 'Deluxe Room',
    status: 'occupied',
    guestName: 'Rahul Verma',
    hkOccupancy: 'occupied',
    isActive: true,
    amenities: ['wifi', 'tv', 'ac', 'safe', 'tea_maker', 'balcony'],
  },
  {
    id: 'r0000108-0000-4000-a000-000000000001',
    propertyId: PROPERTY_ID,
    number: '108',
    floor: '1',
    roomTypeId: 'b0000002-0000-4000-a000-000000000002',
    roomTypeName: 'Deluxe Room',
    status: 'occupied',
    guestName: 'Priya Sharma',
    hkOccupancy: 'occupied',
    isActive: true,
    amenities: ['wifi', 'tv', 'ac', 'safe', 'tea_maker'],
  },
  {
    id: 'r0000109-0000-4000-a000-000000000001',
    propertyId: PROPERTY_ID,
    number: '109',
    floor: '1',
    roomTypeId: 'b0000002-0000-4000-a000-000000000002',
    roomTypeName: 'Deluxe Room',
    status: 'vacant_clean',
    hkOccupancy: 'vacant',
    isActive: true,
    amenities: ['wifi', 'tv', 'ac', 'safe', 'tea_maker'],
  },
  {
    id: 'r0000110-0000-4000-a000-000000000001',
    propertyId: PROPERTY_ID,
    number: '110',
    floor: '1',
    roomTypeId: 'b0000002-0000-4000-a000-000000000002',
    roomTypeName: 'Deluxe Room',
    status: 'vacant_clean',
    hkOccupancy: 'vacant',
    isActive: true,
    amenities: ['wifi', 'tv', 'ac', 'safe', 'tea_maker'],
  },
  {
    id: 'r0000111-0000-4000-a000-000000000001',
    propertyId: PROPERTY_ID,
    number: '111',
    floor: '1',
    roomTypeId: 'b0000002-0000-4000-a000-000000000002',
    roomTypeName: 'Deluxe Room',
    status: 'vacant_dirty',
    hkOccupancy: 'vacant',
    isActive: true,
    amenities: ['wifi', 'tv', 'ac', 'safe', 'tea_maker'],
  },
  {
    id: 'r0000112-0000-4000-a000-000000000001',
    propertyId: PROPERTY_ID,
    number: '112',
    floor: '1',
    roomTypeId: 'b0000002-0000-4000-a000-000000000002',
    roomTypeName: 'Deluxe Room',
    status: 'booked',
    guestName: 'Naveen Reddy',
    hkOccupancy: 'vacant',
    isActive: true,
    amenities: ['wifi', 'tv', 'ac', 'safe', 'tea_maker'],
  },
  {
    id: 'r0000113-0000-4000-a000-000000000001',
    propertyId: PROPERTY_ID,
    number: '113',
    floor: '1',
    roomTypeId: 'b0000002-0000-4000-a000-000000000002',
    roomTypeName: 'Deluxe Room',
    status: 'vacant_clean',
    hkOccupancy: 'vacant',
    isActive: true,
    amenities: ['wifi', 'tv', 'ac', 'safe', 'tea_maker'],
  },
  {
    id: 'r0000114-0000-4000-a000-000000000001',
    propertyId: PROPERTY_ID,
    number: '114',
    floor: '1',
    roomTypeId: 'b0000002-0000-4000-a000-000000000002',
    roomTypeName: 'Deluxe Room',
    status: 'vacant_clean',
    hkOccupancy: 'vacant',
    isActive: true,
    amenities: ['wifi', 'tv', 'ac', 'safe', 'tea_maker'],
  },

  // Floor 2 (14 Rooms: 201 to 214)
  // Deluxe Rooms (2 more Rooms: 201-202, Total 10 Deluxe)
  {
    id: 'r0000201-0000-4000-a000-000000000001',
    propertyId: PROPERTY_ID,
    number: '201',
    floor: '2',
    roomTypeId: 'b0000002-0000-4000-a000-000000000002',
    roomTypeName: 'Deluxe Room',
    status: 'occupied',
    guestName: 'Vikram Malhotra',
    hkOccupancy: 'occupied',
    isActive: true,
    amenities: ['wifi', 'tv', 'ac', 'safe', 'tea_maker', 'balcony'],
  },
  {
    id: 'r0000202-0000-4000-a000-000000000001',
    propertyId: PROPERTY_ID,
    number: '202',
    floor: '2',
    roomTypeId: 'b0000002-0000-4000-a000-000000000002',
    roomTypeName: 'Deluxe Room',
    status: 'vacant_clean',
    hkOccupancy: 'vacant',
    isActive: true,
    amenities: ['wifi', 'tv', 'ac', 'safe', 'tea_maker'],
  },
  // Executive Rooms (8 Rooms: 203 to 210, Single ₹2,199 / Double ₹2,499)
  {
    id: 'r0000203-0000-4000-a000-000000000001',
    propertyId: PROPERTY_ID,
    number: '203',
    floor: '2',
    roomTypeId: 'b0000003-0000-4000-a000-000000000003',
    roomTypeName: 'Executive Room',
    status: 'occupied',
    guestName: 'Anita Rao',
    hkOccupancy: 'occupied',
    isActive: true,
    amenities: ['wifi', 'tv', 'ac', 'safe', 'minibar', 'city_view'],
  },
  {
    id: 'r0000204-0000-4000-a000-000000000001',
    propertyId: PROPERTY_ID,
    number: '204',
    floor: '2',
    roomTypeId: 'b0000003-0000-4000-a000-000000000003',
    roomTypeName: 'Executive Room',
    status: 'vacant_clean',
    hkOccupancy: 'vacant',
    isActive: true,
    amenities: ['wifi', 'tv', 'ac', 'safe', 'minibar'],
  },
  {
    id: 'r0000205-0000-4000-a000-000000000001',
    propertyId: PROPERTY_ID,
    number: '205',
    floor: '2',
    roomTypeId: 'b0000003-0000-4000-a000-000000000003',
    roomTypeName: 'Executive Room',
    status: 'booked',
    guestName: 'Deepak Joshi',
    hkOccupancy: 'vacant',
    isActive: true,
    amenities: ['wifi', 'tv', 'ac', 'safe', 'minibar'],
  },
  {
    id: 'r0000206-0000-4000-a000-000000000001',
    propertyId: PROPERTY_ID,
    number: '206',
    floor: '2',
    roomTypeId: 'b0000003-0000-4000-a000-000000000003',
    roomTypeName: 'Executive Room',
    status: 'vacant_clean',
    hkOccupancy: 'vacant',
    isActive: true,
    amenities: ['wifi', 'tv', 'ac', 'safe', 'minibar'],
  },
  {
    id: 'r0000207-0000-4000-a000-000000000001',
    propertyId: PROPERTY_ID,
    number: '207',
    floor: '2',
    roomTypeId: 'b0000003-0000-4000-a000-000000000003',
    roomTypeName: 'Executive Room',
    status: 'vacant_clean',
    hkOccupancy: 'vacant',
    isActive: true,
    amenities: ['wifi', 'tv', 'ac', 'safe', 'minibar'],
  },
  {
    id: 'r0000208-0000-4000-a000-000000000001',
    propertyId: PROPERTY_ID,
    number: '208',
    floor: '2',
    roomTypeId: 'b0000003-0000-4000-a000-000000000003',
    roomTypeName: 'Executive Room',
    status: 'vacant_dirty',
    hkOccupancy: 'vacant',
    isActive: true,
    amenities: ['wifi', 'tv', 'ac', 'safe', 'minibar'],
  },
  {
    id: 'r0000209-0000-4000-a000-000000000001',
    propertyId: PROPERTY_ID,
    number: '209',
    floor: '2',
    roomTypeId: 'b0000003-0000-4000-a000-000000000003',
    roomTypeName: 'Executive Room',
    status: 'out_of_order',
    hkOccupancy: 'vacant',
    isActive: true,
    amenities: ['wifi', 'tv', 'ac', 'safe', 'minibar'],
  },
  {
    id: 'r0000210-0000-4000-a000-000000000001',
    propertyId: PROPERTY_ID,
    number: '210',
    floor: '2',
    roomTypeId: 'b0000003-0000-4000-a000-000000000003',
    roomTypeName: 'Executive Room',
    status: 'vacant_clean',
    hkOccupancy: 'vacant',
    isActive: true,
    amenities: ['wifi', 'tv', 'ac', 'safe', 'minibar'],
  },
  // Suite Rooms (4 Rooms: 211 to 214, Double ₹2,799)
  {
    id: 'r0000211-0000-4000-a000-000000000001',
    propertyId: PROPERTY_ID,
    number: '211',
    floor: '2',
    roomTypeId: 'b0000004-0000-4000-a000-000000000004',
    roomTypeName: 'Suite',
    status: 'occupied',
    guestName: 'Rajesh Agarwal',
    hkOccupancy: 'occupied',
    isActive: true,
    amenities: ['wifi', 'tv', 'ac', 'safe', 'minibar', 'living_area', 'bathtub', 'balcony'],
  },
  {
    id: 'r0000212-0000-4000-a000-000000000001',
    propertyId: PROPERTY_ID,
    number: '212',
    floor: '2',
    roomTypeId: 'b0000004-0000-4000-a000-000000000004',
    roomTypeName: 'Suite',
    status: 'vacant_clean',
    hkOccupancy: 'vacant',
    isActive: true,
    amenities: ['wifi', 'tv', 'ac', 'safe', 'minibar', 'living_area', 'bathtub'],
  },
  {
    id: 'r0000213-0000-4000-a000-000000000001',
    propertyId: PROPERTY_ID,
    number: '213',
    floor: '2',
    roomTypeId: 'b0000004-0000-4000-a000-000000000004',
    roomTypeName: 'Suite',
    status: 'booked',
    guestName: 'Suresh Reddy',
    hkOccupancy: 'vacant',
    isActive: true,
    amenities: ['wifi', 'tv', 'ac', 'safe', 'minibar', 'living_area', 'bathtub'],
  },
  {
    id: 'r0000214-0000-4000-a000-000000000001',
    propertyId: PROPERTY_ID,
    number: '214',
    floor: '2',
    roomTypeId: 'b0000004-0000-4000-a000-000000000004',
    roomTypeName: 'Suite',
    status: 'vacant_clean',
    hkOccupancy: 'vacant',
    isActive: true,
    amenities: ['wifi', 'tv', 'ac', 'safe', 'minibar', 'living_area', 'bathtub'],
  },
];

const ROOMS_STORAGE_KEY = 'hotel_spark_rooms_list';
const STAYS_STORAGE_KEY = 'hotel_spark_stays_list';
const NOTIFICATIONS_STORAGE_KEY = 'hotel_spark_notifications_list';

export interface StoredStay {
  id: string;
  propertyId: string;
  guestName: string;
  mobile: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  idProofType: string;
  idProofNumber: string;
  idProofFrontUrl?: string;
  idProofBackUrl?: string;
  adults: number;
  children: number;
  roomId: string;
  roomNumber: string;
  roomTypeName: string;
  checkInTime: string;
  expectedCheckoutTime: string;
  actualCheckoutTime?: string;
  nights: number;
  pricePerNight: number;
  extraCharges: number;
  discount: number;
  totalAmount: number;
  advancePaid: number;
  previousPayments: number;
  balance: number;
  paymentMethod: string;
  paymentStatus: 'paid' | 'partially_paid' | 'unpaid';
  stayStatus: 'in_house' | 'checked_out';
  billNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  createdAt: string;
  isRead: boolean;
}

export const DEFAULT_STAYS: StoredStay[] = [
  {
    id: 'stay-001',
    propertyId: PROPERTY_ID,
    guestName: 'Rahul Verma',
    mobile: '+91 98490 12345',
    email: 'rahul.verma@example.com',
    address: 'Flat 402, Sai Residency, Jagtial Road',
    city: 'Karimnagar',
    state: 'Telangana',
    idProofType: 'Aadhaar Card',
    idProofNumber: '7823 4512 9012',
    idProofFrontUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    idProofBackUrl: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=600&auto=format&fit=crop&q=80',
    adults: 2,
    children: 0,
    roomId: 'r0000101-0000-4000-a000-000000000001',
    roomNumber: '101',
    roomTypeName: 'Deluxe King Room',
    checkInTime: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    expectedCheckoutTime: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    nights: 2,
    pricePerNight: 3500,
    extraCharges: 0,
    discount: 0,
    totalAmount: 7000,
    advancePaid: 5000,
    previousPayments: 0,
    balance: 2000,
    paymentMethod: 'UPI',
    paymentStatus: 'partially_paid',
    stayStatus: 'in_house',
    billNumber: 'INV-SPARK-2026-101',
    notes: 'Requested quiet room away from elevator.',
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'stay-002',
    propertyId: PROPERTY_ID,
    guestName: 'Priya Sharma',
    mobile: '+91 98490 23456',
    email: 'priya.s@example.com',
    address: 'Plot 12, Jubilee Hills',
    city: 'Hyderabad',
    state: 'Telangana',
    idProofType: 'Driving License',
    idProofNumber: 'TS-02-2021-0045211',
    idProofFrontUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80',
    idProofBackUrl: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=600&auto=format&fit=crop&q=80',
    adults: 1,
    children: 0,
    roomId: 'r0000102-0000-4000-a000-000000000001',
    roomNumber: '102',
    roomTypeName: 'Deluxe King Room',
    checkInTime: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    expectedCheckoutTime: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
    nights: 1,
    pricePerNight: 3500,
    extraCharges: 0,
    discount: 0,
    totalAmount: 3500,
    advancePaid: 3500,
    previousPayments: 0,
    balance: 0,
    paymentMethod: 'Card',
    paymentStatus: 'paid',
    stayStatus: 'in_house',
    billNumber: 'INV-SPARK-2026-102',
    notes: 'Corporate stay (Infosys).',
    createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
  },
  {
    id: 'stay-003',
    propertyId: PROPERTY_ID,
    guestName: 'Vikram Malhotra',
    mobile: '+91 98490 34567',
    email: 'vikram.m@example.com',
    address: 'H.No 3-4-192, Kakatiya Colony',
    city: 'Hanamkonda',
    state: 'Telangana',
    idProofType: 'Passport',
    idProofNumber: 'V8923412',
    idProofFrontUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80',
    idProofBackUrl: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=600&auto=format&fit=crop&q=80',
    adults: 3,
    children: 1,
    roomId: 'r0000201-0000-4000-a000-000000000001',
    roomNumber: '201',
    roomTypeName: 'Executive Spark Suite',
    checkInTime: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    expectedCheckoutTime: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    nights: 3,
    pricePerNight: 6500,
    extraCharges: 1000,
    discount: 500,
    totalAmount: 20000,
    advancePaid: 10000,
    previousPayments: 0,
    balance: 10000,
    paymentMethod: 'Bank Transfer',
    paymentStatus: 'partially_paid',
    stayStatus: 'in_house',
    billNumber: 'INV-SPARK-2026-201',
    notes: 'Extra bed added in master bedroom.',
    createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
  },
  {
    id: 'stay-004',
    propertyId: PROPERTY_ID,
    guestName: 'Sneha Reddy',
    mobile: '+91 98490 45678',
    email: 'sneha.reddy@example.com',
    address: 'Main Road, Korutla',
    city: 'Jagtial',
    state: 'Telangana',
    idProofType: 'Aadhaar Card',
    idProofNumber: '6712 3490 1289',
    idProofFrontUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
    idProofBackUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop&q=80',
    adults: 2,
    children: 0,
    roomId: 'r0000301-0000-4000-a000-000000000001',
    roomNumber: '301',
    roomTypeName: 'Standard Queen Room',
    checkInTime: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
    expectedCheckoutTime: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
    nights: 1,
    pricePerNight: 2500,
    extraCharges: 0,
    discount: 0,
    totalAmount: 2500,
    advancePaid: 2000,
    previousPayments: 0,
    balance: 500,
    paymentMethod: 'Cash',
    paymentStatus: 'partially_paid',
    stayStatus: 'in_house',
    billNumber: 'INV-SPARK-2026-301',
    notes: 'Late checkout requested by 2:00 PM.',
    createdAt: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
  },
  {
    id: 'stay-hist-001',
    propertyId: PROPERTY_ID,
    guestName: 'Anil Kumar Goud',
    mobile: '+91 98760 11223',
    email: 'anil.goud@example.com',
    address: 'Kishan Nagar',
    city: 'Karimnagar',
    state: 'Telangana',
    idProofType: 'Aadhaar Card',
    idProofNumber: 'XXXX XXXX 8899',
    idProofFrontUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    idProofBackUrl: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=600&auto=format&fit=crop&q=80',
    adults: 2,
    children: 1,
    roomId: 'r0000103-0000-4000-a000-000000000001',
    roomNumber: '103',
    roomTypeName: 'Deluxe Room',
    checkInTime: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    expectedCheckoutTime: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    actualCheckoutTime: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    nights: 2,
    pricePerNight: 2099,
    extraCharges: 399,
    discount: 0,
    totalAmount: 4597,
    advancePaid: 2500,
    previousPayments: 2097,
    balance: 0,
    paymentMethod: 'UPI',
    paymentStatus: 'paid',
    stayStatus: 'checked_out',
    billNumber: 'INV-SPARK-2026-0042',
    notes: 'Checked out cleanly.',
    createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'stay-hist-002',
    propertyId: PROPERTY_ID,
    guestName: 'Sunita Rao',
    mobile: '+91 99887 76655',
    email: 'sunita.rao@example.com',
    address: 'Ashok Nagar',
    city: 'Hyderabad',
    state: 'Telangana',
    idProofType: 'Passport',
    idProofNumber: 'Z1238904',
    idProofFrontUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
    idProofBackUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop&q=80',
    adults: 1,
    children: 0,
    roomId: 'r0000202-0000-4000-a000-000000000001',
    roomNumber: '202',
    roomTypeName: 'Executive Spark Suite',
    checkInTime: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(),
    expectedCheckoutTime: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(),
    actualCheckoutTime: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(),
    nights: 2,
    pricePerNight: 6500,
    extraCharges: 0,
    discount: 1000,
    totalAmount: 12000,
    advancePaid: 12000,
    previousPayments: 0,
    balance: 0,
    paymentMethod: 'Card',
    paymentStatus: 'paid',
    stayStatus: 'checked_out',
    billNumber: 'INV-SPARK-2026-0038',
    notes: 'Very satisfied with service.',
    createdAt: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(),
  },
];

export const DEFAULT_NOTIFICATIONS: StoredNotification[] = [
  {
    id: 'notif-1',
    type: 'check_in',
    title: 'Guest Checked In: Room 101',
    message: 'Rahul Verma has checked into Room 101. Advance ₹5,000 received via UPI.',
    severity: 'info',
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    isRead: false,
  },
  {
    id: 'notif-2',
    type: 'payment',
    title: 'Advance Payment Received',
    message: '₹10,000 recorded for Vikram Malhotra in Room 201 (Executive Spark Suite).',
    severity: 'info',
    createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    isRead: false,
  },
  {
    id: 'notif-3',
    type: 'balance_due',
    title: 'Outstanding Balance Alert',
    message: 'Room 201 (Vikram Malhotra) has an outstanding balance of ₹10,000.',
    severity: 'warning',
    createdAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
    isRead: false,
  },
  {
    id: 'notif-4',
    type: 'check_out',
    title: 'Room 104 Marked Dirty',
    message: 'Previous guest checked out. Room 104 marked VACANT DIRTY for housekeeping.',
    severity: 'info',
    createdAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
    isRead: true,
  },
];

export function getStoredRooms(): StoredRoom[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(ROOMS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 28) {
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

export function getStoredTariffConfig(): HotelTariffConfig {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(TARIFF_CONFIG_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.categories) && parsed.categories.length === 4) {
          return parsed;
        }
      }
    }
  } catch (e) {
    void e;
  }
  return { ...DEFAULT_TARIFF_CONFIG };
}

export function saveStoredTariffConfig(config: HotelTariffConfig): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(TARIFF_CONFIG_STORAGE_KEY, JSON.stringify(config));
    }
  } catch (e) {
    void e;
  }
}

export function reassignRoomInventory(categories: RoomCategoryTariff[]): StoredRoom[] {
  const currentRooms = getStoredRooms();
  let roomIdx = 0;
  const updatedRooms: StoredRoom[] = [];

  for (const cat of categories) {
    const count = Number(cat.assignedRoomsCount) || 0;
    for (let i = 0; i < count && roomIdx < currentRooms.length; i++) {
      const existing = currentRooms[roomIdx];
      updatedRooms.push({
        ...existing,
        roomTypeId: cat.id,
        roomTypeName: cat.name,
      });
      roomIdx++;
    }
  }

  while (roomIdx < currentRooms.length) {
    updatedRooms.push(currentRooms[roomIdx]);
    roomIdx++;
  }

  saveStoredRooms(updatedRooms);
  return updatedRooms;
}

export interface TariffCalculationResult {
  roomTariffPerNight: number;
  totalRoomTariff: number;
  extraPersonsCount: number;
  extraPersonRate: number;
  totalExtraPersonCharges: number;
  subtotal: number;
  gstRate: number;
  isTaxInclusive: boolean;
  taxableBase: number;
  cgst: number;
  sgst: number;
  totalGst: number;
  grandTotal: number;
  formattedGrandTotal: string;
}

export function calculateTariffInvoice({
  category,
  occupancyType,
  nights = 1,
  extraPersons = 0,
  extraCharges = 0,
  discount = 0,
  gstPercentage = 12,
  isTaxInclusive = true,
}: {
  category: RoomCategoryTariff;
  occupancyType: 'single' | 'double';
  nights?: number;
  extraPersons?: number;
  extraCharges?: number;
  discount?: number;
  gstPercentage?: number;
  isTaxInclusive?: boolean;
}): TariffCalculationResult {
  const ratePerNight =
    occupancyType === 'single'
      ? (category.singleOccupancyPrice ?? category.doubleOccupancyPrice ?? 1599)
      : (category.doubleOccupancyPrice ?? category.singleOccupancyPrice ?? 2099);

  const totalRoomTariff = ratePerNight * Math.max(1, nights);
  const extraPersonRate = 399;
  const totalExtraPersonCharges = Math.max(0, extraPersons) * extraPersonRate * Math.max(1, nights);

  const subtotal = totalRoomTariff + totalExtraPersonCharges + extraCharges - discount;

  let taxableBase: number;
  let totalGst: number;
  let grandTotal: number;

  if (isTaxInclusive) {
    taxableBase = Math.round((subtotal / (1 + gstPercentage / 100)) * 100) / 100;
    totalGst = Math.round((subtotal - taxableBase) * 100) / 100;
    grandTotal = subtotal;
  } else {
    taxableBase = subtotal;
    totalGst = Math.round((subtotal * (gstPercentage / 100)) * 100) / 100;
    grandTotal = Math.round((subtotal + totalGst) * 100) / 100;
  }

  const cgst = Math.round((totalGst / 2) * 100) / 100;
  const sgst = Math.round((totalGst - cgst) * 100) / 100;

  return {
    roomTariffPerNight: ratePerNight,
    totalRoomTariff,
    extraPersonsCount: Math.max(0, extraPersons),
    extraPersonRate,
    totalExtraPersonCharges,
    subtotal,
    gstRate: gstPercentage,
    isTaxInclusive,
    taxableBase,
    cgst,
    sgst,
    totalGst,
    grandTotal,
    formattedGrandTotal: `₹${grandTotal.toLocaleString('en-IN')}`,
  };
}

export function getStoredStays(): StoredStay[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(STAYS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: StoredStay) => {
            const def = DEFAULT_STAYS.find((d) => d.id === item.id);
            if (def) {
              return {
                ...def,
                ...item,
                idProofFrontUrl: item.idProofFrontUrl || def.idProofFrontUrl,
                idProofBackUrl: item.idProofBackUrl || def.idProofBackUrl,
              };
            }
            return item;
          });
        }
      }
    }
  } catch (e) {
    void e;
  }
  return [...DEFAULT_STAYS];
}

export function saveStoredStays(stays: StoredStay[]) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STAYS_STORAGE_KEY, JSON.stringify(stays));
    }
  } catch (e) {
    void e;
  }
}

export function getStoredNotifications(): StoredNotification[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
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
  return [...DEFAULT_NOTIFICATIONS];
}

export function saveStoredNotifications(notifs: StoredNotification[]) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifs));
    }
  } catch (e) {
    void e;
  }
}

const EMPLOYEES_STORAGE_KEY = 'hotel_spark_employees_list';
const HK_TASKS_STORAGE_KEY = 'hotel_spark_hk_tasks_list';
const RESERVATIONS_STORAGE_KEY = 'hotel_spark_reservations_list';
const GUESTS_STORAGE_KEY = 'hotel_spark_guests_list';

const DEFAULT_GUESTS = [
  {
    id: 'g0000001-0000-4000-a000-000000000001',
    propertyId: PROPERTY_ID,
    firstName: 'Rahul',
    lastName: 'Verma',
    email: 'rahul.verma@example.com',
    phone: '+91 98765 11111',
    address: 'Banjara Hills, Hyderabad',
    addressLine1: 'Banjara Hills, Road No. 12',
    city: 'Hyderabad',
    state: 'Telangana',
    stateProvince: 'Telangana',
    postalCode: '500034',
    countryCode: 'IN',
    idCountry: 'IN',
    idType: 'aadhaar',
    idProofType: 'Aadhaar Card',
    idNumber: '7890 1234 5678',
    idProofNumber: '7890 1234 5678',
    idProofFrontUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    idProofBackUrl: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=600&auto=format&fit=crop&q=80',
    stayCount: 3,
    totalSpend: 10500,
    status: 'active',
    createdAt: '2026-11-10T10:00:00Z',
  },
  {
    id: 'g0000002-0000-4000-a000-000000000001',
    propertyId: PROPERTY_ID,
    firstName: 'Priya',
    lastName: 'Sharma',
    email: 'priya.s@example.com',
    phone: '+91 98765 22222',
    address: 'Madhapur, Hyderabad',
    addressLine1: 'Plot 45, Silicon Valley, Madhapur',
    city: 'Hyderabad',
    state: 'Telangana',
    stateProvince: 'Telangana',
    postalCode: '500081',
    countryCode: 'IN',
    idCountry: 'IN',
    idType: 'drivers_license',
    idProofType: 'Driving License',
    idNumber: 'TS09-2023-009182',
    idProofNumber: 'TS09-2023-009182',
    idProofFrontUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80',
    idProofBackUrl: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=600&auto=format&fit=crop&q=80',
    stayCount: 2,
    totalSpend: 7000,
    status: 'active',
    createdAt: '2026-11-12T14:30:00Z',
  },
  {
    id: 'g0000003-0000-4000-a000-000000000001',
    propertyId: PROPERTY_ID,
    firstName: 'Vikram',
    lastName: 'Malhotra',
    email: 'vikram.m@corporatetech.com',
    phone: '+91 98765 33333',
    address: 'Koramangala, Bengaluru',
    addressLine1: '4th Block, Koramangala',
    city: 'Bengaluru',
    state: 'Karnataka',
    stateProvince: 'Karnataka',
    postalCode: '560034',
    countryCode: 'IN',
    idCountry: 'IN',
    idType: 'passport',
    idProofType: 'Passport',
    idNumber: 'Z8765432',
    idProofNumber: 'Z8765432',
    idProofFrontUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80',
    stayCount: 1,
    totalSpend: 13000,
    status: 'active',
    createdAt: '2026-11-14T09:15:00Z',
  },
  {
    id: 'g0000004-0000-4000-a000-000000000001',
    propertyId: PROPERTY_ID,
    firstName: 'Ananya',
    lastName: 'Reddy',
    email: 'ananya.reddy@example.com',
    phone: '+91 98765 44444',
    address: 'Subhash Nagar, Karimnagar',
    addressLine1: 'House 3-2-114, Subhash Nagar',
    city: 'Karimnagar',
    state: 'Telangana',
    stateProvince: 'Telangana',
    postalCode: '505001',
    countryCode: 'IN',
    idCountry: 'IN',
    idType: 'aadhaar',
    idProofType: 'Aadhaar Card',
    idNumber: '4567 8901 2345',
    idProofNumber: '4567 8901 2345',
    idProofFrontUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
    idProofBackUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop&q=80',
    stayCount: 4,
    totalSpend: 14000,
    status: 'active',
    createdAt: '2026-11-05T12:00:00Z',
  },
];

const DEFAULT_HK_TASKS = [
  {
    id: 'hk-104',
    roomId: 'r0000104-0000-4000-a000-000000000001',
    roomNumber: '104',
    floor: '1',
    type: 'checkout_clean',
    status: 'pending',
    priority: 1,
    assignedTo: 'e0000006-0000-4000-a000-000000000001', // Raju Nayak
    serviceDate: new Date().toISOString().split('T')[0],
    checklist: [
      { item: 'Change bed linen & pillow covers', checked: false },
      { item: 'Sanitize bathroom and replace towels', checked: false },
      { item: 'Dust surfaces & restock water bottles', checked: false },
      { item: 'Vacuum carpet & mop floor', checked: false },
    ],
    notes: 'Previous guest checked out. Ready for deep clean.',
  },
  {
    id: 'hk-103',
    roomId: 'r0000103-0000-4000-a000-000000000001',
    roomNumber: '103',
    floor: '1',
    type: 'inspection',
    status: 'completed',
    priority: 2,
    assignedTo: 'e0000004-0000-4000-a000-000000000001', // Kavitha Devi
    serviceDate: new Date().toISOString().split('T')[0],
    checklist: [
      { item: 'Linen fresh and bed made to standard', checked: true },
      { item: 'All electrical fittings & AC tested', checked: true },
      { item: 'Ensuite bath inspection', checked: true },
    ],
    notes: 'Room inspected and guest ready.',
  },
  {
    id: 'hk-201',
    roomId: 'r0000201-0000-4000-a000-000000000001',
    roomNumber: '201',
    floor: '2',
    type: 'stayover',
    status: 'in_progress',
    priority: 2,
    assignedTo: 'e0000006-0000-4000-a000-000000000001', // Raju Nayak
    serviceDate: new Date().toISOString().split('T')[0],
    checklist: [
      { item: 'Make bed & tidy room', checked: true },
      { item: 'Replenish toiletries', checked: false },
      { item: 'Empty trash bins', checked: true },
    ],
    notes: 'Daily stayover housekeeping for staying guest.',
  },
];

const DEFAULT_RESERVATIONS = [
  {
    id: 'resv-001',
    propertyId: PROPERTY_ID,
    confirmationNumber: 'SPARK-RES-8801',
    guestName: 'Suresh Goud',
    guest: { firstName: 'Suresh', lastName: 'Goud', email: 'suresh.goud@example.com', phone: '+91 98480 12345' },
    roomNumber: '103',
    roomId: 'r0000103-0000-4000-a000-000000000001',
    roomTypeId: 'b0000001-0000-4000-a000-000000000001',
    roomTypeName: 'Deluxe King Room',
    arrivalDate: new Date().toISOString().split('T')[0],
    departureDate: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().split('T')[0],
    nights: 2,
    status: 'confirmed',
    totalAmount: 7000,
    source: 'FRONT_DESK',
    paymentStatus: 'partially_paid',
    advancePaid: 3500,
  },
  {
    id: 'resv-002',
    propertyId: PROPERTY_ID,
    confirmationNumber: 'SPARK-RES-8802',
    guestName: 'Mohammed Rafi',
    guest: { firstName: 'Mohammed', lastName: 'Rafi', email: 'rafi.m@example.com', phone: '+91 99890 54321' },
    roomNumber: '202',
    roomId: 'r0000202-0000-4000-a000-000000000001',
    roomTypeId: 'b0000002-0000-4000-a000-000000000001',
    roomTypeName: 'Executive Spark Suite',
    arrivalDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString().split('T')[0],
    departureDate: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().split('T')[0],
    nights: 2,
    status: 'confirmed',
    totalAmount: 13000,
    source: 'WEBSITE',
    paymentStatus: 'paid',
    advancePaid: 13000,
  },
];

export function getStoredEmployees(): any[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(EMPLOYEES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
  } catch (e) {
    void e;
  }
  return [...DEFAULT_EMPLOYEES];
}

export function saveStoredEmployees(list: any[]) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(EMPLOYEES_STORAGE_KEY, JSON.stringify(list));
    }
  } catch (e) {
    void e;
  }
}

export function getStoredHkTasks(): any[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(HK_TASKS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
  } catch (e) {
    void e;
  }
  return [...DEFAULT_HK_TASKS];
}

export function saveStoredHkTasks(list: any[]) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(HK_TASKS_STORAGE_KEY, JSON.stringify(list));
    }
  } catch (e) {
    void e;
  }
}

export function getStoredReservations(): any[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(RESERVATIONS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
  } catch (e) {
    void e;
  }
  return [...DEFAULT_RESERVATIONS];
}

export function saveStoredReservations(list: any[]) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(RESERVATIONS_STORAGE_KEY, JSON.stringify(list));
    }
  } catch (e) {
    void e;
  }
}

export function getStoredGuests(): any[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(GUESTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
  } catch (e) {
    void e;
  }
  return [...DEFAULT_GUESTS];
}

export function saveStoredGuests(list: any[]) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(GUESTS_STORAGE_KEY, JSON.stringify(list));
    }
  } catch (e) {
    void e;
  }
}

export function addNotification(
  title: string,
  message: string,
  severity: 'info' | 'warning' | 'critical' = 'info',
  type = 'general'
): StoredNotification {
  const notifs = getStoredNotifications();
  const newNotif: StoredNotification = {
    id: `notif-${Date.now()}`,
    type,
    title,
    message,
    severity,
    createdAt: new Date().toISOString(),
    isRead: false,
  };
  const updated = [newNotif, ...notifs];
  saveStoredNotifications(updated);
  return newNotif;
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
      const currentCache = getStoredRateCache();
      const planPriceByRoomType: Record<string, number> = {};
      for (const p of plans) {
        if (p.room_type_id) {
          const cached = currentCache[p.id] ?? currentCache[p.room_type_id] ?? ratePlanPriceCache[p.id] ?? ratePlanPriceCache[p.room_type_id];
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
        const cached = currentCache[t.id] ?? ratePlanPriceCache[t.id];
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

      // Sync from Supabase asynchronously in background without blocking immediate response
      supabaseFetch<any[]>('rooms?select=*&order=number.asc')
        .then(({ data: remoteRooms }) => {
          if (remoteRooms && Array.isArray(remoteRooms) && remoteRooms.length > 0) {
            const current = getStoredRooms();
            const merged = [...current];
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
          }
        })
        .catch(() => { });

      return ok(result);
    }

    if (method === 'PATCH' || method === 'PUT') {
      const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : (config.data || {});
      const idMatch = url.match(/\/rooms\/([^/?]+)/);
      const roomId = idMatch ? idMatch[1] : '';
      const rooms = getStoredRooms();
      const idx = rooms.findIndex((r) => r.id === roomId || r.number === roomId);

      if (idx >= 0) {
        if (body.number) rooms[idx].number = String(body.number);
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
          if (body.number) supabasePayload.number = String(body.number);
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
      const currentCache = getStoredRateCache();
      const mapped = list.map((p) => {
        const cached = currentCache[p.id] ?? (p.room_type_id ? currentCache[p.room_type_id] : undefined) ?? ratePlanPriceCache[p.id] ?? (p.room_type_id ? ratePlanPriceCache[p.room_type_id] : undefined);
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

      // Also merge any locally stored reservations created via Front Desk or booking modal
      const localResvs = getStoredReservations();
      for (const lr of localResvs) {
        if (!list.some((existing) => existing.id === lr.id || existing.confirmationNumber === lr.confirmationNumber)) {
          list.push(lr);
        }
      }

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

    if (method === 'PATCH' || method === 'PUT') {
      const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : (config.data || {});
      const idMatch = url.match(/\/reservations\/([^/?]+)/);
      const resvId = idMatch ? idMatch[1] : '';

      const localResvs = getStoredReservations();
      const resvIdx = localResvs.findIndex((r) => r.id === resvId || r.confirmationNumber === resvId);

      // Handle Cancel Reservation
      if (url.includes('/cancel') || body.status === 'cancelled') {
        if (resvIdx >= 0) {
          localResvs[resvIdx].status = 'cancelled';
          saveStoredReservations(localResvs);

          // Free up room if assigned
          const roomId = localResvs[resvIdx].roomId;
          if (roomId) {
            const rooms = getStoredRooms();
            const rmIdx = rooms.findIndex((rm) => rm.id === roomId || rm.number === localResvs[resvIdx].roomNumber);
            if (rmIdx >= 0 && rooms[rmIdx].status === 'occupied') {
              rooms[rmIdx].status = 'vacant_clean';
              delete rooms[rmIdx].guestName;
              saveStoredRooms(rooms);
            }
          }
        }
        return ok({ success: true, id: resvId, status: 'cancelled' });
      }

      // Normal edit/update
      if (resvIdx >= 0) {
        localResvs[resvIdx] = { ...localResvs[resvIdx], ...body };
        saveStoredReservations(localResvs);
      }
      return ok({ success: true, id: resvId, ...body });
    }

    if (method === 'POST') {
      const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : (config.data || {});
      const confCode = body.confirmationNumber || `CONF-SPARK-${Date.now().toString(36).toUpperCase()}`;

      // Synchronize directly into StoredStays and StoredRooms
      const rooms = getStoredRooms();
      const matchedRoom = rooms.find((r) => r.id === body.roomId || r.number === body.roomNumber);
      const guestName = body.guest?.firstName ? `${body.guest.firstName} ${body.guest.lastName || ''}`.trim() : (body.guestName || 'Guest');
      const nights = body.stay?.nights || body.nights || 1;
      const rate = body.stay?.nightlyRate || body.pricePerNight || 3500;
      const advance = body.stay?.advancePaid ?? body.advancePaid ?? rate;
      const total = body.stay?.grandTotal ?? body.totalAmount ?? (nights * rate);
      const balance = Math.max(0, total - advance);

      const newReservation = {
        id: `resv-${Date.now()}`,
        propertyId: PROPERTY_ID,
        confirmationNumber: confCode,
        status: body.status || 'confirmed',
        arrivalDate: body.arrivalDate || new Date().toISOString().split('T')[0],
        departureDate: body.departureDate || new Date(Date.now() + nights * 24 * 3600 * 1000).toISOString().split('T')[0],
        roomId: matchedRoom?.id || body.roomId,
        roomNumber: matchedRoom?.number || body.roomNumber || '101',
        roomTypeId: body.roomTypeId || matchedRoom?.roomTypeId || DEFAULT_ROOM_TYPES[0].id,
        roomTypeName: matchedRoom?.roomTypeName || 'Deluxe King Room',
        guestName,
        guest: body.guest || { firstName: guestName, lastName: '', phone: body.mobile || '' },
        nights,
        totalAmount: total,
        advancePaid: advance,
        source: 'FRONT_DESK',
      };

      const localResvs = getStoredReservations();
      saveStoredReservations([newReservation, ...localResvs]);

      const newStay: StoredStay = {
        id: `stay-${Date.now()}`,
        propertyId: PROPERTY_ID,
        guestName,
        mobile: body.guest?.phone || body.mobile || '',
        email: body.guest?.email || body.email || '',
        address: body.guest?.address || body.address || '',
        city: 'Karimnagar',
        state: 'Telangana',
        idProofType: body.guest?.idProofType || 'Aadhaar Card',
        idProofNumber: body.guest?.idProofNumber || '',
        adults: body.adults || 2,
        children: body.children || 0,
        roomId: matchedRoom?.id || body.roomId || 'r0000101-0000-4000-a000-000000000001',
        roomNumber: matchedRoom?.number || body.roomNumber || '101',
        roomTypeName: matchedRoom?.roomTypeName || 'Deluxe King Room',
        checkInTime: new Date().toISOString(),
        expectedCheckoutTime: new Date(Date.now() + nights * 24 * 3600 * 1000).toISOString(),
        nights,
        pricePerNight: rate,
        extraCharges: 0,
        discount: 0,
        totalAmount: total,
        advancePaid: advance,
        previousPayments: 0,
        balance,
        paymentMethod: body.stay?.paymentMethod || 'UPI',
        paymentStatus: balance === 0 ? 'paid' : 'partially_paid',
        stayStatus: 'in_house',
        billNumber: `INV-SPARK-${new Date().getFullYear()}-${matchedRoom?.number || '101'}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const stays = getStoredStays();
      saveStoredStays([newStay, ...stays]);

      if (matchedRoom) {
        const roomIdx = rooms.findIndex((r) => r.id === matchedRoom.id);
        if (roomIdx >= 0) {
          rooms[roomIdx].status = 'occupied';
          rooms[roomIdx].guestName = guestName;
          saveStoredRooms(rooms);
        }
      }

      addNotification(
        `Guest Checked In: Room ${newStay.roomNumber}`,
        `${guestName} checked in to Room ${newStay.roomNumber}. Advance paid: ₹${advance.toLocaleString('en-IN')}.`,
        'info',
        'check_in'
      );

      if (body.roomId) {
        supabaseFetch(`rooms?id=eq.${body.roomId}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'occupied' }),
        }).catch(() => { });
      }

      return ok({
        id: newReservation.id,
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
  if (url.includes('/guests')) {
    const guests = getStoredGuests();
    if (method === 'GET') {
      const singleMatch = url.match(/\/guests\/([^/?]+)/);
      const singleId = singleMatch ? singleMatch[1] : null;
      if (singleId && singleId !== 'guests') {
        const found = guests.find((g) => g.id === singleId);
        if (found) {
          return ok({
            ...found,
            idProofType: found.idProofType || (found.idType === 'aadhaar' ? 'Aadhaar Card' : found.idType) || 'Aadhaar Card',
            idProofNumber: found.idProofNumber || found.idNumber || found.taxId || '',
            idProofFrontUrl: found.idProofFrontUrl || found.registrationData?.idProofFrontUrl || '',
            idProofBackUrl: found.idProofBackUrl || found.registrationData?.idProofBackUrl || '',
          });
        }
      }
      const search = (config.params?.search || '').toLowerCase();
      let res = guests;
      if (search) {
        res = guests.filter(
          (g) =>
            (g.firstName && g.firstName.toLowerCase().includes(search)) ||
            (g.lastName && g.lastName.toLowerCase().includes(search)) ||
            (g.phone && g.phone.includes(search)) ||
            (g.email && g.email.toLowerCase().includes(search)) ||
            (g.idProofNumber && g.idProofNumber.toLowerCase().includes(search))
        );
      }
      return ok(res);
    }
    if (method === 'POST') {
      const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : (config.data || {});
      const newGuest = {
        id: `g-${Date.now()}`,
        propertyId: PROPERTY_ID,
        firstName: body.firstName || 'Guest',
        lastName: body.lastName || '',
        email: body.email || '',
        phone: body.phone || '',
        address: body.address || body.addressLine1 || '',
        city: body.city || 'Karimnagar',
        state: body.state || body.stateProvince || 'Telangana',
        idType: body.idType || 'aadhaar',
        idProofType: body.idProofType || (body.idType === 'aadhaar' ? 'Aadhaar Card' : body.idType) || 'Aadhaar Card',
        idNumber: body.idProofNumber || body.idNumber || body.taxId || '',
        idProofNumber: body.idProofNumber || body.idNumber || body.taxId || '',
        idProofFrontUrl: body.idProofFrontUrl || body.registrationData?.idProofFrontUrl || '',
        idProofBackUrl: body.idProofBackUrl || body.registrationData?.idProofBackUrl || '',
        status: 'active',
        stayCount: 1,
        totalSpend: 3500,
        createdAt: new Date().toISOString(),
      };
      saveStoredGuests([newGuest, ...guests]);
      return ok({ success: true, ...newGuest });
    }
    if (method === 'PATCH' || method === 'PUT') {
      const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : (config.data || {});
      const idMatch = url.match(/\/guests\/([^/?]+)/);
      const gid = idMatch ? idMatch[1] : '';
      const idx = guests.findIndex((g) => g.id === gid);
      if (idx >= 0) {
        guests[idx] = { ...guests[idx], ...body, updatedAt: new Date().toISOString() };
        saveStoredGuests(guests);
        return ok({ success: true, ...guests[idx] });
      }
      return ok({ success: true, id: gid, ...body });
    }
  }

  // 16. Housekeeping
  if (url.includes('/housekeeping')) {
    const tasks = getStoredHkTasks();
    const rooms = getStoredRooms();
    const employees = getStoredEmployees();
    const housekeepers = employees.filter((e) => e.departmentName === 'Housekeeping' || e.role.toLowerCase().includes('housekeep'));

    // Dashboard
    if (url.includes('/dashboard')) {
      const taskSummary = {
        pending: tasks.filter((t) => t.status === 'pending').length,
        assigned: tasks.filter((t) => t.status === 'assigned').length,
        in_progress: tasks.filter((t) => t.status === 'in_progress').length,
        completed: tasks.filter((t) => t.status === 'completed').length,
        inspected: tasks.filter((t) => t.status === 'inspected').length,
      };

      const roomSummary: Record<string, number> = { total: rooms.length };
      for (const r of rooms) {
        const st = r.status || 'vacant_clean';
        roomSummary[st] = (roomSummary[st] || 0) + 1;
      }

      const housekeeperSummary = housekeepers.map((hk) => ({
        housekeeperId: hk.id,
        tasksAssigned: tasks.filter((t) => t.assignedTo === hk.id).length,
        tasksCompleted: tasks.filter((t) => t.assignedTo === hk.id && t.status === 'completed').length,
        tasksInProgress: tasks.filter((t) => t.assignedTo === hk.id && t.status === 'in_progress').length,
        avgTurnTimeMinutes: 25,
      }));

      const urgentRooms = rooms
        .filter((r) => r.status === 'vacant_dirty' || r.status === 'out_of_order')
        .map((r) => ({
          roomId: r.id,
          roomNumber: r.number,
          floor: r.floor || '1',
          status: r.status,
          taskStatus: 'pending',
          priority: 1,
          reason: r.status === 'vacant_dirty' ? 'Checkout Clean Needed' : 'Maintenance Required',
        }));

      return ok({ taskSummary, roomSummary, housekeeperSummary, urgentRooms });
    }

    // Operations Forecast
    if (url.includes('/ops-forecast')) {
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      return ok({
        date: tomorrow,
        expectedCheckouts: 2,
        expectedStayovers: 4,
      });
    }

    // Auto Assign
    if (url.includes('/auto-assign') && method === 'POST') {
      const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : (config.data || {});
      const staffIds: string[] = body.housekeepers || housekeepers.map((h) => h.id);
      if (staffIds.length > 0) {
        let staffIdx = 0;
        for (const t of tasks) {
          if (t.status === 'pending') {
            t.status = 'assigned';
            t.assignedTo = staffIds[staffIdx % staffIds.length];
            t.assignedAt = new Date().toISOString();
            staffIdx++;
          }
        }
        saveStoredHkTasks(tasks);
      }
      return ok({ success: true, message: 'Tasks auto-assigned successfully' });
    }

    // Generate stayover tasks
    if (url.includes('/generate-stayover-tasks')) {
      return ok({ success: true, count: 2 });
    }

    // Task Actions & Tasks List
    if (url.includes('/tasks')) {
      if (method === 'GET') {
        const statusFilter = (config.params?.status || '').toLowerCase();
        let res = tasks;
        if (statusFilter) {
          res = tasks.filter((t) => t.status.toLowerCase() === statusFilter);
        }
        return ok(res);
      }

      if (method === 'PATCH') {
        const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : (config.data || {});
        const actionMatch = url.match(/\/tasks\/([^/?]+)\/([^/?]+)/);

        if (actionMatch) {
          const taskId = actionMatch[1];
          const action = actionMatch[2];
          const idx = tasks.findIndex((t) => t.id === taskId);

          if (idx >= 0) {
            if (action === 'assign') {
              tasks[idx].assignedTo = body.assignedTo;
              tasks[idx].status = 'assigned';
              tasks[idx].assignedAt = new Date().toISOString();
            } else if (action === 'start') {
              tasks[idx].status = 'in_progress';
              tasks[idx].startedAt = new Date().toISOString();
            } else if (action === 'complete' || action === 'inspect') {
              tasks[idx].status = action === 'inspect' ? 'inspected' : 'completed';
              tasks[idx].completedAt = new Date().toISOString();

              // Update room status to clean in stored rooms!
              const roomId = tasks[idx].roomId;
              const roomNum = tasks[idx].roomNumber;
              const rmIdx = rooms.findIndex((r) => r.id === roomId || r.number === roomNum);
              if (rmIdx >= 0) {
                rooms[rmIdx].status = 'vacant_clean';
                saveStoredRooms(rooms);
              }
            } else if (action === 'unassign') {
              tasks[idx].assignedTo = undefined;
              tasks[idx].status = 'pending';
            } else if (action === 'skip') {
              tasks[idx].status = 'completed';
            }
            saveStoredHkTasks(tasks);
          }
          return ok({ success: true, taskId, action });
        }

        // Direct task update (e.g. checklist)
        const idMatch = url.match(/\/tasks\/([^/?]+)/);
        const taskId = idMatch ? idMatch[1] : '';
        const idx = tasks.findIndex((t) => t.id === taskId);
        if (idx >= 0) {
          tasks[idx] = { ...tasks[idx], ...body };
          saveStoredHkTasks(tasks);
        }
        return ok({ success: true, id: taskId, ...body });
      }

      if (method === 'POST') {
        const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : (config.data || {});
        const newTask = {
          id: `hk-${Date.now()}`,
          roomId: body.roomId,
          roomNumber: body.roomNumber || '101',
          type: body.type || 'clean',
          status: 'pending',
          priority: body.priority || 1,
          serviceDate: new Date().toISOString().split('T')[0],
          checklist: body.checklist || [
            { item: 'Change linen', checked: false },
            { item: 'Clean bathroom', checked: false },
            { item: 'Restock amenities', checked: false },
          ],
          notes: body.notes || '',
        };
        saveStoredHkTasks([newTask, ...tasks]);
        return ok({ success: true, ...newTask });
      }
    }

    return ok({ success: true });
  }

  // 16b. Admin Users (for Housekeeping and Staff assignment)
  if (url.includes('/admin/users')) {
    const emps = getStoredEmployees();
    const mapped = emps.map((e) => {
      let roleKey = 'front_desk';
      const r = (e.role || '').toLowerCase();
      const d = (e.departmentName || '').toLowerCase();
      if (d.includes('housekeep') || r.includes('housekeep')) {
        roleKey = 'housekeeping';
      } else if (d.includes('manage') || r.includes('admin') || r.includes('owner')) {
        roleKey = 'admin';
      }
      return {
        id: e.id,
        name: e.name,
        email: e.email,
        status: e.status || 'active',
        roles: [{ key: roleKey, name: e.role }],
      };
    });
    return ok(mapped);
  }

  // 17b. Stays & In-House Guest Register
  if (url.includes('/stays') || url.includes('/in-house-guests')) {
    const stays = getStoredStays();
    const rooms = getStoredRooms();

    // GET stays
    if (method === 'GET') {
      const statusParam = (config.params?.status || '').toLowerCase();
      const searchParam = (config.params?.search || '').toLowerCase();

      let filtered = stays;
      if (statusParam) {
        filtered = filtered.filter((s) => s.stayStatus === statusParam);
      }
      if (searchParam) {
        filtered = filtered.filter(
          (s) =>
            s.guestName.toLowerCase().includes(searchParam) ||
            s.mobile.includes(searchParam) ||
            s.roomNumber.toLowerCase().includes(searchParam) ||
            (s.billNumber && s.billNumber.toLowerCase().includes(searchParam))
        );
      }
      return ok(filtered);
    }

    // POST /stays/check-in or POST /stays: Register & Check In Walk-in Guest
    if (method === 'POST' && (url.includes('/check-in') || url.match(/\/stays(\?|$)/))) {
      const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : (config.data || {});
      const roomNum = body.roomNumber || body.room_number;
      const matchedRoom = rooms.find((r) => r.number === roomNum || r.id === body.roomId);

      // Verify room is not already occupied
      if (matchedRoom && matchedRoom.status === 'occupied') {
        return {
          data: { message: `Room ${matchedRoom.number} is currently occupied! Please select an available room.` },
          status: 400,
          statusText: 'Bad Request',
          headers: { 'content-type': 'application/json' },
          config: config as any,
        };
      }

      const nights = Number(body.nights) || 1;
      const pricePerNight = Number(body.pricePerNight) || 3500;
      const extraCharges = Number(body.extraCharges) || 0;
      const discount = Number(body.discount) || 0;
      const totalAmount = nights * pricePerNight + extraCharges - discount;
      const advancePaid = Number(body.advancePaid) || 0;
      const balance = Math.max(0, totalAmount - advancePaid);
      const paymentStatus = balance === 0 ? 'paid' : advancePaid > 0 ? 'partially_paid' : 'unpaid';

      const newStay: StoredStay = {
        id: `stay-${Date.now()}`,
        propertyId: PROPERTY_ID,
        guestName: body.guestName || 'Guest',
        mobile: body.mobile || '',
        email: body.email || '',
        address: body.address || body.addressLine1 || '',
        city: body.city || 'Karimnagar',
        state: body.state || body.stateProvince || 'Telangana',
        idProofType: body.idProofType || (body.idType === 'aadhaar' ? 'Aadhaar Card' : body.idType) || 'Aadhaar Card',
        idProofNumber: body.idProofNumber || body.idNumber || body.taxId || '',
        idProofFrontUrl: body.idProofFrontUrl || body.registrationData?.idProofFrontUrl || body.idProofFront || '',
        idProofBackUrl: body.idProofBackUrl || body.registrationData?.idProofBackUrl || body.idProofBack || '',
        adults: Number(body.adults) || 1,
        children: Number(body.children) || 0,
        roomId: matchedRoom?.id || body.roomId || 'r0000101-0000-4000-a000-000000000001',
        roomNumber: matchedRoom?.number || roomNum || '101',
        roomTypeName: matchedRoom?.roomTypeName || body.roomTypeName || 'Deluxe King Room',
        checkInTime: body.checkInTime || new Date().toISOString(),
        expectedCheckoutTime: body.expectedCheckoutTime || new Date(Date.now() + nights * 24 * 3600 * 1000).toISOString(),
        nights,
        pricePerNight,
        extraCharges,
        discount,
        totalAmount,
        advancePaid,
        previousPayments: 0,
        balance,
        paymentMethod: body.paymentMethod || 'Cash',
        paymentStatus,
        stayStatus: 'in_house',
        billNumber: `INV-SPARK-${new Date().getFullYear()}-${matchedRoom?.number || '101'}-${Math.floor(100 + Math.random() * 900)}`,
        notes: body.notes || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 1. Save stay
      const updatedStays = [newStay, ...stays];
      saveStoredStays(updatedStays);

      // 2. Mark Room as OCCUPIED & assign guestName
      if (matchedRoom) {
        const roomIdx = rooms.findIndex((r) => r.id === matchedRoom.id);
        if (roomIdx >= 0) {
          rooms[roomIdx].status = 'occupied';
          rooms[roomIdx].guestName = newStay.guestName;
          saveStoredRooms(rooms);

          // Sync to Supabase
          supabaseFetch(`rooms?id=eq.${matchedRoom.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'occupied' }),
          }).catch(() => { });
        }
      }

      // 3. Trigger Instant Admin Notification
      addNotification(
        `Guest Checked In: Room ${newStay.roomNumber}`,
        `${newStay.guestName} checked into Room ${newStay.roomNumber}. Advance received: ₹${newStay.advancePaid.toLocaleString('en-IN')} via ${newStay.paymentMethod}. Balance: ₹${newStay.balance.toLocaleString('en-IN')}.`,
        'info',
        'check_in'
      );

      // Async sync to Supabase reservations table
      supabaseFetch('reservations', {
        method: 'POST',
        body: JSON.stringify({
          property_id: PROPERTY_ID,
          hotel_id: PROPERTY_ID,
          primary_guest_name: newStay.guestName,
          phone: newStay.mobile,
          email: newStay.email,
          room_id: newStay.roomId,
          arrival_date: newStay.checkInTime.slice(0, 10),
          departure_date: newStay.expectedCheckoutTime.slice(0, 10),
          adults: newStay.adults,
          children: newStay.children,
          status: 'checked_in',
          source: 'walk_in',
          notes: newStay.notes,
        }),
      }).catch(() => { });

      return ok({ success: true, stay: newStay });
    }

    // POST /stays/:id/checkout: Complete Guest Checkout & Bill Generation
    if (method === 'POST' && url.includes('/checkout')) {
      const stayIdMatch = url.match(/\/stays\/([^/?]+)\/checkout/);
      const stayId = stayIdMatch ? stayIdMatch[1] : '';
      const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : (config.data || {});
      const finalPayment = Number(body.finalPayment) || 0;
      const paymentMethod = body.paymentMethod || 'Cash';

      const stayIdx = stays.findIndex((s) => s.id === stayId);
      if (stayIdx >= 0) {
        const stay = stays[stayIdx];
        const prev = stay.previousPayments || 0;
        const newPrev = prev + finalPayment;
        const newBalance = Math.max(0, stay.totalAmount - stay.advancePaid - newPrev);

        stays[stayIdx] = {
          ...stay,
          actualCheckoutTime: new Date().toISOString(),
          previousPayments: newPrev,
          balance: newBalance,
          paymentStatus: newBalance === 0 ? 'paid' : 'partially_paid',
          stayStatus: 'checked_out',
          updatedAt: new Date().toISOString(),
        };
        saveStoredStays(stays);

        // Mark Room as VACANT DIRTY and clear guest
        const roomIdx = rooms.findIndex((r) => r.id === stay.roomId || r.number === stay.roomNumber);
        if (roomIdx >= 0) {
          rooms[roomIdx].status = 'vacant_dirty';
          rooms[roomIdx].guestName = undefined;
          saveStoredRooms(rooms);

          supabaseFetch(`rooms?id=eq.${rooms[roomIdx].id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'vacant_dirty' }),
          }).catch(() => { });
        }

        // Trigger Admin Notification
        addNotification(
          `Guest Checked Out: Room ${stay.roomNumber}`,
          `${stay.guestName} checked out of Room ${stay.roomNumber}. Final payment: ₹${finalPayment.toLocaleString('en-IN')} via ${paymentMethod}. Room is now marked DIRTY for housekeeping.`,
          'info',
          'check_out'
        );

        return ok({ success: true, stay: stays[stayIdx] });
      }
      return ok({ success: false, message: 'Stay record not found' });
    }

    // POST /stays/:id/payment: Collect Additional / Interim Payment
    if (method === 'POST' && url.includes('/payment')) {
      const stayIdMatch = url.match(/\/stays\/([^/?]+)\/payment/);
      const stayId = stayIdMatch ? stayIdMatch[1] : '';
      const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : (config.data || {});
      const amount = Number(body.amount) || 0;
      const paymentMethod = body.paymentMethod || 'Cash';

      const stayIdx = stays.findIndex((s) => s.id === stayId);
      if (stayIdx >= 0) {
        const stay = stays[stayIdx];
        const newPrev = (stay.previousPayments || 0) + amount;
        const newBalance = Math.max(0, stay.totalAmount - stay.advancePaid - newPrev);

        stays[stayIdx] = {
          ...stay,
          previousPayments: newPrev,
          balance: newBalance,
          paymentStatus: newBalance === 0 ? 'paid' : 'partially_paid',
          updatedAt: new Date().toISOString(),
        };
        saveStoredStays(stays);

        addNotification(
          `Payment Received: Room ${stay.roomNumber}`,
          `₹${amount.toLocaleString('en-IN')} received via ${paymentMethod} for ${stay.guestName}. Remaining balance: ₹${newBalance.toLocaleString('en-IN')}.`,
          'info',
          'payment'
        );

        return ok({ success: true, stay: stays[stayIdx] });
      }
      return ok({ success: false, message: 'Stay record not found' });
    }
  }

  // 18. Staff Notifications
  if (url.includes('/staff-notifications')) {
    const notifs = getStoredNotifications();
    if (url.includes('/unread-count')) {
      const unread = notifs.filter((n) => !n.isRead).length;
      return ok({ count: unread });
    }

    if (method === 'PATCH') {
      if (url.includes('/read-all')) {
        const updated = notifs.map((n) => ({ ...n, isRead: true }));
        saveStoredNotifications(updated);
        return ok({ success: true, unread: 0 });
      }
      const match = url.match(/\/staff-notifications\/([^/?]+)\/read/);
      if (match) {
        const id = match[1];
        const updated = notifs.map((n) => (n.id === id ? { ...n, isRead: true } : n));
        saveStoredNotifications(updated);
        return ok({ success: true, id });
      }
    }

    return ok(notifs);
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
    const emps = getStoredEmployees();
    if (method === 'GET') {
      return ok(emps);
    }
    if (method === 'POST') {
      const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : (config.data || {});
      const newEmp = {
        id: body.id || `e${Date.now().toString().slice(-7)}-0000-4000-a000-000000000001`,
        employeeId: body.employeeId || `EMP-SPARK-${Math.floor(100 + Math.random() * 900)}`,
        name: body.name || 'Staff Member',
        mobile: body.mobile || '',
        email: body.email || '',
        address: body.address || '',
        departmentId: body.departmentId || '',
        departmentName: body.departmentName || 'Front Office',
        designation: body.designation || 'Staff',
        salary: Number(body.salary) || 35000,
        role: body.role || 'Receptionist',
        shift: body.shift || 'morning',
        status: body.status || 'active',
        joiningDate: body.joiningDate || new Date().toISOString().split('T')[0],
      };
      saveStoredEmployees([...emps, newEmp]);
      return ok({ success: true, ...newEmp });
    }
    if (method === 'PUT' || method === 'PATCH') {
      const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : (config.data || {});
      const idMatch = url.match(/\/employees\/([^/?]+)/);
      const empId = idMatch ? idMatch[1] : (body.id || '');
      const idx = emps.findIndex((e) => e.id === empId || e.employeeId === empId);
      if (idx >= 0) {
        emps[idx] = { ...emps[idx], ...body };
        saveStoredEmployees(emps);
      }
      return ok({ success: true, id: empId, ...body });
    }
    if (method === 'DELETE') {
      const idMatch = url.match(/\/employees\/([^/?]+)/);
      const empId = idMatch ? idMatch[1] : '';
      const filtered = emps.filter((e) => e.id !== empId && e.employeeId !== empId);
      saveStoredEmployees(filtered);
      return ok({ success: true, id: empId });
    }
  }

  // 23. Reports & Dashboard KPIs
  if (url.includes('/reports/financial-summary')) {
    const stays = getStoredStays();
    const rooms = getStoredRooms();
    const totalCollected = stays.reduce((sum, s) => sum + (s.advancePaid || 0) + (s.previousPayments || 0), 0);
    const pendingBalance = stays.filter((s) => s.stayStatus === 'in_house').reduce((sum, s) => sum + (s.balance || 0), 0);
    const occupied = rooms.filter((r) => r.status === 'occupied').length;
    const occRate = rooms.length > 0 ? Math.round((occupied / rooms.length) * 100) : 40;

    return ok({
      kpis: {
        totalRevenue: totalCollected,
        monthlyRevenue: totalCollected * 2.5,
        pendingPayments: pendingBalance,
        adr: 3500,
        revpar: Math.round(totalCollected / (rooms.length || 1)),
        occupancyRate: occRate,
      },
    });
  }

  if (url.includes('/reports/occupancy')) {
    const rooms = getStoredRooms();
    const stays = getStoredStays();
    const total = rooms.length;
    const occupied = rooms.filter((r) => r.status === 'occupied').length;
    const available = rooms.filter((r) => r.status === 'vacant_clean' || r.status === 'clean' || r.status === 'available').length;
    const dirty = rooms.filter((r) => r.status === 'vacant_dirty').length;
    const occRate = total > 0 ? Math.round((occupied / total) * 100) : 0;
    const inHouseCount = stays.filter((s) => s.stayStatus === 'in_house').length;

    return ok({
      occupancyRate: occRate,
      occupiedRooms: occupied,
      availableRooms: available,
      dirtyRooms: dirty,
      currentlyStaying: inHouseCount,
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
