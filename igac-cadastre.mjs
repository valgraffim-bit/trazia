const DEPARTMENTS = {'05':'Antioquia','08':'Atlántico','11':'Bogotá D.C.','13':'Bolívar','15':'Boyacá','17':'Caldas','18':'Caquetá','19':'Cauca','20':'Cesar','23':'Córdoba','25':'Cundinamarca','27':'Chocó','41':'Huila','44':'La Guajira','47':'Magdalena','50':'Meta','52':'Nariño','54':'Norte de Santander','63':'Quindío','66':'Risaralda','68':'Santander','70':'Sucre','73':'Tolima','76':'Valle del Cauca','81':'Arauca','85':'Casanare','86':'Putumayo','88':'San Andrés y Providencia','91':'Amazonas','94':'Guainía','95':'Guaviare','97':'Vaupés','99':'Vichada'};
const ROADS = {CL:'CL',C:'CL',CALLE:'CL',KR:'KR',CR:'KR',CRA:'KR',K:'KR',CARRERA:'KR',AV:'AV',AVDA:'AV',AVENIDA:'AV',DG:'DG',DIAG:'DG',DIAGONAL:'DG',TV:'TV',TRANS:'TV',TRANSVERSAL:'TV'};
const fold = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
function tokens(value) {
  const parts = fold(value).match(/[A-Z]+|\d+/g) || [];
  if (ROADS[parts[0]]) parts[0] = ROADS[parts[0]];
  return parts;
}
export function igacAddressQuery(query, municipalities) {
  const parts = String(query || '').split(',').map(value => value.trim()).filter(Boolean);
  if (parts.length < 2 || !/^(?:CALLE|CL|C|CARRERA|CRA|CR|KR|K|AVENIDA|AVDA|AV|DIAGONAL|DIAG|DG|TRANSVERSAL|TRANS|TV)\.?\s*\d[A-Z\d\s]*#\s*\d[A-Z\d\s]*-\s*\d+[A-Z]?$/i.test(fold(parts[0]))) return null;
  const city = fold(parts[1]).replace(/^MUNICIPIO DE /, '');
  const department = parts[2] && fold(parts[2]) !== 'COLOMBIA' ? fold(parts[2]) : null;
  const codes = Object.entries(municipalities).filter(([code,name]) => /^\d{5}$/.test(code) && fold(name) === city && (!department || fold(DEPARTMENTS[code.slice(0,2)]) === department)).map(([code])=>code);
  if (!codes.length) return null;
  return { codes, tokens: tokens(parts[0]) };
}
export function matchesPredialAddress(address, expected) {
  const actual = tokens(address);
  return actual.length === expected.length && actual.every((part,index)=>part === expected[index]);
}
let catalog;
export async function findIgacCandidates(query, { signal, fetchFn = fetch } = {}) {
  // Named places and queries without a municipality stay with the existing providers.
  if (!String(query).includes('#') || !String(query).includes(',')) return [];
  if (!catalog || catalog.expiresAt < Date.now()) {
    const response = await fetchFn('./data/cadastre/igac.json', { signal, cache: 'no-cache' });
    if (!response.ok) throw new Error('Cadastre catalog unavailable');
    const data = await response.json();
    if (data.schema !== 1 || !/^https:\/\/services2\.arcgis\.com\/RVvWzU3lgJISqdke\/arcgis\/rest\/services\/[A-Za-z0-9_]+\/FeatureServer$/.test(data.service) || !/^[a-f0-9]{32}$/.test(data.itemId) || !data.municipalities || !['registry','urban','rural'].every(key=>Number.isSafeInteger(data[key])&&data[key]>=0)) throw new Error('Invalid cadastre catalog');
    catalog = { data, expiresAt: Date.now() + 3600000 };
  }
  const config = catalog.data;
  const parsed = igacAddressQuery(query, config.municipalities);
  if (!parsed) return [];
  const request = async(layer,params)=>{
    const url = new URL(`${config.service}/${layer}/query`);
    Object.entries({f:'json',...params}).forEach(([key,value])=>url.searchParams.set(key,String(value)));
    const response = await fetchFn(url.toString(), { signal });
    if (!response.ok) throw new Error(`IGAC unavailable (${response.status})`);
    const payload = await response.json();
    if (payload.error || !Array.isArray(payload.features)) throw new Error('IGAC query failed');
    return payload.features;
  };
  const aliases = Object.keys(ROADS).filter(road=>ROADS[road]===parsed.tokens[0]);
  const pattern = parsed.tokens.slice(1).join('%');
  const where = `MUNICIPIO IN (${parsed.codes.map(code=>`'${code}'`).join(',')}) AND (${aliases.map(alias=>`UPPER(DIRECCION) LIKE '${alias}%${pattern}%'`).join(' OR ')})`;
  const rows = await request(config.registry,{where,outFields:'DIRECCION,MUNICIPIO,NUMERO_PREDIAL',returnGeometry:false,resultRecordCount:50});
  const matches = rows.map(row=>row.attributes || {}).filter(row=>parsed.codes.includes(row.MUNICIPIO) && /^\d{30}$/.test(row.NUMERO_PREDIAL) && row.NUMERO_PREDIAL.startsWith(row.MUNICIPIO) && matchesPredialAddress(row.DIRECCION,parsed.tokens)).slice(0,10);
  if (!matches.length) return [];
  const codes = [...new Set(matches.map(row=>row.NUMERO_PREDIAL))];
  const geometryWhere = `CODIGO IN (${codes.map(code=>`'${code}'`).join(',')})`;
  let parcels = []; let completedGeometry = false;
  for (const layer of [config.urban,config.rural]) {
    try {
      const rows = await request(layer,{where:geometryWhere,outFields:'CODIGO,codigo_municipio',returnGeometry:false,returnCentroid:true,outSR:4326,resultRecordCount:20});
      completedGeometry = true;
      parcels = rows.filter(parcel=>matches.some(row=>row.NUMERO_PREDIAL===parcel.attributes?.CODIGO && row.MUNICIPIO===parcel.attributes.codigo_municipio) && Number.isFinite(parcel.centroid?.x) && Number.isFinite(parcel.centroid?.y) && parcel.centroid.x>=-82 && parcel.centroid.x<=-66 && parcel.centroid.y>=-5 && parcel.centroid.y<=14);
      if (parcels.length) break;
    } catch (error) { if (signal?.aborted) throw error; }
  }
  if (!completedGeometry) throw new Error('IGAC geometry unavailable');
  const seen = new Set();
  return matches.flatMap(row=>{
    const name = config.municipalities[row.MUNICIPIO];
    return parcels.filter(parcel=>parcel.attributes?.CODIGO===row.NUMERO_PREDIAL && parcel.attributes.codigo_municipio===row.MUNICIPIO).flatMap(parcel=>{
      const {x:lng,y:lat} = parcel.centroid || {};
      if (!Number.isFinite(lng)||!Number.isFinite(lat)||lng < -82||lng > -66||lat < -5||lat > 14) return [];
      const key = `${row.MUNICIPIO}:${lat}:${lng}`;if(seen.has(key))return[];seen.add(key);
      return [{type:'Feature',geometry:{type:'Point',coordinates:[lng,lat]},properties:{geocoder:'igac',name:row.DIRECCION,fullAddress:row.DIRECCION,city:name,state:DEPARTMENTS[row.MUNICIPIO.slice(0,2)]||'',country:'Colombia',countrycode:'CO',housenumber:parsed.tokens.at(-1),approximate:true,sourcePeriod:config.period,sourceItem:config.itemId}}];
    });
  }).slice(0,5);
}
