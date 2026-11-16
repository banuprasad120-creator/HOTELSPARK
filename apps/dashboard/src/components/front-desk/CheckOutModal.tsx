import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, LogOut, IndianRupee, Sparkles, CheckCircle2, AlertCircle, CreditCard } from 'lucide-react';
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

  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Card' | 'Bank Transfer'>('Cash');
  const [finalPayment, setFinalPayment] = useState<string>(() => (stay ? String(Math.max(0, stay.balance || 0)) : '0'));
  const [discountAdjustment, setDiscountAdjustment] = useState<number>(0);
  const [extraChargesAdjustment, setExtraChargesAdjustment] = useState<number>(0);

  useEffect(() => {
    if (stay) {
      setFinalPayment(String(Math.max(0, stay.balance || 0)));
      setDiscountAdjustment(0);
      setExtraChargesAdjustment(0);
    }
  }, [stay]);

  const checkoutMutation = useMutation({
    mutationFn: () => {
      if (!stay) throw new Error('No active stay selected');
      const payAmt = Number(finalPayment) || 0;
      return api
        .post(`/v1/stays/${stay.id}/checkout`, {
          finalPayment: payAmt,
          paymentMethod,
          propertyId,
        })
        .then((r) => r.data?.stay || r.data);
    },
    onSuccess: (updatedStay: StoredStay) => {
      if (stay) {
        toast('success', `Guest ${stay.guestName} successfully checked out from Room ${stay.roomNumber}! Room is marked DIRTY for housekeeping.`);
      }
      queryClient.invalidateQueries({ queryKey: ['stays'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['rooms', 'status-summary'] });
      queryClient.invalidateQueries({ queryKey: ['staff-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['staff-notifications-unread'] });
      if (stay) {
        onCheckoutSuccess(updatedStay || { ...stay, stayStatus: 'checked_out', balance: 0 });
      }
    },
    onError: (err: any) => {
      toast('error', err?.response?.data?.message || 'Failed to complete checkout. Please try again.');
    },
  });

  if (!isOpen || !stay) return null;

  const currentBalance = Math.max(0, (stay.balance || 0) + extraChargesAdjustment - discountAdjustment);
  const roomCharges = (stay.nights || 1) * (stay.pricePerNight || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden my-8 border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-telivity-navy text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-500/20 text-rose-300">
              <LogOut size={18} />
            </div>
            <div>
              <h2 className="font-bold text-base">Guest Check-Out & Settlement</h2>
              <p className="text-xs text-white/70">Room {stay.roomNumber} — {stay.guestName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Stay Info Card */}
          <div className="bg-telivity-teal/5 border border-telivity-teal/20 rounded-xl p-4 text-xs space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-telivity-mid-grey">Guest Name:</span>
              <span className="font-bold text-telivity-navy text-sm">{stay.guestName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-telivity-mid-grey">Mobile Number:</span>
              <span className="font-medium text-telivity-slate">{stay.mobile}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-telivity-mid-grey">Room Category:</span>
              <span className="font-medium text-telivity-slate">Room {stay.roomNumber} ({stay.roomTypeName})</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-telivity-mid-grey">Check-In Date:</span>
              <span className="font-medium text-telivity-slate">
                {new Date(stay.checkInTime).toLocaleDateString('en-IN', { dateStyle: 'medium' })} ({stay.nights} Nights)
              </span>
            </div>
          </div>

          {/* Charges Breakdown */}
          <div className="border border-gray-200 rounded-xl p-4 text-xs space-y-2">
            <h3 className="font-bold uppercase tracking-wider text-telivity-slate text-[11px] mb-2">Folio Charges Calculation</h3>
            
            <div className="flex justify-between text-telivity-slate">
              <span>Room Tariff ({stay.nights} Nights × ₹{stay.pricePerNight?.toLocaleString('en-IN')}):</span>
              <span className="font-semibold text-telivity-navy">₹{roomCharges.toLocaleString('en-IN')}</span>
            </div>

            {stay.extraCharges > 0 && (
              <div className="flex justify-between text-telivity-slate">
                <span>Additional Charges:</span>
                <span className="font-semibold text-telivity-navy">₹{stay.extraCharges.toLocaleString('en-IN')}</span>
              </div>
            )}

            {stay.discount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount Applied:</span>
                <span className="font-semibold">-₹{stay.discount.toLocaleString('en-IN')}</span>
              </div>
            )}

            <div className="flex justify-between font-bold text-sm text-telivity-navy pt-2 border-t border-gray-100">
              <span>Total Bill Amount:</span>
              <span>₹{stay.totalAmount?.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex justify-between text-emerald-700 font-medium pt-1">
              <span>Advance Paid ({stay.paymentMethod}):</span>
              <span>-₹{stay.advancePaid?.toLocaleString('en-IN')}</span>
            </div>

            {stay.previousPayments > 0 && (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Previous Interim Payments:</span>
                <span>-₹{stay.previousPayments?.toLocaleString('en-IN')}</span>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t-2 border-gray-200 font-bold text-sm">
              <span className="text-rose-700">Current Outstanding Balance:</span>
              <span className="text-rose-700 text-base">₹{currentBalance.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Final Payment Input */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
            <label className="block text-xs font-bold text-telivity-navy uppercase tracking-wider">
              Collect Final Payment at Check-Out
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-telivity-mid-grey mb-1">Final Amount (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500 font-semibold text-xs">₹</span>
                  <input
                    type="number"
                    value={finalPayment}
                    onChange={(e) => setFinalPayment(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold text-telivity-navy focus:outline-none focus:border-telivity-teal"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-telivity-mid-grey mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-telivity-navy focus:outline-none focus:border-telivity-teal"
                >
                  <option value="Cash">Cash (Counter)</option>
                  <option value="UPI">UPI (GPay / PhonePe / QR)</option>
                  <option value="Card">Credit / Debit Card</option>
                  <option value="Bank Transfer">Bank Transfer / IMPS</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setFinalPayment(String(currentBalance))}
                className="px-2.5 py-1 text-[11px] bg-white border border-gray-300 hover:border-telivity-teal rounded-md font-medium text-telivity-slate transition"
              >
                Pay Full Balance (₹{currentBalance.toLocaleString('en-IN')})
              </button>
              <button
                type="button"
                onClick={() => setFinalPayment('0')}
                className="px-2.5 py-1 text-[11px] bg-white border border-gray-300 hover:border-telivity-teal rounded-md font-medium text-telivity-slate transition"
              >
                Zero Balance / Pre-settled
              </button>
            </div>
          </div>

          {/* Housekeeping Action Notice */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-600" />
            <div>
              <p className="font-semibold">Automatic Room & Housekeeping Transition</p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Upon confirmation, Room {stay.roomNumber} will automatically be changed to <span className="font-bold">VACANT DIRTY</span> and an automatic cleaning alert will be assigned to Housekeeping.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-telivity-slate hover:bg-gray-100 transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => checkoutMutation.mutate()}
            disabled={checkoutMutation.isPending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-telivity-teal hover:bg-telivity-light-teal text-white text-xs font-bold shadow-md transition disabled:opacity-50"
          >
            {checkoutMutation.isPending ? (
              'Processing Checkout...'
            ) : (
              <>
                <CheckCircle2 size={16} /> Confirm Checkout & Generate Bill
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
