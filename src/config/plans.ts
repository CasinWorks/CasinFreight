import { Plan, Subscription } from '../types';
import {
  ANNUAL_DISCOUNT_RATE,
  FOUNDING_BASE_PHP,
  FOUNDING_INCLUDED_TRUCKS,
  FOUNDING_PER_EXTRA_TRUCK_PHP,
  FOUNDING_ROLLED_PHP,
  FREE_INCLUDED_TRUCKS,
  FREE_TRIAL_MONTHS,
  LIST_BASE_PHP,
  LIST_INCLUDED_TRUCKS,
  MAX_BILLABLE_TRUCKS,
  formatPhp,
  foundingLockBody,
  foundingLockHeadline,
  hostedIdentityPatch,
  hostedPricingForCheckout,
} from '../lib/subscriptionPrice';

export { calculateSubscriptionPrice, formatPhp, foundingLockBody, foundingLockHeadline, paidTruckLimit, billableTruckCount } from '../lib/subscriptionPrice';
export {
  ANNUAL_DISCOUNT_RATE,
  FOUNDING_BASE_PHP,
  FOUNDING_INCLUDED_TRUCKS,
  FOUNDING_LIST_PHP,
  FOUNDING_PER_EXTRA_TRUCK_PHP,
  FREE_INCLUDED_TRUCKS,
  FREE_TRIAL_MONTHS,
} from '../lib/subscriptionPrice';

export const PLAN_FREE_ID = 'plan_free';
export const PLAN_FOUNDING_ID = 'plan_founding';
export const PLAN_PROMO_ID = 'plan_promo';
export const FOUNDING_PRICE_PHP = FOUNDING_BASE_PHP;

export function isUnlockedPlanId(planId?: string): boolean {
  return planId === PLAN_FOUNDING_ID || planId === PLAN_PROMO_ID;
}

export interface AdminPlanGrant {
  maxTrucks?: number;
  endsAt?: string;
}

/** YYYY-MM-DD → end of that local day. Used for promo deadlines. */
export function endOfLocalDate(value?: string): Date | null {
  const raw = String(value || '').trim();
  const day = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!day) {
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const end = new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3]), 23, 59, 59, 999);
  return Number.isNaN(end.getTime()) ? null : end;
}

export function addBillingMonths(from: Date, months = 1): Date {
  const next = new Date(from);
  next.setMonth(next.getMonth() + months);
  return next;
}

