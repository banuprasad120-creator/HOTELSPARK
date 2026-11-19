import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { keycloak, AUTH_ENABLED } from '../lib/keycloak';
import { api } from '../lib/api';
import { reconnectSocket } from '../lib/socket';
import { useToast } from '../components/ui/Toast';
import { useTranslation } from 'react-i18next';

interface ApiErrorResponse {
  config?: {
    url?: string;
    method?: string;
    skipErrorToast?: boolean;
    isSilentPoll?: boolean;
  };
  response?: {
    status?: number;
    statusText?: string;
    data?: {
      message?: string | string[];
      label?: string;
      code?: string;
    };
  };
  message?: string;
  label?: string;
}

export interface AuthUser {
  sub: string;
  email: string;
  name: string;
  roles: string[];
  roleTitle?: string;
  employeeId?: string;
  department?: string;
}

export const SPARK_CREDENTIAL_USERS: AuthUser[] = [
  {
    sub: '9814bb0a-fd4e-4743-a18a-4cce1dd311a2',
    email: 'admin@sparkhotel.com',
    name: 'Banu Prasad (Owner)',
    employeeId: 'ADM001',
    roleTitle: 'Hotel Owner & Super Admin',
    department: 'Management',
    roles: ['admin', 'general_manager', 'front_desk', 'front_desk_manager', 'housekeeping_manager', 'accountant'],
  },
  {
    sub: 'eaece370-a568-40e2-8e40-cf6787c5fc50',
    email: 'manager@sparkhotel.com',
    name: 'Ramesh Rao',
    employeeId: 'MGR001',
    roleTitle: 'Hotel General Manager',
    department: 'Management',
    roles: ['manager', 'general_manager', 'front_desk_manager', 'front_desk'],
  },
  {
    sub: '368d157c-a3c3-4eca-80d9-b9122d209d95',
    email: 'fo001@sparkhotel.com',
    name: 'Priya Sharma (FO1)',
    employeeId: 'FO001',
    roleTitle: 'Front Office Executive 1 (Morning)',
    department: 'Front Office',
    roles: ['front_office', 'front_desk'],
  },
  {
    sub: 'a758badd-4bf4-492c-a1fe-e31e8ba8daa6',
    email: 'fo002@sparkhotel.com',
    name: 'Kiran Varma (FO2)',
    employeeId: 'FO002',
    roleTitle: 'Front Office Executive 2 (Evening)',
    department: 'Front Office',
    roles: ['front_office', 'front_desk'],
  },
  {
    sub: '80d8b117-3e8d-453a-a6a5-315847ee6f71',
    email: 'fo003@sparkhotel.com',
    name: 'Rahul Verma (FO3)',
    employeeId: 'FO003',
    roleTitle: 'Front Office Executive 3 (Night)',
    department: 'Front Office',
    roles: ['front_office', 'front_desk'],
  },
  // Backward-compatible aliases
  {
    sub: 'e0000002-0000-4000-a000-000000000001',
    email: 'frontdesk.mgr@sparkhotel.com',
    name: 'Ramesh Rao',
    employeeId: 'EMP-SPARK-002',
    roleTitle: 'Front Office Manager',
    department: 'Front Office',
    roles: ['manager', 'front_desk', 'front_desk_manager'],
  },
  {
    sub: 'e0000003-0000-4000-a000-000000000001',
    email: 'reception1@sparkhotel.com',
    name: 'Priya Sharma',
    employeeId: 'EMP-SPARK-003',
    roleTitle: 'Senior Receptionist',
    department: 'Front Office',
    roles: ['front_office', 'front_desk'],
  },
  {
    sub: 'e0000004-0000-4000-a000-000000000001',
    email: 'reception2@sparkhotel.com',
    name: 'Kiran Varma',
    employeeId: 'EMP-SPARK-004',
    roleTitle: 'Night Front Desk Executive',
    department: 'Front Office',
    roles: ['front_office', 'front_desk', 'night_auditor'],
  },
  {
    sub: 'e0000005-0000-4000-a000-000000000001',
    email: 'hk.mgr@sparkhotel.com',
    name: 'Kavitha Devi',
    employeeId: 'EMP-SPARK-005',
    roleTitle: 'Housekeeping Manager',
    department: 'Housekeeping',
    roles: ['housekeeping_manager', 'housekeeping'],
  },
  {
    sub: 'e0000006-0000-4000-a000-000000000001',
    email: 'accounts@sparkhotel.com',
    name: 'Sunil Kumar',
    employeeId: 'EMP-SPARK-006',
    roleTitle: 'Accountant',
    department: 'Accounts',
    roles: ['accountant', 'night_auditor'],
  },
  {
    sub: 'e0000007-0000-4000-a000-000000000001',
    email: 'hk.staff1@sparkhotel.com',
    name: 'Raju Nayak',
    employeeId: 'EMP-SPARK-007',
    roleTitle: 'Housekeeping Staff',
    department: 'Housekeeping',
    roles: ['housekeeping'],
  },
  {
    sub: 'e0000008-0000-4000-a000-000000000001',
    email: 'maintenance@sparkhotel.com',
    name: 'Satish Reddy',
    employeeId: 'EMP-SPARK-008',
    roleTitle: 'Maintenance Staff',
    department: 'Maintenance',
    roles: ['maintenance'],
  },
];

