const assert = require('node:assert/strict');
const fs = require('node:fs');
const { test } = require('node:test');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../mercadolibre-locations.mjs'), 'utf8');
const moduleUrl = 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
test('reads Colombian administrative divisions without fabricating coordinates', async () => {
  const { getMercadoLibreColombiaLocations } = await import(moduleUrl);
  const result = await getMercadoLibreColombiaLocations({ fetchFn: async url => {
    assert.match(url, /classified_locations\/countries\/CO$/);
    return { ok: true, json: async () => ({ id: 'CO', name: 'Colombia', states: [{ id: 'CO-VAC', name: 'Valle del Cauca' }] }) };
  } });
  assert.equal(result.states[0].name, 'Valle del Cauca');
  assert.equal(result.states[0].lat, undefined);
});
test('rejects invalid state IDs before fetching', async () => {
  const { getMercadoLibreStateCities } = await import(moduleUrl);
  await assert.rejects(() => getMercadoLibreStateCities('../users'), /Invalid/);
});
