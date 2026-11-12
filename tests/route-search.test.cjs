const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname, '../app.js'), 'utf8');
for (const automatic of [false, true]) {
  test(`calculates and displays a route (${automatic ? 'rerouting' : 'initial search'})`, async () => {
    const origin = {lat: 3.42, lng: -76.53};
    const destination = {lat: 3.43, lng: -76.54};
    const state = {mapReady: true, currentPosition: origin, selectedDestination: {label: 'Destino', location: destination},
      routeRequestId: 0, autocompleteRequestId: 0, settings: {avoidFerries: true, avoidHighways: true, unpaved: 'avoid', avoidDifficult: true}, avoidTolls: true, vehicleType: 'car', language: 'es', routeCoordinates: [], isNavigating: automatic};
    const elements = new Map();
    const errors = [];
    let calls = 0;
    let draws = 0;
    const ctx = vm.createContext({state, AbortController, Intl, console: {error(...args) {errors.push(args);}},
      destinationInput: {value: 'Destino'}, $: key => {if (!elements.has(key)) elements.set(key, {}); return elements.get(key);},
      window: {clearTimeout() {}}, t: key => key,
      clearRoutePolylines() {state.routeCoordinates = [];}, updateUserMarker() {}, collapseMobilePanel() {}, setMap3d() {},
      async fetchValhallaRoute(request) {
        calls++;
        assert.equal(request.costing_options.auto.use_tolls, 0.05);
        assert.equal(request.costing_options.auto.use_ferry, 0);
        assert.equal(request.costing_options.auto.use_highways, 0);
        assert.equal(request.costing_options.auto.exclude_unpaved, true);
        assert.equal(request.costing_options.auto.maneuver_penalty, 30);
        assert.equal(request.locations[0].lat, origin.lat);
        assert.equal(request.locations[1].lon, destination.lng);
        return {ok: true, async json() {return {trip: {summary: {length: 2, time: 300}, legs: [{shape: 'test', maneuvers: []}]}};}};
      },
      decodePolyline: () => [[origin.lng, origin.lat], [destination.lng, destination.lat]],
      drawRouteOnMap() {draws++;}, updateRouteSummary() {}, saveRecentDestination() {},
      updateNavigationInstruction() {}, speak() {}, showToast() {}, getRouteErrorMessage: () => 'routeServiceError',
    });
    const start = source.indexOf('  async function searchRoute(');
    vm.runInContext(source.slice(start, source.indexOf('\n  }', start) + 4), ctx);
    await ctx.searchRoute({automatic});
    assert.equal(errors.length, 0, 'search should not throw before contacting routing service');
    assert.equal(calls, 1);
    assert.equal(draws, 1);
    assert.equal(state.route.distanceMeters, 2000);
    assert.equal(state.route.durationMillis, 300000);
    assert.equal(elements.get('#start-navigation').disabled, false);
    assert.equal(elements.get('#search-route').disabled, false);
  });
}
