import axios from 'axios';

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

api.interceptors.response.use(
  (response) => {
    // If the server returned an HTML fallback (e.g. Netlify serving index.html on /api/* routes)
    if (
      typeof response.data === 'string' &&
      (response.headers['content-type']?.includes('text/html') ||
        response.data.trim().startsWith('<!') ||
        response.data.trim().startsWith('<html'))
    ) {
      const error: any = new Error(`API endpoint not found: ${response.config.url}`);
      error.response = { ...response, status: 404, statusText: 'Not Found' };
      error.config = { ...response.config, skipErrorToast: true };
      return Promise.reject(error);
    }
    return response;
  },
  (error) => {
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
