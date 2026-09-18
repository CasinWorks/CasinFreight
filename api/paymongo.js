'use strict';

const { getAdminDb, grantFounding, setCancelFlag, loadOwnedCompany } = require('./firebaseAdmin');

async function loadPricing() {
  return import('../src/lib/subscriptionPrice.js');
}

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

const BILLING_RETURN_ORIGINS = [
  'https://casinfreight.com',
  'https://www.casinfreight.com',
  'https://casin-freight.vercel.app',
];

function billingReturnOrigin(headers) {
  const originHeader = firstHost(readHeader(headers, 'origin'));
  if (BILLING_RETURN_ORIGINS.includes(originHeader)) return originHeader;
  return 'https://casinfreight.com';
}

function assertPayMongoCheckoutUrl(url) {
  let parsed;
  try {
    parsed = new URL(String(url || ''));
  } catch {
    throw new Error('PayMongo did not return a checkout URL.');
  }
  const host = parsed.hostname.toLowerCase();
  if (host !== 'checkout.paymongo.com' && !host.endsWith('.paymongo.com')) {
    throw new Error('PayMongo did not return a checkout URL.');
  }
  return String(url);
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

async function countTrucks(db, companyId) {
  if (!db || !companyId) return 0;
  const snap = await db.collection('companies').doc(companyId).collection('trucks').get();
  return snap.size;
}

async function loadCompanySubscription(db, uid) {
  if (!db || !uid) return { companyId: '', subscription: {} };
  try {
    const userSnap = await db.collection('users').doc(uid).get();
    const companyId = String((userSnap.exists && userSnap.data() && userSnap.data().companyId) || '');
    if (!companyId) return { companyId: '', subscription: {} };
    const companySnap = await db.collection('companies').doc(companyId).get();
    const data = companySnap.exists ? companySnap.data() || {} : {};
    return { companyId, subscription: data.subscription || {} };
  } catch {
    return { companyId: '', subscription: {} };
  }
}

async function createCheckout(input) {
  const { formatPhp } = await loadPricing();
  const price = input.price;
  const cycleLabel = price.billingCycle === 'annual' ? 'Annual' : 'Monthly';
  const extraNote = price.extraTrucks > 0
    ? ` includes ${price.includedTrucks} trucks + ${price.extraTrucks} extra`
    : ` includes up to ${price.includedTrucks} trucks`;
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
              amount: price.chargeCentavos,
              name: `CasinFreight ${price.pricingTier === 'list' ? 'List' : 'Founding'} (${cycleLabel})`,
              quantity: 1,
              description: `${formatPhp(price.chargePhp)} for ${price.truckCount} truck${price.truckCount === 1 ? '' : 's'}${extraNote}.`,
            },
          ],
          description: `CasinFreight ${price.pricingTier === 'list' ? 'List' : 'Founding'} ${cycleLabel} ${input.customerEmail || input.userId} ${Date.now()}`,
          success_url: input.successUrl,
          cancel_url: input.cancelUrl,
          metadata: {
            user_id: input.userId,
            company_id: input.companyId,
            plan_id: input.planId,
            billing_cycle: price.billingCycle,
            truck_count: String(price.truckCount),
            extra_trucks: String(price.extraTrucks),
            amount_php: String(price.chargePhp),
            amount_centavos: String(price.chargeCentavos),
            pricing_tier: String(price.pricingTier || ''),
            included_trucks: String(price.includedTrucks),
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
  return { checkoutUrl: assertPayMongoCheckoutUrl(checkoutUrl), checkoutSessionId };
}

function paymentsFrom(attributes) {
  const payments = attributes && attributes.payments;
  if (!Array.isArray(payments)) return [];
  return payments.filter((item) => item && typeof item === 'object');
}

function expectedAmountFromSession(attributes) {
  const items = attributes && attributes.line_items;
  if (Array.isArray(items) && items[0] && Number(items[0].amount) > 0) {
    return Number(items[0].amount);
  }
  const metadata = attributes && attributes.metadata;
  if (metadata && Number(metadata.amount_centavos) > 0) {
    return Number(metadata.amount_centavos);
  }
  return 0;
}

