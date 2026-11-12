export const defaults = Object.freeze({voiceURI:'',units:'km', keepAwake:true, showSpeed:true, cameraAlerts:true, cameraDistance:500, lightsReminder:false, avoidFerries:false, avoidHighways:false, unpaved:'allow', avoidDifficult:false, fuel:'gasoline', electric:false, plate:'', passes:[]});
export function loadPreferences(storage) {
  let data; try { data = JSON.parse(storage.getItem('trazia:preferences') || '{}'); } catch { data = {}; }
  const result = {...defaults};
  for (const key of Object.keys(defaults)) {
    const value = data?.[key];
    if (typeof defaults[key] === 'boolean' && typeof value === 'boolean') result[key] = value;
  }
  for (const [key, values] of Object.entries({units:['km','mi'], fuel:['gasoline','diesel','gas','electric'], unpaved:['allow','avoid']})) if(values.includes(data?.[key])) result[key]=data[key];
  if ([100,300,500].includes(data?.cameraDistance)) result.cameraDistance=data.cameraDistance;
  if (typeof data?.voiceURI==='string' && data.voiceURI.length <= 500) result.voiceURI=data.voiceURI;
  if (typeof data?.plate==='string') result.plate=data.plate.slice(0,12);
  result.passes=Array.isArray(data?.passes)?data.passes.filter(x=>['facilpass','flypass','quickpass','motos'].includes(x)):[];
  return result;
}

const pages = [
 ['general','General','⚙','#28c4d5'],['map','Visualización del mapa','◫','#24b479'],['voice','Voz y sonido','◖','#17bde9'],
 ['navigation','Navegación','↱','#487efa'],['vehicle','Detalles del vehículo','▣','#17bde9'],['passes','Pases de peaje y VAO','◇','#65676c'],
 ['alerts','Alertas','!','#ff9500'],['fuel','Gasolineras','▤','#21b243'],['speed','Velocímetro','◴','#ff6540'],['audio','Reproductor de audio','♫','#ee3ca5'],
 ['trips','Viajes planeados','▦','#ed6d73'],['privacy','Ajustes de privacidad','◈','#7b73dc'],
];

const iconPaths = {
 general: ['M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8','M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2'],
 map:['M3 5l6-2 6 2 6-2v16l-6 2-6-2-6 2Z','M9 3v16M15 5v16'],
 voice:['M3 9h4l5-4v14l-5-4H3Z','M16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14'],
 navigation:['M4 20v-5a4 4 0 0 1 4-4h7a4 4 0 0 0 4-4V4','M15 8l4-4 4 4','M4 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4'],
 vehicle:['M5 10l2-5h10l2 5','M3 10h18v8H3Z','M6 18v3m12-3v3M6 14h2m8 0h2'],
 passes:['M12 2l9 10-9 10L3 12Z'], alerts:['M12 22s8-8 8-13a8 8 0 0 0-16 0c0 5 8 13 8 13Z','M12 6v5m0 3v1'],
 fuel:['M4 21V3h10v18M2 21h14M4 6h10v6H4','M14 9h3v8a2 2 0 0 0 4 0V8l-3-3'],
 speed:['M3 18a10 10 0 1 1 18 0Z','M12 14l5-7M5 12h1m12 0h1M12 4v2'],
 audio:['M9 18V5l12-3v13M9 9l12-3','M9 18a3 3 0 1 1-3-3h3m12 0a3 3 0 1 1-3-3h3'],
 trips:['M3 5h18v16H3Z','M7 2v6m10-6v6M3 10h18M7 14h2m4 0h2m-8 4h2m4 0h2'],
 privacy:['M12 2l9 4v6c0 5-9 10-9 10S3 17 3 12V6Z','M8 11h8v6H8Zm2 0V8a2 2 0 0 1 4 0v3'],
};

