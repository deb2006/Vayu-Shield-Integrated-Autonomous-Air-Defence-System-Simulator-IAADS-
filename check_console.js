const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    page.on('console', msg => {
        console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
    });

    page.on('pageerror', err => {
        console.error(`[BROWSER PAGE ERROR]: ${err.toString()}`);
    });

    console.log('Navigating to http://localhost:4200...');
    await page.goto('http://localhost:4200', { waitUntil: 'networkidle2' });
    console.log('Finished navigating and waiting.');

    await browser.close();
})();
