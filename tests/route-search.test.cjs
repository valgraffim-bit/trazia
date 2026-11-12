const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname, '../app.js'), 'utf8');
const origin = {lat: 3.42, lng: -76.53};
const destination = {lat: 3.43, lng: -76.54};
const payload = () => ({trip: {summary: {length: 2, time: 300}, legs: [{shape: 'test', maneuvers: []}]}});
function setup({automatic = false, fetchRoute, position = origin, getPosition} = {}) {
  const state = {mapReady: true, currentPosition: position, lastLocationTimestamp: Date.now(), selectedDestination: {label: 'Destino', location: destination},
    routeRequestId: 0, autocompleteRequestId: 0, settings: {avoidFerries: true, avoidHighways: true, unpaved: 'avoid', avoidDifficult: true}, avoidTolls: true, vehicleType: 'car', language: 'es', routeCoordinates: [], isNavigating: automatic};
  const elements = new Map();
  const errors = [];
  const stats = {calls: 0, draws: 0, starts: 0, instructions: 0};
  const ctx = vm.createContext({state, AbortController, Intl, console: {error(...args) {errors.push(args);}},
    destinationInput: {value: 'Destino'}, $: key => {if (!elements.has(key)) elements.set(key, {}); return elements.get(key);},
    window: {clearTimeout() {}}, t: key => key,
    clearRoutePolylines() {state.routeCoordinates = [];}, updateUserMarker() {}, collapseMobilePanel() {}, setMap3d() {}, setNavigationView() {},
    getUserPosition: getPosition || (async () => origin),
    async fetchValhallaRoute(request) {
      stats.calls++;
      assert.equal(request.costing_options.auto.use_tolls, 0.05);
      assert.equal(request.costing_options.auto.use_ferry, 0);
      assert.equal(request.costing_options.auto.use_highways, 0);
      assert.equal(request.costing_options.auto.exclude_unpaved, true);
      assert.equal(request.costing_options.auto.maneuver_penalty, 30);
      assert.equal(request.locations[0].lat, origin.lat);
      assert.equal(request.locations[1].lon, destination.lng);
      return fetchRoute ? fetchRoute(request) : {ok: true, async json() {return payload();}};
    },
    decodePolyline: () => [[origin.lng, origin.lat], [destination.lng, destination.lat]],
    drawRouteOnMap() {stats.draws++;}, updateRouteSummary() {}, saveRecentDestination() {},
    async startNavigation(options) {
      stats.starts++;
      assert.equal(state.route.distanceMeters, 2000, 'route is ready before guidance starts');
      assert.equal(state.routeCoordinates.length, 2);
      assert.equal(options.position, origin, 'uses the origin already acquired for this route');
      assert.equal(options.requestId, state.routeRequestId);
      state.isNavigating = true;
    },
    updateNavigationInstruction() {stats.instructions++;}, speak() {}, showToast() {}, getRouteErrorMessage: () => 'routeServiceError',
  });
  const start = source.indexOf('  async function searchRoute(');
  vm.runInContext(source.slice(start, source.indexOf('\n  }', start) + 4), ctx);
  return {ctx, state, elements, stats, errors};
}
for (const automatic of [false, true]) {
  test(`calculates and starts guidance without a start button (${automatic ? 'rerouting preserves navigation' : 'initial search'})`, async () => {
    const {ctx, state, elements, stats, errors} = setup({automatic});
    await ctx.searchRoute({automatic});
    assert.equal(errors.length, 0, 'search should not throw before contacting routing service');
    assert.equal(stats.calls, 1);
    assert.equal(stats.draws, 1);
    assert.equal(state.route.distanceMeters, 2000);
    assert.equal(state.route.durationMillis, 300000);
    assert.equal(stats.starts, automatic ? 0 : 1, 'rerouting must not restart or toggle guidance');
    assert.equal(stats.instructions, automatic ? 1 : 0);
    assert.equal(state.isNavigating, true);
    assert.equal(elements.has('#start-navigation'), false);
    assert.equal(elements.get('#search-route').disabled, false);
  });
}
test('does not start guidance after routing fails or yields invalid geometry', async () => {
  for (const fetchRoute of [async () => {throw Error('service unavailable');}, async () => ({ok: false, json: async () => ({error:'No path'})}), async () => ({ok:true,json:async()=>({trip:{legs:[]}})})]) {
    const {ctx, stats, state, elements} = setup({fetchRoute});
    await ctx.searchRoute();
    assert.equal(stats.starts, 0);assert.equal(stats.draws, 0);assert.equal(Boolean(state.isNavigating), false);assert.equal(elements.get('#search-route').disabled, false);
  }
});
test('denied location leaves search usable without starting navigation', async () => {
  const {ctx,stats,elements,state}=setup({position:null,getPosition:async()=>{throw Error('GPS denied');}});
  await ctx.searchRoute();assert.equal(stats.calls,0);assert.equal(stats.starts,0);assert.equal(Boolean(state.isNavigating),false);assert.equal(elements.get('#search-route').disabled,false);
});
test('cancelled route responses cannot display or start a route after the request is invalidated', async () => {
  let resolve;
  const {ctx,stats,state}=setup({fetchRoute:()=>new Promise(r=>resolve=r)});
  const pending=ctx.searchRoute();await Promise.resolve();state.routeRequestId++;state.routeSearchController.abort();
  resolve({ok:true,json:async()=>payload()});await pending;
  assert.equal(stats.draws,0);assert.equal(stats.starts,0);assert.equal(Boolean(state.isNavigating),false);
});
test('cancelling while the JSON payload is pending cannot redraw or start an old route', async () => {
  let resolveJSON;
  const {ctx,stats,state}=setup({fetchRoute:async()=>({ok:true,json:()=>new Promise(r=>resolveJSON=r)})});
  const pending=ctx.searchRoute();while(!resolveJSON)await Promise.resolve();
  state.routeRequestId++;state.routeSearchController.abort();resolveJSON(payload());await pending;
  assert.equal(stats.draws,0);assert.equal(stats.starts,0);assert.equal(Boolean(state.isNavigating),false);
});

