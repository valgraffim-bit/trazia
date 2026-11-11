const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '').replace(/<link\b[^>]*>/g, '');
const code = fs.readFileSync(path.join(root, 'auth.mjs'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const start = app.indexOf('  function runSplashScreen(');
const splash = app.slice(start, app.indexOf('\n  }', start) + 4);
(async () => {
  const browser = await chromium.launch({executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox']});
  try {
    const page = await browser.newPage({viewport: {width: 390, height: 844}});
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.pathname.includes('/assets/')) return route.fulfill({body: fs.readFileSync(path.join(root, url.pathname)), contentType: 'image/png'});
      return route.abort();
    });
    async function setup({missing = false, restore = false} = {}) {
      await page.setContent(html.replace('<head>', '<head><base href="https://trazia.test/">'));
      await page.addStyleTag({content: fs.readFileSync(path.join(root, 'styles.css'), 'utf8')});
      await page.evaluate(async ({code, splash, missing, restore}) => {
        const module = await import(URL.createObjectURL(new Blob([code], {type: 'text/javascript'})));
        window.stats = {register: 0, login: 0, google: 0, reset: 0, enter: 0, leave: 0, savedName: ''};
        window.accountModule = module;
        let notify;
        const service = {
          subscribe(callback) {notify = callback; callback(restore ? {email: 'saved@example.com', displayName: 'Nombre guardado'} : null);},
          async register() {stats.register++; notify({email: 'test@example.com', displayName: ''});},
          async login() {stats.login++; if (window.failLogin) throw {code: 'auth/invalid-credential'}; notify({email: 'test@example.com', displayName: 'Usuario'});},
          async google() {stats.google++; notify({email: 'google@example.com', displayName: 'Cuenta Google'});},
          async resetPassword() {stats.reset++;},
          async completeProfile(user, name) {stats.savedName = name;},
          async logout() {notify(null);},
        };
        window.accountScreen = module.setupAccountScreen({document, config: null,
          serviceFactory: async () => {if (missing) throw Error('auth/not-configured'); return service;},
          onEnter() {stats.enter++;}, onLeave() {stats.leave++;}});
        await window.accountScreen.ready;
        // Exercise the actual splash routine above the account screen.
        window.state = {};
        window.$ = selector => document.querySelector(selector);
        (0, eval)(splash + '\nrunSplashScreen();');
      }, {code, splash, missing, restore});
    }
    await setup();
    assert.equal(await page.locator('#app-splash').isVisible(), true);
    assert.equal(await page.evaluate(() => document.elementFromPoint(innerWidth / 2, innerHeight / 2).closest('#app-splash') !== null), true);
    await page.locator('#app-splash').waitFor({state: 'hidden'});
    assert.equal(await page.locator('.app-shell').evaluate(el => el.inert), true);
    await page.locator('#account-email').fill('test@example.com');
    await page.locator('#account-password').fill('test-password-123');
    await page.locator('#account-confirm').fill('wrong-password-123');
    await page.locator('#account-submit').click();
    assert.equal(await page.evaluate(() => stats.register), 0);
    await page.locator('#account-confirm').fill('test-password-123');
    await page.locator('#account-submit').click();
    await page.locator('#account-profile').waitFor({state: 'visible'});
    assert.equal(await page.locator('.app-shell').evaluate(el => el.inert), true);
    await page.locator('#account-name').fill('Nombre de prueba');
    await page.locator('#account-accept').click();
    await page.locator('#account-screen').waitFor({state: 'hidden'});
    assert.equal(await page.evaluate(() => stats.savedName), 'Nombre de prueba');
    assert.equal(await page.locator('.app-shell').evaluate(el => el.inert), false);
    await page.locator('#account-logout').evaluate(el => el.click());
    assert.equal(await page.locator('#account-screen').isVisible(), true);
    assert.equal(await page.evaluate(() => stats.leave), 1);
    await page.locator('#account-login').click();
    await page.locator('#account-email').fill('test@example.com');
    await page.locator('#account-reset').click();
    await page.waitForFunction(() => stats.reset === 1);
    assert.match(await page.locator('#account-status').textContent(), /enlace/);
    await page.evaluate(() => {window.failLogin = true;});
    await page.locator('#account-password').fill('wrong-password');
    await page.locator('#account-submit').click();
    await page.waitForFunction(() => document.querySelector('#account-status').textContent.includes('Revisá'));
    assert.equal(await page.locator('.app-shell').evaluate(el => el.inert), true);
    assert.equal(await page.locator('#account-password').inputValue(), '');
    await page.evaluate(() => {window.failLogin = false;});
    await page.locator('#account-password').fill('test-password-123');
    await page.locator('#account-submit').click();
    await page.locator('#account-profile').waitFor({state: 'visible'});
    await page.locator('#account-change').click();
    await page.locator('#account-google').click();
    await page.locator('#account-profile').waitFor({state: 'visible'});
    assert.equal(await page.locator('#account-profile-email').inputValue(), 'google@example.com');
    assert.equal(await page.locator('.app-shell').evaluate(el => el.inert), true);
    await page.locator('#account-accept').click();
    assert.equal(await page.evaluate(() => stats.google), 1);
    await setup({restore: true});
    await page.locator('#app-splash').waitFor({state: 'hidden'});
    assert.equal(await page.locator('#account-name').inputValue(), 'Nombre guardado');
    assert.equal(await page.evaluate(() => stats.enter), 0);
    await setup({missing: true});
    await page.locator('#app-splash').waitFor({state: 'hidden'});
    assert.equal(await page.locator('#account-google').isDisabled(), true);
    assert.equal(await page.locator('.app-shell').evaluate(el => el.inert), true);
    assert.match(await page.locator('#account-status').textContent(), /todavía no está disponible/);
    await setup();
    await page.locator('#app-splash').waitFor({state: 'hidden'});
    for (const [width, height] of [[390, 844], [844, 390], [320, 568]]) {
      await page.setViewportSize({width, height});
      const card = await page.locator('.account-card').boundingBox();
      assert.ok(card.x >= 0 && card.x + card.width <= width);
      await page.locator('#account-submit').scrollIntoViewIfNeeded();
      const button = await page.locator('#account-submit').boundingBox();
      assert.ok(button.y >= 0 && button.y + button.height <= height);
    }
    if (process.env.AUTH_PREVIEW_DIR) {
      fs.mkdirSync(process.env.AUTH_PREVIEW_DIR, {recursive: true});
      await page.setViewportSize({width: 390, height: 844});
      await page.locator('#account-screen').evaluate(el => {el.scrollTop = 0;});
      await page.screenshot({path: path.join(process.env.AUTH_PREVIEW_DIR, 'trazia-registro.png')});
      await page.locator('#account-google').click();
      await page.locator('#account-profile').waitFor({state: 'visible'});
      await page.screenshot({path: path.join(process.env.AUTH_PREVIEW_DIR, 'trazia-datos-basicos.png')});
    }
    assert.deepEqual(errors, []);
    console.log('Account flows OK: splash first, registration, mismatch validation, explicit profile acceptance, login failure/success, recovery, Google, logout, restore, unavailable config, mobile layouts. Firebase calls mocked.');
  } finally {await browser.close();}
})().catch(error => {console.error(error); process.exit(1);});
