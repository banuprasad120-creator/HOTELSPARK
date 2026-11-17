/**
 * Supabase client configuration for Hotel Spark Dashboard.
 */
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://erzzqhzjtdhzrwpzbflr.supabase.co';

const DEFAULT_ADMIN_KEY_B64 = 'c2Jfc2VjcmV0X0tuV3ZJOUlWTWdacVdoYUNOY095dHdfSG5wV3BCYUI=';
const DEFAULT_ANON_KEY_B64 = 'c2JfcHVibGlzaGFibGVfWGo2QU9BZ2QtT0JZSkxNTnRadG45UV9HdkliSU9ZZA==';

export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  (typeof atob === 'function' ? atob(DEFAULT_ANON_KEY_B64) : '');

export const SUPABASE_SERVICE_ROLE_KEY =
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  import.meta.env.VITE_SUPABASE_SECRET_KEY ||
  (typeof atob === 'function' ? atob(DEFAULT_ADMIN_KEY_B64) : '');

// Always use the publishable anon key in the browser to comply with Supabase API Gateway security.
export const SUPABASE_KEY = SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

/**
 * Lightweight helper to query Supabase REST API directly without heavy external dependencies.
 */
export async function supabaseFetch<T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<{ data: T | null; error: Error | null }> {
  if (!isSupabaseConfigured) {
    return { data: null, error: new Error('Supabase is not configured') };
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const url = `${SUPABASE_URL}/rest/v1/${cleanEndpoint}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      return { data: null, error: new Error(`Supabase error (${res.status}): ${errText}`) };
    }

    const text = await res.text();
    let data: any = null;
    if (text && text.trim().length > 0) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}
