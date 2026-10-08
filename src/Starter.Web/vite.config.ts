import { defineConfig } from 'vite';
import aurelia from '@aurelia/vite-plugin';

export default defineConfig({
  plugins: [aurelia()],
  build: { target: 'es2022' },
  server: {
    host: '127.0.0.1',
    port: Number(process.env.WEB_PORT ?? 5173),
    strictPort: true,
    proxy: Object.fromEntries(
      ['/api', '/health', '/openapi'].map((path) => [
        path,
        { target: process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:5080' },
      ]),
    ),
  },
});
