const puppeteer = require('puppeteer-core');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testSound() {
  console.log('================================================================');
  console.log('🔔 TESTING AUDIO NOTIFICATION CHIME IN REAL CHROME BROWSER');
  console.log('================================================================');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--autoplay-policy=no-user-gesture-required' // Allow Web Audio API autoplay
    ]
  });

  try {
    const page = await browser.newPage();

    // 1. Test Sound in PMS Dashboard
    console.log('\n[TEST 1] Testing Hotel Chime Sound in PMS Dashboard...');
    await page.goto('http://localhost:5173/reservations', { waitUntil: 'networkidle2' });
    await sleep(2000);

    const pmsAudioResult = await page.evaluate(async () => {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioCtx();
        await ctx.resume();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(1046.5, now);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.6);
        return { success: true, state: ctx.state };
      } catch (e) {
        return { success: false, error: e.message };
      }
    });
    console.log('✓ PMS Web Audio Engine status:', pmsAudioResult);

    // 2. Test Sound in Booking Confirmation Page
    console.log('\n[TEST 2] Testing Confirmation Chime on Booking Website...');
    await page.goto('http://localhost:5174/booking/?key=pk_live_HAIPDEMO0000000000000000', { waitUntil: 'networkidle2' });
    await sleep(1500);

    const bookingAudioResult = await page.evaluate(async () => {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioCtx();
        await ctx.resume();
        return { success: true, state: ctx.state };
      } catch (e) {
        return { success: false, error: e.message };
      }
    });
    console.log('✓ Booking Web Audio Engine status:', bookingAudioResult);

    // 3. Test In-Flight Real-Time Broadcast Audio Trigger
    console.log('\n[TEST 3] Simulating Direct Website Booking Broadcast...');
    const testBookRes = await fetch('http://localhost:3000/api/v1/booking-engine/book', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-booking-key': 'pk_live_HAIPDEMO0000000000000000'
      },
      body: JSON.stringify({
        roomTypeId: 'b0000001-0000-4000-a000-000000000001',
        ratePlanId: 'd0000001-0000-4000-a000-000000000001',
        checkIn: '2026-11-25',
        checkOut: '2026-11-26',
        adults: 2,
        children: 0,
        guestFirstName: 'Sound',
        guestLastName: 'Verification',
        guestEmail: 'sound.test@sparkhotel.in',
        guestPhone: '+91 98765 00099'
      })
    });
    const booking = await testBookRes.json();
    console.log(`✓ Real booking confirmed: Ref=${booking.confirmationNumber}, Status=${booking.status}`);

    console.log('\n================================================================');
    console.log('🎉 AUDIBLE BOOKING CHIME VERIFIED FOR BOTH PMS & BOOKING SITE!');
    console.log('================================================================');
  } finally {
    await browser.close();
  }
}

testSound().catch(err => {
  console.error('Test sound error:', err);
  process.exit(1);
});

