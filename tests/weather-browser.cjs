const {chromium}=require('playwright');
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const overlap=(a,b)=>a&&b&&a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('https://trazia.test/**',route=>{
   const url=new URL(route.request().url());const file=path.join(root,url.pathname==='/'?'index.html':url.pathname);let body=fs.readFileSync(file);
   if(file.endsWith('.html'))body=body.toString().replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<link\b[^>]*>/g,'');
   route.fulfill({body,contentType:file.endsWith('.mjs')?'text/javascript':'text/html'});
  });
  async function setup({fail=false,source='map'}={}){
   await page.goto('https://trazia.test/');await page.addStyleTag({content:fs.readFileSync(path.join(root,'styles.css'),'utf8')});
   await page.evaluate(async({fail,source})=>{
    document.querySelector('#app-splash').hidden=true;document.querySelector('#account-screen').hidden=true;
    const shell=document.querySelector('.app-shell');shell.inert=false;shell.removeAttribute('aria-hidden');
    window.weatherClock=Date.UTC(2026,10,12,12);window.weatherContext={position:{lat:3.452,lng:-76.532},source,unit:'celsius',language:'es'};window.weatherRequests=[];window.weatherFail=fail;
    const {setupWeatherBadge}=await import('./weather.mjs');
    window.weather=setupWeatherBadge({window,document,getContext:()=>weatherContext,now:()=>weatherClock,openDialog:dialog=>dialog.showModal(),fetcher:async(url)=>{
     weatherRequests.push(String(url));if(window.weatherHold)await new Promise(resolve=>{window.releaseWeather=resolve;});if(weatherFail)throw Error('offline');
     return{ok:true,json:async()=>({current_units:{temperature_2m:'°C'},current:{temperature_2m:23.4,weather_code:61,is_day:1,time:weatherClock/1000}})};
    }});
    document.querySelectorAll('[data-close="weather-dialog"]').forEach(button=>button.addEventListener('click',()=>document.querySelector('#weather-dialog').close()));
   },{fail,source});
  }
  await setup();assert.equal(await page.evaluate(()=>weatherRequests.length),0);
  await page.evaluate(()=>weather.start());await page.waitForFunction(()=>document.querySelector('#weather-temperature').textContent.includes('23'));
  const badge=page.locator('#weather-badge');assert.match(await badge.textContent(),/23\s*°C/);assert.ok(await badge.getAttribute('aria-label'));
  const request=new URL(await page.evaluate(()=>weatherRequests[0]));assert.equal(request.hostname,'api.open-meteo.com');assert.equal(request.searchParams.get('temperature_unit'),'celsius');assert.equal(request.searchParams.get('timeformat'),'unixtime');assert.equal(request.searchParams.get('latitude'),'3.45');assert.equal(request.searchParams.get('longitude'),'-76.53');
  await page.evaluate(()=>Promise.all(Array.from({length:20},()=>weather.refresh())));assert.equal(await page.evaluate(()=>weatherRequests.length),1,'frequent location callbacks reuse current reading');
  await badge.click();assert.equal(await page.locator('#weather-dialog').isVisible(),true);assert.match(await page.locator('#weather-location').textContent(),/mapa/i);assert.match(await page.locator('#weather-updated').textContent(),/12|2026/);await page.locator('[data-close="weather-dialog"]').click();
  await page.evaluate(()=>{weatherContext.unit='fahrenheit';weather.render();});assert.match(await badge.textContent(),/74\s*°F/);assert.equal(await page.evaluate(()=>weatherRequests.length),1);
  await page.evaluate(()=>{weatherContext.unit='celsius';weather.render();});
  for(const [width,height]of [[390,844],[844,390],[320,568],[1024,768]]){
   await page.setViewportSize({width,height});const box=await badge.boundingBox();assert.ok(box&&box.width>0&&box.height>0,`weather visible at ${width}×${height}`);assert.ok(box.x>=0&&box.x+box.width<=width&&box.y>=0&&box.y+box.height<=height,`weather fits at ${width}×${height}`);
   for(const selector of ['#compass-control','#open-menu','#toggle-map-credits','.traffic-pill','#open-music','#wide-open-music']){
    const element=page.locator(selector);if(await element.isVisible())assert.equal(overlap(box,await element.boundingBox()),false,`${selector} does not cover weather at ${width}×${height}`);
   }
   await page.evaluate(()=>document.querySelector('.app-shell').classList.add('navigation-fullscreen'));
   const navigating=await badge.boundingBox();assert.ok(navigating&&navigating.x>=0&&navigating.x+navigating.width<=width);
   await page.evaluate(()=>document.querySelector('.app-shell').classList.remove('navigation-fullscreen'));
  }
  // A route summary must leave the compact weather control usable before and during navigation.
  const routeOverlaps=[];
  await page.evaluate(()=>{document.querySelector('#route-summary-overlay').hidden=false;document.querySelector('#arrival-time').textContent='5:54 p.m.';document.querySelector('#summary-distance').textContent='8,4 km';document.querySelector('#summary-duration').textContent='20 min';});
  for(const [width,height]of [[568,320],[667,375],[844,390],[1024,768]]){
   await page.setViewportSize({width,height});
   for(const navigating of [false,true]){
    await page.evaluate(active=>document.querySelector('.app-shell').classList.toggle('navigation-fullscreen',active),navigating);
    const weatherBox=await badge.boundingBox();const routeBox=await page.locator('#route-summary-overlay').boundingBox();
    if(process.env.WEATHER_PREVIEW_DIR){fs.mkdirSync(process.env.WEATHER_PREVIEW_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.WEATHER_PREVIEW_DIR,`trazia-weather-route-${width}-${navigating?'navigation':'preview'}.png`)});}
    if(overlap(weatherBox,routeBox))routeOverlaps.push({width,height,navigating,weatherBox,routeBox});
   }
  }
  await page.evaluate(()=>{document.querySelector('#route-summary-overlay').hidden=true;document.querySelector('.app-shell').classList.remove('navigation-fullscreen');});
  assert.deepEqual(routeOverlaps,[],'weather badge and route summary do not overlap');
  if(process.env.WEATHER_PREVIEW_DIR){fs.mkdirSync(process.env.WEATHER_PREVIEW_DIR,{recursive:true});for(const [width,height]of [[390,844],[844,390]]){await page.setViewportSize({width,height});await page.screenshot({path:path.join(process.env.WEATHER_PREVIEW_DIR,`trazia-weather-${width}.png`)});}}
  await page.evaluate(()=>{weatherClock+=610000;weatherFail=true;weather.refresh();});await page.waitForFunction(()=>weatherRequests.length===2);
  await page.waitForTimeout(50);assert.match(await badge.textContent(),/23\s*°C/);assert.match(await badge.getAttribute('aria-label'),/último|anterior|actualiz|conex|stale/i);
  await page.evaluate(()=>{weatherClock+=3600001;weather.render();});assert.match(await badge.textContent(),/—/);
  await page.evaluate(()=>weather.stop());const stopped=await page.evaluate(()=>weatherRequests.length);await page.evaluate(()=>weather.refresh());assert.equal(await page.evaluate(()=>weatherRequests.length),stopped);
  await setup({fail:true,source:'gps'});await page.evaluate(()=>weather.start());await page.waitForFunction(()=>weatherRequests.length===1);await page.waitForTimeout(50);
  assert.match(await page.locator('#weather-temperature').textContent(),/—/);assert.doesNotMatch(await page.locator('#weather-temperature').textContent(),/23/);await page.evaluate(()=>weather.stop());
  await setup({source:'gps'});await page.evaluate(()=>weather.start());await page.waitForFunction(()=>document.querySelector('#weather-temperature').textContent.includes('23'));await page.locator('#weather-badge').click();assert.match(await page.locator('#weather-location').textContent(),/ubicaci/i);await page.locator('[data-close="weather-dialog"]').click();
  await page.evaluate(()=>{weatherContext.position.lat=3.46;return weather.refresh();});assert.match(await badge.textContent(),/23\s*°C/);assert.match(await badge.getAttribute('aria-label'),/zona cercana/i);assert.equal(await page.evaluate(()=>weatherRequests.length),1,'nearby movement retains the reading during the request limit');
  await page.evaluate(()=>{weatherContext.position.lat=3.65;return weather.refresh();});assert.match(await badge.textContent(),/—/);assert.equal(await page.evaluate(()=>weatherRequests.length),1,'distant movement hides the old reading without bypassing the request limit');
  await page.evaluate(()=>{weatherClock+=60001;return weather.refresh();});await page.waitForFunction(()=>weatherRequests.length===2&&document.querySelector('#weather-temperature').textContent.includes('23'));assert.equal(new URL(await page.evaluate(()=>weatherRequests[1])).searchParams.get('latitude'),'3.65');assert.doesNotMatch(await badge.getAttribute('aria-label'),/zona cercana/i);await page.evaluate(()=>weather.stop());
  await setup();await page.evaluate(()=>{window.weatherHold=true;weather.start();});await page.waitForFunction(()=>typeof releaseWeather==='function');await page.evaluate(()=>{weather.stop();releaseWeather();});await page.waitForTimeout(50);assert.match(await page.locator('#weather-temperature').textContent(),/—/,'response after sign-out cannot populate current weather');
  assert.deepEqual(errors,[]);console.log('Weather: Celsius/Fahrenheit rendering, map/GPS labels, stale/offline handling, lifecycle and mobile/landscape/desktop placement OK. Weather responses mocked; no location or weather API calls performed.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
