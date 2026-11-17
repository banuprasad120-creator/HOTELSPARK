import { useRef, useState } from 'react';
import { X, Printer, CheckCircle, Hotel, Phone, MapPin, Calendar, ShieldCheck, Settings2, Eye, Download, FileCheck } from 'lucide-react';
import type { StoredStay } from '../../lib/supabaseAdapter';
import AadhaarViewerModal from '../guests/AadhaarViewerModal';

interface BillInvoiceModalProps {
  stay: StoredStay | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function BillInvoiceModal({ stay, isOpen, onClose }: BillInvoiceModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  // Invoice Customization Controls
  const [taxMode, setTaxMode] = useState<'inclusive' | 'exclusive'>('inclusive');
  const [showGstin, setShowGstin] = useState(true);
  const [customGstin, setCustomGstin] = useState('36AAAAA0000A1Z5');
  const [customNote, setCustomNote] = useState('');
  const [showTerms, setShowTerms] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showAadhaarModal, setShowAadhaarModal] = useState(false);

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
  const rawRoomCharges = (stay.nights || 1) * (stay.pricePerNight || 0);
  const extraCharges = stay.extraCharges || 0;
  const discount = stay.discount || 0;

  // Tax calculations: 12% GST (6% CGST + 6% SGST)
  let subtotalAmount: number;
  let cgstAmount: number;
  let sgstAmount: number;
  let grandTotal: number;

  if (taxMode === 'inclusive') {
    grandTotal = Math.max(0, rawRoomCharges + extraCharges - discount);
    subtotalAmount = Math.round(grandTotal / 1.12);
    const totalGst = grandTotal - subtotalAmount;
    cgstAmount = Math.round(totalGst / 2);
    sgstAmount = totalGst - cgstAmount;
  } else {
    // Exclusive mode: base rate + 12% GST added on top
    const taxableBase = Math.max(0, rawRoomCharges + extraCharges - discount);
    subtotalAmount = taxableBase;
    cgstAmount = Math.round(taxableBase * 0.06);
    sgstAmount = Math.round(taxableBase * 0.06);
    grandTotal = taxableBase + cgstAmount + sgstAmount;
  }

