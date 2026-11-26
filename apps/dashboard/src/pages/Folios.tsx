import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Routes, Route, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Receipt,
  ChevronLeft,
  Plus,
  Lock,
  RotateCcw,
  Split,
  ArrowRightLeft,
  CreditCard,
  Printer,
  Edit3,
  Search,
  RefreshCw,
  FileText,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  User,
  Calendar,
  Home,
  Check,
} from 'lucide-react';
import { api } from '../lib/api';
import { moneyString, requirePropertyId, requireCurrency } from '../lib/api-helpers';
import { formatMoney, formatMoneyPlain } from '../lib/money';
import {
  submitRedirectNextAction,
  type RedirectNextAction,
} from '../lib/submit-redirect-next-action';
import {
  WORLDLINE_SYNC_DEADLINE_MS,
  WORLDLINE_SYNC_INTERVAL_MS,
  worldlineSyncShouldContinue,
  worldlineSyncToast,
} from '../lib/worldline-sync';
import { useProperty } from '../context/PropertyContext';
import { useToast } from '../components/ui/Toast';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import { StripeProvider } from '../components/payment/StripeProvider';
import { CardInput } from '../components/payment/CardInput';
import { WorldlineCard } from '../components/payment/WorldlineCard';
import type { StoredStay } from '../lib/supabaseAdapter';
import BillInvoiceModal from '../components/billing/BillInvoiceModal';
import EditBillModal from '../components/billing/EditBillModal';

interface PaymentClientConfig {
  provider?: string;
  clientMode?: 'mock' | 'stripe' | 'redsys' | 'worldline' | 'unsupported';
  redsysConfigured?: boolean;
  worldlineConfigured?: boolean;
}

interface Folio {
  id: string;
  folioNumber: string;
  type: string;
  status: string;
  guestName?: string;
  guestId?: string;
  reservationId?: string;
  balance: number;
  totalCharges?: number;
  totalPayments?: number;
  currencyCode?: string;
}

interface RoutingRule {
  id: string;
  chargeType: string;
  targetFolioId: string;
  priority: number;
}

/** Charge types accepted by the folio charge / routing-rule / move-transaction DTOs. */
const CHARGE_TYPES = [
  'room',
  'tax',
  'food_beverage',
  'minibar',
  'phone',
  'laundry',
  'parking',
  'spa',
  'incidental',
  'fee',
  'adjustment',
  'package',
] as const;

interface Charge {
  id: string;
  description: string;
  type: string;
  amount: number;
  serviceDate: string;
  isLocked?: boolean;
  isReversal?: boolean;
  originalChargeId?: string;
  createdAt: string;
}

interface Payment {
  id: string;
  amount: number;
  method: string;
  status: string;
  gatewayProvider?: string;
  gatewayReference?: string;
  originalPaymentId?: string;
  createdAt: string;
}


const REFUNDABLE_STATUSES = new Set(['captured', 'settled', 'partially_refunded']);

