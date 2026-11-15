/**
 * Supabase client configuration for Hotel Spark Dashboard.
 */
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://erzzqhzjtdhzrwpzbflr.supabase.co';
const DEFAULT_KEY_B64 = 'c2JfcHVibGlzaGFibGVfWGo2QU9BZ2QtT0JZSkxNTnRadG45UV9HdkliSU9ZZA==';

export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  (typeof atob === 'function' ? atob(DEFAULT_KEY_B64) : '');

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

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
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      return { data: null, error: new Error(`Supabase error (${res.status}): ${errText}`) };
    }

    const data = await res.json();
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

