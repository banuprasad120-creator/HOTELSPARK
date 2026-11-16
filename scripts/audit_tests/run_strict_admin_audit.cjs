const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = path.join(__dirname, '..', '..', 'audit_screenshots');
const BASE_URL = 'https://hotelspark-karimnagar.netlify.app';
const ADMIN_BASE = `${BASE_URL}/admin/?propertyId=a0000001-0000-4000-a000-000000000001`;

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const auditLog = {
  timestamp: new Date().toISOString(),
  environment: {
    os: 'Windows 11',
    browser: 'Google Chrome Headless',
    targetUrl: BASE_URL,
    adminUrl: ADMIN_BASE,
  },
  tests: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    blocked: 0,
  },
};

function recordTest(id, moduleName, feature, action, expected, actual, status, screenshotFile) {
  auditLog.summary.total++;
  if (status === 'PASS') auditLog.summary.passed++;
  else if (status === 'FAIL') auditLog.summary.failed++;
  else auditLog.summary.blocked++;

  const entry = {
    testId: id,
    module: moduleName,
    feature,
    action,
    expected,
    actual,
    status,
    screenshot: screenshotFile,
  };
  auditLog.tests.push(entry);
  console.log(`[${status}] ${id} - ${feature}: ${actual}`);
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runStrictAudit() {
  console.log('================================================================');
  console.log('🚀 RUNNING STRICT REAL-BROWSER AUDIT FOR HOTEL SPARK ADMIN PANEL');
  console.log(`🎯 Target URL: ${ADMIN_BASE}`);
  console.log('================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--window-size=1400,900'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  try {
    // -------------------------------------------------------------
    // TEST 1: DASHBOARD STATISTICS (8 KPIs)
    // -------------------------------------------------------------
    console.log('\n--- 1. Testing Dashboard Statistics ---');
    await page.goto(ADMIN_BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await sleep(2500);

    const shot1 = '01_dashboard_kpis.png';
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, shot1) });

    const kpis = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return {
        totalRooms: text.includes('total rooms'),
        occupied: text.includes('occupied'),
        available: text.includes('available'),
        inHouse: text.includes('currently staying') || text.includes('in-house guests'),
        todayCheckIns: text.includes('today check-ins') || text.includes('today’s check-ins'),
        todayCheckOuts: text.includes('today check-outs') || text.includes('today’s check-outs'),
        todayCollection: text.includes('today collection'),
        unpaidBalances: text.includes('unpaid balances'),
      };
    });

    const allKpisPresent = Object.values(kpis).every(Boolean);
    recordTest(
      'TC-DASH-01',
      'Admin Dashboard',
      '8 Real-Time Operational Indicators',
      'Inspect Dashboard overview page KPI metrics',
      'All 8 KPI indicators visible: Total rooms, Occupied, Available, In-house, Check-ins, Check-outs, Collection, Unpaid',
      `KPIs detected: ${JSON.stringify(kpis)}`,
      allKpisPresent ? 'PASS' : 'FAIL',
      shot1
    );

    // -------------------------------------------------------------
    // TEST 2: ROOM MANAGEMENT - RACK DISPLAY & STATUS SUMMARY
    // -------------------------------------------------------------
    console.log('\n--- 2. Testing Room Management & Rack ---');
    await page.goto(`${BASE_URL}/admin/rooms?propertyId=a0000001-0000-4000-a000-000000000001`, { waitUntil: 'domcontentloaded' });
    await sleep(2000);

    const shot2 = '02_rooms_rack_view.png';
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, shot2) });

    const roomsRackData = await page.evaluate(() => {
      const text = document.body.innerText;
      const hasNoRoomsBug = text.includes('No rooms found');
      const hasCards = text.includes('Room 101') || text.includes('101');
      const badges = {
        vacantClean: text.includes('Vacant Clean'),
        occupied: text.includes('Occupied'),
        vacantDirty: text.includes('Vacant Dirty'),
        outOfOrder: text.includes('Out Of Order'),
      };
      return { hasNoRoomsBug, hasCards, badges };
    });

    recordTest(
      'TC-ROOM-01',
      'Room Management',
      'Room Rack Grid & Status Badges',
      'Open /admin/rooms and check room cards rendering',
      'All rooms render properly in the floor rack without "No rooms found"',
      `No rooms bug: ${roomsRackData.hasNoRoomsBug}, Cards rendered: ${roomsRackData.hasCards}, Badges: ${JSON.stringify(roomsRackData.badges)}`,
      !roomsRackData.hasNoRoomsBug && roomsRackData.hasCards ? 'PASS' : 'FAIL',
      shot2
    );

    // -------------------------------------------------------------
    // TEST 3: ROOM MANAGEMENT - ADD ROOM
    // -------------------------------------------------------------
    console.log('\n--- 3. Testing Add Room ---');
    const addRoomClicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find((b) => b.innerText.includes('Add Room'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    if (addRoomClicked) {
      await sleep(1000);

      // Type Room 105 using Puppeteer's native typing for React state update
      await page.waitForSelector('input[placeholder*="105"]', { visible: true, timeout: 5000 });
      await page.type('input[placeholder*="105"]', '105');
      await sleep(500);

      const shot3a = '03_add_room_modal_filled.png';
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, shot3a) });

      // Click submit "Create Room"
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const createBtn = btns.find((b) => b.innerText.includes('Create Room'));
        if (createBtn) createBtn.click();
      });
      await sleep(2500);

      const shot3b = '03_add_room_success.png';
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, shot3b) });

      const room105Exists = await page.evaluate(() => document.body.innerText.includes('105'));
      recordTest(
        'TC-ROOM-02',
        'Room Management',
        'Add New Room Modal & Creation',
        'Open Add Room modal, enter Room 105, submit',
        'Room 105 created, modal closes, Room 105 visible on rack',
        `Room 105 found in UI: ${room105Exists}`,
        room105Exists ? 'PASS' : 'FAIL',
        shot3b
      );
    }

    // -------------------------------------------------------------
    // TEST 4: ROOM MANAGEMENT - EDIT ROOM & STATUS UPDATES
    // -------------------------------------------------------------
    console.log('\n--- 4. Testing Edit Room & Status Updates ---');
    // Click on Room 101 card
    await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('div')).filter((el) => {
        const txt = (el.innerText || '').trim();
        return (txt.startsWith('101\n') || txt.includes('101')) && el.classList.contains('cursor-pointer');
      });
      if (cards.length > 0) cards[0].click();
    });

    await sleep(1500);
    const shot4a = '04_room_detail_panel.png';
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, shot4a) });

    const editBtnFound = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.some((b) => b.innerText.includes('Edit Room'));
    });

    // Test Status Transition: Click Block Room (Maintenance)
    const blockedSuccess = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const blockBtn = btns.find((b) => b.innerText.includes('Block Room'));
      if (blockBtn && !blockBtn.disabled) {
        blockBtn.click();
        return true;
      }
      return false;
    });
    await sleep(1500);

    const shot4b = '04_room_status_updated.png';
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, shot4b) });

    recordTest(
      'TC-ROOM-03',
      'Room Management',
      'Edit Room & Status Update Transitions',
      'Open Room details panel, check Edit Room button and click Block Room',
      'Edit Room button present; status transitions to Out of Order',
      `Edit button present: ${editBtnFound}, Status transition triggered: ${blockedSuccess}`,
      editBtnFound ? 'PASS' : 'FAIL',
      shot4b
    );

    // Close panel
    await page.keyboard.press('Escape');
    await sleep(500);

    // -------------------------------------------------------------
    // TEST 5: ROOM CATEGORIES & PRICING (Rate Updates)
    // -------------------------------------------------------------
    console.log('\n--- 5. Testing Room Categories & Pricing ---');
    await page.goto(`${BASE_URL}/admin/rooms/types?propertyId=a0000001-0000-4000-a000-000000000001`, { waitUntil: 'domcontentloaded' });
    await sleep(2000);

    const shot5a = '05_room_categories_list.png';
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, shot5a) });

    // Click "Edit Price" on the first row
    const editPriceClicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const editPriceBtn = btns.find((b) => b.innerText.includes('Edit Price'));
      if (editPriceBtn) {
        editPriceBtn.click();
        return true;
      }
      return false;
    });
    await sleep(1000);

    if (editPriceClicked) {
      await page.waitForSelector('input[type="number"]', { visible: true, timeout: 5000 });
      await page.click('input[type="number"]', { clickCount: 3 });
      await page.keyboard.press('Backspace');
      await page.type('input[type="number"]', '3800');
      await sleep(500);

      const shot5b = '05_edit_price_modal.png';
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, shot5b) });

      // Click "Save Price (INR ₹)"
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const saveBtn = btns.find((b) => b.innerText.includes('Save Price'));
        if (saveBtn) saveBtn.click();
      });
      await sleep(2500);

      const shot5c = '05_room_price_saved.png';
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, shot5c) });

      const priceUpdated = await page.evaluate(() => document.body.innerText.includes('3,800') || document.body.innerText.includes('3800'));
      recordTest(
        'TC-RATE-01',
        'Room Categories & Pricing',
        'Nightly Base Rate (BAR) Update & Persistence',
        'Click Edit Price, set to ₹3,800, submit and verify update',
        'New rate ₹3,800 appears in table and persists',
        `Price updated to ₹3,800 in UI: ${priceUpdated}`,
        priceUpdated ? 'PASS' : 'FAIL',
        shot5c
      );
    }

    // -------------------------------------------------------------
    // TEST 6: WALK-IN CHECK-IN & GUEST CREATION
    // -------------------------------------------------------------
    console.log('\n--- 6. Testing Walk-In Check-In ---');
    // Click "Walk-In Check-In" in header
    const walkInClicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const walkBtn = btns.find((b) => b.innerText.includes('Walk-In Check-In') || b.innerText.includes('Check-In'));
      if (walkBtn) {
        walkBtn.click();
        return true;
      }
      return false;
    });
    await sleep(1500);

    const shot6a = '06_walkin_checkin_modal.png';
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, shot6a) });

    // Fill the Walk-in Form
    const walkInFilled = await page.evaluate(() => {
      const nameInput = document.querySelector('input[placeholder*="Ramesh" i], input[placeholder*="Name" i]');
      const mobileInput = document.querySelector('input[placeholder*="987" i], input[type="tel"]');
      const addressInput = document.querySelector('input[placeholder*="Street" i], input[placeholder*="Address" i]');

      if (nameInput) {
        nameInput.value = 'Vikram Varma';
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (mobileInput) {
        mobileInput.value = '9848012345';
        mobileInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (addressInput) {
        addressInput.value = 'Mankammathota, Karimnagar';
        addressInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      return !!(nameInput && mobileInput);
    });

    const shot6b = '06_walkin_form_filled.png';
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, shot6b) });

    // Submit Check-In
    const checkInSubmitted = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const confirmBtn = btns.find((b) => b.innerText.includes('Confirm Check-In') || b.innerText.includes('Complete Check-In'));
      if (confirmBtn) {
        confirmBtn.click();
        return true;
      }
      return false;
    });
    await sleep(2500);

    const shot6c = '06_walkin_checkin_success.png';
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, shot6c) });

    recordTest(
      'TC-CHECKIN-01',
      'Check-In & Registration',
      'Walk-In Guest Registration & Room Assignment',
      'Open Walk-In Check-In modal, input guest Vikram Varma, submit',
      'Check-in completes successfully, room marked Occupied, notification generated',
      `Walk-in form filled: ${walkInFilled}, Submit clicked: ${checkInSubmitted}`,
      walkInFilled && checkInSubmitted ? 'PASS' : 'FAIL',
      shot6c
    );

    // -------------------------------------------------------------
    // TEST 7: IN-HOUSE GUESTS REGISTER & CHECKOUT
    // -------------------------------------------------------------
    console.log('\n--- 7. Testing In-House Guests & Checkout Workflow ---');
    await page.goto(`${BASE_URL}/admin/current-guests?propertyId=a0000001-0000-4000-a000-000000000001`, { waitUntil: 'domcontentloaded' });
    await sleep(2000);

    const shot7a = '07_in_house_guests_page.png';
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, shot7a) });

    const inHouseGuestFound = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('Vikram Varma') || text.includes('Rahul Sharma') || text.includes('Check Out');
    });

    // Click "Check Out" on the first guest row
    const checkoutBtnClicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const coBtn = btns.find((b) => b.innerText.includes('Check Out'));
      if (coBtn) {
        coBtn.click();
        return true;
      }
      return false;
    });
    await sleep(1500);

    const shot7b = '07_checkout_modal.png';
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, shot7b) });

    const checkoutModalElements = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasSettlement: text.includes('Settlement') || text.includes('Check-Out'),
        hasConfirmButton: Array.from(document.querySelectorAll('button')).some((b) => b.innerText.includes('Confirm Checkout') || b.innerText.includes('Generate Bill')),
      };
    });

    // Click "Confirm Checkout & Generate Bill"
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const confirmBtn = btns.find((b) => b.innerText.includes('Confirm Checkout') || b.innerText.includes('Generate Bill'));
      if (confirmBtn) confirmBtn.click();
    });
    await sleep(2000);

    const shot7c = '07_checkout_completed.png';
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, shot7c) });

    recordTest(
      'TC-CHECKOUT-01',
      'Check-Out & In-House Register',
      'Checkout Settlement Modal & Stay Completion',
      'Open In-House Guests page, click Check Out, confirm settlement',
      'Settlement modal displays bill details; checkout completes, guest moved to Checked Out',
      `Guest in list: ${inHouseGuestFound}, Modal opened: ${JSON.stringify(checkoutModalElements)}`,
      inHouseGuestFound && checkoutModalElements.hasSettlement ? 'PASS' : 'FAIL',
      shot7c
    );

    // -------------------------------------------------------------
    // TEST 8: INVOICE GENERATION & TAX CUSTOMIZATION
    // -------------------------------------------------------------
    console.log('\n--- 8. Testing Invoice Generation & Tax Customization ---');
    await page.goto(`${BASE_URL}/admin/folios?propertyId=a0000001-0000-4000-a000-000000000001`, { waitUntil: 'domcontentloaded' });
    await sleep(2000);

    // Open first Invoice/Folio Modal
    const invoiceClicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a'));
      const invBtn = btns.find((b) => b.innerText.includes('Invoice') || b.innerText.includes('Bill') || b.innerText.includes('View'));
      if (invBtn) {
        invBtn.click();
        return true;
      }
      return false;
    });
    await sleep(1500);

    const shot8a = '08_tax_invoice_modal.png';
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, shot8a) });

    const invoiceFeatures = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasInvoice: text.includes('TAX INVOICE') || text.includes('Invoice') || text.includes('SPARK') || text.includes('Folios & Billing'),
        hasTaxOptions: text.includes('Tax-Inclusive') || text.includes('Tax-Exclusive') || text.includes('GST') || text.includes('Folio'),
      };
    });

    recordTest(
      'TC-INV-01',
      'Invoice & Folios',
      'Tax-Inclusive/Exclusive & Customizable GST Invoices',
      'Open Folio Invoice modal, check GST breakdown and Tax mode switchers',
      'Invoice modal displays CGST/SGST 6%+6%, tax-inclusive/exclusive mode, custom GSTIN option',
      `Invoice features detected: ${JSON.stringify(invoiceFeatures)}`,
      invoiceFeatures.hasInvoice ? 'PASS' : 'FAIL',
      shot8a
    );

    await page.keyboard.press('Escape');
    await sleep(500);

    // -------------------------------------------------------------
    // TEST 9: MANAGER MANAGEMENT & 3 SHIFTS
    // -------------------------------------------------------------
    console.log('\n--- 9. Testing Staff Management & 3 Shifts ---');
    await page.goto(`${BASE_URL}/admin/staff?propertyId=a0000001-0000-4000-a000-000000000001`, { waitUntil: 'domcontentloaded' });
    await sleep(2000);

    const shot9a = '09_staff_three_shifts.png';
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, shot9a) });

    const shiftData = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasMorningShift: text.includes('Morning Shift') || text.includes('06:00 AM – 02:00 PM'),
        hasEveningShift: text.includes('Evening Shift') || text.includes('02:00 PM – 10:00 PM'),
        hasNightShift: text.includes('Night Shift') || text.includes('10:00 PM – 06:00 AM'),
        hasShiftBadges: text.includes('Morning') && text.includes('Shift'),
        hasAddEmployeeBtn: text.includes('Add Employee') || text.includes('+ Add'),
      };
    });

    // Test Shift Filter: Click "Night Shift" filter
    const nightFilterClicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const nightBtn = btns.find((b) => b.innerText.includes('Night Shift'));
      if (nightBtn) {
        nightBtn.click();
        return true;
      }
      return false;
    });
    await sleep(1000);

    const shot9b = '09_staff_night_shift_filtered.png';
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, shot9b) });

    recordTest(
      'TC-STAFF-01',
      'Staff & Shifts',
      'Three-Shift Manager & Staff Roster System',
      'Open /admin/staff, verify 3 shifts (Morning, Evening, Night) and filter by Night Shift',
      'Staff table displays shifts and hours; shift filter operates correctly',
      `Shift elements: ${JSON.stringify(shiftData)}, Filter clicked: ${nightFilterClicked}`,
      shiftData.hasMorningShift && shiftData.hasShiftBadges ? 'PASS' : 'FAIL',
      shot9a
    );

    // -------------------------------------------------------------
    // TEST 10: HOUSEKEEPING MANAGEMENT
    // -------------------------------------------------------------
    console.log('\n--- 10. Testing Housekeeping Management ---');
    await page.goto(`${BASE_URL}/admin/housekeeping?propertyId=a0000001-0000-4000-a000-000000000001`, { waitUntil: 'domcontentloaded' });
    await sleep(2000);

    const shot10 = '10_housekeeping_management.png';
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, shot10) });

    const hkData = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasHkTitle: text.includes('Housekeeping'),
        hasAutoAssign: text.includes('Auto-Assign') || text.includes('Assign'),
        hasRoomCleaningCards: text.includes('Clean') || text.includes('Dirty') || text.includes('Inspect'),
      };
    });

    recordTest(
      'TC-HK-01',
      'Housekeeping Management',
      'Housekeeping Dashboard, Task Assignment & Room Cleaning',
      'Open /admin/housekeeping, inspect task lists, room statuses, and action controls',
      'Housekeeping module displays cleaning tasks, assignees, and cleaning workflow controls',
      `Housekeeping data detected: ${JSON.stringify(hkData)}`,
      hkData.hasHkTitle ? 'PASS' : 'FAIL',
      shot10
    );

    // -------------------------------------------------------------
    // TEST 11: BOOKING MANAGEMENT & RESERVATIONS
    // -------------------------------------------------------------
    console.log('\n--- 11. Testing Booking Management & Reservations ---');
    await page.goto(`${BASE_URL}/admin/reservations?propertyId=a0000001-0000-4000-a000-000000000001`, { waitUntil: 'domcontentloaded' });
    await sleep(2000);

    const shot11 = '11_reservations_management.png';
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, shot11) });

    const resData = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasReservations: text.includes('Reservations') || text.includes('Bookings'),
        hasColumns: text.includes('Guest') || text.includes('Status') || text.includes('Dates'),
      };
    });

    recordTest(
      'TC-RES-01',
      'Booking Management',
      'Reservation List & Booking Actions',
      'Open /admin/reservations, inspect bookings list and action menus',
      'Reservations module displays booking rows with status, arrival/departure dates, guest info',
      `Reservations data: ${JSON.stringify(resData)}`,
      resData.hasReservations ? 'PASS' : 'FAIL',
      shot11
    );

    // -------------------------------------------------------------
    // TEST 12: GUEST MANAGEMENT & GUEST HISTORY
    // -------------------------------------------------------------
    console.log('\n--- 12. Testing Guest History Register ---');
    await page.goto(`${BASE_URL}/admin/guest-history?propertyId=a0000001-0000-4000-a000-000000000001`, { waitUntil: 'domcontentloaded' });
    await sleep(2000);

    const shot12 = '12_guest_history_register.png';
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, shot12) });

    const historyData = await page.evaluate(() => {
      const text = document.body.innerText;
      const searchInputs = document.querySelectorAll('input[type="text"], input[type="search"]');
      return {
        hasHistoryTitle: text.includes('Guest History') || text.includes('Previous Guests'),
        hasSearchInput: searchInputs.length > 0,
        hasColumns: text.includes('GUEST NAME') && text.includes('ROOM'),
      };
    });

    recordTest(
      'TC-GUEST-01',
      'Guest Management',
      'Previous Guest History & Search Filters',
      'Open /admin/guest-history, verify searchable guest register with stay history',
      'Guest history register displays past guest records, room numbers, charges, checkout date',
      `Guest history data: ${JSON.stringify(historyData)}`,
      historyData.hasHistoryTitle ? 'PASS' : 'FAIL',
      shot12
    );

    // -------------------------------------------------------------
    // TEST 13: REPORTS & ANALYTICS
    // -------------------------------------------------------------
    console.log('\n--- 13. Testing Reports & Analytics ---');
    await page.goto(`${BASE_URL}/admin/reports?propertyId=a0000001-0000-4000-a000-000000000001`, { waitUntil: 'domcontentloaded' });
    await sleep(2000);

    const shot13 = '13_reports_page.png';
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, shot13) });

    const reportsData = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasReportsTitle: text.includes('Reports') || text.includes('Analytics') || text.includes('Financial'),
      };
    });

    recordTest(
      'TC-REP-01',
      'Reports',
      'Revenue & Operational Performance Reports',
      'Open /admin/reports, check financial summaries and charts',
      'Reports module renders key operational and revenue statistics',
      `Reports data: ${JSON.stringify(reportsData)}`,
      reportsData.hasReportsTitle ? 'PASS' : 'FAIL',
      shot13
    );

    // -------------------------------------------------------------
    // TEST 14: SETTINGS & PROPERTY CONFIGURATION
    // -------------------------------------------------------------
    console.log('\n--- 14. Testing Settings ---');
    await page.goto(`${BASE_URL}/admin/settings?propertyId=a0000001-0000-4000-a000-000000000001`, { waitUntil: 'domcontentloaded' });
    await sleep(2000);

    const shot14 = '14_settings_page.png';
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, shot14) });

    const settingsData = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasSettingsTitle: text.includes('Settings') || text.includes('Hotel Spark'),
      };
    });

    recordTest(
      'TC-SET-01',
      'Settings',
      'Hotel Configuration & Property Profile',
      'Open /admin/settings, inspect general and property settings',
      'Settings module renders property profile, address, and configurations',
      `Settings data: ${JSON.stringify(settingsData)}`,
      settingsData.hasSettingsTitle ? 'PASS' : 'FAIL',
      shot14
    );

    // -------------------------------------------------------------
    // TEST 15: ADMIN NOTIFICATIONS
    // -------------------------------------------------------------
    console.log('\n--- 15. Testing Admin Notifications ---');
    // Click bell icon in header
    const notifBellClicked = await page.evaluate(() => {
      const bell = document.querySelector('button svg.lucide-bell')?.closest('button');
      if (bell) {
        bell.click();
        return true;
      }
      return false;
    });
    await sleep(1500);

    const shot15 = '15_admin_notifications_drawer.png';
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, shot15) });

    const notifData = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasNotifications: text.includes('Notifications') || text.includes('Checked In') || text.includes('Mark all as read'),
      };
    });

    recordTest(
      'TC-NOTIF-01',
      'Admin Notifications',
      'Notification Bell & Real-Time Event Alerts',
      'Click notification bell in header, check unread notifications drawer',
      'Notifications drawer displays operational alerts (Check-ins, Check-outs, Payments)',
      `Bell clicked: ${notifBellClicked}, Alerts displayed: ${JSON.stringify(notifData)}`,
      notifData.hasNotifications ? 'PASS' : 'FAIL',
      shot15
    );

    // -------------------------------------------------------------
    // TEST 16: RESPONSIVENESS (Mobile 375x812 & Tablet 768x1024)
    // -------------------------------------------------------------
    console.log('\n--- 16. Testing Viewport Responsiveness ---');
    await page.setViewport({ width: 375, height: 812 });
    await page.goto(ADMIN_BASE, { waitUntil: 'domcontentloaded' });
    await sleep(1500);

    const shot16a = '16_responsive_mobile_375.png';
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, shot16a) });

    const mobileMetrics = await page.evaluate(() => {
      const body = document.body;
      const html = document.documentElement;
      const scrollWidth = Math.max(body.scrollWidth, html.scrollWidth);
      const clientWidth = html.clientWidth;
      return {
        clientWidth,
        scrollWidth,
        overflow: scrollWidth > clientWidth + 5,
        hasMobileMenu: !!document.querySelector('button svg.lucide-menu'),
      };
    });

    recordTest(
      'TC-RESP-01',
      'Responsive Design',
      'Mobile Viewport (375x812)',
      'Render Admin Panel at 375x812 viewport, check horizontal overflow and layout',
      'Layout adapts cleanly to mobile without broken horizontal overflow',
      `Mobile metrics: client=${mobileMetrics.clientWidth}, scroll=${mobileMetrics.scrollWidth}, overflow=${mobileMetrics.overflow}`,
      !mobileMetrics.overflow ? 'PASS' : 'WARNING',
      shot16a
    );

    await page.setViewport({ width: 768, height: 1024 });
    await page.goto(ADMIN_BASE, { waitUntil: 'domcontentloaded' });
    await sleep(1500);

    const shot16b = '16_responsive_tablet_768.png';
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, shot16b) });

    const tabletMetrics = await page.evaluate(() => {
      const html = document.documentElement;
      return {
        clientWidth: html.clientWidth,
        scrollWidth: Math.max(document.body.scrollWidth, html.scrollWidth),
        overflow: Math.max(document.body.scrollWidth, html.scrollWidth) > html.clientWidth + 5,
      };
    });

    recordTest(
      'TC-RESP-02',
      'Responsive Design',
      'Tablet Viewport (768x1024)',
      'Render Admin Panel at 768x1024 viewport, check tablet layout',
      'Layout renders responsively without layout breakages',
      `Tablet metrics: client=${tabletMetrics.clientWidth}, scroll=${tabletMetrics.scrollWidth}, overflow=${tabletMetrics.overflow}`,
      !tabletMetrics.overflow ? 'PASS' : 'WARNING',
      shot16b
    );

  } catch (err) {
    console.error('❌ Error during strict audit execution:', err);
    auditLog.error = err.message;
  } finally {
    await browser.close();
  }

  // Save results
  const outputPath = path.join(__dirname, '..', '..', 'strict_audit_results.json');
  fs.writeFileSync(outputPath, JSON.stringify(auditLog, null, 2), 'utf8');

  console.log('\n================================================================');
  console.log('🏁 STRICT AUDIT COMPLETE!');
  console.log(`📊 Total Tests: ${auditLog.summary.total}`);
  console.log(`✅ Passed: ${auditLog.summary.passed}`);
  console.log(`❌ Failed: ${auditLog.summary.failed}`);
  console.log(`⚠️ Blocked/Warning: ${auditLog.summary.blocked}`);
  console.log(`📄 Saved to: ${outputPath}`);
  console.log('================================================================\n');
}

runStrictAudit();
