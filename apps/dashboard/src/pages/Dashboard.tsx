import { useEffect, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Percent,
  TrendingUp,
  BedDouble,
  LogIn,
  LogOut,
  Users,
  DoorOpen,
  Brain,
  Building2,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  Zap,
  Globe,
  Briefcase,
  Wrench,
  Brush,
  IndianRupee,
  History,
  ConciergeBell,
  Receipt,
  Shield,
} from 'lucide-react';
import WalkInCheckInModal from '../components/front-desk/WalkInCheckInModal';
import AddGuestModal from '../components/front-desk/AddGuestModal';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { format } from 'date-fns';
import { api } from '../lib/api';
import { formatOccupancyPercent } from '../lib/api-helpers';
import { getDateLocale } from '../lib/date-locale';
import { useProperty } from '../context/PropertyContext';
import { useDepartment } from '../context/DepartmentContext';
import { getSocket } from '../lib/socket';
import KpiCard from '../components/ui/KpiCard';
import { formatMoney } from '../lib/money';
import { useTranslation } from 'react-i18next';

const ROOM_STATUS_COLORS: Record<string, string> = {
  occupied: '#06bdb4',
  vacant_clean: '#00a692',
  vacant_dirty: '#f2641b',
  out_of_order: '#eec517',
  out_of_service: '#bbbbc4',
  clean: '#00a692',
  inspected: '#016491',
  guest_ready: '#2cd1b9',
};

interface ActivityEvent {
  id: string;
  event: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const { propertyId, setPropertyId, isPortfolioMode, properties, currencyCode } = useProperty();
  const { setActiveDepartment } = useDepartment();
  const navigate = useNavigate();
  const now = new Date();
  const dateLocale = getDateLocale(i18n.resolvedLanguage);
  const today = format(now, 'yyyy-MM-dd');
  const formattedToday = format(now, 'PPPP', { locale: dateLocale });

  const [walkInOpen, setWalkInOpen] = useState(false);

  const activeProperty = isPortfolioMode
    ? null
    : (Array.isArray(properties) ? properties.find((p) => p.id === propertyId) : null);
  const thr = activeProperty?.settings?.kpiThresholds ?? {};

  const { data: staysData } = useQuery({
    queryKey: ['stays', propertyId],
    queryFn: () => api.get('/v1/stays', { params: { propertyId } }).then((r) => r.data),
    enabled: !!propertyId,
  });

  const { data: financial } = useQuery({
    queryKey: ['reports', 'financial-summary', propertyId, today],
    queryFn: () => api.get('/v1/reports/financial-summary', { params: { propertyId, date: today } }).then((r) => r.data),
    enabled: !!propertyId,
  });

  const { data: occupancy } = useQuery({
    queryKey: ['reports', 'occupancy', propertyId, today],
    queryFn: () => api.get('/v1/reports/occupancy', { params: { propertyId, date: today } }).then((r) => r.data),
    enabled: !!propertyId,
  });

  const { data: roomSummary } = useQuery({
    queryKey: ['rooms', 'status-summary', propertyId],
    queryFn: () => api.get('/v1/rooms/status-summary', { params: { propertyId } }).then((r) => r.data),
    enabled: !!propertyId,
  });

  const { data: roomsList } = useQuery({
    queryKey: ['rooms', propertyId],
    queryFn: () => api.get('/v1/rooms', { params: { propertyId } }).then((r) => r.data),
    enabled: !!propertyId,
  });

  const { data: directBookings } = useQuery({
    queryKey: ['direct-bookings', propertyId],
    queryFn: () => api.get('/v1/direct-bookings', { params: { propertyId } }).then((r) => r.data),
    enabled: !!propertyId,
    refetchInterval: 5000,
  });

  const { data: arrivals } = useQuery({
    queryKey: ['reservations', 'arrivals', propertyId, today],
    queryFn: () => api.get('/v1/reservations', { params: { propertyId, status: 'confirmed', arrivalDateFrom: today, arrivalDateTo: today } }).then((r) => r.data),
    enabled: !!propertyId,
  });

