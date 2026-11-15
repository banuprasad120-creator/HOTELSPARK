async function testEndpoints() {
  const propertyId = 'a0000001-0000-4000-a000-000000000001';
  
  // 1. Health
  try {
    const resHealth = await fetch('http://localhost:3000/api/v1/health');
    console.log('Health:', resHealth.status, await resHealth.text());
  } catch (e) {
    console.log('Health error:', e.message);
    return;
  }

  // 2. Direct bookings list
  try {
    const resList = await fetch(`http://localhost:3000/api/v1/direct-bookings?propertyId=${propertyId}`);
    const data = await resList.json();
    console.log('Direct bookings list counts:', data.counts);
    console.log('First booking:', data.data?.[0]?.id, data.data?.[0]?.status, data.data?.[0]?.reference);
    
    if (data.data?.[0]?.id) {
      const id = data.data[0].id;
      // 3. Available rooms for this booking
      const resRooms = await fetch(`http://localhost:3000/api/v1/direct-bookings/${id}/available-rooms?propertyId=${propertyId}`);
      const rooms = await resRooms.json();
      console.log('Available rooms:', rooms.map(r => r.number));

      // 4. Test approve
      console.log('Testing APPROVE for', id);
      const resApprove = await fetch(`http://localhost:3000/api/v1/direct-bookings/${id}/approve?propertyId=${propertyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: rooms[0]?.id }),
      });
      const approveResult = await resApprove.json();
      console.log('Approve result:', resApprove.status, approveResult);
    }
  } catch (e) {
    console.log('Direct bookings list error:', e.message);
  }
}

testEndpoints();
