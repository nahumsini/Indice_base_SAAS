import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';

// Manual preview only: no API/storage proxy and no functional backend/database access.
const server = await createServer({
  configFile: false,
  root: resolve(import.meta.dirname, '..'),
  cacheDir: '/tmp/indice-whatsapp-manual-preview-vite',
  plugins: [
    {
      name: 'whatsapp-local-preview-only',
      configureServer(vite) {
        vite.middlewares.use((request, response, next) => {
          const url = new URL(request.url || '/', 'http://127.0.0.1');
          response.setHeader('Content-Security-Policy', "connect-src 'self'; form-action 'none'; object-src 'none'; base-uri 'self'");
          if (url.pathname === '/') {
            response.writeHead(302, { Location: '/sales/conversations' });
            response.end();
            return;
          }
          if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/storage/')) {
            response.writeHead(503, { 'Content-Type': 'application/json' });
            response.end(JSON.stringify({ message: 'Local preview: real services are disabled' }));
            return;
          }
          if (url.pathname === '/__fixture/upload') {
            if (request.method !== 'PUT') { response.writeHead(405); response.end(); return; }
            let size = 0;
            request.on('data', chunk => {
              size += chunk.length;
              if (size > 8 * 1024 * 1024 && !response.writableEnded) { response.writeHead(413); response.end(); }
            });
            request.on('end', () => { if (!response.writableEnded) { response.writeHead(200); response.end(); } });
            return;
          }
          if (url.pathname === '/sales/conversations' || url.pathname === '/sales/whatsapp-settings') {
            request.url = '/tests/browser/sales-conversations.html' + url.search;
          }
          next();
        });
      },
    },
    react(),
    tailwindcss(),
  ],
  resolve: { alias: { '@': resolve(import.meta.dirname, '../src') } },
  define: { 'import.meta.env.VITE_API_BASE_URL': '""' },
  server: { host: '127.0.0.1', port: 5185, strictPort: true, hmr: false, watch: null },
});
await server.listen();
console.log('Vista local de prueba: http://127.0.0.1:5185/sales/conversations');
console.log('Datos sintéticos en memoria. Sin proxy, base de datos ni envíos a Meta.');
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await server.close(); process.exit(0); });
