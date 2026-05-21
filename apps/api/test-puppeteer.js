const puppeteer = require('puppeteer');

(async () => {
  try {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    console.log('Browser launched successfully');
    const page = await browser.newPage();
    console.log('Page created');
    await page.setContent('<h1>Test</h1>', { waitUntil: 'load' });
    console.log('Content set');
    const pdf = await page.pdf({ format: 'A4' });
    console.log('PDF generated, size:', pdf.length);
    await browser.close();
    console.log('Browser closed');
  } catch (err) {
    console.error('Puppeteer Error:', err);
  }
})();
