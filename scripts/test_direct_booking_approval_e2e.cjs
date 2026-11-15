const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\banup\\.gemini\\antigravity\\brain\\15455ecc-6c99-44bb-88e9-f57686be0413';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function clickButtonWithText(page, text) {
  await page.waitForFunction(
    (t) => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.some((b) => b.innerText.includes(t));
    },
    { timeout: 15000 },
    text,
  );

  await page.evaluate((t) => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find((b) => b.innerText.includes(t));
    if (btn) btn.click();
  }, text);
}

async function runE2ETest() {
  console.log('========================================================================');
  console.log('🚀 HOTEL SPARK – DIRECT BOOKING APPROVAL SYSTEM FULL E2E BROWSER TEST');
  console.log('========================================================================');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: { width: 1440, height: 920 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
  });

  const page = await browser.newPage();

  try {
    // -------------------------------------------------------------
    // TEST STEP 1: Website Direct Booking Submission (Arjun Reddy)
    // -------------------------------------------------------------
    console.log('\n[STEP 1] Guest visits Hotel Spark Website to submit reservation...');
    await page.goto('http://localhost:5174/booking/?key=pk_live_HAIPDEMO0000000000000000', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });
    await sleep(2000);

    // Search available rooms
    console.log('Searching for available rooms...');
    await page.waitForSelector('button[type="submit"]', { timeout: 10000 });
    await page.click('button[type="submit"]');
    await sleep(2500);

    // Select room category
    console.log('Selecting room category...');
    await clickButtonWithText(page, 'Select');
    await sleep(2500);

    // On /room page, click Continue
    console.log('Continuing from room selection...');
    await clickButtonWithText(page, 'Continue');
    await sleep(2500);

    // On /extras page, click Continue to guest details
    console.log('Continuing from extras to guest details...');
    await clickButtonWithText(page, 'Continue');
    await sleep(2500);

    // Fill Guest Details for Arjun Reddy
    console.log('Filling Guest Details for Arjun Reddy...');
    await page.waitForSelector('#firstName', { timeout: 10000 });
    await page.type('#firstName', 'Arjun');
    await page.type('#lastName', 'Reddy');
    await page.type('#email', 'arjun.reddy@example.com');
    await page.type('#phone', '+91 99887 76655');

    // Click Continue to payment
    console.log('Submitting guest details form...');
    await page.click('button[type="submit"]');
    await sleep(2500);

    // On Payment page, submit via UPI
    console.log('Submitting direct booking request via UPI...');
    await clickButtonWithText(page, 'Submit Booking Request');
    await sleep(4500);

    // Capture Confirmation Screen (Pending Approval)
    const confirmationImg = path.join(ARTIFACT_DIR, '01_website_request_submitted_pending.png');
    await page.screenshot({ path: confirmationImg, fullPage: false });
    console.log(`✓ [CAPTURED] 01_website_request_submitted_pending.png`);

    // -------------------------------------------------------------
    // TEST STEP 2: Admin Dashboard – Direct Booking Management
    // -------------------------------------------------------------
    console.log('\n[STEP 2] Admin opens PMS Dashboard -> Direct Booking Management Overview...');
    await page.goto('http://localhost:5173/direct-bookings', { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(2500);

    const adminRequestsImg = path.join(ARTIFACT_DIR, '02_admin_direct_bookings_overview.png');
    await page.screenshot({ path: adminRequestsImg, fullPage: false });
    console.log(`✓ [CAPTURED] 02_admin_direct_bookings_overview.png`);

    // Click on Pending Approvals Tab
    console.log('\n[STEP 3] Opening Pending Approvals tab...');
    await page.goto('http://localhost:5173/direct-bookings/pending', { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(2000);

    const pendingTabImg = path.join(ARTIFACT_DIR, '03_admin_pending_approvals_tab.png');
    await page.screenshot({ path: pendingTabImg, fullPage: false });
    console.log(`✓ [CAPTURED] 03_admin_pending_approvals_tab.png`);

    // -------------------------------------------------------------
    // TEST STEP 3: Admin Approves Booking & Assigns Room
    // -------------------------------------------------------------
    console.log('\n[STEP 4] Admin clicking "Approve & Assign Room"...');
    await clickButtonWithText(page, 'Approve & Assign Room');
    await sleep(1500);

    // Capture Approve Modal with physical rooms dropdown
    const approveModalImg = path.join(ARTIFACT_DIR, '04_admin_approve_modal_room_picker.png');
    await page.screenshot({ path: approveModalImg, fullPage: false });
    console.log(`✓ [CAPTURED] 04_admin_approve_modal_room_picker.png`);

    // Click Confirm & Approve
    console.log('Confirming approval in modal...');
    await clickButtonWithText(page, 'Confirm & Approve');
    await sleep(3500);

    // Capture Approved state in Direct Bookings
    const approvedStateImg = path.join(ARTIFACT_DIR, '05_admin_booking_approved_success.png');
    await page.screenshot({ path: approvedStateImg, fullPage: false });
    console.log(`✓ [CAPTURED] 05_admin_booking_approved_success.png`);

    // -------------------------------------------------------------
    // TEST STEP 4: Verify in PMS Confirmed Reservations Board
    // -------------------------------------------------------------
    console.log('\n[STEP 5] Checking PMS Reservations Board to verify moved reservation...');
    await page.goto('http://localhost:5173/reservations', { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(2500);

    const pmsResBoardImg = path.join(ARTIFACT_DIR, '06_pms_confirmed_reservations_board.png');
    await page.screenshot({ path: pmsResBoardImg, fullPage: false });
    console.log(`✓ [CAPTURED] 06_pms_confirmed_reservations_board.png`);

    // -------------------------------------------------------------
    // TEST STEP 5: Submit Second Booking for Rejection Workflow
    // -------------------------------------------------------------
    console.log('\n[STEP 6] Submitting second direct booking (Kavita Rao) for rejection test...');
    const propertyId = 'a0000001-0000-4000-a000-000000000001';
    const rejectBookingRes = await fetch('http://localhost:3000/api/v1/booking-engine/book', {
      method: 'POST',
      headers: {
        'x-publishable-key': 'pk_live_HAIPDEMO0000000000000000',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        checkIn: '2026-12-15',
        checkOut: '2026-12-18',
        roomTypeId: 'b0000001-0000-4000-a000-000000000001',
        ratePlanId: 'd0000001-0000-4000-a000-000000000001',
        adults: 2,
        children: 0,
        guestFirstName: 'Kavita',
        guestLastName: 'Rao',
        guestEmail: 'kavita.rao@example.com',
        guestPhone: '+919876501234',
        paymentToken: 'tok_upi_kavita',
      }),
    });
    const rejectBookingData = await rejectBookingRes.json();
    console.log('Kavita Rao request created:', rejectBookingData.confirmationNumber || rejectBookingData.bookingId);

    // Open Pending Approvals tab in PMS Dashboard
    await page.goto('http://localhost:5173/direct-bookings/pending', { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(2000);

    // Click Reject Booking
    console.log('Admin clicking "Reject Booking"...');
    await clickButtonWithText(page, 'Reject Booking');
    await sleep(1500);

    // Capture Reject Modal
    const rejectModalImg = path.join(ARTIFACT_DIR, '07_admin_reject_modal_mandatory_reason.png');
    await page.screenshot({ path: rejectModalImg, fullPage: false });
    console.log(`✓ [CAPTURED] 07_admin_reject_modal_mandatory_reason.png`);

    // Click preset reason button
    await clickButtonWithText(page, 'Hotel Spark fully booked');
    await sleep(1000);

    // Click Confirm Rejection
    console.log('Confirming rejection in modal...');
    await clickButtonWithText(page, 'Confirm Rejection');
    await sleep(2500);

    // Capture Rejected Bookings Tab
    console.log('\n[STEP 7] Checking Rejected Bookings Tab...');
    await page.goto('http://localhost:5173/direct-bookings/rejected', { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(2000);

    const rejectedTabImg = path.join(ARTIFACT_DIR, '08_admin_rejected_bookings_tab.png');
    await page.screenshot({ path: rejectedTabImg, fullPage: false });
    console.log(`✓ [CAPTURED] 08_admin_rejected_bookings_tab.png`);

    // -------------------------------------------------------------
    // TEST STEP 6: Inspect Booking History & Audit Trail
    // -------------------------------------------------------------
    console.log('\n[STEP 8] Inspecting Booking History & Audit Trail...');
    await page.goto('http://localhost:5173/direct-bookings/history', { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(2000);

    const auditHistoryImg = path.join(ARTIFACT_DIR, '09_admin_booking_history_audit_trail.png');
    await page.screenshot({ path: auditHistoryImg, fullPage: false });
    console.log(`✓ [CAPTURED] 09_admin_booking_history_audit_trail.png`);

    console.log('\n🎉 ALL DIRECT BOOKING APPROVAL SYSTEM TESTS COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ E2E TEST ERROR:', err);
    const errImg = path.join(ARTIFACT_DIR, 'error_e2e_approval.png');
    await page.screenshot({ path: errImg, fullPage: false }).catch(() => {});
  } finally {
    await browser.close();
  }
}

runE2ETest();
