import { useState, useEffect, useMemo } from 'react';
import { X, Save, Printer, User, Home, Calendar, CreditCard, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../../lib/api';
import { useToast } from '../ui/Toast';
import type { StoredStay } from '../../lib/supabaseAdapter';
import { numberToIndianWords } from './numberToWords';

interface EditBillModalProps {
  stay: StoredStay | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (updatedStay: StoredStay) => void;
  onSaveAndPrint?: (updatedStay: StoredStay) => void;
}

export default function EditBillModal({
  stay,
  isOpen,
  onClose,
  onSave,
  onSaveAndPrint,
}: EditBillModalProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  // Form State
  const [guestName, setGuestName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [stateName, setStateName] = useState('Telangana');
  const [guestGstin, setGuestGstin] = useState('');

  const [roomNumber, setRoomNumber] = useState('');
  const [roomTypeName, setRoomTypeName] = useState('Budget');
  const [rateType, setRateType] = useState('Budget');
  const [nights, setNights] = useState(1);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);

  const [checkInTime, setCheckInTime] = useState('');
  const [checkoutTime, setCheckoutTime] = useState('');
  const [source, setSource] = useState('Walk-in');
  const [sourceOfSupply, setSourceOfSupply] = useState('Karimnagar');

  const [pricePerNight, setPricePerNight] = useState(1600);
  const [extraCharges, setExtraCharges] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [advancePaid, setAdvancePaid] = useState(0);
  const [previousPayments, setPreviousPayments] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentReference, setPaymentReference] = useState('');

  const [gstRate, setGstRate] = useState<number>(5); // 5% default (2.5% SGST + 2.5% CGST) as per Hotel Spark photo
  const [taxMode, setTaxMode] = useState<'inclusive' | 'exclusive'>('inclusive');
  const [cashierName, setCashierName] = useState('madhu');
  const [notes, setNotes] = useState('');

  // Populate state whenever stay changes
  useEffect(() => {
    if (!stay) return;
    setGuestName(stay.guestName || '');
    setMobile(stay.mobile || '');
    setEmail(stay.email || '');
    setAddress(stay.address || '');
    setStateName(stay.state || 'Telangana');
    setGuestGstin(stay.guestGstin || '');

    setRoomNumber(stay.roomNumber || '');
    setRoomTypeName(stay.roomTypeName || 'Budget');
    setRateType(stay.rateType || stay.roomTypeName || 'Budget');
    setNights(stay.nights || 1);
    setAdults(stay.adults || 1);
    setChildren(stay.children || 0);

    setCheckInTime(stay.checkInTime ? stay.checkInTime.slice(0, 16) : new Date().toISOString().slice(0, 16));
    const outTime = stay.actualCheckoutTime || stay.expectedCheckoutTime;
    setCheckoutTime(outTime ? outTime.slice(0, 16) : new Date(Date.now() + 86400000).toISOString().slice(0, 16));

    setSource(stay.source || 'Walk-in');
    setSourceOfSupply(stay.sourceOfSupply || 'Karimnagar');

    setPricePerNight(stay.pricePerNight || 1600);
    setExtraCharges(stay.extraCharges || 0);
    setDiscount(stay.discount || 0);
    setAdvancePaid(stay.advancePaid || 0);
    setPreviousPayments(stay.previousPayments || 0);
    setPaymentMethod(stay.paymentMethod ? stay.paymentMethod.toUpperCase() : 'CASH');
    setPaymentReference(stay.paymentReference || '');

    setCashierName(stay.cashierName || 'madhu');
    setNotes(stay.notes || '');
  }, [stay]);

  // Financial Calculations
  const calculated = useMemo(() => {
    const rawTariff = nights * pricePerNight;
    const grossTotal = Math.max(0, rawTariff + extraCharges - discount);

    let taxableAmount = 0;
    let sgstAmount = 0;
    let cgstAmount = 0;
    let grandTotal = grossTotal;

    if (gstRate === 0) {
      taxableAmount = grossTotal;
      sgstAmount = 0;
      cgstAmount = 0;
      grandTotal = grossTotal;
    } else if (taxMode === 'inclusive') {
      taxableAmount = Math.round((grossTotal / (1 + gstRate / 100)) * 100) / 100;
      const totalTax = grossTotal - taxableAmount;
      sgstAmount = Math.round((totalTax / 2) * 100) / 100;
      cgstAmount = Math.round((totalTax - sgstAmount) * 100) / 100;
      grandTotal = grossTotal;
    } else {
      // exclusive
      taxableAmount = grossTotal;
      sgstAmount = Math.round((taxableAmount * (gstRate / 200)) * 100) / 100;
      cgstAmount = Math.round((taxableAmount * (gstRate / 200)) * 100) / 100;
      grandTotal = taxableAmount + sgstAmount + cgstAmount;
    }

    const totalPaid = advancePaid + previousPayments;
    const balance = Math.max(0, grandTotal - totalPaid);

    return {
      rawTariff,
      taxableAmount,
      sgstAmount,
      cgstAmount,
      grandTotal,
      totalPaid,
      balance,
      inWords: numberToIndianWords(grandTotal),
    };
  }, [nights, pricePerNight, extraCharges, discount, gstRate, taxMode, advancePaid, previousPayments]);

  if (!isOpen || !stay) return null;

  const handleSave = async (andPrint = false) => {
    if (!guestName.trim()) {
      toast('error', 'Guest name is required.');
      return;
    }

    try {
      setSaving(true);
      const payload: Partial<StoredStay> = {
        guestName: guestName.trim(),
        mobile: mobile.trim(),
        email: email.trim(),
        address: address.trim(),
        state: stateName.trim(),
        guestGstin: guestGstin.trim(),
        roomNumber: roomNumber.trim(),
        roomTypeName: roomTypeName.trim(),
        rateType: rateType.trim(),
        nights: Number(nights) || 1,
        adults: Number(adults) || 1,
        children: Number(children) || 0,
        checkInTime: new Date(checkInTime).toISOString(),
        expectedCheckoutTime: new Date(checkoutTime).toISOString(),
        actualCheckoutTime: stay.stayStatus === 'checked_out' ? new Date(checkoutTime).toISOString() : undefined,
        source: source.trim(),
        sourceOfSupply: sourceOfSupply.trim(),
        pricePerNight: Number(pricePerNight) || 0,
        extraCharges: Number(extraCharges) || 0,
        discount: Number(discount) || 0,
        totalAmount: calculated.grandTotal,
        advancePaid: Number(advancePaid) || 0,
        previousPayments: Number(previousPayments) || 0,
        balance: calculated.balance,
        paymentMethod: paymentMethod.trim(),
        paymentReference: paymentReference.trim(),
        paymentStatus: calculated.balance <= 0 ? 'paid' : ((advancePaid + previousPayments) > 0 ? 'partially_paid' : 'unpaid'),
        cashierName: cashierName.trim(),
        notes: notes.trim(),
      };

      const res = await api.patch(`/v1/stays/${stay.id}`, payload);
      const updatedStay = res.data?.stay || { ...stay, ...payload };

      toast('success', `Bill for Room ${updatedStay.roomNumber} (${updatedStay.guestName}) saved successfully!`);

      if (onSave) onSave(updatedStay);
      if (andPrint && onSaveAndPrint) {
        onSaveAndPrint(updatedStay);
      } else {
        onClose();
      }
    } catch (err: any) {
      toast('error', err?.message || 'Failed to save bill modifications.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs p-2 sm:p-4 flex justify-center items-start"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden my-4 border border-gray-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-telivity-navy text-white shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-telivity-teal flex items-center justify-center font-bold text-lg shadow-inner">
              ⚡
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2">
                <span>Edit Full Bill & Invoice Details</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-teal-400/20 text-teal-300 font-medium">
                  Room {stay.roomNumber}
                </span>
              </h2>
              <p className="text-xs text-teal-100/70">
                Invoice #{stay.billNumber || `INV-SPARK-${String(stay.id || '').replace(/\D/g, '').slice(-3).padStart(3, '0') || '001'}`} • {stay.guestName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[80vh] overflow-y-auto space-y-6 text-telivity-navy text-xs">
          {/* Section 1: Guest Information */}
          <div className="bg-gray-50/70 rounded-xl p-4 border border-gray-200">
            <h3 className="font-bold text-xs uppercase tracking-wider text-telivity-slate mb-3 flex items-center gap-1.5">
              <User size={15} className="text-telivity-teal" /> Guest & Billing Address Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Guest Full Name *</label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="e.g. Mr. JMD Inayathulla"
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-telivity-teal outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Mobile Number</label>
                <input
                  type="text"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-telivity-teal outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Email (Optional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="guest@example.com"
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-telivity-teal outline-hidden"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Bill To Address (Print on Invoice)</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="plot no 78, Road no 6, Sailajapori colony, LB nagar, Hyderabad"
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-telivity-teal outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">State</label>
                <input
                  type="text"
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  placeholder="Telangana"
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-telivity-teal outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Bill To (Guest / Corporate GSTIN)</label>
                <input
                  type="text"
                  value={guestGstin}
                  onChange={(e) => setGuestGstin(e.target.value)}
                  placeholder="36AABFK5489N1Z0"
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-mono uppercase focus:ring-2 focus:ring-telivity-teal outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Booking Source</label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-telivity-teal outline-hidden"
                >
                  <option value="Walk-in">Walk-in</option>
                  <option value="Website">Online Website</option>
                  <option value="Phone Booking">Phone Booking</option>
                  <option value="Corporate">Corporate / B2B</option>
                  <option value="MakeMyTrip">MakeMyTrip / Goibibo</option>
                  <option value="Booking.com">Booking.com</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Source Of Supply</label>
                <input
                  type="text"
                  value={sourceOfSupply}
                  onChange={(e) => setSourceOfSupply(e.target.value)}
                  placeholder="Karimnagar"
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-telivity-teal outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Room & Stay Details */}
          <div className="bg-gray-50/70 rounded-xl p-4 border border-gray-200">
            <h3 className="font-bold text-xs uppercase tracking-wider text-telivity-slate mb-3 flex items-center gap-1.5">
              <Home size={15} className="text-telivity-teal" /> Room & Duration Details
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Room No</label>
                <input
                  type="text"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-bold text-telivity-teal focus:ring-2 focus:ring-telivity-teal outline-hidden"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Room Category</label>
                <input
                  type="text"
                  value={roomTypeName}
                  onChange={(e) => setRoomTypeName(e.target.value)}
                  placeholder="Budget / Deluxe / Suite"
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-telivity-teal outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Rate Type</label>
                <input
                  type="text"
                  value={rateType}
                  onChange={(e) => setRateType(e.target.value)}
                  placeholder="Budget / EP / CP"
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-telivity-teal outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">No. of Nights</label>
                <input
                  type="number"
                  min="1"
                  value={nights}
                  onChange={(e) => setNights(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-bold focus:ring-2 focus:ring-telivity-teal outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Persons (A / C)</label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    min="1"
                    title="Adults"
                    value={adults}
                    onChange={(e) => setAdults(Math.max(1, Number(e.target.value)))}
                    className="w-1/2 bg-white border border-gray-300 rounded-lg px-2 py-1.5 text-xs font-semibold text-center"
                  />
                  <input
                    type="number"
                    min="0"
                    title="Children"
                    value={children}
                    onChange={(e) => setChildren(Math.max(0, Number(e.target.value)))}
                    className="w-1/2 bg-white border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-center"
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Arrival Date & Time</label>
                <input
                  type="datetime-local"
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-telivity-teal outline-hidden"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Departure Date & Time</label>
                <input
                  type="datetime-local"
                  value={checkoutTime}
                  onChange={(e) => setCheckoutTime(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-telivity-teal outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Tariff, Extra Charges & Taxes */}
          <div className="bg-gray-50/70 rounded-xl p-4 border border-gray-200">
            <h3 className="font-bold text-xs uppercase tracking-wider text-telivity-slate mb-3 flex items-center gap-1.5">
              <CreditCard size={15} className="text-telivity-teal" /> Tariff, Extra Charges & GST Configuration
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Room Rate / Night (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={pricePerNight}
                  onChange={(e) => setPricePerNight(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-bold text-telivity-navy focus:ring-2 focus:ring-telivity-teal outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Extra Charges (Food/Laundry) (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={extraCharges}
                  onChange={(e) => setExtraCharges(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-telivity-teal outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Flat Discount (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={discount}
                  onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-rose-600 font-semibold focus:ring-2 focus:ring-telivity-teal outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">GST Tax Rate</label>
                <select
                  value={gstRate}
                  onChange={(e) => setGstRate(Number(e.target.value))}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-bold text-teal-800 focus:ring-2 focus:ring-telivity-teal outline-hidden"
                >
                  <option value={5}>5% GST (2.5% SGST + 2.5% CGST) [Standard]</option>
                  <option value={12}>12% GST (6.0% SGST + 6.0% CGST)</option>
                  <option value={18}>18% GST (9.0% SGST + 9.0% CGST)</option>
                  <option value={0}>0% (Tax Exempt / Non-GST)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Tax Calculation Mode</label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setTaxMode('inclusive')}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition ${taxMode === 'inclusive' ? 'bg-telivity-teal text-white border-telivity-teal' : 'bg-white text-gray-600 border-gray-300'}`}
                  >
                    Tax-Inclusive
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaxMode('exclusive')}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition ${taxMode === 'exclusive' ? 'bg-telivity-teal text-white border-telivity-teal' : 'bg-white text-gray-600 border-gray-300'}`}
                  >
                    Tax-Exclusive
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Cashier (C/O)</label>
                <input
                  type="text"
                  value={cashierName}
                  onChange={(e) => setCashierName(e.target.value)}
                  placeholder="madhu"
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-telivity-teal outline-hidden"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Remarks / Special Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Paid in full at checkout / corporate bill"
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-telivity-teal outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Payments & Settlements */}
          <div className="bg-gray-50/70 rounded-xl p-4 border border-gray-200">
            <h3 className="font-bold text-xs uppercase tracking-wider text-telivity-slate mb-3 flex items-center gap-1.5">
              <Calendar size={15} className="text-telivity-teal" /> Payments Collected & Mode
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Advance Paid at Check-In (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={advancePaid}
                  onChange={(e) => setAdvancePaid(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-bold text-emerald-700 focus:ring-2 focus:ring-telivity-teal outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Additional / Checkout Payment (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={previousPayments}
                  onChange={(e) => setPreviousPayments(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-bold text-emerald-700 focus:ring-2 focus:ring-telivity-teal outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-telivity-teal outline-hidden"
                >
                  <option value="CASH">CASH</option>
                  <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="CARD">CREDIT / DEBIT CARD</option>
                  <option value="BANK_TRANSFER">BANK TRANSFER / NEFT</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Card / Transaction Reference</label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="e.g. CARD: ****8005 or UPI Ref# 38192"
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-telivity-teal outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Real-Time Recalculation Summary Box */}
          <div className="bg-teal-50/60 rounded-xl p-4 border border-teal-200">
            <h4 className="font-bold text-xs uppercase tracking-wider text-telivity-teal mb-3 flex items-center justify-between">
              <span>Live Calculated Bill Breakdown</span>
              <span className="text-[11px] text-teal-800 font-normal">
                Tax Mode: {taxMode === 'inclusive' ? 'Tax Included in Tariff' : 'Tax Added on Top'}
              </span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-teal-100 shadow-2xs">
                <span className="text-gray-500 block text-[11px]">Taxable Base:</span>
                <span className="font-bold text-sm text-telivity-navy">₹{calculated.taxableAmount.toFixed(2)}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-teal-100 shadow-2xs">
                <span className="text-gray-500 block text-[11px]">SGST ({(gstRate / 2).toFixed(2)}%):</span>
                <span className="font-bold text-sm text-teal-700">₹{calculated.sgstAmount.toFixed(2)}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-teal-100 shadow-2xs">
                <span className="text-gray-500 block text-[11px]">CGST ({(gstRate / 2).toFixed(2)}%):</span>
                <span className="font-bold text-sm text-teal-700">₹{calculated.cgstAmount.toFixed(2)}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-teal-100 shadow-2xs">
                <span className="text-gray-500 block text-[11px]">Total Payable:</span>
                <span className="font-black text-sm text-telivity-navy">₹{calculated.grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-teal-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="text-[11px] text-teal-900 italic">
                <span className="font-bold not-italic">In Words: </span>
                {calculated.inWords}
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-gray-500">Total Paid: </span>
                  <span className="font-bold text-emerald-700">₹{calculated.totalPaid.toFixed(2)}</span>
                </div>
                <div className={`px-2.5 py-1 rounded-lg font-bold ${calculated.balance <= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {calculated.balance <= 0 ? 'Fully Paid (₹0.00)' : `Balance Due: ₹${calculated.balance.toFixed(2)}`}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="flex flex-wrap items-center justify-between px-6 py-3.5 bg-gray-50 border-t border-gray-200 gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-telivity-slate font-bold text-xs transition"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {onSaveAndPrint && (
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-telivity-navy hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition disabled:opacity-50"
              >
                <Printer size={14} />
                <span>Save & Print Invoice</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-telivity-teal hover:bg-teal-600 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
            >
              <Save size={14} />
              <span>{saving ? 'Saving...' : 'Save & Update Bill'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
