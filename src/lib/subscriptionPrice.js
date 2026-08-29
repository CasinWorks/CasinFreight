/** Founding year-1 monthly price. Covers the first five trucks. */
export const FOUNDING_BASE_PHP = 899;
export const FOUNDING_INCLUDED_TRUCKS = 5;
export const FOUNDING_PER_EXTRA_TRUCK_PHP = 150;
/** After the 1-year Founding lock, price becomes this. Included trucks stay 5. */
export const FOUNDING_ROLLED_PHP = 1599;
/** List monthly price for companies that miss the Founding cutoff. Includes 2 trucks. */
export const LIST_BASE_PHP = 1599;
export const LIST_INCLUDED_TRUCKS = 2;
/** Alias used in UI strikethrough / year-2 Founding rate. Same as list base. */
export const FOUNDING_LIST_PHP = LIST_BASE_PHP;
/** Last instant a new paid signup can still take Founding (Asia/Manila). */
export const FOUNDING_ELIGIBILITY_END_ISO = '2026-12-31T23:59:59+08:00';

export const PRICING_TIER_FOUNDING = 'founding';
export const PRICING_TIER_FOUNDING_ROLLED = 'founding-rolled';
export const PRICING_TIER_LIST = 'list';

/** Confirmed: 15% off when the company pays a year up front. */
export const ANNUAL_DISCOUNT_RATE = 0.15;

export function foundingEligibilityEnd() {
  return new Date(FOUNDING_ELIGIBILITY_END_ISO);
}

export function isFoundingSignupOpen(at) {
  const now = at instanceof Date ? at : new Date(at || Date.now());
  return now.getTime() <= foundingEligibilityEnd().getTime();
}

export function addCalendarYears(from, years = 1) {
  const next = new Date(from);
  next.setFullYear(next.getFullYear() + years);
  return next;
}

