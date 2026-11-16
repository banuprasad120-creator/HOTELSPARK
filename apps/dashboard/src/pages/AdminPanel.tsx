import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Briefcase,
  ConciergeBell,
  Building2,
  Users,
  DoorOpen,
  IndianRupee,
  Receipt,
  Settings,
  TrendingUp,
  CreditCard,
  Plus,
  Edit2,
  Check,
  AlertCircle,
  FileText,
  BadgeCheck,
  Sparkles,
  ArrowRight,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../lib/api';
import { useProperty } from '../context/PropertyContext';
import { useToast } from '../components/ui/Toast';
import {
  getStoredRooms,
  saveStoredRooms,
  getStoredStays,
  type StoredRoom,
  type StoredStay,
} from '../lib/supabaseAdapter';
import WalkInCheckInModal from '../components/front-desk/WalkInCheckInModal';

interface StaffMember {
  id: string;
  name: string;
  role: string;
  department: string;
  shift: string;
  salary: number;
  mobile: string;
  status: 'active' | 'on_leave';
}

const DEFAULT_STAFF: StaffMember[] = [
  {
    id: 'emp-01',
    name: 'Banu Prasad',
    role: 'Hotel Admin / Owner',
    department: 'Management',
    shift: 'General (09:00 - 18:00)',
    salary: 120000,
    mobile: '+91 98897 53200',
    status: 'active',
  },
  {
    id: 'emp-02',
    name: 'Ramesh Rao',
    role: 'Front Office Manager',
    department: 'Front Office',
    shift: 'Morning (06:00 - 14:00)',
    salary: 55000,
    mobile: '+91 98760 11223',
    status: 'active',
  },
  {
    id: 'emp-03',
    name: 'Suresh Goud',
    role: 'Night Shift Manager',
    department: 'Operations',
    shift: 'Night (22:00 - 06:00)',
    salary: 45000,
    mobile: '+91 98760 44556',
    status: 'active',
  },
  {
    id: 'emp-04',
    name: 'Sunil Kumar',
    role: 'Accountant & Cashier',
    department: 'Finance',
    shift: 'General (10:00 - 18:00)',
    salary: 40000,
    mobile: '+91 98760 55667',
    status: 'active',
  },
  {
    id: 'emp-05',
    name: 'Priya Sharma',
    role: 'Senior Receptionist',
    department: 'Front Office',
    shift: 'Evening (14:00 - 22:00)',
    salary: 35000,
    mobile: '+91 98760 22334',
    status: 'active',
  },
  {
    id: 'emp-06',
    name: 'Kavitha Devi',
    role: 'Housekeeping Supervisor',
    department: 'Housekeeping',
    shift: 'Morning (07:00 - 15:00)',
    salary: 32000,
    mobile: '+91 98760 33445',
    status: 'active',
  },
  {
    id: 'emp-07',
    name: 'Raju Nayak',
    role: 'Room Attendant',
    department: 'Housekeeping',
    shift: 'Evening (14:00 - 22:00)',
    salary: 25000,
    mobile: '+91 98760 66778',
    status: 'active',
  },
];

interface TariffPlan {
  category: string;
  code: string;
  basePrice: number;
  roomsCount: number;
  gstRate: number;
}

const DEFAULT_TARIFFS: TariffPlan[] = [
  { category: 'Deluxe King Room', code: 'DLX-KNG', basePrice: 3500, roomsCount: 6, gstRate: 12 },
  { category: 'Executive Suite', code: 'EXE-STE', basePrice: 6500, roomsCount: 2, gstRate: 12 },
  { category: 'Standard Queen Room', code: 'STD-QEN', basePrice: 2500, roomsCount: 2, gstRate: 12 },
];

