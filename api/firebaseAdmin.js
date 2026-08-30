'use strict';

const PLATFORM_ADMINS = ['christianjoshuacasin@gmail.com'];

function serviceAccount() {
  const raw = (process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT must be the full JSON of the Firebase service account key.');
  }
}

function getAdmin() {
  const cred = serviceAccount();
  if (!cred) return null;
  const admin = require('firebase-admin');
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(cred) });
  }
  return admin;
}

function getAdminDb() {
  const admin = getAdmin();
  return admin ? admin.firestore() : null;
}

function isPlatformAdmin(email) {
  return PLATFORM_ADMINS.includes(String(email || '').trim().toLowerCase());
}

function firebaseWebApiKey() {
  return (process.env.FIREBASE_WEB_API_KEY || process.env.VITE_FIREBASE_API_KEY || '').trim();
}

async function lookupCaller(authHeader) {
  const token = String(authHeader || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const admin = getAdmin();
  if (admin) {
    try {
      const decoded = await admin.auth().verifyIdToken(token);
      return {
        uid: decoded.uid,
        email: decoded.email || '',
        admin: decoded.admin === true,
      };
    } catch {
      return null;
    }
  }
  const apiKey = firebaseWebApiKey();
  if (!apiKey) return null;
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
  return { uid: user.localId, email: user.email || '', admin: false };
}

async function stampAdminSession(authHeader) {
  const caller = await lookupCaller(authHeader);
  if (!caller) {
    return { status: 401, data: { error: 'Sign in required.' } };
  }
  if (!isPlatformAdmin(caller.email)) {
    return { status: 200, data: { admin: false, refreshed: false } };
  }
  const admin = getAdmin();
  if (!admin) {
    return { status: 200, data: { admin: caller.admin === true, refreshed: false } };
  }
  const user = await admin.auth().getUser(caller.uid);
  const claims = { ...(user.customClaims || {}) };
  if (claims.admin === true) {
    return { status: 200, data: { admin: true, refreshed: false } };
  }
  await admin.auth().setCustomUserClaims(caller.uid, { ...claims, admin: true });
  return { status: 200, data: { admin: true, refreshed: true } };
}

function addBillingMonths(from, months) {
  const next = new Date(from);
  next.setMonth(next.getMonth() + months);
  return next;
}

function isFoundingExpired(subscription) {
  if (!subscription || subscription.plan_id !== 'plan_founding') return false;
  const end = Date.parse(subscription.current_period_end || '');
  return Number.isFinite(end) && end < Date.now();
}

async function loadOwnedCompany(db, caller) {
  const userSnap = await db.collection('users').doc(caller.uid).get();
  if (!userSnap.exists) {
    throw Object.assign(new Error('No company is linked to this login.'), { status: 403 });
  }
  const companyId = String(userSnap.data().companyId || '');
  if (!companyId) {
    throw Object.assign(new Error('No company is linked to this login.'), { status: 403 });
  }
  const companySnap = await db.collection('companies').doc(companyId).get();
  if (!companySnap.exists) {
    throw Object.assign(new Error('Company workspace was not found.'), { status: 404 });
  }
  const company = companySnap.data() || {};
  const createdBy = String(company.createdBy || '');
  if (createdBy !== caller.uid && !isPlatformAdmin(caller.email)) {
    throw Object.assign(new Error('Only the company owner can change billing.'), { status: 403 });
  }
  return { companyId, company };
}

async function freeSubscription(companyId, userId, previous) {
  const { hostedIdentityPatch } = await import('../src/lib/subscriptionPrice.js');
  const now = new Date();
  const consumed = Array.isArray(previous && previous.consumed_payment_ids)
    ? previous.consumed_payment_ids.filter(Boolean)
    : [];
  const identity = hostedIdentityPatch(previous || {});
  return {
    id: (previous && previous.id) || `sub-${String(userId || companyId).slice(0, 8)}`,
    user_id: userId || (previous && previous.user_id) || '',
    company_id: companyId,
    plan_id: 'plan_free',
    status: 'active',
    current_period_start: now.toISOString(),
    current_period_end: addBillingMonths(now, 1).toISOString(),
    cancel_at_period_end: false,
    auto_renew: false,
    payment_provider: 'paymongo',
    consumed_payment_ids: consumed,
    created_at: (previous && previous.created_at) || now.toISOString(),
    updated_at: now.toISOString(),
    ...identity,
  };
}

async function foundingSubscription(companyId, userId, previous, payment) {
  const {
    hostedPricingForCheckout,
    hostedPricingFields,
    withHostedRollover,
  } = await import('../src/lib/subscriptionPrice.js');
  const now = new Date();
  const rolled = withHostedRollover(previous || {}, now);
  const pricing = hostedPricingForCheckout(rolled, now);
  const fields = hostedPricingFields(pricing);
  const existingEnd = new Date((rolled && rolled.current_period_end) || now);
  const stillPaid = rolled && rolled.plan_id === 'plan_founding' && existingEnd.getTime() > now.getTime();
  const periodStart = stillPaid ? new Date(rolled.current_period_start || now) : now;
  const months = Number(payment.periodMonths) === 12 ? 12 : 1;
  const periodEnd = addBillingMonths(stillPaid ? existingEnd : now, months);
  const consumed = [
    ...((rolled && rolled.consumed_payment_ids) || []),
    rolled && rolled.payment_provider_checkout_id,
    payment.paymentId,
  ].filter((id, index, all) => Boolean(id) && all.indexOf(id) === index);
  const included = Number(fields.included_trucks) || 5;
  return {
    id: (rolled && rolled.id) || `sub-${String(userId || companyId).slice(0, 8)}`,
    user_id: userId || (rolled && rolled.user_id) || '',
    company_id: companyId,
    plan_id: 'plan_founding',
    status: 'active',
    current_period_start: periodStart.toISOString(),
    current_period_end: periodEnd.toISOString(),
    cancel_at_period_end: false,
    auto_renew: true,
    payment_provider: 'paymongo',
    payment_provider_checkout_id: payment.paymentId,
    last_payment_method: payment.method || 'qrph',
    consumed_payment_ids: consumed,
    billing_cycle: payment.billingCycle === 'annual' ? 'annual' : 'monthly',
    billed_truck_count: Math.max(Number(payment.truckCount || 0), included),
    last_billed_amount_php: Number(payment.amountPhp || 0),
    created_at: (rolled && rolled.created_at) || now.toISOString(),
    updated_at: now.toISOString(),
    ...fields,
  };
}

async function writeSubscription(db, companyId, subscription, tier) {
  await db.collection('companies').doc(companyId).set(
    { subscription, subscriptionTier: tier },
    { merge: true }
  );
}

const SAAS_COMMISSION_FIRST_RATE = 0.25;
const SAAS_COMMISSION_RENEWAL_RATE = 0.10;
const SAAS_COMMISSION_MONTHS = 12;

function saasCommissionRate(paymentNumber) {
  const n = Math.max(1, Math.floor(Number(paymentNumber) || 1));
  if (n === 1) return SAAS_COMMISSION_FIRST_RATE;
  if (n <= SAAS_COMMISSION_MONTHS) return SAAS_COMMISSION_RENEWAL_RATE;
  return 0;
}

function payMongoPaymentIds(subscription) {
  const ids = [
    ...((subscription && subscription.consumed_payment_ids) || []),
    subscription && subscription.payment_provider_checkout_id,
  ].filter((id, index, all) => Boolean(id) && String(id).startsWith('pay_') && all.indexOf(id) === index);
  return ids;
}

async function accrueSaasCommission(db, company, companyId, payment, subscription) {
  const agentId = String((company && company.salesAgentId) || '').trim();
  const billedPhp = Math.max(0, Number(payment && payment.amountPhp) || 0);
  const paymentId = String((payment && payment.paymentId) || '');
  if (!agentId || !paymentId || billedPhp <= 0) return;
  const paymentNumber = Math.max(1, payMongoPaymentIds(subscription).length);
  const rate = saasCommissionRate(paymentNumber);
  const commissionPhp = Math.round(billedPhp * rate);
  if (commissionPhp <= 0) return;
  const commRef = db.collection('salesAgents').doc(agentId).collection('commissions').doc(`saas-${paymentId}`);
  const existing = await commRef.get();
  if (existing.exists) return;
  await commRef.set({
    id: `saas-${paymentId}`,
    agentId,
    companyId,
    companyName: company.name || company.email || companyId,
    kind: 'saas',
    paymentId,
    paymentNumber,
    billedPhp,
    rate,
    commissionPhp,
    createdAt: new Date().toISOString(),
  });
}

async function grantFounding(db, caller, payment) {
  const { companyId, company } = await loadOwnedCompany(db, caller);
  const previous = company.subscription || {};
  const already = Array.isArray(previous.consumed_payment_ids)
    && previous.consumed_payment_ids.includes(payment.paymentId);
  if (already && previous.plan_id === 'plan_founding' && !isFoundingExpired(previous)) {
    await accrueSaasCommission(db, company, companyId, payment, previous);
    return { companyId, subscription: previous, subscriptionTier: 'Growth' };
  }
  const subscription = await foundingSubscription(companyId, caller.uid, previous, payment);
  await writeSubscription(db, companyId, subscription, 'Growth');
  await accrueSaasCommission(db, company, companyId, payment, subscription);
  return { companyId, subscription, subscriptionTier: 'Growth' };
}

async function setCancelFlag(db, caller, cancelAtPeriodEnd) {
  const { companyId, company } = await loadOwnedCompany(db, caller);
  const { withHostedRollover } = await import('../src/lib/subscriptionPrice.js');
  let subscription = withHostedRollover(company.subscription || {}, new Date());
  if (isFoundingExpired(subscription)) {
    subscription = await freeSubscription(companyId, caller.uid, subscription);
    await writeSubscription(db, companyId, subscription, 'Free');
    return { companyId, subscription, subscriptionTier: 'Free' };
  }
  subscription = {
    ...subscription,
    cancel_at_period_end: Boolean(cancelAtPeriodEnd),
    auto_renew: !cancelAtPeriodEnd,
    updated_at: new Date().toISOString(),
  };
  const tier = subscription.plan_id === 'plan_founding' ? 'Growth' : 'Free';
  await writeSubscription(db, companyId, subscription, tier);
  return { companyId, subscription, subscriptionTier: tier };
}

async function rolloverAllCompanies(db) {
  const { withHostedRollover } = await import('../src/lib/subscriptionPrice.js');
  const snap = await db.collection('companies').get();
  let updated = 0;
  for (const doc of snap.docs) {
    const data = doc.data() || {};
    const previous = data.subscription;
    if (!previous) continue;
    let subscription = withHostedRollover(previous, new Date());
    if (isFoundingExpired(subscription)) {
      subscription = await freeSubscription(doc.id, previous.user_id || '', subscription);
    }
    if (
      subscription === previous
      || (
        subscription.plan_id === previous.plan_id
        && subscription.pricing_tier === previous.pricing_tier
        && subscription.included_trucks === previous.included_trucks
        && subscription.base_rate_php === previous.base_rate_php
        && subscription.lock_expires_at === previous.lock_expires_at
        && subscription.founding_signup_at === previous.founding_signup_at
        && subscription.current_period_end === previous.current_period_end
      )
    ) {
      continue;
    }
    const tier = subscription.plan_id === 'plan_founding' ? 'Growth' : 'Free';
    await writeSubscription(db, doc.id, subscription, tier);
    updated += 1;
  }
  return { scanned: snap.size, updated };
}

module.exports = {
  getAdminDb,
  isPlatformAdmin,
  stampAdminSession,
  grantFounding,
  setCancelFlag,
  rolloverAllCompanies,
};
