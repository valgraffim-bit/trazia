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
 const ctx=vm.createContext({ $,state:{announcedCameras:new Set(),mapReady:true,route:{},routeCoordinates:[[0,0],[1,1]],navigationSteps:[{maneuverType:10,instructions:instruction}],voiceEnabled:true,language:'es',map:{flyTo(){}},is3d:true},
  window:{speechSynthesis:{cancel(){},resume(){},getVoices(){return[];},speak(u){spoken.push(u.text);}},SpeechSynthesisUtterance:class{constructor(text){this.text=text;}}},
  navigator:{},t:key=>key,showToast(){},updateNavigationButton(){},collapseMobilePanel(){},setMap3d(){},getUserPosition:async()=>({lat:3.4,lng:-76.5}),compassBearing:()=>0,mobileMapOffset:()=>[0,0],console});
 for(const name of ['navigationArrow','updateNavigationInstruction','speak','toggleNavigation'])add(ctx,name);
 await ctx.toggleNavigation();
 assert.equal($('#navigation-banner').hidden,false);
 assert.equal($('#navigation-banner').dataset.direction,'right');
 assert.equal($('#navigation-instruction').textContent,instruction);
 assert.equal(spoken.at(-1),instruction);
 assert.equal(ctx.state.isNavigating,true);
});
test('stopping navigation clears the purple route and cancels late calculations, preserving traffic and cameras',()=>{
 const layers=new Set(['trazia-route-line','trazia-route-outline','trazia-congestion-red','trazia-speed-cameras']);
 const sources=new Set(['trazia-route']);let aborted=0,markerRemoved=0;
 const elements=new Map();const $=selector=>{if(!elements.has(selector))elements.set(selector,{});return elements.get(selector);};
 const state={isNavigating:true,isRerouting:false,routeRequestId:7,routeSearchController:{abort(){aborted++;}},routeCoordinates:[[1,2],[3,4]],route:{},navigationSteps:[{}],currentRoutes:[{}],destinationMarker:{remove(){markerRemoved++;}},map:{stop(){},getLayer:id=>layers.has(id),removeLayer:id=>layers.delete(id),getSource:id=>sources.has(id),removeSource:id=>sources.delete(id)}};
 const ctx=vm.createContext({state,$,window:{speechSynthesis:{cancel(){}}},t:k=>k,updateNavigationButton(){},showToast(){}});
 for(const name of ['clearRoutePolylines','stopNavigation'])add(ctx,name);
 ctx.stopNavigation();
 assert.equal(state.routeCoordinates.length,0);assert.equal(state.route,null);
 assert.equal(state.navigationSteps.length,0);assert.equal(state.routeRequestId,8);assert.equal(aborted,1);assert.equal(markerRemoved,1);
 assert.equal(layers.has('trazia-route-line'),false);assert.equal(layers.has('trazia-route-outline'),false);assert.equal(sources.has('trazia-route'),false);
 assert.equal(layers.has('trazia-congestion-red'),true);assert.equal(layers.has('trazia-speed-cameras'),true);
 assert.equal($('#navigation-banner').hidden,true);assert.equal($('#camera-approach-alert').hidden,true);assert.equal($('#route-summary-overlay').hidden,true);assert.equal($('#start-navigation').disabled,true);
});
