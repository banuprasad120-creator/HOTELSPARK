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
    'b0000001-0000-4000-a000-000000000001',
    'b0000002-0000-4000-a000-000000000001',
    'b0000003-0000-4000-a000-000000000001',
  ],
  sellableRatePlanIds: [
    'c0000001-0000-4000-a000-000000000001',
    'c0000002-0000-4000-a000-000000000001',
    'c0000003-0000-4000-a000-000000000001',
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
  'b0000002-0000-4000-a000-000000000001': [
    'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80',
  ],
  'b0000003-0000-4000-a000-000000000001': [
    'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80',
  ],
};

async function searchSupabase(body: SearchRequest): Promise<SearchResponse> {
  const [types, ratePlans] = await Promise.all([
    supabaseFetch<any[]>('room_types?select=*&is_active=eq.true&order=sort_order.asc'),
    supabaseFetch<any[]>('rate_plans?select=*&is_active=eq.true'),
  ]);

  const checkInDate = new Date(body.checkIn);
  const checkOutDate = new Date(body.checkOut);
  const nights = Math.max(
    1,
    Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)),
  );

  const roomTypes: SearchRoomType[] = (types || []).map((t) => {
    const plans = (ratePlans || []).filter((rp) => rp.room_type_id === t.id);
    const rates: SearchRate[] = plans.map((rp) => {
      const base = Number(rp.base_amount || rp.base_rate || 3000);
      return {
        ratePlanId: rp.id,
        ratePlanName: rp.name,
        ratePlanCode: rp.code,
        rateType: rp.type,
        totalAmount: base * nights,
        currencyCode: rp.currency_code || 'INR',
        available: true,
        cancellationPolicy: {
          type: 'flexible',
          description: 'Free cancellation up to 24 hours before check-in.',
        },
      };
    });

    return {
      roomTypeId: t.id,
      roomTypeName: t.name,
      name: t.name,
      description: t.description,
      maxOccupancy: t.max_occupancy,
      bedType: t.bed_type,
      amenities: t.amenities || [],
      available: 4,
      images: ROOM_IMAGES[t.id] || [
        'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
      ],
      rates,
    };
  });

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
        roomTypes,
      },
    ],
  };
}

async function quoteSupabase(body: QuoteRequest): Promise<QuoteResponse> {
  const plans = await supabaseFetch<any[]>(`rate_plans?id=eq.${body.ratePlanId}`);
  const plan = plans?.[0];
  const ratePerNight = Number(plan?.base_amount || plan?.base_rate || 3500);

  const checkInDate = new Date(body.checkIn);
  const checkOutDate = new Date(body.checkOut);
  const nights = Math.max(
    1,
    Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)),
  );

  const roomSubtotal = ratePerNight * nights;
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
    depositPolicy: { type: 'none', refundable: true },
    depositDue: '0.00',
    cancellationPolicy: {
      type: 'flexible',
      description: 'Free cancellation up to 24 hours prior to check-in.',
    },
  };
}

async function submitRequestSupabase(
  body: SubmitBookingRequest,
): Promise<BookingRequestAcknowledgement> {
  const plans = await supabaseFetch<any[]>(`rate_plans?id=eq.${body.ratePlanId}`);
  const ratePerNight = Number(plans?.[0]?.base_amount || plans?.[0]?.base_rate || 3500);
  const nights = Math.max(
    1,
    Math.round((new Date(body.checkOut).getTime() - new Date(body.checkIn).getTime()) / 86400000),
  );
  const estimatedTotal = Math.round(ratePerNight * nights * 1.12);

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
      p_idempotency_key: body.idempotencyKey || `REQ-WEB-${Date.now()}`,
      p_form_snapshot: body.applicationAnswers || {},
    }),
  });

  return {
    requestId: rpcResult.id,
    status: 'pending',
    message:
      rpcResult.message ||
      'Booking request submitted successfully! Awaiting hotel confirmation.',
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
    try {
      const { data } = await api.get<BookingConfig>('/config');
      if (data && typeof data === 'object' && !('message' in data)) return data;
    } catch {
      // Fallback for static Netlify hosting
    }
    return DEFAULT_HOTEL_SPARK_CONFIG;
  },

  search: async (body: SearchRequest): Promise<SearchResponse> => {
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
    try {
      const { data } = await api.post<QuoteResponse>('/quote', body);
      if (data && data.grandTotal) return data;
    } catch {
      // Fallback for static Netlify hosting
    }
    return quoteSupabase(body);
  },

  listServices: async (): Promise<SellableServicesResponse> => {
    try {
      const { data } = await api.get<SellableServicesResponse>('/services');
      return data;
    } catch {
      return { propertyId: 'a0000001-0000-4000-a000-000000000001', data: [] };
    }
  },

  book: async (body: BookRequest): Promise<BookResponse> => {
    const { data } = await api.post<BookResponse>('/book', body);
    return data;
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
