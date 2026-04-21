import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages: relative base. Vercel (VERCEL=1): absolute '/' for assets + /api routes.
export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'brand/evenly-icon.svg',
        'brand/apple-touch-icon.png',
        'brand/pwa-192.png',
        'brand/pwa-512.png',
      ],
      manifest: {
        name: 'Evenly',
        short_name: 'Evenly',
        description:
          'Split receipts with groups — track items, people, and settle up.',
        theme_color: '#178c95',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '.',
        scope: '.',
        icons: [
          {
            src: 'brand/pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'brand/pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'brand/pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg,png,woff2}'],
        navigateFallbackDenylist: [/^\/api\//],
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  base: command === 'build' && process.env.VERCEL !== '1' ? './' : '/',
}));
