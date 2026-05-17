import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        // Bump cache size; PWA HTML/JS/CSS sit comfortably under this.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,svg,ico,woff2}'],
        // Exclude Supabase auth and Edge Functions from caching entirely.
        // These endpoints return user-specific sessions/tokens that must
        // never be served from a stale cache (especially after sign-out).
        navigateFallbackDenylist: [/\/auth\/v1\//, /\/functions\/v1\//],
        runtimeCaching: [
          {
            // Cache Supabase REST/PostgREST data requests (tables only).
            // Explicitly exclude auth and functions paths.
            // NetworkFirst => online users get fresh data; offline users
            // see the last successful response.
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-rest',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Storage (avatars, files) — cache-first is fine.
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'supabase-storage',
              expiration: { maxEntries: 50, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // TMDB poster images — large, immutable. Cache hard.
            urlPattern: /^https:\/\/image\.tmdb\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'tmdb-images',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Telegram WebApp SDK — small, immutable per release.
            urlPattern: /^https:\/\/telegram\.org\/js\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'telegram-sdk',
              expiration: { maxEntries: 5, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Weather icons from weatherapi.com (used in Hub weather widget).
            urlPattern: /^https?:\/\/cdn\.weatherapi\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'weather-icons',
              expiration: { maxEntries: 50, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: false, // use existing public/manifest.json
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    hmr: process.env.DISABLE_HMR !== 'true',
  },
});
