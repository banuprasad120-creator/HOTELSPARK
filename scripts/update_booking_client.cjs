const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'apps', 'booking', 'src', 'api', 'client.ts');
let code = fs.readFileSync(filePath, 'utf8');

// Update DEFAULT_HOTEL_SPARK_CONFIG
const oldConfig = `  sellableRoomTypeIds: [
    'b0000001-0000-4000-a000-000000000001',
    'b0000002-0000-4000-a000-000000000001',
    'b0000003-0000-4000-a000-000000000001',
  ],
  sellableRatePlanIds: [
    'c0000001-0000-4000-a000-000000000001',
    'c0000002-0000-4000-a000-000000000001',
    'c0000003-0000-4000-a000-000000000001',
  ],`;

const newConfig = `  sellableRoomTypeIds: [
    'b0000001-0000-4000-a000-000000000001', // Budget
    'b0000002-0000-4000-a000-000000000002', // Deluxe Room
    'b0000003-0000-4000-a000-000000000003', // Executive Room
    'b0000004-0000-4000-a000-000000000004', // Suite
    // Legacy aliases
    'b0000002-0000-4000-a000-000000000001',
    'b0000003-0000-4000-a000-000000000001',
  ],
  sellableRatePlanIds: [
    'c0000001-0000-4000-a000-000000000001',
    'c0000002-0000-4000-a000-000000000002',
    'c0000003-0000-4000-a000-000000000003',
    'c0000004-0000-4000-a000-000000000004',
  ],`;

code = code.replace(oldConfig, newConfig);

// Update ROOM_IMAGES
const oldRoomImages = `const ROOM_IMAGES: Record<string, string[]> = {
  'b0000001-0000-4000-a000-000000000001': [
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
  ],
  'b0000002-0000-4000-a000-000000000001': [
    'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80',
  ],
  'b0000003-0000-4000-a000-000000000001': [
    'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80',
  ],
};`;

const newRoomImages = `const ROOM_IMAGES: Record<string, string[]> = {
  'b0000001-0000-4000-a000-000000000001': [
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
  ],
  'b0000002-0000-4000-a000-000000000002': [
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
  ],
  'b0000003-0000-4000-a000-000000000003': [
    'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80',
  ],
  'b0000004-0000-4000-a000-000000000004': [
    'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80',
  ],
  'b0000002-0000-4000-a000-000000000001': [
    'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80',
  ],
  'b0000003-0000-4000-a000-000000000001': [
    'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80',
  ],
};`;

code = code.replace(oldRoomImages, newRoomImages);

