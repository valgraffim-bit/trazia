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
    if(url.pathname.includes('/api/interpreter'))return route.fulfill({contentType:'application/json',body:JSON.stringify({elements:[{type:'node',id:1,lat:3.453,lon:-76.532,tags:{name:'Lugar de prueba','addr:street':'Calle pública','opening_hours':'24/7',phone:'+57 602 1234567',website:'https://example.com'}},{type:'node',id:2,lat:4,lon:-76.532,tags:{name:'Fuera del radio'}}]})});
    if(url.hostname==='unpkg.com' &&url.pathname.endsWith('.mjs'))return route.fulfill({contentType:'text/javascript',body:'export class Map { constructor(){throw Error("Offline UI test");} } export class Marker {setLngLat(){return this;} addTo(){return this;} remove(){}}'});
    if(url.hostname!=='trazia.test')return route.abort();
    const filename=path.resolve(__dirname,'..','.'+(url.pathname==='/'?'/index.html':url.pathname));
    if(!fs.existsSync(filename))return route.fulfill({status:404,body:''});
    let body=fs.readFileSync(filename);
    if(url.pathname==='/app.js')body=Buffer.from(body.toString().replace('  initialize();',`  window.__nearbyTest=async(category)=>{state.mapReady=true;state.currentPosition={lat:3.452,lng:-76.532};state.map={fitBounds(){},flyTo(o){window.__placeCenter=o.center;}};await searchNearby(category);};
  initialize();`));
    return route.fulfill({body,contentType:({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.png':'image/png'})[path.extname(filename)]||'application/json'});
   });
   await page.goto('https://trazia.test/');
   await page.waitForFunction(()=>window.__nearbyTest);
   await page.locator('#app-splash').waitFor({state:'hidden'});
   await page.evaluate(()=>{window.__markerCount=0;});
   for(const category of ['gas','clinic','business']){
    await page.evaluate(category=>window.__nearbyTest(category),category);
    assert.equal(await page.locator('.place-result').count(),1);
    assert.match(await page.locator('#place-results').innerText(),/10 km/);
    assert.match(await page.locator('#place-results').innerText(),/24\/7/);
    assert.equal(await page.locator('.place-result-contacts a').count(),2);
    await page.locator('.place-result-name').click();
    assert.deepEqual(await page.evaluate(()=>window.__placeCenter),[-76.532,3.453]);
   }
   await page.locator('#clear-places').click();
   assert.equal(await page.locator('#place-results').isVisible(),false);
   await context.close();
  }
  console.log('Nearby categories, 10km exclusion, contact links, map selection and clearing passed on mobile and desktop; services simulated.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
