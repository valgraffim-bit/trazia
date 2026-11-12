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
test('matches road aliases in provider addresses while preserving type, suffix, house and city',async()=>{
 const {findTomtomCandidates}=await modulePromise;
 for(const [expectedStreet,spellings]of [['Carrera 83B 3',['KR83B3','cra.83B3','Carrera 83B 3']],['Calle 45 BIS',['CLL45 BIS','cl.45 BIS','Calle 45 BIS']]]){
  const config={...options([]),expectedAddress:{street:expectedStreet,houseNumber:'45-53',city:'Cali'}};
  for(const street of spellings){
   config.fetchFn=async()=>({ok:true,json:async()=>({results:[{...result,address:{...result.address,street}}]})});
   const rows=await findTomtomCandidates(`${expectedStreet} #45-53, Cali`,config);assert.equal(rows.length,1,street);assert.deepEqual(rows[0].geometry.coordinates,[-76.517773,3.384056]);
  }
 }
 const wrong=[{...result,address:{...result.address,street:'CLL83B3'}},{...result,address:{...result.address,street:'KR83B'}},{...result,address:{...result.address,street:'KR83B3',houseNumber:'45-530'}},{...result,address:{...result.address,street:'KR83B3',municipality:'Bogotá'}}];
 assert.deepEqual(await findTomtomCandidates(query,options(wrong)),[]);
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
test('named places use fuzzy POI search and preserve name, address and routing coordinates', async () => {
  const { findTomtomCandidates } = await modulePromise;
  for (const name of ['Clínica de prueba', 'Negocio de prueba', 'Pista de patinaje']) {
    let request;
    const matches = await findTomtomCandidates(name, { apiKey: 'test-key', center: { lat: 3.45, lng: -76.53 }, fetchFn: async (url) => {
      request = new URL(url);
      return { ok: true, json: async () => ({ results: [
        { type: 'POI', poi: { name }, position: { lat: 3.46, lon: -76.54 }, address: { countryCode: 'CO', streetName: 'Calle 1', streetNumber: '2', municipality: 'Cali' } },
        { type: 'POI', poi: { name: 'Invalid' }, position: { lat: 200, lon: 0 }, address: { countryCode: 'CO' } },
        { type: 'POI', position: { lat: 3, lon: -76 }, address: { countryCode: 'US' } },
      ] }) };
    } });
    assert.match(request.pathname, /\/search\/2\/search\//);
    assert.equal(decodeURIComponent(request.pathname.split('/').at(-1)), `${name}.json`);
    assert.equal(request.searchParams.get('countrySet'), 'CO');
    assert.equal(request.searchParams.get('lat'), '3.45');
    assert.equal(matches.length, 1);
    assert.equal(matches[0].properties.name, name);
    assert.equal(matches[0].properties.city, 'Cali');
    assert.deepEqual(matches[0].geometry.coordinates, [-76.54, 3.46]);
  }
});
