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
