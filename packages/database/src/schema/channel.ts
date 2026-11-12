import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb, date, pgEnum, integer } from 'drizzle-orm/pg-core';
import { properties } from './property.js';
import { roomTypes } from './room.js';
import { ratePlans } from './rate-plan.js';
import { bookings, reservations } from './reservation.js';

/**
 * Channel connection status (KB 6.1).
 * Includes both legacy states and full enterprise OTA connectivity lifecycle states.
 */
export const channelStatusEnum = pgEnum('channel_status', [
  'active',
  'inactive',
  'error',
  'pending_setup',
  'not_registered',
  'application_pending',
  'approval_pending',
  'credentials_required',
  'awaiting_property_authorization',
  'connected',
  'sync_error',
  'disconnected',
  'blocked_by_provider',
]);

/**
 * ARI sync direction.
 */
export const syncDirectionEnum = pgEnum('sync_direction', [
  'push',
  'pull',
  'bidirectional',
]);

/**
 * Channel Connections — one per property per channel (KB 6.1).
 * Channel managers (SiteMinder, DerbySoft) or direct OTA connections.
 * Syncs ARI (Availability, Rates, Inventory) outbound and reservations inbound.
 */
export const channelConnections = pgTable('channel_connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').notNull().references(() => properties.id),

  channelCode: varchar('channel_code', { length: 50 }).notNull(),
  channelName: varchar('channel_name', { length: 100 }).notNull(),
  adapterType: varchar('adapter_type', { length: 50 }).notNull(),

  status: channelStatusEnum('status').notNull().default('pending_setup'),
  approvalStatus: varchar('approval_status', { length: 50 }).notNull().default('not_registered'),
  syncDirection: syncDirectionEnum('sync_direction').notNull().default('bidirectional'),

  // Adapter configuration (credentials, endpoints — encrypt secrets at app level)
  config: jsonb('config').$type<Record<string, unknown>>(),

  // Rate plan mapping: PMS rate plans → channel rate codes (JSONB kept for backward compat)
  ratePlanMapping: jsonb('rate_plan_mapping').$type<Array<{
    ratePlanId: string;
    channelRateCode: string;
  }>>(),

  // Room type mapping: PMS room types → channel room codes (JSONB kept for backward compat)
  roomTypeMapping: jsonb('room_type_mapping').$type<Array<{
    roomTypeId: string;
    channelRoomCode: string;
  }>>(),

  // Sync state
  lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
  lastSyncStatus: varchar('last_sync_status', { length: 20 }),
  lastSyncError: text('last_sync_error'),
  lastReservationPullAt: timestamp('last_reservation_pull_at', { withTimezone: true }),
  failedSyncCount: integer('failed_sync_count').notNull().default(0),

  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Normalized Channel Room Mappings.
 */
