import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  Res,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { sql } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { RequirePermissions } from '../auth/permissions.decorator';
import { ChannelService } from './channel.service';
import { AriService } from './ari.service';
import { ContentSyncService } from './content-sync.service';
import { InboundReservationService } from './inbound-reservation.service';
import { RateParityService } from './rate-parity.service';
import { CreateChannelConnectionDto } from './dto/create-channel-connection.dto';
import { UpdateChannelConnectionDto } from './dto/update-channel-connection.dto';
import { SetRateOverrideDto } from './dto/set-rate-override.dto';
import { PushAriDto } from './dto/push-ari.dto';
import { PushContentDto } from './dto/push-content.dto';
import { InboundReservationDto } from './dto/inbound-reservation.dto';
import { StopSellDto } from './dto/stop-sell.dto';
import { InventoryLedgerService } from './inventory-ledger.service';
import { ChannelSyncEngineService } from './sync-engine.service';
import { WhatsAppChannelAdapter } from './adapters/whatsapp/whatsapp.adapter';
import { WhatsAppReceptionistService } from './adapters/whatsapp/whatsapp-receptionist.service';
import { Public } from '../auth/public.decorator';

@ApiTags('Channel Manager')
@Controller('channels')
@RequirePermissions('channels.manage')
export class ChannelController {
  constructor(
    private readonly channelService: ChannelService,
    private readonly ariService: AriService,
    private readonly contentSyncService: ContentSyncService,
    private readonly inboundReservationService: InboundReservationService,
    private readonly rateParityService: RateParityService,
    private readonly inventoryLedgerService: InventoryLedgerService,
    private readonly syncEngineService: ChannelSyncEngineService,
    private readonly whatsAppAdapter: WhatsAppChannelAdapter,
    private readonly receptionistService: WhatsAppReceptionistService,
    private readonly configService: ConfigService,
    @Inject(DRIZZLE) private readonly db: any,
  ) {}

  // --- Channel Connection CRUD ---

  @Post('connections')
  @ApiOperation({ summary: 'Create a new channel connection' })
  async createConnection(@Body() dto: CreateChannelConnectionDto) {
    return this.channelService.create(dto);
  }

  @Get('connections')
  @ApiOperation({ summary: 'List active channel connections for a property' })
  @ApiQuery({ name: 'propertyId', required: true })
  async listConnections(@Query('propertyId', ParseUUIDPipe) propertyId: string) {
    return this.channelService.list(propertyId);
  }

  @Get('connections/:id')
  @ApiOperation({ summary: 'Get a channel connection by ID' })
  @ApiQuery({ name: 'propertyId', required: true })
  async getConnection(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('propertyId', ParseUUIDPipe) propertyId: string,
  ) {
    return this.channelService.findById(id, propertyId);
  }

  @Patch('connections/:id')
  @ApiOperation({ summary: 'Update a channel connection' })
  @ApiQuery({ name: 'propertyId', required: true })
  async updateConnection(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('propertyId', ParseUUIDPipe) propertyId: string,
    @Body() dto: UpdateChannelConnectionDto,
  ) {
    return this.channelService.update(id, propertyId, dto);
  }

  @Delete('connections/:id')
  @ApiOperation({ summary: 'Deactivate a channel connection' })
  @ApiQuery({ name: 'propertyId', required: true })
  async deactivateConnection(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('propertyId', ParseUUIDPipe) propertyId: string,
  ) {
    return this.channelService.deactivate(id, propertyId);
  }

  @Post('connections/:id/test')
  @ApiOperation({ summary: 'Test a channel connection' })
  @ApiQuery({ name: 'propertyId', required: true })
  async testConnection(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('propertyId', ParseUUIDPipe) propertyId: string,
  ) {
    return this.channelService.testConnection(id, propertyId);
  }

  // --- ARI Push ---

  @Post('push/availability')
  @ApiOperation({ summary: 'Push availability to channels' })
  async pushAvailability(@Body() dto: PushAriDto) {
    return this.ariService.pushAvailability(
      dto.propertyId,
      dto.startDate,
      dto.endDate,
      dto.channelConnectionId,
      dto.ariUpdateType,
    );
  }

