const { chromium }=require('playwright');
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  for(const width of [320,390,1024]){
   const context=await browser.newContext({viewport:{width,height:844},locale:'es-CO',serviceWorkers:'block'});
   const page=await context.newPage();
   await page.addInitScript(()=>{window.__spoken=[];Object.defineProperty(window,'speechSynthesis',{value:{cancel(){},resume(){},getVoices(){return[];},speak(u){window.__spoken.push(u.text);}}});window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};});
   await page.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.hostname==='unpkg.com'&&url.pathname.endsWith('.mjs'))return route.fulfill({contentType:'text/javascript',body:'export class Map { constructor(){throw Error("Offline UI test");} }'});
    if(url.hostname!=='trazia.test')return route.abort();
    if(url.pathname==='/auth.mjs')return route.fulfill({contentType:'text/javascript',body:`export function setupAccountScreen({document}){document.querySelector('#account-screen').hidden=true;const shell=document.querySelector('.app-shell');shell.inert=false;shell.removeAttribute('aria-hidden');}`});
    const filename=path.resolve(__dirname,'..','.'+(url.pathname==='/'?'/index.html':url.pathname));
    if(!fs.existsSync(filename))return route.fulfill({status:404,body:''});
    let body=fs.readFileSync(filename);
    if(url.pathname==='/app.js')body=Buffer.from(body.toString().replace('  initialize();',`  window.__fullscreenTest=async()=>{state.mapReady=true;state.currentPosition={lat:3.45,lng:-76.53};state.lastLocationTimestamp=Date.now();state.route={};state.routeCoordinates=[[0,0],[1,1]];state.navigationSteps=[];state.map={isStyleLoaded(){return false;},resize(){},setStyle(){},stop(){},getZoom(){return 17;},easeTo(){},flyTo(){},getLayer(){return false;},getSource(){return false;}};getUserPosition=async()=>({lat:3.45,lng:-76.53});startLocationWatch=()=>{};await startNavigation();};
  initialize();`));
    return route.fulfill({body,contentType:({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.png':'image/png'})[path.extname(filename)]||'application/json'});
   });
   await page.goto('https://trazia.test/');
   await page.waitForFunction(()=>window.__fullscreenTest);
   await page.locator('#app-splash').waitFor({state:'hidden'});
   await page.evaluate(()=>window.__fullscreenTest());
   assert.equal(await page.locator('.side-panel').isVisible(),false);
   const box=await page.locator('.map-area').boundingBox();
   assert.equal(Math.round(box.width),width);assert.equal(Math.round(box.height),844);
   const finish=page.locator('#finish-navigation');assert.equal(await finish.isVisible(),true);
   const buttonBox=await finish.boundingBox();assert.ok(buttonBox.width<150&&buttonBox.height>=44);
   if(width<=820){
    for(const id of ['#open-music','#toggle-voice','#open-report-map']){
     const control=await page.locator(id).boundingBox();
     assert.ok(buttonBox.y+buttonBox.height+10<=control.y,`${id} must stay below Finish with a gap`);
     assert.ok(await page.locator(id).evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),`${id} must be tappable`);
    }
    await page.locator('#open-music').click();
    assert.equal(await page.locator('#music-shortcut-panel').isVisible(),true);
    await page.locator('#music-shortcut-close').click();
   }
   await finish.click();
   assert.equal(await page.locator('.side-panel').isVisible(),true);
   assert.equal(await finish.isVisible(),false);
   assert.equal(await page.locator('#toggle-panel').getAttribute('aria-expanded'),'false');
   assert.equal(await page.locator('#navigation-banner').isVisible(),false);
   if(width<=820){
    const mapAfter=await page.locator('.map-area').boundingBox();assert.ok(mapAfter.height>400);
    const handle=page.locator('#toggle-panel');
    for(let i=0;i<2;i++){
     await handle.click();assert.equal(await handle.getAttribute('aria-expanded'),'true');
     await page.locator('.panel-scroll').evaluate(el=>el.scrollTop=el.scrollHeight);
     assert.equal(await handle.isVisible(),true);
     await handle.click();assert.equal(await handle.getAttribute('aria-expanded'),'false');
     await page.waitForTimeout(320);
     const lowered=await page.locator('.map-area').boundingBox();assert.ok(lowered.height>400);
    }
   }

   await context.close();
  }
  console.log('Automatic full viewport navigation and finish/menu restoration passed on mobile and desktop; GPS and map simulated.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
