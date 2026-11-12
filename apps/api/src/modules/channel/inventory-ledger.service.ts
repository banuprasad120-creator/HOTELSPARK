import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { inventoryLedger, roomTypes } from '@telivityhaip/database';
import { stayDates } from '@telivityhaip/shared';
import { DRIZZLE } from '../../database/database.module';

export interface LedgerRecordParams {
  propertyId: string;
  roomTypeId: string;
  dates: string[];
  changeType:
    | 'reservation_created'
    | 'reservation_cancelled'
    | 'reservation_modified'
    | 'maintenance_block'
    | 'manual_adjustment';
  delta: number; // e.g. -1 for reservation booking, +1 for release/cancellation
  reservationId?: string;
  channelCode?: string;
  reason?: string;
}

@Injectable()
export class InventoryLedgerService {
  private readonly logger = new Logger(InventoryLedgerService.name);

  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  /**
   * Acquire a pessimistic write lock (SELECT ... FOR UPDATE) on the room type row.
   * This guarantees that concurrent transactions competing for inventory on the
   * same room type are strictly serialized, preventing overbooking.
   */
  async lockInventory(propertyId: string, roomTypeId: string, tx: any): Promise<void> {
    const conn = tx ?? this.db;
    const locked = await conn
      .select({ id: roomTypes.id })
      .from(roomTypes)
      .where(and(eq(roomTypes.id, roomTypeId), eq(roomTypes.propertyId, propertyId)))
      .for('update');

    if (!locked || locked.length === 0) {
      throw new Error(`Room type ${roomTypeId} not found for property ${propertyId}`);
    }
  }

  /**
   * Append transactional entries to the inventory ledger across the requested dates.
   */
  async recordChange(params: LedgerRecordParams, tx?: any): Promise<void> {
    const conn = tx ?? this.db;
    if (!params.dates || params.dates.length === 0) return;

    const values = params.dates.map((date) => ({
      propertyId: params.propertyId,
      roomTypeId: params.roomTypeId,
      date,
      changeType: params.changeType,
      delta: params.delta,
      reservationId: params.reservationId ?? null,
      channelCode: params.channelCode ?? null,
      reason: params.reason ?? null,
    }));

    await conn.insert(inventoryLedger).values(values);
  }

  /**
   * Record inventory allocation for a stay (arrivalDate to departureDate - 1).
   * Delta: -1 per room night.
   */
  async recordReservationBooking(
    propertyId: string,
    roomTypeId: string,
    arrivalDate: string,
    departureDate: string,
    reservationId: string,
    channelCode?: string,
    tx?: any,
  ): Promise<void> {
    const dates = stayDates(arrivalDate, departureDate);
    await this.recordChange(
      {
        propertyId,
        roomTypeId,
        dates,
        changeType: 'reservation_created',
        delta: -1,
        reservationId,
        channelCode,
        reason: `Reservation ${reservationId} created via ${channelCode ?? 'direct'}`,
      },
      tx,
    );
  }

  /**
   * Record inventory release for a cancelled stay.
   * Delta: +1 per room night.
   */
  async recordReservationCancellation(
    propertyId: string,
    roomTypeId: string,
    arrivalDate: string,
    departureDate: string,
    reservationId: string,
    channelCode?: string,
    reason?: string,
    tx?: any,
  ): Promise<void> {
    const dates = stayDates(arrivalDate, departureDate);
    await this.recordChange(
      {
        propertyId,
        roomTypeId,
        dates,
        changeType: 'reservation_cancelled',
        delta: 1,
        reservationId,
        channelCode,
        reason: reason ?? `Reservation ${reservationId} cancelled`,
      },
      tx,
    );
  }

  /**
   * Query the immutable inventory ledger history for audits and reconciliation.
   */
  async getLedgerHistory(
    propertyId: string,
    roomTypeId?: string,
    dateFrom?: string,
    dateTo?: string,
    limit = 100,
  ) {
    const conditions = [eq(inventoryLedger.propertyId, propertyId)];
    if (roomTypeId) {
      conditions.push(eq(inventoryLedger.roomTypeId, roomTypeId));
    }
    if (dateFrom) {
      conditions.push(gte(inventoryLedger.date, dateFrom));
    }
    if (dateTo) {
      conditions.push(lte(inventoryLedger.date, dateTo));
    }

    return this.db
      .select()
      .from(inventoryLedger)
      .where(and(...conditions))
      .orderBy(desc(inventoryLedger.createdAt))
      .limit(limit);
  }
}

