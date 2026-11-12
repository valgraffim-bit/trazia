export const REPORT_LIFETIME_MS = 60 * 60 * 1000;
export const REPORT_LIMIT = 500;
const TYPES = new Set(['traffic','police','crash','security','hazard','lane','closure','map','animal','weather','fuel','assistance','place']);
const SDK = 'https://www.gstatic.com/firebasejs/11.10.0/';

export function cleanSharedDraft(draft) {
  if (!draft || !TYPES.has(draft.type) || !Number.isFinite(draft.lat) || Math.abs(draft.lat)>90 || !Number.isFinite(draft.lng) || Math.abs(draft.lng)>180) throw new Error('invalid-report');
  const result={type:draft.type,details:String(draft.details||'').trim().slice(0,180),lat:draft.lat,lng:draft.lng,locationSource:draft.locationSource==='gps'?'gps':'map'};
  if(typeof draft.subtype==='string' && draft.subtype)result.subtype=draft.subtype.slice(0,80);
  if(['fuel','place'].includes(draft.type)){
    if(typeof draft.placeName!=='string'||!draft.placeName.trim())throw new Error('invalid-report');
    result.placeName=draft.placeName.trim().slice(0,100);
  }
  if(draft.type==='fuel'){
    const fuel=draft.fuel;
    if(!fuel||!Number.isFinite(fuel.price)||fuel.price<=0||fuel.price>1000000||!['Gasolina corriente','Gasolina extra','Diésel','Gas natural','Energía eléctrica'].includes(fuel.type)||!['galón','litro','m³','kWh'].includes(fuel.unit))throw new Error('invalid-report');
    result.fuel={type:fuel.type,price:fuel.price,currency:'COP',unit:fuel.unit};
  }
  return result;
}

export function sharedReportFromSnapshot(snapshot) {
  if(snapshot.metadata?.hasPendingWrites)return null;
  const data=snapshot.data();
  const createdAt=data?.createdAt?.toMillis?.();
  if(!Number.isFinite(createdAt)||typeof data.authorId!=='string')return null;
  try {
    const draft=cleanSharedDraft(data);
    return {...draft,id:snapshot.id,authorId:data.authorId,shared:true,createdAt:new Date(createdAt).toISOString(),expiresAt:new Date(createdAt+REPORT_LIFETIME_MS).toISOString()};
  } catch { return null; }
}

export function activeSharedReports(reports, now=Date.now()) {
  return reports.filter(report=>report.shared===true&&Number.isFinite(Date.parse(report.createdAt))&&Date.parse(report.createdAt)+REPORT_LIFETIME_MS>now);
}

export function communityReportError(error) {
  const code=String(error?.code||error?.message||'');
  if(code.includes('permission-denied'))return 'No se pudo publicar. Revisá la conexión o esperá 30 segundos antes de enviar otro reporte.';
  if(code.includes('resource-exhausted'))return 'Se alcanzó el límite temporal de reportes. Intentá más tarde.';
  if(code.includes('unavailable')||code==='offline')return 'Sin conexión. Reconectá para publicar reportes.';
  if(code==='invalid-report')return 'Revisá el tipo, los datos y la ubicación del reporte.';
  return 'Los reportes compartidos no están disponibles. Intentá reconectar.';
}

// Separate the repository from CDN imports so its real writes and permissions can be tested locally.
export function createReportRepository({sdk,db,user}) {
  if(!user?.uid)throw new Error('unauthenticated');
  return {
    subscribe(onReports,onError,now=Date.now()) {
      const query=sdk.query(sdk.collection(db,'communityReports'),sdk.where('createdAt','>',sdk.Timestamp.fromMillis(now-REPORT_LIFETIME_MS)),sdk.orderBy('createdAt','desc'),sdk.limit(REPORT_LIMIT));
      return sdk.onSnapshot(query,{includeMetadataChanges:true},snapshot=>onReports(snapshot.docs.map(sharedReportFromSnapshot).filter(Boolean),{fromCache:snapshot.metadata.fromCache}),onError);
    },
    async publish(draft) {
      const clean=cleanSharedDraft(draft);
      const ref=sdk.doc(sdk.collection(db,'communityReports'));
      const batch=sdk.writeBatch(db);
      batch.set(ref,{...clean,authorId:user.uid,createdAt:sdk.serverTimestamp()});
      batch.set(sdk.doc(db,'reportLimits',user.uid),{lastReportAt:sdk.serverTimestamp(),reportId:ref.id});
      await batch.commit();
      return ref.id;
    },
    remove(id) { return sdk.deleteDoc(sdk.doc(db,'communityReports',id)); },
  };
}

export async function createCommunityReportService(config,user) {
  const [app,sdk]=await Promise.all([import(`${SDK}firebase-app.js`),import(`${SDK}firebase-firestore.js`)]);
  const firebase=app.getApps().find(instance=>instance.name==='trazia-accounts')||app.initializeApp(config,'trazia-accounts');
  return createReportRepository({sdk,db:sdk.getFirestore(firebase),user});
}

export function watchCommunityReports(service,{onReports,onStatus,clock=()=>Date.now(),timers=globalThis}) {
  let latest=[];let unsubscribe;let stopped=false;let signature=null;let generation=0;
  function emit() {
    const active=activeSharedReports(latest,clock());
    const next=active.map(report=>report.id).join('|');
    if(signature===next)return;
    signature=next;onReports(active);
  }
  function reconnect() {
    if(stopped)return;
    generation++;const current=generation;
    unsubscribe?.();onStatus('connecting');
    unsubscribe=service.subscribe((reports,metadata)=>{
      if(stopped||generation!==current)return;
      latest=reports;emit();onStatus(metadata.fromCache?'offline':'ready');
    },error=>{if(!stopped&&generation===current)onStatus('error',error);},clock());
  }
  const timer=timers.setInterval(emit,1000);
  reconnect();
  return {reconnect,refresh:emit,stop(){if(stopped)return;stopped=true;generation++;unsubscribe?.();timers.clearInterval(timer);latest=[];signature=null;onReports([]);}};
}
