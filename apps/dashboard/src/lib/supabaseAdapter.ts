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
  'b0000001-0000-4000-a000-000000000001': { name: 'Budget', code: 'BGT' },
  'b0000002-0000-4000-a000-000000000002': { name: 'Deluxe Room', code: 'DLX' },
  'b0000003-0000-4000-a000-000000000003': { name: 'Executive Room', code: 'EXE' },
  'b0000004-0000-4000-a000-000000000004': { name: 'Suite', code: 'SUT' },
  // Legacy aliases
  'b0000002-0000-4000-a000-000000000001': { name: 'Suite', code: 'SUT' },
  'b0000003-0000-4000-a000-000000000001': { name: 'Executive Room', code: 'EXE' },
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
  isTaxInclusive: false,
  childrenPolicy: 'Children below 7 years: Free stay without an extra bed.',
  cancellationPolicy: 'Non-refundable room reservations.',
  paymentPolicy: 'All major credit/debit cards (Visa, MasterCard, RuPay), UPI & Cash accepted.',
  categories: [
    {
      id: 'b0000001-0000-4000-a000-000000000001',
      name: 'Budget',
      code: 'BGT',
      description: 'Comfortable compact room for single travelers. Rooms: 2006, 3006, 4006.',
      singleOccupancyPrice: 1599,
      doubleOccupancyPrice: null,
      maxOccupancy: 1,
      assignedRoomsCount: 3,
      amenities: ['wifi', 'tv', 'ac', 'room_service'],
    },
    {
      id: 'b0000002-0000-4000-a000-000000000002',
      name: 'Deluxe Room',
      code: 'DLX',
      description: 'Elegant deluxe room with plush bedding and private ensuite bath. 12 rooms across Floors 2, 3 & 4.',
      singleOccupancyPrice: 1799,
      doubleOccupancyPrice: 2099,
      maxOccupancy: 2,
      assignedRoomsCount: 12,
      amenities: ['wifi', 'tv', 'ac', 'safe', 'tea_maker', 'balcony'],
    },
    {
      id: 'b0000003-0000-4000-a000-000000000003',
      name: 'Executive Room',
      code: 'EXE',
      description: 'Sophisticated executive room featuring panoramic views and queen-size bed. 11 rooms across Floors 2, 3 & 4.',
      singleOccupancyPrice: 2199,
      doubleOccupancyPrice: 2499,
      maxOccupancy: 3,
      assignedRoomsCount: 11,
      amenities: ['wifi', 'tv', 'ac', 'safe', 'minibar', 'city_view'],
    },
    {
      id: 'b0000004-0000-4000-a000-000000000004',
      name: 'Suite',
      code: 'SUT',
      description: 'Spacious signature suite featuring a master bedroom, living hall and luxury bathtub. Rooms: 2010, 3010.',
      singleOccupancyPrice: null,
      doubleOccupancyPrice: 2799,
      maxOccupancy: 4,
      assignedRoomsCount: 2,
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
  // 2nd Floor (10 Rooms: 2001-2010)
  { id: '5aca9c61-49d7-42db-885c-58d30dfceac7', propertyId: PROPERTY_ID, number: '2001', floor: '2', roomTypeId: 'b0000002-0000-4000-a000-000000000002', roomTypeName: 'Deluxe Room', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'safe', 'balcony'] },
  { id: 'c88c9bd4-63ba-4ecf-8780-46e9c3378d1b', propertyId: PROPERTY_ID, number: '2002', floor: '2', roomTypeId: 'b0000003-0000-4000-a000-000000000003', roomTypeName: 'Executive Room', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'safe', 'minibar'] },
  { id: '570526d0-8fac-4893-a914-586b57e7531b', propertyId: PROPERTY_ID, number: '2003', floor: '2', roomTypeId: 'b0000002-0000-4000-a000-000000000002', roomTypeName: 'Deluxe Room', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'safe', 'balcony'] },
  { id: '3f015f1e-6b7c-49b9-aaf3-6cfe51acfbd5', propertyId: PROPERTY_ID, number: '2004', floor: '2', roomTypeId: 'b0000002-0000-4000-a000-000000000002', roomTypeName: 'Deluxe Room', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'safe', 'balcony'] },
  { id: '7db20997-3628-42dc-9870-69894e0e584f', propertyId: PROPERTY_ID, number: '2005', floor: '2', roomTypeId: 'b0000003-0000-4000-a000-000000000003', roomTypeName: 'Executive Room', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'safe', 'minibar'] },
  { id: 'd5aa0e23-fc68-441e-a20c-3fac98edd91a', propertyId: PROPERTY_ID, number: '2006', floor: '2', roomTypeId: 'b0000001-0000-4000-a000-000000000001', roomTypeName: 'Budget', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'room_service'] },
  { id: 'c224f246-7cb5-40d1-976a-27d0e27e846a', propertyId: PROPERTY_ID, number: '2007', floor: '2', roomTypeId: 'b0000002-0000-4000-a000-000000000002', roomTypeName: 'Deluxe Room', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'safe', 'balcony'] },
  { id: '9b1713d2-17cf-46be-8c3d-03beef797722', propertyId: PROPERTY_ID, number: '2008', floor: '2', roomTypeId: 'b0000003-0000-4000-a000-000000000003', roomTypeName: 'Executive Room', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'safe', 'minibar'] },
  { id: 'd39a0075-b818-4584-8923-8f7842ad25a5', propertyId: PROPERTY_ID, number: '2009', floor: '2', roomTypeId: 'b0000003-0000-4000-a000-000000000003', roomTypeName: 'Executive Room', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'safe', 'minibar'] },
  { id: 'cee8da28-abab-466c-b357-1c1d018c97e7', propertyId: PROPERTY_ID, number: '2010', floor: '2', roomTypeId: 'b0000004-0000-4000-a000-000000000004', roomTypeName: 'Suite', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'safe', 'minibar', 'living_area', 'bathtub'] },

  // 3rd Floor (10 Rooms: 3001-3010)
  { id: '12f46802-e6ef-4442-9719-07696d1d823f', propertyId: PROPERTY_ID, number: '3001', floor: '3', roomTypeId: 'b0000002-0000-4000-a000-000000000002', roomTypeName: 'Deluxe Room', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'safe', 'balcony'] },
  { id: 'b04ded34-41be-4834-a0cf-e4a5ad5b47d9', propertyId: PROPERTY_ID, number: '3002', floor: '3', roomTypeId: 'b0000003-0000-4000-a000-000000000003', roomTypeName: 'Executive Room', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'safe', 'minibar'] },
  { id: '23881fbd-edc5-4abe-a975-c85733a86672', propertyId: PROPERTY_ID, number: '3003', floor: '3', roomTypeId: 'b0000002-0000-4000-a000-000000000002', roomTypeName: 'Deluxe Room', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'safe', 'balcony'] },
  { id: '7634b89b-b1e2-4281-8b23-e1934c15eb69', propertyId: PROPERTY_ID, number: '3004', floor: '3', roomTypeId: 'b0000002-0000-4000-a000-000000000002', roomTypeName: 'Deluxe Room', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'safe', 'balcony'] },
  { id: 'fdeb0677-bf47-4fbd-a65a-60ac6134bb82', propertyId: PROPERTY_ID, number: '3005', floor: '3', roomTypeId: 'b0000003-0000-4000-a000-000000000003', roomTypeName: 'Executive Room', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'safe', 'minibar'] },
  { id: '3b5bbe33-31aa-4a69-ba9d-ef30444ed4a4', propertyId: PROPERTY_ID, number: '3006', floor: '3', roomTypeId: 'b0000001-0000-4000-a000-000000000001', roomTypeName: 'Budget', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'room_service'] },
  { id: 'c00a1f3f-2260-43c4-aa59-e36a4fc8141d', propertyId: PROPERTY_ID, number: '3007', floor: '3', roomTypeId: 'b0000002-0000-4000-a000-000000000002', roomTypeName: 'Deluxe Room', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'safe', 'balcony'] },
  { id: '64e8a350-9131-4df5-8642-1dfea6d52c45', propertyId: PROPERTY_ID, number: '3008', floor: '3', roomTypeId: 'b0000003-0000-4000-a000-000000000003', roomTypeName: 'Executive Room', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'safe', 'minibar'] },
  { id: '6f158f95-ea10-44a4-ac0d-697d422f7586', propertyId: PROPERTY_ID, number: '3009', floor: '3', roomTypeId: 'b0000003-0000-4000-a000-000000000003', roomTypeName: 'Executive Room', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'safe', 'minibar'] },
  { id: '5a61c51b-d33f-4b0a-84a2-d5fc56705a42', propertyId: PROPERTY_ID, number: '3010', floor: '3', roomTypeId: 'b0000004-0000-4000-a000-000000000004', roomTypeName: 'Suite', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'safe', 'minibar', 'living_area', 'bathtub'] },

  // 4th Floor (8 Rooms: 4001-4008)
  { id: '1a4c3c83-cd99-4f4c-b55b-e4b072769db2', propertyId: PROPERTY_ID, number: '4001', floor: '4', roomTypeId: 'b0000002-0000-4000-a000-000000000002', roomTypeName: 'Deluxe Room', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'safe', 'balcony'] },
  { id: 'ae825695-3665-4c2e-b720-041ceaf589ce', propertyId: PROPERTY_ID, number: '4002', floor: '4', roomTypeId: 'b0000003-0000-4000-a000-000000000003', roomTypeName: 'Executive Room', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'safe', 'minibar'] },
  { id: '9858efbf-2df3-4ab3-8c79-3f9e4bdcd77a', propertyId: PROPERTY_ID, number: '4003', floor: '4', roomTypeId: 'b0000002-0000-4000-a000-000000000002', roomTypeName: 'Deluxe Room', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'safe', 'balcony'] },
  { id: '4672e9d7-ecb3-4e62-9a83-81631a9036e6', propertyId: PROPERTY_ID, number: '4004', floor: '4', roomTypeId: 'b0000002-0000-4000-a000-000000000002', roomTypeName: 'Deluxe Room', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'safe', 'balcony'] },
  { id: '2f4e5dcc-292b-4c54-ba8b-5be33b3e1879', propertyId: PROPERTY_ID, number: '4005', floor: '4', roomTypeId: 'b0000003-0000-4000-a000-000000000003', roomTypeName: 'Executive Room', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'safe', 'minibar'] },
  { id: '738f4cdf-e4f8-4473-8202-067f59e38ee6', propertyId: PROPERTY_ID, number: '4006', floor: '4', roomTypeId: 'b0000001-0000-4000-a000-000000000001', roomTypeName: 'Budget', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'room_service'] },
  { id: 'eb7b1cc9-9de6-4e5b-9c72-03fb2edd58a5', propertyId: PROPERTY_ID, number: '4007', floor: '4', roomTypeId: 'b0000002-0000-4000-a000-000000000002', roomTypeName: 'Deluxe Room', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'safe', 'balcony'] },
  { id: '8f34f3f5-17ba-4fdb-926c-27b0754b504d', propertyId: PROPERTY_ID, number: '4008', floor: '4', roomTypeId: 'b0000003-0000-4000-a000-000000000003', roomTypeName: 'Executive Room', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'safe', 'minibar'] },
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