export function getCustomAuthUsers(): AuthUser[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem('hotel_spark_custom_users');
      return saved ? JSON.parse(saved) : [];
    }
  } catch {
    // ignore
  }
  return [];
}

export function getPasswordOverrides(): Record<string, string> {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem('hotel_spark_password_overrides');
      return saved ? JSON.parse(saved) : {};
    }
  } catch {
    // ignore
  }
  return {};
}

export function savePasswordOverride(email: string, newPassword: string) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const overrides = getPasswordOverrides();
      overrides[email.toLowerCase().trim()] = newPassword;
      window.localStorage.setItem('hotel_spark_password_overrides', JSON.stringify(overrides));
    }
  } catch {
    // ignore
  }
}

export function saveCustomAuthUser(user: AuthUser, initialPassword?: string) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const list = getCustomAuthUsers();
      const cleanEmail = user.email.toLowerCase().trim();
      const filtered = list.filter(
        (u) =>
          u.email.toLowerCase().trim() !== cleanEmail &&
          u.employeeId?.toLowerCase() !== user.employeeId?.toLowerCase()
      );
      filtered.push(user);
      window.localStorage.setItem('hotel_spark_custom_users', JSON.stringify(filtered));

      if (initialPassword) {
        savePasswordOverride(cleanEmail, initialPassword);
      }
    }
  } catch {
    // ignore
  }
}

export function getAllAuthUsers(): AuthUser[] {
  const custom = getCustomAuthUsers();
  const map = new Map<string, AuthUser>();
  for (const u of SPARK_CREDENTIAL_USERS) {
    map.set(u.email.toLowerCase(), u);
  }
  for (const u of custom) {
    map.set(u.email.toLowerCase(), u);
  }
  return Array.from(map.values());
}

