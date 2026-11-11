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
 const ctx=vm.createContext({ $,state:{mapReady:true,route:{},routeCoordinates:[[0,0],[1,1]],navigationSteps:[{maneuverType:10,instructions:instruction}],voiceEnabled:true,language:'es',map:{flyTo(){}},is3d:true},
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
