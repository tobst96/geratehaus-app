/* Web-Push-Handler. Wird vom generierten Workbox-Service-Worker via
 * workbox.importScripts geladen (siehe vite.config.ts). Das Backend sendet
 * einen JSON-Payload { titel, nachricht, url? } (siehe services/notifier/webpush.py). */

self.addEventListener("push", (event) => {
  let daten = { titel: "Gerätehaus.app", nachricht: "", url: "/" };
  if (event.data) {
    try {
      daten = { ...daten, ...event.data.json() };
    } catch (e) {
      daten.nachricht = event.data.text();
    }
  }
  const optionen = {
    body: daten.nachricht || "",
    icon: "/api/v1/standard-icon.svg",
    badge: "/api/v1/standard-icon.svg",
    data: { url: daten.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(daten.titel || "Gerätehaus.app", optionen));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const ziel = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(ziel);
    })
  );
});
