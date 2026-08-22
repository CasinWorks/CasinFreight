import React, { useEffect, useMemo, useState } from 'react';
import { Banknote, Crown, Loader2, RefreshCw, RotateCcw, Search, Shield, Wallet } from 'lucide-react';
import { useFreight } from '../../context/FreightContext';
import { FOUNDING_PRICE_PHP, PLAN_FOUNDING_ID, PLAN_FREE_ID, formatPhDate, formatPhp } from '../../config/plans';
import type { CompanyDocument } from '../../services/firestoreCompany';

function planLabel(planId?: string) {
  if (planId === PLAN_FOUNDING_ID) return 'Founding';
  return 'Free';
}

function pesos(value: number) {
  return `₱${Math.round(value).toLocaleString('en-PH')}`;
}

function daysLeft(iso?: string) {
  if (!iso) return null;
  const end = Date.parse(iso);
  if (!Number.isFinite(end)) return null;
  return Math.ceil((end - Date.now()) / 86400000);
}

export const AdminSubscriptionsView: React.FC = () => {
  const { company, invoices, trips, listPlatformSubscriptions, setCompanyPlanByAdmin, isPlatformAdmin } = useFreight();
  const [rows, setRows] = useState<CompanyDocument[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const next = await listPlatformSubscriptions();
      setRows(next.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load subscriptions. Publish the latest firestore.rules if this is a permissions error.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // Load once when the admin screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [row.name, row.email, row.id, row.subscription?.plan_id, row.subscription?.status]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [query, rows]);

  const foundingRows = rows.filter((row) => row.subscription?.plan_id === PLAN_FOUNDING_ID);
  const foundingCount = foundingRows.length;
  const mrr = foundingRows.reduce((sum, row) => {
    const billed = Number(row.subscription?.last_billed_amount_php || 0);
    if (billed > 0) {
      return sum + (row.subscription?.billing_cycle === 'annual' ? billed / 12 : billed);
    }
    return sum + FOUNDING_PRICE_PHP;
  }, 0);
  const expiringSoon = foundingRows.filter((row) => {
    const left = daysLeft(row.subscription?.current_period_end);
    return left !== null && left >= 0 && left <= 7;
  }).length;

  const billed = invoices.reduce((sum, invoice) => sum + (invoice.grandTotalPhp || 0), 0);
  const collected = invoices.filter((invoice) => invoice.status === 'Paid').reduce((sum, invoice) => sum + (invoice.grandTotalPhp || 0), 0);
  const receivables = invoices.filter((invoice) => invoice.status !== 'Paid' && invoice.status !== 'Voided').reduce((sum, invoice) => sum + (invoice.grandTotalPhp || 0), 0);
  const tripPipeline = trips.reduce((sum, trip) => {
    const accessorials = trip.accessorials?.reduce((acc, item) => acc + (item.amountPhp || 0), 0) || 0;
    return sum + (trip.baseRatePhp || 0) + accessorials;
  }, 0);

  const changePlan = async (row: CompanyDocument, planId: string) => {
    const nextLabel = planLabel(planId);
    if (!window.confirm(`Set ${row.name || row.email} to ${nextLabel}?`)) return;
    setBusyId(row.id);
    setError(null);
    try {
      await setCompanyPlanByAdmin(row.id, planId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the plan.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex-1 overflow-auto p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-blue-700">
              <Shield className="w-4 h-4" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Platform admin</span>
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 mt-1">Revenue & plans</h1>
            <p className="text-xs text-slate-500 mt-1">
              Founding is {formatPhp(FOUNDING_PRICE_PHP)}/month for up to 2 trucks, then ₱150 per extra truck. Annual billing is 15% off. PayMongo charges each checkout; membership lasts until the renewal date.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">CasinFreight SaaS</div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Companies</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{rows.length}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Founding</div>
              <div className="text-2xl font-black text-blue-700 mt-1">{foundingCount}</div>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Monthly SaaS revenue</div>
              <div className="text-2xl font-black text-blue-800 mt-1">{pesos(mrr)}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Annual run rate</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{pesos(mrr * 12)}</div>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Renews in 7 days</div>
              <div className="text-2xl font-black text-amber-800 mt-1">{expiringSoon}</div>
            </div>
          </div>
        </div>

        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            {company.name || 'This workspace'} · freight cash
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <Banknote className="w-3.5 h-3.5" /> Billed
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1">{pesos(billed)}</div>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                <Wallet className="w-3.5 h-3.5" /> Collected
              </div>
              <div className="text-2xl font-black text-emerald-800 mt-1">{pesos(collected)}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Receivables</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{pesos(receivables)}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Trip pipeline</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{pesos(tripPipeline)}</div>
            </div>
          </div>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search company, email, or plan"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:border-blue-500"
          />
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs p-3">{error}</div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-bold">Company</th>
                  <th className="px-4 py-3 font-bold">Plan</th>
                  <th className="px-4 py-3 font-bold">Renews / ends</th>
                  <th className="px-4 py-3 font-bold">Auto-renew</th>
                  <th className="px-4 py-3 font-bold">Payment</th>
                  <th className="px-4 py-3 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                      <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                      Loading subscriptions…
                    </td>
                  </tr>
                )}
                {!isLoading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-500 text-xs">
                      No companies match this search.
                    </td>
                  </tr>
                )}
                {!isLoading && filtered.map((row) => {
                  const isFounding = row.subscription?.plan_id === PLAN_FOUNDING_ID;
                  const isCurrent = row.id === company.id;
                  const left = daysLeft(row.subscription?.current_period_end);
                  const autoRenew = isFounding && row.subscription?.auto_renew !== false && !row.subscription?.cancel_at_period_end;
                  return (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 align-top">
                        <div className="font-semibold text-slate-900">{row.name || 'Untitled company'}</div>
                        <div className="text-[11px] text-slate-500">{row.email || 'No email'}</div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">{row.id}</div>
                        {isCurrent && (
                          <span className="inline-flex mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                            Your workspace
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                          isFounding
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {isFounding && <Crown className="w-3 h-3" />}
                          {planLabel(row.subscription?.plan_id)}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-slate-600">
                        {isFounding ? (
                          <>
                            <div>{formatPhDate(row.subscription?.current_period_end)}</div>
                            <div className="text-[10px] text-slate-400">
                              {left === null ? '' : left < 0 ? 'Expired' : `${left} day${left === 1 ? '' : 's'} left`}
                            </div>
                          </>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-slate-600">
                        {isFounding ? (autoRenew ? 'On' : 'Off') : '—'}
                      </td>
                      <td className="px-4 py-3 align-top text-[11px] font-mono text-slate-500">
                        {row.subscription?.last_payment_method || row.subscription?.payment_provider_checkout_id || '—'}
                      </td>
                      <td className="px-4 py-3 align-top text-right">
                        <div className="inline-flex flex-col sm:flex-row gap-2 justify-end">
                          {isFounding ? (
                            <button
                              type="button"
                              disabled={busyId === row.id}
                              onClick={() => void changePlan(row, PLAN_FREE_ID)}
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-bold disabled:opacity-60"
                            >
                              {busyId === row.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                              Set to Free
                            </button>
                          ) : isPlatformAdmin ? (
                            <button
                              type="button"
                              disabled={busyId === row.id}
                              onClick={() => void changePlan(row, PLAN_FOUNDING_ID)}
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 text-[11px] font-bold disabled:opacity-60"
                            >
                              {busyId === row.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Crown className="w-3 h-3" />}
                              Set to Founding
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
