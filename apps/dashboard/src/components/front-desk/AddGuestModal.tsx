import { useState, useMemo, ChangeEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X,
  UserPlus,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Calendar,
  IndianRupee,
  ShieldCheck,
  DoorOpen,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useProperty } from '../../context/PropertyContext';
import { useToast } from '../ui/Toast';
import { getStoredRooms, type StoredRoom } from '../../lib/supabaseAdapter';

interface AddGuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  preselectedRoomId?: string;
}

export default function AddGuestModal({ isOpen, onClose, onSuccess, preselectedRoomId }: AddGuestModalProps) {
  const { propertyId } = useProperty();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Load rooms to populate available rooms dropdown
  const { data: roomsData } = useQuery({
    queryKey: ['rooms', propertyId],
    queryFn: () => api.get('/v1/rooms', { params: { propertyId } }).then((r) => r.data),
    enabled: !!propertyId,
  });

  const rooms: StoredRoom[] = useMemo(() => {
    const raw = roomsData?.data ?? roomsData;
    if (Array.isArray(raw) && raw.length > 0) return raw;
    return getStoredRooms();
  }, [roomsData]);

  const availableRooms = useMemo(() => {
    return rooms.filter((r) => r.status === 'vacant_clean' || r.status === 'clean' || r.status === 'guest_ready' || r.status === 'available');
  }, [rooms]);

  // Form states
  const [guestName, setGuestName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Karimnagar');
  const [state, setState] = useState('Telangana');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);

  // ID Proof
  const [idProofType, setIdProofType] = useState('Aadhaar Card');
  const [idProofNumber, setIdProofNumber] = useState('');
  const [idProofFrontUrl, setIdProofFrontUrl] = useState('');
  const [idProofBackUrl, setIdProofBackUrl] = useState('');

  // Stay details
  const [selectedRoomNumber, setSelectedRoomNumber] = useState(() => {
    if (preselectedRoomId) {
      const match = rooms.find((r) => r.id === preselectedRoomId || r.number === preselectedRoomId);
      if (match) return match.number;
    }
    return availableRooms[0]?.number || '103';
  });

  const nowStr = useMemo(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }, []);

  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }, []);

  const [checkInTime, setCheckInTime] = useState(nowStr);
  const [expectedCheckoutTime, setExpectedCheckoutTime] = useState(tomorrowStr);
  const [nights, setNights] = useState(1);
  const [pricePerNight, setPricePerNight] = useState<number>(3500);
  const [extraCharges, setExtraCharges] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);

  // Payment
  const [advancePaid, setAdvancePaid] = useState<number>(3500);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Card' | 'Bank Transfer'>('UPI');
  const [notes, setNotes] = useState('');

  // When room is selected, auto-fill room rate
  const handleRoomChange = (roomNum: string) => {
    setSelectedRoomNumber(roomNum);
    const rm = rooms.find((r) => r.number === roomNum);
    if (rm) {
      if (rm.roomTypeName?.includes('Suite') || rm.number.startsWith('2')) {
        setPricePerNight(6500);
        setAdvancePaid(6500 * nights);
      } else if (rm.roomTypeName?.includes('Standard') || rm.number.startsWith('3')) {
        setPricePerNight(2500);
        setAdvancePaid(2500 * nights);
      } else {
        setPricePerNight(3500);
        setAdvancePaid(3500 * nights);
      }
    }
  };

  // Auto calculate nights when dates change
  const handleDatesChange = (inDate: string, outDate: string) => {
    setCheckInTime(inDate);
    setExpectedCheckoutTime(outDate);
    try {
      const diffMs = new Date(outDate).getTime() - new Date(inDate).getTime();
      const diffDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      setNights(diffDays);
      setAdvancePaid(diffDays * pricePerNight);
    } catch {
      setNights(1);
    }
  };

  // Calculations
  const totalAmount = Math.max(0, nights * pricePerNight + (extraCharges || 0) - (discount || 0));
  const remainingBalance = Math.max(0, totalAmount - (advancePaid || 0));
  const paymentStatus = remainingBalance === 0 ? 'paid' : advancePaid > 0 ? 'partially_paid' : 'unpaid';

  // Handle local file upload for ID proof images (converting to base64 for instant preview & secure storage)
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (side === 'front') setIdProofFrontUrl(result);
      if (side === 'back') setIdProofBackUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const checkInMutation = useMutation({
    mutationFn: () => {
      const selectedRoom = rooms.find((r) => r.number === selectedRoomNumber);
      return api.post('/v1/stays/check-in', {
        propertyId,
        guestName: guestName.trim(),
        mobile: mobile.trim(),
        email: email.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        adults,
        children,
        idProofType,
        idProofNumber: idProofNumber.trim(),
        idProofFrontUrl,
        idProofBackUrl,
        roomId: selectedRoom?.id,
        roomNumber: selectedRoomNumber,
        roomTypeName: selectedRoom?.roomTypeName || 'Deluxe King Room',
        checkInTime: new Date(checkInTime).toISOString(),
        expectedCheckoutTime: new Date(expectedCheckoutTime).toISOString(),
        nights,
        pricePerNight,
        extraCharges,
        discount,
        advancePaid,
        paymentMethod,
        notes: notes.trim(),
      });
    },
    onSuccess: () => {
      toast('success', `Guest ${guestName} checked in to Room ${selectedRoomNumber} successfully! Room marked OCCUPIED.`);
      queryClient.invalidateQueries({ queryKey: ['stays'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['rooms', 'status-summary'] });
      queryClient.invalidateQueries({ queryKey: ['staff-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['staff-notifications-unread'] });
      onClose();
      if (onSuccess) onSuccess();
    },
    onError: (err: any) => {
      toast('error', err?.response?.data?.message || 'Failed to complete check-in. Please check the inputs.');
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden my-6 border border-gray-100 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-telivity-navy text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-telivity-teal text-white">
              <UserPlus size={20} />
            </div>
            <div>
              <h2 className="font-bold text-base tracking-wide">ADD NEW GUEST — WALK-IN CHECK-IN</h2>
              <p className="text-xs text-white/70">Register guest, upload ID proof, assign room & collect advance</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {/* Section 1: Guest Personal Details */}
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-telivity-navy flex items-center gap-1.5 mb-3 border-b border-gray-100 pb-2">
              <UserPlus size={14} className="text-telivity-teal" /> 1. Guest Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-[11px] font-semibold text-telivity-slate mb-1">
                  Guest Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-telivity-teal text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-telivity-slate mb-1">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="+91 98490 00000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-telivity-teal text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-telivity-slate mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="guest@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-telivity-teal text-xs"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-semibold text-telivity-slate mb-1">Street Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="House/Flat number, Street, Landmark"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-telivity-teal text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-telivity-slate mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-telivity-teal text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-telivity-slate mb-1">State</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-telivity-teal text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-telivity-slate mb-1">Adults</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={adults}
                    onChange={(e) => setAdults(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-telivity-teal text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-telivity-slate mb-1">Children</label>
                  <input
                    type="number"
                    min="0"
                    max="6"
                    value={children}
                    onChange={(e) => setChildren(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-telivity-teal text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: ID & Address Proof Upload */}
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-telivity-navy flex items-center gap-1.5 mb-3 border-b border-gray-100 pb-2">
              <ShieldCheck size={14} className="text-telivity-teal" /> 2. Identity & Address Proof (Mandatory for Hotel Register)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[11px] font-semibold text-telivity-slate mb-1">ID Proof Document Type</label>
                <select
                  value={idProofType}
                  onChange={(e) => setIdProofType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-telivity-teal text-xs font-medium"
                >
                  <option value="Aadhaar Card">Aadhaar Card (UIDAI)</option>
                  <option value="Passport">Passport (Indian / International)</option>
                  <option value="Driving License">Driving License (RTO)</option>
                  <option value="Voter ID">Voter ID Card (Election Commission)</option>
                  <option value="PAN Card">PAN Card (Income Tax)</option>
                  <option value="Other Govt ID">Other Govt Photo ID</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-telivity-slate mb-1">ID Document Number</label>
                <input
                  type="text"
                  value={idProofNumber}
                  onChange={(e) => setIdProofNumber(e.target.value)}
                  placeholder="e.g. 4512 8901 2345"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-telivity-teal text-xs font-mono"
                />
              </div>
            </div>

            {/* Front & Back Upload Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Front Side */}
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-3 text-center bg-gray-50/50 hover:bg-gray-50 transition">
                <span className="block font-semibold text-xs text-telivity-navy mb-1.5">ID Proof — FRONT Photo</span>
                {idProofFrontUrl ? (
                  <div className="relative group">
                    <img src={idProofFrontUrl} alt="ID Front" className="h-28 w-full object-cover rounded-lg border border-gray-200" />
                    <button
                      type="button"
                      onClick={() => setIdProofFrontUrl('')}
                      className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-md text-[10px] shadow-sm hover:bg-red-700"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-28 cursor-pointer rounded-lg hover:border-telivity-teal">
                    <Upload size={22} className="text-telivity-mid-grey mb-1" />
                    <span className="text-xs font-medium text-telivity-teal">Upload Front Image</span>
                    <span className="text-[10px] text-telivity-mid-grey mt-0.5">JPG, PNG, WebP up to 5MB</span>
                    <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'front')} className="hidden" />
                  </label>
                )}
              </div>

              {/* Back Side */}
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-3 text-center bg-gray-50/50 hover:bg-gray-50 transition">
                <span className="block font-semibold text-xs text-telivity-navy mb-1.5">ID Proof — BACK Photo</span>
                {idProofBackUrl ? (
                  <div className="relative group">
                    <img src={idProofBackUrl} alt="ID Back" className="h-28 w-full object-cover rounded-lg border border-gray-200" />
                    <button
                      type="button"
                      onClick={() => setIdProofBackUrl('')}
                      className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-md text-[10px] shadow-sm hover:bg-red-700"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-28 cursor-pointer rounded-lg hover:border-telivity-teal">
                    <Upload size={22} className="text-telivity-mid-grey mb-1" />
                    <span className="text-xs font-medium text-telivity-teal">Upload Back Image</span>
                    <span className="text-[10px] text-telivity-mid-grey mt-0.5">JPG, PNG, WebP up to 5MB</span>
                    <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'back')} className="hidden" />
                  </label>
                )}
              </div>
            </div>
            <p className="text-[10px] text-telivity-mid-grey mt-1.5">
              * Documents are securely held and visible only to authorized hotel front office staff.
            </p>
          </div>

          {/* Section 3: Room Selection & Stay Details */}
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-telivity-navy flex items-center gap-1.5 mb-3 border-b border-gray-100 pb-2">
              <DoorOpen size={14} className="text-telivity-teal" /> 3. Room Assignment & Stay Duration
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-telivity-slate mb-1">
                  Assign Room <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedRoomNumber}
                  onChange={(e) => handleRoomChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-telivity-teal text-xs font-bold text-telivity-navy"
                >
                  <optgroup label="Available Rooms (Vacant & Clean)">
                    {availableRooms.map((r) => (
                      <option key={r.id} value={r.number}>
                        Room {r.number} — {r.roomTypeName || 'Deluxe King'} (Floor {r.floor || '1'})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Unavailable Rooms (Occupied / Dirty)">
                    {rooms
                      .filter((r) => r.status !== 'vacant_clean' && r.status !== 'clean' && r.status !== 'guest_ready' && r.status !== 'available')
                      .map((r) => (
                        <option key={r.id} value={r.number} disabled className="text-gray-400 bg-gray-100">
                          Room {r.number} ({r.status.replace(/_/g, ' ').toUpperCase()} — Not Available)
                        </option>
                      ))}
                  </optgroup>
                </select>
                {availableRooms.length === 0 && (
                  <p className="text-[10px] text-red-500 mt-1 font-semibold">No clean rooms currently available!</p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-telivity-slate mb-1">Check-In Date & Time</label>
                <input
                  type="datetime-local"
                  value={checkInTime}
                  onChange={(e) => handleDatesChange(e.target.value, expectedCheckoutTime)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-telivity-teal text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-telivity-slate mb-1">Expected Check-Out Date & Time</label>
                <input
                  type="datetime-local"
                  value={expectedCheckoutTime}
                  onChange={(e) => handleDatesChange(checkInTime, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-telivity-teal text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-telivity-slate mb-1">Number of Nights</label>
                <input
                  type="number"
                  min="1"
                  value={nights}
                  onChange={(e) => {
                    const n = Math.max(1, Number(e.target.value));
                    setNights(n);
                    setAdvancePaid(n * pricePerNight);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-telivity-teal text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-telivity-slate mb-1">Room Price / Night (₹)</label>
                <input
                  type="number"
                  value={pricePerNight}
                  onChange={(e) => {
                    const p = Number(e.target.value);
                    setPricePerNight(p);
                    setAdvancePaid(nights * p);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-telivity-teal text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-telivity-slate mb-1">Additional Charges (₹)</label>
                <input
                  type="number"
                  value={extraCharges}
                  onChange={(e) => setExtraCharges(Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-telivity-teal text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Billing & Advance Payment */}
          <div className="bg-telivity-teal/5 border border-telivity-teal/20 rounded-xl p-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-telivity-navy flex items-center gap-1.5 mb-3">
              <IndianRupee size={14} className="text-telivity-teal" /> 4. Billing & Advance Payment
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-[11px] font-semibold text-telivity-slate mb-1">Total Bill Calculation (₹)</label>
                <div className="p-2.5 bg-white border border-gray-300 rounded-lg text-sm font-bold text-telivity-navy">
                  ₹{totalAmount.toLocaleString('en-IN')}
                  <span className="block text-[10px] text-telivity-mid-grey font-normal mt-0.5">
                    ({nights} nights × ₹{pricePerNight} + ₹{extraCharges} extra - ₹{discount} disc)
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-telivity-slate mb-1">
                  Advance Paid Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={advancePaid}
                  onChange={(e) => setAdvancePaid(Number(e.target.value))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-telivity-teal text-sm font-bold text-emerald-700 bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-telivity-slate mb-1">Advance Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-telivity-teal text-xs font-semibold text-telivity-navy bg-white"
                >
                  <option value="UPI">UPI (GPay / PhonePe / Paytm / QR)</option>
                  <option value="Cash">Cash (Front Desk)</option>
                  <option value="Card">Credit / Debit Card</option>
                  <option value="Bank Transfer">Bank Transfer / IMPS / NEFT</option>
                </select>
              </div>
            </div>

            {/* Quick summary strip */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-telivity-teal/20 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-telivity-mid-grey">Remaining Balance:</span>
                <span className={`font-bold text-sm ${remainingBalance > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                  ₹{remainingBalance.toLocaleString('en-IN')}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    paymentStatus === 'paid'
                      ? 'bg-emerald-100 text-emerald-800'
                      : paymentStatus === 'partially_paid'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {paymentStatus.replace('_', ' ')}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAdvancePaid(totalAmount)}
                  className="px-2.5 py-1 text-[11px] bg-white border border-telivity-teal/40 rounded-lg font-medium text-telivity-teal hover:bg-telivity-teal/10 transition"
                >
                  100% Full Payment
                </button>
                <button
                  type="button"
                  onClick={() => setAdvancePaid(Math.round(totalAmount / 2))}
                  className="px-2.5 py-1 text-[11px] bg-white border border-gray-300 rounded-lg font-medium text-telivity-slate hover:bg-gray-100 transition"
                >
                  50% Advance
                </button>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-semibold text-telivity-slate mb-1">Special Requests / Front Desk Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Extra pillows requested, Corporate billing, Late checkout discussed"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-telivity-teal text-xs"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-telivity-slate hover:bg-gray-100 transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => checkInMutation.mutate()}
            disabled={checkInMutation.isPending || !guestName.trim() || !mobile.trim() || !selectedRoomNumber}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-telivity-teal hover:bg-telivity-light-teal text-white text-xs font-bold shadow-md transition disabled:opacity-50"
          >
            {checkInMutation.isPending ? (
              'Checking In...'
            ) : (
              <>
                <CheckCircle2 size={16} /> Complete Check-In & Assign Room {selectedRoomNumber}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
