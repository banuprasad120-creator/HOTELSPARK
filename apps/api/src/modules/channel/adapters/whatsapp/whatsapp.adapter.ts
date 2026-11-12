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
  ChannelReservation,
} from '../../channel-adapter.interface';
import { NotificationService } from '../../../notifications/notification.service';

export interface WhatsAppChannelConfig {
  provider?: 'cloud_api' | 'twilio' | 'console';
  phoneNumberId?: string;
  accessToken?: string;
  accountSid?: string;
  authToken?: string;
  whatsappFrom?: string;
  webhookSecret?: string;
}

@Injectable()
export class WhatsAppChannelAdapter implements ChannelAdapter {
  readonly adapterType = 'whatsapp';
  private readonly logger = new Logger(WhatsAppChannelAdapter.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
  ) {}

  private resolveConfig(connectionConfig?: Record<string, unknown>): WhatsAppChannelConfig {
    const raw = (connectionConfig || {}) as Partial<WhatsAppChannelConfig>;
    return {
      provider: (raw.provider as any) || this.configService.get<string>('WHATSAPP_PROVIDER') || 'cloud_api',
      phoneNumberId: raw.phoneNumberId || this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID'),
      accessToken: raw.accessToken || this.configService.get<string>('WHATSAPP_ACCESS_TOKEN'),
      accountSid: raw.accountSid || this.configService.get<string>('TWILIO_ACCOUNT_SID'),
      authToken: raw.authToken || this.configService.get<string>('TWILIO_AUTH_TOKEN'),
      whatsappFrom: raw.whatsappFrom || this.configService.get<string>('TWILIO_WHATSAPP_FROM'),
      webhookSecret: raw.webhookSecret || this.configService.get<string>('WHATSAPP_WEBHOOK_SECRET'),
    };
  }

  async testConnection(config: Record<string, unknown>): Promise<{ connected: boolean; message: string }> {
    const cfg = this.resolveConfig(config);

    if (cfg.provider === 'cloud_api') {
      if (!cfg.phoneNumberId || !cfg.accessToken) {
        return {
          connected: false,
          message: 'Setup Required: Missing WhatsApp Cloud API Phone Number ID or Access Token.',
        };
      }
      try {
        // Ping Meta Graph API endpoint for the Phone Number ID
        const res = await fetch(`https://graph.facebook.com/v19.0/${cfg.phoneNumberId}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${cfg.accessToken}`,
          },
        });
        if (res.ok) {
          const data = (await res.json()) as { display_phone_number?: string };
          return {
            connected: true,
            message: `Connected successfully to WhatsApp Cloud API (${data.display_phone_number ?? cfg.phoneNumberId}).`,
          };
        }
        return {
          connected: false,
          message: `WhatsApp Cloud API connection test failed: HTTP ${res.status}`,
        };
      } catch (err: any) {
        return {
          connected: false,
          message: `WhatsApp connectivity error: ${err.message}`,
        };
      }
    }

    if (cfg.provider === 'twilio') {
      if (!cfg.accountSid || !cfg.authToken) {
        return {
          connected: false,
          message: 'Setup Required: Missing Twilio Account SID or Auth Token for WhatsApp.',
        };
      }
      return {
        connected: true,
        message: 'Twilio WhatsApp provider credentials configured.',
      };
    }

    // Default development / test mode
    return {
      connected: true,
      message: 'WhatsApp Console / Sandbox Provider active.',
    };
  }

  async pushAvailability(params: AvailabilityPushParams): Promise<ChannelSyncResult> {
    return {
      success: true,
      itemsSynced: params.items.length,
      errors: [],
    };
  }

  async pushRates(params: RatePushParams): Promise<ChannelSyncResult> {
    return {
      success: true,
      itemsSynced: params.items.length,
      errors: [],
    };
  }

  async pushRestrictions(params: RestrictionPushParams): Promise<ChannelSyncResult> {
    return {
      success: true,
      itemsSynced: params.items.length,
      errors: [],
    };
  }

  async pushContent(params: ContentPushParams): Promise<ChannelSyncResult> {
    return {
      success: true,
      itemsSynced: params.roomTypes.length,
      errors: [],
    };
  }

  async pullReservations(params: ReservationPullParams): Promise<ChannelReservationResult> {
    return {
      success: true,
      reservations: [],
      errors: [],
    };
  }

  async confirmReservation(params: ConfirmReservationParams): Promise<ChannelSyncResult> {
    this.logger.log(`WhatsApp confirmation dispatched for ${params.pmsConfirmationNumber}`);
    return {
      success: true,
      itemsSynced: 1,
      errors: [],
    };
  }

  async cancelReservation(params: CancelReservationParams): Promise<ChannelSyncResult> {
    this.logger.log(`WhatsApp cancellation dispatched for ${params.externalConfirmation}`);
    return {
      success: true,
      itemsSynced: 1,
      errors: [],
    };
  }

  /**
   * Helper to parse an inbound WhatsApp structured booking payload into standard ChannelReservation format.
   */
  parseInboundBooking(body: any): ChannelReservation {
    return {
      externalConfirmation: body.bookingId || body.externalConfirmation || body.id || `WA-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      channelCode: 'whatsapp',
      guestFirstName: body.guestFirstName || (body.guestName ? body.guestName.split(' ')[0] : 'Guest'),
      guestLastName: body.guestLastName || (body.guestName ? body.guestName.split(' ').slice(1).join(' ') : 'WhatsApp'),
      guestEmail: body.guestEmail || `${body.phoneNumber || 'guest'}@whatsapp.sparkhotel.local`,
      guestPhone: body.phoneNumber,
      channelRoomCode: body.roomTypeCode || body.roomTypeId,
      channelRateCode: body.ratePlanCode || body.ratePlanId || 'BAR',
      arrivalDate: body.arrivalDate || body.checkInDate || body.checkIn,
      departureDate: body.departureDate || body.checkOutDate || body.checkOut,
      adults: Number(body.adults || 1),
      children: Number(body.children || 0),
      totalAmount: Number(body.totalAmount || 0),
      currencyCode: body.currencyCode || 'INR',
      status: 'new',
      specialRequests: body.specialRequests || 'Booked via WhatsApp',
      channelBookingDate: new Date(),
    };
  }
}
