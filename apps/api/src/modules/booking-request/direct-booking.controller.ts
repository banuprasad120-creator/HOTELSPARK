import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { DirectBookingService } from './direct-booking.service';
import { RequirePermissions } from '@telivityhaip/shared';

@ApiTags('Direct Booking Management')
@Controller('direct-bookings')
export class DirectBookingController {
  constructor(private readonly service: DirectBookingService) {}

  @Get()
  @RequirePermissions('reservations.read')
  @ApiOperation({ summary: 'List direct booking requests with counts and filters' })
  @ApiQuery({ name: 'propertyId', required: true })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async list(
    @Query('propertyId', ParseUUIDPipe) propertyId: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.list(propertyId, { status, search, page, limit });
  }

  @Get('history/audit')
  @RequirePermissions('reservations.read')
  @ApiOperation({ summary: 'Get audit history of all direct booking decisions' })
  @ApiQuery({ name: 'propertyId', required: true })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async history(
    @Query('propertyId', ParseUUIDPipe) propertyId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.history(propertyId, page, limit);
  }

  @Get(':id/available-rooms')
  @RequirePermissions('reservations.read')
  @ApiOperation({ summary: 'Get available physical rooms for this booking request stay' })
  @ApiQuery({ name: 'propertyId', required: true })
  async getAvailableRooms(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('propertyId', ParseUUIDPipe) propertyId: string,
  ) {
    const details = await this.service.getDetails(id, propertyId);
    return this.service.getAvailableRoomsForStay(
      propertyId,
      details.roomTypeId,
      details.arrivalDate,
      details.departureDate,
    );
  }

  @Get(':id')
  @RequirePermissions('reservations.read')
  @ApiOperation({ summary: 'Get details of a direct booking request' })
  @ApiQuery({ name: 'propertyId', required: true })
  async getDetails(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('propertyId', ParseUUIDPipe) propertyId: string,
  ) {
    return this.service.getDetails(id, propertyId);
  }

  @Post(':id/approve')
  @RequirePermissions('reservations.write')
  @ApiOperation({ summary: 'Approve a booking request, assign room, and notify guest on WhatsApp' })
  @ApiQuery({ name: 'propertyId', required: true })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('propertyId', ParseUUIDPipe) propertyId: string,
    @Body() body: { roomId?: string; customTotal?: number },
  ) {
    return this.service.approve(id, propertyId, body);
  }

  @Post(':id/reject')
  @RequirePermissions('reservations.write')
  @ApiOperation({ summary: 'Reject a booking request with mandatory reason and notify guest on WhatsApp' })
  @ApiQuery({ name: 'propertyId', required: true })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('propertyId', ParseUUIDPipe) propertyId: string,
    @Body() body: { reason: string },
  ) {
    return this.service.reject(id, propertyId, body);
  }
}
