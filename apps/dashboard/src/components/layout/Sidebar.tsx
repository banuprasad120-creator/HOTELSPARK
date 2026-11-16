import { NavLink } from 'react-router-dom';
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
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useProperty } from '../../context/PropertyContext';
import { isBookingRequestsUiEnabled } from '../../lib/bookingRequestsFeature';

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

const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { to: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard', permission: 'dashboard.view' },
      { to: '/current-guests', icon: Users, labelKey: 'In-House Guests', permission: 'frontdesk.access' },
      { to: '/front-desk', icon: ConciergeBell, labelKey: 'nav.frontDesk', permission: 'frontdesk.access' },
      { to: '/rooms', icon: DoorOpen, labelKey: 'All Rooms & Rack', permission: 'rooms.read' },
      { to: '/rooms/types', icon: Tags, labelKey: 'Room Categories & Pricing', permission: 'rooms.read' },
      { to: '/guest-history', icon: History, labelKey: 'Guest History', permission: 'guests.read' },
      { to: '/housekeeping', icon: Sparkles, labelKey: 'nav.housekeeping', permission: 'housekeeping.read' },
      { to: '/folios', icon: Receipt, labelKey: 'nav.foliosBilling', permission: 'folios.read' },
    ],
  },
  {
    sectionKey: 'Direct Booking Requests',
    items: [
      { to: '/direct-bookings', icon: Inbox, labelKey: 'Website Booking Inquiries', permission: 'reservations.read' },
    ],
  },
  {
    items: [
      { to: '/settings', icon: Settings, labelKey: 'Hotel Settings', permission: 'settings.manage' },
    ],
  },
];

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

function isItemVisible(
  item: NavItem,
  hasPermission: (key: string) => boolean,
  hasRole: (...roles: string[]) => boolean,
) {
  if (item.to === '/booking-requests' && !isBookingRequestsUiEnabled()) return false;
  if (item.permission) return hasPermission(item.permission);
  if (item.roles) return hasRole(...item.roles);
  return true;
}

export default function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const { hasRole, hasPermission } = useAuth();
  const { t } = useTranslation();
  const { propertyId, isPortfolioMode, properties } = useProperty();

  const activeProperty = isPortfolioMode
    ? null
    : (Array.isArray(properties) ? properties.find((p) => p.id === propertyId) : null);

  const brandName = isPortfolioMode
    ? 'Hotel Spark'
    : (activeProperty?.name || 'Hotel Spark');
  const brandLogo = !isPortfolioMode ? activeProperty?.staffLogoUrl : null;
  const tagline = 'Admin Console & PMS';

  const visibleSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => isItemVisible(item, hasPermission, hasRole)),
  })).filter((section) => section.items.length > 0);

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
                  ADMIN CONSOLE
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

        <nav className="flex-1 overflow-y-auto py-3" role="navigation" aria-label={t('nav.mainNavigation')}>
          {visibleSections.map((section, sectionIdx) => (
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
            href="http://localhost:5174/booking/?key=pk_live_HAIPDEMO0000000000000000"
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
