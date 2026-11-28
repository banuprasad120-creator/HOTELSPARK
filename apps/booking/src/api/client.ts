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
  SellableServicesResponse,
  SubmitBookingRequest,
  BookingRequestAcknowledgement,
  PaymentReturnStatus,
} from './types';

let bookingKey = '';

export function setBookingKey(key: string) {
  bookingKey = key;
  api.defaults.headers.common['x-booking-key'] = key;
}

export function getBookingKey(): string {
  return bookingKey;
}

const DEFAULT_HOTEL_ID = 'a0000001-0000-4000-a000-000000000001';
const origin = (import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '');
const isStaticHosting =
  !origin ||
  (typeof window !== 'undefined' &&
    (window.location.hostname.includes('netlify.app') ||
      window.location.hostname.includes('vercel.app') ||
      window.location.hostname.includes('hotelspark') ||
      window.location.port === '5174' ||
      !window.location.port));

export const api = axios.create({
  baseURL: `${origin}/api/v1/booking-engine`,
  headers: { 'Content-Type': 'application/json' },
});

setBookingKey(resolveBookingKey());

export interface PublicCatalogResponse {
  hotel: {
    id: string;
    name: string;
    code: string;
    description?: string;
    city?: string;
    stateProvince?: string;
    currencyCode?: string;
    phone?: string;
    email?: string;
    settings?: { upi_id?: string; upi_merchant_name?: string };
  };
  settings: {
    bookingMode?: 'request' | 'instant';
    autoConfirm?: boolean;
    requireDeposit?: boolean;
    depositPercentage?: number;
    cancellationPolicy?: string;
    gstPercentage?: number;
    taxInclusive?: boolean;
    extraPersonCharge?: number;
    upiQrString?: string;
    upiPayeeName?: string;
  };
  roomTypes: Array<{
    id: string;
    name: string;
    code: string;
    description?: string;
    maxOccupancy: number;
    defaultOccupancy?: number;
    bedType?: string;
    squareMeters?: number;
    amenities: string[];
    roomCount: number;
    images: string[];
    ratePlans: Array<{
      id: string;
      name: string;
      code: string;
      description?: string;
      baseRate: number;
      singleOccupancyRate?: number | null;
      doubleOccupancyRate?: number | null;
      extraPersonCharge?: number;
      gstPercentage?: number;
      taxInclusive?: boolean;
      currencyCode?: string;
    }>;
  }>;
}

