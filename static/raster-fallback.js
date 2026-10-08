/* CPU/SVG/raster fallback. No WebGL, GPS, prefetch, offline storage or external search. */
export function countryLongitude(lon,bbox){if(!Number.isFinite(lon))return lon;let x=lon;while(x<bbox[0])x+=360;while(x>bbox[2])x-=360;return x;}

export function createRasterFallback({L,container,bbox,config,onReady,onError,onEvidence}){
 if(!L?.map||!L?.tileLayer)throw Error('二维地图引擎尚未取得');
 const llBounds=[[Math.max(-85,bbox[1]),bbox[0]],[Math.min(85,bbox[3]),bbox[2]]];
 const native=L.map(container,{zoomControl:false,attributionControl:true,minZoom:0,maxZoom:18,zoomSnap:0.1,zoomDelta:1,maxBounds:llBounds,maxBoundsViscosity:1,worldCopyJump:false,preferCanvas:false,zoomAnimation:false,fadeAnimation:false,markerZoomAnimation:false,keyboard:true});
 native.fitBounds(llBounds,{padding:[42,42],animate:false});
 const fit=native.getZoom();native.setMinZoom(fit);
 const group=L.layerGroup().addTo(native),sources=new Map();let tileSuccess=0,initialReady=false,removed=false;
 const tiles=L.tileLayer(config.url,{minZoom:0,maxZoom:18,maxNativeZoom:config.max_native_zoom||19,attribution:config.attribution,updateWhenIdle:true,updateWhenZooming:false,keepBuffer:1,detectRetina:false,crossOrigin:false,referrerPolicy:'strict-origin-when-cross-origin'}).addTo(native);
 tiles.on('tileload',()=>{tileSuccess++;});tiles.on('tileerror',()=>{if(!removed)onError('部分公共底图瓦片未取得；没有补造地理图像。');});
 tiles.on('load',()=>{if(!removed&&!initialReady&&tileSuccess){initialReady=true;onReady();}});
 function populate(data){group.clearLayers();for(const f of data?.features||[]){const [lng,lat]=f.geometry.coordinates;const pos=[lat,countryLongitude(lng,bbox)];const marker=L.circleMarker(pos,{radius:7,color:'#fff',weight:2,fillColor:f.properties.uploaded?'#a88243':'#263c23',fillOpacity:1});marker.on('click',()=>onEvidence(f.properties.id));marker.addTo(group);}}
 const api={
  engine:'raster2d',addControl(){},getZoom:()=>native.getZoom(),setMinZoom:v=>native.setMinZoom(v),cameraForBounds:()=>{const prior=native.getMinZoom();native.setMinZoom(0);const zoom=native.getBoundsZoom(llBounds,false,L.point(84,84));native.setMinZoom(prior);return{zoom}},
  getCenter:()=>({toArray:()=>[native.getCenter().lng,native.getCenter().lat]}),
  jumpTo:v=>native.setView([v.center[1],countryLongitude(v.center[0],bbox)],v.zoom,{animate:false}),
  easeTo:v=>native.setView([v.center[1],countryLongitude(v.center[0],bbox)],Math.max(native.getMinZoom(),Math.min(18,v.zoom)),{animate:!!v.duration,duration:(v.duration||0)/1000}),
  fitBounds:(b,o={})=>native.fitBounds([[b[0][1],b[0][0]],[b[1][1],b[1][0]]],{padding:[o.padding||42,o.padding||42],animate:!!o.duration,duration:(o.duration||0)/1000,maxZoom:o.maxZoom}),
  resize:()=>native.invalidateSize({pan:false}),stop:()=>native.stop(),remove(){removed=true;native.remove();},isStyleLoaded:()=>true,
  getSource:id=>sources.get(id),addSource(id,source){const entry={data:source.data,setData(data){entry.data=data;populate(data)}};sources.set(id,entry);populate(source.data);},addLayer(){},
  on(name,arg,fn){if(name==='moveend')native.on(name,arg);return api;},getCanvas:()=>container,
  zoomIn:o=>native.zoomIn(1,{animate:!!o?.duration,duration:(o?.duration||0)/1000}),zoomOut:o=>native.zoomOut(1,{animate:!!o?.duration,duration:(o?.duration||0)/1000})
 };
 return api;
}
