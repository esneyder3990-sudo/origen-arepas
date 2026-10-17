// Service worker de Origen: muestra los avisos de pedidos nuevos aunque el panel esté cerrado.

self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()))

self.addEventListener("push", (event) => {
  let d = {}
  try {
    d = event.data ? event.data.json() : {}
  } catch {
    d = { title: "Nuevo pedido · Origen", body: event.data ? event.data.text() : "" }
  }
  const titulo = d.title || "🌽 Nuevo pedido · Origen"
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(titulo, {
        body: d.body || "Entró un pedido nuevo",
        icon: "/img/logo-origen-sabores.png",
        badge: "/img/logo-origen-sabores.png",
        tag: d.tag || "pedido",
        renotify: true,
        requireInteraction: true,
        vibrate: [250, 120, 250, 120, 500],
        data: { url: d.url || "/admin" },
      }),
      // Si algún panel está abierto, que suene también la campana de Origen.
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => cs.forEach((c) => c.postMessage({ tipo: "pedido-nuevo" }))),
    ])
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || "/admin"
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
      for (const c of cs) {
        if (new URL(c.url).pathname === url && "focus" in c) return c.focus()
      }
      return self.clients.openWindow(url)
    })
  )
})
