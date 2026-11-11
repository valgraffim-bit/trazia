const { chromium }=require('playwright');
const {createHash}=require('node:crypto');
const key='KR15#12-83',sha=x=>createHash('sha256').update(x).digest('hex'),part=sha(key).slice(0,2),version='20261111T120000Z';
const bucketText=JSON.stringify({[key]:[['KR 15 # 12 - 83',-76.52895843,3.44289173,'San Pascual','Certificada','2026-09-03Z']]});
const manifest={schema:1,version,recordCount:1,buckets:{[part]:{path:`${version}/${part}.json`,sha256:sha(bucketText)}}};
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  for(const width of [390,1024]){
   const context=await browser.newContext({viewport:{width,height:844},locale:'es-CO',serviceWorkers:'block'});
   const page=await context.newPage();
   await page.addInitScript(()=>{window.__spoken=[];Object.defineProperty(window,'speechSynthesis',{value:{cancel(){},resume(){},getVoices(){return[];},speak(u){window.__spoken.push(u.text);}}});window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};});
   await page.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.hostname==='unpkg.com'&&url.pathname.endsWith('.mjs'))return route.fulfill({contentType:'text/javascript',body:'export class Map { constructor(){throw Error("Offline UI test");} }'});
    if(url.pathname.startsWith('/data/addresses/cali/')){
     if(process.env.TRAZIA_CALI_DB_ROOT){
      const file=path.join(process.env.TRAZIA_CALI_DB_ROOT,url.pathname.replace('/data/addresses/cali/',''));
      return route.fulfill({contentType:'application/json',body:fs.readFileSync(file)});
     }
     return route.fulfill({contentType:'application/json',body:url.pathname.endsWith('manifest.json')?JSON.stringify(manifest):bucketText});
    }
    if(url.hostname==='ws-idesc.cali.gov.co'){page.__officialCalls=(page.__officialCalls||0)+1;return route.fulfill({contentType:'application/json',body:JSON.stringify({features:page.__noOfficial?[]:[{type:'Feature',geometry:{type:'Point',coordinates:[-76.52895843,3.44289173]},properties:{nddirecc:'KR 15 # 12 - 83',ndbarrio:'San Pascual',ndestado:'Certificada',ndfechcort:'2026-09-03Z'}}]})});}
    if(url.hostname==='api.tomtom.com'){page.__tomtomCalls=(page.__tomtomCalls||0)+1;return route.fulfill({contentType:'application/json',body:JSON.stringify({results:[{type:'address',title:'Fallback',position:{coordinates:[-76.53,3.44]},address:{countryCodeIso2:'CO',street:'Carrera 15',houseNumber:'12-83',municipality:'Cali'}}]})});}
    if(url.hostname!=='trazia.test')return route.abort();
    const filename=path.resolve(__dirname,'..','.'+(url.pathname==='/'?'/index.html':url.pathname));
    if(!fs.existsSync(filename))return route.fulfill({status:404,body:''});
    let body=fs.readFileSync(filename);
    if(url.pathname==='/app.js')body=Buffer.from(body.toString().replace('  initialize();',`  window.__caliTest=async(query)=>{state.idescCache?.clear();window.TRAZIA_CONFIG={tomtomApiKey:'test'};state.tomtomCache.clear();state.currentPosition={lat:3.45,lng:-76.53};state.autocompleteQuery=query;const features=await findDestinationCandidates(query,state.currentPosition);renderDestinationSuggestions(features);};window.__selectCali=()=>{selectDestinationSuggestion(0);return state.selectedDestination;};
  initialize();`));
    return route.fulfill({body,contentType:({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.png':'image/png'})[path.extname(filename)]||'application/json'});
   });
   await page.goto('https://trazia.test/');
   await page.waitForFunction(()=>window.__caliTest);
   await page.locator('#app-splash').waitFor({state:'hidden'});
   await page.evaluate(()=>window.__caliTest('Carrera 15 # 12-83, Cali'));
   assert.match(await page.locator('#destination-suggestions').innerText(),/KR 15 # 12 - 83/);
   assert.match(await page.locator('#destination-suggestions').innerText(),/IDESC Cali · Certificada/);
   assert.match(await page.locator('.suggestion-attribution').innerText(),/CC BY-SA 4.0/);
   assert.equal(page.__tomtomCalls||0,0);
   const selected=await page.evaluate(()=>window.__selectCali());
   assert.deepEqual(selected.location,{lat:3.44289173,lng:-76.52895843});assert.equal(selected.query,'Carrera 15 # 12-83, Cali');assert.equal(selected.temporary,true);
   assert.equal(page.__officialCalls||0,0);
   await context.close();
  }
  console.log('Own database search and selection passed on mobile/desktop without upstream geocoder requests; map simulated; snapshot: ' + (process.env.TRAZIA_CALI_DB_ROOT ? 'full restored database' : 'fixture') + '');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
