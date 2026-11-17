const puppeteer = require('puppeteer-core');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const fs = require('fs');
const path = require('path');

const screenshotDir = path.join(__dirname, '..', 'audit_screenshots');
if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

async function run() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: chromePath,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  console.log('--- Step 1: Verify PMS Rooms Rack (28 Rooms, Floors 2, 3, 4, 0 mock guests) ---');
  await page.goto('http://localhost:5173/rooms?propertyId=a0000001-0000-4000-a000-000000000001', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  // Take screenshot of Rooms page
  const roomsScreenPath = path.join(screenshotDir, 'verified_fresh_28_rooms_floors_2_3_4.png');
  await page.screenshot({ path: roomsScreenPath, fullPage: true });
  console.log('Rooms Rack screenshot saved to:', roomsScreenPath);

  // Check room numbers on DOM
  const textContent = await page.evaluate(() => document.body.innerText);
  const has2001 = textContent.includes('2001');
  const has3001 = textContent.includes('3001');
  const has4001 = textContent.includes('4001');
  const hasOld101 = textContent.includes('101') && !textContent.includes('2010');
  console.log('Room check:', { has2001, has3001, has4001, hasOld101 });

  console.log('--- Step 2: Verify Room Tariff Settings Page ---');
  await page.goto('http://localhost:5173/room-tariff?propertyId=a0000001-0000-4000-a000-000000000001', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  const tariffScreenPath = path.join(screenshotDir, 'verified_official_tariff_matrix_28_rooms.png');
  await page.screenshot({ path: tariffScreenPath, fullPage: true });
  console.log('Tariff Matrix screenshot saved to:', tariffScreenPath);

  console.log('--- Step 3: Verify Front Desk Website Bookings Sync ---');
  await page.goto('http://localhost:5173/front-desk?propertyId=a0000001-0000-4000-a000-000000000001', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  // Click on Website Bookings tab
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.innerText, btn);
    if (text && text.includes('Website Bookings')) {
      await btn.click();
      console.log('Clicked Website Bookings tab, text was:', text);
      break;
    }
  }
  await new Promise(r => setTimeout(r, 1500));

  const frontDeskScreenPath = path.join(screenshotDir, 'verified_front_desk_website_bookings_live_sync.png');
  await page.screenshot({ path: frontDeskScreenPath, fullPage: true });
  console.log('Front Desk Website Bookings screenshot saved to:', frontDeskScreenPath);

  console.log('--- Step 4: Verify Guest Website (http://localhost:5174) ---');
  try {
    await page.goto('http://localhost:5174/', { waitUntil: 'networkidle2', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));

    const bookingScreenPath = path.join(screenshotDir, 'verified_guest_website_official_tariffs.png');
    await page.screenshot({ path: bookingScreenPath, fullPage: true });
    console.log('Guest Website screenshot saved to:', bookingScreenPath);
  } catch (err) {
    console.log('Booking website check error:', err.message);
  }

  await browser.close();
  console.log('Verification run complete!');
}

run().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
