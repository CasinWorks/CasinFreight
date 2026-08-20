export interface CreateCheckoutInput {
  secretKey: string;
  successUrl: string;
  cancelUrl: string;
  companyId: string;
  userId: string;
  planId: string;
  customerEmail?: string;
  customerName?: string;
}

export interface CreateCheckoutResult {
  checkoutUrl: string;
  checkoutSessionId: string;
}

export interface PaidFoundingPayment {
  paymentId: string;
  method: string;
  amount: number;
  description: string;
}

function toBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function paymongoAuthHeader(secretKey: string): string {
  return `Basic ${toBase64(`${secretKey}:`)}`;
}

export async function createPayMongoCheckoutSession(
  input: CreateCheckoutInput
): Promise<CreateCheckoutResult> {
  const encodedKey = toBase64(`${input.secretKey}:`);
  const response = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${encodedKey}`,
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
              amount: 1000,
              name: 'CasinFreight Founding (₱10 live test)',
              quantity: 1,
              description: 'Temporary ₱10 live test charge. Founding unlocks after PayMongo confirms payment.',
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

  const payload = await response.json() as {
    data?: { id?: string; attributes?: { checkout_url?: string } };
    errors?: Array<{ detail?: string }>;
  };

  if (!response.ok) {
    const detail = payload.errors?.[0]?.detail || 'PayMongo checkout failed.';
    throw new Error(detail);
  }

  const checkoutUrl = payload.data?.attributes?.checkout_url;
  const checkoutSessionId = payload.data?.id;
  if (!checkoutUrl || !checkoutSessionId) {
    throw new Error('PayMongo did not return a checkout URL.');
  }

  return { checkoutUrl, checkoutSessionId };
}

const FOUNDING_AMOUNT_CENTAVOS = 1000;
const FOUNDING_PRICE_PHP = 10;
const RECENT_PAYMENT_WINDOW_SECONDS = 60 * 60 * 48;

export interface FindPaidFoundingLookup {
  paymentId?: string;
  referenceNumber?: string;
  checkoutSessionId?: string;
  excludePaymentIds?: string[];
  sessionOnly?: boolean;
}

type PaymongoResource = {
  id?: string;
  attributes?: Record<string, unknown>;
};

type PaymongoPayload = {
  data?: PaymongoResource | PaymongoResource[];
  errors?: Array<{ detail?: string }>;
};

function amountIsFounding(amount: number): boolean {
  return amount === FOUNDING_AMOUNT_CENTAVOS || amount === FOUNDING_PRICE_PHP;
}

function descriptionLooksFounding(description?: string): boolean {
  const value = (description || '').toLowerCase();
  if (!value) return true;
  return value.includes('founding') || value.includes('casinfreight') || value.includes('subscription');
}

function paymentMethodFrom(attributes: Record<string, unknown>): string {
  const source = attributes.source;
  if (source && typeof source === 'object' && 'type' in source) {
    return String((source as { type?: string }).type || 'qrph');
  }
  return String(attributes.payment_method_used || attributes.source_type || 'qrph');
}

function asResourceList(data?: PaymongoResource | PaymongoResource[]): PaymongoResource[] {
  if (!data) return [];
  return Array.isArray(data) ? data : [data];
}

function paymentsFromAttributes(attributes: Record<string, unknown>): PaymongoResource[] {
  const payments = attributes.payments;
  if (!Array.isArray(payments)) return [];
  return payments.filter((item): item is PaymongoResource => Boolean(item && typeof item === 'object'));
}

function toPaidFounding(id: string, attributes: Record<string, unknown>): PaidFoundingPayment {
  return {
    paymentId: id,
    method: paymentMethodFrom(attributes),
    amount: Number(attributes.amount || 0) || FOUNDING_AMOUNT_CENTAVOS,
    description: String(attributes.description || attributes.statement_descriptor || ''),
  };
}

function paidFoundingFromResource(
  item: PaymongoResource | undefined,
  requireDescription: boolean
): PaidFoundingPayment | null {
  if (!item?.id) return null;
  const attributes = item.attributes || {};
  if (String(attributes.status || '').toLowerCase() !== 'paid') return null;
  if (!amountIsFounding(Number(attributes.amount || 0))) return null;
  const description = String(attributes.description || attributes.statement_descriptor || '');
  if (requireDescription && !descriptionLooksFounding(description)) return null;
  return toPaidFounding(item.id, attributes);
}

function firstRecentPaid(
  items: PaymongoResource[],
  requireDescription: boolean,
  recentOnly: boolean,
  excluded: Set<string> = new Set()
): PaidFoundingPayment | null {
  for (const item of items) {
    if (item.id && excluded.has(item.id)) continue;
    const createdAt = Number(item.attributes?.created_at || item.attributes?.updated_at || 0);
    if (recentOnly && createdAt && Date.now() / 1000 - createdAt > RECENT_PAYMENT_WINDOW_SECONDS) {
      continue;
    }
    const found = paidFoundingFromResource(item, requireDescription);
    if (found && !excluded.has(found.paymentId)) return found;
  }
  return null;
}

function paymentIdsFrom(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const ids: string[] = [];
  for (const item of value) {
    if (typeof item === 'string' && item.startsWith('pay_')) ids.push(item);
    if (item && typeof item === 'object' && 'id' in item && typeof (item as { id?: string }).id === 'string') {
      ids.push((item as { id: string }).id);
    }
  }
  return ids;
}

async function findPaidInCheckoutSession(
  headers: Record<string, string>,
  checkoutSessionId: string,
  excluded: Set<string>
): Promise<PaidFoundingPayment | null> {
  const session = await paymongoGet(`/v1/checkout_sessions/${encodeURIComponent(checkoutSessionId)}`, headers);
  const resource = asResourceList(session.payload.data)[0];
  if (!resource) return null;
  const attributes = resource.attributes || {};
  const nested = paymentsFromAttributes(attributes);
  const fromNested = firstRecentPaid(nested, false, false, excluded);
  if (fromNested) return fromNested;

  const paymentIds = new Set(paymentIdsFrom(attributes.payments));
  for (const item of nested) {
    if (item.id) paymentIds.add(item.id);
  }

  for (const id of paymentIds) {
    if (excluded.has(id)) continue;
    const retrieved = await paymongoGet(`/v1/payments/${encodeURIComponent(id)}`, headers);
    const found = paidFoundingFromResource(asResourceList(retrieved.payload.data)[0], false);
    if (found) return found;
  }

  const status = String(attributes.status || '').toLowerCase();
  const paymentIntent = attributes.payment_intent;
  const intentStatus = paymentIntent && typeof paymentIntent === 'object' && 'attributes' in paymentIntent
    ? String((paymentIntent as { attributes?: { status?: string } }).attributes?.status || '')
    : '';
  if (status === 'paid' || status === 'succeeded' || intentStatus === 'succeeded') {
    const paymentId = [...paymentIds][0] || resource.id || checkoutSessionId;
    if (!excluded.has(paymentId)) {
      return {
        paymentId,
        method: 'qrph',
        amount: FOUNDING_AMOUNT_CENTAVOS,
        description: String(attributes.description || ''),
      };
    }
  }
  return null;
}

async function paymongoGet(path: string, headers: Record<string, string>): Promise<{ ok: boolean; payload: PaymongoPayload }> {
  const response = await fetch(`https://api.paymongo.com${path}`, { headers });
  const payload = await response.json() as PaymongoPayload;
  return { ok: response.ok, payload };
}

