import { useState } from 'react';
import { ChevronDown, Menu, LogOut, User, Languages, Search, CircleHelp, Globe, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useProperty } from '../../context/PropertyContext';
import { PORTFOLIO_MODE_ID } from '../../lib/property-types';
import { getDateLocale } from '../../lib/date-locale';
import { useAuth, SPARK_CREDENTIAL_USERS } from '../../context/AuthContext';
import { useSocket } from '../../hooks/useSocket';
import { SUPPORTED_LANGUAGES } from '../../i18n';
import CommandPalette, { useCommandPaletteShortcut } from '../search/CommandPalette';
import NotificationBell from '../notifications/NotificationBell';
import HelpPanel from '../help/HelpPanel';
import WalkInCheckInModal from '../front-desk/WalkInCheckInModal';
import AddGuestModal from '../front-desk/AddGuestModal';
import DepartmentSwitcher from './DepartmentSwitcher';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { t, i18n } = useTranslation();
  const { propertyId, setPropertyId, properties, isPortfolioMode } = useProperty();
  const { user, roles, logout, switchUser } = useAuth();
  const { connected } = useSocket();
  const [open, setOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

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
            <DepartmentSwitcher variant="header" />
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

        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
          {/* WALK-IN CHECK-IN QUICK ACTION BUTTON */}
          <button
            type="button"
            onClick={() => setWalkInOpen(true)}
            className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-telivity-teal hover:bg-teal-600 text-white text-xs font-bold shadow-xs transition flex-shrink-0"
          >
            <Sparkles size={14} className="text-emerald-200" />
            <span className="hidden sm:inline">Walk-In Check-In</span>
            <span className="sm:hidden">Check-In</span>
          </button>

          <a
            href={websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold hover:bg-teal-100 transition-colors shadow-xs"
            title="Open Hotel Spark Guest Direct Booking Website"
          >
            <Globe size={14} className="text-teal-700" />
            <span>Hotel Website</span>
          </a>

          <div className="hidden sm:flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${connected || !isLocal ? 'bg-telivity-dark-teal' : 'bg-telivity-orange'}`} aria-hidden="true" />
            <span className="text-xs text-telivity-mid-grey hidden md:inline">{connected || !isLocal ? (!isLocal ? 'Live (Cloud)' : t('header.statusLive')) : t('header.statusOffline')}</span>
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

          {user ? (
            <div className="relative ml-2 pl-3 border-l border-gray-200">
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-1 rounded-xl hover:bg-gray-100 transition"
              >
                <div className="w-8 h-8 rounded-full bg-telivity-teal text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  {user.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-bold text-telivity-navy leading-tight">{user.name}</p>
                  <p className="text-[10px] text-teal-700 font-semibold">{user.roleTitle || user.roles[0] || 'Hotel Admin'}</p>
                </div>
                <ChevronDown size={14} className="text-gray-400" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-gray-200 p-3 z-50 space-y-3">
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="font-bold text-sm text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">{user.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2 py-0.5 bg-teal-100 text-teal-800 rounded text-[10px] font-bold">
                        {user.roleTitle || 'Hotel Staff'}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">{user.employeeId || 'ID: EMP-001'}</span>
                    </div>
                  </div>

                  {/* Switch Role Fast Selection */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-1 mb-1.5">
                      Switch Staff Account
                    </p>
                    <div className="grid grid-cols-1 gap-1">
                      {SPARK_CREDENTIAL_USERS.slice(0, 5).map((u) => (
                        <button
                          key={u.email}
                          type="button"
                          onClick={() => {
                            switchUser(u.email);
                            setUserMenuOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition ${
                            user.email === u.email ? 'bg-teal-50 text-teal-900 font-bold' : 'hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          <span>{u.name}</span>
                          <span className="text-[10px] text-gray-400">{u.roleTitle?.split(' ')[0]}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        setUserMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <LogOut size={14} />
                      <span>Lock & Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => logout()}
              className="px-3 py-1.5 text-xs font-bold bg-telivity-teal text-white rounded-lg hover:bg-teal-600 transition"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
      <HelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} />
      <AddGuestModal isOpen={walkInOpen} onClose={() => setWalkInOpen(false)} />
    </>
  );
}
