import { Plan } from '../types';

export const PLAN_FREE_ID = 'plan_free';
export const PLAN_FOUNDING_ID = 'plan_founding';

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
    price_php: 499,
    interval: 'month',
    max_bookings_per_month: null,
    max_storage_mb: null,
    is_active: true,
    features: [
      'Unlimited trucks and trip transactions',
      'Unlimited team accounts and custom roles',
      'Full RBAC, BIR ledger, and dual-control billing',
      'PayMongo-ready GCash, Maya, cards & QR PH',
      'Locked founding rate: ₱499/month',
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
