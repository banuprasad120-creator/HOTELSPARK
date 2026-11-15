/**
 * Supabase client configuration for Hotel Spark Booking Engine.
 */
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://erzzqhzjtdhzrwpzbflr.supabase.co';

const DEFAULT_KEY_B64 = 'c2JfcHVibGlzaGFibGVfWGo2QU9BZ2QtT0JZSkxNTnRadG45UV9HdkliSU9ZZA==';

export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  (typeof atob === 'function' ? atob(DEFAULT_KEY_B64) : '');

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export async function supabaseFetch<T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint.replace(/^\//, '')}`;
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
    throw new Error(`Supabase error (${res.status}): ${errText}`);
  }

  const text = await res.text();
  if (!text) return null as T;
  try {
    return JSON.parse(text);
  } catch {
    return text as unknown as T;
  }
}

