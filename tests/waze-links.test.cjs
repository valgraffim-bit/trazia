const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const modulePromise = import('../waze-links.mjs');

test('imports Waze coordinates without changing signs or swapping latitude and longitude', async () => {
  const { parseWazeLocation } = await modulePromise;
  for (const link of ['https://waze.com/ul?ll=3.3840847%2C-76.5172834&navigate=yes', 'https://www.waze.com/live-map/directions?to=ll.3.3840847%2C-76.5172834', 'waze://?ll=3.3840847,-76.5172834']) {
    const result = parseWazeLocation(link);
    assert.deepEqual(result.location, { lat: 3.3840847, lng: -76.5172834 });
    assert.equal(result.approximate, false);
    assert.deepEqual(parseWazeLocation(result.link).location, result.location);
  }
});
test('imports a shared message with a URL and punctuation', async () => {
  const { parseWazeLocation } = await modulePromise;
  const result = parseWazeLocation('Mi destino en Waze: (https://waze.com/ul?ll=3.4,-76.5&utm_source=share).');
  assert.deepEqual(result.location, { lat: 3.4, lng: -76.5 });
  assert.equal(new URL(result.link).searchParams.has('utm_source'), false);
});
test('decodes high-precision geohash links and marks the result approximate', async () => {
  const { parseWazeLocation } = await modulePromise;
  const result = parseWazeLocation('https://waze.com/ul/hu4pruydqqvj');
  assert.ok(Math.abs(result.location.lat - 57.64911) < 0.00001);
  assert.ok(Math.abs(result.location.lng - 10.40744) < 0.00001);
  assert.equal(result.approximate, true);
  assert.equal(parseWazeLocation(result.link).approximate, true);
});
test('does not substitute a text query, short link or map viewport for a destination', async () => {
  const { parseWazeLocation } = await modulePromise;
  for (const link of ['https://waze.com/ul?q=Cra+83B+45-53', 'https://waze.com/ul?favorite=home', 'https://waze.to/abc123', 'https://waze.com/live-map?lat=3.4&lon=-76.5', 'https://waze.com/ul?h=u4pr']) {
    assert.throws(() => parseWazeLocation(link), { code: 'WAZE_NO_COORDINATES' });
  }
});
test('rejects invalid coordinates and deceptive or unrelated domains', async () => {
  const { parseWazeLocation } = await modulePromise;
  for (const value of ['91,0', '0,181', ',0', '1,', 'NaN,0', '3.4,-76.5junk', 'Infinity,0']) assert.throws(() => parseWazeLocation('https://waze.com/ul?ll=' + encodeURIComponent(value)), { code: 'WAZE_INVALID_COORDINATES' });
  for (const value of ['Cra 83B # 45-53', 'https://waze.com.evil.example/ul?ll=1,2', 'javascript:alert(1)', 'https://example.com/ul?ll=1,2']) assert.equal(parseWazeLocation(value), null);
});
test('pasting a Waze link selects the coordinate destination without calling geocoding', async () => {
  const { parseWazeLocation } = await modulePromise;
  const elements = { '#route-note': {}, '#destination-suggestions': {} };
  const context = vm.createContext({
    parseWazeLocation, state: { language: 'es', autocompleteRequestId: 0 },
    destinationInput: { value: 'https://waze.com/ul?ll=3.3840847,-76.5172834' },
    window: { clearTimeout() {}, setTimeout() { throw Error('Must not start geocoding'); } },
    $: selector => elements[selector], closeDestinationSuggestions() {}, showToast() {},
    showSuggestionMessage(message) { throw Error(message); },
  });
  const source = readFileSync(path.join(__dirname, '../app.js'), 'utf8');
  for (const name of ['setWazeDestination', 'handleDestinationInput']) {
    const start = source.indexOf('  function ' + name + '(');
    vm.runInContext(source.slice(start, source.indexOf('\n  }', start) + 4), context);
  }
  context.handleDestinationInput();
  assert.equal(context.state.selectedDestination.location.lng, -76.5172834);
  assert.equal(context.state.selectedDestination.location.lat, 3.3840847);
  assert.match(context.state.selectedDestination.wazeLink, /waze.com/);
});
