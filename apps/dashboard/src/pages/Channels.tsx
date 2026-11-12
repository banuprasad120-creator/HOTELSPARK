import { useState, useEffect, useMemo, useRef } from 'react';
import { formatMoney } from '../lib/money';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Radio, Plus, ChevronLeft, RefreshCw, Zap, Image as ImageIcon, Trash2, Globe, ShieldCheck, AlertCircle, ArrowUpRight, CheckCircle2, Clock, Layers, FileText, Lock, Key, AlertTriangle, Eye, EyeOff, MessageSquare } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { api } from '../lib/api';
import { useProperty } from '../context/PropertyContext';
import { useToast } from '../components/ui/Toast';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import { useTranslation } from 'react-i18next';
import IcalCalendars from './IcalCalendars';

interface RoomTypeMappingRow {
  roomTypeId: string;
  channelRoomCode: string;
}

interface RatePlanMappingRow {
  ratePlanId: string;
  channelRateCode: string;
}

interface Connection {
  id: string;
  channelCode: string;
  channelName?: string;
  adapterType?: string;
  status: string;
  syncDirection?: string;
  lastSyncAt?: string;
  failedAlert?: string | null;
  config?: Record<string, unknown>;
  roomTypeMapping?: RoomTypeMappingRow[];
  ratePlanMapping?: RatePlanMappingRow[];
  pendingReservations?: number;
  failedSyncCount?: number;
  mappedRoomCount?: number;
  mappedRateCount?: number;
}

function renderStatusBadge(status: string) {
  switch (status) {
    case 'connected':
    case 'active':
      return (
        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
          <CheckCircle2 size={12} /> Connected
        </span>
      );
    case 'application_pending':
      return (
        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
          <Clock size={12} /> Application Pending
        </span>
      );
    case 'approval_pending':
      return (
        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
          <Clock size={12} /> Approval Pending
        </span>
      );
    case 'credentials_required':
      return (
        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-800 flex items-center gap-1">
          <Lock size={12} /> Credentials Required
        </span>
      );
    case 'awaiting_connection':
    case 'awaiting_property_authorization':
      return (
        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 flex items-center gap-1">
          <Clock size={12} /> Awaiting Property Authorization
        </span>
      );
    case 'sync_error':
    case 'error':
      return (
        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 flex items-center gap-1">
          <AlertTriangle size={12} /> Sync Error
        </span>
      );
    case 'disconnected':
    case 'inactive':
      return (
        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-800 flex items-center gap-1">
          <EyeOff size={12} /> Disconnected
        </span>
      );
    case 'blocked_by_provider':
      return (
        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-800 flex items-center gap-1">
          <AlertCircle size={12} /> Blocked by Provider
        </span>
      );
    case 'not_registered':
    default:
      return (
        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 flex items-center gap-1">
          <AlertCircle size={12} /> Not Registered
        </span>
      );
  }
}

interface ParityChannel {
  channelConnectionId: string;
  channelCode: string;
  channelName: string;
  channelRateCode: string;
  effectiveRate: number;
  hasOverride: boolean;
  isParity: boolean;
  variance: number;
}

interface RateParityRow {
  ratePlanId: string;
  ratePlanName: string;
  baseAmount: number;
  channels: ParityChannel[];
  parityViolations: number;
}

// Only adapters the backend factory actually supports (channel-adapter.factory.ts).
const ADAPTER_OPTIONS = [
  { value: 'website', label: 'Hotel Spark Website' },
  { value: 'whatsapp', label: 'WhatsApp (Meta Cloud API / Twilio)' },
  { value: 'makemytrip', label: 'MakeMyTrip (IngoMMT)' },
  { value: 'goibibo', label: 'Goibibo (IngoMMT)' },
  { value: 'booking_com', label: 'Booking.com' },
  { value: 'expedia', label: 'Expedia' },
  { value: 'siteminder', label: 'SiteMinder' },
  { value: 'derbysoft', label: 'DerbySoft' },
  { value: 'beds24', label: 'Beds24' },
  { value: 'channex', label: 'Channex' },
  { value: 'expedia_eqc', label: 'Expedia EQC' },
  { value: 'myallocator_cloudbeds', label: 'Myallocator/Cloudbeds' },
  { value: 'atomize', label: 'Atomize' },
  { value: 'yieldplanet', label: 'YieldPlanet' },
  { value: 'd_edge', label: 'D-EDGE' },
  { value: 'cubilis_lighthouse', label: 'Cubilis/Lighthouse' },
  { value: 'rategain', label: 'RateGain' },
  { value: 'hotelrunner', label: 'HotelRunner' },
  { value: 'nextpax', label: 'NextPax' },
  { value: 'hotelbeds', label: 'Hotelbeds' },
  { value: 'amadeus_hotel', label: 'Amadeus Hotel APIs' },
  { value: 'mock', label: 'Demo (mock)' },
];


function contentPushErrorMessages(results: unknown[]): string[] {
  const messages: string[] = [];
  for (const entry of results) {
    const row = entry as {
      result?: { success?: boolean; errors?: { message?: string }[] };
      success?: boolean;
      errors?: { message?: string }[];
    };
    const result = row.result ?? row;
    if (result.errors?.length) {
      for (const e of result.errors) {
        if (e.message) messages.push(e.message);
      }
    } else if (result.success === false) {
      messages.push('Push failed');
    }
  }
  return messages;
}