export function formatFoundingDeadline() {
  return foundingEligibilityEnd().toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function asDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isFoundingFamilyTier(tier) {
  return tier === PRICING_TIER_FOUNDING || tier === PRICING_TIER_FOUNDING_ROLLED;
}

function hadPaidFounding(subscription) {
  if (!subscription) return false;
  if (subscription.pricing_tier === PRICING_TIER_LIST) return false;
  if (isFoundingFamilyTier(subscription.pricing_tier)) return true;
  if (subscription.founding_signup_at) return true;
  // Legacy paid docs created before pricing_tier existed were all Founding.
  if (subscription.plan_id === 'plan_founding') return true;
  return false;
}

export function hostedPricingFromFields(pricing) {
  const tier = pricing && pricing.pricingTier;
  if (tier === PRICING_TIER_LIST) {
    return {
      pricingTier: PRICING_TIER_LIST,
      basePhp: LIST_BASE_PHP,
      includedTrucks: LIST_INCLUDED_TRUCKS,
      lockExpiresAt: null,
    };
  }
  if (tier === PRICING_TIER_FOUNDING_ROLLED) {
    const included = Math.max(
      FOUNDING_INCLUDED_TRUCKS,
      Math.floor(Number(pricing && pricing.includedTrucks) || FOUNDING_INCLUDED_TRUCKS)
    );
    return {
      pricingTier: PRICING_TIER_FOUNDING_ROLLED,
      basePhp: FOUNDING_ROLLED_PHP,
      includedTrucks: included,
      lockExpiresAt: asDate(pricing && pricing.lockExpiresAt),
    };
  }
  const included = Math.max(
    FOUNDING_INCLUDED_TRUCKS,
    Math.floor(Number(pricing && pricing.includedTrucks) || FOUNDING_INCLUDED_TRUCKS)
  );
  return {
    pricingTier: PRICING_TIER_FOUNDING,
    basePhp: FOUNDING_BASE_PHP,
    includedTrucks: included,
    lockExpiresAt: asDate(pricing && pricing.lockExpiresAt),
  };
}

/**
 * Resolve hosted SaaS pricing for checkout / UI.
 * Existing Founding customers keep the 5-truck allowance for life.
 * New paid signups after the cutoff get List (₱1,599 / 2 trucks).
 */
export function hostedPricingForCheckout(existing, at) {
  const now = at instanceof Date ? at : new Date(at || Date.now());
  if (existing && existing.pricing_tier === PRICING_TIER_LIST && !hadPaidFounding(existing)) {
    return {
      pricingTier: PRICING_TIER_LIST,
      basePhp: LIST_BASE_PHP,
      includedTrucks: LIST_INCLUDED_TRUCKS,
      lockExpiresAt: null,
      foundingSignupAt: null,
    };
  }
  if (hadPaidFounding(existing)) {
    const signup = asDate(existing.founding_signup_at)
      || asDate(existing.lock_expires_at && existing.created_at)
      || asDate(existing.created_at)
      || asDate(existing.current_period_start)
      || now;
    const lockEnd = asDate(existing.lock_expires_at) || addCalendarYears(signup, 1);
    const included = Math.max(
      FOUNDING_INCLUDED_TRUCKS,
      Math.floor(Number(existing.included_trucks) || 0) || FOUNDING_INCLUDED_TRUCKS
    );
    if (existing.pricing_tier === PRICING_TIER_FOUNDING_ROLLED || now.getTime() > lockEnd.getTime()) {
      return {
        pricingTier: PRICING_TIER_FOUNDING_ROLLED,
        basePhp: FOUNDING_ROLLED_PHP,
        includedTrucks: included,
        lockExpiresAt: lockEnd,
        foundingSignupAt: signup,
      };
    }
    return {
      pricingTier: PRICING_TIER_FOUNDING,
      basePhp: FOUNDING_BASE_PHP,
      includedTrucks: included,
      lockExpiresAt: lockEnd,
      foundingSignupAt: signup,
    };
  }
  if (isFoundingSignupOpen(now)) {
    const signup = now;
    return {
      pricingTier: PRICING_TIER_FOUNDING,
      basePhp: FOUNDING_BASE_PHP,
      includedTrucks: FOUNDING_INCLUDED_TRUCKS,
      lockExpiresAt: addCalendarYears(signup, 1),
      foundingSignupAt: signup,
    };
  }
  return {
    pricingTier: PRICING_TIER_LIST,
    basePhp: LIST_BASE_PHP,
    includedTrucks: LIST_INCLUDED_TRUCKS,
    lockExpiresAt: null,
    foundingSignupAt: null,
  };
}

/** Flip Founding → founding-rolled when the 1-year lock has passed. Never shrinks included trucks. */
export function withHostedRollover(subscription, at) {
  if (!subscription || !hadPaidFounding(subscription)) return subscription;
  const pricing = hostedPricingForCheckout(subscription, at);
  const fields = hostedPricingFields(pricing);
  const next = {
    ...subscription,
    ...fields,
  };
  if (
    next.pricing_tier === subscription.pricing_tier
    && next.included_trucks === subscription.included_trucks
    && next.base_rate_php === subscription.base_rate_php
    && next.lock_expires_at === subscription.lock_expires_at
    && next.founding_signup_at === subscription.founding_signup_at
  ) {
    return subscription;
  }
  return { ...next, updated_at: new Date().toISOString() };
}

/** Persist Founding/List identity when a paid period lapses to Free. */
export function hostedIdentityPatch(subscription, at) {
  if (!subscription) return {};
  if (subscription.pricing_tier === PRICING_TIER_LIST) {
    return {
      pricing_tier: PRICING_TIER_LIST,
      included_trucks: LIST_INCLUDED_TRUCKS,
      base_rate_php: LIST_BASE_PHP,
    };
  }
  if (!hadPaidFounding(subscription)) return {};
  return hostedPricingFields(hostedPricingForCheckout(withHostedRollover(subscription, at), at));
}

export function hostedPricingFields(pricing) {
  const lock = pricing && pricing.lockExpiresAt;
  const signup = pricing && pricing.foundingSignupAt;
  const fields = {
    pricing_tier: pricing.pricingTier,
    included_trucks: pricing.includedTrucks,
    base_rate_php: pricing.basePhp,
  };
  if (lock) fields.lock_expires_at = lock instanceof Date ? lock.toISOString() : lock;
  if (signup) fields.founding_signup_at = signup instanceof Date ? signup.toISOString() : String(signup);
  return fields;
}

/**
 * Single source of truth for hosted SaaS pricing.
 * Pass a pricing object from hostedPricingForCheckout so Founding vs List is correct.
 */
export function calculateSubscriptionPrice(truckCount, billingCycle, pricing) {
  let resolved;
  if (pricing && pricing.pricingTier) {
    resolved = hostedPricingFromFields(pricing);
  } else if (pricing && (pricing.plan_id || pricing.pricing_tier || pricing.founding_signup_at)) {
    resolved = hostedPricingForCheckout(pricing);
  } else {
    resolved = hostedPricingForCheckout(pricing && pricing.existing, pricing && pricing.at);
  }
  const trucks = Math.max(0, Math.floor(Number(truckCount) || 0));
  const cycle = billingCycle === 'annual' ? 'annual' : 'monthly';
  const includedTrucks = resolved.includedTrucks;
  const extraTrucks = Math.max(0, trucks - includedTrucks);
  const monthlyTotal = resolved.basePhp + extraTrucks * FOUNDING_PER_EXTRA_TRUCK_PHP;
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
    includedTrucks,
    basePhp: resolved.basePhp,
    perExtraTruckPhp: FOUNDING_PER_EXTRA_TRUCK_PHP,
    pricingTier: resolved.pricingTier,
    lockExpiresAt: resolved.lockExpiresAt,
  };
}

