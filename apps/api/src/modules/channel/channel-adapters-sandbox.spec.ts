import { describe, it, expect, vi } from 'vitest';
import { WebsiteChannelAdapter } from './adapters/website/website.adapter';
import { WhatsAppChannelAdapter } from './adapters/whatsapp/whatsapp.adapter';
import { MakeMyTripAdapter } from './adapters/makemytrip/makemytrip.adapter';
import { GoibiboAdapter } from './adapters/goibibo/goibibo.adapter';
import { BookingComAdapter } from './adapters/booking-com/booking-com.adapter';

describe('Channel Adapters Sandbox Test Suite', () => {
  describe('WebsiteChannelAdapter', () => {
    const adapter = new WebsiteChannelAdapter();

    it('validates active direct booking engine connection', async () => {
      const res = await adapter.testConnection({});
      expect(res.connected).toBe(true);
      expect(res.message).toContain('Spark Hotel Website');
    });

    it('pushes availability updates to website inventory cache', async () => {
      const res = await adapter.pushAvailability({
        propertyId: 'prop-1',
        channelConnectionId: 'conn-web',
        items: [
          { channelRoomCode: 'DLX', date: '2026-06-01', available: 5, totalInventory: 6 },
          { channelRoomCode: 'DLX', date: '2026-06-02', available: 4, totalInventory: 6 },
        ],
      });
      expect(res.success).toBe(true);
      expect(res.itemsSynced).toBe(2);
    });

    it('pushes rate updates to website pricing grid', async () => {
      const res = await adapter.pushRates({
        propertyId: 'prop-1',
        channelConnectionId: 'conn-web',
        items: [
          { channelRoomCode: 'DLX', channelRateCode: 'BAR', date: '2026-06-01', amount: 3500, currencyCode: 'INR' },
        ],
      });
      expect(res.success).toBe(true);
      expect(res.itemsSynced).toBe(1);
    });
  });

  describe('WhatsAppChannelAdapter', () => {
    const mockConfigService = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'WHATSAPP_PROVIDER') return 'console';
        return undefined;
      }),
    };
    const mockNotificationService: any = {};
    const adapter = new WhatsAppChannelAdapter(mockConfigService as any, mockNotificationService);

    it('connects successfully in sandbox console mode', async () => {
      const res = await adapter.testConnection({ provider: 'console' });
      expect(res.connected).toBe(true);
      expect(res.message).toContain('Sandbox');
    });

    it('requires credentials when configured for live WhatsApp Cloud API', async () => {
      const res = await adapter.testConnection({ provider: 'cloud_api' });
      expect(res.connected).toBe(false);
      expect(res.message).toContain('Setup Required');
    });

    it('parses inbound WhatsApp structured booking payload correctly', () => {
      const payload = {
        bookingId: 'WA-BOOK-777',
        guestName: 'Rahul Sharma',
        phoneNumber: '+919876543210',
        roomTypeCode: 'DELUXE_KING',
        ratePlanCode: 'BAR_ROOM_ONLY',
        arrivalDate: '2026-06-10',
        departureDate: '2026-06-12',
        adults: 2,
        totalAmount: 7000,
        currencyCode: 'INR',
      };

      const res = adapter.parseInboundBooking(payload);
      expect(res.externalConfirmation).toBe('WA-BOOK-777');
      expect(res.channelCode).toBe('whatsapp');
      expect(res.guestFirstName).toBe('Rahul');
      expect(res.guestLastName).toBe('Sharma');
      expect(res.arrivalDate).toBe('2026-06-10');
      expect(res.totalAmount).toBe(7000);
      expect(res.currencyCode).toBe('INR');
    });
  });

  describe('MakeMyTripAdapter & GoibiboAdapter (IngoMMT)', () => {
    const mockConfigService = {
      get: vi.fn().mockReturnValue(undefined),
    };
    const mmtAdapter = new MakeMyTripAdapter(mockConfigService as any);
    const goibiboAdapter = new GoibiboAdapter(mockConfigService as any);

    it('rejects connection when IngoMMT hotelId or credentials are missing', async () => {
      const resMmt = await mmtAdapter.testConnection({});
      expect(resMmt.connected).toBe(false);
      expect(resMmt.message).toContain('Setup Required');

      const resGo = await goibiboAdapter.testConnection({});
      expect(resGo.connected).toBe(false);
      expect(resGo.message).toContain('Setup Required');
    });
  });

  describe('BookingComAdapter', () => {
    const mockConfigService = {
      get: vi.fn().mockReturnValue(undefined),
    };
    const bdcAdapter = new BookingComAdapter(mockConfigService as any);

    it('handles connection test error gracefully when unconfigured', async () => {
      const res = await bdcAdapter.testConnection({});
      expect(res.connected).toBe(false);
    });
  });
});

