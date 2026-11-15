async function testRejectFlow() {
  const propertyId = 'a0000001-0000-4000-a000-000000000001';

  // 1. Submit direct booking request for Priya Patel
  console.log('1. Submitting website booking request for Priya Patel...');
  const bookRes = await fetch('http://localhost:3000/api/v1/booking-engine/book', {
    method: 'POST',
    headers: {
      'x-publishable-key': 'pk_live_HAIPDEMO0000000000000000',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      checkIn: '2026-12-05',
      checkOut: '2026-12-08',
      roomTypeId: 'b0000001-0000-4000-a000-000000000001',
      ratePlanId: 'd0000001-0000-4000-a000-000000000001',
      adults: 2,
      children: 1,
      guestFirstName: 'Priya',
      guestLastName: 'Patel',
      guestEmail: 'priya.patel@example.com',
      guestPhone: '+919123456789',
      paymentToken: 'tok_mock_upi_priya',
    }),
  });
  const bookData = await bookRes.json();
  console.log('Book submission response:', bookRes.status, bookData);

  const reqId = bookData.id || bookData.bookingRequestId;
  console.log('Created request id:', reqId, 'Status:', bookData.status);

  // 2. Test rejection without reason (should fail with 400)
  console.log('2. Testing reject without reason (should fail)...');
  const failRes = await fetch(`http://localhost:3000/api/v1/direct-bookings/${reqId}/reject?propertyId=${propertyId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: '' }),
  });
  console.log('Reject without reason status:', failRes.status);

  // 3. Reject with valid mandatory reason
  console.log('3. Rejecting with mandatory reason...');
  const rejectRes = await fetch(`http://localhost:3000/api/v1/direct-bookings/${reqId}/reject?propertyId=${propertyId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: 'Hotel Spark is fully booked for a private banquet event on these selected dates.' }),
  });
  const rejectData = await rejectRes.json();
  console.log('Reject response:', rejectRes.status, rejectData);

  // 4. Verify counts now
  const listRes = await fetch(`http://localhost:3000/api/v1/direct-bookings?propertyId=${propertyId}`);
  const listData = await listRes.json();
  console.log('Counts after reject:', listData.counts);
  console.log('Latest booking in list:', listData.data?.[0]?.guestFirstName, listData.data?.[0]?.status, listData.data?.[0]?.denialReason);
}

testRejectFlow();
