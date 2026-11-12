import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChannelSyncEngineService } from './sync-engine.service';

describe('ChannelSyncEngineService', () => {
  let service: ChannelSyncEngineService;
  let mockDb: any;
  let mockAriService: any;
  let mockChannelService: any;
  let updatedValues: any[];

  beforeEach(() => {
    updatedValues = [];
    mockDb = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: 'job-1',
              propertyId: 'prop-1',
              channelConnectionId: 'conn-1',
              jobType: 'ari_push',
              status: 'pending',
              payload: { startDate: '2026-06-01', endDate: '2026-06-30' },
              attempts: 0,
              maxAttempts: 5,
            },
          ]),
        }),
      }),
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockImplementation(() => Promise.resolve([])),
      limit: vi.fn().mockImplementation(() => Promise.resolve([])),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockImplementation((val) => {
          updatedValues.push(val);
          return {
            where: vi.fn().mockResolvedValue([]),
          };
        }),
      }),
    };

    mockAriService = {
      pushAvailability: vi.fn().mockResolvedValue({ success: true, itemsSynced: 10, errors: [] }),
      pushRates: vi.fn().mockResolvedValue({ success: true, itemsSynced: 10, errors: [] }),
    };

    mockChannelService = {
      findById: vi.fn().mockResolvedValue({ id: 'conn-1', propertyId: 'prop-1' }),
    };

    service = new ChannelSyncEngineService(mockDb, mockAriService, mockChannelService);
  });

  it('enqueues a sync job with pending status', async () => {
    const job = await service.enqueueJob({
      propertyId: 'prop-1',
      channelConnectionId: 'conn-1',
      jobType: 'ari_push',
      payload: { startDate: '2026-06-01', endDate: '2026-06-30' },
    });

    expect(job.status).toBe('pending');
    expect(job.jobType).toBe('ari_push');
  });

  it('executes an ARI push sync job successfully and marks completed', async () => {
    const job = {
      id: 'job-1',
      propertyId: 'prop-1',
      channelConnectionId: 'conn-1',
      jobType: 'ari_push',
      payload: { startDate: '2026-06-01', endDate: '2026-06-30' },
      attempts: 0,
      maxAttempts: 5,
    };

    await service.executeJob(job);

    expect(mockAriService.pushAvailability).toHaveBeenCalledWith(
      'prop-1',
      '2026-06-01',
      '2026-06-30',
      'conn-1',
    );
    expect(updatedValues.some((v) => v.status === 'completed')).toBe(true);
    expect(updatedValues.some((v) => v.failedSyncCount === 0)).toBe(true);
  });

  it('handles job failure with exponential backoff', async () => {
    mockAriService.pushAvailability.mockRejectedValueOnce(new Error('Network timeout'));

    const job = {
      id: 'job-1',
      propertyId: 'prop-1',
      channelConnectionId: 'conn-1',
      jobType: 'ari_push',
      payload: { startDate: '2026-06-01', endDate: '2026-06-30' },
      attempts: 0,
      maxAttempts: 5,
    };

    await service.executeJob(job);

    expect(updatedValues.some((v) => v.status === 'pending' && v.attempts === 1)).toBe(true);
  });

  it('marks job as permanently failed and sets channel connection to sync_error when max attempts reached', async () => {
    mockAriService.pushAvailability.mockRejectedValueOnce(new Error('Persistent 503 Service Unavailable'));

    const job = {
      id: 'job-1',
      propertyId: 'prop-1',
      channelConnectionId: 'conn-1',
      jobType: 'ari_push',
      payload: { startDate: '2026-06-01', endDate: '2026-06-30' },
      attempts: 4,
      maxAttempts: 5,
    };

    await service.executeJob(job);

    expect(updatedValues.some((v) => v.status === 'failed' && v.attempts === 5)).toBe(true);
    expect(updatedValues.some((v) => v.status === 'sync_error')).toBe(true);
  });

  it('deduplicates identical incoming webhook events', async () => {
    mockDb.where.mockResolvedValueOnce([{ id: 'existing-event-1' }]);

    const res = await service.deduplicateWebhookEvent(
      'prop-1',
      'whatsapp',
      'WA-EVT-999',
      'reservation.new',
      { data: 123 },
    );

    expect(res.isDuplicate).toBe(true);
    expect(res.eventId).toBe('existing-event-1');
  });
});
