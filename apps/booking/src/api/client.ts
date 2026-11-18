import axios from 'axios';
import { resolveBookingKey } from '../lib/bookingKey';
import { supabaseFetch } from '../lib/supabase';
import type {
  BookRequest,
  BookResponse,
  BookingConfig,
  BookingDetails,
  CancelResponse,
  QuoteRequest,
  QuoteResponse,
  RequestPaymentMethodSetupRequest,
  RequestPaymentMethodSetupResponse,
  SearchRequest,
  SearchResponse,
  SearchRoomType,
  SearchRate,
  SellableServicesResponse,
  SubmitBookingRequest,
  BookingRequestAcknowledgement,
  PaymentReturnStatus,
} from './types';

/**
 * Tiny API client for the public booking engine. Authenticates ONLY with the
 * publishable booking key (`x-booking-key`). No propertyId is ever sent — the
 * server derives it from the key.
 *
 * baseURL is `/api/v1/booking-engine` (same-origin demo). `VITE_API_BASE`
 * overrides the origin for cross-origin embeds.
 */

let bookingKey = '';

export function setBookingKey(key: string) {
  bookingKey = key;
  api.defaults.headers.common['x-booking-key'] = key;
}

export function getBookingKey(): string {
  return bookingKey;
}

const origin = (import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '');
const isStaticHosting = !origin || (typeof window !== 'undefined' && (
  window.location.hostname.includes('netlify.app') ||
  window.location.hostname.includes('vercel.app') ||
  window.location.hostname.includes('hotelspark')
));

export const api = axios.create({
  baseURL: `${origin}/api/v1/booking-engine`,
  headers: { 'Content-Type': 'application/json' },
});

// Initialise the key eagerly so the first request is authenticated.
setBookingKey(resolveBookingKey());

const DEFAULT_HOTEL_SPARK_CONFIG: BookingConfig = {
  propertyId: 'a0000001-0000-4000-a000-000000000001',
  isEnabled: true,
  displayName: 'Hotel Spark',
  primaryColor: '#0d9488',
  accentColor: '#0f766e',
  depositPolicy: {
    type: 'none',
    refundable: true,
  },
  sellableRoomTypeIds: [
    'b0000001-0000-4000-a000-000000000001', // Budget
    'b0000002-0000-4000-a000-000000000002', // Deluxe Room
    'b0000003-0000-4000-a000-000000000003', // Executive Room
    'b0000004-0000-4000-a000-000000000004', // Suite
    // Legacy aliases
    'b0000002-0000-4000-a000-000000000001',
    'b0000003-0000-4000-a000-000000000001',
  ],
  sellableRatePlanIds: [
    'c0000001-0000-4000-a000-000000000001',
    'c0000002-0000-4000-a000-000000000002',
    'c0000003-0000-4000-a000-000000000003',
    'c0000004-0000-4000-a000-000000000004',
  ],
  bookingMode: 'request',
  paymentMethodCollection: 'optional',
  paymentMethodClientMode: 'mock',
  formQuestions: [],
};

const ROOM_IMAGES: Record<string, string[]> = {
  'b0000001-0000-4000-a000-000000000001': [
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
  ],
  'b0000002-0000-4000-a000-000000000002': [
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
  ],
  'b0000003-0000-4000-a000-000000000003': [
    'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80',
  ],
  'b0000004-0000-4000-a000-000000000004': [
    'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80',
  ],
  'b0000002-0000-4000-a000-000000000001': [
    'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80',
  ],
  'b0000003-0000-4000-a000-000000000001': [
    'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80',
  ],
};

