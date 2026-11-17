const SUPABASE_URL = 'https://erzzqhzjtdhzrwpzbflr.supabase.co';
const SECRET_KEY = Buffer.from('c2Jfc2VjcmV0X0tuV3ZJOUlWTWdacVdoYUNOY095dHdfSG5wV3BCYUI=', 'base64').toString('utf8');
const PROPERTY_ID = 'a0000001-0000-4000-a000-000000000001';

async function syncAll28Rooms() {
  const rawRooms = [
    // 2nd Floor (10 rooms)
    { number: '2001', floor: '2', typeId: 'b0000002-0000-4000-a000-000000000002' }, // Deluxe
    { number: '2002', floor: '2', typeId: 'b0000003-0000-4000-a000-000000000003' }, // Executive
    { number: '2003', floor: '2', typeId: 'b0000002-0000-4000-a000-000000000002' }, // Deluxe
    { number: '2004', floor: '2', typeId: 'b0000002-0000-4000-a000-000000000002' }, // Deluxe
    { number: '2005', floor: '2', typeId: 'b0000003-0000-4000-a000-000000000003' }, // Executive
    { number: '2006', floor: '2', typeId: 'b0000001-0000-4000-a000-000000000001' }, // Budget
    { number: '2007', floor: '2', typeId: 'b0000002-0000-4000-a000-000000000002' }, // Deluxe
    { number: '2008', floor: '2', typeId: 'b0000003-0000-4000-a000-000000000003' }, // Executive
    { number: '2009', floor: '2', typeId: 'b0000003-0000-4000-a000-000000000003' }, // Executive
    { number: '2010', floor: '2', typeId: 'b0000004-0000-4000-a000-000000000004' }, // Suite

    // 3rd Floor (10 rooms)
    { number: '3001', floor: '3', typeId: 'b0000002-0000-4000-a000-000000000002' }, // Deluxe
    { number: '3002', floor: '3', typeId: 'b0000003-0000-4000-a000-000000000003' }, // Executive
    { number: '3003', floor: '3', typeId: 'b0000002-0000-4000-a000-000000000002' }, // Deluxe
    { number: '3004', floor: '3', typeId: 'b0000002-0000-4000-a000-000000000002' }, // Deluxe
    { number: '3005', floor: '3', typeId: 'b0000003-0000-4000-a000-000000000003' }, // Executive
    { number: '3006', floor: '3', typeId: 'b0000001-0000-4000-a000-000000000001' }, // Budget
    { number: '3007', floor: '3', typeId: 'b0000002-0000-4000-a000-000000000002' }, // Deluxe
    { number: '3008', floor: '3', typeId: 'b0000003-0000-4000-a000-000000000003' }, // Executive
    { number: '3009', floor: '3', typeId: 'b0000003-0000-4000-a000-000000000003' }, // Executive
    { number: '3010', floor: '3', typeId: 'b0000004-0000-4000-a000-000000000004' }, // Suite

    // 4th Floor (8 rooms)
    { number: '4001', floor: '4', typeId: 'b0000002-0000-4000-a000-000000000002' }, // Deluxe
    { number: '4002', floor: '4', typeId: 'b0000003-0000-4000-a000-000000000003' }, // Executive
    { number: '4003', floor: '4', typeId: 'b0000002-0000-4000-a000-000000000002' }, // Deluxe
    { number: '4004', floor: '4', typeId: 'b0000002-0000-4000-a000-000000000002' }, // Deluxe
    { number: '4005', floor: '4', typeId: 'b0000003-0000-4000-a000-000000000003' }, // Executive
    { number: '4006', floor: '4', typeId: 'b0000001-0000-4000-a000-000000000001' }, // Budget
    { number: '4007', floor: '4', typeId: 'b0000002-0000-4000-a000-000000000002' }, // Deluxe
    { number: '4008', floor: '4', typeId: 'b0000003-0000-4000-a000-000000000003' }, // Executive
  ];

  // Fetch current rooms from Supabase
  const currentRes = await fetch(`${SUPABASE_URL}/rest/v1/rooms?select=*`, {
    headers: { apikey: SECRET_KEY, Authorization: 'Bearer ' + SECRET_KEY },
  });
  const currentRooms = await currentRes.json();
  const existingByNumber = new Map(currentRooms.map(r => [r.number, r]));

  console.log(`Currently ${currentRooms.length} rooms in DB. Syncing all 28 rooms...`);

  for (const target of rawRooms) {
    const existing = existingByNumber.get(target.number);
    if (existing) {
      await fetch(`${SUPABASE_URL}/rest/v1/rooms?id=eq.${existing.id}`, {
        method: 'PATCH',
        headers: { apikey: SECRET_KEY, Authorization: 'Bearer ' + SECRET_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: target.number,
          floor: target.floor,
          room_type_id: target.typeId,
          status: 'vacant_clean',
          hk_occupancy: 'vacant',
          is_active: true,
        }),
      });
    } else {
      await fetch(`${SUPABASE_URL}/rest/v1/rooms`, {
        method: 'POST',
        headers: { apikey: SECRET_KEY, Authorization: 'Bearer ' + SECRET_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: crypto.randomUUID(),
          hotel_id: PROPERTY_ID,
          property_id: PROPERTY_ID,
          number: target.number,
          floor: target.floor,
          room_type_id: target.typeId,
          status: 'vacant_clean',
          hk_occupancy: 'vacant',
          is_active: true,
          amenities: [],
        }),
      });
    }
  }

  // Remove any rooms not in the 28 list
  const validNumbers = new Set(rawRooms.map(r => r.number));
  for (const r of currentRooms) {
    if (!validNumbers.has(r.number)) {
      await fetch(`${SUPABASE_URL}/rest/v1/rooms?id=eq.${r.id}`, {
        method: 'DELETE',
        headers: { apikey: SECRET_KEY, Authorization: 'Bearer ' + SECRET_KEY },
      });
    }
  }

  const finalRes = await fetch(`${SUPABASE_URL}/rest/v1/rooms?select=number,floor,room_type_id&order=number.asc`, {
    headers: { apikey: SECRET_KEY, Authorization: 'Bearer ' + SECRET_KEY },
  });
  const finalRooms = await finalRes.json();
  console.log(`\n🎉 Total rooms in Supabase: ${finalRooms.length}`);
  console.log('Room numbers:', finalRooms.map(r => r.number).join(', '));
}

syncAll28Rooms().catch(console.error);
