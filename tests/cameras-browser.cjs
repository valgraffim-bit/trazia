const {chromium}=require('playwright');const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({locale:'es-CO',viewport:{width:390,height:844},serviceWorkers:'block'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.hostname==='unpkg.com'&&url.pathname.endsWith('.mjs'))return route.fulfill({contentType:'text/javascript',body:'export class Map { constructor(){throw Error("Offline test");} }'});
   if(url.hostname!=='trazia.test')return route.abort();
   const file=path.resolve(__dirname,'..','.'+(url.pathname==='/'?'/index.html':url.pathname));
   if(!fs.existsSync(file))return route.fulfill({status:404,body:''});
   let body=fs.readFileSync(file);
   if(url.pathname==='/app.js')body=Buffer.from(body.toString().replace('  initialize();',`  window.__cameraTest = async () => {
     const sources = {}, layers = {}, images = {}; let callbacks = 0;
     state.mapReady = true;
     state.map = {
       isStyleLoaded: () => true, hasImage: id => Boolean(images[id]),
       loadImage: async url => { const image = new Image(); image.src = url; await image.decode(); return {data:image}; },
       addImage: (id, image, options) => { images[id] = {width:image.width,height:image.height,pixelRatio:options.pixelRatio}; },
       getSource: id => sources[id], addSource: (id, source) => {sources[id] = {...source,setData(data){this.data=data;}};},
       getLayer: id => layers[id], addLayer: layer => {layers[layer.id]=layer;}, on: () => {callbacks++;}
     };
     await renderSpeedCameras(); await renderSpeedCameras();
     return {source:sources['trazia-speed-cameras'].data,layer:layers['trazia-speed-cameras'],image:images['trazia-camera-png'],callbacks};
   };\n  initialize();`));
   return route.fulfill({body,contentType:({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/json'});
  });
  await page.goto('https://trazia.test/');await page.waitForFunction(()=>window.__cameraTest);
  const result=await page.evaluate(()=>window.__cameraTest());
  const expected=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/speed-cameras.json'),'utf8')).cameras;
  assert.equal(result.source.features.length,expected.length);
  assert.deepEqual(result.source.features[0].geometry.coordinates,[expected[0].lng,expected[0].lat]);
  assert.equal(result.layer.type,'symbol');assert.equal(result.layer.minzoom,10);
  assert.equal(result.image.width,96);assert.equal(result.image.pixelRatio,4);
  assert.equal(result.callbacks,1);assert.deepEqual(errors,[]);
  console.log('Camera browser test passed: actual PNG loaded, official points retain exact coordinates, 24px symbols, event handler registered once; map rendering simulated.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
