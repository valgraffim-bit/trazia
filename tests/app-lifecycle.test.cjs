const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../app.js'),'utf8');
function setup(){
 const stats={requests:0,releases:0,splashes:0};const state={isNavigating:true,theme:'dark'};
 const ctx=vm.createContext({state,document:{hidden:false},navigator:{wakeLock:{async request(){stats.requests++;return{released:false,addEventListener(){},async release(){this.released=true;stats.releases++;}};}}},updateScreenLockStatus(held){stats.held=held;},window:{clearTimeout(){},setTimeout(fn){stats.retry=fn;return 1;}},runSplashScreen(){stats.splashes++;},applyTheme(){}});
 for(const name of ['requestNavigationWakeLock','releaseNavigationWakeLock','suspendAppView','resumeAppView']){const start=source.search(new RegExp(`  (?:async )?function ${name}\\(`));vm.runInContext(source.slice(start,source.indexOf('\n  }',start)+4),ctx);}
 return{ctx,state,stats};
}
test('keeps one screen lock while navigating and reacquires it after minimization',async()=>{
 const {ctx,state,stats}=setup();await ctx.requestNavigationWakeLock();await ctx.requestNavigationWakeLock();assert.equal(stats.requests,1);
 ctx.document.hidden=true;ctx.suspendAppView();assert.equal(stats.releases,1);
 ctx.document.hidden=false;ctx.resumeAppView();await Promise.resolve();assert.equal(stats.splashes,1);assert.equal(stats.requests,2);
 ctx.resumeAppView();assert.equal(stats.splashes,1);
 state.isNavigating=false;ctx.releaseNavigationWakeLock();await ctx.requestNavigationWakeLock();assert.equal(stats.requests,2);assert.equal(stats.releases,2);
});
test('late wake-lock requests are released after navigation ends',async()=>{
 const {ctx,state,stats}=setup();let resolve;ctx.navigator.wakeLock.request=()=>new Promise(r=>resolve=r);
 const pending=ctx.requestNavigationWakeLock();state.isNavigating=false;ctx.releaseNavigationWakeLock();resolve({release:async()=>{stats.releases++;}});await pending;
 assert.equal(stats.releases,1);assert.equal(state.screenWakeLock,null);
});
test('missing or denied screen-lock support does not break navigation or the return splash',async()=>{
 const {ctx,stats}=setup();ctx.navigator.wakeLock.request=async()=>{throw Error('Denied');};await ctx.requestNavigationWakeLock();assert.equal(ctx.state.wakeLockPending,false);
 delete ctx.navigator.wakeLock;await ctx.requestNavigationWakeLock();ctx.suspendAppView();ctx.resumeAppView();assert.equal(stats.splashes,1);
});
test('repeated splash starts cancel previous animation timers and reset progress',()=>{
 const {ctx,state}=setup();const elements=new Map();const $=selector=>{if(!elements.has(selector))elements.set(selector,{hidden:true,style:{},classList:{remove(){},add(){}},setAttribute(){}});return elements.get(selector);};
 let cleared=0;Object.assign(ctx,{$,performance:{now:()=>0},window:{clearInterval(){cleared++;},clearTimeout(){cleared++;},setInterval(){return 1;}}});
 const start=source.indexOf('  function runSplashScreen()');vm.runInContext(source.slice(start,source.indexOf('\n  }',start)+4),ctx);
 ctx.runSplashScreen();ctx.runSplashScreen();assert.equal(cleared,4);assert.equal($('#app-splash').hidden,false);assert.equal($('#splash-progress-value').textContent,'0%');assert.equal(state.splashTimer,1);
});

test('an unexpected release while visible schedules a new lock and records real lock status',async()=>{
 const {ctx,stats,state}=setup();let released;
 ctx.navigator.wakeLock.request=async()=>{stats.requests++;return{released:false,addEventListener(type,callback){released=callback;},async release(){}};};
 await ctx.requestNavigationWakeLock();assert.equal(stats.held,true);
 released();assert.equal(state.screenWakeLock,null);assert.equal(stats.held,false);
 stats.retry();await new Promise(setImmediate);assert.equal(stats.requests,2);assert.equal(stats.held,true);
});
