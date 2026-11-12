import { caliAddressQuery, caliAddressFeatures } from './cali-addresses.mjs?v=63';
const ROOT = './data/addresses/cali/';
let manifestCache;
const shards = new Map();
async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
export async function findLocalCaliCandidates(query, { center, signal, fetchFn = fetch } = {}) {
  const address = caliAddressQuery(query, center);
  if (!address) return [];
  let manifest = manifestCache?.expiresAt > Date.now() ? manifestCache.data : null;
  if (!manifest) {
    const response = await fetchFn(`${ROOT}manifest.json`, { signal, cache: 'no-cache' });
    if (!response.ok) throw new Error('Local address database unavailable');
    manifest = await response.json();
    if (manifest.schema !== 1 || !/^\d{8}T\d{6}Z$/.test(manifest.version) || !manifest.buckets || !Number.isSafeInteger(manifest.recordCount) || manifest.recordCount < 1) throw new Error('Invalid address manifest');
    manifestCache = { data: manifest, expiresAt: Date.now() + 3600000 };
  }
  const part = (await sha256(address.key)).slice(0, 2);
  const info = manifest.buckets[part];
  if (!info) return [];
  if (info.path !== `${manifest.version}/${part}.json` || !/^[a-f0-9]{64}$/.test(info.sha256)) throw new Error('Invalid address bucket');
  const cacheKey = info.path;
  let rows = shards.get(cacheKey);
  if (!rows) {
    const response = await fetchFn(`${ROOT}${info.path}`, { signal });
    if (!response.ok) throw new Error('Address bucket unavailable');
    const text = await response.text();
    if (await sha256(text) !== info.sha256) throw new Error('Address bucket checksum mismatch');
    rows = JSON.parse(text);
    if (!rows || typeof rows !== 'object' || Array.isArray(rows)) throw new Error('Invalid address bucket');
    if (shards.size >= 8) shards.delete(shards.keys().next().value);
    shards.set(cacheKey, rows);
  }
  const entries = rows[address.key] || [];
  if (!Array.isArray(entries)) throw new Error('Invalid address entries');
  const features = entries.filter(row => Array.isArray(row) && row.length === 6).map(row => ({
    type: 'Feature', geometry: { type: 'Point', coordinates: [row[1], row[2]] },
    properties: { nddirecc: row[0], ndbarrio: row[3], ndestado: row[4], ndfechcort: row[5] },
  }));
  return caliAddressFeatures(features, address.key);
}
