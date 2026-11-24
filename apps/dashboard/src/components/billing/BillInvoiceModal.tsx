import { useRef, useState, useEffect } from 'react';
import { X, Printer, Settings2, Eye, Edit3, Download, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { StoredStay } from '../../lib/supabaseAdapter';
import AadhaarViewerModal from '../guests/AadhaarViewerModal';
import EditBillModal from './EditBillModal';
import { numberToIndianWords } from './numberToWords';

interface BillInvoiceModalProps {
  stay: StoredStay | null;
  isOpen: boolean;
  onClose: () => void;
  onStayUpdated?: (updatedStay: StoredStay) => void;
}

export default function BillInvoiceModal({
  stay,
  isOpen,
  onClose,
  onStayUpdated,
}: BillInvoiceModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  // Local stay reference so edits update live in this modal
  const [currentStay, setCurrentStay] = useState<StoredStay | null>(stay);
  useEffect(() => {
    setCurrentStay(stay);
  }, [stay]);

  // Invoice Customization Controls
  const [taxMode, setTaxMode] = useState<'inclusive' | 'exclusive'>('inclusive');
  const [gstRate, setGstRate] = useState<number>(5); // 5% default (2.5% SGST + 2.5% CGST) as per Hotel Spark photo
  const [hotelGstin, setHotelGstin] = useState('36MOTPS2621J2Z3');
  const [hotelAddress, setHotelAddress] = useState('BLD NO – 2-6-169/1,Market Road Karimnagar');
  const [hotelName, setHotelName] = useState('HOTEL SPARK Karimnagar');
  const [customRemark, setCustomRemark] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showEditBillModal, setShowEditBillModal] = useState(false);
  const [showAadhaarModal, setShowAadhaarModal] = useState(false);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showAadhaarModal && !showEditBillModal) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showAadhaarModal, showEditBillModal, onClose]);

  if (!isOpen || !currentStay) return null;

  const [downloading, setDownloading] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Hotel_Spark_Invoice_${invoiceNumber}.pdf`);
    } catch (err) {
      console.error('PDF export failed, falling back to HTML download:', err);
      handleDownloadHtml();
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadHtml = () => {
    if (!printRef.current) return;
    const invoiceContent = printRef.current.innerHTML;
    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Hotel Spark Invoice - ${invoiceNumber}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @media print { body { -webkit-print-color-adjust: exact; margin: 0; } }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #fff; padding: 20px; }
  </style>
</head>
<body onload="window.print()">
  <div style="max-width: 850px; margin: 0 auto;">
    ${invoiceContent}
  </div>
</body>
</html>`;
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Hotel_Spark_Invoice_${invoiceNumber}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const safeId = currentStay.id ? String(currentStay.id) : String(Date.now());
  const safeRoomNumber = currentStay.roomNumber ? String(currentStay.roomNumber) : '101';
  const invoiceNumber =
    currentStay.billNumber ||
    `INV-SPARK-${safeRoomNumber}-${safeId.length >= 4 ? safeId.slice(-4) : safeId.padStart(4, '0')}`;

  const formatInvoiceDateTime = (isoDate?: string) => {
    if (!isoDate) return new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
    try {
      const d = new Date(isoDate);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'Pm' : 'am';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const strHours = String(hours).padStart(2, '0');
      return `${day}/${month}/${year} ${strHours}:${minutes}${ampm}`;
    } catch {
      return isoDate;
    }
  };

  const checkInFormatted = formatInvoiceDateTime(currentStay.checkInTime);
  const checkOutFormatted = formatInvoiceDateTime(currentStay.actualCheckoutTime || currentStay.expectedCheckoutTime);
  const invoiceDateOnly = currentStay.checkInTime
    ? new Date(currentStay.checkInTime).toLocaleDateString('en-GB')
    : new Date().toLocaleDateString('en-GB');

  const nights = currentStay.nights || 1;
  const pricePerNight = currentStay.pricePerNight || 1600;
  const rawRoomTariff = nights * pricePerNight;
  const extraCharges = currentStay.extraCharges || 0;
  const discount = currentStay.discount || 0;

  // Tax calculations:
  // As in the official Hotel Spark invoice photo:
  // Rate: 1524.00, Taxable: 1524.00, SGST 2.50%: 38.00, CGST 2.50%: 38.00 -> Total: 1600.00
  let taxableRoomCharges = 0;
  let roomSgst = 0;
  let roomCgst = 0;
  let totalRoomCharges = rawRoomTariff;

  let taxableExtraCharges = 0;
  let extraSgst = 0;
  let extraCgst = 0;

  let grandTotal = 0;
  let totalCharges = 0;
  let totalSgst = 0;
  let totalCgst = 0;

  if (gstRate === 0) {
    taxableRoomCharges = rawRoomTariff;
    totalRoomCharges = rawRoomTariff;
    taxableExtraCharges = extraCharges;
    grandTotal = Math.max(0, rawRoomTariff + extraCharges - discount);
    totalCharges = grandTotal;
  } else if (taxMode === 'inclusive') {
    // Inclusive mode: Tariff already includes GST
    const baseTotal = rawRoomTariff;
    taxableRoomCharges = Math.round((baseTotal / (1 + gstRate / 100)) * 100) / 100;
    const roomTax = baseTotal - taxableRoomCharges;
    roomSgst = Math.round((roomTax / 2) * 100) / 100;
    roomCgst = Math.round((roomTax - roomSgst) * 100) / 100;
    totalRoomCharges = baseTotal;

    if (extraCharges > 0) {
      taxableExtraCharges = Math.round((extraCharges / (1 + gstRate / 100)) * 100) / 100;
      const extraTax = extraCharges - taxableExtraCharges;
      extraSgst = Math.round((extraTax / 2) * 100) / 100;
      extraCgst = Math.round((extraTax - extraSgst) * 100) / 100;
    }

    grandTotal = Math.max(0, baseTotal + extraCharges - discount);
    totalCharges = taxableRoomCharges + taxableExtraCharges;
    totalSgst = roomSgst + extraSgst;
    totalCgst = roomCgst + extraCgst;
  } else {
    // Exclusive mode: GST added on top
    taxableRoomCharges = rawRoomTariff;
    roomSgst = Math.round((taxableRoomCharges * (gstRate / 200)) * 100) / 100;
    roomCgst = roomSgst;
    totalRoomCharges = taxableRoomCharges + roomSgst + roomCgst;

    if (extraCharges > 0) {
      taxableExtraCharges = extraCharges;
      extraSgst = Math.round((taxableExtraCharges * (gstRate / 200)) * 100) / 100;
      extraCgst = extraSgst;
    }

    totalCharges = taxableRoomCharges + taxableExtraCharges;
    totalSgst = roomSgst + extraSgst;
    totalCgst = roomCgst + extraCgst;
    grandTotal = Math.max(0, totalCharges + totalSgst + totalCgst - discount);
  }

  const totalPaid = (currentStay.advancePaid || 0) + (currentStay.previousPayments || 0);
  const balanceDue = Math.max(0, grandTotal - totalPaid);
  const amountInWords = numberToIndianWords(grandTotal);

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs p-2 sm:p-6 flex justify-center items-start print:p-0 print:bg-white"
      onClick={(e) => {
        if (e.target === e.currentTarget && !showEditBillModal && !showAadhaarModal) onClose();
      }}
    >
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden my-4 sm:my-6 print:m-0 print:p-0 print:shadow-none print:w-full print:rounded-none">
        {/* Modal Top Action Bar (Sticky at top, hidden on print) */}
        <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between px-4 sm:px-6 py-3 bg-telivity-navy text-white print:hidden gap-3 shadow-md">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-bold text-xs sm:text-sm tracking-wide">
              HOTEL SPARK — OFFICIAL TAX INVOICE & FOLIO
            </span>
            <span className="text-xs bg-white/10 px-2 py-0.5 rounded-md font-mono">
              Room {currentStay.roomNumber}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEditBillModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold shadow-xs transition"
              title="Edit Bill details, charges, guest, dates, or payments"
            >
              <Edit3 size={14} />
              <span>Edit Full Bill</span>
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${showSettings ? 'bg-white/20 border-white text-white' : 'border-white/20 text-white/80 hover:bg-white/10'}`}
              title="Toggle Tax Mode, GST Rate, or Header details"
            >
              <Settings2 size={14} />
              <span className="hidden sm:inline">Tax & Format</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
              title="Download official Hotel Spark Invoice as a PDF file"
            >
              {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              <span>{downloading ? 'Downloading…' : 'Download Invoice (PDF)'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-gray-100 text-telivity-navy text-xs font-extrabold shadow-xs transition cursor-pointer"
              title="Print or Save Invoice as PDF"
            >
              <Printer size={15} />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/20 text-white transition bg-white/10"
              aria-label="Close"
              title="Close (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Invoice Customization Bar (hidden on print) */}
        {showSettings && (
          <div className="bg-teal-50/90 border-b border-teal-200 p-4 text-xs text-telivity-navy print:hidden">
            <div className="font-bold text-teal-900 mb-2.5 flex items-center gap-1.5">
              <Settings2 size={14} className="text-teal-700" />
              <span>Invoice Header & Tax Calculation Settings</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Hotel GSTIN</label>
                <input
                  type="text"
                  value={hotelGstin}
                  onChange={(e) => setHotelGstin(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded px-2.5 py-1 text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">GST Tax Rate</label>
                <select
                  value={gstRate}
                  onChange={(e) => setGstRate(Number(e.target.value))}
                  className="w-full bg-white border border-gray-300 rounded px-2.5 py-1 text-xs font-bold"
                >
                  <option value={5}>5% GST (2.5% SGST + 2.5% CGST) [Photo Match]</option>
                  <option value={12}>12% GST (6.0% SGST + 6.0% CGST)</option>
                  <option value={18}>18% GST (9.0% SGST + 9.0% CGST)</option>
                  <option value={0}>0% (Tax Exempt)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Tax Mode</label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setTaxMode('inclusive')}
                    className={`flex-1 py-1 px-2 rounded text-xs font-bold border transition ${taxMode === 'inclusive' ? 'bg-telivity-teal text-white border-telivity-teal' : 'bg-white text-gray-600 border-gray-300'}`}
                  >
                    Tax-Inclusive
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaxMode('exclusive')}
                    className={`flex-1 py-1 px-2 rounded text-xs font-bold border transition ${taxMode === 'exclusive' ? 'bg-telivity-teal text-white border-telivity-teal' : 'bg-white text-gray-600 border-gray-300'}`}
                  >
                    Tax-Exclusive
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Custom Remark / Note</label>
                <input
                  type="text"
                  value={customRemark}
                  onChange={(e) => setCustomRemark(e.target.value)}
                  placeholder="e.g. Corporate B2B billing"
                  className="w-full bg-white border border-gray-300 rounded px-2.5 py-1 text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* Printable Official Invoice Container (Matches Paper Pattern from photo media_1795516721819_3fb43638.jpg) */}
        <div
          ref={printRef}
          className="p-4 sm:p-8 print:p-2 bg-white text-black font-sans text-xs select-text"
          style={{ minHeight: '1020px' }}
        >
          {/* Outer Border wrapping the entire invoice as seen on preprinted hotel folios */}
          <div className="border border-black p-4 sm:p-5 print:border-black print:p-4 min-h-[960px] flex flex-col justify-between">
            <div>
              {/* Header: Centered Hotel Name, Address, GSTIN (No border line below, exactly as photo) */}
              <div className="text-center pt-2 pb-5">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-black">
                  {hotelName}
                </h1>
                <p className="text-xs sm:text-sm font-semibold text-black mt-1">
                  {hotelAddress}
                </p>
                <p className="text-xs sm:text-sm font-bold text-black tracking-wider mt-1 font-mono">
                  {hotelGstin}
                </p>
              </div>

              {/* Metadata Section: Two Columns (No border dividers, clean spacing as photo) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 text-xs mb-3 gap-y-1 gap-x-4">
                {/* Left Column */}
                <div className="space-y-1">
                  <div className="flex">
                    <span className="w-28 sm:w-32 font-bold shrink-0">Invoice No</span>
                    <span className="shrink-0 mr-1">:</span>
                    <span className="font-semibold">{currentStay.billNumber || invoiceNumber}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 sm:w-32 font-bold shrink-0">Guest Name</span>
                    <span className="shrink-0 mr-1">:</span>
                    <span className="font-semibold">{currentStay.guestName}</span>
                  </div>
                  <div className="flex items-start">
                    <span className="w-28 sm:w-32 font-bold shrink-0">Bill To Address</span>
                    <span className="shrink-0 mr-1">:</span>
                    <span className="flex-1 whitespace-pre-line">
                      {currentStay.address || 'plot no 78, Road no 6\nSailajapori colony, L.B nagar\nHyderabad'}
                    </span>
                  </div>
                  <div className="flex">
                    <span className="w-28 sm:w-32 font-bold shrink-0">State</span>
                    <span className="shrink-0 mr-1">:</span>
                    <span>{currentStay.state || 'Telangana'}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 sm:w-32 font-bold shrink-0">Bill To</span>
                    <span className="shrink-0 mr-1">:</span>
                    <span className="font-mono">{currentStay.guestGstin || '36AABFK5489N1Z0'}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 sm:w-32 font-bold shrink-0">Source</span>
                    <span className="shrink-0 mr-1">:</span>
                    <span>{currentStay.source || 'Walk-in'}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 sm:w-32 font-bold shrink-0">Source Of Supply</span>
                    <span className="shrink-0 mr-1">:</span>
                    <span>{currentStay.sourceOfSupply || 'Karimnagar'}</span>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-1">
                  <div className="flex">
                    <span className="w-28 sm:w-32 font-bold shrink-0">Room</span>
                    <span className="shrink-0 mr-1">:</span>
                    <span className="font-semibold">
                      {currentStay.roomTypeName || 'Budget'}/{currentStay.roomNumber || '4006'}
                    </span>
                  </div>
                  <div className="flex">
                    <span className="w-28 sm:w-32 font-bold shrink-0">No of Person</span>
                    <span className="shrink-0 mr-1">:</span>
                    <span>
                      {currentStay.adults || 1}(A)/{currentStay.children || 0}(C)
                    </span>
                  </div>
                  <div className="flex">
                    <span className="w-28 sm:w-32 font-bold shrink-0">Rate Type</span>
                    <span className="shrink-0 mr-1">:</span>
                    <span>{currentStay.rateType || currentStay.roomTypeName || 'Budget'}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 sm:w-32 font-bold shrink-0">NoofNights</span>
                    <span className="shrink-0 mr-1">:</span>
                    <span>{currentStay.nights || 1}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 sm:w-32 font-bold shrink-0">DateofArrival</span>
                    <span className="shrink-0 mr-1">:</span>
                    <span>{checkInFormatted}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 sm:w-32 font-bold shrink-0">DateofDeparture</span>
                    <span className="shrink-0 mr-1">:</span>
                    <span>{checkOutFormatted}</span>
                  </div>
                </div>
              </div>

              {/* Itemized Charges Table (Sr No | Particular | HSN/SAC | Qty | Rate | Total | Discount | Taxable | SGST | CGST | IGST | CESS) */}
              <div className="w-full border border-black mb-0 overflow-hidden">
                <table className="w-full text-center text-[10px] sm:text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-black font-bold">
                      <th className="py-1 px-1 border-r border-black w-8">Sr No</th>
                      <th className="py-1 px-2 border-r border-black text-left">Particular</th>
                      <th className="py-1 px-1 border-r border-black">HSN/SAC</th>
                      <th className="py-1 px-1 border-r border-black w-8">Qty</th>
                      <th className="py-1 px-1.5 border-r border-black text-right">Rate</th>
                      <th className="py-1 px-1.5 border-r border-black text-right">Total</th>
                      <th className="py-1 px-1.5 border-r border-black text-right">Discount</th>
                      <th className="py-1 px-1.5 border-r border-black text-right">Taxable</th>
                      <th className="py-1 px-1.5 border-r border-black text-right">SGST</th>
                      <th className="py-1 px-1.5 border-r border-black text-right">CGST</th>
                      <th className="py-1 px-1.5 border-r border-black text-right">IGST</th>
                      <th className="py-1 px-1 text-right">CESS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Row 1: Room Charges */}
                    <tr className="border-b border-black">
                      <td className="py-1 px-1 border-r border-black">1</td>
                      <td className="py-1 px-2 border-r border-black text-left font-medium">RoomCharges</td>
                      <td className="py-1 px-1 border-r border-black font-mono">988457</td>
                      <td className="py-1 px-1 border-r border-black">{nights}</td>
                      <td className="py-1 px-1.5 border-r border-black text-right">{taxableRoomCharges.toFixed(2)}</td>
                      <td className="py-1 px-1.5 border-r border-black text-right">{taxableRoomCharges.toFixed(2)}</td>
                      <td className="py-1 px-1.5 border-r border-black text-right">{discount.toFixed(2)}</td>
                      <td className="py-1 px-1.5 border-r border-black text-right">{taxableRoomCharges.toFixed(2)}</td>
                      <td className="py-1 px-1.5 border-r border-black text-right leading-tight">
                        <div>{roomSgst.toFixed(2)}</div>
                        <div className="text-[9px] text-gray-700">{(gstRate / 2).toFixed(2)}%</div>
                      </td>
                      <td className="py-1 px-1.5 border-r border-black text-right leading-tight">
                        <div>{roomCgst.toFixed(2)}</div>
                        <div className="text-[9px] text-gray-700">{(gstRate / 2).toFixed(2)}%</div>
                      </td>
                      <td className="py-1 px-1.5 border-r border-black text-right leading-tight">
                        <div>0.00</div>
                        <div className="text-[9px] text-gray-700">0.00%</div>
                      </td>
                      <td className="py-1 px-1 text-right">0.00</td>
                    </tr>

                    {/* Row 2: Extra Charges (if any) */}
                    {extraCharges > 0 && (
                      <tr className="border-b border-black">
                        <td className="py-1 px-1 border-r border-black">2</td>
                        <td className="py-1 px-2 border-r border-black text-left font-medium">Extra Charges</td>
                        <td className="py-1 px-1 border-r border-black font-mono">996331</td>
                        <td className="py-1 px-1 border-r border-black">1</td>
                        <td className="py-1 px-1.5 border-r border-black text-right">{taxableExtraCharges.toFixed(2)}</td>
                        <td className="py-1 px-1.5 border-r border-black text-right">{taxableExtraCharges.toFixed(2)}</td>
                        <td className="py-1 px-1.5 border-r border-black text-right">0.00</td>
                        <td className="py-1 px-1.5 border-r border-black text-right">{taxableExtraCharges.toFixed(2)}</td>
                        <td className="py-1 px-1.5 border-r border-black text-right leading-tight">
                          <div>{extraSgst.toFixed(2)}</div>
                          <div className="text-[9px] text-gray-700">{(gstRate / 2).toFixed(2)}%</div>
                        </td>
                        <td className="py-1 px-1.5 border-r border-black text-right leading-tight">
                          <div>{extraCgst.toFixed(2)}</div>
                          <div className="text-[9px] text-gray-700">{(gstRate / 2).toFixed(2)}%</div>
                        </td>
                        <td className="py-1 px-1.5 border-r border-black text-right leading-tight">
                          <div>0.00</div>
                          <div className="text-[9px] text-gray-700">0.00%</div>
                        </td>
                        <td className="py-1 px-1 text-right">0.00</td>
                      </tr>
                    )}

                    {/* Totals Row */}
                    <tr className="font-bold border-t border-black">
                      <td className="py-1 px-1 border-r border-black"></td>
                      <td className="py-1 px-2 border-r border-black text-left">Total</td>
                      <td className="py-1 px-1 border-r border-black"></td>
                      <td className="py-1 px-1 border-r border-black"></td>
                      <td className="py-1 px-1.5 border-r border-black text-right">{totalCharges.toFixed(2)}</td>
                      <td className="py-1 px-1.5 border-r border-black text-right">{totalCharges.toFixed(2)}</td>
                      <td className="py-1 px-1.5 border-r border-black text-right">{discount.toFixed(2)}</td>
                      <td className="py-1 px-1.5 border-r border-black text-right">{totalCharges.toFixed(2)}</td>
                      <td className="py-1 px-1.5 border-r border-black text-right">{totalSgst.toFixed(2)}</td>
                      <td className="py-1 px-1.5 border-r border-black text-right">{totalCgst.toFixed(2)}</td>
                      <td className="py-1 px-1.5 border-r border-black text-right">0.00</td>
                      <td className="py-1 px-1 text-right">0.00</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Lower Split Section (Left: TotalPayableAmount + Payment Table; Right: Summary Ledger Box) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 text-xs border border-t-0 border-black">
                {/* Left Half: Words & Payment Breakdown */}
                <div className="p-2 sm:border-r sm:border-black flex flex-col justify-between">
                  <div className="border border-black p-2 mb-2">
                    <div className="font-bold text-xs">TotalPayableAmount</div>
                    <div className="text-xs font-medium capitalize mt-1">
                      {amountInWords}
                    </div>
                  </div>

                  {/* Payment Breakdown Table */}
                  <div className="border border-black overflow-hidden mt-1">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-black font-bold">
                          <th className="py-1 px-2 text-left border-r border-black">Payment Date</th>
                          <th className="py-1 px-2 text-left border-r border-black">Description</th>
                          <th className="py-1 px-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-black">
                          <td className="py-1 px-2 border-r border-black">{invoiceDateOnly}</td>
                          <td className="py-1 px-2 border-r border-black font-medium">
                            {currentStay.paymentReference || currentStay.paymentMethod || 'CASH'}
                          </td>
                          <td className="py-1 px-2 text-right font-medium">{totalPaid.toFixed(2)}</td>
                        </tr>
                        <tr className="font-bold">
                          <td colSpan={2} className="py-1 px-2 text-right border-r border-black">Total</td>
                          <td className="py-1 px-2 text-right">{totalPaid.toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right Half: Bordered Ledger Box (Exact lines from photo) */}
                <div className="text-xs">
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr className="border-b border-black">
                        <td className="py-0.5 px-2 font-bold border-r border-black">TotalCharges(Rs):</td>
                        <td className="py-0.5 px-2 text-right font-medium">{totalCharges.toFixed(2)}</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="py-0.5 px-2 font-bold border-r border-black">TotalDiscount(Rs):</td>
                        <td className="py-0.5 px-2 text-right">{discount.toFixed(2)}</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="py-0.5 px-2 font-bold border-r border-black">TotalSGST(Rs):</td>
                        <td className="py-0.5 px-2 text-right">{totalSgst.toFixed(2)}</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="py-0.5 px-2 font-bold border-r border-black">TotalCGST(Rs):</td>
                        <td className="py-0.5 px-2 text-right">{totalCgst.toFixed(2)}</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="py-0.5 px-2 font-bold border-r border-black">TotalIGST(Rs):</td>
                        <td className="py-0.5 px-2 text-right">0.00</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="py-0.5 px-2 font-bold border-r border-black">TotalOtherTax(Rs):</td>
                        <td className="py-0.5 px-2 text-right">0.00</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="py-0.5 px-2 font-bold border-r border-black">TotalBalanceTransfer(Rs):</td>
                        <td className="py-0.5 px-2 text-right">0.00</td>
                      </tr>
                      <tr className="border-b border-black font-bold">
                        <td className="py-0.5 px-2 font-bold border-r border-black">Total(Rs):</td>
                        <td className="py-0.5 px-2 text-right font-bold">{grandTotal.toFixed(2)}</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="py-0.5 px-2 font-bold border-r border-black">FlatDiscount(Rs):</td>
                        <td className="py-0.5 px-2 text-right">{discount.toFixed(2)}</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="py-0.5 px-2 font-bold border-r border-black">Adjustment(Rs):</td>
                        <td className="py-0.5 px-2 text-right">0.00</td>
                      </tr>
                      <tr className="border-b border-black font-bold">
                        <td className="py-0.5 px-2 font-bold border-r border-black">TotalPayable(Rs):</td>
                        <td className="py-0.5 px-2 text-right font-bold">{grandTotal.toFixed(2)}</td>
                      </tr>
                      <tr className="border-b border-black font-bold">
                        <td className="py-0.5 px-2 font-bold border-r border-black">TotalPayment(Rs):</td>
                        <td className="py-0.5 px-2 text-right font-bold">{totalPaid.toFixed(2)}</td>
                      </tr>
                      <tr className="font-bold">
                        <td className="py-0.5 px-2 font-bold border-r border-black">Balance(Rs):</td>
                        <td className="py-0.5 px-2 text-right font-bold">{balanceDue.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Remark Section (Bordered box with blank space below) */}
              <div className="border border-t-0 border-black p-2 min-h-[140px] text-xs">
                <span className="font-bold">Remark: </span>
                <span className="text-black">
                  {customRemark || currentStay.notes || ''}
                </span>
              </div>
            </div>

            {/* Footer: Cashier & Guest Signature (Positioned cleanly at bottom inside border) */}
            <div className="pt-4 border-t border-black flex justify-between items-end text-xs">
              <div className="space-y-1">
                <p>
                  <span className="font-bold">Cashier(C/O)</span>
                  <span className="ml-6 font-semibold">: {currentStay.cashierName || 'madhu'}</span>
                </p>
                <p>
                  <span className="font-bold">Page</span>
                  <span className="ml-16 font-semibold">: Page1of</span>
                </p>
              </div>

              <div className="text-center pb-1">
                <div className="w-56 border-b border-black mb-1"></div>
                <p className="font-bold text-xs">(GuestSignature)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer (Sticky at bottom, hidden on print) */}
        <div className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between px-4 sm:px-6 py-3 bg-gray-50 border-t border-gray-200 print:hidden gap-3 shadow-xs">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Bill for Room {currentStay.roomNumber} ({currentStay.guestName})</span>
            <span>•</span>
            <span className="font-mono">{invoiceNumber}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAadhaarModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition shadow-2xs"
            >
              <Eye size={13} /> View Aadhaar ID
            </button>
            <button
              type="button"
              onClick={() => setShowEditBillModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-telivity-navy hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition"
            >
              <Edit3 size={14} /> Edit Full Bill
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-extrabold shadow-sm transition disabled:opacity-50 cursor-pointer"
              title="Download official Hotel Spark Invoice as a PDF file"
            >
              {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              <span>{downloading ? 'Downloading…' : 'Download Invoice (PDF)'}</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-telivity-teal hover:bg-teal-600 text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Printer size={15} /> Print
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-gray-200 hover:bg-gray-300 text-telivity-navy text-xs font-bold transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Edit Full Bill Modal */}
      {showEditBillModal && (
        <EditBillModal
          stay={currentStay}
          isOpen={showEditBillModal}
          onClose={() => setShowEditBillModal(false)}
          onSave={(updated) => {
            setCurrentStay(updated);
            setShowEditBillModal(false);
            if (onStayUpdated) onStayUpdated(updated);
          }}
          onSaveAndPrint={(updated) => {
            setCurrentStay(updated);
            setShowEditBillModal(false);
            if (onStayUpdated) onStayUpdated(updated);
            setTimeout(() => window.print(), 300);
          }}
        />
      )}

      {/* Aadhaar Viewer Modal */}
      {showAadhaarModal && (
        <AadhaarViewerModal
          open={showAadhaarModal}
          onClose={() => setShowAadhaarModal(false)}
          guest={{
            id: safeId,
            firstName: (currentStay.guestName || 'Guest').split(' ')[0] || 'Guest',
            lastName: (currentStay.guestName || 'Guest').split(' ').slice(1).join(' ') || '',
            idProofType: currentStay.idProofType || 'Aadhaar',
            idProofNumber: currentStay.idProofNumber || 'XXXX XXXX 1234',
            idProofFrontUrl: currentStay.idProofFrontUrl,
            idProofBackUrl: currentStay.idProofBackUrl,
            stateProvince: currentStay.state || 'Telangana',
            idCountry: 'IN',
          }}
          onUpdateGuest={(updated) => {
            if (currentStay) {
              const u = { ...currentStay };
              if (updated.idProofFrontUrl) u.idProofFrontUrl = updated.idProofFrontUrl;
              if (updated.idProofBackUrl) u.idProofBackUrl = updated.idProofBackUrl;
              setCurrentStay(u);
              if (onStayUpdated) onStayUpdated(u);
            }
          }}
        />
      )}
    </div>
  );
}
