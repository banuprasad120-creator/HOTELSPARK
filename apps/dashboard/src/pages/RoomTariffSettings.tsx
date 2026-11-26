import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  IndianRupee,
  DoorOpen,
  Settings,
  Layers,
  Shield,
  Check,
  AlertCircle,
  AlertTriangle,
  Plus,
  Edit2,
  Save,
  RotateCcw,
  Percent,
  Users,
  Calendar,
  Lock,
  CreditCard,
  Building2,
  Sparkles,
  HelpCircle,
  FileText,
  ConciergeBell,
  CheckCircle2,
  Briefcase,
  Search,
} from 'lucide-react';
import { api } from '../lib/api';
import { useProperty } from '../context/PropertyContext';
import { useToast } from '../components/ui/Toast';
import {
  calculateTariffInvoice,
  EMPTY_TARIFF_CONFIG,
  type HotelTariffConfig,
  type RoomCategoryTariff,
  type StoredRoom,
} from '../lib/supabaseAdapter';
import WalkInCheckInModal from '../components/front-desk/WalkInCheckInModal';

export default function RoomTariffSettings() {
  const { propertyId } = useProperty();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [walkInOpen, setWalkInOpen] = useState(false);
  const [roomSearch, setRoomSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'occupied' | 'booked' | 'dirty' | 'maintenance'>('all');

  const { data: serverTariffConfig } = useQuery<HotelTariffConfig>({
    queryKey: ['tariff-config', propertyId],
    queryFn: () => api.get('/v1/tariff-config', { params: { propertyId } }).then((r) => r.data),
    enabled: !!propertyId,
  });

  const { data: serverRooms = [] } = useQuery<StoredRoom[]>({
    queryKey: ['rooms', propertyId],
    queryFn: () => api.get('/v1/rooms', { params: { propertyId } }).then((r) => r.data),
    enabled: !!propertyId,
  });

  const [draftConfig, setDraftConfig] = useState<HotelTariffConfig | null>(null);
  const config: HotelTariffConfig = draftConfig ?? serverTariffConfig ?? EMPTY_TARIFF_CONFIG;
  const setConfig = (updater: (prev: HotelTariffConfig) => HotelTariffConfig) => {
    setDraftConfig((prev) => updater(prev ?? serverTariffConfig ?? EMPTY_TARIFF_CONFIG));
  };
  const rooms: StoredRoom[] = Array.isArray(serverRooms) ? serverRooms : [];

  // Simulator State
  const [simCategoryIndex, setSimCategoryIndex] = useState(0);
  const [simOccupancy, setSimOccupancy] = useState<'single' | 'double'>('double');
  const [simNights, setSimNights] = useState(2);
  const [simExtraPersons, setSimExtraPersons] = useState(0);
  const [simChildren, setSimChildren] = useState(0);

  const totalAssignedRooms = useMemo(() => {
    return config.categories.reduce((acc, cat) => acc + (Number(cat.assignedRoomsCount) || 0), 0);
  }, [config.categories]);

  const isInventoryValid = rooms.length === 0 || totalAssignedRooms === rooms.length;

  // Handle Category Pricing Update
  const handleUpdatePrice = (
    catId: string,
    field: 'singleOccupancyPrice' | 'doubleOccupancyPrice',
    val: number | null
  ) => {
    setConfig((prev) => ({
      ...prev,
      categories: prev.categories.map((c) =>
        c.id === catId ? { ...c, [field]: val } : c
      ),
    }));
  };

  // Handle Category Room Count Update
  const handleUpdateRoomCount = (catId: string, count: number) => {
    setConfig((prev) => ({
      ...prev,
      categories: prev.categories.map((c) =>
        c.id === catId ? { ...c, assignedRoomsCount: Math.max(0, count) } : c
      ),
    }));
  };

  // Save All Changes to Supabase
  const handleSaveAll = async () => {
    try {
      await api.put('/v1/tariff-config', { ...config, propertyId });
      setDraftConfig(null);
      queryClient.invalidateQueries({ queryKey: ['tariff-config'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['rate-plans'] });
      toast('success', 'Room tariffs and GST settings saved to Supabase.');
    } catch (err: any) {
      toast('error', err?.message || 'Failed to save tariff configuration.');
    }
  };

  const handleResetDefaults = () => {
    setDraftConfig(null);
    queryClient.invalidateQueries({ queryKey: ['tariff-config'] });
    toast('success', 'Reloaded saved tariffs from database.');
  };

  // Quick Room Status Change via Supabase
  const handleRoomStatusChange = async (roomId: string, newStatus: string) => {
    try {
      await api.patch(`/v1/rooms/${roomId}`, { propertyId, status: newStatus });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast('success', 'Room status updated.');
    } catch (err: any) {
      toast('error', err?.message || 'Failed to update room status.');
    }
  };

  // Simulator Calculation
  const selectedSimCat = config.categories[simCategoryIndex] || config.categories[0];
  const simCalc = useMemo(() => {
    if (!selectedSimCat) {
      return calculateTariffInvoice({
        category: {
          id: '',
          name: 'None',
          code: '',
          description: '',
          assignedRoomsCount: 0,
          maxOccupancy: 2,
          singleOccupancyPrice: 0,
          doubleOccupancyPrice: 0,
          extraPersonCharge: config.extraPersonCharge,
        },
        occupancyType: 'double',
        nights: simNights,
        extraPersons: simExtraPersons,
        gstPercentage: config.gstPercentage,
        isTaxInclusive: config.isTaxInclusive,
      });
    }
    const effOccupancy =
      selectedSimCat.singleOccupancyPrice === null
        ? 'double'
        : selectedSimCat.doubleOccupancyPrice === null
        ? 'single'
        : simOccupancy;

    return calculateTariffInvoice({
      category: selectedSimCat,
      occupancyType: effOccupancy,
      nights: simNights,
      extraPersons: simExtraPersons,
      gstPercentage: config.gstPercentage,
      isTaxInclusive: config.isTaxInclusive,
    });
  }, [selectedSimCat, simOccupancy, simNights, simExtraPersons, config.gstPercentage, config.isTaxInclusive, config.extraPersonCharge]);

  // Filtered 28 rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      // Status filter
      if (statusFilter === 'available' && r.status !== 'vacant_clean') return false;
      if (statusFilter === 'occupied' && r.status !== 'occupied') return false;
      if (statusFilter === 'booked' && r.status !== 'booked') return false;
      if (statusFilter === 'dirty' && r.status !== 'vacant_dirty') return false;
      if (statusFilter === 'maintenance' && r.status !== 'out_of_order') return false;

      // Text search
      if (roomSearch.trim()) {
        const term = roomSearch.toLowerCase();
        return (
          r.number.includes(term) ||
          r.roomTypeName?.toLowerCase().includes(term) ||
          (r.guestName && r.guestName.toLowerCase().includes(term))
        );
      }
      return true;
    });
  }, [rooms, statusFilter, roomSearch]);

  // Counts
  const availableCount = rooms.filter((r) => r.status === 'vacant_clean').length;
  const occupiedCount = rooms.filter((r) => r.status === 'occupied').length;
  const bookedCount = rooms.filter((r) => r.status === 'booked').length;
  const dirtyCount = rooms.filter((r) => r.status === 'vacant_dirty').length;
  const maintenanceCount = rooms.filter((r) => r.status === 'out_of_order').length;

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-telivity-navy to-slate-950 rounded-2xl p-6 text-white shadow-xl border border-white/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950 uppercase tracking-wider flex items-center gap-1">
                <Shield size={11} className="fill-slate-950" /> Official Tariff & Inventory Configuration
              </span>
              <span className="text-slate-300 text-xs font-medium">Hotel Spark Karimnagar CRM</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-1 flex items-center gap-2.5">
              <IndianRupee size={28} className="text-amber-400" />
              Hotel Room Tariff & 28-Room Inventory Governance
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Configure room pricing matrices (Single & Double occupancy in INR), manage category-wise distribution across all 28 rooms, configure GST and extra person charges, and enforce zero-overbooking policies.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSaveAll}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow-lg active:scale-95"
            >
              <Save size={15} />
              <span>Save All Settings</span>
            </button>
            <button
              type="button"
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl backdrop-blur-sm transition"
              title="Reset to official hotel prices and 28-room allocation"
            >
              <RotateCcw size={14} /> Reset Defaults
            </button>
            <button
              type="button"
              onClick={() => setWalkInOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-telivity-teal hover:bg-teal-600 text-white text-xs font-bold rounded-xl transition"
            >
              <Plus size={14} /> Walk-In Check-In
            </button>
          </div>
        </div>

        {/* Top Metric Strip */}
        <div className="mt-6 pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white/5 backdrop-blur-xs p-3 rounded-xl border border-white/10">
            <span className="text-slate-300 text-[11px] block font-medium">Total Hotel Rooms</span>
            <strong className="text-lg font-bold text-white mt-0.5 block">28 Rooms</strong>
            <span className="text-[10px] text-emerald-400 font-semibold">100% Configured</span>
          </div>

          <div className="bg-white/5 backdrop-blur-xs p-3 rounded-xl border border-white/10">
            <span className="text-slate-300 text-[11px] block font-medium">Extra Person Charge</span>
            <strong className="text-lg font-bold text-amber-400 mt-0.5 block">
              ₹{config.extraPersonCharge}
            </strong>
            <span className="text-[10px] text-slate-300">Per person / night</span>
          </div>

          <div className="bg-white/5 backdrop-blur-xs p-3 rounded-xl border border-white/10">
            <span className="text-slate-300 text-[11px] block font-medium">GST Rate</span>
            <strong className="text-lg font-bold text-white mt-0.5 block">
              {config.gstPercentage}% GST
            </strong>
            <span className="text-[10px] text-teal-300 font-semibold">
              {config.isTaxInclusive ? 'Inclusive of Tax' : 'Exclusive (Add-on)'}
            </span>
          </div>

          <div className="bg-white/5 backdrop-blur-xs p-3 rounded-xl border border-white/10">
            <span className="text-slate-300 text-[11px] block font-medium">Child Policy</span>
            <strong className="text-xs font-bold text-white mt-1 block truncate">
              Below 7 Yrs: Free
            </strong>
            <span className="text-[10px] text-slate-400">Without extra bed</span>
          </div>

          <div className="bg-white/5 backdrop-blur-xs p-3 rounded-xl border border-white/10">
            <span className="text-slate-300 text-[11px] block font-medium">Cancellation</span>
            <strong className="text-xs font-bold text-red-300 mt-1 block truncate">
              No Cancellation
            </strong>
            <span className="text-[10px] text-slate-400">Non-refundable reservations</span>
          </div>

          <div className="bg-white/5 backdrop-blur-xs p-3 rounded-xl border border-white/10">
            <span className="text-slate-300 text-[11px] block font-medium">Card Payments</span>
            <strong className="text-xs font-bold text-emerald-300 mt-1 block truncate">
              All Major Cards
            </strong>
            <span className="text-[10px] text-slate-400">Visa, MC, RuPay & UPI</span>
          </div>
        </div>
      </div>

      {/* 2. Room Categories & Pricing Matrix (Single vs Double Occupancy in INR) */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-telivity-navy flex items-center gap-2">
              <IndianRupee size={20} className="text-telivity-teal" />
              1. Room Categories & Official Pricing Matrix (INR per night)
            </h2>
            <p className="text-xs text-telivity-mid-grey">
              Single & Double occupancy room tariffs. Exactly configured according to Hotel Spark official tariff schedule.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-teal-50 text-telivity-teal border border-teal-200">
            All Prices in Indian Rupees (₹)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {config.categories.map((cat, idx) => {
            const hasSingle = cat.singleOccupancyPrice !== null;
            const hasDouble = cat.doubleOccupancyPrice !== null;

            return (
              <div
                key={cat.id}
                className="p-5 rounded-2xl border border-gray-200 bg-gradient-to-b from-gray-50/60 to-white hover:border-telivity-teal hover:shadow-md transition flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-telivity-navy text-white">
                      {cat.code}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                      {cat.assignedRoomsCount} Rooms
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-telivity-navy mt-2">{cat.name}</h3>
                  <p className="text-[11px] text-telivity-mid-grey line-clamp-2 mt-1">
                    {cat.description}
                  </p>
                </div>

                {/* Single & Double Tariff Inputs */}
                <div className="space-y-3 pt-3 border-t border-gray-100">
                  {/* Single Occupancy */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-telivity-slate">Single Occupancy:</span>
                    {hasSingle ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-telivity-navy">₹</span>
                        <input
                          type="number"
                          value={cat.singleOccupancyPrice ?? ''}
                          onChange={(e) =>
                            handleUpdatePrice(
                              cat.id,
                              'singleOccupancyPrice',
                              e.target.value === '' ? null : Number(e.target.value)
                            )
                          }
                          className="w-24 px-2 py-1 text-xs font-bold border border-gray-300 focus:border-telivity-teal rounded-lg text-right"
                        />
                      </div>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-gray-100 text-gray-500 border border-gray-200">
                        Not configured
                      </span>
                    )}
                  </div>

                  {/* Double Occupancy */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-telivity-slate">Double Occupancy:</span>
                    {hasDouble ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-telivity-navy">₹</span>
                        <input
                          type="number"
                          value={cat.doubleOccupancyPrice ?? ''}
                          onChange={(e) =>
                            handleUpdatePrice(
                              cat.id,
                              'doubleOccupancyPrice',
                              e.target.value === '' ? null : Number(e.target.value)
                            )
                          }
                          className="w-24 px-2 py-1 text-xs font-bold border border-gray-300 focus:border-telivity-teal rounded-lg text-right"
                        />
                      </div>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-gray-100 text-gray-500 border border-gray-200">
                        Not configured
                      </span>
                    )}
                  </div>

                  {/* Inventory Room Allocation */}
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-[11px] font-medium text-telivity-mid-grey">Assigned Rooms:</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="28"
                        value={cat.assignedRoomsCount}
                        onChange={(e) => handleUpdateRoomCount(cat.id, Number(e.target.value))}
                        className="w-16 px-2 py-1 text-xs font-bold border border-telivity-teal/40 rounded-lg text-center bg-teal-50/50"
                      />
                      <span className="text-[10px] text-telivity-mid-grey">rooms</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Total Room Inventory Allocation (Total 28 Rooms) */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-telivity-navy flex items-center gap-2">
              <DoorOpen size={20} className="text-purple-600" />
              2. Total Room Inventory Allocation (Sum must equal exactly 28)
            </h2>
            <p className="text-xs text-telivity-mid-grey">
              Admin controls the category-wise distribution of all 28 hotel rooms. Overbooking is strictly prevented.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                isInventoryValid
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-red-100 text-red-800 border border-red-300 animate-pulse'
              }`}
            >
              {isInventoryValid ? (
                <>
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  <span>Total Allocated: 28 / 28 Rooms (Valid)</span>
                </>
              ) : (
                <>
                  <AlertTriangle size={13} className="text-red-600" />
                  <span>Total Allocated: {totalAssignedRooms} / 28 Rooms (Must Equal 28)</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Visual Allocation Bar */}
        <div className="space-y-2">
          <div className="h-4 rounded-full overflow-hidden flex bg-gray-100 border border-gray-200">
            {config.categories.map((c, i) => {
              const pct = (c.assignedRoomsCount / 28) * 100;
              const colors = ['bg-blue-500', 'bg-teal-500', 'bg-purple-500', 'bg-amber-500'];
              return (
                <div
                  key={c.id}
                  style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                  className={`${colors[i % colors.length]} transition-all`}
                  title={`${c.name}: ${c.assignedRoomsCount} rooms (${Math.round(pct)}%)`}
                />
              );
            })}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
            {config.categories.map((c, i) => {
              const dots = ['bg-blue-500', 'bg-teal-500', 'bg-purple-500', 'bg-amber-500'];
              return (
                <div key={c.id} className="flex items-center gap-2 p-2 rounded-xl bg-gray-50 border border-gray-100">
                  <span className={`w-2.5 h-2.5 rounded-full ${dots[i % dots.length]}`} />
                  <div className="truncate">
                    <span className="font-semibold text-telivity-navy block truncate">{c.name}</span>
                    <span className="text-[11px] text-telivity-mid-grey">
                      {c.assignedRoomsCount} Rooms ({Math.round((c.assignedRoomsCount / 28) * 100)}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. 28-Room Live Inventory Rack & Cleaning Matrix */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-telivity-navy flex items-center gap-2">
              <Layers size={20} className="text-telivity-teal" />
              3. Live 28-Room Availability & Housekeeping Matrix
            </h2>
            <p className="text-xs text-telivity-mid-grey">
              Displays Available, Booked, Occupied, Vacant Dirty and Maintenance statuses for each individual room.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={roomSearch}
                onChange={(e) => setRoomSearch(e.target.value)}
                placeholder="Search Room #, guest..."
                className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-xl text-xs w-44 focus:outline-none focus:border-telivity-teal"
              />
            </div>
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  statusFilter === 'all' ? 'bg-white text-telivity-navy shadow-xs' : 'text-gray-600 hover:text-black'
                }`}
              >
                All (28)
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('available')}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  statusFilter === 'available' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-600 hover:text-emerald-700'
                }`}
              >
                Available ({availableCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('occupied')}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  statusFilter === 'occupied' ? 'bg-telivity-teal text-white shadow-xs' : 'text-gray-600 hover:text-teal-700'
                }`}
              >
                Occupied ({occupiedCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('booked')}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  statusFilter === 'booked' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-600 hover:text-blue-700'
                }`}
              >
                Booked ({bookedCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('dirty')}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  statusFilter === 'dirty' ? 'bg-amber-600 text-white shadow-xs' : 'text-gray-600 hover:text-amber-700'
                }`}
              >
                Dirty ({dirtyCount})
              </button>
            </div>
          </div>
        </div>

        {/* 28 Room Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          {filteredRooms.map((r) => {
            const isAvail = r.status === 'vacant_clean';
            const isOcc = r.status === 'occupied';
            const isBooked = r.status === 'booked';
            const isDirty = r.status === 'vacant_dirty';
            const isOoo = r.status === 'out_of_order';

            const matchedCat = config.categories.find((c) => c.name === r.roomTypeName || c.id === r.roomTypeId);
            const ratePreview =
              matchedCat?.doubleOccupancyPrice || matchedCat?.singleOccupancyPrice || 1799;

            return (
              <div
                key={r.id}
                className={`p-3 rounded-2xl border text-center transition flex flex-col justify-between ${
                  isAvail
                    ? 'border-emerald-300 bg-emerald-50/60 hover:bg-emerald-100/70 shadow-2xs'
                    : isOcc
                    ? 'border-teal-300 bg-teal-50/60'
                    : isBooked
                    ? 'border-blue-300 bg-blue-50/60'
                    : isDirty
                    ? 'border-amber-300 bg-amber-50/60'
                    : 'border-red-300 bg-red-50/60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-[10px] text-telivity-mid-grey">
                    <span>Floor {r.floor}</span>
                    <span className="font-bold text-telivity-navy">₹{ratePreview}</span>
                  </div>

                  <strong className="text-base font-bold text-telivity-navy mt-1 block">
                    Room {r.number}
                  </strong>
                  <span className="text-[11px] text-slate-600 font-semibold truncate block mt-0.5">
                    {r.roomTypeName || 'Deluxe Room'}
                  </span>

                  {r.guestName && (
                    <span className="text-[10px] text-teal-800 font-medium block truncate mt-1 bg-white/70 px-1 py-0.5 rounded">
                      👤 {r.guestName}
                    </span>
                  )}
                </div>

                {/* Status Selector Dropdown */}
                <div className="mt-2.5 pt-2 border-t border-black/5">
                  <select
                    value={r.status}
                    onChange={(e) => handleRoomStatusChange(r.id, e.target.value)}
                    className="w-full text-[10px] font-bold py-1 px-1 rounded-lg border border-gray-300 bg-white focus:outline-none"
                  >
                    <option value="vacant_clean">🟢 Available (Clean)</option>
                    <option value="occupied">🔵 Occupied</option>
                    <option value="booked">📅 Booked</option>
                    <option value="vacant_dirty">🟡 Vacant (Dirty)</option>
                    <option value="out_of_order">🔴 Out of Order</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Additional Charges, GST Tax & Policies Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Additional Charges & GST */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h2 className="text-base font-bold text-telivity-navy flex items-center gap-2 pb-3 border-b border-gray-100">
            <Percent size={20} className="text-emerald-600" />
            4. Additional Charges & GST Tax Configuration
          </h2>

          <div className="space-y-4">
            {/* Extra Person Charge */}
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-1.5">
              <label className="text-xs font-bold text-telivity-navy block">
                Extra Person Charge (INR per night):
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-telivity-navy">₹</span>
                <input
                  type="number"
                  value={config.extraPersonCharge}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, extraPersonCharge: Number(e.target.value) }))
                  }
                  className="w-28 px-3 py-1.5 text-xs font-bold border border-gray-300 rounded-xl focus:border-telivity-teal"
                />
                <span className="text-xs text-telivity-mid-grey">per person per night</span>
              </div>
              <p className="text-[11px] text-telivity-mid-grey mt-1">
                Standard charge applied to extra adult occupants beyond room base capacity.
              </p>
            </div>

            {/* GST Rate & Inclusive/Exclusive Toggle */}
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-telivity-navy">Configurable GST Percentage:</label>
                <div className="flex items-center gap-1">
                  {[0, 5, 12, 18].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setConfig((prev) => ({ ...prev, gstPercentage: rate }))}
                      className={`px-2 py-1 rounded-lg text-xs font-bold transition ${
                        config.gstPercentage === rate
                          ? 'bg-telivity-teal text-white shadow-2xs'
                          : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {rate}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Inclusive vs Exclusive Toggle */}
              <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-telivity-navy block">Tax Mode:</span>
                  <span className="text-[11px] text-telivity-mid-grey">
                    {config.isTaxInclusive
                      ? 'Tariffs are inclusive of GST (tax is deducted from tariff)'
                      : 'Tariffs are exclusive of GST (GST is added on top of bill)'}
                  </span>
                </div>

                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200">
                  <button
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, isTaxInclusive: true }))}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      config.isTaxInclusive ? 'bg-telivity-teal text-white shadow-xs' : 'text-gray-600 hover:text-black'
                    }`}
                  >
                    Tax Inclusive
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, isTaxInclusive: false }))}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      !config.isTaxInclusive ? 'bg-telivity-teal text-white shadow-xs' : 'text-gray-600 hover:text-black'
                    }`}
                  >
                    Tax Exclusive
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hotel Policies */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h2 className="text-base font-bold text-telivity-navy flex items-center gap-2 pb-3 border-b border-gray-100">
            <Lock size={20} className="text-amber-600" />
            5. Mandatory Hotel Policies
          </h2>

          <div className="space-y-3">
            <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/50 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-teal-100 text-telivity-teal shrink-0">
                <Users size={16} />
              </div>
              <div>
                <span className="text-xs font-bold text-telivity-navy block">Children Stay Policy</span>
                <p className="text-xs text-slate-700 mt-0.5">{config.childrenPolicy}</p>
                <span className="text-[10px] text-emerald-700 font-semibold mt-1 inline-block">
                  Auto-waived extra bed fee for kids &lt; 7 yrs
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/50 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-red-100 text-red-700 shrink-0">
                <Lock size={16} />
              </div>
              <div>
                <span className="text-xs font-bold text-telivity-navy block">Cancellation Policy</span>
                <p className="text-xs text-slate-700 mt-0.5">{config.cancellationPolicy}</p>
                <span className="text-[10px] text-red-700 font-semibold mt-1 inline-block">
                  100% non-refundable booking term enforced
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/50 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
                <CreditCard size={16} />
              </div>
              <div>
                <span className="text-xs font-bold text-telivity-navy block">Payment Acceptance</span>
                <p className="text-xs text-slate-700 mt-0.5">{config.paymentPolicy}</p>
                <span className="text-[10px] text-emerald-700 font-semibold mt-1 inline-block">
                  Instant receipt generation & POS integration
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Live Tariff & GST Invoice Simulator */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-telivity-navy flex items-center gap-2">
              <Sparkles size={20} className="text-amber-500" />
              6. Live Tariff, Extra Person Charges & GST Invoice Simulator
            </h2>
            <p className="text-xs text-telivity-mid-grey">
              Interactive test bench: verifies the automatic invoice calculation for any room category and occupancy combination.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls */}
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-4">
            <div>
              <label className="text-xs font-bold text-telivity-navy block mb-1">Select Room Category:</label>
              <div className="grid grid-cols-2 gap-2">
                {config.categories.map((c, i) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSimCategoryIndex(i)}
                    className={`p-2 rounded-xl text-left text-xs font-bold border transition ${
                      simCategoryIndex === i
                        ? 'bg-telivity-teal text-white border-telivity-teal shadow-xs'
                        : 'bg-white text-telivity-navy border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <span>{c.name}</span>
                    <span className="block text-[10px] opacity-80 mt-0.5">
                      {c.singleOccupancyPrice ? `Single ₹${c.singleOccupancyPrice}` : ''}
                      {c.singleOccupancyPrice && c.doubleOccupancyPrice ? ' • ' : ''}
                      {c.doubleOccupancyPrice ? `Double ₹${c.doubleOccupancyPrice}` : ''}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Occupancy Selection */}
            <div>
              <label className="text-xs font-bold text-telivity-navy block mb-1">Occupancy Selection:</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={selectedSimCat.singleOccupancyPrice === null}
                  onClick={() => setSimOccupancy('single')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition ${
                    selectedSimCat.singleOccupancyPrice === null
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : simOccupancy === 'single'
                      ? 'bg-telivity-navy text-white border-telivity-navy shadow-xs'
                      : 'bg-white text-telivity-navy border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  Single Occupancy {selectedSimCat.singleOccupancyPrice ? `(₹${selectedSimCat.singleOccupancyPrice})` : '(Not Configured)'}
                </button>

                <button
                  type="button"
                  disabled={selectedSimCat.doubleOccupancyPrice === null}
                  onClick={() => setSimOccupancy('double')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition ${
                    selectedSimCat.doubleOccupancyPrice === null
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : simOccupancy === 'double'
                      ? 'bg-telivity-navy text-white border-telivity-navy shadow-xs'
                      : 'bg-white text-telivity-navy border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  Double Occupancy {selectedSimCat.doubleOccupancyPrice ? `(₹${selectedSimCat.doubleOccupancyPrice})` : '(Not Configured)'}
                </button>
              </div>
            </div>

            {/* Steppers */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-telivity-navy block">Nights:</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={simNights}
                  onChange={(e) => setSimNights(Math.max(1, Number(e.target.value)))}
                  className="w-full mt-1 px-3 py-1.5 border border-gray-300 rounded-xl text-xs font-bold text-center"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-telivity-navy block">Extra Adults (₹399):</label>
                <input
                  type="number"
                  min="0"
                  max="5"
                  value={simExtraPersons}
                  onChange={(e) => setSimExtraPersons(Math.max(0, Number(e.target.value)))}
                  className="w-full mt-1 px-3 py-1.5 border border-gray-300 rounded-xl text-xs font-bold text-center"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-telivity-navy block">Kids &lt; 7 Yrs (Free):</label>
                <input
                  type="number"
                  min="0"
                  max="4"
                  value={simChildren}
                  onChange={(e) => setSimChildren(Math.max(0, Number(e.target.value)))}
                  className="w-full mt-1 px-3 py-1.5 border border-gray-300 rounded-xl text-xs font-bold text-center"
                />
              </div>
            </div>
          </div>

          {/* Real-time Calculation Folio Preview */}
          <div className="p-5 rounded-xl border border-gray-200 bg-gradient-to-b from-gray-50 to-white flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <span className="text-xs font-bold uppercase tracking-wider text-telivity-navy">
                  Itemized Tariff Calculation
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  {config.isTaxInclusive ? 'GST Inclusive' : 'GST Exclusive'}
                </span>
              </div>

              <div className="mt-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-telivity-slate">
                    {selectedSimCat.name} ({simCalc.roomTariffPerNight.toLocaleString('en-IN')}/night × {simNights}N):
                  </span>
                  <span className="font-bold text-telivity-navy">
                    ₹{simCalc.totalRoomTariff.toLocaleString('en-IN')}
                  </span>
                </div>

                {simCalc.extraPersonsCount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-telivity-slate">
                      Extra Person Charges ({simCalc.extraPersonsCount} × ₹399 × {simNights}N):
                    </span>
                    <span className="font-bold text-amber-700">
                      ₹{simCalc.totalExtraPersonCharges.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}

                {simChildren > 0 && (
                  <div className="flex items-center justify-between text-emerald-700">
                    <span>Children ({simChildren} below 7 yrs):</span>
                    <span className="font-bold">Free (₹0)</span>
                  </div>
                )}

                <div className="pt-2 border-t border-gray-200 flex items-center justify-between font-medium">
                  <span className="text-telivity-slate">Taxable Base Amount:</span>
                  <span className="text-telivity-navy font-semibold">
                    ₹{simCalc.taxableBase.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-center justify-between text-gray-500">
                  <span>CGST ({(config.gstPercentage / 2).toFixed(1)}%):</span>
                  <span>₹{simCalc.cgst.toLocaleString('en-IN')}</span>
                </div>

                <div className="flex items-center justify-between text-gray-500">
                  <span>SGST ({(config.gstPercentage / 2).toFixed(1)}%):</span>
                  <span>₹{simCalc.sgst.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t-2 border-telivity-teal/30 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-telivity-mid-grey block uppercase">
                  Grand Total Invoice
                </span>
                <span className="text-2xl font-black text-telivity-navy">
                  ₹{simCalc.grandTotal.toLocaleString('en-IN')}
                </span>
              </div>

              <span className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-teal-50 text-telivity-teal border border-teal-200">
                ₹{Math.round(simCalc.grandTotal / simNights).toLocaleString('en-IN')} / night avg
              </span>
            </div>
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
