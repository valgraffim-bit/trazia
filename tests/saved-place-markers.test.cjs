const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../app.js'),'utf8');const ctx=vm.createContext({});
for(const name of ['validSavedPlaceLocation','savedPlaceKind']){const start=source.indexOf(`  function ${name}(`);vm.runInContext(source.slice(start,source.indexOf('\n  }',start)+4),ctx);}
test('saved markers require real numeric coordinates within geographic limits',()=>{
 for(const point of [undefined,{}, {lat:'3.4',lng:-76.5},{lat:NaN,lng:-76.5},{lat:91,lng:0},{lat:0,lng:181}])assert.equal(ctx.validSavedPlaceLocation(point),false);
 assert.equal(ctx.validSavedPlaceLocation({lat:3.44289173,lng:-76.52895843}),true);
});
test('home/work presets keep their PNG type and custom icons use a fixed allowlist',()=>{
 assert.equal(ctx.savedPlaceKind({id:'home',kind:'shop'}),'home');assert.equal(ctx.savedPlaceKind({id:'work'}),'work');
 for(const kind of ['shop','clinic','school','favorite','other'])assert.equal(ctx.savedPlaceKind({id:'custom-1',kind}),kind);
 assert.equal(ctx.savedPlaceKind({id:'custom-1',kind:'../../bad'}),'other');assert.equal(ctx.savedPlaceKind({id:'legacy'}),'other');
});
