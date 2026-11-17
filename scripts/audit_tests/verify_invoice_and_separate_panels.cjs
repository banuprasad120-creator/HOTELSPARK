const puppeteer = require('puppeteer-core');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = path.resolve('C:/Users/banup/.gemini/antigravity/brain/15455ecc-6c99-44bb-88e9-f57686be0413');
const BASE_URL = 'http://localhost:5173';
const PROPERTY_ID = 'a0000001-0000-4000-a000-000000000001';

async function run() {
  console.log('🚀 Starting Puppeteer verification for Invoice Modal & Separate Panels...');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: chromePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // 1. Check Guest History and Invoice Modal
  console.log('\n--- Test 1: Guest History & Invoice Modal Visibility ---');
  await page.goto(`${BASE_URL}/guest-history?propertyId=${PROPERTY_ID}`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('table', { timeout: 10000 });

  // Find and click "View Invoice" button
  const invoiceButtons = await page.$$('button');
  let viewInvoiceBtn = null;
  for (const btn of invoiceButtons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && text.includes('View Invoice')) {
      viewInvoiceBtn = btn;
      break;
    }
  }

  if (viewInvoiceBtn) {
    console.log('Clicking View Invoice button...');
    await viewInvoiceBtn.click();
    await new Promise(r => setTimeout(r, 1000));

    // Verify modal header is visible in viewport
    const headerVisible = await page.evaluate(() => {
      const el = document.querySelector('.sticky.top-0');
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      return rect.top >= 0 && rect.bottom <= window.innerHeight;
    });
    console.log(`Modal header visible in viewport: ${headerVisible ? '✅ YES' : '❌ NO'}`);

    // Verify tariff and masked aadhaar
    const modalText = await page.evaluate(() => document.body.innerText);
    const hasOfficialTariff = modalText.includes('2,099');
    const hasOldTariff = modalText.includes('3,500');
    const hasMaskedAadhaar = modalText.includes('XXXX XXXX 8899');

    console.log(`Contains official Deluxe tariff (₹2,099): ${hasOfficialTariff ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Contains old tariff (₹3,500): ${hasOldTariff ? '❌ FOUND' : '✅ NOT FOUND'}`);
    console.log(`Aadhaar is masked (XXXX XXXX 8899): ${hasMaskedAadhaar ? '✅ PASS' : '❌ FAIL'}`);

    // Capture screenshot of the modal
    const invoiceScreenshotPath = path.join(ARTIFACT_DIR, 'verified_invoice_modal_fixed.png');
    await page.screenshot({ path: invoiceScreenshotPath, fullPage: false });
    console.log(`📸 Saved screenshot to: ${invoiceScreenshotPath}`);

    // Test Close button at the bottom
    const closeButtons = await page.$$('button');
    let closeBtn = null;
    for (const btn of closeButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('Close Invoice')) {
        closeBtn = btn;
        break;
      }
    }
    if (closeBtn) {
      await closeBtn.click();
      await new Promise(r => setTimeout(r, 500));
      console.log('✅ Close Invoice button clicked successfully.');
    }
  }

  // 2. Check Department Panels and Direct Switcher Buttons
  console.log('\n--- Test 2: Department Operational Panels & Direct Switcher ---');
  await page.goto(`${BASE_URL}/departments?propertyId=${PROPERTY_ID}`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  const deptScreenshotPath = path.join(ARTIFACT_DIR, 'verified_department_panels_with_direct_buttons.png');
  await page.screenshot({ path: deptScreenshotPath, fullPage: false });
  console.log(`📸 Saved screenshot to: ${deptScreenshotPath}`);

  // Test navigation to Admin Panel
  console.log('Testing click on "🛡️ Admin Panel" button...');
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && text.includes('Admin Panel')) {
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 1000));
  const currentUrlAdmin = page.url();
  console.log(`Navigated to: ${currentUrlAdmin} (${currentUrlAdmin.includes('admin-panel') ? '✅ PASS' : '❌ FAIL'})`);

  const adminScreenshotPath = path.join(ARTIFACT_DIR, 'verified_dedicated_admin_panel.png');
  await page.screenshot({ path: adminScreenshotPath, fullPage: false });
  console.log(`📸 Saved screenshot to: ${adminScreenshotPath}`);

  // Test navigation to Manager Panel
  console.log('Testing navigation to Manager Panel...');
  await page.goto(`${BASE_URL}/manager-panel?propertyId=${PROPERTY_ID}`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));
  const managerScreenshotPath = path.join(ARTIFACT_DIR, 'verified_dedicated_manager_panel.png');
  await page.screenshot({ path: managerScreenshotPath, fullPage: false });
  console.log(`📸 Saved screenshot to: ${managerScreenshotPath}`);

  // Test navigation to Front Office Panel
  console.log('Testing navigation to Front Office Panel...');
  await page.goto(`${BASE_URL}/front-office-panel?propertyId=${PROPERTY_ID}`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));
  const frontOfficeScreenshotPath = path.join(ARTIFACT_DIR, 'verified_dedicated_front_office_panel.png');
  await page.screenshot({ path: frontOfficeScreenshotPath, fullPage: false });
  console.log(`📸 Saved screenshot to: ${frontOfficeScreenshotPath}`);

  await browser.close();
  console.log('\n🎉 Verification finished successfully!');
}

run().catch(err => {
  console.error('Error during verification:', err);
  process.exit(1);
});
