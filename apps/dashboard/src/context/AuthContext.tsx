import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import {
  getKeycloak,
  initKeycloak,
  keycloakLogin,
  keycloakLogout,
  keycloakHasRole,
  extractUserFromToken,
} from '../lib/keycloak';
import { setAuthTokenProvider } from '../lib/api';
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  getStoredSupabaseSession,
  setStoredSupabaseSession,
  refreshSupabaseSessionIfNeeded,
  supabaseFetch,
  type SupabaseAuthSession,
} from '../lib/supabase';

const KEYCLOAK_ENABLED = import.meta.env.VITE_AUTH_ENABLED === 'true';

export interface AuthUser {
  sub: string;
  email: string;
  name: string;
  employeeId?: string;
  roleTitle?: string;
  department?: string;
  dashboardRoute?: string;
  roles: string[];
}

export interface AuthContextType {
  user: AuthUser | null;
  roles: string[];
  permissions: string[];
  setPermissions: (permissions: string[]) => void;
  isLoading: boolean;
  isAuthenticated: boolean;
  keycloakEnabled: boolean;
  authEnabled: boolean;
  login: (email?: string, password?: string) => Promise<{ success: boolean; error?: string; user?: AuthUser }>;
  logout: () => Promise<void>;
  hasRole: (...roleNames: string[]) => boolean;
  hasPermission: (permission: string) => boolean;
}

function deriveAppRoles(rawRole: string | undefined): {
  primary: 'admin' | 'manager' | 'front_office' | 'accountant' | 'housekeeping';
  roles: string[];
  dashboardRoute: string;
} {
  const r = (rawRole || '').toLowerCase();
  if (r.includes('super_admin') || r.includes('hotel_admin') || r === 'admin' || r.includes('owner')) {
    return {
      primary: 'admin',
      roles: ['admin', 'general_manager', 'manager', 'front_desk', 'front_office', 'accountant', 'housekeeping'],
      dashboardRoute: '/admin',
    };
  }
  if (r.includes('manager') || r === 'general_manager') {
    return {
      primary: 'manager',
      roles: ['manager', 'general_manager', 'front_desk', 'front_office'],
      dashboardRoute: '/manager',
    };
  }
  if (r.includes('accountant')) {
    return {
      primary: 'accountant',
      roles: ['accountant'],
      dashboardRoute: '/folios',
    };
  }
  if (r.includes('housekeeping')) {
    return {
      primary: 'housekeeping',
      roles: ['housekeeping'],
      dashboardRoute: '/housekeeping',
    };
  }
  return {
    primary: 'front_office',
    roles: ['front_office', 'front_desk', 'receptionist'],
    dashboardRoute: '/front-office',
  };
}

function getPermissionsForRole(roles: string[]): string[] {
  if (roles.includes('admin')) {
    return [
      'admin:settings',
      'admin:staff',
      'admin:tariffs',
      'reservations:read',
      'reservations:write',
      'reservations:cancel',
      'guests:read',
      'guests:write',
      'folios:read',
      'folios:write',
      'folios:void',
      'rooms:read',
      'rooms:write',
      'rates:read',
      'rates:write',
      'housekeeping:read',
      'housekeeping:write',
      'reports:read',
      'cashier:read',
      'cashier:write',
      'direct_bookings:approve',
      'direct_bookings:reject',
    ];
  }
  if (roles.includes('manager')) {
    return [
      'reservations:read',
      'reservations:write',
      'reservations:cancel',
      'guests:read',
      'guests:write',
      'folios:read',
      'folios:write',
      'rooms:read',
      'rooms:write',
      'housekeeping:read',
      'housekeeping:write',
      'reports:read',
      'cashier:read',
      'direct_bookings:approve',
      'direct_bookings:reject',
    ];
  }
  if (roles.includes('accountant')) {
    return ['folios:read', 'folios:write', 'reports:read', 'cashier:read', 'cashier:write'];
  }
  if (roles.includes('housekeeping')) {
    return ['rooms:read', 'rooms:write', 'housekeeping:read', 'housekeeping:write'];
  }
  return [
    'reservations:read',
    'reservations:write',
    'guests:read',
    'guests:write',
    'folios:read',
    'folios:write',
    'rooms:read',
    'rooms:write',
    'housekeeping:read',
    'direct_bookings:approve',
    'direct_bookings:reject',
  ];
}

