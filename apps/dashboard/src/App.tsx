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

/**
 * Automatically catches stale Vite dynamic import chunk failures after new deployments
 * and seamlessly reloads the window to fetch the latest assets.
 */
function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error: any) {
      const isChunkError =
        error?.message?.includes('dynamically imported module') ||
        error?.message?.includes('Loading chunk') ||
        error?.message?.includes('Failed to fetch');

      if (isChunkError && typeof window !== 'undefined') {
        const lastReload = Number(sessionStorage.getItem('last_chunk_reload') || '0');
        if (Date.now() - lastReload > 8000) {
          sessionStorage.setItem('last_chunk_reload', String(Date.now()));
          window.location.reload();
          return new Promise<{ default: T }>(() => {});
        }
      }
      throw error;
    }
  });
}

const AdminLogin = lazyWithRetry(() => import('./pages/AdminLogin'));
const Dashboard = lazyWithRetry(() => import('./pages/Dashboard'));
const FrontDesk = lazyWithRetry(() => import('./pages/FrontDesk'));
const Reservations = lazyWithRetry(() => import('./pages/Reservations'));
const Guests = lazyWithRetry(() => import('./pages/Guests'));
const Rooms = lazyWithRetry(() => import('./pages/Rooms'));
const Housekeeping = lazyWithRetry(() => import('./pages/Housekeeping'));
const Folios = lazyWithRetry(() => import('./pages/Folios'));
const RatePlans = lazyWithRetry(() => import('./pages/RatePlans'));
const Revenue = lazyWithRetry(() => import('./pages/Revenue'));
const NightAudit = lazyWithRetry(() => import('./pages/NightAudit'));
const Reports = lazyWithRetry(() => import('./pages/Reports'));
const Channels = lazyWithRetry(() => import('./pages/Channels'));
const Communications = lazyWithRetry(() => import('./pages/Communications'));
const Reviews = lazyWithRetry(() => import('./pages/Reviews'));
const Settings = lazyWithRetry(() => import('./pages/Settings'));
const Import = lazyWithRetry(() => import('./pages/Import'));
const Integrations = lazyWithRetry(() => import('./pages/Integrations'));
const Groups = lazyWithRetry(() => import('./pages/Groups'));
const Commercial = lazyWithRetry(() => import('./pages/Commercial'));
const Cashier = lazyWithRetry(() => import('./pages/Cashier'));
const HouseAccounts = lazyWithRetry(() => import('./pages/HouseAccounts'));
const Accounting = lazyWithRetry(() => import('./pages/Accounting'));
const TaxSettings = lazyWithRetry(() => import('./pages/TaxSettings'));
const BookingRequests = lazyWithRetry(() => import('./pages/BookingRequests'));
const DirectBookings = lazyWithRetry(() => import('./pages/DirectBookings'));
const StaffManagement = lazyWithRetry(() => import('./pages/StaffManagement'));
const InHouseGuests = lazyWithRetry(() => import('./pages/InHouseGuests'));
const GuestHistory = lazyWithRetry(() => import('./pages/GuestHistory'));
const DepartmentPanels = lazyWithRetry(() => import('./pages/DepartmentPanels'));
const AdminPanel = lazyWithRetry(() => import('./pages/AdminPanel'));
const ManagerPanel = lazyWithRetry(() => import('./pages/ManagerPanel'));
const FrontOfficePanel = lazyWithRetry(() => import('./pages/FrontOfficePanel'));
const RoomTariffSettings = lazyWithRetry(() => import('./pages/RoomTariffSettings'));

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
              <Route path="/departments" element={<RootRedirect />} />
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
              <Route
                path="/cashier/*"
                element={
                  <RoleGuard allowedRoles={['admin', 'manager', 'general_manager']}>
                    <Cashier />
                  </RoleGuard>
                }
              />
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
              <Route
                path="/revenue/*"
                element={
                  <RoleGuard allowedRoles={['admin', 'manager', 'general_manager']}>
                    <Revenue />
                  </RoleGuard>
                }
              />
              <Route
                path="/night-audit"
                element={
                  <RoleGuard allowedRoles={['admin', 'manager', 'general_manager']}>
                    <NightAudit />
                  </RoleGuard>
                }
              />
              <Route
                path="/reports/*"
                element={
                  <RoleGuard allowedRoles={['admin', 'manager', 'general_manager']}>
                    <Reports />
                  </RoleGuard>
                }
              />
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
