import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { DoorOpen, LayoutGrid, List, Plus, X, Image as ImageIcon, AlertTriangle, Pencil, Tags, IndianRupee, Check, Sparkles, Globe, LogOut } from 'lucide-react';
import { api } from '../lib/api';
import type { StoredStay } from '../lib/supabaseAdapter';
import { moneyString, requirePropertyId } from '../lib/api-helpers';
import { useProperty } from '../context/PropertyContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { useMediaList } from '../hooks/useMedia';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import MediaGallery from '../components/media/MediaGallery';
import CheckoutModal from '../components/front-desk/CheckOutModal';
import BillInvoiceModal from '../components/billing/BillInvoiceModal';

interface Room {
  id: string;
  number: string;
  roomTypeId: string;
  roomTypeName?: string;
  floor?: string;
  building?: string;
  status: string;
  guestName?: string;
  isAccessible?: boolean;
  amenities?: string[];
}

interface RoomType {
  id: string;
  name: string;
  code: string;
  description?: string;
  maxOccupancy?: number;
  bedType?: string;
  amenities?: string[];
  roomCount?: number;
  basePrice?: number;
  baseAmount?: number;
  price?: number;
}

interface RoomDiaryEntry {
  roomId: string;
  guestName?: string | null;
  arrivalDate: string;
  departureDate: string;
  status: string;
}

interface StatusCount {
  status: string;
  count: number;
}

const STATUS_CARD_COLORS: Record<string, string> = {
  occupied: 'border-telivity-teal bg-telivity-teal/5',
  vacant_clean: 'border-telivity-dark-teal bg-telivity-dark-teal/5',
  vacant_dirty: 'border-telivity-orange bg-telivity-orange/5',
  clean: 'border-telivity-dark-teal bg-telivity-dark-teal/5',
  inspected: 'border-telivity-deep-blue bg-telivity-deep-blue/5',
  guest_ready: 'border-telivity-dark-teal bg-telivity-dark-teal/5',
  out_of_order: 'border-telivity-yellow bg-telivity-yellow/5',
  out_of_service: 'border-telivity-mid-grey bg-gray-50',
};

const VALID_TRANSITIONS: Record<string, string[]> = {
  vacant_clean: ['occupied', 'guest_ready', 'out_of_order', 'vacant_dirty'],
  vacant_dirty: ['clean', 'out_of_order'],
  clean: ['vacant_clean', 'inspected', 'guest_ready', 'out_of_order'],
  inspected: ['guest_ready', 'vacant_clean', 'out_of_order'],
  guest_ready: ['occupied', 'vacant_clean', 'out_of_order', 'out_of_service'],
  occupied: ['vacant_dirty', 'out_of_order'],
  out_of_order: ['vacant_clean', 'clean', 'vacant_dirty'],
  out_of_service: ['vacant_clean', 'clean', 'vacant_dirty'],
};

