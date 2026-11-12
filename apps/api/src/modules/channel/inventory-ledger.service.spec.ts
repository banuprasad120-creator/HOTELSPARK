import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InventoryLedgerService } from './inventory-ledger.service';

describe('InventoryLedgerService', () => {
  let service: InventoryLedgerService;
  let mockDb: any;
  let insertedValues: any[];

  beforeEach(() => {
    insertedValues = [];
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      for: vi.fn().mockResolvedValue([{ id: 'rt-1' }]),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockImplementation((val) => {
          insertedValues.push(val);
          return Promise.resolve();
        }),
      }),
    };

    service = new InventoryLedgerService(mockDb);
  });

  it('acquires pessimistic inventory lock on room type', async () => {
    await service.lockInventory('prop-1', 'rt-1', mockDb);
    expect(mockDb.for).toHaveBeenCalledWith('update');
  });

  it('throws if room type not found when locking inventory', async () => {
    mockDb.for.mockResolvedValueOnce([]);
    await expect(service.lockInventory('prop-1', 'invalid-rt', mockDb)).rejects.toThrow(
      'Room type invalid-rt not found',
    );
  });

  it('records negative inventory delta on reservation booking across all stay nights', async () => {
    await service.recordReservationBooking(
      'prop-1',
      'rt-1',
      '2026-06-01',
      '2026-06-04',
      'res-123',
      'booking_com',
      mockDb,
    );

    expect(insertedValues.length).toBe(1);
    const records = insertedValues[0];
    expect(records.length).toBe(3); // June 1, 2, 3
    expect(records[0].delta).toBe(-1);
    expect(records[0].changeType).toBe('reservation_created');
    expect(records[0].reservationId).toBe('res-123');
    expect(records[0].channelCode).toBe('booking_com');
  });

  it('records positive inventory delta on reservation cancellation across all stay nights', async () => {
    await service.recordReservationCancellation(
      'prop-1',
      'rt-1',
      '2026-06-01',
      '2026-06-03',
      'res-123',
      'makemytrip',
      'Guest cancelled via MMT',
      mockDb,
    );

    expect(insertedValues.length).toBe(1);
    const records = insertedValues[0];
    expect(records.length).toBe(2); // June 1, 2
    expect(records[0].delta).toBe(1);
    expect(records[0].changeType).toBe('reservation_cancelled');
    expect(records[0].reason).toBe('Guest cancelled via MMT');
  });
});

