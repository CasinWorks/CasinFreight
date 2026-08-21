'use strict';

const FOUNDING_AMOUNT_CENTAVOS = 89900;

function secretKey() {
  return (process.env.PAYMONGO_SECRET_KEY || '').trim().replace(/^['"]|['"]$/g, '');
}

function firebaseApiKey() {
  return (process.env.FIREBASE_WEB_API_KEY || process.env.VITE_FIREBASE_API_KEY || '').trim();
}

function toBase64(value) {
  return Buffer.from(value, 'utf8').toString('base64');
}

function paymongoAuthHeader(key) {
  return `Basic ${toBase64(`${key}:`)}`;
}

function readHeader(headers, name) {
  if (!headers) return '';
  const value = headers[name] || headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] || '' : value || '';
}

function firstHost(value) {
  return String(value || '').split(',')[0].trim();
}

function requestOrigin(headers) {
  const origin = firstHost(readHeader(headers, 'origin'));
  if (origin) return origin;
  const host = firstHost(readHeader(headers, 'x-forwarded-host') || readHeader(headers, 'host'));
  const proto = firstHost(readHeader(headers, 'x-forwarded-proto')) || 'https';
  return host ? `${proto}://${host}` : 'https://casin-freight.vercel.app';
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string' && req.body.trim()) return JSON.parse(req.body);
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

async function requireFirebaseUser(authHeader) {
  const token = String(authHeader || '').replace(/^Bearer\s+/i, '').trim();
  const apiKey = firebaseApiKey();
  if (!token || !apiKey) return null;
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token }),
    }
  );
  if (!response.ok) return null;
  const payload = await response.json();
  const user = payload.users && payload.users[0];
  if (!user || !user.localId) return null;
  return { uid: user.localId, email: user.email };
}

function asList(data) {
  if (!data) return [];
  return Array.isArray(data) ? data : [data];
}

async function paymongoGet(path, headers) {
  const response = await fetch(`https://api.paymongo.com${path}`, { headers });
  const payload = await response.json();
  return { ok: response.ok, payload };
}

async function createCheckout(input) {
  const response = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: paymongoAuthHeader(input.secretKey),
    },
    body: JSON.stringify({
      data: {
        attributes: {
          send_email_receipt: true,
          show_description: true,
          show_line_items: true,
          payment_method_types: ['gcash', 'paymaya', 'card', 'qrph'],
          line_items: [
            {
              currency: 'PHP',
              amount: FOUNDING_AMOUNT_CENTAVOS,
              name: 'CasinFreight Founding (Monthly)',
              quantity: 1,
              description: 'Unlimited trucks, team seats, roles, and trip transactions.',
            },
          ],
          description: `CasinFreight Founding ${input.customerEmail || input.userId} ${Date.now()}`,
          success_url: input.successUrl,
          cancel_url: input.cancelUrl,
          metadata: {
            user_id: input.userId,
            company_id: input.companyId,
            plan_id: input.planId,
            checkout_nonce: String(Date.now()),
          },
        },
      },
    }),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error((payload.errors && payload.errors[0] && payload.errors[0].detail) || 'PayMongo checkout failed.');
  }
  const checkoutUrl = payload.data && payload.data.attributes && payload.data.attributes.checkout_url;
  const checkoutSessionId = payload.data && payload.data.id;
  if (!checkoutUrl || !checkoutSessionId) {
    throw new Error('PayMongo did not return a checkout URL.');
  }
  return { checkoutUrl, checkoutSessionId };
}

function paymentsFrom(attributes) {
  const payments = attributes && attributes.payments;
  if (!Array.isArray(payments)) return [];
  return payments.filter((item) => item && typeof item === 'object');
}

function paidFromResource(item) {
  if (!item || !item.id) return null;
  const attributes = item.attributes || {};
  if (String(attributes.status || '').toLowerCase() !== 'paid') return null;
  const amount = Number(attributes.amount || 0);
  if (amount !== FOUNDING_AMOUNT_CENTAVOS && amount !== 899) return null;
  return {
    paymentId: item.id,
    method: String(attributes.payment_method_used || attributes.source_type || 'qrph'),
    amount: amount || FOUNDING_AMOUNT_CENTAVOS,
    description: String(attributes.description || ''),
  };
}

