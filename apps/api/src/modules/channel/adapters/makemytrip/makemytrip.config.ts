export interface MakeMyTripConfig {
  hotelId: string;
  clientId?: string;
  apiKey?: string;
  apiSecret?: string;
  baseUrl: string;
  environment?: 'sandbox' | 'production';
  timeoutMs?: number;
  maxRetries?: number;
}

export const DEFAULT_MAKEMYTRIP_CONFIG: MakeMyTripConfig = {
  hotelId: '',
  baseUrl: 'https://connect.makemytrip.com/api/v2',
  environment: 'sandbox',
  timeoutMs: 30000,
  maxRetries: 3,
};
