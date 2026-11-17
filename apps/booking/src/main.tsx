import { injectSpeedInsights } from '@vercel/speed-insights';
import { mountBooking } from './mount';

injectSpeedInsights();

const el = document.getElementById('haip-booking');
if (el) {
  mountBooking(el);
}