export function setupSettings({document, storage, preferences, hooks}) {
 const dialog=document.getElementById('settings-dialog');
 const $=id=>document.getElementById(id);
 const content=$('settings-content');
 let current='root'; const history=[];
 let refreshVoices = null;
 const speech = document.defaultView?.speechSynthesis;
 speech?.addEventListener?.('voiceschanged', () => { if (current === 'voice' && dialog.open) refreshVoices?.(); });
 const title=$('settings-page-title');
 const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text)node.textContent=text;if(cls)node.className=cls;return node;};
 const note=(text)=>el('p',text,'settings-help');
 const group=(heading)=>{if(heading)content.append(el('h3',heading,'settings-group-title'));const box=el('div','','settings-group');content.append(box);return box;};
 const row=(box,label,control)=>{const wrapper=el('label','','settings-control-row');wrapper.append(el('span',label));if(control)wrapper.append(control);box.append(wrapper);return control;};
 const button=(box,label,action,kind='')=>{const b=el('button',label,'settings-action '+kind);b.type='button';b.addEventListener('click',action);box.append(b);return b;};
 const change=(key,value)=>{const next={...preferences,[key]:value};try{storage.setItem('trazia:preferences',JSON.stringify(next));}catch{hooks.message('No se pudieron guardar los ajustes en este dispositivo.');return;}Object.assign(preferences,next);hooks.change(key,value);};
 const toggle=(box,label,key)=>{const input=el('input');input.type='checkbox';input.checked=preferences[key];input.setAttribute('role','switch');input.addEventListener('change',()=>change(key,input.checked));row(box,label,input);};
 const select=(box,label,value,options,action)=>{const input=el('select');for(const [id,text] of options){const option=el('option',text);option.value=id;input.append(option);}input.value=String(value);input.addEventListener('change',()=>action(input.value));row(box,label,input);return input;};
 const nav=(box,page)=>{const info=pages.find(x=>x[0]===page);const b=el('button','','settings-nav-row');b.type='button';b.setAttribute('aria-label',info[1]);const icon=el('span',info[2],'settings-color-icon');icon.style.backgroundColor=info[3];icon.setAttribute('aria-hidden','true');icon.textContent='';const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','2');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');for(const d of iconPaths[page]){const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',d);svg.append(path);}icon.append(svg);b.append(icon,el('span',info[1]),el('span','›','settings-chevron'));b.addEventListener('click',()=>show(page));box.append(b);};
 const mount=(box,id)=>{const node=$(id);node.hidden=false;box.append(node);};
 function show(page,back=false) {
  if(!back&&current!==page)history.push(current);
  current=page;
  // Keep the original controls and their event listeners when switching pages.
  for(const id of ['settings-appearance-controls','settings-traffic-controls','account-logout'])$('settings-control-store').append($(id));
  content.replaceChildren();
  title.textContent=page==='root'?'Ajustes':pages.find(x=>x[0]===page)?.[1]||'Ajustes';
  if(page==='root'){
   let box=group();for(const info of pages.slice(0,3))nav(box,info[0]);
   box=group('Preferencias de conducción');for(const info of pages.slice(3,10))nav(box,info[0]);
   box=group('Tu actividad y tu cuenta');nav(box,'trips');nav(box,'privacy');
  }
  if(page==='general'){
   const box=group('Preferencias');select(box,'Idioma',hooks.state().language,[['es','Español'],['en','English']],hooks.language);
   select(box,'Unidades de distancia',preferences.units,[['km','Kilómetros'],['mi','Millas']],value=>change('units',value));
   toggle(group('Pantalla'),'Prevenir el bloqueo automático','keepAwake');content.append(note('La pantalla se mantiene encendida durante la navegación si el navegador lo permite.'));
   button(group(),'Personalización · apariencia',()=>show('map'));
  }
  if(page==='map'){
   mount(group('Apariencia'),'settings-appearance-controls');mount(group('Tráfico'),'settings-traffic-controls');
   const box=group('Vista del mapa');select(box,'Perspectiva',hooks.state().is3d?'3d':'2d',[['2d','2D'],['3d','3D']],value=>hooks.view(value==='3d'));
   select(box,'Orientación',hooks.state().compassMode,[['follow','Seguir el rumbo'],['north','Norte arriba']],hooks.compass);
  }
  if(page==='voice'){
   const box=group('Indicaciones');const input=el('input');input.type='checkbox';input.checked=hooks.state().voiceEnabled;input.setAttribute('role','switch');input.addEventListener('change',()=>hooks.voice(input.checked));row(box,'Guía por voz',input);
   const voiceBox=group('Voces del teléfono · gratis');
   const voiceSelect=el('select');voiceSelect.id='settings-device-voice';row(voiceBox,'Voz para las indicaciones',voiceSelect);
   const availability=note('');availability.id='settings-voice-availability';content.append(availability);
   const supported=Boolean(speech && document.defaultView?.SpeechSynthesisUtterance);
   refreshVoices=()=>{
    const seen=new Set();let voices=[];
    try { voices=(speech?.getVoices()||[]).filter(voice=>voice.voiceURI&&!seen.has(voice.voiceURI)&&seen.add(voice.voiceURI)); } catch { /* Automatic voice remains usable if enumeration fails. */ }
    const lang=hooks.state().language;
    voices.sort((a,b)=>Number(b.lang.toLowerCase().startsWith(lang))-Number(a.lang.toLowerCase().startsWith(lang))||a.name.localeCompare(b.name));
    voiceSelect.replaceChildren();
    const automatic=el('option','Automática · idioma de Trazia');automatic.value='';voiceSelect.append(automatic);
    for(const voice of voices){const option=el('option',`${voice.name} · ${voice.lang}${voice.localService?' · en el dispositivo':''}`);option.value=voice.voiceURI;voiceSelect.append(option);}
    const missing=preferences.voiceURI&&!voices.some(voice=>voice.voiceURI===preferences.voiceURI);
    if(missing){const option=el('option','Voz guardada · no disponible aquí');option.value=preferences.voiceURI;option.disabled=true;voiceSelect.append(option);}
    voiceSelect.value=preferences.voiceURI;
    voiceSelect.disabled=!supported;
    availability.textContent=!supported?'Este navegador no ofrece lectura por voz.':missing?'La voz guardada no está disponible en este navegador. Trazia usará la voz automática hasta que vuelva a estar disponible.':voices.length?`${voices.length} voces disponibles. La elección se guarda en este dispositivo.`:'El teléfono todavía no mostró su lista de voces. Podés usar Automática o tocar Actualizar voces.';
   };
   voiceSelect.addEventListener('change',()=>{change('voiceURI',voiceSelect.value);refreshVoices();});
   refreshVoices();
   const actions=group();button(actions,'Probar la voz',hooks.testVoice).disabled=!supported;button(actions,'Actualizar voces',()=>refreshVoices()).disabled=!supported;
   content.append(note('Son las voces que ofrece tu teléfono o navegador. Algunas necesitan conexión a internet. El volumen se controla con los botones del teléfono. Para obtener más voces, revisá las opciones de voz en Accesibilidad del teléfono.'));

  }
  if(page==='navigation'){
   const box=group('Preferencias de ruta');const input=el('input');input.type='checkbox';input.checked=hooks.state().avoidTolls;input.setAttribute('role','switch');input.addEventListener('change',()=>hooks.tolls(input.checked));row(box,'Evitar peajes',input);
   toggle(box,'Evitar ferris','avoidFerries');toggle(box,'Evitar autopistas','avoidHighways');select(box,'Caminos sin pavimentar',preferences.unpaved,[['allow','Permitir'],['avoid','Evitar']],value=>change('unpaved',value));toggle(box,'Evitar intersecciones difíciles','avoidDifficult');
   content.append(note('Se aplican al buscar o recalcular una ruta. El servicio puede incluir estos tramos si no hay una alternativa viable. Evitar intersecciones difíciles prioriza menos maniobras; no clasifica su dificultad real. Las preferencias de autopistas, pavimento e intersecciones se aplican a vehículos motorizados.'));
   const next=group('Detalles del recorrido');nav(next,'vehicle');nav(next,'passes');
  }
  if(page==='vehicle'){
   const box=group('Tu vehículo');select(box,'Tipo de vehículo',hooks.state().vehicleType,[['car','Carro'],['motorcycle','Motocicleta'],['truck','Camión'],['bicycle','Bicicleta']],hooks.vehicle);
   toggle(box,'Vehículo eléctrico','electric');select(box,'Combustible preferido',preferences.fuel,[['gasoline','Gasolina'],['diesel','Diésel'],['gas','Gas'],['electric','Eléctrico']],value=>change('fuel',value));
   const plate=el('input');plate.type='text';plate.maxLength=12;plate.placeholder='Opcional';plate.value=preferences.plate;plate.autocomplete='off';plate.addEventListener('change',()=>change('plate',plate.value.trim().toUpperCase()));row(box,'Matrícula del vehículo',plate);nav(box,'passes');content.append(note('La matrícula, el combustible y los pases se guardan solo en este dispositivo. No se aplican restricciones por placa, beneficios de peaje ni permisos VAO.'));
  }
  if(page==='passes'){
   const box=group('Tus pases');for(const [id,label] of [['facilpass','Facilpass Colombia'],['flypass','Flypass Colombia'],['motos','Pase Motos Barranquilla'],['quickpass','Quickpass Colombia']]){const input=el('input');input.type='checkbox';input.checked=preferences.passes.includes(id);input.addEventListener('change',()=>change('passes',input.checked?[...preferences.passes,id]:preferences.passes.filter(x=>x!==id)));row(box,label,input);}content.append(note('Anotá los pases que ya tenés. Esta selección no compra, valida ni activa permisos de circulación o descuentos.'));
  }
  if(page==='alerts'){
   const box=group('Alertas viales');toggle(box,'Cámaras de fotodetección','cameraAlerts');select(box,'Distancia de la alerta',preferences.cameraDistance,[[100,'100 m'],[300,'300 m'],[500,'500 m']],value=>change('cameraDistance',Number(value)));toggle(group('Seguridad'),'Recordatorio de luces al iniciar','lightsReminder');nav(group('Velocidad'),'speed');content.append(note('Las cámaras se consultan en el registro ANSV; su disponibilidad depende de la cobertura.'));
  }
  if(page==='speed'){
   toggle(group('Mostrar en el mapa'),'Velocímetro','showSpeed');select(group('Unidades'),'Distancia y velocidad',preferences.units,[['km','km · km/h'],['mi','mi · mph']],value=>change('units',value));content.append(note('Velocidad estimada por GPS. Las alertas de exceso de velocidad todavía no están disponibles porque Trazia no recibe límites verificados de cada vía.'));
  }
  if(page==='fuel'){
   select(group('Preferencia'),'Combustible',preferences.fuel,[['gasoline','Gasolina'],['diesel','Diésel'],['gas','Gas'],['electric','Eléctrico']],value=>change('fuel',value));button(group(),'Buscar gasolineras cerca',()=>{dialog.close();hooks.fuel();});content.append(note('Se muestran las estaciones disponibles en los datos del mapa. No hay precios en vivo ni filtro verificado por combustible.'));
  }
  if(page==='audio'){
   const box=group('Tu música');button(box,'Abrir reproductor de audio',()=>{dialog.close();hooks.audio();});content.append(note('Elegí tu servicio de música. La reproducción se abre en la aplicación del proveedor.'));
  }
  if(page==='trips')renderTrips();
  if(page==='privacy'){
   const box=group('Actividad en este dispositivo');button(box,'Ver ubicaciones recientes',()=>{const list=$('settings-recent-list');list.replaceChildren();const items=hooks.recents();if(!items.length)list.append(note('Todavía no hay ubicaciones recientes.'));for(const item of items)list.append(el('p',typeof item==='string'?item:item.label||item.query||item.name||'Destino guardado','settings-help'));});const list=el('div');list.id='settings-recent-list';content.append(list);
   button(box,'Borrar ubicaciones recientes',()=>confirmAction('¿Borrar las ubicaciones recientes de este dispositivo?',hooks.clearRecents),'settings-danger');
   const account=group('Cuenta e inicio de sesión');mount(account,'account-logout');button(account,'Eliminar cuenta',()=>confirmAction('¿Eliminar tu cuenta de Trazia? Esta acción es permanente. Tus preferencias y lugares locales no se borran.',()=>{$('account-delete').click();}),'settings-danger');
   content.append(note('Trazia no publica tu perfil ni tu ubicación en el mapa. Los lugares guardados y las preferencias permanecen en este dispositivo. Los reportes nuevos que publiques se comparten con otros usuarios durante 1 hora.'));
  }
  $('settings-back').setAttribute('aria-label',page==='root'?'Volver al mapa':'Volver a Ajustes');
  $('settings-scroll').scrollTop=0;
  title.focus({preventScroll:true});
 }
 function confirmAction(text,action){const box=group('Confirmar');box.append(note(text));button(box,'Confirmar',()=>{action();if(dialog.open)show(current,true);},'settings-danger');button(box,'Cancelar',()=>show(current,true));box.scrollIntoView({block:'nearest'});}
 function renderTrips(){
  let trips;try{trips=JSON.parse(storage.getItem('trazia:planned-trips')||'[]');}catch{trips=[];}
  if(!Array.isArray(trips))trips=[];
  trips=trips.filter(x=>typeof x?.destination==='string'&&typeof x?.date==='string'&&Number.isFinite(Date.parse(x.date))).slice(0,50);
  const box=group('Planear una salida');const form=el('form','','settings-trip-form');const name=el('input');name.required=true;name.maxLength=180;name.placeholder='Dirección o destino';row(form,'Destino',name);const date=el('input');date.type='datetime-local';date.required=true;row(form,'Fecha y hora de salida',date);const submit=el('button','Guardar viaje','settings-action');submit.type='submit';form.append(submit);box.append(form);
  form.addEventListener('submit',event=>{event.preventDefault();if(!form.reportValidity())return;if(Date.parse(date.value)<=Date.now()){hooks.message('Elegí una fecha futura.');return;}try{storage.setItem('trazia:planned-trips',JSON.stringify([...trips,{destination:name.value.trim(),date:date.value}].slice(-50)));show('trips',true);}catch{hooks.message('No se pudo guardar el viaje.');}});
  const list=group('Tus viajes');for(const [index,trip]of trips.entries()){const item=el('div','','settings-trip');item.append(el('strong',trip.destination),note(new Date(trip.date).toLocaleString()));button(item,'Enviar al calendario',()=>{
   const escape=text=>text.replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');const stamp=value=>new Date(value).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
   const ics=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Trazia//Viajes//ES','BEGIN:VEVENT','UID:'+Date.parse(trip.date)+'-'+index+'@trazia','DTSTAMP:'+stamp(Date.now()),'DTSTART:'+stamp(trip.date),'DTEND:'+stamp(Date.parse(trip.date)+3600000),'SUMMARY:'+escape('Viaje a '+trip.destination),'LOCATION:'+escape(trip.destination),'END:VEVENT','END:VCALENDAR',''].join('\r\n');const url=URL.createObjectURL(new Blob([ics],{type:'text/calendar;charset=utf-8'}));const link=el('a');link.href=url;link.download='viaje-trazia.ics';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });button(item,'Quitar viaje',()=>{try{storage.setItem('trazia:planned-trips',JSON.stringify(trips.filter((_,i)=>i!==index)));show('trips',true);}catch{hooks.message('No se pudo quitar el viaje.');}},'settings-danger');list.append(item);}
  if(!trips.length)list.append(note('No tenés viajes planeados.'));content.append(note('Los viajes se guardan en este dispositivo. Para recibir recordatorios, abrí el archivo en tu calendario y configurá una alerta allí. No hay sincronización con calendarios ni avisos en segundo plano desde Trazia.'));
 }
 $('settings-back').addEventListener('click',()=>{if(current==='root')dialog.close();else show(history.pop()||'root',true);});
 dialog.addEventListener('close',()=>{history.length=0;current='root';});
 const observer=new MutationObserver(()=>{if(dialog.open)show('root',true);});observer.observe(dialog,{attributes:true,attributeFilter:['open']});
 show('root',true);
 return {open:()=>{history.length=0;show('root',true);dialog.showModal();}};
}