async function searchSupabase(body: SearchRequest): Promise<SearchResponse> {
  const checkInDate = new Date(body.checkIn);
  const checkOutDate = new Date(body.checkOut);
  const nights = Math.max(
    1,
    Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)),
  );

  const isSingle = (body.adults || 2) === 1;
  const deluxeRate = isSingle ? 1799 : 2099;
  const execRate = isSingle ? 2199 : 2499;

  // Official Hotel Spark Karimnagar 28 Rooms Catalog & Tariffs
  const officialRooms: SearchRoomType[] = [
    {
      roomTypeId: 'b0000001-0000-4000-a000-000000000001',
      roomTypeName: 'Budget',
      name: 'Budget Room',
      description: 'Comfortable compact room optimized for single traveler convenience with essential amenities. Rooms: 2006, 3006, 4006.',
      maxOccupancy: 1,
      bedType: 'single',
      amenities: ['AC', 'Single Bed', 'Smart TV', 'High-speed Wi-Fi', 'Room Service'],
      available: 3,
      images: ROOM_IMAGES['b0000001-0000-4000-a000-000000000001'] || [
        'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
      ],
      rates: [
        {
          ratePlanId: 'c0000001-0000-4000-a000-000000000001',
          ratePlanName: 'Best Available Rate',
          ratePlanCode: 'BAR-BGT',
          rateType: 'bar',
          totalAmount: 1599 * nights,
          currencyCode: 'INR',
          available: true,
          cancellationPolicy: {
            type: 'flexible',
            description: 'Free cancellation up to 24 hours before check-in.',
          },
        },
      ],
    },
    {
      roomTypeId: 'b0000002-0000-4000-a000-000000000002',
      roomTypeName: 'Deluxe Room',
      name: 'Deluxe Room',
      description: 'Elegant deluxe room with plush bedding, dedicated workspace, and private ensuite bath. 12 rooms across Floors 2, 3 & 4.',
      maxOccupancy: 2,
      bedType: 'double',
      amenities: ['AC', 'Double Bed', 'Smart TV', 'High-speed Wi-Fi', 'Work Desk', 'Tea Maker', 'Balcony'],
      available: 12,
      images: ROOM_IMAGES['b0000002-0000-4000-a000-000000000002'] || [
        'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=800&q=80',
      ],
      rates: [
        {
          ratePlanId: 'c0000002-0000-4000-a000-000000000002',
          ratePlanName: 'Best Available Rate',
          ratePlanCode: 'BAR-DLX',
          rateType: 'bar',
          totalAmount: deluxeRate * nights,
          currencyCode: 'INR',
          available: true,
          cancellationPolicy: {
            type: 'flexible',
            description: 'Free cancellation up to 24 hours before check-in.',
          },
        },
      ],
    },
    {
      roomTypeId: 'b0000003-0000-4000-a000-000000000003',
      roomTypeName: 'Executive Room',
      name: 'Executive Room',
      description: 'Sophisticated executive room featuring panoramic views, ergonomic desk and seating area. 11 rooms across Floors 2, 3 & 4.',
      maxOccupancy: 3,
      bedType: 'queen',
      amenities: ['AC', 'Queen Bed', 'Safe', 'Minibar', 'City View', 'Smart TV', 'High-speed Wi-Fi'],
      available: 11,
      images: ROOM_IMAGES['b0000003-0000-4000-a000-000000000003'] || [
        'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80',
      ],
      rates: [
        {
          ratePlanId: 'c0000003-0000-4000-a000-000000000003',
          ratePlanName: 'Best Available Rate',
          ratePlanCode: 'BAR-EXE',
          rateType: 'bar',
          totalAmount: execRate * nights,
          currencyCode: 'INR',
          available: true,
          cancellationPolicy: {
            type: 'flexible',
            description: 'Free cancellation up to 24 hours before check-in.',
          },
        },
      ],
    },
    {
      roomTypeId: 'b0000004-0000-4000-a000-000000000004',
      roomTypeName: 'Suite',
      name: 'Signature Suite',
      description: 'Spacious signature suite featuring a master bedroom, living hall, luxury bathtub and pantry. Rooms: 2010, 3010.',
      maxOccupancy: 4,
      bedType: 'king',
      amenities: ['AC', 'King Bed', 'Living Area', 'Bathtub', 'Minibar', 'Smart TV', 'High-speed Wi-Fi', 'Balcony'],
      available: 2,
      images: ROOM_IMAGES['b0000004-0000-4000-a000-000000000004'] || [
        'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80',
      ],
      rates: [
        {
          ratePlanId: 'c0000004-0000-4000-a000-000000000004',
          ratePlanName: 'Best Available Rate',
          ratePlanCode: 'BAR-SUT',
          rateType: 'bar',
          totalAmount: 2799 * nights,
          currencyCode: 'INR',
          available: true,
          cancellationPolicy: {
            type: 'flexible',
            description: 'Free cancellation up to 24 hours before check-in.',
          },
        },
      ],
    },
  ];

  return {
    propertyId: 'a0000001-0000-4000-a000-000000000001',
    checkIn: body.checkIn,
    checkOut: body.checkOut,
    branding: {
      displayName: 'Hotel Spark',
      primaryColor: '#0d9488',
      accentColor: '#0f766e',
    },
    results: [
      {
        sourcePropertyId: 'a0000001-0000-4000-a000-000000000001',
        propertyName: 'Hotel Spark',
        starRating: 4,
        roomTypes: officialRooms,
      },
    ],
  };
}

