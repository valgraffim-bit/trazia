const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname, '../app.js'), 'utf8');
function setup(coordinates = [[0, 0], [0.001, 0], [0.002, 0]]) {
  const state = {isNavigating: true, routeCoordinates: coordinates, routeProgress: 0, lastLocationAccuracy: 5,
    map: {getSource() {return {setData(data) {state.display = data.geometry.coordinates;}};}}};
  const ctx = vm.createContext({state});
  for (const name of ['remainingRouteCoordinates', 'updateRouteProgress']) {
    const start = source.indexOf('  function ' + name + '(');
    vm.runInContext(source.slice(start, source.indexOf('\n  }', start) + 4), ctx);
  }
  return {ctx, state};
}
test('trims within a segment without changing the geometry used by navigation', () => {
  const {ctx, state} = setup();
  ctx.updateRouteProgress({lng: 0.0005, lat: 0});
  assert.equal(state.routeProgress, 0.5);
  assert.equal(state.display[0][0], 0.0005);
  assert.equal(state.display.length, 3);
  assert.equal(state.routeCoordinates[0][0], 0);
  ctx.updateRouteProgress({lng: 0.0015, lat: 0});
  assert.equal(state.routeProgress, 1.5);
  assert.equal(state.display.length, 2);
  ctx.updateRouteProgress({lng: 0.0014, lat: 0});
  assert.equal(state.routeProgress, 1.5);
});
test('ignores off-route, inaccurate and non-navigation fixes', () => {
  const {ctx, state} = setup();
  ctx.updateRouteProgress({lng: 0.0015, lat: 0.001});
  assert.equal(state.routeProgress, 0);
  state.lastLocationAccuracy = 100;
  ctx.updateRouteProgress({lng: 0.0015, lat: 0});
  assert.equal(state.routeProgress, 0);
  state.lastLocationAccuracy = 5;
  state.isNavigating = false;
  ctx.updateRouteProgress({lng: 0.0015, lat: 0});
  assert.equal(state.routeProgress, 0);
});
test('a crossing keeps the first matching section ahead', () => {
  const {ctx, state} = setup([[-0.001, 0], [0.001, 0], [0, -0.001], [0, 0.001]]);
  ctx.updateRouteProgress({lng: 0, lat: 0});
  assert.equal(state.routeProgress, 0.5);
});
