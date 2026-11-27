/* English reader service worker: keeps the app usable offline */
const VERSION='reader-v3';
/* adds cross-origin isolation headers so the AI voice can use several CPU threads */
function coi(r){if(!r||r.status===0||r.type==='opaque'||r.type==='opaqueredirect')return r;const h=new Headers(r.headers);h.set('Cross-Origin-Embedder-Policy','require-corp');h.set('Cross-Origin-Opener-Policy','same-origin');h.set('Cross-Origin-Resource-Policy','same-origin');return new Response(r.body,{status:r.status,statusText:r.statusText,headers:h})}
const KEEP=[VERSION,'reader-dict2','reader-ai'];
const SHELL=["./", "index.html", "manifest.webmanifest", "lib/jszip.min.js", "lib/pdf.min.js", "lib/pdf.worker.min.js", "fonts/inter-latin-400-normal.woff2", "fonts/inter-latin-500-normal.woff2", "fonts/inter-latin-600-normal.woff2", "fonts/inter-latin-700-normal.woff2", "fonts/literata-latin-400-italic.woff2", "fonts/literata-latin-400-normal.woff2", "fonts/literata-latin-600-italic.woff2", "fonts/literata-latin-600-normal.woff2", "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png"];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('reader-')&&!KEEP.includes(k)).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;
  const url=new URL(req.url);if(url.origin!==location.origin)return;
  if(url.pathname.includes('/lib/ort/')||url.pathname.endsWith('/lib/kokoro.web.js')){
    e.respondWith(Promise.resolve(caches.open('reader-ai').then(c=>c.match(req).then(hit=>hit||fetch(req).then(r=>{if(r.ok)c.put(req,r.clone());return r})))).then(coi));return}
  if(url.pathname.includes('/dict2/')){
    e.respondWith(Promise.resolve(caches.open('reader-dict2').then(c=>c.match(req).then(hit=>hit||fetch(req).then(r=>{if(r.ok)c.put(req,r.clone());return r})))).then(coi));return}
  if(req.mode==='navigate'){
    e.respondWith(Promise.resolve(fetch(req).then(r=>{if(r.ok){const cp=r.clone();caches.open(VERSION).then(c=>c.put('index.html',cp))}return r}).catch(()=>caches.match('index.html'))).then(coi));return}
  e.respondWith(Promise.resolve(caches.match(req,{ignoreSearch:true}).then(hit=>hit||fetch(req).then(r=>{if(r.ok){const cp=r.clone();caches.open(VERSION).then(c=>c.put(req,cp))}return r}))).then(coi));
});