async function resolveAuthenticatedStaffUser(session: SupabaseAuthSession): Promise<AuthUser | null> {
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
    },
  });
  if (!userRes.ok) {
    return null;
  }
  const sbUser = await userRes.json();
  const email = (sbUser.email || '').toLowerCase();
  if (!sbUser?.id || !email) return null;

  // Query live DB employee + profile + hotel_members for authoritative role and active status
  let empRow: any = null;
  let profileRow: any = null;
  let memberRow: any = null;

  try {
    const [emps, profs, members] = await Promise.all([
      supabaseFetch<any[]>(
        `/employees?select=id,employee_id,name,email,role,designation,department_id,status,department:departments(name)&or=(auth_user_id.eq.${sbUser.id},email.eq.${encodeURIComponent(email)})&limit=1`
      ).catch(() => []),
      supabaseFetch<any[]>(`/profiles?select=id,email,full_name,role,status&id=eq.${sbUser.id}&limit=1`).catch(() => []),
      supabaseFetch<any[]>(`/hotel_members?select=role,status&user_id=eq.${sbUser.id}&limit=1`).catch(() => []),
    ]);
    empRow = Array.isArray(emps) && emps.length > 0 ? emps[0] : null;
    profileRow = Array.isArray(profs) && profs.length > 0 ? profs[0] : null;
    memberRow = Array.isArray(members) && members.length > 0 ? members[0] : null;
  } catch {
    /* ignore lookup errors and fall back to verified app_metadata */
  }

  if (empRow && empRow.status && empRow.status !== 'active') {
    throw new Error('This staff account is inactive. Contact the Hotel Admin.');
  }
  if (profileRow && profileRow.status && profileRow.status !== 'active') {
    throw new Error('This staff profile is suspended. Contact the Hotel Admin.');
  }
  if (memberRow && memberRow.status && memberRow.status !== 'active') {
    throw new Error('Hotel membership is suspended. Contact the Hotel Admin.');
  }

  // Strictly resolve role from app_metadata, hotel_members, profile, or employees (never client-editable user_metadata alone for admin)
  const rawRole =
    sbUser.app_metadata?.role ||
    memberRow?.role ||
    profileRow?.role ||
    empRow?.role ||
    'receptionist';

  const derived = deriveAppRoles(String(rawRole));
  return {
    sub: sbUser.id,
    email,
    name: empRow?.name || profileRow?.full_name || sbUser.user_metadata?.name || email.split('@')[0],
    employeeId: empRow?.employee_id || sbUser.user_metadata?.employee_id,
    roleTitle: empRow?.designation || empRow?.role || sbUser.user_metadata?.roleTitle || derived.primary,
    department: empRow?.department?.name || sbUser.user_metadata?.department || 'Operations',
    dashboardRoute: derived.dashboardRoute,
    roles: derived.roles,
  };
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  roles: [],
  permissions: [],
  setPermissions: () => {},
  isLoading: true,
  isAuthenticated: false,
  keycloakEnabled: KEYCLOAK_ENABLED,
  authEnabled: KEYCLOAK_ENABLED || true,
  login: async () => ({ success: false }),
  logout: async () => {},
  hasRole: () => false,
  hasPermission: () => false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    if (KEYCLOAK_ENABLED) {
      initKeycloak()
        .then((authenticated: boolean) => {
          if (!active) return;
          if (authenticated) {
            const kc = getKeycloak();
            const extracted = extractUserFromToken();
            setUser(extracted);
            setAuthTokenProvider(() => kc?.token);
          }
        })
        .catch((err: any) => {
          console.error('Keycloak init failed:', err);
        })
        .finally(() => {
          if (active) setIsLoading(false);
        });
      return () => {
        active = false;
      };
    }

    (async () => {
      try {
        const session = await refreshSupabaseSessionIfNeeded();
        if (session?.access_token) {
          setAuthTokenProvider(() => getStoredSupabaseSession()?.access_token ?? undefined);
          const resolved = await resolveAuthenticatedStaffUser(session);
          if (active) {
            setUser(resolved);
            if (!resolved) {
              setStoredSupabaseSession(null);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to restore Supabase session:', err);
        setStoredSupabaseSession(null);
        if (active) setUser(null);
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const roles = useMemo(() => user?.roles ?? [], [user]);
  const defaultPermissions = useMemo(() => getPermissionsForRole(roles), [roles]);

  useEffect(() => {
    if (defaultPermissions.length > 0) {
      setPermissions(defaultPermissions);
    }
  }, [defaultPermissions]);

  const login = useCallback(
    async (email?: string, password?: string): Promise<{ success: boolean; error?: string; user?: AuthUser }> => {
      if (KEYCLOAK_ENABLED) {
        keycloakLogin();
        return { success: true };
      }

      const cleanEmail = (email || '').trim().toLowerCase();
      if (!cleanEmail || !password) {
        return { success: false, error: 'Email and password are required.' };
      }

      try {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: cleanEmail,
            password,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.access_token) {
          return {
            success: false,
            error: data?.error_description || data?.msg || data?.message || 'Invalid email or password.',
          };
        }

        const session: SupabaseAuthSession = {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: data.expires_at || (data.expires_in ? Math.floor(Date.now() / 1000) + Number(data.expires_in) : undefined),
          user: data.user,
        };
        setStoredSupabaseSession(session);
        setAuthTokenProvider(() => getStoredSupabaseSession()?.access_token ?? undefined);

        const resolvedUser = await resolveAuthenticatedStaffUser(session);
        if (!resolvedUser) {
          setStoredSupabaseSession(null);
          return { success: false, error: 'Staff profile or permissions could not be verified.' };
        }

        setUser(resolvedUser);

        // Record real last login timestamp in Supabase DB
        supabaseFetch(`/employees?or=(auth_user_id.eq.${resolvedUser.sub},email.eq.${encodeURIComponent(resolvedUser.email)})`, {
          method: 'PATCH',
          body: JSON.stringify({ last_login_at: new Date().toISOString() }),
        }).catch(() => undefined);

        return { success: true, user: resolvedUser };
      } catch (err: any) {
        setStoredSupabaseSession(null);
        return {
          success: false,
          error: err?.message || 'Authentication failed. Please try again.',
        };
      }
    },
    []
  );

  const logout = useCallback(async () => {
    if (KEYCLOAK_ENABLED) {
      keycloakLogout();
      return;
    }
    const session = getStoredSupabaseSession();
    if (session?.access_token) {
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session.access_token}`,
        },
      }).catch(() => undefined);
    }
    setStoredSupabaseSession(null);
    setAuthTokenProvider(() => undefined);
    setUser(null);
  }, []);

  const hasRole = useCallback(
    (...roleNames: string[]) => {
      if (KEYCLOAK_ENABLED) return keycloakHasRole(...roleNames);
      return roleNames.some((r) => roles.includes(r));
    },
    [roles]
  );

  const hasPermission = useCallback(
    (permission: string) => {
      if (!user) return false;
      if (roles.includes('admin')) return true;
      return permissions.includes(permission);
    },
    [user, roles, permissions]
  );

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      roles,
      permissions,
      setPermissions,
      isLoading,
      isAuthenticated: !!user,
      keycloakEnabled: KEYCLOAK_ENABLED,
      authEnabled: KEYCLOAK_ENABLED || true,
      login,
      logout,
      hasRole,
      hasPermission,
    }),
    [user, roles, permissions, setPermissions, isLoading, login, logout, hasRole, hasPermission]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
