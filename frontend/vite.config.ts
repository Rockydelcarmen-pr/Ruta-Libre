import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "Protest Tracker",
        short_name: "Protests",
        description:
          "Route around active protests and marches, with full context on each.",
        theme_color: "#1f2a44",
        background_color: "#0f1420",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        // Cache the last-fetched protest list so it survives offline.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api/protests"),
            handler: "NetworkFirst",
            options: {
              cacheName: "protests-api",
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  // MapLibre ships a web worker that Vite's dep optimizer mangles, leaving the
  // map blank. Excluding it lets the worker load correctly.
  optimizeDeps: {
    exclude: ["maplibre-gl"],
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      // Dev convenience: proxy API calls to the backend.
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
