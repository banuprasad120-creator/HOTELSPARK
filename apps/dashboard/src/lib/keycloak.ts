import Keycloak from 'keycloak-js';

/**
 * Keycloak instance for OIDC authentication.
 *
 * Uses PKCE flow (public client) for SPA security.
 * Config is loaded from environment variables or defaults.
 */
export const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL ?? 'http://localhost:8080',
  realm: import.meta.env.VITE_KEYCLOAK_REALM ?? 'haip',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? 'haip-dashboard',
});

/**
 * Check if auth is enabled via environment variable.
 * When disabled (default), the app runs without Keycloak.
 */
export const AUTH_ENABLED = import.meta.env.VITE_AUTH_ENABLED === 'true';

export function getKeycloak() {
  return keycloak;
}

export async function initKeycloak(): Promise<boolean> {
  if (!AUTH_ENABLED) return false;
  try {
    return await keycloak.init({ onLoad: 'check-sso', checkLoginIframe: false });
  } catch (err) {
    console.warn('Keycloak init skipped or failed:', err);
    return false;
  }
}

export async function keycloakLogin(): Promise<void> {
  await keycloak.login();
}

export async function keycloakLogout(): Promise<void> {
  await keycloak.logout();
}

export function keycloakHasRole(...roles: string[]): boolean {
  if (!AUTH_ENABLED) return true;
  return roles.some((r) => keycloak.hasRealmRole(r));
}

export function extractUserFromToken(): any {
  if (!keycloak.tokenParsed) return null;
  const parsed = keycloak.tokenParsed as any;
  return {
    sub: parsed.sub || '',
    email: parsed.email || '',
    name: parsed.name || parsed.preferred_username || '',
    roles: parsed.realm_access?.roles || [],
  };
}
