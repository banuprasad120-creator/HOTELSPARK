/**
 * Supabase client configuration for Hotel Spark Booking Engine (browser-safe publishable key only).
 */
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://erzzqhzjtdhzrwpzbflr.supabase.co';

export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_Xj6AOAgd-OBYJLMNtZtn9Q_GvIbIOYd';

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
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    let msg = `Supabase error (${res.status})`;
    try {
      const parsed = JSON.parse(errText);
      msg = parsed.message || parsed.hint || parsed.details || errText || msg;
    } catch {
      if (errText) msg = errText;
    }
    throw new Error(msg);
  }

  const text = await res.text();
  if (!text) return null as T;
  try {
    return JSON.parse(text);
  } catch {
    return text as unknown as T;
  }
}
