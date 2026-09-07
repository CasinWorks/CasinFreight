import React, { useState } from 'react';
import { Bell, Activity, Shield, UserPlus } from 'lucide-react';
import { useFreight } from '../../context/FreightContext';
import { AdminSubscriptionsView } from './AdminSubscriptionsView';
import { AdminNoticesPanel } from './AdminNoticesPanel';
import { AdminSalesAgentsPanel } from './AdminSalesAgentsPanel';
import { AdminUsagePanel } from './AdminUsagePanel';

export const AdminConsoleView: React.FC = () => {
  const { isPlatformAdmin } = useFreight();
  const [tab, setTab] = useState<'plans' | 'notices' | 'agents' | 'usage'>(isPlatformAdmin ? 'notices' : 'plans');

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {isPlatformAdmin && (
        <div className="px-4 md:px-6 pt-4">
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setTab('notices')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
                tab === 'notices' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              Notices
            </button>
            <button
              type="button"
              onClick={() => setTab('plans')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
                tab === 'plans' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Revenue & plans
            </button>
            <button
              type="button"
              onClick={() => setTab('usage')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
                tab === 'usage' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Usage
            </button>
            <button
              type="button"
              onClick={() => setTab('agents')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
                tab === 'agents' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Agents
            </button>
          </div>
        </div>
      )}
      {tab === 'notices' && isPlatformAdmin
        ? <AdminNoticesPanel />
        : tab === 'agents' && isPlatformAdmin
          ? <AdminSalesAgentsPanel />
          : tab === 'usage' && isPlatformAdmin
            ? <AdminUsagePanel />
            : <AdminSubscriptionsView />}
    </div>
  );
};