export default function AdminPanel() {
  const { propertyId } = useProperty();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [walkInOpen, setWalkInOpen] = useState(false);
  const [editingTariff, setEditingTariff] = useState<string | null>(null);
  const [editPriceInput, setEditPriceInput] = useState<number>(0);

  // Tariffs State with persistence
  const [tariffs, setTariffs] = useState<TariffPlan[]>(() => {
    try {
      const saved = localStorage.getItem('spark_admin_tariffs');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEFAULT_TARIFFS;
  });

  // Staff State with persistence
  const [staffList, setStaffList] = useState<StaffMember[]>(() => {
    try {
      const saved = localStorage.getItem('spark_admin_staff');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEFAULT_STAFF;
  });

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

  // Financial aggregates
  const occupiedRooms = rooms.filter((r) => r.status === 'occupied');
  const cleanRooms = rooms.filter((r) => r.status === 'vacant_clean' || r.status === 'clean' || r.status === 'available');
  const dirtyRooms = rooms.filter((r) => r.status === 'vacant_dirty' || r.status === 'dirty');
  const inHouseStays = allStays.filter((s) => s.stayStatus === 'in_house');

  const totalGrossRevenue = useMemo(() => {
    return allStays.reduce((acc, s) => acc + (s.totalAmount || 0), 0) || 43500;
  }, [allStays]);

  const totalCollectedAdvance = useMemo(() => {
    return allStays.reduce((acc, s) => acc + (s.advancePaid || 0), 0) || 31000;
  }, [allStays]);

  const totalUncollectedBalance = useMemo(() => {
    return inHouseStays.reduce((acc, s) => acc + (s.balance || 0), 0) || 12500;
  }, [inHouseStays]);

  const monthlyPayrollTotal = useMemo(() => {
    return staffList.reduce((acc, s) => acc + s.salary, 0);
  }, [staffList]);

  // Save Tariff Price
  const handleSaveTariff = (category: string) => {
    if (editPriceInput <= 0) {
      toast('error', 'Please enter a valid tariff price.');
      return;
    }
    const updated = tariffs.map((t) => (t.category === category ? { ...t, basePrice: editPriceInput } : t));
    setTariffs(updated);
    localStorage.setItem('spark_admin_tariffs', JSON.stringify(updated));
    setEditingTariff(null);
    toast('success', `Updated ${category} base tariff to ₹${editPriceInput.toLocaleString('en-IN')}/night.`);
  };

  const handleToggleRoomStatus = (roomId: string, nextStatus: string) => {
    const updated = rooms.map((r) => (r.id === roomId ? { ...r, status: nextStatus } : r));
    saveStoredRooms(updated);
    queryClient.invalidateQueries({ queryKey: ['rooms'] });
    toast('success', `Room status updated by Admin.`);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-telivity-navy to-slate-950 rounded-2xl p-6 text-white shadow-xl border border-white/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950 uppercase tracking-wider flex items-center gap-1">
                <Shield size={11} className="fill-slate-950" /> Admin & Owner Console
              </span>
              <span className="text-slate-300 text-xs font-medium">Hotel Spark • Karimnagar Property</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-1 flex items-center gap-2.5">
              <Building2 size={28} className="text-amber-400" />
              Admin Operations & Governance Panel
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Owner command center: govern hotel revenues, room base tariffs, employee salaries & access control, GST books, and system configuration.
            </p>
          </div>

          {/* Quick Department Panel Jump Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/manager-panel')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-700 hover:bg-purple-600 text-white font-bold rounded-xl text-xs transition shadow-md active:scale-95"
            >
              <Briefcase size={15} className="text-purple-200" />
              <span>👔 Manager Panel</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/front-office-panel')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-telivity-teal hover:bg-teal-500 text-white font-bold rounded-xl text-xs transition shadow-md active:scale-95"
            >
              <ConciergeBell size={15} className="text-teal-100" />
              <span>🛎️ Front Office Panel</span>
            </button>
            <button
              type="button"
              onClick={() => setWalkInOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl backdrop-blur-sm transition"
            >
              <Plus size={14} /> New Check-In
            </button>
          </div>
        </div>

        {/* Master Financial & Operations Pulse */}
        <div className="mt-6 pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white/5 backdrop-blur-xs p-3 rounded-xl border border-white/10">
            <span className="text-slate-300 text-[11px] block font-medium">Gross Collections</span>
            <strong className="text-lg font-bold text-emerald-400 mt-0.5 block">
              ₹{totalGrossRevenue.toLocaleString('en-IN')}
            </strong>
            <span className="text-[10px] text-slate-400">Total billings</span>
          </div>

          <div className="bg-white/5 backdrop-blur-xs p-3 rounded-xl border border-white/10">
            <span className="text-slate-300 text-[11px] block font-medium">Advance Realized</span>
            <strong className="text-lg font-bold text-white mt-0.5 block">
              ₹{totalCollectedAdvance.toLocaleString('en-IN')}
            </strong>
            <span className="text-[10px] text-emerald-300 font-semibold">In Bank / Cash</span>
          </div>

          <div className="bg-white/5 backdrop-blur-xs p-3 rounded-xl border border-white/10">
            <span className="text-slate-300 text-[11px] block font-medium">Pending Balances</span>
            <strong className="text-lg font-bold text-amber-400 mt-0.5 block">
              ₹{totalUncollectedBalance.toLocaleString('en-IN')}
            </strong>
            <span className="text-[10px] text-amber-300">To collect at checkout</span>
          </div>

          <div className="bg-white/5 backdrop-blur-xs p-3 rounded-xl border border-white/10">
            <span className="text-slate-300 text-[11px] block font-medium">Room Occupancy</span>
            <strong className="text-lg font-bold text-white mt-0.5 block">
              {occupiedRooms.length} / {rooms.length || 10} Rooms
            </strong>
            <span className="text-[10px] text-teal-300 font-semibold">
              {Math.round((occupiedRooms.length / (rooms.length || 10)) * 100)}% Occupancy
            </span>
          </div>

          <div className="bg-white/5 backdrop-blur-xs p-3 rounded-xl border border-white/10">
            <span className="text-slate-300 text-[11px] block font-medium">Average Daily Rate</span>
            <strong className="text-lg font-bold text-white mt-0.5 block">₹3,500</strong>
            <span className="text-[10px] text-slate-400">Target: ₹3,200</span>
          </div>

          <div className="bg-white/5 backdrop-blur-xs p-3 rounded-xl border border-white/10">
            <span className="text-slate-300 text-[11px] block font-medium">Monthly Payroll</span>
            <strong className="text-lg font-bold text-purple-300 mt-0.5 block">
              ₹{monthlyPayrollTotal.toLocaleString('en-IN')}
            </strong>
            <span className="text-[10px] text-purple-200">7 Active Staff</span>
          </div>
        </div>
      </div>

      {/* 2. Room Base Tariffs & Pricing Governance */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-telivity-navy flex items-center gap-2">
              <IndianRupee size={20} className="text-amber-600" />
              Room Categories & Base Tariffs (Live Pricing Control)
            </h2>
            <p className="text-xs text-telivity-mid-grey">
              Admin-authorized base prices per night applied to front desk walk-ins and guest online booking engine.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/rooms/types')}
            className="text-xs font-bold text-telivity-teal hover:underline flex items-center gap-1"
          >
            Manage Category Definitions →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tariffs.map((plan) => {
            const isEditing = editingTariff === plan.category;
            return (
              <div
                key={plan.category}
                className="p-5 rounded-2xl border border-gray-200 bg-gradient-to-b from-gray-50/50 to-white hover:border-amber-300 hover:shadow-md transition space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-gray-200 text-gray-700">
                    {plan.code}
                  </span>
                  <span className="text-[11px] text-telivity-mid-grey font-medium">
                    {plan.roomsCount} Rooms
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-sm text-telivity-navy">{plan.category}</h3>
                  <p className="text-[11px] text-telivity-mid-grey mt-0.5">GST Rate: {plan.gstRate}% (6% CGST + 6% SGST)</p>
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 w-full">
                      <span className="text-xs font-bold text-telivity-navy">₹</span>
                      <input
                        type="number"
                        value={editPriceInput}
                        onChange={(e) => setEditPriceInput(Number(e.target.value))}
                        className="w-24 px-2 py-1 text-xs border border-amber-400 rounded-lg focus:outline-none font-bold"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveTariff(plan.category)}
                        className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                        title="Save Price"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingTariff(null)}
                        className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <span className="text-[10px] text-telivity-mid-grey block">Base Tariff / Night</span>
                        <span className="text-xl font-bold text-telivity-navy">
                          ₹{plan.basePrice.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTariff(plan.category);
                          setEditPriceInput(plan.basePrice);
                        }}
                        className="px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-amber-400 bg-white hover:bg-amber-50 text-xs font-bold text-slate-700 transition flex items-center gap-1"
                      >
                        <Edit2 size={12} className="text-amber-600" />
                        <span>Edit Tariff</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Room Inventory & Status Override Rack */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-telivity-navy flex items-center gap-2">
              <DoorOpen size={20} className="text-telivity-teal" />
              Room Inventory & Admin Override Rack (10 Rooms)
            </h2>
            <p className="text-xs text-telivity-mid-grey">
              Real-time room status with direct admin overrides (Available / Occupied / Dirty / Out of Order).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/rooms')}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-slate-800 rounded-xl text-xs font-bold transition"
            >
              Manage All Rooms Rack →
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-telivity-slate font-bold uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Room #</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Floor</th>
                <th className="py-2.5 px-3">Base Price</th>
                <th className="py-2.5 px-3">Current Status</th>
                <th className="py-2.5 px-3 text-right">Admin Override Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rooms.map((room) => {
                const isAvail = room.status === 'vacant_clean' || room.status === 'clean' || room.status === 'available';
                const isOcc = room.status === 'occupied';
                const isDirty = room.status === 'vacant_dirty' || room.status === 'dirty';
                const isOoo = room.status === 'out_of_order';

                const matchedTariff = tariffs.find((t) =>
                  room.roomTypeName?.toLowerCase().includes(t.category.toLowerCase().split(' ')[0])
                );
                const price = matchedTariff?.basePrice || 3500;

                return (
                  <tr key={room.id} className="hover:bg-gray-50/70 transition">
                    <td className="py-3 px-3 font-bold text-telivity-navy text-sm">
                      Room {room.number}
                    </td>
                    <td className="py-3 px-3 text-telivity-slate font-medium">
                      {room.roomTypeName || 'Deluxe King Room'}
                    </td>
                    <td className="py-3 px-3 text-telivity-mid-grey">Floor {room.floor || '1'}</td>
                    <td className="py-3 px-3 font-bold text-telivity-navy">
                      ₹{price.toLocaleString('en-IN')} / night
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isAvail
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : isOcc
                            ? 'bg-teal-100 text-teal-800 border border-teal-300'
                            : isDirty
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-red-100 text-red-800 border border-red-300'
                        }`}
                      >
                        {isAvail ? 'Available / Clean' : isOcc ? 'Occupied' : isDirty ? 'Dirty / Cleaning' : 'Out of Order'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {!isAvail && (
                          <button
                            type="button"
                            onClick={() => handleToggleRoomStatus(room.id, 'vacant_clean')}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white rounded text-[11px] font-bold transition border border-emerald-200"
                            title="Force mark as Available & Clean"
                          >
                            Mark Available
                          </button>
                        )}
                        {!isDirty && (
                          <button
                            type="button"
                            onClick={() => handleToggleRoomStatus(room.id, 'vacant_dirty')}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-600 text-amber-800 hover:text-white rounded text-[11px] font-bold transition border border-amber-200"
                            title="Mark as Dirty"
                          >
                            Mark Dirty
                          </button>
                        )}
                        {!isOoo ? (
                          <button
                            type="button"
                            onClick={() => handleToggleRoomStatus(room.id, 'out_of_order')}
                            className="px-2 py-1 bg-gray-100 hover:bg-red-600 text-gray-700 hover:text-white rounded text-[11px] font-bold transition"
                            title="Maintenance mode"
                          >
                            Maintenance
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleRoomStatus(room.id, 'vacant_clean')}
                            className="px-2 py-1 bg-emerald-600 text-white rounded text-[11px] font-bold transition"
                          >
                            Restore Room
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Hotel Staff Roster & Monthly Payroll Governance */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-telivity-navy flex items-center gap-2">
              <Users size={20} className="text-purple-600" />
              Hotel Staff Roster & Monthly Payroll Governance
            </h2>
            <p className="text-xs text-telivity-mid-grey">
              7 Active Employees • Monthly Payroll: ₹{monthlyPayrollTotal.toLocaleString('en-IN')} • Shift allocations & designations.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/staff')}
            className="px-3.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <Users size={14} /> Open 3-Shift Staff Module →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-purple-50/60 text-telivity-slate font-bold uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Employee Name</th>
                <th className="py-2.5 px-3">Designation / Role</th>
                <th className="py-2.5 px-3">Department</th>
                <th className="py-2.5 px-3">Assigned Shift</th>
                <th className="py-2.5 px-3 text-right">Monthly Salary</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {staffList.map((emp) => (
                <tr key={emp.id} className="hover:bg-purple-50/20 transition">
                  <td className="py-3 px-3">
                    <span className="font-bold text-telivity-navy">{emp.name}</span>
                    <div className="text-[10px] text-telivity-mid-grey">{emp.mobile}</div>
                  </td>
                  <td className="py-3 px-3 font-semibold text-telivity-slate">
                    {emp.role}
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700">
                      {emp.department}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-telivity-slate">{emp.shift}</td>
                  <td className="py-3 px-3 text-right font-bold text-telivity-navy">
                    ₹{emp.salary.toLocaleString('en-IN')} / mo
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. GST Tax & Financial Books Compliance */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-telivity-navy flex items-center gap-2">
              <Receipt size={20} className="text-emerald-600" />
              GST Tax Compliance & Financial Books (Hotel Spark Karimnagar)
            </h2>
            <p className="text-xs text-telivity-mid-grey">
              Official Indian GST particulars, SAC codes, and automated tax folio configuration.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/tax')}
            className="text-xs font-bold text-telivity-teal hover:underline"
          >
            Configure Tax Rules →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60">
            <span className="text-[11px] text-telivity-mid-grey font-medium block">GSTIN Registration</span>
            <strong className="text-sm font-bold text-telivity-navy block mt-1 tracking-wider">
              36ABCDE1234F1Z5
            </strong>
            <span className="text-[10px] text-emerald-700 font-semibold mt-1 inline-block">Active • Telangana State</span>
          </div>

          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60">
            <span className="text-[11px] text-telivity-mid-grey font-medium block">SAC Code (Accommodation)</span>
            <strong className="text-sm font-bold text-telivity-navy block mt-1">
              996311 (Hotel Stay Services)
            </strong>
            <span className="text-[10px] text-telivity-mid-grey mt-1 inline-block">Standard Hotel SAC</span>
          </div>

          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60">
            <span className="text-[11px] text-telivity-mid-grey font-medium block">GST Slab Rate</span>
            <strong className="text-sm font-bold text-telivity-navy block mt-1">
              12% GST (6% CGST + 6% SGST)
            </strong>
            <span className="text-[10px] text-emerald-700 font-semibold mt-1 inline-block">Tax Included in Tariff</span>
          </div>

          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 flex flex-col justify-between">
            <div>
              <span className="text-[11px] text-telivity-mid-grey font-medium block">EOD Night Audit & Ledger</span>
              <strong className="text-sm font-bold text-telivity-navy block mt-1">
                Books Balanced
              </strong>
            </div>
            <button
              type="button"
              onClick={() => navigate('/folios')}
              className="mt-2 w-full py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition text-center"
            >
              View All Folios & Invoices
            </button>
          </div>
        </div>
      </div>

      {/* MODAL */}
      {walkInOpen && (
        <WalkInCheckInModal open={walkInOpen} onClose={() => setWalkInOpen(false)} />
      )}
    </div>
  );
}
