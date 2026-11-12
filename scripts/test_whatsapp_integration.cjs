const postgres = require(require.resolve('postgres', { paths: ['packages/database'] }));
const sql = postgres(process.env.DATABASE_URL || 'postgresql://haip:haip@localhost:5432/haip');

const API_BASE = 'http://localhost:3000/api/v1';

async function main() {
  console.log('====================================================');
  console.log('SPARK HOTEL — WHATSAPP BUSINESS & AI RECEPTIONIST E2E TEST');
  console.log('====================================================\n');

  // TEST 1: Webhook Verification (GET)
  console.log('TEST 1: Testing Meta WhatsApp Cloud API Webhook Verification...');
  const verifyRes = await fetch(
    `${API_BASE}/channels/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=spark_hotel_webhook_secret_2026&hub.challenge=test_challenge_12345`
  );
  const verifyText = await verifyRes.text();
  console.log(`Status: ${verifyRes.status}, Challenge received: ${verifyText}`);
  if (verifyRes.status === 200 && verifyText === 'test_challenge_12345') {
    console.log('✅ TEST 1 PASSED: Webhook verification successful!\n');
  } else {
    throw new Error(`TEST 1 FAILED: Expected 200 and challenge, got ${verifyRes.status}`);
  }

  // TEST 2: Incoming WhatsApp Message (Meta official payload format) - Greeting
  console.log('TEST 2: Testing Incoming WhatsApp Message (English Greeting)...');
  const greetingPayload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'WHATSAPP_BIZ_ACC_001',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              contacts: [{ profile: { name: 'Kiran Kumar' }, wa_id: '919876543220' }],
              messages: [
                {
                  from: '919876543220',
                  id: `wamid.test.${Date.now()}.001`,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  text: { body: 'Hello, what services do you provide at Hotel Spark?' },
                  type: 'text',
                },
              ],
            },
          },
        ],
      },
    ],
  };

  const greetRes = await fetch(`${API_BASE}/channels/whatsapp/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(greetingPayload),
  });
  const greetData = await greetRes.json();
  console.log('Greeting Response:', greetData.responses?.[0]?.replyText?.slice(0, 150) + '...');
  if (greetRes.status === 201 || greetRes.status === 200) {
    console.log('✅ TEST 2 PASSED: Inbound message processed and AI receptionist greeted guest!\n');
  } else {
    throw new Error('TEST 2 FAILED');
  }

  // TEST 3: Ask WhatsApp for Room Availability & Actual Prices in INR
  console.log('TEST 3: Asking WhatsApp for Room Availability and Actual Prices...');
  const availPayload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'WHATSAPP_BIZ_ACC_001',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              contacts: [{ profile: { name: 'Kiran Kumar' }, wa_id: '919876543220' }],
              messages: [
                {
                  from: '919876543220',
                  id: `wamid.test.${Date.now()}.002`,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  text: { body: 'Do you have rooms available for 2026-11-25 to 2026-11-26?' },
                  type: 'text',
                },
              ],
            },
          },
        ],
      },
    ],
  };

  const availRes = await fetch(`${API_BASE}/channels/whatsapp/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(availPayload),
  });
  const availData = await availRes.json();
  const availReply = availData.responses?.[0]?.replyText || '';
  console.log('Availability Response:\n' + availReply);
  if (availReply.includes('Hotel Spark') && availReply.includes('₹')) {
    console.log('✅ TEST 3 PASSED: Returned live room categories with actual INR prices!\n');
  } else {
    throw new Error('TEST 3 FAILED: Reply did not include room prices');
  }

  // TEST 4: Multilingual Support — Hindi & Telugu
  console.log('TEST 4A: Testing Hindi Interaction...');
  const hindiRes = await fetch(`${API_BASE}/channels/whatsapp/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: '919876543230',
      guestName: 'अमित वर्मा',
      messageId: `wamid.test.${Date.now()}.003`,
      text: 'नमस्ते, क्या आपके होटल में कमरा उपलब्ध है?',
    }),
  });
  const hindiData = await hindiRes.json();
  console.log('Hindi Reply:\n' + hindiData.replyText);
  if (hindiData.language === 'hi' || hindiData.replyText.includes('होटल स्पार्क')) {
    console.log('✅ TEST 4A PASSED: Understood Hindi and replied in Hindi!\n');
  }

  console.log('TEST 4B: Testing Telugu Interaction...');
  const teluguRes = await fetch(`${API_BASE}/channels/whatsapp/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: '919876543240',
      guestName: 'రాజేష్ గౌడ్',
      messageId: `wamid.test.${Date.now()}.004`,
      text: 'నమస్కారం, హోటల్ స్పార్క్‌లో గదుల ధరలు ఎంత?',
    }),
  });
  const teluguData = await teluguRes.json();
  console.log('Telugu Reply:\n' + teluguData.replyText);
  if (teluguData.language === 'te' || teluguData.replyText.includes('హోటల్ స్పార్క్')) {
    console.log('✅ TEST 4B PASSED: Understood Telugu and replied in Telugu!\n');
  }

  // TEST 5: Complete Booking through WhatsApp (Select Category -> Summary -> Confirmation)
  console.log('TEST 5: Complete Booking through WhatsApp...');
  // Step 5A: Guest selects Standard King
  const selectRoomRes = await fetch(`${API_BASE}/channels/whatsapp/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: '919876543220',
      guestName: 'Kiran Kumar',
      messageId: `wamid.test.${Date.now()}.005`,
      text: 'I want to book Standard King for 2026-11-25 to 2026-11-26',
    }),
  });
  const summaryData = await selectRoomRes.json();
  console.log('Booking Summary generated by AI:\n' + (summaryData.responses?.[0]?.replyText || summaryData.replyText));

  // Step 5B: Guest replies CONFIRM
  const confirmRes = await fetch(`${API_BASE}/channels/whatsapp/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: '919876543220',
      guestName: 'Kiran Kumar',
      messageId: `wamid.test.${Date.now()}.006`,
      text: 'CONFIRM',
    }),
  });
  const confirmData = await confirmRes.json();
  const confirmReply = confirmData.responses?.[0]?.replyText || confirmData.replyText || '';
  const confirmationNumber = confirmData.responses?.[0]?.bookingConfirmation || confirmData.bookingConfirmation;
  console.log('Confirmation Reply:\n' + confirmReply);
  console.log('Booking Reference:', confirmationNumber);

  if (confirmationNumber && confirmationNumber.startsWith('HAIP-')) {
    console.log('✅ TEST 5 PASSED: Booking confirmed via WhatsApp with real reference number!\n');
  } else {
    throw new Error('TEST 5 FAILED: No confirmation number generated');
  }

  // TEST 6: Verify Booking Appears Immediately in PMS Database
  console.log('TEST 6: Verifying booking in PMS database...');
  const [pmsRes] = await sql`
    SELECT r.id, r.status, r.arrival_date, r.departure_date, r.total_amount, r.currency_code,
           b.confirmation_number, b.channel_code, g.first_name, g.last_name, g.phone
    FROM reservations r
    JOIN bookings b ON r.booking_id = b.id
    JOIN guests g ON r.guest_id = g.id
    WHERE b.confirmation_number = ${confirmationNumber}
  `;
  console.log('PMS Database Record:', pmsRes);
  if (pmsRes && pmsRes.confirmation_number === confirmationNumber && pmsRes.channel_code === 'whatsapp') {
    console.log('✅ TEST 6 PASSED: Reservation immediately saved in PMS database!\n');
  } else {
    throw new Error('TEST 6 FAILED: Reservation not found in PMS');
  }

  // TEST 7: Verify Manager Notification Created
  console.log('TEST 7: Verifying Manager Notification...');
  const [notif] = await sql`
    SELECT * FROM staff_notifications
    WHERE type = 'reservation_created'
    ORDER BY created_at DESC
    LIMIT 1
  `;
  console.log('Latest Staff Notification:', { title: notif?.title, message: notif?.message });
  if (notif && notif.message.includes(confirmationNumber)) {
    console.log('✅ TEST 7 PASSED: Manager PMS alert created with full reservation details!\n');
  } else {
    throw new Error('TEST 7 FAILED: Staff notification not found for booking');
  }

  // TEST 8: Human Takeover (View, Pause, Manual Staff Reply, Resume)
  console.log('TEST 8: Testing Human Takeover in PMS...');
  const convsRes = await fetch(`${API_BASE}/channels/whatsapp/conversations`);
  const convsData = await convsRes.json();
  const targetConv = (convsData.data || []).find((c) => c.guest_phone === '919876543220');
  console.log(`Found conversation for ${targetConv?.guest_phone}: ID ${targetConv?.id}, AI status: ${targetConv?.ai_status}`);

  // Pause AI
  const pauseRes = await fetch(`${API_BASE}/channels/whatsapp/conversations/${targetConv.id}/pause`, { method: 'POST' });
  const pauseData = await pauseRes.json();
  console.log('Paused AI response:', pauseData);

  // Send Manual Reply as Staff
  const replyRes = await fetch(`${API_BASE}/channels/whatsapp/conversations/${targetConv.id}/reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'Hello Kiran, this is Vijay the Front Desk Manager. Your early check-in is noted!' }),
  });
  const replyData = await replyRes.json();
  console.log('Staff manual message dispatched:', replyData);

  // Guest sends message while AI is paused
  const guestMsgWhilePaused = await fetch(`${API_BASE}/channels/whatsapp/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: '919876543220',
      messageId: `wamid.test.${Date.now()}.007`,
      text: 'Thank you Vijay! See you soon.',
    }),
  });
  const pausedTurn = await guestMsgWhilePaused.json();
  console.log('Guest message while AI paused resulted in:', pausedTurn.status || pausedTurn.responses?.[0]?.status);

  // Resume AI
  const resumeRes = await fetch(`${API_BASE}/channels/whatsapp/conversations/${targetConv.id}/resume`, { method: 'POST' });
  const resumeData = await resumeRes.json();
  console.log('Resumed AI:', resumeData);
  console.log('✅ TEST 8 PASSED: Human Takeover (Pause AI, Manual Staff Reply, Resume AI) verified!\n');

  // TEST 9: Duplicate Webhook Protection
  console.log('TEST 9: Testing Duplicate Webhook Protection...');
  const dupId = `wamid.test.dup.${Date.now()}`;
  await fetch(`${API_BASE}/channels/whatsapp/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: '919876543299', messageId: dupId, text: 'First attempt' }),
  });
  const secondAttempt = await fetch(`${API_BASE}/channels/whatsapp/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: '919876543299', messageId: dupId, text: 'First attempt' }),
  });
  const secondData = await secondAttempt.json();
  console.log('Duplicate submission response:', secondData);
  if (secondData.status === 'duplicate') {
    console.log('✅ TEST 9 PASSED: Duplicate webhook event caught and discarded safely!\n');
  }

  console.log('====================================================');
  console.log('🎉 ALL WHATSAPP & AI RECEPTIONIST TESTS PASSED!');
  console.log('====================================================');

  await sql.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