  const { data: departures } = useQuery({
    queryKey: ['reservations', 'departures', propertyId, today],
    queryFn: () => api.get('/v1/reservations', { params: { propertyId, status: 'checked_in', departureDateFrom: today, departureDateTo: today } }).then((r) => r.data),
    enabled: !!propertyId,
  });

  const { data: inHouse } = useQuery({
    queryKey: ['reservations', 'in-house', propertyId],
    queryFn: () => api.get('/v1/reservations', { params: { propertyId, status: 'checked_in' } }).then((r) => r.data),
    enabled: !!propertyId,
  });

  const [activities, setActivities] = useState<ActivityEvent[]>([]);

  const handleEvent = useCallback((payload: ActivityEvent) => {
    setActivities((prev) => [payload, ...prev].slice(0, 10));
  }, []);

  useEffect(() => {
    const socket = getSocket();
    socket.on('pmsEvent', handleEvent);
    return () => { socket.off('pmsEvent', handleEvent); };
  }, [handleEvent]);

  const occ = occupancy?.data ?? occupancy ?? {};
  const fin = financial?.data ?? financial ?? {};
  const kpis = fin.kpis ?? {};
  const arrList = arrivals?.data ?? arrivals ?? [];
  const depList = departures?.data ?? departures ?? [];
  const ihList = inHouse?.data ?? inHouse ?? [];
  const onlineBookingsList = directBookings?.data ?? (Array.isArray(directBookings) ? directBookings : []);
  const rooms = Array.isArray(roomsList?.data) ? roomsList.data : (Array.isArray(roomsList) ? roomsList : []);

  const allStays = Array.isArray(staysData?.data) ? staysData.data : (Array.isArray(staysData) ? staysData : []);
  const inHouseStays = allStays.filter((s: any) => s.stayStatus === 'in_house');
  const stayingGuestsCount = inHouseStays.reduce((acc: number, s: any) => acc + (s.adults || 1) + (s.children || 0), 0);
  const todayCheckInsCount = allStays.filter((s: any) => s.checkInTime && s.checkInTime.startsWith(today)).length;
  const todayCheckOutsCount = allStays.filter(
    (s: any) =>
      (s.actualCheckoutTime && s.actualCheckoutTime.startsWith(today)) ||
      (s.expectedCheckoutTime && s.expectedCheckoutTime.startsWith(today) && s.stayStatus === 'checked_out')
  ).length;
  const todayCollection = allStays.reduce((acc: number, s: any) => {
    let sum = 0;
    if (s.checkInTime && s.checkInTime.startsWith(today)) sum += (s.advancePaid || 0);
    if (s.actualCheckoutTime && s.actualCheckoutTime.startsWith(today)) sum += (s.finalPayment || 0);
    return acc + sum;
  }, 0);
  const unpaidBalances = inHouseStays.reduce((acc: number, s: any) => acc + (s.balance || 0), 0);

  // Room Inventory Calculation from actual DB records (0 when empty)
  const totalRoomsCount = rooms.length;
  const occupiedCount = rooms.filter((r: any) => r.status === 'occupied').length;
  const availableCount = rooms.filter(
    (r: any) => r.status === 'vacant_clean' || r.status === 'clean' || r.status === 'available' || r.status === 'guest_ready'
  ).length;
  const reservedCount = rooms.filter((r: any) => r.status === 'reserved').length;
  const dirtyCount = rooms.filter((r: any) => r.status === 'vacant_dirty' || r.status === 'dirty').length;
  const maintenanceCount = rooms.filter((r: any) => r.status === 'out_of_order' || r.status === 'out_of_service' || r.status === 'maintenance').length;

