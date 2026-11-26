// Shared Supabase REST, Auth & Storage helper for Hotel Spark PMS (browser-safe publishable key only)

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://erzzqhzjtdhzrwpzbflr.supabase.co';

export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_Xj6AOAgd-OBYJLMNtZtn9Q_GvIbIOYd';

export const AUTH_SESSION_STORAGE_KEY = 'hotel_spark_sb_session';

export interface SupabaseAuthSession {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  user?: {
    id: string;
    email?: string;
    app_metadata?: Record<string, any>;
    user_metadata?: Record<string, any>;
  };
}

export function getStoredSupabaseSession(): SupabaseAuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SupabaseAuthSession;
    return parsed?.access_token ? parsed : null;
  } catch {
    return null;
  }
}

export function setStoredSupabaseSession(session: SupabaseAuthSession | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!session) {
      window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
    } else {
      window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
    }
  } catch {
    /* ignore storage write error */
  }
}

export function getSupabaseAccessToken(): string | null {
  return getStoredSupabaseSession()?.access_token ?? null;
}

export async function refreshSupabaseSessionIfNeeded(): Promise<SupabaseAuthSession | null> {
  const session = getStoredSupabaseSession();
  if (!session) return null;
  const nowSec = Math.floor(Date.now() / 1000);
  if (session.expires_at && session.expires_at - 60 > nowSec) {
    return session;
  }
  if (!session.refresh_token) return session;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    });
    if (!res.ok) {
      setStoredSupabaseSession(null);
      return null;
    }
    const data = await res.json();
    const next: SupabaseAuthSession = {
      access_token: data.access_token,
      refresh_token: data.refresh_token || session.refresh_token,
      expires_at: data.expires_at || (data.expires_in ? Math.floor(Date.now() / 1000) + Number(data.expires_in) : undefined),
      user: data.user || session.user,
    };
    setStoredSupabaseSession(next);
    return next;
  } catch {
    return session;
  }
}

export async function supabaseFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${SUPABASE_URL}/rest/v1${cleanPath}`;

  const session = await refreshSupabaseSessionIfNeeded();
  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errText = await res.text();
    let msg = `Supabase error (${res.status})`;
    try {
      const parsed = JSON.parse(errText);
      msg = parsed.message || parsed.error_description || parsed.hint || errText || msg;
    } catch {
      if (errText) msg = errText;
    }
    throw new Error(msg);
  }

  const text = await res.text();
  if (!text) return null as unknown as T;
  return JSON.parse(text) as T;
}

export async function supabaseUploadObject(
  bucket: string,
  objectPath: string,
  file: Blob,
  contentType: string
): Promise<{ path: string; publicUrl: string }> {
  const session = await refreshSupabaseSessionIfNeeded();
  if (!session?.access_token) {
    throw new Error('Authentication required to upload files to Supabase Storage.');
  }
  const cleanObj = objectPath.replace(/^\/+/, '');
  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucket)}/${cleanObj}`;

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': contentType || 'application/octet-stream',
      'x-upsert': 'true',
    },
    body: file,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Storage upload failed (${res.status}): ${errText}`);
  }

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${cleanObj}`;
  return { path: cleanObj, publicUrl };
}

export async function supabaseCreateSignedUrl(
  bucket: string,
  objectPath: string,
  expiresInSeconds = 3600
): Promise<string> {
  const session = await refreshSupabaseSessionIfNeeded();
  if (!session?.access_token) {
    throw new Error('Authentication required to access private storage files.');
  }
  const cleanObj = objectPath.replace(/^\/+/, '');
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${cleanObj}`,
    {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expiresIn: expiresInSeconds }),
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to sign storage URL (${res.status})`);
  }
  const data = await res.json();
  const signedPath = data?.signedURL || '';
  return signedPath.startsWith('http') ? signedPath : `${SUPABASE_URL}/storage/v1${signedPath}`;
}
