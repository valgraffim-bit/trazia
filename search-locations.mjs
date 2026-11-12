// Search-only reference from the location link supplied by the user.
// This module never creates markers, map labels, favorites or community reports.
const ADDRESS = Object.freeze({
  label: 'Carrera 83B3 #45-53, Cali, Valle del Cauca, Colombia',
  location: Object.freeze({lat:3.384056,lng:-76.517773}),
  placeId: 'ChIJa_eLJRahMI4RX7x1pcEZXCM',
  source: 'https://www.waze.com/es-MX/live-map/directions/co/valle-del-cauca/cali/cra.-83b-3-45-53?to=place.ChIJa_eLJRahMI4RX7x1pcEZXCM',
});

export function knownSharedWazePlace(placeId) {
  return placeId===ADDRESS.placeId?{label:ADDRESS.label,location:{...ADDRESS.location}}:null;
}

export function findSearchLocations(query) {
  const plain=String(query||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim().replace(/[.;]+$/,'');
  const parts=plain.split(',').map(part=>part.trim()).filter(Boolean);
  if(parts.slice(1).some(part=>!['CALI','SANTIAGO DE CALI','VALLE DEL CAUCA','COLOMBIA','COMUNA 17'].includes(part)))return [];
  const street=(parts[0]||'').replace(/\s+(?:SANTIAGO DE )?CALI(?:\s+VALLE DEL CAUCA)?(?:\s+COLOMBIA)?$/,'');
  const match=street.match(/^(?:CARRERA|CRA|CR|KR)\.?\s*83\s*B\s*3(?=$|[\s#-])(.*)$/);
  if(!match)return [];
  let tail=match[1].trim().replace(/^[-–—]\s*#/,'#').replace(/^(?:#|NUMERO|NO\.?|N[°º])\s*/,'');
  tail=tail.replace(/^(\d+)\s+(\d+)$/,'$1-$2');
  const numbers=tail.match(/^(\d*)(?:\s*[-–—]\s*(\d*))?$/);
  if(!numbers||!('45'.startsWith(numbers[1]))||(numbers[2]!==undefined&&(numbers[1]!=='45'||!'53'.startsWith(numbers[2]))))return [];
  return [{type:'Feature',geometry:{type:'Point',coordinates:[ADDRESS.location.lng,ADDRESS.location.lat]},properties:{
    geocoder:'shared-location',name:'Carrera 83B3 #45-53',fullAddress:'Carrera 83B3 #45-53',street:'Carrera 83B3',housenumber:'45-53',city:'Cali',state:'Valle del Cauca',country:'Colombia',countrycode:'CO',sharedLocation:true,sourceUrl:ADDRESS.source,
  }}];
}
