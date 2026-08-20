import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';
import {runPayMongoAction} from './api/paymongo';

function jsonDevApi(
  name: string,
  route: string,
  run: (body: Record<string, string>, origin: string, authHeader: string) => Promise<{ status: number; data: unknown }>
): Plugin {
  return {
    name,
    configureServer(server) {
      server.middlewares.use(route, async (req, res, next) => {
        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }
        if (req.method !== 'POST') {
          next();
          return;
        }

        try {
          const chunks: Buffer[] = [];
          for await (const chunk of req) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
          const body = chunks.length
            ? JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, string>
            : {};
          const origin = (req.headers.origin as string) || 'http://localhost:3000';
          const authHeader = typeof req.headers.authorization === 'string' ? req.headers.authorization : '';
          const result = await run(body, origin, authHeader);
          res.statusCode = result.status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result.data));
        } catch (error) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Request failed.' }));
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      jsonDevApi('paymongo-dev-api', '/api/paymongo', (body, origin, authHeader) => {
        const action = body.action || 'checkout';
        return runPayMongoAction(action, body, origin, authHeader);
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
