const {test}=require('node:test');const assert=require('node:assert/strict');const {createHash}=require('node:crypto');
const sha=text=>createHash('sha256').update(text).digest('hex');
async function instance(){return import(`../local-cali-addresses.mjs?test=${Math.random()}`);}
const key='KR15#12-83',part=sha(key).slice(0,2),version='20261111T120000Z';
const text=JSON.stringify({[key]:[['KR 15 # 12 - 83',-76.52895843,3.44289173,'San Pascual','Certificada','2026-09-03Z']]});
const manifest={schema:1,version,recordCount:1,buckets:{[part]:{path:`${version}/${part}.json`,sha256:sha(text)}}};
test('searches its own snapshot without sending the query to a geocoder and caches verified buckets',async()=>{
 const {findLocalCaliCandidates}=await instance();const urls=[];
 const fetchFn=async(url)=>{urls.push(url);return{ok:true,json:async()=>manifest,text:async()=>text};};
 const rows=await findLocalCaliCandidates('Carrera 15 # 12-83, Cali',{fetchFn});
 assert.equal(rows.length,1);assert.deepEqual(rows[0].geometry.coordinates,[-76.52895843,3.44289173]);
 assert.deepEqual(urls,['./data/addresses/cali/manifest.json',`./data/addresses/cali/${version}/${part}.json`]);
 await findLocalCaliCandidates('KR 15 # 12-83, Cali',{fetchFn});assert.equal(urls.length,2);
});
test('corrupt or missing data is rejected so the app can use existing providers',async()=>{
 const {findLocalCaliCandidates}=await instance();
 await assert.rejects(findLocalCaliCandidates('KR 15 # 12-83, Cali',{fetchFn:async()=>({ok:false})}),/unavailable/);
 await assert.rejects(findLocalCaliCandidates('KR 15 # 12-83, Cali',{fetchFn:async()=>({ok:true,json:async()=>manifest,text:async()=>text+' '})}),/checksum/);
});
test('place names and other cities do not request the Cali snapshot',async()=>{
 const {findLocalCaliCandidates}=await instance();
 const settings={fetchFn(){throw Error('No request expected');}};
 assert.deepEqual(await findLocalCaliCandidates('Clínica',settings),[]);
 assert.deepEqual(await findLocalCaliCandidates('KR 15 #12-83, Bogotá',settings),[]);
});
test('a manifest cannot redirect address requests outside the local database',async()=>{
 const {findLocalCaliCandidates}=await instance();
 const altered={...manifest,buckets:{[part]:{...manifest.buckets[part],path:'https://example.com/addresses'}}};
 await assert.rejects(findLocalCaliCandidates('KR 15 #12-83, Cali',{fetchFn:async()=>({ok:true,json:async()=>altered})}),/Invalid address bucket/);
});