export interface AuthContextType {
  user: AuthUser | null;
  roles: string[];
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  authEnabled: boolean;
  login: (email: string, password?: string) => { success: boolean; user?: AuthUser; error?: string };
  logout: () => void;
  switchUser: (identifier: string) => boolean;
  hasRole: (...roles: string[]) => boolean;
  hasPermission: (...permissions: string[]) => boolean;
  /** Set the current user's effective permissions (fetched once a property is active). */
  setPermissions: (permissions: string[]) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  roles: [],
  permissions: [],
  isAuthenticated: false,
  isLoading: true,
  authEnabled: false,
  login: () => ({ success: true }),
  logout: () => {},
  switchUser: () => true,
  hasRole: () => true,
  hasPermission: () => true,
  setPermissions: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

/**
 * AuthProvider — wraps the app with Keycloak authentication.
 *
 * When VITE_AUTH_ENABLED=true:
 * - Initializes Keycloak and redirects to login if not authenticated
 * - Attaches Bearer token to all API requests via axios interceptor
 * - Auto-refreshes token before expiry (every 4 minutes)
 * - Provides user info, roles, and logout function
 *
 * When VITE_AUTH_ENABLED=false (default):
 * - Renders children immediately without auth
 * - All role checks return true (unrestricted)
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (AUTH_ENABLED) return null;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem('hotel_spark_active_user');
        if (saved === 'logged_out') return null;
        if (saved) return JSON.parse(saved);
      }
    } catch (e) {
      void e;
    }
    return SPARK_CREDENTIAL_USERS[0];
  });
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(AUTH_ENABLED);
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    if (!AUTH_ENABLED) return;

    let refreshInterval: NodeJS.Timeout | undefined;

    keycloak
      .init({
        onLoad: 'login-required',
        pkceMethod: 'S256',
        checkLoginIframe: false,
      })
      .then((authenticated) => {
        if (authenticated && keycloak.tokenParsed) {
          const parsed = keycloak.tokenParsed as any;
          setUser({
            sub: parsed.sub ?? '',
            email: parsed.email ?? '',
            name: parsed.name ?? parsed.preferred_username ?? '',
            roles: parsed.realm_access?.roles ?? [],
          });

          // Set token on axios
          api.defaults.headers.common['Authorization'] = `Bearer ${keycloak.token}`;

          // Auto-refresh every 4 minutes (token expires in 5)
          refreshInterval = setInterval(() => {
            keycloak.updateToken(60).then((refreshed) => {
              if (refreshed) {
                api.defaults.headers.common['Authorization'] = `Bearer ${keycloak.token}`;
                reconnectSocket();
              }
            }).catch((err) => {
              console.error('Token refresh failed:', err);
              keycloak.login();
            });
          }, 4 * 60 * 1000);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Keycloak initialization failed:', err);
        setIsLoading(false);
      });

    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, []);

  // Intercept response errors globally: handle 401 login redirects and toast API errors
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401 && AUTH_ENABLED) {
          keycloak.login();
          return Promise.reject(error);
        }

        const apiError = error as ApiErrorResponse;
        const config = apiError.config;
        if (config?.skipErrorToast || config?.isSilentPoll) {
          return Promise.reject(error);
        }

        const url = config?.url || '';
        if (url.includes('/staff-notifications')) {
          return Promise.reject(error);
        }

        const data = apiError.response?.data;
        const m = data?.message ?? apiError.message;
        const rawMessage = Array.isArray(m)
          ? m.join(', ')
          : (m ?? apiError.response?.statusText ?? 'Request failed');

        console.error('[API Error]', config?.method?.toUpperCase() || 'GET', url, rawMessage);

        const displayMessage = String(t(`errors.${rawMessage}`, { defaultValue: rawMessage }));

        toast('error', displayMessage);
        return Promise.reject(error);
      },
    );

    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, [toast, t]);

  const login = useCallback((email: string, password?: string) => {
    const cleanEmail = email.trim().toLowerCase();

    // Check deactivated status
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const deactivatedList: string[] = JSON.parse(window.localStorage.getItem('hotel_spark_deactivated_users') || '[]');
        if (deactivatedList.includes(cleanEmail)) {
          return {
            success: false,
            error: `This account (${email}) has been deactivated by the Super Admin. Access is disabled.`,
          };
        }
      }
    } catch {
      // ignore
    }

    const allUsers = getAllAuthUsers();
    const matched = allUsers.find(
      (u) =>
        u.email.toLowerCase() === cleanEmail ||
        u.employeeId?.toLowerCase() === cleanEmail ||
        (cleanEmail === 'admin' && u.email === 'admin@sparkhotel.com') ||
        (cleanEmail === 'manager' && u.email === 'manager@sparkhotel.com') ||
        (cleanEmail === 'fo001' && u.employeeId === 'FO001') ||
        (cleanEmail === 'fo002' && u.employeeId === 'FO002') ||
        (cleanEmail === 'fo003' && u.employeeId === 'FO003'),
    );
    if (!matched) {
      return { success: false, error: `Staff account not found for "${email}". Check credentials list.` };
    }

    if (password && password.trim()) {
      const overrides = getPasswordOverrides();
      const customPass = overrides[matched.email.toLowerCase()];
      if (customPass) {
        if (customPass !== password.trim()) {
          return { success: false, error: `Invalid password for ${matched.name}. Please check your credentials.` };
        }
      } else {
        const allowedPasswords: Record<string, string[]> = {
          'admin@sparkhotel.com': ['SparkAdmin@2026', 'SparkHotel@2026'],
          'manager@sparkhotel.com': ['ManagerSpark@2026', 'SparkHotel@2026'],
          'frontdesk.mgr@sparkhotel.com': ['RameshSpark@2026', 'SparkHotel@2026'],
          'fo001@sparkhotel.com': ['FrontOffice1@2026', 'SparkHotel@2026', 'PriyaSpark@2026'],
          'reception1@sparkhotel.com': ['PriyaSpark@2026', 'SparkHotel@2026'],
          'fo002@sparkhotel.com': ['FrontOffice2@2026', 'SparkHotel@2026', 'KiranSpark@2026'],
          'reception2@sparkhotel.com': ['KiranSpark@2026', 'SparkHotel@2026'],
          'fo003@sparkhotel.com': ['FrontOffice3@2026', 'SparkHotel@2026'],
        };
        const allowed = allowedPasswords[matched.email.toLowerCase()] || ['SparkHotel@2026'];
        if (!allowed.includes(password.trim())) {
          return { success: false, error: `Invalid password for ${matched.name}. Please check your credentials.` };
        }
      }
    }

    setUser(matched);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('hotel_spark_active_user', JSON.stringify(matched));
      window.localStorage.setItem(`hotel_spark_last_login_${matched.sub}`, new Date().toISOString());
    }

    return { success: true, user: matched };
  }, []);

  const logout = useCallback(() => {
    if (AUTH_ENABLED) {
      keycloak.logout({ redirectUri: window.location.origin });
    } else {
      setUser(null);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('hotel_spark_active_user', 'logged_out');
      }
    }
  }, []);

  const switchUser = useCallback((identifier: string) => {
    const clean = identifier.trim().toLowerCase();
    const matched = getAllAuthUsers().find(
      (u) =>
        u.email.toLowerCase() === clean ||
        u.employeeId?.toLowerCase() === clean ||
        u.roleTitle?.toLowerCase().includes(clean),
    );
    if (matched) {
      setUser(matched);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('hotel_spark_active_user', JSON.stringify(matched));
      }
      return true;
    }
    return false;
  }, []);

  const roles = user?.roles ?? [];

  const hasRole = useCallback(
    (...requiredRoles: string[]) => {
      if (!user) return false;
      // Super Admin has all roles
      if (roles.includes('admin') || user.email === 'admin@sparkhotel.com') {
        return true;
      }
      // If admin role is strictly required, non-admins return false
      if (requiredRoles.includes('admin') && !roles.includes('admin')) {
        return false;
      }
      // Manager role checks
      if (roles.includes('manager') || roles.includes('general_manager')) {
        if (requiredRoles.includes('manager') || requiredRoles.includes('general_manager') || requiredRoles.includes('front_office') || requiredRoles.includes('front_desk')) {
          return true;
        }
      }
      // Front Office role checks
      if (roles.includes('front_office') || roles.includes('front_desk')) {
        // Front office users do NOT have admin, manager, or general_manager roles
        if (requiredRoles.includes('admin') || requiredRoles.includes('manager') || requiredRoles.includes('general_manager')) {
          return false;
        }
        if (requiredRoles.includes('front_office') || requiredRoles.includes('front_desk')) {
          return true;
        }
      }
      return requiredRoles.some((role) => roles.includes(role));
    },
    [user, roles],
  );

  // Permission-based gating
  const hasPermission = useCallback(
    (...required: string[]) => {
      if (!user) return false;
      if (roles.includes('admin') || user.email === 'admin@sparkhotel.com') {
        return true;
      }
      // Front office cannot manage master rates or users
      if (roles.includes('front_office')) {
        const forbiddenForFO = ['admin.users.manage', 'rates.manage', 'settings.manage', 'system.admin'];
        if (required.some((p) => forbiddenForFO.includes(p))) {
          return false;
        }
      }
      // Manager cannot manage super admin users or system settings
      if (roles.includes('manager') && !roles.includes('admin')) {
        const forbiddenForMgr = ['admin.credentials.change', 'system.admin'];
        if (required.some((p) => forbiddenForMgr.includes(p))) {
          return false;
        }
      }
      if (!AUTH_ENABLED) return true;
      return required.every((p) => permissions.includes(p));
    },
    [user, roles, permissions],
  );

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      roles,
      permissions,
      isAuthenticated: !!user,
      isLoading,
      authEnabled: AUTH_ENABLED,
      login,
      logout,
      switchUser,
      hasRole,
      hasPermission,
      setPermissions,
    }),
    [user, roles, permissions, isLoading, login, logout, switchUser, hasRole, hasPermission],
  );

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900 mx-auto" />
          <p className="mt-4 text-sm text-gray-500">Authenticating...</p>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