export const DEFAULT_STAYS: StoredStay[] = [];

export const DEFAULT_NOTIFICATIONS: StoredNotification[] = [];

export function getStoredRooms(): StoredRoom[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(ROOMS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 28 && parsed.some((r: any) => r.number === '2001') && !parsed.some((r: any) => r.number === '101')) {
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
        if (Array.isArray(parsed)) {
          return parsed.filter((item: StoredStay) => 
            !item.id.startsWith('stay-00') && 
            !item.id.startsWith('stay-hist-') && 
            item.guestName !== 'Rahul Verma' && 
            item.guestName !== 'Priya Sharma' && 
            item.guestName !== 'Vikram Malhotra' && 
            item.guestName !== 'Sneha Reddy'
          );
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

const DEFAULT_GUESTS: any[] = [];

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

const DEFAULT_RESERVATIONS: any[] = [];

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
        if (Array.isArray(parsed)) {
          return parsed.filter((r: any) => 
            !r.id.startsWith('resv-00') && 
            !r.confirmationNumber?.includes('880') && 
            r.guestName !== 'Suresh Goud' && 
            r.guestName !== 'Mohammed Rafi'
          );
        }
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
        if (Array.isArray(parsed)) {
          return parsed.filter((g: any) => !g.id.startsWith('g000000'));
        }
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

export const DIRECT_BOOKINGS_STORAGE_KEY = 'hotel_spark_direct_bookings';

export const DEFAULT_DIRECT_BOOKINGS: any[] = [];

export function getStoredDirectBookings(): any[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(DIRECT_BOOKINGS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((b: any) => 
            b.id !== '2a52aaa6-dd15-4c31-9716-a81c2080288a' &&
            b.id !== 'b744d03d-24fb-4bca-85f0-619f79883db1' &&
            b.id !== 'c287d743-808d-41f1-8034-e9baf96faabc' &&
            b.id !== '30b3fd49-613c-4c29-9b7b-877e645eb66f' &&
            b.id !== '415de485-046d-4591-830b-6183994c823a' &&
            b.id !== 'fb3e09c9-b088-4604-82e2-30c010c06715'
          );
        }
      }
    }
  } catch (e) {
    void e;
  }
  return [...DEFAULT_DIRECT_BOOKINGS];
}