  @Post('push/rates')
  @ApiOperation({ summary: 'Push rates and restrictions to channels' })
  async pushRates(@Body() dto: PushAriDto) {
    return this.ariService.pushRates(
      dto.propertyId,
      dto.startDate,
      dto.endDate,
      dto.channelConnectionId,
      dto.ariUpdateType,
    );
  }

  @Post('push/full')
  @ApiOperation({ summary: 'Push full ARI (availability + rates + restrictions) to channels' })
  async pushFullARI(@Body() dto: PushAriDto) {
    if (dto.asyncFlush) {
      return this.ariService.scheduleFullFlush(
        dto.propertyId,
        dto.startDate,
        dto.endDate,
        dto.channelConnectionId,
      );
    }
    return this.ariService.pushFullARI(
      dto.propertyId,
      dto.startDate,
      dto.endDate,
      dto.channelConnectionId,
      dto.ariUpdateType,
    );
  }

  @Post('push/full-flush')
  @ApiOperation({
    summary:
      'Queue a full Overlay ARI flush (DerbySoft launch/refresh). Async fire-and-forget until BullMQ channel workers land.',
  })
  async pushFullFlush(@Body() dto: PushAriDto) {
    return this.ariService.scheduleFullFlush(
      dto.propertyId,
      dto.startDate,
      dto.endDate,
      dto.channelConnectionId,
    );
  }

  @Post('connections/:id/sync-property')
  @ApiOperation({ summary: 'Sync property/room profiles to the channel (DerbySoft profile APIs)' })
  @ApiQuery({ name: 'propertyId', required: true })
  async syncProperty(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('propertyId', ParseUUIDPipe) propertyId: string,
  ) {
    return this.contentSyncService.pushContent(propertyId, id);
  }

  @Post('push/stop-sell')
  @ApiOperation({ summary: 'Push stop-sell (zero availability) to a channel' })
  @ApiQuery({ name: 'channelConnectionId', required: true })
  async pushStopSell(
    @Query('channelConnectionId', ParseUUIDPipe) channelConnectionId: string,
    @Body() dto: StopSellDto,
  ) {
    return this.ariService.pushStopSell(
      channelConnectionId,
      dto.propertyId,
      dto.startDate,
      dto.endDate,
      dto.roomTypeId,
    );
  }

  // --- Content Push ---

  @Post('push/content')
  @ApiOperation({ summary: 'Push descriptive content (photos, descriptions, amenities) to channels' })
  async pushContent(@Body() dto: PushContentDto) {
    return this.contentSyncService.pushContent(dto.propertyId, dto.channelConnectionId);
  }

