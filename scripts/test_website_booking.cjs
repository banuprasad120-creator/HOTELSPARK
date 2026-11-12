const postgres = require(require.resolve('postgres', { paths: ['packages/database'] }));
const sql = postgres(process.env.DATABASE_URL || 'postgresql://haip:haip@localhost:5432/haip');

async function testBooking() {
  console.log('Testing Direct Website Booking to PMS...');

  // 1. Request Quote
  const quoteRes = await fetch('http://localhost:3000/api/v1/booking-engine/quote', {
    method: 'POST',
    headers: {
      'x-publishable-key': 'pk_live_HAIPDEMO0000000000000000',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      checkIn: '2026-11-20',
      checkOut: '2026-11-21',
      roomTypeId: 'b0000001-0000-4000-a000-000000000001',
      ratePlanId: 'd0000001-0000-4000-a000-000000000001',
      adults: 2,
      children: 0,
    }),
  });
  const quote = await quoteRes.json();
  console.log('Quote received:', { grandTotal: quote.grandTotal, currency: quote.currencyCode });

  // 2. Execute Booking
  const bookRes = await fetch('http://localhost:3000/api/v1/booking-engine/book', {
    method: 'POST',
    headers: {
      'x-publishable-key': 'pk_live_HAIPDEMO0000000000000000',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      checkIn: '2026-11-20',
      checkOut: '2026-11-21',
      roomTypeId: 'b0000001-0000-4000-a000-000000000001',
      ratePlanId: 'd0000001-0000-4000-a000-000000000001',
      adults: 2,
      children: 0,
      guestFirstName: 'Rahul',
      guestLastName: 'Sharma',
      guestEmail: 'rahul.sharma@example.com',
      guestPhone: '+91 9876543211',
      paymentToken: 'tok_mock_website',
    }),
  });

  const booking = await bookRes.json();
  console.log('Website Booking Response status:', bookRes.status, booking);

  // 3. Verify in PMS Database immediately
  if (booking.confirmationNumber) {
    const dbRes = await sql`
      SELECT r.id, r.status, r.arrival_date, r.departure_date, r.total_amount, r.currency_code,
             g.first_name, g.last_name, g.phone, g.email,
             b.confirmation_number, b.source
      FROM reservations r
      JOIN bookings b ON r.booking_id = b.id
      JOIN guests g ON r.guest_id = g.id
      WHERE b.confirmation_number = ${booking.confirmationNumber}
    `;
    console.log('Verified Booking Immediately in PMS Database:', dbRes[0]);
  }

  await sql.end();
}

testBooking().catch(err => {
  console.error(err);
  process.exit(1);
});
