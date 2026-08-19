import type { IncomingMessage, ServerResponse } from 'http';
import { createPayMongoCheckoutSession } from '../../server/paymongo';

async function readJson(req: IncomingMessage): Promise<Record<string, string>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, string>;
}

export default async function handler(req: IncomingMessage & { method?: string }, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  const secretKey = process.env.PAYMONGO_SECRET_KEY;
  if (!secretKey) {
    res.statusCode = 503;
    res.end(JSON.stringify({ error: 'PAYMONGO_SECRET_KEY is not set on the server.' }));
    return;
  }

  try {
    const body = await readJson(req);
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
    res.end(JSON.stringify(result));
  } catch (error) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Checkout failed' }));
  }
}
