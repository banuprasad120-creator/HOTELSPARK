async function main() {
  const payload = {
    id: 'wa_msg_test_001',
    from: '919876543210',
    externalConfirmation: 'WA-2026-9901',
    checkInDate: '2026-12-01',
    checkOutDate: '2026-12-03',
    guestName: 'Pavan Kumar',
    guestEmail: 'pavan@example.com',
    guestPhone: '+919876543210',
    roomTypeId: 'STD_KING',
    ratePlanId: 'BAR',
    totalAmount: '350.00',
    status: 'new'
  };

  const propertyId = 'a0000001-0000-4000-a000-000000000001';
  const channelConnectionId = 'e9504b82-034c-4c27-87dd-0c0a6b09e573';

  const res = await fetch(`http://localhost:3000/api/v1/channels/whatsapp/webhook?propertyId=${propertyId}&channelConnectionId=${channelConnectionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', text);
}

main().catch(console.error);
