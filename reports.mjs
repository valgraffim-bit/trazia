export const reportCategories = [
 {id:'traffic',es:'Tráfico',en:'Traffic',icon:'🚗',subtypes:['Moderado','Intenso','Detenido']},
 {id:'police',es:'Policía',en:'Police',icon:'👮',subtypes:['Presencia policial','Control vial']},
 {id:'crash',es:'Accidente',en:'Accident',icon:'💥',subtypes:['Leve','Grave','Varios vehículos']},
 {id:'security',es:'Alerta de seguridad',en:'Safety alert',icon:'🦺',subtypes:['Situación de riesgo','Zona insegura']},
 {id:'hazard',es:'Peligro',en:'Hazard',icon:'⚠️',subtypes:['Objeto en la vía','Hueco','Vehículo detenido','Otro peligro']},
 {id:'lane',es:'Carril bloqueado',en:'Blocked lane',icon:'🚧',subtypes:['Izquierdo','Central','Derecho','Varios carriles']},
 {id:'closure',es:'Cierre',en:'Closure',icon:'⛔',subtypes:['Cierre total','Cierre parcial','Obras']},
 {id:'map',es:'Error en el mapa',en:'Map error',icon:'🗺️',subtypes:['Dirección incorrecta','Sentido vial incorrecto','Vía faltante','Otro error']},
 {id:'animal',es:'Animal',en:'Animal',icon:'🐄',subtypes:['En la vía','Al lado de la vía','Animal herido']},
 {id:'weather',es:'Mal tiempo',en:'Bad weather',icon:'⛈️',subtypes:['Lluvia intensa','Niebla','Inundación','Viento fuerte','Vía resbaladiza']},
 {id:'fuel',es:'Precios de combustible',en:'Fuel prices',icon:'⛽',subtypes:[]},
 {id:'assistance',es:'Asistencia en la ruta',en:'Roadside assistance',icon:'🛟',subtypes:['Avería mecánica','Llanta pinchada','Sin combustible','Otra asistencia']},
 {id:'place',es:'Lugar',en:'Place',icon:'📍',subtypes:['Lugar nuevo','Información incorrecta','Lugar cerrado']},
 {id:'cleanup',es:'Depuración',en:'Review reports',icon:'🧹',subtypes:[]},
];

export function validReportLocation(point) {
 return Boolean(point && Number.isFinite(point.lat) && Number.isFinite(point.lng) && Math.abs(point.lat)<=90 && Math.abs(point.lng)<=180);
}

