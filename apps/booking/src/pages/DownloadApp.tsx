import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Download,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Info,
  Building2,
  Lock,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const APK_VERSION = 'v1.0.0';
const APK_FILENAME = 'HotelSpark-v1.0.0.apk';
const APK_URL = '/downloads/HotelSpark-v1.0.0.apk';
const APK_RELEASE_DATE = 'November 19, 2026';
const APK_FILE_SIZE = '~5.4 MB';
const APK_MIN_ANDROID = 'Android 7.0 (Nougat) or higher';

export function DownloadApp() {
  const [isIOS, setIsIOS] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  useEffect(() => {
    // Detect iOS devices
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
    if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
      setIsIOS(true);
    }
  }, []);

  const fullDownloadUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${APK_URL}`
    : `https://hotelsparkknr.com${APK_URL}`;

  const handleDownload = () => {
    setDownloadStarted(true);
    const link = document.createElement('a');
    link.href = APK_URL;
    link.download = APK_FILENAME;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-[#0a1926] to-gray-950 text-white selection:bg-teal-500 selection:text-black">
      {/* Top Banner Navigation */}
      <div className="border-b border-white/10 bg-black/40 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-white font-bold tracking-tight hover:opacity-90">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/20 text-teal-400 border border-teal-400/30 text-sm">
              ✨
            </span>
            <span>Hotel Spark</span>
          </Link>
          <div className="flex items-center gap-3 text-xs">
            <Link
              to="/admin/rooms"
              className="text-gray-300 hover:text-white transition px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5"
            >
              Open Web PMS
            </Link>
            <Link
              to="/"
              className="text-teal-400 hover:text-teal-300 font-semibold"
            >
              ← Back to Hotel Site
            </Link>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:py-16">
        {/* iOS Notice Alert */}
        {isIOS && (
          <div className="mb-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 backdrop-blur-md">
            <div className="flex items-start gap-3">
              <AlertCircle size={22} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-amber-300">Apple iOS Device Detected</h3>
                <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                  The downloadable package is an <strong>Android APK file</strong> built for Android smartphones and tablets.
                  On your iPhone or iPad, please access Hotel Spark via your Safari or Chrome browser at{' '}
                  <a href="/admin" className="text-teal-400 underline font-semibold">
                    hotelsparkknr.com/admin
                  </a>{' '}
                  or tap <em>Share &rarr; Add to Home Screen</em> for full-screen PWA access.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Hero Card */}
        <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-gray-900/90 via-gray-900/60 to-teal-950/40 p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-8 border-b border-white/10">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-400 p-0.5 shadow-xl shadow-teal-500/20">
                <div className="w-full h-full bg-gray-950 rounded-[14px] flex items-center justify-center text-teal-400 text-3xl font-extrabold">
                  ⚡
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    Hotel Spark
                  </h1>
                  <span className="rounded-full bg-teal-500/20 border border-teal-400/40 px-2.5 py-0.5 text-[11px] font-bold text-teal-300">
                    Android APK
                  </span>
                </div>
                <p className="text-sm text-gray-300 mt-1">
                  Official Mobile Hotel Management App · Karimnagar
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mt-2">
                  <span>Version {APK_VERSION}</span>
                  <span>•</span>
                  <span>{APK_FILE_SIZE}</span>
                  <span>•</span>
                  <span>{APK_RELEASE_DATE}</span>
                </div>
              </div>
            </div>

            {/* Direct Action Button */}
            <div className="flex flex-col w-full sm:w-auto gap-2">
              <a
                href={APK_URL}
                download={APK_FILENAME}
                onClick={() => setDownloadStarted(true)}
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-gray-950 font-bold text-sm shadow-xl shadow-teal-500/25 transition transform active:scale-95 cursor-pointer text-center"
              >
                <Download size={18} />
                <span>Download APK ({APK_VERSION})</span>
              </a>
              <button
                type="button"
                onClick={() => setShowQRModal(true)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs text-gray-300 transition cursor-pointer"
              >
                <QrCode size={14} className="text-teal-400" />
                <span>Scan QR from Phone</span>
              </button>
              <a
                href={fullDownloadUrl}
                download={APK_FILENAME}
                className="text-center text-[11px] text-teal-400/80 hover:text-teal-300 underline mt-1"
              >
                Direct Mirror Download Link
              </a>
            </div>
          </div>

          {downloadStarted && (
            <div className="mt-4 p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center gap-2.5 text-xs text-teal-300">
              <CheckCircle2 size={16} className="text-teal-400 flex-shrink-0" />
              <span>Download initiated! Check your browser downloads for <strong>{APK_FILENAME}</strong>. Follow the installation steps below.</span>
            </div>
          )}

          {/* Quick Specifications Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6">
            <div className="rounded-xl bg-white/5 border border-white/5 p-3">
              <p className="text-[11px] text-gray-400">Package ID</p>
              <p className="text-xs font-mono font-semibold text-teal-300 truncate mt-0.5">com.hotelspark.management</p>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/5 p-3">
              <p className="text-[11px] text-gray-400">Compatibility</p>
              <p className="text-xs font-semibold text-white mt-0.5">Android 7.0 &amp; Above</p>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/5 p-3">
              <p className="text-[11px] text-gray-400">Security</p>
              <p className="text-xs font-semibold text-emerald-400 mt-0.5 flex items-center gap-1">
                <ShieldCheck size={13} /> Verified Safe
              </p>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/5 p-3">
              <p className="text-[11px] text-gray-400">Architecture</p>
              <p className="text-xs font-semibold text-white mt-0.5">Universal (arm64, x86_64)</p>
            </div>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="mt-10">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Sparkles size={18} className="text-teal-400" />
            <span>What's Inside the Mobile App</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold mb-3">
                🛎️
              </div>
              <h3 className="text-sm font-bold text-white">Live Website Bookings</h3>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                Receive instant notifications when a guest reserves on hotelsparkknr.com. Review stay dates, guest requests, and approve &amp; assign rooms on the go.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold mb-3">
                🏨
              </div>
              <h3 className="text-sm font-bold text-white">28 Rooms Rack &amp; Housekeeping</h3>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                Full 3-floor view (Floors 2, 3, 4). Update room status (Vacant Clean, Occupied, Dirty, Maintenance) and upload room photos directly from your phone camera.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold mb-3">
                ⚡
              </div>
              <h3 className="text-sm font-bold text-white">Walk-In Check-In &amp; ID Upload</h3>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                Complete guest check-ins right from the front desk or reception tablet. Take phone photos of Aadhaar / ID documents with instant cloud sync.
              </p>
            </div>
          </div>
        </div>

        {/* Installation Instructions */}
        <div className="mt-10 rounded-3xl border border-white/15 bg-gray-900/70 p-6 sm:p-8 backdrop-blur-xl">
          <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
            <Smartphone size={18} className="text-teal-400" />
            <span>How to Install on Your Android Phone</span>
          </h2>
          <p className="text-xs text-gray-400 mb-6">
            Since this app is distributed directly from Hotel Spark without Google Play Store middleman fees, follow these 4 simple steps:
          </p>

          <div className="space-y-4">
            <div className="flex items-start gap-4 p-3.5 rounded-2xl bg-white/5 border border-white/5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-500/20 text-teal-400 text-xs font-bold border border-teal-400/30 flex-shrink-0">
                1
              </span>
              <div>
                <h4 className="text-sm font-semibold text-white">Tap "Download APK"</h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  Tap the green download button above. Your browser (Chrome / Edge) will download <code className="text-teal-300 font-mono text-[11px]">HotelSpark-v1.0.0.apk</code>.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-3.5 rounded-2xl bg-white/5 border border-white/5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-500/20 text-teal-400 text-xs font-bold border border-teal-400/30 flex-shrink-0">
                2
              </span>
              <div>
                <h4 className="text-sm font-semibold text-white">Allow "Install Unknown Apps" (If Prompted)</h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  Android will show a safety prompt: <em>"For your security, your phone is not allowed to install unknown apps from this source"</em>. Tap <strong>Settings</strong> &rarr; enable <strong>"Allow from this source"</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-3.5 rounded-2xl bg-white/5 border border-white/5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-500/20 text-teal-400 text-xs font-bold border border-teal-400/30 flex-shrink-0">
                3
              </span>
              <div>
                <h4 className="text-sm font-semibold text-white">Tap "Install"</h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  Tap <strong>Install</strong> on the package installer window. The app will install in seconds.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-3.5 rounded-2xl bg-white/5 border border-white/5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-500/20 text-teal-400 text-xs font-bold border border-teal-400/30 flex-shrink-0">
                4
              </span>
              <div>
                <h4 className="text-sm font-semibold text-white">Open Hotel Spark &amp; Log In</h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  Launch Hotel Spark from your home screen. Log in with your staff, manager, or admin credentials. Your live hotel data will load instantly.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Security & Verification Card */}
        <div className="mt-8 rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-5 flex items-start gap-3">
          <ShieldCheck size={20} className="text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-gray-300 leading-relaxed">
            <span className="font-bold text-emerald-300">Direct &amp; Safe Release:</span> This APK is built directly from Hotel Spark's official source code and connects securely over encrypted TLS/HTTPS to your official Supabase database. It contains zero third-party ads or trackers.
          </div>
        </div>
      </main>

      {/* QR Code Modal for Desktop Scanning */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-white/20 bg-gray-900 p-6 text-center shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Scan to Download on Mobile</h3>
            <p className="text-xs text-gray-400">
              Point your Android phone camera at this QR code to download the Hotel Spark APK directly to your phone.
            </p>
            <div className="mx-auto inline-block p-4 rounded-2xl bg-white shadow-inner">
              <QRCodeSVG value={fullDownloadUrl} size={180} />
            </div>
            <p className="text-[11px] font-mono text-teal-300 break-all px-2">
              {fullDownloadUrl}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowQRModal(false)}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default DownloadApp;