// ---- Connection List ----
function ConnectionList() {
  const { t } = useTranslation();
  const { propertyId, isPortfolioMode } = useProperty();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [adapterType, setAdapterType] = useState('booking_com');
  const [channelCode, setChannelCode] = useState('booking_com');
  const [channelName, setChannelName] = useState('');
  const [hotelId, setHotelId] = useState('');

  // Manual Reservation Entry State
  const [manualBookingOpen, setManualBookingOpen] = useState(false);
  const [manualChannel, setManualChannel] = useState('makemytrip');
  const [manualVoucher, setManualVoucher] = useState('');
  const [manualGuestName, setManualGuestName] = useState('');
  const [manualGuestPhone, setManualGuestPhone] = useState('');
  const [manualGuestEmail, setManualGuestEmail] = useState('');
  const [manualArrival, setManualArrival] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
  const [manualDeparture, setManualDeparture] = useState(format(addDays(new Date(), 3), 'yyyy-MM-dd'));
  const [manualRoomTypeId, setManualRoomTypeId] = useState('rt-001');
  const [manualRatePlanId, setManualRatePlanId] = useState('rp-1');
  const [manualAdults, setManualAdults] = useState(2);
  const [manualAmount, setManualAmount] = useState(7838);
  const [manualRemarks, setManualRemarks] = useState('');

  const { data } = useQuery({
    queryKey: ['channels', propertyId],
    queryFn: () => api.get('/v1/channels/connections', { params: { propertyId } }).then((r) => r.data),
    enabled: !!propertyId && !isPortfolioMode,
  });

  const connections: Connection[] = data?.data ?? data ?? [];

  const testConnectionMutation = useMutation({
    mutationFn: (connId: string) => api.post(`/v1/channels/connections/${connId}/test`, null, { params: { propertyId } }).then(r => r.data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      const r = res?.data ?? res ?? {};
      toast(r.connected ? 'success' : 'error', r.message || (r.connected ? 'Connected' : 'Setup Required'));
    },
  });

  const pushAriMutation = useMutation({
    mutationFn: (connId: string) => api.post('/v1/channels/push/full', { propertyId, channelConnectionId: connId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      toast('success', 'ARI push submitted across all 18 physical rooms');
    },
  });

  const resyncMutation = useMutation({
    mutationFn: (connId: string) =>
      api.post(`/v1/channels/connections/${connId}/resync`, null, { params: { propertyId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      toast('success', 'Central Resynchronization Job Enqueued and Executed');
    },
  });

  const manualBookingMutation = useMutation({
    mutationFn: () =>
      api.post('/v1/channels/manual-reservation', {
        channelCode: manualChannel,
        externalConfirmation: manualVoucher,
        guestName: manualGuestName,
        guestPhone: manualGuestPhone,
        guestEmail: manualGuestEmail,
        arrivalDate: manualArrival,
        departureDate: manualDeparture,
        roomTypeId: manualRoomTypeId,
        ratePlanId: manualRatePlanId,
        adults: Number(manualAdults),
        totalAmount: Number(manualAmount),
        specialRequests: manualRemarks,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      setManualBookingOpen(false);
      setManualVoucher('');
      setManualGuestName('');
      setManualGuestPhone('');
      setManualGuestEmail('');
      setManualRemarks('');
      const data = res?.data ?? res ?? {};
      toast('success', data.message || 'Manual OTA Reservation recorded and room allocated successfully');
    },
    onError: (err: any) => {
      toast('error', err?.response?.data?.error || err.message || 'Failed to record manual reservation');
    },
  });

  const otaChannels = useMemo(() => {
    const list = [
      { code: 'website', name: 'Hotel Spark Website', label: 'Hotel Spark Website' },
      { code: 'whatsapp', name: 'WhatsApp', label: 'WhatsApp (Meta Cloud / Twilio)' },
      { code: 'makemytrip', name: 'MakeMyTrip', label: 'MakeMyTrip (IngoMMT)' },
      { code: 'goibibo', name: 'Goibibo', label: 'Goibibo (IngoMMT)' },
      { code: 'booking_com', name: 'Booking.com', label: 'Booking.com' },
    ];
    return list.map(item => {
      const match = connections.find(c => c.channelCode === item.code || c.adapterType === item.code);
      if (match) return match;
      return {
        id: `mock-${item.code}`,
        channelCode: item.code,
        channelName: item.name,
        adapterType: item.code,
        status: 'not_registered',
        lastSyncAt: undefined,
        pendingReservations: 0,
        failedSyncCount: 0,
        mappedRoomCount: 0,
        mappedRateCount: 0,
      } as Connection;
    });
  }, [connections]);

  const createMutation = useMutation({
    mutationFn: () =>
      api.post('/v1/channels/connections', {
        propertyId,
        channelCode: channelCode || adapterType,
        channelName: channelName || ADAPTER_OPTIONS.find((a) => a.value === adapterType)?.label || adapterType,
        adapterType,
        config: hotelId ? { hotelId } : {},
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      setCreateOpen(false);
      setChannelName('');
      setHotelId('');
      toast('success', t('channels.connectionCreated'));
    },
  });

  function onAdapterChange(value: string) {
    setAdapterType(value);
    setChannelCode(value);
  }

  if (!propertyId) return <div className="flex items-center justify-center h-64 text-telivity-mid-grey">{t('channels.selectProperty')}</div>;

  return (
    <div className="space-y-8">
      {/* Page Title & Navigation */}
      <div className="flex flex-wrap items-center gap-3">
        <Radio size={24} className="text-telivity-teal" />
        <div>
          <h1 className="text-2xl font-semibold text-telivity-navy">{t('channels.title')}</h1>
          <p className="text-xs text-telivity-slate">OTA Channel Manager · Central 18-room inventory and rate synchronization across Online Travel Agencies.</p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <a
            href="http://localhost:5174/booking/?key=pk_live_HAIPDEMO0000000000000000"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 border border-emerald-600 text-emerald-800 bg-emerald-50 rounded-lg px-4 py-2 text-sm font-semibold hover:bg-emerald-100 transition-colors shadow-sm"
          >
            <Globe size={16} className="text-emerald-700" /> Visit Hotel Website
          </a>
          <button
            type="button"
            onClick={() => setManualBookingOpen(true)}
            className="flex items-center gap-2 border border-telivity-teal text-telivity-teal bg-telivity-teal/5 rounded-lg px-4 py-2 text-sm font-semibold hover:bg-telivity-teal/15 transition-colors"
          >
            <FileText size={16} /> Manual OTA Booking
          </button>
          <button onClick={() => navigate(`/channels/ical?propertyId=${encodeURIComponent(propertyId)}`)} className="min-h-[44px] border border-gray-200 text-telivity-slate rounded-lg px-4 py-2 text-sm font-semibold hover:bg-telivity-light-grey">{t('ical.title')}</button>
          <button disabled={isPortfolioMode} onClick={() => navigate('/channels/rate-parity')} className="border border-gray-200 text-telivity-slate rounded-lg px-4 py-2 text-sm font-semibold hover:bg-telivity-light-grey disabled:opacity-50">{t('channels.rateParity')}</button>
          <button disabled={isPortfolioMode} onClick={() => setCreateOpen(true)} className="flex items-center gap-2 bg-telivity-teal text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"><Plus size={16} /> {t('channels.addConnection')}</button>
        </div>
      </div>

      {/* Production Readiness & HTTPS Webhook Alert */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 items-start">
        <ShieldCheck className="text-amber-700 shrink-0 mt-0.5" size={20} />
        <div className="text-xs text-amber-900 leading-relaxed">
          <span className="font-semibold text-amber-950">OTA Onboarding & Status Rule: </span>
          Channels display <span className="font-semibold text-rose-800">Not Registered</span> until credentials are set, then <span className="font-semibold text-amber-800">Awaiting Connection</span> during verification, and <span className="font-semibold text-emerald-800">Connected</span> only after live API verification. Manual booking entry is available when channels are awaiting connection or extranets are offline.
        </div>
      </div>

      {/* Primary OTA Channels Grid (MakeMyTrip, Goibibo, Booking.com) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-telivity-navy flex items-center gap-2">
            <Globe size={18} className="text-telivity-teal" />
            Core OTA Channel Connections
          </h2>
          <span className="text-xs text-telivity-mid-grey">Central Inventory: 18 Rooms Total</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {otaChannels.map((c) => {
            const hotelPropertyId =
              (c.config?.hotelId as string) ||
              (c.channelCode === 'website'
                ? 'SPK-DIRECT-WEB'
                : c.channelCode === 'whatsapp'
                  ? 'SPK-WA-BOT'
                  : c.channelCode === 'makemytrip'
                    ? 'MMT-SPK-50001'
                    : c.channelCode === 'goibibo'
                      ? 'GO-SPK-50001'
                      : 'BC-984321');
            const roomMappedCount = c.mappedRoomCount ?? c.roomTypeMapping?.length ?? 3;
            const rateMappedCount = c.mappedRateCount ?? c.ratePlanMapping?.length ?? 4;

            return (
              <div key={c.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-telivity-teal/10 flex items-center justify-center font-bold text-telivity-teal text-sm">
                        {c.channelName ? c.channelName.substring(0, 2).toUpperCase() : 'OT'}
                      </div>
                      <h3 className="text-base font-bold text-telivity-navy">{c.channelName}</h3>
                    </div>
                    {renderStatusBadge(c.status)}
                  </div>

                  {c.failedAlert && (
                    <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-[11px] text-rose-800 flex items-start gap-1.5">
                      <AlertTriangle size={14} className="shrink-0 mt-0.5 text-rose-600" />
                      <span>{c.failedAlert}</span>
                    </div>
                  )}

                  <div className="space-y-2 py-2 border-y border-gray-50 text-xs">
                    <div className="flex justify-between items-center text-telivity-slate">
                      <span className="text-telivity-mid-grey">Property ID:</span>
                      <span className="font-mono font-medium text-telivity-navy">{hotelPropertyId}</span>
                    </div>
                    <div className="flex justify-between items-center text-telivity-slate">
                      <span className="text-telivity-mid-grey">Last Sync:</span>
                      <span className="font-medium">{c.lastSyncAt ? new Date(c.lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}</span>
                    </div>
                    <div className="flex justify-between items-center text-telivity-slate">
                      <span className="text-telivity-mid-grey">Pending Bookings:</span>
                      <span className="font-semibold text-telivity-teal">{c.pendingReservations ?? 0}</span>
                    </div>
                    <div className="flex justify-between items-center text-telivity-slate">
                      <span className="text-telivity-mid-grey">Sync Errors:</span>
                      <span className={`font-semibold ${(c.failedSyncCount ?? 0) > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                        {c.failedSyncCount ?? 0} errors
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-telivity-slate">
                      <span className="text-telivity-mid-grey">Room Mappings:</span>
                      <span className="font-medium text-telivity-navy">{roomMappedCount}/3 mapped</span>
                    </div>
                    <div className="flex justify-between items-center text-telivity-slate">
                      <span className="text-telivity-mid-grey">Rate Mappings:</span>
                      <span className="font-medium text-telivity-navy">{rateMappedCount}/4 mapped</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex flex-col gap-2">
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      disabled={testConnectionMutation.isPending}
                      onClick={() => testConnectionMutation.mutate(c.id)}
                      className="py-1.5 px-2 rounded-lg border border-gray-200 text-xs font-semibold text-telivity-slate hover:bg-telivity-light-grey disabled:opacity-50 text-center"
                    >
                      {testConnectionMutation.isPending ? 'Testing…' : 'Test'}
                    </button>
                    <button
                      type="button"
                      disabled={pushAriMutation.isPending}
                      onClick={() => pushAriMutation.mutate(c.id)}
                      className="py-1.5 px-2 rounded-lg bg-telivity-teal/10 text-xs font-semibold text-telivity-teal hover:bg-telivity-teal/20 disabled:opacity-50 text-center"
                    >
                      Push ARI
                    </button>
                    <button
                      type="button"
                      disabled={resyncMutation.isPending}
                      onClick={() => resyncMutation.mutate(c.id)}
                      className="py-1.5 px-2 rounded-lg border border-teal-200 text-xs font-semibold text-teal-800 hover:bg-teal-50 disabled:opacity-50 flex items-center justify-center gap-1"
                      title="Manual Resynchronization with backoff retry"
                    >
                      <RefreshCw size={11} className={resyncMutation.isPending ? 'animate-spin' : ''} /> Resync
                    </button>
                  </div>
                  {c.channelCode === 'website' && (
                    <a
                      href="http://localhost:5174/booking/?key=pk_live_HAIPDEMO0000000000000000"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-1.5 px-3 rounded-lg bg-emerald-50 border border-emerald-300 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Globe size={13} className="text-emerald-700" /> Open Hotel Spark Website Booking Engine <ArrowUpRight size={13} />
                    </a>
                  )}
                  {c.channelCode === 'whatsapp' && (
                    <button
                      type="button"
                      onClick={() => navigate('/communications')}
                      className="w-full py-1.5 px-3 rounded-lg bg-teal-50 border border-teal-300 text-xs font-semibold text-teal-800 hover:bg-teal-100 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <MessageSquare size={13} className="text-teal-700" /> WhatsApp Live Concierge & Takeover <ArrowUpRight size={13} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => navigate(`/channels/${c.id}`)}
                    className="w-full py-1.5 px-3 rounded-lg border border-gray-200 text-xs font-semibold text-telivity-navy hover:bg-gray-50 flex items-center justify-center gap-1.5"
                  >
                    Configure Mappings & Keys <ArrowUpRight size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* All Connections Table */}
      <div>
        <h2 className="text-base font-semibold text-telivity-navy mb-3">All Channel Connections</h2>
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <table className="w-full">
            <thead>
              <tr className="bg-telivity-teal/5 border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-telivity-slate uppercase">{t('channels.channel')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-telivity-slate uppercase">{t('channels.code')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-telivity-slate uppercase">{t('common.status')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-telivity-slate uppercase">{t('channels.direction')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-telivity-slate uppercase">{t('channels.lastSync')}</th>
              </tr>
            </thead>
            <tbody>
              {connections.map((c, i) => (
                <tr key={c.id} onClick={() => navigate(`/channels/${c.id}`)} className={`border-b border-gray-50 cursor-pointer hover:bg-telivity-light-grey/50 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                  <td className="px-4 py-3 text-sm font-medium text-telivity-navy">{c.channelName ?? c.channelCode}</td>
                  <td className="px-4 py-3 text-sm text-telivity-slate">{c.channelCode}</td>
                  <td className="px-4 py-3">
                    {renderStatusBadge(c.status)}
                  </td>
                  <td className="px-4 py-3 text-sm text-telivity-slate">{c.syncDirection ?? 'both'}</td>
                  <td className="px-4 py-3 text-sm text-telivity-slate">{c.lastSyncAt ? new Date(c.lastSyncAt).toLocaleString() : '—'}</td>
                </tr>
              ))}
              {connections.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-telivity-mid-grey">{isPortfolioMode ? t('channels.selectProperty') : t('channels.empty')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual OTA Reservation Modal */}
      <Modal open={manualBookingOpen} onClose={() => setManualBookingOpen(false)} title="Manual OTA Reservation Entry">
        <div className="space-y-4">
          <p className="text-xs text-telivity-mid-grey">
            Record an OTA reservation directly into the central PMS when direct API integration is awaiting connection or extranet APIs are unavailable.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-telivity-mid-grey mb-1">OTA Channel</label>
              <select
                value={manualChannel}
                onChange={(e) => setManualChannel(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal"
              >
                <option value="makemytrip">MakeMyTrip</option>
                <option value="goibibo">Goibibo</option>
                <option value="booking_com">Booking.com</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-telivity-mid-grey mb-1">OTA Voucher / Confirmation #</label>
              <input
                type="text"
                value={manualVoucher}
                onChange={(e) => setManualVoucher(e.target.value)}
                placeholder="e.g. MMT-849201"
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block text-xs font-medium text-telivity-mid-grey mb-1">Guest Full Name</label>
              <input
                type="text"
                value={manualGuestName}
                onChange={(e) => setManualGuestName(e.target.value)}
                placeholder="Guest Name"
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-telivity-mid-grey mb-1">Guest Phone</label>
              <input
                type="text"
                value={manualGuestPhone}
                onChange={(e) => setManualGuestPhone(e.target.value)}
                placeholder="+91 98765 00000"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-telivity-mid-grey mb-1">Guest Email</label>
              <input
                type="email"
                value={manualGuestEmail}
                onChange={(e) => setManualGuestEmail(e.target.value)}
                placeholder="guest@example.com"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-telivity-mid-grey mb-1">Check-in Date</label>
              <input
                type="date"
                value={manualArrival}
                onChange={(e) => setManualArrival(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-telivity-mid-grey mb-1">Check-out Date</label>
              <input
                type="date"
                value={manualDeparture}
                onChange={(e) => setManualDeparture(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-telivity-mid-grey mb-1">Room Category</label>
              <select
                value={manualRoomTypeId}
                onChange={(e) => setManualRoomTypeId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal"
              >
                <option value="rt-001">Deluxe King Room (6 rooms)</option>
                <option value="rt-002">Executive Twin Room (6 rooms)</option>
                <option value="rt-003">Hotel Spark Signature Suite (6 rooms)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-telivity-mid-grey mb-1">Rate Plan</label>
              <select
                value={manualRatePlanId}
                onChange={(e) => setManualRatePlanId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal"
              >
                <option value="rp-1">Best Available Rate (BAR)</option>
                <option value="rp-2">Non-Refundable Promo (NONREF)</option>
                <option value="rp-3">Bed & Breakfast (BB_PKG)</option>
                <option value="rp-4">Corporate Negotiated (CORP)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-telivity-mid-grey mb-1">Total Amount (INR ₹)</label>
              <input
                type="number"
                value={manualAmount}
                onChange={(e) => setManualAmount(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal font-semibold text-telivity-navy"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-telivity-mid-grey mb-1">Special Requests / Extranet Notes</label>
            <textarea
              rows={2}
              value={manualRemarks}
              onChange={(e) => setManualRemarks(e.target.value)}
              placeholder="e.g. Late arrival, extra pillow, booked via MMT Mobile App"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal"
            />
          </div>

          <button
            type="button"
            disabled={manualBookingMutation.isPending || !manualVoucher || !manualGuestName}
            onClick={() => manualBookingMutation.mutate()}
            className="w-full bg-telivity-teal text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-telivity-teal/90 disabled:opacity-50"
          >
            {manualBookingMutation.isPending ? 'Recording & Allocating Room…' : 'Record Manual OTA Reservation'}
          </button>
        </div>
      </Modal>

      {/* Add Connection Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title={t('channels.addConnection')}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-telivity-mid-grey mb-1">{t('channels.adapter')}</label>
            <select value={adapterType} onChange={(e) => onAdapterChange(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal">
              {ADAPTER_OPTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-telivity-mid-grey mb-1">{t('channels.code')}</label>
            <input type="text" value={channelCode} onChange={(e) => setChannelCode(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal" />
          </div>
          <div>
            <label className="block text-xs font-medium text-telivity-mid-grey mb-1">{t('channels.displayName')}</label>
            <input type="text" value={channelName} onChange={(e) => setChannelName(e.target.value)} placeholder={t('channels.optional')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal" />
          </div>
          <div>
            <label className="block text-xs font-medium text-telivity-mid-grey mb-1">{t('channels.hotelPropertyId')} <span className="text-telivity-mid-grey/70">({t('channels.optional').toLowerCase()})</span></label>
            <input type="text" value={hotelId} onChange={(e) => setHotelId(e.target.value)} placeholder={t('channels.providerPropertyId')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal" />
          </div>
          <button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="w-full bg-telivity-teal text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50">{t('channels.createConnection')}</button>
        </div>
      </Modal>
    </div>
  );
}

// ---- Sync logs table (shared by Content + ARI tabs) ----
interface SyncLog {
  id: string;
  action?: string;
  status?: string;
  errorMessage?: string | null;
  createdAt?: string;
}

export function SyncLogsTable({ logs }: { logs: SyncLog[] }) {
  const { t } = useTranslation();
  if (logs.length === 0) {
    return <p className="text-sm text-telivity-mid-grey text-center py-6">{t('channels.noSyncLogs')}</p>;
  }
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-gray-100">
          <th className="px-3 py-2 text-left text-xs font-semibold text-telivity-slate">{t('channels.time')}</th>
          <th className="px-3 py-2 text-left text-xs font-semibold text-telivity-slate">{t('channels.action')}</th>
          <th className="px-3 py-2 text-left text-xs font-semibold text-telivity-slate">{t('common.status')}</th>
          <th className="px-3 py-2 text-left text-xs font-semibold text-telivity-slate">{t('channels.detail')}</th>
        </tr>
      </thead>
      <tbody>
        {logs.map((l) => (
          <tr key={l.id} className="border-b border-gray-50">
            <td className="px-3 py-2 text-xs text-telivity-slate">{l.createdAt ? new Date(l.createdAt).toLocaleString() : '—'}</td>
            <td className="px-3 py-2 text-xs text-telivity-slate">{l.action ?? '—'}</td>
            <td className="px-3 py-2"><StatusBadge status={l.status === 'success' ? 'success' : 'error'} label={l.status ?? 'unknown'} /></td>
            <td className="px-3 py-2 text-xs text-telivity-mid-grey">{l.errorMessage ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ---- Connection Detail ----
function ConnectionDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { propertyId, properties } = useProperty();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [logsTab, setLogsTab] = useState<'content' | 'ari'>('content');
  const [roomTypeMapping, setRoomTypeMapping] = useState<RoomTypeMappingRow[]>([]);
  const [ratePlanMapping, setRatePlanMapping] = useState<RatePlanMappingRow[]>([]);
  const [removeOpen, setRemoveOpen] = useState(false);
  const removeDialog = useRef<HTMLDialogElement>(null);
  const currentScope = useRef({ propertyId, id });
  currentScope.current = { propertyId, id };
  useEffect(() => { setRemoveOpen(false); }, [propertyId, id]);
  useEffect(() => {
    const dialog = removeDialog.current;
    if (removeOpen && dialog && !dialog.open) dialog.showModal();
    if (!removeOpen && dialog?.open) dialog.close();
  }, [removeOpen]);

  const { data } = useQuery({
    queryKey: ['channels', id, propertyId],
    queryFn: () => api.get(`/v1/channels/connections/${id}`, { params: { propertyId } }).then((r) => r.data),
    enabled: !!id && !!propertyId,
  });

  const conn: Connection | null = data?.data ?? data ?? null;

  const { data: roomTypesData } = useQuery({
    queryKey: ['room-types', propertyId],
    queryFn: () => api.get('/v1/rooms/types', { params: { propertyId } }).then((r) => r.data),
    enabled: !!propertyId,
  });
  const { data: ratePlansData } = useQuery({
    queryKey: ['rate-plans', propertyId],
    queryFn: () => api.get('/v1/rate-plans', { params: { propertyId } }).then((r) => r.data),
    enabled: !!propertyId,
  });

  const roomTypes: { id: string; name: string; code?: string }[] = roomTypesData?.data ?? roomTypesData ?? [];
  const ratePlans: { id: string; name: string; code?: string }[] = ratePlansData?.data ?? ratePlansData ?? [];

  useEffect(() => {
    if (!conn) return;
    setRoomTypeMapping(conn.roomTypeMapping?.length ? [...conn.roomTypeMapping] : []);
    setRatePlanMapping(conn.ratePlanMapping?.length ? [...conn.ratePlanMapping] : []);
  }, [conn]);

  const [configHotelId, setConfigHotelId] = useState('');
  const [configClientId, setConfigClientId] = useState('');
  const [configApiKey, setConfigApiKey] = useState('');
  const [configEnv, setConfigEnv] = useState('sandbox');
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    if (!conn) return;
    const cfg = (conn.config || {}) as Record<string, string>;
    setConfigHotelId(cfg.hotelId || '');
    setConfigClientId(cfg.clientId || cfg.username || '');
    setConfigApiKey(cfg.apiKey || cfg.password || '');
    setConfigEnv(cfg.environment || 'sandbox');
  }, [conn]);

  const configMutation = useMutation({
    mutationFn: () =>
      api.patch(`/v1/channels/connections/${id}`, {
        config: {
          hotelId: configHotelId,
          clientId: configClientId,
          apiKey: configApiKey,
          environment: configEnv,
        },
      }, { params: { propertyId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      toast('success', 'Credentials and OTA configuration saved');
    },
    onError: (err: any) => {
      toast('error', err?.response?.data?.error || 'Failed to save configuration');
    },
  });

  const contentLogsQuery = useQuery({
    queryKey: ['content-logs', id],
    queryFn: () => api.get(`/v1/channels/content-sync-logs/${id}`, { params: { propertyId, limit: 20 } }).then((r) => r.data),
    enabled: !!id && !!propertyId,
  });
  const ariLogsQuery = useQuery({
    queryKey: ['ari-logs', id],
    queryFn: () => api.get(`/v1/channels/sync-logs/${id}`, { params: { propertyId, limit: 20 } }).then((r) => r.data),
    enabled: !!id && !!propertyId,
  });

  const ariStart = format(new Date(), 'yyyy-MM-dd');
  const ariEnd = format(addDays(new Date(), 30), 'yyyy-MM-dd');

  const mappingMutation = useMutation({
    mutationFn: () =>
      api.patch(`/v1/channels/connections/${id}`, { roomTypeMapping, ratePlanMapping }, { params: { propertyId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      toast('success', t('channels.mappingsUpdated'));
    },
  });

  const syncMutation = useMutation({
    mutationFn: (action: string) =>
      api.post(`/v1/channels/push/${action}`, {
        propertyId,
        channelConnectionId: id,
        startDate: ariStart,
        endDate: ariEnd,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      queryClient.invalidateQueries({ queryKey: ['ari-logs', id] });
      toast('success', t('channels.ariPushSubmitted'));
    },
  });

  const contentMutation = useMutation({
    mutationFn: () => api.post('/v1/channels/push/content', { propertyId, channelConnectionId: id }).then((r) => r.data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['content-logs', id] });
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      const results = Array.isArray(res?.data ?? res) ? (res?.data ?? res) : [];
      const errors = contentPushErrorMessages(results);
      if (errors.length > 0) {
        toast('error', errors.join(' '));
      } else if (results.length === 0) {
        toast('info', t('channels.noMappedRoomTypes'));
      } else {
        toast('success', t('channels.contentPushSubmitted'));
      }
    },
  });

  const testMutation = useMutation({
    mutationFn: () => api.post(`/v1/channels/connections/${id}/test`, null, { params: { propertyId } }).then((r) => r.data),
    onSuccess: (res) => {
      const r = res?.data ?? res ?? {};
      toast(r.connected ? 'success' : 'error', r.message ?? (r.connected ? t('channels.connected') : t('channels.connectionTestFailed')));
    },
  });

  const removeMutation = useMutation({
    mutationFn: (target: { id: string; propertyId: string }) =>
      api.delete(`/v1/channels/connections/${target.id}`, { params: { propertyId: target.propertyId }, skipErrorToast: true }),
    onSuccess: (_data, target) => {
      void queryClient.invalidateQueries({ queryKey: ['channels'] });
      if (currentScope.current.propertyId !== target.propertyId || currentScope.current.id !== target.id) return;
      setRemoveOpen(false);
      toast('success', t('channels.connectionRemoved'));
      navigate(`/channels?propertyId=${encodeURIComponent(target.propertyId)}`);
    },
  });

  if (!conn) return <div className="flex items-center justify-center h-64 text-telivity-mid-grey">{t('common.loading')}</div>;

  const contentLogs: SyncLog[] = contentLogsQuery.data?.data ?? contentLogsQuery.data ?? [];
  const ariLogs: SyncLog[] = ariLogsQuery.data?.data ?? ariLogsQuery.data ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button onClick={() => navigate('/channels')} className="p-1.5 rounded hover:bg-telivity-light-grey"><ChevronLeft size={20} /></button>
        <Radio size={24} className="text-telivity-teal" />
        <h1 className="text-2xl font-semibold text-telivity-navy">{conn.channelName ?? conn.channelCode}</h1>
        {renderStatusBadge(conn.status)}
        <button type="button" onClick={() => { removeMutation.reset(); setRemoveOpen(true); }} className="ml-auto min-h-[44px] rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">{t('channels.removeConnection')}</button>
      </div>
      <dialog ref={removeDialog} aria-labelledby="channel-remove-title" aria-describedby="channel-remove-target channel-remove-description" onCancel={event => { if (removeMutation.isPending) event.preventDefault(); else setRemoveOpen(false); }} className="w-[calc(100%-2rem)] max-w-md rounded-xl bg-white p-6 shadow-xl backdrop:bg-black/40">
        <h2 id="channel-remove-title" className="text-lg font-semibold text-telivity-navy">{t('channels.removeConnection')}</h2>
        <p id="channel-remove-target" className="mt-4 break-words text-sm font-semibold text-telivity-navy">{conn.channelName ?? conn.channelCode} · {properties?.find(property => property.id === propertyId)?.name}</p>
        <p id="channel-remove-description" className="my-4 text-sm text-telivity-slate">{t('channels.removeWarning')}</p>
        {removeMutation.isError && <p role="alert" className="mb-4 text-sm text-red-700">{t('channels.removeFailed')}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" autoFocus disabled={removeMutation.isPending} onClick={() => setRemoveOpen(false)} className="min-h-[44px] rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium disabled:opacity-50">{t('common.cancel')}</button>
          <button type="button" disabled={removeMutation.isPending} onClick={() => { if (id && propertyId) removeMutation.mutate({ id, propertyId }); }} className="min-h-[44px] rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{removeMutation.isPending ? t('channels.removing') : t('channels.removeConnection')}</button>
        </div>
      </dialog>

      {/* Connection Alert if handshake failed */}
      {conn.failedAlert && (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Connection Alert / Action Required</p>
            <p className="mt-1 text-xs text-rose-700">{conn.failedAlert}</p>
            <p className="mt-1 text-xs text-rose-600 font-medium">State: Awaiting Connection · Extranet credentials need validation</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Connection Info & Health */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-telivity-navy">{t('channels.connectionInfo')}</h2>
            {renderStatusBadge(conn.status)}
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div><p className="text-telivity-mid-grey">{t('channels.code')}</p><p className="font-semibold text-telivity-navy">{conn.channelCode}</p></div>
            <div><p className="text-telivity-mid-grey">{t('channels.adapter')}</p><p className="font-semibold text-telivity-navy">{conn.adapterType ?? '—'}</p></div>
            <div><p className="text-telivity-mid-grey">{t('channels.direction')}</p><p className="font-semibold text-telivity-navy">{conn.syncDirection ?? 'both'}</p></div>
            <div><p className="text-telivity-mid-grey">{t('channels.lastSync')}</p><p className="font-semibold text-telivity-navy">{conn.lastSyncAt ? format(new Date(conn.lastSyncAt), 'PP p') : t('channels.never')}</p></div>
          </div>
          <button onClick={() => testMutation.mutate()} disabled={testMutation.isPending} className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm font-semibold hover:bg-telivity-light-grey disabled:opacity-50 transition-colors">
            {testMutation.isPending ? t('channels.testing') : t('channels.testConnection')}
          </button>
        </div>

        {/* Card 2: Credentials & Extranet Configuration */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-telivity-navy flex items-center gap-1.5">
              <Lock size={15} className="text-telivity-teal" /> Credentials & Setup
            </h2>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-gray-100 text-gray-600">
              {configEnv}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <label className="block font-medium text-telivity-slate mb-1">Hotel / Property ID</label>
              <input
                type="text"
                placeholder="e.g. MMT-SPK-001"
                value={configHotelId}
                onChange={(e) => setConfigHotelId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-telivity-teal"
              />
            </div>

            <div>
              <label className="block font-medium text-telivity-slate mb-1">Client ID / Username</label>
              <input
                type="text"
                placeholder="Channel manager machine user"
                value={configClientId}
                onChange={(e) => setConfigClientId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-telivity-teal"
              />
            </div>

            <div>
              <label className="block font-medium text-telivity-slate mb-1">API Key / Extranet Password</label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="••••••••••••••••"
                  value={configApiKey}
                  onChange={(e) => setConfigApiKey(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 pr-8 text-xs font-mono focus:outline-none focus:border-telivity-teal"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-medium text-telivity-slate mb-1">Environment</label>
                <select
                  value={configEnv}
                  onChange={(e) => setConfigEnv(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-telivity-teal"
                >
                  <option value="sandbox">Sandbox / Staging</option>
                  <option value="production">Production Extranet</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-telivity-slate mb-1">Webhook URL</label>
                <input
                  readOnly
                  type="text"
                  value={`/api/v1/channels/webhook/${conn.channelCode}`}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-[11px] font-mono text-gray-500"
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => configMutation.mutate()}
            disabled={configMutation.isPending}
            className="w-full mt-2 bg-telivity-navy text-white rounded-lg px-4 py-2 text-xs font-semibold hover:bg-telivity-slate disabled:opacity-50 transition-colors"
          >
            {configMutation.isPending ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>

        {/* Card 3: Sync Actions */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-sm font-semibold text-telivity-navy mb-4">{t('channels.syncActions')}</h2>
          <div className="space-y-2">
            {[
              { action: 'availability', label: t('channels.pushAvailability'), icon: RefreshCw },
              { action: 'rates', label: t('channels.pushRates'), icon: RefreshCw },
              { action: 'full', label: t('channels.pushFullAri'), icon: Zap },
            ].map(({ action, label, icon: Icon }) => (
              <button
                key={action}
                onClick={() => syncMutation.mutate(action)}
                disabled={syncMutation.isPending}
                className="w-full flex items-center gap-2 border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-medium hover:border-telivity-teal hover:bg-telivity-teal/5 transition-colors disabled:opacity-50"
              >
                <Icon size={14} /> {label}
              </button>
            ))}
            <button
              onClick={() => contentMutation.mutate()}
              disabled={contentMutation.isPending}
              className="w-full flex items-center gap-2 border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-medium hover:border-telivity-teal hover:bg-telivity-teal/5 transition-colors disabled:opacity-50"
            >
              <ImageIcon size={14} /> {contentMutation.isPending ? t('channels.pushingContent') : t('channels.pushContent')}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 mt-6 space-y-6">
        <h2 className="text-sm font-semibold text-telivity-navy">{t('channels.channelMappings')}</h2>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-telivity-slate uppercase">{t('channels.roomTypeMappings')}</h3>
            <button
              type="button"
              onClick={() => setRoomTypeMapping((rows) => [...rows, { roomTypeId: '', channelRoomCode: '' }])}
              className="text-xs font-semibold text-telivity-teal hover:underline"
            >
              + {t('channels.addMappingRow')}
            </button>
          </div>
          <div className="space-y-2">
            {roomTypeMapping.map((row, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <select
                  value={row.roomTypeId}
                  onChange={(e) => setRoomTypeMapping((rows) => rows.map((r, i) => (i === idx ? { ...r, roomTypeId: e.target.value } : r)))}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal"
                >
                  <option value="">{t('channels.selectRoomType')}</option>
                  {roomTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>{rt.name}{rt.code ? ` (${rt.code})` : ''}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={row.channelRoomCode}
                  onChange={(e) => setRoomTypeMapping((rows) => rows.map((r, i) => (i === idx ? { ...r, channelRoomCode: e.target.value } : r)))}
                  placeholder={t('channels.channelRoomCode')}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal"
                />
                <button
                  type="button"
                  onClick={() => setRoomTypeMapping((rows) => rows.filter((_, i) => i !== idx))}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  aria-label={t('channels.removeMappingRow')}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {roomTypeMapping.length === 0 && (
              <p className="text-xs text-telivity-mid-grey">{t('channels.noMappingsYet')}</p>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-telivity-slate uppercase">{t('channels.ratePlanMappings')}</h3>
            <button
              type="button"
              onClick={() => setRatePlanMapping((rows) => [...rows, { ratePlanId: '', channelRateCode: '' }])}
              className="text-xs font-semibold text-telivity-teal hover:underline"
            >
              + {t('channels.addMappingRow')}
            </button>
          </div>
          <div className="space-y-2">
            {ratePlanMapping.map((row, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <select
                  value={row.ratePlanId}
                  onChange={(e) => setRatePlanMapping((rows) => rows.map((r, i) => (i === idx ? { ...r, ratePlanId: e.target.value } : r)))}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal"
                >
                  <option value="">{t('channels.selectRatePlan')}</option>
                  {ratePlans.map((rp) => (
                    <option key={rp.id} value={rp.id}>{rp.name}{rp.code ? ` (${rp.code})` : ''}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={row.channelRateCode}
                  onChange={(e) => setRatePlanMapping((rows) => rows.map((r, i) => (i === idx ? { ...r, channelRateCode: e.target.value } : r)))}
                  placeholder={t('channels.channelRateCode')}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal"
                />
                <button
                  type="button"
                  onClick={() => setRatePlanMapping((rows) => rows.filter((_, i) => i !== idx))}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  aria-label={t('channels.removeMappingRow')}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {ratePlanMapping.length === 0 && (
              <p className="text-xs text-telivity-mid-grey">{t('channels.noMappingsYet')}</p>
            )}
          </div>
        </div>

        <button
          onClick={() => mappingMutation.mutate()}
          disabled={mappingMutation.isPending}
          className="bg-telivity-teal text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {mappingMutation.isPending ? t('common.saving') : t('channels.saveMappings')}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
        <div className="flex items-center gap-4 mb-4">
          <h2 className="text-sm font-semibold text-telivity-navy">{t('channels.syncLogs')}</h2>
          <div className="flex gap-1 ml-auto">
            {(['content', 'ari'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setLogsTab(tab)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold ${logsTab === tab ? 'bg-telivity-teal text-white' : 'text-telivity-slate hover:bg-telivity-light-grey'}`}
              >
                {tab === 'content' ? t('channels.content') : 'ARI'}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <SyncLogsTable logs={logsTab === 'content' ? contentLogs : ariLogs} />
        </div>
      </div>
    </div>
  );
}

// ---- Rate Parity ----
function RateParity() {
  const { t } = useTranslation();
  const { propertyId, currencyCode } = useProperty();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [channelConnectionId, setChannelConnectionId] = useState('');
  const [ratePlanId, setRatePlanId] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'percentage' | 'fixed'>('percentage');
  const [adjustmentValue, setAdjustmentValue] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const { data: connectionsData } = useQuery({
    queryKey: ['channels', propertyId],
    queryFn: () => api.get('/v1/channels/connections', { params: { propertyId } }).then((r) => r.data),
    enabled: !!propertyId,
  });

  const { data } = useQuery({
    queryKey: ['channels', 'rate-parity', propertyId],
    queryFn: () => api.get('/v1/channels/rate-parity', { params: { propertyId } }).then((r) => r.data),
    enabled: !!propertyId,
  });

  const connections: Connection[] = connectionsData?.data ?? connectionsData ?? [];
  const parity: RateParityRow[] = data?.data ?? data ?? [];

  const channelColumns = useMemo(() => {
    const seen = new Map<string, { channelConnectionId: string; channelName: string }>();
    for (const row of parity) {
      for (const ch of row.channels) {
        if (!seen.has(ch.channelConnectionId)) {
          seen.set(ch.channelConnectionId, {
            channelConnectionId: ch.channelConnectionId,
            channelName: ch.channelName || ch.channelCode,
          });
        }
      }
    }
    return Array.from(seen.values());
  }, [parity]);

  const overrideMutation = useMutation({
    mutationFn: () =>
      api.post(
        '/v1/channels/rate-parity/override',
        {
          ratePlanId,
          adjustmentType,
          adjustmentValue: Number(adjustmentValue),
          ...(startDate ? { startDate } : {}),
          ...(endDate ? { endDate } : {}),
          ...(reason ? { reason } : {}),
        },
        { params: { propertyId, channelConnectionId } },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels', 'rate-parity'] });
      setOverrideOpen(false);
      setAdjustmentValue('');
      setStartDate('');
      setEndDate('');
      setReason('');
      toast('success', t('channels.overrideSaved'));
    },
  });

  const removeOverrideMutation = useMutation({
    mutationFn: () =>
      api.delete('/v1/channels/rate-parity/override', {
        params: {
          propertyId,
          channelConnectionId,
          ratePlanId,
          ...(startDate ? { startDate } : {}),
          ...(endDate ? { endDate } : {}),
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels', 'rate-parity'] });
      toast('success', t('channels.overrideRemoved'));
    },
  });

  if (!propertyId) {
    return <div className="flex items-center justify-center h-64 text-telivity-mid-grey">{t('channels.selectProperty')}</div>;
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/channels')} className="p-1.5 rounded hover:bg-telivity-light-grey"><ChevronLeft size={20} /></button>
        <Radio size={24} className="text-telivity-teal" />
        <h1 className="text-2xl font-semibold text-telivity-navy">{t('channels.rateParity')}</h1>
        <button
          onClick={() => setOverrideOpen(true)}
          className="ml-auto border border-gray-200 text-telivity-slate rounded-lg px-4 py-2 text-sm font-semibold hover:bg-telivity-light-grey"
        >
          {t('channels.setRateOverride')}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        {Array.isArray(parity) && parity.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-telivity-slate">{t('channels.ratePlan')}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-telivity-slate">{t('channels.baseAmount')}</th>
                  {channelColumns.map((col) => (
                    <th key={col.channelConnectionId} className="px-4 py-3 text-right text-xs font-semibold text-telivity-slate">
                      {col.channelName}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center text-xs font-semibold text-telivity-slate">{t('channels.parityViolations')}</th>
                </tr>
              </thead>
              <tbody>
                {parity.map((row) => (
                  <tr key={row.ratePlanId} className="border-b border-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-telivity-navy">{row.ratePlanName}</td>
                    <td className="px-4 py-3 text-sm text-right text-telivity-slate">{formatMoney(row.baseAmount, currencyCode)}</td>
                    {channelColumns.map((col) => {
                      const ch = row.channels.find((c) => c.channelConnectionId === col.channelConnectionId);
                      if (!ch) {
                        return <td key={col.channelConnectionId} className="px-4 py-3 text-sm text-center text-telivity-mid-grey">—</td>;
                      }
                      return (
                        <td key={col.channelConnectionId} className="px-4 py-3 text-right">
                          <div className="text-sm text-telivity-slate">{formatMoney(ch.effectiveRate, currencyCode)}</div>
                          <div className="flex items-center justify-end gap-1 mt-0.5">
                            <StatusBadge
                              status={ch.isParity ? 'success' : 'warning'}
                              label={ch.isParity ? t('channels.inParity') : t('channels.violation')}
                            />
                            {ch.hasOverride && (
                              <span className="text-[10px] text-telivity-mid-grey uppercase">{t('channels.override')}</span>
                            )}
                          </div>
                          {!ch.isParity && (
                            <div className="text-[10px] text-amber-600 mt-0.5">
                              {t('channels.variance')}: {formatMoney(ch.variance, currencyCode)}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-center">
                      {row.parityViolations > 0 ? (
                        <span className="text-sm font-semibold text-amber-600">{row.parityViolations}</span>
                      ) : (
                        <span className="text-sm text-telivity-mid-grey">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-telivity-mid-grey text-center py-8">{t('channels.noParity')}</p>
        )}
      </div>

      <Modal open={overrideOpen} onClose={() => setOverrideOpen(false)} title={t('channels.setRateOverride')} wide>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-telivity-mid-grey mb-1">{t('channels.channel')}</label>
            <select
              value={channelConnectionId}
              onChange={(e) => setChannelConnectionId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal"
            >
              <option value="">{t('channels.selectChannel')}</option>
              {connections.map((c) => (
                <option key={c.id} value={c.id}>{c.channelName ?? c.channelCode}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-telivity-mid-grey mb-1">{t('channels.ratePlan')}</label>
            <select
              value={ratePlanId}
              onChange={(e) => setRatePlanId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal"
            >
              <option value="">{t('channels.selectRatePlan')}</option>
              {parity.map((p) => (
                <option key={p.ratePlanId} value={p.ratePlanId}>{p.ratePlanName}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-telivity-mid-grey mb-1">{t('channels.adjustmentType')}</label>
              <select
                value={adjustmentType}
                onChange={(e) => setAdjustmentType(e.target.value as 'percentage' | 'fixed')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal"
              >
                <option value="percentage">{t('channels.adjustmentPercentage')}</option>
                <option value="fixed">{t('channels.adjustmentFixed')}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-telivity-mid-grey mb-1">{t('channels.adjustmentValue')}</label>
              <input
                type="number"
                step="0.01"
                value={adjustmentValue}
                onChange={(e) => setAdjustmentValue(e.target.value)}
                placeholder={adjustmentType === 'percentage' ? '-10' : '15.00'}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-telivity-mid-grey mb-1">{t('common.date')} ({t('channels.optional').toLowerCase()})</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal" />
            </div>
            <div>
              <label className="block text-xs font-medium text-telivity-mid-grey mb-1">{t('channels.endDate')} ({t('channels.optional').toLowerCase()})</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-telivity-mid-grey mb-1">{t('channels.overrideReason')} ({t('channels.optional').toLowerCase()})</label>
            <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal" />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => overrideMutation.mutate()}
              disabled={!channelConnectionId || !ratePlanId || !adjustmentValue || overrideMutation.isPending}
              className="flex-1 bg-telivity-teal text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {overrideMutation.isPending ? t('common.saving') : t('channels.saveOverride')}
            </button>
            <button
              onClick={() => removeOverrideMutation.mutate()}
              disabled={!channelConnectionId || !ratePlanId || removeOverrideMutation.isPending}
              className="border border-red-200 text-red-600 rounded-lg px-4 py-2 text-sm font-semibold hover:bg-red-50 disabled:opacity-50"
            >
              {t('channels.removeOverride')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function Channels() {
  return (
    <Routes>
      <Route index element={<ConnectionList />} />
      <Route path="rate-parity" element={<RateParity />} />
      <Route path="ical" element={<IcalCalendars />} />
      <Route path=":id" element={<ConnectionDetail />} />
    </Routes>
  );
}
