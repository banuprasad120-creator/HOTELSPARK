import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  ChannelAdapter,
  AvailabilityPushParams,
  RatePushParams,
  RestrictionPushParams,
  ContentPushParams,
  ReservationPullParams,
  ConfirmReservationParams,
  CancelReservationParams,
  ChannelSyncResult,
  ChannelReservationResult,
} from '../../channel-adapter.interface';
import type { GoibiboConfig } from './goibibo.config';
import { DEFAULT_GOIBIBO_CONFIG } from './goibibo.config';
import {
  mapAvailabilityToGoibibo,
  mapRatesToGoibibo,
  mapRestrictionsToGoibibo,
  mapGoibiboInboundToHaip,
} from './goibibo.mapper';

@Injectable()
export class GoibiboAdapter implements ChannelAdapter {
  readonly adapterType = 'goibibo';
  private readonly logger = new Logger(GoibiboAdapter.name);

  constructor(private readonly configService: ConfigService) {}

  private resolveConfig(connectionConfig?: Record<string, unknown>): GoibiboConfig {
    const raw = (connectionConfig || {}) as Partial<GoibiboConfig>;
    return {
      hotelId: String(raw.hotelId || this.configService.get<string>('GOIBIBO_HOTEL_ID') || ''),
      clientId: raw.clientId || this.configService.get<string>('GOIBIBO_CLIENT_ID'),
      apiKey: raw.apiKey || this.configService.get<string>('GOIBIBO_API_KEY'),
      apiSecret: raw.apiSecret || this.configService.get<string>('GOIBIBO_API_SECRET'),
      baseUrl: raw.baseUrl || this.configService.get<string>('GOIBIBO_BASE_URL') || DEFAULT_GOIBIBO_CONFIG.baseUrl,
      environment: raw.environment || 'sandbox',
      timeoutMs: raw.timeoutMs || DEFAULT_GOIBIBO_CONFIG.timeoutMs,
      maxRetries: raw.maxRetries || DEFAULT_GOIBIBO_CONFIG.maxRetries,
    };
  }

  async testConnection(config: Record<string, unknown>): Promise<{ connected: boolean; message: string }> {
    const cfg = this.resolveConfig(config);
    if (!cfg.hotelId) {
      return {
        connected: false,
        message: 'Setup Required: Missing Goibibo Hotel/Property ID.',
      };
    }
    if (!cfg.apiKey && !cfg.clientId) {
      return {
        connected: false,
        message: 'Setup Required: Missing Goibibo API Key / Client Credentials on IngoMMT Partner Extranet.',
      };
    }

    const res = await this.sendJson(cfg, 'GET', `/hotels/${encodeURIComponent(cfg.hotelId)}/status`, null);
    if (res.ok) {
      return {
        connected: true,
        message: `Connected successfully to Goibibo Partner API for Hotel ${cfg.hotelId}`,
      };
    }

    return {
      connected: false,
      message: `Connection test failed: ${res.error || 'Partner API handshake returned status ' + res.status}`,
    };
  }

  async pushAvailability(params: AvailabilityPushParams): Promise<ChannelSyncResult> {
    const config = this.resolveConfig(params.connectionConfig);
    if (!config.hotelId || !config.apiKey) {
      return {
        success: false,
        itemsSynced: 0,
        errors: [{ item: 'credentials', message: 'Setup Required: Goibibo credentials missing.' }],
      };
    }

    const payload = mapAvailabilityToGoibibo(config.hotelId, params.items);
    const res = await this.sendJson(config, 'POST', '/ari/inventory', payload);

    if (!res.ok) {
      return {
        success: false,
        itemsSynced: 0,
        errors: [{ item: 'inventory', message: res.error || 'HTTP ' + res.status }],
      };
    }

    return { success: true, itemsSynced: params.items.length, errors: [] };
  }

  async pushRates(params: RatePushParams): Promise<ChannelSyncResult> {
    const config = this.resolveConfig(params.connectionConfig);
    if (!config.hotelId || !config.apiKey) {
      return {
        success: false,
        itemsSynced: 0,
        errors: [{ item: 'credentials', message: 'Setup Required: Goibibo credentials missing.' }],
      };
    }

    const payload = mapRatesToGoibibo(config.hotelId, params.items);
    const res = await this.sendJson(config, 'POST', '/ari/rates', payload);

    if (!res.ok) {
      return {
        success: false,
        itemsSynced: 0,
        errors: [{ item: 'rates', message: res.error || 'HTTP ' + res.status }],
      };
    }

    return { success: true, itemsSynced: params.items.length, errors: [] };
  }

