import { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Search } from './pages/Search';
import { Results } from './pages/Results';
import { RoomSelect } from './pages/RoomSelect';
import { Extras } from './pages/Extras';
import { GuestDetails } from './pages/GuestDetails';
import { Payment } from './pages/Payment';
import { PaymentReturn } from './pages/PaymentReturn';
import { Confirmation } from './pages/Confirmation';
import { ManageBooking } from './pages/ManageBooking';
import { CheckIn } from './pages/CheckIn';
import { RequestApplication } from './pages/RequestApplication';
import { RequestPayment } from './pages/RequestPayment';
import { RequestReceived } from './pages/RequestReceived';
import { DownloadApp } from './pages/DownloadApp';
import { isBookingRequestsUiEnabled } from './lib/bookingRequestsFeature';

function AdminGateway() {
  const isLocalDev = typeof window !== 'undefined' && window.location.hostname === 'localhost' && window.location.port === '5174';
  const adminUrl = isLocalDev ? 'http://localhost:5173/' : '/admin/';

  useEffect(() => {
    window.location.href = adminUrl;
  }, [adminUrl]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white p-6 font-sans">
      <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center shadow-2xl space-y-5">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 text-3xl font-bold">
          ⚡
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Hotel Spark Admin Console</h1>
          <p className="text-sm text-gray-400 mt-2 leading-relaxed">
            Redirecting to dedicated Admin Console...
          </p>
        </div>
        <div className="pt-2">
          <a
            href={adminUrl}
            className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-gray-950 font-semibold transition-colors shadow-lg shadow-teal-500/20"
          >
            <span>Open Dedicated Admin Panel</span>
            <span>&rarr;</span>
          </a>
        </div>
        <p className="text-xs text-gray-500">
          Direct URL: <span className="text-gray-400 font-mono">{adminUrl}</span>
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const requestRoutesEnabled = isBookingRequestsUiEnabled();
  return (
    <Routes>
      {/* Standalone Admin Portal Access: Completely separate from guest site */}
      <Route path="/admin" element={<AdminGateway />} />
      <Route path="/admin/*" element={<AdminGateway />} />
      <Route path="/dashboard" element={<AdminGateway />} />
      <Route path="/dashboard/*" element={<AdminGateway />} />

      {/* Guest-Facing Website Routes */}
      <Route
        path="/*"
        element={
          <Layout>
            <Routes>
              <Route path="/" element={<Search />} />
              <Route path="/results" element={<Results />} />
              <Route path="/room" element={<RoomSelect />} />
              <Route path="/extras" element={<Extras />} />
              <Route path="/guest" element={<GuestDetails />} />
              <Route path="/payment" element={<Payment />} />
              <Route path="/payment-return" element={<PaymentReturn />} />
              <Route path="/confirmation" element={<Confirmation />} />
              <Route path="/check-in" element={<CheckIn />} />
              {requestRoutesEnabled && (
                <>
                  <Route path="/request/application" element={<RequestApplication />} />
                  <Route path="/request/payment" element={<RequestPayment />} />
                  <Route path="/request/received" element={<RequestReceived />} />
                </>
              )}
              <Route path="/manage" element={<ManageBooking />} />
              <Route path="*" element={<Search />} />
            </Routes>
          </Layout>
        }
      />
    </Routes>
  );
}
