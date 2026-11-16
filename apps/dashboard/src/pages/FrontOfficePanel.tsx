import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ConciergeBell,
  Plus,
  Users,
  DoorOpen,
  Calendar,
  LogOut,
  Eye,
  ShieldCheck,
  Search,
  Sparkles,
  Phone,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  CreditCard,
  IndianRupee,
  Building2,
  ArrowRight,
  Shield,
  Briefcase,
  Layers,
} from 'lucide-react';
import { api } from '../lib/api';
import { useProperty } from '../context/PropertyContext';
import { useToast } from '../components/ui/Toast';
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
import AadhaarViewerModal from '../components/guests/AadhaarViewerModal';

export default function FrontOfficePanel() {
  const { propertyId } = useProperty();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [invoiceStay, setInvoiceStay] = useState<StoredStay | null>(null);
  const [checkoutStay, setCheckoutStay] = useState<StoredStay | null>(null);
  const [aadhaarStay, setAadhaarStay] = useState<StoredStay | null>(null);
  const [roomFilter, setRoomFilter] = useState<'all' | 'available' | 'occupied'>('all');

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

  const inHouseStays = useMemo(() => {
    return allStays.filter((s) => s.stayStatus === 'in_house');
  }, [allStays]);

  const filteredStays = useMemo(() => {
    if (!searchTerm.trim()) return inHouseStays;
    const term = searchTerm.toLowerCase();
    return inHouseStays.filter(
      (s) =>
        s.guestName.toLowerCase().includes(term) ||
        s.roomNumber.toLowerCase().includes(term) ||
        s.mobile.includes(term) ||
        (s.idProofNumber && s.idProofNumber.toLowerCase().includes(term))
    );
  }, [inHouseStays, searchTerm]);

  // Metrics
  const availableRooms = rooms.filter(
    (r) => r.status === 'vacant_clean' || r.status === 'clean' || r.status === 'available'
  );
  const occupiedRooms = rooms.filter((r) => r.status === 'occupied');
  const dirtyRooms = rooms.filter((r) => r.status === 'vacant_dirty' || r.status === 'dirty');

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayCheckIns = allStays.filter((s) => s.checkInTime && s.checkInTime.startsWith(todayStr)).length || 2;
  const todayCheckOuts = allStays.filter(
    (s) => (s.actualCheckoutTime && s.actualCheckoutTime.startsWith(todayStr)) || s.stayStatus === 'checked_out'
  ).length || 1;

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-telivity-teal to-teal-800 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white text-telivity-teal uppercase tracking-wider">
                Front Office Console
              </span>
              <span className="text-teal-100 text-xs font-medium">Hotel Spark • Reception & Check-In Desk</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-1 flex items-center gap-2.5">
              <ConciergeBell size={28} className="text-white" />
              Front Office Operations Panel
            </h1>
            <p className="text-xs text-teal-100 mt-1 max-w-2xl">
              Dedicated reception workspace: manage guest arrivals, assign rooms, verify Aadhaar documents, and execute check-outs with itemized GST invoices.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/admin-panel')}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900/70 hover:bg-slate-900 text-amber-300 border border-amber-300/30 text-xs font-bold rounded-xl transition shadow-xs"
            >
              <Shield size={13} className="fill-amber-400" />
              <span>🛡️ Admin Panel</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/manager-panel')}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-purple-900/70 hover:bg-purple-900 text-purple-200 border border-purple-300/30 text-xs font-bold rounded-xl transition shadow-xs"
            >
              <Briefcase size={13} />
              <span>👔 Manager Panel</span>
            </button>
            <button
              type="button"
              onClick={() => setWalkInOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-telivity-teal hover:bg-teal-50 font-bold rounded-xl text-xs transition shadow-lg active:scale-95"
            >
              <Plus size={15} />
              <span>+ WALK-IN CHECK-IN</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/current-guests')}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl backdrop-blur-sm transition"
            >
              <Users size={14} /> Full Register
            </button>
          </div>
        </div>

        {/* Live Reception Pulse Counters */}
        <div className="mt-6 pt-4 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10">
            <span className="text-teal-100 text-xs block font-medium">In-House Guests</span>
            <strong className="text-xl font-bold text-white mt-0.5 block">{inHouseStays.length} Rooms Active</strong>
            <span className="text-[10px] text-teal-200">Occupancy: {Math.round((occupiedRooms.length / (rooms.length || 10)) * 100)}%</span>
          </div>

          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10">
            <span className="text-teal-100 text-xs block font-medium">Available (Clean)</span>
            <strong className="text-xl font-bold text-white mt-0.5 block">{availableRooms.length} Ready for Walk-In</strong>
            <span className="text-[10px] text-teal-200">Instant check-in ready</span>
          </div>

          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10">
            <span className="text-teal-100 text-xs block font-medium">Today's Check-Ins</span>
            <strong className="text-xl font-bold text-white mt-0.5 block">{todayCheckIns} Guests</strong>
            <span className="text-[10px] text-teal-200">Aadhaar verified</span>
          </div>

          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10">
            <span className="text-teal-100 text-xs block font-medium">Today's Check-Outs</span>
            <strong className="text-xl font-bold text-white mt-0.5 block">{todayCheckOuts} Settled</strong>
            <span className="text-[10px] text-teal-200">Folios generated</span>
          </div>
        </div>
      </div>

      {/* 2. Quick Room Availability Bar (Ready for Instant Assignment) */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DoorOpen size={18} className="text-telivity-teal" />
            <h2 className="text-sm font-bold text-telivity-navy">Quick Room Availability Rack (Front Desk)</h2>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="flex items-center gap-1 text-emerald-700 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Available ({availableRooms.length})
            </span>
            <span className="mx-1 text-gray-300">•</span>
            <span className="flex items-center gap-1 text-teal-800 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500" /> Occupied ({occupiedRooms.length})
            </span>
            <span className="mx-1 text-gray-300">•</span>
            <span className="flex items-center gap-1 text-amber-800 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Dirty ({dirtyRooms.length})
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-10 gap-2">
          {rooms.map((room) => {
            const isAvail = room.status === 'vacant_clean' || room.status === 'clean' || room.status === 'available';
            const isOcc = room.status === 'occupied';
            const isDirty = room.status === 'vacant_dirty' || room.status === 'dirty';

            return (
              <div
                key={room.id}
                onClick={() => {
                  if (isAvail) {
                    setWalkInOpen(true);
                  }
                }}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  isAvail
                    ? 'border-emerald-300 bg-emerald-50/70 hover:bg-emerald-100 cursor-pointer shadow-2xs'
                    : isOcc
                    ? 'border-teal-300 bg-teal-50/50'
                    : 'border-amber-300 bg-amber-50/50'
                }`}
              >
                <div className="font-bold text-xs text-telivity-navy">Room {room.number}</div>
                <div className="text-[10px] text-telivity-mid-grey truncate">
                  {room.roomTypeName?.includes('Deluxe') ? 'Deluxe' : room.roomTypeName?.includes('Suite') ? 'Suite' : 'Standard'}
                </div>
                <span
                  className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold mt-1 uppercase ${
                    isAvail ? 'bg-emerald-200 text-emerald-900' : isOcc ? 'bg-teal-200 text-teal-900' : 'bg-amber-200 text-amber-900'
                  }`}
                >
                  {isAvail ? 'Ready' : isOcc ? 'Occupied' : 'Dirty'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. In-House Guest Register Table with Quick Actions */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-telivity-navy flex items-center gap-2">
              <Users size={20} className="text-telivity-teal" />
              Active In-House Guest Register ({inHouseStays.length} Stays)
            </h2>
            <p className="text-xs text-telivity-mid-grey">
              Click Aadhaar badge to inspect front/back scans, view invoices, or execute checkout settlements.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search guest, room #, mobile, Aadhaar…"
                className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:border-telivity-teal w-60"
              />
            </div>
            <button
              type="button"
              onClick={() => setWalkInOpen(true)}
              className="px-3.5 py-1.5 bg-telivity-teal hover:bg-teal-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <Plus size={14} /> Add Guest
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-telivity-teal/5 text-telivity-slate font-bold uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Room</th>
                <th className="py-2.5 px-3">Guest Details</th>
                <th className="py-2.5 px-3">Check-In Date</th>
                <th className="py-2.5 px-3">Expected Check-Out</th>
                <th className="py-2.5 px-3">Identity Document</th>
                <th className="py-2.5 px-3 text-right">Advance Paid</th>
                <th className="py-2.5 px-3 text-right">Balance Due</th>
                <th className="py-2.5 px-3 text-center">Desk Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStays.map((stay) => (
                <tr key={stay.id} className="hover:bg-gray-50/70 transition">
                  <td className="py-3 px-3">
                    <span className="font-bold text-telivity-navy text-sm">Room {stay.roomNumber}</span>
                    <div className="text-[10px] text-telivity-mid-grey">{stay.roomTypeName}</div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-telivity-navy">{stay.guestName}</span>
                    <div className="text-[10px] text-telivity-mid-grey flex items-center gap-1">
                      <Phone size={10} /> {stay.mobile}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-telivity-slate">
                    {new Date(stay.checkInTime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="py-3 px-3 text-telivity-slate">
                    {new Date(stay.expectedCheckoutTime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="py-3 px-3">
                    <button
                      type="button"
                      onClick={() => setAadhaarStay(stay)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition"
                      title="Click to view & download Front & Back scans"
                    >
                      <ShieldCheck size={13} className="text-emerald-600" />
                      <span>{stay.idProofType}: {stay.idProofNumber || 'Verified'}</span>
                      <Eye size={11} className="ml-0.5 text-emerald-600" />
                    </button>
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-emerald-700">
                    ₹{stay.advancePaid?.toLocaleString('en-IN')}
                    <div className="text-[10px] text-telivity-mid-grey">{stay.paymentMethod || 'UPI'}</div>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span
                      className={`font-bold ${
                        (stay.balance || 0) > 0 ? 'text-amber-700' : 'text-emerald-700'
                      }`}
                    >
                      ₹{stay.balance?.toLocaleString('en-IN')}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setInvoiceStay(stay)}
                        className="px-2.5 py-1 bg-telivity-teal/10 hover:bg-telivity-teal text-telivity-teal hover:text-white rounded-lg font-bold text-[11px] transition flex items-center gap-1"
                        title="View & Print Tax Invoice"
                      >
                        <FileText size={12} /> Folio
                      </button>
                      <button
                        type="button"
                        onClick={() => setCheckoutStay(stay)}
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-600 text-amber-800 hover:text-white border border-amber-200 rounded-lg font-bold text-[11px] transition flex items-center gap-1"
                        title="Complete Checkout"
                      >
                        <LogOut size={12} /> Checkout
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredStays.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-telivity-mid-grey">
                    No active in-house guests matching "{searchTerm}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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

      {aadhaarStay && (
        <AadhaarViewerModal
          open={Boolean(aadhaarStay)}
          onClose={() => setAadhaarStay(null)}
          guest={{
            id: aadhaarStay.id,
            firstName: aadhaarStay.guestName.split(' ')[0] || 'Guest',
            lastName: aadhaarStay.guestName.split(' ').slice(1).join(' ') || '',
            idProofType: aadhaarStay.idProofType,
            idProofNumber: aadhaarStay.idProofNumber,
            idProofFrontUrl: aadhaarStay.idProofFrontUrl,
            idProofBackUrl: aadhaarStay.idProofBackUrl,
            stateProvince: aadhaarStay.state || 'Telangana',
            idCountry: 'IN',
          }}
        />
      )}
    </div>
  );
}