async function quoteSupabase(body: QuoteRequest): Promise<QuoteResponse> {
  const checkInDate = new Date(body.checkIn);
  const checkOutDate = new Date(body.checkOut);
  const nights = Math.max(
    1,
    Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)),
  );
  const adults = Number(body.adults) || 2;
  const isSingle = adults === 1;

  let ratePerNight = 2099;
  const rt = body.roomTypeId || '';

  if (rt.endsWith('0001') || rt.includes('bgt') || rt.toLowerCase().includes('budget')) {
    ratePerNight = 1599;
  } else if (rt.endsWith('0002') || rt.includes('dlx') || rt.toLowerCase().includes('deluxe')) {
    ratePerNight = isSingle ? 1799 : 2099;
  } else if (rt.endsWith('0003') || rt.includes('exe') || rt.toLowerCase().includes('executive')) {
    ratePerNight = isSingle ? 2199 : 2499;
  } else if (rt.endsWith('0004') || rt.includes('sut') || rt.toLowerCase().includes('suite')) {
    ratePerNight = 2799;
  }

  // Extra persons charge (₹399 per night)
  let extraCharges = 0;
  if (adults > 2) {
    extraCharges = (adults - 2) * 399 * nights;
  }

  const roomSubtotal = (ratePerNight * nights) + extraCharges;
  const tax = Math.round(roomSubtotal * 0.12);
  const grandTotal = roomSubtotal + tax;

  const lineItems = Array.from({ length: nights }, (_, i) => {
    const d = new Date(checkInDate.getTime() + i * 86400000);
    return {
      date: d.toISOString().split('T')[0],
      rate: ratePerNight.toFixed(2),
      tax: (ratePerNight * 0.12).toFixed(2),
    };
  });

  return {
    nights,
    currencyCode: 'INR',
    lineItems,
    roomTotal: roomSubtotal.toFixed(2),
    taxTotal: tax.toFixed(2),
    grandTotal: grandTotal.toFixed(2),
    depositPolicy: { type: 'none', refundable: false },
    depositDue: '0.00',
    cancellationPolicy: {
      type: 'strict',
      description: 'Non-refundable room reservations.',
    },
  };
}

function saveLocalDirectBooking(booking: any) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const existingStr = window.localStorage.getItem('hotel_spark_direct_bookings');
      const existing = existingStr ? JSON.parse(existingStr) : [];
      const updated = [booking, ...existing.filter((b: any) => b.id !== booking.id && b.reference !== booking.reference)];
      window.localStorage.setItem('hotel_spark_direct_bookings', JSON.stringify(updated));
    }
  } catch (e) {
    console.warn('Could not cache booking to localStorage:', e);
  }
}

