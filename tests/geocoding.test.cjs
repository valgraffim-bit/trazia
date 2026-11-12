const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const source = readFileSync(require('node:path').join(__dirname, '../app.js'), 'utf8');
const names = ['normalizeGeocodeText', 'normalizeColombianAddressQuery', 'colombianAddressQueryVariants', 'parseColombianStructuredAddress', 'photonFeatureParts', 'photonFeatureSearchText', 'rankPhotonFeatures', 'isWithinColombiaSearchArea', 'makePhotonSearchParams', 'photonLanguage', 'isColombiaFeature', 'findDestinationCandidates'];
function setup(fetchPhotonFeatures, nearby = async () => []) {
  const context = vm.createContext({ window: {}, URLSearchParams, findSearchLocations: () => [], state: { language: 'es', currentPosition: null }, COLOMBIA_SEARCH_BOUNDS: { west: -82, east: -66, south: -5, north: 14 }, distanceMeters: () => 0, findArcgisCandidates: async () => [], findNearbyCaliCandidates: nearby, fetchPhotonFeatures, findNominatimCandidates: () => { throw Error('Autocomplete must not call Nominatim'); } });
  for (const name of names) {
    const start = source.search(new RegExp(`  (?:async )?function ${name}\\(`));
    assert.ok(start >= 0, name);
    const end = source.indexOf('\n  }', start) + 4;
    vm.runInContext(source.slice(start, end), context);
  }
  return context;
}
const street = { type: 'Feature', geometry: { type: 'Point', coordinates: [-76.53, 3.42] }, properties: { name: 'Carrera 80', city: 'Cali', countrycode: 'CO' } };
test('treats KR/Cra/Carrera and CLL/CL/Calle as road aliases without changing business names', () => {
  const ctx = setup(async () => ({ features: [] }));
  for (const [canonical, spellings] of [
    ['Carrera 83B 3 #45-53, Cali', ['KR 83B 3 #45-53, Cali', 'cra. 83B 3 #45-53, Cali', 'KR83B 3 #45-53, Cali', 'Cra83B 3 #45-53, Cali']],
    ['Calle 45 BIS #12-83, Cali', ['CLL 45 BIS #12-83, Cali', 'cll.45 BIS #12-83, Cali', 'CL45 BIS #12-83, Cali', 'Cll45 BIS #12-83, Cali']],
  ]) {
    const expected = ctx.normalizeGeocodeText(canonical);
    const structured = JSON.stringify(ctx.parseColombianStructuredAddress(canonical)).toLowerCase();
    for (const value of spellings) {
      assert.equal(ctx.normalizeGeocodeText(value), expected, value);
      assert.equal(JSON.stringify(ctx.parseColombianStructuredAddress(value)).toLowerCase(), structured, value);
    }
  }
  assert.notEqual(ctx.normalizeGeocodeText('KR 45 #12-83'), ctx.normalizeGeocodeText('CLL 45 #12-83'));
  assert.notEqual(ctx.normalizeGeocodeText('Cra 83B 3 #45-53'), ctx.normalizeGeocodeText('Cra 83B #45-53'));
  assert.notEqual(ctx.normalizeGeocodeText('Cll 45 BIS #12-83'), ctx.normalizeGeocodeText('Cll 45 #12-83'));
  assert.equal(ctx.normalizeColombianAddressQuery('Clínica Kraft 83, Cali'), 'Clínica Kraft 83 Cali');
});
test('ranks abbreviated source addresses like their written-out road names', () => {
  const ctx = setup(async () => ({ features: [] }));
  for (const [road, query] of [['KR83B3', 'Carrera 83B3 #45-53, Cali'], ['CLL45', 'Calle 45 #45-53, Cali']]) {
    const candidate = { ...street, properties: { street: road, housenumber: '45-53', city: 'Cali', countrycode: 'CO' } };
    const matches = ctx.rankPhotonFeatures([candidate], query, null);
    assert.equal(matches.length, 1, road);
    assert.equal(matches[0], candidate);
    const wrong = { ...candidate, properties: { ...candidate.properties, street: road.startsWith('KR') ? 'CLL83B3' : 'KR45' } };
    assert.equal(ctx.rankPhotonFeatures([wrong], query, null).length, 0);
  }
});
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
test('uses configured TomTom first and caches repeated queries for the current session', async () => {
  const ctx = setup(async () => { throw Error('Photon should not be requested'); });
  ctx.window.TRAZIA_CONFIG = { tomtomApiKey: 'test-browser-key' };
  ctx.state.tomtomCache = new Map();
  ctx.DEFAULT_MAP_CENTER = [-76.532, 3.452];
  let requests = 0;
  ctx.findTomtomCandidates = async () => { requests++; return [{ properties: { geocoder: 'tomtom', housenumber: '45-53' } }]; };
  for (let i = 0; i < 2; i++) assert.equal((await ctx.findDestinationCandidates('Cra 83B 3 # 45-53 Cali'))[0].properties.geocoder, 'tomtom');
  assert.equal(requests, 1);
});
test('falls back to existing services if TomTom denies the key', async () => {
  const ctx = setup(async () => ({ features: [street] }));
  ctx.window.TRAZIA_CONFIG = { tomtomApiKey: 'test-browser-key' };
  ctx.state.tomtomCache = new Map();
  ctx.DEFAULT_MAP_CENTER = [-76.532, 3.452];
  ctx.findTomtomCandidates = async () => { throw Error('TomTom unavailable (403)'); };
  assert.equal((await ctx.findDestinationCandidates('Carrera 80 Cali')).length, 1);
});

test('offers clearly tagged real nearby addresses when the requested number is absent, without adding map markers',async()=>{
 const nearby={type:'Feature',geometry:{type:'Point',coordinates:[-76.51784984,3.38404421]},properties:{geocoder:'idesc',fullAddress:'KR 83 B 3 # 45 - 47',housenumber:'45 - 47',nearbyFor:'KR83B3#45-53'}};let query;
 const ctx=setup(async()=>({features:[]}),async value=>{query=value;return[nearby];});const rows=await ctx.findDestinationCandidates('Cra 83b 3 -# 45-53, Cali');assert.equal(rows[0],nearby);assert.equal(query,'Cra 83b 3 # 45-53, Cali');assert.deepEqual(Array.from(rows[0].geometry.coordinates),[-76.51784984,3.38404421]);assert.equal(ctx.state.selectedDestination,undefined);
});

test('the shared exact address is returned before external geocoders without changing coordinates',async()=>{
 const {findSearchLocations}=await import('../search-locations.mjs');const ctx=setup(async()=>{throw Error('No external query expected');});ctx.findSearchLocations=findSearchLocations;const features=await ctx.findDestinationCandidates('Cra 83b 3 -#45-53, Cali');assert.equal(features.length,1);assert.equal(features[0].properties.sharedLocation,true);assert.equal(features[0].properties.nearbyFor,undefined);assert.deepEqual(Array.from(features[0].geometry.coordinates),[-76.517773,3.384056]);
});
