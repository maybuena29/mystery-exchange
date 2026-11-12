import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Writes Netlify production security headers to dist/_headers on build,
 * so local Vite / netlify dev HMR inline scripts are not blocked by strict CSP.
 */
function netlifyHeadersPlugin(): Plugin {
  return {
    name: 'netlify-headers',
    closeBundle() {
      // Only write _headers during Netlify CI/deploy builds so local `netlify dev`
      // does not enforce strict script-src 'self' against Vite's HMR preamble.
      if (process.env.NETLIFY !== 'true') return;
      const distDir = path.resolve(__dirname, 'dist');
      if (!fs.existsSync(distDir)) return;
      const headersContent = `/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https: data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';
`;
      fs.writeFileSync(path.join(distDir, '_headers'), headersContent, 'utf8');
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), netlifyHeadersPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8888',
        changeOrigin: true,
      },
    },
  },
});
