import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Inbox,
  Clock,
  CheckCircle2,
  XCircle,
  History,
  Search,
  MessageCircle,
  Calendar,
  Users,
  BedDouble,
  DollarSign,
  AlertCircle,
  Check,
  X,
  Phone,
  Mail,
  RefreshCw,
  DoorOpen,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  Volume2,
} from 'lucide-react';
import { api } from '../lib/api';
import { useProperty } from '../context/PropertyContext';
import { playBookingChime } from '../lib/notificationSound';
import Modal from '../components/ui/Modal';

type TabKey = 'all' | 'pending' | 'approved' | 'rejected' | 'history';

interface DirectBookingItem {
  id: string;
  propertyId: string;
  status: 'pending' | 'accepted' | 'denied';
  reference: string;
  submissionIdempotencyKey: string;
  arrivalDate: string;
  departureDate: string;
  roomTypeId: string;
  roomTypeName: string;
  roomTypeCode: string;
  ratePlanId: string;
  ratePlanName: string;
  adults: number;
  children: number;
  guestFirstName: string;
  guestLastName: string;
  guestEmail: string;
  guestPhone: string;
  specialRequests?: string | null;
  submittedTotal: string;
  currencyCode: string;
  cardBrand?: string | null;
  cardLastFour?: string | null;
  acceptedReservationId?: string | null;
  confirmedReservationNumber?: string | null;
  assignedRoomNumber?: string | null;
  assignedRoomFloor?: string | null;
  availableRoomsCount: number;
  denialReason?: string | null;
  decidedAt?: string | null;
  createdAt: string;
}

interface AvailableRoom {
  id: string;
  number: string;
  floor: string;
  status: string;
  hkOccupancy?: string;
}

interface AuditLogItem {
  id: string;
  propertyId: string;
  action: string;
  entityType: string;
  entityId: string;
  description: string;
  newValue?: any;
  occurredAt: string;
}

