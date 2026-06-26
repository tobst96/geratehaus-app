import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Das PWA-Manifest kommt bewusst NICHT von vite-plugin-pwa, sondern dynamisch
// vom Backend (/api/v1/manifest.webmanifest) – Name, Icon und Theme-Farbe
// sollen sich mit den Moderator-Einstellungen ändern, ohne Neubau des
// Frontends. vite-plugin-pwa wird hier nur für den Service Worker genutzt.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      manifest: false,
      injectRegister: "auto",
      registerType: "autoUpdate",
      workbox: {
        navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//],
        // Ohne skipWaiting/clientsClaim übernimmt ein neuer Service Worker
        // erst die Kontrolle, nachdem alle offenen Tabs geschlossen wurden –
        // bis dahin liefert der alte SW über navigateFallback weiterhin das
        // alte, gecachte index.html (mit altem JS-Bundle, alter Routen-
        // Tabelle) für jede neue Navigation aus. Das führte dazu, dass neu
        // hinzugekommene Routen (z. B. /mitglied-anmelden/:token) auf einem
        // Gerät, das die Seite schon vor diesem Deploy besucht hatte, als
        // "Seite nicht gefunden" erschienen, bis der SW durch einen
        // zusätzlichen Reload aktualisiert wurde.
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: {
    proxy: {
      "/api": "http://localhost:8000",
      "/uploads": "http://localhost:8000",
    },
  },
});
