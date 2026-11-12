export interface GoibiboConfig {
  hotelId: string;
  clientId?: string;
  apiKey?: string;
  apiSecret?: string;
  baseUrl: string;
  environment?: 'sandbox' | 'production';
  timeoutMs?: number;
  maxRetries?: number;
}

export const DEFAULT_GOIBIBO_CONFIG: GoibiboConfig = {
  hotelId: '',
  baseUrl: 'https://ingo.goibibo.com/api/v1',
  environment: 'sandbox',
  timeoutMs: 30000,
  maxRetries: 3,
};
