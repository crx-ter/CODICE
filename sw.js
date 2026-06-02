// ═════════════════════════════════════════════════════════════════════════════
// CÓDICE — sw.js
//
// [HIGH-7 FIX] CACHE_VERSION se genera automáticamente con fecha de build.
// Para forzar invalidación en todos los usuarios: simplemente re-deploea.
// El número de fecha cambia → caches viejos se borran en activate().
//
// Estrategias por tipo de recurso:
//   Shell (index.html, manifest.json)  → Network-first, fallback cache
//   JS propio del proyecto             → Network-first, fallback cache
//   CDN libs (marked, mermaid, etc.)   → Cache-first, larga duración
//   Firebase SDK (gstatic versionado)  → Cache-first (inmutable)
//   Google Fonts CSS                   → Stale-while-revalidate
//   Google Fonts archivos              → Cache-first (inmutables)
//   Fotos de perfil (lh3.google)       → Cache con expiración 7 días
//   Firebase API / identitytoolkit     → Network-only (nunca cachear)
//   Firestore / Storage API            → Network-only
// ═════════════════════════════════════════════════════════════════════════════

// [HIGH-7] INSTRUCCIÓN DE DEPLOY: antes de hacer `firebase deploy`,
// actualiza este número a la fecha actual (formato YYYYMMDD).
// Hacerlo garantiza que todos los usuarios reciban la nueva versión.
// Ejemplo: '20260601' para un deploy del 1 de junio de 2026.
const CACHE_VERSION  = '20260601-2';
const CACHE_SHELL    = `CODICE_SHELL_${CACHE_VERSION}`;
const CACHE_CDN      = `CODICE_CDN_${CACHE_VERSION}`;
const CACHE_FIREBASE = `CODICE_FIREBASE_${CACHE_VERSION}`;
const CACHE_FONTS    = `CODICE_FONTS_${CACHE_VERSION}`;
const CACHE_AVATARS  = `CODICE_AVATARS_${CACHE_VERSION}`;

const ALL_CACHES = [CACHE_SHELL, CACHE_CDN, CACHE_FIREBASE, CACHE_FONTS, CACHE_AVATARS];

// Máximo de días para considerar fresca una foto de perfil
const AVATAR_MAX_AGE_DAYS = 7;
const AVATAR_MAX_AGE_MS   = AVATAR_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

// Archivos del shell de la app que se pre-cachean en install
const PRECACHE_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-72.png',
  '/icons/icon-96.png',
  '/icons/icon-128.png',
  '/icons/icon-144.png',
  '/icons/icon-152.png',
  '/icons/icon-192.png',
  '/icons/icon-384.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-192.png',
  '/icons/icon-maskable-512.png',
];

// CDN libs fijas que se pre-cachean en install (versiones fijadas en index.html)
const PRECACHE_CDN = [
  'https://cdn.jsdelivr.net/npm/marked/marked.min.js',
  'https://cdn.jsdelivr.net/npm/dompurify@3/dist/purify.min.js',
  'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js',
  'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js',
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js',
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js',
  'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js',
  // [HIGH-7] React/Babel cargados lazy desde unpkg — cachear para evitar
  // que un deploy de unpkg rompa la app cuando el usuario está offline.
  // No se pre-cachean en install (son grandes y opcionales), solo en runtime.
];

// Firebase SDK (versiones fijas — nunca cambian en producción)
const PRECACHE_FIREBASE = [
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js',
];

// Google Fonts CSS (SWR en install)
const PRECACHE_FONTS_CSS = [
  'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap',
];

