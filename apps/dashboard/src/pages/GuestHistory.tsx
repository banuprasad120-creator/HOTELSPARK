import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  History,
  Search,
  Calendar,
  Phone,
  DoorOpen,
  FileText,
  Printer,
  ShieldCheck,
  CheckCircle,
  IndianRupee,
  Clock,
  Eye,
  Download,
} from 'lucide-react';
import { api } from '../lib/api';
import { useProperty } from '../context/PropertyContext';
import { getStoredStays, type StoredStay } from '../lib/supabaseAdapter';
import BillInvoiceModal from '../components/billing/BillInvoiceModal';
import AadhaarViewerModal from '../components/guests/AadhaarViewerModal';

export default function GuestHistory() {
  const { propertyId } = useProperty();
  const [searchTerm, setSearchTerm] = useState('');
  const [invoiceStay, setInvoiceStay] = useState<StoredStay | null>(null);
  const [aadhaarStay, setAadhaarStay] = useState<StoredStay | null>(null);

  // Load stays
  const { data: staysData } = useQuery({
    queryKey: ['stays', propertyId],
    queryFn: () => api.get('/v1/stays', { params: { propertyId } }).then((r) => r.data),
    enabled: !!propertyId,
  });

  const stays: StoredStay[] = useMemo(() => {
    const raw = staysData?.data ?? staysData;
    if (Array.isArray(raw) && raw.length > 0) return raw;
    return getStoredStays();
  }, [staysData]);

  // Filter only checked-out previous stays
  const pastStays = useMemo(() => {
    return stays.filter((s) => s.stayStatus === 'checked_out');
  }, [stays]);

  // Real-time search filter by Name, Mobile, Room, or Date
  const filteredStays = useMemo(() => {
    if (!searchTerm.trim()) return pastStays;
    const term = searchTerm.toLowerCase();
    return pastStays.filter(
      (s) =>
        s.guestName.toLowerCase().includes(term) ||
        s.mobile.includes(term) ||
        s.roomNumber.toLowerCase().includes(term) ||
        s.checkInTime.includes(term) ||
        (s.billNumber && s.billNumber.toLowerCase().includes(term))
    );
  }, [pastStays, searchTerm]);

  const totalHistoricalRevenue = pastStays.reduce(
    (sum, s) => sum + (s.advancePaid || 0) + (s.previousPayments || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-telivity-navy text-white rounded-xl shadow-xs">
            <History size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-telivity-navy tracking-tight">Guest Stay History & Archive</h1>
            <p className="text-xs text-telivity-mid-grey">Search past hotel check-outs, past stay bills, and archive records</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
            <IndianRupee size={14} className="text-emerald-600" />
            <span>Total Historical Collections: ₹{totalHistoricalRevenue.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-200 shadow-xs">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-3 text-telivity-mid-grey" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search previous guests by name, phone, room number, check-in date (YYYY-MM-DD), or bill #..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-telivity-teal bg-gray-50/50"
          />
        </div>

        <div className="text-xs text-telivity-mid-grey px-2 shrink-0">
          <span>Found <strong className="text-telivity-navy">{filteredStays.length}</strong> previous stays</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 border-b border-gray-200 text-telivity-slate font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Guest Name</th>
                <th className="py-3 px-4">Mobile</th>
                <th className="py-3 px-4">Room No.</th>
                <th className="py-3 px-4">Stay Dates</th>
                <th className="py-3 px-4 text-center">Duration</th>
                <th className="py-3 px-4 text-right">Total Charges</th>
                <th className="py-3 px-4 text-right">Settled Payment</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Bill / Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStays.map((stay) => {
                const totalPaid = (stay.advancePaid || 0) + (stay.previousPayments || 0);

                return (
                  <tr key={stay.id} className="hover:bg-gray-50/80 transition-colors">
                    {/* Guest Name */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-telivity-navy text-sm">{stay.guestName}</div>
                      <div className="text-[11px] text-telivity-mid-grey">
                        {stay.city || 'Karimnagar'}, {stay.state || 'Telangana'} • ID: {stay.idProofType.split(' ')[0]}
                      </div>
                    </td>

                    {/* Mobile */}
                    <td className="py-3 px-4">
                      <a href={`tel:${stay.mobile}`} className="font-medium text-telivity-slate hover:text-telivity-teal flex items-center gap-1">
                        <Phone size={11} className="text-telivity-teal" /> {stay.mobile}
                      </a>
                    </td>

                    {/* Room */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 border border-gray-200 text-telivity-slate font-bold text-xs">
                        <DoorOpen size={12} /> Room {stay.roomNumber}
                      </span>
                      <div className="text-[10px] text-telivity-mid-grey mt-0.5 truncate max-w-[120px]">
                        {stay.roomTypeName}
                      </div>
                    </td>

                    {/* Stay Dates */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-telivity-navy">
                        {new Date(stay.checkInTime).toLocaleDateString('en-IN', { dateStyle: 'short' })} →{' '}
                        {stay.actualCheckoutTime
                          ? new Date(stay.actualCheckoutTime).toLocaleDateString('en-IN', { dateStyle: 'short' })
                          : new Date(stay.expectedCheckoutTime).toLocaleDateString('en-IN', { dateStyle: 'short' })}
                      </div>
                      <div className="text-[10px] text-telivity-mid-grey">
                        Checked Out:{' '}
                        {stay.actualCheckoutTime
                          ? new Date(stay.actualCheckoutTime).toLocaleTimeString('en-IN', { timeStyle: 'short' })
                          : '12:00 PM'}
                      </div>
                    </td>

                    {/* Duration */}
                    <td className="py-3 px-4 text-center font-semibold text-telivity-navy">
                      {stay.nights} Night{stay.nights > 1 ? 's' : ''}
                    </td>

                    {/* Total Charges */}
                    <td className="py-3 px-4 text-right font-bold text-telivity-navy">
                      ₹{stay.totalAmount?.toLocaleString('en-IN')}
                    </td>

                    {/* Settled Payment */}
                    <td className="py-3 px-4 text-right font-semibold text-emerald-700">
                      ₹{totalPaid.toLocaleString('en-IN')}
                      <div className="text-[10px] text-telivity-mid-grey">{stay.paymentMethod}</div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle size={10} /> Checked Out
                      </span>
                    </td>

                    {/* Bill & Aadhaar Actions */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setInvoiceStay(stay)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-telivity-teal/10 hover:bg-telivity-teal text-telivity-teal hover:text-white font-bold text-xs transition"
                          title="View Tax Folio & Invoice"
                        >
                          <FileText size={13} /> View Invoice
                        </button>
                        <button
                          onClick={() => setAadhaarStay(stay)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white border border-emerald-200 font-bold text-xs transition shadow-2xs"
                          title="View and download Aadhaar card (Front & Back)"
                        >
                          <Eye size={13} /> View Aadhaar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredStays.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-telivity-mid-grey">
                    <History size={36} className="mx-auto mb-2 text-telivity-mid-grey/50" />
                    <p className="font-semibold text-sm">No historical stay records found</p>
                    <p className="text-xs text-telivity-mid-grey mt-0.5">Checked-out guest folios will appear here automatically</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bill Invoice Modal */}
      <BillInvoiceModal
        stay={invoiceStay}
        isOpen={Boolean(invoiceStay)}
        onClose={() => setInvoiceStay(null)}
      />

      {/* Aadhaar Viewer Modal */}
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