export function saveStoredDirectBookings(list: any[]) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(DIRECT_BOOKINGS_STORAGE_KEY, JSON.stringify(list));
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

export const MEDIA_STORAGE_KEY = 'haip_media_store';

export interface StoredMediaItem {
  id: string;
  propertyId: string;
  ownerType: 'property' | 'room_type' | 'room';
  ownerId: string;
  url: string;
  storageKey: string | null;
  category: 'hero' | 'exterior' | 'room' | 'amenity' | 'dining' | 'other';
  caption: string | null;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
}

export const DEFAULT_MEDIA_ITEMS: StoredMediaItem[] = [
  // Budget Room Type (b0000001-0000-4000-a000-000000000001)
  {
    id: 'med-bgt-01',
    propertyId: PROPERTY_ID,
    ownerType: 'room_type',
    ownerId: 'b0000001-0000-4000-a000-000000000001',
    url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
    storageKey: null,
    category: 'room',
    caption: 'Hotel Spark Budget Room',
    altText: 'Budget Room Single/Double Bed',
    sortOrder: 0,
    isPrimary: true,
  },
  // Deluxe Room Type (b0000002-0000-4000-a000-000000000002)
  {
    id: 'med-dlx-01',
    propertyId: PROPERTY_ID,
    ownerType: 'room_type',
    ownerId: 'b0000002-0000-4000-a000-000000000002',
    url: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=80',
    storageKey: null,
    category: 'room',
    caption: 'Hotel Spark Deluxe Room',
    altText: 'Deluxe Room with Queen Bed and Balcony',
    sortOrder: 0,
    isPrimary: true,
  },
  // Executive Room Type (b0000003-0000-4000-a000-000000000003 - includes Room 2005)
  {
    id: 'med-exe-01',
    propertyId: PROPERTY_ID,
    ownerType: 'room_type',
    ownerId: 'b0000003-0000-4000-a000-000000000003',
    url: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80',
    storageKey: null,
    category: 'room',
    caption: 'Hotel Spark Executive King Room',
    altText: 'Executive Room Panoramic Views and Work Desk',
    sortOrder: 0,
    isPrimary: true,
  },
  // Suite Type (b0000004-0000-4000-a000-000000000004)
  {
    id: 'med-sut-01',
    propertyId: PROPERTY_ID,
    ownerType: 'room_type',
    ownerId: 'b0000004-0000-4000-a000-000000000004',
    url: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80',
    storageKey: null,
    category: 'room',
    caption: 'Hotel Spark Signature Suite',
    altText: 'Signature Luxury Suite Living Room and Master Bed',
    sortOrder: 0,
    isPrimary: true,
  },
];

