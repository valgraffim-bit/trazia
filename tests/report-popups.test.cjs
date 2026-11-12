const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../app.js'),'utf8');
const start=source.indexOf('  function addReportMarker(report)');
const end=source.indexOf('\n  function renderSavedReportMarkers',start);
function setup(){
 const context=vm.createContext({
  document:{createElement(tag){return{tag,children:[],style:{},setAttribute(k,v){this[k]=v;},append(...items){this.children.push(...items);}};}},
  state:{language:'es',trafficEnabled:true,reportMarkers:[],map:{}},t:key=>key,
  maplibregl:{Popup:class{constructor(options){this.options=options;}setDOMContent(content){this.content=content;return this;}},Marker:class{constructor({element}){this.element=element;}setLngLat(point){this.point=point;return this;}setPopup(popup){this.popup=popup;return this;}addTo(){return this;}getElement(){return this.element;}}},
 });
 vm.runInContext(source.slice(source.indexOf('  const incidentLabels ='),source.indexOf('\n  const state =')),context);
 vm.runInContext(source.slice(start,end),context);return context;
}
test('all report symbols have accessible names and a popup with the correct type and description',()=>{
 const ctx=setup();
 for(const [type,label] of Object.entries({traffic:'Tráfico',crash:'Accidente',hazard:'Peligro',closure:'Cierre',place:'Lugar',police:'Policía',security:'Alerta de seguridad',lane:'Carril bloqueado',map:'Error en el mapa',animal:'Animal',weather:'Mal tiempo',fuel:'Precios de combustible',assistance:'Asistencia en la ruta'})){
  ctx.addReportMarker({type,details:'<img src=x onerror=alert(1)>',lat:3.45,lng:-76.53,createdAt:'2026-11-11T12:00:00Z'});
  const marker=ctx.state.reportMarkers.at(-1);
  assert.equal(marker.element.tag,'button');assert.equal(marker.element['aria-label'],label);
  assert.equal(marker.popup.content.children[0].textContent,label);
  assert.equal(marker.popup.content.children[1].textContent,'<img src=x onerror=alert(1)>');
  assert.equal(marker.popup.content.children[1].children.length,0);
  assert.match(marker.popup.content.children[2].textContent,/2026/);
  assert.equal(marker.popup.content.children[3].textContent,'localReports');
  assert.deepEqual(Array.from(marker.point),[-76.53,3.45]);
 }
});
test('unknown reports and missing metadata still open a useful popup and respect hidden reports',()=>{
 const ctx=setup();ctx.state.trafficEnabled=false;
 ctx.addReportMarker({type:'unknown',lat:3.45,lng:-76.53});
 const marker=ctx.state.reportMarkers[0];
 assert.equal(marker.popup.content.children[0].textContent,'report');
 assert.equal(marker.popup.content.children.length,2);
 assert.equal(marker.element.style.display,'none');
});
