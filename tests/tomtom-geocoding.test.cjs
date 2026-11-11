const { test } = require('node:test');
const assert = require('node:assert/strict');
const modulePromise = import('../tomtom-geocoding.mjs');
const query = 'Cra. 83b 3 # 45-53, Cali';
const expectedAddress = { street: 'carrera 83b 3', houseNumber: '45-53', city: 'Cali' };
const result = { type: 'address', title: 'Carrera 83B 3 # 45-53, Cali', position: { type: 'Point', coordinates: [-76.517773, 3.384056] }, address: { street: 'Carrera 83B 3', houseNumber: '45-53', municipality: 'Cali', countrySubdivision: 'Valle del Cauca', country: 'Colombia', countryCodeIso2: 'CO' } };
function options(results) {
  return { apiKey: 'test-browser-key', expectedAddress, fetchFn: async () => ({ ok: true, json: async () => ({ results }) }) };
}
test('does not make any request before the administrator configures a key', async () => {
  const { findTomtomCandidates } = await modulePromise;
  assert.deepEqual(await findTomtomCandidates(query, { fetchFn() { throw Error('Must not request'); } }), []);
});
test('uses Orbis v2 headers, encodes the full query and preserves destination coordinates', async () => {
  const { findTomtomCandidates } = await modulePromise;
  let request;
  const config = options([result]);
  config.fetchFn = async (url, init) => { request = { url: new URL(url), init }; return { ok: true, json: async () => ({ results: [result] }) }; };
  const matches = await findTomtomCandidates(query, { ...config, center: { lat: 3.45, lng: -76.53 } });
  assert.equal(request.url.searchParams.get('query'), query);
  assert.equal(request.url.searchParams.get('position'), '-76.53,3.45');
  assert.equal(request.url.searchParams.get('countryCodesIso2'), 'CO');
  assert.equal(request.url.searchParams.has('key'), false);
  assert.equal(request.init.headers['TomTom-Api-Version'], '2');
  assert.equal(request.init.headers['TomTom-Api-Key'], 'test-browser-key');
  assert.deepEqual(matches[0].geometry.coordinates, [-76.517773, 3.384056]);
  assert.equal(matches[0].properties.housenumber, '45-53');
});
test('rejects missing numeric suffix, wrong house number, wrong city and street-only matches', async () => {
  const { findTomtomCandidates } = await modulePromise;
  const wrong = [
    { ...result, address: { ...result.address, street: 'Carrera 83B' } },
    { ...result, address: { ...result.address, houseNumber: '45-51' } },
    { ...result, address: { ...result.address, municipality: 'Bogotá' } },
    { ...result, type: 'street', address: { ...result.address, houseNumber: '' } },
    { ...result, position: { coordinates: [181, 3.4] } },
    { ...result, address: { ...result.address, countryCodeIso2: 'US' } },
  ];
  assert.deepEqual(await findTomtomCandidates(query, options(wrong)), []);
});
test('allows equivalent abbreviation and suffix spacing without dropping digits', async () => {
  const { findTomtomCandidates } = await modulePromise;
  const matches = await findTomtomCandidates(query, options([{ ...result, address: { ...result.address, street: 'Cra. 83B3' } }]));
  assert.equal(matches.length, 1);
});
test('does not reveal credentials in connection errors or upstream HTTP failures', async () => {
  const { findTomtomCandidates } = await modulePromise;
  await assert.rejects(findTomtomCandidates(query, { apiKey: 'test-browser-key', fetchFn: async () => { throw Error('URL has test-browser-key'); } }), error => !error.message.includes('test-browser-key') && /connection unavailable/.test(error.message));
  for (const status of [403, 429, 500]) await assert.rejects(findTomtomCandidates(query, { apiKey: 'test-browser-key', fetchFn: async () => ({ ok: false, status }) }), new RegExp('TomTom unavailable'));
});
test('rejects malformed payloads and preserves request cancellation', async () => {
  const { findTomtomCandidates } = await modulePromise;
  await assert.rejects(findTomtomCandidates(query, { apiKey: 'test-browser-key', fetchFn: async () => ({ ok: true, json: async () => ({}) }) }), /invalid response/);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(findTomtomCandidates(query, { apiKey: 'test-browser-key', signal: controller.signal, fetchFn: async () => { throw new DOMException('Aborted', 'AbortError'); } }), { name: 'AbortError' });
});
