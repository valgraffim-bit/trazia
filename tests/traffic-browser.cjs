const {chromium}=require('playwright');const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({locale:'es-CO',viewport:{width:390,height:844},serviceWorkers:'block'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.hostname==='unpkg.com'&&u.pathname.endsWith('.mjs'))return route.fulfill({contentType:'text/javascript',body:'export class Map{constructor(){throw Error("Offline traffic UI test");}} export class Marker{setLngLat(){return this;}addTo(){return this;}remove(){}}'});
   if(u.hostname!=='trazia.test')return route.abort();
   if(u.pathname==='/config.js')return route.fulfill({contentType:'text/javascript',body:'window.TRAZIA_CONFIG={tomtomApiKey:"test-browser-key"};'});
   const file=path.resolve(__dirname,'..','.'+(u.pathname==='/'?'/index.html':u.pathname));
   if(!fs.existsSync(file))return route.fulfill({status:404,body:''});
   let body=fs.readFileSync(file);
   if(u.pathname==='/app.js')body=Buffer.from(body.toString().replace('  initialize();',`  window.__trafficTest=()=>{
     const layers=[{id:'labels',type:'symbol'}],sources={};
     state.mapReady=true;state.liveTrafficEnabled=true;
     state.map={isStyleLoaded:()=>true,getStyle:()=>({layers}),getSource:id=>sources[id],addSource:(id,s)=>{sources[id]={...s,setTiles(){}};},removeSource:id=>{delete sources[id];},getLayer:id=>layers.find(l=>l.id===id),removeLayer:id=>{const i=layers.findIndex(l=>l.id===id);if(i>=0)layers.splice(i,1);},addLayer:(l,before)=>{const i=layers.findIndex(x=>x.id===before);layers.splice(i<0?layers.length:i,0,l);},moveLayer:(id,before)=>{const i=layers.findIndex(l=>l.id===id),l=layers.splice(i,1)[0],j=layers.findIndex(l=>l.id===before);layers.splice(j<0?layers.length:j,0,l);}};
     renderLiveTraffic();
     state.routeCoordinates=[[-76.53,3.45],[-76.52,3.45]];drawRouteOnMap();
     window.__trafficObjects={layers,sources};
     return {layers:layers.map(l=>l.id),source:sources[TRAFFIC_SOURCE],status:document.querySelector('#live-traffic-status').textContent};
   };\n  initialize();`));
   return route.fulfill({body,contentType:({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json'})[path.extname(file)]||'application/json'});
  });
  await page.goto('https://trazia.test/');await page.waitForFunction(()=>window.__trafficTest);await page.locator('#app-splash').waitFor({state:'hidden'});
  const first=await page.evaluate(()=>window.__trafficTest());
  const outline=first.layers.indexOf('trazia-route-outline'),line=first.layers.indexOf('trazia-route-line');
  assert.ok(first.layers.indexOf('trazia-congestion-red')<outline,'traffic stays below the route outline');
  assert.ok(first.layers.indexOf('labels')<outline,'map labels stay below the route outline');
  assert.ok(outline<line,'purple route stays above its outline');
  if(first.layers.includes('trazia-speed-cameras'))assert.ok(line<first.layers.indexOf('trazia-speed-cameras'),'camera icons stay visible above the route');
  assert.equal(first.source.type,'vector');assert.equal(first.source.tiles[0].includes('test-browser-key'),false);
  await page.locator('#open-settings').click();await page.locator('#live-traffic-toggle').uncheck();
  const hidden=await page.evaluate(()=>({hasLayer:window.__trafficObjects.layers.some(l=>l.id==='trazia-congestion-red'),hasSource:Boolean(window.__trafficObjects.sources['trazia-live-traffic']),preference:localStorage.getItem('trazia:live-traffic')}));
  assert.deepEqual(hidden,{hasLayer:false,hasSource:false,preference:'off'});
  await page.locator('#live-traffic-toggle').check();
  assert.ok(await page.evaluate(()=>window.__trafficObjects.layers.some(l=>l.id==='trazia-congestion-red')));
  assert.deepEqual(errors,[]);
  console.log('Traffic mobile UI passed: toggle, preference, source auth and purple route above map labels and traffic; map mocked.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
