import React, { createContext, useContext, useState, useEffect } from 'react';

export type DepartmentKey = 'admin' | 'manager' | 'front_office' | 'all' | 'housekeeping' | 'accounts';

export interface DepartmentInfo {
  key: DepartmentKey;
  name: string;
  shortName: string;
  badge: string;
  color: string;
  bgLight: string;
  borderColor: string;
  iconName: string;
  managerName: string;
  description: string;
  route: string;
}

export const DEPARTMENTS_INFO: Record<DepartmentKey, DepartmentInfo> = {
  admin: {
    key: 'admin',
    name: 'Admin & Owner Operations Panel',
    shortName: 'Admin Panel',
    badge: 'Owner & Admin',
    color: 'text-amber-700',
    bgLight: 'bg-amber-50',
    borderColor: 'border-amber-200',
    iconName: 'Shield',
    managerName: 'Banu Prasad (Owner)',
    description: 'Master hotel governance, room base tariffs, staff salaries & permissions, GST compliance, and financial books.',
    route: '/admin-panel',
  },
  manager: {
    key: 'manager',
    name: 'Manager & 3 Shifts Operations Panel',
    shortName: 'Manager Panel',
    badge: 'Operations & 3 Shifts',
    color: 'text-purple-700',
    bgLight: 'bg-purple-50',
    borderColor: 'border-purple-200',
    iconName: 'Briefcase',
    managerName: 'Ramesh Rao / Shift Leads',
    description: 'Morning (06-14h), Evening (14-22h), and Night (22-06h) shift in-charge, handovers, and attendance.',
    route: '/manager-panel',
  },
  front_office: {
    key: 'front_office',
    name: 'Front Office & Reception Operations Panel',
    shortName: 'Front Office Panel',
    badge: 'Front Desk',
    color: 'text-telivity-teal',
    bgLight: 'bg-teal-50',
    borderColor: 'border-teal-200',
    iconName: 'ConciergeBell',
    managerName: 'Priya Sharma / Ramesh Rao',
    description: 'Guest check-in, check-out, room allocation, active stays, and Aadhaar identity verification.',
    route: '/front-office-panel',
  },
  all: {
    key: 'all',
    name: 'All Departments / Unified Hub',
    shortName: 'All Panels (Hub)',
    badge: 'Unified Console',
    color: 'text-telivity-navy',
    bgLight: 'bg-slate-100',
    borderColor: 'border-slate-300',
    iconName: 'Building2',
    managerName: 'Banu Prasad (Owner)',
    description: 'Unified management view across all hotel operations, shifts, rooms, and billing.',
    route: '/departments',
  },
  housekeeping: {
    key: 'housekeeping',
    name: 'Housekeeping & Maintenance Panel',
    shortName: 'Housekeeping',
    badge: 'Hygiene & Rooms',
    color: 'text-amber-700',
    bgLight: 'bg-amber-50',
    borderColor: 'border-amber-200',
    iconName: 'Sparkles',
    managerName: 'Kavitha Devi',
    description: 'Room cleaning statuses (Clean / Dirty / OOO), 3-shift cleaning roster, and staff assignments.',
    route: '/housekeeping',
  },
  accounts: {
    key: 'accounts',
    name: 'Accounts & Billing Panel',
    shortName: 'Accounts & Cashier',
    badge: 'Finance & GST',
    color: 'text-emerald-700',
    bgLight: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    iconName: 'Receipt',
    managerName: 'Sunil Kumar',
    description: 'Daily collections, Cash/UPI/Card payment settlements, unpaid balances, and GST tax invoices.',
    route: '/folios',
  },
};

interface DepartmentContextType {
  activeDepartment: DepartmentKey;
  setActiveDepartment: (dept: DepartmentKey) => void;
  departmentInfo: DepartmentInfo;
}

const DepartmentContext = createContext<DepartmentContextType | undefined>(undefined);

const DEPT_STORAGE_KEY = 'hotel_spark_active_department';

export function DepartmentProvider({ children }: { children: React.ReactNode }) {
  const [activeDepartment, setActiveDepartmentState] = useState<DepartmentKey>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem(DEPT_STORAGE_KEY) as DepartmentKey;
        if (saved && DEPARTMENTS_INFO[saved]) {
          return saved;
        }
      }
    } catch {
      // fallback
    }
    return 'all';
  });

  const setActiveDepartment = (dept: DepartmentKey) => {
    setActiveDepartmentState(dept);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(DEPT_STORAGE_KEY, dept);
      }
    } catch {
      // ignore
    }
  };

  const departmentInfo = DEPARTMENTS_INFO[activeDepartment] || DEPARTMENTS_INFO.all;

  return (
    <DepartmentContext.Provider
      value={{
        activeDepartment,
        setActiveDepartment,
        departmentInfo,
      }}
    >
      {children}
    </DepartmentContext.Provider>
  );
}

export function useDepartment() {
  const ctx = useContext(DepartmentContext);
  if (!ctx) {
    throw new Error('useDepartment must be used within a DepartmentProvider');
  }
  return ctx;
}
