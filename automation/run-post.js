/* สคริปต์สั่งให้ headless browser เปิดหน้า duang-studio.html ในโหมด automation
   (?auto=lucky หรือ ?auto=money) แล้วรอจนกว่าหน้าเว็บจะวาดภาพ+ส่งเข้า Make.com webhook เสร็จ
   ใช้รันผ่าน GitHub Actions ตามตารางเวลา (ดู .github/workflows/) */
const puppeteer = require('puppeteer');

async function main() {
  const mode = process.argv[2]; // 'lucky' หรือ 'money'
  if (mode !== 'lucky' && mode !== 'money') {
    console.error('ใช้งาน: node run-post.js <lucky|money>');
    process.exit(1);
  }

  const siteUrl = process.env.SITE_URL; // เช่น https://username.github.io/repo/duang-studio.html
  const webhook = process.env[mode === 'lucky' ? 'MAKE_WEBHOOK_LUCKY' : 'MAKE_WEBHOOK_MONEY'];
  if (!siteUrl || !webhook) {
    console.error('ตั้งค่า SITE_URL และ MAKE_WEBHOOK_LUCKY/MAKE_WEBHOOK_MONEY ใน environment variable ก่อน');
    process.exit(1);
  }

  const url = siteUrl + '?auto=' + mode + '&webhook=' + encodeURIComponent(webhook);
  console.log('เปิด:', url);

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.on('console', (msg) => console.log('[page]', msg.text()));
  page.on('pageerror', (err) => console.log('[page error]', err.message));

  try {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
    await page.waitForFunction(
      () => document.title === 'AUTO_DONE' || document.title === 'AUTO_ERROR',
      { timeout: 60000 }
    );
    const title = await page.title();
    const statusText = await page.evaluate(() => {
      const el = document.getElementById('autoStatus');
      return el ? el.textContent : '';
    });
    await browser.close();

    if (title === 'AUTO_ERROR') {
      console.error('Automation ล้มเหลว:', statusText);
      process.exit(1);
    }
    console.log('Automation สำเร็จ:', statusText || 'done');
  } catch (e) {
    console.error('เกิดข้อผิดพลาด:', e.message);
    await browser.close();
    process.exit(1);
  }
}

main();
