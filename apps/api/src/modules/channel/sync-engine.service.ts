import { Injectable, Inject, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { eq, and, lte } from 'drizzle-orm';
import { syncJobs, webhookEvents, channelConnections } from '@telivityhaip/database';
import { DRIZZLE } from '../../database/database.module';
import { AriService } from './ari.service';
import { ChannelService } from './channel.service';

export interface EnqueueSyncJobParams {
  propertyId: string;
  channelConnectionId: string;
  jobType: 'ari_push' | 'rate_push' | 'reservation_pull' | 'content_push';
  payload?: Record<string, unknown>;
  maxAttempts?: number;
}

@Injectable()
export class ChannelSyncEngineService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ChannelSyncEngineService.name);
  private workerInterval: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    private readonly ariService: AriService,
    private readonly channelService: ChannelService,
  ) {}

  onModuleInit() {
    // Start background poller for pending sync jobs (every 5 seconds in development/runtime)
    if (process.env['NODE_ENV'] !== 'test') {
      this.workerInterval = setInterval(() => {
        this.processPendingJobs().catch((err) => {
          this.logger.error(`Error processing sync jobs: ${err.message}`);
        });
      }, 5000);
    }
  }

  onModuleDestroy() {
    if (this.workerInterval) {
      clearInterval(this.workerInterval);
      this.workerInterval = null;
    }
  }

  /**
   * Enqueue a durable sync job into the database.
   */
  async enqueueJob(params: EnqueueSyncJobParams) {
    const [job] = await this.db
      .insert(syncJobs)
      .values({
        propertyId: params.propertyId,
        channelConnectionId: params.channelConnectionId,
        jobType: params.jobType,
        status: 'pending',
        payload: params.payload ?? {},
        attempts: 0,
        maxAttempts: params.maxAttempts ?? 5,
        nextRunAt: new Date(),
      })
      .returning();

    return job;
  }

  /**
   * Process all pending sync jobs whose nextRunAt <= now.
   */
  async processPendingJobs() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const now = new Date();
      const pendingJobs = await this.db
        .select()
        .from(syncJobs)
        .where(
          and(
            eq(syncJobs.status, 'pending'),
            lte(syncJobs.nextRunAt, now),
          ),
        )
        .limit(10);

      for (const job of pendingJobs) {
        await this.executeJob(job);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Execute a single sync job with error handling and exponential backoff.
   */
  async executeJob(job: any) {
    await this.db
      .update(syncJobs)
      .set({ status: 'processing', updatedAt: new Date() })
      .where(eq(syncJobs.id, job.id));

    try {
      const payload = job.payload || {};

      if (job.jobType === 'ari_push') {
        const startDate = (payload.startDate as string) || new Date().toISOString().split('T')[0]!;
        const endDate = (payload.endDate as string) || this.addDays(startDate, 30);
        await this.ariService.pushAvailability(
          job.propertyId,
          startDate,
          endDate,
          job.channelConnectionId,
        );
      } else if (job.jobType === 'rate_push') {
        const startDate = (payload.startDate as string) || new Date().toISOString().split('T')[0]!;
        const endDate = (payload.endDate as string) || this.addDays(startDate, 30);
        await this.ariService.pushRates(
          job.propertyId,
          startDate,
          endDate,
          job.channelConnectionId,
        );
      }

      // Mark job completed
      await this.db
        .update(syncJobs)
        .set({
          status: 'completed',
          updatedAt: new Date(),
          lastError: null,
        })
        .where(eq(syncJobs.id, job.id));

      // Reset connection failure count
      await this.db
        .update(channelConnections)
        .set({
          failedSyncCount: 0,
          lastSyncAt: new Date(),
          lastSyncStatus: 'success',
          lastSyncError: null,
        })
        .where(eq(channelConnections.id, job.channelConnectionId));
    } catch (err: any) {
      const nextAttempt = (job.attempts ?? 0) + 1;
      const maxAttempts = job.maxAttempts ?? 5;
      const isFailed = nextAttempt >= maxAttempts;

      // Exponential backoff: 5s, 20s, 60s, 180s...
      const delayMs = Math.min(5000 * Math.pow(2, nextAttempt), 300000);
      const nextRunAt = new Date(Date.now() + delayMs);

      await this.db
        .update(syncJobs)
        .set({
          status: isFailed ? 'failed' : 'pending',
          attempts: nextAttempt,
          nextRunAt,
          lastError: err.message,
          updatedAt: new Date(),
        })
        .where(eq(syncJobs.id, job.id));

      if (isFailed) {
        this.logger.error(
          `Sync job ${job.id} for connection ${job.channelConnectionId} permanently failed after ${maxAttempts} attempts: ${err.message}`,
        );

        // Update connection status to sync_error
        await this.db
          .update(channelConnections)
          .set({
            status: 'sync_error',
            failedSyncCount: nextAttempt,
            lastSyncStatus: 'failed',
            lastSyncError: err.message,
            updatedAt: new Date(),
          })
          .where(eq(channelConnections.id, job.channelConnectionId));
      }
    }
  }

  /**
   * Idempotency & Duplicate Webhook Detection.
   */
  async deduplicateWebhookEvent(
    propertyId: string,
    channelCode: string,
    externalEventId: string,
    eventType: string,
    payload: any,
  ): Promise<{ isDuplicate: boolean; eventId?: string }> {
    if (!externalEventId) {
      return { isDuplicate: false };
    }

    const [existing] = await this.db
      .select()
      .from(webhookEvents)
      .where(
        and(
          eq(webhookEvents.propertyId, propertyId),
          eq(webhookEvents.channelCode, channelCode),
          eq(webhookEvents.externalEventId, externalEventId),
        ),
      );

    if (existing) {
      this.logger.warn(`Duplicate webhook event ignored: ${channelCode}:${externalEventId}`);
      return { isDuplicate: true, eventId: existing.id };
    }

    const [inserted] = await this.db
      .insert(webhookEvents)
      .values({
        propertyId,
        channelCode,
        eventType,
        externalEventId,
        payload,
        status: 'processed',
        processedAt: new Date(),
      })
      .returning();

    return { isDuplicate: false, eventId: inserted?.id };
  }

  /**
   * Manual Resynchronization for an entire channel connection.
   */
  async resyncConnection(propertyId: string, channelConnectionId: string) {
    const today = new Date().toISOString().split('T')[0]!;
    const nextMonth = this.addDays(today, 30);

    const job = await this.enqueueJob({
      propertyId,
      channelConnectionId,
      jobType: 'ari_push',
      payload: { startDate: today, endDate: nextMonth },
    });

    // Execute immediately
    await this.executeJob(job);
    return { success: true, message: 'Resynchronization initiated and executed.' };
  }

  /**
   * Manual retry for a specific failed sync job.
   */
  async retryJob(jobId: string, propertyId: string) {
    const [job] = await this.db
      .select()
      .from(syncJobs)
      .where(and(eq(syncJobs.id, jobId), eq(syncJobs.propertyId, propertyId)));

    if (!job) {
      throw new Error(`Sync job ${jobId} not found`);
    }

    await this.db
      .update(syncJobs)
      .set({
        status: 'pending',
        attempts: 0,
        nextRunAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(syncJobs.id, jobId));

    await this.executeJob(job);
    return { success: true, message: `Sync job ${jobId} retried successfully.` };
  }

  private addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0]!;
  }
}