function paidFromLink(link: PaymongoResource): PaidFoundingPayment | null {
  const attributes = link.attributes || {};
  const nested = firstRecentPaid(paymentsFromAttributes(attributes), false, false);
  if (nested) return nested;
  if (String(attributes.status || '').toLowerCase() !== 'paid') return null;
  if (!amountIsFounding(Number(attributes.amount || 0))) return null;
  if (!descriptionLooksFounding(String(attributes.description || ''))) return null;
  return {
    paymentId: paymentsFromAttributes(attributes)[0]?.id || link.id || '',
    method: 'qrph',
    amount: Number(attributes.amount || 0),
    description: String(attributes.description || ''),
  };
}

async function findByReference(
  headers: Record<string, string>,
  referenceNumber: string
): Promise<PaidFoundingPayment | null> {
  const paymentLinks = await paymongoGet(
    `/v1/payment_links?reference_number=${encodeURIComponent(referenceNumber)}`,
    headers
  );
  for (const link of asResourceList(paymentLinks.payload.data)) {
    if (link.id) {
      const payments = await paymongoGet(`/v1/payment_links/${encodeURIComponent(link.id)}/payments`, headers);
      const found = firstRecentPaid(asResourceList(payments.payload.data), false, false);
      if (found) return found;
    }
    const fromLink = paidFromLink(link);
    if (fromLink) return fromLink;
  }

  const legacy = await paymongoGet('/v1/links?limit=25', headers);
  for (const link of asResourceList(legacy.payload.data)) {
    if (String(link.attributes?.reference_number || '') !== referenceNumber) continue;
    const fromLink = paidFromLink(link);
    if (fromLink) return fromLink;
  }
  return null;
}