export function setupReportMenu({document, language, center, position, reports, remove, message, reconnect}) {
 const $=id=>document.getElementById(id);const dialog=$('report-dialog');let selected=null;let connection='connecting';let publishing=false;let revision=0;
 const local=(es,en)=>language()==='es'?es:en;
 function show(page) {
  $('report-error').textContent='';
  $('report-category-grid').hidden=page!=='root';$('report-form').hidden=page!=='form';$('report-cleanup').hidden=page!=='cleanup';$('report-back').hidden=page==='root';
  $('report-dialog-title').textContent=page==='root'?local('Reportes','Reports'):selected?.[language()]||selected?.es||local('Depuración','Review reports');
  $('report-scroll').scrollTop=0;
 }
 function updateLocation() {
  const point=$('report-location-source').value==='gps'?position():center();
  $('report-location-preview').textContent=validReportLocation(point)?`${local('Ubicación del reporte','Report location')}: ${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`:local('Ubicación no disponible. Activá tu ubicación o elegí un punto del mapa.','Location unavailable. Enable location or choose a map point.');
 }
 function choose(category) {
  revision++;
  $('report-form').reset();
  selected=category;
  if(category.id==='cleanup'){renderCleanup();show('cleanup');return;}
  $('report-type').value=category.id;
  const subtype=$('report-subtype');subtype.replaceChildren();for(const label of category.subtypes){const option=document.createElement('option');option.value=label;option.textContent=label;subtype.append(option);}
  $('report-subtype-row').hidden=!category.subtypes.length;
  $('report-name-row').hidden=!['fuel','place'].includes(category.id);$('report-place-name').required=['fuel','place'].includes(category.id);
  $('report-place-label').textContent=category.id==='fuel'?local('Nombre de la estación','Station name'):local('Nombre del lugar','Place name');
  $('report-fuel-fields').hidden=category.id!=='fuel';$('report-fuel-price').required=category.id==='fuel';
  $('report-category-note').textContent=category.id==='assistance'?local('Publicar este reporte no solicita ni envía servicios de asistencia. En una emergencia, llamá al 123 en Colombia.','This report does not request or dispatch assistance. In an emergency, call local emergency services.'):
   category.id==='fuel'?local('Precio observado por vos, en pesos colombianos (COP). Quedará marcado con la fecha; no es un precio verificado en vivo.','Your observed price in Colombian pesos (COP). It is dated, not a verified live price.'):
   category.id==='map'?local('Se guarda como reporte. No modifica automáticamente las vías o direcciones del mapa.','Saved as a report. It does not automatically edit map roads or addresses.'):
   local('Confirmá la ubicación antes de guardar el reporte.','Confirm the location before saving the report.');
  $('report-emergency').hidden=category.id!=='assistance';
  updateLocation();show('form');
  $('report-dialog-title').focus({preventScroll:true});
 }
 function renderRoot() {
  $('report-category-grid').replaceChildren();$('report-type').replaceChildren();
  for(const category of reportCategories){
   const button=document.createElement('button');button.type='button';button.className='report-category';button.dataset.reportCategory=category.id;button.setAttribute('aria-label',category[language()]||category.es);
   const icon=document.createElement('span');icon.className='report-category-icon';icon.textContent=category.icon;icon.setAttribute('aria-hidden','true');const label=document.createElement('span');label.textContent=category[language()]||category.es;button.append(icon,label);button.addEventListener('click',()=>choose(category));$('report-category-grid').append(button);
   if(category.id!=='cleanup'){const option=document.createElement('option');option.value=category.id;option.textContent=category[language()]||category.es;$('report-type').append(option);}
  }
  show('root');
 }
 function renderCleanup() {
  const list=$('report-cleanup-list');list.replaceChildren();
  for(const report of reports()){
   const item=document.createElement('div');item.className='report-cleanup-item';const title=document.createElement('strong');const category=reportCategories.find(c=>c.id===report.type);title.textContent=category?.[language()]||category?.es||local('Reporte','Report');const description=document.createElement('p');description.textContent=(report.shared?'':local('Anterior, privado · ','Earlier, private · '))+(report.details||report.subtype||'');const date=document.createElement('small');const stamp=new Date(report.createdAt);date.textContent=Number.isFinite(stamp.getTime())?stamp.toLocaleString(language()==='es'?'es-CO':'en-US'):'';
   const button=document.createElement('button');button.type='button';button.className='report-remove';button.textContent=local('Eliminar','Delete');button.addEventListener('click',async()=>{if(button.dataset.confirm!=='yes'){button.dataset.confirm='yes';button.textContent=local('Confirmar eliminación','Confirm deletion');return;}button.disabled=true;try{if(await remove(report)!==false)renderCleanup();}catch{message(local('No se pudo eliminar el reporte. Intentá de nuevo.','Could not remove the report. Try again.'));}finally{button.disabled=false;}});item.append(title,description,date,button);list.append(item);
  }
  if(!reports().length){const text=document.createElement('p');text.className='report-help';text.textContent=local('No hay reportes guardados en este dispositivo.','There are no saved reports on this device.');list.append(text);}
 }
 function draft() {
  if(!selected||selected.id==='cleanup')return null;
  if(!$('report-form').reportValidity())return null;
  const point=$('report-location-source').value==='gps'?position():center();
  if(!validReportLocation(point)){updateLocation();message(local('Elegí una ubicación válida para el reporte.','Choose a valid location for your report.'));return null;}
  const name=$('report-place-name').value.trim();
  if(['fuel','place'].includes(selected.id)&&!name){message(local('Escribí el nombre del lugar.','Enter the place name.'));return null;}
  const result={type:selected.id,details:$('report-details').value.trim(),lat:point.lat,lng:point.lng,locationSource:$('report-location-source').value};
  if(selected.subtypes.length)result.subtype=$('report-subtype').value;
  if(['fuel','place'].includes(selected.id))result.placeName=name;
  if(selected.id==='fuel'){
   const price=Number($('report-fuel-price').value);if(!Number.isFinite(price)||price<=0||price>1000000){message(local('Revisá el precio del combustible.','Check the fuel price.'));return null;}
   result.fuel={type:$('report-fuel-type').value,price,currency:'COP',unit:$('report-fuel-unit').value};
  }
  return result;
 }
 $('report-back').addEventListener('click',()=>{revision++;selected=null;show('root');});
 $('report-location-source').addEventListener('change',updateLocation);
 $('report-form').addEventListener('submit',event=>{event.preventDefault();$('save-report').click();});
 dialog.addEventListener('close',()=>{revision++;selected=null;$('report-form').reset();renderRoot();});
 const observer=new MutationObserver(()=>{if(dialog.open){renderRoot();$('report-dialog-title').focus({preventScroll:true});}});observer.observe(dialog,{attributes:true,attributeFilter:['open']});
 function setConnection(status) {
  connection=status;
  $('report-connection-status').textContent=status==='ready'?local('Compartidos · visibles durante 1 hora','Shared · visible for 1 hour'):status==='connecting'?local('Conectando reportes compartidos…','Connecting shared reports…'):status==='offline'?local('Sin conexión · solo reportes ya recibidos','Offline · previously received reports only'):local('Reportes compartidos no disponibles','Shared reports unavailable');
  $('report-reconnect').hidden=!['offline','error'].includes(status);
  setBusy(publishing);
 }
 function setBusy(value) {
  publishing=value;
  $('save-report').disabled=value||connection!=='ready';
  $('save-report').textContent=value?local('Publicando…','Publishing…'):local('Publicar reporte · 1 hora','Publish report · 1 hour');
 }
 $('report-reconnect').addEventListener('click',()=>reconnect?.());
 renderRoot();setConnection('connecting');
 return {draft,setConnection,setBusy,revision:()=>revision};
}