test('editing the destination while JSON is pending discards the old route', async () => {
  let resolveJSON;
  const {ctx,stats,state}=setup({fetchRoute:async()=>({ok:true,json:()=>new Promise(r=>resolveJSON=r)})});
  const pending=ctx.searchRoute();while(!resolveJSON)await Promise.resolve();
  state.autocompleteRequestId++;ctx.destinationInput.value='Otro destino';resolveJSON(payload());await pending;
  assert.equal(stats.draws,0);assert.equal(stats.starts,0);assert.equal(Boolean(state.isNavigating),false);
});

test('a stale GPS fix is refreshed before requesting and starting the route', async () => {
  let fixes=0;
  const {ctx,state,stats}=setup({position:{lat:10,lng:10},getPosition:async()=>{fixes++;return origin;}});
  state.lastLocationTimestamp=Date.now()-31_000;
  await ctx.searchRoute();
  assert.equal(fixes,1);assert.equal(stats.calls,1);assert.equal(stats.starts,1);assert.equal(state.isNavigating,true);
});

test('a new search during guidance keeps the active route and destination if calculation fails', async () => {
  const {ctx,state,stats}=setup({automatic:true,fetchRoute:async()=>{throw Error('Service unavailable');}});
  const oldRoute={distanceMeters:1200,durationMillis:180000};
  const oldCoordinates=[[origin.lng,origin.lat],[-76.531,3.421]];
  const oldDestination={label:'Destino actual',location:{lat:3.421,lng:-76.531}};
  const oldSteps=[{instructions:'Sigue hacia el destino actual'}];
  state.route=oldRoute;state.routeCoordinates=oldCoordinates;state.activeDestination=oldDestination;state.navigationSteps=oldSteps;
  await ctx.searchRoute();
  assert.equal(state.isNavigating,true);assert.equal(state.route,oldRoute);assert.equal(state.routeCoordinates,oldCoordinates);
  assert.equal(state.activeDestination,oldDestination);assert.equal(state.navigationSteps,oldSteps);assert.equal(stats.draws,0);assert.equal(stats.starts,0);
});
