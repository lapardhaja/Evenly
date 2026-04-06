import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages: relative base. Vercel (VERCEL=1): absolute '/' for assets + /api routes.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' && process.env.VERCEL !== '1' ? './' : '/',
}));