  const roomData = roomSummary?.data ?? roomSummary ?? [];
  const chartData = [
    { name: 'Available (Clean)', value: availableCount, color: '#00a692' },
    { name: 'Occupied', value: occupiedCount, color: '#06bdb4' },
    { name: 'Reserved', value: reservedCount, color: '#3b82f6' },
    { name: 'Dirty', value: dirtyCount, color: '#f2641b' },
    { name: 'Maintenance', value: maintenanceCount, color: '#eec517' },
  ].filter(d => d.value > 0);

  const pendingOnlineList = onlineBookingsList.filter(
    (b: any) => b.status === 'pending_approval' || b.status === 'pending',
  );
  const pendingOnlineCount = pendingOnlineList.length;

  return (
    <div className="space-y-6">
      {/* 1. Header & Quick Operational Action Bar */}
      <div className="bg-gradient-to-r from-telivity-navy via-slate-900 to-telivity-navy rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-telivity-teal text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                Single Hotel PMS
              </span>
              <span className="text-gray-400 text-xs">· Karimnagar, Telangana</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-1">Spark Hotel Central Dashboard</h1>
            <p className="text-xs text-gray-300 mt-0.5">{formattedToday}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setWalkInOpen(true)}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-lg transition-transform active:scale-95"
            >
              <Zap size={18} className="fill-white" />
              <span>WALK-IN CHECK-IN</span>
            </button>
            <button
              onClick={() => navigate('/current-guests')}
              className="flex items-center gap-2 bg-telivity-teal hover:bg-telivity-teal/90 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow transition-colors"
            >
              <Users size={15} />
              <span>In-House Guests</span>
            </button>
            <button
              onClick={() => navigate('/guest-history')}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium text-xs px-3.5 py-2.5 rounded-xl backdrop-blur-sm transition-colors"
            >
              <History size={15} />
              <span>Guest History</span>
            </button>
            <button
              onClick={() => navigate('/rooms')}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium text-xs px-3.5 py-2.5 rounded-xl backdrop-blur-sm transition-colors"
            >
              <DoorOpen size={15} />
              <span>Rooms & Rack</span>
            </button>
            <button
              onClick={() => navigate('/direct-bookings')}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium text-xs px-3.5 py-2.5 rounded-xl backdrop-blur-sm transition-colors relative"
            >
              <Globe size={15} />
              <span>Website Bookings</span>
              {pendingOnlineCount > 0 && (
                <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {pendingOnlineCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Department Quick Switcher Bar */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-telivity-teal/10 text-telivity-teal">
            <Building2 size={20} />
          </div>
          <div>
            <span className="text-xs font-bold text-telivity-navy">Department Operation Consoles</span>
            <p className="text-[11px] text-telivity-mid-grey">Direct access to individual department panels or unified view in one screen</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/admin-panel')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-amber-400 hover:bg-slate-800 border border-amber-400/30 transition shadow-xs"
          >
            <Shield size={13} className="fill-amber-400" /> 🛡️ Admin Panel
          </button>
          <button
            type="button"
            onClick={() => navigate('/manager-panel')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-700 text-white hover:bg-purple-800 transition shadow-xs"
          >
            <Briefcase size={13} /> 👔 Manager Panel
          </button>
          <button
            type="button"
            onClick={() => navigate('/front-office-panel')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-telivity-teal text-white hover:bg-teal-600 transition shadow-xs"
          >
            <ConciergeBell size={13} /> 🛎️ Front Office Panel
          </button>
          <button
            type="button"
            onClick={() => navigate('/departments')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-100 text-slate-700 hover:bg-gray-200 border border-gray-300 transition"
          >
            <Building2 size={13} /> All-In-One Hub →
          </button>
        </div>
      </div>

      {/* Live Website Bookings Notification Banner on Central Dashboard */}
      {pendingOnlineList.length > 0 && (
        <div className="bg-gradient-to-r from-teal-50 via-emerald-50 to-teal-50 border-2 border-teal-500/30 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start md:items-center gap-3.5">
            <div className="p-3 bg-telivity-teal text-white rounded-xl shadow-md flex-shrink-0 animate-pulse">
              <Globe size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-teal-600 text-white px-2 py-0.5 rounded-full">
                  Direct Website Booking
                </span>
                <span className="text-xs font-semibold text-telivity-teal">
                  {pendingOnlineList.length} Inquir{pendingOnlineList.length > 1 ? 'ies' : 'y'} Pending Approval
                </span>
              </div>
              <h3 className="text-base font-bold text-telivity-navy mt-1">
                Guest: {pendingOnlineList[0]?.guestFirstName} {pendingOnlineList[0]?.guestLastName} · {pendingOnlineList[0]?.roomTypeName}
              </h3>
              <p className="text-xs text-telivity-mid-grey mt-0.5">
                Reference: <strong className="font-mono text-telivity-teal">{pendingOnlineList[0]?.reference}</strong> · Stay: {pendingOnlineList[0]?.arrivalDate} to {pendingOnlineList[0]?.departureDate} · Total: ₹{pendingOnlineList[0]?.submittedTotal} · Phone: {pendingOnlineList[0]?.guestPhone || '—'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <button
              onClick={() => navigate('/front-desk')}
              className="bg-telivity-teal hover:bg-telivity-teal/90 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow transition-colors flex items-center gap-1.5"
            >
              <DoorOpen size={15} />
              <span>Front Desk Review</span>
            </button>
            <button
              onClick={() => navigate('/direct-bookings')}
              className="bg-white hover:bg-gray-50 text-telivity-navy border border-gray-200 font-semibold text-xs px-4 py-2.5 rounded-xl transition-colors"
            >
              <span>Manage Requests ({pendingOnlineList.length}) &rarr;</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Primary 8 Key Hotel Indicators (Requirements Section 1) */}
      <div>
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Live Front Desk & Hotel Indicators</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {/* 1. Total Rooms */}
          <div
            onClick={() => navigate('/rooms')}
            className="bg-white rounded-xl p-3.5 shadow-sm border border-gray-100 flex flex-col items-center text-center cursor-pointer hover:border-telivity-teal transition"
          >
            <div className="p-1.5 rounded-lg bg-gray-100 text-gray-700 mb-1">
              <DoorOpen size={16} />
            </div>
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Total Rooms</span>
            <span className="text-xl font-bold text-gray-900 mt-0.5">{totalRoomsCount}</span>
            <span className="text-[10px] text-gray-400 mt-0.5">Hotel Inventory</span>
          </div>

          {/* 2. Occupied Rooms */}
          <div
            onClick={() => navigate('/rooms')}
            className="bg-teal-50/60 rounded-xl p-3.5 shadow-sm border border-teal-100 flex flex-col items-center text-center cursor-pointer hover:border-teal-300 transition"
          >
            <div className="p-1.5 rounded-lg bg-teal-100 text-teal-700 mb-1">
              <BedDouble size={16} />
            </div>
            <span className="text-[11px] font-semibold text-teal-700 uppercase tracking-wider">Occupied</span>
            <span className="text-xl font-bold text-teal-700 mt-0.5">{occupiedCount}</span>
            <span className="text-[10px] text-teal-600/80 mt-0.5">Rooms In Use</span>
          </div>

          {/* 3. Available Rooms */}
          <div
            onClick={() => navigate('/rooms')}
            className="bg-emerald-50/60 rounded-xl p-3.5 shadow-sm border border-emerald-100 flex flex-col items-center text-center cursor-pointer hover:border-emerald-300 transition"
          >
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 mb-1">
              <CheckCircle2 size={16} />
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Available</span>
            <span className="text-xl font-bold text-emerald-700 mt-0.5">{availableCount}</span>
            <span className="text-[10px] text-emerald-600/80 mt-0.5">Clean & Vacant</span>
          </div>

          {/* 4. Currently Staying Guests */}
          <div
            onClick={() => navigate('/current-guests')}
            className="bg-indigo-50/60 rounded-xl p-3.5 shadow-sm border border-indigo-100 flex flex-col items-center text-center cursor-pointer hover:border-indigo-300 transition"
          >
            <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700 mb-1">
              <Users size={16} />
            </div>
            <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider">In-House Guests</span>
            <span className="text-xl font-bold text-indigo-700 mt-0.5">{stayingGuestsCount}</span>
            <span className="text-[10px] text-indigo-600/80 mt-0.5">Currently Staying</span>
          </div>

          {/* 5. Today's Check-ins */}
          <div
            onClick={() => navigate('/current-guests')}
            className="bg-emerald-50/60 rounded-xl p-3.5 shadow-sm border border-emerald-100 flex flex-col items-center text-center cursor-pointer hover:border-emerald-300 transition"
          >
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 mb-1">
              <LogIn size={16} />
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Today Check-ins</span>
            <span className="text-xl font-bold text-emerald-700 mt-0.5">{todayCheckInsCount}</span>
            <span className="text-[10px] text-emerald-600/80 mt-0.5">Arrivals Today</span>
          </div>

          {/* 6. Today's Check-outs */}
          <div
            onClick={() => navigate('/current-guests')}
            className="bg-amber-50/60 rounded-xl p-3.5 shadow-sm border border-amber-100 flex flex-col items-center text-center cursor-pointer hover:border-amber-300 transition"
          >
            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700 mb-1">
              <LogOut size={16} />
            </div>
            <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Today Check-outs</span>
            <span className="text-xl font-bold text-amber-700 mt-0.5">{todayCheckOutsCount}</span>
            <span className="text-[10px] text-amber-600/80 mt-0.5">Departures Today</span>
          </div>

          {/* 7. Today's Collection */}
          <div
            onClick={() => navigate('/folios')}
            className="bg-emerald-50/60 rounded-xl p-3.5 shadow-sm border border-emerald-100 flex flex-col items-center text-center cursor-pointer hover:border-emerald-300 transition"
          >
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 mb-1">
              <IndianRupee size={16} />
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Today Collection</span>
            <span className="text-base font-bold text-emerald-700 mt-0.5">₹{todayCollection.toLocaleString('en-IN')}</span>
            <span className="text-[10px] text-emerald-600/80 mt-0.5">Cash / UPI / Card</span>
          </div>

          {/* 8. Unpaid Balances */}
          <div
            onClick={() => navigate('/current-guests')}
            className="bg-rose-50/60 rounded-xl p-3.5 shadow-sm border border-rose-100 flex flex-col items-center text-center cursor-pointer hover:border-rose-300 transition"
          >
            <div className="p-1.5 rounded-lg bg-rose-100 text-rose-700 mb-1">
              <AlertCircle size={16} />
            </div>
            <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider">Unpaid Balances</span>
            <span className="text-base font-bold text-rose-700 mt-0.5">₹{unpaidBalances.toLocaleString('en-IN')}</span>
            <span className="text-[10px] text-rose-600/80 mt-0.5">Due from Guests</span>
          </div>
        </div>
      </div>

      {/* 3. Key Financial & Operational Statistics (Requirements Section 2) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Occupancy"
          value={formatOccupancyPercent(occ.occupancyRate ?? (totalRoomsCount > 0 ? occupiedCount / totalRoomsCount : 0))}
          subtitle={`${occupiedCount} of ${totalRoomsCount} rooms occupied`}
          icon={Percent}
          numericValue={occ.occupancyRate != null ? Number(occ.occupancyRate) : totalRoomsCount > 0 ? Math.round((occupiedCount / totalRoomsCount) * 100) : 0}
          threshold={thr.occupancyRate}
        />
        <KpiCard
          title="Today's Revenue"
          value={formatMoney(kpis.totalRevenue ?? todayCollection ?? 0, currencyCode)}
          subtitle="Room charges + F&B + Taxes"
          icon={IndianRupee}
          numericValue={kpis.totalRevenue != null ? Number(kpis.totalRevenue) : todayCollection}
          threshold={thr.totalRevenue}
        />
        <KpiCard
          title="Monthly Revenue"
          value={formatMoney(kpis.monthlyRevenue ?? 0, currencyCode)}
          subtitle="Month-to-date collection"
          icon={TrendingUp}
        />
        <KpiCard
          title="Pending Payments"
          value={formatMoney(kpis.pendingPayments ?? unpaidBalances ?? 0, currencyCode)}
          subtitle="Pending departure dues"
          icon={AlertCircle}
        />
      </div>

      {/* 4. Guest Operations Breakdown & Live Room Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Guest Movements Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-telivity-navy uppercase tracking-wider">Today's Movements</h2>
            <span className="text-xs text-telivity-teal font-medium cursor-pointer" onClick={() => navigate('/front-desk')}>
              View Desk &rarr;
            </span>
          </div>

          <div className="space-y-3.5">
            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/50 border border-emerald-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                  <LogIn size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Today's Check-ins</p>
                  <p className="text-xs text-gray-500">Scheduled guest arrivals</p>
                </div>
              </div>
              <span className="text-lg font-bold text-emerald-700">{Array.isArray(arrList) && arrList.length > 0 ? arrList.length : todayCheckInsCount}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50/50 border border-amber-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                  <LogOut size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Today's Check-outs</p>
                  <p className="text-xs text-gray-500">Scheduled departures</p>
                </div>
              </div>
              <span className="text-lg font-bold text-amber-700">{Array.isArray(depList) && depList.length > 0 ? depList.length : todayCheckOutsCount}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-teal-50/50 border border-teal-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-100 text-teal-700 rounded-lg">
                  <Zap size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Walk-in Guests</p>
                  <p className="text-xs text-gray-500">Direct front desk check-ins</p>
                </div>
              </div>
              <span className="text-lg font-bold text-teal-700">{allStays.filter((s: any) => s.source === 'walk_in').length}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50/50 border border-blue-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <Globe size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Online Bookings</p>
                  <p className="text-xs text-gray-500">Website & direct inquiries</p>
                </div>
              </div>
              <span className="text-lg font-bold text-blue-700">{onlineBookingsList.length}</span>
            </div>
          </div>
        </div>

        {/* Room Status Visual Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-sm font-bold text-telivity-navy uppercase tracking-wider">Spark Hotel Room Status</h2>
              <p className="text-xs text-gray-500">Real-time room occupancy and housekeeping distribution</p>
            </div>
            <button
              onClick={() => navigate('/rooms')}
              className="text-xs text-telivity-teal font-semibold hover:underline"
            >
              Manage Rooms &rarr;
            </button>
          </div>

          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  dataKey="value"
                  nameKey="name"
                  paddingAngle={3}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 5. Live Activity Audit Log */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-sm font-bold text-telivity-navy uppercase tracking-wider mb-3">Live Front Desk & System Log</h2>
        {activities.length > 0 ? (
          <div className="space-y-2">
            {activities.map((a, i) => (
              <div key={`${a.timestamp}-${i}`} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0 text-sm">
                <div className="w-2 h-2 rounded-full bg-telivity-teal flex-shrink-0" />
                <span className="font-medium text-telivity-navy">{a.event}</span>
                <span className="text-xs text-telivity-mid-grey ml-auto">
                  {format(new Date(a.timestamp), 'pp', { locale: dateLocale })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-4 text-center text-sm text-gray-400">
            Hotel Spark PMS operational · Connected to Supabase single-hotel database · Ready for guest transactions
          </div>
        )}
      </div>

      {/* 6. Walk-In Check-In Modal */}
      <AddGuestModal isOpen={walkInOpen} onClose={() => setWalkInOpen(false)} />
    </div>
  );
}
