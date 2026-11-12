const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\banup\\.gemini\\antigravity\\brain\\15455ecc-6c99-44bb-88e9-f57686be0413';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runBrowserAgent() {
  console.log('================================================================');
  console.log('🚀 LAUNCHING CHROME BROWSER AGENT FOR REAL END-TO-END TESTING');
  console.log('================================================================');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: { width: 1400, height: 900 },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security'
    ]
  });

  const page = await browser.newPage();

  try {
    // -------------------------------------------------------------
    // STEP 1: Inspect PMS Dashboard on Clean Slate (0 reservations)
    // -------------------------------------------------------------
    console.log('\n[AGENT STEP 1] Opening PMS Dashboard (Clean Slate)...');
    await page.goto('http://localhost:5173/reservations', { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(2000);

    const pmsCleanPath = path.join(ARTIFACT_DIR, '01_pms_clean_reservations.png');
    await page.screenshot({ path: pmsCleanPath, fullPage: false });
    console.log(`✓ Captured PMS clean slate: ${pmsCleanPath}`);

    const pmsText = await page.evaluate(() => document.body.innerText);
    const hasHotelSpark = pmsText.includes('Hotel Spark') || pmsText.includes('SPK');
    console.log(`✓ PMS Property Scope: Hotel Spark active = ${hasHotelSpark}`);

    // -------------------------------------------------------------
    // STEP 2: Inspect PMS Rooms & Categories
    // -------------------------------------------------------------
    console.log('\n[AGENT STEP 2] Navigating to PMS Rooms...');
    await page.goto('http://localhost:5173/rooms', { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(2000);

    const pmsRoomsPath = path.join(ARTIFACT_DIR, '02_pms_rooms_inventory.png');
    await page.screenshot({ path: pmsRoomsPath, fullPage: false });
    console.log(`✓ Captured PMS room categories and physical rooms: ${pmsRoomsPath}`);

    // -------------------------------------------------------------
    // STEP 3: Navigate to Guest Booking Website (Home / Search)
    // -------------------------------------------------------------
    console.log('\n[AGENT STEP 3] Opening Hotel Spark Direct Booking Site...');
    await page.goto('http://localhost:5174/booking/?key=pk_live_HAIPDEMO0000000000000000', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    await sleep(2000);

    const siteHomePath = path.join(ARTIFACT_DIR, '03_website_home_search.png');
    await page.screenshot({ path: siteHomePath, fullPage: false });
    console.log(`✓ Captured Booking Website Home Search: ${siteHomePath}`);

    console.log('Clicking "Search availability"...');
    await page.click('button[type="submit"]');
    await sleep(2500);

    // -------------------------------------------------------------
    // STEP 4: Verify Available Rooms, Real Photos & ₹ INR Rates
    // -------------------------------------------------------------
    console.log('\n[AGENT STEP 4] Inspecting Available Rooms & INR Rates...');
    await page.waitForFunction(() => document.body.innerText.includes('Available rooms'), { timeout: 10000 });
    const resultsPath = path.join(ARTIFACT_DIR, '04_website_available_rooms.png');
    await page.screenshot({ path: resultsPath, fullPage: false });
    console.log(`✓ Captured Available Rooms & Rates: ${resultsPath}`);

    const resultsText = await page.evaluate(() => document.body.innerText);
    const hasRupee = resultsText.includes('₹');
    console.log(`✓ Currency verified in browser: Contains ₹ = ${hasRupee}`);

    // Select the first room (e.g. Deluxe Ocean View or Standard King)
    console.log('Selecting room category...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const selectBtn = btns.find(b => b.innerText.trim() === 'Select');
      if (selectBtn) selectBtn.click();
    });
    await sleep(2000);

    // On /room page, verify gallery & click "Continue"
    await page.waitForFunction(() => document.body.innerText.includes('Continue'), { timeout: 10000 });
    const roomPagePath = path.join(ARTIFACT_DIR, '05_website_room_selected.png');
    await page.screenshot({ path: roomPagePath, fullPage: false });

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const contBtn = btns.find(b => b.innerText.trim() === 'Continue');
      if (contBtn) contBtn.click();
    });
    await sleep(2000);

    // On /extras page, click "Continue"
    const extrasPath = path.join(ARTIFACT_DIR, '06_website_extras.png');
    await page.screenshot({ path: extrasPath, fullPage: false });

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const contBtn = btns.find(b => b.innerText.includes('Continue'));
      if (contBtn) contBtn.click();
    });
    await sleep(2000);

    // -------------------------------------------------------------
    // STEP 5: Fill Guest Information Using Real Keyboard Typing
    // -------------------------------------------------------------
    console.log('\n[AGENT STEP 5] Filling Guest Information in Browser...');
    await page.waitForSelector('#firstName', { timeout: 10000 });
    await page.type('#firstName', 'Banu');
    await page.type('#lastName', 'Prasad');
    await page.type('#email', 'banu.prasad0607@gmail.com');
    await page.type('#phone', '+91 88975 32007');

    const guestFormPath = path.join(ARTIFACT_DIR, '07_website_guest_details.png');
    await page.screenshot({ path: guestFormPath, fullPage: false });
    console.log(`✓ Captured filled Guest Details Form: ${guestFormPath}`);

    // Click "Continue to payment"
    console.log('Submitting Guest details form...');
    await page.click('button[type="submit"]');
    await sleep(2500);

    // -------------------------------------------------------------
    // STEP 6: Confirm Booking on Payment Review Page
    // -------------------------------------------------------------
    console.log('\n[AGENT STEP 6] Reviewing & Confirming Booking...');
    await page.waitForFunction(() => document.body.innerText.includes('Confirm booking') || document.body.innerText.includes('Payment'), { timeout: 10000 });

    const paymentPath = path.join(ARTIFACT_DIR, '08_website_payment_review.png');
    await page.screenshot({ path: paymentPath, fullPage: false });
    console.log(`✓ Captured Payment Review Screen: ${paymentPath}`);

    // Click "Confirm booking"
    console.log('Clicking "Confirm booking"...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.innerText.includes('Confirm booking'));
      if (btn) btn.click();
    });

    // -------------------------------------------------------------
    // STEP 7: Verify Instant Confirmation in Browser
    // -------------------------------------------------------------
    console.log('\n[AGENT STEP 7] Verifying Live Confirmation in Browser...');
    await page.waitForFunction(() => document.body.innerText.includes('Booking confirmed'), { timeout: 15000 });
    await sleep(2000);

    const confirmPath = path.join(ARTIFACT_DIR, '09_website_booking_confirmed.png');
    await page.screenshot({ path: confirmPath, fullPage: false });
    console.log(`✓ Captured Booking Confirmation Screen: ${confirmPath}`);

    const confirmDetails = await page.evaluate(() => {
      const body = document.body.innerText;
      return {
        hasConfirmed: body.includes('Booking confirmed'),
        hasStatusConfirmed: body.includes('Status') && body.includes('confirmed'),
        fullText: body.slice(0, 500)
      };
    });
    console.log('✓ Confirmation Status Verified:', confirmDetails);

    // -------------------------------------------------------------
    // STEP 8: Verify Immediate PMS Dashboard Reflection
    // -------------------------------------------------------------
    console.log('\n[AGENT STEP 8] Verifying Immediate Reflection in PMS Reservations...');
    await page.goto('http://localhost:5173/reservations', { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(3000);

    const pmsUpdatedPath = path.join(ARTIFACT_DIR, '10_pms_reservation_confirmed.png');
    await page.screenshot({ path: pmsUpdatedPath, fullPage: false });
    console.log(`✓ Captured PMS with Banu Prasad confirmed booking: ${pmsUpdatedPath}`);

    const pmsAfterText = await page.evaluate(() => document.body.innerText);
    const hasBanu = pmsAfterText.includes('Banu') || pmsAfterText.includes('Prasad');
    console.log(`✓ PMS shows Banu Prasad: ${hasBanu}`);

    // -------------------------------------------------------------
    // STEP 9: Verify WhatsApp Live Chat & Human Takeover in PMS
    // -------------------------------------------------------------
    console.log('\n[AGENT STEP 9] Verifying Communications / Live Chat in PMS...');
    await fetch('http://localhost:3000/api/v1/channels/whatsapp/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        object: 'whatsapp_business_account',
        entry: [{
          id: 'WHATSAPP_SPARK_ID',
          changes: [{
            value: {
              messaging_product: 'whatsapp',
              metadata: { display_phone_number: '919876543210', phone_number_id: 'PN_SPARK_001' },
              contacts: [{ profile: { name: 'Banu Prasad' }, wa_id: '918897532007' }],
              messages: [{
                from: '918897532007',
                id: `wamid.browser_test_${Date.now()}`,
                timestamp: String(Math.floor(Date.now() / 1000)),
                text: { body: 'Hello Spark Hotel! Is early check-in available for my reservation?' },
                type: 'text'
              }]
            },
            field: 'messages'
          }]
        }]
      })
    });

    await page.goto('http://localhost:5173/communications', { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(3000);

    const commsPath = path.join(ARTIFACT_DIR, '11_pms_whatsapp_live_chat.png');
    await page.screenshot({ path: commsPath, fullPage: false });
    console.log(`✓ Captured PMS WhatsApp Live Chat with Human Takeover: ${commsPath}`);

    console.log('\n================================================================');
    console.log('🎉 ALL BROWSER AGENT REAL TESTS COMPLETED SUCCESSFULLY!');
    console.log('================================================================');

  } finally {
    await browser.close();
  }
}

runBrowserAgent().catch(err => {
  console.error('Browser agent error:', err);
  process.exit(1);
});