export async function findPaidFoundingPayment(
  secretKey: string,
  lookup?: string | FindPaidFoundingLookup
): Promise<PaidFoundingPayment | null> {
  const input: FindPaidFoundingLookup = typeof lookup === 'string' ? { paymentId: lookup } : (lookup || {});
  const paymentId = (input.paymentId || '').trim();
  const referenceNumber = (input.referenceNumber || '').trim();
  const checkoutSessionId = (input.checkoutSessionId || '').trim();
  const excluded = new Set((input.excludePaymentIds || []).map((id) => id.trim()).filter(Boolean));
  const sessionOnly = Boolean(input.sessionOnly || checkoutSessionId);
  const headers = {
    Authorization: paymongoAuthHeader(secretKey),
    'Content-Type': 'application/json',
  };

  if (paymentId.startsWith('pay_') && !excluded.has(paymentId)) {
    const retrieved = await paymongoGet(`/v1/payments/${encodeURIComponent(paymentId)}`, headers);
    const found = paidFoundingFromResource(asResourceList(retrieved.payload.data)[0], false);
    if (found && !excluded.has(found.paymentId)) return found;
  }

  if (checkoutSessionId) {
    const fromSession = await findPaidInCheckoutSession(headers, checkoutSessionId, excluded);
    if (fromSession) return fromSession;
    if (sessionOnly) return null;
  }

  if (sessionOnly) return null;

  const possibleReference = referenceNumber || (!paymentId.startsWith('pay_') && !paymentId.startsWith('cs_') ? paymentId : '');
  if (possibleReference) {
    const found = await findByReference(headers, possibleReference);
    if (found && !excluded.has(found.paymentId)) return found;
  }

  const listRes = await paymongoGet('/v1/payments?limit=25', headers);
  if (!listRes.ok) {
    throw new Error(listRes.payload.errors?.[0]?.detail || 'Could not list PayMongo payments.');
  }
  const fromPayments = firstRecentPaid(asResourceList(listRes.payload.data), true, true, excluded);
  if (fromPayments) return fromPayments;

  const legacy = await paymongoGet('/v1/links?limit=25', headers);
  for (const link of asResourceList(legacy.payload.data)) {
    const updatedAt = Number(link.attributes?.updated_at || link.attributes?.created_at || 0);
    if (updatedAt && Date.now() / 1000 - updatedAt > RECENT_PAYMENT_WINDOW_SECONDS) continue;
    const fromLink = paidFromLink(link);
    if (fromLink && !excluded.has(fromLink.paymentId)) return fromLink;
  }

  return null;
}

type PayMongoBody = Record<string, string>;

