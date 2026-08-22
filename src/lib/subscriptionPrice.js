/** Founding base monthly price in pesos. Covers the first two trucks. */
export const FOUNDING_BASE_PHP = 899;
export const FOUNDING_INCLUDED_TRUCKS = 2;
export const FOUNDING_PER_EXTRA_TRUCK_PHP = 150;
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
