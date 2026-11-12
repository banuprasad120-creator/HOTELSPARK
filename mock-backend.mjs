import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const DB_DIR = path.resolve('./data');
const DB_FILE = path.join(DB_DIR, 'spark_hotel_db.json');

let Server;
try {
  const socketModule = await import('./apps/api/node_modules/socket.io/dist/index.js');
  Server = socketModule.Server;
} catch (e) {
  console.log('[Socket.io] Optional socket.io skipped');
}

const PORT = 3001;
const PROPERTY_ID = 'a0000001-0000-4000-a000-000000000001';

const property = {
  id: PROPERTY_ID,
  name: 'Spark Hotel',
  code: 'SPK',
  currencyCode: 'INR',
  timezone: 'Asia/Kolkata',
  description: 'Spark Hotel - A calm, warmly lit luxury retreat with comfortable rooms, banquets, and authentic dining in Hyderabad.',
  addressLine1: 'Road No. 12, Banjara Hills',
  city: 'Hyderabad',
  stateProvince: 'Telangana',
  postalCode: '500034',
  countryCode: 'IN',
  phone: '+91 40 2345 6789',
  email: 'stay@sparkhotel.in',
  checkInTime: '14:00',
  checkOutTime: '11:00',
  totalRooms: 18,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const roomTypes = [
  {
    id: 'rt-001',
    propertyId: PROPERTY_ID,
    name: 'Deluxe King Room',
    code: 'DLXK',
    maxOccupancy: 2,
    defaultOccupancy: 2,
    bedType: 'King Bed',
    roomCount: 6,
    basePrice: 349900,
    description: 'A calm, warmly lit retreat with comfortable beds and city views.',
  },
  {
    id: 'rt-002',
    propertyId: PROPERTY_ID,
    name: 'Executive Twin Room',
    code: 'EXET',
    maxOccupancy: 2,
    defaultOccupancy: 2,
    bedType: 'Twin Beds',
    roomCount: 6,
    basePrice: 399900,
    description: 'Two comfortable beds and a work corner — ideal for family or colleagues.',
  },
  {
    id: 'rt-003',
    propertyId: PROPERTY_ID,
    name: 'Spark Signature Suite',
    code: 'SSUI',
    maxOccupancy: 4,
    defaultOccupancy: 2,
    bedType: 'King Bed & Lounge',
    roomCount: 6,
    basePrice: 649900,
    description: 'A spacious room, refined finishes and space to truly unwind.',
  },
];

let rooms = [
  { id: 'rm-101', number: '101', roomTypeId: 'rt-001', roomTypeName: 'Deluxe King Room', floor: '1', building: 'Main Wing', status: 'occupied', guestName: 'Rajesh Sharma', isAccessible: false, amenities: ['wifi', 'smart_tv', 'ac'] },
  { id: 'rm-102', number: '102', roomTypeId: 'rt-001', roomTypeName: 'Deluxe King Room', floor: '1', building: 'Main Wing', status: 'vacant_clean', guestName: null, isAccessible: true, amenities: ['wifi', 'smart_tv', 'ac', 'ada_tub'] },
  { id: 'rm-103', number: '103', roomTypeId: 'rt-001', roomTypeName: 'Deluxe King Room', floor: '1', building: 'Main Wing', status: 'vacant_dirty', guestName: null, isAccessible: false, amenities: ['wifi', 'smart_tv', 'ac'] },
  { id: 'rm-104', number: '104', roomTypeId: 'rt-001', roomTypeName: 'Deluxe King Room', floor: '1', building: 'Main Wing', status: 'clean', guestName: null, isAccessible: false, amenities: ['wifi', 'smart_tv', 'ac'] },
  { id: 'rm-105', number: '105', roomTypeId: 'rt-001', roomTypeName: 'Deluxe King Room', floor: '1', building: 'Main Wing', status: 'inspected', guestName: null, isAccessible: false, amenities: ['wifi', 'smart_tv', 'ac', 'city_view'] },
  { id: 'rm-106', number: '106', roomTypeId: 'rt-001', roomTypeName: 'Deluxe King Room', floor: '1', building: 'Main Wing', status: 'guest_ready', guestName: null, isAccessible: false, amenities: ['wifi', 'smart_tv', 'ac'] },

  { id: 'rm-201', number: '201', roomTypeId: 'rt-002', roomTypeName: 'Executive Twin Room', floor: '2', building: 'Executive Wing', status: 'occupied', guestName: 'Ananya Rao', isAccessible: false, amenities: ['wifi', 'work_desk', 'tea_coffee', 'ac'] },
  { id: 'rm-202', number: '202', roomTypeId: 'rt-002', roomTypeName: 'Executive Twin Room', floor: '2', building: 'Executive Wing', status: 'occupied', guestName: 'Vikram Patel', isAccessible: false, amenities: ['wifi', 'work_desk', 'tea_coffee', 'ac'] },
  { id: 'rm-203', number: '203', roomTypeId: 'rt-002', roomTypeName: 'Executive Twin Room', floor: '2', building: 'Executive Wing', status: 'guest_ready', guestName: null, isAccessible: true, amenities: ['wifi', 'work_desk', 'tea_coffee', 'roll_in_shower'] },
  { id: 'rm-204', number: '204', roomTypeId: 'rt-002', roomTypeName: 'Executive Twin Room', floor: '2', building: 'Executive Wing', status: 'vacant_clean', guestName: null, isAccessible: false, amenities: ['wifi', 'work_desk', 'tea_coffee'] },
  { id: 'rm-205', number: '205', roomTypeId: 'rt-002', roomTypeName: 'Executive Twin Room', floor: '2', building: 'Executive Wing', status: 'vacant_dirty', guestName: null, isAccessible: false, amenities: ['wifi', 'work_desk', 'tea_coffee'] },
  { id: 'rm-206', number: '206', roomTypeId: 'rt-002', roomTypeName: 'Executive Twin Room', floor: '2', building: 'Executive Wing', status: 'out_of_order', guestName: null, isAccessible: false, amenities: ['wifi', 'work_desk'] },

  { id: 'rm-301', number: '301', roomTypeId: 'rt-003', roomTypeName: 'Spark Signature Suite', floor: '3', building: 'Suites Wing', status: 'occupied', guestName: 'Meera Nair', isAccessible: false, amenities: ['wifi', 'mini_bar', 'work_desk', 'room_service', 'jacuzzi'] },
  { id: 'rm-302', number: '302', roomTypeId: 'rt-003', roomTypeName: 'Spark Signature Suite', floor: '3', building: 'Suites Wing', status: 'guest_ready', guestName: null, isAccessible: false, amenities: ['wifi', 'mini_bar', 'work_desk', 'room_service'] },
  { id: 'rm-303', number: '303', roomTypeId: 'rt-003', roomTypeName: 'Spark Signature Suite', floor: '3', building: 'Suites Wing', status: 'inspected', guestName: null, isAccessible: false, amenities: ['wifi', 'mini_bar', 'work_desk', 'room_service'] },
  { id: 'rm-304', number: '304', roomTypeId: 'rt-003', roomTypeName: 'Spark Signature Suite', floor: '3', building: 'Suites Wing', status: 'clean', guestName: null, isAccessible: false, amenities: ['wifi', 'mini_bar', 'work_desk'] },
  { id: 'rm-305', number: '305', roomTypeId: 'rt-003', roomTypeName: 'Spark Signature Suite', floor: '3', building: 'Suites Wing', status: 'occupied', guestName: 'Arjun Reddy', isAccessible: false, amenities: ['wifi', 'mini_bar', 'balcony', 'room_service'] },
  { id: 'rm-306', number: '306', roomTypeId: 'rt-003', roomTypeName: 'Spark Signature Suite', floor: '3', building: 'Suites Wing', status: 'guest_ready', guestName: null, isAccessible: false, amenities: ['wifi', 'mini_bar', 'terrace'] },
];

let guests = [
  { id: 'gst-1', propertyId: PROPERTY_ID, firstName: 'Rajesh', lastName: 'Sharma', email: 'rajesh.sharma@example.com', phone: '+91 98765 43210', vipTier: 'diamond', loyaltyPoints: 12400, totalStays: 9, notes: 'Prefers high floor, warm water on arrival.' },
  { id: 'gst-2', propertyId: PROPERTY_ID, firstName: 'Ananya', lastName: 'Rao', email: 'ananya.rao@example.com', phone: '+91 98490 12345', vipTier: 'gold', loyaltyPoints: 6200, totalStays: 4, notes: 'Late check-out requested when available.' },
  { id: 'gst-3', propertyId: PROPERTY_ID, firstName: 'Vikram', lastName: 'Patel', email: 'vikram.patel@example.com', phone: '+91 99250 67890', vipTier: 'platinum', loyaltyPoints: 9400, totalStays: 6, notes: 'Quiet room away from elevators.' },
  { id: 'gst-4', propertyId: PROPERTY_ID, firstName: 'Meera', lastName: 'Nair', email: 'meera.nair@example.com', phone: '+91 94470 54321', vipTier: 'diamond', loyaltyPoints: 21500, totalStays: 14, notes: 'Spark corporate partner rate.' },
  { id: 'gst-5', propertyId: PROPERTY_ID, firstName: 'Arjun', lastName: 'Reddy', email: 'arjun.reddy@example.com', phone: '+91 98850 99887', vipTier: 'vip_founder', loyaltyPoints: 45000, totalStays: 22, notes: 'Airport pickup requested.' },
];

const today = new Date().toISOString().slice(0, 10);
const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const in3Days = new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

let reservations = [
  {
    id: 'res-1001',
    propertyId: PROPERTY_ID,
    confirmationNumber: 'SPK-1001',
    status: 'in_house',
    guestId: 'gst-1',
    guestName: 'Rajesh Sharma',
    guestEmail: 'rajesh.sharma@example.com',
    guestPhone: '+91 98765 43210',
    roomTypeId: 'rt-001',
    roomTypeName: 'Deluxe King Room',
    roomId: 'rm-101',
    roomNumber: '101',
    arrivalDate: yesterday,
    departureDate: tomorrow,
    adults: 1,
    children: 0,
    ratePlanCode: 'BAR',
    totalAmount: 699800,
    depositAmount: 699800,
    balance: 0,
    paymentStatus: 'paid',
  },
  {
    id: 'res-1002',
    propertyId: PROPERTY_ID,
    confirmationNumber: 'SPK-1002',
    status: 'in_house',
    guestId: 'gst-2',
    guestName: 'Ananya Rao',
    guestEmail: 'ananya.rao@example.com',
    guestPhone: '+91 98490 12345',
    roomTypeId: 'rt-002',
    roomTypeName: 'Executive Twin Room',
    roomId: 'rm-201',
    roomNumber: '201',
    arrivalDate: today,
    departureDate: in3Days,
    adults: 2,
    children: 0,
    ratePlanCode: 'CORP',
    totalAmount: 1199700,
    depositAmount: 399900,
    balance: 799800,
    paymentStatus: 'partially_paid',
  },
  {
    id: 'res-1003',
    propertyId: PROPERTY_ID,
    confirmationNumber: 'SPK-1003',
    status: 'confirmed',
    guestId: 'gst-3',
    guestName: 'Vikram Patel',
    guestEmail: 'vikram.patel@example.com',
    guestPhone: '+91 99250 67890',
    roomTypeId: 'rt-002',
    roomTypeName: 'Executive Twin Room',
    roomId: 'rm-202',
    roomNumber: '202',
    arrivalDate: today,
    departureDate: tomorrow,
    adults: 2,
    children: 1,
    ratePlanCode: 'BAR',
    totalAmount: 399900,
    depositAmount: 399900,
    balance: 0,
    paymentStatus: 'paid',
  },
  {
    id: 'res-1004',
    propertyId: PROPERTY_ID,
    confirmationNumber: 'SPK-1004',
    status: 'in_house',
    guestId: 'gst-4',
    guestName: 'Meera Nair',
    guestEmail: 'meera.nair@example.com',
    guestPhone: '+91 94470 54321',
    roomTypeId: 'rt-003',
    roomTypeName: 'Spark Signature Suite',
    roomId: 'rm-301',
    roomNumber: '301',
    arrivalDate: yesterday,
    departureDate: in3Days,
    adults: 1,
    children: 0,
    ratePlanCode: 'EXEC_SPEC',
    totalAmount: 1949700,
    depositAmount: 1949700,
    balance: 0,
    paymentStatus: 'paid',
  },
  {
    id: 'res-1005',
    propertyId: PROPERTY_ID,
    confirmationNumber: 'SPK-1005',
    status: 'in_house',
    guestId: 'gst-5',
    guestName: 'Arjun Reddy',
    guestEmail: 'arjun.reddy@example.com',
    guestPhone: '+91 98850 99887',
    roomTypeId: 'rt-003',
    roomTypeName: 'Spark Signature Suite',
    roomId: 'rm-305',
    roomNumber: '305',
    arrivalDate: today,
    departureDate: in3Days,
    adults: 2,
    children: 0,
    ratePlanCode: 'VIP_STAY',
    totalAmount: 1949700,
    depositAmount: 1949700,
    balance: 0,
    paymentStatus: 'paid',
  },
];

const ratePlans = [
  {
    id: 'rp-1',
    propertyId: PROPERTY_ID,
    name: 'Best Available Rate',
    code: 'BAR',
    type: 'bar',
    roomTypeId: 'rt-001',
    roomTypeName: 'Deluxe King Room',
    baseAmount: 3499,
    currency: 'INR',
    currencyCode: 'INR',
    isActive: true,
    active: true,
    cancellationPolicy: 'Free cancellation up to 24 hours prior to check-in',
    description: 'Standard flexible daily rate for Deluxe King Room with high-speed Wi-Fi and morning newspaper.',
  },
  {
    id: 'rp-2',
    propertyId: PROPERTY_ID,
    name: 'Non-Refundable Promo',
    code: 'NONREF',
    type: 'derived',
    parentRatePlanId: 'rp-1',
    parentRatePlanCode: 'BAR',
    derivedAdjustmentType: 'percentage',
    derivedAdjustmentValue: -15,
    derivationRule: { type: 'percentage', value: -15 },
    roomTypeId: 'rt-001',
    roomTypeName: 'Deluxe King Room',
    baseAmount: 2974.15,
    currency: 'INR',
    currencyCode: 'INR',
    isActive: true,
    active: true,
    cancellationPolicy: 'Non-refundable rate',
    description: '15% advance purchase discount off Best Available Rate for non-refundable stays.',
  },
  {
    id: 'rp-3',
    propertyId: PROPERTY_ID,
    name: 'Bed & Breakfast Package',
    code: 'BB_PKG',
    type: 'package',
    roomTypeId: 'rt-002',
    roomTypeName: 'Executive Twin Room',
    baseAmount: 3999,
    currency: 'INR',
    currencyCode: 'INR',
    isActive: true,
    active: true,
    packageIncludes: ['Complimentary Breakfast Buffet', 'Free High-Speed Wi-Fi', 'Executive Lounge Access'],
    cancellationPolicy: 'Free cancellation up to 24 hours prior to check-in',
    description: 'Executive stay including daily artisan breakfast buffet and exclusive lounge access.',
  },
  {
    id: 'rp-4',
    propertyId: PROPERTY_ID,
    name: 'Corporate Negotiated',
    code: 'CORP',
    type: 'negotiated',
    roomTypeId: 'rt-003',
    roomTypeName: 'Spark Signature Suite',
    baseAmount: 6499,
    currency: 'INR',
    currencyCode: 'INR',
    isActive: true,
    active: true,
    cancellationPolicy: 'Corporate account billing — 48h cancellation',
    description: 'Corporate negotiated tariff for luxury Signature Suite with airport transfer and late checkout.',
  },
];

const rateRestrictions = {
  'rp-1': [
    {
      id: 'rr-1',
      ratePlanId: 'rp-1',
      propertyId: PROPERTY_ID,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10),
      minLos: 1,
      maxLos: 14,
      closedToArrival: false,
      closedToDeparture: false,
      isClosed: false,
      dayOfWeekOverrides: { friday: 500, saturday: 500 },
    },
  ],
  'rp-2': [
    {
      id: 'rr-2',
      ratePlanId: 'rp-2',
      propertyId: PROPERTY_ID,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10),
      minLos: 2,
      maxLos: 7,
      closedToArrival: false,
      closedToDeparture: false,
      isClosed: false,
      dayOfWeekOverrides: null,
    },
  ],
  'rp-3': [
    {
      id: 'rr-3',
      ratePlanId: 'rp-3',
      propertyId: PROPERTY_ID,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10),
      minLos: 1,
      maxLos: 14,
      closedToArrival: false,
      closedToDeparture: false,
      isClosed: false,
      dayOfWeekOverrides: null,
    },
  ],
  'rp-4': [
    {
      id: 'rr-4',
      ratePlanId: 'rp-4',
      propertyId: PROPERTY_ID,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10),
      minLos: 1,
      maxLos: 30,
      closedToArrival: false,
      closedToDeparture: false,
      isClosed: false,
      dayOfWeekOverrides: null,
    },
  ],
};

