import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ConciergeBell,
  CalendarDays,
  Users,
  DoorOpen,
  Tags,
  Sparkles,
  Receipt,
  BadgeDollarSign,
  TrendingUp,
  Moon,
  BarChart3,
  Radio,
  Plug,
  Mail,
  MessageSquare,
  Settings,
  Shield,
  ShieldCheck,
  Upload,
  UsersRound,
  Briefcase,
  Banknote,
  Building2,
  Calculator,
  ReceiptText,
  ClipboardList,
  Globe,
  Inbox,
  Clock,
  CheckCircle2,
  XCircle,
  History,
  X,
  Plus,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useProperty } from '../../context/PropertyContext';
import { useDepartment, DEPARTMENTS_INFO } from '../../context/DepartmentContext';
import { isBookingRequestsUiEnabled } from '../../lib/bookingRequestsFeature';
import DepartmentSwitcher from './DepartmentSwitcher';

type NavItem = {
  to: string;
  icon: typeof LayoutDashboard;
  labelKey: string;
  permission?: string;
  roles?: string[];
};

type NavSection = {
  sectionKey?: string;
  items: NavItem[];
};

const DEPT_ALLOWED_ROUTES: Record<string, string[]> = {
  admin: ['/', '/admin-panel', '/manager-panel', '/front-office-panel', '/tariff-settings', '/departments', '/current-guests', '/front-desk', '/reservations', '/guests', '/rooms', '/rooms/types', '/housekeeping', '/staff', '/folios', '/guest-history', '/direct-bookings', '/direct-bookings/pending', '/direct-bookings/approved', '/direct-bookings/rejected', '/direct-bookings/history', '/reports', '/settings'],
  manager: ['/', '/admin-panel', '/manager-panel', '/front-office-panel', '/tariff-settings', '/departments', '/staff', '/current-guests', '/front-desk', '/reservations', '/guests', '/rooms', '/rooms/types', '/housekeeping', '/direct-bookings', '/direct-bookings/pending', '/direct-bookings/approved', '/direct-bookings/history', '/reports', '/settings'],
  front_office: ['/', '/front-office-panel', '/tariff-settings', '/departments', '/current-guests', '/front-desk', '/reservations', '/guests', '/rooms', '/rooms/types', '/guest-history', '/direct-bookings', '/direct-bookings/pending', '/direct-bookings/approved', '/direct-bookings/history'],
  housekeeping: ['/', '/departments', '/rooms', '/rooms/types', '/housekeeping', '/staff'],
  accounts: ['/', '/departments', '/folios', '/guest-history', '/reports'],
};

