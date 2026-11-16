import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Search,
  Plus,
  DoorOpen,
  Calendar,
  CreditCard,
  Phone,
  ShieldCheck,
  FileText,
  LogOut,
  IndianRupee,
  Eye,
  CheckCircle,
  Clock,
  Sparkles,
  MapPin,
  X,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../lib/api';
import { useProperty } from '../context/PropertyContext';
import { useToast } from '../components/ui/Toast';
import { getStoredStays, type StoredStay } from '../lib/supabaseAdapter';
import AddGuestModal from '../components/front-desk/AddGuestModal';
import CheckoutModal from '../components/front-desk/CheckOutModal';
import BillInvoiceModal from '../components/billing/BillInvoiceModal';

export default function InHouseGuests() {
  const { propertyId } = useProperty();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [addGuestOpen, setAddGuestOpen] = useState(false);
  const [checkoutStay, setCheckoutStay] = useState<StoredStay | null>(null);
  const [invoiceStay, setInvoiceStay] = useState<StoredStay | null>(null);
  const [detailsStay, setDetailsStay] = useState<StoredStay | null>(null);
  const [idDocStay, setIdDocStay] = useState<StoredStay | null>(null);
  const [addPaymentStay, setAddPaymentStay] = useState<StoredStay | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Card' | 'Bank Transfer'>('Cash');

  // Load stays
  const { data: staysData, isLoading } = useQuery({
    queryKey: ['stays', propertyId],
    queryFn: () => api.get('/v1/stays', { params: { propertyId } }).then((r) => r.data),
    enabled: !!propertyId,
  });

  const stays: StoredStay[] = useMemo(() => {
    const raw = staysData?.data ?? staysData;
    if (Array.isArray(raw) && raw.length > 0) return raw;
    return getStoredStays();
  }, [staysData]);

  // Filter only in-house active guests
  const inHouseGuests = useMemo(() => {
    return stays.filter((s) => s.stayStatus === 'in_house');
  }, [stays]);

  // Search filter
  const filteredGuests = useMemo(() => {
    if (!searchTerm.trim()) return inHouseGuests;
    const term = searchTerm.toLowerCase();
    return inHouseGuests.filter(
      (g) =>
        g.guestName.toLowerCase().includes(term) ||
        g.mobile.includes(term) ||
        g.roomNumber.toLowerCase().includes(term) ||
        (g.idProofNumber && g.idProofNumber.toLowerCase().includes(term))
    );
  }, [inHouseGuests, searchTerm]);

  // Aggregate KPIs
  const totalOccupied = inHouseGuests.length;
  const totalAdvanceCollected = inHouseGuests.reduce((sum, g) => sum + (g.advancePaid || 0) + (g.previousPayments || 0), 0);
  const totalPendingBalance = inHouseGuests.reduce((sum, g) => sum + (g.balance || 0), 0);

  // Add interim payment mutation
  const paymentMutation = useMutation({
    mutationFn: ({ stayId, amount, method }: { stayId: string; amount: number; method: string }) =>
      api.post(`/v1/stays/${stayId}/payment`, { amount, paymentMethod: method, propertyId }),
    onSuccess: () => {
      toast('success', `Payment of ₹${paymentAmount} recorded successfully!`);
      queryClient.invalidateQueries({ queryKey: ['stays'] });
      queryClient.invalidateQueries({ queryKey: ['staff-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['staff-notifications-unread'] });
      setAddPaymentStay(null);
      setPaymentAmount('');
    },
    onError: () => {
      toast('error', 'Failed to record payment.');
    },
  });

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-telivity-teal text-white rounded-xl shadow-xs">
              <Users size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-telivity-navy tracking-tight">Currently Staying Guests (In-House Register)</h1>
              <p className="text-xs text-telivity-mid-grey">Live register of all guests presently checked into Spark Hotel</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setAddGuestOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-telivity-teal hover:bg-telivity-light-teal text-white text-xs font-bold shadow-md transition shrink-0"
        >
          <Plus size={16} /> ADD NEW GUEST / WALK-IN CHECK-IN
        </button>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-telivity-mid-grey">In-House Guests</p>
            <p className="text-2xl font-extrabold text-telivity-navy mt-1">{totalOccupied} Guests</p>
            <p className="text-[11px] text-telivity-teal font-medium mt-0.5">Staying across {totalOccupied} rooms</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-telivity-teal flex items-center justify-center font-bold">
            <DoorOpen size={24} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-telivity-mid-grey">Total Collected Advance</p>
            <p className="text-2xl font-extrabold text-emerald-700 mt-1">₹{totalAdvanceCollected.toLocaleString('en-IN')}</p>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Deposited at front desk</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <IndianRupee size={24} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-telivity-mid-grey">Outstanding Balance Due</p>
            <p className="text-2xl font-extrabold text-rose-700 mt-1">₹{totalPendingBalance.toLocaleString('en-IN')}</p>
            <p className="text-[11px] text-rose-600 font-medium mt-0.5">To collect upon checkout</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <CreditCard size={24} />
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-200 shadow-xs">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-3 text-telivity-mid-grey" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search in-house guests by name, mobile, room number, or Aadhaar ID..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-telivity-teal bg-gray-50/50"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-telivity-mid-grey px-2 shrink-0">
          <span>Showing <strong className="text-telivity-navy">{filteredGuests.length}</strong> active staying guests</span>
        </div>
      </div>

      {/* In-House Guests Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 border-b border-gray-200 text-telivity-slate font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Guest Name</th>
                <th className="py-3 px-4">Mobile</th>
                <th className="py-3 px-4">Room No.</th>
                <th className="py-3 px-4">Check-In</th>
                <th className="py-3 px-4">Expected Checkout</th>
                <th className="py-3 px-4 text-right">Room Tariff</th>
                <th className="py-3 px-4 text-right">Total Bill</th>
                <th className="py-3 px-4 text-right">Advance Paid</th>
                <th className="py-3 px-4 text-right">Balance Due</th>
                <th className="py-3 px-4 text-center">ID Proof</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredGuests.map((guest) => {
                const isPaid = guest.balance <= 0;
                const hasIdDoc = Boolean(guest.idProofFrontUrl || guest.idProofNumber);

                return (
                  <tr key={guest.id} className="hover:bg-teal-50/20 transition-colors">
                    {/* Guest Name */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-telivity-navy text-sm">{guest.guestName}</div>
                      <div className="text-[11px] text-telivity-mid-grey">
                        {guest.city || 'Karimnagar'}, {guest.state || 'Telangana'} • {guest.adults}A {guest.children > 0 ? `${guest.children}C` : ''}
                      </div>
                    </td>

                    {/* Mobile */}
                    <td className="py-3 px-4">
                      <a href={`tel:${guest.mobile}`} className="font-medium text-telivity-slate hover:text-telivity-teal flex items-center gap-1">
                        <Phone size={11} className="text-telivity-teal" /> {guest.mobile}
                      </a>
                    </td>

                    {/* Room */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-telivity-teal font-extrabold text-xs">
                        <DoorOpen size={12} /> Room {guest.roomNumber}
                      </span>
                      <div className="text-[10px] text-telivity-mid-grey mt-0.5 truncate max-w-[120px]">
                        {guest.roomTypeName}
                      </div>
                    </td>

                    {/* Check In */}
                    <td className="py-3 px-4">
                      <span className="font-medium text-telivity-navy">
                        {new Date(guest.checkInTime).toLocaleDateString('en-IN', { dateStyle: 'short' })}
                      </span>
                      <div className="text-[10px] text-telivity-mid-grey">
                        {new Date(guest.checkInTime).toLocaleTimeString('en-IN', { timeStyle: 'short' })}
                      </div>
                    </td>

                    {/* Expected Checkout */}
                    <td className="py-3 px-4">
                      <span className="font-medium text-telivity-navy">
                        {new Date(guest.expectedCheckoutTime).toLocaleDateString('en-IN', { dateStyle: 'short' })}
                      </span>
                      <div className="text-[10px] text-telivity-mid-grey">
                        {guest.nights} Night{guest.nights > 1 ? 's' : ''}
                      </div>
                    </td>

                    {/* Price / Night */}
                    <td className="py-3 px-4 text-right font-medium text-telivity-slate">
                      ₹{guest.pricePerNight?.toLocaleString('en-IN')}
                    </td>

                    {/* Total Bill */}
                    <td className="py-3 px-4 text-right font-bold text-telivity-navy">
                      ₹{guest.totalAmount?.toLocaleString('en-IN')}
                    </td>

                    {/* Advance Paid */}
                    <td className="py-3 px-4 text-right font-medium text-emerald-700">
                      ₹{((guest.advancePaid || 0) + (guest.previousPayments || 0)).toLocaleString('en-IN')}
                      <div className="text-[10px] text-telivity-mid-grey">{guest.paymentMethod}</div>
                    </td>

                    {/* Balance */}
                    <td className="py-3 px-4 text-right">
                      {isPaid ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Settled (₹0)
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          ₹{guest.balance?.toLocaleString('en-IN')} Due
                        </span>
                      )}
                    </td>

                    {/* ID Proof Availability */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setIdDocStay(guest)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                          guest.idProofFrontUrl
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                        }`}
                        title="Click to view authorized ID proof"
                      >
                        <ShieldCheck size={13} className={guest.idProofFrontUrl ? 'text-emerald-600' : 'text-gray-400'} />
                        {guest.idProofType.split(' ')[0]} {guest.idProofFrontUrl ? '✓' : ''}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setDetailsStay(guest)}
                          className="p-1.5 rounded-lg border border-gray-200 text-telivity-slate hover:bg-gray-100 transition"
                          title="View Guest & Stay Details"
                        >
                          <Eye size={14} />
                        </button>

                        <button
                          onClick={() => {
                            setAddPaymentStay(guest);
                            setPaymentAmount(String(guest.balance || ''));
                          }}
                          className="p-1.5 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition"
                          title="Add Interim Payment"
                        >
                          <IndianRupee size={14} />
                        </button>

                        <button
                          onClick={() => setCheckoutStay(guest)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition"
                          title="Check Out Guest"
                        >
                          <LogOut size={13} /> Check Out
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredGuests.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-telivity-mid-grey">
                    <Users size={36} className="mx-auto mb-2 text-telivity-mid-grey/50" />
                    <p className="font-semibold text-sm">No in-house guests matching your search</p>
                    <p className="text-xs text-telivity-mid-grey mt-0.5">Click "+ ADD NEW GUEST" to register a walk-in guest</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Add Guest / Walk-In Modal */}
      <AddGuestModal
        isOpen={addGuestOpen}
        onClose={() => setAddGuestOpen(false)}
        onSuccess={() => setAddGuestOpen(false)}
      />

      {/* Modal 2: Checkout Modal */}
      <CheckoutModal
        stay={checkoutStay}
        isOpen={Boolean(checkoutStay)}
        onClose={() => setCheckoutStay(null)}
        onCheckoutSuccess={(updatedStay) => {
          setCheckoutStay(null);
          setInvoiceStay(updatedStay);
        }}
      />

      {/* Modal 3: Bill / Invoice Modal (Printable) */}
      <BillInvoiceModal
        stay={invoiceStay}
        isOpen={Boolean(invoiceStay)}
        onClose={() => setInvoiceStay(null)}
      />

      {/* Modal 4: View Authorized ID Proof Modal */}
      {idDocStay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-telivity-teal" />
                <h3 className="font-bold text-sm text-telivity-navy">Authorized Guest ID Proof Verification</h3>
              </div>
              <button onClick={() => setIdDocStay(null)} className="p-1 rounded-md hover:bg-gray-100 text-gray-500">
                <X size={16} />
              </button>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 text-xs mb-4">
              <p className="font-bold text-telivity-navy text-sm">{idDocStay.guestName} (Room {idDocStay.roomNumber})</p>
              <p className="text-telivity-mid-grey mt-0.5">Document: <strong className="text-telivity-slate">{idDocStay.idProofType}</strong></p>
              <p className="text-telivity-mid-grey">ID Number: <strong className="text-telivity-slate font-mono">{idDocStay.idProofNumber || 'Not provided'}</strong></p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="block text-xs font-semibold text-telivity-slate mb-1">Front Image</span>
                {idDocStay.idProofFrontUrl ? (
                  <img src={idDocStay.idProofFrontUrl} alt="ID Front" className="h-44 w-full object-cover rounded-xl border border-gray-200" />
                ) : (
                  <div className="h-44 w-full bg-gray-100 rounded-xl border border-gray-200 flex flex-col items-center justify-center text-telivity-mid-grey text-xs">
                    <ShieldCheck size={28} className="mb-1 text-gray-400" /> No Front Photo Attached
                  </div>
                )}
              </div>

              <div>
                <span className="block text-xs font-semibold text-telivity-slate mb-1">Back Image</span>
                {idDocStay.idProofBackUrl ? (
                  <img src={idDocStay.idProofBackUrl} alt="ID Back" className="h-44 w-full object-cover rounded-xl border border-gray-200" />
                ) : (
                  <div className="h-44 w-full bg-gray-100 rounded-xl border border-gray-200 flex flex-col items-center justify-center text-telivity-mid-grey text-xs">
                    <ShieldCheck size={28} className="mb-1 text-gray-400" /> No Back Photo Attached
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 p-2.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-[11px]">
              🔒 Document is stored privately in compliance with hotel registration and local jurisdiction guidelines.
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => setIdDocStay(null)}
                className="px-4 py-2 rounded-xl bg-telivity-teal text-white text-xs font-bold hover:bg-telivity-light-teal transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 5: View Guest Details Modal */}
      {detailsStay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-telivity-teal" />
                <h3 className="font-bold text-sm text-telivity-navy">Guest Profile & Stay Details</h3>
              </div>
              <button onClick={() => setDetailsStay(null)} className="p-1 rounded-md hover:bg-gray-100 text-gray-500">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                <p className="font-bold text-base text-telivity-navy">{detailsStay.guestName}</p>
                <p className="text-telivity-mid-grey">Phone: <span className="font-medium text-telivity-slate">{detailsStay.mobile}</span></p>
                {detailsStay.email && <p className="text-telivity-mid-grey">Email: <span className="font-medium text-telivity-slate">{detailsStay.email}</span></p>}
                <p className="text-telivity-mid-grey">Address: <span className="font-medium text-telivity-slate">{detailsStay.address || 'Karimnagar'}, {detailsStay.city || 'Karimnagar'}, {detailsStay.state || 'Telangana'}</span></p>
                <p className="text-telivity-mid-grey">Occupancy: <span className="font-medium text-telivity-slate">{detailsStay.adults} Adults, {detailsStay.children} Children</span></p>
              </div>

              <div className="p-3 bg-teal-50/50 rounded-xl space-y-1 border border-teal-100">
                <div className="flex justify-between">
                  <span className="text-telivity-mid-grey">Room Assigned:</span>
                  <span className="font-bold text-telivity-teal text-sm">Room {detailsStay.roomNumber} ({detailsStay.roomTypeName})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-telivity-mid-grey">Check-In:</span>
                  <span className="font-medium">{new Date(detailsStay.checkInTime).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-telivity-mid-grey">Expected Check-Out:</span>
                  <span className="font-medium">{new Date(detailsStay.expectedCheckoutTime).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-telivity-mid-grey">Nights:</span>
                  <span className="font-bold">{detailsStay.nights}</span>
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                <div className="flex justify-between">
                  <span>Room Tariff ({detailsStay.nights} × ₹{detailsStay.pricePerNight}):</span>
                  <span>₹{(detailsStay.nights * detailsStay.pricePerNight).toLocaleString('en-IN')}</span>
                </div>
                {detailsStay.extraCharges > 0 && (
                  <div className="flex justify-between">
                    <span>Extra Charges:</span>
                    <span>₹{detailsStay.extraCharges.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold border-t border-gray-200 pt-1">
                  <span>Total Amount:</span>
                  <span>₹{detailsStay.totalAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Advance Paid:</span>
                  <span>-₹{detailsStay.advancePaid.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between font-bold text-rose-700 border-t border-gray-200 pt-1">
                  <span>Remaining Balance:</span>
                  <span>₹{detailsStay.balance.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {detailsStay.notes && (
                <div className="p-2.5 bg-yellow-50 rounded-xl border border-yellow-200 text-yellow-800 text-[11px]">
                  <strong>Notes:</strong> {detailsStay.notes}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => {
                  const s = detailsStay;
                  setDetailsStay(null);
                  setInvoiceStay(s);
                }}
                className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-telivity-slate text-xs font-semibold transition"
              >
                View Bill Invoice
              </button>
              <button
                onClick={() => setDetailsStay(null)}
                className="px-4 py-2 rounded-xl bg-telivity-teal hover:bg-telivity-light-teal text-white text-xs font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 6: Add Payment Modal */}
      {addPaymentStay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <IndianRupee size={18} className="text-emerald-600" />
                <h3 className="font-bold text-sm text-telivity-navy">Add Interim Payment</h3>
              </div>
              <button onClick={() => setAddPaymentStay(null)} className="p-1 rounded-md hover:bg-gray-100 text-gray-500">
                <X size={16} />
              </button>
            </div>

            <div className="text-xs space-y-1 bg-gray-50 p-3 rounded-xl">
              <p className="font-bold text-telivity-navy">{addPaymentStay.guestName} — Room {addPaymentStay.roomNumber}</p>
              <p className="text-telivity-mid-grey">Current Balance: <strong className="text-rose-700">₹{addPaymentStay.balance.toLocaleString('en-IN')}</strong></p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-telivity-slate mb-1">Amount to Collect (₹)</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-bold text-telivity-navy focus:outline-none focus:border-telivity-teal"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-telivity-slate mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium text-telivity-navy focus:outline-none focus:border-telivity-teal"
                >
                  <option value="Cash">Cash (Counter)</option>
                  <option value="UPI">UPI (GPay / PhonePe / QR)</option>
                  <option value="Card">Credit / Debit Card</option>
                  <option value="Bank Transfer">Bank Transfer / IMPS</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => setAddPaymentStay(null)}
                className="px-3.5 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-telivity-slate hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const amt = Number(paymentAmount) || 0;
                  if (amt <= 0) {
                    toast('error', 'Please enter a valid amount.');
                    return;
                  }
                  paymentMutation.mutate({
                    stayId: addPaymentStay.id,
                    amount: amt,
                    method: paymentMethod,
                  });
                }}
                disabled={paymentMutation.isPending}
                className="px-4 py-2 rounded-xl bg-telivity-teal hover:bg-telivity-light-teal text-white text-xs font-bold transition disabled:opacity-50"
              >
                {paymentMutation.isPending ? 'Saving...' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