export const channelRoomMappings = pgTable('channel_room_mappings', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').notNull().references(() => properties.id),
  channelConnectionId: uuid('channel_connection_id').notNull().references(() => channelConnections.id),
  roomTypeId: uuid('room_type_id').notNull().references(() => roomTypes.id),

  channelRoomCode: varchar('channel_room_code', { length: 100 }).notNull(),
  channelRoomName: varchar('channel_room_name', { length: 255 }),

  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Normalized Channel Rate Mappings.
 */
export const channelRateMappings = pgTable('channel_rate_mappings', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').notNull().references(() => properties.id),
  channelConnectionId: uuid('channel_connection_id').notNull().references(() => channelConnections.id),
  ratePlanId: uuid('rate_plan_id').notNull().references(() => ratePlans.id),

  channelRateCode: varchar('channel_rate_code', { length: 100 }).notNull(),
  channelRateName: varchar('channel_rate_name', { length: 255 }),

  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Channel Reservations Tracking — link between PMS bookings/reservations and external OTA records.
 */
export const channelReservations = pgTable('channel_reservations', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').notNull().references(() => properties.id),
  channelConnectionId: uuid('channel_connection_id').notNull().references(() => channelConnections.id),
  reservationId: uuid('reservation_id').references(() => reservations.id),
  bookingId: uuid('booking_id').references(() => bookings.id),

  channelCode: varchar('channel_code', { length: 50 }).notNull(),
  externalConfirmation: varchar('external_confirmation', { length: 100 }).notNull(),
  channelStatus: varchar('channel_status', { length: 50 }).notNull(), // 'new', 'modified', 'cancelled'

  rawPayload: jsonb('raw_payload'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Sync Jobs — persistent background job queue for ARI pushes, pulls and retries with backoff.
 */
export const syncJobs = pgTable('sync_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').notNull().references(() => properties.id),
  channelConnectionId: uuid('channel_connection_id').notNull().references(() => channelConnections.id),

  jobType: varchar('job_type', { length: 50 }).notNull(), // 'ari_push', 'rate_push', 'reservation_pull', 'content_push'
  status: varchar('status', { length: 20 }).notNull().default('pending'), // 'pending', 'processing', 'completed', 'failed'
  payload: jsonb('payload'),

  attempts: integer('attempts').notNull().default(0),
  maxAttempts: integer('max_attempts').notNull().default(5),
  nextRunAt: timestamp('next_run_at', { withTimezone: true }).notNull().defaultNow(),
  lastError: text('last_error'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Webhook Events — persistent log of inbound OTA events for deduplication and audit.
 */
export const webhookEvents = pgTable('webhook_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').notNull().references(() => properties.id),
  channelCode: varchar('channel_code', { length: 50 }).notNull(),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  externalEventId: varchar('external_event_id', { length: 150 }),

  payload: jsonb('payload'),
  status: varchar('status', { length: 20 }).notNull().default('received'), // 'received', 'processed', 'duplicate', 'failed'
  errorMessage: text('error_message'),
  processedAt: timestamp('processed_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Central Inventory Ledger — double-entry ledger tracking date-level room inventory movements.
 */
export const inventoryLedger = pgTable('inventory_ledger', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').notNull().references(() => properties.id),
  roomTypeId: uuid('room_type_id').notNull().references(() => roomTypes.id),
  date: date('date').notNull(),

  changeType: varchar('change_type', { length: 50 }).notNull(), // 'reservation_created', 'reservation_cancelled', 'reservation_modified', 'maintenance_block', 'manual_adjustment'
  delta: integer('delta').notNull(), // -1 when booked, +1 when released
  resultingAvailable: integer('resulting_available'),

  reservationId: uuid('reservation_id').references(() => reservations.id),
  channelCode: varchar('channel_code', { length: 50 }),
  reason: text('reason'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * ARI Sync Log — tracks every push/pull for debugging and reconciliation (KB 6.1).
 */
export const ariSyncLogs = pgTable('ari_sync_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').notNull().references(() => properties.id),
  channelConnectionId: uuid('channel_connection_id').notNull().references(() => channelConnections.id),

  direction: syncDirectionEnum('direction').notNull(),
  action: varchar('action', { length: 50 }).notNull(),

  payload: jsonb('payload'),
  response: jsonb('response'),

  status: varchar('status', { length: 20 }).notNull(),
  errorMessage: text('error_message'),

  roomTypeId: uuid('room_type_id'),
  ratePlanId: uuid('rate_plan_id'),
  dateRangeStart: date('date_range_start'),
  dateRangeEnd: date('date_range_end'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Content Sync Log — tracks descriptive-content pushes (photos, descriptions,
 * amenities) to channels. Mirrors ariSyncLogs but for the content API.
 */
export const contentSyncLogs = pgTable('content_sync_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').notNull().references(() => properties.id),
  channelConnectionId: uuid('channel_connection_id').notNull().references(() => channelConnections.id),

  direction: syncDirectionEnum('direction').notNull().default('push'),
  action: varchar('action', { length: 50 }).notNull(), // 'content_push'

  payload: jsonb('payload'),
  response: jsonb('response'),

  status: varchar('status', { length: 20 }).notNull(),
  errorMessage: text('error_message'),

  roomTypeId: uuid('room_type_id'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
