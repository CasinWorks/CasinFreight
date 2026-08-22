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