function secretKey(): string {
  return (process.env.PAYMONGO_SECRET_KEY || '').trim().replace(/^['"]|['"]$/g, '');
}

function requestOrigin(headers: Headers | Record<string, string | string[] | undefined>, fallback = 'https://casin-freight.vercel.app'): string {
  const read = (name: string): string => {
    if (headers instanceof Headers) return headers.get(name) || '';
    const value = headers[name] ?? headers[name.toLowerCase()];
    return Array.isArray(value) ? value[0] || '' : value || '';
  };
  const origin = read('origin');
  if (origin) return origin;
  const host = read('x-forwarded-host') || read('host');
  const proto = read('x-forwarded-proto') || 'https';
  return host ? `${proto}://${host}` : fallback;
}

export async function runPayMongoAction(
  action: string,
  body: PayMongoBody,
  origin: string
): Promise<{ status: number; data: unknown }> {
  const key = secretKey();
  if (!key) {
    return {
      status: 503,
      data: {
        error: 'PAYMONGO_SECRET_KEY is not set on Vercel. Add the sk_test_ secret (not a VITE_ variable), then Redeploy.',
      },
    };
  }

  const op = (action || body.action || 'checkout').toLowerCase();
  if (op === 'verify') {
    const paid = await findPaidFoundingPayment(key, {
      paymentId: body.paymentId,
      referenceNumber: body.referenceNumber,
      checkoutSessionId: body.checkoutSessionId,
      excludePaymentIds: (body.excludePaymentIds || '').split(',').map((id) => id.trim()).filter(Boolean),
      sessionOnly: body.sessionOnly === 'true',
    });
    return {
      status: 200,
      data: paid
        ? { paid: true, ...paid }
        : { paid: false, error: 'No paid ₱10 Founding payment was found on this PayMongo account.' },
    };
  }

  const result = await createPayMongoCheckoutSession({
    secretKey: key,
    planId: body.planId || 'plan_founding',
    companyId: body.companyId || '',
    userId: body.userId || '',
    customerEmail: body.customerEmail,
    customerName: body.customerName,
    successUrl: body.successUrl || `${origin}/?billing=success`,
    cancelUrl: body.cancelUrl || `${origin}/?billing=cancel`,
  });
  return { status: 200, data: result };
}

function jsonResponse(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const config = { runtime: 'nodejs' };

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204 });
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json().catch(() => ({})) as PayMongoBody;
    const pathname = new URL(request.url).pathname;
    const action = body.action || (pathname.includes('verify') ? 'verify' : 'checkout');
    const result = await runPayMongoAction(action, body, requestOrigin(request.headers));
    return jsonResponse(result.data, result.status);
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'PayMongo request failed.' },
      500
    );
  }
}

type NodeLikeRequest = {
  method?: string;
  url?: string;
  body?: PayMongoBody | string;
  headers: Record<string, string | string[] | undefined>;
  [Symbol.asyncIterator]?: () => AsyncIterator<unknown>;
};

type NodeLikeResponse = {
  setHeader: (name: string, value: string) => void;
  statusCode: number;
  end: (body?: string) => void;
};

function isWebRequest(req: unknown): req is Request {
  return Boolean(
    req &&
    typeof req === 'object' &&
    typeof (req as Request).json === 'function' &&
    typeof (req as Request).headers?.get === 'function'
  );
}

async function readNodeBody(req: NodeLikeRequest): Promise<string> {
  if (req.body && typeof req.body === 'object') return JSON.stringify(req.body);
  if (typeof req.body === 'string') return req.body;
  if (typeof req[Symbol.asyncIterator] !== 'function') return '';
  const chunks: Uint8Array[] = [];
  for await (const chunk of req as AsyncIterable<unknown>) {
    if (typeof chunk === 'string') chunks.push(new TextEncoder().encode(chunk));
    else if (chunk instanceof Uint8Array) chunks.push(chunk);
    else chunks.push(new TextEncoder().encode(String(chunk)));
  }
  let length = 0;
  chunks.forEach((part) => {
    length += part.length;
  });
  const merged = new Uint8Array(length);
  let offset = 0;
  chunks.forEach((part) => {
    merged.set(part, offset);
    offset += part.length;
  });
  return new TextDecoder().decode(merged);
}

export default async function handler(req: NodeLikeRequest | Request, res?: NodeLikeResponse) {
  if (res && typeof res.end === 'function' && !isWebRequest(req)) {
    try {
      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
      }
      const parsed = JSON.parse((await readNodeBody(req)) || '{}') as PayMongoBody;
      const action = parsed.action || (String(req.url || '').includes('verify') ? 'verify' : 'checkout');
      const result = await runPayMongoAction(action, parsed, requestOrigin(req.headers));
      res.statusCode = result.status;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(result.data));
    } catch (error) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'PayMongo request failed.' }));
    }
    return;
  }
  return POST(req as Request);
}
