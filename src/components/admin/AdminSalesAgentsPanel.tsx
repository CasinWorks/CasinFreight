import React, { useEffect, useState } from 'react';
import { Banknote, Loader2, Plus, RefreshCw, UserPlus, Wallet } from 'lucide-react';
import { formatPhp } from '../../config/plans';
import {
  PERPETUAL_LICENSE_PHP,
  PERPETUAL_SUPPORT_PHP,
  SAAS_COMMISSION_FIRST_RATE,
  SAAS_COMMISSION_MONTHS,
  SAAS_COMMISSION_RENEWAL_RATE,
} from '../../lib/subscriptionPrice';
import type { CompanyDocument } from '../../services/firestoreCompany';
import { listCompanyDocuments } from '../../services/firestoreCompany';
import {
  backfillLatestSaasCommission,
  licenseCommissionEntry,
  listAgentCommissions,
  listAgentPayouts,
  listSalesAgents,
  newSalesAgentId,
  saveCommission,
  savePayout,
  saveSalesAgent,
  setCompanySalesAgent,
  summarizeLedger,
} from '../../services/firestoreSales';
import type { AgentCommissionEntry, AgentPayout, SalesAgent } from '../../types';

function pesos(value: number) {
  return formatPhp(Math.round(value));
}

function kindLabel(kind: AgentCommissionEntry['kind']) {
  if (kind === 'perpetual') return 'Dedicated license';
  if (kind === 'support') return 'Yearly support';
  return 'SaaS';
}

const EMPTY_AGENT = {
  name: '',
  email: '',
  phone: '',
  notes: '',
  status: 'active' as SalesAgent['status'],
};

