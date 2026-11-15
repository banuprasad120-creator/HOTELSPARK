import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LogOut,
  Receipt,
  Printer,
  FileText,
  DollarSign,
  AlertCircle,
  Sparkles,
  QrCode,
  Building2,
  Banknote,
  CreditCard,
  CheckCircle2,
  Plus,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useProperty } from '../../context/PropertyContext';
import { formatMoney } from '../../lib/money';
import Modal from '../ui/Modal';

interface CheckOutModalProps {
  open: boolean;
  reservation: any;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CheckOutModal({ open, reservation, onClose, onSuccess }: CheckOutModalProps) {
  const { propertyId, currencyCode } = useProperty();
  const queryClient = useQueryClient();

  const [additionalCharges, setAdditionalCharges] = useState<number>(0);
  const [additionalChargeDesc, setAdditionalChargeDesc] = useState('');
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'bank_transfer'>('upi');
  const [checkoutComplete, setCheckoutComplete] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  if (!reservation) return null;

  const roomSubtotal = Number(reservation.totalAmount || 3500);
  const advancePaid = Number(reservation.advancePaid || 3500);
  const taxes = Math.round((roomSubtotal + additionalCharges - discount) * 0.12);
  const finalTotal = Math.max(0, roomSubtotal + additionalCharges - discount + taxes);
  const remainingBalance = Math.max(0, finalTotal - advancePaid);

  const checkOutMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg('');
      const res = await api.post(
        `/v1/reservations/${reservation.id}/checkout`,
        {
          propertyId,
          reservationId: reservation.id,
          roomId: reservation.roomId || reservation.assignedRoomId,
          roomNumber: reservation.assignedRoomNumber || reservation.roomNumber || '101',
          guestName: reservation.guestName,
          settlement: {
            roomCharges: roomSubtotal,
            additionalCharges,
            discount,
            taxes,
            finalTotal,
            advancePaid,
            settledAmount: remainingBalance,
            paymentMethod,
            settledAt: new Date().toISOString(),
          },
        },
        { skipErrorToast: true },
      );
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['housekeeping'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });

      setCheckoutComplete({
        invoiceNumber: `INV-SPARK-${Date.now().toString(36).toUpperCase()}`,
        guestName: reservation.guestName,
        roomNumber: reservation.assignedRoomNumber || reservation.roomNumber || '101',
        finalTotal,
        settledAmount: remainingBalance,
        paymentMethod,
      });

