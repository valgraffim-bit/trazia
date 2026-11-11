export const TRAFFIC_SOURCE = 'trazia-live-traffic';
export const TRAFFIC_LAYER = 'trazia-congestion-red';
export const TRAFFIC_TILE_URL = 'https://api.tomtom.com/maps/orbis/traffic/flow/vector/tile/{z}/{x}/{y}?apiVersion=2';

export function trafficRequest(url, apiKey) {
  if (!apiKey) return { url };
  try {
    const parsed = new URL(url);
    if (parsed.origin === 'https://api.tomtom.com' && /^\/maps\/orbis\/traffic\/flow\/vector\/tile\/\d+\/\d+\/\d+$/.test(parsed.pathname)) {
      return { url, headers: { 'TomTom-Api-Key': apiKey, 'TomTom-Api-Version': '2' } };
    }
  } catch { /* Non-HTTP map resources do not receive authentication. */ }
  return { url };
}

export function congestionLayer() {
  return {
    id: TRAFFIC_LAYER, type: 'line', source: TRAFFIC_SOURCE, 'source-layer': 'Traffic flow', minzoom: 10,
    // A red segment must have an observed speed below half its free-flow
    // speed. Missing data and closures are not labelled as congestion.
    filter: ['all', ['has', 'relative_speed'], ['>=', ['get', 'relative_speed'], 0], ['<', ['get', 'relative_speed'], 0.5], ['==', ['coalesce', ['get', 'road_closure'], false], false]],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': ['step', ['get', 'relative_speed'], '#a8111d', 0.15, '#dc2430', 0.35, '#ff4747'],
      'line-width': ['interpolate', ['linear'], ['zoom'], 10, 4, 16, 12],
      'line-opacity': 0.95,
    },
  };
}
