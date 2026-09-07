import React, { useEffect, useMemo, useState } from 'react';
import { Activity, ChevronDown, ChevronRight, Loader2, RefreshCw, Search } from 'lucide-react';
import { PLAN_FOUNDING_ID, PLAN_PROMO_ID } from '../../config/plans';
import { listPlatformCompanyUsage, type CompanyUsageRow } from '../../services/firestoreCompany';

type UsageFilter = 'all' | 'active' | 'quiet' | 'inactive' | 'creating' | 'no-trips';

function daysAgo(iso?: string) {
  if (!iso) return null;
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return null;
  return Math.floor((Date.now() - time) / 86400000);
}

function formatWhen(iso?: string) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
}

function relativeDays(iso?: string) {
  const days = daysAgo(iso);
  if (days === null) return '';
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

function usingState(row: CompanyUsageRow) {
  const days = daysAgo(row.lastSeenAt || row.lastLoginAt);
  if (days === null) {
    return { label: 'No login yet', tone: 'slate', key: 'inactive' as const };
  }
  if (days <= 7) return { label: 'Using the app', tone: 'emerald', key: 'active' as const };
  if (days <= 30) return { label: 'Quiet', tone: 'amber', key: 'quiet' as const };
  return { label: 'Inactive', tone: 'rose', key: 'inactive' as const };
}

function tripState(row: CompanyUsageRow) {
  if (row.tripCount <= 0) {
    return { label: 'No trips yet', tone: 'slate', creating: false };
  }
  const days = daysAgo(row.lastTripAt);
  if (days !== null && days <= 7) {
    return { label: 'Creating trips', tone: 'emerald', creating: true };
  }
  if (days !== null && days <= 30) {
    return { label: 'Trips this month', tone: 'amber', creating: true };
  }
  return { label: `${row.tripCount} trip${row.tripCount === 1 ? '' : 's'} on file`, tone: 'slate', creating: false };
}

function planLabel(planId?: string) {
  if (planId === PLAN_FOUNDING_ID) return 'Founding';
  if (planId === PLAN_PROMO_ID) return 'Promo';
  return 'Free';
}

const TONE: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-800 border-amber-200',
  rose: 'bg-rose-50 text-rose-700 border-rose-200',
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
};

