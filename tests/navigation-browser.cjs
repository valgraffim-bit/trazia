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
    if(url.hostname!=='trazia.test')return route.abort();
    const filename=path.resolve(__dirname,'..','.'+(url.pathname==='/'?'/index.html':url.pathname));
    if(!fs.existsSync(filename))return route.fulfill({status:404,body:''});
    let body=fs.readFileSync(filename);
    if(url.pathname==='/app.js')body=Buffer.from(body.toString().replace('  initialize();','  window.__navTest = (type, text) => { state.voiceEnabled=true; updateNavigationInstruction(text, { maneuverType: type }); document.querySelector("#navigation-banner").hidden=false; speak(text); }; window.__cameraWarningTest = (meters) => { const lat=3.38,lng=-76.5175,scale=6371000*Math.PI/180*Math.cos(lat*Math.PI/180); state.isNavigating=true; state.isRerouting=false; state.speedCameraDataset={cameras:[{id:"test-camera",lat,lng,status:"Operando"}]}; state.routeCoordinates=[[lng-0.02,lat],[lng+0.02,lat]]; announceCameraAhead({lat,lng:lng-meters/scale}); };\n  initialize();'));
    return route.fulfill({body,contentType:({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.png':'image/png'})[path.extname(filename)]||'application/json'});
   });
   await page.goto('https://trazia.test/');
   await page.waitForFunction(()=>window.__navTest);
   await page.locator('#app-splash').waitFor({state:'hidden'});
   await page.evaluate(()=>window.__navTest(10,'Gira a la derecha hacia Calle 45. Después gira a la izquierda.'));
   const banner=page.locator('#navigation-banner');
   const geometry=await banner.evaluate(el=>{const r=el.getBoundingClientRect(),toolbar=document.querySelector('.map-topbar').getBoundingClientRect(),map=document.querySelector('#trazia-map').getBoundingClientRect(),s=getComputedStyle(el);return{width:r.width,height:r.height,top:r.top,left:r.left,toolbarBottom:toolbar.bottom,mapLeft:map.left,background:s.backgroundColor,border:s.borderTopWidth,textWidth:document.querySelector('#navigation-instruction').getBoundingClientRect().width};});
   assert.ok(geometry.width<=54&&geometry.height<=54);
   assert.ok(geometry.top>geometry.toolbarBottom);
   assert.ok(geometry.left>=geometry.mapLeft&&geometry.left-geometry.mapLeft<25);
   assert.equal(await page.locator('.navigation-turn-icon').evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');
   assert.equal(geometry.background,'rgba(0, 0, 0, 0)');assert.equal(geometry.border,'0px');assert.equal(geometry.textWidth,1);
   assert.match((await page.evaluate(()=>window.__spoken)).at(-1),/Gira a la derecha/);
   assert.equal(await banner.getAttribute('data-direction'),'right');
   await page.evaluate(()=>window.__navTest(15,'Gira a la izquierda.'));
   assert.equal(await banner.getAttribute('data-direction'),'left');
   await page.evaluate(()=>window.__cameraWarningTest(495));
   const cameraAlert=page.locator('#camera-approach-alert');
   assert.equal(await cameraAlert.isVisible(),true);
   assert.equal(await page.locator('#camera-alert-distance').innerText(),'500 m');
   const cameraBox=await cameraAlert.boundingBox();
   assert.ok(cameraBox.width<=242&&cameraBox.height<70);
   assert.ok(cameraBox.y>geometry.top+geometry.height);
   await page.evaluate(()=>window.__cameraWarningTest(95));
   assert.equal(await page.locator('#camera-alert-distance').innerText(),'95 m');
   assert.match((await page.evaluate(()=>window.__spoken)).at(-1),/fotodetección a 95 metros/);
   await page.screenshot({path:`/tmp/trazia-navigation-${width}.png`});
   await page.evaluate(()=>window.__cameraWarningTest(-25));
   assert.equal(await cameraAlert.isVisible(),false);
   await context.close();
  }
  console.log('Arrow-only navigation and compact 500m camera countdown passed on mobile and desktop; speech preserved, map/services simulated.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