export function formatPhp(amount) {
  return `₱${Math.round(Number(amount) || 0).toLocaleString('en-PH')}`;
}

export function parseBillingCycle(value) {
  return String(value || '').toLowerCase() === 'annual' ? 'annual' : 'monthly';
}

export function hostedPlanName(pricing) {
  const tier = (pricing && pricing.pricingTier) || hostedPricingForCheckout().pricingTier;
  if (tier === PRICING_TIER_LIST) return 'List';
  if (tier === PRICING_TIER_FOUNDING_ROLLED) return 'Founding';
  return 'Founding';
}

export function foundingLockHeadline(pricing) {
  const resolved = pricing && pricing.pricingTier ? pricing : hostedPricingForCheckout();
  if (resolved.pricingTier === PRICING_TIER_LIST) {
    return `${formatPhp(LIST_BASE_PHP)}/mo — includes ${LIST_INCLUDED_TRUCKS} trucks.`;
  }
  if (resolved.pricingTier === PRICING_TIER_FOUNDING_ROLLED) {
    return `${formatPhp(FOUNDING_ROLLED_PHP)}/mo — you keep ${resolved.includedTrucks || FOUNDING_INCLUDED_TRUCKS} trucks included.`;
  }
  return `${formatPhp(FOUNDING_BASE_PHP)}/mo for your first year — includes ${FOUNDING_INCLUDED_TRUCKS} trucks.`;
}

export function foundingLockBody(pricing) {
  const resolved = pricing && pricing.pricingTier ? pricing : hostedPricingForCheckout();
  if (resolved.pricingTier === PRICING_TIER_LIST) {
    return `+${formatPhp(FOUNDING_PER_EXTRA_TRUCK_PHP)}/truck beyond ${LIST_INCLUDED_TRUCKS}.`;
  }
  if (resolved.pricingTier === PRICING_TIER_FOUNDING_ROLLED) {
    return `Your 1-year Founding lock has ended. Rate is ${formatPhp(FOUNDING_ROLLED_PHP)}/mo. The ${FOUNDING_INCLUDED_TRUCKS}-truck allowance stays for life. +${formatPhp(FOUNDING_PER_EXTRA_TRUCK_PHP)}/truck beyond ${FOUNDING_INCLUDED_TRUCKS}.`;
  }
  return `After year 1: ${formatPhp(FOUNDING_ROLLED_PHP)}/mo, and you keep your ${FOUNDING_INCLUDED_TRUCKS}-truck allowance for life. +${formatPhp(FOUNDING_PER_EXTRA_TRUCK_PHP)}/truck beyond ${FOUNDING_INCLUDED_TRUCKS}.`;
}

export function foundingUrgencyCopy() {
  return `Founding pricing ends Dec 31, 2026 — lock in ${FOUNDING_INCLUDED_TRUCKS} trucks included and ${formatPhp(FOUNDING_BASE_PHP)}/mo for your first year.`;
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

function includedTrucksFor(subscription) {
  const stored = Math.floor(Number(subscription && subscription.included_trucks) || 0);
  if (stored > 0) return stored;
  if (hadPaidFounding(subscription) || (subscription && subscription.plan_id === 'plan_founding')) {
    if (subscription.pricing_tier === PRICING_TIER_LIST) return LIST_INCLUDED_TRUCKS;
    return FOUNDING_INCLUDED_TRUCKS;
  }
  if (subscription && subscription.pricing_tier === PRICING_TIER_LIST) return LIST_INCLUDED_TRUCKS;
  return FREE_INCLUDED_TRUCKS;
}

/** Trucks this company already paid for, never below the included allowance of their pricing tier. */
export function paidTruckLimit(subscription) {
  const billed = Math.floor(Number(subscription && subscription.billed_truck_count));
  if (subscription && subscription.plan_id === 'plan_promo') {
    if (Number.isFinite(billed) && billed > 0) return billed;
    return 1;
  }
  if (subscription && (subscription.plan_id === 'plan_founding' || hadPaidFounding(subscription))) {
    const included = includedTrucksFor(subscription);
    if (Number.isFinite(billed) && billed > included) return billed;
    return included;
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
