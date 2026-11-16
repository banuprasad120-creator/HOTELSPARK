import { useRef } from 'react';
import { X, Printer, CheckCircle, Hotel, Phone, MapPin, Calendar, CreditCard, ShieldCheck } from 'lucide-react';
import type { StoredStay } from '../../lib/supabaseAdapter';

interface BillInvoiceModalProps {
  stay: StoredStay | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function BillInvoiceModal({ stay, isOpen, onClose }: BillInvoiceModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !stay) return null;

  const handlePrint = () => {
    window.print();
  };

  const invoiceNumber = stay.billNumber || `INV-SPARK-2026-${stay.roomNumber}-${stay.id.slice(-4)}`;
  const checkInFormatted = new Date(stay.checkInTime).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const checkOutFormatted = stay.actualCheckoutTime
    ? new Date(stay.actualCheckoutTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : new Date(stay.expectedCheckoutTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  const totalPaid = (stay.advancePaid || 0) + (stay.previousPayments || 0);
  const roomCharges = (stay.nights || 1) * (stay.pricePerNight || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden my-8 print:m-0 print:p-0 print:shadow-none print:w-full">
        {/* Modal Action Bar (hidden on print) */}
        <div className="flex items-center justify-between px-6 py-4 bg-telivity-navy text-white print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle className="text-emerald-400" size={20} />
            <span className="font-bold text-sm tracking-wide">HOTEL SPARK — OFFICIAL GUEST FOLIO & INVOICE</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-telivity-teal hover:bg-telivity-light-teal text-white text-xs font-semibold shadow-xs transition"
            >
              <Printer size={15} /> Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Invoice Container */}
        <div ref={printRef} className="p-8 print:p-4 text-telivity-navy font-sans bg-white">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b-2 border-telivity-teal/20 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-telivity-teal flex items-center justify-center text-white font-extrabold text-2xl shadow-sm">
                ⚡
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-telivity-navy">HOTEL SPARK</h1>
                <p className="text-xs text-telivity-mid-grey flex items-center gap-1 mt-0.5">
                  <MapPin size={12} className="text-telivity-teal" /> Near Old Bus Stand, Jagtial Road, Karimnagar, Telangana 505001
                </p>
                <p className="text-xs text-telivity-mid-grey flex items-center gap-1">
                  <Phone size={12} className="text-telivity-teal" /> +91 98765 43210 / +91 98765 43211 | reception@sparkhotel.com
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right bg-telivity-light-grey/50 p-3 rounded-xl border border-gray-100 sm:min-w-[200px]">
              <span className="text-[10px] font-bold tracking-wider text-telivity-teal uppercase">TAX INVOICE / FOLIO</span>
              <p className="text-sm font-bold text-telivity-navy">{invoiceNumber}</p>
              <p className="text-xs text-telivity-mid-grey">Date: {new Date().toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p>
              <p className="text-[10px] text-gray-500 font-mono mt-0.5">GSTIN: 36AAAAA0000A1Z5</p>
            </div>
          </div>

          {/* Guest & Stay Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-6 border-b border-gray-100 text-xs">
            {/* Guest Info */}
            <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-100">
              <h3 className="font-bold text-xs uppercase tracking-wider text-telivity-slate mb-2 flex items-center gap-1.5">
                <Hotel size={14} className="text-telivity-teal" /> Guest Information
              </h3>
              <p className="font-bold text-sm text-telivity-navy">{stay.guestName}</p>
              <p className="text-telivity-mid-grey mt-0.5">Mobile: <span className="font-medium text-telivity-slate">{stay.mobile}</span></p>
              {stay.email && <p className="text-telivity-mid-grey">Email: <span className="font-medium text-telivity-slate">{stay.email}</span></p>}
              <p className="text-telivity-mid-grey">City/State: <span className="font-medium text-telivity-slate">{stay.city || 'Karimnagar'}, {stay.state || 'Telangana'}</span></p>
              {stay.address && <p className="text-telivity-mid-grey">Address: <span className="font-medium text-telivity-slate">{stay.address}</span></p>}
              <div className="mt-2 pt-2 border-t border-gray-200/60 flex items-center gap-1.5 text-[11px] text-emerald-700">
                <ShieldCheck size={13} />
                <span>ID Proof: {stay.idProofType} ({stay.idProofNumber || 'Verified & Attached'})</span>
              </div>
            </div>

            {/* Stay Info */}
            <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-100">
              <h3 className="font-bold text-xs uppercase tracking-wider text-telivity-slate mb-2 flex items-center gap-1.5">
                <Calendar size={14} className="text-telivity-teal" /> Stay Details
              </h3>
              <div className="flex justify-between items-center mb-1">
                <span className="text-telivity-mid-grey">Room Assigned:</span>
                <span className="font-bold text-telivity-teal text-sm">Room {stay.roomNumber} ({stay.roomTypeName})</span>
              </div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-telivity-mid-grey">Check-In:</span>
                <span className="font-medium text-telivity-slate">{checkInFormatted}</span>
              </div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-telivity-mid-grey">Check-Out:</span>
                <span className="font-medium text-telivity-slate">{checkOutFormatted}</span>
              </div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-telivity-mid-grey">Total Stay Duration:</span>
                <span className="font-bold text-telivity-navy">{stay.nights} Night{stay.nights > 1 ? 's' : ''}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-telivity-mid-grey">Number of Guests:</span>
                <span className="font-medium text-telivity-slate">{stay.adults} Adult{stay.adults > 1 ? 's' : ''}{stay.children > 0 ? `, ${stay.children} Child` : ''}</span>
              </div>
            </div>
          </div>

          {/* Charges Table */}
          <div className="py-6 border-b border-gray-100">
            <h3 className="font-bold text-xs uppercase tracking-wider text-telivity-slate mb-3">Itemized Billing Breakdown</h3>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-telivity-light-grey text-telivity-slate font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4">Description</th>
                    <th className="py-2.5 px-4 text-center">Qty / Nights</th>
                    <th className="py-2.5 px-4 text-right">Rate (₹)</th>
                    <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="py-3 px-4 font-medium text-telivity-navy">
                      Room Accommodation — {stay.roomTypeName} (Room {stay.roomNumber})
                    </td>
                    <td className="py-3 px-4 text-center">{stay.nights}</td>
                    <td className="py-3 px-4 text-right">₹{stay.pricePerNight?.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 text-right font-semibold">₹{roomCharges.toLocaleString('en-IN')}</td>
                  </tr>

                  {stay.extraCharges > 0 && (
                    <tr>
                      <td className="py-3 px-4 font-medium text-telivity-navy">Additional Charges (Room Service / Extra Bed / Amenities)</td>
                      <td className="py-3 px-4 text-center">1</td>
                      <td className="py-3 px-4 text-right">₹{stay.extraCharges.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-right font-semibold">₹{stay.extraCharges.toLocaleString('en-IN')}</td>
                    </tr>
                  )}

                  {stay.discount > 0 && (
                    <tr className="text-emerald-700 bg-emerald-50/50">
                      <td className="py-2.5 px-4 font-medium">Promotional / Special Discount Applied</td>
                      <td className="py-2.5 px-4 text-center">—</td>
                      <td className="py-2.5 px-4 text-right">-₹{stay.discount.toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-4 text-right font-semibold">-₹{stay.discount.toLocaleString('en-IN')}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="flex flex-col sm:flex-row justify-between items-start pt-6 gap-6">
            <div className="text-xs text-telivity-mid-grey space-y-1 max-w-sm">
              <p className="font-bold text-telivity-navy text-xs uppercase tracking-wider mb-2">Terms & Policies:</p>
              <p>1. Check-out time is 12:00 Noon. Late checkout subject to availability.</p>
              <p>2. Spark Hotel is a smoke-free property. Government photo ID is required for all staying guests.</p>
              <p>3. This is a computer-generated tax folio and requires no physical signature.</p>
            </div>

            <div className="w-full sm:w-72 bg-gray-50/90 rounded-xl p-4 border border-gray-100 text-xs space-y-2">
              <div className="flex justify-between text-telivity-slate">
                <span>Subtotal:</span>
                <span>₹{(roomCharges + (stay.extraCharges || 0)).toLocaleString('en-IN')}</span>
              </div>
              {stay.discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Discount:</span>
                  <span>-₹{stay.discount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm text-telivity-navy pt-2 border-t border-gray-200">
                <span>Total Bill Amount:</span>
                <span>₹{stay.totalAmount?.toLocaleString('en-IN')}</span>
              </div>

              <div className="pt-2 border-t border-dashed border-gray-200 space-y-1 text-telivity-slate">
                <div className="flex justify-between">
                  <span>Advance Paid ({stay.paymentMethod}):</span>
                  <span className="font-medium text-emerald-700">-₹{stay.advancePaid?.toLocaleString('en-IN')}</span>
                </div>
                {stay.previousPayments > 0 && (
                  <div className="flex justify-between">
                    <span>Payment at Checkout:</span>
                    <span className="font-medium text-emerald-700">-₹{stay.previousPayments?.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-xs pt-1 border-t border-gray-100">
                  <span>Total Amount Paid:</span>
                  <span className="text-emerald-700">₹{totalPaid.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className={`flex justify-between items-center p-2.5 rounded-lg font-bold text-xs ${stay.balance <= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                <span>{stay.balance <= 0 ? 'BILL SETTLED (PAID IN FULL)' : 'BALANCE DUE:'}</span>
                <span className="text-sm">₹{Math.max(0, stay.balance || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Signatures & Footer */}
          <div className="grid grid-cols-2 gap-8 pt-12 mt-6 border-t border-gray-100 text-xs text-center text-telivity-mid-grey">
            <div>
              <div className="w-40 border-b border-gray-300 mx-auto mb-1"></div>
              <p className="font-medium text-telivity-slate">Guest Signature</p>
            </div>
            <div>
              <div className="w-40 border-b border-gray-300 mx-auto mb-1"></div>
              <p className="font-medium text-telivity-slate">Authorized Hotel Spark Receptionist</p>
            </div>
          </div>

          <div className="text-center mt-8 pt-4 border-t border-gray-100 text-[10px] text-telivity-mid-grey">
            Thank you for staying at Hotel Spark, Karimnagar! We look forward to welcoming you again.
          </div>
        </div>
      </div>
    </div>
  );
}
