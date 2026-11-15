async function testRejectFlow2() {
  const propertyId = 'a0000001-0000-4000-a000-000000000001';
  const reqId = '0b51f61d-4566-412d-99a4-d94a6835d59e';

  // 1. Test rejection without reason (should fail with 400)
  console.log('1. Testing reject without reason (should fail)...');
  const failRes = await fetch(`http://localhost:3000/api/v1/direct-bookings/${reqId}/reject?propertyId=${propertyId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: '   ' }),
  });
  console.log('Reject without reason status:', failRes.status, await failRes.text());

  // 2. Reject with valid mandatory reason
  console.log('2. Rejecting with mandatory reason...');
  const rejectRes = await fetch(`http://localhost:3000/api/v1/direct-bookings/${reqId}/reject?propertyId=${propertyId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: 'Hotel Spark is fully booked for a private banquet event on these selected dates.' }),
  });
  const rejectData = await rejectRes.json();
  console.log('Reject response:', rejectRes.status, rejectData);

  // 3. Verify counts now
  const listRes = await fetch(`http://localhost:3000/api/v1/direct-bookings?propertyId=${propertyId}`);
  const listData = await listRes.json();
  console.log('Counts after reject:', listData.counts);
  console.log('Rejected item:', listData.data?.find(d => d.id === reqId)?.denialReason);
}

testRejectFlow2();
