// Adapter for IDESC's live address layer. No full cadastral records are stored.
export const CALI_WFS = 'https://ws-idesc.cali.gov.co/geoserver/wfs';
export const CALI_METADATA = 'https://mg-idesc.cali.gov.co/geonetwork/geonetwork/api/records/26efce58-37c7-44e4-9386-b925c92d17d1';
const roads = { CARRERA: 'KR', CRA: 'KR', CR: 'KR', KR: 'KR', CALLE: 'CL', CL: 'CL', AVENIDA: 'AV', AVDA: 'AV', AV: 'AV', DIAGONAL: 'DG', DIAG: 'DG', DG: 'DG', TRANSVERSAL: 'TV', TRANS: 'TV', TV: 'TV' };
function plain(value) { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase(); }
function parse(value) {
  const match = plain(value).split('(')[0].trim().replace(/\s*[-–—]\s*#\s*/g, ' # ').replace(/[.;]+$/, '').trim().match(/^(CARRERA|CRA|CR|KR|CALLE|CL|AVENIDA|AVDA|AV|DIAGONAL|DIAG|DG|TRANSVERSAL|TRANS|TV)\.?\s*(\d[A-Z0-9\s]*)\s*#\s*(\d[A-Z0-9\s]*?)\s*-\s*(\d+[A-Z]?)\s*$/);
  if (!match) return null;
  const road = roads[match[1]];
  const street = match[2].trim();
  const house = `${match[3].trim()} - ${match[4]}`;
  const key = `${road}${street}#${house}`.replace(/[^A-Z0-9#-]/g, '');
  return { road, street, house, key };
}
export function caliAddressQuery(query, center) {
  const normalized = plain(query).replace(/\s*[-–—]\s*#\s*/g, ' # ').replace(/\s+(?:SANTIAGO DE )?CALI\s*$/, ', CALI');
  const parts = normalized.split(',').map(x => x.trim()).filter(Boolean);
  const explicitCity = parts.slice(1).filter(x => !['COLOMBIA', 'VALLE DEL CAUCA'].includes(x));
  if (explicitCity.length && !explicitCity.every(x => /^(?:SANTIAGO DE )?CALI$/.test(x))) return null;
  const inCali = Number.isFinite(center?.lat) && Number.isFinite(center?.lng) && center.lat >= 3.25 && center.lat <= 3.55 && center.lng >= -76.65 && center.lng <= -76.40;
  if (!explicitCity.length && !inCali) return null;
  return parse(parts[0]);
}
export async function findCaliCandidates(query, { center, signal, fetchFn = fetch } = {}) {
  const address = caliAddressQuery(query, center);
  if (!address) return [];
  // Values are strictly parsed alphanumeric tokens, never raw user CQL.
  const tokens = `${address.street}#${address.house}`.match(/[A-Z]+|\d+|#|-/g);
  const pattern = `${address.road}%${tokens.join('%')}%`;
  const url = new URL(CALI_WFS);
  const params = { service: 'WFS', version: '2.0.0', request: 'GetFeature', typeNames: 'dapm:pdt_nmc_nomenclatura_domiciliaria', outputFormat: 'application/json', srsName: 'EPSG:4326', count: '50', propertyName: 'nddirecc,ndbarrio,ndestado,ndfechcort,the_geom', CQL_FILTER: `nddirecc ILIKE '${pattern}'` };
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetchFn(url.toString(), { signal });
  if (!response.ok) throw new Error(`IDESC unavailable (${response.status})`);
  const payload = await response.json();
  if (!Array.isArray(payload.features)) throw new Error('IDESC returned an invalid response');
  return caliAddressFeatures(payload.features, address.key);
}

export function caliAddressFeatures(features, expectedKey) {
  const seen = new Set();
  return features.filter(feature => {
    const [lng, lat] = feature.geometry?.coordinates || [];
    const source = parse(feature.properties?.nddirecc);
    if (feature.geometry?.type !== 'Point' || !Number.isFinite(lat) || !Number.isFinite(lng) || lat < 3.25 || lat > 3.55 || lng < -76.65 || lng > -76.40 || source?.key !== expectedKey) return false;
    const key = `${source.key}:${lng}:${lat}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).sort((a,b) => Number(b.properties.ndestado === 'Certificada') - Number(a.properties.ndestado === 'Certificada')).slice(0, 5).map(feature => ({
    type: 'Feature', geometry: feature.geometry,
    properties: { geocoder: 'idesc', name: feature.properties.nddirecc, fullAddress: feature.properties.nddirecc, district: feature.properties.ndbarrio || '', city: 'Cali', state: 'Valle del Cauca', country: 'Colombia', countrycode: 'CO', housenumber: parse(feature.properties.nddirecc).house, certification: feature.properties.ndestado || '', sourceDate: feature.properties.ndfechcort || '' },
  }));
}

// Offer real nearby street numbers only after exact providers fail. These are
// separate destinations, never a fabricated point for the requested address.
export function nearbyCaliAddressFeatures(features, address) {
  const prefix=address.key.slice(0,address.key.lastIndexOf('-'));
  const requested=Number(address.key.slice(address.key.lastIndexOf('-')+1).replace(/[A-Z]+$/, ''));
  const seen=new Set();
  return features.flatMap(feature=>{
    const parsed=parse(feature.properties?.nddirecc);
    if(!parsed||parsed.key===address.key||parsed.key.slice(0,parsed.key.lastIndexOf('-'))!==prefix)return [];
    const plate=Number(parsed.key.slice(parsed.key.lastIndexOf('-')+1).replace(/[A-Z]+$/, ''));
    const difference=Math.abs(plate-requested);
    if(!Number.isFinite(difference)||difference>100)return [];
    const candidate=caliAddressFeatures([feature],parsed.key)[0];
    if(!candidate||seen.has(parsed.key))return [];
    seen.add(parsed.key);
    candidate.properties.nearbyFor=address.key;
    return [{feature:candidate,difference,sameSide:plate%2===requested%2}];
  }).sort((a,b)=>Number(b.sameSide)-Number(a.sameSide)||a.difference-b.difference).slice(0,5).map(item=>item.feature);
}

export async function findNearbyCaliCandidates(query, {center,signal,fetchFn=fetch}={}) {
  const address=caliAddressQuery(query,center);
  if(!address)return [];
  const crossing=address.house.split(' - ')[0];
  const tokens=`${address.street}#${crossing}-`.match(/[A-Z]+|\d+|#|-/g);
  const params={service:'WFS',version:'2.0.0',request:'GetFeature',typeNames:'dapm:pdt_nmc_nomenclatura_domiciliaria',outputFormat:'application/json',srsName:'EPSG:4326',count:'100',propertyName:'nddirecc,ndbarrio,ndestado,ndfechcort,the_geom',CQL_FILTER:`nddirecc ILIKE '${address.road}%${tokens.join('%')}%'`};
  const url=new URL(CALI_WFS);Object.entries(params).forEach(([key,value])=>url.searchParams.set(key,value));
  const response=await fetchFn(url.toString(),{signal});
  if(!response.ok)throw new Error(`IDESC nearby unavailable (${response.status})`);
  const payload=await response.json();
  if(!Array.isArray(payload.features))throw new Error('Invalid nearby address response');
  const exact=caliAddressFeatures(payload.features,address.key);
  return exact.length?exact:nearbyCaliAddressFeatures(payload.features,address);
}
