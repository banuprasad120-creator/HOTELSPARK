import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  DoorOpen,
  Calendar,
  CheckCircle2,
  Printer,
  FileText,
  DollarSign,
  AlertCircle,
  Sparkles,
  QrCode,
  Building2,
  Banknote,
  X,
  Upload,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useProperty } from '../../context/PropertyContext';
import { formatMoney } from '../../lib/money';
import Modal from '../ui/Modal';

interface WalkInCheckInModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface RoomItem {
  id: string;
  number: string;
  floor: string;
  status: string;
  roomTypeId: string;
}

interface RoomTypeItem {
  id: string;
  name: string;
  code: string;
  baseRate?: number;
  basePrice?: number;
  baseAmount?: number;
  price?: number;
}

function getRoomTypeRate(rt?: RoomTypeItem): number {
  if (!rt) return 3500;
  if (rt.basePrice && !isNaN(Number(rt.basePrice))) return Number(rt.basePrice);
  if (rt.price && !isNaN(Number(rt.price))) return Number(rt.price);
  if (rt.baseRate && !isNaN(Number(rt.baseRate))) return Number(rt.baseRate);
  if (rt.baseAmount && !isNaN(Number(rt.baseAmount))) return Number(rt.baseAmount);
  return rt.code === 'SUT' || rt.name.includes('Suite') ? 6500 : rt.code === 'STD' || rt.name.includes('Standard') ? 2500 : 3500;
}

