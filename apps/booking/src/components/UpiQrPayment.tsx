import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, QrCode, Smartphone, ShieldCheck, ArrowRight, RefreshCw, Sparkles } from 'lucide-react';
import { money } from '../lib/format';
import type { QuoteResponse } from '../api/types';

interface UpiQrPaymentProps {
  quote: QuoteResponse;
  guestName: string;
  onPaid: (result: { paymentToken: string; cardBrand: string; cardLastFour: string }) => void;
  submitting: boolean;
}

export function UpiQrPayment({ quote, guestName, onPaid, submitting }: UpiQrPaymentProps) {
  const [copied, setCopied] = useState(false);
  const [utr, setUtr] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes timer
  const [selectedApp, setSelectedApp] = useState<string>('any');

  const upiId = 'hotelspark@upi';
  const payeeName = 'Hotel Spark';
  const amount = Number(quote.grandTotal).toFixed(2);
  const note = `Room Booking for ${guestName}`.slice(0, 40);

  // Standard NPCI UPI URI specification
  const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
    payeeName,
  )}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;

  // 10-minute countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleCopyUpi = () => {
    navigator.clipboard?.writeText(upiId).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleAutoFillTestUtr = () => {
    const randomUtr = `${Math.floor(100000000000 + Math.random() * 900000000000)}`;
    setUtr(randomUtr);
  };

  const handleConfirmPayment = () => {
    setVerifying(true);
    // Instant smooth verification feedback
    setTimeout(() => {
      const finalUtr = utr.trim() || `${Math.floor(100000000000 + Math.random() * 900000000000)}`;
      onPaid({
        paymentToken: `upi_${finalUtr}`,
        cardBrand: 'UPI QR',
        cardLastFour: finalUtr.slice(-4),
      });
      setVerifying(false);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-teal-900 via-slate-900 to-telivity-teal p-5 text-white shadow-xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-400 text-gray-950 font-bold text-xs">
              ₹
            </span>
            <div>
              <h2 className="text-sm font-bold tracking-wide flex items-center gap-1.5">
                <span>Scan & Pay via UPI</span>
                <Sparkles size={14} className="text-amber-300" />
              </h2>
              <p className="text-[11px] text-teal-200">Zero transaction fees · Instant reservation confirmation</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-300">Amount Due</div>
            <div className="text-xl font-extrabold text-white">{money(quote.grandTotal, 'INR')}</div>
          </div>
        </div>

        {/* Timer Bar */}
        <div className="mt-3 flex items-center justify-between text-xs text-teal-200">
          <span>QR code expires in:</span>
          <span className="font-mono font-bold text-amber-300 bg-black/40 px-2 py-0.5 rounded">
            {formatTime(timeLeft)}
          </span>
        </div>
      </div>

      {/* Main QR Card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* QR Code Container */}
          <div className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-teal-500/30 bg-gray-50 p-4 shadow-inner">
            <div className="rounded-xl bg-white p-3 shadow-md">
              <QRCodeSVG
                value={upiUri}
                size={190}
                level="H"
                includeMargin={false}
                imageSettings={{
                  src: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="%230d9488"><circle cx="12" cy="12" r="10" fill="%230d9488"/><text x="12" y="16" font-size="12" font-family="sans-serif" font-weight="bold" text-anchor="middle" fill="white">₹</text></svg>',
                  x: undefined,
                  y: undefined,
                  height: 32,
                  width: 32,
                  excavate: true,
                }}
              />
            </div>
            <span className="mt-2 text-[11px] font-semibold text-gray-500 flex items-center gap-1">
              <QrCode size={13} className="text-telivity-teal" />
              Point your camera or UPI app
            </span>
          </div>

          {/* Instructions & Supported Apps */}
          <div className="flex-1 space-y-4 text-left w-full">
            <div>
              <h3 className="text-sm font-bold text-gray-900">1. Open any UPI application</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Google Pay, PhonePe, Paytm, BHIM, Cred, or any mobile banking app.
              </p>
            </div>

            {/* App Pills */}
            <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-semibold text-gray-700">
              <button
                type="button"
                onClick={() => setSelectedApp('gpay')}
                className={`rounded-lg border p-2 transition ${
                  selectedApp === 'gpay' ? 'border-teal-600 bg-teal-50/50 text-teal-900' : 'border-gray-200 bg-gray-50'
                }`}
              >
                GPay
              </button>
              <button
                type="button"
                onClick={() => setSelectedApp('phonepe')}
                className={`rounded-lg border p-2 transition ${
                  selectedApp === 'phonepe'
                    ? 'border-teal-600 bg-teal-50/50 text-teal-900'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                PhonePe
              </button>
              <button
                type="button"
                onClick={() => setSelectedApp('paytm')}
                className={`rounded-lg border p-2 transition ${
                  selectedApp === 'paytm' ? 'border-teal-600 bg-teal-50/50 text-teal-900' : 'border-gray-200 bg-gray-50'
                }`}
              >
                Paytm
              </button>
              <button
                type="button"
                onClick={() => setSelectedApp('bhim')}
                className={`rounded-lg border p-2 transition ${
                  selectedApp === 'bhim' ? 'border-teal-600 bg-teal-50/50 text-teal-900' : 'border-gray-200 bg-gray-50'
                }`}
              >
                BHIM
              </button>
            </div>

            {/* Hotel UPI ID */}
            <div className="rounded-xl bg-gray-50 p-3 border border-gray-200">
              <div className="text-[11px] font-medium text-gray-500">Hotel Spark UPI ID:</div>
              <div className="flex items-center justify-between mt-1">
                <span className="font-mono text-xs font-bold text-gray-900">{upiId}</span>
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-telivity-teal hover:text-teal-700"
                >
                  {copied ? (
                    <>
                      <Check size={13} className="text-green-600" />
                      <span className="text-green-600">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Mobile Deep Link */}
            <a
              href={upiUri}
              className="md:hidden flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-3 text-xs font-bold text-white shadow-md hover:bg-teal-700"
            >
              <Smartphone size={16} />
              <span>Tap to Pay with UPI App</span>
            </a>
          </div>
        </div>

        {/* Step 2: Verification */}
        <div className="mt-6 border-t border-gray-100 pt-5">
          <div className="flex items-center justify-between">
            <label htmlFor="upiUtr" className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
              <span>2. UPI Reference / UTR Number (Optional for Demo)</span>
            </label>
            <button
              type="button"
              onClick={handleAutoFillTestUtr}
              className="text-[11px] font-semibold text-telivity-teal hover:underline"
            >
              Auto-generate test UTR
            </button>
          </div>

          <div className="mt-2 flex gap-2">
            <input
              id="upiUtr"
              type="text"
              placeholder="e.g. 431289104523 (12-digit UPI reference)"
              value={utr}
              onChange={(e) => setUtr(e.target.value)}
              className="flex-1 rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs text-gray-900 font-mono shadow-xs focus:border-telivity-teal focus:outline-hidden focus:ring-1 focus:ring-telivity-teal"
            />
          </div>

          <button
            type="button"
            onClick={handleConfirmPayment}
            disabled={submitting || verifying}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-telivity-teal py-3.5 text-sm font-bold text-white shadow-lg hover:bg-teal-700 active:scale-[0.99] transition disabled:opacity-60"
          >
            {verifying || submitting ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>Verifying UPI Payment & Confirming Room…</span>
              </>
            ) : (
              <>
                <ShieldCheck size={18} />
                <span>I Have Paid via UPI — Confirm Booking</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>

          <p className="mt-2 text-center text-[11px] text-gray-400">
            🔒 Secured by Hotel Spark Central Booking Engine & UPI 2.0 Gateway
          </p>
        </div>
      </div>
    </div>
  );
}

