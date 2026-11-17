import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useMutation } from '@tanstack/react-query';
import { QrCode, CreditCard, Building2, CheckCircle2 } from 'lucide-react';
import { bookingApi, errorMessage } from '../api/client';
import { Button } from '../components/Button';
import { PriceBreakdown } from '../components/PriceBreakdown';
import { StripeCard, type PaymentResult } from '../components/StripeCard';
import { WorldlineCard } from '../components/WorldlineCard';
import { UpiQrPayment } from '../components/UpiQrPayment';
import { useConfig } from '../context/ConfigContext';
import { useBookingFlow } from '../context/BookingFlowContext';
import { money } from '../lib/format';
import { submitRedirectNextAction } from '../lib/submit-redirect-next-action';
import type { BookRequest, BookResponse } from '../api/types';

type BookPaymentInput = PaymentResult & {
  returnUrl?: string;
};

type PaymentTab = 'upi_qr' | 'pay_at_hotel' | 'card';

export function Payment() {
  const navigate = useNavigate();
  const { config } = useConfig();
  const { criteria, roomType, rate, quote, guest, serviceIds } = useBookingFlow();
  const [activeTab, setActiveTab] = useState<PaymentTab>(() => {
    if (config?.stripePublishableKey || config?.paymentMethodClientMode === 'redsys' || config?.paymentMethodClientMode === 'worldline') {
      return 'card';
    }
    return 'upi_qr';
  });

  useEffect(() => {
    if (!criteria || !roomType || !rate || !quote || !guest) {
      navigate('/', { replace: true });
    }
  }, [criteria, roomType, rate, quote, guest, navigate]);

  const bookMutation = useMutation({
    mutationFn: (payment?: BookPaymentInput) => {
      const body: BookRequest = {
        roomTypeId: roomType!.roomTypeId,
        ratePlanId: rate!.ratePlanId,
        checkIn: criteria!.checkIn,
        checkOut: criteria!.checkOut,
        adults: criteria!.adults,
        children: criteria!.children,
        guestFirstName: guest!.firstName,
        guestLastName: guest!.lastName,
        guestEmail: guest!.email,
        guestPhone: guest!.phone,
        specialRequests: guest!.specialRequests,
        paymentToken: payment?.paymentToken || 'tok_pay_at_hotel',
        cardLastFour: payment?.cardLastFour,
        cardBrand: payment?.cardBrand,
        serviceIds: serviceIds.length ? serviceIds : undefined,
        returnUrl: payment?.returnUrl,
      };
      return bookingApi.book(body);
    },
    onSuccess: (res: BookResponse) => {
      const nextAction = res.deposit?.nextAction;
      if (nextAction?.type === 'redirect') {
        submitRedirectNextAction(nextAction);
        return;
      }
      navigate('/confirmation', { state: { booking: res, email: guest!.email } });
    },
  });

  const publishableKey = config?.stripePublishableKey?.trim();
  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey],
  );

  if (!quote || !guest) return null;

  const depositDue = Number(quote.depositDue);
  const needsPayment = depositDue > 0;
  const isRedsys = config?.paymentMethodClientMode === 'redsys';
  const isWorldline = config?.paymentMethodClientMode === 'worldline';

  const payAtHotel = () => bookMutation.mutate({ paymentToken: 'pay_at_hotel', cardBrand: 'Pay at Desk', cardLastFour: 'CASH' });
  const payCardDemo = () => bookMutation.mutate({ paymentToken: 'tok_demo', cardBrand: 'Visa Demo', cardLastFour: '4242' });
  const payRedsys = () =>
    bookMutation.mutate({
      paymentToken: 'redsys_redirect',
      returnUrl: window.location.href,
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/guest')}>
          ← Back to Guest Details
        </Button>
        <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
          Step 4 of 4 · Secure Payment
        </span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900">Payment</h1>

      <PriceBreakdown quote={quote} />

      {bookMutation.isError && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 font-medium">
          {errorMessage(bookMutation.error)}
        </p>
      )}

      {!needsPayment ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="mb-4 text-sm text-gray-600">
            No deposit is required. You'll pay at the property.
          </p>
          <Button
            className="w-full"
            onClick={() => bookMutation.mutate(undefined)}
            disabled={bookMutation.isPending}
          >
            {bookMutation.isPending ? 'Confirming…' : 'Confirm booking'}
          </Button>
        </div>
      ) : (
        <>
          {/* Payment Method Selector Tabs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => setActiveTab('upi_qr')}
          className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
            activeTab === 'upi_qr'
              ? 'border-telivity-teal bg-teal-50/70 shadow-md ring-2 ring-telivity-teal/30'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <div className={`p-2.5 rounded-xl ${activeTab === 'upi_qr' ? 'bg-telivity-teal text-white' : 'bg-gray-100 text-gray-600'}`}>
            <QrCode size={20} />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <span>UPI QR Code</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">Fastest</span>
            </div>
            <div className="text-xs text-gray-500">GPay, PhonePe, Paytm, BHIM</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pay_at_hotel')}
          className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
            activeTab === 'pay_at_hotel'
              ? 'border-telivity-teal bg-teal-50/70 shadow-md ring-2 ring-telivity-teal/30'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <div className={`p-2.5 rounded-xl ${activeTab === 'pay_at_hotel' ? 'bg-telivity-teal text-white' : 'bg-gray-100 text-gray-600'}`}>
            <Building2 size={20} />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-900">Pay at Hotel</div>
            <div className="text-xs text-gray-500">Cash or Card upon check-in</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('card')}
          className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
            activeTab === 'card'
              ? 'border-telivity-teal bg-teal-50/70 shadow-md ring-2 ring-telivity-teal/30'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <div className={`p-2.5 rounded-xl ${activeTab === 'card' ? 'bg-telivity-teal text-white' : 'bg-gray-100 text-gray-600'}`}>
            <CreditCard size={20} />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-900">Credit / Debit Card</div>
            <div className="text-xs text-gray-500">Visa, Mastercard, RuPay</div>
          </div>
        </button>
      </div>

      {/* Payment Method Content */}
      <div className="transition-all">
        {activeTab === 'upi_qr' && (
          <UpiQrPayment
            quote={quote}
            guestName={`${guest.firstName} ${guest.lastName}`}
            onPaid={(p) => bookMutation.mutate(p)}
            submitting={bookMutation.isPending}
          />
        )}

        {activeTab === 'pay_at_hotel' && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-teal-100 text-teal-800 mt-0.5">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Pay Upon Arrival at Hotel Spark</h3>
                <p className="text-xs text-gray-600 mt-1">
                  Your reservation will be confirmed immediately. You can settle the full bill of{' '}
                  <strong className="text-gray-900">{money(quote.grandTotal, 'INR')}</strong> at the front desk
                  during check-in using Cash, Credit/Debit Card, or UPI.
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-gray-50 p-4 border border-gray-200 text-xs text-gray-600 space-y-2">
              <div className="font-semibold text-gray-800">Check-in Guidelines:</div>
              <ul className="list-disc list-inside space-y-1 text-gray-500">
                <li>Government-issued photo ID required at check-in for all adult guests.</li>
                <li>Free cancellation available up to 24 hours prior to arrival.</li>
                <li>Instant SMS & WhatsApp confirmation sent with directions to Hotel Spark.</li>
              </ul>
            </div>

            <Button
              className="w-full py-3.5 text-sm font-bold"
              onClick={payAtHotel}
              disabled={bookMutation.isPending}
            >
              {bookMutation.isPending ? 'Confirming Reservation…' : 'Confirm Booking & Pay at Check-in'}
            </Button>
          </div>
        )}

        {activeTab === 'card' && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            {isRedsys ? (
              <>
                <p className="mb-4 text-sm text-gray-600">
                  Total amount: <strong>{money(quote.grandTotal, quote.currencyCode)}</strong>
                </p>
                <p className="mb-4 text-sm text-gray-600">
                  You will be redirected to Redsys to complete payment securely.
                </p>
                <Button className="w-full" onClick={payRedsys} disabled={bookMutation.isPending}>
                  {bookMutation.isPending
                    ? 'Redirecting…'
                    : depositDue > 0
                    ? 'Pay deposit securely via Redsys'
                    : 'Pay securely via Redsys'}
                </Button>
              </>
            ) : isWorldline ? (
              <>
                <p className="mb-4 text-sm text-gray-600">
                  Total amount: <strong>{money(quote.grandTotal, quote.currencyCode)}</strong>
                </p>
                <WorldlineCard
                  onPaid={(p) => bookMutation.mutate(p)}
                  submitting={bookMutation.isPending}
                />
              </>
            ) : stripePromise ? (
              <>
                <p className="mb-4 text-sm text-gray-600">
                  Total amount: <strong>{money(quote.grandTotal, quote.currencyCode)}</strong>
                </p>
                <Elements stripe={stripePromise}>
                  <StripeCard
                    onPaid={(p) => bookMutation.mutate(p)}
                    submitting={bookMutation.isPending}
                  />
                </Elements>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-900">Card Payment</span>
                  <span className="text-sm font-extrabold text-telivity-navy">
                    {money(quote.grandTotal, 'INR')}
                  </span>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-700">Card Number</label>
                    <input
                      type="text"
                      placeholder="•••• •••• •••• 4242"
                      defaultValue="4242 •••• •••• 4242"
                      disabled
                      className="mt-1 w-full rounded-xl border border-gray-300 bg-gray-50 px-3.5 py-2.5 text-xs text-gray-700 font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-700">Expires</label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        defaultValue="12/28"
                        disabled
                        className="mt-1 w-full rounded-xl border border-gray-300 bg-gray-50 px-3.5 py-2.5 text-xs text-gray-700 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-700">CVC</label>
                      <input
                        type="text"
                        placeholder="•••"
                        defaultValue="888"
                        disabled
                        className="mt-1 w-full rounded-xl border border-gray-300 bg-gray-50 px-3.5 py-2.5 text-xs text-gray-700 font-mono"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full py-3.5 text-sm font-bold"
                  onClick={payCardDemo}
                  disabled={bookMutation.isPending}
                >
                  {bookMutation.isPending ? 'Processing Card…' : `Pay ${money(quote.grandTotal, 'INR')} & Confirm`}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
}
