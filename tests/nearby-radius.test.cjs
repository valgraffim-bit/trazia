const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
function setup(){const ctx=vm.createContext({state:{route:{},routeCoordinates:[[0,0],[1,1]]},Number,t:x=>x});for(const name of ['distanceMeters','nearbyFeaturesWithinRadius','makeNearbySearchPlan','nearbyTagFilters','makeNearbyOverpassQuery','overpassFeature','nearbyFeatureCategory']){const a=source.indexOf('  function '+name+'(');vm.runInContext(source.slice(a,source.indexOf('\n  }',a)+4),ctx);}return ctx;}
test('uses a fixed 10km circle even when there is an active route and does not clip at city borders',()=>{
 const ctx=setup(),center={lat:3.45,lng:-76.53};const plan=ctx.makeNearbySearchPlan(center);
 assert.equal(plan.radius,10000);assert.equal(plan.points.length,1);
 for(const category of ['gas','clinic','business']){const query=ctx.makeNearbyOverpassQuery(category,plan);assert.match(query,/around:10000,3.45,-76.53/);assert.equal(query.includes('area.city'),false);}
});
test('excludes points outside 10km and sorts the remaining points by straight-line distance',()=>{
 const ctx=setup(),center={lat:3.45,lng:-76.53};
 const point=meters=>({id:String(meters),geometry:{coordinates:[center.lng,center.lat+meters/6371000*180/Math.PI]}});
 const matches=ctx.nearbyFeaturesWithinRadius([point(10001),point(9999),point(100),{geometry:{coordinates:[NaN,0]}}],center);
 assert.equal(matches.length,2);assert.equal(matches[0].id,'100');assert.equal(matches[1].id,'9999');
});
test('keeps public contact details and filters unrelated fallback categories',()=>{
 const ctx=setup();const feature=ctx.overpassFeature({type:'node',id:1,lat:3.45,lon:-76.53,tags:{name:'Fixture fuel',amenity:'fuel',opening_hours:'24/7','contact:phone':'+57 1234567','contact:website':'https://example.com','addr:street':'Fixture road'}});
 assert.equal(feature.properties.openingHours,'24/7');assert.equal(feature.properties.phone,'+57 1234567');assert.equal(feature.properties.website,'https://example.com');
 assert.equal(ctx.nearbyFeatureCategory({properties:{osm_key:'amenity',osm_value:'fuel'}},'gas'),true);
 assert.equal(ctx.nearbyFeatureCategory({properties:{osm_key:'amenity',osm_value:'school'}},'clinic'),false);
});
