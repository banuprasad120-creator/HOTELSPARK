const puppeteer = require('puppeteer-core');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function debugBooking() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
  });
  const page = await browser.newPage();

  await page.goto('http://localhost:5174/booking/?key=pk_live_HAIPDEMO0000000000000000');
  console.log('1. Home loaded');

  await page.waitForSelector('button[type="submit"]');
  await page.click('button[type="submit"]');
  await sleep(2500);

  // Click Select
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(x => x.innerText.trim() === 'Select');
    if (b) b.click();
  });
  await sleep(2500);

  // Click Continue on Room
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(x => x.innerText.trim() === 'Continue');
    if (b) b.click();
  });
  await sleep(2500);

  // Click Continue on Extras
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(x => x.innerText.includes('Continue'));
    if (b) b.click();
  });
  await sleep(2500);

  // Print inputs on the page
  const inputs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input')).map(i => ({ id: i.id, name: i.name }));
  });
  console.log('Inputs found on page:', inputs);

  // Type guest details
  await page.waitForSelector('#firstName', { timeout: 5000 });
  await page.type('#firstName', 'Arjun');
  await page.type('#lastName', 'Reddy');
  await page.type('#email', 'arjun.reddy@example.com');
  await page.type('#phone', '+91 99887 76655');

  // Submit guest details
  await page.click('button[type="submit"]');
  await sleep(2500);

  const paymentButtons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim());
  });
  console.log('Buttons on payment page:', paymentButtons);

  await browser.close();
  console.log('DEBUG COMPLETED SUCCESSFULLY!');
}

debugBooking().catch(console.error);