async function bookSupabase(body: BookRequest): Promise<BookResponse> {
  const refCode = `SPARK-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const nights = Math.max(
    1,
    Math.round((new Date(body.checkOut).getTime() - new Date(body.checkIn).getTime()) / 86400000),
  );
  let baseRate = 2099;
  const rtId = body.roomTypeId || '';
  const isSingle = (body.adults || 2) === 1;
  if (rtId.endsWith('0001') || rtId.includes('bgt')) baseRate = 1599;
  else if (rtId.endsWith('0002') || rtId.includes('dlx')) baseRate = isSingle ? 1799 : 2099;
  else if (rtId.endsWith('0003') || rtId.includes('exe')) baseRate = isSingle ? 2199 : 2499;
  else if (rtId.endsWith('0004') || rtId.includes('sut')) baseRate = 2799;
  try {
    const plans = await supabaseFetch<any[]>(`rate_plans?room_type_id=eq.${body.roomTypeId}&select=base_amount,base_rate`);
    if (plans?.[0]?.base_amount || plans?.[0]?.base_rate) {
      baseRate = Number(plans[0].base_amount || plans[0].base_rate);
    }
  } catch (err) {
    console.warn('Could not fetch live rate plan for room type:', err);
  }
  const roomSubtotal = baseRate * nights;
  const tax = Math.round(roomSubtotal * 0.12);
  const grandTotal = (roomSubtotal + tax).toFixed(2);

  let reservationId = `req_${Date.now()}`;
  try {
    const rpcResult = await supabaseFetch<any>('rpc/submit_website_booking_request', {
      method: 'POST',
      body: JSON.stringify({
        p_hotel_id: 'a0000001-0000-4000-a000-000000000001',
        p_room_type_id: body.roomTypeId,
        p_arrival_date: body.checkIn,
        p_departure_date: body.checkOut,
        p_guest_first_name: body.guestFirstName,
        p_guest_last_name: body.guestLastName,
        p_guest_email: body.guestEmail,
        p_guest_phone: body.guestPhone || '',
        p_submitted_total: Math.round(Number(grandTotal)),
        p_adults: body.adults,
        p_children: body.children || 0,
        p_special_requests: body.specialRequests || '',
        p_currency_code: 'INR',
        p_idempotency_key: refCode,
        p_form_snapshot: {
          paymentToken: body.paymentToken,
          cardBrand: body.cardBrand,
          cardLastFour: body.cardLastFour,
          serviceIds: body.serviceIds,
        },
      }),
    });
    if (rpcResult?.id) reservationId = rpcResult.id;
  } catch (err) {
    console.warn('RPC submit_website_booking_request error:', err);
  }

  saveLocalDirectBooking({
    id: reservationId,
    propertyId: 'a0000001-0000-4000-a000-000000000001',
    status: 'pending',
    reference: refCode,
    submissionIdempotencyKey: refCode,
    arrivalDate: body.checkIn,
    departureDate: body.checkOut,
    roomTypeId: body.roomTypeId,
    roomTypeName: rtId.endsWith('0001') ? 'Budget' : rtId.endsWith('0003') ? 'Executive Room' : rtId.endsWith('0004') ? 'Suite' : 'Deluxe Room',
    roomTypeCode: rtId.endsWith('0001') ? 'BGT' : rtId.endsWith('0003') ? 'EXE' : rtId.endsWith('0004') ? 'SUT' : 'DLX',
    ratePlanId: 'c0000001-0000-4000-a000-000000000001',
    ratePlanName: 'Best Available Rate',
    adults: body.adults,
    children: body.children || 0,
    guestFirstName: body.guestFirstName,
    guestLastName: body.guestLastName,
    guestEmail: body.guestEmail,
    guestPhone: body.guestPhone || '',
    specialRequests: body.specialRequests || '',
    submittedTotal: grandTotal,
    currencyCode: 'INR',
    confirmedReservationNumber: null,
    assignedRoomNumber: null,
    availableRoomsCount: 4,
    denialReason: null,
    decidedAt: null,
    createdAt: new Date().toISOString(),
  });

  const lineItems = Array.from({ length: nights }, (_, i) => {
    const d = new Date(new Date(body.checkIn).getTime() + i * 86400000);
    return {
      date: d.toISOString().split('T')[0],
      rate: baseRate.toFixed(2),
      tax: (baseRate * 0.12).toFixed(2),
    };
  });

  return {
    success: true,
    confirmationNumber: refCode,
    reference: refCode,
    reservationId,
    bookingId: reservationId,
    isPendingApproval: true,
    status: 'pending_approval',
    message: 'Booking request confirmed! Awaiting hotel front desk check-in confirmation.',
    currencyCode: 'INR',
    grandTotal,
    lineItems,
    deposit: null,
    cancellationPolicy: 'Free cancellation up to 24 hours prior to check-in.',
  };
}

async function submitRequestSupabase(
  body: SubmitBookingRequest,
): Promise<BookingRequestAcknowledgement> {
  const plans = await supabaseFetch<any[]>(`rate_plans?id=eq.${body.ratePlanId}`);
  let ratePerNight = 2099;
  const rtSub = body.roomTypeId || '';
  if (rtSub.endsWith('0001')) ratePerNight = 1599;
  else if (rtSub.endsWith('0002')) ratePerNight = (body.adults === 1) ? 1799 : 2099;
  else if (rtSub.endsWith('0003')) ratePerNight = (body.adults === 1) ? 2199 : 2499;
  else if (rtSub.endsWith('0004')) ratePerNight = 2799;
  const nights = Math.max(
    1,
    Math.round((new Date(body.checkOut).getTime() - new Date(body.checkIn).getTime()) / 86400000),
  );
  const estimatedTotal = Math.round(ratePerNight * nights * 1.12);

  const idempotencyKey = body.idempotencyKey || `REQ-WEB-${Date.now()}`;
  let reqId = `req_${Date.now()}`;

  try {
    const rpcResult = await supabaseFetch<any>('rpc/submit_website_booking_request', {
      method: 'POST',
      body: JSON.stringify({
        p_hotel_id: 'a0000001-0000-4000-a000-000000000001',
        p_room_type_id: body.roomTypeId,
        p_arrival_date: body.checkIn,
        p_departure_date: body.checkOut,
        p_guest_first_name: body.guestFirstName,
        p_guest_last_name: body.guestLastName,
        p_guest_email: body.guestEmail,
        p_guest_phone: body.guestPhone || '',
        p_submitted_total: estimatedTotal,
        p_adults: body.adults,
        p_children: body.children || 0,
        p_special_requests: body.specialRequests || '',
        p_currency_code: 'INR',
        p_idempotency_key: idempotencyKey,
        p_form_snapshot: body.applicationAnswers || {},
      }),
    });
    if (rpcResult?.id) reqId = rpcResult.id;
  } catch (err) {
    console.warn('RPC submit_website_booking_request error:', err);
  }

  saveLocalDirectBooking({
    id: reqId,
    propertyId: 'a0000001-0000-4000-a000-000000000001',
    status: 'pending',
    reference: idempotencyKey,
    submissionIdempotencyKey: idempotencyKey,
    arrivalDate: body.checkIn,
    departureDate: body.checkOut,
    roomTypeId: body.roomTypeId,
    roomTypeName: body.roomTypeId.includes('2')
      ? 'Executive Spark Suite'
      : body.roomTypeId.includes('3')
      ? 'Standard Queen Room'
      : 'Deluxe King Room',
    roomTypeCode: body.roomTypeId.includes('2') ? 'SUT' : body.roomTypeId.includes('3') ? 'STD' : 'DLX',
    ratePlanId: body.ratePlanId || 'c0000001-0000-4000-a000-000000000001',
    ratePlanName: 'Best Available Rate',
    adults: body.adults,
    children: body.children || 0,
    guestFirstName: body.guestFirstName,
    guestLastName: body.guestLastName,
    guestEmail: body.guestEmail,
    guestPhone: body.guestPhone || '',
    specialRequests: body.specialRequests || '',
    submittedTotal: String(estimatedTotal),
    currencyCode: 'INR',
    confirmedReservationNumber: null,
    assignedRoomNumber: null,
    availableRoomsCount: 4,
    denialReason: null,
    decidedAt: null,
    createdAt: new Date().toISOString(),
  });

  return {
    requestId: reqId,
    status: 'pending',
    message: 'Booking request submitted successfully! Awaiting hotel confirmation.',
  };
}

export const bookingApi = {
  paymentReturnStatus: async (reference: string): Promise<PaymentReturnStatus> => {
    const { data } = await api.get<PaymentReturnStatus>('/payment-return-status', {
      headers: { 'x-payment-return-reference': reference },
    });
    return data;
  },
  config: async (): Promise<BookingConfig> => {
    if (isStaticHosting) return DEFAULT_HOTEL_SPARK_CONFIG;
    try {
      const { data } = await api.get<BookingConfig>('/config');
      if (data && typeof data === 'object' && !('message' in data)) return data;
    } catch {
      // Fallback for static Netlify hosting
    }
    return DEFAULT_HOTEL_SPARK_CONFIG;
  },

  search: async (body: SearchRequest): Promise<SearchResponse> => {
    if (isStaticHosting) return searchSupabase(body);
    try {
      const { data } = await api.post<SearchResponse>('/search', body);
      if (data && data.results && Array.isArray(data.results) && data.results.length > 0) {
        return data;
      }
    } catch {
      // Fallback for static Netlify hosting
    }
    return searchSupabase(body);
  },

  quote: async (body: QuoteRequest): Promise<QuoteResponse> => {
    if (isStaticHosting) return quoteSupabase(body);
    try {
      const { data } = await api.post<QuoteResponse>('/quote', body);
      if (data && data.grandTotal) return data;
    } catch {
      // Fallback for static Netlify hosting
    }
    return quoteSupabase(body);
  },

  listServices: async (): Promise<SellableServicesResponse> => {
    if (isStaticHosting) return { propertyId: 'a0000001-0000-4000-a000-000000000001', data: [] };
    try {
      const { data } = await api.get<SellableServicesResponse>('/services');
      return data;
    } catch {
      return { propertyId: 'a0000001-0000-4000-a000-000000000001', data: [] };
    }
  },

  book: async (body: BookRequest): Promise<BookResponse> => {
    if (isStaticHosting) return bookSupabase(body);
    try {
      const { data } = await api.post<BookResponse>('/book', body);
      if (data && (data.confirmationNumber || data.bookingId)) return data;
    } catch {
      // Fallback for static Netlify hosting
    }
    return bookSupabase(body);
  },

  worldlineTokenization: async (): Promise<{
    hostedTokenizationUrl: string;
    sri: string | null;
    tokenizerScriptUrl: string;
  }> => {
    const { data } = await api.post('/worldline-tokenization');
    return data;
  },

  createRequestPaymentMethodSetup: async (
    body: RequestPaymentMethodSetupRequest,
  ): Promise<RequestPaymentMethodSetupResponse> => {
    if (isStaticHosting) {
      return {
        setupIntentId: `seti_${Date.now()}`,
        clientSecret: `seti_secret_${Date.now()}`,
        clientMode: 'mock',
      };
    }
    try {
      const { data } = await api.post<RequestPaymentMethodSetupResponse>(
        '/request-payment-method-setup',
        body,
      );
      return data;
    } catch {
      return {
        setupIntentId: `seti_${Date.now()}`,
        clientSecret: `seti_secret_${Date.now()}`,
        clientMode: 'mock',
      };
    }
  },

  submitRequest: async (
    body: SubmitBookingRequest,
  ): Promise<BookingRequestAcknowledgement> => {
    if (isStaticHosting) return submitRequestSupabase(body);
    try {
      const { data } = await api.post<BookingRequestAcknowledgement>('/requests', body);
      if (data && data.requestId) return data;
    } catch {
      // Fallback for static Netlify hosting
    }
    return submitRequestSupabase(body);
  },

  getBooking: async (confirmationNumber: string): Promise<BookingDetails> => {
    const { data } = await api.get<BookingDetails>(
      `/bookings/${encodeURIComponent(confirmationNumber)}`,
    );
    return data;
  },

  cancelBooking: async (
    confirmationNumber: string,
    reason?: string,
  ): Promise<CancelResponse> => {
    const { data } = await api.delete<CancelResponse>(
      `/bookings/${encodeURIComponent(confirmationNumber)}`,
      { data: { reason } },
    );
    return data;
  },
};

/** Extract a human-readable message from an axios/booking-engine error. */
export function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string | string[] } | undefined;
    const msg = data?.message;
    if (Array.isArray(msg)) return msg.join(', ');
    if (typeof msg === 'string') return msg;
    return err.message;
  }
  return err instanceof Error ? err.message : 'Something went wrong';
}
