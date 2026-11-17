const puppeteer = require('puppeteer-core');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: chromePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 950 });
  
  await page.goto('https://hotelspark-karimnagar.netlify.app/admin/guests?propertyId=a0000001-0000-4000-a000-000000000001', { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1500));
  
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.innerText.includes('New Guest') || b.innerText.includes('Add Guest'));
    if (btn) btn.click();
  });
  
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: 'audit_screenshots/live_aadhar_upload_verified.png' });
  
  const modalInfo = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      hasAadhaarDropdown: text.includes('Aadhaar Card (UIDAI)'),
      hasAadhaarUpload: text.includes('Aadhaar Card Upload (Front & Back)'),
      hasUploadFront: text.includes('Upload Front Side'),
      hasUploadBack: text.includes('Upload Back Side'),
      hasPlaceholder: Boolean(document.querySelector('input[placeholder*="1234 5678 9012"]'))
    };
  });
  console.log('AADHAAR MODAL TEST RESULT:', JSON.stringify(modalInfo, null, 2));
  await browser.close();
})();