export const AdminSalesAgentsPanel: React.FC = () => {
  const [agents, setAgents] = useState<SalesAgent[]>([]);
  const [companies, setCompanies] = useState<CompanyDocument[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [commissions, setCommissions] = useState<AgentCommissionEntry[]>([]);
  const [payouts, setPayouts] = useState<AgentPayout[]>([]);
  const [form, setForm] = useState(EMPTY_AGENT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('GCash');
  const [payoutRef, setPayoutRef] = useState('');
  const [assignCompanyId, setAssignCompanyId] = useState('');
  const [licenseCompanyId, setLicenseCompanyId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = agents.find((agent) => agent.id === selectedId) || null;
  const ledger = summarizeLedger(commissions, payouts);

  const loadAgents = async () => {
    const next = await listSalesAgents();
    setAgents(next);
    setSelectedId((current) => current || next[0]?.id || null);
    return next;
  };

  const loadCompanies = async () => {
    setCompanies(await listCompanyDocuments());
  };

  const loadLedger = async (agentId: string) => {
    const [nextCommissions, nextPayouts] = await Promise.all([
      listAgentCommissions(agentId),
      listAgentPayouts(agentId),
    ]);
    setCommissions(nextCommissions);
    setPayouts(nextPayouts);
  };

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const nextAgents = await loadAgents();
      await loadCompanies();
      const agentId = selectedId || nextAgents[0]?.id;
      if (agentId) await loadLedger(agentId);
      else {
        setCommissions([]);
        setPayouts([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load agents. Publish the latest firestore.rules if this is a permissions error.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    void loadLedger(selectedId).catch((err) => {
      setError(err instanceof Error ? err.message : 'Could not load this agent’s ledger.');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const assigned = companies.filter((row) => row.salesAgentId === selectedId);
  const unassigned = companies.filter((row) => !row.salesAgentId);

  const saveAgent = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setError('Agent name and email are required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const id = editingId || newSalesAgentId();
      const existing = agents.find((agent) => agent.id === id);
      await saveSalesAgent({
        id,
        name: form.name,
        email: form.email,
        phone: form.phone,
        notes: form.notes,
        status: form.status,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      });
      setForm(EMPTY_AGENT);
      setEditingId(null);
      await loadAgents();
      setSelectedId(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the agent.');
    } finally {
      setBusy(false);
    }
  };

  const assign = async () => {
    if (!selectedId || !assignCompanyId) return;
    setBusy(true);
    setError(null);
    try {
      await setCompanySalesAgent(assignCompanyId, selectedId);
      const company = companies.find((row) => row.id === assignCompanyId);
      if (company) {
        await backfillLatestSaasCommission({ ...company, salesAgentId: selectedId });
      }
      setAssignCompanyId('');
      await loadCompanies();
      await loadLedger(selectedId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not assign this company.');
    } finally {
      setBusy(false);
    }
  };

  const unassign = async (companyId: string) => {
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    try {
      await setCompanySalesAgent(companyId, null);
      await loadCompanies();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove this company.');
    } finally {
      setBusy(false);
    }
  };

  const recordLicense = async (kind: 'perpetual' | 'support') => {
    if (!selectedId || !licenseCompanyId) return;
    const company = companies.find((row) => row.id === licenseCompanyId);
    if (!company) return;
    const billed = kind === 'perpetual' ? PERPETUAL_LICENSE_PHP : PERPETUAL_SUPPORT_PHP;
    const label = kind === 'perpetual' ? `₱${PERPETUAL_LICENSE_PHP.toLocaleString('en-PH')} dedicated license` : `₱${PERPETUAL_SUPPORT_PHP.toLocaleString('en-PH')} yearly support`;
    if (!window.confirm(`Credit 10% of ${label} to ${selected?.name}?`)) return;
    setBusy(true);
    setError(null);
    try {
      await saveCommission(licenseCommissionEntry({ agentId: selectedId, company, kind, billedPhp: billed }));
      setLicenseCompanyId('');
      await loadLedger(selectedId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record this sale.');
    } finally {
      setBusy(false);
    }
  };

  const recordPayout = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedId) return;
    const amountPhp = Math.round(Number(payoutAmount) || 0);
    if (amountPhp <= 0) {
      setError('Enter a payout amount.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      await savePayout({
        id: `payout-${Date.now().toString(36)}`,
        agentId: selectedId,
        amountPhp,
        paidAt: now,
        method: payoutMethod.trim() || undefined,
        reference: payoutRef.trim() || undefined,
        createdAt: now,
      });
      setPayoutAmount('');
      setPayoutRef('');
      await loadLedger(selectedId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record the payout.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex-1 overflow-auto p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-emerald-700">
              <UserPlus className="w-4 h-4" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Platform admin</span>
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 mt-1">Sales agents</h1>
            <p className="text-xs text-slate-500 mt-1">
              SaaS: {Math.round(SAAS_COMMISSION_FIRST_RATE * 100)}% on the first PayMongo payment, {Math.round(SAAS_COMMISSION_RENEWAL_RATE * 100)}% on payments 2–{SAAS_COMMISSION_MONTHS}, then 0%. Dedicated license and yearly support are 10%, recorded here when the deal closes. Free and promo grants do not pay commission.
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

        {error && <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs p-3">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <form onSubmit={(event) => void saveAgent(event)} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {editingId ? 'Edit agent' : 'Add agent'}
              </div>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setForm(EMPTY_AGENT);
                  }}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-800"
                >
                  New
                </button>
              )}
            </div>
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Full name"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="Email"
              type="email"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="Phone (optional)"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <textarea
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Notes"
              rows={2}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <select
              value={form.status}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as SalesAgent['status'] }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button
              type="submit"
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold disabled:opacity-60"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              {editingId ? 'Save agent' : 'Add agent'}
            </button>
          </form>

          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Agents
            </div>
            {isLoading ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                Loading agents…
              </div>
            ) : agents.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">Add the first sales agent to start tracking commission.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {agents.map((agent) => {
                  const count = companies.filter((row) => row.salesAgentId === agent.id).length;
                  return (
                    <button
                      key={agent.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(agent.id);
                        setEditingId(agent.id);
                        setForm({
                          name: agent.name,
                          email: agent.email,
                          phone: agent.phone || '',
                          notes: agent.notes || '',
                          status: agent.status,
                        });
                      }}
                      className={`w-full text-left px-4 py-3 hover:bg-slate-50 ${selectedId === agent.id ? 'bg-emerald-50' : ''}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold text-slate-900">{agent.name}</div>
                          <div className="text-[11px] text-slate-500">{agent.email} · {count} compan{count === 1 ? 'y' : 'ies'}</div>
                        </div>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                          agent.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                          {agent.status}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Earned</div>
                <div className="text-2xl font-black text-slate-900 mt-1">{pesos(ledger.earnedPhp)}</div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                  <Wallet className="w-3.5 h-3.5" /> Paid out
                </div>
                <div className="text-2xl font-black text-emerald-800 mt-1">{pesos(ledger.paidPhp)}</div>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-700">
                  <Banknote className="w-3.5 h-3.5" /> Outstanding
                </div>
                <div className="text-2xl font-black text-amber-800 mt-1">{pesos(ledger.outstandingPhp)}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Assigned companies</div>
                <div className="text-2xl font-black text-slate-900 mt-1">{assigned.length}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Assign a company</div>
                <p className="text-[11px] text-slate-500">
                  Future PayMongo Founding payments accrue here. If they already paid, the latest payment is credited once.
                </p>
                <div className="flex gap-2">
                  <select
                    value={assignCompanyId}
                    onChange={(e) => setAssignCompanyId(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="">Unassigned company…</option>
                    {unassigned.map((row) => (
                      <option key={row.id} value={row.id}>{row.name || row.email || row.id}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={busy || !assignCompanyId}
                    onClick={() => void assign()}
                    className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold disabled:opacity-60"
                  >
                    Assign
                  </button>
                </div>
                {assigned.length > 0 && (
                  <ul className="space-y-2">
                    {assigned.map((row) => (
                      <li key={row.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-slate-800">{row.name || row.email}</span>
                        <button type="button" onClick={() => void unassign(row.id)} className="text-[11px] font-bold text-slate-500 hover:text-rose-700">
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Dedicated instance / support</div>
                <p className="text-[11px] text-slate-500">
                  ₱{PERPETUAL_LICENSE_PHP.toLocaleString('en-PH')} license → ₱30,000 once. ₱{PERPETUAL_SUPPORT_PHP.toLocaleString('en-PH')}/year support → ₱5,400 if this agent sold it.
                </p>
                <select
                  value={licenseCompanyId}
                  onChange={(e) => setLicenseCompanyId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">Company…</option>
                  {companies.map((row) => (
                    <option key={row.id} value={row.id}>{row.name || row.email || row.id}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy || !licenseCompanyId}
                    onClick={() => void recordLicense('perpetual')}
                    className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 disabled:opacity-60"
                  >
                    Record ₱300k license
                  </button>
                  <button
                    type="button"
                    disabled={busy || !licenseCompanyId}
                    onClick={() => void recordLicense('support')}
                    className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 disabled:opacity-60"
                  >
                    Record ₱54k support
                  </button>
                </div>
              </div>
            </div>

            <form onSubmit={(event) => void recordPayout(event)} className="rounded-2xl border border-slate-200 bg-white p-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Payout amount
                <input
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  type="number"
                  min={1}
                  placeholder={String(Math.max(0, Math.round(ledger.outstandingPhp)))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900"
                />
              </label>
              <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Method
                <input
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900"
                />
              </label>
              <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Reference
                <input
                  value={payoutRef}
                  onChange={(e) => setPayoutRef(e.target.value)}
                  placeholder="GCash / bank ref"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900"
                />
              </label>
              <button
                type="submit"
                disabled={busy}
                className="py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold disabled:opacity-60"
              >
                Record payout
              </button>
            </form>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">Commission earned</div>
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-2 font-bold">Company</th>
                      <th className="px-4 py-2 font-bold">Type</th>
                      <th className="px-4 py-2 font-bold text-right">Commission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissions.length === 0 && (
                      <tr><td colSpan={3} className="px-4 py-8 text-center text-xs text-slate-500">No commission yet.</td></tr>
                    )}
                    {commissions.map((row) => (
                      <tr key={row.id} className="border-t border-slate-100">
                        <td className="px-4 py-2">
                          <div className="font-medium text-slate-800">{row.companyName}</div>
                          <div className="text-[10px] text-slate-400">
                            {row.kind === 'saas' ? `Payment ${row.paymentNumber || 1} · ${Math.round(row.rate * 100)}% of ${pesos(row.billedPhp)}` : `${Math.round(row.rate * 100)}% of ${pesos(row.billedPhp)}`}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-xs text-slate-600">{kindLabel(row.kind)}</td>
                        <td className="px-4 py-2 text-right font-semibold text-slate-900">{pesos(row.commissionPhp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">Payouts</div>
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-2 font-bold">Date</th>
                      <th className="px-4 py-2 font-bold">Method</th>
                      <th className="px-4 py-2 font-bold text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.length === 0 && (
                      <tr><td colSpan={3} className="px-4 py-8 text-center text-xs text-slate-500">No payouts yet.</td></tr>
                    )}
                    {payouts.map((row) => (
                      <tr key={row.id} className="border-t border-slate-100">
                        <td className="px-4 py-2 text-xs text-slate-600">{new Date(row.paidAt).toLocaleString('en-PH')}</td>
                        <td className="px-4 py-2 text-xs text-slate-600">{row.method || '—'}{row.reference ? ` · ${row.reference}` : ''}</td>
                        <td className="px-4 py-2 text-right font-semibold text-slate-900">{pesos(row.amountPhp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
