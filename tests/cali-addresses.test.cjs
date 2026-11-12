const {test}=require('node:test');const assert=require('node:assert/strict');
const mod=import('../cali-addresses.mjs');
const center={lat:3.45,lng:-76.53};
function point(address='KR 15 # 12 - 83',coords=[-76.52895843,3.44289173],status='Certificada') {return{type:'Feature',geometry:{type:'Point',coordinates:coords},properties:{nddirecc:address,ndbarrio:'San Pascual',ndestado:status,ndfechcort:'2026-09-03Z'}};}
function options(features){return{center,fetchFn:async()=>({ok:true,json:async()=>({features})})};}
test('limits official queries to complete addresses in Cali and skips place names and other cities',async()=>{
 const {caliAddressQuery,findCaliCandidates}=await mod;
 for(const query of ['Clínica de prueba','Carrera 15','Carrera 15 # 12','Carrera 15 # 12-83, Bogotá',"KR 15 # 12-83'; INCLUDE"]){assert.equal(caliAddressQuery(query,center),null);}
 assert.equal(caliAddressQuery('Carrera 15 # 12-83',null),null);
 assert.ok(caliAddressQuery('Cra. 15 # 12-83, Cali',null));
 assert.ok(caliAddressQuery('Cra. 15 # 12-83 Cali',null));
 assert.deepEqual(await findCaliCandidates('Hospital', {center,fetchFn(){throw Error('must not send names');}}),[]);
});
test('returns only exact source addresses, preserving suffixes, crossing/plate boundaries and coordinates',async()=>{
 const {findCaliCandidates}=await mod;
 const features=[point(),point('KR 15 # 1 - 283'),point('KR 115 # 12 - 83'),point('KR 15 B # 12 - 83'),point('KR 15 # 12 - 830'),point('KR 15 # 12 - 83',[3.44,-76.52]),point()];
 const matches=await findCaliCandidates('Carrera 15 # 12-83, Cali',options(features));
 assert.equal(matches.length,1);assert.equal(matches[0].properties.geocoder,'idesc');assert.equal(matches[0].properties.certification,'Certificada');
 assert.deepEqual(matches[0].geometry.coordinates,[-76.52895843,3.44289173]);
 const suffix=await findCaliCandidates('Cra. 83b 3 # 45-53, Cali',options([point('KR 83 B 3 # 45 - 53'),point('KR 83 B # 45 - 53')]));assert.equal(suffix.length,1);
});
test('queries only minimum public fields with safe CQL and WGS84, while showing source certification honestly',async()=>{
 const {findCaliCandidates}=await mod;let request;
 const settings=options([point('KR 15 # 12 - 83 (Dirección Catastral)',undefined,'Por Certificar')]);
 const mock=settings.fetchFn;settings.fetchFn=async(url,init)=>{request={url:new URL(url),init};return mock();};
 const matches=await findCaliCandidates('KR 15 # 12-83, Cali',settings);
 assert.equal(request.url.searchParams.get('srsName'),'EPSG:4326');assert.equal(request.url.searchParams.get('count'),'50');
 assert.doesNotMatch(request.url.searchParams.get('propertyName'),/ndnpn|ndnumepred|ndidpredio/);
 assert.equal(request.url.searchParams.get('CQL_FILTER'),"nddirecc ILIKE 'KR%15%#%12%-%83%'");
 assert.equal(matches[0].properties.certification,'Por Certificar');
});
test('propagates outages and cancellation for the app to use its fallback',async()=>{
 const {findCaliCandidates}=await mod;
 await assert.rejects(findCaliCandidates('KR 15 # 12-83, Cali',{center,fetchFn:async()=>({ok:false,status:503})}),/503/);
 await assert.rejects(findCaliCandidates('KR 15 # 12-83, Cali',{center,fetchFn:async()=>({ok:true,json:async()=>({})})}),/invalid/);
 const controller=new AbortController();controller.abort();
 await assert.rejects(findCaliCandidates('KR 15 # 12-83, Cali',{center,signal:controller.signal,fetchFn:async(_url,{signal})=>{assert.equal(signal,controller.signal);throw new DOMException('Aborted','AbortError');}}),{name:'AbortError'});
});

test('accepts the supplied dash-before-hash spelling without changing suffix 3 or plate 45-53',async()=>{
 const {caliAddressQuery}=await mod;
 for(const query of ['Cra 83b 3 -# 45-53, Cali','Cra 83b 3 -# 45-53., Cali','Carrera 83B3 #45-53, Cali'])assert.equal(caliAddressQuery(query,null).key,'KR83B3#45-53');
 assert.notEqual(caliAddressQuery('Cra 83B #45-53, Cali',null).key,'KR83B3#45-53');
});
test('nearby suggestions use real coordinates and distinguish actual doors from the missing requested number',async()=>{
 const {findNearbyCaliCandidates}=await mod;let url;
 const candidates=[point('KR 83 B 3 # 45 - 47',[-76.51784984,3.38404421],'Por Certificar'),point('KR 83 B 3 # 45 - 41',[-76.51790419,3.38404421]),point('KR 83 B # 45 - 53'),point('KR 183 B 3 # 45 - 53'),point('KR 83 B 3 # 145 - 53'),point('KR 83 B 3 # 45 - 900'),point('KR 83 B 3 # 45 - 49',[3.38,-76.51])];
 const matches=await findNearbyCaliCandidates('Cra 83b 3 -#45-53, Cali',{fetchFn:async value=>{url=new URL(value);return{ok:true,json:async()=>({features:candidates})};}});
 assert.equal(matches.length,2);assert.match(matches[0].properties.fullAddress,/47/);assert.equal(matches[0].properties.nearbyFor,'KR83B3#45-53');assert.equal(matches[0].properties.certification,'Por Certificar');assert.deepEqual(matches[0].geometry.coordinates,[-76.51784984,3.38404421]);assert.equal(url.searchParams.get('CQL_FILTER'),"nddirecc ILIKE 'KR%83%B%3%#%45%-%'");assert.equal(url.searchParams.get('count'),'100');
});
test('an exact address returned by the nearby query still takes priority; no nearby requests for other cities or places',async()=>{
 const {findNearbyCaliCandidates}=await mod;
 const matches=await findNearbyCaliCandidates('Cra 83B3 #45-53, Cali',options([point('KR 83 B 3 # 45 - 47'),point('KR 83 B 3 #45-53')]));assert.equal(matches.length,1);assert.equal(matches[0].properties.nearbyFor,undefined);assert.match(matches[0].properties.fullAddress,/53/);
 for(const query of ['Negocio','Cra 83B3 #45-53, Bogotá'])assert.deepEqual(await findNearbyCaliCandidates(query,{fetchFn(){throw Error('Unexpected request');}}),[]);
});
