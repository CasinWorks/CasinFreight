import { createPayMongoCheckoutSession } from '../../server/paymongo';

type VercelLikeRequest = {
  method?: string;
  body?: Record<string, string> | string;
  headers: Record<string, string | string[] | undefined>;
};

type VercelLikeResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => VercelLikeResponse;
  statusCode: number;
  json: (body: unknown) => void;
  end: (body?: string) => void;
};

function header(req: VercelLikeRequest, name: string): string {
  const value = req.headers[name] ?? req.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] || '' : value || '';
}

function requestOrigin(req: VercelLikeRequest): string {
  const origin = header(req, 'origin');
  if (origin) return origin;
  const host = header(req, 'x-forwarded-host') || header(req, 'host');
  const proto = header(req, 'x-forwarded-proto') || 'https';
  return host ? `${proto}://${host}` : 'https://casin-freight.vercel.app';
}

function parseBody(req: VercelLikeRequest): Record<string, string> {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body.trim()) {
    return JSON.parse(req.body) as Record<string, string>;
  }
  return {};
}

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
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
    res.end(JSON.stringify({ error: 'PAYMONGO_SECRET_KEY is not set on the Vercel project.' }));
    return;
  }

  try {
    const body = parseBody(req);
    const origin = requestOrigin(req);
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
