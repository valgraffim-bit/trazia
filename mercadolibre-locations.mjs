// Optional Mercado Libre administrative location lookup for TRAZIA.
// This is NOT a street-address geocoder. Never collect buyer shipping addresses.
// API responses are transient and must not be bulk harvested or stored.
const API = 'https://api.mercadolibre.com';
const allowed = new Set(['CO']);
export async function getMercadoLibreColombiaLocations({ fetchFn = fetch, signal } = {}) {
  const response = await fetchFn(API + '/classified_locations/countries/CO', { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('Mercado Libre locations unavailable: ' + response.status);
  const data = await response.json();
  if (!allowed.has(data.id)) throw new Error('Unexpected country response');
  return {
    country: { id: data.id, name: data.name },
    states: (Array.isArray(data.states) ? data.states : []).filter(x => typeof x.id === 'string' && typeof x.name === 'string').map(x => ({ id: x.id, name: x.name })),
  };
}
export async function getMercadoLibreStateCities(stateId, { fetchFn = fetch, signal } = {}) {
  if (!/^CO-[A-Z0-9-]{1,30}$/i.test(stateId)) throw new Error('Invalid Colombian state ID');
  const response = await fetchFn(API + '/classified_locations/states/' + encodeURIComponent(stateId), { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('Mercado Libre state unavailable: ' + response.status);
  const data = await response.json();
  return (Array.isArray(data.cities) ? data.cities : []).filter(x => typeof x.id === 'string' && typeof x.name === 'string').map(x => ({ id: x.id, name: x.name }));
}
// These names can help disambiguate a city selected by a user.
// They must never be offered as precise GPS points or routed destinations.
