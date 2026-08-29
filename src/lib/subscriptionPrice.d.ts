export type BillingCycle = 'monthly' | 'annual';

export type HostedPricingTier = 'founding' | 'founding-rolled' | 'list';

export interface HostedPricing {
  pricingTier: HostedPricingTier;
  basePhp: number;
  includedTrucks: number;
  lockExpiresAt?: Date | string | null;
  foundingSignupAt?: Date | string | null;
}

export interface SubscriptionPrice {
  truckCount: number;
  extraTrucks: number;
  billingCycle: BillingCycle;
  monthlyTotal: number;
  annualTotal: number;
  monthlyEquivalent: number;
  chargePhp: number;
  chargeCentavos: number;
  periodMonths: 1 | 12;
  annualDiscountPercent: number;
  includedTrucks: number;
  basePhp: number;
  perExtraTruckPhp: number;
  pricingTier: HostedPricingTier;
  lockExpiresAt?: Date | string | null;
}

export const FOUNDING_BASE_PHP: number;
export const FOUNDING_INCLUDED_TRUCKS: number;
export const FOUNDING_PER_EXTRA_TRUCK_PHP: number;
export const FOUNDING_ROLLED_PHP: number;
export const LIST_BASE_PHP: number;
export const LIST_INCLUDED_TRUCKS: number;
export const FOUNDING_LIST_PHP: number;
export const FOUNDING_ELIGIBILITY_END_ISO: string;
export const PRICING_TIER_FOUNDING: HostedPricingTier;
export const PRICING_TIER_FOUNDING_ROLLED: HostedPricingTier;
export const PRICING_TIER_LIST: HostedPricingTier;
export const ANNUAL_DISCOUNT_RATE: number;

export function foundingEligibilityEnd(): Date;
export function isFoundingSignupOpen(at?: Date | string | number): boolean;
export function addCalendarYears(from: Date, years?: number): Date;
export function formatFoundingDeadline(): string;
export function hostedPricingForCheckout(existing?: object | null, at?: Date | string | number): HostedPricing;
export function withHostedRollover<T extends object>(subscription: T, at?: Date | string | number): T;
export function hostedIdentityPatch(subscription?: object | null, at?: Date | string | number): {
  pricing_tier?: HostedPricingTier;
  included_trucks?: number;
  base_rate_php?: number;
  lock_expires_at?: string;
  founding_signup_at?: string;
};
export function hostedPricingFields(pricing: HostedPricing): {
  pricing_tier: HostedPricingTier;
  included_trucks: number;
  base_rate_php: number;
  lock_expires_at?: string;
  founding_signup_at?: string;
};

export function calculateSubscriptionPrice(
  truckCount: number,
  billingCycle?: BillingCycle | string,
  pricing?: HostedPricing | object | null
): SubscriptionPrice;

export function formatPhp(amount: number): string;

export function parseBillingCycle(value?: string): BillingCycle;

export function hostedPlanName(pricing?: HostedPricing | null): string;

export function foundingLockHeadline(pricing?: HostedPricing | null): string;

export function foundingLockBody(pricing?: HostedPricing | null): string;

export function foundingUrgencyCopy(): string;

export const MAX_BILLABLE_TRUCKS: number;

export const FREE_TRIAL_MONTHS: number;
export const FREE_INCLUDED_TRUCKS: number;
export const FREE_STORAGE_GB: number;
export const FOUNDING_STORAGE_GB: number;
export const STORAGE_EXTRA_GB_PHP: number;
export const BYTES_PER_GB: number;

export const SAAS_COMMISSION_FIRST_RATE: number;
export const SAAS_COMMISSION_RENEWAL_RATE: number;
export const SAAS_COMMISSION_MONTHS: number;
export const PERPETUAL_LICENSE_PHP: number;
export const PERPETUAL_SUPPORT_PHP: number;
export const PERPETUAL_COMMISSION_RATE: number;

export function saasCommissionRate(paymentNumber?: number): number;
export function saasCommissionPhp(paymentNumber?: number, billedPhp?: number): number;
export function perpetualCommissionPhp(kind?: string, billedPhp?: number): number;

export function storageLimitGb(subscription?: { plan_id?: string; storage_addon_gb?: number } | null): number;
export function storageLimitBytes(subscription?: { plan_id?: string; storage_addon_gb?: number } | null): number;
export function bytesToGb(bytes?: number): number;
export function formatStorageGb(bytes?: number): string;

export function paidTruckLimit(subscription?: {
  plan_id?: string;
  billed_truck_count?: number;
  included_trucks?: number;
  pricing_tier?: HostedPricingTier;
  founding_signup_at?: string;
} | null): number;

export function billableTruckCount(
  actualCount?: number,
  billedCount?: number,
  requestedCount?: number
): number;
