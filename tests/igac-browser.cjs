const { chromium }=require('playwright');
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
    if(url.hostname==='ws-idesc.cali.gov.co')return route.fulfill({contentType:'application/json',body:JSON.stringify({features:page.__noOfficial?[]:[{type:'Feature',geometry:{type:'Point',coordinates:[-76.52895843,3.44289173]},properties:{nddirecc:'KR 15 # 12 - 83',ndbarrio:'San Pascual',ndestado:'Certificada',ndfechcort:'2026-09-03Z'}}]})});
    if(url.hostname==='services2.arcgis.com'){
     if(url.pathname.includes('/17/')&&!page.__noPredial)await new Promise(resolve=>setTimeout(resolve,3000));
     const npn='08078'+'0'.repeat(25);
     const features=page.__noPredial?[]:url.pathname.includes('/17/')?[{attributes:{DIRECCION:'CL 27   17   83',MUNICIPIO:'08078',NUMERO_PREDIAL:npn}}]:[{attributes:{CODIGO:npn,codigo_municipio:'08078'},centroid:{x:-74.91911172290051,y:10.788915843568581}}];
     return route.fulfill({contentType:'application/json',body:JSON.stringify({features})});
    }
    if(url.hostname==='api.tomtom.com'){page.__tomtomCalls=(page.__tomtomCalls||0)+1;return route.fulfill({contentType:'application/json',body:JSON.stringify({results:[{type:'address',title:'Fallback',position:{coordinates:[-76.53,3.44]},address:{countryCodeIso2:'CO',street:'Calle 27',houseNumber:'17-83',municipality:'Baranoa'}}]})});}
    if(url.hostname!=='trazia.test')return route.abort();
    const filename=path.resolve(__dirname,'..','.'+(url.pathname==='/'?'/index.html':url.pathname));
    if(!fs.existsSync(filename))return route.fulfill({status:404,body:''});
    let body=fs.readFileSync(filename);
    if(url.pathname==='/app.js')body=Buffer.from(body.toString().replace('  initialize();',`  window.__caliTest=async(query)=>{state.idescCache?.clear();state.igacCache?.clear();window.TRAZIA_CONFIG={tomtomApiKey:'test'};state.tomtomCache.clear();state.currentPosition={lat:3.45,lng:-76.53};state.autocompleteQuery=query;const features=await findDestinationCandidates(query,state.currentPosition);renderDestinationSuggestions(features);};window.__selectCali=()=>{selectDestinationSuggestion(0);return state.selectedDestination;};
  initialize();`));
    return route.fulfill({body,contentType:({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.png':'image/png'})[path.extname(filename)]||'application/json'});
   });
   await page.goto('https://trazia.test/');
   await page.waitForFunction(()=>window.__caliTest);
   await page.locator('#app-splash').waitFor({state:'hidden'});
   await page.evaluate(()=>window.__caliTest('Calle 27 # 17-83, Baranoa, Atlántico'));
   assert.match(await page.locator('#destination-suggestions').innerText(),/CL 27/);
   assert.match(await page.locator('#destination-suggestions').innerText(),/IGAC · Referencia del predio; acceso por confirmar/);
   assert.match(await page.locator('.suggestion-attribution').innerText(),/CC BY-SA 4.0/);
   assert.equal(page.__tomtomCalls||0,0);
   const selected=await page.evaluate(()=>window.__selectCali());
   assert.deepEqual(selected.location,{lat:10.788915843568581,lng:-74.91911172290051});assert.equal(selected.query,'Calle 27 # 17-83, Baranoa, Atlántico');assert.equal(selected.temporary,true);assert.equal(selected.approximate,true);
   page.__noPredial=true;
   await page.evaluate(()=>window.__caliTest('Calle 27 # 17-83, Baranoa, Atlántico'));
   assert.equal(page.__tomtomCalls,1);
   assert.match(await page.locator('.suggestion-attribution').innerText(),/TomTom/);
   await context.close();
  }
  console.log('Predial address query, parcel-reference label, source attribution, selection and fallback passed on mobile/desktop; providers/map simulated.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
