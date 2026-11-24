/* La Funda: la app instalada abre al momento con la copia guardada, aunque la cobertura sea mala.
   - La página (index.html): se sirve la copia guardada y, a la vez, se mira en la red si hay una versión nueva.
     Si la hay, se guarda para la próxima vez y se avisa a la app («Hay una versión nueva» → Actualizar).
   - Los ficheros de la app (contenido.json, iconos…): red con 3 s de margen; si tarda más o falla, la copia guardada.
   - Lo que no es de la app (otras páginas del mismo sitio) no pasa por aquí. */
const C='lafunda-v21';
const SHELL=['./','index.html','contenido.json','manifest.webmanifest','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
const sig=r=>r?(r.headers.get('etag')||'')+'|'+(r.headers.get('last-modified')||'')+'|'+(r.headers.get('content-length')||''):'';
const doc=()=>caches.match('index.html').then(r=>r||caches.match('./'));
/* comprueba en segundo plano si la página ha cambiado; solo avisa si el contenido es distinto de verdad */
async function refreshDoc(){
  try{
    const r=await fetch('index.html',{cache:'no-cache'}); if(!r||!r.ok) return;
    const c=await caches.open(C), old=await c.match('index.html');
    if(old&&sig(old)===sig(r)&&sig(r)!=='||') return;
    let changed=false; if(old){const [a,b]=await Promise.all([old.clone().text(),r.clone().text()]); changed=a!==b;}
    await c.put('index.html',r.clone()); await c.put('./',r.clone());
    if(changed){const ws=await self.clients.matchAll({type:'window'}); ws.forEach(w=>w.postMessage({type:'lf-nueva'}));}
  }catch(e){}
}
/* red con margen: si no contesta a tiempo se usa la copia; la respuesta, cuando llegue, se guarda igual */
const timed=(req,ms)=>new Promise((ok,ko)=>{let done=false; const t=setTimeout(()=>{if(!done){done=true; ko(new Error('lento'));}},ms);
  fetch(req).then(r=>{if(r.ok){const cp=r.clone(); caches.open(C).then(c=>c.put(req,cp)).catch(()=>{});} if(!done){done=true; clearTimeout(t); ok(r);}},x=>{if(!done){done=true; clearTimeout(t); ko(x);}});});
/* solo se atiende lo que es de la app: su página y sus ficheros. Cualquier otra cosa del mismo sitio
   (por ejemplo otra página en una subcarpeta, como /control/) no se toca y va directa a la red. */
const ROOT=new URL(self.registration.scope).pathname, OWN=new Set(SHELL.filter(x=>x!=='./'&&x!=='index.html').map(x=>ROOT+x));
self.addEventListener('fetch',e=>{
  const req=e.request, u=new URL(req.url); if(req.method!=='GET'||u.origin!==location.origin) return;
  if(u.pathname===ROOT||u.pathname===ROOT+'index.html'){
    const cached=doc();
    e.respondWith(cached.then(r=>r||fetch(req).then(n=>{if(n.ok){const cp=n.clone(); caches.open(C).then(c=>c.put('index.html',cp)).catch(()=>{});} return n;})));
    e.waitUntil(cached.then(r=>r?refreshDoc():null));
    return;
  }
  if(OWN.has(u.pathname)) e.respondWith(timed(req,3000).catch(()=>caches.match(req,{ignoreSearch:true}).then(r=>r||Response.error())));
});
self.addEventListener('notificationclick',e=>{e.notification.close(); e.waitUntil(self.clients.matchAll({type:'window'}).then(ws=>{for(const w of ws){if('focus' in w) return w.focus();} return self.clients.openWindow('./#lista');}));});
