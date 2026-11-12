export const musicProviders=Object.freeze({
 youtube:{name:'YouTube Music',url:'https://music.youtube.com/'},
 spotify:{name:'Spotify',url:'https://open.spotify.com/'},
 apple:{name:'Apple Music',url:'https://music.apple.com/'},
 deezer:{name:'Deezer',url:'https://www.deezer.com/'},
});

const icons={
 youtube:'<circle cx="12" cy="12" r="11" fill="#ff0033" stroke="none"/><circle cx="12" cy="12" r="7" fill="none" stroke="white" stroke-width="1.5"/><path d="m10 8.5 6 3.5-6 3.5Z" fill="white" stroke="none"/>',
 spotify:'<circle cx="12" cy="12" r="11" fill="#1ed760" stroke="none"/><path d="M5.5 9c4-1.5 9-1.2 13 1M6.5 12.5c3.5-1.1 7-1 10.5.8M7.5 16c2.7-.8 5.3-.7 8 .7" fill="none" stroke="#101b15" stroke-width="1.8" stroke-linecap="round"/>',
 apple:'<circle cx="12" cy="12" r="11" fill="#fb3156" stroke="none"/><path d="M10 17V7l8-2v10M10 10l8-2" fill="none" stroke="white" stroke-width="1.8"/><ellipse cx="7.5" cy="17" rx="2.5" ry="1.8" fill="white" stroke="none"/><ellipse cx="15.5" cy="15" rx="2.5" ry="1.8" fill="white" stroke="none"/>',
 deezer:'<circle cx="12" cy="12" r="11" fill="#242027" stroke="none"/><path d="M5 15h2v4H5Z" fill="#ff9550" stroke="none"/><path d="M8 10h2v9H8Z" fill="#f5679c" stroke="none"/><path d="M11 6h2v13h-2Z" fill="#b87bf8" stroke="none"/><path d="M14 9h2v10h-2Z" fill="#808bfa" stroke="none"/><path d="M17 13h2v6h-2Z" fill="#42cae9" stroke="none"/>',
};

export function musicIcon(document,service){
 const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');icon.setAttribute('viewBox','0 0 24 24');icon.setAttribute('aria-hidden','true');icon.innerHTML=Object.hasOwn(icons,service)?icons[service]:icons.youtube;return icon;
}

export function setupMusicDock({window,document,getService,onChoose,language=()=> 'es',autoCloseMs=6000}) {
 const $=id=>document.getElementById(id);const panel=$('music-shortcut-panel');
 const triggers=[$('open-music'),$('wide-open-music')].filter(Boolean);let timer;let origin;
 const text=(es,en)=>language()==='es'?es:en;
 function service(){const id=getService();return Object.hasOwn(musicProviders,id)?id:'youtube';}
 function close(restoreFocus=false){
  window.clearTimeout(timer);panel.hidden=true;triggers.forEach(button=>button.setAttribute('aria-expanded','false'));
  if(restoreFocus){const target=origin?.getClientRects().length?origin:triggers.find(button=>button.getClientRects().length);target?.focus({preventScroll:true});}
 }
 function schedule(){window.clearTimeout(timer);if(!panel.hidden)timer=window.setTimeout(()=>{if(panel.contains(document.activeElement))schedule();else close();},autoCloseMs);}
 function refresh(){
  const id=service();const provider=musicProviders[id];
  triggers.forEach(button=>{button.replaceChildren(musicIcon(document,id));button.dataset.musicProvider=id;button.setAttribute('aria-label',`${provider.name} · ${text('abrir acceso rápido','open quick access')}`);button.setAttribute('title',provider.name);button.setAttribute('aria-controls','music-shortcut-panel');button.setAttribute('aria-haspopup','dialog');});
  $('music-shortcut-brand').replaceChildren(musicIcon(document,id));$('music-shortcut-title').textContent=provider.name;
  const link=$('music-shortcut-open');link.href=provider.url;link.textContent=`${text('Abrir','Open')} ${provider.name}`;
  $('music-shortcut-note').textContent=text('La reproducción y sus controles se usan en la aplicación de música.','Playback and its controls are handled in your music app.');
  $('music-shortcut-change').textContent=text('Cambiar aplicación','Change app');$('music-shortcut-close').setAttribute('aria-label',text('Cerrar acceso a música','Close music shortcut'));
  document.querySelectorAll('.music-service').forEach(button=>{const icon=button.querySelector('.music-service-icon');if(icon&&musicProviders[button.dataset.musicService])icon.replaceChildren(musicIcon(document,button.dataset.musicService));});
 }
 function place(){
  const anchor=origin?.getClientRects().length?origin:triggers.find(button=>button.getClientRects().length);
  if(!anchor)return;
  panel.style.top='';panel.style.bottom='';
  const bounds=anchor.getBoundingClientRect();const height=panel.getBoundingClientRect().height;
  if(bounds.top-height-12>=12){panel.style.bottom=`${window.innerHeight-bounds.top+12}px`;panel.style.top='auto';}
  else if(bounds.bottom+height+24<=window.innerHeight){panel.style.top=`${bounds.bottom+12}px`;panel.style.bottom='auto';}
  else{panel.style.top=`${Math.max(12,(window.innerHeight-height)/2)}px`;panel.style.bottom='auto';}
 }
 function open(event){
  if(triggers.includes(event?.currentTarget))origin=event.currentTarget;
  refresh();panel.hidden=false;place();triggers.forEach(button=>button.setAttribute('aria-expanded','true'));
  if(event?.detail===0)$('music-shortcut-open').focus({preventScroll:true});
  schedule();
 }
 triggers.forEach(button=>{button.setAttribute('aria-expanded','false');button.addEventListener('click',event=>{if(panel.hidden)open(event);else close();});});
 $('music-shortcut-close').addEventListener('click',()=>close(true));
 $('music-shortcut-open').addEventListener('click',()=>close());
 $('music-shortcut-change').addEventListener('click',()=>{close();onChoose();});
 panel.addEventListener('pointerdown',schedule);panel.addEventListener('keydown',schedule);panel.addEventListener('focusout',schedule);
 document.addEventListener('pointerdown',event=>{if(!panel.hidden&&!panel.contains(event.target)&&!triggers.some(button=>button.contains(event.target)))close();});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden){event.preventDefault();event.stopImmediatePropagation();close(true);}},true);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)close();});
 window.addEventListener('pagehide',()=>close());
 window.addEventListener('resize',()=>{if(!panel.hidden)place();});
 refresh();return{open,close,refresh};
}
