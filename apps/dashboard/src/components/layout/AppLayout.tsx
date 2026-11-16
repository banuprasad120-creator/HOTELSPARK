import { useState, useEffect, type ReactNode, useMemo } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import BookingAlertCard from '../notifications/BookingAlertCard';
import { useAuth } from '../../context/AuthContext';
import { useProperty } from '../../context/PropertyContext';
import { useMyPermissions } from '../../hooks/useAdmin';

export default function AppLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { authEnabled, setPermissions } = useAuth();
  const { propertyId, isPortfolioMode, properties } = useProperty();

  const safeProperties = Array.isArray(properties) ? properties : [];
  const permissionsPropertyId =
    isPortfolioMode ? (safeProperties[0]?.id ?? null) : propertyId;

  const { data } = useMyPermissions(permissionsPropertyId, authEnabled);
  useEffect(() => {
    if (data?.permissions) setPermissions(data.permissions);
  }, [data, setPermissions]);

  const activeProperty = useMemo(
    () => (isPortfolioMode ? null : safeProperties.find((p) => p.id === propertyId) ?? null),
    [isPortfolioMode, safeProperties, propertyId],
  );

  useEffect(() => {
    const root = document.documentElement;
    if (activeProperty?.staffPrimaryColor) {
      root.style.setProperty('--staff-primary', activeProperty.staffPrimaryColor);
    } else {
      root.style.removeProperty('--staff-primary');
    }
    if (activeProperty?.staffAccentColor) {
      root.style.setProperty('--staff-accent', activeProperty.staffAccentColor);
    } else {
      root.style.removeProperty('--staff-accent');
    }
  }, [activeProperty?.staffPrimaryColor, activeProperty?.staffAccentColor]);

  return (
    <div className="min-h-screen bg-telivity-light-grey overflow-x-hidden">
      <BookingAlertCard />
      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-h-screen flex-col lg:ml-60 overflow-x-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex flex-1 flex-col p-3 sm:p-4 lg:p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
