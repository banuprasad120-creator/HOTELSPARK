import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../packages/database/src/schema/index.js';
import { eq } from 'drizzle-orm';

async function main() {
  const connectionString = process.env['DATABASE_URL'] ?? 'postgresql://haip:haip@localhost:5432/haip';
  const client = postgres(connectionString);
  const db = drizzle(client, { schema });

  const propertyId = 'a0000001-0000-4000-a000-000000000001';
  const stdRoomTypeId = 'b0000001-0000-4000-a000-000000000001';
  const dlxRoomTypeId = 'b0000001-0000-4000-a000-000000000002';
  const stdRatePlanId = 'd0000001-0000-4000-a000-000000000001';
  const dlxRatePlanId = 'd0000001-0000-4000-a000-000000000002';

  const defaultRoomMapping = [
    { roomTypeId: stdRoomTypeId, channelRoomCode: 'STD_KING' },
    { roomTypeId: dlxRoomTypeId, channelRoomCode: 'DLX_OCEAN' },
  ];

  const defaultRateMapping = [
    { ratePlanId: stdRatePlanId, channelRateCode: 'BAR' },
    { ratePlanId: dlxRatePlanId, channelRateCode: 'PROMO' },
  ];

  const channelsToEnsure = [
    {
      channelCode: 'website',
      channelName: 'Spark Hotel Website',
      adapterType: 'website',
      status: 'connected' as const,
      approvalStatus: 'connected' as const,
      syncDirection: 'bidirectional' as const,
      config: { baseUrl: 'https://sparkhotel.demo', bookingEngine: 'internal' },
      roomTypeMapping: defaultRoomMapping,
      ratePlanMapping: defaultRateMapping,
    },
    {
      channelCode: 'whatsapp',
      channelName: 'WhatsApp Business',
      adapterType: 'whatsapp',
      status: 'connected' as const,
      approvalStatus: 'connected' as const,
      syncDirection: 'bidirectional' as const,
      config: { phoneNumberId: '10987654321', webhookUrl: '/api/v1/channels/whatsapp/webhook' },
      roomTypeMapping: defaultRoomMapping,
      ratePlanMapping: defaultRateMapping,
    },
    {
      channelCode: 'makemytrip',
      channelName: 'MakeMyTrip (IngoMMT)',
      adapterType: 'mock',
      status: 'application_pending' as const,
      approvalStatus: 'application_pending' as const,
      syncDirection: 'bidirectional' as const,
      config: { provider: 'IngoMMT', hotelId: 'MMT-SPARK-01' },
      roomTypeMapping: defaultRoomMapping,
      ratePlanMapping: defaultRateMapping,
    },
    {
      channelCode: 'goibibo',
      channelName: 'Goibibo (IngoMMT)',
      adapterType: 'mock',
      status: 'application_pending' as const,
      approvalStatus: 'application_pending' as const,
      syncDirection: 'bidirectional' as const,
      config: { provider: 'IngoMMT', hotelId: 'GOI-SPARK-01' },
      roomTypeMapping: defaultRoomMapping,
      ratePlanMapping: defaultRateMapping,
    },
  ];

  for (const c of channelsToEnsure) {
    const existing = await db
      .select()
      .from(schema.channelConnections)
      .where(eq(schema.channelConnections.channelCode, c.channelCode))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(schema.channelConnections).values({
        propertyId,
        channelCode: c.channelCode,
        channelName: c.channelName,
        adapterType: c.adapterType,
        status: c.status,
        approvalStatus: c.approvalStatus,
        syncDirection: c.syncDirection,
        config: c.config,
        roomTypeMapping: c.roomTypeMapping,
        ratePlanMapping: c.ratePlanMapping,
        lastSyncAt: new Date(),
        lastSyncStatus: 'success',
      });
      console.log(`Created channel connection: ${c.channelName}`);
    } else {
      await db
        .update(schema.channelConnections)
        .set({
          roomTypeMapping: c.roomTypeMapping,
          ratePlanMapping: c.ratePlanMapping,
          status: c.status,
          approvalStatus: c.approvalStatus,
        })
        .where(eq(schema.channelConnections.id, existing[0]!.id));
      console.log(`Updated channel ${c.channelName} mappings.`);
    }
  }

  await client.end();
}

main().catch(err => {
  console.error('Failed to seed spark channels:', err);
  process.exit(1);
});
