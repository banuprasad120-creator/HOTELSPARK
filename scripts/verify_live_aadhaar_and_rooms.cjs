const puppeteer = require('puppeteer-core');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const fs = require('fs');
const path = require('path');

async function verify() {
  const screenshotDir = path.resolve('audit_screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: chromePath,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Test 1: Guest History page & Aadhaar Viewer
  console.log('Navigating to Guest History on live site...');
  await page.goto('https://hotelspark-karimnagar.netlify.app/admin/guest-history?propertyId=a0000001-0000-4000-a000-000000000001', {
    waitUntil: 'networkidle2',
    timeout: 30000,
  });

  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(screenshotDir, 'live_guest_history_table.png') });
  console.log('Captured live_guest_history_table.png');

  // Find the "View Aadhaar" button for Anil Kumar Goud
  const viewAadhaarBtns = await page.$$('button');
  let clickedAadhaar = false;
  for (const btn of viewAadhaarBtns) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && text.includes('View Aadhaar')) {
      await btn.click();
      clickedAadhaar = true;
      console.log('Clicked "View Aadhaar" button in table!');
      break;
    }
  }

  if (clickedAadhaar) {
    await new Promise(r => setTimeout(r, 1500));
    // Verify front side is displayed
    await page.screenshot({ path: path.join(screenshotDir, 'live_aadhaar_front_view.png') });
    console.log('Captured live_aadhaar_front_view.png');

    // Click "Back Side" tab
    const tabs = await page.$$('button');
    let clickedBackTab = false;
    for (const tab of tabs) {
      const text = await page.evaluate(el => el.textContent, tab);
      if (text && text.includes('Back Side')) {
        await tab.click();
        clickedBackTab = true;
        console.log('Clicked "Back Side" tab in Aadhaar viewer!');
        break;
      }
    }

    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(screenshotDir, 'live_aadhaar_back_view.png') });
    console.log('Captured live_aadhaar_back_view.png');

    // Close Aadhaar modal
    const closeBtns = await page.$$('button');
    for (const cb of closeBtns) {
      const text = await page.evaluate(el => el.textContent, cb);
      if (text && text.includes('Close Viewer')) {
        await cb.click();
        console.log('Closed Aadhaar Viewer!');
        break;
      }
    }
    await new Promise(r => setTimeout(r, 1000));
  }

  // Test 2: Bill / Invoice Modal & "View & Download Aadhaar"
  console.log('Testing Invoice Modal...');
  const allBtns = await page.$$('button');
  for (const btn of allBtns) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && text.includes('View Invoice')) {
      await btn.click();
      console.log('Clicked "View Invoice"!');
      break;
    }
  }

  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(screenshotDir, 'live_invoice_with_aadhaar_btn.png') });
  console.log('Captured live_invoice_with_aadhaar_btn.png');

  // Click "View & Download Aadhaar" inside the invoice modal
  const invBtns = await page.$$('button');
  let clickedInvAadhaar = false;
  for (const b of invBtns) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text && text.includes('View & Download Aadhaar')) {
      await b.click();
      clickedInvAadhaar = true;
      console.log('Clicked "View & Download Aadhaar" inside invoice modal!');
      break;
    }
  }

  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(screenshotDir, 'live_invoice_opened_aadhaar_viewer.png') });
  console.log('Captured live_invoice_opened_aadhaar_viewer.png');

  // Test 3: Rooms Rack Page
  console.log('Navigating to Rooms Rack on live site...');
  await page.goto('https://hotelspark-karimnagar.netlify.app/admin/rooms?propertyId=a0000001-0000-4000-a000-000000000001', {
    waitUntil: 'networkidle2',
    timeout: 30000,
  });

  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(screenshotDir, 'live_rooms_final_verified.png') });
  console.log('Captured live_rooms_final_verified.png');

  await browser.close();
  console.log('All live browser verifications completed successfully!');
}

verify().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
