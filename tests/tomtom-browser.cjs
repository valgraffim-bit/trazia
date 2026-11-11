const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ locale: 'es-CO', viewport: { width: 390, height: 844 }, isMobile: true, serviceWorkers: 'block' });
    const errors = [];
    const queries = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.hostname === 'unpkg.com' && url.pathname.endsWith('.mjs')) return route.fulfill({ contentType: 'text/javascript', body: 'export class Map { constructor() { throw Error("Map disabled in offline UI test"); } }' });
      if (url.hostname === 'api.tomtom.com') {
        queries.push(url.searchParams.get('query'));
        assert.equal(route.request().headers()['tomtom-api-key'], 'test-browser-key');
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ results: [{ type: 'address', title: 'Carrera 83B 3 # 45-53, Cali', position: { type: 'Point', coordinates: [-76.517773, 3.384056] }, address: { street: 'Carrera 83B 3', houseNumber: '45-53', municipality: 'Cali', countrySubdivision: 'Valle del Cauca', country: 'Colombia', countryCodeIso2: 'CO' } }] }) });
      }
      if (url.hostname !== 'trazia.test') return route.abort();
      if (url.pathname === '/config.js') return route.fulfill({ contentType: 'text/javascript', body: 'window.TRAZIA_CONFIG = { tomtomApiKey: "test-browser-key" };' });
      const filename = path.resolve(__dirname, '..', '.' + (url.pathname === '/' ? '/index.html' : url.pathname));
      if (!fs.existsSync(filename)) return route.fulfill({ status: 404, body: '' });
      return route.fulfill({ body: fs.readFileSync(filename), contentType: ({ '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png' })[path.extname(filename)] || 'application/json' });
    });
    await page.goto('https://trazia.test/');
    await page.locator('#destination-input').fill('Cra. 83b 3 # 45-53, Cali');
    await page.locator('.destination-suggestion').first().waitFor();
    assert.match(await page.locator('.destination-suggestion-main').first().innerText(), /Carrera 83B 3 # 45-53/);
    assert.match(await page.locator('.suggestion-attribution').innerText(), /TomTom/);
    assert.equal(queries[0], 'Cra. 83b 3 # 45-53, Cali');
    await page.locator('.destination-suggestion').first().click();
    assert.match(await page.locator('#destination-input').inputValue(), /83B 3 # 45-53/);
    assert.deepEqual(errors, []);
    console.log('Mobile direct search: TomTom configured once, full numeric suffix preserved, suggestion selectable; provider and map simulated.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
