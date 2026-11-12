/**
 * Supabase client configuration for Hotel Spark Booking Engine.
 */
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://erzzqhzjtdhzrwpzbflr.supabase.co';
export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_Xj6AOAgd-OBYJLMNtZtn9Q_GvIbIOYd';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