async function findPaidInSession(headers, checkoutSessionId, excluded) {
  const session = await paymongoGet(`/v1/checkout_sessions/${encodeURIComponent(checkoutSessionId)}`, headers);
  const resource = asList(session.payload.data)[0];
  if (!resource) return null;
  const attributes = resource.attributes || {};
  const nested = paymentsFrom(attributes);
  for (const item of nested) {
    if (excluded.has(item.id)) continue;
    const found = paidFromResource(item);
    if (found) return found;
  }
  const status = String(attributes.status || '').toLowerCase();
  const paymentIntent = attributes.payment_intent;
  const intentStatus = paymentIntent && paymentIntent.attributes ? String(paymentIntent.attributes.status || '') : '';
  if (status === 'paid' || status === 'succeeded' || intentStatus === 'succeeded') {
    const paymentId = (nested[0] && nested[0].id) || resource.id || checkoutSessionId;
    if (!excluded.has(paymentId)) {
      return { paymentId, method: 'qrph', amount: FOUNDING_AMOUNT_CENTAVOS, description: String(attributes.description || '') };
    }
  }
  return null;
}

function checkoutOwnerId(attributes) {
  const metadata = attributes && attributes.metadata;
  if (!metadata || typeof metadata !== 'object') return '';
  return String(metadata.user_id || '');
}

async function runAction(action, body, origin, authHeader) {
  const caller = await requireFirebaseUser(authHeader);
  if (!caller) {
    return { status: 401, data: { error: 'Sign in required. Missing or invalid Firebase session.' } };
  }
  const key = secretKey();
  if (!key) {
    return {
      status: 503,
      data: { error: 'PAYMONGO_SECRET_KEY is not set on Vercel. Add the live sk_ secret (not a VITE_ variable), then Redeploy.' },
    };
  }

  const op = String(action || body.action || 'checkout').toLowerCase();
  if (op === 'verify') {
    const checkoutSessionId = String(body.checkoutSessionId || '').trim();
    if (!checkoutSessionId.startsWith('cs_')) {
      return { status: 400, data: { paid: false, error: 'Checkout session is required to confirm payment.' } };
    }
    const headers = {
      Authorization: paymongoAuthHeader(key),
      'Content-Type': 'application/json',
    };
    const session = await paymongoGet(`/v1/checkout_sessions/${encodeURIComponent(checkoutSessionId)}`, headers);
    const resource = asList(session.payload.data)[0];
    if (!resource) {
      return { status: 404, data: { paid: false, error: 'Checkout session was not found.' } };
    }
    const ownerId = checkoutOwnerId(resource.attributes || {});
    if (!ownerId || ownerId !== caller.uid) {
      return { status: 403, data: { paid: false, error: 'This checkout does not belong to the signed-in account.' } };
    }
    const excluded = new Set(String(body.excludePaymentIds || '').split(',').map((id) => id.trim()).filter(Boolean));
    const paid = await findPaidInSession(headers, checkoutSessionId, excluded);
    return {
      status: 200,
      data: paid ? { paid: true, ...paid } : { paid: false, error: 'PayMongo has not confirmed this checkout yet.' },
    };
  }

  const result = await createCheckout({
    secretKey: key,
    planId: body.planId || 'plan_founding',
    companyId: body.companyId || '',
    userId: caller.uid,
    customerEmail: caller.email || body.customerEmail,
    successUrl: body.successUrl || `${origin}/?billing=success`,
    cancelUrl: body.cancelUrl || `${origin}/?billing=cancel`,
  });
  return { status: 200, data: result };
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  try {
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }
    if (req.method === 'GET') {
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, paymongoConfigured: Boolean(secretKey()) }));
      return;
    }
    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.end(JSON.stringify({ error: 'Use POST to start or verify PayMongo checkout.' }));
      return;
    }
    const parsed = await readBody(req);
    const action = parsed.action || (String(req.url || '').includes('verify') ? 'verify' : 'checkout');
    const result = await runAction(
      action,
      parsed,
      requestOrigin(req.headers),
      readHeader(req.headers, 'authorization')
    );
    res.statusCode = result.status;
    res.end(JSON.stringify(result.data));
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'PayMongo request failed.' }));
  }
};
