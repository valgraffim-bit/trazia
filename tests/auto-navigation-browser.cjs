const {chromium}=require('playwright');
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
function encode(points){let lat=0,lng=0,out='';const write=value=>{let part=value<0?~(value<<1):value<<1;while(part>=32){out+=String.fromCharCode((32|(part&31))+63);part>>=5;}out+=String.fromCharCode(part+63);};for(const [x,y]of points){const nextLat=Math.round(y*1e6),nextLng=Math.round(x*1e6);write(nextLat-lat);write(nextLng-lng);lat=nextLat;lng=nextLng;}return out;}
const routePayload={trip:{summary:{length:8.4,time:1200},legs:[{shape:encode([[-76.53,3.45],[-76.525,3.455],[-76.52,3.46]]),maneuvers:[{type:10,instruction:'Gira a la derecha hacia Calle 45.',begin_shape_index:0,end_shape_index:1}]}]}};
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  for(const [width,height]of [[390,844],[844,390],[1024,768]]){
   const context=await browser.newContext({viewport:{width,height},locale:'es-CO',serviceWorkers:'block'});const page=await context.newPage();
   const errors=[],requests=[];let routingFails=false;
   page.on('pageerror',error=>errors.push(error.message));
   await page.addInitScript(()=>{window.__spoken=[];Object.defineProperty(window,'speechSynthesis',{value:{cancel(){},resume(){},getVoices(){return[];},speak(utterance){window.__spoken.push(utterance.text);}}});window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};});
   await page.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.hostname==='unpkg.com'&&url.pathname.endsWith('.mjs'))return route.fulfill({contentType:'text/javascript',body:'export class Map {}'});
    if(url.hostname.includes('valhalla')){
     if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST,GET,OPTIONS','Access-Control-Allow-Headers':'*'}});
     requests.push(route.request().method()==='POST'?route.request().postDataJSON():JSON.parse(url.searchParams.get('json')));
     return route.fulfill({status:routingFails?400:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(routingFails?{error:'Simulated route failure'}:routePayload)});
    }
    if(url.hostname!=='trazia.test')return route.abort();
    if(url.pathname==='/auth.mjs')return route.fulfill({contentType:'text/javascript',body:`export function setupAccountScreen({document}){document.querySelector('#account-screen').hidden=true;const shell=document.querySelector('.app-shell');shell.inert=false;shell.removeAttribute('aria-hidden');}`});
    const filename=path.join(root,url.pathname==='/'?'index.html':url.pathname);if(!fs.existsSync(filename))return route.fulfill({status:404,body:''});
    let body=fs.readFileSync(filename);
    if(url.pathname==='/app.js')body=Buffer.from(body.toString().replace('  initialize();',`  window.__autoNavigation={state,startNavigation,stopNavigation,prepare(denyLocation=false){
      state.mapReady=true;state.currentPosition=denyLocation?null:{lat:3.45,lng:-76.53};state.lastLocationTimestamp=denyLocation?0:Date.now();
      state.map={isStyleLoaded(){return false;},resize(){},setStyle(){},stop(){},getZoom(){return 17;},easeTo(){},flyTo(){},getLayer(){return false;},getSource(){return false;}};
      getUserPosition=async()=>{if(denyLocation)throw new Error('Geolocation denied');return state.currentPosition;};startLocationWatch=()=>{};updateUserMarker=()=>{};
      state.autocompleteQuery='Destino de prueba';destinationInput.value='Destino de prueba';
      renderDestinationSuggestions([{type:'Feature',geometry:{type:'Point',coordinates:[-76.52,3.46]},properties:{name:'Destino de prueba',city:'Cali',country:'Colombia'}}]);
    }};\n  initialize();`));
    return route.fulfill({body,contentType:({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.png':'image/png'})[path.extname(filename)]||'application/json'});
   });
   await page.goto('https://trazia.test/');await page.waitForFunction(()=>window.__autoNavigation);await page.locator('#app-splash').waitFor({state:'hidden'});
   assert.equal(await page.locator('#start-navigation').count(),0);
   await page.evaluate(()=>window.__autoNavigation.prepare());
   assert.equal(await page.evaluate(()=>window.__autoNavigation.state.isNavigating),false);
   await page.locator('#destination-suggestion-0').click();
   await page.waitForFunction(()=>window.__autoNavigation.state.isNavigating===true);
   assert.equal(await page.locator('#destination-input').inputValue(),'','accepted navigation clears the visible search');
   assert.equal(await page.evaluate(()=>window.__autoNavigation.state.selectedDestination),null);
   assert.deepEqual(await page.evaluate(()=>window.__autoNavigation.state.activeDestination.location),{lat:3.46,lng:-76.52});
   const destinationLabel=await page.evaluate(()=>window.__autoNavigation.state.routeDestination);
   assert.match(destinationLabel,/Destino de prueba/);
   assert.equal(requests.length,1);assert.equal(requests[0].locations[1].lat,3.46);assert.equal(requests[0].locations[1].lon,-76.52);
   assert.equal(await page.locator('.side-panel').isVisible(),false);assert.equal(await page.locator('#finish-navigation').isVisible(),true);
   assert.equal(await page.locator('#route-summary-overlay').isVisible(),true);
   assert.match(await page.locator('#summary-distance').textContent(),/8[,.]4 km/);assert.match(await page.locator('#summary-duration').textContent(),/20 min/);
   assert.match(await page.locator('#arrival-time').textContent(),/\d{1,2}:\d{2}/);
   assert.equal(await page.locator('#navigation-instruction').textContent(),'Gira a la derecha hacia Calle 45.');
   await page.evaluate(()=>document.querySelector('#recalculate-route').click());
   await page.waitForFunction(()=>!document.querySelector('#search-route').disabled);
   assert.equal(requests.length,2,'recalculation works with an empty search');
   assert.equal(requests[1].locations[1].lat,3.46);assert.equal(requests[1].locations[1].lon,-76.52);
   assert.equal(await page.locator('#destination-input').inputValue(),'','recalculation does not refill the search');
   assert.equal(await page.evaluate(()=>window.__autoNavigation.state.routeDestination),destinationLabel);
   assert.match(await page.locator('#summary-distance').textContent(),/8[,.]4 km/);assert.match(await page.locator('#summary-duration').textContent(),/20 min/);
   assert.match(await page.locator('#arrival-time').textContent(),/\d{1,2}:\d{2}/);
   await page.evaluate(()=>window.__autoNavigation.startNavigation());assert.equal(await page.evaluate(()=>window.__autoNavigation.state.isNavigating),true,'repeated starts do not toggle navigation off');
   if(process.env.AUTO_NAVIGATION_PREVIEW_DIR){fs.mkdirSync(process.env.AUTO_NAVIGATION_PREVIEW_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.AUTO_NAVIGATION_PREVIEW_DIR,`trazia-auto-navigation-${width}.png`)});}
   await page.locator('#finish-navigation').click();assert.equal(await page.evaluate(()=>window.__autoNavigation.state.isNavigating),false);assert.equal(await page.locator('#route-summary-overlay').isVisible(),false);
   assert.equal(await page.locator('#destination-input').inputValue(),'','stopping does not restore the previous address');
   routingFails=true;await page.evaluate(()=>window.__autoNavigation.prepare());await page.locator('#destination-suggestion-0').click();await page.waitForFunction(()=>!document.querySelector('#search-route').disabled);
   assert.equal(await page.evaluate(()=>window.__autoNavigation.state.isNavigating),false);assert.equal(await page.locator('#finish-navigation').isVisible(),false);assert.equal(await page.locator('#route-summary-overlay').isVisible(),false);
   assert.match(await page.locator('#destination-input').inputValue(),/Destino de prueba/,'failed routing keeps the chosen address available to retry');
   const attempts=requests.length;await page.evaluate(()=>window.__autoNavigation.prepare(true));await page.locator('#destination-suggestion-0').click();await page.waitForFunction(()=>!document.querySelector('#search-route').disabled);
   assert.equal(requests.length,attempts,'denied GPS never requests or starts a route');assert.equal(await page.evaluate(()=>window.__autoNavigation.state.isNavigating),false);
   assert.deepEqual(errors,[]);await context.close();
  }
  console.log('Automatic navigation: accepted routes clear search while retaining the destination, recalculation and arrival/time/km; Finish does not restore the address, repeated starts stay active, and failures preserve search without starting. Mobile/landscape/desktop checked with mocked services and location.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
