import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Two entry points:
//  - index.html  → standalone SPA
//  - src/embed.ts → small script a host page loads to mount the widget into
//                   a <div id="haip-booking" data-booking-key="pk_..."></div>
export default defineConfig({
  base: '/booking/',
  root: path.resolve(__dirname),
  plugins: [
    react(),
    {
      name: 'admin-and-root-redirect',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const rawUrl = req.url || '';
          const pathname = rawUrl.split('?')[0];

          // Forward admin and dashboard requests on port 5174 directly to the separate Admin Panel (port 5173)
          if (
            pathname === '/admin' ||
            pathname.startsWith('/admin/') ||
            pathname === '/booking/admin' ||
            pathname.startsWith('/booking/admin/') ||
            pathname === '/dashboard' ||
            pathname.startsWith('/dashboard/') ||
            pathname === '/booking/dashboard' ||
            pathname.startsWith('/booking/dashboard/')
          ) {
            res.writeHead(302, { Location: 'http://localhost:5173/' });
            res.end();
            return;
          }

          // Root URL on 5174 redirects to /booking/
          if (pathname === '/' || pathname === '') {
            res.writeHead(302, { Location: '/booking/' });
            res.end();
            return;
          }

          next();
        });
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        embed: path.resolve(__dirname, 'src/embed.ts'),
      },
      output: {
        // Stable name for the embed snippet: /booking/embed.js
        entryFileNames: (chunk) =>
          chunk.name === 'embed' ? 'embed.js' : 'assets/[name]-[hash].js',
      },
    },
  },
  server: {
    host: true,
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
