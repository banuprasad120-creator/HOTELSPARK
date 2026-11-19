import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SpeedInsights } from '@vercel/speed-insights/react';
import AppLayout from './components/layout/AppLayout';
import PropertyScopeBoundary from './components/layout/PropertyScopeBoundary';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { SkeletonPage } from './components/ui/Skeleton';
import { useRealtimeInvalidation } from './hooks/useRealtimeInvalidation';
import { isBookingRequestsUiEnabled } from './lib/bookingRequestsFeature';
import { useAuth } from './context/AuthContext';

const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const FrontDesk = lazy(() => import('./pages/FrontDesk'));
const Reservations = lazy(() => import('./pages/Reservations'));
const Guests = lazy(() => import('./pages/Guests'));
const Rooms = lazy(() => import('./pages/Rooms'));
const Housekeeping = lazy(() => import('./pages/Housekeeping'));
const Folios = lazy(() => import('./pages/Folios'));
const RatePlans = lazy(() => import('./pages/RatePlans'));
const Revenue = lazy(() => import('./pages/Revenue'));
const NightAudit = lazy(() => import('./pages/NightAudit'));
const Reports = lazy(() => import('./pages/Reports'));
const Channels = lazy(() => import('./pages/Channels'));
const Communications = lazy(() => import('./pages/Communications'));
const Reviews = lazy(() => import('./pages/Reviews'));
const Settings = lazy(() => import('./pages/Settings'));
const Import = lazy(() => import('./pages/Import'));
const Integrations = lazy(() => import('./pages/Integrations'));
const Groups = lazy(() => import('./pages/Groups'));
const Commercial = lazy(() => import('./pages/Commercial'));
const Cashier = lazy(() => import('./pages/Cashier'));
const HouseAccounts = lazy(() => import('./pages/HouseAccounts'));
const Accounting = lazy(() => import('./pages/Accounting'));
const TaxSettings = lazy(() => import('./pages/TaxSettings'));
const BookingRequests = lazy(() => import('./pages/BookingRequests'));
const DirectBookings = lazy(() => import('./pages/DirectBookings'));
const StaffManagement = lazy(() => import('./pages/StaffManagement'));
const InHouseGuests = lazy(() => import('./pages/InHouseGuests'));
const GuestHistory = lazy(() => import('./pages/GuestHistory'));
const DepartmentPanels = lazy(() => import('./pages/DepartmentPanels'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const ManagerPanel = lazy(() => import('./pages/ManagerPanel'));
const FrontOfficePanel = lazy(() => import('./pages/FrontOfficePanel'));
const RoomTariffSettings = lazy(() => import('./pages/RoomTariffSettings'));

/**
 * RoleGuard: Enforces strict route authorization across Admin, Manager, and Front Office.
 * Prevents non-authorized users from manually opening protected routes in the URL bar.
 */
function RoleGuard({
  allowedRoles,
  children,
}: {
  allowedRoles: string[];
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;

  // Super Admin has universal access
  if (user.roles.includes('admin') || user.email === 'admin@sparkhotel.com') {
    return <>{children}</>;
  }

  const isAllowed = allowedRoles.some((r) => user.roles.includes(r));
  if (!isAllowed) {
    if (user.roles.includes('manager')) {
      return <Navigate to="/manager" replace />;
    }
    return <Navigate to="/front-office" replace />;
  }

  return <>{children}</>;
}

function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Dashboard />;
  if (user.roles.includes('admin') || user.email === 'admin@sparkhotel.com') {
    return <AdminPanel />;
  }
  if (user.roles.includes('manager')) {
    return <Navigate to="/manager" replace />;
  }
  return <Navigate to="/front-office" replace />;
}

export default function App() {
  useRealtimeInvalidation();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<SkeletonPage />}>
          <AdminLogin />
        </Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <AppLayout>
      <SpeedInsights />
      <ErrorBoundary>
        <Suspense fallback={<SkeletonPage />}>
          <PropertyScopeBoundary>
            <Routes>
              <Route path="/" element={<RootRedirect />} />
              <Route
                path="/admin"
                element={
                  <RoleGuard allowedRoles={['admin']}>
                    <AdminPanel />
                  </RoleGuard>
                }
              />
              <Route
                path="/admin-panel"
                element={
                  <RoleGuard allowedRoles={['admin']}>
                    <AdminPanel />
                  </RoleGuard>
                }
              />
              <Route
                path="/panel"
                element={
                  <RoleGuard allowedRoles={['admin']}>
                    <AdminPanel />
                  </RoleGuard>
                }
              />
              <Route
                path="/manager"
                element={
                  <RoleGuard allowedRoles={['admin', 'manager', 'general_manager']}>
                    <ManagerPanel />
                  </RoleGuard>
                }
              />
              <Route
                path="/manager-panel"
                element={
                  <RoleGuard allowedRoles={['admin', 'manager', 'general_manager']}>
                    <ManagerPanel />
                  </RoleGuard>
                }
              />
              <Route
                path="/front-office"
                element={
                  <RoleGuard allowedRoles={['admin', 'manager', 'front_office', 'front_desk']}>
                    <FrontOfficePanel />
                  </RoleGuard>
                }
              />
              <Route
                path="/front-office-panel"
                element={
                  <RoleGuard allowedRoles={['admin', 'manager', 'front_office', 'front_desk']}>
                    <FrontOfficePanel />
                  </RoleGuard>
                }
              />
              <Route path="/in-house" element={<InHouseGuests />} />
              <Route
                path="/tariff-settings"
                element={
                  <RoleGuard allowedRoles={['admin']}>
                    <RoomTariffSettings />
                  </RoleGuard>
                }
              />
              <Route
                path="/rooms/tariff"
                element={
                  <RoleGuard allowedRoles={['admin']}>
                    <RoomTariffSettings />
                  </RoleGuard>
                }
              />
              <Route
                path="/rooms/types"
                element={
                  <RoleGuard allowedRoles={['admin']}>
                    <RoomTariffSettings />
                  </RoleGuard>
                }
              />
              <Route path="/departments" element={<DepartmentPanels />} />
              <Route path="/current-guests" element={<InHouseGuests />} />
              <Route path="/guest-history" element={<GuestHistory />} />
              <Route path="/front-desk" element={<FrontDesk />} />
              <Route
                path="/staff/*"
                element={
                  <RoleGuard allowedRoles={['admin']}>
                    <StaffManagement />
                  </RoleGuard>
                }
              />
              <Route path="/direct-bookings/*" element={<DirectBookings />} />
              {isBookingRequestsUiEnabled() && (
                <Route path="/booking-requests/*" element={<BookingRequests />} />
              )}
              <Route path="/reservations/*" element={<Reservations />} />
              <Route path="/guests/*" element={<Guests />} />
              <Route path="/rooms/*" element={<Rooms />} />
              <Route path="/housekeeping/*" element={<Housekeeping />} />
              <Route path="/folios/*" element={<Folios />} />
              <Route path="/groups/*" element={<Groups />} />
              <Route path="/commercial/*" element={<Commercial />} />
              <Route path="/cashier/*" element={<Cashier />} />
              <Route path="/house-accounts/*" element={<HouseAccounts />} />
              <Route path="/accounting/*" element={<Accounting />} />
              <Route
                path="/tax/*"
                element={
                  <RoleGuard allowedRoles={['admin']}>
                    <TaxSettings />
                  </RoleGuard>
                }
              />
              <Route path="/rate-plans/*" element={<RatePlans />} />
              <Route path="/revenue/*" element={<Revenue />} />
              <Route path="/night-audit" element={<NightAudit />} />
              <Route path="/reports/*" element={<Reports />} />
              <Route path="/channels/*" element={<Channels />} />
              <Route path="/integrations" element={<Integrations />} />
              <Route path="/communications" element={<Communications />} />
              <Route path="/reviews" element={<Reviews />} />
              <Route
                path="/settings/*"
                element={
                  <RoleGuard allowedRoles={['admin']}>
                    <Settings />
                  </RoleGuard>
                }
              />
              <Route path="/import" element={<Import />} />
            </Routes>
          </PropertyScopeBoundary>
        </Suspense>
      </ErrorBoundary>
    </AppLayout>
  );
}
