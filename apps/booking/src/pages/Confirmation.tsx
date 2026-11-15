import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { money } from '../lib/format';
import { playBookingSuccessChime } from '../lib/notificationSound';
import type { BookResponse } from '../api/types';
import { Clock, CheckCircle2, MessageCircle, Phone, Sparkles } from 'lucide-react';

interface ConfirmationState {
  booking?: BookResponse;
  email?: string;
}

export function Confirmation() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { booking, email } = (state ?? {}) as ConfirmationState;

  const isPendingApproval =
    booking?.isPendingApproval === true ||
    booking?.status === 'pending_approval' ||
    booking?.status === 'pending';

  useEffect(() => {
    if (booking) {
      playBookingSuccessChime();
    }
  }, [booking]);

  if (!booking) {
    return (
      <div className="space-y-4 rounded-md border border-gray-200 bg-white p-6 text-center">
        <p className="text-sm text-gray-600">No booking to display.</p>
        <Button onClick={() => navigate('/')}>Start a new search</Button>
      </div>
    );
  }

  const referenceCode = booking.reference || booking.confirmationNumber;

  return (
    <div className="space-y-6">
      {isPendingApproval ? (
        /* PENDING APPROVAL BANNER */
        <div className="rounded-xl border border-amber-300 bg-linear-to-b from-amber-50 to-orange-50 p-6 text-center relative shadow-xs">
          <button
            type="button"
            onClick={() => playBookingSuccessChime()}
            className="absolute top-3 right-3 text-xs bg-white/90 hover:bg-white text-amber-900 border border-amber-200 px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1.5 transition"
            title="Play sound alert"
          >
            <span>🛎️</span>
            <span className="text-[11px] font-semibold">Chime</span>
          </button>

          <div className="mx-auto w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mb-3">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-200/60 text-amber-900 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping"></span>
            Booking Request Submitted · Pending Approval
          </div>

          <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
            {referenceCode}
          </h2>

          <p className="mt-3 text-sm text-gray-700 max-w-lg mx-auto leading-relaxed">
            Thank you! Your direct reservation request has been submitted to Hotel Spark. 
            Our front desk management will review room availability and send your official confirmation 
            and room assignment directly to your WhatsApp and Email.
          </p>

          <div className="mt-4 inline-flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3.5 py-1.5 rounded-lg text-xs font-medium">
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            <span>WhatsApp alert sent to hotel manager for immediate review</span>
          </div>
        </div>
      ) : (
        /* CONFIRMED BANNER */
        <div className="rounded-xl border border-emerald-300 bg-linear-to-b from-emerald-50 to-teal-50 p-6 text-center relative shadow-xs">
          <button
            type="button"
            onClick={() => playBookingSuccessChime()}
            className="absolute top-3 right-3 text-xs bg-white/90 hover:bg-white text-emerald-900 border border-emerald-200 px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1.5 transition"
            title="Play confirmation sound"
          >
            <span>🛎️</span>
            <span className="text-[11px] font-semibold">Chime</span>
          </button>

          <div className="mx-auto w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
            Booking Confirmed
          </p>
          <p className="mt-1 text-3xl font-extrabold tracking-wide text-gray-900">
            {booking.confirmationNumber}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            Keep this confirmation number to manage your booking.
          </p>
        </div>
      )}

      {/* SUMMARY DETAILS */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm shadow-xs space-y-1">
        <h3 className="text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-600" />
          Reservation Request Summary
        </h3>
        <Row label="Booking Reference" value={referenceCode} />
        <Row
          label="Request Status"
          value={
            isPendingApproval ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                Pending Approval
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                Confirmed
              </span>
            )
          }
        />
        <Row label="Estimated Total" value={money(booking.grandTotal, booking.currencyCode)} />
        {booking.deposit && (
          <Row
            label="Deposit / Payment Status"
            value={`${money(booking.deposit.amount, booking.currencyCode)} (${booking.deposit.status})`}
          />
        )}
        <Row label="Cancellation Policy" value={booking.cancellationPolicy} />
        <Row
          label="Hotel Contact"
          value="+91 98765 43210 (Hotel Spark Front Desk)"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <a
          href="https://wa.me/919876543210?text=Hello%20Hotel%20Spark,%20I%20have%20submitted%20booking%20request%20"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1"
        >
          <Button variant="secondary" className="w-full flex items-center justify-center gap-2 border-emerald-300 text-emerald-800 hover:bg-emerald-50">
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            Contact Hotel on WhatsApp
          </Button>
        </a>
        <Button className="flex-1 bg-amber-700 hover:bg-amber-800 text-white" onClick={() => navigate('/')}>
          Book Another Stay
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center border-b border-gray-100 py-2.5 last:border-0">
      <span className="text-gray-500 font-medium">{label}</span>
      <span className="text-right font-semibold text-gray-900">{value}</span>
    </div>
  );
}
