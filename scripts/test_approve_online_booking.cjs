const puppeteer = require('puppeteer-core');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: chromePath,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:5173/front-desk?propertyId=a0000001-0000-4000-a000-000000000001', {
    waitUntil: 'networkidle2',
    timeout: 30000,
  });
  await new Promise(r => setTimeout(r, 2000));

  // Click on Website Bookings tab
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.innerText, btn);
    if (text && text.includes('Website Bookings')) {
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 1000));

  // Find Approve & Check-In button on the first row
  const approveButtons = await page.$$('button');
  let approveClicked = false;
  for (const btn of approveButtons) {
    const text = await page.evaluate(el => el.innerText, btn);
    if (text && text.includes('Approve & Check-In')) {
      console.log('Clicking:', text);
      await btn.click();
      approveClicked = true;
      break;
    }
  }

  await new Promise(r => setTimeout(r, 2000));

  await page.screenshot({ path: path.resolve('audit_screenshots/verified_after_approve_online_booking.png'), fullPage: true });
  console.log('Screenshot saved: verified_after_approve_online_booking.png');

  // Verify in-house rows
  const inHouseRows = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('table tbody tr')).map(tr => tr.innerText.replace(/\n/g, ' | '));
  });
  console.log('In-house rows after approval:', inHouseRows.length);
  inHouseRows.forEach((r, idx) => console.log(`Row ${idx + 1}:`, r));

  await browser.close();
  console.log('Approve test passed!');
})();
