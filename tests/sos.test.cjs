const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const sos=import('../sos.mjs');
const entry=(countryCode='CO',number='123')=>({countryCode,countryName:{es:'Colombia',en:'Colombia'},number,service:{es:'Emergencias · solicita Policía',en:'Emergency services · ask for police'},source:'https://www.policia.gov.co/',verifiedAt:'2026-11-12'});
const reverse=(...codes)=>({features:codes.map(countrycode=>({properties:{countrycode}}))});

test('SOS directory preserves explicitly verified country-specific numbers without a universal fallback',async()=>{
 const {normalizeEmergencyNumbers}=await sos;
 const entries=normalizeEmergencyNumbers([entry('CO','123'),entry('US','911'),entry('ES','112'),entry('BR','190')]);
 assert.deepEqual(entries.map(value=>[value.countryCode,value.number]),[['CO','123'],['US','911'],['ES','112'],['BR','190']]);
 assert.ok(entries.every(value=>value.countryName.es&&value.countryName.en&&value.service.es&&value.service.en&&value.source.startsWith('https://')));
 assert.equal(entries.find(value=>value.countryCode==='ZZ'),undefined);
 assert.deepEqual(normalizeEmergencyNumbers([]),[]);
 for(const invalid of [undefined,null,{},'[]'])assert.throws(()=>normalizeEmergencyNumbers(invalid));
});

test('SOS directory rejects dial-string commands and unsafe sources instead of turning them into call links',async()=>{
 const {normalizeEmergencyNumbers}=await sos;
 for(const number of ['',null,123,'+123','tel:123','123#','*123','123,911','123;911','1 23','123\n911','1234567890123456789012345']){
  assert.equal(normalizeEmergencyNumbers([{...entry(),number}]).length,0,`unsafe dial string ${JSON.stringify(number)}`);
 }
 for(const source of ['',null,'javascript:alert(1)','data:text/html,unsafe','http://www.policia.gov.co/','https://user:pass@example.com/','https://']){
  assert.equal(normalizeEmergencyNumbers([{...entry(),source}]).length,0,`unsafe source ${JSON.stringify(source)}`);
 }
 for(const countryCode of ['',null,'COL','C','CO;tel:911'])assert.equal(normalizeEmergencyNumbers([{...entry(),countryCode}]).length,0);
 assert.throws(()=>normalizeEmergencyNumbers([entry(),entry('CO','911')]),'duplicate country entries cannot silently choose different call numbers');
});

test('reverse geocoding only supplies an unambiguous country code',async()=>{
 const {countryFromReverse}=await sos;
 assert.equal(countryFromReverse(reverse('CO')),'CO');
 assert.equal(countryFromReverse(reverse('co')),'CO');
 assert.equal(countryFromReverse(reverse('CO','co')),'CO');
 for(const payload of [undefined,null,{}, {features:[]},reverse(undefined),reverse(''),reverse('COL'),reverse('CO','EC')])assert.equal(countryFromReverse(payload),null);
});

test('bundled emergency directory remains unique, source-attributed and safe to use offline',async()=>{
 const {normalizeEmergencyNumbers}=await sos;
 const payload=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/emergency-numbers.json'),'utf8'));
 const entries=normalizeEmergencyNumbers(payload);
 assert.equal(entries.length,payload.length,'all shipped entries must satisfy the runtime validation');
 assert.equal(new Set(entries.map(value=>value.countryCode)).size,entries.length);
 for(const value of entries){
  assert.match(value.countryCode,/^[A-Z]{2}$/);
  assert.match(value.number,/^\d{2,4}$/);
  assert.equal(new URL(value.source).protocol,'https:');
  assert.match(value.verifiedAt,/^\d{4}-\d{2}-\d{2}$/);
 }
 for(const [countryCode,number]of [['CO','123'],['US','911'],['ES','112'],['BR','190']])assert.equal(entries.find(value=>value.countryCode===countryCode)?.number,number);
});
