import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, Calendar, User, BedDouble, ExternalLink, Volume2, Sparkles } from 'lucide-react';
import { getSocket } from '../../lib/socket';
import { useProperty } from '../../context/PropertyContext';
import { playBookingChime } from '../../lib/notificationSound';

export interface BookingAlertData {
  id: string;
  confirmationNumber?: string;
  reservationId?: string;
  guestName: string;
  roomTypeName?: string;
  totalAmount?: string | number;
  currencyCode?: string;
  checkInDate?: string;
  checkOutDate?: string;
  source?: string;
  receivedAt: Date;
}

export default function BookingAlertCard() {
  const { propertyId, isPortfolioMode } = useProperty();
  const navigate = useNavigate();
  const [activeAlert, setActiveAlert] = useState<BookingAlertData | null>(null);
  const [history, setHistory] = useState<BookingAlertData[]>([]);
  const [progress, setProgress] = useState(100);

  const showAlert = useCallback((alert: BookingAlertData) => {
    setActiveAlert(alert);
    setHistory((prev) => [alert, ...prev.slice(0, 4)]);
    setProgress(100);
    playBookingChime();
  }, []);

  useEffect(() => {
    if (!propertyId || isPortfolioMode) return;
    const socket = getSocket();

    const handlePmsEvent = (payload: any) => {
      if (!payload?.event) return;
      if (payload.event === 'reservation.created' || payload.event === 'reservation_created') {
        const data = payload.data || {};
        const guestName =
          data.guestName ||
          (data.guest?.firstName ? `${data.guest.firstName} ${data.guest.lastName || ''}`.trim() : 'Guest');
        
        showAlert({
          id: data.reservationId || String(Date.now()),
          reservationId: data.reservationId,
          confirmationNumber: data.confirmationNumber,
          guestName,
          roomTypeName: data.roomTypeName || data.roomType?.name || 'Standard King',
          totalAmount: data.totalAmount || data.grandTotal,
          currencyCode: data.currencyCode || 'INR',
          checkInDate: data.checkInDate || data.checkIn,
          checkOutDate: data.checkOutDate || data.checkOut,
          source: data.source || 'Website Direct',
          receivedAt: new Date(),
        });
      }
    };

    const handleStaffNotif = (notif: any) => {
      if (notif?.type === 'reservation_created' || notif?.title?.toLowerCase().includes('booking') || notif?.title?.toLowerCase().includes('reservation')) {
        const title = notif.title || '';
        const msg = notif.message || '';
        showAlert({
          id: notif.id || String(Date.now()),
          guestName: title.replace(/^New booking:?\s*/i, '') || 'Guest',
          roomTypeName: 'Hotel Spark Suite',
          source: 'System Alert',
          receivedAt: new Date(),
        });
      }
    };

    socket.on('pmsEvent', handlePmsEvent);
    socket.on('staffNotification', handleStaffNotif);

    return () => {
      socket.off('pmsEvent', handlePmsEvent);
      socket.off('staffNotification', handleStaffNotif);
    };
  }, [propertyId, isPortfolioMode, showAlert]);

  // Auto-dismiss countdown
  useEffect(() => {
    if (!activeAlert) return;
    const totalMs = 30000;
    const intervalMs = 200;
    const step = (intervalMs / totalMs) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= step) {
          clearInterval(timer);
          setActiveAlert(null);
          return 0;
        }
        return prev - step;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [activeAlert]);

  if (!activeAlert) return null;

  const formattedAmount = activeAlert.totalAmount
    ? (typeof activeAlert.totalAmount === 'number'
        ? `₹${activeAlert.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
        : activeAlert.totalAmount.startsWith('₹')
        ? activeAlert.totalAmount
        : `₹${Number(activeAlert.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`)
    : null;

  const viewReservation = () => {
    setActiveAlert(null);
    if (activeAlert.confirmationNumber) {
      navigate(`/reservations?search=${encodeURIComponent(activeAlert.confirmationNumber)}`);
    } else {
      navigate('/reservations');
    }
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-5 right-5 z-[9999] w-96 max-w-[calc(100vw-2.5rem)] overflow-hidden rounded-2xl border-2 border-telivity-teal bg-white shadow-2xl ring-4 ring-telivity-teal/20 transition-all animate-in slide-in-from-top-4 duration-300"
    >
      {/* Top Banner Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-telivity-navy via-slate-900 to-telivity-teal px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-telivity-teal text-white shadow-md animate-bounce">
            <Bell size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-wide flex items-center gap-1.5">
              <span>NEW ROOM BOOKED!</span>
              <Sparkles size={14} className="text-amber-300" />
            </h3>
            <p className="text-[11px] text-teal-200">Just now · Instant Alert</p>
          </div>
        </div>
        <button
          onClick={() => setActiveAlert(null)}
          className="rounded-lg p-1 text-slate-300 hover:bg-white/10 hover:text-white transition"
          aria-label="Dismiss alert"
        >
          <X size={18} />
        </button>
      </div>

      {/* Booking Details Card Body */}
      <div className="p-4 space-y-3 bg-white">
        {/* Guest Name & Reference */}
        <div className="flex items-start justify-between border-b border-gray-100 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-teal-50 p-1.5 text-telivity-teal">
              <User size={16} />
            </div>
            <div>
              <div className="font-bold text-gray-900 text-base">{activeAlert.guestName}</div>
              {activeAlert.confirmationNumber && (
                <div className="font-mono text-xs font-semibold text-telivity-teal">
                  Ref: {activeAlert.confirmationNumber}
                </div>
              )}
            </div>
          </div>
          {formattedAmount && (
            <div className="text-right">
              <div className="text-lg font-extrabold text-telivity-navy">{formattedAmount}</div>
              <span className="inline-block text-[10px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                Confirmed
              </span>
            </div>
          )}
        </div>

        {/* Room & Dates */}
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 bg-gray-50/70 p-2.5 rounded-lg border border-gray-100">
          <div className="flex items-center gap-1.5 truncate">
            <BedDouble size={14} className="text-telivity-teal shrink-0" />
            <span className="font-medium text-gray-900 truncate">
              {activeAlert.roomTypeName || 'Standard King'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 justify-end">
            <Calendar size={14} className="text-telivity-teal shrink-0" />
            <span className="font-medium text-gray-700">
              {activeAlert.checkInDate && activeAlert.checkOutDate
                ? `${activeAlert.checkInDate} → ${activeAlert.checkOutDate}`
                : 'Direct Booking'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={viewReservation}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-telivity-teal px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-teal-700 transition"
          >
            <span>View in Reservations</span>
            <ExternalLink size={14} />
          </button>
          <button
            onClick={() => playBookingChime()}
            title="Replay bell sound"
            className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-50 hover:text-telivity-teal transition"
          >
            <Volume2 size={16} />
          </button>
          <button
            onClick={() => setActiveAlert(null)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
          >
            Dismiss
          </button>
        </div>
      </div>

      {/* Progress Bar for Auto-dismiss */}
      <div className="h-1 w-full bg-gray-100 overflow-hidden">
        <div
          className="h-full bg-telivity-teal transition-all duration-200 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

