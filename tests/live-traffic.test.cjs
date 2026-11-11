const {test}=require('node:test');const assert=require('node:assert/strict');
const vm=require('node:vm');const fs=require('node:fs');const path=require('node:path');
const mod=import('../live-traffic.mjs');
test('sends the browser key only to the official vector traffic endpoint',async()=>{
 const {trafficRequest}=await mod;
 const url='https://api.tomtom.com/maps/orbis/traffic/flow/vector/tile/13/2354/4017?apiVersion=2';
 const authenticated=trafficRequest(url,'test-browser-key');
 assert.equal(authenticated.headers['TomTom-Api-Key'],'test-browser-key');
 assert.equal(authenticated.url.includes('test-browser-key'),false);
 for(const other of ['https://tiles.openfreemap.org/tiles/1/2/3','https://api.tomtom.com.evil.example/maps/orbis/traffic/flow/vector/tile/13/1/1','https://api.tomtom.com/maps/orbis/places/geocode','data:image/png;base64,'])assert.equal(trafficRequest(other,'test-browser-key').headers,undefined);
 assert.equal(trafficRequest(url,'').headers,undefined);
});
test('disabling congestion removes its source and layer; refresh pauses in background',async()=>{
 const {TRAFFIC_SOURCE,TRAFFIC_LAYER,TRAFFIC_TILE_URL,congestionLayer}=await mod;
 const removed=[];let refreshed=0;const labels={'#live-traffic-status':{},'#live-traffic-legend':{dataset:{}}};
 const state={mapReady:true,liveTrafficEnabled:false,liveTrafficStatus:'ready',map:{isStyleLoaded:()=>true,getLayer:()=>true,removeLayer:id=>removed.push(id),getSource:()=>({setTiles:()=>refreshed++}),removeSource:id=>removed.push(id)}};
 const ctx=vm.createContext({state,TRAFFIC_SOURCE,TRAFFIC_LAYER,TRAFFIC_TILE_URL,congestionLayer,window:{TRAZIA_CONFIG:{tomtomApiKey:'test-browser-key'}},document:{hidden:true},$:s=>labels[s],t:x=>x});
 const source=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
 for(const name of ['updateLiveTrafficStatus','renderLiveTraffic','refreshLiveTraffic']){
  const start=source.indexOf('  function '+name+'(');vm.runInContext(source.slice(start,source.indexOf('\n  }',start)+4),ctx);
 }
 ctx.renderLiveTraffic();assert.deepEqual(removed,[TRAFFIC_LAYER,TRAFFIC_SOURCE]);assert.equal(labels['#live-traffic-legend'].dataset.status,'off');
 state.liveTrafficEnabled=true;ctx.refreshLiveTraffic();assert.equal(refreshed,0);
 ctx.document.hidden=false;ctx.refreshLiveTraffic();assert.equal(refreshed,1);
 state.liveTrafficBlocked=true;ctx.refreshLiveTraffic();assert.equal(refreshed,1);
});