const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { to: '/', icon: LayoutDashboard, labelKey: 'Dashboard', permission: 'dashboard.view' },
      { to: '/admin-panel', icon: Shield, labelKey: '🛡️ Admin Panel', permission: 'admin.users.manage' },
      { to: '/manager-panel', icon: Briefcase, labelKey: '👔 Manager Panel', permission: 'dashboard.view' },
      { to: '/front-office-panel', icon: ConciergeBell, labelKey: '🛎️ Front Office Panel', permission: 'frontdesk.access' },
      { to: '/departments', icon: Building2, labelKey: 'All Departments (Hub)' },
      { to: '/current-guests', icon: Users, labelKey: 'In-House Guests', permission: 'frontdesk.access' },
      { to: '/front-desk', icon: ConciergeBell, labelKey: 'Front Desk', permission: 'frontdesk.access' },
      { to: '/direct-bookings', icon: Globe, labelKey: '🛎️ Website Bookings (Live)' },
      { to: '/reservations', icon: CalendarDays, labelKey: 'Booking Management', permission: 'reservations.read' },
      { to: '/guests', icon: Users, labelKey: 'Guest Management', permission: 'guests.read' },
      { to: '/rooms', icon: DoorOpen, labelKey: 'All Rooms Rack (28 Rooms)', permission: 'rooms.read' },
      { to: '/tariff-settings', icon: Tags, labelKey: 'Room Tariffs & Inventory (28)', permission: 'rooms.read' },
      { to: '/housekeeping', icon: Sparkles, labelKey: 'Housekeeping', permission: 'housekeeping.read' },
      { to: '/staff', icon: Briefcase, labelKey: 'Staff & 3 Shifts', permission: 'admin.users.manage' },
      { to: '/folios', icon: Receipt, labelKey: 'Folios & Billing', permission: 'folios.read' },
      { to: '/guest-history', icon: History, labelKey: 'Guest History', permission: 'guests.read' },
    ],
  },
  {
    sectionKey: 'Direct Website Bookings',
    items: [
      { to: '/direct-bookings', icon: Globe, labelKey: '🛎️ Website Bookings (Live)' },
      { to: '/direct-bookings/pending', icon: Clock, labelKey: '⏳ Pending Approvals' },
      { to: '/direct-bookings/approved', icon: CheckCircle2, labelKey: '✅ Approved Bookings' },
      { to: '/direct-bookings/history', icon: History, labelKey: '📜 Booking History & Audit' },
    ],
  },
  {
    items: [
      { to: '/reports', icon: BarChart3, labelKey: 'Reports & Analytics', permission: 'reports.view' },
      { to: '/settings', icon: Settings, labelKey: 'Hotel Settings', permission: 'settings.manage' },
    ],
  },
];

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const { user, hasRole, hasPermission } = useAuth();
  const { t } = useTranslation();
  const { propertyId, isPortfolioMode, properties } = useProperty();
  const { activeDepartment, setActiveDepartment } = useDepartment();
  const location = useLocation();

  const activeProperty = isPortfolioMode
    ? null
    : (Array.isArray(properties) ? properties.find((p) => p.id === propertyId) : null);

  const brandName = isPortfolioMode
    ? 'Hotel Spark'
    : (activeProperty?.name || 'Hotel Spark');
  const brandLogo = !isPortfolioMode ? activeProperty?.staffLogoUrl : null;

  const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const websiteUrl = isLocal
    ? 'http://localhost:5174/'
    : typeof window !== 'undefined'
      ? `${window.location.origin}/`
      : '/';

  const isAdmin = user?.roles.includes('admin') || user?.email === 'admin@sparkhotel.com';
  const isManager = !isAdmin && (user?.roles.includes('manager') || user?.roles.includes('general_manager'));
  const isFrontOffice = !isAdmin && !isManager;

  const consoleBadge = isAdmin
    ? 'SUPER ADMIN'
    : isManager
    ? 'HOTEL MANAGER'
    : `FRONT OFFICE (${user?.employeeId || 'FO'})`;

  // Role-Specific Navigation Menus
  const roleSections: NavSection[] = isAdmin
    ? [
        {
          sectionKey: 'Admin Management',
          items: [
            { to: '/admin', icon: Shield, labelKey: '🛡️ Super Admin Overview' },
            { to: '/rooms', icon: DoorOpen, labelKey: '🚪 Rooms Rack (28 Rooms)' },
            { to: '/reservations', icon: CalendarDays, labelKey: '📅 All Bookings' },
            { to: '/direct-bookings', icon: Globe, labelKey: '🛎️ Website Bookings' },
            { to: '/tariff-settings', icon: Tags, labelKey: '🏷️ Pricing & Tariffs' },
            { to: '/guests', icon: Users, labelKey: '👥 Guest Records' },
            { to: '/front-desk', icon: ConciergeBell, labelKey: '🛎️ Front Desk & Check-In' },
            { to: '/current-guests', icon: UsersRound, labelKey: '👥 In-House Guests' },
            { to: '/folios', icon: Receipt, labelKey: '🧾 Billing & Invoices' },
            { to: '/cashier', icon: Banknote, labelKey: '💳 Payments & Refunds' },
            { to: '/staff', icon: Briefcase, labelKey: '👔 Employees & Credentials' },
            { to: '/reports', icon: BarChart3, labelKey: '📊 Reports & Analytics' },
            { to: '/settings', icon: Settings, labelKey: '⚙️ Hotel Settings' },
          ],
        },
      ]
    : isManager
    ? [
        {
          sectionKey: 'Manager Dashboard',
          items: [
            { to: '/manager', icon: Briefcase, labelKey: '👔 Manager Overview' },
            { to: '/rooms', icon: DoorOpen, labelKey: '🚪 Rooms Availability' },
            { to: '/reservations', icon: CalendarDays, labelKey: '📅 All Hotel Bookings' },
            { to: '/direct-bookings', icon: Globe, labelKey: '🛎️ Website Bookings' },
            { to: '/front-desk', icon: ConciergeBell, labelKey: '🛎️ Front Desk Check-in' },
            { to: '/current-guests', icon: Users, labelKey: '👥 In-House & Checkout' },
            { to: '/folios', icon: Receipt, labelKey: '🧾 Folios & Billing' },
            { to: '/reports', icon: BarChart3, labelKey: '📊 Occupancy & Revenue' },
          ],
        },
      ]
    : [
        {
          sectionKey: 'Front Office Desk',
          items: [
            { to: '/front-office', icon: ConciergeBell, labelKey: '🛎️ Front Office Overview' },
            { to: '/direct-bookings', icon: Globe, labelKey: '🛎️ Today\'s Website Bookings' },
            { to: '/front-desk', icon: Plus, labelKey: '➕ Walk-In Guest & Check-In' },
            { to: '/rooms', icon: DoorOpen, labelKey: '🚪 Available Rooms Rack' },
            { to: '/current-guests', icon: Users, labelKey: '👥 In-House Guests' },
            { to: '/guest-history', icon: History, labelKey: '🧾 Checkout & Past Bills' },
          ],
        },
      ];

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          w-60 bg-telivity-navy text-white flex flex-col h-screen fixed left-0 top-0 z-50
          transition-transform duration-200
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
        style={
          !isPortfolioMode && activeProperty?.staffPrimaryColor
            ? { backgroundColor: activeProperty.staffPrimaryColor }
            : undefined
        }
      >
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            {brandLogo ? (
              <img src={brandLogo} alt="" className="h-8 w-8 rounded object-cover flex-shrink-0 bg-white/10" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/20 text-teal-400 border border-teal-400/30 text-base font-bold flex-shrink-0">
                ⚡
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-base font-bold tracking-wide truncate">{brandName}</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-block px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  {consoleBadge}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded hover:bg-white/10 flex-shrink-0"
            aria-label={t('nav.closeMenu')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Department Switcher */}
        <DepartmentSwitcher variant="sidebar" />

        {activeDepartment !== 'all' && (
          <div className="px-4 py-1.5 bg-white/5 border-b border-white/5 flex items-center justify-between text-[11px]">
            <span className="text-teal-300 font-semibold truncate">
              Filtered to {DEPARTMENTS_INFO[activeDepartment]?.shortName}
            </span>
            <button
              type="button"
              onClick={() => setActiveDepartment('all')}
              className="text-white/60 hover:text-white underline text-[10px]"
            >
              Show All
            </button>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto py-3" role="navigation" aria-label={t('nav.mainNavigation')}>
          {roleSections.map((section, sectionIdx) => (
            <div key={section.sectionKey ?? `section-${sectionIdx}`}>
              {section.sectionKey && (
                <p className="px-6 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                  {t(section.sectionKey)}
                </p>
              )}
              {section.items.map(({ to, icon: Icon, labelKey }) => (
                <NavLink
                  key={to}
                  to={propertyId ? `${to}${to.includes('?') ? '&' : '?'}propertyId=${encodeURIComponent(propertyId)}` : to}
                  end={to === '/'}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-6 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-telivity-teal/15 text-telivity-teal border-r-3 border-telivity-teal'
                        : 'text-white/70 hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  <Icon size={18} aria-hidden="true" />
                  {t(labelKey, { defaultValue: labelKey })}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="px-6 py-3 border-t border-white/10">
          <a
            href={websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-teal-500/10 text-teal-300 hover:bg-teal-500/20 text-xs font-semibold transition-colors border border-teal-500/30"
          >
            <Globe size={15} className="text-teal-400" />
            <span>Open Hotel Website</span>
          </a>
        </div>

        <div className="px-6 py-4 border-t border-white/10 text-xs text-telivity-mid-grey">
          v0.1.0
        </div>
      </aside>
    </>
  );
}
