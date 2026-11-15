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

const isStaticHosting = typeof window !== 'undefined' && (
  window.location.hostname.includes('netlify.app') ||
  window.location.hostname.includes('spark')
);

if (isStaticHosting) {
  api.interceptors.request.use(async (config) => {
    config.adapter = async (cfg) => {
      try {
        return await handleSupabaseAdapter(cfg);
      } catch {
        return {
          data: [],
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json' },
          config: cfg,
        };
      }
    };
    return config;
  });
}

api.interceptors.response.use(
  async (response) => {
    // If the server returned an HTML fallback (e.g. Netlify serving index.html on /api/* routes)
    if (
      typeof response.data === 'string' &&
      (response.headers['content-type']?.includes('text/html') ||
        response.data.trim().startsWith('<!') ||
        response.data.trim().startsWith('<html'))
    ) {
      try {
        return await handleSupabaseAdapter(response.config);
      } catch (err) {
        return {
          data: [],
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json' },
          config: response.config,
        };
      }
    }
    return response;
  },
  async (error) => {
    // If running on static host (Netlify) and API endpoint returns 404 or network failure
    if (error.response?.status === 404 || error.code === 'ERR_NETWORK' || !error.response) {
      try {
        return await handleSupabaseAdapter(error.config);
      } catch {
        return {
          data: [],
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json' },
          config: error.config,
        };
      }
    }
    return Promise.reject(error);
  }
);

/** Set the active property ID — added as query param to all requests */
export function setPropertyId(propertyId: string | null) {
  if (propertyId) {
    api.defaults.params = { ...api.defaults.params, propertyId };
  } else {
    const params = { ...api.defaults.params };
    delete params.propertyId;
    api.defaults.params = params;
  }
}
