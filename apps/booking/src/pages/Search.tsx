import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../components/Button';
import { Field, inputClass } from '../components/Field';
import { bookingApi } from '../api/client';
import { useBookingFlow } from '../context/BookingFlowContext';
import { FullScreenScrollVideo } from '../components/FullScreenScrollVideo';

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

interface RoomShowcaseItem {
  id: string;
  name: string;
  bed: string;
  maxGuests: number;
  price: number;
  priceNote: string;
  roomsInfo: string;
  amenities: string[];
  image?: string;
}

export function Search() {
  const navigate = useNavigate();
  const { setCriteria } = useBookingFlow();

  const { data: catalog, isLoading: loadingCatalog } = useQuery({
    queryKey: ['public-hotel-catalog'],
    queryFn: () => bookingApi.getPublicCatalog(),
  });

  const liveRooms: RoomShowcaseItem[] = (catalog?.roomTypes || []).map((rt) => {
    const rp = rt.ratePlans[0];
    const minPrice = Math.min(
      ...[rp?.singleOccupancyRate, rp?.doubleOccupancyRate, rp?.baseRate]
        .filter((v): v is number => v != null && Number(v) > 0)
    );
    const displayPrice = Number.isFinite(minPrice) ? minPrice : 0;
    const noteParts: string[] = [];
    if (rp?.singleOccupancyRate) noteParts.push(`Single ₹${Number(rp.singleOccupancyRate).toLocaleString('en-IN')}`);
    if (rp?.doubleOccupancyRate) noteParts.push(`Double ₹${Number(rp.doubleOccupancyRate).toLocaleString('en-IN')}`);

    return {
      id: rt.id,
      name: rt.name,
      bed: `${rt.bedType || 'Queen'} Bed`,
      maxGuests: rt.maxOccupancy || 2,
      price: displayPrice,
      priceNote: noteParts.length ? `${noteParts.join(' / ')} + GST` : '',
      roomsInfo: rt.description || `${rt.roomCount} rooms available`,
      amenities: rt.amenities || [],
      image: rt.images?.[0],
    };
  });

  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86_400_000);

  const [checkIn, setCheckIn] = useState(isoDate(tomorrow));
  const [checkOut, setCheckOut] = useState(isoDate(new Date(today.getTime() + 2 * 86_400_000)));
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [promoCode, setPromoCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const doSearch = (dates?: { checkIn: string; checkOut: string; adults: number; children: number }) => {
    const cin = dates?.checkIn || checkIn;
    const cout = dates?.checkOut || checkOut;
    const adl = dates?.adults ?? adults;
    const chd = dates?.children ?? children;

    if (new Date(cout) <= new Date(cin)) {
      setError('Check-out must be after check-in.');
      return;
    }
    setError(null);
    setCriteria({
      checkIn: cin,
      checkOut: cout,
      adults: adl,
      children: chd,
      promoCode: promoCode.trim() || undefined,
    });
    navigate('/results');
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch();
  };

  const handleBookRoom = (room: RoomShowcaseItem) => {
    doSearch({
      checkIn,
      checkOut,
      adults: Math.min(room.maxGuests, adults),
      children,
    });
  };

  // 1. Hero Floating Quick Booking Bar
  const heroBookingBar = (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-white/20 bg-black/65 p-4 sm:p-5 shadow-2xl backdrop-blur-2xl text-white text-left transition hover:border-teal-400/50"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 items-end">
        <div>
          <label htmlFor="hero-checkIn" className="block text-[11px] font-bold uppercase tracking-wider text-teal-300 mb-1">
            📅 Check-in
          </label>
          <input
            id="hero-checkIn"
            type="date"
            className="w-full rounded-xl border border-white/20 bg-white/10 px-3.5 py-2.5 text-sm text-white placeholder-gray-400 backdrop-blur-md focus:border-teal-400 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-teal-400"
            value={checkIn}
            min={isoDate(today)}
            onChange={(e) => setCheckIn(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="hero-checkOut" className="block text-[11px] font-bold uppercase tracking-wider text-teal-300 mb-1">
            📅 Check-out
          </label>
          <input
            id="hero-checkOut"
            type="date"
            className="w-full rounded-xl border border-white/20 bg-white/10 px-3.5 py-2.5 text-sm text-white placeholder-gray-400 backdrop-blur-md focus:border-teal-400 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-teal-400"
            value={checkOut}
            min={checkIn}
            onChange={(e) => setCheckOut(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="hero-guests" className="block text-[11px] font-bold uppercase tracking-wider text-teal-300 mb-1">
            👥 Guests
          </label>
          <div className="flex gap-2">
            <select
              id="hero-guests"
              aria-label="Number of adults"
              className="w-1/2 rounded-xl border border-white/20 bg-black/80 px-2.5 py-2.5 text-sm text-white focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
              value={adults}
              onChange={(e) => setAdults(Number(e.target.value))}
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n} className="bg-gray-900 text-white">
                  {n} Adult{n > 1 ? 's' : ''}
                </option>
              ))}
            </select>
            <select
              aria-label="Number of children"
              className="w-1/2 rounded-xl border border-white/20 bg-black/80 px-2.5 py-2.5 text-sm text-white focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
              value={children}
              onChange={(e) => setChildren(Number(e.target.value))}
            >
              {[0, 1, 2, 3].map((n) => (
                <option key={n} value={n} className="bg-gray-900 text-white">
                  {n} Child{n !== 1 ? 'ren' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 px-5 py-2.5 text-sm font-bold text-gray-950 shadow-lg shadow-teal-500/30 transition hover:from-teal-400 hover:to-emerald-400 hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Search Rooms</span>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </form>
  );

  // 2. Featured Rooms & Tariffs Showcase (Live from Supabase)
  const roomsSection = (
    <div className="space-y-8 w-full">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <span className="inline-block rounded-full bg-teal-500/20 px-4 py-1 text-xs font-bold tracking-wider text-teal-300 border border-teal-400/30">
          LIVE ROOM INVENTORY & TARIFFS
        </span>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Signature Accommodations
        </h2>
        <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
          Commission-free direct booking with real-time rates for {catalog?.hotel?.name || 'Hotel Spark'}.
        </p>
      </div>

      {loadingCatalog ? (
        <div className="text-center text-sm text-gray-300 py-8">Loading live room categories...</div>
      ) : liveRooms.length === 0 ? (
        <div className="text-center text-sm text-gray-300 py-8 rounded-2xl border border-white/15 bg-black/40">
          No room categories currently published. Please use the search bar above or contact the hotel desk.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {liveRooms.map((room) => (
            <div
              key={room.id}
              className="group flex flex-col rounded-3xl border border-white/20 bg-black/60 shadow-2xl backdrop-blur-2xl overflow-hidden transition-all duration-300 hover:border-teal-400/60 hover:-translate-y-1"
            >
              {/* Room Image */}
              <div className="relative h-48 w-full overflow-hidden bg-gray-900">
                {room.image ? (
                  <img
                    src={room.image}
                    alt={room.name}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-xs text-gray-400">
                    No photo uploaded
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                  <span className="text-xs font-medium text-gray-200 capitalize">🛏️ {room.bed}</span>
                  <span className="text-xs font-medium text-gray-200">👥 Up to {room.maxGuests}</span>
                </div>
              </div>

            {/* Room Details */}
            <div className="p-5 flex flex-col flex-1 justify-between space-y-4">
              <div>
                <h3 className="text-lg font-bold text-white group-hover:text-teal-300 transition">
                  {room.name}
                </h3>
                <p className="mt-1 text-xs text-gray-300 line-clamp-2">
                  {room.roomsInfo}
                </p>

                {/* Amenities pills */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {room.amenities.slice(0, 3).map((amenity, idx) => (
                    <span
                      key={idx}
                      className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] text-gray-300 border border-white/10"
                    >
                      ✓ {amenity}
                    </span>
                  ))}
                </div>
              </div>

              {/* Price & Action */}
              <div className="pt-3 border-t border-white/15 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-gray-400">Starting from</div>
                  <div className="text-lg font-extrabold text-teal-300">
                    ₹{room.price.toLocaleString('en-IN')}
                    <span className="text-xs font-normal text-gray-400"> / night</span>
                  </div>
                  <div className="text-[10px] text-gray-400">{room.priceNote}</div>
                </div>

                <button
                  type="button"
                  onClick={() => handleBookRoom(room)}
                  className="rounded-xl bg-teal-500 px-4 py-2 text-xs font-bold text-gray-950 shadow-md shadow-teal-500/20 transition hover:bg-teal-400 hover:scale-105 active:scale-95"
                >
                  Book Now
                </button>
              </div>
            </div>
          </div>
        ))}
        </div>
      )}
    </div>
  );

  return (
    <FullScreenScrollVideo heroContent={heroBookingBar} roomsSection={roomsSection}>
      <form
        onSubmit={submit}
        className="space-y-5 rounded-3xl border border-white/60 bg-white/95 p-8 sm:p-10 shadow-2xl backdrop-blur-2xl text-gray-900"
      >
        <div className="border-b border-gray-100 pb-4">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-600">
            <span className="h-2 w-2 rounded-full bg-teal-500" />
            Direct Booking Engine
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-gray-900">Find a room</h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-500">
            Select your check-in dates and guests to view live rates and available suites.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Check-in" htmlFor="checkIn" required>
            <input
              id="checkIn"
              type="date"
              className={inputClass}
              value={checkIn}
              min={isoDate(today)}
              onChange={(e) => setCheckIn(e.target.value)}
            />
          </Field>
          <Field label="Check-out" htmlFor="checkOut" required>
            <input
              id="checkOut"
              type="date"
              className={inputClass}
              value={checkOut}
              min={checkIn}
              onChange={(e) => setCheckOut(e.target.value)}
            />
          </Field>
          <Field label="Adults" htmlFor="adults" required>
            <input
              id="adults"
              type="number"
              min={1}
              className={inputClass}
              value={adults}
              onChange={(e) => setAdults(Math.max(1, Number(e.target.value)))}
            />
          </Field>
          <Field label="Children" htmlFor="children">
            <input
              id="children"
              type="number"
              min={0}
              className={inputClass}
              value={children}
              onChange={(e) => setChildren(Math.max(0, Number(e.target.value)))}
            />
          </Field>
        </div>

        <Field label="Promo code" htmlFor="promo">
          <input
            id="promo"
            type="text"
            className={inputClass}
            value={promoCode}
            placeholder="Optional"
            onChange={(e) => setPromoCode(e.target.value)}
          />
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" className="w-full">
          Search availability
        </Button>
      </form>
    </FullScreenScrollVideo>
  );
}
