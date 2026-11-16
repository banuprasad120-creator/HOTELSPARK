import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Clock,
  MessageSquare,
  Send,
  Sparkles,
  Users,
  CheckCircle2,
  AlertCircle,
  DoorOpen,
  DollarSign,
  IndianRupee,
  ShieldCheck,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  ClipboardList,
  UserCheck,
  Check,
  Shield,
  ConciergeBell,
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

interface HandoverNote {
  id: string;
  shift: 'morning' | 'evening' | 'night';
  author: string;
  time: string;
  note: string;
  acknowledged: boolean;
}

const INITIAL_NOTES: HandoverNote[] = [
  {
    id: 'n1',
    shift: 'morning',
    author: 'Ramesh Rao (Front Office Mgr)',
    time: 'Today, 01:45 PM',
    note: 'Room 103 guest completed checkout smoothly. Room 201 requested fresh towels at 4:30 PM. Cash drawer verified at ₹7,500.',
    acknowledged: true,
  },
  {
    id: 'n2',
    shift: 'evening',
    author: 'Priya Sharma (Senior Receptionist)',
    time: 'Today, 05:15 PM',
    note: 'Walk-in check-in for Room 202 completed with Aadhaar verification. Night shift please run EOD report and reconcile POS machine by 11:30 PM.',
    acknowledged: false,
  },
];