// ---- Folio & Billing Console ----
function FolioList() {
  const { t } = useTranslation();
  const { propertyId } = useProperty();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Filter & Search states
  const [statusTab, setStatusTab] = useState<'all' | 'in_house' | 'checked_out' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [selectedStayForInvoice, setSelectedStayForInvoice] = useState<StoredStay | null>(null);
  const [selectedStayForEdit, setSelectedStayForEdit] = useState<StoredStay | null>(null);
  const [quickSettleStay, setQuickSettleStay] = useState<StoredStay | null>(null);
  const [settlePaymentMethod, setSettlePaymentMethod] = useState<'CASH' | 'UPI' | 'CARD'>('CASH');
  const [settling, setSettling] = useState(false);

  const { data: staysApiData, refetch: refetchStays } = useQuery({
    queryKey: ['stays', propertyId],
    queryFn: async () => {
      const res = await api.get('/v1/stays', { params: { propertyId } });
      return res.data;
    },
    enabled: !!propertyId,
  });

  const { data, refetch, isFetching } = useQuery({
    queryKey: ['folios', propertyId],
    queryFn: async () => {
      const res = await api.get('/v1/folios', { params: { propertyId } });
      return res.data;
    },
    enabled: !!propertyId,
  });

  const apiFolios: Folio[] = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);

  const staysList = useMemo(() => {
    const rawStays = staysApiData?.data ?? staysApiData;
    if (Array.isArray(rawStays) && rawStays.length > 0) return rawStays as StoredStay[];

    return apiFolios.map((f: any) => f.stay || ({
      id: f.id,
      propertyId: propertyId || '',
      guestName: f.guestName || 'Guest',
      mobile: f.mobile || '',
      roomNumber: f.roomNumber || 'Unassigned',
      roomTypeName: f.roomTypeName || 'Room',
      checkInTime: f.createdAt || new Date().toISOString(),
      expectedCheckoutTime: new Date(Date.now() + 86400000).toISOString(),
      nights: 1,
      pricePerNight: Number(f.totalCharges || 0),
      extraCharges: 0,
      discount: 0,
      totalAmount: Number(f.totalCharges || 0),
      advancePaid: Number(f.totalPayments || 0),
      previousPayments: 0,
      balance: Number(f.balance || 0),
      paymentMethod: 'CASH',
      paymentStatus: Number(f.balance || 0) <= 0 ? 'paid' : (Number(f.totalPayments || 0) > 0 ? 'partially_paid' : 'unpaid'),
      stayStatus: f.status === 'settled' ? 'checked_out' : 'in_house',
      billNumber: f.folioNumber,
      createdAt: f.createdAt || new Date().toISOString(),
      updatedAt: f.createdAt || new Date().toISOString(),
    } as unknown as StoredStay));
  }, [staysApiData, propertyId, apiFolios]);

  // KPI Metrics Calculations
  const stats = useMemo(() => {
    let totalInvoices = staysList.length;
    let totalBilled = 0;
    let totalCollected = 0;
    let totalBalanceDue = 0;

    for (const s of staysList) {
      totalBilled += s.totalAmount || 0;
      totalCollected += (s.advancePaid || 0) + (s.previousPayments || 0);
      totalBalanceDue += s.balance || 0;
    }

    return { totalInvoices, totalBilled, totalCollected, totalBalanceDue };
  }, [staysList]);

  // Filter & Search Logic
  const filteredStays = useMemo(() => {
    let list = [...staysList];

    // Status Tab Filter
    if (statusTab === 'in_house') {
      list = list.filter((s) => s.stayStatus === 'in_house');
    } else if (statusTab === 'checked_out') {
      list = list.filter((s) => s.stayStatus === 'checked_out');
    } else if (statusTab === 'pending') {
      list = list.filter((s) => (s.balance || 0) > 0);
    }

    // Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((s) => {
        const name = (s.guestName || '').toLowerCase();
        const room = (s.roomNumber || '').toLowerCase();
        const bill = (s.billNumber || '').toLowerCase();
        const mobile = (s.mobile || '').toLowerCase();
        return name.includes(q) || room.includes(q) || bill.includes(q) || mobile.includes(q);
      });
    }

    return list;
  }, [staysList, statusTab, searchQuery]);

  const handleStayUpdated = (_updatedStay: StoredStay) => {
    refetchStays();
    queryClient.invalidateQueries({ queryKey: ['folios'] });
    queryClient.invalidateQueries({ queryKey: ['stays'] });
  };

  const handleQuickSettle = async () => {
    if (!quickSettleStay) return;
    try {
      setSettling(true);
      const remainingBalance = quickSettleStay.balance || 0;
      const newPreviousPayments = (quickSettleStay.previousPayments || 0) + remainingBalance;

      const payload: Partial<StoredStay> = {
        previousPayments: newPreviousPayments,
        balance: 0,
        paymentStatus: 'paid',
        paymentMethod: settlePaymentMethod,
        updatedAt: new Date().toISOString(),
      };

      await api.patch(`/v1/stays/${quickSettleStay.id}`, payload);
      toast('success', `Bill for Room ${quickSettleStay.roomNumber} (${quickSettleStay.guestName}) settled in full!`);
      const updated = { ...quickSettleStay, ...payload };
      handleStayUpdated(updated);
      setQuickSettleStay(null);
    } catch (err: any) {
      toast('error', err?.message || 'Failed to settle bill.');
    } finally {
      setSettling(false);
    }
  };

  if (!propertyId) {
    return (
      <div className="flex items-center justify-center h-64 text-telivity-mid-grey">
        {t('common.selectProperty')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-telivity-teal/10 text-telivity-teal">
              <Receipt size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-telivity-navy">
                Billing & Invoices
              </h1>
              <p className="text-xs text-telivity-mid-grey mt-0.5">
                Official GST Tax Invoices • Guest Folios • Bill Editing & Ledger Settlements • Karimnagar
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              refetch();
              refetchStays();
              toast('success', 'Refreshed all guest billing folios.');
            }}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-telivity-navy text-xs font-semibold shadow-2xs transition"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between text-telivity-mid-grey mb-1">
            <span className="text-xs font-semibold">Total Invoices</span>
            <FileText size={18} className="text-telivity-teal" />
          </div>
          <div className="text-2xl font-black text-telivity-navy">{stats.totalInvoices}</div>
          <p className="text-[11px] text-gray-400 mt-1">Generated guest folios</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between text-telivity-mid-grey mb-1">
            <span className="text-xs font-semibold">Total Billed</span>
            <DollarSign size={18} className="text-blue-500" />
          </div>
          <div className="text-2xl font-black text-telivity-navy">₹{stats.totalBilled.toLocaleString('en-IN')}</div>
          <p className="text-[11px] text-gray-400 mt-1">Gross room charges & taxes</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between text-telivity-mid-grey mb-1">
            <span className="text-xs font-semibold">Total Collected</span>
            <CheckCircle2 size={18} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-700">₹{stats.totalCollected.toLocaleString('en-IN')}</div>
          <p className="text-[11px] text-emerald-600 mt-1">Advance & checkout payments</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between text-telivity-mid-grey mb-1">
            <span className="text-xs font-semibold">Outstanding Balance</span>
            <AlertCircle size={18} className="text-amber-500" />
          </div>
          <div className={`text-2xl font-black ${stats.totalBalanceDue > 0 ? 'text-amber-600' : 'text-gray-700'}`}>
            ₹{stats.totalBalanceDue.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-amber-600 mt-1">Pending guest settlements</p>
        </div>
      </div>

      {/* Main Billing Table & Controls Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Filter Tabs & Search Bar */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-gray-200/70 p-1 rounded-xl text-xs font-bold text-gray-600 overflow-x-auto">
            <button
              onClick={() => setStatusTab('all')}
              className={`px-3 py-1.5 rounded-lg transition shrink-0 ${statusTab === 'all' ? 'bg-white text-telivity-navy shadow-xs' : 'hover:text-telivity-navy'}`}
            >
              All Folios ({staysList.length})
            </button>
            <button
              onClick={() => setStatusTab('in_house')}
              className={`px-3 py-1.5 rounded-lg transition shrink-0 ${statusTab === 'in_house' ? 'bg-white text-telivity-navy shadow-xs' : 'hover:text-telivity-navy'}`}
            >
              In-House ({staysList.filter((s) => s.stayStatus === 'in_house').length})
            </button>
            <button
              onClick={() => setStatusTab('checked_out')}
              className={`px-3 py-1.5 rounded-lg transition shrink-0 ${statusTab === 'checked_out' ? 'bg-white text-telivity-navy shadow-xs' : 'hover:text-telivity-navy'}`}
            >
              Checked Out ({staysList.filter((s) => s.stayStatus === 'checked_out').length})
            </button>
            <button
              onClick={() => setStatusTab('pending')}
              className={`px-3 py-1.5 rounded-lg transition shrink-0 ${statusTab === 'pending' ? 'bg-white text-rose-700 shadow-xs' : 'hover:text-rose-700'}`}
            >
              Pending Due ({staysList.filter((s) => (s.balance || 0) > 0).length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative sm:w-80">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search guest, room #, mobile, invoice..."
              className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-telivity-navy focus:ring-2 focus:ring-telivity-teal outline-hidden transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-telivity-teal/5 border-b border-gray-100 text-telivity-slate font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Invoice / Folio #</th>
                <th className="py-3 px-4">Room</th>
                <th className="py-3 px-4">Guest Information</th>
                <th className="py-3 px-4">Stay Duration</th>
                <th className="py-3 px-4 text-right">Total Bill (₹)</th>
                <th className="py-3 px-4 text-right">Paid (₹)</th>
                <th className="py-3 px-4 text-right">Balance Due (₹)</th>
                <th className="py-3 px-4 text-center">Payment Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-telivity-navy">
              {filteredStays.map((stay, index) => {
                const totalPaid = (stay.advancePaid || 0) + (stay.previousPayments || 0);
                const isPaid = (stay.balance || 0) <= 0;
                const invoiceNumber =
                  stay.billNumber ||
                  `INV-SPARK-${stay.roomNumber}-${String(stay.id).slice(-4)}`;

                const checkInDate = stay.checkInTime
                  ? new Date(stay.checkInTime).toLocaleDateString('en-GB')
                  : '—';
                const checkOutDate = stay.actualCheckoutTime || stay.expectedCheckoutTime
                  ? new Date(stay.actualCheckoutTime || stay.expectedCheckoutTime).toLocaleDateString('en-GB')
                  : '—';

                return (
                  <tr
                    key={stay.id || index}
                    className="hover:bg-teal-50/40 transition group"
                  >
                    {/* Invoice Number */}
                    <td className="py-3 px-4 font-mono font-bold text-telivity-teal">
                      <div className="flex items-center gap-1.5">
                        <FileText size={14} className="text-telivity-teal/70 shrink-0" />
                        <span>{invoiceNumber}</span>
                      </div>
                    </td>

                    {/* Room Info */}
                    <td className="py-3 px-4 font-semibold">
                      <div className="flex items-center gap-1.5">
                        <Home size={14} className="text-gray-400 shrink-0" />
                        <span className="font-bold text-telivity-navy">Room {stay.roomNumber}</span>
                      </div>
                      <span className="block text-[11px] text-gray-500 font-normal ml-5">
                        {stay.roomTypeName || 'Budget'}
                      </span>
                    </td>

                    {/* Guest Information */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-telivity-navy">{stay.guestName}</div>
                      <div className="text-[11px] text-gray-500 flex items-center gap-2">
                        <span>{stay.mobile}</span>
                        {stay.city && <span>• {stay.city}</span>}
                      </div>
                    </td>

                    {/* Duration */}
                    <td className="py-3 px-4 text-[11px]">
                      <div>{checkInDate} → {checkOutDate}</div>
                      <span className="text-gray-500 font-medium">
                        {stay.nights} Night{stay.nights > 1 ? 's' : ''} • {stay.adults || 1}A / {stay.children || 0}C
                      </span>
                    </td>

                    {/* Total Bill */}
                    <td className="py-3 px-4 text-right font-bold text-sm">
                      ₹{(stay.totalAmount || 0).toLocaleString('en-IN')}
                    </td>

                    {/* Total Paid */}
                    <td className="py-3 px-4 text-right font-semibold text-emerald-700">
                      ₹{totalPaid.toLocaleString('en-IN')}
                      <span className="block text-[10px] text-gray-400 font-normal">
                        via {stay.paymentMethod || 'CASH'}
                      </span>
                    </td>

                    {/* Balance */}
                    <td className="py-3 px-4 text-right font-black text-sm">
                      <span className={isPaid ? 'text-emerald-700' : 'text-rose-600'}>
                        ₹{(stay.balance || 0).toLocaleString('en-IN')}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${isPaid
                          ? 'bg-emerald-100 text-emerald-800'
                          : totalPaid > 0
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                          }`}
                      >
                        {isPaid ? 'Settled' : totalPaid > 0 ? 'Partially Paid' : 'Unpaid'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* View / Print Full Invoice */}
                        <button
                          onClick={() => setSelectedStayForInvoice(stay)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-telivity-teal hover:bg-teal-600 text-white font-bold text-[11px] shadow-2xs transition"
                          title="View & Print Official GST Invoice"
                        >
                          <Printer size={13} />
                          <span>View Invoice</span>
                        </button>

                        {/* Edit Full Bill */}
                        <button
                          onClick={() => setSelectedStayForEdit(stay)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-telivity-navy font-bold text-[11px] transition"
                          title="Edit Full Bill (Nights, Rates, Extra Charges, Discount, Payments, Remarks)"
                        >
                          <Edit3 size={13} />
                          <span>Edit Bill</span>
                        </button>

                        {/* Quick Settle Balance */}
                        {!isPaid && (
                          <button
                            onClick={() => setQuickSettleStay(stay)}
                            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-200 transition"
                            title="Collect remaining balance and settle bill"
                          >
                            <CreditCard size={13} />
                            <span>Settle</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredStays.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400">
                    <Receipt size={32} className="mx-auto text-gray-300 mb-2" />
                    <p className="font-semibold text-sm">No billing records found</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {searchQuery
                        ? `No folios matching "${searchQuery}"`
                        : 'No stays recorded for this filter tab.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bill Invoice Modal (Official Hotel Spark Pattern) */}
      {selectedStayForInvoice && (
        <BillInvoiceModal
          stay={selectedStayForInvoice}
          isOpen={Boolean(selectedStayForInvoice)}
          onClose={() => setSelectedStayForInvoice(null)}
          onStayUpdated={handleStayUpdated}
        />
      )}

      {/* Edit Full Bill Modal */}
      {selectedStayForEdit && (
        <EditBillModal
          stay={selectedStayForEdit}
          isOpen={Boolean(selectedStayForEdit)}
          onClose={() => setSelectedStayForEdit(null)}
          onSave={handleStayUpdated}
          onSaveAndPrint={(updated) => {
            handleStayUpdated(updated);
            setSelectedStayForInvoice(updated);
          }}
        />
      )}

      {/* Quick Settle Modal */}
      {quickSettleStay && (
        <Modal
          open={Boolean(quickSettleStay)}
          onClose={() => setQuickSettleStay(null)}
          title={`Settle Bill: Room ${quickSettleStay.roomNumber}`}
        >
          <div className="space-y-4 text-xs text-telivity-navy">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Guest Name:</span>
                <span className="font-bold">{quickSettleStay.guestName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Bill:</span>
                <span className="font-semibold">₹{(quickSettleStay.totalAmount || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Already Paid:</span>
                <span className="font-semibold text-emerald-700">
                  ₹{((quickSettleStay.advancePaid || 0) + (quickSettleStay.previousPayments || 0)).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between text-sm font-black pt-1 border-t border-gray-200">
                <span className="text-rose-700">Remaining Balance Due:</span>
                <span className="text-rose-700">₹{(quickSettleStay.balance || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">Select Payment Collection Mode</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSettlePaymentMethod('CASH')}
                  className={`py-2 px-3 rounded-lg font-bold border transition ${settlePaymentMethod === 'CASH' ? 'bg-telivity-teal text-white border-telivity-teal' : 'bg-white text-gray-700 border-gray-300'}`}
                >
                  CASH
                </button>
                <button
                  type="button"
                  onClick={() => setSettlePaymentMethod('UPI')}
                  className={`py-2 px-3 rounded-lg font-bold border transition ${settlePaymentMethod === 'UPI' ? 'bg-telivity-teal text-white border-telivity-teal' : 'bg-white text-gray-700 border-gray-300'}`}
                >
                  UPI (QR)
                </button>
                <button
                  type="button"
                  onClick={() => setSettlePaymentMethod('CARD')}
                  className={`py-2 px-3 rounded-lg font-bold border transition ${settlePaymentMethod === 'CARD' ? 'bg-telivity-teal text-white border-telivity-teal' : 'bg-white text-gray-700 border-gray-300'}`}
                >
                  CARD / POS
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setQuickSettleStay(null)}
                disabled={settling}
                className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleQuickSettle}
                disabled={settling}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md transition disabled:opacity-50"
              >
                <Check size={14} />
                <span>{settling ? 'Settling...' : `Collect ₹${(quickSettleStay.balance || 0).toLocaleString('en-IN')} & Mark Paid`}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/**
 * Split folios (KB 14.2): routing rules decide which folio a charge TYPE posts
 * to for a reservation, and move-transactions relocates charges that already
 * posted. Both need a sibling folio on the same reservation, so the panel also
 * offers creating one.
 */
function SplitFolioPanel({
  folio,
  propertyId,
  charges,
  onChanged,
}: {
  folio: Folio;
  propertyId: string;
  charges: Charge[];
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [ruleOpen, setRuleOpen] = useState(false);
  const [ruleChargeType, setRuleChargeType] = useState<string>(CHARGE_TYPES[0]);
  const [ruleTargetFolioId, setRuleTargetFolioId] = useState('');
  const [rulePriority, setRulePriority] = useState('0');
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveMode, setMoveMode] = useState<'charge' | 'type'>('charge');
  const [moveChargeId, setMoveChargeId] = useState('');
  const [moveChargeType, setMoveChargeType] = useState<string>(CHARGE_TYPES[0]);
  const [moveTargetFolioId, setMoveTargetFolioId] = useState('');
  const [splitOpen, setSplitOpen] = useState(false);

  const reservationId = folio.reservationId;

  const { data: siblingsData, refetch: refetchSiblings } = useQuery({
    queryKey: ['folios', 'siblings', propertyId, reservationId],
    queryFn: () =>
      api
        .get('/v1/folios', { params: { propertyId, reservationId, status: 'open' } })
        .then((r) => r.data),
    enabled: !!reservationId,
  });

  const { data: rulesData, refetch: refetchRules } = useQuery({
    queryKey: ['folio-routing-rules', propertyId, reservationId],
    queryFn: () =>
      api
        .get('/v1/folios/routing-rules', { params: { propertyId, reservationId } })
        .then((r) => r.data),
    enabled: !!reservationId,
  });

  const siblings: Folio[] = (siblingsData?.data ?? siblingsData ?? []).filter(
    (f: Folio) => f.id !== folio.id,
  );
  const rules: RoutingRule[] = rulesData?.data ?? rulesData ?? [];
  const folioLabel = (folioId: string) =>
    folioId === folio.id
      ? folio.folioNumber
      : siblings.find((f) => f.id === folioId)?.folioNumber ?? (folioId ? String(folioId).slice(0, 8) : '—');

  const movableCharges = charges.filter((c) => !c.isLocked && !c.isReversal);

  const createRule = useMutation({
    mutationFn: () =>
      api.post('/v1/folios/routing-rules', {
        propertyId,
        reservationId,
        chargeType: ruleChargeType,
        targetFolioId: ruleTargetFolioId,
        priority: Number(rulePriority) || 0,
      }),
    onSuccess: () => {
      refetchRules();
      setRuleOpen(false);
      setRuleTargetFolioId('');
      setRulePriority('0');
      toast('success', t('folios.routingRuleCreated'));
    },
  });

  const moveTransactions = useMutation({
    mutationFn: () =>
      api.post(`/v1/folios/${folio.id}/move-transactions`, {
        propertyId,
        toFolioId: moveTargetFolioId,
        ...(moveMode === 'charge' ? { chargeId: moveChargeId } : { chargeType: moveChargeType }),
      }),
    onSuccess: (res) => {
      onChanged();
      refetchSiblings();
      setMoveOpen(false);
      setMoveChargeId('');
      const moved = res.data?.moved ?? res.data?.data?.moved;
      toast('success', moved != null ? t('folios.movedCount', { count: moved }) : t('folios.moveSuccess'));
    },
  });

  const createSplitFolio = useMutation({
    mutationFn: () => {
      requirePropertyId(propertyId);
      requireCurrency(folio.currencyCode ?? null);
      return api.post('/v1/folios', {
        propertyId,
        reservationId,
        guestId: folio.guestId,
        type: 'guest',
        currencyCode: folio.currencyCode,
      });
    },
    onSuccess: () => {
      refetchSiblings();
      setSplitOpen(false);
      toast('success', t('folios.splitFolioCreated'));
    },
  });

  if (!reservationId) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="text-sm font-semibold text-telivity-navy mb-2 flex items-center gap-2">
          <Split size={16} className="text-telivity-teal" /> {t('folios.splitFolios')}
        </h2>
        <p className="text-sm text-telivity-mid-grey">{t('folios.splitNeedsReservation')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h2 className="text-sm font-semibold text-telivity-navy flex items-center gap-2">
          <Split size={16} className="text-telivity-teal" /> {t('folios.splitFolios')}
        </h2>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSplitOpen(true)}
            disabled={!folio.guestId}
            className="flex items-center gap-1 border border-gray-200 text-telivity-slate rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-telivity-light-grey disabled:opacity-50"
          >
            <Plus size={14} /> {t('folios.newSplitFolio')}
          </button>
          <button
            onClick={() => { setRuleTargetFolioId(siblings[0]?.id ?? ''); setRuleOpen(true); }}
            disabled={siblings.length === 0}
            className="flex items-center gap-1 border border-gray-200 text-telivity-slate rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-telivity-light-grey disabled:opacity-50"
          >
            <Plus size={14} /> {t('folios.newRoutingRule')}
          </button>
          <button
            onClick={() => {
              setMoveTargetFolioId(siblings[0]?.id ?? '');
              setMoveMode('charge');
              setMoveChargeId(movableCharges[0]?.id ?? '');
              setMoveOpen(true);
            }}
            disabled={siblings.length === 0 || folio.status !== 'open'}
            className="flex items-center gap-1 bg-telivity-teal text-white rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          >
            <ArrowRightLeft size={14} /> {t('folios.moveTransactions')}
          </button>
        </div>
      </div>

      {siblings.length === 0 && (
        <p className="text-xs text-telivity-mid-grey mb-3">{t('folios.splitNeedsSibling')}</p>
      )}

      <p className="text-xs font-semibold text-telivity-slate uppercase mb-2">{t('folios.routingRules')}</p>
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="pb-2 text-left text-xs font-medium text-telivity-mid-grey">{t('folios.chargeType')}</th>
            <th className="pb-2 text-left text-xs font-medium text-telivity-mid-grey">{t('folios.targetFolio')}</th>
            <th className="pb-2 text-right text-xs font-medium text-telivity-mid-grey">{t('folios.priority')}</th>
          </tr>
        </thead>
        <tbody>
          {rules.map((r) => (
            <tr key={r.id} className="border-b border-gray-50">
              <td className="py-2 text-sm text-telivity-navy">{t(`folios.chargeTypes.${r.chargeType}`, { defaultValue: r.chargeType })}</td>
              <td className="py-2 text-sm text-telivity-slate">{folioLabel(r.targetFolioId)}</td>
              <td className="py-2 text-sm text-right">{r.priority}</td>
            </tr>
          ))}
          {rules.length === 0 && (
            <tr><td colSpan={3} className="py-4 text-center text-sm text-telivity-mid-grey">{t('folios.noRoutingRules')}</td></tr>
          )}
        </tbody>
      </table>

      <Modal open={splitOpen} onClose={() => setSplitOpen(false)} title={t('folios.newSplitFolio')}>
        <div className="space-y-4">
          <p className="text-sm text-telivity-mid-grey">{t('folios.newSplitFolioHint')}</p>
          <button
            onClick={() => createSplitFolio.mutate()}
            disabled={createSplitFolio.isPending}
            className="w-full bg-telivity-teal text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {t('common.create')}
          </button>
        </div>
      </Modal>

      <Modal open={ruleOpen} onClose={() => setRuleOpen(false)} title={t('folios.newRoutingRule')}>
        <div className="space-y-4">
          <p className="text-xs text-telivity-mid-grey">{t('folios.routingRuleHint')}</p>
          <div>
            <label className="block text-xs font-medium text-telivity-mid-grey mb-1">{t('folios.chargeType')}</label>
            <select value={ruleChargeType} onChange={(e) => setRuleChargeType(e.target.value)} aria-label={t('folios.chargeType')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              {CHARGE_TYPES.map((ct) => (
                <option key={ct} value={ct}>{t(`folios.chargeTypes.${ct}`, { defaultValue: ct })}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-telivity-mid-grey mb-1">{t('folios.targetFolio')}</label>
            <select value={ruleTargetFolioId} onChange={(e) => setRuleTargetFolioId(e.target.value)} aria-label={t('folios.targetFolio')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="">{t('folios.selectFolio')}</option>
              {siblings.map((f) => (
                <option key={f.id} value={f.id}>{f.folioNumber}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-telivity-mid-grey mb-1">{t('folios.priority')}</label>
            <input type="number" value={rulePriority} onChange={(e) => setRulePriority(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <button
            onClick={() => createRule.mutate()}
            disabled={!ruleTargetFolioId || createRule.isPending}
            className="w-full bg-telivity-teal text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {t('common.create')}
          </button>
        </div>
      </Modal>

      <Modal open={moveOpen} onClose={() => setMoveOpen(false)} title={t('folios.moveTransactions')}>
        <div className="space-y-4">
          <p className="text-xs text-telivity-mid-grey">{t('folios.moveHint')}</p>
          <div className="flex gap-3 text-sm">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" checked={moveMode === 'charge'} onChange={() => setMoveMode('charge')} className="text-telivity-teal" />
              {t('folios.moveSingleCharge')}
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" checked={moveMode === 'type'} onChange={() => setMoveMode('type')} className="text-telivity-teal" />
              {t('folios.moveByType')}
            </label>
          </div>
          {moveMode === 'charge' ? (
            <div>
              <label className="block text-xs font-medium text-telivity-mid-grey mb-1">{t('folios.charge')}</label>
              <select value={moveChargeId} onChange={(e) => setMoveChargeId(e.target.value)} aria-label={t('folios.charge')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="">{t('folios.selectCharge')}</option>
                {movableCharges.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.serviceDate} · {c.description} · {formatMoney(c.amount, folio.currencyCode)}
                  </option>
                ))}
              </select>
              {movableCharges.length === 0 && (
                <p className="text-xs text-telivity-mid-grey mt-1">{t('folios.noMovableCharges')}</p>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-telivity-mid-grey mb-1">{t('folios.chargeType')}</label>
              <select value={moveChargeType} onChange={(e) => setMoveChargeType(e.target.value)} aria-label={t('folios.chargeType')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                {CHARGE_TYPES.map((ct) => (
                  <option key={ct} value={ct}>{t(`folios.chargeTypes.${ct}`, { defaultValue: ct })}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-telivity-mid-grey mb-1">{t('folios.targetFolio')}</label>
            <select value={moveTargetFolioId} onChange={(e) => setMoveTargetFolioId(e.target.value)} aria-label={t('folios.targetFolio')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="">{t('folios.selectFolio')}</option>
              {siblings.map((f) => (
                <option key={f.id} value={f.id}>{f.folioNumber}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => moveTransactions.mutate()}
            disabled={
              !moveTargetFolioId ||
              (moveMode === 'charge' && !moveChargeId) ||
              moveTransactions.isPending
            }
            className="w-full bg-telivity-teal text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {t('folios.move')}
          </button>
        </div>
      </Modal>
    </div>
  );
}

// ---- Folio Detail ----
function FolioDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { propertyId } = useProperty();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [chargeOpen, setChargeOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [arTransferOpen, setArTransferOpen] = useState(false);
  const [arLedgerId, setArLedgerId] = useState('');
  const [chargeType, setChargeType] = useState('room');
  const [chargeAmount, setChargeAmount] = useState('');
  const [chargeDesc, setChargeDesc] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [payAmount, setPayAmount] = useState('');
  const [authorizeOpen, setAuthorizeOpen] = useState(false);
  const [authAmount, setAuthAmount] = useState('');
  const [worldlineWatch, setWorldlineWatch] = useState<{
    propertyId: string;
    folioId: string;
    startedAt: number;
  } | null>(null);
  const [refundTarget, setRefundTarget] = useState<Payment | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [correctTarget, setCorrectTarget] = useState<Payment | null>(null);
  const [correctOp, setCorrectOp] = useState('');

  const { data: folioData } = useQuery({
    queryKey: ['folios', id],
    queryFn: () => api.get(`/v1/folios/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const { data: chargesData } = useQuery({
    queryKey: ['folios', id, 'charges'],
    queryFn: () => api.get(`/v1/folios/${id}/charges`).then((r) => r.data),
    enabled: !!id,
  });

  const { data: paymentsData } = useQuery({
    queryKey: ['payments', 'folio', id],
    queryFn: () => api.get('/v1/payments', { params: { folioId: id } }).then((r) => r.data),
    enabled: !!id,
  });

  const { data: arLedgersData } = useQuery({
    queryKey: ['ar-ledgers', propertyId, 'open'],
    queryFn: () =>
      api.get('/v1/ar/ledgers', { params: { propertyId, status: 'open' } }).then((r) => r.data),
    enabled: !!propertyId && arTransferOpen,
  });
  const arLedgers: { id: string; name: string; balance?: string }[] =
    arLedgersData?.data ?? arLedgersData ?? [];

  const { data: clientConfigData } = useQuery({
    queryKey: ['payments-client-config', propertyId],
    queryFn: () =>
      api
        .get<PaymentClientConfig>('/v1/payments/client-config', { params: { propertyId } })
        .then((r) => r.data),
    enabled: !!propertyId,
  });
  const paymentClientMode = clientConfigData?.clientMode ?? 'stripe';
  const isRedsysClient = paymentClientMode === 'redsys';
  const isWorldlineClient = paymentClientMode === 'worldline';

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['folios'] });
    queryClient.invalidateQueries({ queryKey: ['payments'] });
  };

  useEffect(() => {
    const redsysReturn = searchParams.get('redsys');
    const worldlineReturn = searchParams.get('worldline');
    if (!redsysReturn && worldlineReturn !== 'return') return;
    // Wait until the folio identity is known. Stripping the query first would
    // drop the only signal that a hosted checkout needs a server status read.
    if (worldlineReturn === 'return' && (!propertyId || !id)) return;
    if (redsysReturn === 'ok') {
      toast('success', 'Returned from Redsys. Payment status updates when the bank notification arrives.');
      invalidate();
    } else if (redsysReturn === 'ko') {
      toast('error', 'Redsys payment was cancelled or declined.');
    } else if (worldlineReturn === 'return' && propertyId && id) {
      const watchPropertyId = propertyId;
      const watchFolioId = id;
      setWorldlineWatch((current) => (
        current?.folioId === watchFolioId && current.propertyId === watchPropertyId
          ? current
          : { propertyId: watchPropertyId, folioId: watchFolioId, startedAt: Date.now() }
      ));
    }
    const next = new URLSearchParams(searchParams);
    next.delete('redsys');
    next.delete('worldline');
    setSearchParams(next, { replace: true });
  }, [searchParams, propertyId, id]);

  useEffect(() => {
    if (!worldlineWatch) return;
    let stopped = false;
    const { propertyId: watchPropertyId, folioId, startedAt } = worldlineWatch;
    let lastSignature = '';
    const read = () => {
      const elapsed = Date.now() - startedAt;
      if (!worldlineSyncShouldContinue(['pending'], elapsed)) {
        stopped = true;
        setWorldlineWatch(null);
        return;
      }
      api.post<{ payments?: { status: string }[] }>('/v1/payments/worldline/sync', null, {
        params: { propertyId: watchPropertyId, folioId },
      })
        .then((res) => {
          if (stopped) return;
          const statuses = (res.data?.payments ?? []).map((row) => row.status);
          const notice = worldlineSyncToast(statuses);
          const signature = statuses.slice().sort().join('|');
          if (notice && signature !== lastSignature) {
            lastSignature = signature;
            toast(notice.tone, notice.message);
          }
          invalidate();
          if (!notice || !worldlineSyncShouldContinue(statuses, Date.now() - startedAt)) {
            stopped = true;
            setWorldlineWatch(null);
          }
        })
        .catch(() => {
          if (stopped) return;
          if (lastSignature !== 'error') {
            lastSignature = 'error';
            toast('info', 'Card authorization is still being checked.');
          }
          invalidate();
          if (!worldlineSyncShouldContinue(['pending'], Date.now() - startedAt)) {
            stopped = true;
            setWorldlineWatch(null);
          }
        });
    };
    read();
    const timer = setInterval(read, WORLDLINE_SYNC_INTERVAL_MS);
    const remaining = WORLDLINE_SYNC_DEADLINE_MS - (Date.now() - startedAt);
    const deadline = setTimeout(() => {
      stopped = true;
      setWorldlineWatch(null);
    }, Math.max(remaining, 0));
    return () => {
      stopped = true;
      clearInterval(timer);
      clearTimeout(deadline);
    };
  }, [worldlineWatch]);

  const folio: Folio | null = folioData?.data ?? folioData ?? null;
  const charges: Charge[] = chargesData?.data ?? chargesData ?? [];
  const payments: Payment[] = paymentsData?.data ?? paymentsData ?? [];
  const pendingWorldlineKey = payments
    .filter((payment) => payment.status === 'pending' && payment.gatewayProvider === 'worldline')
    .map((payment) => `${payment.id}:${payment.createdAt}`)
    .join('|');

  useEffect(() => {
    if (!propertyId || !id || !pendingWorldlineKey) return;
    const pending = payments.filter((payment) => payment.status === 'pending' && payment.gatewayProvider === 'worldline');
    const startedAt = Math.min(...pending.map((payment) => new Date(payment.createdAt).getTime()));
    if (!Number.isFinite(startedAt) || Date.now() - startedAt >= WORLDLINE_SYNC_DEADLINE_MS) return;
    setWorldlineWatch((current) => {
      if (current?.folioId === id && current.propertyId === propertyId) {
        return current.startedAt <= startedAt ? current : { ...current, startedAt };
      }
      return { propertyId, folioId: id, startedAt };
    });
  }, [pendingWorldlineKey, propertyId, id]);
  const currencyCode = folio?.currencyCode ?? null;

  const reversedIds = new Set(
    charges.filter((c) => c.isReversal && c.originalChargeId).map((c) => c.originalChargeId!),
  );

  const postChargeMutation = useMutation({
    mutationFn: () => {
      requirePropertyId(propertyId);
      requireCurrency(currencyCode);
      return api.post(`/v1/folios/${id}/charges`, {
        propertyId,
        type: chargeType,
        amount: moneyString(chargeAmount),
        currencyCode,
        description: chargeDesc,
        serviceDate: new Date().toISOString().split('T')[0],
      });
    },
    onSuccess: () => { invalidate(); setChargeOpen(false); setChargeAmount(''); setChargeDesc(''); },
  });

  const reverseMutation = useMutation({
    mutationFn: (chargeId: string) => api.post(`/v1/folios/${id}/charges/${chargeId}/reverse`),
    onSuccess: invalidate,
  });

  const recordPaymentMutation = useMutation({
    mutationFn: () => {
      requirePropertyId(propertyId);
      requireCurrency(currencyCode);
      return api.post('/v1/payments', {
        folioId: id,
        propertyId,
        method: payMethod,
        amount: moneyString(payAmount),
        currencyCode,
      });
    },
    onSuccess: () => { invalidate(); setPaymentOpen(false); setPayAmount(''); },
  });

  /**
   * Card pre-auth (KB 14.1). Stripe and Worldline tokenize in the browser.
   * HAIP receives pm_xxx or a hosted tokenization id. Redsys returns a
   * hosted-checkout nextAction to POST.
   */
  const authorizeMutation = useMutation({
    mutationFn: (pm: { id: string; card?: { last4: string; brand: string } }) => {
      requirePropertyId(propertyId);
      requireCurrency(currencyCode);
      return api.post('/v1/payments/authorize', {
        folioId: id,
        propertyId,
        amount: moneyString(authAmount),
        currencyCode,
        gatewayProvider: 'stripe',
        gatewayPaymentToken: pm.id,
        cardLastFour: pm.card?.last4,
        cardBrand: pm.card?.brand,
      });
    },
    onSuccess: () => {
      invalidate();
      setAuthorizeOpen(false);
      setAuthAmount('');
      toast('success', t('folios.authorizeSuccess'));
    },
  });

  const redsysAuthorizeMutation = useMutation({
    mutationFn: () => {
      requirePropertyId(propertyId);
      requireCurrency(currencyCode);
      const folioUrl = `${window.location.origin}${window.location.pathname}`;
      return api.post<{ nextAction?: RedirectNextAction }>('/v1/payments/authorize', {
        folioId: id,
        propertyId,
        amount: moneyString(authAmount),
        currencyCode,
        gatewayProvider: 'redsys',
        gatewayPaymentToken: 'redsys_redirect',
        redirectUrlOk: `${folioUrl}?redsys=ok`,
        redirectUrlKo: `${folioUrl}?redsys=ko`,
      });
    },
    onSuccess: (res) => {
      const nextAction = res.data?.nextAction;
      if (nextAction?.type === 'redirect') {
        submitRedirectNextAction(nextAction);
        return;
      }
      invalidate();
      setAuthorizeOpen(false);
      setAuthAmount('');
      toast('success', t('folios.authorizeSuccess'));
    },
  });

  const worldlineAuthorizeMutation = useMutation({
    mutationFn: (hostedTokenizationId: string) => {
      requirePropertyId(propertyId);
      requireCurrency(currencyCode);
      const folioUrl = `${window.location.origin}${window.location.pathname}`;
      return api.post<{ nextAction?: RedirectNextAction }>('/v1/payments/authorize', {
        folioId: id,
        propertyId,
        amount: moneyString(authAmount),
        currencyCode,
        gatewayProvider: 'worldline',
        gatewayPaymentToken: hostedTokenizationId,
        redirectUrlOk: `${folioUrl}?worldline=return`,
        redirectUrlKo: `${folioUrl}?worldline=return`,
      });
    },
    onSuccess: (res) => {
      const nextAction = res.data?.nextAction;
      if (nextAction?.type === 'redirect') {
        submitRedirectNextAction(nextAction);
        return;
      }
      invalidate();
      setAuthorizeOpen(false);
      setAuthAmount('');
      toast('success', t('folios.authorizeSuccess'));
    },
  });

  const captureMutation = useMutation({
    mutationFn: (paymentId: string) => api.post(`/v1/payments/${paymentId}/capture`, null),
    onSuccess: () => {
      invalidate();
      toast('success', t('folios.captureSuccess'));
    },
  });

  const voidMutation = useMutation({
    mutationFn: (paymentId: string) => api.post(`/v1/payments/${paymentId}/void`, null),
    onSuccess: () => {
      invalidate();
      toast('success', t('folios.voidSuccess'));
    },
  });

  const refundMutation = useMutation({
    mutationFn: ({ paymentId, amount }: { paymentId: string; amount?: string }) =>
      api.post(`/v1/payments/${paymentId}/refund`, amount ? { amount: moneyString(amount) } : {}),
    onSuccess: () => {
      invalidate();
      setRefundTarget(null);
      setRefundAmount('');
      toast('success', t('folios.refundSuccess'));
    },
  });

  /**
   * Correction matrix (KB 14.1): the API derives the single legal op from the
   * payment's state. An explicit op is only sent when the operator picks one,
   * and the API rejects it if it is not the legal op.
   */
  const correctMutation = useMutation({
    mutationFn: ({ paymentId, op }: { paymentId: string; op?: string }) => {
      requirePropertyId(propertyId);
      return api.post(`/v1/payments/${paymentId}/correct`, {
        propertyId,
        ...(op ? { op } : {}),
      });
    },
    onSuccess: (res) => {
      invalidate();
      setCorrectTarget(null);
      setCorrectOp('');
      const applied = res.data?.op ?? res.data?.data?.op;
      toast('success', applied ? t('folios.correctApplied', { op: applied }) : t('folios.correctSuccess'));
    },
  });

  const settleMutation = useMutation({ mutationFn: () => api.patch(`/v1/folios/${id}/settle`), onSuccess: invalidate });
  const closeMutation = useMutation({ mutationFn: () => api.patch(`/v1/folios/${id}/close`), onSuccess: invalidate });

  const transferToArMutation = useMutation({
    mutationFn: () => {
      requirePropertyId(propertyId);
      return api.post('/v1/ar/transfer', {
        propertyId,
        folioId: id,
        arLedgerId,
      });
    },
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['ar-ledgers'] });
      setArTransferOpen(false);
      setArLedgerId('');
      toast('success', t('folios.transferredToAr'));
    },
  });

  if (!folio) return <div className="flex items-center justify-center h-64 text-telivity-mid-grey">{t('common.loading')}</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/folios')} className="p-1.5 rounded hover:bg-telivity-light-grey"><ChevronLeft size={20} /></button>
        <Receipt size={24} className="text-telivity-teal" />
        <h1 className="text-2xl font-semibold text-telivity-navy">{folio.folioNumber}</h1>
        <StatusBadge status={folio.status === 'open' ? 'pending' : 'success'} label={t(`folios.${folio.status}`, { defaultValue: folio.status })} />
        <div className="ml-auto text-right">
          <p className="text-xs text-telivity-mid-grey">{t('folios.balance')}</p>
          <p className="text-2xl font-semibold text-telivity-navy">{formatMoney(folio.balance ?? 0, folio.currencyCode)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charges */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-telivity-navy">{t('folios.charges')}</h2>
            {folio.status === 'open' && (
              <button onClick={() => setChargeOpen(true)} className="flex items-center gap-1 bg-telivity-teal text-white rounded-lg px-3 py-1.5 text-xs font-semibold">
                <Plus size={14} /> {t('folios.postCharge')}
              </button>
            )}
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="pb-2 text-left text-xs font-medium text-telivity-mid-grey">{t('common.date')}</th>
                <th className="pb-2 text-left text-xs font-medium text-telivity-mid-grey">{t('folios.description')}</th>
                <th className="pb-2 text-left text-xs font-medium text-telivity-mid-grey">{t('folios.type')}</th>
                <th className="pb-2 text-right text-xs font-medium text-telivity-mid-grey">{t('folios.amount')}</th>
                <th className="pb-2 text-right text-xs font-medium text-telivity-mid-grey"></th>
              </tr>
            </thead>
            <tbody>
              {charges.map((c) => (
                <tr key={c.id} className={`border-b border-gray-50 ${reversedIds.has(c.id) ? 'opacity-50 line-through' : ''}`}>
                  <td className="py-2 text-sm text-telivity-slate">{c.serviceDate}</td>
                  <td className="py-2 text-sm text-telivity-navy">{c.description} {c.isLocked && <Lock size={12} className="inline text-telivity-mid-grey" />}</td>
                  <td className="py-2 text-sm text-telivity-slate">{t(`folios.chargeTypes.${c.type}`, { defaultValue: c.type })}</td>
                  <td className="py-2 text-sm text-right font-medium">{formatMoney(c.amount, folio.currencyCode)}</td>
                  <td className="py-2 text-right">
                    {!c.isReversal && !reversedIds.has(c.id) && !c.isLocked && folio.status === 'open' && (
                      <button onClick={() => { if (confirm('Reverse this charge?')) reverseMutation.mutate(c.id); }} className="text-telivity-orange text-xs hover:underline">
                        <RotateCcw size={12} className="inline" /> {t('folios.reverse')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {charges.length === 0 && (
                <tr><td colSpan={5} className="py-4 text-center text-sm text-telivity-mid-grey">{t('folios.noCharges')}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Payments + Actions */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
              <h2 className="text-sm font-semibold text-telivity-navy">{t('folios.payments')}</h2>
              {folio.status === 'open' && (
                <div className="flex gap-2">
                  <button onClick={() => setAuthorizeOpen(true)} className="flex items-center gap-1 border border-gray-200 text-telivity-slate rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-telivity-light-grey">
                    <CreditCard size={14} /> {t('folios.authorizeCard')}
                  </button>
                  <button onClick={() => setPaymentOpen(true)} className="flex items-center gap-1 bg-telivity-teal text-white rounded-lg px-3 py-1.5 text-xs font-semibold">
                    <Plus size={14} /> {t('folios.record')}
                  </button>
                </div>
              )}
            </div>
            {payments.map((p) => {
              const isOriginal = Number(p.amount) > 0 && !p.originalPaymentId;
              const canRefund = folio.status === 'open' && isOriginal && REFUNDABLE_STATUSES.has(p.status);
              const canCapture = folio.status === 'open' && isOriginal && p.status === 'authorized';
              const canVoid = canCapture;
              // The correction matrix resolves the legal op server-side, so it is
              // offered for any live original payment, not just refundable ones.
              const canCorrect =
                folio.status === 'open' &&
                isOriginal &&
                !['voided', 'failed', 'refunded'].includes(p.status);

              return (
                <div key={p.id} className="flex items-start justify-between py-2 border-b border-gray-50 last:border-0 gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-telivity-navy">{formatMoney(p.amount, folio.currencyCode)}</p>
                    <p className="text-xs text-telivity-mid-grey">{t(`folios.paymentMethods.${p.method}`, { defaultValue: p.method })} &middot; {p.createdAt?.split('T')[0]}</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {canCapture && (
                        <button
                          onClick={() => captureMutation.mutate(p.id)}
                          disabled={captureMutation.isPending}
                          className="text-telivity-teal text-xs hover:underline disabled:opacity-50"
                        >
                          {t('folios.capture')}
                        </button>
                      )}
                      {canVoid && (
                        <button
                          onClick={() => { if (confirm(t('folios.confirmVoid'))) voidMutation.mutate(p.id); }}
                          disabled={voidMutation.isPending}
                          className="text-telivity-orange text-xs hover:underline disabled:opacity-50"
                        >
                          {t('folios.void')}
                        </button>
                      )}
                      {canRefund && (
                        <button
                          onClick={() => { setRefundTarget(p); setRefundAmount(''); }}
                          className="text-telivity-orange text-xs hover:underline"
                        >
                          {t('folios.refund')}
                        </button>
                      )}
                      {canCorrect && (
                        <button
                          onClick={() => { setCorrectTarget(p); setCorrectOp(''); }}
                          className="text-telivity-slate text-xs hover:underline"
                        >
                          {t('folios.correct')}
                        </button>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={p.status === 'captured' ? 'success' : p.status} label={t(`folios.paymentStatuses.${p.status}`, { defaultValue: p.status })} />
                </div>
              );
            })}
            {payments.length === 0 && <p className="text-sm text-telivity-mid-grey">{t('folios.noPayments')}</p>}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5 space-y-2">
            <h2 className="text-sm font-semibold text-telivity-navy mb-3">{t('common.actions')}</h2>
            {folio.status === 'open' && Number(folio.balance ?? 0) !== 0 && (
              <button
                onClick={() => setArTransferOpen(true)}
                className="w-full border border-gray-200 text-telivity-navy rounded-lg px-4 py-2 text-sm font-semibold hover:bg-telivity-light-grey"
              >
                {t('folios.transferToAr')}
              </button>
            )}
            {folio.status === 'open' && (
              <button onClick={() => settleMutation.mutate()} disabled={settleMutation.isPending} className="w-full bg-telivity-dark-teal text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50">
                {t('folios.settleFolio')}
              </button>
            )}
            {folio.status === 'settled' && (
              <button onClick={() => closeMutation.mutate()} disabled={closeMutation.isPending} className="w-full bg-telivity-deep-blue text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50">
                {t('folios.closeFolio')}
              </button>
            )}
          </div>
        </div>

        {propertyId && (
          <div className="lg:col-span-3">
            <SplitFolioPanel
              folio={folio}
              propertyId={propertyId}
              charges={charges}
              onChanged={() => {
                invalidate();
                queryClient.invalidateQueries({ queryKey: ['folios', id, 'charges'] });
              }}
            />
          </div>
        )}
      </div>

      {/* Post Charge Modal */}
      <Modal open={chargeOpen} onClose={() => setChargeOpen(false)} title={t('folios.postCharge')}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-telivity-mid-grey mb-1">{t('folios.type')}</label>
            <select value={chargeType} onChange={(e) => setChargeType(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal">
              <option value="room">{t('folios.chargeTypes.room')}</option><option value="food_beverage">{t('folios.chargeTypes.food_beverage')}</option><option value="minibar">{t('folios.chargeTypes.minibar')}</option><option value="laundry">{t('folios.chargeTypes.laundry')}</option><option value="parking">{t('folios.chargeTypes.parking')}</option><option value="other">{t('folios.chargeTypes.other')}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-telivity-mid-grey mb-1">{t('folios.amount')}</label>
            <input type="number" step="0.01" value={chargeAmount} onChange={(e) => setChargeAmount(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal" />
          </div>
          <div>
            <label className="block text-xs font-medium text-telivity-mid-grey mb-1">{t('folios.description')}</label>
            <input type="text" value={chargeDesc} onChange={(e) => setChargeDesc(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal" />
          </div>
          <button onClick={() => postChargeMutation.mutate()} disabled={!chargeAmount || postChargeMutation.isPending} className="w-full bg-telivity-teal text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50">{t('folios.postCharge')}</button>
        </div>
      </Modal>

      {/* Record Payment Modal */}
      <Modal open={paymentOpen} onClose={() => setPaymentOpen(false)} title={t('folios.recordPayment')}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-telivity-mid-grey mb-1">{t('folios.method')}</label>
            <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal">
              <option value="cash">{t('folios.paymentMethods.cash')}</option>
              <option value="pix">{t('folios.paymentMethods.pix')}</option>
              <option value="credit_card">{t('folios.paymentMethods.credit_card')}</option>
              <option value="debit_card">{t('folios.paymentMethods.debit_card')}</option>
              <option value="bank_transfer">{t('folios.paymentMethods.bank_transfer')}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-telivity-mid-grey mb-1">{t('folios.amount')}</label>
            <input type="number" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal" />
          </div>
          <button onClick={() => recordPaymentMutation.mutate()} disabled={!payAmount || recordPaymentMutation.isPending} className="w-full bg-telivity-teal text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50">{t('folios.recordPayment')}</button>
        </div>
      </Modal>

      {/* Card pre-auth — Stripe Elements or Redsys hosted redirect. */}
      <Modal open={authorizeOpen} onClose={() => setAuthorizeOpen(false)} title={t('folios.authorizeCard')}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-telivity-mid-grey mb-1">{t('folios.amount')}</label>
            <input
              type="number"
              step="0.01"
              value={authAmount}
              onChange={(e) => setAuthAmount(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal"
            />
          </div>
          {isRedsysClient ? (
            <>
              <p className="text-xs text-telivity-mid-grey">
                Guest will complete 3DS on Redsys and return to this folio.
              </p>
              {Number(authAmount) > 0 ? (
                <button
                  type="button"
                  onClick={() => redsysAuthorizeMutation.mutate()}
                  disabled={redsysAuthorizeMutation.isPending}
                  className="w-full bg-telivity-teal text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  {redsysAuthorizeMutation.isPending
                    ? t('common.loading')
                    : 'Authorize with Redsys'}
                </button>
              ) : (
                <p className="text-xs text-telivity-mid-grey">{t('folios.authorizeEnterAmount')}</p>
              )}
            </>
          ) : isWorldlineClient ? (
            <>
              <p className="text-xs text-telivity-mid-grey">
                Enter the card on this page. A bank challenge can still leave HAIP, and the return URL is not proof of payment.
              </p>
              {authorizeOpen && Number(authAmount) > 0 && propertyId ? (
                <WorldlineCard
                  propertyId={propertyId}
                  submitLabel={t('folios.authorize')}
                  disabled={worldlineAuthorizeMutation.isPending}
                  onToken={(hostedTokenizationId) => worldlineAuthorizeMutation.mutate(hostedTokenizationId)}
                  onError={(msg) => toast('error', msg)}
                />
              ) : (
                <p className="text-xs text-telivity-mid-grey">{t('folios.authorizeEnterAmount')}</p>
              )}
            </>
          ) : (
            <>
              <p className="text-xs text-telivity-mid-grey">{t('folios.authorizeHint')}</p>
              {Number(authAmount) > 0 ? (
                <StripeProvider>
                  <CardInput
                    submitLabel={t('folios.authorize')}
                    disabled={authorizeMutation.isPending}
                    onPaymentMethod={(pm) => authorizeMutation.mutate(pm)}
                    onError={(msg) => toast('error', msg)}
                  />
                </StripeProvider>
              ) : (
                <p className="text-xs text-telivity-mid-grey">{t('folios.authorizeEnterAmount')}</p>
              )}
            </>
          )}
        </div>
      </Modal>

      <Modal open={!!refundTarget} onClose={() => setRefundTarget(null)} title={t('folios.refund')}>
        <div className="space-y-4">
          <p className="text-sm text-telivity-mid-grey">
            {t('folios.refundHint', { amount: formatMoney(refundTarget?.amount ?? 0, folio.currencyCode) })}
          </p>
          <div>
            <label className="block text-xs font-medium text-telivity-mid-grey mb-1">{t('folios.refundAmountOptional')}</label>
            {/* The placeholder is a value the user TYPES: no symbol, but still
                the currency's own number of decimals. A yen placeholder reading
                151110.00 invites someone to type minor units that do not exist. */}
            <input
              type="number"
              step="0.01"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              placeholder={formatMoneyPlain(refundTarget?.amount ?? 0, folio.currencyCode)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telivity-teal"
            />
          </div>
          <button
            onClick={() =>
              refundMutation.mutate({
                paymentId: refundTarget!.id,
                amount: refundAmount.trim() || undefined,
              })
            }
            disabled={refundMutation.isPending}
            className="w-full bg-telivity-orange text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {t('folios.refund')}
          </button>
        </div>
      </Modal>

      <Modal open={!!correctTarget} onClose={() => setCorrectTarget(null)} title={t('folios.correctPayment')}>
        <div className="space-y-4">
          <p className="text-sm text-telivity-mid-grey">{t('folios.correctHint')}</p>
          <div>
            <label className="block text-xs font-medium text-telivity-mid-grey mb-1">{t('folios.correctionOp')}</label>
            <select value={correctOp} onChange={(e) => setCorrectOp(e.target.value)} aria-label={t('folios.correctionOp')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="">{t('folios.correctionAuto')}</option>
              <option value="void">{t('folios.void')}</option>
              <option value="refund">{t('folios.refund')}</option>
              <option value="adjust">{t('folios.adjust')}</option>
            </select>
          </div>
          <button
            onClick={() => correctMutation.mutate({ paymentId: correctTarget!.id, op: correctOp || undefined })}
            disabled={correctMutation.isPending}
            className="w-full bg-telivity-teal text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {t('folios.applyCorrection')}
          </button>
        </div>
      </Modal>

      <Modal open={arTransferOpen} onClose={() => setArTransferOpen(false)} title={t('folios.transferToAr')}>
        <div className="space-y-4">
          <p className="text-sm text-telivity-mid-grey">
            {t('folios.transferToArHint', { balance: formatMoney(folio.balance ?? 0, folio.currencyCode) })}
          </p>
          <select
            value={arLedgerId}
            onChange={(e) => setArLedgerId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">{t('folios.selectArLedger')}</option>
            {arLedgers.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
          {arLedgers.length === 0 && (
            <p className="text-xs text-telivity-mid-grey">{t('folios.noOpenArLedgers')}</p>
          )}
          <button
            onClick={() => transferToArMutation.mutate()}
            disabled={!arLedgerId || transferToArMutation.isPending}
            className="w-full bg-telivity-teal text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {t('folios.transferBalance')}
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default function Folios() {
  return (
    <Routes>
      <Route index element={<FolioList />} />
      <Route path=":id" element={<FolioDetail />} />
    </Routes>
  );
}
