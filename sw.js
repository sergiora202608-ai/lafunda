/* La Funda: la app abre sin conexión. Primero intenta la red (para tener siempre la última versión) y, si no hay, usa la copia guardada. */
const C='lafunda-v17';
const SHELL=['./','index.html','contenido.json','manifest.webmanifest','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url); if(e.request.method!=='GET'||u.origin!==location.origin) return;
  e.respondWith(fetch(e.request).then(r=>{if(r.ok){const cp=r.clone(); caches.open(C).then(c=>c.put(e.request,cp));} return r;})
    .catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||caches.match('index.html'))));
});
self.addEventListener('notificationclick',e=>{e.notification.close(); e.waitUntil(self.clients.matchAll({type:'window'}).then(ws=>{for(const w of ws){if('focus' in w) return w.focus();} return self.clients.openWindow('./#lista');}));});
