const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { readFileSync } = require('node:fs');
const source = readFileSync(require('node:path').join(__dirname, '../app.js'), 'utf8');
function add(context, name) {
 const start=source.search(new RegExp(`  (?:async )?function ${name}\\(`));
 vm.runInContext(source.slice(start,source.indexOf('\n  }',start)+4),context);
}
test('uses Valhalla maneuver codes for left, right, straight, roundabout and U-turn',()=>{
 const ctx=vm.createContext({});add(ctx,'navigationArrow');
 for(const [code,kind] of [[8,'straight'],[10,'right'],[15,'left'],[9,'slight-right'],[16,'slight-left'],[12,'uturn-right'],[13,'uturn-left'],[26,'roundabout']]) {
  const arrow=ctx.navigationArrow(code,'Gira a la derecha. Después gira a la izquierda.');
  assert.equal(arrow.kind,kind);assert.ok(arrow.path);
 }
 assert.equal(ctx.navigationArrow(undefined,'Gira a la derecha. Después gira a la izquierda.').kind,'right');
});
test('starting navigation shows the correct arrow while speaking the full instruction',async()=>{
 const spoken=[];
 const elements=new Map();
 const $=selector=>{if(!elements.has(selector))elements.set(selector,{textContent:'',dataset:{},hidden:true,setAttribute(name,value){this[name]=value;}});return elements.get(selector);};
 const instruction='Gira a la derecha hacia Calle 45. Después gira a la izquierda hacia Carrera 83C.';
 const ctx=vm.createContext({ $,destinationInput:{value:'Destino',blur(){}},closeDestinationSuggestions(){},state:{announcedCameras:new Set(),mapReady:true,route:{},routeCoordinates:[[0,0],[1,1]],navigationSteps:[{maneuverType:10,instructions:instruction}],voiceEnabled:true,language:'es',map:{flyTo(){}},is3d:true},
  window:{speechSynthesis:{cancel(){},resume(){},getVoices(){return[];},speak(u){spoken.push(u.text);}},SpeechSynthesisUtterance:class{constructor(text){this.text=text;}}},
  navigator:{},t:key=>key,showToast(){},setNavigationView(){},requestNavigationWakeLock(){},releaseNavigationWakeLock(){},collapseMobilePanel(){},updateRouteProgress(){},setMap3d(){},getUserPosition:async()=>({lat:3.4,lng:-76.5}),compassBearing:()=>0,mobileMapOffset:()=>[0,0],console});
 for(const name of ['navigationArrow','updateNavigationInstruction','speak','clearNavigationSearch','startNavigation'])add(ctx,name);
 await ctx.startNavigation();
 assert.equal($('#navigation-banner').hidden,false);
 assert.equal($('#navigation-banner').dataset.direction,'right');
 assert.equal($('#navigation-instruction').textContent,instruction);
 assert.equal(spoken.at(-1),instruction);
 assert.equal(ctx.state.isNavigating,true);
 assert.equal(ctx.destinationInput.value,'');
});
test('stopping navigation clears the purple route and cancels late calculations, preserving traffic and cameras',()=>{
 const layers=new Set(['trazia-route-line','trazia-route-outline','trazia-congestion-red','trazia-speed-cameras']);
 const sources=new Set(['trazia-route']);let aborted=0,markerRemoved=0;
 const elements=new Map();const $=selector=>{if(!elements.has(selector))elements.set(selector,{});return elements.get(selector);};
 const state={isNavigating:true,isRerouting:false,routeRequestId:7,routeSearchController:{abort(){aborted++;}},routeCoordinates:[[1,2],[3,4]],route:{},navigationSteps:[{}],currentRoutes:[{}],destinationMarker:{remove(){markerRemoved++;}},map:{stop(){},getLayer:id=>layers.has(id),removeLayer:id=>layers.delete(id),getSource:id=>sources.has(id),removeSource:id=>sources.delete(id)}};
 const ctx=vm.createContext({state,$,window:{speechSynthesis:{cancel(){}}},t:k=>k,setNavigationView(){},requestNavigationWakeLock(){},releaseNavigationWakeLock(){},showToast(){}});
 for(const name of ['clearRoutePolylines','stopNavigation'])add(ctx,name);
 ctx.stopNavigation();
 assert.equal(state.routeCoordinates.length,0);assert.equal(state.route,null);
 assert.equal(state.navigationSteps.length,0);assert.equal(state.routeRequestId,8);assert.equal(aborted,1);assert.equal(markerRemoved,1);
 assert.equal(layers.has('trazia-route-line'),false);assert.equal(layers.has('trazia-route-outline'),false);assert.equal(sources.has('trazia-route'),false);
 assert.equal(layers.has('trazia-congestion-red'),true);assert.equal(layers.has('trazia-speed-cameras'),true);
 assert.equal($('#navigation-banner').hidden,true);assert.equal($('#camera-approach-alert').hidden,true);assert.equal($('#route-summary-overlay').hidden,true);assert.equal(elements.has('#start-navigation'),false);
});