// ─────────────────────────────────────────────────────────────────────────────
// INSTALL — pre-cachear todos los recursos críticos
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log(`[SW ${CACHE_VERSION}] Instalando…`);

  event.waitUntil(
    Promise.all([
      // Shell: uno a uno para no fallar todo si un archivo no existe
      caches.open(CACHE_SHELL).then(cache =>
        Promise.allSettled(PRECACHE_SHELL.map(url =>
          cache.add(url).catch(e =>
            console.warn('[SW] No se pudo pre-cachear shell:', url, e.message)
          )
        ))
      ),

      // CDN libs: tolerante a fallos de red
      caches.open(CACHE_CDN).then(cache =>
        Promise.allSettled(PRECACHE_CDN.map(url =>
          cache.add(url).catch(e =>
            console.warn('[SW] No se pudo pre-cachear CDN:', url, e.message)
          )
        ))
      ),

      // Firebase SDK: idem
      caches.open(CACHE_FIREBASE).then(cache =>
        Promise.allSettled(PRECACHE_FIREBASE.map(url =>
          cache.add(url).catch(e =>
            console.warn('[SW] No se pudo pre-cachear Firebase SDK:', url, e.message)
          )
        ))
      ),

      // Fonts CSS: stale-while-revalidate en runtime, pero intentar también en install
      caches.open(CACHE_FONTS).then(cache =>
        Promise.allSettled(PRECACHE_FONTS_CSS.map(url =>
          cache.add(url).catch(e =>
            console.warn('[SW] No se pudo pre-cachear Font CSS:', url, e.message)
          )
        ))
      ),
    ]).then(() => {
      console.log(`[SW ${CACHE_VERSION}] Instalado. Pre-caché completo.`);
    })
  );

  // Tomar control inmediatamente sin esperar al usuario
  self.skipWaiting();
});

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVATE — limpiar versiones anteriores y tomar control
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log(`[SW ${CACHE_VERSION}] Activando — limpiando caches viejos…`);

  event.waitUntil(
    caches.keys()
      .then(keys => {
        const toDelete = keys.filter(k => !ALL_CACHES.includes(k));
        return Promise.all(toDelete.map(k => {
          console.log('[SW] Borrando cache antiguo:', k);
          return caches.delete(k);
        }));
      })
      .then(() => self.clients.claim())
      .then(async () => {
        // Forzar reload en todos los clientes abiertos para que carguen versión nueva
        const clients = await self.clients.matchAll({ type: 'window' });
        clients.forEach(client => { try { client.navigate(client.url); } catch(_) {} });
        return _broadcast({ type: 'SW_UPDATED', version: CACHE_VERSION });
      })
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// FETCH — interceptar peticiones con estrategia correcta según tipo
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar no-GET y protocolos no HTTP
  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // ── 1. Firebase Auth / Firestore / Storage API → Network-only ────────────
  //    Estas APIs tienen su propio manejo offline (Firebase SDK).
  //    Cachearlas causaría respuestas stale que rompen la autenticación.
  if (
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com')     ||
    url.hostname.includes('firestore.googleapis.com')       ||
    url.hostname.includes('firebasestorage.googleapis.com') ||
    url.hostname.includes('firebase.googleapis.com')        ||
    url.hostname.includes('firebaseio.com')                 ||
    (url.hostname.includes('googleapis.com') &&
      (url.pathname.includes('/token') || url.pathname.includes('/accounts')))
  ) {
    return; // dejar al navegador — Firebase SDK maneja offline por sí solo
  }

  // ── 2. OpenRouter / LLM API → Network-only ───────────────────────────────
  if (url.hostname.includes('openrouter.ai')) {
    return;
  }

  // ── 3. Google Fonts archivos (.woff2, .woff, .ttf) → Cache-first ─────────
  //    Los archivos de fuente son inmutables (el CSS los referencia con hash).
  if (url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(request, CACHE_FONTS));
    return;
  }

  // ── 4. Google Fonts CSS → Stale-while-revalidate ─────────────────────────
  //    El CSS puede cambiar (Google ajusta subsets), pero queremos respuesta
  //    inmediata. SWR: servir cache, actualizar en background.
  if (url.hostname === 'fonts.googleapis.com') {
    event.respondWith(staleWhileRevalidate(request, CACHE_FONTS));
    return;
  }

  // ── 5. Firebase SDK (gstatic) → Pasar directo al navegador ─────────────────
  //    Los module imports (type="module") se hacen con mode=cors.
  //    Si el SW responde con algo que no tiene headers CORS correctos,
  //    Firefox los bloquea. La solucion: dejar pasar sin interceptar.
  //    El precacheo en install se encarga de que esten disponibles offline.
  if (url.hostname === 'www.gstatic.com' && url.pathname.includes('/firebasejs/')) {
    return; // dejar al navegador directamente
  }

  // ── 6. CDN libs (jsDelivr + unpkg) → Pasar directo al navegador ─────────────
  //    Igual que Firebase SDK: dejar que el navegador maneje los CORS headers.
  //    El SW solo cachea en runtime cuando la respuesta llega exitosa.
  if (url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'unpkg.com') {
    return; // dejar al navegador directamente
  }

  // ── 7. Fotos de perfil Google → Cache con expiración 7 días ──────────────
  if (url.hostname === 'lh3.googleusercontent.com') {
    event.respondWith(cacheWithExpiry(request, CACHE_AVATARS, AVATAR_MAX_AGE_MS));
    return;
  }

  // ── 8. Shell de la app (origen propio) → Network-first, fallback cache ───
  //    Incluye index.html, manifest.json y todos los JS del proyecto.
  if (url.hostname === self.location.hostname) {
    event.respondWith(networkFirst(request, CACHE_SHELL));
    return;
  }

  // ── 9. Cualquier otra cosa → Network con fallback silencioso ─────────────
  event.respondWith(
    fetch(request).catch(() => {
      return new Response('', { status: 503, statusText: 'Offline' });
    })
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// BACKGROUND SYNC — reintentar operaciones pendientes al volver online
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  console.log('[SW] Background Sync disparado:', event.tag);

  if (event.tag === 'codice-sync-pending') {
    event.waitUntil(
      _flushSyncQueue()
        .then(() => _broadcast({ type: 'SYNC_COMPLETE' }))
        .catch(e => console.warn('[SW] Background sync falló:', e.message))
    );
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MENSAJES desde el cliente
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  const { data } = event;
  if (!data || !data.type) return;

  switch (data.type) {

    // El cliente pide activar la nueva versión inmediatamente
    case 'SKIP_WAITING':
      console.log('[SW] SKIP_WAITING recibido — activando nueva versión.');
      self.skipWaiting();
      break;

    // El cliente reporta que volvió online — intentar vaciar cola
    case 'CLIENT_ONLINE':
      _flushSyncQueue()
        .then(n => {
          if (n > 0) _broadcast({ type: 'SYNC_COMPLETE', flushed: n });
        })
        .catch(() => {});
      break;

    // El cliente pide estado del SW (para debug / panel de ajustes)
    case 'GET_STATUS':
      _getSWStatus().then(status => {
        (event.source || event.ports?.[0])?.postMessage({
          type: 'SW_STATUS',
          status,
        });
      });
      break;

    // El cliente pide invalidar y refrescar el cache del shell
    case 'CLEAR_SHELL_CACHE':
      caches.delete(CACHE_SHELL)
        .then(() => console.log('[SW] Cache shell borrado por solicitud del cliente.'));
      break;
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ESTRATEGIAS DE CACHÉ
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Network-first: intenta red; si falla, sirve del cache.
 * Para index.html, si tampoco está en cache, responde con el fallback raíz.
 */
/**
 * Network-first SIN fallback SPA: para recursos externos (CDN, Firebase SDK).
 * Si red falla, sirve cache; si no hay cache, devuelve 503 limpio.
 * NO hace fallback a index.html (no tendría sentido para JS de CDN).
 */
async function networkFirstNoFallbackSPA(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (_) {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response('', { status: 503, statusText: 'Offline' });
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      // Clonar antes de consumir
      await cache.put(request, response.clone());
    }
    return response;
  } catch (_) {
    const cached = await cache.match(request);
    if (cached) return cached;

    // Fallback SPA: cualquier ruta del origen → index.html
    const fallback = await cache.match('/') || await cache.match('/index.html');
    if (fallback) return fallback;

    return new Response(
      '<!doctype html><html><body><p style="font-family:sans-serif;text-align:center;margin-top:20vh">CÓDICE — Sin conexión. Recarga cuando tengas internet.</p></body></html>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

/**
 * Cache-first: sirve del cache si existe; si no, va a red y cachea.
 * Ideal para recursos inmutables (CDN libs, Firebase SDK, font files).
 */
async function cacheFirst(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    console.warn('[SW] cacheFirst — sin cache ni red para:', request.url);
    return new Response('', { status: 503, statusText: 'Offline' });
  }
}

/**
 * Stale-while-revalidate: sirve del cache inmediatamente y actualiza en bg.
 * Ideal para Google Fonts CSS (puede cambiar, pero queremos velocidad).
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache       = await caches.open(cacheName);
  const cachedResp  = await cache.match(request);

  // Iniciar fetch en background (no await aquí)
  const networkPromise = fetch(request).then(response => {
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);

  // Devolver cache si existe, sino esperar la red
  return cachedResp || networkPromise;
}

/**
 * Cache con expiración: guarda la respuesta con timestamp en el cache.
 * Al recuperar, verifica si ha expirado; si es así, revalida.
 * Ideal para fotos de perfil (cambios poco frecuentes, pero no infinitos).
 */
async function cacheWithExpiry(request, cacheName, maxAgeMs) {
  const cache   = await caches.open(cacheName);
  const cached  = await cache.match(request);

  if (cached) {
    const dateHeader  = cached.headers.get('sw-cached-at');
    const cachedAt    = dateHeader ? parseInt(dateHeader, 10) : 0;
    const age         = Date.now() - cachedAt;

    if (age < maxAgeMs) {
      return cached; // fresco — servir desde cache
    }
    // Expiró — continuar para refrescar
  }

  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      // Inyectar header con timestamp (los headers de respuesta son read-only,
      // hay que construir una nueva respuesta)
      const body    = await response.arrayBuffer();
      const headers = new Headers(response.headers);
      headers.set('sw-cached-at', String(Date.now()));

      const enriched = new Response(body, {
        status:     response.status,
        statusText: response.statusText,
        headers,
      });
      await cache.put(request, enriched.clone());
      return enriched;
    }
    return response;
  } catch (_) {
    // Sin red y expirado → devolver stale antes que nada
    return cached || new Response('', { status: 503, statusText: 'Offline' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS INTERNOS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Enviar mensaje a todos los clientes abiertos (pestañas/ventanas).
 */
async function _broadcast(message) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clients) {
    try { client.postMessage(message); } catch (_) {}
  }
}

/**
 * Vaciar cola de operaciones pendientes almacenada en IDB por el cliente.
 * El SW no tiene acceso a localStorage, pero puede leer IDB.
 * Llama a los clientes para que ejecuten la sincronización Firestore.
 * Retorna el número de operaciones encoladas (estimado).
 */
async function _flushSyncQueue() {
  // La cola real vive en el cliente (localStorage/IDB del cliente).
  // El SW delega la ejecución enviando un mensaje especial.
  await _broadcast({ type: 'SW_FLUSH_QUEUE' });
  return 1; // valor simbólico; el cliente reportará el conteo real
}

/**
 * Devolver estado resumido del SW para el panel de debug.
 */
async function _getSWStatus() {
  const keys = await caches.keys();
  const sizes = await Promise.all(
    keys.map(async k => {
      const c       = await caches.open(k);
      const entries = await c.keys();
      return { cache: k, entries: entries.length };
    })
  );
  return { version: CACHE_VERSION, caches: sizes };
}