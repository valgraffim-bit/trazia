const {chromium}=require('playwright');const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
 for(const width of [390,1024]){
  const context=await browser.newContext({viewport:{width,height:844},locale:'es-CO',serviceWorkers:'block'});const page=await context.newPage();
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.hostname==='unpkg.com'&&url.pathname.endsWith('.mjs'))return route.fulfill({contentType:'text/javascript',body:`
    export class Map {constructor(){throw Error('Simulated map');}}
    export class Popup {setDOMContent(content){this.content=content;return this;}}
    export class Marker {constructor({element}){this.element=element;}setLngLat(point){this.element.dataset.point=JSON.stringify(point);return this;}setPopup(popup){this.popup=popup;this.element.addEventListener('click',()=>document.body.append(popup.content));return this;}addTo(){document.querySelector('#trazia-map').append(this.element);return this;}remove(){this.element.remove();this.popup?.content.remove();}getElement(){return this.element;}}
   `});
   if(url.hostname!=='trazia.test')return route.abort();
   const filename=path.resolve(__dirname,'..','.'+(url.pathname==='/'?'/index.html':url.pathname));
   if(!fs.existsSync(filename))return route.fulfill({status:404,body:''});
   let body=fs.readFileSync(filename);
   if(url.pathname==='/app.js')body=Buffer.from(body.toString().replace('  initialize();',`window.__savedReady=()=>{app.classList.add('map-live');state.mapReady=true;state.map={flyTo(o){window.__fly=o;},resize(){}};renderSavedPlaceMarkers();};findDestinationCandidates=async(query)=>{window.__lastQuery=query;return window.__features||[];};searchRoute=async()=>{window.__chosen=state.selectedDestination;};\n  initialize();`));
   return route.fulfill({body,contentType:({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.png':'image/png'})[path.extname(filename)]||'application/json'});
  });
  const ready=async()=>{await page.waitForFunction(()=>window.__savedReady);await page.locator('#app-splash').waitFor({state:'hidden'});await page.evaluate(()=>window.__savedReady());};
  await page.goto('https://trazia.test/');await ready();
  for(const [id,kind,address,point] of [['home','home','Carrera 15 #12-83, Cali',[-76.52895843,3.44289173]],['work','work','Calle 12 #11-49, Cali',[-76.5301456,3.4461346]],['add','shop','Diagonal 50 #7 Oeste-12, Cali',[-76.55865753,3.41612953]]]){
   await page.evaluate(({address,point,approximate})=>window.__features=[{type:'Feature',geometry:{type:'Point',coordinates:point},properties:{name:address,housenumber:'12-83',city:'Cali',approximate}}],{address,point,approximate:id==='add'});
   await page.locator(`#quick-places [data-place-id="${id}"]`).click();
   if(id==='add'){await page.locator('#saved-place-name').fill('Mi negocio');await page.locator('#saved-place-icon').selectOption(kind);}
   await page.locator('#saved-place-address').fill(address);await page.locator('#save-place').click();
   await page.locator('#saved-place-results .saved-location-option').first().click();
   await page.locator('#saved-place-dialog').waitFor({state:'hidden'});
   const marker=page.locator(`.saved-place-marker:has(img[src$="/${kind}.png"])`);
   assert.equal(await marker.count(),1);assert.deepEqual(JSON.parse(await marker.getAttribute('data-point')),point);
   await page.waitForFunction(kind=>{const img=document.querySelector(`.saved-place-marker img[src$="/${kind}.png"]`);return img?.complete&&img.naturalWidth===128;},kind);
  }
  assert.equal(await page.locator('.saved-place-marker').count(),3);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('trazia:saved-places')));assert.equal(saved.length,3);assert.equal(saved[2].kind,'shop');assert.equal(saved[2].approximate,true);
  await page.locator('#quick-places [data-place-id="home"]').click();
  assert.deepEqual((await page.evaluate(()=>window.__chosen)).location,{lat:3.44289173,lng:-76.52895843});
  await page.locator(`#quick-places [data-place-id="${saved[2].id}"]`).click();
  assert.equal((await page.evaluate(()=>window.__chosen)).approximate,true);
  await page.reload();await ready();assert.equal(await page.locator('.saved-place-marker').count(),3);
  // Unknown addresses never silently create a marker at a guessed point.
  await page.locator('#quick-places [data-place-id="add"]').click();await page.locator('#saved-place-name').fill('No encontrado');await page.locator('#saved-place-address').fill('Dirección sin datos');
  await page.locator('#save-place').click();await page.waitForFunction(()=>!document.querySelector('#save-place').disabled);
  assert.equal(await page.locator('.saved-place-marker').count(),3);assert.equal(await page.locator('#saved-place-results .saved-location-option').count(),0);
  assert.match(await page.locator('#saved-place-results').innerText(),/No se encontró/);
  await page.locator('[data-close="saved-place-dialog"]').first().click();
  await page.evaluate(()=>{const places=JSON.parse(localStorage.getItem('trazia:saved-places'));places.push({id:'legacy',name:'Guardado antiguo',address:'Carrera 15 #12-83, Cali'});localStorage.setItem('trazia:saved-places',JSON.stringify(places));});
  await page.reload();await ready();assert.equal(await page.locator('.saved-place-marker').count(),3);
  await page.locator('#quick-places [data-place-id="legacy"]').click();
  assert.match(await page.locator('#saved-place-results').innerText(),/confirma la ubicación/);

  await context.close();
 }
 console.log('Home/work/custom PNGs, confirmed coordinates, reload persistence, direct saved routing and no-match safety passed on mobile and desktop; map/geocoders simulated.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
