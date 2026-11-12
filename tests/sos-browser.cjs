const {chromium}=require('playwright');
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const entries=[
 {countryCode:'CO',countryName:{es:'Colombia',en:'Colombia'},number:'123',service:{es:'Emergencias · solicita Policía',en:'Emergency services · ask for police'},source:'https://www.policia.gov.co/',verifiedAt:'2026-11-12'},
 {countryCode:'US',countryName:{es:'Estados Unidos',en:'United States'},number:'911',service:{es:'Emergencias · solicita Policía',en:'Emergency services · ask for police'},source:'https://www.911.gov/',verifiedAt:'2026-11-12'},
 {countryCode:'ES',countryName:{es:'España',en:'Spain'},number:'112',service:{es:'Emergencias · solicita Policía',en:'Emergency services · ask for police'},source:'https://europa.eu/',verifiedAt:'2026-11-12'},
 {countryCode:'BR',countryName:{es:'Brasil',en:'Brazil'},number:'190',service:{es:'Policía Militar',en:'Military Police'},source:'https://www.gov.br/',verifiedAt:'2026-11-12'},
];
const overlap=(a,b)=>a&&b&&a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},locale:'es-CO',serviceWorkers:'block'});const page=await context.newPage();const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.hostname!=='trazia.test')return route.abort();
   const file=path.join(root,url.pathname==='/'?'index.html':url.pathname);
   if(!fs.existsSync(file))return route.fulfill({status:404,body:''});
   let body=fs.readFileSync(file);if(file.endsWith('.html'))body=body.toString().replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<link\b[^>]*>/g,'');
   return route.fulfill({body,contentType:({'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/json'});
  });
  async function setup(options={}){
   await page.goto('https://trazia.test/');await page.addStyleTag({content:fs.readFileSync(path.join(root,'styles.css'),'utf8')});
   await page.evaluate(async({entries,options})=>{
    document.querySelector('#app-splash').hidden=true;document.querySelector('#account-screen').hidden=true;
    const shell=document.querySelector('.app-shell');shell.inert=false;shell.removeAttribute('aria-hidden');
    window.sosLanguage='es';window.sosOptions=options;window.sosRequests=[];window.sosPositionRequests=[];window.sosDialIntents=[];
    if(options.offline)Object.defineProperty(window.navigator,'onLine',{configurable:true,value:false});
    document.addEventListener('click',event=>{const link=event.target.closest('a[href^="tel:"]');if(link){event.preventDefault();sosDialIntents.push(link.getAttribute('href'));}},true);
    const {setupSOS}=await import('./sos.mjs');
    const config={window,document,language:()=>sosLanguage,openDialog:dialog=>dialog.showModal(),getPosition:async({request=false}={})=>{
     sosPositionRequests.push(request);if(request&&sosOptions.denyGPS)throw Error('GPS denied');return sosOptions.position||null;
    },fetcher:async(url)=>{
     sosRequests.push(String(url));if(String(url).includes('emergency-numbers')){if(sosOptions.dataFail)throw Error('Data unavailable');return{ok:true,json:async()=>entries};}
     if(sosOptions.holdReverse)await new Promise(resolve=>{window.releaseSosReverse=resolve;});
     if(sosOptions.reverseFail)throw Error('Reverse unavailable');
     return{ok:true,json:async()=>({features:(sosOptions.countries||['CO']).map(countrycode=>({properties:{countrycode}}))})};
    }};
    if(!options.loadEntries)config.entries=entries;
    window.sos=setupSOS(config);
    document.querySelector('[data-close="sos-dialog"]').addEventListener('click',()=>sos.close());
   },{entries,options});
  }
  const dialog=page.locator('#sos-dialog');const country=page.locator('#sos-country');const call=page.locator('#sos-call');
  await setup();assert.equal(await page.evaluate(()=>sosRequests.length),0,'no background geocoding');assert.equal(await call.getAttribute('href'),null);
  await page.locator('#open-sos').click();await dialog.waitFor({state:'visible'});await page.waitForFunction(()=>document.querySelector('#sos-country option[value="CO"]'));
  assert.equal(await call.getAttribute('href'),null,'no country inferred from Spanish locale or default map');assert.equal(await page.evaluate(()=>sosDialIntents.length),0);
  await country.selectOption('CO');assert.equal(await call.getAttribute('href'),'tel:123');assert.match(await call.textContent(),/123/);assert.match(await page.locator('#sos-service').textContent(),/Policía/);
  assert.equal(await page.locator('#sos-source').getAttribute('href'),'https://www.policia.gov.co/');
  assert.match(await page.locator('#sos-speaker-note').textContent(),/altavoz/i);assert.match(await page.locator('#sos-speaker-note').textContent(),/no puede|manualmente/i);
  await call.click();assert.deepEqual(await page.evaluate(()=>sosDialIntents),['tel:123'],'the explicit call link is intercepted before any phone handler runs');
  await page.evaluate(()=>sos.close());await page.locator('#open-sos').click();await page.waitForFunction(()=>document.querySelector('#sos-country option[value="US"]'));
  assert.equal(await call.getAttribute('href'),null,'reopening never silently reuses a previously chosen country');
  for(const [code,number]of [['US','911'],['ES','112'],['BR','190']]){await country.selectOption(code);assert.equal(await call.getAttribute('href'),`tel:${number}`);}
  await page.evaluate(()=>{sosLanguage='en';sos.refreshLanguage();});assert.match(await page.locator('#sos-speaker-note').textContent(),/speaker/i);assert.match(await page.locator('#sos-country option[value="US"]').textContent(),/United States/);await page.evaluate(()=>sos.close());
  await setup({position:{lat:3.45211,lng:-76.53222}});await page.locator('#open-sos').click();await page.waitForFunction(()=>document.querySelector('#sos-call').getAttribute('href')==='tel:123');
  assert.match(await page.locator('#sos-location-status').textContent(),/ubicaci|suger|detect/i);assert.deepEqual(await page.evaluate(()=>sosPositionRequests),[false]);
  const reverse=new URL(await page.evaluate(()=>sosRequests.find(url=>url.includes('/reverse'))));assert.equal(reverse.hostname,'photon.komoot.io');assert.equal(reverse.searchParams.get('lat'),'3.45');assert.equal(reverse.searchParams.get('lon'),'-76.53');assert.equal(reverse.searchParams.get('radius'),'5');assert.equal(reverse.searchParams.get('limit'),'5');assert.equal(await page.evaluate(()=>sosDialIntents.length),0);await page.evaluate(()=>sos.close());
  for(const options of [{position:{lat:1,lng:1},countries:['IN']},{position:{lat:1,lng:1},countries:['CO','BR']},{position:{lat:1,lng:1},reverseFail:true},{position:{lat:1,lng:1},offline:true},{denyGPS:true}]){
   await setup(options);await page.locator('#open-sos').click();await page.waitForTimeout(80);
   if(options.denyGPS){await page.locator('#sos-locate').click();await page.waitForTimeout(80);assert.ok((await page.evaluate(()=>sosPositionRequests)).includes(true));}
   assert.equal(await call.getAttribute('href'),null,'unknown, ambiguous, unavailable or denied location must never fall back to 112');
   if(options.offline)assert.equal(await page.evaluate(()=>sosRequests.length),0,'no geocoding request while offline');
   await country.selectOption('CO');assert.equal(await call.getAttribute('href'),'tel:123','manual country selection stays usable without geocoding');await page.evaluate(()=>sos.close());
  }
  await setup({position:{lat:3.45,lng:-76.53},holdReverse:true});await page.locator('#open-sos').click();await page.waitForFunction(()=>typeof releaseSosReverse==='function');
  await country.selectOption('US');await page.evaluate(()=>releaseSosReverse());await page.waitForTimeout(80);assert.equal(await country.inputValue(),'US');assert.equal(await call.getAttribute('href'),'tel:911','a late GPS suggestion cannot replace a manual choice');await page.evaluate(()=>sos.close());
  await setup({position:{lat:3.45,lng:-76.53},holdReverse:true});await page.locator('#open-sos').click();await page.waitForFunction(()=>typeof releaseSosReverse==='function');
  await page.evaluate(()=>{sos.close();sosOptions.position=null;sos.open();releaseSosReverse();});await page.waitForTimeout(80);assert.equal(await call.getAttribute('href'),null,'closing invalidates a late reverse response even after reopening');await page.evaluate(()=>sos.close());
  await setup({loadEntries:true,dataFail:true});await page.locator('#open-sos').click();await page.waitForTimeout(80);assert.equal(await call.getAttribute('href'),null);assert.equal(await call.getAttribute('aria-disabled'),'true');await page.evaluate(()=>sos.close());
  await setup();
  await page.evaluate(()=>{document.querySelector('#route-summary-overlay').hidden=false;document.querySelector('#arrival-time').textContent='5:54 p.m.';document.querySelector('#summary-distance').textContent='8,4 km';document.querySelector('#summary-duration').textContent='20 min';});
  const overlaps=[];
  for(const [width,height]of [[320,568],[390,844],[568,320],[844,390],[1024,768]]){
   await page.setViewportSize({width,height});
   for(const navigating of [false,true]){
    await page.evaluate(active=>{document.querySelector('.app-shell').classList.toggle('navigation-fullscreen',active);document.querySelector('#finish-navigation').hidden=!active;document.querySelector('#screen-lock-status').hidden=!active;document.querySelector('#screen-lock-status').textContent='Pantalla encendida';},navigating);
    const button=page.locator('#open-sos');const box=await button.boundingBox();assert.ok(box&&box.width>=44&&box.height>=44);assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=width&&box.y+box.height<=height,`SOS fits ${width}×${height}`);
    for(const selector of ['#weather-badge','#compass-control','#route-summary-overlay','#open-music','#wide-open-music','#open-report-map','#finish-navigation','#screen-lock-status','#speedometer','.map-action-stack']){
     const other=page.locator(selector);if(await other.isVisible()&&overlap(box,await other.boundingBox()))overlaps.push({width,height,navigating,selector,box,other:await other.boundingBox()});
    }
    assert.ok(await button.evaluate(element=>{const bounds=element.getBoundingClientRect();return element.contains(document.elementFromPoint(bounds.x+bounds.width/2,bounds.y+bounds.height/2));}),`SOS remains tappable ${width}×${height}`);
    if(process.env.SOS_PREVIEW_DIR){fs.mkdirSync(process.env.SOS_PREVIEW_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.SOS_PREVIEW_DIR,`trazia-sos-${width}-${navigating?'navigation':'preview'}.png`)});}
   }
   await page.locator('#open-sos').click();await country.selectOption('CO');const bounds=await dialog.boundingBox();assert.ok(bounds&&bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=width+1&&bounds.y+bounds.height<=height+1,`SOS dialog fits ${width}×${height}`);
   await call.scrollIntoViewIfNeeded();assert.ok(await call.isVisible());await page.evaluate(()=>sos.close());
  }
  assert.deepEqual(overlaps,[],'SOS must not cover existing navigation, weather or music controls');assert.deepEqual(errors,[]);
  console.log('SOS: verified tel links only after country selection/suggestion, no universal fallback, GPS failure/manual choice, race cancellation, truthful speaker note and mobile/landscape/desktop layout passed. All call links intercepted; no calls or external services contacted.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
