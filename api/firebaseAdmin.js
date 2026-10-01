'use strict';

const { isPlatformAdminUid, platformAdminUids } = require('./platformAdminUids');

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

function isPlatformAdmin(caller) {
  if (!caller) return false;
  const uid = typeof caller === 'object' ? caller.uid : caller;
  if (isPlatformAdminUid(uid)) return true;
  // Until PLATFORM_ADMIN_UIDS is set, keep an already-stamped token.admin claim.
  // Never grant that claim from an email address.
  return platformAdminUids().length === 0 && Boolean(caller && caller.admin);
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

async function stripAdminClaim(uid) {
  const admin = getAdmin();
  if (!admin || !uid) return false;
  const user = await admin.auth().getUser(uid);
  const claims = { ...(user.customClaims || {}) };
  if (claims.admin !== true) return false;
  delete claims.admin;
  await admin.auth().setCustomUserClaims(uid, claims);
  return true;
}

async function stampAdminSession(authHeader) {
  const token = String(authHeader || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return { status: 401, data: { error: 'Sign in required.' } };
  }
  const caller = await lookupCaller(authHeader);
  if (!caller) {
    if (!getAdmin() && !firebaseWebApiKey()) {
      return { status: 200, data: { admin: false, refreshed: false } };
    }
    return { status: 401, data: { error: 'Sign in required.' } };
  }

  if (!isPlatformAdminUid(caller.uid)) {
    if (platformAdminUids().length === 0) {
      return { status: 200, data: { admin: caller.admin === true, refreshed: false } };
    }
    if (caller.admin === true) {
      const stripped = await stripAdminClaim(caller.uid);
      return { status: 200, data: { admin: false, refreshed: stripped } };
    }
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
  const userData = userSnap.data() || {};
  const companyId = String(userData.companyId || '');
  if (!companyId) {
    throw Object.assign(new Error('No company is linked to this login.'), { status: 403 });
  }
  const companySnap = await db.collection('companies').doc(companyId).get();
  if (!companySnap.exists) {
    throw Object.assign(new Error('Company workspace was not found.'), { status: 404 });
  }
  const company = companySnap.data() || {};
  const createdBy = String(company.createdBy || '');
  const role = String(userData.role || '');
  const isOwnerRole = role === 'Owner' || role.toLowerCase().includes('owner');
  if (createdBy !== caller.uid && !isOwnerRole && !isPlatformAdmin(caller)) {
    throw Object.assign(new Error('Only the company Owner can change billing.'), { status: 403 });
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

const CREW_EMAIL_ORIGINS = [
  'https://casinfreight.com',
  'https://www.casinfreight.com',
  'https://casin-freight.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

function crewContinueOrigin(origin) {
  const clean = String(origin || '').replace(/\/$/, '');
  if (CREW_EMAIL_ORIGINS.includes(clean)) return clean;
  return 'https://casin-freight.vercel.app';
}

async function callerMayInviteCrew(db, caller) {
  const userSnap = await db.collection('users').doc(caller.uid).get();
  if (!userSnap.exists) {
    throw Object.assign(new Error('No company is linked to this login.'), { status: 403 });
  }
  const userData = userSnap.data() || {};
  const companyId = String(userData.companyId || '');
  if (!companyId) {
    throw Object.assign(new Error('No company is linked to this login.'), { status: 403 });
  }
  const companySnap = await db.collection('companies').doc(companyId).get();
  if (!companySnap.exists) {
    throw Object.assign(new Error('Company workspace was not found.'), { status: 404 });
  }
  const company = companySnap.data() || {};
  const role = String(userData.role || '');
  const isOwner = String(company.createdBy || '') === caller.uid
    || role === 'Owner'
    || role.toLowerCase().includes('owner')
    || isPlatformAdmin(caller);
  if (isOwner) return companyId;

  const roleSnap = await db.collection('companies').doc(companyId).collection('roles').doc(role).get();
  const permissions = roleSnap.exists && Array.isArray(roleSnap.data().permissions)
    ? roleSnap.data().permissions
    : [];
  if (permissions.includes('drivers.crud') || permissions.includes('rbac.manage') || permissions.includes('settings.manage')) {
    return companyId;
  }
  throw Object.assign(new Error('Only the owner or someone who can edit drivers can send this login email.'), { status: 403 });
}

async function sendPasswordSetupEmail(email, continueUrl) {
  const apiKey = firebaseWebApiKey();
  if (!apiKey) {
    throw Object.assign(new Error('Firebase web API key is missing, so the login email cannot be sent.'), { status: 500 });
  }
  const send = async (url) => {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType: 'PASSWORD_RESET',
          email,
          ...(url ? { continueUrl: url } : {}),
        }),
      }
    );
    const payload = await response.json().catch(() => ({}));
    return { ok: response.ok, payload };
  };

  let result = await send(continueUrl);
  const message = String(result.payload?.error?.message || '');
  if (!result.ok && (message.includes('INVALID_CONTINUE_URI') || message.includes('UNAUTHORIZED_DOMAIN'))) {
    result = await send('');
  }
  if (!result.ok) {
    const reason = message || 'Firebase did not send the login email.';
    throw Object.assign(new Error(reason), { status: 502 });
  }
}

/**
 * Create the person's login if needed, then email them Firebase's link to choose a password.
 * That inbox link is how they prove the email is theirs and open CasinFreight.
 */
async function sendCrewAccessEmail(authHeader, body, origin) {
  const admin = getAdmin();
  if (!admin) {
    return {
      status: 500,
      data: { error: 'FIREBASE_SERVICE_ACCOUNT is not set, so CasinFreight cannot email a login yet.' },
    };
  }
  const caller = await lookupCaller(authHeader);
  if (!caller) {
    return { status: 401, data: { error: 'Sign in required.' } };
  }
  const email = String(body?.email || '').trim().toLowerCase();
  const name = String(body?.name || '').trim() || email.split('@')[0];
  if (!email.includes('@') || !email.includes('.')) {
    return { status: 400, data: { error: 'Enter a real email address.' } };
  }

  const db = admin.firestore();
  let companyId = '';
  try {
    companyId = await callerMayInviteCrew(db, caller);
  } catch (error) {
    const status = error && error.status ? error.status : 403;
    return { status, data: { error: error instanceof Error ? error.message : 'Not allowed.' } };
  }

  let authUser;
  try {
    authUser = await admin.auth().getUserByEmail(email);
  } catch (error) {
    const code = error && error.code ? String(error.code) : '';
    if (code !== 'auth/user-not-found') {
      return { status: 500, data: { error: 'Could not look up that email.' } };
    }
    const password = `${require('crypto').randomBytes(18).toString('base64url')}Aa1`;
    authUser = await admin.auth().createUser({
      email,
      password,
      displayName: name,
      emailVerified: false,
    });
  }

  const profileSnap = await db.collection('users').doc(authUser.uid).get();
  const existingCompanyId = profileSnap.exists ? String(profileSnap.data().companyId || '') : '';
  if (existingCompanyId && existingCompanyId !== companyId) {
    return {
      status: 409,
      data: { error: 'That email already belongs to another company. Untie it there before inviting them here.' },
    };
  }
  if (existingCompanyId === companyId && profileSnap.exists) {
    return { status: 200, data: { emailed: false, alreadyJoined: true } };
  }

  const continueUrl = `${crewContinueOrigin(origin)}/?join=1&email=${encodeURIComponent(email)}`;
  try {
    await sendPasswordSetupEmail(email, continueUrl);
  } catch (error) {
    const status = error && error.status ? error.status : 502;
    return { status, data: { error: error instanceof Error ? error.message : 'Could not send the login email.' } };
  }
  return { status: 200, data: { emailed: true, alreadyJoined: false } };
}

module.exports = {
  getAdminDb,
  isPlatformAdmin,
  stampAdminSession,
  grantFounding,
  setCancelFlag,
  loadOwnedCompany,
  rolloverAllCompanies,
  sendCrewAccessEmail,
};