  const finalBalanceDue = Math.max(0, grandTotal - totalPaid);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden my-8 print:m-0 print:p-0 print:shadow-none print:w-full">
        {/* Modal Action Bar (hidden on print) */}
        <div className="flex flex-wrap items-center justify-between px-6 py-4 bg-telivity-navy text-white print:hidden gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="text-emerald-400" size={20} />
            <span className="font-bold text-sm tracking-wide">HOTEL SPARK — OFFICIAL GUEST FOLIO & INVOICE</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${showSettings ? 'bg-white/20 border-white text-white' : 'border-white/20 text-white/80 hover:bg-white/10'}`}
              title="Customize Tax & Invoice Settings"
            >
              <Settings2 size={14} /> Customize Invoice
            </button>
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

        {/* Invoice Customization Bar */}
        {showSettings && (
          <div className="bg-teal-50/90 border-b border-teal-200 p-4 text-xs text-telivity-navy print:hidden">
            <div className="font-bold text-teal-900 mb-2.5 flex items-center gap-1.5">
              <Settings2 size={14} className="text-teal-700" />
              <span>Invoice & Tax Customization</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Tax Mode */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">GST Tax Computation</label>
                <div className="inline-flex rounded-lg border border-teal-300 p-0.5 bg-white">
                  <button
                    type="button"
                    onClick={() => setTaxMode('inclusive')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition ${taxMode === 'inclusive' ? 'bg-telivity-teal text-white' : 'text-gray-600 hover:text-teal-800'}`}
                  >
                    Tax-Inclusive (12%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaxMode('exclusive')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition ${taxMode === 'exclusive' ? 'bg-telivity-teal text-white' : 'text-gray-600 hover:text-teal-800'}`}
                  >
                    Tax-Exclusive (+12%)
                  </button>
                </div>
              </div>

              {/* GSTIN Toggle */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Hotel GSTIN</label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="toggle-gstin"
                    checked={showGstin}
                    onChange={(e) => setShowGstin(e.target.checked)}
                    className="accent-telivity-teal rounded"
                  />
                  <input
                    type="text"
                    value={customGstin}
                    onChange={(e) => setCustomGstin(e.target.value)}
                    disabled={!showGstin}
                    className="flex-1 bg-white border border-gray-300 rounded px-2 py-1 text-xs font-mono disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Terms & Custom Notes */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Custom Remarks / Bill Notes</label>
                <input
                  type="text"
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="e.g. Corporate B2B billing / GST claim"
                  className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs"
                />
              </div>
            </div>
          </div>
        )}

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
              <span className="text-[10px] font-bold tracking-wider text-telivity-teal uppercase">
                {taxMode === 'exclusive' ? 'TAX INVOICE (TAX-EXCLUSIVE)' : 'TAX INVOICE (TAX-INCLUSIVE)'}
              </span>
              <p className="text-sm font-bold text-telivity-navy">{invoiceNumber}</p>
              <p className="text-xs text-telivity-mid-grey">Date: {new Date().toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p>
              {showGstin && <p className="text-[10px] text-gray-500 font-mono mt-0.5">GSTIN: {customGstin}</p>}
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
              <div className="mt-2.5 pt-2 border-t border-gray-200/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 font-semibold truncate">
                  <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                  <span className="truncate">ID Proof: {stay.idProofType} ({stay.idProofNumber || 'Verified'})</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAadhaarModal(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-telivity-teal hover:bg-telivity-light-teal text-white rounded-lg text-xs font-bold transition shadow-xs shrink-0"
                >
                  <Eye size={13} />
                  <span>View & Download Aadhaar</span>
                </button>
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
                      <span className="block text-[10px] text-gray-500 font-normal">
                        {taxMode === 'inclusive' ? 'Tariff inclusive of 12% GST' : 'Tariff base rate (GST applicable separately)'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">{stay.nights}</td>
                    <td className="py-3 px-4 text-right">₹{stay.pricePerNight?.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 text-right font-semibold">₹{rawRoomCharges.toLocaleString('en-IN')}</td>
                  </tr>

                  {extraCharges > 0 && (
                    <tr>
                      <td className="py-3 px-4 font-medium text-telivity-navy">Additional Charges (Room Service / Extra Bed / Amenities)</td>
                      <td className="py-3 px-4 text-center">1</td>
                      <td className="py-3 px-4 text-right">₹{extraCharges.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-right font-semibold">₹{extraCharges.toLocaleString('en-IN')}</td>
                    </tr>
                  )}

                  {discount > 0 && (
                    <tr className="text-emerald-700 bg-emerald-50/50">
                      <td className="py-2.5 px-4 font-medium">Promotional / Special Discount Applied</td>
                      <td className="py-2.5 px-4 text-center">—</td>
                      <td className="py-2.5 px-4 text-right">-₹{discount.toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-4 text-right font-semibold">-₹{discount.toLocaleString('en-IN')}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment & GST Summary */}
          <div className="flex flex-col sm:flex-row justify-between items-start pt-6 gap-6">
            <div className="text-xs text-telivity-mid-grey space-y-1 max-w-sm">
              {customNote && (
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 mb-3">
                  <p className="font-bold text-[11px] uppercase tracking-wide">Special Note:</p>
                  <p className="text-xs mt-0.5">{customNote}</p>
                </div>
              )}
              {showTerms && (
                <>
                  <p className="font-bold text-telivity-navy text-xs uppercase tracking-wider mb-2">Terms & Policies:</p>
                  <p>1. Check-out time is 12:00 Noon. Late checkout subject to availability.</p>
                  <p>2. Spark Hotel is a smoke-free property. Government photo ID is required for all staying guests.</p>
                  <p>3. This is a computer-generated tax folio and requires no physical signature.</p>
                </>
              )}
            </div>

            <div className="w-full sm:w-80 bg-gray-50/90 rounded-xl p-4 border border-gray-100 text-xs space-y-2">
              <div className="flex justify-between text-telivity-slate">
                <span>Taxable Base Subtotal:</span>
                <span className="font-medium">₹{subtotalAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-gray-600 text-[11px]">
                <span>CGST (6%):</span>
                <span>₹{cgstAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-gray-600 text-[11px]">
                <span>SGST (6%):</span>
                <span>₹{sgstAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-[11px] text-gray-500 italic">
                <span>GST Mode:</span>
                <span className="font-medium not-italic">{taxMode === 'inclusive' ? 'Included in total' : 'Added to total'}</span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium pt-1 border-t border-gray-100">
                  <span>Discount Applied:</span>
                  <span>-₹{discount.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="flex justify-between font-bold text-sm text-telivity-navy pt-2 border-t border-gray-200">
                <span>Grand Total:</span>
                <span>₹{grandTotal.toLocaleString('en-IN')}</span>
              </div>

              <div className="pt-2 border-t border-dashed border-gray-200 space-y-1 text-telivity-slate">
                <div className="flex justify-between">
                  <span>Advance Paid ({stay.paymentMethod}):</span>
                  <span className="font-medium text-emerald-700">-₹{(stay.advancePaid || 0).toLocaleString('en-IN')}</span>
                </div>
                {stay.previousPayments > 0 && (
                  <div className="flex justify-between">
                    <span>Payment at Checkout:</span>
                    <span className="font-medium text-emerald-700">-₹{stay.previousPayments.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-xs pt-1 border-t border-gray-100">
                  <span>Total Amount Paid:</span>
                  <span className="text-emerald-700">₹{totalPaid.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className={`flex justify-between items-center p-2.5 rounded-lg font-bold text-xs ${finalBalanceDue <= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                <span>{finalBalanceDue <= 0 ? 'BILL SETTLED (PAID IN FULL)' : 'BALANCE DUE:'}</span>
                <span className="text-sm">₹{finalBalanceDue.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Signatures & Footer */}
          <div className="grid grid-cols-2 gap-8 pt-10 mt-6 border-t border-gray-100 text-xs text-center text-telivity-mid-grey">
            <div>
              <div className="w-40 border-b border-gray-300 mx-auto mb-1"></div>
              <p className="font-medium text-telivity-slate">Guest Signature</p>
            </div>
            <div>
              <div className="w-40 border-b border-gray-300 mx-auto mb-1"></div>
              <p className="font-medium text-telivity-slate">Authorized Hotel Spark Receptionist</p>
            </div>
          </div>

          <div className="text-center mt-6 pt-3 border-t border-gray-100 text-[10px] text-telivity-mid-grey">
            Thank you for staying at Hotel Spark, Karimnagar! We look forward to welcoming you again.
          </div>
        </div>
      </div>

      {showAadhaarModal && (
        <AadhaarViewerModal
          open={showAadhaarModal}
          onClose={() => setShowAadhaarModal(false)}
          guest={{
            id: stay.id,
            firstName: stay.guestName.split(' ')[0] || 'Guest',
            lastName: stay.guestName.split(' ').slice(1).join(' ') || '',
            idProofType: stay.idProofType,
            idProofNumber: stay.idProofNumber,
            idProofFrontUrl: stay.idProofFrontUrl,
            idProofBackUrl: stay.idProofBackUrl,
            stateProvince: stay.state || 'Telangana',
            idCountry: 'IN',
          }}
          onUpdateGuest={(updated) => {
            if (stay) {
              if (updated.idProofFrontUrl) stay.idProofFrontUrl = updated.idProofFrontUrl;
              if (updated.idProofBackUrl) stay.idProofBackUrl = updated.idProofBackUrl;
            }
          }}
        />
      )}
    </div>
  );
}