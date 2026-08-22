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

function freeSubscription(companyId, userId, previous) {
  const now = new Date();
  const consumed = Array.isArray(previous && previous.consumed_payment_ids)
    ? previous.consumed_payment_ids.filter(Boolean)
    : [];
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
  };
}

function foundingSubscription(companyId, userId, previous, payment) {
  const now = new Date();
  const existingEnd = new Date((previous && previous.current_period_end) || now);
  const stillFounding = previous && previous.plan_id === 'plan_founding' && existingEnd.getTime() > now.getTime();
  const periodStart = stillFounding ? new Date(previous.current_period_start || now) : now;
  const months = Number(payment.periodMonths) === 12 ? 12 : 1;
  const periodEnd = addBillingMonths(stillFounding ? existingEnd : now, months);
  const consumed = [
    ...((previous && previous.consumed_payment_ids) || []),
    previous && previous.payment_provider_checkout_id,
    payment.paymentId,
  ].filter((id, index, all) => Boolean(id) && all.indexOf(id) === index);
  return {
    id: (previous && previous.id) || `sub-${String(userId || companyId).slice(0, 8)}`,
    user_id: userId || (previous && previous.user_id) || '',
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
    billed_truck_count: Math.max(Number(payment.truckCount || 0), 2),
    last_billed_amount_php: Number(payment.amountPhp || 0),
    created_at: (previous && previous.created_at) || now.toISOString(),
    updated_at: now.toISOString(),
  };
}

async function writeSubscription(db, companyId, subscription, tier) {
  await db.collection('companies').doc(companyId).set(
    { subscription, subscriptionTier: tier },
    { merge: true }
  );
}

async function grantFounding(db, caller, payment) {
  const { companyId, company } = await loadOwnedCompany(db, caller);
  const previous = company.subscription || {};
  const already = Array.isArray(previous.consumed_payment_ids)
    && previous.consumed_payment_ids.includes(payment.paymentId);
  if (already && previous.plan_id === 'plan_founding' && !isFoundingExpired(previous)) {
    return { companyId, subscription: previous, subscriptionTier: 'Growth' };
  }
  const subscription = foundingSubscription(companyId, caller.uid, previous, payment);
  await writeSubscription(db, companyId, subscription, 'Growth');
  return { companyId, subscription, subscriptionTier: 'Growth' };
}

async function setCancelFlag(db, caller, cancelAtPeriodEnd) {
  const { companyId, company } = await loadOwnedCompany(db, caller);
  let subscription = company.subscription || freeSubscription(companyId, caller.uid, {});
  if (isFoundingExpired(subscription)) {
    subscription = freeSubscription(companyId, caller.uid, subscription);
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

module.exports = {
  getAdminDb,
  isPlatformAdmin,
  grantFounding,
  setCancelFlag,
};
