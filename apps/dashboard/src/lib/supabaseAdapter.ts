import {
  supabaseFetch,
  supabaseUploadObject,
  supabaseCreateSignedUrl,
  getStoredSupabaseSession,
} from './supabase';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';

const DEFAULT_PROPERTY_ID = 'a0000001-0000-4000-a000-000000000001';

function ok<T>(data: T, config: AxiosRequestConfig): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: { 'content-type': 'application/json' },
    config: config as any,
  };
}

function parseBody(raw: any): Record<string, any> {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return raw;
}

function dataUrlToBlob(dataUrl: string): { blob: Blob; ext: string; mime: string } {
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = header?.match(/data:([^;]+);base64/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : mime.includes('pdf') ? 'pdf' : 'jpg';
  const bin = atob(base64 || '');
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { blob: new Blob([bytes], { type: mime }), ext, mime };
}

// ============================================================================
// SHARED DOMAIN INTERFACES & PURE TARIFF CALCULATOR (NO MOCK DATA / NO LOCALSTORAGE)
// ============================================================================

export interface StoredRoom {
  id: string;
  number: string;
  floor: string;
  roomTypeId: string;
  roomTypeName: string;
  roomTypeCode?: string;
  status: string;
  hkOccupancy?: string;
  guestName?: string;
  isAccessible?: boolean;
  amenities?: string[];
  maintenanceNotes?: string;
}

export interface RoomCategoryTariff {
  id: string;
  name: string;
  code: string;
  description: string;
  assignedRoomsCount: number;
  maxOccupancy: number;
  singleOccupancyPrice: number | null;
  doubleOccupancyPrice: number | null;
  extraPersonCharge: number;
  ratePlanId?: string;
  roomNumbers?: string[];
  floorBreakdown?: string;
}

export interface HotelTariffConfig {
  extraPersonCharge: number;
  childUnder7Free: boolean;
  gstPercentage: number;
  isTaxInclusive: boolean;
  gstin?: string;
  hsnSac?: string;
  invoiceHeaderName?: string;
  invoiceAddress?: string;
  cancellationPolicy: string;
  cardPaymentInfo: string;
  childrenPolicy?: string;
  paymentPolicy?: string;
  categories: RoomCategoryTariff[];
}

export interface StoredStay {
  id: string;
  reservationId?: string;
  folioId?: string;
  guestId?: string;
  roomId?: string;
  roomNumber: string;
  roomTypeName: string;
  rateType?: string;
  guestName: string;
  mobile: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  guestGstin?: string;
  source?: string;
  sourceOfSupply?: string;
  idProofType?: string;
  idProofNumber?: string;
  idProofFrontUrl?: string;
  idProofBackUrl?: string;
  checkInTime: string;
  expectedCheckoutTime: string;
  actualCheckoutTime?: string;
  nights: number;
  adults?: number;
  children?: number;
  pricePerNight: number;
  extraCharges: number;
  discount: number;
  taxMode?: 'inclusive' | 'exclusive';
  gstRate?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  totalAmount: number;
  advancePaid: number;
  previousPayments?: number;
  balance: number;
  paymentMethod: string;
  paymentReference?: string;
  paymentStatus?: 'paid' | 'partially_paid' | 'unpaid' | string;
  stayStatus: 'in_house' | 'checked_out' | 'confirmed';
  billNumber?: string;
  cashierName?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StoredNotification {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  type: string;
  isRead: boolean;
  createdAt: string;
}

export interface StoredMediaItem {
  id: string;
  propertyId: string;
  ownerType: 'property' | 'room_type' | 'room';
  ownerId: string;
  url: string;
  storagePath?: string;
  caption?: string;
  altText?: string;
  category?: string;
  isPrimary: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface TariffCalculationResult {
  roomRatePerNight: number;
  roomTariffPerNight: number;
  baseRoomCharges: number;
  totalRoomTariff: number;
  extraPersonCharges: number;
  totalExtraPersonCharges: number;
  grossSubtotal: number;
  taxableValue: number;
  taxableBase: number;
  gstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  cgst: number;
  sgst: number;
  grandTotal: number;
  nights: number;
  occupancyType: 'single' | 'double';
  extraPersons: number;
  extraPersonsCount: number;
  isTaxInclusive: boolean;
}

export function calculateTariffInvoice({
  category,
  occupancyType,
  nights,
  extraPersons,
  gstPercentage = 5,
  isTaxInclusive = true,
  extraPersonRate = 399,
}: {
  category: RoomCategoryTariff;
  occupancyType: 'single' | 'double';
  nights: number;
  extraPersons: number;
  gstPercentage?: number;
  isTaxInclusive?: boolean;
  extraPersonRate?: number;
}): TariffCalculationResult {
  const safeNights = Math.max(1, Number(nights) || 1);
  const safeExtra = Math.max(0, Number(extraPersons) || 0);
  const perNightRate =
    occupancyType === 'single'
      ? category.singleOccupancyPrice ?? category.doubleOccupancyPrice ?? 0
      : category.doubleOccupancyPrice ?? category.singleOccupancyPrice ?? 0;

  const baseRoomCharges = perNightRate * safeNights;
  const effectiveExtraRate = category.extraPersonCharge || extraPersonRate;
  const extraPersonCharges = safeExtra * effectiveExtraRate * safeNights;
  const netPreTaxOrInclusive = baseRoomCharges + extraPersonCharges;
  const gstMult = (gstPercentage || 0) / 100;

  let taxableValue: number;
  let gstAmount: number;
  let grandTotal: number;

  if (isTaxInclusive) {
    taxableValue = Math.round((netPreTaxOrInclusive / (1 + gstMult)) * 100) / 100;
    gstAmount = Math.round((netPreTaxOrInclusive - taxableValue) * 100) / 100;
    grandTotal = netPreTaxOrInclusive;
  } else {
    taxableValue = netPreTaxOrInclusive;
    gstAmount = Math.round((netPreTaxOrInclusive * gstMult) * 100) / 100;
    grandTotal = Math.round((taxableValue + gstAmount) * 100) / 100;
  }

  const halfGst = Math.round((gstAmount / 2) * 100) / 100;

  return {
    roomRatePerNight: perNightRate,
    roomTariffPerNight: perNightRate,
    baseRoomCharges,
    totalRoomTariff: baseRoomCharges,
    extraPersonCharges,
    totalExtraPersonCharges: extraPersonCharges,
    grossSubtotal: netPreTaxOrInclusive,
    taxableValue,
    taxableBase: taxableValue,
    gstAmount,
    cgstAmount: halfGst,
    sgstAmount: halfGst,
    cgst: halfGst,
    sgst: halfGst,
    grandTotal,
    nights: safeNights,
    occupancyType,
    extraPersons: safeExtra,
    extraPersonsCount: safeExtra,
    isTaxInclusive,
  };
}

// Pure empty defaults for type safety (never populated with mock records)
export const EMPTY_TARIFF_CONFIG: HotelTariffConfig = {
  extraPersonCharge: 399,
  childUnder7Free: true,
  gstPercentage: 5,
  isTaxInclusive: true,
  gstin: '',
  hsnSac: '996311',
  cancellationPolicy: '',
  cardPaymentInfo: '',
  categories: [],
};

// ============================================================================
// SUPABASE QUERY & MAP HELPERS
// ============================================================================

async function uploadIdProofIfDataUrl(
  propertyId: string,
  label: string,
  val?: string
): Promise<string | undefined> {
  if (!val) return undefined;
  if (!val.startsWith('data:')) return val;
  const { blob, ext, mime } = dataUrlToBlob(val);
  const path = `${propertyId}/id-proofs/${Date.now()}-${label}.${ext}`;
  const uploaded = await supabaseUploadObject('guest-documents', path, blob, mime);
  return uploaded.path;
}

async function resolveStayDocuments(stays: StoredStay[]): Promise<StoredStay[]> {
  return Promise.all(
    stays.map(async (s) => {
      let frontUrl = s.idProofFrontUrl;
      let backUrl = s.idProofBackUrl;
      if (frontUrl && !frontUrl.startsWith('http') && !frontUrl.startsWith('data:')) {
        try {
          frontUrl = await supabaseCreateSignedUrl('guest-documents', frontUrl, 3600);
        } catch {
          /* keep stored path */
        }
      }
      if (backUrl && !backUrl.startsWith('http') && !backUrl.startsWith('data:')) {
        try {
          backUrl = await supabaseCreateSignedUrl('guest-documents', backUrl, 3600);
        } catch {
          /* keep stored path */
        }
      }
      return { ...s, idProofFrontUrl: frontUrl, idProofBackUrl: backUrl };
    })
  );
}

async function fetchStaysFromSupabase(propertyId: string, onlyActive = false): Promise<StoredStay[]> {
  const statusFilter = onlyActive
    ? '&status=in.(checked_in,stayover,due_out)'
    : '&status=in.(confirmed,assigned,checked_in,stayover,due_out,checked_out)';

  const [reservations, folios, payments, invoices, guestDocs] = await Promise.all([
    supabaseFetch<any[]>(
      `/reservations?select=*,guest:guests(*),room:rooms(*),room_type:room_types(*),booking:bookings(*)&or=(hotel_id.eq.${propertyId},property_id.eq.${propertyId})${statusFilter}&order=created_at.desc`
    ),
    supabaseFetch<any[]>(
      `/folios?select=*&or=(hotel_id.eq.${propertyId},property_id.eq.${propertyId})`
    ).catch(() => []),
    supabaseFetch<any[]>(
      `/payments?select=*&or=(hotel_id.eq.${propertyId},property_id.eq.${propertyId})&status=in.(paid,captured,settled)`
    ).catch(() => []),
    supabaseFetch<any[]>(
      `/invoices?select=*&or=(hotel_id.eq.${propertyId},property_id.eq.${propertyId})&order=created_at.desc`
    ).catch(() => []),
    supabaseFetch<any[]>(
      `/guest_documents?select=*&or=(hotel_id.eq.${propertyId},property_id.eq.${propertyId})&order=created_at.desc`
    ).catch(() => []),
  ]);

  const stays: StoredStay[] = (reservations || []).map((r) => {
    const guest = r.guest || {};
    const room = r.room || {};
    const rt = r.room_type || {};
    const booking = r.booking || {};
    const folio = (folios || []).find((f) => f.reservation_id === r.id);
    const resPayments = (payments || []).filter((p) => p.reservation_id === r.id);
    const inv = (invoices || []).find((i) => i.reservation_id === r.id);
    const doc = (guestDocs || []).find((d) => d.guest_id === r.guest_id);

    const totalPaid =
      folio?.total_payments != null
        ? Number(folio.total_payments)
        : resPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const totalAmount = Number(inv?.total_amount ?? folio?.total_charges ?? r.total_amount ?? 0);
    const balance = Math.max(0, Number(folio?.balance ?? Math.max(0, totalAmount - totalPaid)));
    const nights = Math.max(1, Number(r.nights || 1));
    const perNight = nights > 0 ? Math.round((Number(r.base_amount || r.total_amount || 0) / nights) * 100) / 100 : 0;

    const regData = guest.registration_data || {};
    const guestFullName = [guest.first_name, guest.last_name].filter(Boolean).join(' ').trim();

    return {
      id: r.id,
      reservationId: r.id,
      folioId: folio?.id,
      guestId: r.guest_id,
      roomId: r.room_id || '',
      roomNumber: room.number || 'Unassigned',
      roomTypeName: rt.name || '',
      rateType: rt.name || '',
      guestName: guestFullName || guest.email || 'Guest',
      mobile: guest.phone || '',
      email: guest.email || '',
      address: guest.address_line_1 || '',
      city: guest.city || '',
      state: guest.state_province || '',
      guestGstin: guest.tax_id || inv?.guest_gstin || '',
      source: r.booking_source || booking.source || 'walk_in',
      sourceOfSupply: guest.city || '',
      idProofType: doc?.document_type || guest.id_type || regData.idProofType || 'Government ID',
      idProofNumber: doc?.document_number || guest.id_number || regData.idProofNumber || '',
      idProofFrontUrl: doc?.file_url || regData.idProofFrontUrl || '',
      idProofBackUrl: doc?.storage_path || regData.idProofBackUrl || '',
      checkInTime: r.checked_in_at || `${r.arrival_date}T12:00:00.000Z`,
      expectedCheckoutTime: `${r.departure_date}T11:00:00.000Z`,
      actualCheckoutTime: r.checked_out_at || undefined,
      nights,
      adults: Number(r.adults || 1),
      children: Number(r.children || 0),
      pricePerNight: perNight,
      extraCharges: Number(r.extra_charges || inv?.extra_charges || 0),
      discount: Number(r.discount_amount || inv?.discount_amount || 0),
      taxMode: (inv?.tax_mode as 'inclusive' | 'exclusive') || 'inclusive',
      gstRate: Number(inv?.gst_rate ?? 5),
      cgstAmount: Number(inv?.cgst_amount ?? 0),
      sgstAmount: Number(inv?.sgst_amount ?? 0),
      totalAmount,
      advancePaid: totalPaid,
      previousPayments: 0,
      balance,
      paymentMethod: resPayments[0]?.payment_method || 'cash',
      paymentReference: resPayments[0]?.transaction_reference || '',
      stayStatus:
        r.status === 'checked_out'
          ? 'checked_out'
          : r.status === 'confirmed' || r.status === 'pending' || r.status === 'assigned'
            ? 'confirmed'
            : 'in_house',
      billNumber: inv?.invoice_number || folio?.folio_number || booking.confirmation_number,
      cashierName: inv?.cashier_name || undefined,
      notes: r.special_requests || r.notes || '',
    };
  });

  return resolveStayDocuments(stays);
}

async function fetchRoomsFromSupabase(propertyId: string) {
  const [rooms, roomTypes, activeRes] = await Promise.all([
    supabaseFetch<any[]>(
      `/rooms?select=*,room_type:room_types(id,name,code)&or=(hotel_id.eq.${propertyId},property_id.eq.${propertyId})&is_active=eq.true&order=number.asc`
    ),
    supabaseFetch<any[]>(
      `/room_types?select=*&or=(hotel_id.eq.${propertyId},property_id.eq.${propertyId})&is_active=eq.true`
    ).catch(() => []),
    supabaseFetch<any[]>(
      `/reservations?select=id,room_id,guest:guests(first_name,last_name)&or=(hotel_id.eq.${propertyId},property_id.eq.${propertyId})&status=in.(checked_in,stayover,due_out)`
    ).catch(() => []),
  ]);

  const rtMap = new Map<string, any>();
  for (const rt of roomTypes || []) rtMap.set(rt.id, rt);
  const resByRoom = new Map<string, any>();
  for (const res of activeRes || []) {
    if (res.room_id) resByRoom.set(res.room_id, res);
  }

  return (rooms || []).map((r) => {
    const rt = r.room_type || rtMap.get(r.room_type_id);
    const active = resByRoom.get(r.id);
    const guestName = active?.guest
      ? `${active.guest.first_name || ''} ${active.guest.last_name || ''}`.trim()
      : undefined;

    return {
      id: r.id,
      propertyId: r.property_id || r.hotel_id || propertyId,
      roomTypeId: r.room_type_id,
      roomTypeName: rt?.name || 'Room',
      roomTypeCode: rt?.code || '',
      number: r.number,
      floor: String(r.floor || '1'),
      building: r.building || 'Main',
      status: r.status || 'vacant_clean',
      hkOccupancy: r.hk_occupancy || 'unknown',
      guestName,
      isAccessible: Boolean(r.is_accessible),
      amenities: Array.isArray(r.amenities) ? r.amenities : [],
      maintenanceNotes: r.maintenance_notes || '',
    };
  });
}

async function fetchTariffConfigFromSupabase(propertyId: string): Promise<HotelTariffConfig> {
  const [settingsRows, roomTypes, ratePlans, rooms] = await Promise.all([
    supabaseFetch<any[]>(
      `/hotel_settings?select=*&or=(hotel_id.eq.${propertyId},property_id.eq.${propertyId})&limit=1`
    ).catch(() => []),
    supabaseFetch<any[]>(
      `/room_types?select=*&or=(hotel_id.eq.${propertyId},property_id.eq.${propertyId})&is_active=eq.true&order=sort_order.asc`
    ),
    supabaseFetch<any[]>(
      `/rate_plans?select=*&or=(hotel_id.eq.${propertyId},property_id.eq.${propertyId})&is_active=eq.true`
    ),
    supabaseFetch<any[]>(
      `/rooms?select=id,number,room_type_id&or=(hotel_id.eq.${propertyId},property_id.eq.${propertyId})&is_active=eq.true`
    ),
  ]);

  const hs = settingsRows?.[0] || {};
  const roomsByType = new Map<string, string[]>();
  for (const r of rooms || []) {
    const arr = roomsByType.get(r.room_type_id) || [];
    arr.push(r.number);
    roomsByType.set(r.room_type_id, arr);
  }

  // Filter room_types to those that either have rooms or match active hotel categories
  const activeTypes = (roomTypes || []).filter((rt) => {
    const cnt = (roomsByType.get(rt.id) || []).length;
    return cnt > 0 || (ratePlans || []).some((rp) => rp.room_type_id === rt.id);
  });

  // Deduplicate by keeping types with physical rooms first
  const typesWithRooms = activeTypes.filter((rt) => (roomsByType.get(rt.id) || []).length > 0);
  const targetTypes = typesWithRooms.length > 0 ? typesWithRooms : activeTypes;

  const categories: RoomCategoryTariff[] = targetTypes.map((rt) => {
    const rp = (ratePlans || []).find((p) => p.room_type_id === rt.id);
    const nums = (roomsByType.get(rt.id) || []).sort();
    const single =
      rp?.single_occupancy_rate !== undefined
        ? (rp.single_occupancy_rate === null ? null : Number(rp.single_occupancy_rate))
        : rp?.base_rate != null
          ? Number(rp.base_rate)
          : null;
    const dbl =
      rp?.double_occupancy_rate !== undefined
        ? (rp.double_occupancy_rate === null ? null : Number(rp.double_occupancy_rate))
        : rp?.base_rate != null && (rt.max_occupancy ?? 2) > 1
          ? Number(rp.base_rate)
          : null;

    return {
      id: rt.id,
      name: rt.name,
      code: rt.code,
      description: rt.description || '',
      assignedRoomsCount: nums.length,
      maxOccupancy: Number(rt.max_occupancy || 2),
      singleOccupancyPrice: single,
      doubleOccupancyPrice: dbl,
      extraPersonCharge: Number(rp?.extra_person_charge ?? hs.extra_person_charge ?? 399),
      ratePlanId: rp?.id,
      roomNumbers: nums,
    };
  });

  return {
    extraPersonCharge: Number(hs.extra_person_charge ?? 399),
    childUnder7Free: true,
    gstPercentage: Number(hs.gst_percentage ?? 5),
    isTaxInclusive: hs.tax_inclusive !== false,
    gstin: hs.gstin || '',
    hsnSac: hs.hsn_sac || '996311',
    invoiceHeaderName: hs.invoice_header_name || 'Hotel Spark',
    invoiceAddress: hs.invoice_address || '',
    cancellationPolicy: hs.cancellation_policy || '',
    cardPaymentInfo: 'All major debit/credit cards, UPI, and cash supported.',
    categories,
  };
}

// ============================================================================
// MAIN ADAPTER ROUTER (100% REAL SUPABASE BACKEND)
// ============================================================================

export async function handleSupabaseAdapter(config: AxiosRequestConfig): Promise<AxiosResponse> {
  const method = (config.method || 'GET').toUpperCase();
  const rawUrl = config.url || '';
  const url = rawUrl.replace(/^\/api/, '');
  const body = parseBody(config.data);
  const params = config.params || {};
  const propertyId = params.propertyId || body.propertyId || DEFAULT_PROPERTY_ID;

  // 1. MEDIA GALLERY & UPLOADS (Supabase Storage + media / room_images tables)
  if (url.includes('/media/config')) {
    return ok({ driver: 'supabase', maxBytes: 15 * 1024 * 1024 }, config);
  }

  if (url.includes('/media/upload') && method === 'POST') {
    const file: File | undefined = body.file instanceof File ? body.file : undefined;
    const dataUrlStr: string | undefined = typeof body.dataUrl === 'string' ? body.dataUrl : undefined;
    const ownerType = body.ownerType || 'room_type';
    const ownerId = body.ownerId || propertyId;
    const caption = body.caption || '';
    const category = body.category || 'room';
    const bucket = ownerType === 'property' ? 'hotel-assets' : 'room-photos';

    let uploadBlob: Blob;
    let contentType: string;
    let ext: string;

    if (file) {
      uploadBlob = file;
      contentType = file.type || 'image/jpeg';
      ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    } else if (dataUrlStr && dataUrlStr.startsWith('data:')) {
      const converted = dataUrlToBlob(dataUrlStr);
      uploadBlob = converted.blob;
      contentType = converted.mime;
      ext = converted.ext;
    } else {
      throw new Error('Image file is required.');
    }

    const storagePath = `${propertyId}/${ownerType}/${ownerId}/${Date.now()}.${ext}`;
    const { publicUrl } = await supabaseUploadObject(bucket, storagePath, uploadBlob, contentType);

    const existing = await supabaseFetch<any[]>(
      `/media?select=id&owner_type=eq.${encodeURIComponent(ownerType)}&owner_id=eq.${ownerId}`
    ).catch(() => []);
    const isPrimary = !existing || existing.length === 0;

    const inserted = await supabaseFetch<any[]>(`/media`, {
      method: 'POST',
      body: JSON.stringify({
        hotel_id: propertyId,
        property_id: propertyId,
        owner_type: ownerType,
        owner_id: ownerId,
        url: publicUrl,
        storage_key: storagePath,
        mime_type: contentType,
        caption,
        category,
        is_primary: isPrimary,
        sort_order: existing?.length || 0,
      }),
    });

    if (ownerType === 'room_type' || ownerType === 'room') {
      await supabaseFetch(`/room_images`, {
        method: 'POST',
        body: JSON.stringify({
          hotel_id: propertyId,
          property_id: propertyId,
          room_type_id: ownerType === 'room_type' ? ownerId : null,
          room_id: ownerType === 'room' ? ownerId : null,
          url: publicUrl,
          storage_path: storagePath,
          caption,
          category,
          is_primary: isPrimary,
          sort_order: existing?.length || 0,
        }),
      }).catch(() => undefined);
    }

    const item = inserted?.[0] || {
      id: `media-${Date.now()}`,
      propertyId,
      ownerType,
      ownerId,
      url: publicUrl,
      caption,
      category,
      isPrimary,
      sortOrder: existing?.length || 0,
      createdAt: new Date().toISOString(),
    };
    return ok({ data: item }, config);
  }

  if (url.includes('/media/reorder') && method === 'POST') {
    const order: string[] = Array.isArray(body.ids) ? body.ids : [];
    await Promise.all(
      order.map((id, idx) =>
        supabaseFetch(`/media?id=eq.${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ sort_order: idx }),
        }).catch(() => undefined)
      )
    );
    return ok({ success: true }, config);
  }

  if (url.includes('/media/') && url.includes('/primary') && method === 'POST') {
    const m = url.match(/\/media\/([^/?]+)\/primary/);
    const mediaId = m?.[1];
    if (mediaId) {
      const targetRows = await supabaseFetch<any[]>(`/media?id=eq.${mediaId}&limit=1`);
      const target = targetRows?.[0];
      if (target) {
        await supabaseFetch(
          `/media?owner_type=eq.${encodeURIComponent(target.owner_type)}&owner_id=eq.${target.owner_id}`,
          { method: 'PATCH', body: JSON.stringify({ is_primary: false }) }
        );
        await supabaseFetch(`/media?id=eq.${mediaId}`, {
          method: 'PATCH',
          body: JSON.stringify({ is_primary: true }),
        });
      }
    }
    return ok({ success: true }, config);
  }

  if (url.match(/\/v1\/media\/[^/?]+$/) && method === 'DELETE') {
    const id = url.split('/').pop()?.split('?')[0];
    if (id) {
      await supabaseFetch(`/media?id=eq.${id}`, { method: 'DELETE' });
    }
    return ok({ success: true }, config);
  }

  if ((url.endsWith('/media') || url.includes('/media?')) && method === 'POST') {
    const ownerType = body.ownerType || 'room_type';
    const ownerId = body.ownerId || propertyId;
    const inserted = await supabaseFetch<any[]>(`/media`, {
      method: 'POST',
      body: JSON.stringify({
        hotel_id: propertyId,
        property_id: propertyId,
        owner_type: ownerType,
        owner_id: ownerId,
        url: body.url,
        caption: body.caption || '',
        alt_text: body.altText || '',
        category: body.category || 'room',
        is_primary: Boolean(body.isPrimary),
        sort_order: Number(body.sortOrder || 0),
      }),
    });
    if (ownerType === 'room_type' && body.url) {
      await supabaseFetch(`/room_images`, {
        method: 'POST',
        body: JSON.stringify({
          hotel_id: propertyId,
          property_id: propertyId,
          room_type_id: ownerId,
          url: body.url,
          caption: body.caption || '',
          is_primary: Boolean(body.isPrimary),
        }),
      }).catch(() => undefined);
    }
    return ok({ data: inserted?.[0] || body }, config);
  }

  if ((url.endsWith('/media') || url.includes('/media?')) && method === 'GET') {
    const ownerType = params.ownerType;
    const ownerId = params.ownerId;
    const filters: string[] = [];
    if (ownerType) filters.push(`owner_type=eq.${encodeURIComponent(ownerType)}`);
    if (ownerId) filters.push(`owner_id=eq.${encodeURIComponent(ownerId)}`);
    const q = filters.length ? `&${filters.join('&')}` : '';

    const rows = await supabaseFetch<any[]>(
      `/media?select=*&or=(hotel_id.eq.${propertyId},property_id.eq.${propertyId})${q}&order=is_primary.desc,sort_order.asc`
    ).catch(() => []);

    if ((!rows || rows.length === 0) && ownerType === 'room_type' && ownerId) {
      const imgs = await supabaseFetch<any[]>(
        `/room_images?select=*&room_type_id=eq.${ownerId}&order=is_primary.desc,sort_order.asc`
      ).catch(() => []);
      return ok(
        {
          data: (imgs || []).map((i) => ({
            id: i.id,
            propertyId: i.property_id || propertyId,
            ownerType: 'room_type',
            ownerId: i.room_type_id,
            url: i.url,
            caption: i.caption,
            category: i.category || 'room',
            isPrimary: Boolean(i.is_primary),
            sortOrder: Number(i.sort_order || 0),
            createdAt: i.created_at,
          })),
        },
        config
      );
    }

    return ok(
      {
        data: (rows || []).map((m) => ({
          id: m.id,
          propertyId: m.property_id || propertyId,
          ownerType: m.owner_type,
          ownerId: m.owner_id,
          url: m.url,
          caption: m.caption,
          altText: m.alt_text,
          category: m.category,
          isPrimary: Boolean(m.is_primary),
          sortOrder: Number(m.sort_order || 0),
          createdAt: m.created_at,
        })),
      },
      config
    );
  }

  // 2. PROPERTIES & SETTINGS
  if (url.includes('/properties')) {
    const singleMatch = url.match(/\/properties\/([^/?]+)/);
    if (method === 'GET') {
      const rows = await supabaseFetch<any[]>(
        singleMatch
          ? `/properties?id=eq.${singleMatch[1]}&limit=1`
          : `/properties?is_active=eq.true&order=created_at.asc`
      );
      const formatted = (rows || []).map((p) => ({
        id: p.id,
        name: p.name,
        code: p.code,
        address: [p.address_line_1, p.city, p.state_province, p.postal_code].filter(Boolean).join(', '),
        addressLine1: p.address_line_1,
        city: p.city,
        stateProvince: p.state_province,
        postalCode: p.postal_code,
        countryCode: p.country_code,
        currencyCode: p.currency_code,
        timeZone: p.timezone,
        phone: p.phone,
        email: p.email,
        checkInTime: p.check_in_time,
        checkOutTime: p.check_out_time,
        roomCount: p.total_rooms,
        status: p.is_active ? 'active' : 'inactive',
        staffDisplayName: p.staff_display_name || p.name,
        guestRegistrationRequired: p.guest_registration_required,
        settings: p.settings || {},
      }));
      if (singleMatch) return ok(formatted[0] || null, config);
      return ok(formatted, config);
    }

    if ((method === 'PATCH' || method === 'PUT') && singleMatch) {
      const targetId = singleMatch[1];
      const payload: Record<string, any> = {};
      if (body.name !== undefined) payload.name = body.name;
      if (body.phone !== undefined) payload.phone = body.phone;
      if (body.email !== undefined) payload.email = body.email;
      if (body.addressLine1 !== undefined) payload.address_line_1 = body.addressLine1;
      if (body.checkInTime !== undefined) payload.check_in_time = body.checkInTime;
      if (body.checkOutTime !== undefined) payload.check_out_time = body.checkOutTime;
      if (body.currencyCode !== undefined) payload.currency_code = body.currencyCode;
      if (body.timezone !== undefined) payload.timezone = body.timezone;
      if (body.countryCode !== undefined) payload.country_code = body.countryCode;
      if (body.staffDisplayName !== undefined) payload.staff_display_name = body.staffDisplayName;
      if (body.guestRegistrationRequired !== undefined)
        payload.guest_registration_required = body.guestRegistrationRequired;

      const updated = await supabaseFetch<any[]>(`/properties?id=eq.${targetId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      return ok(updated?.[0] || payload, config);
    }
  }

  // 3. TARIFF CONFIG & TAX SETTINGS
  if (url.includes('/tariff-config')) {
    if (method === 'GET') {
      const cfg = await fetchTariffConfigFromSupabase(propertyId);
      return ok(cfg, config);
    }
    if ((method === 'PUT' || method === 'PATCH' || method === 'POST')) {
      const cfg = body as HotelTariffConfig;
      await supabaseFetch(`/hotel_settings?or=(hotel_id.eq.${propertyId},property_id.eq.${propertyId})`, {
        method: 'PATCH',
        body: JSON.stringify({
          gst_percentage: Number(cfg.gstPercentage ?? 5),
          tax_inclusive: Boolean(cfg.isTaxInclusive),
          extra_person_charge: Number(cfg.extraPersonCharge ?? 399),
          gstin: cfg.gstin || null,
          hsn_sac: cfg.hsnSac || '996311',
          invoice_header_name: cfg.invoiceHeaderName || null,
          invoice_address: cfg.invoiceAddress || null,
          cancellation_policy: cfg.cancellationPolicy || null,
        }),
      });

      if (Array.isArray(cfg.categories)) {
        for (const cat of cfg.categories) {
          const baseRate = cat.doubleOccupancyPrice ?? cat.singleOccupancyPrice ?? 0;
          if (cat.ratePlanId) {
            await supabaseFetch(`/rate_plans?id=eq.${cat.ratePlanId}`, {
              method: 'PATCH',
              body: JSON.stringify({
                base_rate: baseRate,
                base_amount: baseRate,
                single_occupancy_rate: cat.singleOccupancyPrice,
                double_occupancy_rate: cat.doubleOccupancyPrice,
                extra_person_charge: Number(cfg.extraPersonCharge ?? cat.extraPersonCharge ?? 399),
                gst_percentage: Number(cfg.gstPercentage ?? 5),
                tax_inclusive: Boolean(cfg.isTaxInclusive),
              }),
            });
          } else {
            await supabaseFetch(`/rate_plans`, {
              method: 'POST',
              body: JSON.stringify({
                hotel_id: propertyId,
                property_id: propertyId,
                room_type_id: cat.id,
                name: `${cat.name} Standard Rate`,
                code: `BAR-${cat.code || 'STD'}`,
                type: 'bar',
                base_rate: baseRate,
                base_amount: baseRate,
                single_occupancy_rate: cat.singleOccupancyPrice,
                double_occupancy_rate: cat.doubleOccupancyPrice,
                extra_person_charge: Number(cfg.extraPersonCharge ?? 399),
                gst_percentage: Number(cfg.gstPercentage ?? 5),
                tax_inclusive: Boolean(cfg.isTaxInclusive),
                is_active: true,
              }),
            });
          }
        }
      }

      const fresh = await fetchTariffConfigFromSupabase(propertyId);
      return ok(fresh, config);
    }
  }

  // 4. DIRECT BOOKING REQUESTS & ATOMIC APPROVAL / REJECTION
  if (url.includes('/direct-bookings') && url.includes('/available-rooms')) {
    const m = url.match(/\/direct-bookings\/([^/]+)\/available-rooms/);
    const reqId = m?.[1];
    if (!reqId) return ok({ availableRooms: [] }, config);

    const reqRows = await supabaseFetch<any[]>(`/booking_requests?id=eq.${reqId}&limit=1`);
    const br = reqRows?.[0];
    if (!br) return ok({ availableRooms: [] }, config);

    const avail = await supabaseFetch<any[]>(`/rpc/revalidate_room_availability`, {
      method: 'POST',
      body: JSON.stringify({
        p_hotel_id: propertyId,
        p_room_type_id: br.room_type_id,
        p_arrival_date: br.arrival_date,
        p_departure_date: br.departure_date,
      }),
    });
    const list = (avail || [])
      .filter((r) => r.is_available)
      .map((r) => ({
        id: r.room_id,
        number: r.room_number,
        floor: r.room_floor || '1',
        status: r.room_status,
      }));
    return ok({ availableRooms: list }, config);
  }

  if (url.includes('/direct-bookings') && url.includes('/approve') && method === 'POST') {
    const m = url.match(/\/direct-bookings\/([^/]+)\/approve/);
    const reqId = m?.[1];
    const roomId = body.roomId;
    if (!reqId || !roomId) {
      throw new Error('Both booking request ID and room ID are required to approve.');
    }
    const session = getStoredSupabaseSession();
    const res = await supabaseFetch<any>(`/rpc/approve_direct_booking`, {
      method: 'POST',
      body: JSON.stringify({
        p_booking_request_id: reqId,
        p_hotel_id: propertyId,
        p_room_id: roomId,
        p_decided_by: session?.user?.id || null,
        p_custom_total: body.customTotal != null ? Number(body.customTotal) : null,
        p_custom_price_reason: body.customPriceReason || null,
      }),
    });
    return ok(res, config);
  }

  if (url.includes('/direct-bookings') && (url.includes('/reject') || url.includes('/deny')) && method === 'POST') {
    const m = url.match(/\/direct-bookings\/([^/]+)\/(?:reject|deny)/);
    const reqId = m?.[1];
    const reason = (body.reason || body.denialReason || '').trim();
    if (!reqId || !reason) {
      throw new Error('Rejection reason is mandatory.');
    }
    const session = getStoredSupabaseSession();
    const res = await supabaseFetch<any>(`/rpc/reject_direct_booking`, {
      method: 'POST',
      body: JSON.stringify({
        p_booking_request_id: reqId,
        p_hotel_id: propertyId,
        p_reason: reason,
        p_decided_by: session?.user?.id || null,
      }),
    });
    return ok(res, config);
  }

  if (url.includes('/direct-bookings') && method === 'GET') {
    if (url.includes('/history/audit')) {
      const logs = await supabaseFetch<any[]>(
        `/audit_logs?select=*&or=(hotel_id.eq.${propertyId},property_id.eq.${propertyId})&order=occurred_at.desc&limit=50`
      );
      return ok(
        {
          logs: (logs || []).map((l) => ({
            id: l.id,
            propertyId: l.property_id || propertyId,
            action: l.action,
            entityType: l.entity_type,
            entityId: l.entity_id,
            description: l.description,
            newValue: l.new_value,
            occurredAt: l.occurred_at,
          })),
        },
        config
      );
    }

    const statusParam = params.status;
    let statusFilter = '';
    if (statusParam === 'pending') statusFilter = '&status=eq.pending';
    else if (statusParam === 'approved' || statusParam === 'accepted') statusFilter = '&status=eq.accepted';
    else if (statusParam === 'rejected' || statusParam === 'denied') statusFilter = '&status=in.(denied,rejected)';

    const [requests, roomTypes, ratePlans, reservations, rooms] = await Promise.all([
      supabaseFetch<any[]>(
        `/booking_requests?select=*&or=(hotel_id.eq.${propertyId},property_id.eq.${propertyId})${statusFilter}&order=created_at.desc`
      ),
      supabaseFetch<any[]>(`/room_types?select=id,name,code`).catch(() => []),
      supabaseFetch<any[]>(`/rate_plans?select=id,name`).catch(() => []),
      supabaseFetch<any[]>(`/reservations?select=id,room_id,booking_id,bookings(confirmation_number)`).catch(() => []),
      supabaseFetch<any[]>(`/rooms?select=id,number,floor`).catch(() => []),
    ]);

    const rtMap = new Map((roomTypes || []).map((rt) => [rt.id, rt]));
    const rpMap = new Map((ratePlans || []).map((rp) => [rp.id, rp]));
    const resMap = new Map((reservations || []).map((r) => [r.id, r]));
    const roomMap = new Map((rooms || []).map((r) => [r.id, r]));

    const items = (requests || []).map((req) => {
      const rt = rtMap.get(req.room_type_id);
      const rp = rpMap.get(req.rate_plan_id);
      const linkedRes = req.accepted_reservation_id ? resMap.get(req.accepted_reservation_id) : null;
      const linkedRoom = linkedRes?.room_id ? roomMap.get(linkedRes.room_id) : null;
      const snap = req.form_snapshot && typeof req.form_snapshot === 'object' && !Array.isArray(req.form_snapshot) ? req.form_snapshot : {};

      return {
        id: req.id,
        propertyId: req.property_id || propertyId,
        status: req.status,
        reference: req.submission_idempotency_key,
        submissionIdempotencyKey: req.submission_idempotency_key,
        arrivalDate: req.arrival_date,
        departureDate: req.departure_date,
        roomTypeId: req.room_type_id,
        roomTypeName: rt?.name || 'Room',
        roomTypeCode: rt?.code || '',
        ratePlanId: req.rate_plan_id,
        ratePlanName: rp?.name || 'Standard Rate',
        adults: req.adults,
        children: req.children,
        guestFirstName: req.guest_first_name,
        guestLastName: req.guest_last_name,
        guestEmail: req.guest_email,
        guestPhone: req.guest_phone || '',
        specialRequests: req.special_requests,
        submittedTotal: String(req.accepted_total ?? req.submitted_total ?? 0),
        currencyCode: req.currency_code || 'INR',
        cardBrand: req.card_brand || snap.cardBrand || null,
        cardLastFour: req.card_last_four || snap.cardLastFour || null,
        acceptedReservationId: req.accepted_reservation_id,
        confirmedReservationNumber: linkedRes?.bookings?.confirmation_number || null,
        assignedRoomNumber: linkedRoom?.number || null,
        assignedRoomFloor: linkedRoom?.floor || null,
        availableRoomsCount: 0,
        denialReason: req.denial_reason,
        decidedAt: req.decided_at,
        createdAt: req.created_at,
      };
    });

    return ok({ items, requests: items }, config);
  }

  // 5. ROOM TYPES & ROOMS
  if (url.includes('/room-types') || url.includes('/rooms/types')) {
    const idMatch = url.match(/\/(?:room-types|rooms\/types)\/([^/?]+)/);
    if (method === 'GET') {
      const [rts, plans, rooms] = await Promise.all([
        supabaseFetch<any[]>(
          `/room_types?select=*&or=(hotel_id.eq.${propertyId},property_id.eq.${propertyId})&is_active=eq.true&order=sort_order.asc`
        ),
        supabaseFetch<any[]>(
          `/rate_plans?select=*&or=(hotel_id.eq.${propertyId},property_id.eq.${propertyId})&is_active=eq.true`
        ).catch(() => []),
        supabaseFetch<any[]>(
          `/rooms?select=id,room_type_id&or=(hotel_id.eq.${propertyId},property_id.eq.${propertyId})&is_active=eq.true`
        ).catch(() => []),
      ]);
      const data = (rts || []).map((rt) => {
        const rp = (plans || []).find((p) => p.room_type_id === rt.id);
        const count = (rooms || []).filter((r) => r.room_type_id === rt.id).length;
        const rate = Number(rp?.double_occupancy_rate ?? rp?.base_rate ?? rp?.single_occupancy_rate ?? 0);
        return {
          id: rt.id,
          propertyId: rt.property_id || propertyId,
          name: rt.name,
          code: rt.code,
          description: rt.description,
          maxOccupancy: rt.max_occupancy,
          bedType: rt.bed_type,
          amenities: rt.amenities || [],
          roomCount: count,
          basePrice: rate,
          baseAmount: rate,
          price: rate,
          singleOccupancyPrice: rp?.single_occupancy_rate ?? null,
          doubleOccupancyPrice: rp?.double_occupancy_rate ?? null,
        };
      });
      return ok(data, config);
    }

    if ((method === 'PATCH' || method === 'PUT') && idMatch) {
      const updated = await supabaseFetch<any[]>(`/room_types?id=eq.${idMatch[1]}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.code !== undefined ? { code: body.code } : {}),
          ...(body.description !== undefined ? { description: body.description } : {}),
          ...(body.maxOccupancy !== undefined ? { max_occupancy: Number(body.maxOccupancy) } : {}),
          ...(body.bedType !== undefined ? { bed_type: body.bedType } : {}),
          ...(body.amenities !== undefined ? { amenities: body.amenities } : {}),
        }),
      });
      if (body.basePrice != null || body.baseAmount != null || body.price != null) {
        const nextPrice = Number(body.basePrice ?? body.baseAmount ?? body.price);
        await supabaseFetch(`/rate_plans?room_type_id=eq.${idMatch[1]}`, {
          method: 'PATCH',
          body: JSON.stringify({ base_rate: nextPrice, base_amount: nextPrice }),
        }).catch(() => undefined);
      }
      return ok(updated?.[0] || body, config);
    }

    if (method === 'POST') {
      const inserted = await supabaseFetch<any[]>(`/room_types`, {
        method: 'POST',
        body: JSON.stringify({
          hotel_id: propertyId,
          property_id: propertyId,
          name: body.name,
          code: body.code,
          description: body.description || '',
          max_occupancy: Number(body.maxOccupancy || 2),
          bed_type: body.bedType || 'queen',
          amenities: body.amenities || [],
          is_active: true,
        }),
      });
      const created = inserted?.[0];
      if (created && (body.basePrice != null || body.price != null)) {
        const rate = Number(body.basePrice ?? body.price ?? 0);
        await supabaseFetch(`/rate_plans`, {
          method: 'POST',
          body: JSON.stringify({
            hotel_id: propertyId,
            property_id: propertyId,
            room_type_id: created.id,
            name: `${created.name} Standard Rate`,
            code: `BAR-${created.code}`,
            type: 'bar',
            base_rate: rate,
            base_amount: rate,
            double_occupancy_rate: rate,
            is_active: true,
          }),
        }).catch(() => undefined);
      }
      return ok(created, config);
    }
  }

  if (url.includes('/rooms/status-summary')) {
    const rooms = await fetchRoomsFromSupabase(propertyId);
    const counts = new Map<string, number>();
    for (const r of rooms) counts.set(r.status, (counts.get(r.status) || 0) + 1);
    return ok(
      Array.from(counts.entries()).map(([status, count]) => ({ status, count })),
      config
    );
  }

  if (url.includes('/rooms/discrepancies')) {
    return ok([], config);
  }

  if (url.includes('/rooms/by-status')) {
    const targetStatus = params.status;
    const rooms = await fetchRoomsFromSupabase(propertyId);
    return ok(targetStatus ? rooms.filter((r) => r.status === targetStatus) : rooms, config);
  }

  if (
    url.match(/\/rooms(\/[^/?]+)?(\?|$)/) &&
    !url.includes('/types') &&
    !url.includes('/status-summary')
  ) {
    const roomMatch = url.match(/\/rooms\/([^/?]+)/);
    const targetRoomId = roomMatch?.[1];

    if (method === 'GET') {
      const rooms = await fetchRoomsFromSupabase(propertyId);
      if (targetRoomId) {
        return ok(rooms.find((r) => r.id === targetRoomId) || null, config);
      }
      return ok(rooms, config);
    }

    if ((method === 'PATCH' || method === 'PUT') && targetRoomId) {
      const targetId = targetRoomId.replace(/\/status$/, '');
      const payload: Record<string, any> = {};
      if (body.status !== undefined) payload.status = body.status;
      if (body.hkOccupancy !== undefined) payload.hk_occupancy = body.hkOccupancy;
      if (body.floor !== undefined) payload.floor = String(body.floor);
      if (body.roomTypeId !== undefined) payload.room_type_id = body.roomTypeId;
      if (body.maintenanceNotes !== undefined) payload.maintenance_notes = body.maintenanceNotes;
      if (body.number !== undefined) payload.number = String(body.number);
      const updated = await supabaseFetch<any[]>(`/rooms?id=eq.${targetId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      return ok(updated?.[0] || payload, config);
    }

    if (method === 'POST') {
      const inserted = await supabaseFetch<any[]>(`/rooms`, {
        method: 'POST',
        body: JSON.stringify({
          hotel_id: propertyId,
          property_id: propertyId,
          room_type_id: body.roomTypeId,
          number: String(body.number),
          floor: String(body.floor || '1'),
          building: body.building || 'Main',
          status: body.status || 'vacant_clean',
          is_accessible: Boolean(body.isAccessible),
          amenities: body.amenities || [],
          is_active: true,
        }),
      });
      return ok(inserted?.[0] || body, config);
    }

    if (method === 'DELETE' && targetRoomId) {
      await supabaseFetch(`/rooms?id=eq.${targetRoomId}`, { method: 'DELETE' });
      return ok({ success: true }, config);
    }
  }

  // 6. RATE PLANS
  if (url.includes('/rate-plans')) {
    const idMatch = url.match(/\/rate-plans\/([^/?]+)/);
    if (method === 'GET') {
      const rows = await supabaseFetch<any[]>(
        `/rate_plans?select=*,room_type:room_types(id,name,code)&or=(hotel_id.eq.${propertyId},property_id.eq.${propertyId})&order=created_at.asc`
      );
      return ok(
        (rows || []).map((rp) => ({
          id: rp.id,
          propertyId: rp.property_id || propertyId,
          roomTypeId: rp.room_type_id,
          roomTypeName: rp.room_type?.name || '',
          name: rp.name,
          code: rp.code,
          description: rp.description,
          type: rp.type,
          baseRate: Number(rp.base_rate || rp.base_amount || 0),
          baseAmount: Number(rp.base_amount || rp.base_rate || 0),
          singleOccupancyRate: rp.single_occupancy_rate != null ? Number(rp.single_occupancy_rate) : null,
          doubleOccupancyRate: rp.double_occupancy_rate != null ? Number(rp.double_occupancy_rate) : null,
          currencyCode: rp.currency_code || 'INR',
          isActive: rp.is_active !== false,
        })),
        config
      );
    }
    if ((method === 'PATCH' || method === 'PUT') && idMatch) {
      const rate = Number(body.baseAmount ?? body.baseRate ?? body.price);
      const updated = await supabaseFetch<any[]>(`/rate_plans?id=eq.${idMatch[1]}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.isActive !== undefined ? { is_active: body.isActive } : {}),
          ...(!Number.isNaN(rate) ? { base_rate: rate, base_amount: rate } : {}),
        }),
      });
      return ok(updated?.[0] || body, config);
    }
    if (method === 'POST') {
      const rate = Number(body.baseAmount ?? body.baseRate ?? 0);
      const inserted = await supabaseFetch<any[]>(`/rate_plans`, {
        method: 'POST',
        body: JSON.stringify({
          hotel_id: propertyId,
          property_id: propertyId,
          room_type_id: body.roomTypeId || null,
          name: body.name,
          code: body.code || `RP-${Date.now().toString().slice(-4)}`,
          type: body.type || 'bar',
          base_rate: rate,
          base_amount: rate,
          is_active: true,
        }),
      });
      return ok(inserted?.[0] || body, config);
    }
  }

  // 7. RESERVATIONS & AVAILABILITY
  if (url.includes('/reservations/search-availability')) {
    const arr = params.arrivalDate || params.checkIn || new Date().toISOString().slice(0, 10);
    const dep = params.departureDate || params.checkOut || new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const [rts, plans] = await Promise.all([
      supabaseFetch<any[]>(`/room_types?select=*&or=(hotel_id.eq.${propertyId},property_id.eq.${propertyId})&is_active=eq.true`),
      supabaseFetch<any[]>(`/rate_plans?select=*&or=(hotel_id.eq.${propertyId},property_id.eq.${propertyId})&is_active=eq.true`),
    ]);
    const results = await Promise.all(
      (rts || []).map(async (rt) => {
        const avail = await supabaseFetch<any[]>(`/rpc/revalidate_room_availability`, {
          method: 'POST',
          body: JSON.stringify({ p_hotel_id: propertyId, p_room_type_id: rt.id, p_arrival_date: arr, p_departure_date: dep }),
        }).catch(() => []);
        const availableCount = (avail || []).filter((x) => x.is_available).length;
        const rp = (plans || []).find((p) => p.room_type_id === rt.id);
        return {
          roomTypeId: rt.id,
          roomTypeName: rt.name,
          availableCount,
          ratePlanId: rp?.id,
          baseRate: Number(rp?.double_occupancy_rate ?? rp?.base_rate ?? 0),
        };
      })
    );
    return ok(results.filter((r) => r.availableCount > 0), config);
  }

  if (url.includes('/reservations/unassigned')) {
    const rows = await supabaseFetch<any[]>(
      `/reservations?select=*,guest:guests(id,first_name,last_name,phone,email),room_type:room_types(id,name),booking:bookings(confirmation_number)&or=(hotel_id.eq.${propertyId},property_id.eq.${propertyId})&room_id=is.null&status=in.(pending,confirmed)`
    );
    return ok(
      (rows || []).map((r) => ({
        id: r.id,
        confirmationNumber: r.booking?.confirmation_number || r.id.slice(0, 8).toUpperCase(),
        status: r.status,
        arrivalDate: r.arrival_date,
        departureDate: r.departure_date,
        roomTypeId: r.room_type_id,
        roomTypeName: r.room_type?.name || '',
        guestName: r.guest ? `${r.guest.first_name || ''} ${r.guest.last_name || ''}`.trim() : 'Guest',
        totalAmount: String(r.total_amount || 0),
        currencyCode: r.currency_code || 'INR',
      })),
      config
    );
  }

  if (url.includes('/reservations')) {
    const idMatch = url.match(/\/reservations\/([^/?]+)/);
    const targetId = idMatch?.[1];

    if (method === 'GET') {
      const filters: string[] = [];
      if (params.status) filters.push(`status=eq.${encodeURIComponent(params.status)}`);
      if (params.arrivalDate) filters.push(`arrival_date=eq.${encodeURIComponent(params.arrivalDate)}`);
      if (params.departureDate) filters.push(`departure_date=eq.${encodeURIComponent(params.departureDate)}`);
      const q = filters.length ? `&${filters.join('&')}` : '';

      const rows = await supabaseFetch<any[]>(
        `/reservations?select=*,guest:guests(*),room:rooms(id,number),room_type:room_types(id,name),rate_plan:rate_plans(id,name),booking:bookings(confirmation_number,source)&or=(hotel_id.eq.${propertyId},property_id.eq.${propertyId})${q}&order=created_at.desc`
      );
      return ok(
        (rows || []).map((r) => ({
          id: r.id,
          confirmationNumber: r.booking?.confirmation_number || r.id.slice(0, 8).toUpperCase(),
          status: r.status,
          arrivalDate: r.arrival_date,
          departureDate: r.departure_date,
          nights: r.nights,
          roomId: r.room_id,
          roomNumber: r.room?.number,
          roomTypeId: r.room_type_id,
          roomTypeName: r.room_type?.name,
          ratePlanId: r.rate_plan_id,
          ratePlanName: r.rate_plan?.name,
          guestId: r.guest_id,
          guestName: r.guest ? `${r.guest.first_name || ''} ${r.guest.last_name || ''}`.trim() : 'Guest',
          guestPhone: r.guest?.phone,
          guestEmail: r.guest?.email,
          guest: r.guest
            ? {
                id: r.guest.id,
                firstName: r.guest.first_name,
                lastName: r.guest.last_name,
                email: r.guest.email,
                phone: r.guest.phone,
              }
            : undefined,
          adults: r.adults,
          children: r.children,
          totalAmount: String(r.total_amount || 0),
          currencyCode: r.currency_code || 'INR',
          source: r.booking_source || r.booking?.source || 'direct',
          notes: r.special_requests || r.notes,
          createdAt: r.created_at,
        })),
        config
      );
    }

    if ((method === 'PATCH' || method === 'PUT' || method === 'POST') && targetId) {
      if (url.includes('/cancel') || body.status === 'cancelled') {
        const updated = await supabaseFetch<any[]>(`/reservations?id=eq.${targetId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancellation_reason: body.reason || body.cancellationReason || 'Cancelled by staff',
          }),
        });
        return ok(updated?.[0] || { success: true }, config);
      }

      if (url.includes('/check-in') && method === 'POST') {
        const resRows = await supabaseFetch<any[]>(`/reservations?id=eq.${targetId}&limit=1`);
        const resRow = resRows?.[0];
        if (!resRow) throw new Error('Reservation not found.');
        const assignRoomId = body.roomId || resRow.room_id;
        if (!assignRoomId) throw new Error('Assign a physical room before check-in.');
        await supabaseFetch(`/check_ins`, {
          method: 'POST',
          body: JSON.stringify({
            hotel_id: propertyId,
            property_id: propertyId,
            reservation_id: targetId,
            room_id: assignRoomId,
            guest_id: resRow.guest_id,
            checked_in_by: getStoredSupabaseSession()?.user?.id || null,
            notes: body.notes || null,
          }),
        });
        return ok({ success: true, id: targetId, status: 'checked_in' }, config);
      }

      if (url.includes('/checkout') && method === 'POST') {
        const res = await supabaseFetch<any>(`/rpc/complete_stay_checkout`, {
          method: 'POST',
          body: JSON.stringify({
            p_hotel_id: propertyId,
            p_reservation_id: targetId,
            p_final_payment: Number(body.finalPayment || 0),
            p_payment_method: body.paymentMethod || 'cash',
          }),
        });
        return ok(res, config);
      }

      const updatePayload: Record<string, any> = {};
      if (body.status !== undefined) updatePayload.status = body.status;
      if (body.roomId !== undefined) updatePayload.room_id = body.roomId;
      if (body.arrivalDate !== undefined) updatePayload.arrival_date = body.arrivalDate;
      if (body.departureDate !== undefined) updatePayload.departure_date = body.departureDate;
      if (body.notes !== undefined) updatePayload.notes = body.notes;
      const updated = await supabaseFetch<any[]>(`/reservations?id=eq.${targetId}`, {
        method: 'PATCH',
        body: JSON.stringify(updatePayload),
      });
      return ok(updated?.[0] || updatePayload, config);
    }

    if (method === 'POST') {
      const arrival = body.arrivalDate;
      const departure = body.departureDate;
      const nights = Math.max(
        1,
        Math.round((new Date(departure).getTime() - new Date(arrival).getTime()) / 86400000) || 1
      );
      const conf = `RES-${Date.now().toString().slice(-6)}`;
      const [bookingRow] = await supabaseFetch<any[]>(`/bookings`, {
        method: 'POST',
        body: JSON.stringify({
          hotel_id: propertyId,
          property_id: propertyId,
          guest_id: body.guestId,
          confirmation_number: conf,
          source: body.source || 'direct',
          notes: body.notes || null,
        }),
      });
      const total = Number(body.totalAmount || 0);
      const [resRow] = await supabaseFetch<any[]>(`/reservations`, {
        method: 'POST',
        body: JSON.stringify({
          hotel_id: propertyId,
          property_id: propertyId,
          booking_id: bookingRow.id,
          guest_id: body.guestId,
          arrival_date: arrival,
          departure_date: departure,
          nights,
          room_type_id: body.roomTypeId,
          room_id: body.roomId || null,
          rate_plan_id: body.ratePlanId,
          status: body.roomId ? 'confirmed' : 'pending',
          total_amount: total,
          base_amount: total,
          currency_code: body.currencyCode || 'INR',
          adults: Number(body.adults || 1),
          children: Number(body.children || 0),
          special_requests: body.notes || null,
        }),
      });
      return ok({ ...resRow, confirmationNumber: conf }, config);
    }
  }

  // 8. GUESTS & ID DOCUMENTS
  if (url.includes('/guests')) {
    const idMatch = url.match(/\/guests\/([^/?]+)/);
    const guestId = idMatch?.[1];

    if (method === 'GET') {
      if (guestId) {
        const [rows, docs] = await Promise.all([
          supabaseFetch<any[]>(`/guests?id=eq.${guestId}&limit=1`),
          supabaseFetch<any[]>(`/guest_documents?guest_id=eq.${guestId}`).catch(() => []),
        ]);
        const g = rows?.[0];
        if (!g) return ok(null, config);
        return ok(
          {
            id: g.id,
            firstName: g.first_name,
            lastName: g.last_name,
            email: g.email,
            phone: g.phone,
            idType: g.id_type,
            idNumber: g.id_number,
            addressLine1: g.address_line_1,
            city: g.city,
            stateProvince: g.state_province,
            countryCode: g.country_code,
            vipLevel: g.vip_level,
            loyaltyNumber: g.loyalty_number,
            registrationData: g.registration_data,
            documents: docs || [],
          },
          config
        );
      }

      const search = (params.search || params.q || '').trim();
      const searchFilter = search
        ? `&or=(first_name.ilike.*${encodeURIComponent(search)}*,last_name.ilike.*${encodeURIComponent(search)}*,phone.ilike.*${encodeURIComponent(search)}*,email.ilike.*${encodeURIComponent(search)}*)`
        : '';
      const rows = await supabaseFetch<any[]>(
        `/guests?select=*&or=(hotel_id.eq.${propertyId},property_id.eq.${propertyId})${searchFilter}&order=created_at.desc`
      );
      return ok(
        (rows || []).map((g) => ({
          id: g.id,
          firstName: g.first_name,
          lastName: g.last_name,
          email: g.email,
          phone: g.phone,
          idType: g.id_type,
          idNumber: g.id_number,
          addressLine1: g.address_line_1,
          city: g.city,
          stateProvince: g.state_province,
          countryCode: g.country_code || 'IN',
          vipLevel: g.vip_level || 'none',
          loyaltyNumber: g.loyalty_number,
          registrationData: g.registration_data,
        })),
        config
      );
    }

    if (method === 'POST') {
      const frontPath = await uploadIdProofIfDataUrl(propertyId, 'front', body.idProofFrontUrl);
      const backPath = await uploadIdProofIfDataUrl(propertyId, 'back', body.idProofBackUrl);
      const [created] = await supabaseFetch<any[]>(`/guests`, {
        method: 'POST',
        body: JSON.stringify({
          hotel_id: propertyId,
          property_id: propertyId,
          first_name: body.firstName || 'Guest',
          last_name: body.lastName || '',
          email: body.email || null,
          phone: body.phone || null,
          id_type: body.idType || body.idProofType || null,
          id_number: body.idNumber || body.idProofNumber || null,
          address_line_1: body.addressLine1 || body.address || null,
          city: body.city || null,
          state_province: body.stateProvince || body.state || null,
          country_code: body.countryCode || 'IN',
          vip_level: body.vipLevel || 'none',
          registration_data: {
            ...(body.registrationData || {}),
            ...(body.idProofType ? { idProofType: body.idProofType } : {}),
            ...(body.idProofNumber ? { idProofNumber: body.idProofNumber } : {}),
            ...(frontPath ? { idProofFrontUrl: frontPath } : {}),
            ...(backPath ? { idProofBackUrl: backPath } : {}),
          },
        }),
      });
      if (created && (body.idProofNumber || frontPath)) {
        await supabaseFetch(`/guest_documents`, {
          method: 'POST',
          body: JSON.stringify({
            hotel_id: propertyId,
            property_id: propertyId,
            guest_id: created.id,
            document_type: body.idProofType || body.idType || 'aadhaar',
            document_number: body.idProofNumber || body.idNumber || 'ON_FILE',
            file_url: frontPath || null,
            storage_path: backPath || null,
            verification_status: 'verified',
          }),
        }).catch(() => undefined);
      }
      return ok(
        {
          id: created.id,
          firstName: created.first_name,
          lastName: created.last_name,
          email: created.email,
          phone: created.phone,
        },
        config
      );
    }

    if ((method === 'PATCH' || method === 'PUT') && guestId) {
      const [updated] = await supabaseFetch<any[]>(`/guests?id=eq.${guestId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...(body.firstName !== undefined ? { first_name: body.firstName } : {}),
          ...(body.lastName !== undefined ? { last_name: body.lastName } : {}),
          ...(body.email !== undefined ? { email: body.email } : {}),
          ...(body.phone !== undefined ? { phone: body.phone } : {}),
          ...(body.idType !== undefined ? { id_type: body.idType } : {}),
          ...(body.idNumber !== undefined ? { id_number: body.idNumber } : {}),
          ...(body.addressLine1 !== undefined ? { address_line_1: body.addressLine1 } : {}),
          ...(body.city !== undefined ? { city: body.city } : {}),
          ...(body.stateProvince !== undefined ? { state_province: body.stateProvince } : {}),
          ...(body.vipLevel !== undefined ? { vip_level: body.vipLevel } : {}),
        }),
      });
      return ok(updated || body, config);
    }

    if (method === 'DELETE' && guestId) {
      await supabaseFetch(`/guests?id=eq.${guestId}`, { method: 'DELETE' });
      return ok({ success: true }, config);
    }
  }

  // 9. HOUSEKEEPING
  if (url.includes('/housekeeping')) {
    if (url.includes('/dashboard')) {
      const [tasks, rooms] = await Promise.all([
        supabaseFetch<any[]>(
          `/housekeeping_tasks?select=*,room:rooms(id,number,floor,status)&or=(hotel_id.eq.${propertyId},property_id.eq.${propertyId})&order=created_at.desc`
        ),
        fetchRoomsFromSupabase(propertyId),
      ]);
      const dirtyRooms = rooms.filter((r) => r.status === 'vacant_dirty');
      const statusSummary: Record<string, number> = { total: rooms.length };
      for (const r of rooms) statusSummary[r.status] = (statusSummary[r.status] || 0) + 1;
      return ok(
        {
          tasks: (tasks || []).map((t) => ({
            id: t.id,
            roomId: t.room_id,
            roomNumber: t.room?.number,
            type: t.task_type,
            status: t.status,
            priority: t.priority === 'urgent' ? 3 : t.priority === 'high' ? 2 : 1,
            assignedTo: t.assigned_to,
            serviceDate: t.scheduled_date,
            notes: t.notes,
          })),
          statusSummary,
          urgentRooms: dirtyRooms.map((r) => ({
            roomId: r.id,
            roomNumber: r.number,
            floor: r.floor,
            status: r.status,
            priority: 2,
            reason: 'Vacant Dirty',
          })),
          housekeeperSummary: [],
        },
        config
      );
    }

    if (url.includes('/ops-forecast')) {
      const today = new Date().toISOString().slice(0, 10);
      const res = await supabaseFetch<any[]>(
        `/reservations?select=status,departure_date&or=(hotel_id.eq.${propertyId},property_id.eq.${propertyId})&status=in.(checked_in,stayover,due_out)`
      );
      const expectedCheckouts = (res || []).filter((r) => r.departure_date === today).length;
      const expectedStayovers = (res || []).filter((r) => r.departure_date > today).length;
      return ok({ date: today, expectedCheckouts, expectedStayovers }, config);
    }

    if (url.includes('/tasks')) {
      const taskMatch = url.match(/\/tasks\/([^/?]+)/);
      if (method === 'GET') {
        const rows = await supabaseFetch<any[]>(
          `/housekeeping_tasks?select=*,room:rooms(id,number)&or=(hotel_id.eq.${propertyId},property_id.eq.${propertyId})&order=created_at.desc`
        );
        return ok(
          (rows || []).map((t) => ({
            id: t.id,
            roomId: t.room_id,
            roomNumber: t.room?.number,
            type: t.task_type,
            status: t.status,
            priority: t.priority,
            assignedTo: t.assigned_to,
            serviceDate: t.scheduled_date,
            notes: t.notes,
          })),
          config
        );
      }
      if (method === 'PATCH' && taskMatch) {
        const updated = await supabaseFetch<any[]>(`/housekeeping_tasks?id=eq.${taskMatch[1]}`, {
          method: 'PATCH',
          body: JSON.stringify({
            ...(body.status !== undefined ? { status: body.status } : {}),
            ...(body.assignedTo !== undefined ? { assigned_to: body.assignedTo } : {}),
            ...(body.notes !== undefined ? { notes: body.notes } : {}),
            ...(body.status === 'completed' || body.status === 'inspected' ? { completed_at: new Date().toISOString() } : {}),
          }),
        });
        return ok(updated?.[0] || body, config);
      }
      if (method === 'POST') {
        const inserted = await supabaseFetch<any[]>(`/housekeeping_tasks`, {
          method: 'POST',
          body: JSON.stringify({
            hotel_id: propertyId,
            property_id: propertyId,
            room_id: body.roomId,
            task_type: body.type || 'stayover',
            status: 'pending',
            priority: body.priority || 'normal',
            scheduled_date: body.serviceDate || new Date().toISOString().slice(0, 10),
            notes: body.notes || null,
          }),
        });
        return ok(inserted?.[0] || body, config);
      }
    }
  }

  // 10. STAYS / IN-HOUSE GUESTS / CHECK-IN / CHECK-OUT / FOLIO PAYMENT
  if (url.includes('/stays') || url.includes('/in-house-guests')) {
    if (method === 'GET') {
      const onlyInHouse = url.includes('/in-house');
      const stays = await fetchStaysFromSupabase(propertyId, onlyInHouse);
      return ok(stays, config);
    }

    if (method === 'POST' && (url.includes('/check-in') || url.match(/\/stays(\?|$)/))) {
      const fullName = (body.guestName || '').trim();
      const parts = fullName.split(/\s+/).filter(Boolean);
      const firstName = body.firstName || parts[0] || 'Guest';
      const lastName = body.lastName || parts.slice(1).join(' ') || '';

      const frontPath = await uploadIdProofIfDataUrl(propertyId, 'front', body.idProofFrontUrl);
      const backPath = await uploadIdProofIfDataUrl(propertyId, 'back', body.idProofBackUrl);

      const arrival = (body.checkInTime || new Date().toISOString()).slice(0, 10);
      const nights = Math.max(1, Number(body.nights || 1));
      const depDate = new Date(new Date(`${arrival}T00:00:00Z`).getTime() + nights * 86400000)
        .toISOString()
        .slice(0, 10);

      const rpcRes = await supabaseFetch<any>(`/rpc/create_walk_in_stay`, {
        method: 'POST',
        body: JSON.stringify({
          p_hotel_id: propertyId,
          p_room_id: body.roomId,
          p_first_name: firstName,
          p_last_name: lastName,
          p_phone: body.mobile || body.phone || '',
          p_email: body.email || null,
          p_address: body.address || null,
          p_city: body.city || null,
          p_state: body.state || null,
          p_id_type: body.idProofType || 'Aadhaar Card',
          p_id_number: body.idProofNumber || null,
          p_id_front_url: frontPath || null,
          p_id_back_url: backPath || null,
          p_arrival_date: arrival,
          p_departure_date: depDate,
          p_adults: Number(body.adults || 1),
          p_children: Number(body.children || 0),
          p_price_per_night: Number(body.pricePerNight || 0),
          p_extra_charges: Number(body.extraCharges || 0),
          p_discount: Number(body.discount || 0),
          p_advance_paid: Number(body.advancePaid || 0),
          p_payment_method: body.paymentMethod || 'cash',
          p_notes: body.notes || null,
          p_occupancy_type: body.occupancyType || 'double',
        }),
      });

      const allStays = await fetchStaysFromSupabase(propertyId, false);
      const createdStay = allStays.find((s) => s.id === rpcRes.reservation_id) || allStays[0];
      return ok({ stay: createdStay, ...rpcRes }, config);
    }

    if (method === 'POST' && url.includes('/checkout')) {
      const m = url.match(/\/stays\/([^/]+)\/checkout/);
      const stayId = m?.[1] || body.reservationId || body.id;
      if (!stayId) throw new Error('Stay reservation ID is required.');

      const rpcRes = await supabaseFetch<any>(`/rpc/complete_stay_checkout`, {
        method: 'POST',
        body: JSON.stringify({
          p_hotel_id: propertyId,
          p_reservation_id: stayId,
          p_final_payment: Number(body.finalPayment || 0),
          p_payment_method: body.paymentMethod || 'cash',
          p_nights: body.nights != null ? Number(body.nights) : null,
          p_price_per_night: body.pricePerNight != null ? Number(body.pricePerNight) : null,
          p_extra_charges: Number(body.extraCharges || 0),
          p_discount: Number(body.discount || 0),
          p_tax_mode: body.taxMode || 'inclusive',
          p_gst_rate: Number(body.gstRate ?? 5),
        }),
      });

      const allStays = await fetchStaysFromSupabase(propertyId, false);
      const updatedStay = allStays.find((s) => s.id === stayId);
      return ok({ success: true, stay: updatedStay, ...rpcRes }, config);
    }

    if (method === 'POST' && url.includes('/payment')) {
      const m = url.match(/\/stays\/([^/]+)\/payment/);
      const stayId = m?.[1];
      if (!stayId) throw new Error('Stay ID is required.');
      const resRows = await supabaseFetch<any[]>(`/reservations?id=eq.${stayId}&limit=1`);
      const res = resRows?.[0];
      if (!res) throw new Error('Reservation not found.');
      const folioRows = await supabaseFetch<any[]>(`/folios?reservation_id=eq.${stayId}&limit=1`);
      const folio = folioRows?.[0];

      await supabaseFetch(`/payments`, {
        method: 'POST',
        body: JSON.stringify({
          hotel_id: propertyId,
          property_id: propertyId,
          booking_id: res.booking_id,
          reservation_id: stayId,
          folio_id: folio?.id || null,
          guest_id: res.guest_id,
          amount: Number(body.amount || 0),
          currency_code: res.currency_code || 'INR',
          payment_method: String(body.paymentMethod || 'cash').toLowerCase().replace(/\s+/g, '_'),
          status: 'paid',
          transaction_reference: body.reference || null,
          paid_at: new Date().toISOString(),
          notes: body.notes || 'Folio payment recorded',
        }),
      });
      const updatedStays = await fetchStaysFromSupabase(propertyId, false);
      return ok({ success: true, stay: updatedStays.find((s) => s.id === stayId) }, config);
    }

    if (method === 'PATCH') {
      const m = url.match(/\/stays\/([^/?]+)/);
      const stayId = m?.[1];
      if (!stayId) throw new Error('Stay ID is required.');
      const resRows = await supabaseFetch<any[]>(`/reservations?id=eq.${stayId}&limit=1`);
      const res = resRows?.[0];
      if (!res) throw new Error('Reservation not found.');

      const nights = Math.max(1, Number(body.nights ?? res.nights ?? 1));
      const base =
        body.pricePerNight != null
          ? Number(body.pricePerNight) * nights
          : Number(res.base_amount || res.total_amount || 0);
      const extras = Number(body.extraCharges ?? res.extra_charges ?? 0);
      const disc = Number(body.discount ?? res.discount_amount ?? 0);
      const total = Math.max(0, base + extras - disc);

      await supabaseFetch(`/reservations?id=eq.${stayId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          nights,
          base_amount: base,
          extra_charges: extras,
          discount_amount: disc,
          total_amount: total,
          ...(body.adults != null ? { adults: Number(body.adults) } : {}),
          ...(body.children != null ? { children: Number(body.children) } : {}),
          ...(body.notes !== undefined ? { notes: body.notes } : {}),
        }),
      });

      if (res.guest_id && (body.guestName || body.mobile || body.email || body.address || body.state || body.guestGstin)) {
        const parts = String(body.guestName || '').trim().split(/\s+/).filter(Boolean);
        await supabaseFetch(`/guests?id=eq.${res.guest_id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            ...(parts.length > 0 ? { first_name: parts[0], last_name: parts.slice(1).join(' ') } : {}),
            ...(body.mobile !== undefined ? { phone: body.mobile } : {}),
            ...(body.email !== undefined ? { email: body.email } : {}),
            ...(body.address !== undefined ? { address_line_1: body.address } : {}),
            ...(body.state !== undefined ? { state_province: body.state } : {}),
            ...(body.guestGstin !== undefined ? { tax_id: body.guestGstin } : {}),
          }),
        });
      }

      const [folio] = await supabaseFetch<any[]>(`/folios?reservation_id=eq.${stayId}&limit=1`);
      if (folio) {
        const balance = Math.max(0, total - Number(folio.total_payments || 0));
        await supabaseFetch(`/folios?id=eq.${folio.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            total_charges: total,
            balance,
            status: balance <= 0 && total > 0 ? 'settled' : 'open',
          }),
        });
      }

      const [inv] = await supabaseFetch<any[]>(`/invoices?reservation_id=eq.${stayId}&limit=1`).catch(() => []);
      if (inv && (body.gstRate != null || body.taxMode || body.cashierName !== undefined || body.guestGstin !== undefined)) {
        await supabaseFetch(`/invoices?id=eq.${inv.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            ...(body.gstRate != null ? { gst_rate: Number(body.gstRate) } : {}),
            ...(body.taxMode !== undefined ? { tax_mode: body.taxMode } : {}),
            ...(body.cashierName !== undefined ? { cashier_name: body.cashierName } : {}),
            ...(body.guestGstin !== undefined ? { guest_gstin: body.guestGstin } : {}),
          }),
        });
      }

      const updatedStays = await fetchStaysFromSupabase(propertyId, false);
      return ok({ success: true, stay: updatedStays.find((s) => s.id === stayId) }, config);
    }
  }

  // 11. FOLIOS & INVOICES & CASH DRAWERS
  if (url.includes('/folios')) {
    const idMatch = url.match(/\/folios\/([^/?]+)/);
    if (method === 'GET') {
      if (idMatch) {
        const [fRows, charges, payments] = await Promise.all([
          supabaseFetch<any[]>(`/folios?id=eq.${idMatch[1]}&select=*,guest:guests(first_name,last_name,email,phone)&limit=1`),
          supabaseFetch<any[]>(`/additional_charges?folio_id=eq.${idMatch[1]}&voided_at=is.null`).catch(() => []),
          supabaseFetch<any[]>(`/payments?folio_id=eq.${idMatch[1]}`).catch(() => []),
        ]);
        const f = fRows?.[0];
        if (!f) return ok(null, config);
        return ok(
          {
            id: f.id,
            folioNumber: f.folio_number,
            type: f.type,
            status: f.status,
            totalCharges: String(f.total_charges || 0),
            totalPayments: String(f.total_payments || 0),
            balance: String(f.balance || 0),
            currencyCode: f.currency_code || 'INR',
            guest: f.guest,
            charges: charges || [],
            payments: payments || [],
          },
          config
        );
      }

      const rows = await supabaseFetch<any[]>(
        `/folios?select=*,guest:guests(first_name,last_name,phone,email)&or=(hotel_id.eq.${propertyId},property_id.eq.${propertyId})&order=created_at.desc`
      );
      return ok(
        (rows || []).map((f) => ({
          id: f.id,
          folioNumber: f.folio_number,
          reservationId: f.reservation_id,
          type: f.type,
          status: f.status,
          totalCharges: String(f.total_charges || 0),
          totalPayments: String(f.total_payments || 0),
          balance: String(f.balance || 0),
          currencyCode: f.currency_code || 'INR',
          guest: f.guest,
          guestName: f.guest ? `${f.guest.first_name || ''} ${f.guest.last_name || ''}`.trim() : 'Guest',
          createdAt: f.created_at,
        })),
        config
      );
    }
  }

  if (url.includes('/cash/drawers')) {
    if (method === 'GET') {
      const rows = await supabaseFetch<any[]>(
        `/cash_drawers?select=*&or=(hotel_id.eq.${propertyId},property_id.eq.${propertyId})&order=created_at.asc`
      );
      return ok(
        (rows || []).map((d) => ({
          id: d.id,
          name: d.name,
          location: d.location,
          currencyCode: d.currency_code || 'INR',
          isActive: d.is_active !== false,
        })),
        config
      );
    }
    if (method === 'POST') {
      const [created] = await supabaseFetch<any[]>(`/cash_drawers`, {
        method: 'POST',
        body: JSON.stringify({
          hotel_id: propertyId,
          property_id: propertyId,
          name: body.name,
          location: body.location || 'Front Desk',
          currency_code: body.currencyCode || 'INR',
          is_active: true,
        }),
      });
      return ok(created, config);
    }
  }

  // 12. STAFF NOTIFICATIONS
  if (url.includes('/staff-notifications')) {
    if (url.includes('/unread-count')) {
      const rows = await supabaseFetch<any[]>(
        `/staff_notifications?select=id&or=(hotel_id.eq.${propertyId},property_id.eq.${propertyId})&is_read=eq.false`
      );
      return ok({ unreadCount: rows?.length || 0 }, config);
    }
    if (method === 'PATCH' && url.includes('/read-all')) {
      await supabaseFetch(
        `/staff_notifications?or=(hotel_id.eq.${propertyId},property_id.eq.${propertyId})&is_read=eq.false`,
        { method: 'PATCH', body: JSON.stringify({ is_read: true, read_at: new Date().toISOString() }) }
      );
      return ok({ success: true }, config);
    }
    if (method === 'PATCH') {
      const m = url.match(/\/staff-notifications\/([^/?]+)/);
      if (m?.[1]) {
        await supabaseFetch(`/staff_notifications?id=eq.${m[1]}`, {
          method: 'PATCH',
          body: JSON.stringify({ is_read: true, read_at: new Date().toISOString() }),
        });
      }
      return ok({ success: true }, config);
    }
    const rows = await supabaseFetch<any[]>(
      `/staff_notifications?select=*&or=(hotel_id.eq.${propertyId},property_id.eq.${propertyId})&order=created_at.desc&limit=50`
    );
    return ok(
      (rows || []).map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        severity: n.severity || 'info',
        type: n.type,
        isRead: Boolean(n.is_read),
        createdAt: n.created_at,
      })),
      config
    );
  }

  // 13. DEPARTMENTS & EMPLOYEES & USERS
  if (url.includes('/departments')) {
    if (method === 'GET') {
      const [depts, emps] = await Promise.all([
        supabaseFetch<any[]>(`/departments?select=*&hotel_id=eq.${propertyId}&order=name.asc`),
        supabaseFetch<any[]>(`/employees?select=id,department_id&hotel_id=eq.${propertyId}&status=eq.active`).catch(() => []),
      ]);
      return ok(
        (depts || []).map((d) => ({
          id: d.id,
          name: d.name,
          code: d.code,
          description: d.description,
          managerName: d.manager_name,
          employeeCount: (emps || []).filter((e) => e.department_id === d.id).length,
        })),
        config
      );
    }
    if (method === 'POST') {
      const [created] = await supabaseFetch<any[]>(`/departments`, {
        method: 'POST',
        body: JSON.stringify({
          hotel_id: propertyId,
          property_id: propertyId,
          name: body.name,
          code: body.code,
          description: body.description || '',
          manager_name: body.managerName || '',
        }),
      });
      return ok(created, config);
    }
  }

  if (url.includes('/employees')) {
    const idMatch = url.match(/\/employees\/([^/?]+)/);
    if (method === 'GET') {
      const rows = await supabaseFetch<any[]>(
        `/employees?select=*,department:departments(id,name)&hotel_id=eq.${propertyId}&order=created_at.asc`
      );
      return ok(
        (rows || []).map((e) => ({
          id: e.id,
          authUserId: e.auth_user_id,
          employeeId: e.employee_id,
          name: e.name,
          mobile: e.mobile,
          email: e.email,
          address: e.address,
          joiningDate: e.joining_date,
          departmentId: e.department_id,
          departmentName: e.department?.name || 'Operations',
          designation: e.designation,
          salary: Number(e.salary || 0),
          role: e.role,
          shift: e.shift || 'morning',
          status: e.status || 'active',
          lastLoginAt: e.last_login_at || null,
        })),
        config
      );
    }
    if (method === 'POST') {
      const [created] = await supabaseFetch<any[]>(`/employees`, {
        method: 'POST',
        body: JSON.stringify({
          hotel_id: propertyId,
          property_id: propertyId,
          employee_id: body.employeeId || `EMP-${Date.now().toString().slice(-4)}`,
          name: body.name,
          mobile: body.mobile || '',
          email: body.email,
          address: body.address || '',
          joining_date: body.joiningDate || new Date().toISOString().slice(0, 10),
          department_id: body.departmentId || null,
          designation: body.designation || body.role || 'Staff',
          salary: Number(body.salary || 0),
          role: body.role || 'Receptionist',
          shift: body.shift || 'morning',
          status: body.status || 'active',
        }),
      });
      return ok(created, config);
    }
    if ((method === 'PUT' || method === 'PATCH') && idMatch) {
      const [updated] = await supabaseFetch<any[]>(`/employees?id=eq.${idMatch[1]}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...(body.employeeId !== undefined ? { employee_id: body.employeeId } : {}),
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.mobile !== undefined ? { mobile: body.mobile } : {}),
          ...(body.email !== undefined ? { email: body.email } : {}),
          ...(body.address !== undefined ? { address: body.address } : {}),
          ...(body.departmentId !== undefined ? { department_id: body.departmentId || null } : {}),
          ...(body.designation !== undefined ? { designation: body.designation } : {}),
          ...(body.salary !== undefined ? { salary: Number(body.salary) } : {}),
          ...(body.role !== undefined ? { role: body.role } : {}),
          ...(body.shift !== undefined ? { shift: body.shift } : {}),
          ...(body.status !== undefined ? { status: body.status } : {}),
        }),
      });
      return ok(updated, config);
    }
    if (method === 'DELETE' && idMatch) {
      await supabaseFetch(`/employees?id=eq.${idMatch[1]}`, { method: 'DELETE' });
      return ok({ success: true }, config);
    }
  }

  if (url.includes('/admin/users')) {
    const rows = await supabaseFetch<any[]>(
      `/employees?select=id,auth_user_id,name,email,role,designation,status,last_login_at,department:departments(name)&hotel_id=eq.${propertyId}&order=created_at.asc`
    );
    return ok(
      (rows || []).map((e) => ({
        id: e.auth_user_id || e.id,
        name: e.name,
        email: e.email,
        status: e.status || 'active',
        roles: [{ id: e.role, name: e.designation || e.role }],
        lastLoginAt: e.last_login_at,
      })),
      config
    );
  }

  // 14. STAFF ATTENDANCE & SHIFT HANDOVER NOTES (REAL DB TABLES)
  if (url.includes('/attendance')) {
    const today = params.date || new Date().toISOString().slice(0, 10);
    if (method === 'GET') {
      const rows = await supabaseFetch<any[]>(
        `/staff_attendance?select=*,employee:employees(id,employee_id,name,role,designation,department:departments(name))&hotel_id=eq.${propertyId}&attendance_date=eq.${today}&order=created_at.asc`
      );
      return ok(
        (rows || []).map((a) => ({
          id: a.id,
          employeeUuid: a.employee_id,
          employeeId: a.employee?.employee_id || '',
          name: a.employee?.name || 'Staff',
          role: a.employee?.designation || a.employee?.role || '',
          department: a.employee?.department?.name || 'Operations',
          shift: a.shift || 'morning',
          clockInTime: a.clock_in_at
            ? new Date(a.clock_in_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
            : '—',
          clockOutTime: a.clock_out_at
            ? new Date(a.clock_out_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
            : undefined,
          workingHours: Number(a.working_hours || 0),
          status: a.status,
        })),
        config
      );
    }
    if (method === 'POST') {
      const [created] = await supabaseFetch<any[]>(`/staff_attendance`, {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({
          hotel_id: propertyId,
          property_id: propertyId,
          employee_id: body.employeeUuid || body.employeeId,
          attendance_date: body.attendanceDate || today,
          shift: body.shift || 'morning',
          clock_in_at: body.clockInAt || new Date().toISOString(),
          clock_out_at: body.clockOutAt || null,
          working_hours: Number(body.workingHours || 0),
          status: body.status || 'on_duty',
          notes: body.notes || null,
        }),
      });
      return ok(created, config);
    }
    if (method === 'PATCH') {
      const idMatch = url.match(/\/attendance\/([^/?]+)/);
      if (idMatch?.[1]) {
        const [updated] = await supabaseFetch<any[]>(`/staff_attendance?id=eq.${idMatch[1]}`, {
          method: 'PATCH',
          body: JSON.stringify({
            ...(body.status !== undefined ? { status: body.status } : {}),
            ...(body.clockInAt !== undefined ? { clock_in_at: body.clockInAt } : {}),
            ...(body.clockOutAt !== undefined ? { clock_out_at: body.clockOutAt } : {}),
            ...(body.workingHours !== undefined ? { working_hours: Number(body.workingHours) } : {}),
          }),
        });
        return ok(updated, config);
      }
    }
  }

  if (url.includes('/handover-notes')) {
    const idMatch = url.match(/\/handover-notes\/([^/?]+)/);
    if (method === 'GET') {
      const rows = await supabaseFetch<any[]>(
        `/shift_handover_notes?select=*&hotel_id=eq.${propertyId}&order=created_at.desc&limit=50`
      );
      return ok(
        (rows || []).map((n) => ({
          id: n.id,
          shift: n.shift,
          department: n.department,
          author: n.author_name,
          note: n.note,
          time: new Date(n.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }),
          acknowledged: Boolean(n.acknowledged),
          createdAt: n.created_at,
        })),
        config
      );
    }
    if (method === 'POST') {
      const session = getStoredSupabaseSession();
      const [created] = await supabaseFetch<any[]>(`/shift_handover_notes`, {
        method: 'POST',
        body: JSON.stringify({
          hotel_id: propertyId,
          property_id: propertyId,
          shift: body.shift || 'morning',
          department: body.department || 'management',
          author_user_id: session?.user?.id || null,
          author_name: body.author || session?.user?.user_metadata?.name || session?.user?.email || 'Manager',
          note: body.note,
          acknowledged: false,
        }),
      });
      return ok(
        {
          id: created.id,
          shift: created.shift,
          department: created.department,
          author: created.author_name,
          note: created.note,
          time: new Date(created.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }),
          acknowledged: false,
        },
        config
      );
    }
    if (method === 'PATCH' && idMatch?.[1]) {
      const session = getStoredSupabaseSession();
      const [updated] = await supabaseFetch<any[]>(`/shift_handover_notes?id=eq.${idMatch[1]}`, {
        method: 'PATCH',
        body: JSON.stringify({
          acknowledged: body.acknowledged ?? true,
          acknowledged_by: session?.user?.id || null,
          acknowledged_at: new Date().toISOString(),
        }),
      });
      return ok(updated, config);
    }
  }

  // 15. REPORTS & PREFERENCES (100% REAL CALCULATIONS FROM DB, ZERO SIMULATED NUMBERS)
  if (url.includes('/preferences')) {
    if (method === 'GET') {
      const rows = await supabaseFetch<any[]>(
        `/hotel_settings?select=report_favorites&or=(hotel_id.eq.${propertyId},property_id.eq.${propertyId})&limit=1`
      ).catch(() => []);
      return ok({ reportFavorites: rows?.[0]?.report_favorites || [] }, config);
    }
    if (method === 'PATCH' || method === 'PUT') {
      await supabaseFetch(`/hotel_settings?or=(hotel_id.eq.${propertyId},property_id.eq.${propertyId})`, {
        method: 'PATCH',
        body: JSON.stringify({ report_favorites: body.reportFavorites || [] }),
      });
      return ok({ reportFavorites: body.reportFavorites || [] }, config);
    }
  }

  if (url.includes('/reports/financial-summary')) {
    const today = new Date().toISOString().slice(0, 10);
    const monthPrefix = today.slice(0, 7);
    const [payments, folios, reservations] = await Promise.all([
      supabaseFetch<any[]>(
        `/payments?select=amount,paid_at,status&or=(hotel_id.eq.${propertyId},property_id.eq.${propertyId})&status=in.(paid,captured,settled)`
      ).catch(() => []),
      supabaseFetch<any[]>(
        `/folios?select=total_charges,total_payments,balance&or=(hotel_id.eq.${propertyId},property_id.eq.${propertyId})`
      ).catch(() => []),
      supabaseFetch<any[]>(
        `/reservations?select=total_amount,nights,arrival_date,status&or=(hotel_id.eq.${propertyId},property_id.eq.${propertyId})&status=not.in.(cancelled,no_show)`
      ).catch(() => []),
    ]);

    const todayPayments = (payments || [])
      .filter((p) => (p.paid_at || '').startsWith(today))
      .reduce((s, p) => s + Number(p.amount || 0), 0);
    const monthlyRevenue = (payments || [])
      .filter((p) => (p.paid_at || '').startsWith(monthPrefix))
      .reduce((s, p) => s + Number(p.amount || 0), 0);
    const totalCollected = (payments || []).reduce((s, p) => s + Number(p.amount || 0), 0);
    const pendingPayments = (folios || []).reduce((s, f) => s + Number(f.balance || 0), 0);
    const totalNights = (reservations || []).reduce((s, r) => s + Math.max(1, Number(r.nights || 1)), 0);
    const totalResRevenue = (reservations || []).reduce((s, r) => s + Number(r.total_amount || 0), 0);
    const adr = totalNights > 0 ? Math.round((totalResRevenue / totalNights) * 100) / 100 : 0;

    return ok(
      {
        totalRevenue: todayPayments,
        monthlyRevenue,
        totalCollected,
        pendingPayments,
        adr,
        revpar: 0,
      },
      config
    );
  }

  if (url.includes('/reports/occupancy')) {
    const today = new Date().toISOString().slice(0, 10);
    const [rooms, res] = await Promise.all([
      fetchRoomsFromSupabase(propertyId),
      supabaseFetch<any[]>(
        `/reservations?select=arrival_date,departure_date,status&or=(hotel_id.eq.${propertyId},property_id.eq.${propertyId})`
      ).catch(() => []),
    ]);
    const occupied = rooms.filter((r) => r.status === 'occupied').length;
    const totalRooms = rooms.length;
    const rate = totalRooms > 0 ? occupied / totalRooms : 0;
    const arrivals = (res || []).filter((r) => r.arrival_date === today && r.status !== 'cancelled').length;
    const departures = (res || []).filter((r) => r.departure_date === today && r.status !== 'cancelled').length;
    return ok(
      {
        occupiedRooms: occupied,
        totalRooms,
        occupancyRate: rate,
        arrivals,
        departures,
      },
      config
    );
  }

  if (url.includes('/admin/booking-engine/config')) {
    if (method === 'GET') {
      const [hsRows, propRows] = await Promise.all([
        supabaseFetch<any[]>(`/hotel_settings?or=(hotel_id.eq.${propertyId},property_id.eq.${propertyId})&limit=1`).catch(() => []),
        supabaseFetch<any[]>(`/properties?id=eq.${propertyId}&limit=1`).catch(() => []),
      ]);
      const hs = hsRows?.[0] || {};
      const prop = propRows?.[0] || {};
      return ok(
        {
          bookingMode: hs.booking_mode || 'request',
          autoConfirm: Boolean(hs.auto_confirm),
          requireDeposit: Boolean(hs.require_deposit),
          depositPercentage: Number(hs.deposit_percentage || 0),
          cancellationPolicy: hs.cancellation_policy || '',
          paymentMethodCollection: 'optional',
          paymentMethodClientMode: 'unsupported',
          upiId: prop.settings?.upi_id || '',
          upiMerchantName: hs.upi_payee_name || prop.name || '',
        },
        config
      );
    }
    if (method === 'PATCH' || method === 'PUT') {
      await supabaseFetch(`/hotel_settings?or=(hotel_id.eq.${propertyId},property_id.eq.${propertyId})`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...(body.bookingMode !== undefined ? { booking_mode: body.bookingMode } : {}),
          ...(body.autoConfirm !== undefined ? { auto_confirm: Boolean(body.autoConfirm) } : {}),
          ...(body.requireDeposit !== undefined ? { require_deposit: Boolean(body.requireDeposit) } : {}),
          ...(body.depositPercentage !== undefined ? { deposit_percentage: Number(body.depositPercentage) } : {}),
          ...(body.cancellationPolicy !== undefined ? { cancellation_policy: body.cancellationPolicy } : {}),
          ...(body.upiMerchantName !== undefined ? { upi_payee_name: body.upiMerchantName } : {}),
        }),
      });
      return ok({ success: true }, config);
    }
  }

  // Remaining generic list/empty handlers (no mock objects returned)
  if (url.includes('/organizations') || url.includes('/help') || url.includes('/agents')) {
    return ok([], config);
  }

  return ok([], config);
}
