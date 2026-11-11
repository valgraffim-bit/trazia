const palettes = {
  dark: { background:'#252e40', land:'#2c374b', park:'#254b38', water:'#28697f', waterLine:'#4095af', text:'#e5ebf2', halo:'#202a3a', minor:'#50677f', secondary:'#7794ac', major:'#c9bd50' },
  light: { background:'#eef1f5', land:'#e5eaf0', park:'#b9d9b5', water:'#9ad3e4', waterLine:'#6eb9d2', text:'#304255', halo:'#f7f9fb', minor:'#ffffff', secondary:'#b7c7d5', major:'#e0c95d' },
};
export function roadColors(theme) {
 const p=palettes[theme]||palettes.light;
 return ['match',['get','class'],['motorway','trunk','primary'],p.major,['secondary','tertiary'],p.secondary,p.minor];
}
export function mapLayerPalette(layer, theme) {
 // Overlay data carries its own meaning; never recolor routes, cameras or
 // congestion to match the base-map palette.
 if (layer.id.startsWith('trazia-') && layer.id !== 'trazia-road-network') return {};
 const p=palettes[theme]||palettes.light;
 const source=layer['source-layer']||'';
 if(layer.type==='background')return{'background-color':p.background};
 if(layer.type==='fill'){
  if(source==='water')return{'fill-color':p.water,'fill-opacity':1};
  if(source==='park')return{'fill-color':p.park,'fill-opacity':1};
  if(source==='landcover')return{'fill-color':p.park,'fill-opacity':0.75};
  if(source==='landuse')return{'fill-color':['match',['get','class'],['park','grass','wood','forest','recreation_ground','village_green','cemetery'],p.park,p.land],'fill-opacity':1};
 }
 if(layer.type==='line'&&source==='waterway')return{'line-color':p.waterLine};
 if(layer.type==='line'&&source==='transportation'){
  if(/casing|outline/i.test(layer.id))return{'line-color':theme==='dark'?'#273346':'#becad5'};
  return{'line-color':roadColors(theme)};
 }
 if(layer.type==='symbol'&&layer.layout?.['text-field'])return{'text-color':p.text,'text-halo-color':p.halo,'text-halo-width':1.35};
 return{};
}