// ---- Room Detail Slide-Over ----
function RoomDetailPanel({
  room,
  propertyId,
  diary,
  onClose,
  onTransition,
  transitioning,
  onCheckOutRoom,
}: {
  room: Room;
  propertyId: string;
  diary?: RoomDiaryEntry;
  onClose: () => void;
  onTransition: (newStatus: string) => void;
  transitioning: boolean;
  onCheckOutRoom?: (room: Room) => void;
}) {
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  // Mirror each backend route's authorization so we never show controls that
  // would 403: PATCH /rooms/:id allows admin/front_desk/housekeeping_manager,
  // but every media route is admin-only. In the demo (auth off) hasRole
  // returns true so admins see all editing controls.
  const canManageAmenities = hasRole('admin') || hasRole('general_manager') || hasRole('front_desk') || hasRole('housekeeping_manager');
  const canManagePhotos = true; // Allow staff and managers to upload room photos directly

  // Main photo: the room's own primary, falling back to the room type's primary
  // (rooms usually inherit their type's photos rather than having their own).
  const { data: roomMedia = [] } = useMediaList(propertyId, 'room', room.id);
  const { data: typeMedia = [] } = useMediaList(propertyId, 'room_type', room.roomTypeId);
  const primaryImage =
    roomMedia.find((m) => m.isPrimary) ?? roomMedia[0] ??
    typeMedia.find((m) => m.isPrimary) ?? typeMedia[0] ?? null;

  const [amenities, setAmenities] = useState<string[]>(room.amenities ?? []);
  const [newAmenity, setNewAmenity] = useState('');
  const [photosOpen, setPhotosOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editNumber, setEditNumber] = useState(room.number);
  const [editFloor, setEditFloor] = useState(room.floor || '1');
  const [editRoomTypeId, setEditRoomTypeId] = useState(room.roomTypeId);
  const dirty = JSON.stringify(amenities) !== JSON.stringify(room.amenities ?? []);

  const { data: roomTypesData } = useQuery({
    queryKey: ['rooms', 'types', propertyId],
    queryFn: () => api.get('/v1/rooms/types', { params: { propertyId } }).then((r) => r.data),
    enabled: !!propertyId,
  });
  const roomTypes: RoomType[] = Array.isArray(roomTypesData?.data) ? roomTypesData.data : (Array.isArray(roomTypesData) ? roomTypesData : []);

  const editRoomMutation = useMutation({
    mutationFn: () =>
      api.patch(
        `/v1/rooms/${room.id}`,
        { number: editNumber, floor: editFloor, roomTypeId: editRoomTypeId },
        { params: { propertyId } },
      ),
    onSuccess: () => {
      toast('success', `Room ${editNumber} updated successfully.`);
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['rooms', 'status-summary'] });
      setEditOpen(false);
      onClose();
    },
    onError: (err: any) => {
      toast('error', err?.response?.data?.message || 'Failed to update room.');
    },
  });

  const saveAmenities = useMutation({
    mutationFn: () => api.patch(`/v1/rooms/${room.id}`, { amenities }, { params: { propertyId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast('success', t('rooms.featuresUpdated'));
    },
  });

  const deleteRoomMutation = useMutation({
    mutationFn: () => api.delete(`/v1/rooms/${room.id}`, { params: { propertyId } }),
    onSuccess: () => {
      toast('success', `Room ${room.number} deleted successfully.`);
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['rooms', 'status-summary'] });
      onClose();
    },
    onError: (err: any) => {
      toast('error', err?.response?.data?.message || `Failed to delete room ${room.number}.`);
    },
  });

  const addAmenity = () => {
    const v = newAmenity.trim().toLowerCase().replace(/\s+/g, '_');
    if (v && !amenities.includes(v)) setAmenities([...amenities, v]);
    setNewAmenity('');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold text-telivity-navy">{t('rooms.roomNumber', { number: room.number })}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-telivity-light-grey"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-5">
          {/* Main photo */}
          <div className="relative">
            {primaryImage ? (
              <img
                src={primaryImage.url}
                alt={primaryImage.altText ?? t('rooms.roomNumber', { number: room.number })}
                className="w-full h-40 object-cover rounded-xl border border-gray-100"
              />
            ) : (
              <div className="w-full h-40 rounded-xl border border-dashed border-gray-200 bg-telivity-light-grey/40 flex flex-col items-center justify-center text-telivity-mid-grey">
                <ImageIcon size={28} />
                <span className="text-xs mt-1">{t('rooms.noPhoto')}</span>
              </div>
            )}
            {canManagePhotos && (
              <button
                onClick={() => setPhotosOpen(true)}
                className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-white/90 backdrop-blur text-telivity-slate text-xs font-medium rounded-lg px-2.5 py-1.5 shadow-sm hover:bg-white"
              >
                <ImageIcon size={13} /> {t('rooms.managePhotos')}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge status={room.status} label={t(`dashboard.roomStatuses.${room.status}`, { defaultValue: room.status })} />
            {room.isAccessible && <StatusBadge status="info" label="ADA" />}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><p className="text-xs text-telivity-mid-grey">{t('rooms.type')}</p><p className="text-sm font-medium">{room.roomTypeName ?? '—'}</p></div>
            <div><p className="text-xs text-telivity-mid-grey">{t('rooms.floor')}</p><p className="text-sm font-medium">{room.floor ?? '—'}</p></div>
            <div><p className="text-xs text-telivity-mid-grey">{t('rooms.building')}</p><p className="text-sm font-medium">{room.building ?? '—'}</p></div>
            <div><p className="text-xs text-telivity-mid-grey">{t('rooms.guest')}</p><p className="text-sm font-medium">{diary?.guestName ?? room.guestName ?? t('rooms.none')}</p></div>
            {diary && (
              <div className="col-span-2">
                <p className="text-xs text-telivity-mid-grey">{t('rooms.diaryStay')}</p>
                <p className="text-sm font-medium">{diary.arrivalDate} → {diary.departureDate}</p>
              </div>
            )}
          </div>

          {/* Occupied Room: Check Out & Settle Folio Action */}
          {room.status === 'occupied' && onCheckOutRoom && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-rose-900">
                <span>Guest: {diary?.guestName ?? room.guestName ?? 'Occupied Room'}</span>
                <span className="px-2 py-0.5 rounded bg-rose-200 text-rose-800 text-[10px] uppercase font-bold">Occupied</span>
              </div>
              <p className="text-[11px] text-rose-700">
                Calculate stay charges, add extras, deduct advance, collect settlement, and print invoice.
              </p>
              <button
                type="button"
                onClick={() => onCheckOutRoom(room)}
                className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut size={15} /> Check Out & Settle Final Bill
              </button>
            </div>
          )}

          {/* Status Transitions */}
          <div>
            <p className="text-xs font-medium text-telivity-mid-grey mb-2">{t('rooms.changeStatus')}</p>
            <div className="flex flex-wrap gap-2">
              {(VALID_TRANSITIONS[room.status] ?? []).map((s) => (
                <button
                  key={s}
                  onClick={() => onTransition(s)}
                  disabled={transitioning}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium hover:border-telivity-teal hover:bg-telivity-teal/5 transition-colors disabled:opacity-50"
                >
                  → {t(`dashboard.roomStatuses.${s}`, { defaultValue: s.replace(/_/g, ' ') })}
                </button>
              ))}
            </div>
          </div>

          {/* Features / amenities */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-telivity-mid-grey">{t('rooms.features')}</p>
              {canManageAmenities && dirty && (
                <button
                  onClick={() => saveAmenities.mutate()}
                  disabled={saveAmenities.isPending}
                  className="text-xs font-semibold text-telivity-teal hover:text-telivity-light-teal disabled:opacity-50"
                >
                  {saveAmenities.isPending ? t('common.saving') : t('common.save')}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {amenities.map((f) => (
                <span key={f} className="inline-flex items-center gap-1 bg-telivity-light-grey text-telivity-slate text-xs rounded-lg px-2 py-1">
                  {f}
                  {canManageAmenities && (
                    <button onClick={() => setAmenities(amenities.filter((a) => a !== f))} className="text-telivity-mid-grey hover:text-telivity-orange" aria-label={`Remove ${f}`}>
                      <X size={11} />
                    </button>
                  )}
                </span>
              ))}
              {amenities.length === 0 && <span className="text-xs text-telivity-mid-grey">{t('rooms.noFeatures')}</span>}
            </div>
            {canManageAmenities && (
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={newAmenity}
                  onChange={(e) => setNewAmenity(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAmenity(); } }}
                  placeholder={t('rooms.addFeature')}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-telivity-teal"
                />
                <button onClick={addAmenity} disabled={!newAmenity.trim()} className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium hover:border-telivity-teal disabled:opacity-50">{t('common.add')}</button>
              </div>
            )}
          </div>

          {/* Quick Actions: Edit Room / Block Room / Delete Room */}
          <div className="pt-4 border-t border-gray-100 flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="flex-1 border border-teal-300 bg-teal-50 text-teal-800 rounded-lg px-3 py-2 text-xs font-semibold hover:bg-teal-100 transition flex items-center justify-center gap-1.5"
              >
                <Pencil size={13} /> Edit Room
              </button>
              {room.status !== 'out_of_order' ? (
                <button
                  type="button"
                  onClick={() => onTransition('out_of_order')}
                  disabled={transitioning || room.status === 'occupied'}
                  className="flex-1 border border-amber-300 bg-amber-50 text-amber-800 rounded-lg px-3 py-2 text-xs font-semibold hover:bg-amber-100 disabled:opacity-50 transition"
                >
                  Block Room (Maintenance)
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onTransition('vacant_clean')}
                  disabled={transitioning}
                  className="flex-1 border border-teal-300 bg-teal-50 text-teal-800 rounded-lg px-3 py-2 text-xs font-semibold hover:bg-teal-100 disabled:opacity-50 transition"
                >
                  Unblock (Make Available)
                </button>
              )}
            </div>

            {(hasRole('admin') || hasRole('general_manager')) && room.status !== 'occupied' && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Are you sure you want to permanently delete Room ${room.number}?`)) {
                    deleteRoomMutation.mutate();
                  }
                }}
                disabled={deleteRoomMutation.isPending}
                className="w-full text-center border border-red-200 bg-red-50 text-red-700 rounded-lg px-3 py-2 text-xs font-semibold hover:bg-red-100 disabled:opacity-50 transition"
              >
                {deleteRoomMutation.isPending ? 'Deleting...' : `Delete Room ${room.number}`}
              </button>
            )}
          </div>
        </div>
      </div>

      {editOpen && (
        <Modal open={editOpen} onClose={() => setEditOpen(false)} title={`Edit Room ${room.number}`}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-telivity-slate mb-1">Room Number *</label>
              <input
                type="text"
                value={editNumber}
                onChange={(e) => setEditNumber(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-telivity-slate mb-1">Room Category *</label>
              <select
                value={editRoomTypeId}
                onChange={(e) => setEditRoomTypeId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal bg-white"
              >
                {roomTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-telivity-slate mb-1">Floor</label>
              <input
                type="text"
                value={editFloor}
                onChange={(e) => setEditFloor(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal"
              />
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => editRoomMutation.mutate()}
                disabled={!editNumber.trim() || editRoomMutation.isPending}
                className="px-4 py-2 bg-telivity-teal text-white rounded-lg text-xs font-semibold hover:bg-telivity-light-teal disabled:opacity-50"
              >
                {editRoomMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {canManagePhotos && (
        <Modal open={photosOpen} onClose={() => setPhotosOpen(false)} title={t('rooms.photosForRoom', { number: room.number })} wide>
          <MediaGallery propertyId={propertyId} ownerType="room" ownerId={room.id} canManage={canManagePhotos} />
        </Modal>
      )}
    </div>
  );
}

// ---- Room List / Rack ----
function RoomList() {
  const { t } = useTranslation();
  const { propertyId } = useProperty();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [view, setView] = useState<'rack' | 'list'>('rack');
  const [detailRoom, setDetailRoom] = useState<Room | null>(null);
  const [checkoutStay, setCheckoutStay] = useState<StoredStay | null>(null);
  const [invoiceStay, setInvoiceStay] = useState<StoredStay | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newRoomType, setNewRoomType] = useState('');
  const [newFloor, setNewFloor] = useState('1');

  const { data: staysData } = useQuery({
    queryKey: ['stays', propertyId],
    queryFn: () => api.get('/v1/stays', { params: { propertyId } }).then((r) => r.data),
    enabled: !!propertyId,
  });
  const allStays: StoredStay[] = useMemo(() => {
    const raw = staysData?.data ?? staysData;
    return Array.isArray(raw) ? raw : [];
  }, [staysData]);

  const handleCheckOutRoom = (r: Room) => {
    const foundStay = allStays.find(
      (s) => (s.roomId === r.id || s.roomNumber === r.number) && s.stayStatus !== 'checked_out'
    );
    if (foundStay) {
      setCheckoutStay(foundStay);
    } else {
      toast('error', `No active in-house stay found for Room ${r.number}.`);
    }
  };

  const { data: discrepanciesData } = useQuery({
    queryKey: ['rooms', 'discrepancies', propertyId, today],
    queryFn: () => api.get('/v1/rooms/discrepancies', { params: { propertyId, date: today } }).then((r) => r.data),
    enabled: !!propertyId,
  });

  const discrepancies = discrepanciesData?.discrepancies ?? discrepanciesData?.data?.discrepancies ?? [];

  const { data: roomsData } = useQuery({
    queryKey: ['rooms', propertyId],
    queryFn: () => api.get('/v1/rooms', { params: { propertyId } }).then((r) => r.data),
    enabled: !!propertyId,
  });

  const { data: summaryData } = useQuery({
    queryKey: ['rooms', 'status-summary', propertyId],
    queryFn: () => api.get('/v1/rooms/status-summary', { params: { propertyId } }).then((r) => r.data),
    enabled: !!propertyId,
  });

  const { data: typesData } = useQuery({
    queryKey: ['rooms', 'types', propertyId],
    queryFn: () => api.get('/v1/rooms/types', { params: { propertyId } }).then((r) => r.data),
    enabled: !!propertyId,
  });

  const { data: diaryData } = useQuery({
    queryKey: ['reservations', 'room-diary', propertyId, today],
    queryFn: () =>
      api
        .get('/v1/reservations', {
          params: {
            propertyId,
            statuses: 'assigned,checked_in,stayover,due_out',
            arrivalDateTo: today,
            departureDateFrom: today,
            limit: 100,
          },
        })
        .then((r) => r.data),
    enabled: !!propertyId,
  });

  const rooms: Room[] = useMemo(() => {
    const raw = roomsData?.data ?? roomsData;
    return Array.isArray(raw) ? raw : [];
  }, [roomsData]);

  const summary: StatusCount[] = useMemo(() => {
    const raw = summaryData?.data ?? summaryData;
    if (Array.isArray(raw)) {
      return raw.filter((s) => s && typeof s === 'object' && 'status' in s);
    }
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      return Object.entries(raw).map(([status, count]) => ({
        status,
        count: typeof count === 'number' ? count : Number(count) || 0,
      }));
    }
    return [];
  }, [summaryData]);

  const types: RoomType[] = useMemo(() => {
    const raw = typesData?.data ?? typesData;
    return Array.isArray(raw) ? raw : [];
  }, [typesData]);

  const isDuplicateNumber = useMemo(() => {
    if (!newRoomNumber.trim()) return false;
    return rooms.some((r) => r.number.trim().toLowerCase() === newRoomNumber.trim().toLowerCase());
  }, [rooms, newRoomNumber]);

  const diaryByRoomId = useMemo(() => {
    const map = new Map<string, RoomDiaryEntry>();
    const list = Array.isArray(diaryData?.data)
      ? diaryData.data
      : Array.isArray(diaryData)
        ? diaryData
        : [];
    for (const r of list as RoomDiaryEntry[]) {
      if (r?.roomId) map.set(r.roomId, r);
    }
    return map;
  }, [diaryData]);

  const statusMutation = useMutation({
    mutationFn: ({ roomId, newStatus }: { roomId: string; newStatus: string }) =>
      api.patch(`/v1/rooms/${roomId}/status`, { status: newStatus }, { params: { propertyId } }),
    onSuccess: () => {
      toast('success', 'Room status updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['rooms', 'status-summary'] });
      setDetailRoom(null);
    },
    onError: (err: any) => {
      toast('error', err?.response?.data?.message || 'Failed to update room status.');
    },
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const selectedType = newRoomType || types[0]?.id;
      return api.post('/v1/rooms', {
        propertyId,
        number: newRoomNumber.trim(),
        roomTypeId: selectedType,
        floor: newFloor || '1',
      });
    },
    onSuccess: () => {
      toast('success', `Room ${newRoomNumber} added successfully to Hotel Spark!`);
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['rooms', 'status-summary'] });
      setCreateOpen(false);
      setNewRoomNumber('');
    },
    onError: (err: any) => {
      toast('error', err?.response?.data?.message || 'Failed to create room. Please try again.');
    },
  });

  // Group rooms by floor for rack view
  const roomsByFloor = rooms.reduce<Record<string, Room[]>>((acc, r) => {
    const floor = r.floor ?? '1';
    (acc[floor] ??= []).push(r);
    return acc;
  }, {});

  if (!propertyId) {
    return <div className="flex items-center justify-center h-64 text-telivity-mid-grey">{t('rooms.selectProperty')}</div>;
  }

  return (
    <div>
      {/* Navigation tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-3 mb-6">
        <button
          onClick={() => navigate('/rooms')}
          className="px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 bg-telivity-teal text-white shadow-xs"
        >
          <DoorOpen size={16} /> All Rooms & Rack
        </button>
        <button
          onClick={() => navigate('/rooms/types')}
          className="px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 text-gray-600 hover:text-telivity-teal hover:bg-gray-100 transition"
        >
          <Tags size={16} /> Room Categories & Pricing
        </button>
        <button
          onClick={() => navigate('/direct-bookings')}
          className="ml-auto px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition shadow-2xs"
        >
          <Globe size={16} className="text-teal-600" /> 🛎️ Website Bookings
        </button>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <DoorOpen size={24} className="text-telivity-teal" />
        <h1 className="text-2xl font-semibold text-telivity-navy">{t('rooms.title')}</h1>
        <div className="ml-auto flex gap-2">
          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            <button onClick={() => setView('rack')} className={`p-2 ${view === 'rack' ? 'bg-telivity-teal text-white' : 'hover:bg-telivity-light-grey'}`}><LayoutGrid size={16} /></button>
            <button onClick={() => setView('list')} className={`p-2 ${view === 'list' ? 'bg-telivity-teal text-white' : 'hover:bg-telivity-light-grey'}`}><List size={16} /></button>
          </div>
          <button
            onClick={() => {
              if (!newRoomType && types.length > 0) {
                setNewRoomType(types[0].id);
              }
              setCreateOpen(true);
            }}
            className="flex items-center gap-2 bg-telivity-teal text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-telivity-light-teal transition-colors"
          >
            <Plus size={16} /> {t('rooms.addRoom')}
          </button>
        </div>
      </div>

      {/* Room status discrepancies */}
      {discrepancies.length > 0 && (
        <div className="bg-telivity-orange/10 border border-telivity-orange/30 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className="text-telivity-orange" />
            <h3 className="text-sm font-semibold text-telivity-navy">{t('rooms.discrepancies.title')}</h3>
            <span className="text-xs text-telivity-mid-grey ml-auto">{t('rooms.discrepancies.count', { count: discrepancies.length })}</span>
          </div>
          <ul className="space-y-2">
            {discrepancies.map((d: { roomId: string; roomNumber: string; kind: string; message: string }) => (
              <li key={`${d.roomId}-${d.kind}`} className="text-sm text-telivity-slate flex items-start gap-2">
                <span className="font-medium text-telivity-navy">{d.roomNumber}</span>
                <span>
                  {d.kind === 'occupied_without_reservation'
                    ? t('rooms.discrepancies.occupiedWithoutReservation')
                    : t('rooms.discrepancies.vacantWithReservation')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Status Summary */}
      {Array.isArray(summary) && summary.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {summary.map((s) => (
            <div key={s.status} className="bg-white rounded-lg shadow-sm px-3 py-2 flex items-center gap-2">
              <StatusBadge status={s.status} label={t(`dashboard.roomStatuses.${s.status}`, { defaultValue: s.status })} />
              <span className="text-sm font-semibold text-telivity-navy">{s.count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Rack View */}
      {view === 'rack' && (
        <div className="space-y-6">
          <p className="text-xs text-telivity-mid-grey">{t('rooms.diaryCaption', { date: today })}</p>
          {Object.entries(roomsByFloor).sort(([a], [b]) => Number(a) - Number(b)).map(([floor, floorRooms]) => (
            <div key={floor}>
              <h3 className="text-xs font-semibold text-telivity-mid-grey uppercase tracking-wider mb-2">{t('rooms.floorNumber', { floor })}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {floorRooms.sort((a, b) => a.number.localeCompare(b.number)).map((room) => {
                  const diary = diaryByRoomId.get(room.id);
                  return (
                    <div
                      key={room.id}
                      onClick={() => setDetailRoom(room)}
                      className={`border-2 rounded-xl p-3 cursor-pointer transition-all hover:shadow-md ${STATUS_CARD_COLORS[room.status] ?? 'border-gray-200'}`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-telivity-navy">Room {room.number}</p>
                        <span className="text-[10px] font-bold text-telivity-teal">
                          ₹{(types.find((t) => t.id === room.roomTypeId)?.basePrice || 3500).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <p className="text-[11px] text-telivity-slate font-medium truncate mt-0.5">
                        {room.roomTypeName || types.find((t) => t.id === room.roomTypeId)?.name || 'Deluxe King Room'}
                      </p>
                      <StatusBadge status={room.status} label={t(`dashboard.roomStatuses.${room.status}`, { defaultValue: room.status })} className="mt-1.5 text-[9px] px-1.5 py-0" />
                      {diary ? (
                        <>
                          <p className="text-[10px] text-telivity-slate mt-1 truncate font-medium">{diary.guestName ?? t('rooms.none')}</p>
                          <p className="text-[9px] text-telivity-mid-grey truncate">{diary.arrivalDate} → {diary.departureDate}</p>
                        </>
                      ) : room.guestName ? (
                        <p className="text-[10px] text-telivity-slate mt-1 truncate">{room.guestName}</p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {rooms.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center text-telivity-mid-grey">{t('rooms.noRoomsFound')}</div>
          )}
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-telivity-teal/5 border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-telivity-slate uppercase">{t('rooms.roomNumberHeader')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-telivity-slate uppercase">{t('rooms.type')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-telivity-slate uppercase">{t('rooms.floor')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-telivity-slate uppercase">{t('common.status')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-telivity-slate uppercase">{t('rooms.guest')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-telivity-slate uppercase">{t('rooms.diaryStay')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-telivity-slate uppercase">ADA</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((r, i) => {
                const diary = diaryByRoomId.get(r.id);
                return (
                  <tr key={r.id} onClick={() => setDetailRoom(r)} className={`border-b border-gray-50 cursor-pointer hover:bg-telivity-light-grey/50 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                    <td className="px-4 py-3 text-sm font-medium text-telivity-navy">{r.number}</td>
                    <td className="px-4 py-3 text-sm text-telivity-slate">{r.roomTypeName || types.find((t) => t.id === r.roomTypeId)?.name || 'Deluxe King Room'}</td>
                    <td className="px-4 py-3 text-sm text-telivity-slate">{r.floor ?? '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} label={t(`dashboard.roomStatuses.${r.status}`, { defaultValue: r.status })} /></td>
                    <td className="px-4 py-3 text-sm text-telivity-slate">{diary?.guestName ?? r.guestName ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-telivity-slate">
                      {diary ? `${diary.arrivalDate} → ${diary.departureDate}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm">{r.isAccessible ? t('common.yes') : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Room Detail Slide-Over */}
      {detailRoom && (
        <RoomDetailPanel
          key={detailRoom.id}
          room={detailRoom}
          propertyId={propertyId}
          diary={diaryByRoomId.get(detailRoom.id)}
          onClose={() => setDetailRoom(null)}
          onTransition={(s) => statusMutation.mutate({ roomId: detailRoom.id, newStatus: s })}
          transitioning={statusMutation.isPending}
          onCheckOutRoom={handleCheckOutRoom}
        />
      )}

      {/* Create Room Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title={t('rooms.addRoom')}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-telivity-slate mb-1">{t('rooms.roomNumberHeader')} *</label>
            <input
              type="text"
              value={newRoomNumber}
              onChange={(e) => {
                const val = e.target.value;
                setNewRoomNumber(val);
                if (val.length >= 3 && /^\d+$/.test(val)) {
                  setNewFloor(val[0]);
                }
              }}
              placeholder="e.g. 105, 204, 305"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ${isDuplicateNumber ? 'border-red-500 bg-red-50 text-red-900 font-bold' : 'border-gray-200 focus:border-telivity-teal'
                }`}
            />
            {isDuplicateNumber && (
              <p className="text-xs text-red-600 mt-1 font-semibold flex items-center gap-1">
                <AlertTriangle size={12} /> Room number "{newRoomNumber}" already exists! Duplicate room numbers are not allowed.
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-telivity-slate mb-1">{t('rooms.roomType')} (Room Category) *</label>
            <select
              value={newRoomType}
              onChange={(e) => setNewRoomType(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal font-medium bg-white"
            >
              <option value="">{t('rooms.selectType', { defaultValue: 'Select room category...' })}</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.code}) — ₹{(t.basePrice || t.baseAmount || (t.code === 'SUT' ? 6500 : t.code === 'STD' ? 2500 : 3500)).toLocaleString('en-IN')}/night
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-telivity-slate mb-1">{t('rooms.floor')}</label>
            <input
              type="number"
              value={newFloor}
              onChange={(e) => setNewFloor(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal"
            />
          </div>
          <button
            onClick={() => createMutation.mutate()}
            disabled={!newRoomNumber.trim() || isDuplicateNumber || createMutation.isPending}
            className="w-full bg-telivity-teal hover:bg-telivity-light-teal text-white rounded-lg px-4 py-2.5 text-sm font-bold shadow-xs disabled:opacity-50 transition"
          >
            {createMutation.isPending ? 'Creating Room...' : 'Create Room'}
          </button>
        </div>
      </Modal>

      {/* Checkout Modal */}
      {checkoutStay && (
        <CheckoutModal
          stay={checkoutStay}
          isOpen={Boolean(checkoutStay)}
          onClose={() => setCheckoutStay(null)}
          onCheckoutSuccess={(updatedStay) => {
            queryClient.invalidateQueries({ queryKey: ['stays'] });
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            queryClient.invalidateQueries({ queryKey: ['rooms', 'status-summary'] });
            queryClient.invalidateQueries({ queryKey: ['staff-notifications'] });
            setDetailRoom(null);
            setCheckoutStay(null);
            if (updatedStay && updatedStay.id) {
              setInvoiceStay(updatedStay);
            }
          }}
        />
      )}

      {/* Bill / Invoice Modal (Printable) */}
      {invoiceStay && invoiceStay.id && (
        <BillInvoiceModal
          stay={invoiceStay}
          isOpen={Boolean(invoiceStay)}
          onClose={() => setInvoiceStay(null)}
        />
      )}
    </div>
  );
}

// ---- Room Types ----
function RoomTypeList() {
  const { t } = useTranslation();
  const { propertyId } = useProperty();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Create modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [maxOcc, setMaxOcc] = useState(2);
  const [bedType, setBedType] = useState('king');
  const [amenitiesText, setAmenitiesText] = useState('wifi, tv, minibar, safe, air_conditioning');
  const [basePrice, setBasePrice] = useState('3500');

  // Edit modal state
  const [editType, setEditType] = useState<RoomType | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editMaxOcc, setEditMaxOcc] = useState(2);
  const [editBedType, setEditBedType] = useState('king');
  const [editAmenitiesText, setEditAmenitiesText] = useState('');
  const [editBasePrice, setEditBasePrice] = useState('3500');

  // Quick Price Editor modal state
  const [priceModalType, setPriceModalType] = useState<RoomType | null>(null);
  const [quickPriceValue, setQuickPriceValue] = useState<string>('3500');

  // Media gallery modal state
  const [photoType, setPhotoType] = useState<RoomType | null>(null);

  const { data } = useQuery({
    queryKey: ['rooms', 'types', propertyId],
    queryFn: () => api.get('/v1/rooms/types', { params: { propertyId } }).then((r) => r.data),
    enabled: !!propertyId,
  });

  const { data: ratePlansData } = useQuery({
    queryKey: ['rate-plans', propertyId],
    queryFn: () => api.get('/v1/rate-plans', { params: { propertyId } }).then((r) => r.data),
    enabled: !!propertyId,
  });

  const typesRaw = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
  const types: RoomType[] = typesRaw;
  const ratePlans: any[] = Array.isArray(ratePlansData?.data) ? ratePlansData.data : (Array.isArray(ratePlansData) ? ratePlansData : []);

  // Helper to find the BAR rate plan for a room type
  const getBarPlan = (roomTypeId: string) => {
    return ratePlans.find((rp) => (rp.roomTypeId === roomTypeId || rp.room_type_id === roomTypeId) && rp.type === 'bar')
      || ratePlans.find((rp) => rp.roomTypeId === roomTypeId || rp.room_type_id === roomTypeId);
  };

  const getPrice = (roomType: RoomType): number => {
    const bar = getBarPlan(roomType.id);
    if (bar?.baseAmount && !isNaN(Number(bar.baseAmount))) return Number(bar.baseAmount);
    if (bar?.baseRate && !isNaN(Number(bar.baseRate))) return Number(bar.baseRate);
    if (bar?.base_amount && !isNaN(Number(bar.base_amount))) return Number(bar.base_amount);
    if (bar?.base_rate && !isNaN(Number(bar.base_rate))) return Number(bar.base_rate);
    if (roomType.basePrice && !isNaN(Number(roomType.basePrice))) return Number(roomType.basePrice);
    if (roomType.baseAmount && !isNaN(Number(roomType.baseAmount))) return Number(roomType.baseAmount);
    if (roomType.price && !isNaN(Number(roomType.price))) return Number(roomType.price);
    return roomType.code === 'SUT' ? 2799 : roomType.code === 'EXE' ? 2199 : roomType.code === 'DLX' ? 1799 : 1599;
  };

  const quickPriceMutation = useMutation({
    mutationFn: async () => {
      if (!priceModalType) return;
      const bar = getBarPlan(priceModalType.id);
      const amount = Number(quickPriceValue);
      if (isNaN(amount) || amount <= 0) return;

      if (bar?.id) {
        await api.patch(
          `/v1/rate-plans/${bar.id}`,
          { baseAmount: amount, baseRate: amount, roomTypeId: priceModalType.id },
          { params: { propertyId } },
        );
      } else {
        await api.post(
          '/v1/rate-plans',
          {
            propertyId,
            roomTypeId: priceModalType.id,
            name: `${priceModalType.name} BAR`,
            code: `${priceModalType.code.toUpperCase()}-BAR`,
            type: 'bar',
            currencyCode: 'INR',
            baseAmount: amount,
            baseRate: amount,
          },
          { params: { propertyId } },
        );
      }
    },
    onSuccess: () => {
      const amount = Number(quickPriceValue);
      if (priceModalType && !isNaN(amount)) {
        // Optimistically update React Query cache for instant visual feedback
        queryClient.setQueryData(['rate-plans', propertyId], (old: any) => {
          if (!old) return old;
          const list = Array.isArray(old?.data) ? old.data : (Array.isArray(old) ? old : []);
          return list.map((rp: any) => {
            if (rp.roomTypeId === priceModalType.id || rp.room_type_id === priceModalType.id) {
              return { ...rp, baseAmount: amount, baseRate: amount, base_amount: amount, base_rate: amount };
            }
            return rp;
          });
        });

        queryClient.setQueryData(['rooms', 'types', propertyId], (old: any) => {
          if (!old) return old;
          const list = Array.isArray(old?.data) ? old.data : (Array.isArray(old) ? old : []);
          return list.map((rt: any) => {
            if (rt.id === priceModalType.id) {
              return { ...rt, basePrice: amount, baseAmount: amount, price: amount };
            }
            return rt;
          });
        });
      }
      queryClient.invalidateQueries({ queryKey: ['rooms', 'types'] });
      queryClient.invalidateQueries({ queryKey: ['rate-plans'] });
      toast('success', `Nightly price updated to ₹${Number(quickPriceValue).toLocaleString('en-IN')}!`);
      setPriceModalType(null);
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const amenities = amenitiesText
        .split(',')
        .map((a) => a.trim().toLowerCase().replace(/\s+/g, '_'))
        .filter(Boolean);

      const res = await api.post('/v1/rooms/types', {
        propertyId,
        name,
        code,
        description: description.trim() || undefined,
        maxOccupancy: maxOcc,
        defaultOccupancy: maxOcc,
        bedType,
        amenities,
      });

      const newType = res.data?.data ?? res.data;
      if (newType?.id && basePrice) {
        try {
          await api.post('/v1/rate-plans', {
            propertyId,
            roomTypeId: newType.id,
            name: `${name} BAR`,
            code: `${code.toUpperCase()}-BAR`,
            type: 'bar',
            currencyCode: 'INR',
            baseAmount: Number(basePrice) || 3500,
          });
        } catch (err) {
          console.warn('Could not auto-create rate plan:', err);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms', 'types'] });
      queryClient.invalidateQueries({ queryKey: ['rate-plans'] });
      toast('success', 'Room category created successfully!');
      setCreateOpen(false);
      setName('');
      setCode('');
      setDescription('');
      setAmenitiesText('wifi, tv, minibar, safe, air_conditioning');
      setBasePrice('3500');
    },
  });

  const openEdit = (roomType: RoomType) => {
    setEditType(roomType);
    setEditName(roomType.name);
    setEditDescription(roomType.description ?? '');
    setEditMaxOcc(roomType.maxOccupancy ?? 2);
    setEditBedType(roomType.bedType ?? 'king');
    setEditAmenitiesText((roomType.amenities ?? []).join(', '));
    setEditBasePrice(String(getPrice(roomType)));
  };

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editType) return;
      const amenities = editAmenitiesText
        .split(',')
        .map((a) => a.trim().toLowerCase().replace(/\s+/g, '_'))
        .filter(Boolean);

      await api.patch(
        `/v1/rooms/types/${editType.id}`,
        {
          name: editName,
          description: editDescription.trim() || undefined,
          maxOccupancy: editMaxOcc,
          defaultOccupancy: editMaxOcc,
          bedType: editBedType,
          amenities,
        },
        { params: { propertyId } },
      );

      // Update base price on BAR rate plan if provided
      if (editBasePrice) {
        const barPlan = getBarPlan(editType.id);
        const amount = Number(editBasePrice);
        if (barPlan) {
          await api.patch(
            `/v1/rate-plans/${barPlan.id}`,
            { baseAmount: amount, baseRate: amount, roomTypeId: editType.id },
            { params: { propertyId } },
          );
        } else {
          await api.post('/v1/rate-plans', {
            propertyId,
            roomTypeId: editType.id,
            name: `${editName} BAR`,
            code: `${editType.code.toUpperCase()}-BAR`,
            type: 'bar',
            currencyCode: 'INR',
            baseAmount: amount,
            baseRate: amount,
          });
        }
      }
    },
    onSuccess: () => {
      const amount = Number(editBasePrice);
      if (editType && !isNaN(amount)) {
        queryClient.setQueryData(['rate-plans', propertyId], (old: any) => {
          if (!old) return old;
          const list = Array.isArray(old?.data) ? old.data : (Array.isArray(old) ? old : []);
          return list.map((rp: any) => {
            if (rp.roomTypeId === editType.id || rp.room_type_id === editType.id) {
              return { ...rp, baseAmount: amount, baseRate: amount, base_amount: amount, base_rate: amount };
            }
            return rp;
          });
        });

        queryClient.setQueryData(['rooms', 'types', propertyId], (old: any) => {
          if (!old) return old;
          const list = Array.isArray(old?.data) ? old.data : (Array.isArray(old) ? old : []);
          return list.map((rt: any) => {
            if (rt.id === editType.id) {
              return { ...rt, name: editName, basePrice: amount, baseAmount: amount, price: amount };
            }
            return rt;
          });
        });
      }
      queryClient.invalidateQueries({ queryKey: ['rooms', 'types'] });
      queryClient.invalidateQueries({ queryKey: ['rate-plans'] });
      toast('success', 'Room category and pricing updated successfully!');
      setEditType(null);
    },
  });

  if (!propertyId) {
    return <div className="flex items-center justify-center h-64 text-telivity-mid-grey">{t('common.selectProperty')}</div>;
  }

  return (
    <div>
      {/* Navigation tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-3 mb-6">
        <button
          onClick={() => navigate('/rooms')}
          className="px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 text-gray-600 hover:text-telivity-teal hover:bg-gray-100 transition"
        >
          <DoorOpen size={16} /> All Rooms & Rack
        </button>
        <button
          onClick={() => navigate('/rooms/types')}
          className="px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 bg-telivity-teal text-white shadow-xs"
        >
          <Tags size={16} /> Room Categories & Pricing
        </button>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <Tags size={24} className="text-telivity-teal" />
        <div>
          <h1 className="text-2xl font-bold text-telivity-navy">Room Categories & Pricing</h1>
          <p className="text-xs text-gray-500">Manage room types, bed arrangements, guest capacities, and nightly base rates (INR ₹).</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="ml-auto flex items-center gap-2 bg-telivity-teal text-white rounded-lg px-4 py-2 text-sm font-bold hover:bg-telivity-light-teal transition-colors shadow-xs">
          <Plus size={16} /> Add Room Category
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-telivity-teal/5 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-bold text-telivity-navy uppercase">Category Name</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-telivity-navy uppercase">Code</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-telivity-navy uppercase">Bed & Guests</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-telivity-navy uppercase">Nightly Base Rate (₹ INR)</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-telivity-navy uppercase">Description & Amenities</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-telivity-navy uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {types.map((roomType, i) => {
              const currentPrice = getPrice(roomType);
              return (
                <tr key={roomType.id} className={`border-b border-gray-100 hover:bg-gray-50/70 transition ${i % 2 === 1 ? 'bg-gray-50/30' : ''}`}>
                  <td className="px-4 py-3 text-sm font-bold text-telivity-navy">
                    {roomType.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-telivity-slate font-mono text-xs font-semibold">
                    <span className="bg-gray-100 px-2 py-0.5 rounded border border-gray-200">{roomType.code}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-telivity-slate">
                    <div className="font-semibold text-gray-800 capitalize">{roomType.bedType ?? 'King'} Bed</div>
                    <div className="text-gray-500">Max {roomType.maxOccupancy ?? 2} Adults</div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold">
                      <IndianRupee size={14} className="text-emerald-700" />
                      <span>{currentPrice.toLocaleString('en-IN')}</span>
                      <span className="text-[11px] font-normal text-emerald-700">/ night</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-telivity-slate max-w-sm">
                    <p className="line-clamp-1 text-gray-600 mb-1" title={roomType.description ?? ''}>
                      {roomType.description || 'No description added yet.'}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {(Array.isArray(roomType.amenities)
                        ? roomType.amenities
                        : typeof roomType.amenities === 'string'
                          ? (roomType.amenities as string).split(',').map((x) => x.trim())
                          : []
                      ).slice(0, 4).map((a) => (
                        <span key={a} className="inline-block bg-teal-50 text-teal-800 border border-teal-100 rounded px-1.5 py-0.5 text-[10px] font-medium">
                          {a}
                        </span>
                      ))}
                      {(Array.isArray(roomType.amenities) ? roomType.amenities.length : 0) > 4 && (
                        <span className="text-[10px] text-gray-400 font-medium">+{(roomType.amenities as any[]).length - 4} more</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setPriceModalType(roomType);
                          setQuickPriceValue(String(currentPrice));
                        }}
                        className="flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200 border border-emerald-300 rounded-lg px-2.5 py-1.5 transition-colors shadow-xs"
                        title="Edit nightly price in INR ₹"
                      >
                        <IndianRupee size={12} className="text-emerald-700" /> Edit Price
                      </button>
                      <button
                        onClick={() => openEdit(roomType)}
                        className="flex items-center gap-1 text-xs font-semibold text-telivity-navy hover:text-telivity-teal bg-gray-100 hover:bg-gray-200 rounded-lg px-2.5 py-1.5 transition-colors"
                        title="Edit room category details, bed type, amenities & price"
                      >
                        <Pencil size={12} /> Edit
                      </button>
                      <button
                        onClick={() => setPhotoType(roomType)}
                        className="flex items-center gap-1 text-xs font-semibold text-white bg-telivity-teal hover:bg-telivity-light-teal rounded-lg px-2.5 py-1.5 transition-colors"
                        title="Manage photos"
                      >
                        <ImageIcon size={12} /> Photos
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {types.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-telivity-mid-grey">
                  {t('rooms.noRoomTypes')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Quick Price Editor Modal */}
      {priceModalType && (
        <Modal
          open={!!priceModalType}
          onClose={() => setPriceModalType(null)}
          title={`Edit Nightly Rate — ${priceModalType.name}`}
        >
          <div className="space-y-4">
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 text-xs text-teal-800">
              Update the standard Best Available Rate (BAR) in Indian Rupees (₹). This price takes effect across the Admin PMS and Guest Direct Booking Engine.
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Room Category
              </label>
              <div className="font-bold text-sm text-telivity-navy bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                {priceModalType.name} ({priceModalType.code}) · {priceModalType.bedType} bed · Max {priceModalType.maxOccupancy} guests
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Base Nightly Price (₹ INR) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-base text-gray-500 font-bold">₹</span>
                <input
                  type="number"
                  min={1}
                  step={50}
                  value={quickPriceValue}
                  onChange={(e) => setQuickPriceValue(e.target.value)}
                  placeholder="3500"
                  className="w-full pl-9 pr-3 py-2.5 border-2 border-emerald-400 rounded-lg text-lg font-bold text-gray-900 focus:outline-none focus:border-telivity-teal focus:ring-2 focus:ring-teal-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Quick Preset Rates
              </label>
              <div className="flex flex-wrap gap-2">
                {[1999, 2499, 2999, 3499, 3999, 4999, 6499, 7999].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setQuickPriceValue(String(amt))}
                    className={`px-2.5 py-1 text-xs rounded-md border font-medium transition ${quickPriceValue === String(amt)
                      ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                  >
                    ₹{amt.toLocaleString('en-IN')}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPriceModalType(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => quickPriceMutation.mutate()}
                disabled={!quickPriceValue || Number(quickPriceValue) <= 0 || quickPriceMutation.isPending}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-xs disabled:opacity-50 flex items-center gap-1.5 transition"
              >
                <Check size={16} />
                {quickPriceMutation.isPending ? 'Saving...' : 'Save Price (INR ₹)'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {photoType && propertyId && (
        <Modal open={!!photoType} onClose={() => setPhotoType(null)} title={t('rooms.photosForType', { name: photoType.name })} wide>
          <MediaGallery propertyId={propertyId} ownerType="room_type" ownerId={photoType.id} />
        </Modal>
      )}

      {/* Edit Category Modal */}
      {editType && (
        <Modal open={!!editType} onClose={() => setEditType(null)} title={`Edit Category: ${editType.name}`}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-telivity-slate mb-1">Category Name *</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-telivity-slate mb-1">Room Description (Shown on Website & WhatsApp)</label>
              <textarea
                rows={3}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Describe views, beds, comfort, and unique room highlights..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-telivity-slate mb-1">{t('rooms.maxOccupancy')}</label>
                <input
                  type="number"
                  min={1}
                  value={editMaxOcc}
                  onChange={(e) => setEditMaxOcc(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-telivity-slate mb-1">{t('rooms.bedType')}</label>
                <select
                  value={editBedType}
                  onChange={(e) => setEditBedType(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal capitalize"
                >
                  <option value="king">{t('rooms.bedTypes.king')}</option>
                  <option value="queen">{t('rooms.bedTypes.queen')}</option>
                  <option value="double">{t('rooms.bedTypes.double')}</option>
                  <option value="twin">{t('rooms.bedTypes.twin')}</option>
                  <option value="suite">{t('rooms.bedTypes.suite')}</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-telivity-slate mb-1">Base Price per Night (₹ INR) *</label>
              <div className="relative">
                <span className="absolute left-3.5 top-2 text-sm text-gray-500 font-bold">₹</span>
                <input
                  type="number"
                  min={0}
                  step={50}
                  value={editBasePrice}
                  onChange={(e) => setEditBasePrice(e.target.value)}
                  placeholder="3500"
                  className="w-full pl-8 pr-3 py-2 border-2 border-emerald-400 rounded-lg text-sm focus:outline-none focus:border-telivity-teal font-bold"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-telivity-slate mb-1">
                Amenities (Comma separated: wifi, tv, minibar, safe, balcony, bathtub, etc.)
              </label>
              <input
                type="text"
                value={editAmenitiesText}
                onChange={(e) => setEditAmenitiesText(e.target.value)}
                placeholder="wifi, tv, minibar, safe, air_conditioning"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal"
              />
            </div>
            <button
              onClick={() => editMutation.mutate()}
              disabled={!editName || editMutation.isPending}
              className="w-full bg-telivity-teal text-white rounded-lg px-4 py-2.5 text-sm font-bold hover:bg-telivity-light-teal disabled:opacity-50 transition-colors shadow-xs"
            >
              {editMutation.isPending ? t('common.saving') : 'Save Category & Price'}
            </button>
          </div>
        </Modal>
      )}

      {/* New Category Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add New Room Category">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-telivity-slate mb-1">{t('common.name')} *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Executive Club Suite"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-telivity-slate mb-1">{t('rooms.code')} *</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. ECS"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal font-mono uppercase"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-telivity-slate mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Room overview and highlights..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-telivity-slate mb-1">{t('rooms.maxOccupancy')}</label>
              <input
                type="number"
                min={1}
                value={maxOcc}
                onChange={(e) => setMaxOcc(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-telivity-slate mb-1">{t('rooms.bedType')}</label>
              <select
                value={bedType}
                onChange={(e) => setBedType(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal capitalize"
              >
                <option value="king">{t('rooms.bedTypes.king')}</option>
                <option value="queen">{t('rooms.bedTypes.queen')}</option>
                <option value="double">{t('rooms.bedTypes.double')}</option>
                <option value="twin">{t('rooms.bedTypes.twin')}</option>
                <option value="suite">{t('rooms.bedTypes.suite')}</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-telivity-slate mb-1">Base Price per Night (₹ INR) *</label>
            <div className="relative">
              <span className="absolute left-3.5 top-2 text-sm text-gray-500 font-bold">₹</span>
              <input
                type="number"
                min={1}
                step={50}
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                placeholder="3500"
                className="w-full pl-8 pr-3 py-2 border-2 border-emerald-400 rounded-lg text-sm focus:outline-none focus:border-telivity-teal font-bold"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-telivity-slate mb-1">
              Amenities (Comma separated)
            </label>
            <input
              type="text"
              value={amenitiesText}
              onChange={(e) => setAmenitiesText(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal"
            />
          </div>
          <button
            onClick={() => createMutation.mutate()}
            disabled={!name || !code || createMutation.isPending}
            className="w-full bg-telivity-teal text-white rounded-lg px-4 py-2.5 text-sm font-bold hover:bg-telivity-light-teal disabled:opacity-50 transition-colors shadow-xs"
          >
            {createMutation.isPending ? t('common.creating') : 'Create Category & Set Price'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default function Rooms() {
  return (
    <Routes>
      <Route index element={<RoomList />} />
      <Route path="types" element={<RoomTypeList />} />
    </Routes>
  );
}
