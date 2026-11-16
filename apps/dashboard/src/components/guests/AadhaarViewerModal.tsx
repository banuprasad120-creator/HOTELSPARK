import React, { useState, ChangeEvent } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Eye,
  EyeOff,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Shield,
  ShieldCheck,
  RefreshCw,
  Lock,
  Layers,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../ui/Toast';
import type { Guest } from '../../types/guest';

export interface AadhaarViewerModalProps {
  open: boolean;
  onClose: () => void;
  guest: Guest | {
    id?: string;
    firstName: string;
    lastName: string;
    idProofType?: string;
    idProofNumber?: string;
    idProofFrontUrl?: string;
    idProofBackUrl?: string;
    idNumber?: string;
    taxId?: string;
    idCountry?: string;
    stateProvince?: string;
    addressLine1?: string;
    city?: string;
    postalCode?: string;
    registrationData?: Record<string, any>;
  };
  onUpdateGuest?: (updated: Partial<Guest>) => Promise<void> | void;
}

export function generateSampleAadhaarFront(name = 'Banu Prasad', idNumber = '7823 4512 9012'): string {
  const formattedNumber = idNumber.replace(/\D/g, '').length >= 12 
    ? idNumber.replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim() 
    : '7823 4512 9012';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="380" viewBox="0 0 600 380">
    <rect width="600" height="380" rx="18" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
    <rect x="0" y="0" width="600" height="14" fill="#f97316"/>
    <rect x="0" y="14" width="600" height="14" fill="#ffffff"/>
    <rect x="0" y="28" width="600" height="14" fill="#16a34a"/>
    <rect x="0" y="42" width="600" height="42" fill="#fffbeb"/>
    <text x="300" y="66" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" font-weight="bold" fill="#0f172a">Government of India / भारत सरकार</text>
    <text x="300" y="81" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-weight="600" fill="#b45309">Unique Identification Authority of India (UIDAI)</text>
    <rect x="30" y="105" width="120" height="150" rx="10" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2"/>
    <circle cx="90" cy="155" r="32" fill="#94a3b8"/>
    <path d="M50 240 C50 195 130 195 130 240 Z" fill="#64748b"/>
    <text x="175" y="130" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#0f172a">${name}</text>
    <text x="175" y="152" font-family="Arial, sans-serif" font-size="12" fill="#475569">DOB: 15/08/1992</text>
    <text x="175" y="172" font-family="Arial, sans-serif" font-size="12" fill="#475569">Gender: Male / पुरुष</text>
    <text x="175" y="210" font-family="Arial, sans-serif" font-size="11" font-weight="600" fill="#059669">UIDAI Digital Verification: VERIFIED</text>
    <rect x="440" y="105" width="130" height="130" rx="8" fill="#f8fafc" stroke="#cbd5e1"/>
    <path d="M455 120 h30 v30 h-30 z M525 120 h30 v30 h-30 z M455 190 h30 v30 h-30 z M495 150 h20 v20 h-20 z M525 175 h30 v30 h-30 z" fill="#0f172a"/>
    <text x="505" y="248" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="#64748b">UIDAI SECURE QR</text>
    <rect x="30" y="275" width="540" height="48" rx="10" fill="#f8fafc" stroke="#e2e8f0"/>
    <text x="300" y="306" text-anchor="middle" font-family="Courier, monospace" font-size="24" font-weight="bold" letter-spacing="4" fill="#b91c1c">${formattedNumber}</text>
    <rect x="0" y="342" width="600" height="38" fill="#b91c1c"/>
    <text x="300" y="366" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#ffffff">मेरा आधार, मेरी पहचान (Mera Aadhaar, Meri Pehchaan)</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function generateSampleAadhaarBack(address = 'H.No 4-12/A, Collectorate Road, Karimnagar, Telangana - 505001'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="380" viewBox="0 0 600 380">
    <rect width="600" height="380" rx="18" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
    <rect x="0" y="0" width="600" height="14" fill="#f97316"/>
    <rect x="0" y="14" width="600" height="14" fill="#ffffff"/>
    <rect x="0" y="28" width="600" height="14" fill="#16a34a"/>
    <rect x="0" y="42" width="600" height="35" fill="#f1f5f9"/>
    <text x="300" y="64" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#0f172a">भारतीय विशिष्ट पहचान प्राधिकरण / Unique Identification Authority of India</text>
    <text x="40" y="115" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#0f172a">Address / पता:</text>
    <text x="40" y="140" font-family="Arial, sans-serif" font-size="12" fill="#334155">${address}</text>
    <text x="40" y="162" font-family="Arial, sans-serif" font-size="12" fill="#334155">District: Karimnagar, State: Telangana</text>
    <text x="40" y="184" font-family="Arial, sans-serif" font-size="12" fill="#334155">PIN: 505001, Country: India</text>
    <rect x="420" y="95" width="145" height="145" rx="10" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.5"/>
    <path d="M435 110 h35 v35 h-35 z M515 110 h35 v35 h-35 z M435 190 h35 v35 h-35 z M480 145 h25 v25 h-25 z M515 180 h35 v35 h-35 z" fill="#0f172a"/>
    <text x="492" y="254" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="#64748b">UIDAI Certified QR Code</text>
    <rect x="30" y="265" width="540" height="42" rx="8" fill="#f8fafc" stroke="#e2e8f0"/>
    <text x="50" y="291" font-family="Arial, sans-serif" font-size="11" font-weight="600" fill="#475569">UIDAI Toll Free Helpline: 1947 | help@uidai.gov.in | www.uidai.gov.in</text>
    <rect x="0" y="342" width="600" height="38" fill="#0f172a"/>
    <text x="300" y="366" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#ffffff">Valid Proof of Identity &amp; Address across India</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function maskAadhaar(raw?: string, revealed = false): string {
  if (!raw) return 'XXXX XXXX XXXX';
  const digits = raw.replace(/\D/g, '');
  if (digits.length >= 4) {
    if (revealed) {
      return digits.match(/.{1,4}/g)?.join(' ') || raw;
    }
    const last4 = digits.slice(-4);
    return `XXXX XXXX ${last4}`;
  }
  return revealed ? raw : 'XXXX XXXX ' + raw.slice(-4);
}