async function fetchPublicCatalogFromSupabase(): Promise<PublicCatalogResponse | null> {
  try {
    const rpcCatalog = await supabaseFetch<PublicCatalogResponse>('rpc/get_public_hotel_catalog', {
      method: 'POST',
      body: JSON.stringify({ p_hotel_id: DEFAULT_HOTEL_ID }),
    });
    if (rpcCatalog && rpcCatalog.hotel) return rpcCatalog;
  } catch {
    // Fallback to direct public catalog tables (properties, room_types, rate_plans, room_images)
  }

  const [props, rts, plans, imgs] = await Promise.all([
    supabaseFetch<any[]>(`properties?id=eq.${DEFAULT_HOTEL_ID}&is_active=eq.true&limit=1`).catch(() => []),
    supabaseFetch<any[]>(`room_types?or=(hotel_id.eq.${DEFAULT_HOTEL_ID},property_id.eq.${DEFAULT_HOTEL_ID})&is_active=eq.true&order=sort_order.asc`).catch(() => []),
    supabaseFetch<any[]>(`rate_plans?or=(hotel_id.eq.${DEFAULT_HOTEL_ID},property_id.eq.${DEFAULT_HOTEL_ID})&is_active=eq.true`).catch(() => []),
    supabaseFetch<any[]>(`room_images?or=(hotel_id.eq.${DEFAULT_HOTEL_ID},property_id.eq.${DEFAULT_HOTEL_ID})&order=is_primary.desc,sort_order.asc`).catch(() => []),
  ]);

  const p = props?.[0];
  if (!p) return null;

  return {
    hotel: {
      id: p.id,
      name: p.name,
      code: p.code,
      description: p.description,
      city: p.city,
      stateProvince: p.state_province,
      currencyCode: p.currency_code || 'INR',
      phone: p.phone,
      email: p.email,
      settings: p.settings || {},
    },
    settings: {
      bookingMode: p.settings?.require_approval === false ? 'instant' : 'request',
      gstPercentage: 5,
      taxInclusive: true,
      extraPersonCharge: 399,
      cancellationPolicy: 'Free cancellation up to 24 hours before check-in.',
    },
    roomTypes: (rts || [])
      .filter((rt) => (plans || []).some((rp) => rp.room_type_id === rt.id))
      .map((rt) => {
        const typePlans = (plans || []).filter((rp) => rp.room_type_id === rt.id);
        const typeImages = (imgs || []).filter((i) => i.room_type_id === rt.id).map((i) => i.url);
        return {
          id: rt.id,
          name: rt.name,
          code: rt.code,
          description: rt.description,
          maxOccupancy: Number(rt.max_occupancy || 2),
          defaultOccupancy: Number(rt.default_occupancy || 2),
          bedType: rt.bed_type || 'queen',
          squareMeters: rt.square_meters,
          amenities: Array.isArray(rt.amenities) ? rt.amenities : [],
          roomCount: 0,
          images: typeImages,
          ratePlans: typePlans.map((rp) => ({
            id: rp.id,
            name: rp.name,
            code: rp.code,
            description: rp.description,
            baseRate: Number(rp.base_rate || rp.base_amount || 0),
            singleOccupancyRate: rp.single_occupancy_rate != null ? Number(rp.single_occupancy_rate) : null,
            doubleOccupancyRate: rp.double_occupancy_rate != null ? Number(rp.double_occupancy_rate) : null,
            extraPersonCharge: Number(rp.extra_person_charge ?? 399),
            gstPercentage: Number(rp.gst_percentage ?? 5),
            taxInclusive: rp.tax_inclusive !== false,
            currencyCode: rp.currency_code || 'INR',
          })),
        };
      }),
  };
}

function pickNightlyRate(
  rp: {
    baseRate: number;
    singleOccupancyRate?: number | null;
    doubleOccupancyRate?: number | null;
  } | undefined,
  adults: number
): number {
  if (!rp) return 0;
  if (adults === 1 && rp.singleOccupancyRate != null) return Number(rp.singleOccupancyRate);
  if (adults >= 2 && rp.doubleOccupancyRate != null) return Number(rp.doubleOccupancyRate);
  return Number(rp.doubleOccupancyRate ?? rp.singleOccupancyRate ?? rp.baseRate ?? 0);
}

async function searchSupabase(body: SearchRequest): Promise<SearchResponse> {
  const catalog = await fetchPublicCatalogFromSupabase();
  if (!catalog) {
    throw new Error('Hotel catalog is unavailable right now.');
  }

  const checkInDate = new Date(body.checkIn);
  const checkOutDate = new Date(body.checkOut);
  const nights = Math.max(
    1,
    Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
  );
  const adults = Number(body.adults) || 1;

  const roomTypes: SearchRoomType[] = (
    await Promise.all(
      catalog.roomTypes.map(async (rt) => {
        let availableCount = rt.roomCount || 0;
        try {
          const avail = await supabaseFetch<any[]>('rpc/revalidate_room_availability', {
            method: 'POST',
            body: JSON.stringify({
              p_hotel_id: catalog.hotel.id,
              p_room_type_id: rt.id,
              p_arrival_date: body.checkIn,
              p_departure_date: body.checkOut,
            }),
          });
          if (Array.isArray(avail)) {
            availableCount = avail.filter((x) => x.is_available).length;
          }
        } catch {
          /* keep catalog count */
        }

        if (availableCount <= 0) return null;

        const rates = rt.ratePlans.map((rp) => {
          const perNight = pickNightlyRate(rp, adults);
          return {
            ratePlanId: rp.id,
            ratePlanName: rp.name,
            ratePlanCode: rp.code,
            rateType: 'bar',
            totalAmount: perNight * nights,
            currencyCode: rp.currencyCode || catalog.hotel.currencyCode || 'INR',
            available: true,
            cancellationPolicy: {
              type: 'flexible',
              description: catalog.settings.cancellationPolicy || 'Free cancellation up to 24 hours before check-in.',
            },
          };
        });

        const item: SearchRoomType = {
          roomTypeId: rt.id,
          roomTypeName: rt.name,
          name: rt.name,
          description: rt.description,
          maxOccupancy: rt.maxOccupancy,
          bedType: rt.bedType,
          amenities: rt.amenities,
          available: availableCount,
          images: rt.images,
          rates,
        };
        return item;
      })
    )
  ).filter((x): x is SearchRoomType => Boolean(x && Array.isArray(x.rates) && x.rates.length > 0));

  return {
    propertyId: catalog.hotel.id,
    checkIn: body.checkIn,
    checkOut: body.checkOut,
    branding: {
      displayName: catalog.hotel.name,
      primaryColor: '#0d9488',
      accentColor: '#0f766e',
    },
    results: [
      {
        sourcePropertyId: catalog.hotel.id,
        propertyName: catalog.hotel.name,
        starRating: 4,
        roomTypes,
      },
    ],
  };
}

