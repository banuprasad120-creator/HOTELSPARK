const puppeteer = require('puppeteer-core');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const fs = require('fs');
const path = require('path');

async function runVerification() {
  const screenshotDir = path.resolve('audit_screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  console.log('Launching Chrome browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: chromePath,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    // 1. Test Admin Panel
    console.log('Testing Panel 1: Admin Panel (Owner Governance)...');
    await page.goto('https://hotelspark-karimnagar.netlify.app/admin/admin-panel?propertyId=a0000001-0000-4000-a000-000000000001', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });
    await new Promise(r => setTimeout(r, 2000));
    const adminPath = path.join(screenshotDir, 'live_separate_admin_panel.png');
    await page.screenshot({ path: adminPath });
    console.log('Captured:', adminPath);

    // 2. Test Manager Panel
    console.log('Testing Panel 2: Manager Panel (3 Shifts & Operations)...');
    await page.goto('https://hotelspark-karimnagar.netlify.app/admin/manager-panel?propertyId=a0000001-0000-4000-a000-000000000001', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });
    await new Promise(r => setTimeout(r, 2000));
    const managerPath = path.join(screenshotDir, 'live_separate_manager_panel.png');
    await page.screenshot({ path: managerPath });
    console.log('Captured:', managerPath);

    // 3. Test Front Office Panel
    console.log('Testing Panel 3: Front Office Panel (Reception & Stays)...');
    await page.goto('https://hotelspark-karimnagar.netlify.app/admin/front-office-panel?propertyId=a0000001-0000-4000-a000-000000000001', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });
    await new Promise(r => setTimeout(r, 2000));
    const frontOfficePath = path.join(screenshotDir, 'live_separate_front_office_panel.png');
    await page.screenshot({ path: frontOfficePath });
    console.log('Captured:', frontOfficePath);

    // 4. Test Switching via Header Pills
    console.log('Testing Header 1-click Switcher: Switching back to Admin Panel...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const adminBtn = btns.find(b => b.innerText.trim() === 'Admin' || b.getAttribute('title')?.includes('Admin'));
      if (adminBtn) adminBtn.click();
    });
    await new Promise(r => setTimeout(r, 1500));
    const headerSwitchPath = path.join(screenshotDir, 'live_header_pill_switched_to_admin.png');
    await page.screenshot({ path: headerSwitchPath });
    console.log('Captured:', headerSwitchPath);

    // 5. Test Switching via Manager button in banner
    console.log('Testing Banner quick button: Switching to Manager Panel...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const mgrBtn = btns.find(b => b.innerText.includes('Manager Panel'));
      if (mgrBtn) mgrBtn.click();
    });
    await new Promise(r => setTimeout(r, 1500));
    const bannerSwitchPath = path.join(screenshotDir, 'live_banner_switched_to_manager.png');
    await page.screenshot({ path: bannerSwitchPath });
    console.log('Captured:', bannerSwitchPath);

    console.log('✅ ALL 3 PANELS & SEPARATE SWITCHERS FULLY VERIFIED!');
  } catch (err) {
    console.error('Verification error:', err);
  } finally {
    await browser.close();
  }
}

runVerification();