export function formatPhDate(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function isFoundingPeriodExpired(subscription?: Pick<Subscription, 'plan_id' | 'current_period_end'> | null): boolean {
  if (!subscription || !isUnlockedPlanId(subscription.plan_id)) return false;
  const end = Date.parse(subscription.current_period_end || '');
  return Number.isFinite(end) && end < Date.now();
}

export function isFreeTrialExpired(
  subscription?: Pick<Subscription, 'plan_id' | 'current_period_end' | 'created_at'> | null
): boolean {
  if (!subscription || subscription.plan_id !== PLAN_FREE_ID) return false;
  const end = Date.parse(subscription.current_period_end || subscription.created_at || '');
  return Number.isFinite(end) && end < Date.now();
}

export interface PlanLimits {
  maxTrucks: number | null;
  maxAccounts: number | null;
  maxRoles: number | null;
  maxTransactions: number | null;
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  [PLAN_FREE_ID]: {
    maxTrucks: FREE_INCLUDED_TRUCKS,
    maxAccounts: 100,
    maxRoles: null,
    maxTransactions: 10,
  },
  [PLAN_FOUNDING_ID]: {
    maxTrucks: null,
    maxAccounts: null,
    maxRoles: null,
    maxTransactions: null,
  },
  [PLAN_PROMO_ID]: {
    maxTrucks: null,
    maxAccounts: null,
    maxRoles: null,
    maxTransactions: null,
  },
};

export const SAAS_PLANS: Plan[] = [
  {
    id: PLAN_FREE_ID,
    name: 'Free',
    description: `1-month trial with every module, up to ${FREE_INCLUDED_TRUCKS} trucks. Subscribe after the month ends to keep the workspace.`,
    price_php: 0,
    interval: 'month',
    max_bookings_per_month: 10,
    max_storage_mb: 2048,
    is_active: true,
    features: [
      `${FREE_TRIAL_MONTHS}-month trial of every module`,
      `Up to ${FREE_INCLUDED_TRUCKS} trucks`,
      'Up to 100 team logins (Owner, Dispatcher, Driver, …)',
      '10 transactions (trip bookings)',
      '2 GB photo / POD storage',
      'Subscribe before the month ends to keep operating',
    ],
    badge: 'FREE',
    isRecommended: false,
  },
  {
    id: PLAN_FOUNDING_ID,
    name: 'Founding',
    description: `${formatPhp(FOUNDING_BASE_PHP)}/mo for your first year — includes ${FOUNDING_INCLUDED_TRUCKS} trucks. After year 1: ${formatPhp(FOUNDING_ROLLED_PHP)}/mo, and you keep your ${FOUNDING_INCLUDED_TRUCKS}-truck allowance for life. +${formatPhp(FOUNDING_PER_EXTRA_TRUCK_PHP)}/truck beyond ${FOUNDING_INCLUDED_TRUCKS}.`,
    price_php: FOUNDING_PRICE_PHP,
    interval: 'month',
    max_bookings_per_month: null,
    max_storage_mb: 5120,
    is_active: true,
    features: [
      'Unlimited trip transactions and team seats',
      foundingLockHeadline(),
      foundingLockBody(),
      `Pay annually and save ${Math.round(ANNUAL_DISCOUNT_RATE * 100)}%`,
      'Full RBAC, general ledger, and dual-control billing',
      'Unlocks after a confirmed PayMongo payment',
      '5 GB photo / POD storage; extra space ₱99/GB per month',
    ],
    badge: 'FOUNDING',
    isRecommended: true,
  },
];

export const PROMO_PLAN: Plan = {
  id: PLAN_PROMO_ID,
  name: 'Promo',
  description: 'Complimentary access set by CasinFreight. Truck cap and deadline are chosen per company.',
  price_php: 0,
  interval: 'month',
  max_bookings_per_month: null,
  max_storage_mb: 5120,
  is_active: true,
  features: [
    'Same tools as Founding',
    '5 GB photo / POD storage',
    'Truck limit set by CasinFreight',
    'Ends on the deadline — then returns to Free',
    'No PayMongo charge',
  ],
  badge: 'PROMO',
  isRecommended: false,
};

export function getSaasPlans(existing?: Subscription | null): Plan[] {
  const hosted = hostedPricingForCheckout(existing || undefined);
  const isList = hosted.pricingTier === 'list';
  const paidName = isList ? 'List' : 'Founding';
  const free: Plan = {
    ...SAAS_PLANS[0],
    description: `1-month trial with every module, up to ${FREE_INCLUDED_TRUCKS} trucks. Subscribe to ${paidName} to keep the workspace after the month ends.`,
  };
  const paid: Plan = {
    ...SAAS_PLANS[1],
    name: isList ? 'List' : 'Founding',
    badge: isList ? 'LIST' : 'FOUNDING',
    price_php: hosted.basePhp,
    description: isList
      ? `${formatPhp(LIST_BASE_PHP)}/mo — includes ${LIST_INCLUDED_TRUCKS} trucks. +${formatPhp(FOUNDING_PER_EXTRA_TRUCK_PHP)}/truck beyond ${LIST_INCLUDED_TRUCKS}.`
      : SAAS_PLANS[1].description,
    features: [
      'Unlimited trip transactions and team seats',
      foundingLockHeadline(hosted),
      foundingLockBody(hosted),
      `Pay annually and save ${Math.round(ANNUAL_DISCOUNT_RATE * 100)}%`,
      'Full RBAC, general ledger, and dual-control billing',
      'Unlocks after a confirmed PayMongo payment',
      '5 GB photo / POD storage; extra space ₱99/GB per month',
    ],
  };
  return [free, paid];
}

export const ALL_PLANS: Plan[] = [...SAAS_PLANS, PROMO_PLAN];

export function getPlanLimits(planId?: string): PlanLimits {
  return PLAN_LIMITS[planId || PLAN_FREE_ID] || PLAN_LIMITS[PLAN_FREE_ID];
}

export function isUnlimited(limit: number | null | undefined): boolean {
  return limit === null || limit === undefined;
}

export function hasReachedLimit(used: number, limit: number | null | undefined): boolean {
  if (isUnlimited(limit)) return false;
  return used >= (limit || 0);
}

export function makeFreeSubscription(
  userId: string,
  companyId: string,
  previous?: Partial<Subscription>
): Subscription {
  const start = new Date();
  const end = addBillingMonths(start, FREE_TRIAL_MONTHS);
  const consumed = [
    ...(previous?.consumed_payment_ids || []),
    previous?.payment_provider_checkout_id || '',
  ].filter((id, index, all) => Boolean(id) && all.indexOf(id) === index);
  const identity = previous ? hostedIdentityPatch(previous) : {};
  return {
    id: previous?.id || `sub-${userId.slice(0, 8) || 'free'}`,
    user_id: userId,
    company_id: companyId,
    plan_id: PLAN_FREE_ID,
    status: 'active',
    current_period_start: start.toISOString(),
    current_period_end: end.toISOString(),
    cancel_at_period_end: false,
    payment_provider: 'paymongo',
    ...(consumed.length ? { consumed_payment_ids: consumed } : {}),
    created_at: previous?.created_at || start.toISOString(),
    updated_at: start.toISOString(),
    ...identity,
  };
}

export function makePromoSubscription(
  userId: string,
  companyId: string,
  grant: AdminPlanGrant,
  previous?: Subscription
): Subscription {
  const maxTrucks = Math.min(
    MAX_BILLABLE_TRUCKS,
    Math.max(1, Math.floor(Number(grant.maxTrucks) || 1))
  );
  const end = endOfLocalDate(grant.endsAt);
  if (!end || end.getTime() <= Date.now()) {
    throw new Error('Pick a deadline in the future.');
  }
  const now = new Date();
  const consumed = [
    ...(previous?.consumed_payment_ids || []),
    previous?.payment_provider_checkout_id || '',
  ].filter((id, index, all) => Boolean(id) && all.indexOf(id) === index);
  return {
    id: previous?.id || `sub-${userId.slice(0, 8) || companyId.slice(0, 8) || 'promo'}`,
    user_id: userId,
    company_id: companyId,
    plan_id: PLAN_PROMO_ID,
    status: 'active',
    current_period_start: now.toISOString(),
    current_period_end: end.toISOString(),
    cancel_at_period_end: true,
    auto_renew: false,
    payment_provider: 'paymongo',
    grant_source: 'promo',
    billed_truck_count: maxTrucks,
    last_billed_amount_php: 0,
    ...(consumed.length ? { consumed_payment_ids: consumed } : {}),
    created_at: previous?.created_at || now.toISOString(),
    updated_at: now.toISOString(),
  };
}