async function quoteSupabase(body: QuoteRequest): Promise<QuoteResponse> {
  const catalog = await fetchPublicCatalogFromSupabase();
  if (!catalog) {
    throw new Error('Unable to load hotel pricing from database.');
  }
  const rt = catalog.roomTypes.find((r) => r.id === body.roomTypeId);
  if (!rt) {
    throw new Error('Selected room category not found in database.');
  }
  const rp = rt.ratePlans.find((p) => p.id === body.ratePlanId) || rt.ratePlans[0];
  if (!rp) {
    throw new Error('No active rate plan configured for this room category.');
  }

  const checkInDate = new Date(body.checkIn);
  const checkOutDate = new Date(body.checkOut);
  const nights = Math.max(
    1,
    Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
  );
  const adults = Number(body.adults) || 1;
  const ratePerNight = pickNightlyRate(rp, adults);
  const extraPerNight = Number(rp.extraPersonCharge ?? catalog.settings.extraPersonCharge ?? 0);
  const extraPersons = Math.max(0, adults - (rt.defaultOccupancy || 2));
  const extraCharges = extraPersons * extraPerNight * nights;
  const roomSubtotal = ratePerNight * nights + extraCharges;
  const gstPct = Number(rp.gstPercentage ?? catalog.settings.gstPercentage ?? 5);
  const taxInclusive = rp.taxInclusive ?? catalog.settings.taxInclusive ?? true;

  let taxableBase: number;
  let tax: number;
  let grandTotal: number;

  if (taxInclusive) {
    grandTotal = roomSubtotal;
    taxableBase = Math.round((grandTotal / (1 + gstPct / 100)) * 100) / 100;
    tax = Math.round((grandTotal - taxableBase) * 100) / 100;
  } else {
    taxableBase = roomSubtotal;
    tax = Math.round(taxableBase * (gstPct / 100) * 100) / 100;
    grandTotal = taxableBase + tax;
  }

  const lineItems = Array.from({ length: nights }, (_, i) => {
    const d = new Date(checkInDate.getTime() + i * 86400000);
    return {
      date: d.toISOString().split('T')[0],
      rate: ratePerNight.toFixed(2),
      tax: (tax / nights).toFixed(2),
    };
  });

  return {
    nights,
    currencyCode: rp.currencyCode || catalog.hotel.currencyCode || 'INR',
    lineItems,
    roomTotal: taxableBase.toFixed(2),
    taxTotal: tax.toFixed(2),
    grandTotal: grandTotal.toFixed(2),
    depositPolicy: { type: 'none', refundable: true },
    depositDue: '0.00',
    cancellationPolicy: {
      type: 'flexible',
      description: catalog.settings.cancellationPolicy || 'Free cancellation up to 24 hours before check-in.',
    },
  };
}