      if (onSuccess) onSuccess();
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Checkout failed.');
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="🏨 Spark Hotel · Guest Check-Out & Final Settlement"
      wide
    >
      {checkoutComplete ? (
        <div className="space-y-6 py-2 text-center">
          <div className="rounded-2xl border border-emerald-300 bg-linear-to-b from-emerald-50 to-teal-50 p-6 shadow-xs">
            <div className="mx-auto w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mb-3">
              <CheckCircle2 size={26} />
            </div>
            <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
              Guest Checked Out · Folio Settled
            </span>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
              Room {checkoutComplete.roomNumber} Marked DIRTY
            </h2>
            <p className="text-xs text-teal-800 font-semibold mt-1">
              ✨ Cleaning task generated for Housekeeping Team!
            </p>

            <div className="mt-4 p-4 rounded-xl bg-white border border-emerald-200 text-left grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-gray-400 block font-medium">Invoice Number</span>
                <span className="font-bold text-gray-900 text-sm">{checkoutComplete.invoiceNumber}</span>
              </div>
              <div>
                <span className="text-gray-400 block font-medium">Guest Name</span>
                <span className="font-bold text-gray-900 text-sm">{checkoutComplete.guestName}</span>
              </div>
              <div>
                <span className="text-gray-400 block font-medium">Total Bill</span>
                <span className="font-bold text-gray-900 text-sm">{formatMoney(checkoutComplete.finalTotal, currencyCode)}</span>
              </div>
              <div>
                <span className="text-gray-400 block font-medium">Settled Upon Departure</span>
                <span className="font-bold text-emerald-700 text-sm">{formatMoney(checkoutComplete.settledAmount, currencyCode)}</span>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-lg transition"
              >
                <Printer size={15} />
                <span>Print Final Tax Invoice</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg transition"
              >
                <span>Close</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* STAY SUMMARY */}
          <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-gray-400 block font-medium">Guest Name</span>
              <span className="font-bold text-gray-900 text-sm">{reservation.guestName}</span>
            </div>
            <div>
              <span className="text-gray-400 block font-medium">Room Assigned</span>
              <span className="font-bold text-teal-700 text-sm">Room {reservation.assignedRoomNumber || '101'}</span>
            </div>
            <div>
              <span className="text-gray-400 block font-medium">Stay Period</span>
              <span className="font-bold text-gray-800 text-xs">{reservation.arrivalDate} → {reservation.departureDate}</span>
            </div>
            <div>
              <span className="text-gray-400 block font-medium">Advance Paid</span>
              <span className="font-bold text-emerald-700 text-sm">{formatMoney(advancePaid, currencyCode)}</span>
            </div>
          </div>

          {/* ADDITIONAL CHARGES & DISCOUNTS */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-telivity-navy">
              Additional Charges & Discounts
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Additional Services (Minibar, Room Service, Laundry)
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={additionalCharges || ''}
                  onChange={(e) => setAdditionalCharges(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Manager Discount / Promotional Rebate
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={discount || ''}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-emerald-700"
                />
              </div>
            </div>
          </div>

          {/* FINAL SETTLEMENT BREAKDOWN */}
          <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-900">
              Final Checkout Settlement Breakdown
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-white p-3 rounded-xl border border-teal-100 text-xs">
              <div>
                <span className="text-gray-400 block">Room Charges</span>
                <span className="font-bold text-gray-900 text-sm">{formatMoney(roomSubtotal, currencyCode)}</span>
              </div>
              <div>
                <span className="text-gray-400 block">Extras</span>
                <span className="font-bold text-gray-900 text-sm">+{formatMoney(additionalCharges, currencyCode)}</span>
              </div>
              <div>
                <span className="text-gray-400 block">GST Taxes (12%)</span>
                <span className="font-bold text-gray-900 text-sm">+{formatMoney(taxes, currencyCode)}</span>
              </div>
              <div>
                <span className="text-gray-400 block">Advance Credit</span>
                <span className="font-bold text-emerald-700 text-sm">-{formatMoney(advancePaid, currencyCode)}</span>
              </div>
              <div>
                <span className="text-orange-600 font-bold block">Remaining Due</span>
                <span className="font-black text-orange-600 text-base">{formatMoney(remainingBalance, currencyCode)}</span>
              </div>
            </div>

            {remainingBalance > 0 && (
              <div className="pt-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Payment Method for Departure Settlement:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'upi', label: 'UPI QR (GPay/PhonePe)', icon: QrCode },
                    { id: 'cash', label: 'Cash at Desk', icon: Banknote },
                    { id: 'card', label: 'Credit / Debit Card', icon: CreditCard },
                    { id: 'bank_transfer', label: 'Bank Transfer', icon: Building2 },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition ${
                        paymentMethod === m.id
                          ? 'border-teal-600 bg-teal-100/70 text-teal-900 ring-1 ring-teal-600'
                          : 'border-gray-200 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <m.icon size={15} />
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ACTIONS */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-100 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => checkOutMutation.mutate()}
              disabled={checkOutMutation.isPending}
              className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold shadow-md hover:shadow-lg transition flex items-center gap-2"
            >
              <LogOut size={16} />
              <span>
                {checkOutMutation.isPending ? 'Processing Check-Out…' : 'Complete Checkout & Mark Room Dirty'}
              </span>
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