// Update fallbackRooms
const newFallbackRooms = `  // Guaranteed fallback catalog with official Hotel Spark tariffs
  const fallbackRooms: SearchRoomType[] = [
    {
      roomTypeId: 'b0000001-0000-4000-a000-000000000001',
      roomTypeName: 'Budget',
      name: 'Budget Room',
      description: 'Comfortable compact room optimized for single traveler convenience with essential amenities. Rooms: 2006, 3006, 4006.',
      maxOccupancy: 1,
      bedType: 'single',
      amenities: ['AC', 'Single Bed', 'Smart TV', 'High-speed Wi-Fi', 'Room Service'],
      available: 3,
      images: ROOM_IMAGES['b0000001-0000-4000-a000-000000000001'],
      rates: [
        {
          ratePlanId: 'c0000001-0000-4000-a000-000000000001',
          ratePlanName: 'Best Available Rate',
          ratePlanCode: 'BAR-BGT',
          rateType: 'bar',
          totalAmount: 1599 * nights,
          currencyCode: 'INR',
          available: true,
          cancellationPolicy: {
            type: 'strict',
            description: 'Non-refundable room reservations.',
          },
        },
      ],
    },
    {
      roomTypeId: 'b0000002-0000-4000-a000-000000000002',
      roomTypeName: 'Deluxe Room',
      name: 'Deluxe Room',
      description: 'Elegant deluxe room with plush bedding, dedicated workspace, and private ensuite bath. 12 rooms across Floors 2, 3 & 4.',
      maxOccupancy: 2,
      bedType: 'double',
      amenities: ['AC', 'Double Bed', 'Smart TV', 'High-speed Wi-Fi', 'Work Desk', 'Tea Maker', 'Balcony'],
      available: 12,
      images: ROOM_IMAGES['b0000002-0000-4000-a000-000000000002'],
      rates: [
        {
          ratePlanId: 'c0000002-0000-4000-a000-000000000002',
          ratePlanName: 'Best Available Rate',
          ratePlanCode: 'BAR-DLX',
          rateType: 'bar',
          totalAmount: 2099 * nights,
          currencyCode: 'INR',
          available: true,
          cancellationPolicy: {
            type: 'strict',
            description: 'Non-refundable room reservations.',
          },
        },
      ],
    },
    {
      roomTypeId: 'b0000003-0000-4000-a000-000000000003',
      roomTypeName: 'Executive Room',
      name: 'Executive Room',
      description: 'Sophisticated executive room featuring panoramic views, ergonomic desk and seating area. 11 rooms across Floors 2, 3 & 4.',
      maxOccupancy: 3,
      bedType: 'queen',
      amenities: ['AC', 'Queen Bed', 'Safe', 'Minibar', 'City View', 'Smart TV', 'High-speed Wi-Fi'],
      available: 11,
      images: ROOM_IMAGES['b0000003-0000-4000-a000-000000000003'],
      rates: [
        {
          ratePlanId: 'c0000003-0000-4000-a000-000000000003',
          ratePlanName: 'Best Available Rate',
          ratePlanCode: 'BAR-EXE',
          rateType: 'bar',
          totalAmount: 2499 * nights,
          currencyCode: 'INR',
          available: true,
          cancellationPolicy: {
            type: 'strict',
            description: 'Non-refundable room reservations.',
          },
        },
      ],
    },
    {
      roomTypeId: 'b0000004-0000-4000-a000-000000000004',
      roomTypeName: 'Suite',
      name: 'Suite',
      description: 'Spacious signature suite featuring a master bedroom, living hall, luxury bathtub and pantry. Rooms: 2010, 3010.',
      maxOccupancy: 4,
      bedType: 'king',
      amenities: ['AC', 'King Bed', 'Living Area', 'Bathtub', 'Minibar', 'Smart TV', 'High-speed Wi-Fi', 'Balcony'],
      available: 2,
      images: ROOM_IMAGES['b0000004-0000-4000-a000-000000000004'],
      rates: [
        {
          ratePlanId: 'c0000004-0000-4000-a000-000000000004',
          ratePlanName: 'Best Available Rate',
          ratePlanCode: 'BAR-SUT',
          rateType: 'bar',
          totalAmount: 2799 * nights,
          currencyCode: 'INR',
          available: true,
          cancellationPolicy: {
            type: 'strict',
            description: 'Non-refundable room reservations.',
          },
        },
      ],
    },
  ];`;

code = code.replace(/  \/\/ Guaranteed fallback catalog[\s\S]*?  \];/, newFallbackRooms);

