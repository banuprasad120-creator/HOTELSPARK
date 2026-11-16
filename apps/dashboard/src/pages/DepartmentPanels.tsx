import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  ConciergeBell,
  Sparkles,
  Briefcase,
  Receipt,
  Users,
  DoorOpen,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  IndianRupee,
  ShieldCheck,
  Plus,
  ArrowRight,
  FileText,
  UserCheck,
  Send,
  MessageSquare,
  RefreshCw,
  Eye,
  LogOut,
  ChevronRight,
  BadgeCheck,
} from 'lucide-react';
import { api } from '../lib/api';
import { useProperty } from '../context/PropertyContext';
import { useToast } from '../components/ui/Toast';
import { useDepartment, DEPARTMENTS_INFO, type DepartmentKey } from '../context/DepartmentContext';
import {
  getStoredStays,
  getStoredRooms,
  saveStoredRooms,
  type StoredStay,
  type StoredRoom,
} from '../lib/supabaseAdapter';
import WalkInCheckInModal from '../components/front-desk/WalkInCheckInModal';
import BillInvoiceModal from '../components/billing/BillInvoiceModal';
import CheckoutModal from '../components/front-desk/CheckOutModal';

interface ShiftHandoverNote {
  id: string;
  shift: 'morning' | 'evening' | 'night';
  author: string;
  time: string;
  note: string;
  status: 'pending' | 'acknowledged';
}

const DEFAULT_HANDOVER_NOTES: ShiftHandoverNote[] = [
  {
    id: 'note-001',
    shift: 'morning',
    author: 'Ramesh Rao (Front Office Mgr)',
    time: 'Today, 01:45 PM',
    note: 'Room 103 guest Anil Kumar Goud completed checkout smoothly. Room 201 guest requested extra clean towels and laundry pickup at 4:30 PM.',
    status: 'acknowledged',
  },
  {
    id: 'note-002',
    shift: 'evening',
    author: 'Priya Sharma (Senior Receptionist)',
    time: 'Today, 05:15 PM',
    note: 'Walk-in check-in for Room 202 completed with Aadhaar verification. Cash drawer balanced at ₹7,500. Night shift please run EOD report by 11:30 PM.',
    status: 'pending',
  },
];

