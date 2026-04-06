import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages: relative base. Vercel (VERCEL=1): absolute '/' for assets + /api routes.
export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['evenly-icon.svg'],
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
            src: 'evenly-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg,woff2}'],
        navigateFallbackDenylist: [/^\/api\//],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  base: command === 'build' && process.env.VERCEL !== '1' ? './' : '/',
}));