export default function DirectBookings() {
  const { propertyId } = useProperty();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Determine active tab from URL path
  const activeTab: TabKey = useMemo(() => {
    const p = location.pathname;
    if (p.includes('/direct-bookings/pending')) return 'pending';
    if (p.includes('/direct-bookings/approved')) return 'approved';
    if (p.includes('/direct-bookings/rejected')) return 'rejected';
    if (p.includes('/direct-bookings/history')) return 'history';
    return 'all';
  }, [location.pathname]);

  const [search, setSearch] = useState('');
  const [selectedBookingForApprove, setSelectedBookingForApprove] = useState<DirectBookingItem | null>(null);
  const [selectedBookingForReject, setSelectedBookingForReject] = useState<DirectBookingItem | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Map active tab to status filter
  const statusFilter = useMemo(() => {
    if (activeTab === 'pending') return 'pending';
    if (activeTab === 'approved') return 'accepted';
    if (activeTab === 'rejected') return 'denied';
    return undefined;
  }, [activeTab]);

  // Fetch Direct Bookings List
  const { data: bookingsData, isLoading, refetch } = useQuery({
    queryKey: ['direct-bookings', propertyId, statusFilter, search],
    queryFn: async () => {
      const params: Record<string, any> = { propertyId };
      if (statusFilter) params.status = statusFilter;
      if (search.trim()) params.search = search.trim();
      const res = await api.get('/v1/direct-bookings', { params });
      return res.data;
    },
    enabled: Boolean(propertyId),
    refetchInterval: 5000, // Background poll every 5s for new bookings
  });

  // Fetch Available Rooms when Approve Modal opens
  const { data: availableRooms = [], isLoading: isLoadingRooms } = useQuery<AvailableRoom[]>({
    queryKey: ['direct-booking-available-rooms', selectedBookingForApprove?.id],
    queryFn: async () => {
      if (!selectedBookingForApprove) return [];
      const res = await api.get(`/v1/direct-bookings/${selectedBookingForApprove.id}/available-rooms`, {
        params: { propertyId },
      });
      return res.data;
    },
    enabled: Boolean(selectedBookingForApprove && propertyId),
  });

  // Automatically select first available room
  useEffect(() => {
    if (availableRooms && availableRooms.length > 0 && !selectedRoomId) {
      setSelectedRoomId(availableRooms[0].id);
    }
  }, [availableRooms, selectedRoomId]);

  // Fetch Audit History
  const { data: historyData, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['direct-bookings-history', propertyId],
    queryFn: async () => {
      const res = await api.get('/v1/direct-bookings/history/audit', {
        params: { propertyId },
      });
      return res.data;
    },
    enabled: Boolean(propertyId) && activeTab === 'history',
  });

  // Approve Mutation
  const approveMutation = useMutation({
    mutationFn: async ({ id, roomId }: { id: string; roomId?: string }) => {
      const res = await api.post(
        `/v1/direct-bookings/${id}/approve`,
        { roomId },
        { params: { propertyId } },
      );
      return res.data;
    },
    onSuccess: (data) => {
      playBookingChime();
      setActionSuccessMessage(
        `Booking approved successfully! Assigned Room ${data.roomNumber}. Confirmed Ref: ${data.confirmationNumber}. Guest notified via WhatsApp.`,
      );
      setSelectedBookingForApprove(null);
      setSelectedRoomId('');
      queryClient.invalidateQueries({ queryKey: ['direct-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      setTimeout(() => setActionSuccessMessage(null), 8000);
    },
    onError: (err: any) => {
      alert(`Approval error: ${err.response?.data?.message || err.message}`);
    },
  });

  // Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await api.post(
        `/v1/direct-bookings/${id}/reject`,
        { reason },
        { params: { propertyId } },
      );
      return res.data;
    },
    onSuccess: (data) => {
      setActionSuccessMessage(`Booking request rejected. Guest notified via WhatsApp.`);
      setSelectedBookingForReject(null);
      setRejectionReason('');
      queryClient.invalidateQueries({ queryKey: ['direct-bookings'] });
      setTimeout(() => setActionSuccessMessage(null), 8000);
    },
    onError: (err: any) => {
      alert(`Rejection error: ${err.response?.data?.message || err.message}`);
    },
  });

  const counts = useMemo(() => {
    if (bookingsData?.counts) return bookingsData.counts;
    const list = Array.isArray(bookingsData) ? bookingsData : (bookingsData?.data || []);
    return {
      total: list.length,
      pending: list.filter((i: any) => i.status === 'pending' || i.status === 'pending_approval').length,
      accepted: list.filter((i: any) => i.status === 'accepted').length,
      denied: list.filter((i: any) => i.status === 'denied').length,
    };
  }, [bookingsData]);

  const items: DirectBookingItem[] = Array.isArray(bookingsData?.data)
    ? bookingsData.data
    : (Array.isArray(bookingsData) ? bookingsData : []);

  const handleTabChange = (tab: TabKey) => {
    if (tab === 'all') navigate('/direct-bookings');
    else if (tab === 'pending') navigate('/direct-bookings/pending');
    else if (tab === 'approved') navigate('/direct-bookings/approved');
    else if (tab === 'rejected') navigate('/direct-bookings/rejected');
    else if (tab === 'history') navigate('/direct-bookings/history');
  };

  const openWhatsApp = (phone: string, guestName: string, ref: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const text = encodeURIComponent(
      `Hello ${guestName}, this is Hotel Spark management regarding your direct booking request (${ref}). How may we assist you today?`,
    );
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-telivity-teal/15 text-telivity-teal rounded-xl">
              <Inbox className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Direct Booking Management
              </h1>
              <p className="text-xs text-gray-500">
                Review website guest reservation requests, verify room availability, and approve or reject bookings.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => playBookingChime()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 shadow-xs transition"
            title="Test concierge desk bell chime"
          >
            <Volume2 className="w-4 h-4 text-telivity-teal" />
            <span>Test Chime</span>
          </button>
          <button
            type="button"
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-telivity-teal bg-telivity-teal/10 rounded-lg hover:bg-telivity-teal/20 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {actionSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-start justify-between shadow-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <p className="text-sm font-semibold">{actionSuccessMessage}</p>
          </div>
          <button
            onClick={() => setActionSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => handleTabChange('all')}
          className={`p-4 rounded-xl border bg-white shadow-xs cursor-pointer transition ${activeTab === 'all' ? 'border-telivity-teal ring-2 ring-telivity-teal/20' : 'border-gray-200 hover:border-gray-300'
            }`}
        >
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
            <span>Total Requests</span>
            <Inbox className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{counts.total}</div>
          <div className="text-[11px] text-gray-400 mt-0.5">All website direct submissions</div>
        </div>

        <div
          onClick={() => handleTabChange('pending')}
          className={`p-4 rounded-xl border bg-white shadow-xs cursor-pointer transition ${activeTab === 'pending' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-gray-200 hover:border-gray-300'
            }`}
        >
          <div className="flex items-center justify-between text-amber-700 text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
              Pending Approval
            </span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-900">{counts.pending}</div>
          <div className="text-[11px] text-amber-600/80 mt-0.5">Requires manager action</div>
        </div>

        <div
          onClick={() => handleTabChange('approved')}
          className={`p-4 rounded-xl border bg-white shadow-xs cursor-pointer transition ${activeTab === 'approved' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-gray-200 hover:border-gray-300'
            }`}
        >
          <div className="flex items-center justify-between text-emerald-700 text-xs font-bold">
            <span>Approved & Confirmed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-900">{counts.accepted}</div>
          <div className="text-[11px] text-emerald-600/80 mt-0.5">Assigned to PMS rooms</div>
        </div>

        <div
          onClick={() => handleTabChange('rejected')}
          className={`p-4 rounded-xl border bg-white shadow-xs cursor-pointer transition ${activeTab === 'rejected' ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-gray-200 hover:border-gray-300'
            }`}
        >
          <div className="flex items-center justify-between text-rose-700 text-xs font-bold">
            <span>Rejected / Denied</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-900">{counts.denied}</div>
          <div className="text-[11px] text-rose-600/80 mt-0.5">With mandatory reason</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 flex items-center justify-between gap-4 overflow-x-auto">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleTabChange('all')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition whitespace-nowrap ${activeTab === 'all'
              ? 'border-telivity-teal text-telivity-teal'
              : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            <Inbox className="w-4 h-4" />
            <span>Booking Requests</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-600 font-bold">
              {counts.total}
            </span>
          </button>

          <button
            onClick={() => handleTabChange('pending')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition whitespace-nowrap ${activeTab === 'pending'
              ? 'border-amber-600 text-amber-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Pending Approvals</span>
            {counts.pending > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500 text-white font-extrabold animate-pulse">
                {counts.pending}
              </span>
            )}
          </button>

          <button
            onClick={() => handleTabChange('approved')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition whitespace-nowrap ${activeTab === 'approved'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Approved Bookings</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
              {counts.accepted}
            </span>
          </button>

          <button
            onClick={() => handleTabChange('rejected')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition whitespace-nowrap ${activeTab === 'rejected'
              ? 'border-rose-600 text-rose-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            <XCircle className="w-4 h-4 text-rose-600" />
            <span>Rejected Bookings</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-100 text-rose-800 font-bold">
              {counts.denied}
            </span>
          </button>

          <button
            onClick={() => handleTabChange('history')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition whitespace-nowrap ${activeTab === 'history'
              ? 'border-telivity-teal text-telivity-teal'
              : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            <History className="w-4 h-4" />
            <span>Booking History & Audit</span>
          </button>
        </div>

        {activeTab !== 'history' && (
          <div className="relative pb-2 min-w-[240px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search guest, phone, ref..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-hidden focus:border-telivity-teal"
            />
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {activeTab === 'history' ? (
        /* AUDIT HISTORY VIEW */
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Direct Booking Audit Trail</h2>
              <p className="text-xs text-gray-500">
                Immutable chronological log of all approval decisions, room allocations, and rejection reasons.
              </p>
            </div>
          </div>

          {(() => {
            const historyList: AuditLogItem[] = Array.isArray(historyData?.data)
              ? historyData.data
              : (Array.isArray(historyData) ? historyData : []);

            if (isLoadingHistory) {
              return <div className="p-8 text-center text-sm text-gray-500">Loading audit log…</div>;
            }
            if (historyList.length === 0) {
              return <div className="p-8 text-center text-sm text-gray-500">No audit records found.</div>;
            }
            return (
              <div className="divide-y divide-gray-100">
                {historyList.map((log: AuditLogItem) => {
                  const isApprove = log.action === 'approve';
                  return (
                    <div key={log.id} className="p-4 flex items-start gap-4 hover:bg-gray-50/60 transition">
                      <div
                        className={`p-2 rounded-xl flex-shrink-0 ${isApprove ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}
                      >
                        {isApprove ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded ${isApprove ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}
                          >
                            {log.action}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(log.occurredAt).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-medium text-gray-900">{log.description}</p>
                        {log.newValue && (
                          <div className="mt-2 text-xs font-mono bg-gray-50 p-2 rounded-md border border-gray-100 text-gray-600">
                            {JSON.stringify(log.newValue)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      ) : (
        /* BOOKINGS LIST VIEW */
        <div className="space-y-4">
          {isLoading ? (
            <div className="p-12 text-center text-sm text-gray-500">Loading booking requests…</div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-gray-200 shadow-xs">
              <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-gray-700">No booking requests found</h3>
              <p className="text-xs text-gray-500 mt-1">
                {activeTab === 'pending'
                  ? 'There are currently no direct booking requests waiting for approval.'
                  : 'No bookings match the selected filters.'}
              </p>
            </div>
          ) : (
            items.map((item) => {
              const isPending = item.status === 'pending';
              const isApproved = item.status === 'accepted';
              const isDenied = item.status === 'denied';
              const hasAvailableRooms = item.availableRoomsCount > 0;

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-xl border p-5 shadow-xs transition hover:shadow-md ${isPending
                    ? 'border-amber-300 ring-1 ring-amber-200'
                    : isApproved
                      ? 'border-emerald-200'
                      : 'border-rose-200'
                    }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                    {/* Guest info & reference */}
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm ${isPending
                          ? 'bg-amber-100 text-amber-800'
                          : isApproved
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                          }`}
                      >
                        {item.guestFirstName[0]}
                        {item.guestLastName[0]}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base font-bold text-gray-900">
                            {item.guestFirstName} {item.guestLastName}
                          </h2>
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">
                            {item.reference}
                          </span>
                          {isPending && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping"></span>
                              Pending Approval
                            </span>
                          )}
                          {isApproved && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <Check className="w-3 h-3" />
                              Approved & Confirmed
                            </span>
                          )}
                          {isDenied && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                              <X className="w-3 h-3" />
                              Rejected
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-gray-500 mt-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5 text-gray-400" />
                            {item.guestEmail}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                            {item.guestPhone || 'No phone'}
                          </span>
                          <span className="text-gray-400">
                            Requested:{' '}
                            {new Date(item.createdAt).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Financials & Quick Contact */}
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Requested Total</div>
                        <div className="text-lg font-black text-gray-900">
                          ₹
                          {Number(item.submittedTotal).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                          })}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          {item.cardBrand || 'UPI'} {item.cardLastFour ? `(•• ${item.cardLastFour})` : ''}
                        </div>
                      </div>

                      {item.guestPhone && (
                        <button
                          type="button"
                          onClick={() => openWhatsApp(item.guestPhone, item.guestFirstName, item.reference)}
                          className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition"
                          title="Contact guest on WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4 text-emerald-600" />
                          <span>WhatsApp</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 py-4 text-xs">
                    <div>
                      <div className="text-gray-500 font-semibold mb-1 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        Stay Dates
                      </div>
                      <div className="font-bold text-gray-900">
                        {item.arrivalDate} → {item.departureDate}
                      </div>
                      <div className="text-gray-500 text-[11px]">
                        {Math.max(
                          1,
                          Math.round(
                            (new Date(item.departureDate).getTime() - new Date(item.arrivalDate).getTime()) /
                            (1000 * 60 * 60 * 24),
                          ),
                        )}{' '}
                        Nights Stay
                      </div>
                    </div>

                    <div>
                      <div className="text-gray-500 font-semibold mb-1 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        Guests & Occupancy
                      </div>
                      <div className="font-bold text-gray-900">
                        {item.adults} Adults {item.children > 0 ? `, ${item.children} Children` : ''}
                      </div>
                      <div className="text-gray-500 text-[11px]">{item.ratePlanName}</div>
                    </div>

                    <div>
                      <div className="text-gray-500 font-semibold mb-1 flex items-center gap-1">
                        <BedDouble className="w-3.5 h-3.5 text-gray-400" />
                        Room Category & Live Availability
                      </div>
                      <div className="font-bold text-gray-900">{item.roomTypeName}</div>
                      <div>
                        {hasAvailableRooms ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            {item.availableRoomsCount} physical rooms available
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                            <ShieldAlert className="w-3 h-3 text-rose-600" />
                            0 Available (Double Booking Risk!)
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-gray-500 font-semibold mb-1 flex items-center gap-1">
                        <DoorOpen className="w-3.5 h-3.5 text-gray-400" />
                        Room Assignment
                      </div>
                      {isApproved ? (
                        <div className="font-bold text-emerald-800 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Room {item.assignedRoomNumber} (Floor {item.assignedRoomFloor || '1'})</span>
                        </div>
                      ) : (
                        <div className="text-gray-400 italic">Not assigned yet</div>
                      )}
                      {item.confirmedReservationNumber && (
                        <div className="text-[10px] text-gray-500 font-mono">
                          PMS Ref: {item.confirmedReservationNumber}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Special Requests or Rejection Reason */}
                  {item.specialRequests && (
                    <div className="mt-2 p-2.5 rounded-lg bg-gray-50 border border-gray-100 text-xs text-gray-700">
                      <span className="font-bold text-gray-900">Guest Special Requests: </span>
                      {item.specialRequests}
                    </div>
                  )}

                  {isDenied && item.denialReason && (
                    <div className="mt-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-900">
                      <span className="font-bold text-rose-950">Rejection Reason: </span>
                      {item.denialReason}
                    </div>
                  )}

                  {/* Action Buttons */}
                  {isPending && (
                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBookingForReject(item);
                          setRejectionReason('');
                        }}
                        className="px-4 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition"
                      >
                        Reject Booking
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBookingForApprove(item);
                          setSelectedRoomId('');
                        }}
                        className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm rounded-lg flex items-center gap-1.5 transition"
                      >
                        <Check className="w-4 h-4" />
                        <span>Approve & Assign Room</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* APPROVE MODAL */}
      <Modal
        open={Boolean(selectedBookingForApprove)}
        onClose={() => setSelectedBookingForApprove(null)}
        title="Approve Booking Request"
      >
        {selectedBookingForApprove && (
          <div className="space-y-4">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
              <div className="font-bold text-sm">
                {selectedBookingForApprove.guestFirstName} {selectedBookingForApprove.guestLastName}
              </div>
              <div>
                <strong>Dates:</strong> {selectedBookingForApprove.arrivalDate} → {selectedBookingForApprove.departureDate}
              </div>
              <div>
                <strong>Room Type:</strong> {selectedBookingForApprove.roomTypeName}
              </div>
              <div>
                <strong>Total Amount:</strong> ₹
                {Number(selectedBookingForApprove.submittedTotal).toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Select Physical Room to Assign
              </label>
              {isLoadingRooms ? (
                <div className="text-xs text-gray-500 py-2">Checking room availability…</div>
              ) : availableRooms.length === 0 ? (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 font-bold">
                  ⚠️ No physical rooms are available for these dates! Double booking prevented.
                </div>
              ) : (
                <select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:border-telivity-teal focus:outline-hidden"
                >
                  {availableRooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      Room {r.number} (Floor {r.floor || '1'}, Clean, Available)
                    </option>
                  ))}
                </select>
              )}
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              Upon clicking Approve, the reservation will be confirmed, inserted into the PMS Reservations board,
              a folio will be created, and the guest will receive an official confirmation on WhatsApp.
            </p>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedBookingForApprove(null)}
                className="px-3.5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={approveMutation.isPending || availableRooms.length === 0}
                onClick={() =>
                  approveMutation.mutate({
                    id: selectedBookingForApprove.id,
                    roomId: selectedRoomId || undefined,
                  })
                }
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
              >
                {approveMutation.isPending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Approving…</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirm & Approve</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* REJECT MODAL */}
      <Modal
        open={Boolean(selectedBookingForReject)}
        onClose={() => setSelectedBookingForReject(null)}
        title="Reject Booking Request"
      >
        {selectedBookingForReject && (
          <div className="space-y-4">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1">
              <div className="font-bold text-sm">
                Reject request for {selectedBookingForReject.guestFirstName} {selectedBookingForReject.guestLastName}
              </div>
              <div>
                <strong>Reference:</strong> {selectedBookingForReject.reference}
              </div>
              <div>
                <strong>Stay:</strong> {selectedBookingForReject.arrivalDate} to {selectedBookingForReject.departureDate}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Mandatory Rejection Reason <span className="text-rose-600">*</span>
              </label>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {[
                  'Hotel Spark fully booked for selected dates',
                  'Room category under scheduled maintenance',
                  'Private banquet / wedding buyout in progress',
                  'Guest verification details incomplete',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRejectionReason(preset)}
                    className="text-[10px] px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
                  >
                    + {preset}
                  </button>
                ))}
              </div>

              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter mandatory reason explaining why this reservation cannot be accepted..."
                className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:border-rose-500 focus:outline-hidden"
              />
              {!rejectionReason.trim() && (
                <p className="text-[11px] text-rose-600 mt-1 font-semibold">
                  A rejection reason is required and will be communicated to the guest.
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedBookingForReject(null)}
                className="px-3.5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={rejectMutation.isPending || !rejectionReason.trim()}
                onClick={() =>
                  rejectMutation.mutate({
                    id: selectedBookingForReject.id,
                    reason: rejectionReason.trim(),
                  })
                }
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
              >
                {rejectMutation.isPending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Rejecting…</span>
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4" />
                    <span>Confirm Rejection</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

