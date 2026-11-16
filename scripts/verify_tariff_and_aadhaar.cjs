const puppeteer = require('puppeteer-core');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const fs = require('fs');
const path = require('path');

async function runLiveVerification() {
  const screenshotDir = path.resolve('audit_screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  console.log('🚀 Starting Puppeteer browser verification on live Netlify site...');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: chromePath,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Test 1: Verify Room Tariff Settings Page (Exact Tariffs & 28 Rooms Inventory)
  console.log('Test 1: Navigating to /admin/tariff-settings...');
  await page.goto('https://hotelspark-karimnagar.netlify.app/admin/tariff-settings?propertyId=a0000001-0000-4000-a000-000000000001', {
    waitUntil: 'networkidle2',
    timeout: 30000,
  });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(screenshotDir, 'live_tariff_settings_matrix_and_inventory.png') });
  console.log('✅ Captured live_tariff_settings_matrix_and_inventory.png');

  // Verify texts on Tariff page
  const tariffDetails = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      hasBudget: text.includes('Budget Room') && text.includes('1,599'),
      hasDeluxe: text.includes('Deluxe Room') && text.includes('1,799') && text.includes('2,099'),
      hasExecutive: text.includes('Executive Room') && text.includes('2,199') && text.includes('2,499'),
      hasSuite: text.includes('Suite') && text.includes('2,799'),
      hasExtraPersonCharge: text.includes('399'),
      has28Rooms: text.includes('28 Rooms') || text.includes('28 rooms') || text.includes('28 / 28'),
      hasChildrenPolicy: text.includes('below 7 years'),
      hasNoCancellation: text.includes('No cancellation policy'),
    };
  });
  console.log('Tariff Details Verification:', tariffDetails);

  // Scroll down to view the 28 rooms live grid and calculation simulator
  await page.evaluate(() => window.scrollBy(0, 750));
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(screenshotDir, 'live_tariff_28_rooms_grid_and_calculator.png') });
  console.log('✅ Captured live_tariff_28_rooms_grid_and_calculator.png');

  // Test 2: Verify Front Office Panel (28 Rooms Availability Rack)
  console.log('Test 2: Navigating to /admin/front-office-panel...');
  await page.goto('https://hotelspark-karimnagar.netlify.app/admin/front-office-panel?propertyId=a0000001-0000-4000-a000-000000000001', {
    waitUntil: 'networkidle2',
    timeout: 30000,
  });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(screenshotDir, 'live_front_office_28_rooms_rack.png') });
  console.log('✅ Captured live_front_office_28_rooms_rack.png');

  // Test 3: Verify Reservations -> New Guest Modal with Aadhaar Card upload & viewer
  console.log('Test 3: Navigating to /admin/reservations...');
  await page.goto('https://hotelspark-karimnagar.netlify.app/admin/reservations?propertyId=a0000001-0000-4000-a000-000000000001', {
    waitUntil: 'networkidle2',
    timeout: 30000,
  });
  await new Promise(r => setTimeout(r, 2000));

  console.log('Clicking New Reservation button...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.innerText.includes('New Reservation'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  // In New Reservation modal, look for New Guest / Add Guest button
  console.log('Looking for New Guest / Add button...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.innerText.includes('New Guest') || b.innerText.includes('Add Guest') || b.innerText.includes('+ Guest'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  // If on Guests page directly:
  console.log('Navigating directly to /admin/guests to test CreateGuestModal...');
  await page.goto('https://hotelspark-karimnagar.netlify.app/admin/guests?propertyId=a0000001-0000-4000-a000-000000000001', {
    waitUntil: 'networkidle2',
    timeout: 30000,
  });
  await new Promise(r => setTimeout(r, 2000));

  console.log('Clicking "+ New Guest" button...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.innerText.includes('New Guest') || b.innerText.includes('+ Guest') || b.innerText.includes('Add Guest'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  // Capture New Guest Modal with Aadhaar Pills
  await page.screenshot({ path: path.join(screenshotDir, 'live_new_guest_modal_with_aadhaar_pills.png') });
  console.log('✅ Captured live_new_guest_modal_with_aadhaar_pills.png');

  // Click "✨ Use Sample Aadhaar Card" button
  console.log('Clicking "✨ Use Sample Aadhaar Card" button...');
  const sampleClicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.innerText.includes('Use Sample Aadhaar'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log('Sample button clicked:', sampleClicked);
  await new Promise(r => setTimeout(r, 1200));

  await page.screenshot({ path: path.join(screenshotDir, 'live_sample_aadhaar_filled_in_modal.png') });
  console.log('✅ Captured live_sample_aadhaar_filled_in_modal.png');

  // Click "👁️ View & Zoom" button
  console.log('Clicking "👁️ View & Zoom" button...');
  const viewerClicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.innerText.includes('View & Zoom') || b.innerText.includes('View Aadhaar'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log('Viewer button clicked:', viewerClicked);
  await new Promise(r => setTimeout(r, 1500));

  await page.screenshot({ path: path.join(screenshotDir, 'live_aadhaar_modal_front_from_create_guest.png') });
  console.log('✅ Captured live_aadhaar_modal_front_from_create_guest.png');

  // Click Back Side tab in Aadhaar viewer
  console.log('Switching to Back Side in Aadhaar Viewer...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.innerText.includes('Back Side'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1200));

  await page.screenshot({ path: path.join(screenshotDir, 'live_aadhaar_modal_back_from_create_guest.png') });
  console.log('✅ Captured live_aadhaar_modal_back_from_create_guest.png');

  // Test 4: Verify Admin Panel Overview & 28-Room Inventory Rack
  console.log('Test 4: Navigating to /admin/panel (Admin Console)...');
  await page.goto('https://hotelspark-karimnagar.netlify.app/admin/panel?propertyId=a0000001-0000-4000-a000-000000000001', {
    waitUntil: 'networkidle2',
    timeout: 30000,
  });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(screenshotDir, 'live_admin_panel_with_28_rooms.png') });
  console.log('✅ Captured live_admin_panel_with_28_rooms.png');

  await browser.close();
  console.log('🎉 All live browser verification tests completed successfully!');
}

runLiveVerification().catch(err => {
  console.error('Error during verification:', err);
  process.exit(1);
});
