const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  try {
    const context = await browser.newContext({ locale: 'es-CO', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    await context.addInitScript(() => localStorage.setItem('trazia:recent-destinations', JSON.stringify(['Historial de prueba'])));
    const page = await context.newPage();
    const errors = [];
    const routeRequests = [];
    const geocodingRequests = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.hostname === 'unpkg.com' && url.pathname.endsWith('.mjs')) return route.fulfill({ contentType: 'text/javascript', body: 'export class Map { constructor() { throw Error("Map disabled in offline UI test"); } }' });
      if (url.hostname.includes('valhalla')) {
        if (route.request().method() !== 'OPTIONS') routeRequests.push(route.request().method() === 'POST' ? route.request().postDataJSON() : JSON.parse(url.searchParams.get('json')));
        return route.fulfill({ status: 400, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }, body: '{"error":"Simulated routing response"}' });
      }
      if (/photon|geocode|nominatim/.test(url.hostname)) geocodingRequests.push(url.toString());
      if (url.hostname !== 'trazia.test') return route.abort();
      if (url.pathname === '/auth.mjs') return route.fulfill({contentType:'text/javascript',body:`export function setupAccountScreen({document}){document.querySelector('#account-screen').hidden=true;const shell=document.querySelector('.app-shell');shell.inert=false;shell.removeAttribute('aria-hidden');}`});
      const filename = path.resolve(__dirname, '..', '.' + (url.pathname === '/' ? '/index.html' : url.pathname));
      if (!fs.existsSync(filename)) return route.fulfill({ status: 404, body: 'Not found' });
      let body = fs.readFileSync(filename);
      if (url.pathname === '/app.js') body = Buffer.from(body.toString().replace('  initialize();', '  globalThis.__traziaState = state;\n  initialize();'));
      const ext = path.extname(filename);
      await route.fulfill({ body, contentType: ({ '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png' })[ext] || 'application/json' });
    });
    await page.goto('https://trazia.test/');
    await page.locator('#app-splash').waitFor({state:'hidden'});
    assert.equal(await page.locator('#toggle-panel svg').count(), 1);
    await page.locator('#toggle-panel').click();
    assert.equal(await page.locator('#toggle-panel').getAttribute('aria-expanded'), 'true');
    await page.locator('#toggle-panel').click();
    assert.equal(await page.locator('#toggle-panel').getAttribute('aria-expanded'), 'false');
    assert.equal(await page.locator('#open-waze-import').count(), 0);
    assert.equal(await page.locator('#waze-import-dialog').count(), 0);
    assert.equal(await page.locator('#recent-destinations').evaluate(el => el.open), false);
    assert.equal(await page.locator('#recent-list').isVisible(), false);
    await page.locator('#recent-destinations summary').click();
    assert.equal(await page.locator('#recent-list').isVisible(), true);
    await page.locator('#recent-destinations summary').click();
    assert.equal(await page.evaluate(() => localStorage.getItem('trazia:recent-destinations')), '["Historial de prueba"]');
    assert.equal(await page.locator('.destination-route-section #destination-input').count(), 1);
    assert.equal(await page.locator('#start-navigation').count(), 0);
    assert.equal(await page.locator('.route-card').count(), 0);
    assert.equal(await page.locator('#route-title').evaluate(el => el.getBoundingClientRect().width), 1);
    await page.locator('#destination-input').fill('https://waze.com/ul?q=Cra+83B');
    await page.locator('#destination-suggestions').waitFor();
    assert.match(await page.locator('#destination-suggestions').innerText(), /no contiene un punto importable/);
    await page.locator('#destination-input').fill('https://waze.com/ul?ll=4.6,-74.1');
    await page.waitForFunction(() => window.__traziaState.selectedDestination?.location.lat === 4.6);
    assert.deepEqual(await page.evaluate(() => window.__traziaState.selectedDestination.location), { lat: 4.6, lng: -74.1 });
    await page.evaluate(() => { window.__traziaState.mapReady = true; window.__traziaState.currentPosition = { lat: 3.45, lng: -76.53 }; window.__traziaState.lastLocationTimestamp = Date.now(); });
    await page.locator('#search-route').click();
    await page.waitForFunction(() => !document.querySelector('#search-route').disabled);
    assert.ok(routeRequests.length > 0);
    assert.equal(routeRequests[0].locations[1].lat, 4.6);
    assert.equal(routeRequests[0].locations[1].lon, -74.1);
    assert.deepEqual(geocodingRequests, []);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: '/tmp/trazia-waze-mobile.png' });
    console.log('Mobile UI: removed import button, direct-paste validation and routing destination passed; no uncaught errors. Map and external services mocked.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
