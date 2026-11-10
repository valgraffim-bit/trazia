const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const source = readFileSync(require('node:path').join(__dirname, '../app.js'), 'utf8');
const names = ['normalizeGeocodeText', 'normalizeColombianAddressQuery', 'colombianAddressQueryVariants', 'parseColombianStructuredAddress', 'photonFeatureParts', 'photonFeatureSearchText', 'rankPhotonFeatures', 'isWithinColombiaSearchArea', 'makePhotonSearchParams', 'photonLanguage', 'isColombiaFeature', 'findDestinationCandidates'];
function setup(fetchPhotonFeatures) {
  const context = vm.createContext({ URLSearchParams, state: { language: 'es', currentPosition: null }, COLOMBIA_SEARCH_BOUNDS: { west: -82, east: -66, south: -5, north: 14 }, distanceMeters: () => 0, findArcgisCandidates: async () => [], fetchPhotonFeatures, findNominatimCandidates: () => { throw Error('Autocomplete must not call Nominatim'); } });
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

test('finds Carrera 83B for the reported Cali address and rejects an unrelated house', async () => {
  const road = { ...street, properties: { ...street.properties, name: 'Carrera 83B' } };
  const unrelated = { ...street, properties: { name: 'Villa del Peñon Suites', street: 'Carrera 3A Oeste', housenumber: '4-53', city: 'Cali', countrycode: 'CO' } };
  const queries = [];
  const ctx = setup(async params => {
    const query = params.get('q');
    queries.push(query);
    return { features: query === 'Carrera 83b 3, Cali' ? [road] : [unrelated] };
  });
  const results = await ctx.findDestinationCandidates('Carrera 83b 3 # 45-53 Cali');
  assert.equal(queries.at(-1), 'Carrera 83b 3, Cali');
  assert.equal(results.length, 1);
  assert.equal(results[0].properties.name, 'Carrera 83B');
  assert.equal(results[0].properties.housenumber, undefined);
});
test('does not confuse street numbers or letter suffixes', () => {
  const ctx = setup(async () => ({ features: [] }));
  for (const name of ['Carrera 83', 'Carrera 83B1', 'Carrera 83BA']) {
    const wrongRoad = { ...street, properties: { ...street.properties, name } };
    assert.equal(ctx.rankPhotonFeatures([wrongRoad], 'Carrera 83B # 45-53 Cali', null).length, 0, name);
  }
});
function arcgisSetup(candidate) {
  const ctx = setup(async () => ({ features: [] }));
  ctx.DEFAULT_MAP_CENTER = [-76.532, 3.452];
  ctx.fetchTimed = async (url) => {
    ctx.requestUrl = url;
    return { ok: true, json: async () => ({ candidates: [candidate] }) };
  };
  const start = source.indexOf('  async function findArcgisCandidates(');
  vm.runInContext(source.slice(start, source.indexOf('\n  }', start) + 4), ctx);
  return ctx;
}
const completeAddress = { score: 100, address: 'Carrera 83B 45 53, Caney, Cali', location: { x: -76.5172834, y: 3.3840847 }, attributes: { Addr_type: 'StreetAddress', ShortLabel: 'Carrera 83B 45 53', City: 'Cali', Region: 'Valle del Cauca', Nbrhd: 'Caney', Country: 'COL' } };
test('returns the complete house number and requests only temporary geocoding', async () => {
  const ctx = arcgisSetup(completeAddress);
  const results = await ctx.findArcgisCandidates('Cra 83B # 45-53 Cali', null);
  assert.equal(results.length, 1);
  assert.equal(ctx.photonFeatureParts(results[0].properties).main, 'carrera 83B # 45-53');
  assert.equal(new URL(ctx.requestUrl).searchParams.get('forStorage'), 'false');
  assert.equal(results[0].properties.geocoder, 'esri');
});
test('rejects street-only, wrong-number, wrong-city and low-score candidates', async () => {
  for (const candidate of [
    { ...completeAddress, attributes: { ...completeAddress.attributes, Addr_type: 'StreetName' } },
    { ...completeAddress, attributes: { ...completeAddress.attributes, ShortLabel: 'Carrera 83B 45 51' } },
    { ...completeAddress, attributes: { ...completeAddress.attributes, City: 'Bogotá' } },
    { ...completeAddress, score: 82 },
  ]) {
    const ctx = arcgisSetup(candidate);
    assert.equal((await ctx.findArcgisCandidates('Cra 83B # 45-53 Cali', null)).length, 0);
  }
});
test('prioritizes a complete address over street-only Photon suggestions', async () => {
  const ctx = setup(async () => { throw Error('Photon should not be needed'); });
  ctx.findArcgisCandidates = async () => [{ properties: { geocoder: 'esri', housenumber: '45-53' } }];
  const results = await ctx.findDestinationCandidates('Cra 83B # 45-53 Cali');
  assert.equal(results[0].properties.housenumber, '45-53');
});
