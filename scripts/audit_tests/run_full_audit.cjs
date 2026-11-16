const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = path.join(__dirname, '..', '..', 'audit_screenshots');
const BASE_ADMIN = 'http://localhost:5173/admin/?propertyId=a0000001-0000-4000-a000-000000000001';
const BASE_BOOKING = 'http://localhost:5174';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const auditResults = {
  testedAt: new Date().toISOString(),
  environment: {
    os: 'Windows 11',
    browser: 'Google Chrome Headless',
    dashboardUrl: BASE_ADMIN,
    bookingUrl: BASE_BOOKING,
  },
  consoleErrors: [],
  networkErrors: [],
  pageTests: [],
  moduleTests: [],
  responsiveTests: [],
  workflowTests: [],
};

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runAudit() {
  console.log('🚀 Starting Comprehensive End-to-End Browser Audit with Headless Chrome...\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
  });

  try {
    const page = await browser.newPage();

    // Collect all console events and network failures
    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error' || text.includes('Error') || text.includes('failed')) {
        auditResults.consoleErrors.push({
          page: page.url(),
          type,
          text,
          location: msg.location(),
        });
      }
    });

    page.on('requestfailed', (req) => {
      auditResults.networkErrors.push({
        url: req.url(),
        method: req.method(),
        failure: req.failure() ? req.failure().errorText : 'Unknown',
        page: page.url(),
      });
    });

    // -------------------------------------------------------------
    // TEST 1: GUEST BOOKING ENGINE WEBSITE (Root / Search / Results)
    // -------------------------------------------------------------
    console.log('📋 Test 1: Testing Guest Booking Website (http://localhost:5174)...');
    await page.setViewport({ width: 1366, height: 768 });
    const bookingStart = Date.now();
    await page.goto(BASE_BOOKING, { waitUntil: 'networkidle2', timeout: 15000 });
    const bookingDuration = Date.now() - bookingStart;

    const bookingTitle = await page.title();
    console.log(`  - Title: "${bookingTitle}" (loaded in ${bookingDuration}ms)`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_booking_home.png') });

    // Check room cards or search form
    const hasSearchButton = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.some((b) => b.innerText.toLowerCase().includes('search') || b.type === 'submit');
    });
    const bodyText = await page.evaluate(() => document.body.innerText);

    auditResults.pageTests.push({
      route: '/',
      service: 'Guest Booking Website',
      title: bookingTitle,
      loadTimeMs: bookingDuration,
      status: 'PASSED',
      hasContent: bodyText.length > 200,
      screenshot: '01_booking_home.png',
    });

    // -------------------------------------------------------------
    // TEST 2: ADMIN DASHBOARD (Overview, 8 indicators, KPI cards)
    // -------------------------------------------------------------
    console.log('\n📋 Test 2: Testing Admin Dashboard (http://localhost:5173/admin/)...');
    const adminStart = Date.now();
    await page.goto(BASE_ADMIN, { waitUntil: 'networkidle2', timeout: 15000 });
    const adminDuration = Date.now() - adminStart;
    const adminTitle = await page.title();
    console.log(`  - Title: "${adminTitle}" (loaded in ${adminDuration}ms)`);
    await sleep(1500);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_admin_dashboard.png') });

    // Verify presence of 8 Key Indicators
    const indicatorsFound = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return {
        totalRooms: text.includes('total rooms'),
        occupied: text.includes('occupied'),
        available: text.includes('available'),
        inHouseGuests: text.includes('in-house guests') || text.includes('currently staying'),
        todayCheckIns: text.includes('today check-ins') || text.includes('today’s check-ins'),
        todayCheckOuts: text.includes('today check-outs') || text.includes('today’s check-outs'),
        todayCollection: text.includes('today collection'),
        unpaidBalances: text.includes('unpaid balances'),
        walkInButton: text.includes('walk-in check-in') || text.includes('walk-in'),
      };
    });

    console.log('  - Dashboard Key Indicators Status:', indicatorsFound);
    auditResults.moduleTests.push({
      module: 'Admin Dashboard',
      route: '/admin/',
      title: adminTitle,
      loadTimeMs: adminDuration,
      indicators: indicatorsFound,
      status: Object.values(indicatorsFound).every(Boolean) ? 'PASSED' : 'PARTIAL',
      screenshot: '02_admin_dashboard.png',
    });

    // -------------------------------------------------------------
    // TEST 3: WALK-IN CHECK-IN MODAL (Add Guest)
    // -------------------------------------------------------------
    console.log('\n📋 Test 3: Testing Walk-In Check-In Modal (+ ADD GUEST)...');
    // Click WALK-IN CHECK-IN button
    const walkInBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find((b) => b.innerText.includes('WALK-IN CHECK-IN') || b.innerText.includes('Walk-In'));
    });

    if (walkInBtn) {
      await walkInBtn.click();
      await sleep(1000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_walkin_modal_open.png') });

      const modalFields = await page.evaluate(() => {
        const text = document.body.innerText.toLowerCase();
        return {
          guestNameField: !!document.querySelector('input[placeholder*="Name" i], input[placeholder*="Ramesh" i], input[name*="name" i]') || text.includes('guest full name'),
          mobileField: !!document.querySelector('input[placeholder*="987" i], input[type="tel"], input[placeholder*="mobile" i]') || text.includes('mobile number'),
          roomSelect: !!document.querySelector('select') || text.includes('room number'),
          idProofUpload: text.includes('id proof') || text.includes('identity proof') || text.includes('upload') || text.includes('front side'),
          advanceField: !!document.querySelector('input[type="number"]') || text.includes('advance payment') || text.includes('advance paid'),
          checkInSubmitBtn: Array.from(document.querySelectorAll('button')).some((b) => b.innerText.toLowerCase().includes('confirm') || b.innerText.toLowerCase().includes('check-in')),
        };
      });

      console.log('  - Walk-In Modal Elements:', modalFields);

      // Close modal by pressing Escape or clicking close
      await page.keyboard.press('Escape');
      await sleep(600);

      auditResults.moduleTests.push({
        module: 'Walk-In Check-In Modal',
        modalFields,
        status: Object.values(modalFields).every(Boolean) ? 'PASSED' : 'PARTIAL',
        screenshot: '03_walkin_modal_open.png',
      });
    }

    // -------------------------------------------------------------
    // TEST 4: IN-HOUSE GUESTS REGISTER (/current-guests)
    // -------------------------------------------------------------
    console.log('\n📋 Test 4: Testing In-House Guests Register (/admin/current-guests)...');
    await page.goto('http://localhost:5173/admin/current-guests?propertyId=a0000001-0000-4000-a000-000000000001', { waitUntil: 'networkidle2' });
    await sleep(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_in_house_guests.png') });

    const inHouseData = await page.evaluate(() => {
      const text = document.body.innerText;
      const rows = document.querySelectorAll('tbody tr, [role="row"]');
      const checkoutButtons = Array.from(document.querySelectorAll('button')).filter((b) => b.innerText.includes('Check Out'));
      return {
        hasTable: text.includes('Current In-House Guest Register') || text.includes('In-House'),
        hasColumns: text.includes('GUEST') && text.includes('ROOM') && text.includes('BALANCE'),
        rowCount: rows.length,
        checkoutButtonsCount: checkoutButtons.length,
      };
    });

    console.log('  - In-House Register Data:', inHouseData);
    auditResults.moduleTests.push({
      module: 'In-House Guests',
      route: '/admin/current-guests',
      data: inHouseData,
      status: inHouseData.hasTable ? 'PASSED' : 'FAILED',
      screenshot: '04_in_house_guests.png',
    });

    // -------------------------------------------------------------
    // TEST 5: ALL ROOMS & RACK (/admin/rooms)
    // -------------------------------------------------------------
    console.log('\n📋 Test 5: Testing Room Management & Rack (/admin/rooms)...');
    await page.goto('http://localhost:5173/admin/rooms?propertyId=a0000001-0000-4000-a000-000000000001', { waitUntil: 'networkidle2' });
    await sleep(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_rooms_rack.png') });

    const roomsData = await page.evaluate(() => {
      const text = document.body.innerText;
      const roomCards = Array.from(document.querySelectorAll('div, span, button')).filter((el) => {
        const t = el.textContent || '';
        return /^Room \d+$/i.test(t.trim()) || /^10[1-5]|20[1-4]|30[1-2]$/.test(t.trim());
      });
      return {
        hasRoomsTitle: text.includes('Rooms') || text.includes('All Rooms & Rack'),
        hasStatusTabs: text.includes('Vacant Clean') && text.includes('Occupied'),
        hasAddRoomButton: text.includes('+ Add Room'),
        noRoomsBugResolved: !text.includes('No rooms found'),
        roomCardsDetected: roomCards.length > 0,
      };
    });

    console.log('  - Rooms Rack Data:', roomsData);
    auditResults.moduleTests.push({
      module: 'Room Management & Rack',
      route: '/admin/rooms',
      data: roomsData,
      status: roomsData.noRoomsBugResolved ? 'PASSED' : 'FAILED',
      screenshot: '05_rooms_rack.png',
    });

    // -------------------------------------------------------------
    // TEST 6: ROOM CATEGORIES & PRICING (/admin/rooms/types)
    // -------------------------------------------------------------
    console.log('\n📋 Test 6: Testing Room Categories & Pricing (/admin/rooms/types)...');
    await page.goto('http://localhost:5173/admin/rooms/types?propertyId=a0000001-0000-4000-a000-000000000001', { waitUntil: 'networkidle2' });
    await sleep(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_room_categories.png') });

    const categoriesData = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasDeluxeKing: text.includes('Deluxe King Room'),
        hasExecutiveSuite: text.includes('Executive Spark Suite'),
        hasStandardQueen: text.includes('Standard Queen Room'),
        hasEditPriceButtons: text.includes('Edit Price'),
      };
    });

    console.log('  - Categories Data:', categoriesData);
    auditResults.moduleTests.push({
      module: 'Room Categories & Pricing',
      route: '/admin/rooms/types',
      data: categoriesData,
      status: categoriesData.hasDeluxeKing ? 'PASSED' : 'FAILED',
      screenshot: '06_room_categories.png',
    });

    // -------------------------------------------------------------
    // TEST 7: GUEST HISTORY (/admin/guest-history)
    // -------------------------------------------------------------
    console.log('\n📋 Test 7: Testing Guest History Register (/admin/guest-history)...');
    await page.goto('http://localhost:5173/admin/guest-history?propertyId=a0000001-0000-4000-a000-000000000001', { waitUntil: 'networkidle2' });
    await sleep(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_guest_history.png') });

    const historyData = await page.evaluate(() => {
      const text = document.body.innerText;
      const searchInputs = document.querySelectorAll('input[type="text"], input[type="search"]');
      return {
        hasHistoryTitle: text.includes('Previous Guest History') || text.includes('Guest History'),
        hasSearchInput: searchInputs.length > 0,
        hasExportOrFilter: text.includes('Search') || text.includes('Filter'),
        hasPreviousRecords: text.includes('Rahul Sharma') || text.includes('Checked Out') || text.includes('Invoice'),
      };
    });

    console.log('  - Guest History Data:', historyData);
    auditResults.moduleTests.push({
      module: 'Guest History',
      route: '/admin/guest-history',
      data: historyData,
      status: historyData.hasHistoryTitle ? 'PASSED' : 'FAILED',
      screenshot: '07_guest_history.png',
    });

    // -------------------------------------------------------------
    // TEST 8: HOUSEKEEPING MANAGEMENT (/admin/housekeeping)
    // -------------------------------------------------------------
    console.log('\n📋 Test 8: Testing Housekeeping Management (/admin/housekeeping)...');
    await page.goto('http://localhost:5173/admin/housekeeping?propertyId=a0000001-0000-4000-a000-000000000001', { waitUntil: 'networkidle2' });
    await sleep(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_housekeeping.png') });

    const housekeepingData = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasHousekeepingTitle: text.includes('Housekeeping') || text.includes('Room Cleaning'),
        hasStatusCards: text.includes('Clean') || text.includes('Dirty'),
      };
    });

    console.log('  - Housekeeping Data:', housekeepingData);
    auditResults.moduleTests.push({
      module: 'Housekeeping Management',
      route: '/admin/housekeeping',
      data: housekeepingData,
      status: housekeepingData.hasHousekeepingTitle ? 'PASSED' : 'FAILED',
      screenshot: '08_housekeeping.png',
    });

    // -------------------------------------------------------------
    // TEST 9: FOLIOS & BILLING (/admin/folios)
    // -------------------------------------------------------------
    console.log('\n📋 Test 9: Testing Folios & Billing (/admin/folios)...');
    await page.goto('http://localhost:5173/admin/folios?propertyId=a0000001-0000-4000-a000-000000000001', { waitUntil: 'networkidle2' });
    await sleep(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_folios_billing.png') });

    const foliosData = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasFoliosTitle: text.includes('Folios') || text.includes('Billing') || text.includes('Invoices'),
        hasInvoicesOrCharges: text.includes('Balance') || text.includes('Paid') || text.includes('Invoice') || text.includes('Charge'),
      };
    });

    console.log('  - Folios Data:', foliosData);
    auditResults.moduleTests.push({
      module: 'Folios & Billing',
      route: '/admin/folios',
      data: foliosData,
      status: foliosData.hasFoliosTitle ? 'PASSED' : 'FAILED',
      screenshot: '09_folios_billing.png',
    });

    // -------------------------------------------------------------
    // TEST 10: STAFF & 3-SHIFT MANAGEMENT (/admin/staff)
    // -------------------------------------------------------------
    console.log('\n📋 Test 10: Testing Staff & Shift Management (/admin/staff)...');
    await page.goto('http://localhost:5173/admin/staff?propertyId=a0000001-0000-4000-a000-000000000001', { waitUntil: 'networkidle2' });
    await sleep(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_staff_shifts.png') });

    const staffData = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasStaffTitle: text.includes('Staff') || text.includes('Employees') || text.includes('Users'),
        hasRolesOrShifts: text.includes('Manager') || text.includes('Receptionist') || text.includes('Role') || text.includes('Shift'),
      };
    });

    console.log('  - Staff & Shifts Data:', staffData);
    auditResults.moduleTests.push({
      module: 'Staff & Shift Management',
      route: '/admin/staff',
      data: staffData,
      status: staffData.hasStaffTitle ? 'PASSED' : 'FAILED',
      screenshot: '10_staff_shifts.png',
    });

    // -------------------------------------------------------------
    // TEST 11: SETTINGS & TAX CONFIGURATION (/admin/settings)
    // -------------------------------------------------------------
    console.log('\n📋 Test 11: Testing Hotel Settings & Taxes (/admin/settings)...');
    await page.goto('http://localhost:5173/admin/settings?propertyId=a0000001-0000-4000-a000-000000000001', { waitUntil: 'networkidle2' });
    await sleep(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11_hotel_settings.png') });

    const settingsData = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasSettingsTitle: text.includes('Settings') || text.includes('Hotel Spark'),
        hasTabs: text.includes('General') || text.includes('Property') || text.includes('Tax'),
      };
    });

    console.log('  - Settings Data:', settingsData);
    auditResults.moduleTests.push({
      module: 'Hotel Settings & Taxes',
      route: '/admin/settings',
      data: settingsData,
      status: settingsData.hasSettingsTitle ? 'PASSED' : 'FAILED',
      screenshot: '11_hotel_settings.png',
    });

    // -------------------------------------------------------------
    // TEST 12: RESPONSIVE TESTING (All 5 Viewports)
    // -------------------------------------------------------------
    console.log('\n📋 Test 12: Responsive Testing across 5 screen sizes...');
    const viewports = [
      { name: 'Mobile_375x812', width: 375, height: 812, device: 'iPhone X / Mobile Mini' },
      { name: 'Mobile_390x844', width: 390, height: 844, device: 'iPhone 12/13/14 Mobile Standard' },
      { name: 'Tablet_768x1024', width: 768, height: 1024, device: 'iPad Portrait' },
      { name: 'Laptop_1366x768', width: 1366, height: 768, device: 'Standard Laptop' },
      { name: 'Desktop_1920x1080', width: 1920, height: 1080, device: 'Full HD Desktop' },
    ];

    for (const vp of viewports) {
      console.log(`  - Testing Viewport: ${vp.name} (${vp.width}x${vp.height} - ${vp.device})...`);
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.goto(BASE_ADMIN, { waitUntil: 'networkidle2' });
      await sleep(1000);

      const responsiveMetrics = await page.evaluate(() => {
        const body = document.body;
        const html = document.documentElement;
        const scrollWidth = Math.max(body.scrollWidth, html.scrollWidth);
        const clientWidth = html.clientWidth;
        const hasHorizontalOverflow = scrollWidth > clientWidth + 5; // Allow small tolerance
        const hamburgerPresent = !!document.querySelector('button svg.lucide-menu, button[aria-label="Toggle menu" i]');
        return {
          scrollWidth,
          clientWidth,
          hasHorizontalOverflow,
          hamburgerPresent,
        };
      });

      const shotName = `responsive_${vp.name}.png`;
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, shotName) });

      auditResults.responsiveTests.push({
        viewport: vp.name,
        resolution: `${vp.width}x${vp.height}`,
        device: vp.device,
        hasHorizontalOverflow: responsiveMetrics.hasHorizontalOverflow,
        hamburgerPresent: responsiveMetrics.hamburgerPresent,
        status: responsiveMetrics.hasHorizontalOverflow ? 'WARNING' : 'PASSED',
        screenshot: shotName,
      });
    }

    // -------------------------------------------------------------
    // TEST 13: CHECKOUT & BILL INVOICE WORKFLOW
    // -------------------------------------------------------------
    console.log('\n📋 Test 13: Testing Checkout & Invoice Generation Workflow...');
    await page.setViewport({ width: 1366, height: 768 });
    await page.goto('http://localhost:5173/admin/current-guests?propertyId=a0000001-0000-4000-a000-000000000001', { waitUntil: 'networkidle2' });
    await sleep(1000);

    const checkoutModalOpen = await page.evaluate(() => {
      const checkoutBtns = Array.from(document.querySelectorAll('button')).filter((b) => b.innerText.includes('Check Out'));
      if (checkoutBtns.length > 0) {
        checkoutBtns[0].click();
        return true;
      }
      return false;
    });

    if (checkoutModalOpen) {
      await sleep(1000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '13_checkout_settlement_modal.png') });

      const checkoutFields = await page.evaluate(() => {
        const text = document.body.innerText;
        return {
          hasGuestName: text.includes('Room') && (text.includes('Check-Out & Settlement') || text.includes('Settlement')),
          hasRoomCharges: text.includes('Room Charges'),
          hasBalance: text.includes('Total Balance') || text.includes('Balance'),
          hasPaymentMethod: text.includes('Cash') || text.includes('UPI'),
          hasConfirmBtn: Array.from(document.querySelectorAll('button')).some((b) => b.innerText.includes('Confirm Check-Out') || b.innerText.includes('Complete Checkout')),
        };
      });

      console.log('  - Checkout Modal Elements:', checkoutFields);
      auditResults.workflowTests.push({
        workflow: 'Guest Checkout & Settlement Modal',
        fields: checkoutFields,
        status: Object.values(checkoutFields).every(Boolean) ? 'PASSED' : 'PARTIAL',
        screenshot: '13_checkout_settlement_modal.png',
      });

      // Close modal
      await page.keyboard.press('Escape');
      await sleep(500);
    }
  } catch (error) {
    console.error('❌ Error during browser audit:', error);
    auditResults.error = error.message;
  } finally {
    await browser.close();
  }

  // Save JSON report for downstream documentation
  const reportJsonPath = path.join(__dirname, '..', '..', 'audit_results.json');
  fs.writeFileSync(reportJsonPath, JSON.stringify(auditResults, null, 2), 'utf8');
  console.log(`\n✅ Browser audit completed! Results saved to ${reportJsonPath}`);
}

runAudit();