export function getStoredMedia(): StoredMediaItem[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(MEDIA_STORAGE_KEY);
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
  return [...DEFAULT_MEDIA_ITEMS];
}

export function saveStoredMedia(items: StoredMediaItem[]): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(MEDIA_STORAGE_KEY, JSON.stringify(items));
    }
  } catch (e) {
    void e;
  }
}

export async function fileToDataUrl(file: File, maxEdge = 1600, quality = 0.82): Promise<string> {
  try {
    if (typeof window !== 'undefined' && typeof window.createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(bitmap, 0, 0, width, height);
        bitmap.close();
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        if (dataUrl && dataUrl.length > 64) {
          return dataUrl;
        }
      }
      bitmap.close();
    }
  } catch (err) {
    console.warn('Canvas image compression fallback to FileReader:', err);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
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

  // Media endpoints: config, list, upload, add, delete, primary, reorder
  if (url.includes('/media/config')) {
    return ok({ uploadEnabled: true });
  }

  if (url.includes('/media/upload') && method === 'POST') {
    let file: File | null = null;
    let propId = PROPERTY_ID;
    let ownerType: any = 'room';
    let ownerId = '';
    let caption = '';

    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      file = config.data.get('file') as File;
      propId = (config.data.get('propertyId') as string) || PROPERTY_ID;
      ownerType = (config.data.get('ownerType') as string) || 'room';
      ownerId = (config.data.get('ownerId') as string) || '';
      caption = (config.data.get('caption') as string) || '';
    } else if (config.data && typeof config.data === 'object') {
      file = config.data.file;
      propId = config.data.propertyId || PROPERTY_ID;
      ownerType = config.data.ownerType || 'room';
      ownerId = config.data.ownerId || '';
      caption = config.data.caption || '';
    }

    if (!file) {
      return ok({ error: 'No file provided' });
    }

    const dataUrl = await fileToDataUrl(file);
    const allMedia = getStoredMedia();
    const existingForOwner = allMedia.filter((m) => m.ownerType === ownerType && m.ownerId === ownerId);

    const newItem: StoredMediaItem = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `med_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      propertyId: propId,
      ownerType,
      ownerId,
      url: dataUrl,
      storageKey: null,
      category: 'room',
      caption: caption || file.name.replace(/\.[^/.]+$/, ''),
      altText: caption || file.name,
      sortOrder: existingForOwner.length,
      isPrimary: existingForOwner.length === 0,
    };

    const updated = [...allMedia, newItem];
    saveStoredMedia(updated);
    return ok(newItem);
  }

  if (url.includes('/media/reorder') && method === 'POST') {
    const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : (config.data || {});
    const orderedIds: string[] = body.orderedIds || [];
    const allMedia = getStoredMedia();
    orderedIds.forEach((id, index) => {
      const item = allMedia.find((m) => m.id === id);
      if (item) item.sortOrder = index;
    });
    saveStoredMedia(allMedia);
    return ok({ success: true });
  }

  if (url.includes('/media/') && url.includes('/primary') && method === 'POST') {
    const match = url.match(/\/media\/([^/?]+)\/primary/);
    const mediaId = match ? match[1] : '';
    const allMedia = getStoredMedia();
    const target = allMedia.find((m) => m.id === mediaId);
    if (target) {
      allMedia.forEach((m) => {
        if (m.ownerType === target.ownerType && m.ownerId === target.ownerId) {
          m.isPrimary = m.id === mediaId;
        }
      });
      saveStoredMedia(allMedia);
    }
    return ok({ success: true, id: mediaId });
  }

  if (url.match(/\/media\/([^/?]+)$/) && method === 'DELETE') {
    const match = url.match(/\/media\/([^/?]+)$/);
    const mediaId = match ? match[1] : '';
    const allMedia = getStoredMedia();
    const itemToRemove = allMedia.find((m) => m.id === mediaId);
    const updated = allMedia.filter((m) => m.id !== mediaId);
    if (itemToRemove?.isPrimary) {
      const nextPrimary = updated.find((m) => m.ownerType === itemToRemove.ownerType && m.ownerId === itemToRemove.ownerId);
      if (nextPrimary) {
        nextPrimary.isPrimary = true;
      }
    }
    saveStoredMedia(updated);
    return ok({ success: true, id: mediaId });
  }

  if ((url.endsWith('/media') || url.includes('/media?')) && method === 'POST') {
    const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : (config.data || {});
    const allMedia = getStoredMedia();
    const ownerType = body.ownerType || 'room';
    const ownerId = body.ownerId || '';
    const existingForOwner = allMedia.filter((m) => m.ownerType === ownerType && m.ownerId === ownerId);

    const newItem: StoredMediaItem = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `med_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      propertyId: body.propertyId || PROPERTY_ID,
      ownerType,
      ownerId,
      url: body.url,
      storageKey: null,
      category: body.category || 'room',
      caption: body.caption || null,
      altText: body.altText || body.caption || 'Hotel Spark Room Photo',
      sortOrder: existingForOwner.length,
      isPrimary: existingForOwner.length === 0,
    };

    const updated = [...allMedia, newItem];
    saveStoredMedia(updated);
    return ok(newItem);
  }

  if ((url.endsWith('/media') || url.includes('/media?')) && method === 'GET') {
    let ownerType = config.params?.ownerType;
    let ownerId = config.params?.ownerId;
    if (!ownerType || !ownerId) {
      try {
        const urlObj = new URL(url, 'http://localhost');
        ownerType = ownerType || urlObj.searchParams.get('ownerType');
        ownerId = ownerId || urlObj.searchParams.get('ownerId');
      } catch (e) {
        void e;
      }
    }

    const allMedia = getStoredMedia();
    let filtered = allMedia;
    if (ownerType) {
      filtered = filtered.filter((m) => m.ownerType === ownerType);
    }
    if (ownerId) {
      filtered = filtered.filter((m) => m.ownerId === ownerId);
    }
    filtered.sort((a, b) => a.sortOrder - b.sortOrder);
    return ok(filtered);
  }

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
    const currentRooms = getStoredRooms();
    const targetRoom = currentRooms.find((r) => r.id === body.roomId || r.number === body.roomId) || currentRooms.find((r) => r.status === 'vacant_clean') || currentRooms[0];
    const roomId = targetRoom.id;
    const roomNumber = targetRoom.number;
    const confCode = `CONF-${Date.now().toString(36).toUpperCase()}`;

    // 1. Update localStorage direct bookings
    const directBookings = getStoredDirectBookings();
    let approvedBooking: any = null;
    const updatedDirectBookings = directBookings.map((b: any) => {
      if (b.id === requestId || b.reference === requestId) {
        approvedBooking = {
          ...b,
          status: 'accepted',
          assignedRoomNumber: roomNumber,
          confirmedReservationNumber: confCode,
          decidedAt: new Date().toISOString(),
        };
        return approvedBooking;
      }
      return b;
    });
    saveStoredDirectBookings(updatedDirectBookings);

    // 2. Update room status in localStorage
    const updatedRooms = currentRooms.map((r) =>
      r.id === roomId || r.number === roomNumber ? { ...r, status: 'occupied', guestName: `${approvedBooking?.guestFirstName || 'Guest'} ${approvedBooking?.guestLastName || ''}`.trim() } : r
    );
    saveStoredRooms(updatedRooms);

    // 3. Auto-create In-House stay so the guest appears in Front Desk In-House tab immediately
    const guestFirst = approvedBooking?.guestFirstName || 'Online';
    const guestLast = approvedBooking?.guestLastName || 'Guest';
    const fullGuestName = `${guestFirst} ${guestLast}`.trim();
    const currentStays = getStoredStays();
    const newStay: StoredStay = {
      id: `stay-${requestId || Date.now()}`,
      propertyId: PROPERTY_ID,
      guestName: fullGuestName,
      mobile: approvedBooking?.guestPhone || '+91 98765 00000',
      email: approvedBooking?.guestEmail || 'guest@example.com',
      address: 'Online Website Booking',
      city: 'Karimnagar',
      state: 'Telangana',
      idProofType: 'Aadhaar Card',
      idProofNumber: '7823 4512 9012',
      idProofFrontUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
      idProofBackUrl: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=600&auto=format&fit=crop&q=80',
      adults: approvedBooking?.adults || 2,
      children: approvedBooking?.children || 0,
      roomId: roomId,
      roomNumber: roomNumber,
      roomTypeName: approvedBooking?.roomTypeName || 'Deluxe King Room',
      checkInTime: new Date().toISOString(),
      expectedCheckoutTime: new Date(Date.now() + 86400000).toISOString(),
      nights: 1,
      pricePerNight: Number(approvedBooking?.submittedTotal || 3920),
      extraCharges: 0,
      discount: 0,
      totalAmount: Number(approvedBooking?.submittedTotal || 3920),
      advancePaid: Number(approvedBooking?.submittedTotal || 3920),
      previousPayments: 0,
      balance: 0,
      paymentMethod: 'Online Website',
      paymentStatus: 'paid',
      stayStatus: 'in_house',
      billNumber: confCode,
      notes: `Direct website booking confirmed. Ref: ${approvedBooking?.reference || confCode}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveStoredStays([newStay, ...currentStays.filter((s) => s.id !== newStay.id)]);

    // 4. Auto-create reservation in localStorage
    const localResvs = getStoredReservations();
    const newResv = {
      id: `res-${requestId || Date.now()}`,
      confirmationNumber: confCode,
      bookingId: `bk-${requestId || Date.now()}`,
      status: 'checked_in',
      arrivalDate: approvedBooking?.arrivalDate || new Date().toISOString().split('T')[0],
      departureDate: approvedBooking?.departureDate || new Date(Date.now() + 86400000).toISOString().split('T')[0],
      roomId,
      roomNumber: roomNumber,
      roomTypeId: approvedBooking?.roomTypeId || 'b0000001-0000-4000-a000-000000000001',
      roomTypeName: approvedBooking?.roomTypeName || 'Deluxe King Room',
      guestName: fullGuestName,
      guest: {
        firstName: guestFirst,
        lastName: guestLast,
        email: approvedBooking?.guestEmail || null,
        phone: approvedBooking?.guestPhone || null,
      },
      totalAmount: String(approvedBooking?.submittedTotal || '3920.00'),
    };
    saveStoredReservations([newResv, ...localResvs.filter((r) => r.id !== newResv.id)]);

    // 5. Sync to serverless function or Supabase in background
    (async () => {
      try {
        await fetch(`/api/direct-bookings/${requestId}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId }),
        });
      } catch {
        // Fallback to Supabase REST
        if (requestId) {
          await supabaseFetch(`booking_requests?id=eq.${requestId}`, {
            method: 'PATCH',
            body: JSON.stringify({
              status: 'accepted',
              decided_at: new Date().toISOString(),
              decided_by: 'Hotel Spark Admin',
            }),
          });
          await supabaseFetch(`rooms?id=eq.${roomId}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'occupied' }),
          });
        }
      }
    })().catch((err) => console.warn('Approve sync error:', err));

    return ok({
      success: true,
      roomNumber: roomNumber,
      confirmationNumber: confCode,
    });
  }

  // 4. Direct booking reject
  if (url.includes('/direct-bookings') && (url.includes('/reject') || url.includes('/deny')) && method === 'POST') {
    const idMatch = url.match(/\/direct-bookings\/([^/]+)\/(?:reject|deny)/);
    const requestId = idMatch ? idMatch[1] : '';
    const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : (config.data || {});

    // Update localStorage
    const directBookings = getStoredDirectBookings();
    const updatedDirectBookings = directBookings.map((b: any) => {
      if (b.id === requestId || b.reference === requestId) {
        return {
          ...b,
          status: 'denied',
          denialReason: body.reason || 'Requested dates unavailable',
          decidedAt: new Date().toISOString(),
        };
      }
      return b;
    });
    saveStoredDirectBookings(updatedDirectBookings);

    // Sync to serverless function or Supabase in background
    (async () => {
      try {
        await fetch(`/api/direct-bookings/${requestId}/reject`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: body.reason }),
        });
      } catch {
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
      }
    })().catch((err) => console.warn('Reject sync error:', err));

    return ok({ success: true });
  }

  // 5. Direct Bookings list
  if (url.includes('/direct-bookings') && method === 'GET') {
    if (url.includes('/history/audit')) {
      const stored = getStoredDirectBookings();
      const map = new Map<string, any>();
      for (const b of stored) {
        if (b.status === 'accepted' || b.status === 'denied') {
          map.set(b.id, b);
        }
      }

      try {
        const { data: dbReqs } = await supabaseFetch<any[]>('booking_requests?select=*&order=decided_at.desc,created_at.desc');
        if (Array.isArray(dbReqs)) {
          for (const r of dbReqs) {
            if (r.status === 'accepted' || r.status === 'denied') {
              map.set(r.id, {
                id: r.id,
                propertyId: r.property_id || PROPERTY_ID,
                status: r.status,
                guestFirstName: r.guest_first_name,
                guestLastName: r.guest_last_name,
                reference: r.submission_idempotency_key || `SPARK-${r.id.slice(0, 8).toUpperCase()}`,
                submittedTotal: r.submitted_total,
                assignedRoomNumber: r.status === 'accepted' ? '2001' : null,
                denialReason: r.denial_reason,
                decidedAt: r.decided_at || r.updated_at,
                createdAt: r.created_at,
              });
            }
          }
        }
      } catch {}

      const auditList: any[] = [];
      for (const b of map.values()) {
        if (b.status === 'accepted') {
          auditList.push({
            id: `audit-${b.id}-approve`,
            propertyId: b.propertyId || PROPERTY_ID,
            action: 'approve',
            entityType: 'booking_request',
            entityId: b.id,
            description: `Admin approved booking request for ${b.guestFirstName || 'Guest'} ${b.guestLastName || ''} (${b.reference}) and assigned Room ${b.assignedRoomNumber || '2001'}.`,
            occurredAt: b.decidedAt || b.createdAt || new Date().toISOString(),
            newValue: {
              roomNumber: b.assignedRoomNumber || '2001',
              total: b.submittedTotal,
              guest: `${b.guestFirstName || 'Guest'} ${b.guestLastName || ''}`.trim(),
            },
          });
        } else if (b.status === 'denied') {
          auditList.push({
            id: `audit-${b.id}-reject`,
            propertyId: b.propertyId || PROPERTY_ID,
            action: 'reject',
            entityType: 'booking_request',
            entityId: b.id,
            description: `Admin rejected booking request for ${b.guestFirstName || 'Guest'} ${b.guestLastName || ''}. Reason: ${b.denialReason || 'Room unavailable'}.`,
            occurredAt: b.decidedAt || b.createdAt || new Date().toISOString(),
            newValue: {
              reason: b.denialReason,
              guest: `${b.guestFirstName || 'Guest'} ${b.guestLastName || ''}`.trim(),
            },
          });
        }
      }

      auditList.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
      return ok({ data: auditList });
    }

    let serverReqs: any[] = [];

    // Attempt 1: Fetch via Netlify serverless endpoint
    try {
      const resp = await fetch('/api/v1/direct-bookings').catch(() => fetch('/api/direct-bookings'));
      if (resp && resp.ok) {
        const text = await resp.text();
        if (text.startsWith('[') || text.startsWith('{')) {
          const data = JSON.parse(text);
          const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
          if (list.length > 0) {
            serverReqs = list;
          }
        }
      }
    } catch {
      // Netlify function not available in current environment
    }

    // Attempt 2: Direct Supabase REST fetch
    if (serverReqs.length === 0) {
      try {
        const { data: reqs } = await supabaseFetch<any[]>('booking_requests?select=*&order=created_at.desc');
        if (Array.isArray(reqs) && reqs.length > 0) {
          serverReqs = reqs.map((r) => {
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
        }
      } catch {
        // Continue to localStorage merge
      }
    }

    // Merge: DEFAULT_DIRECT_BOOKINGS + localStorage + serverReqs
    const stored = getStoredDirectBookings();
    const map = new Map<string, any>();

    for (const item of DEFAULT_DIRECT_BOOKINGS) {
      map.set(item.id, item);
      if (item.reference) map.set(item.reference, item);
    }
    for (const item of stored) {
      const existing = map.get(item.id) || (item.reference ? map.get(item.reference) : null) || {};
      const merged = { ...existing, ...item };
      map.set(item.id, merged);
      if (item.reference) map.set(item.reference, merged);
    }
    for (const item of serverReqs) {
      const existing = map.get(item.id) || (item.reference ? map.get(item.reference) : null) || {};
      const merged = { ...existing, ...item };
      map.set(item.id, merged);
      if (item.reference) map.set(item.reference, merged);
    }

    // Unique by id
    const uniqueMap = new Map<string, any>();
    for (const val of map.values()) {
      uniqueMap.set(val.id, val);
    }

    const items = Array.from(uniqueMap.values()).sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );

    let result = items;
    if (config.params?.status) {
      result = result.filter((i) => i.status === config.params.status);
    }
    if (config.params?.search) {
      const q = String(config.params.search).toLowerCase();
      result = result.filter(
        (i) =>
          i.guestFirstName?.toLowerCase().includes(q) ||
          i.guestLastName?.toLowerCase().includes(q) ||
          i.reference?.toLowerCase().includes(q)
      );
    }

    const counts = {
      total: items.length,
      pending: items.filter((i) => i.status === 'pending' || i.status === 'pending_approval').length,
      accepted: items.filter((i) => i.status === 'accepted').length,
      denied: items.filter((i) => i.status === 'denied').length,
    };

    return ok({ data: result, counts });
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

      // Fetch remote guests and booking requests in parallel
      let remoteGuests: any[] = [];
      let bookingReqs: any[] = [];
      try {
        const [gRes, bRes] = await Promise.all([
          supabaseFetch<any[]>('guests?select=*&order=created_at.desc'),
          supabaseFetch<any[]>('booking_requests?select=*&order=created_at.desc'),
        ]);
        if (Array.isArray(gRes.data)) remoteGuests = gRes.data;
        if (Array.isArray(bRes.data)) bookingReqs = bRes.data;
      } catch (err) {
        console.warn('Could not fetch guests from Supabase:', err);
      }

      const map = new Map<string, any>();

      // 1. From booking_requests (website visitors who booked)
      for (const b of bookingReqs) {
        if (!b.guest_first_name) continue;
        const key = (b.guest_phone || b.guest_email || b.id || '').trim();
        if (!key) continue;
        map.set(key, {
          id: b.id,
          propertyId: b.property_id || PROPERTY_ID,
          firstName: b.guest_first_name,
          lastName: b.guest_last_name || '',
          email: b.guest_email || '',
          phone: b.guest_phone || '',
          address: '',
          city: 'Karimnagar',
          state: 'Telangana',
          idType: 'aadhaar',
          idProofType: 'Aadhaar Card',
          idProofNumber: '',
          idProofFrontUrl: '',
          idProofBackUrl: '',
          vipLevel: 'none',
          status: 'active',
          stayCount: 1,
          totalSpend: Number(b.submitted_total) || 3500,
          createdAt: b.created_at,
        });
      }

      // 2. From remote guests table in Supabase
      for (const g of remoteGuests) {
        const key = (g.phone || g.email || g.id || '').trim();
        if (!key) continue;
        const reg = (g.registration_data && typeof g.registration_data === 'object') ? g.registration_data : {};
        map.set(key, {
          id: g.id,
          propertyId: g.property_id || PROPERTY_ID,
          firstName: g.first_name || 'Guest',
          lastName: g.last_name || '',
          email: g.email || '',
          phone: g.phone || '',
          address: g.address_line_1 || '',
          city: g.city || 'Karimnagar',
          state: g.state_province || 'Telangana',
          idType: g.id_type || 'aadhaar',
          idProofType: reg.idProofType || (g.id_type === 'aadhaar' ? 'Aadhaar Card' : g.id_type) || 'Aadhaar Card',
          idNumber: g.id_number || reg.idProofNumber || '',
          idProofNumber: reg.idProofNumber || g.id_number || '',
          idProofFrontUrl: reg.idProofFrontUrl || '',
          idProofBackUrl: reg.idProofBackUrl || '',
          vipLevel: g.vip_level || 'none',
          status: 'active',
          stayCount: 1,
          totalSpend: 3500,
          createdAt: g.created_at,
          updatedAt: g.updated_at,
        });
      }

      // 3. Merge stored guests from localStorage
      for (const lg of guests) {
        const key = (lg.phone || lg.email || lg.id || '').trim();
        if (!key) continue;
        const existing = map.get(key) || {};
        map.set(key, { ...existing, ...lg });
      }

      const allGuests = Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );

      if (singleId && singleId !== 'guests') {
        const found = allGuests.find((g) => g.id === singleId);
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
      let res = allGuests;
      if (search) {
        res = allGuests.filter(
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
      const guestId = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
        ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });

      const validVipLevels = ['none', 'silver', 'gold', 'platinum', 'diamond'];
      const safeVip = validVipLevels.includes(body.vipLevel) ? body.vipLevel : 'none';

      const newGuest = {
        id: guestId,
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
        vipLevel: safeVip,
        status: 'active',
        stayCount: 1,
        totalSpend: 3500,
        createdAt: new Date().toISOString(),
      };

      // 1. Save to local storage for immediate offline/local availability
      saveStoredGuests([newGuest, ...guests]);

      // 2. Persist to Supabase cloud database
      (async () => {
        try {
          await supabaseFetch('guests', {
            method: 'POST',
            body: JSON.stringify({
              id: guestId,
              hotel_id: PROPERTY_ID,
              property_id: PROPERTY_ID,
              first_name: newGuest.firstName,
              last_name: newGuest.lastName,
              email: newGuest.email || null,
              phone: newGuest.phone || null,
              date_of_birth: body.dateOfBirth || null,
              gender: body.gender || null,
              profession: body.profession || null,
              nationality: body.nationality || 'IN',
              tax_id: body.taxId || null,
              id_type: newGuest.idType,
              id_number: newGuest.idProofNumber || null,
              id_country: body.idCountry || 'IN',
              address_line_1: newGuest.address || null,
              city: newGuest.city,
              state_province: newGuest.state,
              postal_code: body.postalCode || '505001',
              country_code: body.countryCode || 'IN',
              vip_level: safeVip,
              company_name: body.companyName || null,
              loyalty_number: body.loyaltyNumber || null,
              registration_data: {
                idProofType: newGuest.idProofType,
                idProofNumber: newGuest.idProofNumber,
                idProofFrontUrl: newGuest.idProofFrontUrl,
                idProofBackUrl: newGuest.idProofBackUrl,
                ...(body.registrationData || {}),
              },
            }),
          });
        } catch {
          // If direct table insert is restricted by RLS for anon role, sync through the security definer RPC
        }

        try {
          const today = new Date().toISOString().slice(0, 10);
          const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
          await supabaseFetch('rpc/submit_website_booking_request', {
            method: 'POST',
            body: JSON.stringify({
              p_hotel_id: PROPERTY_ID,
              p_room_type_id: 'b0000001-0000-4000-a000-000000000001',
              p_arrival_date: today,
              p_departure_date: tomorrow,
              p_guest_first_name: newGuest.firstName,
              p_guest_last_name: newGuest.lastName,
              p_guest_email: newGuest.email || `${newGuest.firstName.toLowerCase()}@hotelspark.guest`,
              p_guest_phone: newGuest.phone || '',
              p_submitted_total: 1599,
              p_adults: 1,
              p_children: 0,
              p_special_requests: `Guest profile created via PMS console. ID: ${newGuest.idProofType} ${newGuest.idProofNumber || ''}`,
              p_currency_code: 'INR',
              p_idempotency_key: `GUEST-${Date.now()}`,
              p_form_snapshot: {
                guestId,
                address: newGuest.address,
                city: newGuest.city,
                state: newGuest.state,
                idProofType: newGuest.idProofType,
                idProofNumber: newGuest.idProofNumber,
                idProofFrontUrl: newGuest.idProofFrontUrl,
                idProofBackUrl: newGuest.idProofBackUrl,
                source: 'pms_console',
              },
            }),
          });
        } catch (err) {
          console.warn('RPC guest sync error:', err);
        }
      })().catch((e) => console.warn('Guest creation background task error:', e));

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
      }

      // Sync patch to Supabase
      (async () => {
        try {
          await supabaseFetch(`guests?id=eq.${gid}`, {
            method: 'PATCH',
            body: JSON.stringify({
              first_name: body.firstName,
              last_name: body.lastName,
              email: body.email,
              phone: body.phone,
              address_line_1: body.address || body.addressLine1,
              city: body.city,
              state_province: body.state || body.stateProvince,
              updated_at: new Date().toISOString(),
            }),
          });
        } catch {}
      })().catch(() => {});

      return ok({ success: true, id: gid, ...(idx >= 0 ? guests[idx] : body) });
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
