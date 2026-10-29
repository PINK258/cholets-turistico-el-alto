// Service worker de la PWA "Cholets Turístico El Alto".
// Las paginas se piden siempre a internet (asi nunca se ven datos viejos);
// solo si no hay conexion se muestra la pagina /offline.html guardada.
// No se guarda nada de la API ni de los archivos de Next.js.
const CACHE = 'cholets-v2';
const PARA_SIN_CONEXION = ['/offline.html', '/iconos/icon-192.png', '/imagenes/logos/logo-icono.png', '/iconos/wifi-off.png'];

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PARA_SIN_CONEXION)));
  self.skipWaiting();
});

// Al actualizar el service worker se borran los caches de versiones anteriores.
self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;
  // Solo la navegacion entre paginas: si falla (sin internet), pagina amable.
  if (pedido.mode === 'navigate') {
    evento.respondWith(fetch(pedido).catch(() => caches.match('/offline.html')));
    return;
  }
  // Recursos de la propia pagina sin conexion (logo e icono).
  const url = new URL(pedido.url);
  if (url.origin === self.location.origin && PARA_SIN_CONEXION.includes(url.pathname)) {
    evento.respondWith(caches.match(pedido).then((guardado) => guardado || fetch(pedido)));
  }
});
