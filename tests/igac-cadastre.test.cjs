const {test}=require('node:test');const assert=require('node:assert/strict');
const BASE='https://services2.arcgis.com/RVvWzU3lgJISqdke/arcgis/rest/services/CATASTRO_PUBLICO_31092026/FeatureServer';
const config={schema:1,service:BASE,itemId:'6a2c6ddbcfac43e098667594e59b7ad7',registry:17,urban:7,rural:14,period:'2026-09',municipalities:{'08078':'BARANOA','05854':'SAN CARLOS','23678':'SAN CARLOS'}};
const npn='08078'+'0'.repeat(25);
const record={attributes:{DIRECCION:'CL 27   17   83',MUNICIPIO:'08078',NUMERO_PREDIAL:npn}};
const parcel={attributes:{CODIGO:npn,codigo_municipio:'08078'},centroid:{x:-74.91911172290051,y:10.788915843568581}};
const moduleForTest=()=>import(`../igac-cadastre.mjs?test=${Math.random()}`);
function settings(records=[record],parcels=[parcel]){
 const requests=[];return{requests,fetchFn:async(url,init)=>{requests.push({url,init});if(url.startsWith('./'))return{ok:true,json:async()=>config};const u=new URL(url);return{ok:true,json:async()=>({features:u.pathname.includes('/17/')?records:parcels})};}};
}
test('requires a municipality and distinguishes homonymous municipalities by department',async()=>{
 const {igacAddressQuery}=await moduleForTest();assert.equal(igacAddressQuery('Calle 27 #17-83',config.municipalities),null);assert.equal(igacAddressQuery('Clínica, Baranoa',config.municipalities),null);
 assert.deepEqual(igacAddressQuery('CL 27 #17-83, Baranoa, Atlántico',config.municipalities).codes,['08078']);
 assert.deepEqual(igacAddressQuery('CL 27 #17-83, San Carlos, Córdoba',config.municipalities).codes,['23678']);
 assert.equal(igacAddressQuery('CL 27 #17-83, Baranoa, Huila',config.municipalities),null);
});
test('compares full address tokens without merging street digits or letter suffixes',async()=>{
 const {igacAddressQuery,matchesPredialAddress}=await moduleForTest();const query=igacAddressQuery('Calle 27 #17-83, Baranoa',config.municipalities);
 assert.equal(matchesPredialAddress('CL 27   17   83',query.tokens),true);
 for(const wrong of ['CL 2 717 83','CL 27 17 830','CL 27 B 17 83','CL 27 17 83 LOCAL 2'])assert.equal(matchesPredialAddress(wrong,query.tokens),false);
});
test('joins exact predial and municipal codes and emits only approximate geographic references',async()=>{
 const {findIgacCandidates}=await moduleForTest();const options=settings();const rows=await findIgacCandidates('Calle 27 #17-83, Baranoa, Atlántico',options);
 assert.equal(rows.length,1);assert.equal(rows[0].properties.approximate,true);assert.equal(rows[0].properties.city,'BARANOA');assert.equal(rows[0].properties.geocoder,'igac');assert.deepEqual(rows[0].geometry.coordinates,[parcel.centroid.x,parcel.centroid.y]);
 assert.ok(!JSON.stringify(rows).includes(npn));
 const requests=options.requests.filter(r=>!r.url.startsWith('./')).map(r=>new URL(r.url));assert.equal(requests.length,2);
 assert.equal(requests[0].searchParams.get('outFields'),'DIRECCION,MUNICIPIO,NUMERO_PREDIAL');assert.match(requests[0].searchParams.get('where'),/MUNICIPIO IN \('08078'\)/);
 assert.equal(requests[1].searchParams.get('outSR'),'4326');assert.equal(requests[1].searchParams.get('returnCentroid'),'true');assert.equal(requests[1].searchParams.get('returnGeometry'),'false');
});
test('rejects unrelated parcel codes, wrong municipalities and invalid coordinates',async()=>{
 const {findIgacCandidates}=await moduleForTest();
 for(const candidate of [{...parcel,attributes:{...parcel.attributes,CODIGO:'0'.repeat(30)}},{...parcel,attributes:{...parcel.attributes,codigo_municipio:'23678'}},{...parcel,centroid:{x:parcel.centroid.y,y:parcel.centroid.x}}])assert.deepEqual(await findIgacCandidates('CL 27 #17-83, Baranoa',settings([record],[candidate])),[]);
});
test('queries rural geometry when no matching urban parcel exists',async()=>{
 const {findIgacCandidates}=await moduleForTest();const options=settings();const original=options.fetchFn;options.fetchFn=async(url,init)=>url.includes('/7/query')?{ok:true,json:async()=>({features:[]})}:original(url,init);
 assert.equal((await findIgacCandidates('CL 27 #17-83, Baranoa',options)).length,1);
});
test('rejects provider errors and malicious catalog services; missing matches do not query geometry',async()=>{
 const {findIgacCandidates}=await moduleForTest();const options=settings([]);assert.deepEqual(await findIgacCandidates('CL 27 #17-83, Baranoa',options),[]);assert.equal(options.requests.length,2);
 const second=await moduleForTest();await assert.rejects(second.findIgacCandidates('CL 27 #17-83, Baranoa',{fetchFn:async()=>({ok:true,json:async()=>({...config,service:'https://example.com/FeatureServer'})})}),/Invalid cadastre catalog/);
 const third=await moduleForTest();await assert.rejects(third.findIgacCandidates('CL 27 #17-83, Baranoa',{fetchFn:async(url)=>({ok:true,json:async()=>url.startsWith('./')?config:{error:{message:'denied'}}})}),/IGAC query failed/);
});
test('preserves cancellation without showing an obsolete parcel',async()=>{
 const {findIgacCandidates}=await moduleForTest();const controller=new AbortController();const options=settings();options.signal=controller.signal;const original=options.fetchFn;options.fetchFn=async(url,init)=>{if(url.startsWith('./'))return original(url,init);controller.abort();throw new DOMException('Aborted','AbortError');};await assert.rejects(findIgacCandidates('CL 27 #17-83, Baranoa',options),{name:'AbortError'});
});

test('a failed urban query plus an empty rural query remains an outage rather than a cached no-match',async()=>{
 const {findIgacCandidates}=await moduleForTest();const options=settings();const original=options.fetchFn;
 options.fetchFn=async(url,init)=>{if(url.includes('/7/query'))throw Error('Timeout');if(url.includes('/14/query'))return{ok:true,json:async()=>({features:[]})};return original(url,init);};
 await assert.rejects(findIgacCandidates('CL 27 #17-83, Baranoa',options),/geometry unavailable/);
});