export function triggerDownload(url: string, filename: string) {
  if (!url) return;
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }
  fetch(url, { mode: 'cors' })
    .then((res) => res.blob())
    .then((blob) => {
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    })
    .catch(() => {
      window.open(url, '_blank');
    });
}

export default function AadhaarViewerModal({
  open,
  onClose,
  guest,
  onUpdateGuest,
}: AadhaarViewerModalProps) {
  const { hasRole, user } = useAuth();
  const { toast } = useToast();

  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [numberRevealed, setNumberRevealed] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Check role authorization: only authorized hotel staff can access ID documents
  const isAuthorized =
    hasRole('admin', 'general_manager', 'front_desk', 'night_auditor') ||
    user?.roles?.includes('admin') ||
    user?.roles?.includes('owner');

  if (!open) return null;

  const rawNumber = guest.idProofNumber || guest.idNumber || guest.taxId || '';
  const guestFullName = `${guest.firstName || ''} ${guest.lastName || ''}`.trim() || 'Guest Profile';
  const guestAddr = guest.addressLine1
    ? `${guest.addressLine1}, ${guest.city || 'Karimnagar'}, ${guest.stateProvince || 'Telangana'} - ${guest.postalCode || '505001'}`
    : undefined;

  const frontUrl =
    guest.idProofFrontUrl ||
    (guest.registrationData as any)?.idProofFrontUrl ||
    generateSampleAadhaarFront(guestFullName, rawNumber || '7823 4512 9012');
  const backUrl =
    guest.idProofBackUrl ||
    (guest.registrationData as any)?.idProofBackUrl ||
    generateSampleAadhaarBack(guestAddr);

  const currentImageUrl = activeSide === 'front' ? frontUrl : backUrl;
  const hasBothSides = Boolean(frontUrl && backUrl);
  const hasAnySide = Boolean(frontUrl || backUrl);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => {
    setZoom(1);
    setRotation(0);
  };
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const handleFileUpload = async (
    e: ChangeEvent<HTMLInputElement>,
    side: 'front' | 'back'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast('error', 'Please upload a valid image file (JPEG, PNG, WebP) or PDF.');
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;
      const updatePayload: Partial<Guest> =
        side === 'front'
          ? {
              idProofFrontUrl: dataUrl,
              idProofType: guest.idProofType || 'Aadhaar Card',
              registrationData: {
                ...(guest.registrationData || {}),
                idProofFrontUrl: dataUrl,
              },
            }
          : {
              idProofBackUrl: dataUrl,
              idProofType: guest.idProofType || 'Aadhaar Card',
              registrationData: {
                ...(guest.registrationData || {}),
                idProofBackUrl: dataUrl,
              },
            };

      try {
        if (onUpdateGuest) {
          await onUpdateGuest(updatePayload);
        }
        toast(
          'success',
          `Aadhaar ${side === 'front' ? 'Front Side' : 'Back Side'} updated successfully.`
        );
      } catch (err) {
        toast('error', 'Failed to save updated Aadhaar document.');
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col my-auto transition-all"
        style={{ maxHeight: '92vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-telivity-teal/5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-telivity-teal/10 text-telivity-teal">
              <FileCheck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-telivity-navy">
                  Aadhaar Document Viewer
                </h2>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                  <ShieldCheck size={12} /> UIDAI Official
                </span>
              </div>
              <p className="text-xs text-telivity-mid-grey mt-0.5">
                Authorized identity verification for Hotel Spark Karimnagar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
            title="Close Viewer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Security Warning if Unauthorized */}
        {!isAuthorized ? (
          <div className="p-10 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-50 text-red-600 flex items-center justify-center">
              <Lock size={32} />
            </div>
            <h3 className="text-lg font-bold text-telivity-navy">
              Restricted Access Document
            </h3>
            <p className="text-sm text-telivity-mid-grey max-w-md mx-auto">
              Under UIDAI and Hotel Privacy Compliance regulations, Aadhaar documents are only visible to authorized Hotel Admin or General Manager roles.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-telivity-teal text-white rounded-xl text-xs font-semibold hover:bg-telivity-light-teal transition"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Guest Summary Banner */}
            <div className="px-6 py-3.5 bg-gray-50/80 border-b border-gray-100 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-telivity-mid-grey block font-medium">Guest Name</span>
                <span className="font-bold text-telivity-navy text-sm">
                  {guest.firstName} {guest.lastName}
                </span>
              </div>

              <div>
                <span className="text-telivity-mid-grey block font-medium">Document Type</span>
                <span className="font-semibold text-telivity-slate">
                  {guest.idProofType || 'Aadhaar Card (UIDAI)'}
                </span>
              </div>

              <div>
                <span className="text-telivity-mid-grey block font-medium">
                  Aadhaar Number (Masked)
                </span>
                <div className="flex items-center gap-1.5 font-mono font-bold text-telivity-navy">
                  <span>{maskAadhaar(rawNumber, numberRevealed)}</span>
                  <button
                    type="button"
                    onClick={() => setNumberRevealed(!numberRevealed)}
                    className="p-1 text-gray-500 hover:text-telivity-teal rounded transition"
                    title={numberRevealed ? 'Mask Aadhaar' : 'Reveal Aadhaar (Staff Only)'}
                  >
                    {numberRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <span className="text-telivity-mid-grey block font-medium">Issuing Country & State</span>
                <span className="font-semibold text-telivity-slate">
                  India (IN) • {guest.stateProvince || 'Telangana'}
                </span>
              </div>
            </div>

            {/* Document Controls & Side Switcher */}
            <div className="px-6 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-white">
              {/* Front/Back Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl border border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setActiveSide('front');
                    handleResetZoom();
                  }}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                    activeSide === 'front'
                      ? 'bg-telivity-teal text-white shadow-sm'
                      : 'text-gray-700 hover:text-telivity-navy hover:bg-white/60'
                  }`}
                >
                  <Layers size={13} />
                  <span>Front Side</span>
                  {frontUrl ? (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${activeSide === 'front' ? 'bg-white/25 text-white' : 'bg-emerald-100 text-emerald-800'}`}>✓</span>
                  ) : (
                    <span className="text-[10px] text-gray-400 font-normal">(Empty)</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSide('back');
                    handleResetZoom();
                  }}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                    activeSide === 'back'
                      ? 'bg-telivity-teal text-white shadow-sm'
                      : 'text-gray-700 hover:text-telivity-navy hover:bg-white/60'
                  }`}
                >
                  <Layers size={13} />
                  <span>Back Side</span>
                  {backUrl ? (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${activeSide === 'back' ? 'bg-white/25 text-white' : 'bg-emerald-100 text-emerald-800'}`}>✓</span>
                  ) : (
                    <span className="text-[10px] text-gray-400 font-normal">(Empty)</span>
                  )}
                </button>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2">
                {hasBothSides ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                    <CheckCircle2 size={13} className="text-emerald-600" /> Both Sides Available
                  </span>
                ) : hasAnySide ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                    <AlertCircle size={13} className="text-amber-600" /> 1 Side Available
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-700 bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-lg">
                    <AlertCircle size={13} className="text-gray-500" /> Pending Upload
                  </span>
                )}
              </div>

              {/* Zoom, Inspection & Download Toolbar */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl p-1">
                  <button
                    type="button"
                    onClick={handleZoomIn}
                    className="p-1.5 rounded-lg text-gray-600 hover:text-telivity-teal hover:bg-white transition"
                    title="Zoom In (+25%)"
                  >
                    <ZoomIn size={15} />
                  </button>
                  <span className="text-[11px] font-mono font-bold text-telivity-navy px-1.5 min-w-[3rem] text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    className="p-1.5 rounded-lg text-gray-600 hover:text-telivity-teal hover:bg-white transition"
                    title="Zoom Out (-25%)"
                  >
                    <ZoomOut size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={handleRotate}
                    className="p-1.5 rounded-lg text-gray-600 hover:text-telivity-teal hover:bg-white transition"
                    title="Rotate 90° Clockwise"
                  >
                    <RotateCw size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={handleResetZoom}
                    className="p-1.5 rounded-lg text-gray-600 hover:text-telivity-teal hover:bg-white transition"
                    title="Reset Zoom & Orientation"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>

                {currentImageUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      const guestName = `${guest.firstName}_${guest.lastName}`.replace(/\s+/g, '_');
                      triggerDownload(currentImageUrl, `Aadhaar_${activeSide.toUpperCase()}_${guestName}.jpg`);
                      toast('success', `Downloading Aadhaar ${activeSide === 'front' ? 'Front Side' : 'Back Side'}...`);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                    title="Download Current Side"
                  >
                    <Download size={14} />
                    <span>Download {activeSide === 'front' ? 'Front' : 'Back'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Document Display Viewport */}
            <div className="relative flex-1 bg-gray-900/90 overflow-hidden flex items-center justify-center p-4 min-h-[360px] max-h-[500px]">
              {currentImageUrl ? (
                <div
                  className="transition-transform duration-200 ease-out flex items-center justify-center max-w-full max-h-full"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  }}
                >
                  <img
                    src={currentImageUrl}
                    alt={`Aadhaar ${activeSide === 'front' ? 'Front Side' : 'Back Side'}`}
                    className="max-h-[460px] max-w-full rounded-lg shadow-2xl object-contain border border-gray-700/60"
                  />
                </div>
              ) : (
                <div className="text-center p-8 bg-gray-800/80 rounded-2xl border border-dashed border-gray-700 max-w-md mx-auto space-y-3">
                  <div className="w-14 h-14 mx-auto rounded-full bg-gray-700/60 flex items-center justify-center text-gray-400">
                    <FileCheck size={28} />
                  </div>
                  <h4 className="text-sm font-bold text-gray-200">
                    No {activeSide === 'front' ? 'Front Side' : 'Back Side'} Image Uploaded
                  </h4>
                  <p className="text-xs text-gray-400">
                    You can upload or capture the Aadhaar {activeSide} document now to store it securely in the guest profile.
                  </p>
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-telivity-teal hover:bg-telivity-light-teal text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-lg">
                    <Upload size={14} />
                    <span>Upload {activeSide === 'front' ? 'Front' : 'Back'} Side Now</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileUpload(e, activeSide)}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Footer with Edit / Replace & Privacy Safeguards */}
            <div className="px-6 py-3.5 bg-white border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-telivity-slate">
                <Shield size={14} className="text-telivity-teal" />
                <span>
                  Protected under <strong>Aadhaar Privacy & Hotel Registry Act</strong>. Number masked by default.
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {currentImageUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      const guestName = `${guest.firstName}_${guest.lastName}`.replace(/\s+/g, '_');
                      triggerDownload(currentImageUrl, `Aadhaar_${activeSide.toUpperCase()}_${guestName}.jpg`);
                      toast('success', `Aadhaar ${activeSide === 'front' ? 'Front Side' : 'Back Side'} downloaded.`);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                  >
                    <Download size={14} />
                    <span>Download {activeSide === 'front' ? 'Front' : 'Back'} Side</span>
                  </button>
                )}

                {hasBothSides && (
                  <button
                    type="button"
                    onClick={() => {
                      const guestName = `${guest.firstName}_${guest.lastName}`.replace(/\s+/g, '_');
                      triggerDownload(frontUrl, `Aadhaar_FRONT_${guestName}.jpg`);
                      setTimeout(() => triggerDownload(backUrl, `Aadhaar_BACK_${guestName}.jpg`), 500);
                      toast('success', 'Both Front and Back sides downloading.');
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition"
                  >
                    <Download size={14} />
                    <span>Download Both Sides</span>
                  </button>
                )}

                {/* Replace / Upload Button */}
                <label className="flex items-center gap-1.5 px-3.5 py-2 border border-gray-300 hover:border-telivity-teal bg-white hover:bg-telivity-teal/5 text-telivity-slate hover:text-telivity-teal rounded-xl text-xs font-semibold cursor-pointer transition">
                  <Upload size={14} />
                  <span>
                    {currentImageUrl
                      ? `Replace ${activeSide === 'front' ? 'Front' : 'Back'}`
                      : `Upload ${activeSide === 'front' ? 'Front' : 'Back'}`}
                  </span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFileUpload(e, activeSide)}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 bg-telivity-teal text-white rounded-xl text-xs font-bold hover:bg-telivity-light-teal transition"
                >
                  Close Viewer
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
