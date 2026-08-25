/** Founding base monthly price in pesos. Covers the first two trucks. */
export const FOUNDING_BASE_PHP = 899;
export const FOUNDING_INCLUDED_TRUCKS = 2;
export const FOUNDING_PER_EXTRA_TRUCK_PHP = 150;
/** Public list price after the Founding window. New companies will pay this base. */
export const FOUNDING_LIST_PHP = 2999;
/** Confirmed: 15% off when the company pays a year up front. */
export const ANNUAL_DISCOUNT_RATE = 0.15;

/**
 * Single source of truth for Founding hybrid pricing.
 * Used by the paywall UI and PayMongo checkout (pesos and centavos).
 */
export function calculateSubscriptionPrice(truckCount, billingCycle) {
  const trucks = Math.max(0, Math.floor(Number(truckCount) || 0));
  const cycle = billingCycle === 'annual' ? 'annual' : 'monthly';
  const extraTrucks = Math.max(0, trucks - FOUNDING_INCLUDED_TRUCKS);
  const monthlyTotal = FOUNDING_BASE_PHP + extraTrucks * FOUNDING_PER_EXTRA_TRUCK_PHP;
  const annualTotal = Math.round(monthlyTotal * 12 * (1 - ANNUAL_DISCOUNT_RATE));
  const monthlyEquivalent = Math.round((annualTotal / 12) * 100) / 100;
  const chargePhp = cycle === 'annual' ? annualTotal : monthlyTotal;
  return {
    truckCount: trucks,
    extraTrucks,
    billingCycle: cycle,
    monthlyTotal,
    annualTotal,
    monthlyEquivalent,
    chargePhp,
    chargeCentavos: chargePhp * 100,
    periodMonths: cycle === 'annual' ? 12 : 1,
    annualDiscountPercent: Math.round(ANNUAL_DISCOUNT_RATE * 100),
    includedTrucks: FOUNDING_INCLUDED_TRUCKS,
    basePhp: FOUNDING_BASE_PHP,
    perExtraTruckPhp: FOUNDING_PER_EXTRA_TRUCK_PHP,
  };
}

export function formatPhp(amount) {
  return `₱${Math.round(Number(amount) || 0).toLocaleString('en-PH')}`;
}

export function parseBillingCycle(value) {
  return String(value || '').toLowerCase() === 'annual' ? 'annual' : 'monthly';
}

/** Short owner-facing lock copy. Checkout still charges the Founding amount only. */
export function foundingLockHeadline() {
  return `Lock ${formatPhp(FOUNDING_BASE_PHP)} now. Later this goes to ${formatPhp(FOUNDING_LIST_PHP)}.`;
}

export function foundingLockBody() {
  return `Founding companies keep ${formatPhp(FOUNDING_BASE_PHP)} as long as they stay subscribed. New companies later pay ${formatPhp(FOUNDING_LIST_PHP)}.`;
}

export const MAX_BILLABLE_TRUCKS = 200;

/** Free trial: 1 month from signup, up to this many trucks. */
export const FREE_TRIAL_MONTHS = 1;
export const FREE_INCLUDED_TRUCKS = 5;

/** Photo / POD storage included in each plan (binary GB). */
export const FREE_STORAGE_GB = 2;
export const FOUNDING_STORAGE_GB = 5;
/** Extra photo storage sold on top of the plan cap. Markup over Firebase stored+download cost. */
export const STORAGE_EXTRA_GB_PHP = 99;
export const BYTES_PER_GB = 1024 * 1024 * 1024;

/** Sales agent cut on confirmed PayMongo Founding (first month vs months 2–12). */
export const SAAS_COMMISSION_FIRST_RATE = 0.25;
export const SAAS_COMMISSION_RENEWAL_RATE = 0.10;
export const SAAS_COMMISSION_MONTHS = 12;
export const PERPETUAL_LICENSE_PHP = 300000;
export const PERPETUAL_SUPPORT_PHP = 54000;
export const PERPETUAL_COMMISSION_RATE = 0.10;

export function saasCommissionRate(paymentNumber) {
  const n = Math.max(1, Math.floor(Number(paymentNumber) || 1));
  if (n === 1) return SAAS_COMMISSION_FIRST_RATE;
  if (n <= SAAS_COMMISSION_MONTHS) return SAAS_COMMISSION_RENEWAL_RATE;
  return 0;
}

export function saasCommissionPhp(paymentNumber, billedPhp) {
  const billed = Math.max(0, Number(billedPhp) || 0);
  return Math.round(billed * saasCommissionRate(paymentNumber));
}

export function perpetualCommissionPhp(kind, billedPhp) {
  const billed = Math.max(0, Number(billedPhp) || PERPETUAL_LICENSE_PHP);
  if (kind === 'support') {
    return Math.round((Number(billedPhp) || PERPETUAL_SUPPORT_PHP) * PERPETUAL_COMMISSION_RATE);
  }
  return Math.round(billed * PERPETUAL_COMMISSION_RATE);
}

export function storageLimitGb(subscription) {
  const addon = Math.max(0, Math.floor(Number(subscription && subscription.storage_addon_gb) || 0));
  const planId = subscription && subscription.plan_id;
  const base = planId === 'plan_founding' || planId === 'plan_promo' ? FOUNDING_STORAGE_GB : FREE_STORAGE_GB;
  return base + addon;
}

export function storageLimitBytes(subscription) {
  return storageLimitGb(subscription) * BYTES_PER_GB;
}

export function bytesToGb(bytes) {
  return Math.round((Number(bytes) || 0) / BYTES_PER_GB * 100) / 100;
}

export function formatStorageGb(bytes) {
  const gb = bytesToGb(bytes);
  if (gb < 0.01 && (Number(bytes) || 0) > 0) return `${Math.ceil((Number(bytes) || 0) / (1024 * 1024))} MB`;
  return `${gb} GB`;
}

/** Trucks this company already paid for. Free is 5 during the trial. Founding with no bill record is the 2 included trucks. Promo uses the admin-set cap. */
export function paidTruckLimit(subscription) {
  const billed = Math.floor(Number(subscription && subscription.billed_truck_count));
  if (subscription && subscription.plan_id === 'plan_promo') {
    if (Number.isFinite(billed) && billed > 0) return billed;
    return 1;
  }
  if (subscription && subscription.plan_id === 'plan_founding') {
    if (Number.isFinite(billed) && billed > 0) return billed;
    return FOUNDING_INCLUDED_TRUCKS;
  }
  return FREE_INCLUDED_TRUCKS;
}

/** Charge for the larger of actual fleet, already-paid slots, and requested slots. */
export function billableTruckCount(actualCount, billedCount, requestedCount) {
  const actual = Math.max(0, Math.floor(Number(actualCount) || 0));
  const billed = Math.max(0, Math.floor(Number(billedCount) || 0));
  const requested = Math.max(0, Math.floor(Number(requestedCount) || 0));
  return Math.min(MAX_BILLABLE_TRUCKS, Math.max(actual, billed, requested, 1));
}