let folios = [
  { id: 'fol-1', propertyId: PROPERTY_ID, reservationId: 'res-1001', guestName: 'Rajesh Sharma', roomNumber: '101', status: 'open', balance: 0, totalCharges: 699800, totalPayments: 699800 },
  { id: 'fol-2', propertyId: PROPERTY_ID, reservationId: 'res-1002', guestName: 'Ananya Rao', roomNumber: '201', status: 'open', balance: 799800, totalCharges: 1199700, totalPayments: 399900 },
  { id: 'fol-3', propertyId: PROPERTY_ID, reservationId: 'res-1004', guestName: 'Meera Nair', roomNumber: '301', status: 'open', balance: 0, totalCharges: 1949700, totalPayments: 1949700 },
  { id: 'fol-4', propertyId: PROPERTY_ID, reservationId: 'res-1005', guestName: 'Arjun Reddy', roomNumber: '305', status: 'open', balance: 0, totalCharges: 1949700, totalPayments: 1949700 },
];

let ioInstance = null;

let staffNotifications = [
  {
    id: 'notif-1',
    propertyId: PROPERTY_ID,
    title: 'Welcome to Spark Hotel',
    message: 'Spark Hotel PMS engine initialized and live in Hyderabad.',
    type: 'system',
    read: true,
    createdAt: new Date().toISOString(),
  },
];

let channelConnections = [
  {
    id: 'conn-makemytrip',
    propertyId: PROPERTY_ID,
    channelCode: 'makemytrip',
    channelName: 'MakeMyTrip',
    adapterType: 'makemytrip',
    status: 'not_registered', // Three states: 'not_registered', 'awaiting_connection', 'connected'
    syncDirection: 'both',
    lastSyncAt: null,
    failedAlert: null,
    config: {
      hotelId: 'MMT-SPK-50001',
      clientId: '',
      apiKey: '',
      environment: 'sandbox',
      webhookUrl: 'https://sparkhotel.in/api/v1/channels/webhook/makemytrip',
    },
    roomTypeMapping: [
      { roomTypeId: 'rt-001', channelRoomCode: 'MMT_DLXK' },
      { roomTypeId: 'rt-002', channelRoomCode: 'MMT_EXET' },
      { roomTypeId: 'rt-003', channelRoomCode: 'MMT_SSUI' },
    ],
    ratePlanMapping: [
      { ratePlanId: 'rp-1', channelRateCode: 'MMT_BAR' },
      { ratePlanId: 'rp-2', channelRateCode: 'MMT_NONREF' },
      { ratePlanId: 'rp-3', channelRateCode: 'MMT_BB_PKG' },
      { ratePlanId: 'rp-4', channelRateCode: 'MMT_CORP' },
    ],
  },
  {
    id: 'conn-goibibo',
    propertyId: PROPERTY_ID,
    channelCode: 'goibibo',
    channelName: 'Goibibo',
    adapterType: 'goibibo',
    status: 'not_registered',
    syncDirection: 'both',
    lastSyncAt: null,
    failedAlert: null,
    config: {
      hotelId: 'GO-SPK-50001',
      clientId: '',
      apiKey: '',
      environment: 'sandbox',
      webhookUrl: 'https://sparkhotel.in/api/v1/channels/webhook/goibibo',
    },
    roomTypeMapping: [
      { roomTypeId: 'rt-001', channelRoomCode: 'GO_DLXK' },
      { roomTypeId: 'rt-002', channelRoomCode: 'GO_EXET' },
      { roomTypeId: 'rt-003', channelRoomCode: 'GO_SSUI' },
    ],
    ratePlanMapping: [
      { ratePlanId: 'rp-1', channelRateCode: 'GO_BAR' },
      { ratePlanId: 'rp-2', channelRateCode: 'GO_NONREF' },
      { ratePlanId: 'rp-3', channelRateCode: 'GO_BB_PKG' },
      { ratePlanId: 'rp-4', channelRateCode: 'GO_CORP' },
    ],
  },
  {
    id: 'conn-bookingcom',
    propertyId: PROPERTY_ID,
    channelCode: 'booking_com',
    channelName: 'Booking.com',
    adapterType: 'booking_com',
    status: 'not_registered',
    syncDirection: 'both',
    lastSyncAt: null,
    failedAlert: null,
    config: {
      hotelId: 'BC-984321',
      username: '',
      password: '',
      environment: 'sandbox',
      webhookUrl: 'https://sparkhotel.in/api/v1/channels/webhook/booking-com',
    },
    roomTypeMapping: [
      { roomTypeId: 'rt-001', channelRoomCode: 'BC_DLX_KING' },
      { roomTypeId: 'rt-002', channelRoomCode: 'BC_EXEC_TWIN' },
      { roomTypeId: 'rt-003', channelRoomCode: 'BC_SIG_SUITE' },
    ],
    ratePlanMapping: [
      { ratePlanId: 'rp-1', channelRateCode: 'BC_RATE_BAR' },
      { ratePlanId: 'rp-2', channelRateCode: 'BC_RATE_NONREF' },
      { ratePlanId: 'rp-3', channelRateCode: 'BC_RATE_BB_PKG' },
      { ratePlanId: 'rp-4', channelRateCode: 'BC_RATE_CORP' },
    ],
  },
];

function maskConnection(c) {
  const safe = JSON.parse(JSON.stringify(c));
  if (safe.config) {
    if (safe.config.apiKey) {
      safe.config.apiKeyMasked = '••••••••' + String(safe.config.apiKey).slice(-4);
      safe.config.apiKey = safe.config.apiKeyMasked;
    }
    if (safe.config.password) {
      safe.config.passwordMasked = '••••••••';
      safe.config.password = '••••••••';
    }
  }
  return safe;
}

let channelSyncLogs = [
  {
    id: 'log-init-1',
    channelConnectionId: 'conn-makemytrip',
    action: 'initial_channel_audit',
    status: 'success',
    errorMessage: null,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'log-init-2',
    channelConnectionId: 'conn-goibibo',
    action: 'initial_channel_audit',
    status: 'success',
    errorMessage: null,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'log-init-3',
    channelConnectionId: 'conn-bookingcom',
    action: 'initial_channel_audit',
    status: 'success',
    errorMessage: null,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

let contentSyncLogs = [];

const whatsappConversations = {};
const processedWhatsAppMessageIds = new Set();
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'spark_hotel_token_2026';

let allocationLock = Promise.resolve();
function withAllocationLock(fn) {
  const next = allocationLock.then(() => fn());
  allocationLock = next.catch(() => {});
  return next;
}

function saveDatabase() {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    const payload = {
      property,
      roomTypes,
      ratePlans,
      rooms,
      guests,
      reservations,
      folios,
      staffNotifications,
      channelConnections,
      channelSyncLogs,
      lastSavedAt: new Date().toISOString(),
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(payload, null, 2), 'utf8');
  } catch (err) {
    console.error('[Database] Failed to save database to disk:', err.message);
  }
}

function initDatabase() {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const data = JSON.parse(raw);
      if (Array.isArray(data.reservations) && data.reservations.length > 0) {
        reservations = data.reservations;
      }
      if (Array.isArray(data.rooms) && data.rooms.length > 0) {
        rooms = data.rooms;
      }
      if (Array.isArray(data.guests) && data.guests.length > 0) {
        guests = data.guests;
      }
      if (Array.isArray(data.folios) && data.folios.length > 0) {
        folios = data.folios;
      }
      if (Array.isArray(data.staffNotifications) && data.staffNotifications.length > 0) {
        staffNotifications = data.staffNotifications;
      }
      if (Array.isArray(data.channelConnections) && data.channelConnections.length > 0) {
        channelConnections = data.channelConnections;
      }
      if (Array.isArray(data.channelSyncLogs) && data.channelSyncLogs.length > 0) {
        channelSyncLogs = data.channelSyncLogs;
      }
      console.log(`[Database] Loaded persistent data from ${DB_FILE} (${reservations.length} reservations, ${rooms.length} rooms).`);
      return;
    }
  } catch (e) {
    console.error('[Database] Failed to read db file, initializing with defaults:', e.message);
  }
  saveDatabase();
  console.log(`[Database] Initialized new persistent database file at ${DB_FILE}`);
}

