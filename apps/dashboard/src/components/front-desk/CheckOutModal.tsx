import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X,
  LogOut,
  IndianRupee,
  CheckCircle2,
  AlertCircle,
  Receipt,
  Settings2,
  Printer,
  Sparkles,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useProperty } from '../../context/PropertyContext';
import { useToast } from '../ui/Toast';
import type { StoredStay } from '../../lib/supabaseAdapter';

interface CheckoutModalProps {
  stay: StoredStay | null;
  isOpen: boolean;
  onClose: () => void;
  onCheckoutSuccess: (updatedStay: StoredStay) => void;
}

export default function CheckoutModal({ stay, isOpen, onClose, onCheckoutSuccess }: CheckoutModalProps) {
  const { propertyId } = useProperty();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isAlreadyCheckedOut = stay?.stayStatus === 'checked_out';

  // State for editable charges & adjustments
  const [nights, setNights] = useState<number>(1);
  const [ratePerNight, setRatePerNight] = useState<number>(0);
  const [extraCharges, setExtraCharges] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [taxMode, setTaxMode] = useState<'inclusive' | 'exclusive'>('inclusive');

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Card' | 'Bank Transfer'>('Cash');
  const [finalPayment, setFinalPayment] = useState<string>('0');

  useEffect(() => {
    if (stay) {
      const initNights = stay.nights && stay.nights > 0 ? stay.nights : 1;
      const initRate = stay.pricePerNight || 0;
      const initExtras = stay.extraCharges || 0;
      const initDiscount = stay.discount || 0;

      setNights(initNights);
      setRatePerNight(initRate);
      setExtraCharges(initExtras);
      setDiscount(initDiscount);

      const rawRoomCharges = initNights * initRate;
      const netBase = Math.max(0, rawRoomCharges + initExtras - initDiscount);
      const gross = taxMode === 'inclusive' ? netBase : netBase + Math.round(netBase * 0.12);
      const paidSoFar = (stay.advancePaid || 0) + (stay.previousPayments || 0);
      const initialBalance = Math.max(0, gross - paidSoFar);

      setFinalPayment(String(initialBalance));
    }
  }, [stay, isOpen]);

  // Derived calculations
  const rawRoomCharges = nights * ratePerNight;
  const netBeforeTax = Math.max(0, rawRoomCharges + extraCharges - discount);

  let subtotalTaxable: number;
  let cgstAmount: number;
  let sgstAmount: number;
  let grandTotal: number;

  if (taxMode === 'inclusive') {
    grandTotal = netBeforeTax;
    subtotalTaxable = Math.round(grandTotal / 1.12);
    const totalGst = grandTotal - subtotalTaxable;
    cgstAmount = Math.round(totalGst / 2);
    sgstAmount = totalGst - cgstAmount;
  } else {
    subtotalTaxable = netBeforeTax;
    cgstAmount = Math.round(subtotalTaxable * 0.06);
    sgstAmount = Math.round(subtotalTaxable * 0.06);
    grandTotal = subtotalTaxable + cgstAmount + sgstAmount;
  }

  const totalPaidSoFar = (stay?.advancePaid || 0) + (stay?.previousPayments || 0);
  const currentBalance = Math.max(0, grandTotal - totalPaidSoFar);

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (!stay) throw new Error('No active stay selected');
      if (isAlreadyCheckedOut) throw new Error('Stay is already checked out');

      const payAmt = Number(finalPayment) || 0;
      const res = await api.post(`/v1/stays/${stay.id}/checkout`, {
        finalPayment: payAmt,
        paymentMethod,
        nights,
        pricePerNight: ratePerNight,
        extraCharges,
        discount,
        taxMode,
        cgstAmount,
        sgstAmount,
        totalAmount: grandTotal,
        propertyId,
        roomId: stay.roomId,
        roomNumber: stay.roomNumber,
        guestName: stay.guestName,
        mobile: stay.mobile,
        advancePaid: stay.advancePaid || 0,
      });

      if (res.data && res.data.success === false) {
        throw new Error(res.data.message || 'Checkout failed');
      }

      return res.data?.stay || res.data;
    },
    onSuccess: (updatedStay: StoredStay) => {
      if (stay) {
        toast(
          'success',
          `Room ${stay.roomNumber} (${stay.guestName}) checked out successfully! Marked VACANT DIRTY for housekeeping.`,
        );
      }
      queryClient.invalidateQueries({ queryKey: ['stays'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['rooms', 'status-summary'] });
      queryClient.invalidateQueries({ queryKey: ['staff-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['staff-notifications-unread'] });

      const validStayId = (updatedStay && updatedStay.id) ? updatedStay.id : (stay?.id || `stay-${Date.now()}`);
      const validBillNum = (updatedStay && updatedStay.billNumber)
        ? updatedStay.billNumber
        : (stay?.billNumber || `INV-SPARK-2026-${stay?.roomNumber || '101'}-${String(Math.floor(1000 + Math.random() * 9000))}`);

      const finalRecord: StoredStay = {
        ...stay!,
        ...(updatedStay && updatedStay.id ? updatedStay : {}),
        id: validStayId,
        billNumber: validBillNum,
        nights,
        pricePerNight: ratePerNight,
        extraCharges,
        discount,
        totalAmount: grandTotal,
        stayStatus: 'checked_out',
        balance: Math.max(0, currentBalance - (Number(finalPayment) || 0)),
        actualCheckoutTime: new Date().toISOString(),
      };

      onCheckoutSuccess(finalRecord);
    },
    onError: (err: any) => {
      toast('error', err?.response?.data?.message || err.message || 'Failed to complete checkout.');
    },
  });

  if (!isOpen || !stay) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden my-4 sm:my-8 border border-gray-100 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-telivity-navy text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-300">
              <LogOut size={18} />
            </div>
            <div>
              <h2 className="font-bold text-base">Guest Check-Out & Final Bill Settlement</h2>
              <p className="text-xs text-white/70">
                Room {stay.roomNumber} ({stay.roomTypeName}) · {stay.guestName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content (Scrollable) */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Duplicate Checkout Prevention Banner */}
          {isAlreadyCheckedOut && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-3">
              <AlertCircle size={18} className="text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold text-sm">Stay Already Checked Out & Settled</p>
                <p className="text-xs text-amber-800 mt-0.5">
                  This room was checked out on{' '}
                  {stay.actualCheckoutTime
                    ? new Date(stay.actualCheckoutTime).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })
                    : 'previous session'}{' '}
                  with Bill #{stay.billNumber || 'Official Invoice'}. Duplicate billing is prevented.
                </p>
                <button
                  type="button"
                  onClick={() => onCheckoutSuccess(stay)}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-telivity-teal text-white rounded-lg font-bold text-xs shadow-xs hover:bg-telivity-light-teal transition"
                >
                  <Receipt size={14} /> View & Print Bill / Invoice
                </button>
              </div>
            </div>
          )}

          {/* Guest & Stay Details Card */}
          <div className="bg-telivity-teal/5 border border-telivity-teal/20 rounded-xl p-3.5 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-telivity-mid-grey">Guest Name:</span>
              <span className="font-bold text-telivity-navy text-sm">{stay.guestName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-telivity-mid-grey">Mobile & Contact:</span>
              <span className="font-semibold text-telivity-slate">{stay.mobile} {stay.email ? `· ${stay.email}` : ''}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-telivity-mid-grey">Check-In Time:</span>
              <span className="font-medium text-telivity-slate">
                {new Date(stay.checkInTime).toLocaleString('en-IN', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-telivity-mid-grey">ID Proof on Record:</span>
              <span className="font-medium text-emerald-800 bg-emerald-100/60 px-2 py-0.5 rounded text-[11px]">
                {stay.idProofType} ({stay.idProofNumber ? `ending in ${String(stay.idProofNumber).slice(-4)}` : 'Verified'})
              </span>
            </div>
          </div>

          {/* Chargeable Nights & Agreed Rate Adjustments */}
          {!isAlreadyCheckedOut && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-800 uppercase tracking-wider text-[11px]">
                  Room Tariff & Stay Duration
                </span>
                <span className="text-[11px] text-teal-700 font-semibold">Agreed Booking Rate</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-gray-600 font-medium mb-1">
                    Chargeable Nights
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={nights}
                    onChange={(e) => setNights(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-900 focus:outline-none focus:border-telivity-teal"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-600 font-medium mb-1">
                    Rate per Night (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={ratePerNight}
                    onChange={(e) => setRatePerNight(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-900 focus:outline-none focus:border-telivity-teal"
                  />
                </div>
              </div>

              {/* Extra Charges & Discounts */}
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-gray-200/80">
                <div>
                  <label className="block text-[11px] text-gray-600 font-medium mb-1">
                    Extra Charges (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={extraCharges}
                    onChange={(e) => setExtraCharges(Math.max(0, parseInt(e.target.value) || 0))}
                    placeholder="Food / Laundry / Bed"
                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-900 focus:outline-none focus:border-telivity-teal"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-600 font-medium mb-1">
                    Discount Applied (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={discount}
                    onChange={(e) => setDiscount(Math.max(0, parseInt(e.target.value) || 0))}
                    placeholder="Manager / Promo"
                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-emerald-800 focus:outline-none focus:border-telivity-teal"
                  />
                </div>
              </div>
            </div>
          )}

          {/* GST Tax Mode Selector */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-teal-50/70 border border-teal-200 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-teal-900">
              <Settings2 size={14} className="text-teal-700" />
              <span>GST Calculation Mode (12%):</span>
            </div>
            <div className="inline-flex rounded-lg border border-teal-300 p-0.5 bg-white">
              <button
                type="button"
                onClick={() => setTaxMode('inclusive')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                  taxMode === 'inclusive' ? 'bg-telivity-teal text-white' : 'text-gray-600 hover:text-teal-800'
                }`}
              >
                Tax-Inclusive (12%)
              </button>
              <button
                type="button"
                onClick={() => setTaxMode('exclusive')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                  taxMode === 'exclusive' ? 'bg-telivity-teal text-white' : 'text-gray-600 hover:text-teal-800'
                }`}
              >
                Tax-Exclusive (+12%)
              </button>
            </div>
          </div>

          {/* Itemized Folio Breakdown */}
          <div className="border border-gray-200 rounded-xl p-4 space-y-1.5 text-xs bg-white">
            <h3 className="font-bold uppercase tracking-wider text-telivity-slate text-[11px] mb-2 flex items-center justify-between">
              <span>Itemized Folio Summary</span>
              <span className="font-mono text-gray-400 font-normal">GSTIN: 36AAAAA0000A1Z5</span>
            </h3>

            <div className="flex justify-between text-telivity-slate">
              <span>
                Room Tariff ({nights} Nights × ₹{ratePerNight.toLocaleString('en-IN')}):
              </span>
              <span className="font-semibold text-telivity-navy">₹{rawRoomCharges.toLocaleString('en-IN')}</span>
            </div>

            {extraCharges > 0 && (
              <div className="flex justify-between text-telivity-slate">
                <span>Additional Services / Extras:</span>
                <span className="font-semibold text-telivity-navy">+₹{extraCharges.toLocaleString('en-IN')}</span>
              </div>
            )}

            {discount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount / Concession:</span>
                <span className="font-semibold">-₹{discount.toLocaleString('en-IN')}</span>
              </div>
            )}

            <div className="flex justify-between text-gray-500 pt-1 border-t border-gray-100 text-[11px]">
              <span>Taxable Value:</span>
              <span>₹{subtotalTaxable.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex justify-between text-gray-500 text-[11px]">
              <span>CGST (6%):</span>
              <span>₹{cgstAmount.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex justify-between text-gray-500 text-[11px]">
              <span>SGST (6%):</span>
              <span>₹{sgstAmount.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex justify-between font-bold text-sm text-telivity-navy pt-2 border-t border-gray-200">
              <span>Total Gross Invoice Amount:</span>
              <span>₹{grandTotal.toLocaleString('en-IN')}</span>
            </div>

            {/* Advance & Payments Deductions */}
            <div className="flex justify-between text-emerald-700 font-medium pt-1">
              <span>Advance Paid on Check-In ({stay.paymentMethod || 'Paid'}):</span>
              <span>-₹{(stay.advancePaid || 0).toLocaleString('en-IN')}</span>
            </div>

            {(stay.previousPayments || 0) > 0 && (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Interim Payments Recorded:</span>
                <span>-₹{(stay.previousPayments || 0).toLocaleString('en-IN')}</span>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t-2 border-gray-300 font-bold text-sm">
              <span className="text-rose-700">Final Payable Balance Due:</span>
              <span className="text-rose-700 text-base">₹{currentBalance.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Payment Collection Form */}
          {!isAlreadyCheckedOut && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
              <label className="block text-xs font-bold text-telivity-navy uppercase tracking-wider">
                Record Final Checkout Payment
              </label>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-gray-600 mb-1 font-medium">
                    Payment Amount to Collect (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500 font-semibold text-xs">₹</span>
                    <input
                      type="number"
                      min={0}
                      value={finalPayment}
                      onChange={(e) => setFinalPayment(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold text-telivity-navy focus:outline-none focus:border-telivity-teal"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-gray-600 mb-1 font-medium">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-telivity-navy focus:outline-none focus:border-telivity-teal"
                  >
                    <option value="Cash">Cash (Front Desk Counter)</option>
                    <option value="UPI">UPI (GPay / PhonePe / Paytm / QR)</option>
                    <option value="Card">Credit / Debit Card (POS)</option>
                    <option value="Bank Transfer">Bank Transfer / IMPS / NEFT</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setFinalPayment(String(currentBalance))}
                  className="px-3 py-1 text-[11px] bg-white border border-gray-300 hover:border-telivity-teal rounded-lg font-semibold text-telivity-slate transition shadow-2xs"
                >
                  Pay Full Balance (₹{currentBalance.toLocaleString('en-IN')})
                </button>
                <button
                  type="button"
                  onClick={() => setFinalPayment('0')}
                  className="px-3 py-1 text-[11px] bg-white border border-gray-300 hover:border-telivity-teal rounded-lg font-semibold text-telivity-slate transition shadow-2xs"
                >
                  Zero Balance / Already Settled
                </button>
              </div>
            </div>
          )}

          {/* Automatic Housekeeping Notice */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-600" />
            <div>
              <p className="font-semibold">Automatic Cleaning Required Update</p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Upon completing checkout, Room {stay.roomNumber} status automatically changes to{' '}
                <span className="font-bold">VACANT DIRTY</span> (Cleaning Required) and an urgent alert is dispatched to Housekeeping.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-telivity-slate hover:bg-gray-100 transition"
          >
            Cancel
          </button>

          {isAlreadyCheckedOut ? (
            <button
              type="button"
              onClick={() => onCheckoutSuccess(stay)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-telivity-teal hover:bg-telivity-light-teal text-white text-xs font-bold shadow-md transition"
            >
              <Receipt size={16} /> View & Print Official Invoice
            </button>
          ) : (
            <button
              type="button"
              onClick={() => checkoutMutation.mutate()}
              disabled={checkoutMutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-telivity-teal hover:bg-telivity-light-teal text-white text-xs font-bold shadow-md transition disabled:opacity-50"
            >
              {checkoutMutation.isPending ? (
                'Settling & Generating Bill...'
              ) : (
                <>
                  <CheckCircle2 size={16} /> Confirm Checkout & Generate Bill
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
