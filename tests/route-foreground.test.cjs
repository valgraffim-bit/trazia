const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../app.js'),'utf8');
const OUTLINE='trazia-route-outline',LINE='trazia-route-line',CAMERAS='trazia-speed-cameras',TRAFFIC='trazia-congestion-red';
const baseLayers=()=>[
 {id:'land',type:'fill'}, {id:'road-labels',type:'symbol'},
 {id:'buildings-3d',type:'fill-extrusion'}, {id:TRAFFIC,type:'line'},
 {id:'place-labels',type:'symbol'},
];
function setup(initial=baseLayers()){
 const layers=initial.map(layer=>({...layer})),sources=new Map();const moves=[];
 const map={
  isStyleLoaded:()=>true,getStyle:()=>({layers:[...layers]}),getLayer:id=>layers.find(layer=>layer.id===id),
  addLayer(layer,before){assert.equal(Boolean(this.getLayer(layer.id)),false,`no duplicate ${layer.id}`);const index=before?layers.findIndex(item=>item.id===before):-1;if(index<0)layers.push(layer);else layers.splice(index,0,layer);},
  removeLayer(id){const index=layers.findIndex(layer=>layer.id===id);if(index>=0)layers.splice(index,1);},
  moveLayer(id,before){const index=layers.findIndex(layer=>layer.id===id);assert.ok(index>=0,`layer ${id} exists`);const [layer]=layers.splice(index,1);const beforeIndex=before?layers.findIndex(item=>item.id===before):-1;if(beforeIndex<0)layers.push(layer);else layers.splice(beforeIndex,0,layer);moves.push([id,before]);},
  getSource:id=>sources.get(id),addSource:(id,data)=>sources.set(id,data),removeSource:id=>sources.delete(id),
 };
 const state={map,mapReady:true,routeCoordinates:[[-76.53,3.45],[-76.52,3.46]],fitRouteToMap:false,isNavigating:false,liveTrafficEnabled:true};
 class Marker{setLngLat(){return this;}addTo(){return this;}remove(){}}
 const ctx=vm.createContext({state,TRAFFIC_LAYER:TRAFFIC,TRAFFIC_SOURCE:'trazia-live-traffic',TRAFFIC_TILE_URL:'https://traffic.test/{z}/{x}/{y}',
  window:{TRAZIA_CONFIG:{tomtomApiKey:'test'}},document:{createElement:()=>({setAttribute(){}})},maplibregl:{Marker},
  t:key=>key,remainingRouteCoordinates:()=>state.routeCoordinates,updateRouteProgress(){},updateLiveTrafficStatus(){},
  congestionLayer:()=>({id:TRAFFIC,type:'line',source:'trazia-live-traffic'}),
 });
 for(const name of ['keepRouteInForeground','drawRouteOnMap','renderLiveTraffic']){
  const start=source.indexOf('  function '+name+'(');assert.ok(start>=0,`${name} is defined`);
  vm.runInContext(source.slice(start,source.indexOf('\n  }',start)+4),ctx);
 }
 return{ctx,state,map,layers,moves,sources};
}
function assertForeground(layers,{cameras=false}={}){
 const ids=layers.map(layer=>layer.id),outline=ids.indexOf(OUTLINE),line=ids.indexOf(LINE);
 assert.ok(outline>=0&&line>outline,'purple stroke stays above its dark outline');
 for(const layer of layers)if(![OUTLINE,LINE,CAMERAS].includes(layer.id))assert.ok(ids.indexOf(layer.id)<outline,`${layer.id} stays below the route`);
 assert.deepEqual(ids.slice(cameras?-3:-2),cameras?[OUTLINE,LINE,CAMERAS]:[OUTLINE,LINE]);
}

test('route draws above map labels, 3D buildings and traffic while camera symbols remain visible',()=>{
 const {ctx,map,layers,sources}=setup([...baseLayers(),{id:CAMERAS,type:'symbol'}]);
 ctx.drawRouteOnMap();assertForeground(layers,{cameras:true});
 assert.ok(sources.has('trazia-route'));
 assert.equal(map.getLayer(LINE).paint['line-color'],'#a020ff');
 assert.equal(map.getLayer(LINE).paint['line-opacity'],1);
 ctx.drawRouteOnMap();assertForeground(layers,{cameras:true});
 assert.equal(layers.filter(layer=>layer.id===OUTLINE).length,1);assert.equal(layers.filter(layer=>layer.id===LINE).length,1);
});

test('newly added base layers cannot cover the route and repeated idle ordering makes no map changes',()=>{
 const {ctx,map,layers,moves}=setup();
 ctx.drawRouteOnMap();assertForeground(layers);const initially=moves.length;
 ctx.keepRouteInForeground();assert.equal(moves.length,initially,'already ordered layers cause no idle loop');
 map.addLayer({id:'late-landmark-labels',type:'symbol'});map.addLayer({id:'late-buildings',type:'fill-extrusion'});
 ctx.keepRouteInForeground();assertForeground(layers);const restored=moves.length;assert.ok(restored>initially);
 ctx.keepRouteInForeground();ctx.keepRouteInForeground();assert.equal(moves.length,restored,'no redraw churn after restoration');
 map.addLayer({id:CAMERAS,type:'symbol'});ctx.keepRouteInForeground();assertForeground(layers,{cameras:true});
});

test('traffic refresh preserves the route in the foreground even if existing traffic was appended late',()=>{
 const {ctx,map,layers}=setup(baseLayers().filter(layer=>layer.id!==TRAFFIC));
 ctx.drawRouteOnMap();ctx.renderLiveTraffic();assertForeground(layers);
 map.moveLayer(TRAFFIC);assert.ok(layers.findIndex(layer=>layer.id===TRAFFIC)>layers.findIndex(layer=>layer.id===LINE));
 ctx.renderLiveTraffic();assertForeground(layers);
});

test('ordering safely does nothing when no route is drawn',()=>{
 const {ctx,state,layers,moves}=setup();const original=layers.map(layer=>layer.id);
 ctx.keepRouteInForeground();assert.equal(moves.length,0);assert.deepEqual(layers.map(layer=>layer.id),original);
 state.map=null;ctx.keepRouteInForeground();assert.equal(moves.length,0);
});