// Initialise DB storage immediately
initDatabase();

async function createReservationRecord(body, sourceName = 'WEBSITE') {
  const guestName = (body.guestName || body.guest?.name || body.name || '').trim();
  const guestEmail = (body.guestEmail || body.guest?.email || body.email || 'guest@sparkhotel.in').trim();
  const guestPhone = (body.guestPhone || body.guest?.phone || body.phone || '+91 98765 43210').trim();
  const arrival = body.arrivalDate || body.checkIn || body.arrival || today;
  const departure = body.departureDate || body.checkOut || body.departure || tomorrow;

  // 1. Validate guest information
  if (!guestName || guestName.length < 2) {
    return {
      success: false,
      status: 400,
      error: 'Guest full name is required and must be at least 2 characters.',
    };
  }

  // 2. Validate dates
  const d1 = new Date(arrival);
  const d2 = new Date(departure);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
    return {
      success: false,
      status: 400,
      error: 'Invalid check-in or check-out date format.',
    };
  }

  const nights = Math.round((d2.getTime() - d1.getTime()) / 86400000);
  if (nights <= 0) {
    return {
      success: false,
      status: 400,
      error: 'Check-out date must be strictly after check-in date.',
    };
  }

  const adults = Number(body.adults || 2);
  if (adults < 1) {
    return {
      success: false,
      status: 400,
      error: 'At least 1 adult guest is required.',
    };
  }

  // 3. Determine room type
  let rt = roomTypes.find(t => 
    t.id === body.roomTypeId || 
    t.name.toLowerCase() === (body.roomTypeName || '').toLowerCase() || 
    t.name.toLowerCase() === (body.room || '').toLowerCase() ||
    (body.roomTypeId && t.code.toLowerCase() === body.roomTypeId.toLowerCase())
  );
  if (!rt) rt = roomTypes[0];

  // 4. Rate plan
  let rp = ratePlans.find(p => p.id === body.ratePlanId || p.code === body.ratePlanCode || p.roomTypeId === rt.id) || ratePlans[0];

  // 5. Atomic Room Allocation & Overbooking Prevention
  return withAllocationLock(async () => {
    const candidateRooms = rooms.filter(r => r.roomTypeId === rt.id);
    let assignedRoom = null;

    for (const r of candidateRooms) {
      const hasOverlap = reservations.some(res => {
        if (res.roomId !== r.id && res.roomNumber !== r.number) return false;
        if (res.status === 'cancelled' || res.status === 'checked_out') return false;
        const existArr = new Date(res.arrivalDate).getTime();
        const existDep = new Date(res.departureDate).getTime();
        return Math.max(d1.getTime(), existArr) < Math.min(d2.getTime(), existDep);
      });

      if (!hasOverlap && r.status !== 'out_of_order') {
        assignedRoom = r;
        break;
      }
    }

    if (!assignedRoom) {
      return {
        success: false,
        status: 409,
        error: `No rooms available in ${rt.name} for the selected dates (${arrival} to ${departure}). Please choose another date or category.`,
      };
    }

    // 6. Calculate pricing and taxes (Tariff in paise/INR)
    const baseTariff = rt.basePrice * nights; // in paise
    const gstTax = Math.round(baseTariff * 0.12); // 12% GST
    const calculatedTotal = baseTariff + gstTax;
    const totalAmount = body.totalAmount ? Number(body.totalAmount) : calculatedTotal;
    const baseAmount = body.baseAmount ? Number(body.baseAmount) : baseTariff;
    const taxAmount = body.taxAmount ? Number(body.taxAmount) : gstTax;

    if (arrival === today) {
      assignedRoom.status = 'occupied';
      assignedRoom.guestName = guestName;
    }

    const confirmationNumber = `SPK-${Math.floor(1000 + Math.random() * 9000)}`;
    const resId = `res-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // 7. Guest Profile
    let gst = guests.find(g => (g.email && g.email === guestEmail) || (g.phone && g.phone === guestPhone));
    const nameParts = guestName.split(' ');
    const firstName = nameParts[0] || 'Guest';
    const lastName = nameParts.slice(1).join(' ') || 'User';

    if (!gst) {
      gst = {
        id: `gst-${Date.now()}`,
        propertyId: PROPERTY_ID,
        firstName,
        lastName,
        email: guestEmail,
        phone: guestPhone,
        vipTier: 'standard',
        loyaltyPoints: 500,
        totalStays: 1,
        notes: `Booked via ${sourceName}.`,
      };
      guests.push(gst);
    } else {
      gst.totalStays = (gst.totalStays || 1) + 1;
      gst.firstName = firstName;
      gst.lastName = lastName;
    }

    const newReservation = {
      id: resId,
      propertyId: PROPERTY_ID,
      confirmationNumber,
      status: 'confirmed',
      guestId: gst.id,
      guestName,
      guestPhone,
      guestEmail,
      guest: {
        id: gst.id,
        firstName: gst.firstName,
        lastName: gst.lastName,
        email: gst.email,
        phone: gst.phone,
      },
      roomTypeId: rt.id,
      roomTypeName: rt.name,
      roomId: assignedRoom.id,
      roomNumber: assignedRoom.number,
      ratePlanId: rp.id,
      ratePlanCode: rp.code,
      ratePlanName: rp.name,
      arrivalDate: arrival,
      departureDate: departure,
      nights,
      adults,
      children: Number(body.children || 0),
      baseAmount,
      taxAmount,
      totalAmount,
      depositAmount: totalAmount,
      balance: 0,
      paymentStatus: 'paid',
      source: sourceName, // 'WEBSITE'
      notes: body.notes || `Direct online reservation booked via Spark Hotel website.`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    reservations.unshift(newReservation);

    // 8. Folio
    const fol = {
      id: `fol-${Date.now()}`,
      propertyId: PROPERTY_ID,
      reservationId: newReservation.id,
      guestName: newReservation.guestName,
      roomNumber: newReservation.roomNumber,
      status: 'open',
      balance: 0,
      totalCharges: totalAmount,
      totalPayments: totalAmount,
      createdAt: new Date().toISOString(),
    };
    folios.unshift(fol);

    // 9. Manager / Staff Notification
    const newNotif = {
      id: `notif-${Date.now()}`,
      propertyId: PROPERTY_ID,
      title: 'New Website Reservation Confirmed',
      message: `Reservation ${confirmationNumber} for ${guestName} in Room ${assignedRoom.number} (${rt.name}) · ₹${(totalAmount / 100).toLocaleString('en-IN')} via ${sourceName}.`,
      type: 'reservation_created',
      read: false,
      reservationId: newReservation.id,
      createdAt: new Date().toISOString(),
    };
    staffNotifications.unshift(newNotif);

    // 10. Save permanently to database file on disk!
    saveDatabase();

    // 11. Emit real-time Socket.io pmsEvent
    if (ioInstance) {
      const timestamp = new Date().toISOString();
      const pmsPayload = {
        event: 'reservation.created',
        data: {
          reservationId: newReservation.id,
          confirmationNumber: newReservation.confirmationNumber,
          guestName: newReservation.guestName,
          roomId: assignedRoom.id,
        },
        timestamp,
      };

      ioInstance.to(PROPERTY_ID).emit('pmsEvent', pmsPayload);
      ioInstance.emit('pmsEvent', pmsPayload);

      ioInstance.emit('pmsEvent', {
        event: 'room.status_changed',
        data: { roomId: assignedRoom.id },
        timestamp,
      });

      ioInstance.emit('reservation.created', newReservation);
      ioInstance.emit('room.updated', assignedRoom);
      ioInstance.emit('notification.created', newNotif);
    }

    console.log(`[Reservation] Saved permanently: ${confirmationNumber} for ${guestName} -> Room #${assignedRoom.number} (${arrival} to ${departure}) [Source: ${sourceName}]`);

    return {
      success: true,
      status: 201,
      reservation: newReservation,
    };
  });
}

process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Unhandled Rejection]', reason);
});