function startingSetup(getPosition) {
 const elements=new Map();const $=selector=>{if(!elements.has(selector))elements.set(selector,{hidden:true});return elements.get(selector);};
 const stats={views:0,watches:0,flights:0,messages:[],progress:0,stops:0,clears:0};
 const state={announcedCameras:new Set(),mapReady:true,route:{},routeRequestId:7,routeCoordinates:[[0,0],[1,1]],navigationSteps:[],isNavigating:false,map:{flyTo(){stats.flights++;}},is3d:true};
 const ctx=vm.createContext({$,state,destinationInput:{value:'Destino',blur(){}},closeDestinationSuggestions(){stats.clears++;},window:{speechSynthesis:{resume(){}}},navigator:{geolocation:{watchPosition(){}}},t:key=>key,
  speak(){},showToast(message){stats.messages.push(message);},setNavigationView(value){if(value)stats.views++;},requestNavigationWakeLock(){},
  collapseMobilePanel(){},setMap3d(){},startLocationWatch(){stats.watches++;},updateRouteProgress(){stats.progress++;},
  getUserPosition:getPosition|| (async()=>({lat:3.4,lng:-76.5})),compassBearing:()=>0,mobileMapOffset:()=>[0,0],updateNavigationInstruction(){},
  stopNavigation(){stats.stops++;},console});
 add(ctx,'clearNavigationSearch');add(ctx,'startNavigation');return{ctx,state,stats,$};
}
test('automatic navigation reuses the route origin, then repeat starts preserve active guidance',async()=>{
 let gpsRequests=0;const {ctx,state,stats}=startingSetup(async()=>{gpsRequests++;throw Error('No second GPS request expected');});
 const position={lat:3.4,lng:-76.5};await ctx.startNavigation({position,requestId:7});await ctx.startNavigation({position,requestId:7});
 assert.equal(state.isNavigating,true);assert.equal(gpsRequests,0);assert.equal(stats.views,1);assert.equal(stats.watches,1);assert.equal(stats.stops,0);
 assert.equal(ctx.destinationInput.value,'');assert.equal(stats.clears,1);
});
test('a denied GPS request does not activate guidance',async()=>{
 const {ctx,state,stats,$}=startingSetup(async()=>{throw Error('Permission denied');});await ctx.startNavigation();
 assert.equal(state.isNavigating,false);assert.equal(stats.views,0);assert.equal(stats.watches,0);assert.equal($('#navigation-banner').hidden,true);assert.ok(stats.messages.includes('navigationLocation'));
});
test('a late GPS fix cannot restart navigation after Stop or a newer route request',async()=>{
 for(const invalidate of [state=>{state.routeRequestId++;state.route=null;},state=>{state.routeRequestId++;},state=>{state.route={};},state=>{state.routeSearchController={signal:{aborted:true}};}]){
  let resolve;const {ctx,state,stats}=startingSetup(()=>new Promise(r=>resolve=r));const pending=ctx.startNavigation();
  invalidate(state);resolve({lat:3.4,lng:-76.5});await pending;
  assert.equal(state.isNavigating,false);assert.equal(stats.views,0);assert.equal(stats.watches,0);assert.equal(stats.flights,0);
 }
});
test('concurrent automatic starts only activate the navigation view once',async()=>{
 const fixes=[];const {ctx,state,stats}=startingSetup(()=>new Promise(resolve=>fixes.push(resolve)));
 const first=ctx.startNavigation(),second=ctx.startNavigation();
 for(const resolve of fixes)resolve({lat:3.4,lng:-76.5});await Promise.all([first,second]);
 assert.equal(state.isNavigating,true);assert.equal(stats.views,1);assert.equal(stats.watches,1);assert.equal(stats.stops,0);
});
