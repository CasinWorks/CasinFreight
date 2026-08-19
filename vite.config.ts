import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';
import {createPayMongoCheckoutSession, findPaidFoundingPayment} from './server/paymongo';

function paymongoDevApi(): Plugin {
  return {
    name: 'paymongo-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/paymongo/checkout', async (req, res, next) => {
        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }
        if (req.method !== 'POST') {
          next();
          return;
        }

        const secretKey = process.env.PAYMONGO_SECRET_KEY;
        if (!secretKey) {
          res.statusCode = 503;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Add PAYMONGO_SECRET_KEY to .env (not VITE_).' }));
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
          const result = await createPayMongoCheckoutSession({
            secretKey,
            planId: body.planId || 'plan_founding',
            companyId: body.companyId || '',
            userId: body.userId || '',
            customerEmail: body.customerEmail,
            customerName: body.customerName,
            successUrl: body.successUrl || `${origin}/?billing=success`,
            cancelUrl: body.cancelUrl || `${origin}/?billing=cancel`,
          });
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
        } catch (error) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Checkout failed' }));
        }
      });

      server.middlewares.use('/api/paymongo/verify', async (req, res, next) => {
        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }
        if (req.method !== 'POST') {
          next();
          return;
        }
        const secretKey = process.env.PAYMONGO_SECRET_KEY;
        if (!secretKey) {
          res.statusCode = 503;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Add PAYMONGO_SECRET_KEY to .env (not VITE_).' }));
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
          const paid = await findPaidFoundingPayment(secretKey, {
            paymentId: body.paymentId,
            referenceNumber: body.referenceNumber,
            checkoutSessionId: body.checkoutSessionId,
          });
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(paid ? { paid: true, ...paid } : { paid: false, error: 'No paid ₱499 Founding payment was found.' }));
        } catch (error) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Could not verify payment.' }));
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), paymongoDevApi()],
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
