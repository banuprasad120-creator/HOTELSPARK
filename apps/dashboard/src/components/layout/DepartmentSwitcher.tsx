import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Building2,
  ConciergeBell,
  Briefcase,
  Shield,
  Layers,
  ChevronDown,
  Check,
  Sparkles,
  Receipt,
} from 'lucide-react';
import { useDepartment, DEPARTMENTS_INFO, type DepartmentKey } from '../../context/DepartmentContext';

interface DepartmentSwitcherProps {
  variant?: 'header' | 'sidebar' | 'pills';
}

export default function DepartmentSwitcher({ variant = 'header' }: DepartmentSwitcherProps) {
  const { activeDepartment, setActiveDepartment } = useDepartment();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Detect active panel based on URL pathname
  const currentPath = location.pathname;
  const currentKey: DepartmentKey = currentPath.includes('/admin-panel')
    ? 'admin'
    : currentPath.includes('/manager-panel')
    ? 'manager'
    : currentPath.includes('/front-office-panel')
    ? 'front_office'
    : currentPath.includes('/departments')
    ? 'all'
    : activeDepartment;

  const current = DEPARTMENTS_INFO[currentKey] || DEPARTMENTS_INFO.admin;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIcon = (key: DepartmentKey, size = 14) => {
    switch (key) {
      case 'admin':
        return <Shield size={size} className="text-amber-500 fill-amber-500/20" />;
      case 'manager':
        return <Briefcase size={size} className="text-purple-500" />;
      case 'front_office':
        return <ConciergeBell size={size} className="text-telivity-teal" />;
      case 'housekeeping':
        return <Sparkles size={size} className="text-amber-600" />;
      case 'accounts':
        return <Receipt size={size} className="text-emerald-600" />;
      default:
        return <Building2 size={size} className="text-telivity-navy" />;
    }
  };

  const handleNavigate = (key: DepartmentKey) => {
    setActiveDepartment(key);
    setOpen(false);
    const targetRoute = DEPARTMENTS_INFO[key]?.route || '/departments';
    navigate(targetRoute);
  };

  // 1. PILLS VARIANT (For direct 1-click panel switching in the top header)
  if (variant === 'pills') {
    return (
      <div className="flex items-center gap-1 bg-slate-100 p-0.5 sm:p-1 rounded-xl border border-gray-200">
        <button
          type="button"
          onClick={() => handleNavigate('admin')}
          className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition ${
            currentKey === 'admin'
              ? 'bg-slate-900 text-amber-400 shadow-xs ring-1 ring-amber-400/30'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
          }`}
          title="Switch to Admin & Owner Panel"
        >
          <Shield size={12} className={currentKey === 'admin' ? 'fill-amber-400 text-amber-400' : 'text-slate-500'} />
          <span className="hidden sm:inline">Admin</span>
          <span className="sm:hidden">Adm</span>
        </button>

        <button
          type="button"
          onClick={() => handleNavigate('manager')}
          className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition ${
            currentKey === 'manager'
              ? 'bg-purple-800 text-white shadow-xs ring-1 ring-purple-400/30'
              : 'text-slate-600 hover:text-purple-700 hover:bg-white/80'
          }`}
          title="Switch to Manager & 3 Shifts Panel"
        >
          <Briefcase size={12} className={currentKey === 'manager' ? 'text-purple-200' : 'text-slate-500'} />
          <span className="hidden sm:inline">Manager</span>
          <span className="sm:hidden">Mgr</span>
        </button>

        <button
          type="button"
          onClick={() => handleNavigate('front_office')}
          className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition ${
            currentKey === 'front_office'
              ? 'bg-telivity-teal text-white shadow-xs ring-1 ring-teal-300/30'
              : 'text-slate-600 hover:text-teal-700 hover:bg-white/80'
          }`}
          title="Switch to Front Office & Reception Panel"
        >
          <ConciergeBell size={12} className={currentKey === 'front_office' ? 'text-white' : 'text-slate-500'} />
          <span className="hidden sm:inline">Front Desk</span>
          <span className="sm:hidden">Desk</span>
        </button>
      </div>
    );
  }

  // 2. SIDEBAR VARIANT
  if (variant === 'sidebar') {
    return (
      <div className="px-3 py-2 border-b border-white/10" ref={containerRef}>
        <div className="flex items-center justify-between mb-1.5 px-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-200/80 flex items-center gap-1">
            <Layers size={11} /> Department Consoles
          </span>
          <button
            type="button"
            onClick={() => navigate('/departments')}
            className="text-[10px] font-semibold text-teal-300 hover:text-white underline transition"
            title="Open all department panels in one screen"
          >
            All-In-One Hub
          </button>
        </div>

        {/* 3 Dedicated Quick Buttons in Sidebar */}
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => handleNavigate('admin')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
              currentKey === 'admin'
                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 shadow-xs'
                : 'text-white/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              <Shield size={14} className="text-amber-400 fill-amber-400/20" />
              <span>Admin Panel</span>
            </div>
            {currentKey === 'admin' && <span className="text-[9px] bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded font-black">ACTIVE</span>}
          </button>

          <button
            type="button"
            onClick={() => handleNavigate('manager')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
              currentKey === 'manager'
                ? 'bg-purple-600/40 text-purple-200 border border-purple-400/40 shadow-xs'
                : 'text-white/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              <Briefcase size={14} className="text-purple-300" />
              <span>Manager Panel</span>
            </div>
            {currentKey === 'manager' && <span className="text-[9px] bg-purple-400 text-purple-950 px-1.5 py-0.2 rounded font-black">ACTIVE</span>}
          </button>

          <button
            type="button"
            onClick={() => handleNavigate('front_office')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
              currentKey === 'front_office'
                ? 'bg-teal-500/30 text-teal-200 border border-teal-400/40 shadow-xs'
                : 'text-white/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              <ConciergeBell size={14} className="text-teal-300" />
              <span>Front Office Panel</span>
            </div>
            {currentKey === 'front_office' && <span className="text-[9px] bg-teal-400 text-teal-950 px-1.5 py-0.2 rounded font-black">ACTIVE</span>}
          </button>
        </div>
      </div>
    );
  }

  // 3. HEADER DROPDOWN VARIANT
  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-telivity-teal bg-white hover:bg-gray-50 text-xs font-bold text-telivity-navy transition shadow-2xs"
        title="Switch Department Panel"
      >
        <span className="hidden xl:inline text-telivity-mid-grey font-medium">Panel:</span>
        {getIcon(currentKey, 13)}
        <span className="max-w-[120px] sm:max-w-none truncate">{current.shortName}</span>
        <ChevronDown size={12} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 sm:left-auto sm:right-0 mt-1.5 w-76 bg-white rounded-2xl border border-gray-100 shadow-2xl p-2 space-y-1 z-50 animate-in fade-in zoom-in-95">
          <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-telivity-slate flex items-center gap-1.5">
              <Building2 size={13} className="text-telivity-teal" /> Dedicated Department Panels
            </span>
            <button
              type="button"
              onClick={() => {
                navigate('/departments');
                setOpen(false);
              }}
              className="text-[11px] font-bold text-telivity-teal hover:underline"
            >
              All In One →
            </button>
          </div>

          {(['admin', 'manager', 'front_office', 'all'] as DepartmentKey[]).map((key) => {
            const info = DEPARTMENTS_INFO[key];
            const isSelected = currentKey === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleNavigate(key)}
                className={`w-full flex items-start gap-2.5 p-2 rounded-xl text-left transition ${
                  isSelected
                    ? 'bg-telivity-teal/10 border border-telivity-teal/30 text-telivity-navy'
                    : 'hover:bg-gray-50 text-telivity-slate'
                }`}
              >
                <div className="p-1.5 rounded-lg bg-gray-100/80 mt-0.5">
                  {getIcon(key, 14)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-telivity-navy truncate">{info.name}</span>
                    {isSelected && <Check size={14} className="text-telivity-teal ml-1 shrink-0" />}
                  </div>
                  <p className="text-[10px] text-telivity-mid-grey truncate mt-0.5">
                    Lead: {info.managerName}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