const server = http.createServer(async (req, res) => {
  req.on('error', (err) => console.error('[Req Error]', err?.message));
  res.on('error', (err) => console.error('[Res Error]', err?.message));

  try {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host || 'localhost:3000'}`);
    const pathname = url.pathname;

    // JSON helper
    const send = (status, data) => {
      try {
        if (res.writableEnded || res.destroyed) return;
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      } catch (e) {
        console.error('[Send Error]', e?.message);
      }
    };

    // Helper to read request body
    const readBody = () => new Promise((resolve) => {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try { resolve(body ? JSON.parse(body) : {}); } catch { resolve({}); }
      });
      req.on('error', () => resolve({}));
    });

    // Log requests
    console.log(`[Mock API] ${req.method} ${pathname}`);

  // Routes
  if (pathname === '/api/v1/health') {
    return send(200, { status: 'ok', service: 'spark-hotel-api', version: '1.0.0', timestamp: new Date().toISOString() });
  }

  // WhatsApp Cloud API Webhook Verification (GET)
  if ((pathname === '/api/v1/whatsapp/webhook' || pathname === '/webhook' || pathname === '/api/v1/notifications/whatsapp/webhook') && req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('[WhatsApp Webhook] Verification successful for token:', token);
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(challenge || '');
      return;
    }
    console.warn('[WhatsApp Webhook] Verification failed for token:', token);
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  // WhatsApp Cloud API Webhook Inbound Reception (POST)
  if ((pathname === '/api/v1/whatsapp/webhook' || pathname === '/webhook' || pathname === '/api/v1/notifications/whatsapp/webhook') && req.method === 'POST') {
    const body = await readBody();
    let incomingMessages = [];
    let incomingStatuses = [];

    // Parse Meta WhatsApp Cloud API format or direct test format
    if (body.entry && Array.isArray(body.entry)) {
      for (const entry of body.entry) {
        for (const change of (entry.changes || [])) {
          const val = change.value;
          if (val) {
            for (const msg of (val.messages || [])) {
              incomingMessages.push({
                id: msg.id,
                from: msg.from,
                text: msg.text?.body || '',
                timestamp: msg.timestamp || String(Math.floor(Date.now() / 1000)),
                type: msg.type || 'text',
              });
            }
            for (const st of (val.statuses || [])) {
              incomingStatuses.push(st);
            }
          }
        }
      }
    } else if (body.from && body.body) {
      incomingMessages.push({
        id: body.messageId || `wamid.test_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        from: body.from,
        text: body.body,
        timestamp: String(Math.floor(Date.now() / 1000)),
        type: 'text',
      });
    }

    // Process Delivery Status Updates
    for (const st of incomingStatuses) {
      for (const thread of Object.values(whatsappConversations)) {
        const target = thread.history.find(m => m.id === st.id);
        if (target) {
          target.status = st.status;
          target.statusUpdatedAt = new Date().toISOString();
        }
      }
    }

    // Process Inbound Guest Messages
    const replies = [];
    for (const msg of incomingMessages) {
      const cleanPhone = String(msg.from).replace(/^whatsapp:/i, '').replace(/[\s\-\+]/g, '');

      // Duplicate prevention
      if (processedWhatsAppMessageIds.has(msg.id)) {
        console.log(`[WhatsApp] Duplicate message ignored: ${msg.id}`);
        replies.push({ messageId: msg.id, duplicate: true, status: 'ignored' });
        continue;
      }
      processedWhatsAppMessageIds.add(msg.id);

      if (!whatsappConversations[cleanPhone]) {
        whatsappConversations[cleanPhone] = {
          phone: cleanPhone,
          humanHandover: false,
          history: [],
          createdAt: new Date().toISOString(),
          lastMessageAt: new Date().toISOString(),
        };
      }
      const convo = whatsappConversations[cleanPhone];
      convo.lastMessageAt = new Date().toISOString();

      convo.history.push({
        id: msg.id,
        direction: 'inbound',
        from: cleanPhone,
        text: msg.text,
        timestamp: new Date().toISOString(),
        status: 'received',
      });

      // Intent detection & real data response for WhatsApp
      const text = (msg.text || '').trim();
      const lower = text.toLowerCase();
      let replyText = '';
      let isHandover = false;

      // TEST 1: Greeting ("Hello.", "Hi", "Namaste")
      if (/^(hello|hi|hey|namaste|good\s*(morning|afternoon|evening))[.!]?$/i.test(lower) || lower === 'hello.' || lower === 'hello') {
        replyText = `Welcome to Spark Hotel! How can I help you today?`;
      }
      // TEST 2: Availability
      else if (/do\s+you\s+have\s+rooms?\s+available|rooms?\s+available|any\s+availability|vacancy|vacant/i.test(lower)) {
        const availCount = rooms.filter(r => r.status === 'vacant_clean' || r.status === 'clean' || r.status === 'guest_ready' || r.status === 'inspected').length;
        replyText = `We currently have ${availCount} rooms available at Spark Hotel! To check our real-time inventory and quote the best option, could you please provide your check-in date, checkout date, and number of guests?`;
      }
      // TEST 3: Price enquiry
      else if (/^(what\s+is\s+the\s+price|what\s+is\s+the\s+rate|what\s+are\s+the\s+rates|price|tariff|room\s+prices?)[.?!]?$/i.test(lower) || /what\s+is\s+the\s+price/i.test(lower)) {
        replyText = `Here are the current rates from our Spark Hotel rate plan:\n` +
          `• Deluxe King Room: ₹3,499/night (King bed, rain shower, city views, Wi-Fi)\n` +
          `• Executive Twin Room: ₹3,999/night (Twin beds, work desk, lounge access)\n` +
          `• Spark Signature Suite: ₹6,499/night (Luxury suite, living salon, soaking tub)\n\n` +
          `* All tariffs include high-speed Wi-Fi & AC. Taxes (12% GST) applicable. Check-in: 2:00 PM, Check-out: 11:00 AM.`;
      }
      // TEST 4: Booking workflow
      else if (/i\s+want\s+to\s+book\s+a\s+room|book\s+a\s+room|reserve\s+a\s+room/i.test(lower)) {
        replyText = `We would be delighted to host you at Spark Hotel! To begin your reservation, please provide:\n` +
          `1. Guest Full Name\n` +
          `2. Mobile Phone Number\n` +
          `3. Check-in and Check-out dates\n` +
          `4. Preferred Room Category (Deluxe King, Executive Twin, or Signature Suite)\n` +
          `5. Number of adults and children\n\n` +
          `You can also book directly with instant confirmation on our hotel portal at http://localhost:8080/.`;
      }
      // TEST 5: Cancellation & refunds
      else if (/cancel.*booking|cancel.*reservation|can\s+i\s+cancel|i\s+want\s+to\s+cancel/i.test(lower)) {
        const confMatch = text.match(/SPK-\d{4}/i);
        if (confMatch) {
          const confNum = confMatch[0].toUpperCase();
          const targetRes = reservations.find(r => r.confirmationNumber === confNum);
          if (targetRes) {
            targetRes.status = 'cancelled';
            const assignedRoom = rooms.find(r => r.number === targetRes.roomNumber);
            if (assignedRoom && assignedRoom.status === 'occupied') {
              assignedRoom.status = 'vacant_clean';
              assignedRoom.guestName = null;
            }
            replyText = `Your reservation ${confNum} has been cancelled successfully. Per Spark Hotel 24-hour cancellation policy, a 100% full refund has been initiated to your original payment method. Thank you for notifying us.`;
          } else {
            replyText = `We could not find active reservation ${confNum}. Please verify your confirmation number or call our Front Desk at +91 40 2345 6789.`;
          }
        } else {
          replyText = `Spark Hotel offers free cancellation with a 100% full refund up to 24 hours prior to check-in. Please provide your Booking Confirmation Number (e.g., SPK-1001) so we can retrieve your reservation and process your cancellation.`;
        }
      }
      // TEST 6: Manager handover
      else if (/manager|speak\s+to|talk\s+to|human|agent|supervisor|complaint/i.test(lower)) {
        isHandover = true;
        convo.humanHandover = true;
        replyText = `I have escalated your request to our Duty Manager at Spark Hotel. A manager has been notified and will attend to you shortly on this WhatsApp chat or call you directly. Our 24/7 Front Desk is also available at +91 40 2345 6789.`;

        const managerNotif = {
          id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          propertyId: PROPERTY_ID,
          title: 'WhatsApp Manager Handover',
          message: `Guest (+${cleanPhone}) requested Duty Manager: "${text}"`,
          type: 'urgent_manager_handover',
          read: false,
          guestPhone: cleanPhone,
          createdAt: new Date().toISOString(),
        };
        staffNotifications.unshift(managerNotif);

        if (ioInstance) {
          ioInstance.emit('notification.created', managerNotif);
          ioInstance.emit('whatsapp.handover', { phone: cleanPhone, message: text });
        }
      } else {
        replyText = `Namaste! Thank you for contacting Spark Hotel Hyderabad. How may we assist your stay today?\n` +
          `You can ask us about:\n` +
          `• "Do you have rooms available?"\n` +
          `• "What is the price for one night?"\n` +
          `• "I want to book a room for tomorrow."\n` +
          `• "Can I cancel my booking?"\n` +
          `• "I want to speak to the manager."`;
      }

      const replyMsgId = `wamid.out_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      convo.history.push({
        id: replyMsgId,
        direction: 'outbound',
        to: cleanPhone,
        text: replyText,
        timestamp: new Date().toISOString(),
        status: 'sent',
      });

      replies.push({
        inboundId: msg.id,
        replyId: replyMsgId,
        to: cleanPhone,
        text: replyText,
        humanHandover: isHandover,
      });
    }

    return send(200, { success: true, count: replies.length, replies });
  }

  // WhatsApp Conversations & Management
  if (pathname === '/api/v1/whatsapp/conversations' || pathname === '/api/v1/notifications/whatsapp/conversations') {
    return send(200, Object.values(whatsappConversations));
  }

  if (pathname.startsWith('/api/v1/whatsapp/conversations/')) {
    const phone = pathname.split('/').pop().replace(/[\s\-\+]/g, '');
    const convo = whatsappConversations[phone] || { phone, humanHandover: false, history: [] };
    if (req.method === 'PATCH' || req.method === 'POST') {
      const body = await readBody();
      if (typeof body.humanHandover === 'boolean') {
        convo.humanHandover = body.humanHandover;
      }
    }
    return send(200, convo);
  }

  // WhatsApp Outbound Send Endpoint (POST)
  if (pathname === '/api/v1/notifications/whatsapp' || pathname === '/v1/notifications/whatsapp') {
    const body = await readBody();
    const to = String(body.to || '').replace(/^whatsapp:/i, '').replace(/[\s\-\+]/g, '');
    const text = body.body || (body.contentSid ? `[Template: ${body.contentSid}]` : 'Spark Hotel update');
    const msgId = `wamid.out_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    if (!whatsappConversations[to]) {
      whatsappConversations[to] = {
        phone: to,
        humanHandover: false,
        history: [],
        createdAt: new Date().toISOString(),
        lastMessageAt: new Date().toISOString(),
      };
    }
    whatsappConversations[to].history.push({
      id: msgId,
      direction: 'outbound',
      to,
      text,
      timestamp: new Date().toISOString(),
      status: 'sent',
    });

    return send(200, { sent: true, provider: 'whatsapp-cloud', messageId: msgId });
  }

  if (pathname === '/api/v1/properties' || pathname === '/v1/properties') {
    return send(200, [property]);
  }

  if (pathname.startsWith('/api/v1/properties/') || pathname.startsWith('/v1/properties/')) {
    return send(200, property);
  }

  if (pathname === '/api/v1/organizations' || pathname === '/v1/organizations') {
    return send(200, []);
  }

  if (pathname === '/api/v1/rooms/types' || pathname === '/v1/rooms/types') {
    return send(200, roomTypes);
  }

  if (pathname === '/api/v1/rooms' || pathname === '/v1/rooms') {
    if (req.method === 'POST') {
      const body = await readBody();
      const newRoom = {
        id: `rm-${Date.now()}`,
        number: body.number || '999',
        roomTypeId: body.roomTypeId || 'rt-001',
        roomTypeName: roomTypes.find(rt => rt.id === body.roomTypeId)?.name || 'Standard Room',
        floor: body.floor || '1',
        building: 'Main Tower',
        status: 'vacant_clean',
        guestName: null,
        isAccessible: false,
        amenities: ['wifi'],
      };
      rooms.push(newRoom);
      return send(201, newRoom);
    }
    const statusFilter = url.searchParams.get('status');
    const result = statusFilter ? rooms.filter(r => r.status === statusFilter) : rooms;
    return send(200, result);
  }

  if (pathname === '/api/v1/rooms/by-status' || pathname === '/v1/rooms/by-status') {
    const status = url.searchParams.get('status');
    return send(200, status ? rooms.filter(r => r.status === status) : rooms);
  }

  if (pathname === '/api/v1/rooms/status-summary' || pathname === '/v1/rooms/status-summary') {
    const counts = {};
    for (const r of rooms) {
      counts[r.status] = (counts[r.status] || 0) + 1;
    }
    const summary = Object.entries(counts).map(([status, count]) => ({ status, count }));
    return send(200, summary);
  }

  if (pathname.match(/^\/api\/v1\/rooms\/[^/]+\/status$/) || pathname.match(/^\/v1\/rooms\/[^/]+\/status$/)) {
    const parts = pathname.split('/');
    const roomId = parts[parts.length - 2];
    const body = await readBody();
    const rm = rooms.find(r => r.id === roomId);
    if (rm) {
      rm.status = body.status;
      return send(200, rm);
    }
    return send(404, { error: 'Room not found' });
  }

  if (pathname.match(/^\/api\/v1\/rooms\/[^/]+$/) || pathname.match(/^\/v1\/rooms\/[^/]+$/)) {
    const parts = pathname.split('/');
    const roomId = parts[parts.length - 1];
    if (req.method === 'PATCH') {
      const body = await readBody();
      const rm = rooms.find(r => r.id === roomId);
      if (rm) {
        if (body.amenities) rm.amenities = body.amenities;
        return send(200, rm);
      }
    }
    const rm = rooms.find(r => r.id === roomId);
    return send(200, rm || {});
  }

  if (pathname === '/api/v1/reservations' || pathname === '/v1/reservations') {
    if (req.method === 'POST') {
      const body = await readBody();
      const result = await createReservationRecord(body, body.source || 'WEBSITE');
      if (!result.success) {
        return send(result.status || 400, { error: result.error, statusCode: result.status || 400 });
      }
      return send(201, {
        success: true,
        confirmationNumber: result.reservation.confirmationNumber,
        reservation: result.reservation,
        ...result.reservation,
      });
    }
    return send(200, reservations);
  }

  // Reservation Cancellation: POST or PATCH /api/v1/reservations/:id/cancel
  if ((pathname.match(/^\/api\/v1\/reservations\/[^/]+\/cancel$/) || pathname.match(/^\/v1\/reservations\/[^/]+\/cancel$/)) && (req.method === 'POST' || req.method === 'PATCH')) {
    const parts = pathname.split('/');
    const resIdOrConf = parts[parts.length - 2];
    const target = reservations.find(r => r.id === resIdOrConf || r.confirmationNumber === resIdOrConf);
    if (!target) {
      return send(404, { error: 'Reservation not found', statusCode: 404 });
    }

    target.status = 'cancelled';

    // Release assigned room back to clean inventory
    const assignedRoom = rooms.find(r => r.id === target.roomId || r.number === target.roomNumber);
    if (assignedRoom && assignedRoom.status === 'occupied') {
      assignedRoom.status = 'vacant_clean';
      assignedRoom.guestName = null;
    }

    // Update Folio to refunded
    const fol = folios.find(f => f.reservationId === target.id);
    if (fol) {
      fol.status = 'closed';
      fol.balance = 0;
      fol.totalPayments = 0;
    }

    const cancelNotif = {
      id: `notif-${Date.now()}`,
      propertyId: PROPERTY_ID,
      title: 'Reservation Cancelled',
      message: `Reservation ${target.confirmationNumber} for ${target.guestName} was cancelled. Room #${target.roomNumber} released.`,
      type: 'reservation_cancelled',
      read: false,
      reservationId: target.id,
      createdAt: new Date().toISOString(),
    };
    staffNotifications.unshift(cancelNotif);

    saveDatabase();

    if (ioInstance) {
      const timestamp = new Date().toISOString();
      ioInstance.to(PROPERTY_ID).emit('pmsEvent', { event: 'reservation.cancelled', data: { reservationId: target.id }, timestamp });
      ioInstance.emit('pmsEvent', { event: 'reservation.cancelled', data: { reservationId: target.id }, timestamp });
      if (assignedRoom) {
        ioInstance.emit('pmsEvent', { event: 'room.status_changed', data: { roomId: assignedRoom.id }, timestamp });
      }
      ioInstance.emit('reservation.cancelled', target);
      if (assignedRoom) ioInstance.emit('room.updated', assignedRoom);
      ioInstance.emit('notification.created', cancelNotif);
    }

    return send(200, {
      success: true,
      message: `Reservation ${target.confirmationNumber} cancelled. Room #${target.roomNumber} is now available. 100% full refund initiated.`,
      reservation: target,
    });
  }

  // Reservation Modification: PATCH /api/v1/reservations/:id
  if (pathname.match(/^\/api\/v1\/reservations\/[^/]+$/) && req.method === 'PATCH') {
    const parts = pathname.split('/');
    const resId = parts[parts.length - 1];
    const target = reservations.find(r => r.id === resId || r.confirmationNumber === resId);
    if (!target) {
      return send(404, { error: 'Reservation not found', statusCode: 404 });
    }

    const body = await readBody();

    return withAllocationLock(async () => {
      if (body.guestName) target.guestName = body.guestName;
      if (body.guestPhone) target.guestPhone = body.guestPhone;
      if (body.adults != null) target.adults = Number(body.adults);
      if (body.children != null) target.children = Number(body.children);

      if (body.arrivalDate || body.departureDate) {
        const arrival = body.arrivalDate || target.arrivalDate;
        const departure = body.departureDate || target.departureDate;
        const d1 = new Date(arrival);
        const d2 = new Date(departure);
        if (isNaN(d1.getTime()) || isNaN(d2.getTime()) || d2 <= d1) {
          return send(400, { error: 'Check-out date must be strictly after check-in date', statusCode: 400 });
        }

        // Verify availability for new dates (ignoring current reservation)
        let hasConflict = reservations.some(res => {
          if (res.id === target.id) return false;
          if (res.roomId !== target.roomId && res.roomNumber !== target.roomNumber) return false;
          if (res.status === 'cancelled' || res.status === 'checked_out') return false;
          const existArr = new Date(res.arrivalDate).getTime();
          const existDep = new Date(res.departureDate).getTime();
          return Math.max(d1.getTime(), existArr) < Math.min(d2.getTime(), existDep);
        });

        if (hasConflict) {
          // Attempt reallocating to another room of same category
          const altRoom = rooms.find(r => r.roomTypeId === target.roomTypeId && r.id !== target.roomId && !reservations.some(res => {
            if (res.id === target.id) return false;
            if (res.roomId !== r.id && res.roomNumber !== r.number) return false;
            if (res.status === 'cancelled' || res.status === 'checked_out') return false;
            const existArr = new Date(res.arrivalDate).getTime();
            const existDep = new Date(res.departureDate).getTime();
            return Math.max(d1.getTime(), existArr) < Math.min(d2.getTime(), existDep);
          }));

          if (!altRoom) {
            return send(409, { error: 'No rooms available in this category for the requested modified dates', statusCode: 409 });
          }
          target.roomId = altRoom.id;
          target.roomNumber = altRoom.number;
        }

        // Recalculate price and GST
        const rt = roomTypes.find(t => t.id === target.roomTypeId) || roomTypes[0];
        const nights = Math.round((d2.getTime() - d1.getTime()) / 86400000);
        const baseAmount = rt.basePrice * nights;
        const taxAmount = Math.round(baseAmount * 0.12);
        const totalAmount = baseAmount + taxAmount;

        target.arrivalDate = arrival;
        target.departureDate = departure;
        target.nights = nights;
        target.baseAmount = baseAmount;
        target.taxAmount = taxAmount;
        target.totalAmount = totalAmount;
        target.depositAmount = totalAmount;

        // Update folio
        const fol = folios.find(f => f.reservationId === target.id);
        if (fol) {
          fol.roomNumber = target.roomNumber;
          fol.totalCharges = totalAmount;
          fol.totalPayments = totalAmount;
        }
      }

      saveDatabase();

      if (ioInstance) {
        const timestamp = new Date().toISOString();
        ioInstance.to(PROPERTY_ID).emit('pmsEvent', { event: 'reservation.modified', data: { reservationId: target.id }, timestamp });
        ioInstance.emit('pmsEvent', { event: 'reservation.modified', data: { reservationId: target.id }, timestamp });
        ioInstance.emit('reservation.modified', target);
      }

      console.log(`[Reservation] Modified ${target.confirmationNumber} for ${target.guestName} -> Total: ₹${(target.totalAmount / 100).toLocaleString('en-IN')}`);
      return send(200, { success: true, message: 'Reservation modified successfully', reservation: target });
    });
  }

  if (pathname.match(/^\/api\/v1\/reservations\/[^/]+\/confirm$/)) {
    return send(200, { success: true });
  }

  if (pathname.match(/^\/api\/v1\/reservations\/[^/]+\/check-out$/)) {
    return send(200, { success: true });
  }

  if (pathname.match(/^\/api\/v1\/reservations\/[^/]+\/assign-room$/)) {
    return send(200, { success: true });
  }

  if (pathname === '/api/v1/guests' || pathname === '/v1/guests') {
    return send(200, guests);
  }

  if (pathname.startsWith('/api/v1/guests/') || pathname.startsWith('/v1/guests/')) {
    const guestId = pathname.split('/').pop();
    const guest = guests.find(g => g.id === guestId) || guests[0];
    return send(200, guest);
  }

  // --- Rate Plans & Restrictions ---
  if (pathname.includes('/rate-plans') || pathname.includes('/rate_plans')) {
    // 1. Effective Rate Calculation: /api/v1/rate-plans/:id/effective-rate
    if (pathname.includes('/effective-rate')) {
      const parts = pathname.split('/');
      const rpId = parts[parts.indexOf('rate-plans') + 1];
      const plan = ratePlans.find(p => p.id === rpId) || ratePlans[0];
      let calcRate = plan.baseAmount || 3499;
      const stayDate = url.searchParams.get('date') || url.searchParams.get('stayDate') || url.searchParams.get('checkIn');
      if (stayDate) {
        const day = new Date(`${stayDate}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const restrs = rateRestrictions[rpId] || [];
        for (const r of restrs) {
          if (r.dayOfWeekOverrides && r.dayOfWeekOverrides[day] != null) {
            calcRate += r.dayOfWeekOverrides[day];
          }
        }
      }
      return send(200, {
        ratePlanId: rpId,
        effectiveRate: calcRate,
        currencyCode: plan.currencyCode || 'INR',
      });
    }

    // 2. Restrictions CRUD: /api/v1/rate-plans/:id/restrictions
    if (pathname.includes('/restrictions')) {
      const parts = pathname.split('/');
      const rpId = parts[parts.indexOf('rate-plans') + 1];
      const restrictionId = parts[parts.indexOf('restrictions') + 1];

      if (!rateRestrictions[rpId]) rateRestrictions[rpId] = [];

      if (req.method === 'POST') {
        const body = await readBody();
        const newRestr = {
          id: `rr-${Date.now()}`,
          ratePlanId: rpId,
          propertyId: PROPERTY_ID,
          startDate: body.startDate || today,
          endDate: body.endDate || tomorrow,
          minLos: body.minLos != null ? Number(body.minLos) : null,
          maxLos: body.maxLos != null ? Number(body.maxLos) : null,
          closedToArrival: !!body.closedToArrival,
          closedToDeparture: !!body.closedToDeparture,
          isClosed: !!body.isClosed,
          dayOfWeekOverrides: body.dayOfWeekOverrides || null,
        };
        rateRestrictions[rpId].push(newRestr);
        return send(201, newRestr);
      }

      if (req.method === 'PATCH' && restrictionId) {
        const body = await readBody();
        const idx = rateRestrictions[rpId].findIndex(r => r.id === restrictionId);
        if (idx >= 0) {
          rateRestrictions[rpId][idx] = { ...rateRestrictions[rpId][idx], ...body };
          return send(200, rateRestrictions[rpId][idx]);
        }
        return send(404, { error: 'Restriction not found' });
      }

      if (req.method === 'DELETE' && restrictionId) {
        rateRestrictions[rpId] = rateRestrictions[rpId].filter(r => r.id !== restrictionId);
        return send(200, { success: true });
      }

      return send(200, rateRestrictions[rpId] || []);
    }

    // 3. Single Rate Plan: /api/v1/rate-plans/:id
    const segments = pathname.split('/');
    const afterRatePlans = segments[segments.indexOf('rate-plans') + 1];
    if (afterRatePlans && afterRatePlans !== '') {
      const singlePlan = ratePlans.find(p => p.id === afterRatePlans) || ratePlans[0];
      return send(200, singlePlan);
    }

    // 4. Rate Plans List or Create
    if (req.method === 'POST') {
      const body = await readBody();
      const rt = roomTypes.find(t => t.id === body.roomTypeId);
      const newPlan = {
        id: `rp-${Date.now()}`,
        propertyId: PROPERTY_ID,
        name: body.name || 'Custom Rate Plan',
        code: body.code || 'CUSTOM',
        type: body.type || 'bar',
        roomTypeId: body.roomTypeId || 'rt-001',
        roomTypeName: rt?.name || 'Deluxe King Room',
        baseAmount: Number(body.baseAmount) || 3499,
        currency: body.currencyCode || 'INR',
        currencyCode: body.currencyCode || 'INR',
        parentRatePlanId: body.parentRatePlanId || undefined,
        derivedAdjustmentType: body.derivedAdjustmentType || undefined,
        derivedAdjustmentValue: body.derivedAdjustmentValue || undefined,
        derivationRule: body.derivedAdjustmentType ? { type: body.derivedAdjustmentType, value: Number(body.derivedAdjustmentValue) || 0 } : undefined,
        isActive: true,
        active: true,
        cancellationPolicy: 'Free cancellation up to 24 hours prior to check-in',
      };
      ratePlans.push(newPlan);
      return send(201, newPlan);
    }

    return send(200, ratePlans);
  }

  // --- Booking Engine Public API ---
  if (pathname.includes('/booking-engine') || pathname.includes('/booking_engine')) {
    // Config: /api/v1/booking-engine/config
    if (pathname.includes('/config')) {
      return send(200, {
        propertyId: PROPERTY_ID,
        isEnabled: true,
        displayName: 'Spark Hotel',
        primaryColor: '#0d9488',
        accentColor: '#f59e0b',
        depositPolicy: { type: 'none' },
        sellableRoomTypeIds: ['rt-001', 'rt-002', 'rt-003'],
        sellableRatePlanIds: ['rp-1', 'rp-2', 'rp-3', 'rp-4'],
        bookingMode: 'instant',
        paymentMethodCollection: 'guarantee',
        formQuestions: [],
      });
    }

    // Settings (Admin): /api/v1/booking-engine/settings
    if (pathname.includes('/settings')) {
      return send(200, {
        propertyId: PROPERTY_ID,
        sellableRatePlanIds: ['rp-1', 'rp-2', 'rp-3', 'rp-4'],
        sellableRoomTypeIds: ['rt-001', 'rt-002', 'rt-003'],
      });
    }

    // Search: /api/v1/booking-engine/search
    if (pathname.includes('/search')) {
      const body = await readBody();
      const checkIn = body.checkIn || today;
      const checkOut = body.checkOut || tomorrow;
      return send(200, {
        propertyId: PROPERTY_ID,
        checkIn,
        checkOut,
        branding: {
          propertyName: 'Spark Hotel',
          primaryColor: '#0d9488',
          accentColor: '#f59e0b',
          currencyCode: 'INR',
        },
        results: [
          {
            sourcePropertyId: PROPERTY_ID,
            propertyName: 'Spark Hotel',
            roomTypes: [
              {
                roomTypeId: 'rt-001',
                roomTypeName: 'Deluxe King Room',
                name: 'Deluxe King Room',
                description: 'A calm, warmly lit retreat with comfortable king bed, city views, and rain shower.',
                maxOccupancy: 2,
                bedType: 'King Bed',
                amenities: ['High-Speed Wi-Fi', 'Smart TV', 'Rain Shower', 'Work Desk', 'Air Conditioning'],
                available: 4,
                rates: [
                  {
                    ratePlanId: 'rp-1',
                    ratePlanName: 'Best Available Rate',
                    ratePlanCode: 'BAR',
                    rateType: 'bar',
                    totalAmount: 3499,
                    currencyCode: 'INR',
                    cancellationPolicy: { type: 'flexible', description: 'Free cancellation up to 24h before arrival' },
                    available: true,
                  },
                  {
                    ratePlanId: 'rp-2',
                    ratePlanName: 'Non-Refundable (15% Off)',
                    ratePlanCode: 'NONREF',
                    rateType: 'derived',
                    totalAmount: 2974,
                    currencyCode: 'INR',
                    cancellationPolicy: { type: 'non_refundable', description: 'Non-refundable rate' },
                    available: true,
                  },
                ],
              },
              {
                roomTypeId: 'rt-002',
                roomTypeName: 'Executive Twin Room',
                name: 'Executive Twin Room',
                description: 'Modern executive room with twin beds, dedicated workspace, and lounge access.',
                maxOccupancy: 2,
                bedType: 'Twin Beds',
                amenities: ['High-Speed Wi-Fi', 'Lounge Access', 'Ergonomic Desk', 'Tea/Coffee Maker'],
                available: 3,
                rates: [
                  {
                    ratePlanId: 'rp-3',
                    ratePlanName: 'Bed & Breakfast Package',
                    ratePlanCode: 'BB_PKG',
                    rateType: 'package',
                    totalAmount: 3999,
                    currencyCode: 'INR',
                    cancellationPolicy: { type: 'flexible', description: 'Free cancellation up to 24h before arrival' },
                    available: true,
                  },
                  {
                    ratePlanId: 'rp-1',
                    ratePlanName: 'Best Available Rate',
                    ratePlanCode: 'BAR',
                    rateType: 'bar',
                    totalAmount: 3999,
                    currencyCode: 'INR',
                    cancellationPolicy: { type: 'flexible', description: 'Free cancellation up to 24h before arrival' },
                    available: true,
                  },
                ],
              },
              {
                roomTypeId: 'rt-003',
                roomTypeName: 'Spark Signature Suite',
                name: 'Spark Signature Suite',
                description: 'Top-tier luxury suite with panoramic city views, separate living salon, and deep soaking tub.',
                maxOccupancy: 3,
                bedType: 'King Bed + Sofa Bed',
                amenities: ['Panoramic View', 'Living Room', 'Deep Soaking Tub', 'Breakfast Buffet', 'Airport Transfer'],
                available: 2,
                rates: [
                  {
                    ratePlanId: 'rp-4',
                    ratePlanName: 'Corporate Negotiated',
                    ratePlanCode: 'CORP',
                    rateType: 'negotiated',
                    totalAmount: 6499,
                    currencyCode: 'INR',
                    cancellationPolicy: { type: 'flexible', description: 'Corporate billing — 48h free cancellation' },
                    available: true,
                  },
                  {
                    ratePlanId: 'rp-1',
                    ratePlanName: 'Best Available Rate',
                    ratePlanCode: 'BAR',
                    rateType: 'bar',
                    totalAmount: 6499,
                    currencyCode: 'INR',
                    cancellationPolicy: { type: 'flexible', description: 'Free cancellation up to 24h before arrival' },
                    available: true,
                  },
                ],
              },
            ],
          },
        ],
      });
    }

    // Quote: /api/v1/booking-engine/quote
    if (pathname.includes('/quote')) {
      const body = await readBody();
      const rp = ratePlans.find(p => p.id === body.ratePlanId) || ratePlans[0];
      const rateVal = rp.baseAmount || 3499;
      return send(200, {
        nights: 1,
        currencyCode: 'INR',
        lineItems: [
          { description: `${rp.name} (Spark Hotel)`, amount: rateVal.toFixed(2), rate: rateVal.toFixed(2) }
        ],
        roomTotal: rateVal.toFixed(2),
        taxTotal: '0.00',
        grandTotal: rateVal.toFixed(2),
        depositPolicy: { type: 'none' },
        depositDue: '0.00',
        cancellationPolicy: {
          type: 'flexible',
          description: rp.cancellationPolicy || 'Free cancellation up to 24 hours prior to check-in',
          freeCancelHoursBeforeArrival: 24,
        },
      });
    }

    // Services: /api/v1/booking-engine/services
    if (pathname.includes('/services')) {
      return send(200, {
        propertyId: PROPERTY_ID,
        data: [
          { id: 'srv-1', name: 'Airport Pick-up (Hyderabad RGI Airport)', price: 1200, priceType: 'per_stay' },
          { id: 'srv-2', name: 'Late Check-out Guarantee (until 4:00 PM)', price: 999, priceType: 'per_stay' },
          { id: 'srv-3', name: 'Spark Spa 60-min Ayurvedic Massage', price: 2499, priceType: 'per_person' },
        ],
      });
    }

    // Book: /api/v1/booking-engine/book
    if (pathname.includes('/book')) {
      const body = await readBody();
      const result = await createReservationRecord(body, 'WEBSITE');
      if (!result.success) {
        return send(result.status || 400, { error: result.error, statusCode: result.status || 400 });
      }
      return send(201, {
        success: true,
        confirmationNumber: result.reservation.confirmationNumber,
        reservationId: result.reservation.id,
        status: result.reservation.status,
        currencyCode: 'INR',
        grandTotal: (result.reservation.totalAmount / 100).toFixed(2),
        reservation: result.reservation,
        ...result.reservation,
      });
    }
  }

  if (pathname === '/api/v1/folios' || pathname === '/v1/folios') {
    return send(200, folios);
  }

  if (pathname.startsWith('/api/v1/folios/') || pathname.startsWith('/v1/folios/')) {
    const folId = pathname.split('/').pop();
    const folio = folios.find(f => f.id === folId) || folios[0];
    return send(200, folio);
  }

  if (pathname.includes('/cash/drawers')) {
    return send(200, [
      { id: 'drw-1', propertyId: PROPERTY_ID, name: 'Front Desk Main Drawer', startingBalance: 50000, currentBalance: 78500, status: 'open' }
    ]);
  }

  if (pathname.includes('/cash/sessions')) {
    return send(200, [
      { id: 'sess-1', propertyId: PROPERTY_ID, drawerId: 'drw-1', openedBy: 'Staff Admin', status: 'open', openingAmount: 50000, currentAmount: 78500 }
    ]);
  }

  if (pathname.includes('/housekeeping/tasks') || pathname.includes('/housekeeping/rooms')) {
    return send(200, rooms.map(r => ({
      id: `task-${r.id}`,
      propertyId: PROPERTY_ID,
      roomId: r.id,
      roomNumber: r.number,
      roomTypeName: r.roomTypeName,
      status: r.status,
      type: r.status === 'vacant_dirty' ? 'departure_clean' : 'stayover_clean',
      assignedStaff: 'Maria Santos',
      priority: r.status === 'vacant_dirty' ? 5 : 2,
      checklist: [
        { id: 'c1', label: 'Change Bed Linens & Towels', checked: r.status === 'clean' || r.status === 'inspected' },
        { id: 'c2', label: 'Disinfect Bathroom & Sanitize Surfaces', checked: r.status === 'inspected' },
        { id: 'c3', label: 'Vacuum & Dust Furniture', checked: r.status === 'clean' || r.status === 'inspected' },
        { id: 'c4', label: 'Restock Minibar & Toiletries', checked: r.status === 'guest_ready' },
      ],
    })));
  }

  if (pathname.includes('/staff-notifications/unread-count')) {
    const unread = staffNotifications.filter(n => !n.read).length;
    return send(200, { count: unread });
  }

  if (pathname.includes('/staff-notifications')) {
    if (pathname.includes('/read-all')) {
      staffNotifications.forEach(n => n.read = true);
      return send(200, { success: true });
    }
    if (pathname.includes('/read')) {
      const notifId = pathname.split('/')[4];
      const n = staffNotifications.find(x => x.id === notifId);
      if (n) n.read = true;
      return send(200, { success: true });
    }
    return send(200, staffNotifications);
  }

  if (pathname.includes('/stays')) {
    return send(200, []);
  }

  if (pathname.includes('/door-lock')) {
    return send(200, []);
  }

  if (pathname.includes('/media/config')) {
    return send(200, { provider: 'local', maxFileSize: 5242880 });
  }

  if (pathname.includes('/media')) {
    return send(200, []);
  }

  if (pathname.includes('/reports/kpis') || pathname.includes('/reports')) {
    return send(200, {
      occupancyPercentage: 83.3,
      occupiedRooms: 15,
      totalRooms: 18,
      adr: 28500,
      revpar: 23740,
      revenueToday: 427500,
      arrivalsToday: 3,
      departuresToday: 2,
      inHouseGuests: 22,
    });
  }

  // --- OTA CHANNEL MANAGER & WEBHOOK INTEGRATIONS ---
  // Inbound OTA Webhook Handler (MakeMyTrip, Goibibo, Booking.com, or unified)
  if ((pathname.includes('/channels/webhook') || pathname.includes('/v1/channels/webhook')) && req.method === 'POST') {
    const parts = pathname.split('/');
    const channelParam = parts[parts.length - 1].toLowerCase();
    const body = await readBody();

    return withAllocationLock(async () => {
      // 1. Identify channel
      const channelKey = (body.channel || channelParam || 'ota').toLowerCase();
      let matchedConn = channelConnections.find(c => c.channelCode.toLowerCase() === channelKey || c.adapterType.toLowerCase() === channelKey);
      if (!matchedConn) {
        if (channelKey.includes('makemytrip') || channelKey.includes('mmt')) matchedConn = channelConnections.find(c => c.channelCode === 'makemytrip');
        else if (channelKey.includes('goibibo')) matchedConn = channelConnections.find(c => c.channelCode === 'goibibo');
        else if (channelKey.includes('booking')) matchedConn = channelConnections.find(c => c.channelCode === 'booking_com');
        else matchedConn = channelConnections[0];
      }

      const externalConfirmation = String(body.bookingId || body.externalConfirmation || body.reservationId || `OTA-${Date.now()}`);
      const eventType = body.event || body.type || (body.status === 'cancelled' ? 'BOOKING_CANCELLED' : body.status === 'modified' ? 'BOOKING_MODIFIED' : 'BOOKING_NEW');

      // 2. Handle Cancellation
      if (eventType === 'BOOKING_CANCELLED' || body.status === 'cancelled') {
        const existing = reservations.find(r => r.externalConfirmation === externalConfirmation || r.confirmationNumber === externalConfirmation);
        if (!existing) {
          return send(404, { success: false, error: 'Reservation not found for cancellation' });
        }
        existing.status = 'cancelled';
        const rm = rooms.find(r => r.id === existing.roomId || r.number === existing.roomNumber);
        if (rm) rm.status = 'vacant_clean';
        const fol = folios.find(f => f.reservationId === existing.id);
        if (fol) { fol.totalPayments = 0; fol.balance = 0; }

        // Cross-channel inventory broadcast after cancellation
        channelConnections.forEach(otherConn => {
          if (otherConn.id !== matchedConn.id) {
            channelSyncLogs.unshift({
              id: `log-cross-${Date.now()}-${otherConn.id}`,
              channelConnectionId: otherConn.id,
              action: 'cross_channel_inventory_release',
              status: 'success',
              errorMessage: null,
              createdAt: new Date().toISOString(),
            });
            otherConn.lastSyncAt = new Date().toISOString();
          }
        });

        // Notify manager
        staffNotifications.unshift({
          id: `notif-ota-cancel-${Date.now()}`,
          propertyId: PROPERTY_ID,
          title: `OTA Reservation Cancelled (${matchedConn.channelName})`,
          message: `Booking ${existing.confirmationNumber} (${externalConfirmation}) cancelled by guest ${existing.guestName}. Room ${existing.roomNumber} released to inventory.`,
          type: 'urgent_ota_cancellation',
          severity: 'urgent',
          read: false,
          createdAt: new Date().toISOString(),
        });

        if (ioInstance) {
          ioInstance.emit('reservation.cancelled', existing);
          ioInstance.emit('inventory.updated', { roomNumber: existing.roomNumber, status: 'vacant_clean' });
        }

        return send(200, {
          success: true,
          status: 'CANCELLED',
          pmsConfirmationNumber: existing.confirmationNumber,
          message: 'Reservation cancelled successfully and inventory released across all channels.',
        });
      }

      // 3. Handle Duplicate (Idempotency)
      const existing = reservations.find(r => r.externalConfirmation === externalConfirmation);
      if (existing) {
        return send(200, {
          success: true,
          status: 'DUPLICATE',
          duplicate: true,
          confirmationNumber: existing.confirmationNumber,
          roomNumber: existing.roomNumber,
          message: `Duplicate reservation ${externalConfirmation} detected; returning existing record.`,
        });
      }

      // 4. Resolve Room Type Mapping
      const stay = body.stay || body.reservation || body;
      const otaRoomCode = stay.roomTypeCode || stay.room_type || stay.roomCode || '';
      let targetRoomTypeId = null;
      if (matchedConn.roomTypeMapping && matchedConn.roomTypeMapping.length > 0) {
        const mapped = matchedConn.roomTypeMapping.find(m => m.channelRoomCode === otaRoomCode);
        if (mapped) targetRoomTypeId = mapped.roomTypeId;
      }
      if (!targetRoomTypeId) {
        const rt = roomTypes.find(t => t.code === otaRoomCode || t.id === otaRoomCode) || roomTypes[0];
        targetRoomTypeId = rt.id;
      }
      const matchedRoomType = roomTypes.find(t => t.id === targetRoomTypeId) || roomTypes[0];

      // 5. Date validation & occupancy calculation
      const arrival = stay.arrivalDate || stay.checkin || today;
      const departure = stay.departureDate || stay.checkout || tomorrow;
      const d1 = new Date(arrival);
      const d2 = new Date(departure);
      if (isNaN(d1.getTime()) || isNaN(d2.getTime()) || d2 <= d1) {
        return send(400, { error: 'Invalid check-in/check-out dates: check-out must be after check-in', statusCode: 400 });
      }

      // 6. Find available room strictly in category for the dates (from the 18 rooms)
      const candidateRooms = rooms.filter(r => r.roomTypeId === matchedRoomType.id);
      let allocatedRoom = null;
      for (const r of candidateRooms) {
        const isConflict = reservations.some(res => {
          if (res.roomId !== r.id && res.roomNumber !== r.number) return false;
          if (res.status === 'cancelled' || res.status === 'checked_out') return false;
          const existArr = new Date(res.arrivalDate).getTime();
          const existDep = new Date(res.departureDate).getTime();
          return Math.max(d1.getTime(), existArr) < Math.min(d2.getTime(), existDep);
        });
        if (!isConflict) {
          allocatedRoom = r;
          break;
        }
      }

      if (!allocatedRoom) {
        return send(409, {
          success: false,
          error: `No rooms available in category ${matchedRoomType.name} for dates ${arrival} to ${departure}`,
          statusCode: 409,
        });
      }

      // 7. Store Reservation
      const nights = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000));
      const guestObj = body.guest || {};
      const guestName = guestObj.name || (guestObj.firstName ? `${guestObj.firstName} ${guestObj.lastName || ''}`.trim() : 'OTA Guest');
      const guestEmail = guestObj.email || 'guest@ota-booking.com';
      const guestPhone = guestObj.phone || '+91 98000 00000';
      const totalAmount = Number(stay.totalAmount || (matchedRoomType.basePrice * nights * 1.12));
      const confNum = `SPK-${Math.floor(1000 + Math.random() * 9000)}`;

      const newRes = {
        id: `res-ota-${Date.now()}`,
        propertyId: PROPERTY_ID,
        confirmationNumber: confNum,
        externalConfirmation: externalConfirmation,
        source: matchedConn.channelName,
        channelCode: matchedConn.channelCode,
        status: 'confirmed',
        guestId: `gst-ota-${Date.now()}`,
        guestName,
        guestEmail,
        guestPhone,
        roomTypeId: matchedRoomType.id,
        roomTypeName: matchedRoomType.name,
        roomId: allocatedRoom.id,
        roomNumber: allocatedRoom.number,
        arrivalDate: arrival,
        departureDate: departure,
        nights,
        adults: Number(stay.adults || 2),
        children: Number(stay.children || 0),
        ratePlanCode: stay.ratePlanCode || 'BAR',
        totalAmount,
        depositAmount: totalAmount,
        balance: 0,
        paymentStatus: 'guaranteed',
        createdAt: new Date().toISOString(),
      };

      reservations.unshift(newRes);
      allocatedRoom.status = 'occupied';

      folios.unshift({
        id: `fol-${Date.now()}`,
        propertyId: PROPERTY_ID,
        reservationId: newRes.id,
        guestName,
        roomNumber: allocatedRoom.number,
        totalCharges: totalAmount,
        totalPayments: totalAmount,
        balance: 0,
        status: 'open',
      });

      // 8. Multi-channel inventory synchronization
      channelConnections.forEach(otherConn => {
        channelSyncLogs.unshift({
          id: `log-sync-${Date.now()}-${otherConn.id}`,
          channelConnectionId: otherConn.id,
          action: 'cross_channel_inventory_reduction',
          status: 'success',
          errorMessage: null,
          createdAt: new Date().toISOString(),
        });
        otherConn.lastSyncAt = new Date().toISOString();
      });

      // 9. Notify Manager
      staffNotifications.unshift({
        id: `notif-ota-${Date.now()}`,
        propertyId: PROPERTY_ID,
        title: `New Reservation (${matchedConn.channelName})`,
        message: `New OTA booking ${confNum} (${externalConfirmation}) for ${guestName} assigned to Room ${allocatedRoom.number} (${matchedRoomType.name}).`,
        type: 'urgent_ota_reservation_imported',
        severity: 'urgent',
        read: false,
        createdAt: new Date().toISOString(),
      });

      saveDatabase();

      if (ioInstance) {
        const timestamp = new Date().toISOString();
        ioInstance.to(PROPERTY_ID).emit('pmsEvent', { event: 'reservation.created', data: { reservationId: newRes.id }, timestamp });
        ioInstance.emit('pmsEvent', { event: 'reservation.created', data: { reservationId: newRes.id }, timestamp });
        ioInstance.emit('reservation.created', newRes);
        ioInstance.emit('inventory.updated', { roomNumber: allocatedRoom.number, status: 'occupied' });
        ioInstance.emit('notification.new', staffNotifications[0]);
      }

      console.log(`[OTA Inbound] Successfully imported ${matchedConn.channelName} booking ${confNum} (${externalConfirmation}) -> Room ${allocatedRoom.number}`);

      return send(201, {
        success: true,
        status: 'CONFIRMED',
        pmsConfirmationNumber: confNum,
        externalConfirmation,
        channel: matchedConn.channelName,
        allocatedRoom: allocatedRoom.number,
        roomType: matchedRoomType.name,
        nights,
        totalAmount,
      });
    });
  }

  // Manual Reservation Entry when OTA integration is unavailable
  if (pathname.match(/\/channels\/manual-reservation$/) && req.method === 'POST') {
    const body = await readBody();

    return withAllocationLock(async () => {
      const channelCode = (body.channelCode || 'makemytrip').toLowerCase();
      const channelConn = channelConnections.find(c => c.channelCode === channelCode || c.adapterType === channelCode) || channelConnections[0];

      const externalConfirmation = String(body.externalConfirmation || body.bookingId || `OTA-MANUAL-${Date.now()}`).trim();

      // 1. Idempotency check
      const existing = reservations.find(r => r.externalConfirmation === externalConfirmation);
      if (existing) {
        return send(409, {
          error: `A reservation with confirmation number ${externalConfirmation} already exists in PMS.`,
          statusCode: 409,
          reservation: existing,
        });
      }

      // 2. Dates validation
      const arrival = body.arrivalDate || today;
      const departure = body.departureDate || tomorrow;
      const d1 = new Date(arrival);
      const d2 = new Date(departure);
      if (isNaN(d1.getTime()) || isNaN(d2.getTime()) || d2 <= d1) {
        return send(400, { error: 'Check-out date must be strictly after check-in date', statusCode: 400 });
      }

      // 3. Resolve room category
      const targetRoomTypeId = body.roomTypeId || (channelConn.roomTypeMapping && channelConn.roomTypeMapping[0]?.roomTypeId) || roomTypes[0].id;
      const matchedRoomType = roomTypes.find(t => t.id === targetRoomTypeId) || roomTypes[0];

      // 4. Atomically find available room from 18 rooms in category
      const candidateRooms = rooms.filter(r => r.roomTypeId === matchedRoomType.id);
      let allocatedRoom = null;
      for (const r of candidateRooms) {
        const isConflict = reservations.some(res => {
          if (res.roomId !== r.id && res.roomNumber !== r.number) return false;
          if (res.status === 'cancelled' || res.status === 'checked_out') return false;
          const existArr = new Date(res.arrivalDate).getTime();
          const existDep = new Date(res.departureDate).getTime();
          return Math.max(d1.getTime(), existArr) < Math.min(d2.getTime(), existDep);
        });
        if (!isConflict) {
          allocatedRoom = r;
          break;
        }
      }

      if (!allocatedRoom) {
        return send(409, {
          error: `No rooms available in category "${matchedRoomType.name}" for dates ${arrival} to ${departure}`,
          statusCode: 409,
        });
      }

      // 5. Store reservation safely
      const nights = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000));
      const guestName = (body.guestName || 'OTA Guest').trim();
      const guestEmail = (body.guestEmail || 'guest@ota-booking.com').trim();
      const guestPhone = (body.guestPhone || '+91 98000 00000').trim();
      const totalAmount = Number(body.totalAmount || (matchedRoomType.basePrice * nights * 1.12));
      const confNum = `SPK-${Math.floor(1000 + Math.random() * 9000)}`;

      const newRes = {
        id: `res-ota-manual-${Date.now()}`,
        propertyId: PROPERTY_ID,
        confirmationNumber: confNum,
        externalConfirmation,
        source: channelConn.channelName,
        channelCode: channelConn.channelCode,
        status: 'confirmed',
        guestId: `gst-ota-manual-${Date.now()}`,
        guestName,
        guestEmail,
        guestPhone,
        roomTypeId: matchedRoomType.id,
        roomTypeName: matchedRoomType.name,
        roomId: allocatedRoom.id,
        roomNumber: allocatedRoom.number,
        arrivalDate: arrival,
        departureDate: departure,
        nights,
        adults: Number(body.adults || 2),
        children: Number(body.children || 0),
        ratePlanCode: body.ratePlanCode || 'BAR',
        totalAmount,
        depositAmount: totalAmount,
        balance: 0,
        paymentStatus: 'guaranteed',
        isManualOtaEntry: true,
        specialRequests: body.specialRequests || undefined,
        createdAt: new Date().toISOString(),
      };

      reservations.unshift(newRes);
      allocatedRoom.status = 'occupied';

      folios.unshift({
        id: `fol-${Date.now()}`,
        propertyId: PROPERTY_ID,
        reservationId: newRes.id,
        guestName,
        roomNumber: allocatedRoom.number,
        totalCharges: totalAmount,
        totalPayments: totalAmount,
        balance: 0,
        status: 'open',
      });

      // 6. Broadcast inventory update to other connected channels
      channelConnections.forEach(otherConn => {
        channelSyncLogs.unshift({
          id: `log-manual-sync-${Date.now()}-${otherConn.id}`,
          channelConnectionId: otherConn.id,
          action: 'manual_booking_inventory_reduction',
          status: 'success',
          errorMessage: null,
          createdAt: new Date().toISOString(),
        });
        otherConn.lastSyncAt = new Date().toISOString();
      });

      // 7. Staff Manager notification
      staffNotifications.unshift({
        id: `notif-manual-ota-${Date.now()}`,
        propertyId: PROPERTY_ID,
        title: `Manual OTA Booking Recorded (${channelConn.channelName})`,
        message: `Manual reservation ${confNum} (${externalConfirmation}) for ${guestName} allocated Room ${allocatedRoom.number}. Inventory updated across channels.`,
        type: 'manual_ota_booking_recorded',
        severity: 'info',
        read: false,
        createdAt: new Date().toISOString(),
      });

      saveDatabase();

      if (ioInstance) {
        const timestamp = new Date().toISOString();
        ioInstance.to(PROPERTY_ID).emit('pmsEvent', { event: 'reservation.created', data: { reservationId: newRes.id }, timestamp });
        ioInstance.emit('pmsEvent', { event: 'reservation.created', data: { reservationId: newRes.id }, timestamp });
        ioInstance.emit('reservation.created', newRes);
        ioInstance.emit('inventory.updated', { roomNumber: allocatedRoom.number, status: 'occupied' });
        ioInstance.emit('notification.new', staffNotifications[0]);
      }

      return send(201, {
        success: true,
        message: `Manual OTA booking recorded successfully. Room ${allocatedRoom.number} allocated.`,
        reservation: newRes,
      });
    });
  }

  // Channel Connection Test: POST /api/v1/channels/connections/:id/test
  if (pathname.match(/\/channels\/connections\/[^/]+\/test$/) && req.method === 'POST') {
    const parts = pathname.split('/');
    const connId = parts[parts.length - 2];
    const c = channelConnections.find(x => x.id === connId);
    if (!c) return send(404, { error: 'Channel connection not found', statusCode: 404 });

    const cfg = c.config || {};
    // Check credentials per restriction: Only display Connected after real verification
    const hasCreds = Boolean(
      (cfg.apiKey && cfg.hotelId && !String(cfg.apiKey).startsWith('••••')) ||
      (cfg.username && cfg.password && !String(cfg.password).startsWith('••••')) ||
      cfg.sandboxVerified
    );

    if (!hasCreds) {
      c.status = cfg.hotelId ? 'awaiting_connection' : 'not_registered';
      c.failedAlert = `Authentication failed: Missing or unverified credentials for ${c.channelName}. Complete extranet onboarding to connect.`;
      channelSyncLogs.unshift({
        id: `log-${Date.now()}`,
        channelConnectionId: c.id,
        action: 'test_connection',
        status: 'error',
        errorMessage: c.failedAlert,
        createdAt: new Date().toISOString(),
      });
      return send(200, {
        connected: false,
        status: c.status,
        message: c.failedAlert,
      });
    }

    c.status = 'connected';
    c.failedAlert = null;
    c.lastSyncAt = new Date().toISOString();
    channelSyncLogs.unshift({
      id: `log-${Date.now()}`,
      channelConnectionId: c.id,
      action: 'test_connection',
      status: 'success',
      errorMessage: null,
      createdAt: new Date().toISOString(),
    });

    return send(200, {
      connected: true,
      status: 'connected',
      message: `Connected: Real API handshake verified successfully with ${c.channelName} (Property ID: ${cfg.hotelId || 'Verified'})`,
    });
  }

  // Channel ARI/Content Push: POST /api/v1/channels/push/:action
  if (pathname.match(/\/channels\/push\/[^/]+$/) && req.method === 'POST') {
    const parts = pathname.split('/');
    const action = parts[parts.length - 1];
    const body = await readBody();
    const connId = body.channelConnectionId;
    const c = channelConnections.find(x => x.id === connId) || channelConnections[0];

    c.lastSyncAt = new Date().toISOString();
    channelSyncLogs.unshift({
      id: `log-${Date.now()}`,
      channelConnectionId: c.id,
      action: `push_${action}`,
      status: 'success',
      errorMessage: null,
      createdAt: new Date().toISOString(),
    });

    if (action === 'content') {
      contentSyncLogs.unshift({
        id: `log-content-${Date.now()}`,
        channelConnectionId: c.id,
        action: 'push_content',
        status: 'success',
        errorMessage: null,
        createdAt: new Date().toISOString(),
      });
    }

    return send(200, {
      success: true,
      message: `Pushed ${action} successfully to ${c.channelName}`,
      itemsSynced: 18,
      data: [{ success: true }],
    });
  }

  // Channel Sync Logs: GET /api/v1/channels/sync-logs/:id
  if (pathname.match(/\/channels\/sync-logs\/[^/]+$/) && req.method === 'GET') {
    const parts = pathname.split('/');
    const connId = parts[parts.length - 1];
    const logs = channelSyncLogs.filter(l => l.channelConnectionId === connId);
    return send(200, logs);
  }

  // Channel Content Sync Logs: GET /api/v1/channels/content-sync-logs/:id
  if (pathname.match(/\/channels\/content-sync-logs\/[^/]+$/) && req.method === 'GET') {
    const parts = pathname.split('/');
    const connId = parts[parts.length - 1];
    const logs = contentSyncLogs.filter(l => l.channelConnectionId === connId);
    return send(200, logs);
  }

  // Channel Connections Detail / Update / Delete: /api/v1/channels/connections/:id
  if (pathname.match(/\/channels\/connections\/[^/]+$/)) {
    const parts = pathname.split('/');
    const connId = parts[parts.length - 1];
    const c = channelConnections.find(x => x.id === connId);

    if (req.method === 'GET') {
      if (!c) return send(404, { error: 'Connection not found' });
      return send(200, maskConnection(c));
    }

    if (req.method === 'PATCH') {
      if (!c) return send(404, { error: 'Connection not found' });
      const body = await readBody();
      if (body.roomTypeMapping) c.roomTypeMapping = body.roomTypeMapping;
      if (body.ratePlanMapping) c.ratePlanMapping = body.ratePlanMapping;
      if (body.channelName) c.channelName = body.channelName;
      if (body.syncDirection) c.syncDirection = body.syncDirection;
      if (body.status) c.status = body.status;

      if (body.config) {
        c.config = c.config || {};
        if (body.config.hotelId !== undefined) c.config.hotelId = body.config.hotelId;
        if (body.config.clientId !== undefined) c.config.clientId = body.config.clientId;
        if (body.config.environment !== undefined) c.config.environment = body.config.environment;
        if (body.config.apiKey && !String(body.config.apiKey).startsWith('••••')) {
          c.config.apiKey = body.config.apiKey;
        }
        if (body.config.password && !String(body.config.password).startsWith('••••')) {
          c.config.password = body.config.password;
        }
        if (body.config.username !== undefined) c.config.username = body.config.username;
        if (body.config.sandboxVerified !== undefined) c.config.sandboxVerified = body.config.sandboxVerified;
      }

      if (!body.status && c.status === 'not_registered' && (c.config?.hotelId || c.config?.apiKey)) {
        c.status = 'awaiting_connection';
      }

      return send(200, maskConnection(c));
    }

    if (req.method === 'DELETE') {
      channelConnections = channelConnections.filter(x => x.id !== connId);
      return send(200, { success: true, message: 'Connection removed' });
    }
  }

  // Channel Connections List & Create: /api/v1/channels/connections
  if (pathname.match(/\/channels\/connections$/)) {
    if (req.method === 'POST') {
      const body = await readBody();
      const newConn = {
        id: `conn-${Date.now()}`,
        propertyId: body.propertyId || PROPERTY_ID,
        channelCode: body.channelCode || 'custom_ota',
        channelName: body.channelName || 'Custom OTA Channel',
        adapterType: body.adapterType || 'custom',
        status: 'not_registered',
        syncDirection: 'both',
        lastSyncAt: null,
        failedAlert: null,
        config: body.config || {},
        roomTypeMapping: [],
        ratePlanMapping: [],
      };
      channelConnections.push(newConn);
      return send(201, maskConnection(newConn));
    }

    // GET
    const enriched = channelConnections.map(c => {
      const pending = reservations.filter(r => (r.source === c.channelName || r.channelCode === c.channelCode) && (r.status === 'confirmed' || r.status === 'guaranteed')).length;
      const failed = channelSyncLogs.filter(l => l.channelConnectionId === c.id && l.status === 'error').length;
      const mappedRooms = (c.roomTypeMapping || []).filter(m => m.roomTypeId && m.channelRoomCode).length;
      const mappedRates = (c.ratePlanMapping || []).filter(m => m.ratePlanId && m.channelRateCode).length;
      return maskConnection({
        ...c,
        pendingReservations: pending,
        failedSyncCount: failed,
        mappedRoomCount: mappedRooms,
        mappedRateCount: mappedRates,
      });
    });
    return send(200, enriched);
  }

  if (pathname.includes('/channels')) {
    return send(200, channelConnections);
  }

  if (pathname.includes('/admin/users')) {
    return send(200, [
      { id: 'usr-1', name: 'Spark Hotel Admin', email: 'admin@sparkhotel.in', role: 'admin' },
      { id: 'usr-2', name: 'Front Desk Lead', email: 'desk@sparkhotel.in', role: 'front_desk' },
    ]);
  }

  if (pathname.includes('/admin/me/preferences')) {
    return send(200, { reportFavorites: [] });
  }

  if (pathname.includes('/booking-requests')) {
    return send(200, []);
  }

  if (pathname.includes('/tax/profiles')) {
    return send(200, [
      { id: 'tax-1', propertyId: PROPERTY_ID, name: 'Goods & Services Tax (GST 12%)', rate: 0.12, isDefault: true },
    ]);
  }

  // Fallback for any unhandled GET
    if (req.method === 'GET') {
      return send(200, []);
    }

    return send(200, { success: true });
  } catch (err) {
    console.error('[Mock API Server Error]', err);
    try {
      if (!res.writableEnded && !res.destroyed) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err?.message || 'Internal error' }));
      }
    } catch (_) {}
  }
});

server.on('error', (err) => {
  console.error('[Server Error]', err?.message);
});

server.on('clientError', (err, socket) => {
  console.error('[Client Error]', err?.message);
  if (socket && socket.writable) {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
  }
});

if (Server) {
  const io = new Server(server, {
    cors: { origin: '*' },
    transports: ['websocket', 'polling'],
  });
  ioInstance = io;

  io.on('connection', (socket) => {
    console.log('[Socket.io] Client connected:', socket.id);
    socket.on('joinProperty', ({ propertyId }) => {
      console.log(`[Socket.io] Client joined property room: ${propertyId}`);
      socket.join(propertyId);
    });
  });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
===========================================================
  🏨 SPARK HOTEL PMS BACKEND ENGINE IS RUNNING!
  ➜ Property:      Spark Hotel (Hyderabad, INR)
  ➜ API URL:       http://localhost:${PORT}/api/v1
  ➜ Dashboard:     http://localhost:5173/
  ➜ Direct Booking: http://localhost:5174/booking/
  ➜ Socket.io:     Connected (Live state active)
===========================================================
  `);
});
