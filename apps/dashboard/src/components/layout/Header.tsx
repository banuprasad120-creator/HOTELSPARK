import { useState } from 'react';
import { ChevronDown, Menu, LogOut, User, Languages, Search, CircleHelp, Globe, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useProperty } from '../../context/PropertyContext';
import { PORTFOLIO_MODE_ID } from '../../lib/property-types';
import { getDateLocale } from '../../lib/date-locale';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../hooks/useSocket';
import { SUPPORTED_LANGUAGES } from '../../i18n';
import CommandPalette, { useCommandPaletteShortcut } from '../search/CommandPalette';
import NotificationBell from '../notifications/NotificationBell';
import HelpPanel from '../help/HelpPanel';
import WalkInCheckInModal from '../front-desk/WalkInCheckInModal';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { t, i18n } = useTranslation();
  const { propertyId, setPropertyId, properties, isPortfolioMode } = useProperty();
  const { user, roles, authEnabled, logout } = useAuth();
  const { connected } = useSocket();
  const [open, setOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [walkInOpen, setWalkInOpen] = useState(false);

  useCommandPaletteShortcut(() => setSearchOpen(true));

  const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  const websiteUrl = isLocal ? 'http://localhost:5174/' : '/';

  const activeProperty = isPortfolioMode
    ? null
    : (Array.isArray(properties) ? properties.find((p) => p.id === propertyId) : null);
  const currentLang =
    SUPPORTED_LANGUAGES.find((l) => l.code === i18n.resolvedLanguage) ??
    SUPPORTED_LANGUAGES[0];
  const formattedToday = format(new Date(), 'PPPP', { locale: getDateLocale(i18n.resolvedLanguage) });

  const propertyLabel = isPortfolioMode
    ? t('header.allProperties', { defaultValue: 'All Properties' })
    : (activeProperty?.name ?? 'Hotel Spark');

  return (
    <>
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-3 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-telivity-light-grey"
            aria-label={t('header.openMenu')}
          >
            <Menu size={20} className="text-telivity-slate" />
          </button>

          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-telivity-navy tracking-tight hidden sm:inline">
              Hotel Spark
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
              PMS
            </span>
          </div>

          <button
            onClick={() => setSearchOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-telivity-teal text-sm text-telivity-mid-grey transition-colors min-w-[160px]"
          >
            <Search size={14} />
            <span className="flex-1 text-left">{t('header.search')}</span>
            <kbd className="text-[10px] bg-telivity-light-grey px-1.5 py-0.5 rounded">⌘K</kbd>
          </button>

          <span className="text-sm text-telivity-mid-grey hidden md:inline">
            {formattedToday}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* WALK-IN CHECK-IN QUICK ACTION BUTTON */}
          <button
            type="button"
            onClick={() => setWalkInOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-telivity-teal hover:bg-teal-600 text-white text-xs font-bold shadow-xs transition"
          >
            <Sparkles size={14} />
            <span>Walk-In Check-In</span>
          </button>

          <a
            href={websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold hover:bg-teal-100 transition-colors shadow-xs"
            title="Open Hotel Spark Guest Direct Booking Website"
          >
            <Globe size={14} className="text-teal-700" />
            <span>Hotel Website</span>
          </a>

          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-telivity-dark-teal' : 'bg-telivity-orange'}`} aria-hidden="true" />
            <span className="text-xs text-telivity-mid-grey hidden sm:inline">{connected ? t('header.statusLive') : t('header.statusOffline')}</span>
          </div>

          <button
            onClick={() => setSearchOpen(true)}
            className="sm:hidden p-2 rounded-lg hover:bg-telivity-light-grey"
            aria-label={t('header.search')}
          >
            <Search size={18} className="text-telivity-slate" />
          </button>

          {/* Language switcher */}
          <div className="relative">
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-telivity-light-grey text-xs font-medium text-telivity-slate transition-colors"
              aria-haspopup="listbox"
              aria-expanded={langOpen}
              aria-label={t('header.language')}
              title={t('header.language')}
            >
              <Languages size={16} className="text-telivity-slate" />
              <span className="uppercase hidden sm:inline">{currentLang.code}</span>
              <ChevronDown size={12} />
            </button>
            {langOpen && (
              <div className="absolute top-full right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1" role="listbox">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => { i18n.changeLanguage(lang.code); setLangOpen(false); }}
                    role="option"
                    aria-selected={lang.code === currentLang.code}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-telivity-light-grey transition-colors ${
                      lang.code === currentLang.code ? 'text-telivity-teal font-semibold' : ''
                    }`}
                  >
                    {lang.label}
                    <span className="text-telivity-mid-grey ml-2 uppercase">({lang.code})</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setHelpOpen(true)}
            className="p-2 rounded-lg hover:bg-telivity-light-grey transition-colors"
            aria-label={t('header.help', { defaultValue: 'Help' })}
            title={t('header.help', { defaultValue: 'Help' })}
          >
            <CircleHelp size={18} className="text-telivity-slate" />
          </button>

          <NotificationBell />

          {authEnabled && user && (
            <div className="flex items-center gap-2 ml-2 pl-3 border-l border-gray-200">
              <div className="hidden sm:block text-right">
                <p className="text-xs font-medium text-telivity-slate">{user.name || user.email}</p>
                <p className="text-[10px] text-telivity-mid-grey capitalize">
                  {roles.filter(r => !r.startsWith('default-')).join(', ') || t('header.user')}
                </p>
              </div>
              <User size={16} className="sm:hidden text-telivity-slate" />
              <button
                onClick={logout}
                className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                aria-label={t('header.logout')}
                title={t('header.logout')}
              >
                <LogOut size={16} className="text-telivity-mid-grey hover:text-red-600" />
              </button>
            </div>
          )}
        </div>
      </header>

      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
      <HelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} />
      <WalkInCheckInModal open={walkInOpen} onClose={() => setWalkInOpen(false)} />
    </>
  );
}