async function bookSupabase(body: BookRequest): Promise<BookResponse> {
  const quote = await quoteSupabase({
    roomTypeId: body.roomTypeId,
    ratePlanId: body.ratePlanId,
    checkIn: body.checkIn,
    checkOut: body.checkOut,
    adults: body.adults,
    children: body.children,
  });

  const refCode = `SPARK-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const rpcResult = await supabaseFetch<any>('rpc/submit_website_booking_request', {
    method: 'POST',
    body: JSON.stringify({
      p_hotel_id: DEFAULT_HOTEL_ID,
      p_room_type_id: body.roomTypeId,
      p_arrival_date: body.checkIn,
      p_departure_date: body.checkOut,
      p_guest_first_name: body.guestFirstName,
      p_guest_last_name: body.guestLastName,
      p_guest_email: body.guestEmail,
      p_guest_phone: body.guestPhone || '',
      p_submitted_total: Number(quote.grandTotal),
      p_adults: body.adults,
      p_children: body.children || 0,
      p_special_requests: body.specialRequests || '',
      p_currency_code: quote.currencyCode,
      p_idempotency_key: refCode,
      p_form_snapshot: {
        paymentToken: body.paymentToken,
        cardBrand: body.cardBrand,
        cardLastFour: body.cardLastFour,
        serviceIds: body.serviceIds,
      },
    }),
  });

  const reservationId = rpcResult?.id || refCode;

  return {
    success: true,
    confirmationNumber: rpcResult?.reference || refCode,
    reference: rpcResult?.reference || refCode,
    reservationId,
    bookingId: reservationId,
    isPendingApproval: true,
    status: 'pending_approval',
    message: rpcResult?.message || 'Booking request submitted successfully! Awaiting hotel front desk confirmation.',
    currencyCode: quote.currencyCode,
    grandTotal: quote.grandTotal,
    lineItems: quote.lineItems,
    deposit: null,
    cancellationPolicy: quote.cancellationPolicy?.description || '',
  };
}

async function submitRequestSupabase(body: SubmitBookingRequest): Promise<BookingRequestAcknowledgement> {
  const quote = await quoteSupabase({
    roomTypeId: body.roomTypeId,
    ratePlanId: body.ratePlanId,
    checkIn: body.checkIn,
    checkOut: body.checkOut,
    adults: body.adults,
    children: body.children,
  });

  const idempotencyKey = body.idempotencyKey || `REQ-${Date.now()}`;
  const rpcResult = await supabaseFetch<any>('rpc/submit_website_booking_request', {
    method: 'POST',
    body: JSON.stringify({
      p_hotel_id: DEFAULT_HOTEL_ID,
      p_room_type_id: body.roomTypeId,
      p_arrival_date: body.checkIn,
      p_departure_date: body.checkOut,
      p_guest_first_name: body.guestFirstName,
      p_guest_last_name: body.guestLastName,
      p_guest_email: body.guestEmail,
      p_guest_phone: body.guestPhone || '',
      p_submitted_total: Number(quote.grandTotal),
      p_adults: body.adults,
      p_children: body.children || 0,
      p_special_requests: body.specialRequests || '',
      p_currency_code: quote.currencyCode,
      p_idempotency_key: idempotencyKey,
      p_form_snapshot: body.applicationAnswers || {},
    }),
  });

  if (rpcResult?.success !== true || typeof rpcResult.id !== 'string' || !rpcResult.id.trim()) {
    throw new Error('Booking request was not confirmed by the hotel database. Please retry using the same booking details.');
  }
  return {
    requestId: rpcResult.id,
    status: 'pending',
    message: rpcResult?.message || 'Booking request submitted successfully! Awaiting hotel confirmation.',
  };
}

export const bookingApi = {
  getPublicCatalog: fetchPublicCatalogFromSupabase,

  paymentReturnStatus: async (reference: string): Promise<PaymentReturnStatus> => {
    const { data } = await api.get<PaymentReturnStatus>('/payment-return-status', {
      headers: { 'x-payment-return-reference': reference },
    });
    return data;
  },

  config: async (): Promise<BookingConfig> => {
    if (!isStaticHosting) {
      try {
        const { data } = await api.get<BookingConfig>('/config');
        if (data && typeof data === 'object' && !('message' in data)) return data;
      } catch {
        /* use public Supabase catalog */
      }
    }
    const catalog = await fetchPublicCatalogFromSupabase();
    if (!catalog) {
      throw new Error('Hotel configuration not found in Supabase.');
    }
    return {
      propertyId: catalog.hotel.id,
      isEnabled: true,
      displayName: catalog.hotel.name,
      primaryColor: '#0d9488',
      accentColor: '#0f766e',
      depositPolicy: { type: 'none', refundable: true },
      sellableRoomTypeIds: catalog.roomTypes.map((r) => r.id),
      sellableRatePlanIds: catalog.roomTypes.flatMap((r) => r.ratePlans.map((p) => p.id)),
      bookingMode: catalog.settings.bookingMode || 'request',
      paymentMethodCollection: 'optional',
      paymentMethodClientMode: 'unsupported',
      formQuestions: [],
    };
  },

  search: async (body: SearchRequest): Promise<SearchResponse> => {
    if (!isStaticHosting) {
      const { data } = await api.post<SearchResponse>('/search', body);
      return data;
    }
    return searchSupabase(body);
  },

  quote: async (body: QuoteRequest): Promise<QuoteResponse> => {
    if (!isStaticHosting) {
      const { data } = await api.post<QuoteResponse>('/quote', body);
      return data;
    }
    return quoteSupabase(body);
  },

  listServices: async (): Promise<SellableServicesResponse> => {
    if (isStaticHosting) return { propertyId: DEFAULT_HOTEL_ID, data: [] };
    const { data } = await api.get<SellableServicesResponse>('/services');
    return data;
  },

  book: async (body: BookRequest): Promise<BookResponse> => {
    if (!isStaticHosting) {
      const { data } = await api.post<BookResponse>('/book', body);
      return data;
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
    body: RequestPaymentMethodSetupRequest
  ): Promise<RequestPaymentMethodSetupResponse> => {
    if (isStaticHosting) {
      throw new Error('Online card setup requires configuring Stripe/Redsys/Worldline gateway on the API server.');
    }
    const { data } = await api.post<RequestPaymentMethodSetupResponse>('/request-payment-method-setup', body);
    return data;
  },

  submitRequest: async (body: SubmitBookingRequest): Promise<BookingRequestAcknowledgement> => {
    if (!isStaticHosting) {
      const { data } = await api.post<BookingRequestAcknowledgement>('/requests', body);
      return data;
    }
    return submitRequestSupabase(body);
  },

  getBooking: async (confirmationNumber: string, emailOrPhone?: string): Promise<BookingDetails> => {
    if (!isStaticHosting) {
      const { data } = await api.get<BookingDetails>(`/bookings/${encodeURIComponent(confirmationNumber)}`);
      return data;
    }
    const identifier = (emailOrPhone || '').trim();
    if (!identifier) {
      throw new Error('Guest email or mobile number is required to look up booking details.');
    }
    // 1. Try standard public RPC first
    const res = await supabaseFetch<any>('rpc/get_public_booking_status', {
      method: 'POST',
      body: JSON.stringify({ p_reference: confirmationNumber.trim(), p_email: identifier.toLowerCase() }),
    }).catch(() => null);

    if (res && typeof res === 'object' && res.status) {
      return res;
    }

    // 2. Direct fallback for Hotel Spark booking requests by idempotency key or reference with email or phone
    const cleanId = encodeURIComponent(confirmationNumber.trim());
    const cleanContact = encodeURIComponent(identifier);
    const reqs = await supabaseFetch<any[]>(
      `/booking_requests?submission_idempotency_key=eq.${cleanId}&or=(guest_email.eq.${cleanContact},guest_phone.eq.${cleanContact})&limit=1`
    ).catch(() => []);

    const match = reqs?.[0];
    if (match) {
      return {
        confirmationNumber: match.submission_idempotency_key,
        guestName: `${match.guest_first_name} ${match.guest_last_name}`.trim(),
        status: match.status === 'accepted' ? 'confirmed' : match.status === 'denied' ? 'cancelled' : 'pending',
        roomType: 'Deluxe Room',
        checkIn: match.arrival_date,
        checkOut: match.departure_date,
        rateAmount: Number(match.submitted_total || 0),
        currencyCode: match.currency_code || 'INR',
        folioBalance: 0,
      };
    }

    throw new Error('Booking not found for that confirmation number and mobile number / email.');
  },

  cancelBooking: async (confirmationNumber: string, reason?: string): Promise<CancelResponse> => {
    const { data } = await api.delete<CancelResponse>(
      `/bookings/${encodeURIComponent(confirmationNumber)}`,
      { data: { reason } }
    );
    return data;
  },
};

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
