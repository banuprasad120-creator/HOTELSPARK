import { Injectable, BadRequestException, Inject, Optional } from '@nestjs/common';
import type { ChannelAdapter } from './channel-adapter.interface';
import { MockChannelAdapter } from './adapters/mock.adapter';
import { BookingComAdapter } from './adapters/booking-com/booking-com.adapter';
import { MakeMyTripAdapter } from './adapters/makemytrip/makemytrip.adapter';
import { GoibiboAdapter } from './adapters/goibibo/goibibo.adapter';
import { SiteMinderAdapter } from './adapters/siteminder/siteminder.adapter';
import { ExpediaAdapter } from './adapters/expedia/expedia.adapter';
import { DerbySoftAdapter } from './adapters/derbysoft/derbysoft.adapter';
import { Beds24Adapter } from './adapters/beds24/beds24.adapter';
import { ChannexAdapter } from './adapters/channex/channex.adapter';
import { WebsiteChannelAdapter } from './adapters/website/website.adapter';
import { WhatsAppChannelAdapter } from './adapters/whatsapp/whatsapp.adapter';
import {
  WAVE_CHANNEL_ADAPTERS,
  type NamedConsoleChannelAdapter,
} from './adapters/wave3-console/named-console-channel.adapter';

/**
 * Factory that maps adapterType strings to ChannelAdapter instances.
 */
@Injectable()
export class ChannelAdapterFactory {
  private adapters: Map<string, ChannelAdapter> = new Map();

  constructor(
    private readonly mockAdapter: MockChannelAdapter,
    private readonly bookingComAdapter: BookingComAdapter,
    private readonly makeMyTripAdapter?: MakeMyTripAdapter,
    private readonly goibiboAdapter?: GoibiboAdapter,
    private readonly siteMinderAdapter?: SiteMinderAdapter,
    private readonly expediaAdapter?: ExpediaAdapter,
    private readonly derbySoftAdapter?: DerbySoftAdapter,
    private readonly beds24Adapter?: Beds24Adapter,
    private readonly channexAdapter?: ChannexAdapter,
    @Optional()
    @Inject(WAVE_CHANNEL_ADAPTERS)
    waveAdapters: NamedConsoleChannelAdapter[] | null = null,
    @Optional()
    private readonly websiteAdapter?: WebsiteChannelAdapter,
    @Optional()
    private readonly whatsAppAdapter?: WhatsAppChannelAdapter,
  ) {
    const allArgs = [
      mockAdapter,
      bookingComAdapter,
      makeMyTripAdapter,
      goibiboAdapter,
      siteMinderAdapter,
      expediaAdapter,
      derbySoftAdapter,
      beds24Adapter,
      channexAdapter,
      waveAdapters,
      websiteAdapter,
      whatsAppAdapter,
    ];

    for (const arg of allArgs) {
      if (Array.isArray(arg)) {
        for (const adapter of arg) {
          if (adapter?.adapterType) {
            this.adapters.set(adapter.adapterType, adapter);
          }
        }
      } else if (arg && typeof arg === 'object' && 'adapterType' in arg && arg.adapterType) {
        this.adapters.set(arg.adapterType, arg);
      }
    }
  }

  getAdapter(adapterType: string): ChannelAdapter {
    const adapter = this.adapters.get(adapterType);
    if (!adapter) {
      throw new BadRequestException(
        `Unknown channel adapter type: '${adapterType}'. Available: ${[...this.adapters.keys()].join(', ')}`,
      );
    }
    return adapter;
  }

  getAvailableAdapterTypes(): string[] {
    return [...this.adapters.keys()];
  }
}
