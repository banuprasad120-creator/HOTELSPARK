import axios from 'axios';
import { handleSupabaseAdapter } from './supabaseAdapter';

declare module 'axios' {
  export interface AxiosRequestConfig {
    skipErrorToast?: boolean;
    isSilentPoll?: boolean;
  }
}

export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

let tokenProvider: (() => string | undefined) | null = null;

export function setAuthTokenProvider(fn: () => string | undefined) {
  tokenProvider = fn;
}

function toAxiosError(err: any, cfg: any) {
  const status = err?.status || err?.response?.status || 400;
  const message = err?.message || 'Supabase request failed';
  return Object.assign(new Error(message), {
    isAxiosError: true,
    config: cfg,
    response: {
      status,
      statusText: String(status),
      headers: { 'content-type': 'application/json' },
      data: { message, error: message },
      config: cfg,
    },
  });
}

const isStandalonePms =
  typeof window !== 'undefined' &&
  (window.location.hostname.includes('netlify.app') ||
    window.location.hostname.includes('vercel.app') ||
    window.location.hostname.includes('hotelspark') ||
    window.location.hostname.includes('spark') ||
    window.location.port === '5173' ||
    window.location.port === '5174' ||
    !window.location.port);

if (isStandalonePms) {
  api.interceptors.request.use(async (config) => {
    const token = tokenProvider?.();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.adapter = async (cfg) => {
      try {
        return await handleSupabaseAdapter(cfg);
      } catch (adapterErr: any) {
        return Promise.reject(toAxiosError(adapterErr, cfg));
      }
    };
    return config;
  });
}

api.interceptors.response.use(
  async (response) => {
    if (
      typeof response.data === 'string' &&
      (response.headers['content-type']?.includes('text/html') ||
        response.data.trim().startsWith('<!') ||
        response.data.trim().startsWith('<html'))
    ) {
      try {
        return await handleSupabaseAdapter(response.config);
      } catch (adapterErr: any) {
        return Promise.reject(toAxiosError(adapterErr, response.config));
      }
    }
    return response;
  },
  async (error) => {
    if (error.response?.status === 404 || error.code === 'ERR_NETWORK' || !error.response) {
      try {
        return await handleSupabaseAdapter(error.config);
      } catch (adapterErr: any) {
        return Promise.reject(toAxiosError(adapterErr, error.config));
      }
    }
    return Promise.reject(error);
  }
);

export function setPropertyId(propertyId: string | null) {
  if (propertyId) {
    api.defaults.params = { ...api.defaults.params, propertyId };
  } else {
    const params = { ...api.defaults.params };
    delete params.propertyId;
    api.defaults.params = params;
  }
}
