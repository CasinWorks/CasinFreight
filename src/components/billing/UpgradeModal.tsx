import React from 'react';
import { Check, Lock, Sparkles, Truck, Users, X, Zap } from 'lucide-react';
import { useFreight } from '../../context/FreightContext';
import { SAAS_PLANS } from '../../config/plans';

export const UpgradeModal: React.FC = () => {
  const {
    isUpgradeModalOpen,
    setIsUpgradeModalOpen,
    subscribeToFoundingPlan,
    subscriptionUsage,
    activePlan,
  } = useFreight();

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!isUpgradeModalOpen) return null;

  const handleSubscribe = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await subscribeToFoundingPlan();
      setIsUpgradeModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not activate Founding plan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">Subscribe to unlock your fleet</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Free includes every module — 1 truck, 1 account, and 10 transactions. Subscribe to add team, trucks, and volume.
            </p>
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
            const isPaid = plan.price_php > 0;
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
                <div className="mt-1 flex items-end gap-1">
                  <span className="text-2xl font-black text-slate-900">
                    {plan.price_php === 0 ? '₱0' : `₱${plan.price_php.toLocaleString()}`}
                  </span>
                  <span className="text-xs text-slate-500 mb-1">/{plan.interval}</span>
                </div>
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
                  <button
                    type="button"
                    disabled={isSubmitting || isCurrent}
                    onClick={handleSubscribe}
                    className="mt-5 w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? 'Activating…' : isCurrent ? 'Already subscribed' : 'Subscribe — ₱499/mo'}
                    {!isCurrent && <Zap className="w-3.5 h-3.5" />}
                  </button>
                ) : (
                  <div className="mt-5 w-full py-2.5 rounded-xl bg-slate-100 text-slate-500 text-xs font-bold text-center">
                    Included at signup
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="px-6 pb-5 grid grid-cols-3 gap-3 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5" />
            <span>{subscriptionUsage.trucksUsed}/{subscriptionUsage.maxTrucks ?? '∞'} trucks</span>
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
