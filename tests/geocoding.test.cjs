const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const source = readFileSync(require('node:path').join(__dirname, '../app.js'), 'utf8');
const names = ['normalizeGeocodeText', 'normalizeColombianAddressQuery', 'colombianAddressQueryVariants', 'parseColombianStructuredAddress', 'photonFeatureParts', 'photonFeatureSearchText', 'rankPhotonFeatures', 'isWithinColombiaSearchArea', 'makePhotonSearchParams', 'photonLanguage', 'isColombiaFeature', 'findDestinationCandidates'];
function setup(fetchPhotonFeatures) {
  const context = vm.createContext({ URLSearchParams, state: { language: 'es', currentPosition: null }, COLOMBIA_SEARCH_BOUNDS: { west: -82, east: -66, south: -5, north: 14 }, distanceMeters: () => 0, fetchPhotonFeatures, findNominatimCandidates: () => { throw Error('Autocomplete must not call Nominatim'); } });
  for (const name of names) {
    const start = source.search(new RegExp(`  (?:async )?function ${name}\\(`));
    assert.ok(start >= 0, name);
    const end = source.indexOf('\n  }', start) + 4;
    vm.runInContext(source.slice(start, end), context);
  }
  return context;
}
const street = { type: 'Feature', geometry: { type: 'Point', coordinates: [-76.53, 3.42] }, properties: { name: 'Carrera 80', city: 'Cali', countrycode: 'CO' } };
test('normalizes abbreviations and offers the mapped street when the house number is absent', async () => {
  const queries = [];
  const ctx = setup(async params => {
    queries.push(params.get('q'));
    return { features: params.get('q') === 'carrera 80, Cali' ? [street] : [] };
  });
  const results = await ctx.findDestinationCandidates('Cra 80 # 5-20 Cali');
  assert.equal(queries[0], 'carrera 80 5-20 Cali');
  assert.equal(queries.at(-1), 'carrera 80, Cali');
  assert.equal(results.length, 1);
  assert.equal(results[0].properties.housenumber, undefined);
});
test('continues to another query after a provider error', async () => {
  let calls = 0;
  const ctx = setup(async () => { if (++calls === 1) throw Error('Photon 503'); return { features: [street] }; });
  assert.equal((await ctx.findDestinationCandidates('Cra 80 Cali')).length, 1);
  assert.equal(calls, 2);
});
test('reports service failure separately from a successful search without results', async () => {
  const offline = setup(async () => { throw Error('Photon offline'); });
  await assert.rejects(offline.findDestinationCandidates('Cali'), /Photon offline/);
  const empty = setup(async () => ({ features: [] }));
  assert.equal((await empty.findDestinationCandidates('Unknown place')).length, 0);
});
test('does not retry a cancelled autocomplete request', async () => {
  const controller = new AbortController();
  let calls = 0;
  const ctx = setup(async () => { calls++; controller.abort(); throw Error('aborted'); });
  await assert.rejects(ctx.findDestinationCandidates('Cra 80 Cali', null, controller.signal), /aborted/);
  assert.equal(calls, 1);
});
test('keeps results restricted to Colombia', async () => {
  const ctx = setup(async () => ({ features: [{ ...street, properties: { ...street.properties, countrycode: 'US' } }] }));
  assert.equal((await ctx.findDestinationCandidates('Carrera 80')).length, 0);
});
