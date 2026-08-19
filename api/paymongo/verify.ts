import { findPaidFoundingPayment } from '../../server/paymongo';

type VercelLikeRequest = {
  method?: string;
  body?: Record<string, string> | string;
  headers: Record<string, string | string[] | undefined>;
};

type VercelLikeResponse = {
  setHeader: (name: string, value: string) => void;
  statusCode: number;
  end: (body?: string) => void;
};

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
    const paid = await findPaidFoundingPayment(secretKey, {
      paymentId: body.paymentId,
      referenceNumber: body.referenceNumber,
      checkoutSessionId: body.checkoutSessionId,
      excludePaymentIds: (body.excludePaymentIds || '').split(',').map((id) => id.trim()).filter(Boolean),
      sessionOnly: body.sessionOnly === 'true',
    });
    if (!paid) {
      res.statusCode = 200;
      res.end(JSON.stringify({ paid: false, error: 'No paid ₱499 Founding payment was found on this PayMongo account.' }));
      return;
    }
    res.statusCode = 200;
    res.end(JSON.stringify({ paid: true, ...paid }));
  } catch (error) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Could not verify PayMongo payment.' }));
  }
}