export default function ManagerPanel() {
  const { propertyId } = useProperty();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [notes, setNotes] = useState<HandoverNote[]>(() => {
    try {
      const saved = localStorage.getItem('spark_manager_notes');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_NOTES;
  });
  const [newNote, setNewNote] = useState('');
  const [selectedShift, setSelectedShift] = useState<'morning' | 'evening' | 'night'>('evening');

  // Detect current active shift based on 24-hr clock
  const currentHour = new Date().getHours();
  const activeShiftKey: 'morning' | 'evening' | 'night' =
    currentHour >= 6 && currentHour < 14
      ? 'morning'
      : currentHour >= 14 && currentHour < 22
        ? 'evening'
        : 'night';

  // Load Rooms & Stays
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

  // Clean / Dirty counters
  const cleanRooms = rooms.filter((r) => r.status === 'vacant_clean' || r.status === 'clean' || r.status === 'available');
  const dirtyRooms = rooms.filter((r) => r.status === 'vacant_dirty' || r.status === 'dirty');
  const occupiedRooms = rooms.filter((r) => r.status === 'occupied');
  const oooRooms = rooms.filter((r) => r.status === 'out_of_order');

  // Add Handover Note
  const handlePostNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    const noteObj: HandoverNote = {
      id: `note-${Date.now()}`,
      shift: selectedShift,
      author: 'Current Duty Manager',
      time: `Today, ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`,
      note: newNote.trim(),
      acknowledged: false,
    };
    const updated = [noteObj, ...notes];
    setNotes(updated);
    localStorage.setItem('spark_manager_notes', JSON.stringify(updated));
    setNewNote('');
    toast('success', 'Shift handover note posted successfully.');
  };

  const handleAcknowledge = (id: string) => {
    const updated = notes.map((n) => (n.id === id ? { ...n, acknowledged: true } : n));
    setNotes(updated);
    localStorage.setItem('spark_manager_notes', JSON.stringify(updated));
    toast('success', 'Handover note acknowledged.');
  };

  const toggleRoomStatus = (roomId: string, nextStatus: string) => {
    const updated = rooms.map((r) => (r.id === roomId ? { ...r, status: nextStatus } : r));
    saveStoredRooms(updated);
    queryClient.invalidateQueries({ queryKey: ['rooms'] });
    toast('success', `Room status updated to ${nextStatus.replace('_', ' ')}.`);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-purple-900 to-indigo-950 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500 text-white uppercase tracking-wider">
                Manager Console
              </span>
              <span className="text-purple-200 text-xs font-medium">Hotel Spark • 3-Shift Operational Command</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-1 flex items-center gap-2.5">
              <Briefcase size={28} className="text-purple-300" />
              Manager & 3 Shifts Operations Panel
            </h1>
            <p className="text-xs text-purple-200 mt-1 max-w-2xl">
              Supervise hotel shifts, staff attendance, shift handovers, room cleanliness readiness, and night audit balancing.
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
              onClick={() => navigate('/front-office-panel')}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-telivity-teal/80 hover:bg-telivity-teal text-white border border-teal-300/30 text-xs font-bold rounded-xl transition shadow-xs"
            >
              <ConciergeBell size={13} />
              <span>🛎️ Front Office Panel</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/staff')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white text-purple-950 hover:bg-purple-50 font-bold rounded-xl text-xs transition shadow-lg"
            >
              <Users size={14} /> Staff Rosters
            </button>
            <button
              type="button"
              onClick={() => navigate('/housekeeping')}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl backdrop-blur-sm transition"
            >
              <Sparkles size={14} /> Housekeeping
            </button>
          </div>
        </div>

        {/* 3 Shifts Fast Overview Cards */}
        <div className="mt-6 pt-4 border-t border-white/15 grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Morning Shift */}
          <div
            className={`p-3.5 rounded-xl border backdrop-blur-xs transition ${activeShiftKey === 'morning'
              ? 'bg-purple-600/30 border-purple-400 ring-2 ring-purple-400/40 shadow-md'
              : 'bg-white/5 border-white/10'
              }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
                <Clock size={13} className="text-purple-300" /> Morning Shift (06:00 - 14:00)
              </span>
              <span
                className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${activeShiftKey === 'morning' ? 'bg-emerald-500 text-white animate-pulse' : 'bg-white/20 text-purple-200'
                  }`}
              >
                {activeShiftKey === 'morning' ? 'ACTIVE NOW' : 'Completed'}
              </span>
            </div>
            <div className="mt-2 text-xs space-y-0.5 text-purple-100">
              <p>In-Charge: <strong className="text-white">Ramesh Rao</strong> (Front Office Mgr)</p>
              <p>Staff on Duty: <strong className="text-white">4 Employees</strong> (Desk + HK)</p>
              <p>Cash Count: <strong className="text-emerald-300">₹7,500 Reconciled</strong></p>
            </div>
          </div>

          {/* Evening Shift */}
          <div
            className={`p-3.5 rounded-xl border backdrop-blur-xs transition ${activeShiftKey === 'evening'
              ? 'bg-purple-600/30 border-purple-400 ring-2 ring-purple-400/40 shadow-md'
              : 'bg-white/5 border-white/10'
              }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
                <Clock size={13} className="text-purple-300" /> Evening Shift (14:00 - 22:00)
              </span>
              <span
                className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${activeShiftKey === 'evening' ? 'bg-emerald-500 text-white animate-pulse' : 'bg-white/20 text-purple-200'
                  }`}
              >
                {activeShiftKey === 'evening' ? 'ACTIVE NOW' : 'Upcoming'}
              </span>
            </div>
            <div className="mt-2 text-xs space-y-0.5 text-purple-100">
              <p>In-Charge: <strong className="text-white">Priya Sharma</strong> (Sr Receptionist)</p>
              <p>Staff on Duty: <strong className="text-white">3 Employees</strong></p>
              <p>Arrivals Expected: <strong className="text-teal-300">2 Check-Ins</strong></p>
            </div>
          </div>

          {/* Night Shift */}
          <div
            className={`p-3.5 rounded-xl border backdrop-blur-xs transition ${activeShiftKey === 'night'
              ? 'bg-purple-600/30 border-purple-400 ring-2 ring-purple-400/40 shadow-md'
              : 'bg-white/5 border-white/10'
              }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
                <Clock size={13} className="text-purple-300" /> Night Shift (22:00 - 06:00)
              </span>
              <span
                className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${activeShiftKey === 'night' ? 'bg-emerald-500 text-white animate-pulse' : 'bg-white/20 text-purple-200'
                  }`}
              >
                {activeShiftKey === 'night' ? 'ACTIVE NOW' : 'Night Audit'}
              </span>
            </div>
            <div className="mt-2 text-xs space-y-0.5 text-purple-100">
              <p>In-Charge: <strong className="text-white">Raju Nayak</strong> (Supervisor)</p>
              <p>Staff on Duty: <strong className="text-white">2 Employees</strong> (Night desk + Sec)</p>
              <p>Audit Checklist: <strong className="text-purple-200">Scheduled 11:30 PM</strong></p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Interactive Shift Handover Communication Message Board */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-telivity-navy flex items-center gap-2">
              <MessageSquare size={18} className="text-purple-600" />
              Manager Shift Handover Communication Log
            </h2>
            <p className="text-xs text-telivity-mid-grey">
              Outgoing shift leads record operational instructions, guest issues, and cashier balances for incoming duty managers.
            </p>
          </div>
          <span className="text-[11px] font-bold text-purple-800 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-lg">
            3-Shift Continuity Log
          </span>
        </div>

        {/* Note Post Form */}
        <form onSubmit={handlePostNote} className="flex flex-col sm:flex-row gap-2">
          <select
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value as any)}
            className="border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-telivity-navy bg-white focus:outline-none focus:border-purple-600 sm:w-44"
          >
            <option value="morning">Morning Shift (06-14)</option>
            <option value="evening">Evening Shift (14-22)</option>
            <option value="night">Night Shift (22-06)</option>
          </select>
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Type handover note (e.g. VIP guest requests, maintenance updates, cash drawer count)..."
            className="flex-1 border border-gray-300 rounded-xl px-3.5 py-2 text-xs bg-white focus:outline-none focus:border-purple-600"
          />
          <button
            type="submit"
            disabled={!newNote.trim()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-xs"
          >
            <Send size={13} /> Post Handover Note
          </button>
        </form>

        {/* Notes Timeline */}
        <div className="space-y-2.5 max-h-60 overflow-y-auto pt-1">
          {notes.map((note) => (
            <div key={note.id} className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/70 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="capitalize px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                    {note.shift} Shift
                  </span>
                  <strong className="text-telivity-navy">{note.author}</strong>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-telivity-mid-grey">{note.time}</span>
                  {note.acknowledged ? (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                      <Check size={10} /> Acknowledged
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAcknowledge(note.id)}
                      className="text-[10px] font-bold text-purple-700 hover:text-white hover:bg-purple-600 px-2 py-0.5 rounded border border-purple-300 transition"
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              </div>
              <p className="text-telivity-slate pt-0.5">{note.note}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Housekeeping & Cleanliness Oversight (Manager Inspection) */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-2">
          <div>
            <h2 className="text-base font-bold text-telivity-navy flex items-center gap-2">
              <Sparkles size={18} className="text-amber-600" />
              Room Cleanliness Oversight (28 Rooms — Manager Inspection)
            </h2>
            <p className="text-xs text-telivity-mid-grey">
              Inspect rooms before releasing them to the Front Desk for guest check-in.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
              Clean: {cleanRooms.length}
            </span>
            <span className="font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
              Dirty: {dirtyRooms.length}
            </span>
            <span className="font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200">
              Occupied: {occupiedRooms.length}
            </span>
            <span className="font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded-md border border-purple-200">
              Total: 28 Rooms
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
          {rooms.map((room) => {
            const isClean = room.status === 'vacant_clean' || room.status === 'clean' || room.status === 'available';
            const isDirty = room.status === 'vacant_dirty' || room.status === 'dirty';
            const isOccupied = room.status === 'occupied';
            const isBooked = room.status === 'booked';

            const catShort = room.roomTypeName?.includes('Budget')
              ? 'Budget'
              : room.roomTypeName?.includes('Deluxe')
                ? 'Deluxe'
                : room.roomTypeName?.includes('Executive')
                  ? 'Executive'
                  : room.roomTypeName?.includes('Suite')
                    ? 'Suite'
                    : 'Room';

            return (
              <div
                key={room.id}
                className={`p-2.5 rounded-xl border text-center transition ${isClean ? 'border-emerald-300 bg-emerald-50/60' : isOccupied ? 'border-teal-300 bg-teal-50/60' : isBooked ? 'border-purple-300 bg-purple-50/60' : 'border-amber-400 bg-amber-50 shadow-xs'
                  }`}
              >
                <div className="font-bold text-xs text-telivity-navy">Room {room.number}</div>
                <div className="text-[10px] text-telivity-mid-grey truncate font-medium">
                  {catShort} • F{room.floor || (room.number.startsWith('2') ? '2' : '1')}
                </div>
                <span
                  className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold mt-1 uppercase ${isClean ? 'bg-emerald-200 text-emerald-900' : isOccupied ? 'bg-teal-200 text-teal-900' : isBooked ? 'bg-purple-200 text-purple-900' : 'bg-amber-200 text-amber-900'
                    }`}
                >
                  {isClean ? 'Clean' : isOccupied ? 'Occupied' : isBooked ? 'Booked' : 'Dirty'}
                </span>
                <div className="mt-2 pt-1 border-t border-gray-200/50">
                  {isDirty ? (
                    <button
                      type="button"
                      onClick={() => toggleRoomStatus(room.id, 'vacant_clean')}
                      className="w-full text-[10px] font-bold text-emerald-800 bg-white hover:bg-emerald-600 hover:text-white border border-emerald-300 rounded px-1 py-0.5 transition"
                    >
                      Approve Clean
                    </button>
                  ) : !isOccupied && !isBooked && isClean ? (
                    <button
                      type="button"
                      onClick={() => toggleRoomStatus(room.id, 'vacant_dirty')}
                      className="w-full text-[10px] font-bold text-amber-800 bg-white hover:bg-amber-600 hover:text-white border border-amber-300 rounded px-1 py-0.5 transition"
                    >
                      Mark Dirty
                    </button>
                  ) : isOccupied ? (
                    <span className="text-[10px] text-gray-500 font-medium">In Stay</span>
                  ) : (
                    <span className="text-[10px] text-purple-600 font-medium">Reserved</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
