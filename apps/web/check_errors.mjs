import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  
  console.log('Navigating to local preview server...');
  await page.goto('http://localhost:4173', { waitUntil: 'networkidle2' });
  
  console.log('Page loaded. Capturing content...');
  const body = await page.content();
  if (body.includes('<div id="root"></div>') && body.length < 1000) {
      console.log('PAGE IS BLANK');
  }
  
  await browser.close();
})();