  @Get('content-sync-logs/:channelConnectionId')
  @ApiOperation({ summary: 'Get content-push logs for a channel connection' })
  @ApiQuery({ name: 'propertyId', required: true })
  @ApiQuery({ name: 'limit', required: false })
  async getContentSyncLogs(
    @Param('channelConnectionId', ParseUUIDPipe) channelConnectionId: string,
    @Query('propertyId', ParseUUIDPipe) propertyId: string,
    @Query('limit') limit?: string,
  ) {
    return this.contentSyncService.getContentSyncLogs(
      channelConnectionId,
      propertyId,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  // --- Sync Logs ---

  @Get('sync-logs/:channelConnectionId')
  @ApiOperation({ summary: 'Get sync logs for a channel connection' })
  @ApiQuery({ name: 'propertyId', required: true })
  @ApiQuery({ name: 'limit', required: false })
  async getSyncLogs(
    @Param('channelConnectionId', ParseUUIDPipe) channelConnectionId: string,
    @Query('propertyId', ParseUUIDPipe) propertyId: string,
    @Query('limit') limit?: string,
  ) {
    return this.ariService.getSyncLogs(
      channelConnectionId,
      propertyId,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  // --- Inbound Reservations ---

  @Post('inbound/reservation')
  @ApiOperation({ summary: 'Process an inbound reservation from a channel' })
  async processInboundReservation(@Body() dto: InboundReservationDto) {
    return this.inboundReservationService.processInboundReservation(
      dto.channelConnectionId,
      dto.reservation as any,
    );
  }

  @Post('inbound/pull')
  @ApiOperation({ summary: 'Pull and process reservations from a channel' })
  @ApiQuery({ name: 'propertyId', required: true })
  @ApiQuery({ name: 'channelConnectionId', required: true })
  @ApiQuery({ name: 'since', required: false })
  async pullReservations(
    @Query('channelConnectionId', ParseUUIDPipe) channelConnectionId: string,
    @Query('propertyId', ParseUUIDPipe) propertyId: string,
    @Query('since') since?: string,
  ) {
    return this.inboundReservationService.pullAndProcessReservations(
      channelConnectionId,
      propertyId,
      since ? new Date(since) : undefined,
    );
  }

  // --- Rate Parity ---

  @Get('rate-parity')
  @ApiOperation({ summary: 'Check rate parity across channels' })
  @ApiQuery({ name: 'propertyId', required: true })
  @ApiQuery({ name: 'ratePlanId', required: false })
  async checkRateParity(
    @Query('propertyId', ParseUUIDPipe) propertyId: string,
    @Query('ratePlanId') ratePlanId?: string,
  ) {
    return this.rateParityService.checkParity(propertyId, ratePlanId);
  }

  @Get('rate-parity/effective-rate')
  @ApiOperation({ summary: 'Get effective rate for a rate plan on a channel' })
  @ApiQuery({ name: 'propertyId', required: true })
  @ApiQuery({ name: 'ratePlanId', required: true })
  @ApiQuery({ name: 'channelConnectionId', required: true })
  @ApiQuery({ name: 'date', required: false })
  async getEffectiveRate(
    @Query('propertyId', ParseUUIDPipe) propertyId: string,
    @Query('ratePlanId', ParseUUIDPipe) ratePlanId: string,
    @Query('channelConnectionId', ParseUUIDPipe) channelConnectionId: string,
    @Query('date') date?: string,
  ) {
    return this.rateParityService.getEffectiveRate(
      propertyId,
      ratePlanId,
      channelConnectionId,
      date,
    );
  }

  @Post('rate-parity/override')
  @ApiOperation({ summary: 'Set a rate override for a channel' })
  @ApiQuery({ name: 'propertyId', required: true })
  @ApiQuery({ name: 'channelConnectionId', required: true })
  async setRateOverride(
    @Query('channelConnectionId', ParseUUIDPipe) channelConnectionId: string,
    @Query('propertyId', ParseUUIDPipe) propertyId: string,
    @Body() override: SetRateOverrideDto,
  ) {
    return this.rateParityService.setRateOverride(channelConnectionId, propertyId, {
      channelConnectionId,
      ratePlanId: override.ratePlanId,
      adjustmentType: override.adjustmentType,
      adjustmentValue: override.adjustmentValue,
      startDate: override.startDate,
      endDate: override.endDate,
      reason: override.reason,
    });
  }

  @Delete('rate-parity/override')
  @ApiOperation({ summary: 'Remove a rate override' })
  @ApiQuery({ name: 'propertyId', required: true })
  @ApiQuery({ name: 'channelConnectionId', required: true })
  @ApiQuery({ name: 'ratePlanId', required: true })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async removeRateOverride(
    @Query('channelConnectionId', ParseUUIDPipe) channelConnectionId: string,
    @Query('propertyId', ParseUUIDPipe) propertyId: string,
    @Query('ratePlanId', ParseUUIDPipe) ratePlanId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.rateParityService.removeRateOverride(
      channelConnectionId,
      propertyId,
      ratePlanId,
      startDate,
      endDate,
    );
  }

  // --- Synchronization Engine & Inventory Ledger ---

  @Post('connections/:id/resync')
  @ApiOperation({ summary: 'Trigger manual resynchronization for a channel connection' })
  @ApiQuery({ name: 'propertyId', required: true })
  async resyncConnection(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('propertyId', ParseUUIDPipe) propertyId: string,
  ) {
    if (this.syncEngineService) {
      return this.syncEngineService.resyncConnection(propertyId, id);
    }
    return { success: true, message: 'Sync engine standby' };
  }

  @Post('jobs/:jobId/retry')
  @ApiOperation({ summary: 'Manually retry a failed channel synchronization job' })
  @ApiQuery({ name: 'propertyId', required: true })
  async retryJob(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Query('propertyId', ParseUUIDPipe) propertyId: string,
  ) {
    if (this.syncEngineService) {
      return this.syncEngineService.retryJob(jobId, propertyId);
    }
    return { success: true, message: 'Retry standby' };
  }

  @Get('inventory-ledger')
  @ApiOperation({ summary: 'Get Central Room Inventory Ledger history and audit trail' })
  @ApiQuery({ name: 'propertyId', required: true })
  @ApiQuery({ name: 'roomTypeId', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  async getInventoryLedger(
    @Query('propertyId', ParseUUIDPipe) propertyId: string,
    @Query('roomTypeId') roomTypeId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    if (this.inventoryLedgerService) {
      return this.inventoryLedgerService.getLedgerHistory(propertyId, roomTypeId, dateFrom, dateTo);
    }
    return [];
  }

  // --- Official WhatsApp Cloud API Webhook Verification ---

  @Public()
  @Get('whatsapp/webhook')
  @ApiOperation({ summary: 'Meta WhatsApp Cloud API Webhook Verification' })
  verifyWhatsAppWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const configuredToken =
      this.configService.get<string>('WHATSAPP_VERIFY_TOKEN') || 'spark_hotel_webhook_secret_2026';

    if (mode === 'subscribe' && token === configuredToken) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Verification failed');
  }

  // --- Official WhatsApp Cloud API Inbound Message Processing ---

  @Public()
  @Post('whatsapp/webhook')
  @ApiOperation({ summary: 'Official WhatsApp Cloud API Inbound Webhook (Messages, Statuses, Bookings)' })
  async handleWhatsAppWebhook(
    @Body() body: any,
    @Query('propertyId') queryPropertyId?: string,
    @Query('channelConnectionId') queryConnectionId?: string,
  ) {
    const propertyId = body.propertyId || queryPropertyId || 'a0000001-0000-4000-a000-000000000001';

    // 1. Check if payload is Meta WhatsApp Cloud API format
    if (body.object === 'whatsapp_business_account' || (body.entry && Array.isArray(body.entry))) {
      const responses: any[] = [];

      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          const val = change.value || {};

          // Handle Delivery Statuses (sent, delivered, read, failed)
          if (val.statuses && Array.isArray(val.statuses)) {
            for (const statusObj of val.statuses) {
              const statusId = statusObj.id; // wamid
              const status = statusObj.status; // 'sent', 'delivered', 'read', 'failed'
              try {
                await this.db.execute(sql`
                  UPDATE whatsapp_messages 
                  SET status = ${status}
                  WHERE message_id = ${statusId}
                `);
              } catch {
                // ignore
              }
            }
          }

          // Handle Inbound Messages
          if (val.messages && Array.isArray(val.messages)) {
            for (const msg of val.messages) {
              const from = msg.from; // e.g. "919876543210"
              const messageId = msg.id; // "wamid.HBgL..."
              const text = msg.text?.body || msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || '';
              const contactName = val.contacts?.[0]?.profile?.name || undefined;

              if (text) {
                const res = await this.receptionistService.handleIncomingMessage({
                  propertyId,
                  from,
                  guestName: contactName,
                  messageId,
                  text,
                });
                responses.push(res);
              }
            }
          }
        }
      }

      return { success: true, processed: responses.length, responses };
    }

    // 2. Direct simple message payload (e.g. from test scripts or direct chat widget)
    if (body.text || body.message) {
      const text = body.text || body.message;
      const from = body.from || body.phone || '919876543210';
      const messageId = body.messageId || `sim-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

      return this.receptionistService.handleIncomingMessage({
        propertyId,
        from,
        guestName: body.guestName,
        messageId,
        text,
      });
    }

    // 3. Fallback: Legacy structured booking payload
    if (this.whatsAppAdapter) {
      const reservation = this.whatsAppAdapter.parseInboundBooking(body);
      const connectionId = body.channelConnectionId || queryConnectionId;
      if (propertyId && connectionId) {
        return this.inboundReservationService.processInboundReservation(connectionId, reservation);
      }
    }

    return { success: true, message: 'Webhook received' };
  }

  // --- Shared AI Receptionist Chat Endpoint (for Website Widget) ---

  @Public()
  @Post('whatsapp/chat')
  @ApiOperation({ summary: 'Shared AI Receptionist chat endpoint for website and live guest chat' })
  async handleWebsiteChat(
    @Body() body: { propertyId?: string; sessionId?: string; guestPhone?: string; message: string; guestName?: string },
  ) {
    const propertyId = body.propertyId || 'a0000001-0000-4000-a000-000000000001';
    const phone = body.guestPhone || body.sessionId || '919876543210';
    const msgId = `web-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    return this.receptionistService.handleIncomingMessage({
      propertyId,
      from: phone,
      guestName: body.guestName || 'Website Guest',
      messageId: msgId,
      text: body.message,
    });
  }

  // --- Human Takeover Management ---

  @Get('whatsapp/conversations')
  @ApiOperation({ summary: 'List all WhatsApp conversations for Human Takeover panel' })
  async listWhatsAppConversations(@Query('propertyId') queryPropertyId?: string) {
    const propertyId = queryPropertyId || 'a0000001-0000-4000-a000-000000000001';
    const convs = await this.db.execute(sql`
      SELECT c.*,
             (SELECT body FROM whatsapp_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_body,
             (SELECT created_at FROM whatsapp_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_time
      FROM whatsapp_conversations c
      WHERE c.property_id = ${propertyId}
      ORDER BY c.last_message_at DESC
    `);
    return { success: true, data: convs };
  }

  @Get('whatsapp/conversations/:id/messages')
  @ApiOperation({ summary: 'Get full message history of a WhatsApp conversation' })
  async getWhatsAppMessages(@Param('id', ParseUUIDPipe) id: string) {
    const msgs = await this.db.execute(sql`
      SELECT * FROM whatsapp_messages
      WHERE conversation_id = ${id}
      ORDER BY created_at ASC
    `);
    return { success: true, data: msgs };
  }

  @Post('whatsapp/conversations/:id/pause')
  @ApiOperation({ summary: 'Pause AI responses for Human Takeover' })
  async pauseAiTakeover(@Param('id', ParseUUIDPipe) id: string) {
    await this.db.execute(sql`
      UPDATE whatsapp_conversations SET ai_status = 'paused', updated_at = NOW() WHERE id = ${id}
    `);
    return { success: true, ai_status: 'paused' };
  }

  @Post('whatsapp/conversations/:id/resume')
  @ApiOperation({ summary: 'Resume AI responses after manager takeover' })
  async resumeAiTakeover(@Param('id', ParseUUIDPipe) id: string) {
    await this.db.execute(sql`
      UPDATE whatsapp_conversations SET ai_status = 'active', updated_at = NOW() WHERE id = ${id}
    `);
    return { success: true, ai_status: 'active' };
  }

  @Post('whatsapp/conversations/:id/reply')
  @ApiOperation({ summary: 'Manager sends manual message to guest' })
  async replyAsHuman(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { text?: string; body?: string; staffId?: string },
  ) {
    const text = (body.body || body.text || '').trim();
    if (!text) throw new BadRequestException('Message body cannot be empty');
    const [conv] = await this.db.execute(sql`
      SELECT * FROM whatsapp_conversations WHERE id = ${id} LIMIT 1
    `);
    if (!conv) throw new NotFoundException('Conversation not found');

    const msgId = `staff-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    await this.db.execute(sql`
      INSERT INTO whatsapp_messages (
        conversation_id, property_id, direction, sender_type, sender_id, message_id, body, status
      ) VALUES (
        ${id}, ${conv.property_id}, 'outbound', 'staff', ${body.staffId || null}, ${msgId}, ${text}, 'sent'
      )
    `);

    // Dispatch via WhatsApp Cloud API
    await this.receptionistService.sendWhatsAppMessage(conv.guest_phone, text);

    return { success: true, messageId: msgId };
  }
}