export const AdminUsagePanel: React.FC = () => {
  const [rows, setRows] = useState<CompanyUsageRow[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<UsageFilter>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setRows(await listPlatformCompanyUsage());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load usage. Publish the latest firestore.rules if this is a permissions error.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      const using = usingState(row);
      const trips = tripState(row);
      if (filter === 'active' && using.key !== 'active') return false;
      if (filter === 'quiet' && using.key !== 'quiet') return false;
      if (filter === 'inactive' && using.key !== 'inactive') return false;
      if (filter === 'creating' && !trips.creating) return false;
      if (filter === 'no-trips' && row.tripCount > 0) return false;
      if (!q) return true;
      return [
        row.company.name,
        row.company.email,
        row.company.id,
        using.label,
        trips.label,
        ...row.members.map((member) => `${member.name} ${member.email}`),
      ]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [rows, query, filter]);

  const activeCount = rows.filter((row) => usingState(row).key === 'active').length;
  const quietCount = rows.filter((row) => usingState(row).key === 'quiet').length;
  const inactiveCount = rows.filter((row) => usingState(row).key === 'inactive').length;
  const creatingCount = rows.filter((row) => tripState(row).creating).length;
  const noTripCount = rows.filter((row) => row.tripCount <= 0).length;

  return (
    <div className="flex-1 overflow-auto p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-blue-700">
              <Activity className="w-4 h-4" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Platform admin</span>
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 mt-1">Company usage</h1>
            <p className="text-xs text-slate-500 mt-1">
              See which companies are opening CasinFreight, when someone last signed in, and whether they are creating trips. Last login starts recording after this update; older sessions show “No login yet” until they sign in again.
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

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <button type="button" onClick={() => setFilter('active')} className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-left">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Using the app</div>
            <div className="text-2xl font-black text-emerald-900 mt-1">{activeCount}</div>
            <div className="text-[10px] text-emerald-700 mt-0.5">Seen in the last 7 days</div>
          </button>
          <button type="button" onClick={() => setFilter('quiet')} className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-left">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Quiet</div>
            <div className="text-2xl font-black text-amber-900 mt-1">{quietCount}</div>
            <div className="text-[10px] text-amber-700 mt-0.5">Last seen 8–30 days ago</div>
          </button>
          <button type="button" onClick={() => setFilter('inactive')} className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-left">
            <div className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Inactive</div>
            <div className="text-2xl font-black text-rose-900 mt-1">{inactiveCount}</div>
            <div className="text-[10px] text-rose-700 mt-0.5">No login, or older than 30 days</div>
          </button>
          <button type="button" onClick={() => setFilter('creating')} className="rounded-xl border border-slate-200 bg-white p-4 text-left">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Creating trips</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{creatingCount}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Trip in the last 30 days</div>
          </button>
          <button type="button" onClick={() => setFilter('no-trips')} className="rounded-xl border border-slate-200 bg-white p-4 text-left">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">No trips yet</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{noTripCount}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Signed up, no bookings</div>
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5">
            {([
              ['all', 'All'],
              ['active', 'Using the app'],
              ['quiet', 'Quiet'],
              ['inactive', 'Inactive'],
              ['creating', 'Creating trips'],
              ['no-trips', 'No trips yet'],
            ] as [UsageFilter, string][]).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                  filter === id
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search company, email, or teammate"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:border-blue-500"
            />
          </div>
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
                  <th className="px-4 py-3 font-bold">Using app</th>
                  <th className="px-4 py-3 font-bold">Last login</th>
                  <th className="px-4 py-3 font-bold">Transactions</th>
                  <th className="px-4 py-3 font-bold">Last trip</th>
                  <th className="px-4 py-3 font-bold">People</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                      <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                      Loading usage…
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
                  const using = usingState(row);
                  const trips = tripState(row);
                  const open = openId === row.company.id;
                  return (
                    <React.Fragment key={row.company.id}>
                      <tr className="border-t border-slate-100">
                        <td className="px-4 py-3 align-top">
                          <button
                            type="button"
                            onClick={() => setOpenId(open ? null : row.company.id)}
                            className="flex items-start gap-2 text-left"
                          >
                            {open ? <ChevronDown className="w-4 h-4 text-slate-400 mt-0.5" /> : <ChevronRight className="w-4 h-4 text-slate-400 mt-0.5" />}
                            <span>
                              <span className="block font-semibold text-slate-900">{row.company.name || 'Untitled company'}</span>
                              <span className="block text-[11px] text-slate-500">{row.company.email || 'No email'}</span>
                              <span className="inline-flex mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded border bg-slate-50 text-slate-600 border-slate-200">
                                {planLabel(row.company.subscription?.plan_id)}
                              </span>
                            </span>
                          </button>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span className={`inline-flex text-[11px] font-bold px-2 py-0.5 rounded-full border ${TONE[using.tone]}`}>
                            {using.label}
                          </span>
                          {row.lastSeenAt && (
                            <div className="text-[10px] text-slate-400 mt-1">Seen {relativeDays(row.lastSeenAt)}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top text-xs text-slate-600">
                          <div className="font-semibold text-slate-800">{formatWhen(row.lastLoginAt)}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{relativeDays(row.lastLoginAt)}</div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span className={`inline-flex text-[11px] font-bold px-2 py-0.5 rounded-full border ${TONE[trips.tone]}`}>
                            {trips.label}
                          </span>
                          <div className="text-[10px] text-slate-500 mt-1">
                            {row.tripCount} trip{row.tripCount === 1 ? '' : 's'} · {row.invoiceCount} freight bill{row.invoiceCount === 1 ? '' : 's'}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top text-xs text-slate-600">
                          <div className="font-semibold text-slate-800">{formatWhen(row.lastTripAt)}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{relativeDays(row.lastTripAt)}</div>
                        </td>
                        <td className="px-4 py-3 align-top text-xs text-slate-600">
                          {row.members.length} account{row.members.length === 1 ? '' : 's'}
                        </td>
                      </tr>
                      {open && (
                        <tr className="bg-slate-50/80">
                          <td colSpan={6} className="px-4 py-3">
                            {row.members.length === 0 ? (
                              <p className="text-xs text-slate-500">No logins are tied to this company.</p>
                            ) : (
                              <ul className="space-y-2">
                                {row.members.map((member) => (
                                  <li key={member.id} className="flex flex-wrap items-center justify-between gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
                                    <div>
                                      <div className="text-xs font-bold text-slate-900">{member.name}</div>
                                      <div className="text-[11px] text-slate-500">{member.email} · {member.role || 'No role'}</div>
                                    </div>
                                    <div className="text-right text-[11px] text-slate-600">
                                      <div>Last login {formatWhen(member.lastLoginAt)}</div>
                                      <div className="text-slate-400">Last seen {formatWhen(member.lastSeenAt || member.lastLoginAt)}</div>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
