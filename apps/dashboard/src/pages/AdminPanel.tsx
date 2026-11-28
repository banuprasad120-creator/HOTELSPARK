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
  KeyRound,
} from 'lucide-react';
import { api } from '../lib/api';
import { useProperty } from '../context/PropertyContext';
import { useToast } from '../components/ui/Toast';
import {
  EMPTY_TARIFF_CONFIG,
  type StoredRoom,
  type StoredStay,
  type HotelTariffConfig,
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
  status: string;
}

export default function AdminPanel() {
  const { propertyId } = useProperty();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [walkInOpen, setWalkInOpen] = useState(false);

  const { data: tariffData } = useQuery<HotelTariffConfig>({
    queryKey: ['tariff-config', propertyId],
    queryFn: () => api.get('/v1/tariff-config', { params: { propertyId } }).then((r) => r.data),
    enabled: !!propertyId,
  });
  const tariffConfig: HotelTariffConfig = tariffData ?? EMPTY_TARIFF_CONFIG;

  // Load Staff from Supabase
  const { data: staffData } = useQuery({
    queryKey: ['employees', propertyId],
    queryFn: () => api.get('/v1/employees', { params: { propertyId } }).then((r) => r.data),
    enabled: !!propertyId,
  });
  const staffList: StaffMember[] = useMemo(() => {
    const raw = staffData?.data ?? staffData;
    if (!Array.isArray(raw)) return [];
    return raw.map((e: any) => ({
      id: e.id,
      name: e.name,
      role: e.designation || e.role,
      department: e.departmentName || 'Operations',
      shift: e.shift || 'morning',
      salary: Number(e.salary || 0),
      mobile: e.mobile || '',
      status: e.status || 'active',
    }));
  }, [staffData]);

  // Load Rooms from Supabase
  const { data: roomsData } = useQuery({
    queryKey: ['rooms', propertyId],
    queryFn: () => api.get('/v1/rooms', { params: { propertyId } }).then((r) => r.data),
    enabled: !!propertyId,
  });
  const rooms: StoredRoom[] = useMemo(() => {
    const raw = roomsData?.data ?? roomsData;
    return Array.isArray(raw) ? raw : [];
  }, [roomsData]);

  // Load Stays from Supabase
  const { data: staysData } = useQuery({
    queryKey: ['stays', propertyId],
    queryFn: () => api.get('/v1/stays', { params: { propertyId } }).then((r) => r.data),
    enabled: !!propertyId,
  });
  const allStays: StoredStay[] = useMemo(() => {
    const raw = staysData?.data ?? staysData;
    return Array.isArray(raw) ? raw : [];
  }, [staysData]);

  // Financial aggregates from real records only (0 when empty)
  const occupiedRooms = rooms.filter((r) => r.status === 'occupied');
  const inHouseStays = allStays.filter((s) => s.stayStatus === 'in_house');

  const totalGrossRevenue = useMemo(() => {
    return allStays.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
  }, [allStays]);

  const totalCollectedAdvance = useMemo(() => {
    return allStays.reduce((acc, s) => acc + (s.advancePaid || 0), 0);
  }, [allStays]);

  const totalUncollectedBalance = useMemo(() => {
    return inHouseStays.reduce((acc, s) => acc + (s.balance || 0), 0);
  }, [inHouseStays]);

  const totalAdr = useMemo(() => {
    const totalNights = allStays.reduce((acc, s) => acc + Math.max(1, s.nights || 1), 0);
    return totalNights > 0 ? Math.round(totalGrossRevenue / totalNights) : 0;
  }, [allStays, totalGrossRevenue]);

  const monthlyPayrollTotal = useMemo(() => {
    return staffList.filter((s) => s.status === 'active').reduce((acc, s) => acc + s.salary, 0);
  }, [staffList]);

  const handleToggleRoomStatus = async (roomId: string, nextStatus: string) => {
    try {
      await api.patch(`/v1/rooms/${roomId}`, { propertyId, status: nextStatus });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast('success', `Room status updated by Admin.`);
    } catch (err: any) {
      toast('error', err?.message || 'Failed to update room status.');
    }
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
              {occupiedRooms.length} / {rooms.length} Rooms
            </strong>
            <span className="text-[10px] text-teal-300 font-semibold">
              {rooms.length > 0 ? Math.round((occupiedRooms.length / rooms.length) * 100) : 0}% Occupancy
            </span>
          </div>

          <div className="bg-white/5 backdrop-blur-xs p-3 rounded-xl border border-white/10">
            <span className="text-slate-300 text-[11px] block font-medium">Average Daily Rate</span>
            <strong className="text-lg font-bold text-white mt-0.5 block">₹{totalAdr.toLocaleString('en-IN')}</strong>
            <span className="text-[10px] text-slate-400">From live stay records</span>
          </div>

          <div className="bg-white/5 backdrop-blur-xs p-3 rounded-xl border border-white/10">
            <span className="text-slate-300 text-[11px] block font-medium">Monthly Payroll</span>
            <strong className="text-lg font-bold text-purple-300 mt-0.5 block">
              ₹{monthlyPayrollTotal.toLocaleString('en-IN')}
            </strong>
            <span className="text-[10px] text-purple-200">{staffList.filter((s) => s.status === 'active').length} Active Staff</span>
          </div>
        </div>
      </div>

      {/* 2. Room Base Tariffs & Pricing Governance */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-telivity-navy flex items-center gap-2">
              <IndianRupee size={20} className="text-amber-600" />
              Room Categories & Pricing ({rooms.length}-Room Inventory)
            </h2>
            <p className="text-xs text-telivity-mid-grey">
              Pricing schedule loaded from Supabase rate plans. Extra person charge: ₹{tariffConfig.extraPersonCharge}/night.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/tariff-settings')}
            className="text-xs font-bold text-telivity-teal hover:underline flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200"
          >
            ⚙️ Configure Tariffs & Inventory ({rooms.length} Rooms) →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {tariffConfig.categories.map((cat) => (
            <div
              key={cat.id}
              className="p-5 rounded-2xl border border-gray-200 bg-gradient-to-b from-gray-50/50 to-white hover:border-amber-300 hover:shadow-md transition space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-telivity-navy text-white">
                  {cat.code}
                </span>
                <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                  {cat.assignedRoomsCount} Rooms
                </span>
              </div>

              <div>
                <h3 className="font-bold text-sm text-telivity-navy">{cat.name}</h3>
                <p className="text-[11px] text-telivity-mid-grey mt-0.5 line-clamp-2">
                  {cat.description}
                </p>
              </div>

              <div className="pt-2 border-t border-gray-100 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-telivity-mid-grey font-medium">Single Occupancy:</span>
                  <span className="font-bold text-telivity-navy">
                    {cat.singleOccupancyPrice !== null ? `₹${cat.singleOccupancyPrice.toLocaleString('en-IN')}` : (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-gray-100 text-gray-500">Not configured</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-telivity-mid-grey font-medium">Double Occupancy:</span>
                  <span className="font-bold text-telivity-navy">
                    {cat.doubleOccupancyPrice !== null ? `₹${cat.doubleOccupancyPrice.toLocaleString('en-IN')}` : (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-gray-100 text-gray-500">Not configured</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Room Inventory & Status Override Rack */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-telivity-navy flex items-center gap-2">
              <DoorOpen size={20} className="text-telivity-teal" />
              Room Inventory & Admin Override Rack ({rooms.length} Rooms)
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

                const matchedCat = tariffConfig.categories.find(
                  (c) =>
                    room.roomTypeName?.toLowerCase().includes(c.name.toLowerCase().split(' ')[0]) ||
                    c.id === room.roomTypeId
                );
                const price =
                  matchedCat?.doubleOccupancyPrice ||
                  matchedCat?.singleOccupancyPrice ||
                  1799;

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
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isAvail
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
              {staffList.length} Active Employees • Monthly Payroll: ₹{monthlyPayrollTotal.toLocaleString('en-IN')} • Shift allocations & designations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/staff')}
              className="px-3.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <KeyRound size={14} /> Manage Employee Credentials & Roles →
            </button>
          </div>
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
              {tariffConfig.gstin || 'Not configured'}
            </strong>
            <span className="text-[10px] text-emerald-700 font-semibold mt-1 inline-block">Configured in Hotel Settings</span>
          </div>

          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60">
            <span className="text-[11px] text-telivity-mid-grey font-medium block">SAC Code (Accommodation)</span>
            <strong className="text-sm font-bold text-telivity-navy block mt-1">
              {tariffConfig.hsnSac || '996311'} (Hotel Stay Services)
            </strong>
            <span className="text-[10px] text-telivity-mid-grey mt-1 inline-block">Standard Hotel SAC</span>
          </div>

          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60">
            <span className="text-[11px] text-telivity-mid-grey font-medium block">GST Slab Rate</span>
            <strong className="text-sm font-bold text-telivity-navy block mt-1">
              {tariffConfig.gstPercentage}% GST ({tariffConfig.gstPercentage / 2}% CGST + {tariffConfig.gstPercentage / 2}% SGST)
            </strong>
            <span className="text-[10px] text-emerald-700 font-semibold mt-1 inline-block">
              {tariffConfig.isTaxInclusive ? 'Tax Included in Tariff' : 'Tax Exclusive'}
            </span>
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