export default function DepartmentPanels() {
  const { propertyId } = useProperty();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { activeDepartment, setActiveDepartment } = useDepartment();

  const [walkInOpen, setWalkInOpen] = useState(false);
  const [invoiceStay, setInvoiceStay] = useState<StoredStay | null>(null);
  const [checkoutStay, setCheckoutStay] = useState<StoredStay | null>(null);
  const [newHandoverText, setNewHandoverText] = useState('');
  const [selectedShiftForNote, setSelectedShiftForNote] = useState<'morning' | 'evening' | 'night'>('evening');
  const [handoverNotes, setHandoverNotes] = useState<ShiftHandoverNote[]>(() => {
    try {
      const saved = localStorage.getItem('hotel_spark_handover_notes');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEFAULT_HANDOVER_NOTES;
  });

  // Determine current active shift by wall-clock hour
  const currentHour = new Date().getHours();
  const currentShiftKey: 'morning' | 'evening' | 'night' =
    currentHour >= 6 && currentHour < 14
      ? 'morning'
      : currentHour >= 14 && currentHour < 22
      ? 'evening'
      : 'night';

  // Load Stays
  const { data: staysData } = useQuery({
    queryKey: ['stays', propertyId],
    queryFn: () => api.get('/v1/stays', { params: { propertyId } }).then((r) => r.data),
    enabled: !!propertyId,
  });
  const allStays: StoredStay[] = useMemo(() => {
    const raw = staysData?.data ?? staysData;
    if (Array.isArray(raw) && raw.length > 0) return raw;
    return getStoredStays();
  }, [staysData]);

  // Load Rooms
  const { data: roomsData } = useQuery({
    queryKey: ['rooms', propertyId],
    queryFn: () => api.get('/v1/rooms', { params: { propertyId } }).then((r) => r.data),
    enabled: !!propertyId,
  });
  const rooms: StoredRoom[] = useMemo(() => {
    const raw = roomsData?.data ?? roomsData;
    if (Array.isArray(raw) && raw.length > 0) return raw;
    return getStoredRooms();
  }, [roomsData]);

  // In-House stays
  const inHouseStays = useMemo(() => {
    return allStays.filter((s) => s.stayStatus === 'in_house');
  }, [allStays]);

  // Financial aggregates
  const totalCollections = useMemo(() => {
    return allStays.reduce((acc, s) => {
      return acc + (s.advancePaid || 0) + (s.previousPayments || 0) + ((s as any).finalPayment || 0);
    }, 0);
  }, [allStays]);

  const unpaidBalances = useMemo(() => {
    return inHouseStays.reduce((acc, s) => acc + (s.balance || 0), 0);
  }, [inHouseStays]);

  // Room status counts
  const cleanRooms = rooms.filter((r) => r.status === 'vacant_clean' || r.status === 'clean' || r.status === 'available');
  const occupiedRooms = rooms.filter((r) => r.status === 'occupied');
  const dirtyRooms = rooms.filter((r) => r.status === 'vacant_dirty' || r.status === 'dirty');
  const oooRooms = rooms.filter((r) => r.status === 'out_of_order');

  // Toggle room cleaning status mutation
  const toggleRoomStatus = (roomId: string, nextStatus: string) => {
    const updated = rooms.map((r) => (r.id === roomId ? { ...r, status: nextStatus } : r));
    saveStoredRooms(updated);
    queryClient.invalidateQueries({ queryKey: ['rooms'] });
    toast('success', `Room status updated to ${nextStatus.replace('_', ' ')}.`);
  };

  // Add handover note
  const handleAddHandoverNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHandoverText.trim()) return;
    const newNote: ShiftHandoverNote = {
      id: `note-${Date.now()}`,
      shift: selectedShiftForNote,
      author: 'Current In-Charge (Admin)',
      time: `Today, ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`,
      note: newHandoverText.trim(),
      status: 'pending',
    };
    const updatedNotes = [newNote, ...handoverNotes];
    setHandoverNotes(updatedNotes);
    localStorage.setItem('hotel_spark_handover_notes', JSON.stringify(updatedNotes));
    setNewHandoverText('');
    toast('success', 'Shift handover note recorded successfully.');
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner with Single-Panel Department Switcher */}
      <div className="bg-gradient-to-r from-telivity-navy via-slate-900 to-telivity-navy rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-telivity-teal text-white tracking-wider uppercase">
                Hotel Spark Operations
              </span>
              <span className="text-gray-400 text-xs font-medium">Karimnagar • Multi-Department Console</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-1 flex items-center gap-2.5">
              <Building2 size={28} className="text-telivity-teal" />
              Department Operational Panels
            </h1>
            <p className="text-xs text-gray-300 mt-1 max-w-2xl">
              Access every hotel department—Front Desk, Housekeeping, 3-Shift Management, and Accounts—all in one unified panel.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setWalkInOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-telivity-teal hover:bg-teal-600 text-white font-bold rounded-xl text-xs transition shadow-lg"
            >
              <Plus size={15} />
              <span>Walk-In Check-In</span>
            </button>
          </div>
        </div>

        {/* Department Switcher Tabs (In One Panel) */}
        <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center gap-2">
          {(['all', 'front_office', 'housekeeping', 'manager', 'accounts'] as DepartmentKey[]).map((key) => {
            const info = DEPARTMENTS_INFO[key];
            const isActive = activeDepartment === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveDepartment(key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-white text-telivity-navy shadow-md scale-102'
                    : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
                }`}
              >
                {key === 'all' && <Building2 size={14} className={isActive ? 'text-telivity-teal' : ''} />}
                {key === 'front_office' && <ConciergeBell size={14} className={isActive ? 'text-telivity-teal' : ''} />}
                {key === 'housekeeping' && <Sparkles size={14} className={isActive ? 'text-amber-600' : ''} />}
                {key === 'manager' && <Briefcase size={14} className={isActive ? 'text-purple-600' : ''} />}
                {key === 'accounts' && <Receipt size={14} className={isActive ? 'text-emerald-600' : ''} />}
                <span>{info.shortName}</span>
                {key === 'housekeeping' && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/30 text-amber-200">
                    {dirtyRooms.length} dirty
                  </span>
                )}
                {key === 'front_office' && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-teal-500/30 text-teal-200">
                    {inHouseStays.length} in-house
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Department Quick Metrics Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Front Desk KPI */}
        <div
          onClick={() => setActiveDepartment('front_office')}
          className={`cursor-pointer rounded-2xl p-4 border transition-all ${
            activeDepartment === 'front_office'
              ? 'border-telivity-teal bg-teal-50/50 shadow-sm'
              : 'border-gray-200 bg-white hover:border-telivity-teal/50'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-telivity-mid-grey">
            <span className="font-semibold text-telivity-teal flex items-center gap-1">
              <ConciergeBell size={14} /> Front Desk
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-100 text-teal-800">
              Active
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-telivity-navy">
            {inHouseStays.length} <span className="text-xs font-normal text-telivity-mid-grey">Guests In-House</span>
          </div>
          <div className="text-[11px] text-telivity-slate mt-1 flex items-center justify-between">
            <span>Occupied: <strong>{occupiedRooms.length} Rooms</strong></span>
            <span className="text-telivity-teal font-bold flex items-center gap-0.5">Open Panel <ChevronRight size={12} /></span>
          </div>
        </div>

        {/* Housekeeping KPI */}
        <div
          onClick={() => setActiveDepartment('housekeeping')}
          className={`cursor-pointer rounded-2xl p-4 border transition-all ${
            activeDepartment === 'housekeeping'
              ? 'border-amber-400 bg-amber-50/50 shadow-sm'
              : 'border-gray-200 bg-white hover:border-amber-400/50'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-telivity-mid-grey">
            <span className="font-semibold text-amber-700 flex items-center gap-1">
              <Sparkles size={14} /> Housekeeping
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
              {dirtyRooms.length > 0 ? `${dirtyRooms.length} Action Needed` : 'All Clean'}
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-telivity-navy">
            {cleanRooms.length} / {rooms.length}{' '}
            <span className="text-xs font-normal text-telivity-mid-grey">Clean & Ready</span>
          </div>
          <div className="text-[11px] text-telivity-slate mt-1 flex items-center justify-between">
            <span>Dirty: <strong className="text-amber-700">{dirtyRooms.length}</strong> | OOO: <strong>{oooRooms.length}</strong></span>
            <span className="text-amber-700 font-bold flex items-center gap-0.5">Open Panel <ChevronRight size={12} /></span>
          </div>
        </div>

        {/* 3 Shifts Manager KPI */}
        <div
          onClick={() => setActiveDepartment('manager')}
          className={`cursor-pointer rounded-2xl p-4 border transition-all ${
            activeDepartment === 'manager'
              ? 'border-purple-400 bg-purple-50/50 shadow-sm'
              : 'border-gray-200 bg-white hover:border-purple-400/50'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-telivity-mid-grey">
            <span className="font-semibold text-purple-700 flex items-center gap-1">
              <Briefcase size={14} /> 3 Shifts Manager
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 uppercase">
              {currentShiftKey} Shift Active
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-telivity-navy capitalize">
            {currentShiftKey} Shift
          </div>
          <div className="text-[11px] text-telivity-slate mt-1 flex items-center justify-between">
            <span>In-Charge: <strong>{currentShiftKey === 'morning' ? 'Ramesh Rao' : currentShiftKey === 'evening' ? 'Priya Sharma' : 'Raju Nayak'}</strong></span>
            <span className="text-purple-700 font-bold flex items-center gap-0.5">Open Panel <ChevronRight size={12} /></span>
          </div>
        </div>

        {/* Accounts KPI */}
        <div
          onClick={() => setActiveDepartment('accounts')}
          className={`cursor-pointer rounded-2xl p-4 border transition-all ${
            activeDepartment === 'accounts'
              ? 'border-emerald-400 bg-emerald-50/50 shadow-sm'
              : 'border-gray-200 bg-white hover:border-emerald-400/50'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-telivity-mid-grey">
            <span className="font-semibold text-emerald-700 flex items-center gap-1">
              <Receipt size={14} /> Accounts & Billing
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
              100% Reconciled
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-telivity-navy">
            ₹{totalCollections.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-telivity-slate mt-1 flex items-center justify-between">
            <span>Pending: <strong className="text-amber-700">₹{unpaidBalances.toLocaleString('en-IN')}</strong></span>
            <span className="text-emerald-700 font-bold flex items-center gap-0.5">Open Panel <ChevronRight size={12} /></span>
          </div>
        </div>
      </div>

      {/* 3. MAIN SECTION: RENDER CHOSEN DEPARTMENT OR ALL IN ONE SCREEN */}

      {/* ======================================================== */}
      {/* 3A: FRONT DESK DEPARTMENT PANEL                          */}
      {/* ======================================================== */}
      {(activeDepartment === 'all' || activeDepartment === 'front_office') && (
        <div className="bg-white rounded-2xl border border-teal-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-50 text-telivity-teal">
                <ConciergeBell size={22} />
              </div>
              <div>
                <h2 className="text-base font-bold text-telivity-navy flex items-center gap-2">
                  Front Desk & Reception Panel
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                    Dept Head: Ramesh Rao
                  </span>
                </h2>
                <p className="text-xs text-telivity-mid-grey">
                  Live guest register, quick check-in, Aadhaar verification, and checkout settlement.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setWalkInOpen(true)}
                className="px-3.5 py-1.5 bg-telivity-teal hover:bg-teal-600 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
              >
                <Plus size={14} /> New Check-In
              </button>
              <button
                type="button"
                onClick={() => navigate('/current-guests')}
                className="px-3 py-1.5 border border-gray-200 hover:border-telivity-teal text-telivity-slate text-xs font-semibold rounded-xl transition"
              >
                Open Full In-House List
              </button>
            </div>
          </div>

          {/* In-House Guests Table inside Front Desk Panel */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-telivity-teal/5 text-telivity-slate font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Room</th>
                  <th className="py-2.5 px-3">Guest Name & Mobile</th>
                  <th className="py-2.5 px-3">Check-In</th>
                  <th className="py-2.5 px-3">Expected Check-Out</th>
                  <th className="py-2.5 px-3">ID Proof (Aadhaar)</th>
                  <th className="py-2.5 px-3 text-right">Advance Paid</th>
                  <th className="py-2.5 px-3 text-right">Balance</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {inHouseStays.map((stay) => (
                  <tr key={stay.id} className="hover:bg-gray-50/60 transition">
                    <td className="py-3 px-3">
                      <span className="font-bold text-telivity-navy text-sm">Room {stay.roomNumber}</span>
                      <div className="text-[10px] text-telivity-mid-grey">{stay.roomTypeName}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-telivity-navy">{stay.guestName}</span>
                      <div className="text-[10px] text-telivity-mid-grey">{stay.mobile}</div>
                    </td>
                    <td className="py-3 px-3 text-telivity-slate">
                      {new Date(stay.checkInTime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-3 px-3 text-telivity-slate">
                      {new Date(stay.expectedCheckoutTime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <ShieldCheck size={11} className="text-emerald-600" />
                        {stay.idProofType}: {stay.idProofNumber || 'Verified'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-emerald-700">
                      ₹{stay.advancePaid?.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-telivity-navy">
                      ₹{stay.balance?.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setInvoiceStay(stay)}
                          className="p-1.5 rounded-lg bg-teal-50 hover:bg-telivity-teal text-telivity-teal hover:text-white transition"
                          title="View Folio / Invoice"
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setCheckoutStay(stay)}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-600 text-amber-800 hover:text-white border border-amber-200 rounded-lg font-bold text-[11px] transition flex items-center gap-1"
                        >
                          <LogOut size={11} /> Checkout
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3B: HOUSEKEEPING & MAINTENANCE PANEL                     */}
      {/* ======================================================== */}
      {(activeDepartment === 'all' || activeDepartment === 'housekeeping') && (
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700">
                <Sparkles size={22} />
              </div>
              <div>
                <h2 className="text-base font-bold text-telivity-navy flex items-center gap-2">
                  Housekeeping & Hygiene Panel
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    Dept Head: Kavitha Devi
                  </span>
                </h2>
                <p className="text-xs text-telivity-mid-grey">
                  Live room cleanliness rack, 3-shift cleaning staff assignments, and room sanitization status.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/housekeeping')}
                className="px-3 py-1.5 border border-gray-200 hover:border-amber-400 text-telivity-slate text-xs font-semibold rounded-xl transition"
              >
                Open Housekeeping Hub
              </button>
            </div>
          </div>

          {/* Quick Room Cleanliness Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-9 gap-2.5">
            {rooms.map((room) => {
              const isClean = room.status === 'vacant_clean' || room.status === 'clean' || room.status === 'available';
              const isOccupied = room.status === 'occupied';
              const isDirty = room.status === 'vacant_dirty' || room.status === 'dirty';
              const isOOO = room.status === 'out_of_order';

              return (
                <div
                  key={room.id}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    isClean
                      ? 'border-emerald-300 bg-emerald-50/60'
                      : isOccupied
                      ? 'border-teal-300 bg-teal-50/60'
                      : isDirty
                      ? 'border-amber-400 bg-amber-50 shadow-xs'
                      : 'border-red-300 bg-red-50/60'
                  }`}
                >
                  <p className="text-xs font-bold text-telivity-navy">Room {room.number}</p>
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold mt-1 uppercase ${
                      isClean
                        ? 'bg-emerald-200 text-emerald-900'
                        : isOccupied
                        ? 'bg-teal-200 text-teal-900'
                        : isDirty
                        ? 'bg-amber-200 text-amber-900 animate-pulse'
                        : 'bg-red-200 text-red-900'
                    }`}
                  >
                    {isClean ? 'Clean' : isOccupied ? 'Occupied' : isDirty ? 'Dirty' : 'Out Order'}
                  </span>

                  {/* 1-click status switcher for housekeeping staff */}
                  <div className="mt-2 pt-1 border-t border-gray-200/50">
                    {isDirty ? (
                      <button
                        type="button"
                        onClick={() => toggleRoomStatus(room.id, 'vacant_clean')}
                        className="w-full text-[10px] font-bold text-emerald-800 bg-white hover:bg-emerald-600 hover:text-white border border-emerald-300 rounded px-1 py-0.5 transition"
                      >
                        ✓ Mark Clean
                      </button>
                    ) : !isOccupied && isClean ? (
                      <button
                        type="button"
                        onClick={() => toggleRoomStatus(room.id, 'vacant_dirty')}
                        className="w-full text-[10px] font-bold text-amber-800 bg-white hover:bg-amber-600 hover:text-white border border-amber-300 rounded px-1 py-0.5 transition"
                      >
                        Mark Dirty
                      </button>
                    ) : (
                      <span className="text-[10px] text-gray-500 font-medium">In Use</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Housekeeping 3 Shifts Roster Banner */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
              <div>
                <strong className="text-telivity-navy">Morning Shift (06-14h):</strong>
                <p className="text-telivity-mid-grey">Lead: Kavitha Devi • 2 Cleaners on duty</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              <div>
                <strong className="text-telivity-navy">Evening Shift (14-22h):</strong>
                <p className="text-telivity-mid-grey">Lead: Satish Reddy • Turndown & towels</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              <div>
                <strong className="text-telivity-navy">Night Shift (22-06h):</strong>
                <p className="text-telivity-mid-grey">Supervisor: Raju Nayak • Public areas & lobby</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3C: MANAGER & 3 SHIFTS MANAGEMENT PANEL                  */}
      {/* ======================================================== */}
      {(activeDepartment === 'all' || activeDepartment === 'manager') && (
        <div className="bg-white rounded-2xl border border-purple-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700">
                <Briefcase size={22} />
              </div>
              <div>
                <h2 className="text-base font-bold text-telivity-navy flex items-center gap-2">
                  Manager & 3 Shifts Operational Panel
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                    Live Operational Handover
                  </span>
                </h2>
                <p className="text-xs text-telivity-mid-grey">
                  Morning, Evening, and Night shift management, in-charge assignments, and handover logs.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/staff')}
                className="px-3 py-1.5 border border-gray-200 hover:border-purple-400 text-telivity-slate text-xs font-semibold rounded-xl transition"
              >
                Manage Staff & Roles
              </button>
            </div>
          </div>

          {/* 3 Shifts Live Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Morning Shift */}
            <div
              className={`p-4 rounded-xl border transition-all ${
                currentShiftKey === 'morning'
                  ? 'border-purple-400 bg-purple-50/70 shadow-sm ring-2 ring-purple-400/20'
                  : 'border-gray-200 bg-gray-50/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock size={13} /> Morning Shift
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    currentShiftKey === 'morning'
                      ? 'bg-purple-600 text-white animate-pulse'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {currentShiftKey === 'morning' ? 'ACTIVE NOW' : 'Completed'}
                </span>
              </div>
              <p className="text-[11px] text-telivity-mid-grey mt-0.5">06:00 AM — 02:00 PM</p>
              <div className="mt-3 pt-2 border-t border-gray-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-telivity-mid-grey">Manager In-Charge:</span>
                  <strong className="text-telivity-navy">Ramesh Rao</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-telivity-mid-grey">Staff on Duty:</span>
                  <strong className="text-telivity-navy">4 Employees</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-telivity-mid-grey">Cash Drawer Count:</span>
                  <strong className="text-emerald-700">₹7,500 Verified</strong>
                </div>
              </div>
            </div>

            {/* Evening Shift */}
            <div
              className={`p-4 rounded-xl border transition-all ${
                currentShiftKey === 'evening'
                  ? 'border-purple-400 bg-purple-50/70 shadow-sm ring-2 ring-purple-400/20'
                  : 'border-gray-200 bg-gray-50/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock size={13} /> Evening Shift
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    currentShiftKey === 'evening'
                      ? 'bg-purple-600 text-white animate-pulse'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {currentShiftKey === 'evening' ? 'ACTIVE NOW' : 'Scheduled'}
                </span>
              </div>
              <p className="text-[11px] text-telivity-mid-grey mt-0.5">02:00 PM — 10:00 PM</p>
              <div className="mt-3 pt-2 border-t border-gray-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-telivity-mid-grey">Manager In-Charge:</span>
                  <strong className="text-telivity-navy">Priya Sharma</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-telivity-mid-grey">Staff on Duty:</span>
                  <strong className="text-telivity-navy">3 Employees</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-telivity-mid-grey">Expected Check-Ins:</span>
                  <strong className="text-teal-700">2 Arrivals</strong>
                </div>
              </div>
            </div>

            {/* Night Shift */}
            <div
              className={`p-4 rounded-xl border transition-all ${
                currentShiftKey === 'night'
                  ? 'border-purple-400 bg-purple-50/70 shadow-sm ring-2 ring-purple-400/20'
                  : 'border-gray-200 bg-gray-50/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock size={13} /> Night Shift
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    currentShiftKey === 'night'
                      ? 'bg-purple-600 text-white animate-pulse'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {currentShiftKey === 'night' ? 'ACTIVE NOW' : 'Night Audit'}
                </span>
              </div>
              <p className="text-[11px] text-telivity-mid-grey mt-0.5">10:00 PM — 06:00 AM</p>
              <div className="mt-3 pt-2 border-t border-gray-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-telivity-mid-grey">Manager In-Charge:</span>
                  <strong className="text-telivity-navy">Raju Nayak</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-telivity-mid-grey">Staff on Duty:</span>
                  <strong className="text-telivity-navy">2 Employees</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-telivity-mid-grey">Night Audit Status:</span>
                  <strong className="text-purple-700">Ready for Run</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Shift Handover Log */}
          <div className="bg-gray-50/80 rounded-xl p-4 border border-gray-200 space-y-3">
            <h3 className="text-xs font-bold text-telivity-navy uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare size={14} className="text-purple-600" /> Shift Handover Communication Log
            </h3>

            {/* Input Form */}
            <form onSubmit={handleAddHandoverNote} className="flex gap-2">
              <select
                value={selectedShiftForNote}
                onChange={(e) => setSelectedShiftForNote(e.target.value as any)}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white font-semibold text-telivity-navy focus:outline-none focus:border-purple-600"
              >
                <option value="morning">Morning Shift</option>
                <option value="evening">Evening Shift</option>
                <option value="night">Night Shift</option>
              </select>
              <input
                type="text"
                value={newHandoverText}
                onChange={(e) => setNewHandoverText(e.target.value)}
                placeholder="Type handover note for incoming shift manager (e.g. VIP guest requests, key maintenance, balance)..."
                className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-purple-600"
              />
              <button
                type="submit"
                disabled={!newHandoverText.trim()}
                className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 disabled:opacity-50"
              >
                <Send size={12} /> Post Note
              </button>
            </form>

            {/* Notes List */}
            <div className="space-y-2 mt-2 max-h-48 overflow-y-auto">
              {handoverNotes.map((note) => (
                <div key={note.id} className="bg-white p-3 rounded-lg border border-gray-200 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-telivity-navy flex items-center gap-1.5">
                      <span className="capitalize px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 font-bold text-[10px]">
                        {note.shift} Shift
                      </span>
                      {note.author}
                    </span>
                    <span className="text-[10px] text-telivity-mid-grey">{note.time}</span>
                  </div>
                  <p className="text-telivity-slate">{note.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3D: ACCOUNTS & BILLING DEPARTMENT PANEL                  */}
      {/* ======================================================== */}
      {(activeDepartment === 'all' || activeDepartment === 'accounts') && (
        <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
                <Receipt size={22} />
              </div>
              <div>
                <h2 className="text-base font-bold text-telivity-navy flex items-center gap-2">
                  Accounts, Billing & GST Panel
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Dept Head: Sunil Kumar
                  </span>
                </h2>
                <p className="text-xs text-telivity-mid-grey">
                  Financial reconciliations, Cash/UPI/Card payment breakdowns, and GST tax invoices.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/guest-history')}
                className="px-3 py-1.5 border border-gray-200 hover:border-emerald-400 text-telivity-slate text-xs font-semibold rounded-xl transition"
              >
                View Historical Folios
              </button>
            </div>
          </div>

          {/* Accounts Breakdown Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200">
              <span className="text-telivity-mid-grey block font-medium">Total Collected</span>
              <strong className="text-lg font-bold text-emerald-700 mt-1 block">
                ₹{totalCollections.toLocaleString('en-IN')}
              </strong>
              <span className="text-[10px] text-telivity-mid-grey">Today's total revenue</span>
            </div>

            <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200">
              <span className="text-telivity-mid-grey block font-medium">UPI / QR Collections</span>
              <strong className="text-lg font-bold text-telivity-navy mt-1 block">
                ₹{(totalCollections * 0.45).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </strong>
              <span className="text-[10px] text-teal-700 font-bold">45% digital share</span>
            </div>

            <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200">
              <span className="text-telivity-mid-grey block font-medium">Cash Collections</span>
              <strong className="text-lg font-bold text-telivity-navy mt-1 block">
                ₹{(totalCollections * 0.35).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </strong>
              <span className="text-[10px] text-telivity-slate">Drawer cash verified</span>
            </div>

            <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200">
              <span className="text-telivity-mid-grey block font-medium">Card Payments</span>
              <strong className="text-lg font-bold text-telivity-navy mt-1 block">
                ₹{(totalCollections * 0.2).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </strong>
              <span className="text-[10px] text-telivity-slate">POS machine settled</span>
            </div>
          </div>

          {/* Recent Invoices Table */}
          <div className="overflow-x-auto pt-2">
            <h3 className="text-xs font-bold text-telivity-navy uppercase tracking-wider mb-2">
              Recent Invoices & Settled Bills
            </h3>
            <table className="w-full text-xs text-left">
              <thead className="bg-emerald-50/50 text-telivity-slate font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-2 px-3">Invoice #</th>
                  <th className="py-2 px-3">Guest Name</th>
                  <th className="py-2 px-3">Room</th>
                  <th className="py-2 px-3">Payment Mode</th>
                  <th className="py-2 px-3 text-right">Settled Amount</th>
                  <th className="py-2 px-3 text-center">GST Mode</th>
                  <th className="py-2 px-3 text-center">Tax Folio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allStays.slice(0, 5).map((stay) => (
                  <tr key={stay.id} className="hover:bg-gray-50/60 transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-telivity-navy">
                      {stay.billNumber || `INV-SPARK-${stay.roomNumber}`}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-telivity-slate">{stay.guestName}</td>
                    <td className="py-2.5 px-3">Room {stay.roomNumber}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-800">
                        {stay.paymentMethod || 'UPI'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                      ₹{stay.totalAmount?.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="text-[10px] text-teal-800 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded font-mono">
                        12% GST
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => setInvoiceStay(stay)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-telivity-teal/10 hover:bg-telivity-teal text-telivity-teal hover:text-white rounded-lg font-bold text-[11px] transition"
                      >
                        <FileText size={11} /> View Invoice
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODALS */}
      {walkInOpen && (
        <WalkInCheckInModal open={walkInOpen} onClose={() => setWalkInOpen(false)} />
      )}

      {invoiceStay && (
        <BillInvoiceModal
          stay={invoiceStay}
          isOpen={Boolean(invoiceStay)}
          onClose={() => setInvoiceStay(null)}
        />
      )}

      {checkoutStay && (
        <CheckoutModal
          stay={checkoutStay}
          isOpen={Boolean(checkoutStay)}
          onClose={() => setCheckoutStay(null)}
          onCheckoutSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['stays'] });
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            setCheckoutStay(null);
          }}
        />
      )}
    </div>
  );
}
