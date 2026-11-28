import { io, type Socket } from 'socket.io-client';
import { AUTH_ENABLED, keycloak } from './keycloak';

let socket: Socket | null = null;
let currentPropertyId: string | null = null;

function socketAuthPayload(): Record<string, string> {
  if (AUTH_ENABLED && keycloak.token) {
    return { token: keycloak.token };
  }
  return {};
}

export function getSocket(): Socket {
  if (!socket) {
    socket = io('/', {
      transports: ['websocket', 'polling'],
      autoConnect: false,
      auth: socketAuthPayload(),
    });

    socket.on('connect', () => {
      if (currentPropertyId) {
        socket?.emit('joinProperty', { propertyId: currentPropertyId });
      }
    });
  }
  return socket;
}

/** Reconnect with a fresh JWT after Keycloak token refresh. */
export function reconnectSocket() {
  const s = getSocket();
  s.auth = socketAuthPayload();
  if (s.connected) {
    s.disconnect();
    s.connect();
  }
}

export function joinPropertyRoom(propertyId: string) {
  currentPropertyId = propertyId;
  // If running in Supabase standalone mode or no NestJS backend ws server on port, avoid throwing unhandled ws errors
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname.includes('sparkhotel'))) {
    // Only connect if explicit WS server is enabled
    const wsEnabled = import.meta.env.VITE_WS_ENABLED === 'true';
    if (!wsEnabled) return;
  }
  const s = getSocket();
  if (!s.connected) s.connect();
  s.emit('joinProperty', { propertyId });
}

export function leavePropertyRoom(propertyId: string) {
  if (currentPropertyId === propertyId) {
    currentPropertyId = null;
  }
  const s = getSocket();
  s.emit('leaveProperty', { propertyId });
}
