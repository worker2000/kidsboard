const CACHE_NAME = 'familytool-static-v1'

// Only these truly static assets get cached
const PRECACHE = [
  '/familytool/manifest.webmanifest',
  '/familytool/icons/icon.svg',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE).catch(() => {}))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('push', (event) => {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title || 'Familytool', {
      body: data.body || '',
      icon: data.icon || '/familytool/icons/icon-192.png',
      badge: data.badge || '/familytool/icons/icon-192.png',
      data: { url: data.url || '/familytool/' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((list) => {
      const url = event.notification.data?.url || '/familytool/'
      for (const client of list) {
        if (client.url.includes('/familytool') && 'focus' in client) return client.focus()
      }
      return clients.openWindow(url)
    })
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  if (!request.url.startsWith(self.location.origin)) return

  const url = new URL(request.url)

  // API calls: always network, never cache
  if (url.pathname.includes('/familytool/api/')) return

  // Next.js content-hashed static chunks: cache-first (immutable, safe to cache forever)
  if (url.pathname.includes('/_next/static/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request)
        if (cached) return cached
        const response = await fetch(request)
        if (response.ok) cache.put(request, response.clone())
        return response
      })
    )
    return
  }

  // HTML pages (navigation): always network-first, never return stale HTML
  // This prevents stale webpack runtimes with wrong chunk hashes after deployments
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    )
    return
  }

  // Everything else (icons, manifests, etc.): cache-first
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request)
      if (cached) return cached
      const response = await fetch(request)
      if (response.ok) cache.put(request, response.clone())
      return response
    })
  )
})
