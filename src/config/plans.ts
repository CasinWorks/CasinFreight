import { Plan, Subscription } from '../types';

export const PLAN_FREE_ID = 'plan_free';
export const PLAN_FOUNDING_ID = 'plan_founding';
export const FOUNDING_PRICE_PHP = 899;

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
  if (!subscription || subscription.plan_id !== PLAN_FOUNDING_ID) return false;
  const end = Date.parse(subscription.current_period_end || '');
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
    maxTrucks: 1,
    maxAccounts: 1,
    maxRoles: 1,
    maxTransactions: 10,
  },
  [PLAN_FOUNDING_ID]: {
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
    description: 'Full product access for a single-truck operator. Upgrade when you add fleet, staff, or volume.',
    price_php: 0,
    interval: 'month',
    max_bookings_per_month: 10,
    max_storage_mb: 100,
    is_active: true,
    features: [
      'Access to every module (trips, billing, ledger, RBAC, fuel)',
      '1 truck',
      '1 company account / role',
      '10 transactions (trip bookings)',
      'Owner permissions on the full workspace',
    ],
    badge: 'FREE',
    isRecommended: false,
  },
  {
    id: PLAN_FOUNDING_ID,
    name: 'Founding',
    description: 'Unlimited trucks, team seats, roles, and transactions at a locked founding rate.',
    price_php: FOUNDING_PRICE_PHP,
    interval: 'month',
    max_bookings_per_month: null,
    max_storage_mb: null,
    is_active: true,
    features: [
      'Unlimited trucks and trip transactions',
      'Unlimited team accounts and custom roles',
      'Full RBAC, BIR ledger, and dual-control billing',
      'Unlocks after a confirmed PayMongo payment',
      '₱899 billed every month — access lasts until the renewal date',
    ],
    badge: 'FOUNDING',
    isRecommended: true,
  },
];

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
  previous?: Pick<Subscription, 'consumed_payment_ids' | 'payment_provider_checkout_id'>
): Subscription {
  const start = new Date();
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  const consumed = [
    ...(previous?.consumed_payment_ids || []),
    previous?.payment_provider_checkout_id || '',
  ].filter((id, index, all) => Boolean(id) && all.indexOf(id) === index);
  return {
    id: `sub-${userId.slice(0, 8) || 'free'}`,
    user_id: userId,
    company_id: companyId,
    plan_id: PLAN_FREE_ID,
    status: 'active',
    current_period_start: start.toISOString(),
    current_period_end: end.toISOString(),
    cancel_at_period_end: false,
    payment_provider: 'paymongo',
    ...(consumed.length ? { consumed_payment_ids: consumed } : {}),
    created_at: start.toISOString(),
    updated_at: start.toISOString(),
  };
}
