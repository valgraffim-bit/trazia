const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
const mod=import('../speed-cameras.mjs');
const user={lat:3.38,lng:-76.5195};const route=[[-76.52,3.38],[-76.51,3.38]];
const camera={id:'official-fixture',lat:3.38,lng:-76.5175,status:'Operando',address:'Fixture only'};
test('validates exact camera coordinates, operating status and duplicate IDs',async()=>{
 const {cameraFeatures}=await mod;
 const features=cameraFeatures({cameras:[camera,camera,{...camera,id:'closed',status:'Vencida'},{...camera,id:'bad',lat:NaN}]}).features;
 assert.equal(features.length,1);assert.deepEqual(features[0].geometry.coordinates,[-76.5175,3.38]);
});
test('alerts only ahead and near the route, once per navigation session',async()=>{
 const {cameraAhead}=await mod;
 const behind={...camera,id:'behind',lng:-76.5199};const parallel={...camera,id:'parallel',lat:3.381};
 assert.equal(cameraAhead(user,route,[behind,parallel,camera]).id,camera.id);
 assert.equal(cameraAhead(user,route,[camera],new Set([camera.id])),null);
 assert.equal(cameraAhead(user,route,[{...camera,status:'Vencida'}]),null);
 assert.equal(cameraAhead(user,[],[camera]),null);
 assert.equal(cameraAhead({...user,lat:3.382},route,[camera]),null);
});
test('camera speech never interrupts a turn instruction',async()=>{
 const {cameraApproach}=await mod;const spoken=[];
 const state={isNavigating:true,voiceEnabled:true,speedCameraDataset:{cameras:[camera]},routeCoordinates:route,announcedCameras:new Set()};
 const elements={};const $=id=>elements[id]||(elements[id]={});
 const ctx=vm.createContext({state,cameraApproach,$,window:{speechSynthesis:{speaking:true}},speak:text=>spoken.push(text)});
 const source=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');const start=source.indexOf('  function announceCameraAhead(');
 vm.runInContext(source.slice(start,source.indexOf('\n  }',start)+4),ctx);
 ctx.announceCameraAhead(user);assert.equal(spoken.length,0);
 ctx.window.speechSynthesis.speaking=false;state.language='es';ctx.announceCameraAhead(user);ctx.announceCameraAhead(user);
 assert.equal(spoken.length,1);assert.match(spoken[0],/cámara de fotodetección/);
 assert.equal(elements['#camera-approach-alert'].hidden,false);
});
test('bundled registry is dated, points to ANSV, and PNG is a real transparent image',()=>{
 const d=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/speed-cameras.json'),'utf8'));
 assert.equal(d.source,'ANSV');assert.ok(Number.isFinite(Date.parse(d.updatedAt)));assert.ok(d.cameras.some(c=>c.city==='CALI'));assert.ok(d.cameras.every(c=>c.status==='Operando'));
 const png=fs.readFileSync(path.join(__dirname,'../assets/speed-camera.png'));assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);assert.equal(png[25],6);
});

test('camera distance counts down from 500m to arrival, repeats voice only at milestones and hides after passing',async()=>{
 const {cameraApproach}=await mod;const spoken=[],elements={};const $=id=>elements[id]||(elements[id]={});
 const lat=3.38,lng=-76.5175,scale=6371000*Math.PI/180*Math.cos(lat*Math.PI/180);
 const state={isNavigating:true,voiceEnabled:true,language:'es',speedCameraDataset:{cameras:[camera]},routeCoordinates:[[lng-0.02,lat],[lng+0.02,lat]],announcedCameras:new Set()};
 const ctx=vm.createContext({state,cameraApproach,$,window:{speechSynthesis:{speaking:false,pending:false}},speak:text=>spoken.push(text)});
 const source=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');const start=source.indexOf('  function announceCameraAhead(');
 vm.runInContext(source.slice(start,source.indexOf('\n  }',start)+4),ctx);
 const update=meters=>ctx.announceCameraAhead({lat,lng:lng-meters/scale});
 update(505);assert.equal(elements['#camera-approach-alert'].hidden,true);
 for(const meters of [500,495,400,295,200,95,50,15,0]){update(meters);assert.equal(elements['#camera-approach-alert'].hidden,false);}
 assert.equal(elements['#camera-alert-distance'].textContent,'0 m');assert.equal(spoken.length,4);
 update(-25);assert.equal(elements['#camera-approach-alert'].hidden,true);
 state.voiceEnabled=false;update(100);assert.equal(elements['#camera-approach-alert'].hidden,false);assert.equal(spoken.length,4);
 state.isNavigating=false;update(50);assert.equal(elements['#camera-approach-alert'].hidden,true);
});
