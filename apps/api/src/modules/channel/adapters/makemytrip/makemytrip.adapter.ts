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
import type { MakeMyTripConfig } from './makemytrip.config';
import { DEFAULT_MAKEMYTRIP_CONFIG } from './makemytrip.config';
import {
  mapAvailabilityToMmt,
  mapRatesToMmt,
  mapRestrictionsToMmt,
  mapMmtInboundToHaip,
} from './makemytrip.mapper';

@Injectable()
export class MakeMyTripAdapter implements ChannelAdapter {
  readonly adapterType = 'makemytrip';
  private readonly logger = new Logger(MakeMyTripAdapter.name);

  constructor(private readonly configService: ConfigService) {}

  private resolveConfig(connectionConfig?: Record<string, unknown>): MakeMyTripConfig {
    const raw = (connectionConfig || {}) as Partial<MakeMyTripConfig>;
    return {
      hotelId: String(raw.hotelId || this.configService.get<string>('MAKEMYTRIP_HOTEL_ID') || ''),
      clientId: raw.clientId || this.configService.get<string>('MAKEMYTRIP_CLIENT_ID'),
      apiKey: raw.apiKey || this.configService.get<string>('MAKEMYTRIP_API_KEY'),
      apiSecret: raw.apiSecret || this.configService.get<string>('MAKEMYTRIP_API_SECRET'),
      baseUrl: raw.baseUrl || this.configService.get<string>('MAKEMYTRIP_BASE_URL') || DEFAULT_MAKEMYTRIP_CONFIG.baseUrl,
      environment: raw.environment || 'sandbox',
      timeoutMs: raw.timeoutMs || DEFAULT_MAKEMYTRIP_CONFIG.timeoutMs,
      maxRetries: raw.maxRetries || DEFAULT_MAKEMYTRIP_CONFIG.maxRetries,
    };
  }

  async testConnection(config: Record<string, unknown>): Promise<{ connected: boolean; message: string }> {
    const cfg = this.resolveConfig(config);
    if (!cfg.hotelId) {
      return {
        connected: false,
        message: 'Setup Required: Missing MakeMyTrip Hotel/Property ID.',
      };
    }
    if (!cfg.apiKey && !cfg.clientId) {
      return {
        connected: false,
        message: 'Setup Required: Missing MakeMyTrip API Key / Client Credentials on IngoMMT Partner Extranet.',
      };
    }

    // Attempt connectivity check with IngoMMT Partner API
    const res = await this.sendJson(cfg, 'GET', `/hotels/${encodeURIComponent(cfg.hotelId)}/status`, null);
    if (res.ok) {
      return {
        connected: true,
        message: `Connected successfully to MakeMyTrip IngoMMT for Hotel ${cfg.hotelId}`,
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
        errors: [{ item: 'credentials', message: 'Setup Required: IngoMMT credentials missing.' }],
      };
    }

    const payload = mapAvailabilityToMmt(config.hotelId, params.items);
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
        errors: [{ item: 'credentials', message: 'Setup Required: IngoMMT credentials missing.' }],
      };
    }

    const payload = mapRatesToMmt(config.hotelId, params.items);
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
    const payload = mapRestrictionsToMmt(config.hotelId, params.items);
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
    const reservations = rawList.map((item: any) => mapMmtInboundToHaip(item));
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
    config: MakeMyTripConfig,
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
          'X-MMT-Hotel-ID': config.hotelId,
        };
        if (config.apiKey) headers['X-MMT-API-Key'] = config.apiKey;
        if (config.clientId) headers['X-MMT-Client-ID'] = config.clientId;

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
        } catch (_) {}

        return { ok: true, status: res.status, data };
      } catch (err: any) {
        lastError = err;
        this.logger.warn(`MakeMyTrip ${method} ${path} attempt ${attempt} failed: ${err.message}`);
        if (attempt < maxRetries) continue;
      }
    }

    return { ok: false, status: 0, error: lastError?.message || 'Connection failed' };
  }
}
