import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub project Pages: site is at https://<user>.github.io/<repo>/ — asset
// URLs must be under /<repo>/, not /. Relative base fixes that without hardcoding.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? './' : '/',
}));
