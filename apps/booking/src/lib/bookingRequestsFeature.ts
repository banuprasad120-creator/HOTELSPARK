/** Mirrors server HAIP_BOOKING_REQUESTS for booking widget UI gating. */
export function isBookingRequestsUiEnabled(): boolean {
  if (import.meta.env.VITE_HAIP_BOOKING_REQUESTS === 'false') return false;
  return true;
}
