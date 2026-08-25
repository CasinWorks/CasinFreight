export type BillingCycle = 'monthly' | 'annual';

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
}

export const FOUNDING_BASE_PHP: number;
export const FOUNDING_INCLUDED_TRUCKS: number;
export const FOUNDING_PER_EXTRA_TRUCK_PHP: number;
export const FOUNDING_LIST_PHP: number;
export const ANNUAL_DISCOUNT_RATE: number;

export function calculateSubscriptionPrice(
  truckCount: number,
  billingCycle?: BillingCycle | string
): SubscriptionPrice;

export function formatPhp(amount: number): string;

export function parseBillingCycle(value?: string): BillingCycle;

export function foundingLockHeadline(): string;

export function foundingLockBody(): string;

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

export function paidTruckLimit(subscription?: { plan_id?: string; billed_truck_count?: number } | null): number;

export function billableTruckCount(
  actualCount?: number,
  billedCount?: number,
  requestedCount?: number
): number;
