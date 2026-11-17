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

  // Test 1: Department Panels page (All in One Screen)
  console.log('Navigating to Department Panels page on live site...');
  await page.goto('https://hotelspark-karimnagar.netlify.app/admin/departments?propertyId=a0000001-0000-4000-a000-000000000001', {
    waitUntil: 'networkidle2',
    timeout: 30000,
  });

  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(screenshotDir, 'live_department_panels_all_in_one.png') });
  console.log('Captured live_department_panels_all_in_one.png');

  // Test 2: Switch to Front Desk Panel tab
  console.log('Clicking Front Desk tab...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.innerText.includes('Front Desk'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(screenshotDir, 'live_dept_front_desk_panel.png') });
  console.log('Captured live_dept_front_desk_panel.png');

  // Test 3: Switch to Housekeeping Panel tab
  console.log('Clicking Housekeeping tab...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.innerText.includes('Housekeeping'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(screenshotDir, 'live_dept_housekeeping_panel.png') });
  console.log('Captured live_dept_housekeeping_panel.png');

  // Test 4: Switch to Manager Shifts tab
  console.log('Clicking Manager Shifts tab...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.innerText.includes('Manager Shifts'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(screenshotDir, 'live_dept_manager_shifts_panel.png') });
  console.log('Captured live_dept_manager_shifts_panel.png');

  // Test 5: Switch to Accounts & Cashier tab
  console.log('Clicking Accounts & Cashier tab...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.innerText.includes('Accounts & Cashier'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(screenshotDir, 'live_dept_accounts_panel.png') });
  console.log('Captured live_dept_accounts_panel.png');

  // Test 6: Verify Header Department Dropdown on Dashboard
  console.log('Navigating to Central Dashboard to test Header Switcher...');
  await page.goto('https://hotelspark-karimnagar.netlify.app/admin/?propertyId=a0000001-0000-4000-a000-000000000001', {
    waitUntil: 'networkidle2',
    timeout: 30000,
  });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(screenshotDir, 'live_dashboard_with_dept_consoles.png') });
  console.log('Captured live_dashboard_with_dept_consoles.png');

  await browser.close();
  console.log('Live browser department verification completed successfully!');
}

verify().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