// Update quoteSupabase to calculate exact price
const newQuoteSupabase = `async function quoteSupabase(body: QuoteRequest): Promise<QuoteResponse> {
  const checkInDate = new Date(body.checkIn);
  const checkOutDate = new Date(body.checkOut);
  const nights = Math.max(
    1,
    Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)),
  );
  const adults = Number(body.adults) || 2;
  const isSingle = adults === 1;

  let ratePerNight = 2099;
  const rt = body.roomTypeId || '';

  if (rt.endsWith('0001') || rt.includes('bgt') || rt.toLowerCase().includes('budget')) {
    ratePerNight = 1599;
  } else if (rt.endsWith('0002') || rt.includes('dlx') || rt.toLowerCase().includes('deluxe')) {
    ratePerNight = isSingle ? 1799 : 2099;
  } else if (rt.endsWith('0003') || rt.includes('exe') || rt.toLowerCase().includes('executive')) {
    ratePerNight = isSingle ? 2199 : 2499;
  } else if (rt.endsWith('0004') || rt.includes('sut') || rt.toLowerCase().includes('suite')) {
    ratePerNight = 2799;
  }

  // Extra persons charge (₹399 per night)
  let extraCharges = 0;
  if (adults > 2) {
    extraCharges = (adults - 2) * 399 * nights;
  }

  const roomSubtotal = (ratePerNight * nights) + extraCharges;
  const tax = Math.round(roomSubtotal * 0.12);
  const grandTotal = roomSubtotal + tax;

  const lineItems = Array.from({ length: nights }, (_, i) => {
    const d = new Date(checkInDate.getTime() + i * 86400000);
    return {
      date: d.toISOString().split('T')[0],
      rate: ratePerNight.toFixed(2),
      tax: (ratePerNight * 0.12).toFixed(2),
    };
  });

  return {
    nights,
    currencyCode: 'INR',
    lineItems,
    roomTotal: roomSubtotal.toFixed(2),
    taxTotal: tax.toFixed(2),
    grandTotal: grandTotal.toFixed(2),
    depositPolicy: { type: 'none', refundable: false },
    depositDue: '0.00',
    cancellationPolicy: {
      type: 'strict',
      description: 'Non-refundable room reservations.',
    },
  };
}`;

code = code.replace(/async function quoteSupabase\(body: QuoteRequest\): Promise<QuoteResponse> \{[\s\S]*?  \};\n\}/, newQuoteSupabase);

// Update bookSupabase roomTypeName and code
code = code.replace(
  `  let baseRate = body.roomTypeId.includes('2') ? 6500 : body.roomTypeId.includes('3') ? 2500 : 3500;`,
  `  let baseRate = 2099;
  const rtId = body.roomTypeId || '';
  const isSingle = (body.adults || 2) === 1;
  if (rtId.endsWith('0001') || rtId.includes('bgt')) baseRate = 1599;
  else if (rtId.endsWith('0002') || rtId.includes('dlx')) baseRate = isSingle ? 1799 : 2099;
  else if (rtId.endsWith('0003') || rtId.includes('exe')) baseRate = isSingle ? 2199 : 2499;
  else if (rtId.endsWith('0004') || rtId.includes('sut')) baseRate = 2799;`
);

code = code.replace(
  `    roomTypeName: body.roomTypeId.includes('2')\n      ? 'Executive Spark Suite'\n      : body.roomTypeId.includes('3')\n      ? 'Standard Queen Room'\n      : 'Deluxe King Room',\n    roomTypeCode: body.roomTypeId.includes('2') ? 'SUT' : body.roomTypeId.includes('3') ? 'STD' : 'DLX',`,
  `    roomTypeName: rtId.endsWith('0001') ? 'Budget' : rtId.endsWith('0003') ? 'Executive Room' : rtId.endsWith('0004') ? 'Suite' : 'Deluxe Room',\n    roomTypeCode: rtId.endsWith('0001') ? 'BGT' : rtId.endsWith('0003') ? 'EXE' : rtId.endsWith('0004') ? 'SUT' : 'DLX',`
);

code = code.replace(
  `  const ratePerNight = Number(plans?.[0]?.base_amount || plans?.[0]?.base_rate || 3500);`,
  `  let ratePerNight = 2099;
  const rtSub = body.roomTypeId || '';
  if (rtSub.endsWith('0001')) ratePerNight = 1599;
  else if (rtSub.endsWith('0002')) ratePerNight = (body.adults === 1) ? 1799 : 2099;
  else if (rtSub.endsWith('0003')) ratePerNight = (body.adults === 1) ? 2199 : 2499;
  else if (rtSub.endsWith('0004')) ratePerNight = 2799;`
);

fs.writeFileSync(filePath, code, 'utf8');
console.log('Successfully updated apps/booking/src/api/client.ts');