  async pushRestrictions(params: RestrictionPushParams): Promise<ChannelSyncResult> {
    const config = this.resolveConfig(params.connectionConfig);
    const payload = mapRestrictionsToGoibibo(config.hotelId, params.items);
    const res = await this.sendJson(config, 'POST', '/ari/restrictions', payload);

    return {
      success: res.ok,
      itemsSynced: res.ok ? params.items.length : 0,
      errors: res.ok ? [] : [{ item: 'restrictions', message: res.error || 'HTTP ' + res.status }],
    };
  }

  async pushContent(params: ContentPushParams): Promise<ChannelSyncResult> {
    const config = this.resolveConfig(params.connectionConfig);
    const res = await this.sendJson(config, 'POST', `/hotels/${encodeURIComponent(config.hotelId)}/content`, params);
    return {
      success: res.ok,
      itemsSynced: res.ok ? 1 : 0,
      errors: res.ok ? [] : [{ item: 'content', message: res.error || 'HTTP ' + res.status }],
    };
  }

  async pullReservations(params: ReservationPullParams): Promise<ChannelReservationResult> {
    const config = this.resolveConfig(params.connectionConfig);
    const res = await this.sendJson(config, 'GET', `/hotels/${encodeURIComponent(config.hotelId)}/bookings`, null);

    if (!res.ok) {
      return {
        success: false,
        reservations: [],
        errors: [{ externalId: '', message: res.error || 'HTTP ' + res.status }],
      };
    }

    const rawList = Array.isArray(res.data) ? res.data : [];
    const reservations = rawList.map((item: any) => mapGoibiboInboundToHaip(item));
    return { success: true, reservations, errors: [] };
  }

  async confirmReservation(params: ConfirmReservationParams): Promise<ChannelSyncResult> {
    const config = this.resolveConfig(params.connectionConfig);
    const res = await this.sendJson(config, 'POST', `/bookings/${encodeURIComponent(params.externalConfirmation)}/ack`, {
      pmsConfirmationNumber: params.pmsConfirmationNumber,
      status: 'CONFIRMED',
    });

    return {
      success: res.ok,
      itemsSynced: res.ok ? 1 : 0,
      errors: res.ok ? [] : [{ item: params.externalConfirmation, message: res.error || 'HTTP ' + res.status }],
    };
  }

  async cancelReservation(params: CancelReservationParams): Promise<ChannelSyncResult> {
    const config = this.resolveConfig(params.connectionConfig);
    const res = await this.sendJson(config, 'POST', `/bookings/${encodeURIComponent(params.externalConfirmation)}/cancel`, {
      reason: params.reason,
    });

    return {
      success: res.ok,
      itemsSynced: res.ok ? 1 : 0,
      errors: res.ok ? [] : [{ item: params.externalConfirmation, message: res.error || 'HTTP ' + res.status }],
    };
  }

  private async sendJson(
    config: GoibiboConfig,
    method: string,
    path: string,
    body: unknown,
  ): Promise<{ ok: boolean; status: number; error?: string; data?: unknown }> {
    const url = `${config.baseUrl.replace(/\/$/, '')}${path}`;
    const timeoutMs = config.timeoutMs || 30000;
    const maxRetries = config.maxRetries || 3;

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'X-Goibibo-Hotel-ID': config.hotelId,
        };
        if (config.apiKey) headers['X-Goibibo-API-Key'] = config.apiKey;
        if (config.clientId) headers['X-Goibibo-Client-ID'] = config.clientId;

        const res = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });
        clearTimeout(timer);

        const text = await res.text();
        if (!res.ok) {
          lastError = new Error(`HTTP ${res.status}: ${text.substring(0, 200)}`);
          if (attempt < maxRetries) continue;
          return { ok: false, status: res.status, error: lastError.message };
        }

        let data = undefined;
        try {
          data = text ? JSON.parse(text) : undefined;
        } catch {
          // ignore invalid json payload
        }

        return { ok: true, status: res.status, data };
      } catch (err: any) {
        lastError = err;
        this.logger.warn(`Goibibo ${method} ${path} attempt ${attempt} failed: ${err.message}`);
        if (attempt < maxRetries) continue;
      }
    }

    return { ok: false, status: 0, error: lastError?.message || 'Connection failed' };
  }
}
