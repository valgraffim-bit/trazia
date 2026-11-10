function normalized(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/\b(?:cra|cr|kr)\b\.?/g, 'carrera').replace(/\bcl\b\.?/g, 'calle')
    .replace(/\b(?:av|avda)\b\.?/g, 'avenida').replace(/[^\p{L}\p{N}]/gu, '');
}

export async function findTomtomCandidates(query, { apiKey, center, signal, expectedAddress, language = 'es', fetchFn = fetch } = {}) {
  if (!apiKey) return [];
  const url = new URL('https://api.tomtom.com/maps/orbis/places/geocode');
  url.searchParams.set('query', query);
  url.searchParams.set('countryCodesIso2', 'CO');
  url.searchParams.set('maxResults', '5');
  if (Number.isFinite(center?.lat) && Number.isFinite(center?.lng)) url.searchParams.set('position', `${center.lng},${center.lat}`);
  let response;
  try {
    response = await fetchFn(url.toString(), { signal, headers: {
      Accept: 'application/json', 'Accept-Language': language === 'es' ? 'es-CO' : 'en-US',
      'TomTom-Api-Key': apiKey, 'TomTom-Api-Version': '2', Attributes: 'results',
    } });
  } catch (error) {
    if (signal?.aborted) throw error;
    // Do not expose fetch URLs, credential headers, or upstream error bodies.
    throw new Error('TomTom connection unavailable');
  }
  if (!response.ok) throw new Error(`TomTom unavailable (${response.status})`);
  const payload = await response.json();
  if (!Array.isArray(payload.results)) throw new Error('TomTom returned an invalid response');
  return payload.results.filter(result => {
    const a = result.address || {};
    const [lng, lat] = result.position?.coordinates || [];
    if (String(a.countryCodeIso2).toUpperCase() !== 'CO' || !Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lng) > 180 || Math.abs(lat) > 90) return false;
    if (!['address', 'street', 'intersection', 'area'].includes(result.type)) return false;
    if (expectedAddress) {
      // Preserve numeric suffixes: Carrera 83B 3 must never become Carrera 83B.
      if (result.type !== 'address' || normalized(a.street) !== normalized(expectedAddress.street) || normalized(a.houseNumber) !== normalized(expectedAddress.houseNumber)) return false;
      if (expectedAddress.city && normalized(a.municipality) !== normalized(expectedAddress.city)) return false;
    }
    return true;
  }).map(result => ({
    type: 'Feature', geometry: { type: 'Point', coordinates: result.position.coordinates.slice(0, 2) },
    properties: {
      geocoder: 'tomtom', name: result.title || '', street: result.address.street || '',
      housenumber: result.address.houseNumber || '', district: result.address.municipalitySubdivision || '',
      city: result.address.municipality || '', state: result.address.countrySubdivision || '',
      country: result.address.country || 'Colombia', countrycode: 'CO',
    },
  }));
}
