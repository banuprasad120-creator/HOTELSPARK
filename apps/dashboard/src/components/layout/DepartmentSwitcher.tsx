import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  ConciergeBell,
  Sparkles,
  Briefcase,
  Receipt,
  ChevronDown,
  Check,
  Layers,
} from 'lucide-react';
import { useDepartment, DEPARTMENTS_INFO, type DepartmentKey } from '../../context/DepartmentContext';

interface DepartmentSwitcherProps {
  variant?: 'header' | 'sidebar' | 'inline';
}

export default function DepartmentSwitcher({ variant = 'header' }: DepartmentSwitcherProps) {
  const { activeDepartment, setActiveDepartment } = useDepartment();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const current = DEPARTMENTS_INFO[activeDepartment] || DEPARTMENTS_INFO.all;

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
      case 'front_office':
        return <ConciergeBell size={size} className="text-telivity-teal" />;
      case 'housekeeping':
        return <Sparkles size={size} className="text-amber-600" />;
      case 'manager':
        return <Briefcase size={size} className="text-purple-600" />;
      case 'accounts':
        return <Receipt size={size} className="text-emerald-600" />;
      default:
        return <Building2 size={size} className="text-telivity-navy" />;
    }
  };

  const handleSelect = (key: DepartmentKey) => {
    setActiveDepartment(key);
    setOpen(false);
  };

  if (variant === 'sidebar') {
    return (
      <div className="px-3 py-2 border-b border-white/10" ref={containerRef}>
        <div className="flex items-center justify-between mb-1.5 px-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-200/80 flex items-center gap-1">
            <Layers size={11} /> Department Panel
          </span>
          <button
            type="button"
            onClick={() => navigate('/departments')}
            className="text-[10px] font-semibold text-teal-300 hover:text-white underline transition"
            title="Open all department panels in one screen"
          >
            All In One
          </button>
        </div>

        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between p-2 rounded-xl bg-white/10 hover:bg-white/15 text-white transition text-xs font-semibold"
        >
          <div className="flex items-center gap-2 truncate">
            {getIcon(activeDepartment, 14)}
            <span className="truncate">{current.shortName}</span>
          </div>
          <ChevronDown size={14} className={`text-white/60 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="mt-1.5 p-1 bg-slate-800 rounded-xl border border-white/10 shadow-xl space-y-0.5 z-50">
            {(['all', 'front_office', 'housekeeping', 'manager', 'accounts'] as DepartmentKey[]).map((key) => {
              const info = DEPARTMENTS_INFO[key];
              const isSelected = activeDepartment === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSelect(key)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition text-left ${
                    isSelected ? 'bg-telivity-teal text-white font-bold' : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {getIcon(key, 13)}
                    <span className="truncate">{info.shortName}</span>
                  </div>
                  {isSelected && <Check size={12} />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Header Variant
  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-telivity-teal bg-white hover:bg-gray-50 text-xs font-bold text-telivity-navy transition shadow-2xs"
        title="Switch Department Panel or View All"
      >
        <span className="hidden lg:inline text-telivity-mid-grey font-medium">Panel:</span>
        {getIcon(activeDepartment, 13)}
        <span className="max-w-[120px] sm:max-w-none truncate">{current.shortName}</span>
        <ChevronDown size={12} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 sm:left-auto sm:right-0 mt-1.5 w-72 bg-white rounded-2xl border border-gray-100 shadow-2xl p-2 space-y-1 z-50 animate-in fade-in zoom-in-95">
          <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-telivity-slate flex items-center gap-1.5">
              <Building2 size={13} className="text-telivity-teal" /> Department Panels
            </span>
            <button
              type="button"
              onClick={() => {
                navigate('/departments');
                setOpen(false);
              }}
              className="text-[11px] font-bold text-telivity-teal hover:underline"
            >
              All In One Panel →
            </button>
          </div>

          {(['all', 'front_office', 'housekeeping', 'manager', 'accounts'] as DepartmentKey[]).map((key) => {
            const info = DEPARTMENTS_INFO[key];
            const isSelected = activeDepartment === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleSelect(key)}
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
