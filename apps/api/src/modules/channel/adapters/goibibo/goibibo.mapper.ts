import type {
  AvailabilityPushParams,
  RatePushParams,
  RestrictionPushParams,
  ChannelReservation,
} from '../../channel-adapter.interface';

export function mapAvailabilityToGoibibo(hotelId: string, items: AvailabilityPushParams['items']) {
  return {
    hotelId,
    inventory: items.map((item) => ({
      roomTypeCode: item.channelRoomCode,
      date: item.date,
      available: item.available,
      totalInventory: item.totalInventory,
    })),
  };
}

export function mapRatesToGoibibo(hotelId: string, items: RatePushParams['items']) {
  return {
    hotelId,
    rates: items.map((item) => ({
      roomTypeCode: item.channelRoomCode,
      ratePlanCode: item.channelRateCode,
      date: item.date,
      amount: item.amount,
      currency: item.currencyCode || 'INR',
      singleOccupancy: item.singleOccupancy,
      extraAdult: item.extraAdult,
      extraChild: item.extraChild,
    })),
  };
}

export function mapRestrictionsToGoibibo(hotelId: string, items: RestrictionPushParams['items']) {
  return {
    hotelId,
    restrictions: items.map((item) => ({
      roomTypeCode: item.channelRoomCode,
      ratePlanCode: item.channelRateCode,
      date: item.date,
      stopSell: item.stopSell,
      closedToArrival: item.closedToArrival,
      closedToDeparture: item.closedToDeparture,
      minLos: item.minLos,
      maxLos: item.maxLos,
    })),
  };
}

export function mapGoibiboInboundToHaip(payload: any): ChannelReservation {
  const stay = payload.stay || payload.reservation || payload;
  const guest = payload.guest || {};

  return {
    externalConfirmation: String(payload.bookingId || payload.externalConfirmation || payload.booking_reference),
    externalRevisionId: payload.revisionId ? String(payload.revisionId) : undefined,
    channelCode: 'goibibo',
    channelHotelId: String(payload.hotelId || payload.channelHotelId || ''),
    guestFirstName: guest.firstName || guest.name?.split(' ')[0] || 'Guest',
    guestLastName: guest.lastName || guest.name?.split(' ').slice(1).join(' ') || 'Goibibo',
    guestEmail: guest.email || undefined,
    guestPhone: guest.phone || undefined,
    channelRoomCode: stay.roomTypeCode || stay.room_type || '',
    channelRateCode: stay.ratePlanCode || stay.rate_plan || 'BAR',
    arrivalDate: stay.arrivalDate || stay.checkin,
    departureDate: stay.departureDate || stay.checkout,
    adults: Number(stay.adults || 1),
    children: Number(stay.children || 0),
    totalAmount: Number(stay.totalAmount || stay.total_price || 0),
    currencyCode: stay.currency || stay.currencyCode || 'INR',
    specialRequests: stay.specialRequests || stay.remarks,
    status: payload.event === 'BOOKING_CANCELLED' || payload.status === 'cancelled'
      ? 'cancelled'
      : payload.event === 'BOOKING_MODIFIED' || payload.status === 'modified'
        ? 'modified'
        : 'new',
    channelBookingDate: payload.bookingDate ? new Date(payload.bookingDate) : new Date(),
  };
}