export default function WalkInCheckInModal({ open, onClose, onSuccess }: WalkInCheckInModalProps) {
  const { propertyId, currencyCode } = useProperty();
  const queryClient = useQueryClient();

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [idProofType, setIdProofType] = useState('Aadhaar Card');
  const [idProofNumber, setIdProofNumber] = useState('');
  const [idProofFrontUrl, setIdProofFrontUrl] = useState('');
  const [idProofBackUrl, setIdProofBackUrl] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      if (side === 'front') setIdProofFrontUrl(result);
      if (side === 'back') setIdProofBackUrl(result);
    };
    reader.readAsDataURL(file);
  };

  // Stay State
  const nowStr = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const [checkInDate, setCheckInDate] = useState(nowStr);
  const [checkOutDate, setCheckOutDate] = useState(tomorrowStr);
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');

  // Payment State
  const [roomRatePerNight, setRoomRatePerNight] = useState(3500);
  const [advancePaid, setAdvancePaid] = useState(3500);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'bank_transfer'>('upi');
  const [paymentReference, setPaymentReference] = useState('');

  // Confirmation View State
  const [confirmedBooking, setConfirmedBooking] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch Room Types
  const { data: roomTypes = [] } = useQuery<RoomTypeItem[]>({
    queryKey: ['room-types', propertyId],
    queryFn: async () => {
      const res = await api.get('/v1/room-types', { params: { propertyId } });
      return res.data;
    },
    enabled: open,
  });

  // Fetch Available Rooms
  const { data: rooms = [] } = useQuery<RoomItem[]>({
    queryKey: ['rooms', propertyId],
    queryFn: async () => {
      const res = await api.get('/v1/rooms', { params: { propertyId } });
      return res.data;
    },
    enabled: open,
  });

  // Filter available rooms
  const availableRooms = rooms.filter(
    (r) =>
      r.status === 'vacant_clean' &&
      (!selectedRoomTypeId || r.roomTypeId === selectedRoomTypeId),
  );

  // Calculate nights
  const nights = Math.max(
    1,
    Math.round(
      (new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) /
        (1000 * 60 * 60 * 24),
    ),
  );

  const roomTotal = roomRatePerNight * nights;
  const taxes = Math.round(roomTotal * 0.12); // 12% GST
  const grandTotal = roomTotal + taxes;
  const balanceRemaining = Math.max(0, grandTotal - advancePaid);

  // Auto-select first room type and room
  useEffect(() => {
    if (roomTypes.length > 0 && !selectedRoomTypeId) {
      setSelectedRoomTypeId(roomTypes[0].id);
      const rate = getRoomTypeRate(roomTypes[0]);
      setRoomRatePerNight(rate);
      setAdvancePaid(rate);
    }
  }, [roomTypes, selectedRoomTypeId]);

  useEffect(() => {
    if (availableRooms.length > 0 && !selectedRoomId) {
      setSelectedRoomId(availableRooms[0].id);
    }
  }, [availableRooms, selectedRoomId]);

  // Handle room type change
  const handleRoomTypeChange = (rtId: string) => {
    setSelectedRoomTypeId(rtId);
    setSelectedRoomId('');
    const rt = roomTypes.find((t) => t.id === rtId);
    if (rt) {
      const rate = getRoomTypeRate(rt);
      setRoomRatePerNight(rate);
      setAdvancePaid(rate);
    }
  };

  // Walk-In Check-In Mutation
  const walkInMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg('');
      if (!firstName.trim() || !mobile.trim()) {
        throw new Error('Guest Name and Mobile Number are required.');
      }
      if (!selectedRoomId) {
        throw new Error('Please select an available room for check-in.');
      }

      const assignedRoom = rooms.find((r) => r.id === selectedRoomId);
      const assignedRoomType = roomTypes.find((t) => t.id === selectedRoomTypeId);

      const payload = {
        propertyId,
        source: 'walk_in',
        status: 'checked_in',
        arrivalDate: checkInDate,
        departureDate: checkOutDate,
        roomId: selectedRoomId,
        roomNumber: assignedRoom?.number || '101',
        roomTypeName: assignedRoomType?.name || 'Deluxe King Room',
        guest: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          mobile: mobile.trim(),
          email: email.trim() || `${mobile.trim()}@sparkhotel.com`,
          address: address.trim(),
          idProofType,
          idProofNumber: idProofNumber.trim(),
          idProofFrontUrl: idProofFrontUrl || undefined,
          idProofBackUrl: idProofBackUrl || undefined,
        },
        adults,
        children,
        billing: {
          nightlyRate: roomRatePerNight,
          nights,
          roomSubtotal: roomTotal,
          taxes,
          grandTotal,
          advancePaid,
          balanceRemaining,
          paymentMethod,
          paymentReference: paymentReference.trim() || `WALK-IN-${Date.now().toString(36).toUpperCase()}`,
        },
      };

      const res = await api.post('/v1/reservations', payload, { skipErrorToast: true });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['direct-bookings'] });

      const assignedRoom = rooms.find((r) => r.id === selectedRoomId);
      setConfirmedBooking({
        confirmationNumber: data.confirmationNumber || `SPARK-WALKIN-${Date.now().toString(36).toUpperCase()}`,
        guestName: `${firstName} ${lastName}`.trim(),
        roomNumber: assignedRoom?.number || '101',
        checkInDate,
        checkOutDate,
        grandTotal,
        advancePaid,
        balanceRemaining,
        paymentMethod,
      });

      if (onSuccess) onSuccess();
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to complete walk-in check-in.');
    },
  });

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setMobile('');
    setEmail('');
    setAddress('');
    setIdProofNumber('');
    setIdProofFrontUrl('');
    setIdProofBackUrl('');
    setConfirmedBooking(null);
    setErrorMsg('');
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        resetForm();
        onClose();
      }}
      title="⚡ Walk-In Guest Check-In · Spark Hotel"
      wide
    >
      {confirmedBooking ? (
        /* SUCCESS CONFIRMATION & REGISTRATION FORM */
        <div className="space-y-6 py-2">
          <div className="rounded-2xl border border-emerald-300 bg-linear-to-b from-emerald-50 to-teal-50 p-6 text-center shadow-xs">
            <div className="mx-auto w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mb-3">
              <CheckCircle2 size={26} />
            </div>
            <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
              Check-In Completed · Room Assigned
            </span>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
              Room {confirmedBooking.roomNumber} Occupied
            </h2>
            <p className="text-xs text-gray-600 mt-1">
              Confirmed Reference: <strong>{confirmedBooking.confirmationNumber}</strong>
            </p>

            <div className="mt-4 p-4 rounded-xl bg-white border border-emerald-200 text-left grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-gray-400 block font-medium">Guest Name</span>
                <span className="font-bold text-gray-900 text-sm">{confirmedBooking.guestName}</span>
              </div>
              <div>
                <span className="text-gray-400 block font-medium">Room Assigned</span>
                <span className="font-bold text-teal-700 text-sm">Room {confirmedBooking.roomNumber}</span>
              </div>
              <div>
                <span className="text-gray-400 block font-medium">Advance Paid</span>
                <span className="font-bold text-emerald-700 text-sm">{formatMoney(confirmedBooking.advancePaid, currencyCode)}</span>
              </div>
              <div>
                <span className="text-gray-400 block font-medium">Balance Remaining</span>
                <span className="font-bold text-orange-600 text-sm">{formatMoney(confirmedBooking.balanceRemaining, currencyCode)}</span>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-lg transition"
              >
                <Printer size={15} />
                <span>Print Guest Registration Card</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 text-xs font-semibold rounded-lg transition"
              >
                <FileText size={15} />
                <span>Print Advance Receipt / Invoice</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg transition"
              >
                <span>Done</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* REGISTRATION FORM */
        <div className="space-y-5">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2 font-medium">
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* SECTION 1: GUEST DETAILS */}
          <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-telivity-navy flex items-center gap-2">
              <User size={15} className="text-telivity-teal" />
              <span>1. Guest Profile & Identity</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">First Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Suresh"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-telivity-teal focus:ring-1 focus:ring-telivity-teal"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Last Name</label>
                <input
                  type="text"
                  placeholder="e.g. Kumar"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-telivity-teal focus:ring-1 focus:ring-telivity-teal"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Mobile Number (WhatsApp) *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-telivity-teal focus:ring-1 focus:ring-telivity-teal"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email Address (Optional)</label>
                <input
                  type="email"
                  placeholder="guest@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-telivity-teal focus:ring-1 focus:ring-telivity-teal"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">ID Proof Document</label>
                <select
                  value={idProofType}
                  onChange={(e) => setIdProofType(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                >
                  <option value="Aadhaar Card">Aadhaar Card</option>
                  <option value="Passport">Passport</option>
                  <option value="Driving License">Driving License</option>
                  <option value="Voter ID">Voter ID</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">ID Document Number</label>
                <input
                  type="text"
                  placeholder="e.g. 1234 5678 9012"
                  value={idProofNumber}
                  onChange={(e) => setIdProofNumber(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            {/* Front & Back Aadhaar / ID Upload Cards */}
            <div className="pt-2 border-t border-gray-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-telivity-navy">
                  Upload {idProofType} (Front & Back)
                </label>
                {(idProofFrontUrl || idProofBackUrl) && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                    <CheckCircle2 size={12} /> Photo Attached
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Front Side */}
                <div className="border border-dashed border-gray-300 hover:border-telivity-teal rounded-xl p-3 bg-white text-center relative group">
                  {idProofFrontUrl ? (
                    <div className="relative">
                      <img src={idProofFrontUrl} alt="ID Front" className="h-24 w-full object-cover rounded-lg border border-gray-200" />
                      <button
                        type="button"
                        onClick={() => setIdProofFrontUrl('')}
                        className="absolute top-1 right-1 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-md"
                        title="Remove image"
                      >
                        <X size={12} />
                      </button>
                      <p className="text-[10px] font-bold text-emerald-700 mt-1 flex items-center justify-center gap-1">
                        <CheckCircle2 size={11} /> Front Side Loaded
                      </p>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-24 cursor-pointer group-hover:bg-teal-50/20 rounded-lg">
                      <Upload size={20} className="text-telivity-teal mb-1" />
                      <span className="text-xs font-bold text-telivity-navy">Upload Front Side</span>
                      <span className="text-[10px] text-gray-400">Photo & Aadhaar Details</span>
                      <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFileUpload(e, 'front')} className="hidden" />
                    </label>
                  )}
                </div>

                {/* Back Side */}
                <div className="border border-dashed border-gray-300 hover:border-telivity-teal rounded-xl p-3 bg-white text-center relative group">
                  {idProofBackUrl ? (
                    <div className="relative">
                      <img src={idProofBackUrl} alt="ID Back" className="h-24 w-full object-cover rounded-lg border border-gray-200" />
                      <button
                        type="button"
                        onClick={() => setIdProofBackUrl('')}
                        className="absolute top-1 right-1 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-md"
                        title="Remove image"
                      >
                        <X size={12} />
                      </button>
                      <p className="text-[10px] font-bold text-emerald-700 mt-1 flex items-center justify-center gap-1">
                        <CheckCircle2 size={11} /> Back Side Loaded
                      </p>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-24 cursor-pointer group-hover:bg-teal-50/20 rounded-lg">
                      <Upload size={20} className="text-telivity-teal mb-1" />
                      <span className="text-xs font-bold text-telivity-navy">Upload Back Side</span>
                      <span className="text-[10px] text-gray-400">Address & QR Code</span>
                      <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFileUpload(e, 'back')} className="hidden" />
                    </label>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Guest Residential Address</label>
              <input
                type="text"
                placeholder="City, State, Country"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* SECTION 2: STAY & ROOM ASSIGNMENT */}
          <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-telivity-navy flex items-center gap-2">
              <DoorOpen size={15} className="text-telivity-teal" />
              <span>2. Room Category & Live Room Assignment</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Room Category *</label>
                <select
                  value={selectedRoomTypeId}
                  onChange={(e) => handleRoomTypeChange(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white font-medium"
                >
                  {roomTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>
                      {rt.name} ({rt.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Assign Room Number *{' '}
                  <span className="text-[11px] text-teal-700 font-bold">({availableRooms.length} available)</span>
                </label>
                <select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  className="w-full rounded-lg border border-telivity-teal bg-teal-50/50 px-3 py-2 text-sm font-bold text-gray-900"
                >
                  <option value="">-- Choose Available Room --</option>
                  {availableRooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      Room {r.number} (Floor {r.floor || '1'} · Ready)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Adults</label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    value={adults}
                    onChange={(e) => setAdults(Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Children</label>
                  <input
                    type="number"
                    min="0"
                    max="4"
                    value={children}
                    onChange={(e) => setChildren(Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Check-In Date</label>
                <input
                  type="date"
                  value={checkInDate}
                  onChange={(e) => setCheckInDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Expected Checkout Date ({nights} night{nights > 1 ? 's' : ''})</label>
                <input
                  type="date"
                  min={checkInDate}
                  value={checkOutDate}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: BILLING & PAYMENT */}
          <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-telivity-navy flex items-center gap-2">
              <DollarSign size={15} className="text-telivity-teal" />
              <span>3. Billing & Advance Payment Collection</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3 rounded-xl border border-gray-200 text-xs">
              <div>
                <span className="text-gray-400 block font-medium">Nightly Rate</span>
                <input
                  type="number"
                  value={roomRatePerNight}
                  onChange={(e) => {
                    const r = Number(e.target.value);
                    setRoomRatePerNight(r);
                    setAdvancePaid(r * nights);
                  }}
                  className="w-full font-bold text-gray-900 border-b border-gray-300 pb-0.5 text-sm"
                />
              </div>
              <div>
                <span className="text-gray-400 block font-medium">Room Total ({nights} N)</span>
                <span className="font-bold text-gray-900 text-sm mt-1 block">{formatMoney(roomTotal, currencyCode)}</span>
              </div>
              <div>
                <span className="text-gray-400 block font-medium">GST (12%)</span>
                <span className="font-bold text-gray-600 text-sm mt-1 block">{formatMoney(taxes, currencyCode)}</span>
              </div>
              <div>
                <span className="text-gray-400 block font-medium">Grand Total</span>
                <span className="font-bold text-teal-800 text-sm mt-1 block">{formatMoney(grandTotal, currencyCode)}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Advance Amount Paid *</label>
                <input
                  type="number"
                  value={advancePaid}
                  onChange={(e) => setAdvancePaid(Number(e.target.value))}
                  className="w-full rounded-lg border border-teal-500 bg-teal-50/30 px-3 py-2 text-sm font-bold text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white font-medium"
                >
                  <option value="upi">UPI QR (GPay / PhonePe / Paytm)</option>
                  <option value="cash">Cash at Desk</option>
                  <option value="card">Credit / Debit Card</option>
                  <option value="bank_transfer">Bank Transfer / NEFT</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Balance Due at Checkout</label>
                <div className="px-3 py-2 rounded-lg bg-gray-100 font-bold text-orange-600 text-sm">
                  {formatMoney(balanceRemaining, currencyCode)}
                </div>
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS */}
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
              onClick={() => walkInMutation.mutate()}
              disabled={walkInMutation.isPending || availableRooms.length === 0}
              className="px-6 py-2.5 rounded-xl bg-telivity-teal hover:bg-teal-600 text-white text-sm font-bold shadow-md hover:shadow-lg transition flex items-center gap-2 disabled:opacity-50"
            >
              <Sparkles size={16} />
              <span>
                {walkInMutation.isPending ? 'Checking In Guest…' : 'Complete Walk-In Check-In & Assign Room'}
              </span>
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