function paidFromResource(item, expectedCentavos) {
  if (!item || !item.id || !String(item.id).startsWith('pay_')) return null;
  const attributes = item.attributes || {};
  if (String(attributes.status || '').toLowerCase() !== 'paid') return null;
  const amount = Number(attributes.amount || 0);
  if (!(expectedCentavos > 0) || amount !== expectedCentavos) return null;
  return {
    paymentId: item.id,
    method: String(attributes.payment_method_used || attributes.source_type || 'qrph'),
    amount,
    description: String(attributes.description || ''),
  };
}

async function findPaidInSession(headers, checkoutSessionId, excluded) {
  const session = await paymongoGet(`/v1/checkout_sessions/${encodeURIComponent(checkoutSessionId)}`, headers);
  const resource = asList(session.payload.data)[0];
  if (!resource) return null;
  const attributes = resource.attributes || {};
  const expectedCentavos = expectedAmountFromSession(attributes);
  const nested = paymentsFrom(attributes);
  for (const item of nested) {
    if (excluded.has(item.id)) continue;
    const found = paidFromResource(item, expectedCentavos);
    if (found) return found;
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
  const { calculateSubscriptionPrice, parseBillingCycle, billableTruckCount, hostedPricingForCheckout } = await loadPricing();
  const db = getAdminDb();
  if (!db) {
    return {
      status: 503,
      data: {
        error: 'FIREBASE_SERVICE_ACCOUNT is not set on Vercel. Add the Firebase service account JSON so billing can be written by the server, then Redeploy.',
      },
    };
  }

  if (op === 'cancel' || op === 'resume') {
    try {
      const granted = await setCancelFlag(db, caller, op === 'cancel');
      return { status: 200, data: { ok: true, ...granted } };
    } catch (error) {
      return { status: error.status || 500, data: { error: error.message || 'Could not update subscription.' } };
    }
  }

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
    if (!paid) {
      return { status: 200, data: { paid: false, error: 'PayMongo has not confirmed this checkout yet.' } };
    }
    const metadata = (resource.attributes && resource.attributes.metadata) || {};
    const { subscription: existingSub, companyId: linkedCompany } = await loadCompanySubscription(db, caller.uid);
    if (!linkedCompany) {
      return { status: 400, data: { paid: false, error: 'No company is linked to this login.' } };
    }
    const quote = calculateSubscriptionPrice(
      Number(metadata.truck_count || 0),
      parseBillingCycle(metadata.billing_cycle),
      hostedPricingForCheckout(existingSub)
    );
    try {
      const granted = await grantFounding(db, caller, {
        ...paid,
        billingCycle: quote.billingCycle,
        truckCount: quote.truckCount,
        amountPhp: quote.chargePhp,
        periodMonths: quote.periodMonths,
      });
      return { status: 200, data: { paid: true, ...paid, ...granted } };
    } catch (error) {
      return { status: error.status || 500, data: { paid: true, ...paid, error: error.message || 'Payment was received but Founding could not be written.' } };
    }
  }

  const { companyId, company } = await loadOwnedCompany(db, caller);
  const existingSub = company.subscription || {};
  const actualTrucks = await countTrucks(db, companyId);
  const billedTrucks = Number(existingSub && existingSub.billed_truck_count) || 0;
  const truckCount = billableTruckCount(actualTrucks, billedTrucks, body.truckCount);
  const price = calculateSubscriptionPrice(
    truckCount,
    parseBillingCycle(body.billingCycle),
    hostedPricingForCheckout(existingSub)
  );
  const result = await createCheckout({
    secretKey: key,
    planId: body.planId || 'plan_founding',
    companyId,
    userId: caller.uid,
    customerEmail: caller.email || body.customerEmail,
    successUrl: `${origin}/?billing=success`,
    cancelUrl: `${origin}/?billing=cancel`,
    price,
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
      res.end(JSON.stringify({ ok: true }));
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
      billingReturnOrigin(req.headers),
      readHeader(req.headers, 'authorization')
    );
    res.statusCode = result.status;
    res.end(JSON.stringify(result.data));
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'PayMongo request failed.' }));
  }
};
