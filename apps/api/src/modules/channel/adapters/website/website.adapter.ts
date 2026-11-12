import { Injectable, Logger } from '@nestjs/common';
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

@Injectable()
export class WebsiteChannelAdapter implements ChannelAdapter {
  readonly adapterType = 'website';
  private readonly logger = new Logger(WebsiteChannelAdapter.name);

  async testConnection(config: Record<string, unknown>): Promise<{ connected: boolean; message: string }> {
    // Spark Hotel Direct Booking Engine is built into the PMS
    return {
      connected: true,
      message: 'Spark Hotel Website Direct Booking Engine is active and integrated with Central Inventory.',
    };
  }

  async pushAvailability(params: AvailabilityPushParams): Promise<ChannelSyncResult> {
    this.logger.log(`Synced ${params.items.length} availability dates to Spark Hotel Website`);
    return {
      success: true,
      itemsSynced: params.items.length,
      errors: [],
    };
  }

  async pushRates(params: RatePushParams): Promise<ChannelSyncResult> {
    this.logger.log(`Synced ${params.items.length} rate points to Spark Hotel Website`);
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
    return {
      success: true,
      itemsSynced: 1,
      errors: [],
    };
  }

  async cancelReservation(params: CancelReservationParams): Promise<ChannelSyncResult> {
    return {
      success: true,
      itemsSynced: 1,
      errors: [],
    };
  }
}
