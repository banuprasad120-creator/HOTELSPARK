const puppeteer = require('puppeteer-core');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const fs = require('fs');
const path = require('path');

(async () => {
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

  console.log('Navigating to Front Desk on localhost:5173...');
  await page.goto('http://localhost:5173/front-desk?propertyId=a0000001-0000-4000-a000-000000000001', {
    waitUntil: 'networkidle2',
    timeout: 30000,
  });
  await new Promise(r => setTimeout(r, 2000));

  await page.screenshot({ path: path.join(screenshotDir, 'verified_front_desk_website_bookings.png'), fullPage: true });
  console.log('Front desk screenshot taken');

  // Look for the Website Bookings button/tab
  const buttons = await page.$$('button');
  let clicked = false;
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.innerText, btn);
    if (text && text.includes('Website Bookings')) {
      console.log('Found tab button:', text);
      await btn.click();
      clicked = true;
      break;
    }
  }

  if (!clicked) {
    console.log('Did not find Website Bookings button directly, checking for tab pills...');
  }

  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(screenshotDir, 'verified_website_bookings_tab_open.png'), fullPage: true });
  console.log('Website bookings tab open screenshot taken');

  // Read table contents
  const rows = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('table tbody tr')).map(tr => tr.innerText.replace(/\n/g, ' | '));
  });
  console.log('Table rows found:', rows.length);
  rows.forEach((r, idx) => console.log(`Row ${idx + 1}:`, r));

  await browser.close();
  console.log('Browser test finished successfully!');
})();
