import React from 'react';
import { Check, Lock, Sparkles, Truck, Users, X, Zap } from 'lucide-react';
import { useFreight } from '../../context/FreightContext';
import { PLAN_FOUNDING_ID, PLAN_PROMO_ID, SAAS_PLANS, formatPhDate } from '../../config/plans';
import { calculateSubscriptionPrice, formatPhp, FOUNDING_LIST_PHP, MAX_BILLABLE_TRUCKS, foundingLockBody, foundingLockHeadline, type BillingCycle } from '../../lib/subscriptionPrice';
import { closeIfBackdrop } from '../../lib/modal';

const EXTRA_TRUCK_INTENT_KEY = 'casinfreight_extra_truck';

export const UpgradeModal: React.FC = () => {
  const {
    isUpgradeModalOpen,
    setIsUpgradeModalOpen,
    subscribeToFoundingPlan,
    isWaitingForPayMongo,
    subscriptionUsage,
    subscription,
    activePlan,
    resetCurrentPlanToFree,
    cancelSubscriptionAtPeriodEnd,
    resumeSubscription,
  } = useFreight();

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [billingCycle, setBillingCycle] = React.useState<BillingCycle>(
    subscription.billing_cycle === 'annual' ? 'annual' : 'monthly'
  );
  const usedTrucks = subscriptionUsage.trucksUsed || 0;
  const paidTrucks = subscriptionUsage.maxTrucks ?? 1;
  const minTrucks = Math.max(usedTrucks, 1);
  const [desiredTrucks, setDesiredTrucks] = React.useState(Math.max(minTrucks, paidTrucks));

  React.useEffect(() => {
    if (!isUpgradeModalOpen) return;
    const wantExtra = sessionStorage.getItem(EXTRA_TRUCK_INTENT_KEY) === '1';
    sessionStorage.removeItem(EXTRA_TRUCK_INTENT_KEY);
    if (usedTrucks > paidTrucks) {
      setDesiredTrucks(minTrucks);
      return;
    }
    setDesiredTrucks(wantExtra ? Math.max(minTrucks, paidTrucks) + 1 : Math.max(minTrucks, paidTrucks));
  }, [isUpgradeModalOpen, minTrucks, paidTrucks, usedTrucks]);

  if (!isUpgradeModalOpen) return null;

  const truckCount = desiredTrucks;
  const price = calculateSubscriptionPrice(truckCount, billingCycle);
  const overPaidFleet = usedTrucks > paidTrucks;

  const handleSubscribe = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await subscribeToFoundingPlan(billingCycle, desiredTrucks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start PayMongo checkout.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const waiting = isWaitingForPayMongo || isSubmitting;

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={closeIfBackdrop(() => setIsUpgradeModalOpen(false), isWaitingForPayMongo)}>
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 max-h-[94vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">Subscribe to unlock your fleet</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Free includes every module — 1 truck, 1 account, and 10 transactions. Founding is {formatPhp(price.basePhp)}/month for up to {price.includedTrucks} trucks, then {formatPhp(price.perExtraTruckPhp)} per extra truck.
            </p>
            {activePlan.id === PLAN_PROMO_ID && (
              <div className="mt-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2">
                <span className="text-[11px] font-extrabold text-violet-950">Promo access — no charge</span>
                <p className="text-[10px] text-violet-800 mt-0.5">
                  Complimentary until {formatPhDate(subscription.current_period_end)}. {paidTrucks} truck slot{paidTrucks === 1 ? '' : 's'}. After that this workspace returns to Free unless you subscribe.
                </p>
              </div>
            )}
            {activePlan.id !== PLAN_FOUNDING_ID && activePlan.id !== PLAN_PROMO_ID && (
              <div className="mt-2 inline-flex flex-col gap-0.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                <span className="text-[11px] font-extrabold text-amber-950">{foundingLockHeadline()}</span>
                <span className="text-[10px] text-amber-800">{foundingLockBody()}</span>
              </div>
            )}
            {overPaidFleet && (
              <p className="text-[11px] font-semibold text-amber-800 mt-1.5">
                This fleet has {usedTrucks} trucks but you paid for {paidTrucks}. Pay for {desiredTrucks} trucks before adding more.
              </p>
            )}
            {activePlan.id === PLAN_FOUNDING_ID && !overPaidFleet && usedTrucks >= paidTrucks && (
              <p className="text-[11px] font-semibold text-amber-800 mt-1.5">
                You paid for {paidTrucks} truck{paidTrucks === 1 ? '' : 's'}. Use + below to add another for {formatPhp(price.perExtraTruckPhp)}/month each.
              </p>
            )}
            {isWaitingForPayMongo && (
              <p className="text-[11px] font-semibold text-blue-700 mt-1.5">
                Waiting for PayMongo to confirm payment. This workspace will switch to Founding on its own.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsUpgradeModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {SAAS_PLANS.map((plan) => {
            const isCurrent = activePlan.id === plan.id;
            const isPaid = plan.id === PLAN_FOUNDING_ID;
            return (
              <div
                key={plan.id}
                className={`rounded-2xl border p-5 flex flex-col ${
                  plan.isRecommended ? 'border-blue-500 ring-2 ring-blue-500/15 bg-blue-50/40' : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    {plan.badge}
                  </span>
                  {isCurrent && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      Current plan
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 mt-3">{plan.name}</h3>
                {isPaid ? (
                  <>
                    <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-white border border-slate-200 p-1">
                      <button
                        type="button"
                        onClick={() => setBillingCycle('monthly')}
                        className={`py-1.5 rounded-lg text-[11px] font-bold ${
                          billingCycle === 'monthly' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Monthly
                      </button>
                      <button
                        type="button"
                        onClick={() => setBillingCycle('annual')}
                        className={`py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 ${
                          billingCycle === 'annual' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Annual
                        <span className={`text-[9px] px-1 py-0.5 rounded-full ${
                          billingCycle === 'annual' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          Save {price.annualDiscountPercent}%
                        </span>
                      </button>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Trucks on this plan</div>
                        <div className="text-[11px] text-slate-500">
                          {formatPhp(price.basePhp)} covers {price.includedTrucks}. Extra trucks are {formatPhp(price.perExtraTruckPhp)}/mo each.
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={desiredTrucks <= minTrucks}
                          onClick={() => setDesiredTrucks((n) => Math.max(minTrucks, n - 1))}
                          className="w-7 h-7 rounded-lg border border-slate-200 text-slate-700 font-bold disabled:opacity-40"
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-sm font-black text-slate-900">{desiredTrucks}</span>
                        <button
                          type="button"
                          disabled={desiredTrucks >= MAX_BILLABLE_TRUCKS}
                          onClick={() => setDesiredTrucks((n) => Math.min(MAX_BILLABLE_TRUCKS, n + 1))}
                          className="w-7 h-7 rounded-lg border border-slate-200 text-slate-700 font-bold disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="mt-3">
                      {billingCycle === 'annual' ? (
                        <>
                          <div className="flex items-end gap-1">
                            <span className="text-2xl font-black text-slate-900">{formatPhp(price.annualTotal)}</span>
                            <span className="text-xs text-slate-500 mb-1">/year</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {formatPhp(price.monthlyEquivalent)}/month equivalent for {truckCount} truck{truckCount === 1 ? '' : 's'}
                          </p>
                          <p className="text-[11px] font-semibold text-amber-800 mt-0.5">
                            Founding lock {formatPhp(price.basePhp)}
                            <span className="ml-1.5 font-medium text-slate-400 line-through">{formatPhp(FOUNDING_LIST_PHP)}</span>
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="flex items-end gap-2">
                            <span className="text-2xl font-black text-slate-900">{formatPhp(price.monthlyTotal)}</span>
                            <span className="text-xs text-slate-500 mb-1">/month</span>
                          </div>
                          <p className="text-[11px] font-semibold text-amber-800 mt-0.5">
                            Founding lock {formatPhp(price.basePhp)}
                            <span className="ml-1.5 font-medium text-slate-400 line-through">{formatPhp(FOUNDING_LIST_PHP)}</span>
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {formatPhp(price.basePhp)}/month base (up to {price.includedTrucks} trucks) + {formatPhp(price.perExtraTruckPhp)} per additional truck
                          </p>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="mt-1 flex items-end gap-1">
                    <span className="text-2xl font-black text-slate-900">₱0</span>
                    <span className="text-xs text-slate-500 mb-1">/{plan.interval}</span>
                  </div>
                )}
                <p className="text-xs text-slate-500 mt-2 min-h-[40px]">{plan.description}</p>
                <ul className="mt-4 space-y-2 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-xs text-slate-700">
                      <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                {isPaid ? (
                  <div className="mt-5 space-y-2">
                    {isCurrent && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-900">
                        <div className="font-bold">
                          {subscription.cancel_at_period_end ? 'Ends' : 'Renews'} {formatPhDate(subscription.current_period_end)}
                          {' — '}
                          {formatPhp(price.monthlyTotal)}/month for {truckCount} truck{truckCount === 1 ? '' : 's'}
                        </div>
                        <div className="mt-0.5 text-emerald-800">
                          {subscriptionUsage.daysRemainingInPeriod} day{subscriptionUsage.daysRemainingInPeriod === 1 ? '' : 's'} left in this period.
                          {subscription.cancel_at_period_end
                            ? ' Auto-renew is off. You stay Founding until that date, then return to Free.'
                            : ` Pay ${formatPhp(price.chargePhp)} again before that date to keep Founding. Extra trucks above ${price.includedTrucks} are ${formatPhp(price.perExtraTruckPhp)}/month each.`}
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      disabled={waiting}
                      onClick={handleSubscribe}
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {isWaitingForPayMongo
                        ? 'Waiting for PayMongo…'
                        : isSubmitting
                          ? 'Opening checkout…'
                          : isCurrent
                            ? `Pay ${formatPhp(price.chargePhp)} to renew ${billingCycle === 'annual' ? 'this year' : 'this month'}`
                            : `Pay ${formatPhp(price.chargePhp)}${billingCycle === 'annual' ? '/year' : '/mo'} with PayMongo`}
                      {!waiting && <Zap className="w-3.5 h-3.5" />}
                    </button>
                    {isCurrent && (
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={async () => {
                          if (subscription.cancel_at_period_end) {
                            resumeSubscription();
                            return;
                          }
                          if (!window.confirm('Turn off auto-renew? You keep Founding until the current period ends, then this workspace returns to Free.')) return;
                          await cancelSubscriptionAtPeriodEnd();
                        }}
                        className="w-full py-2 rounded-xl border border-slate-200 text-slate-600 text-[11px] font-bold hover:bg-slate-50"
                      >
                        {subscription.cancel_at_period_end ? 'Turn auto-renew back on' : 'Turn off auto-renew'}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="mt-5 w-full py-2.5 rounded-xl bg-slate-100 text-slate-500 text-xs font-bold text-center">
                    Included at signup
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {(activePlan.id === PLAN_FOUNDING_ID || activePlan.id === PLAN_PROMO_ID) && (
          <div className="px-6 pb-4">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={async () => {
                if (!window.confirm('Reset this workspace to the Free plan? Caps will apply again: 1 truck, 1 account, 10 trips.')) return;
                setIsSubmitting(true);
                setError(null);
                try {
                  await resetCurrentPlanToFree();
                  setIsUpgradeModalOpen(false);
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Could not reset to Free.');
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="w-full py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 disabled:opacity-60"
            >
              Reset this account to Free
            </button>
          </div>
        )}

        <div className="px-6 pb-5 grid grid-cols-3 gap-3 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5" />
            <span>{subscriptionUsage.trucksUsed}/{subscriptionUsage.maxTrucks ?? 1} paid truck slots</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>{subscriptionUsage.accountsUsed}/{subscriptionUsage.maxAccounts ?? '∞'} accounts</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            <span>{subscriptionUsage.transactionsUsed}/{subscriptionUsage.maxTransactions ?? '∞'} trips</span>
          </div>
        </div>
        {error && <p className="px-6 pb-5 text-xs text-rose-600">{error}</p>}
      </div>
    </div>
  );
};
