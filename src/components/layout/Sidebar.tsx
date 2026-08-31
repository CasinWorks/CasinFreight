import React, { useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Ban,
  LayoutDashboard,
  KanbanSquare,
  Calculator,
  Receipt,
  Truck,
  Users,
  Tag,
  Building2,
  Briefcase,
  AlertTriangle,
  FileCheck2,
  Lock,
  ChevronDown,
  X,
  BookOpen,
  ShieldCheck,
  Shield,
  Check,
  Settings,
  HardDrive,
  CircleHelp,
} from 'lucide-react';
import { useFreight } from '../../context/FreightContext';
import { bansInEffectNow } from '../../lib/truckBans';
import { CasinFreightLogo } from '../brand/CasinFreightLogo';
import { CasinWorksCredit } from '../brand/CasinWorksCredit';
import { WorkspaceBackupModal } from '../onboarding/WorkspaceBackupModal';

export type NavTab =
  | 'board'
  | 'exceptions'
  | 'calculator'
  | 'invoices'
  | 'ledger'
  | 'trucks'
  | 'drivers'
  | 'clients'
  | 'ratecards'
  | 'truckbans'
  | 'dashboard'
  | 'rbac'
  | 'orgsetup'
  | 'help'
  | 'admin';

type NavPermission =
  | 'pod_upload'
  | 'new_trip'
  | 'invoice_manage'
  | 'ledger_view'
  | 'truck_crud'
  | 'driver_crud'
  | 'ratecard_crud'
  | 'dashboard'
  | 'rbac'
  | 'settings';

interface NavItemDef {
  id: NavTab;
  label: string;
  icon: LucideIcon;
  permission: NavPermission;
  badge?: string;
  trailing?: React.ReactNode;
}

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  isMobileMenuOpen?: boolean;
  onCloseMobileMenu?: () => void;
}

const ACTION_BADGE = 'text-[10px] px-2 py-0.5 rounded font-mono font-medium bg-amber-50 text-amber-800 border border-amber-200';
const ICON_CLASS = 'w-4 h-4 shrink-0 stroke-[1.75]';

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isMobileMenuOpen = false,
  onCloseMobileMenu,
}) => {
  const {
    trips,
    invoices,
    canAccess,
    currentUser,
    canManageBilling,
    isPlatformAdmin,
    truckBans,
  } = useFreight();

  const [fleetOpen, setFleetOpen] = useState(true);
  const [teamOpen, setTeamOpen] = useState(true);
  const [businessOpen, setBusinessOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [opsOpen, setOpsOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);

  const holdCount = trips.filter((t) => t.status === 'On Hold').length;
  const cancelledCount = trips.filter((t) => t.status === 'Cancelled').length;
  const demurrageCount = trips.filter((t) => t.demurrageHours > 0 && t.status !== 'Cancelled').length;
  const overweightCount = trips.filter((t) => t.isOverweight).length;
  const liveBanCount = bansInEffectNow(truckBans).length;
  const pendingInvoicesCount = invoices.filter((i) => i.status === 'Draft' || i.status === 'Sent').length;

  const flagItems = [
    { label: 'Demurrage running', count: demurrageCount },
    { label: 'Overweight trips', count: overweightCount },
    { label: 'On hold', count: holdCount },
    { label: 'Cancelled', count: cancelledCount },
    { label: 'Truck bans now', count: liveBanCount },
  ];
  const activeFlags = flagItems.filter((item) => item.count > 0);
  const flagTotal = activeFlags.reduce((sum, item) => sum + item.count, 0);

  const topItems: NavItemDef[] = [
    {
      id: 'dashboard',
      label: 'Owner Dashboard',
      icon: LayoutDashboard,
      permission: 'dashboard',
    },
    {
      id: 'board',
      label: 'Trip Board',
      icon: KanbanSquare,
      permission: 'pod_upload',
    },
    {
      id: 'exceptions',
      label: 'Exceptions',
      icon: AlertTriangle,
      permission: 'pod_upload',
      badge: holdCount + cancelledCount > 0 ? `${holdCount + cancelledCount}` : undefined,
    },
    {
      id: 'invoices',
      label: 'Invoices & Billing',
      icon: Receipt,
      permission: 'invoice_manage',
      badge: pendingInvoicesCount > 0 ? `${pendingInvoicesCount} due` : undefined,
    },
    {
      id: 'trucks',
      label: 'Trucks & Fuel',
      icon: Truck,
      permission: 'truck_crud',
    },
    {
      id: 'help',
      label: 'How to',
      icon: CircleHelp,
      permission: 'pod_upload',
    },
  ];

  const fleetItems: NavItemDef[] = [
    {
      id: 'drivers',
      label: 'Drivers & Helpers',
      icon: Users,
      permission: 'driver_crud',
    },
    {
      id: 'truckbans',
      label: 'Truck Bans & Hours',
      icon: Ban,
      permission: 'new_trip',
      badge: liveBanCount > 0 ? `${liveBanCount} now` : undefined,
    },
  ];

  const businessItems: NavItemDef[] = [
    {
      id: 'calculator',
      label: 'Load Calculator',
      icon: Calculator,
      permission: 'new_trip',
      badge: overweightCount > 0 ? `${overweightCount} alert` : undefined,
    },
    {
      id: 'ledger',
      label: 'General Ledger',
      icon: BookOpen,
      permission: 'ledger_view',
      trailing: (
        <span title="BIR books — double-entry journal and trial balance" className="text-slate-400">
          <FileCheck2 className={`${ICON_CLASS} w-3.5 h-3.5`} />
        </span>
      ),
    },
    {
      id: 'ratecards',
      label: 'Rate Card Matrix',
      icon: Tag,
      permission: 'ratecard_crud',
    },
    {
      id: 'clients',
      label: 'Shippers & Clients',
      icon: Briefcase,
      permission: 'new_trip',
    },
  ];

  const teamItems: NavItemDef[] = [
    {
      id: 'orgsetup',
      label: 'Company',
      icon: Building2,
      permission: 'settings',
    },
    {
      id: 'rbac',
      label: 'Roles & permissions',
      icon: ShieldCheck,
      permission: 'rbac',
    },
  ];

  const accountItems: NavItemDef[] = useMemo(() => {
    const items: NavItemDef[] = [];
    if (canManageBilling) {
      items.push({
        id: 'admin',
        label: isPlatformAdmin ? 'Platform admin' : 'Revenue & plans',
        icon: Shield,
        permission: 'settings',
      });
    }
    return items;
  }, [canManageBilling, isPlatformAdmin]);

  const fleetHasActive = fleetItems.some((item) => item.id === activeTab);
  const teamHasActive = teamItems.some((item) => item.id === activeTab);
  const businessHasActive = businessItems.some((item) => item.id === activeTab);
  const accountHasActive = accountItems.some((item) => item.id === activeTab);

  useEffect(() => {
    if (fleetHasActive) setFleetOpen(true);
  }, [fleetHasActive]);

  useEffect(() => {
    if (teamHasActive) setTeamOpen(true);
  }, [teamHasActive]);

  useEffect(() => {
    if (businessHasActive) setBusinessOpen(true);
  }, [businessHasActive]);

  useEffect(() => {
    if (accountHasActive) setAccountOpen(true);
  }, [accountHasActive]);

  const showFleet = fleetOpen;
  const showTeam = teamOpen;
  const showBusiness = businessOpen;
  const showAccount = accountOpen;

  const goTo = (tab: NavTab) => {
    setActiveTab(tab);
    onCloseMobileMenu?.();
  };

  const renderItem = (item: NavItemDef) => {
    const hasAccess = item.id === 'admin' ? canManageBilling : item.id === 'help' ? true : canAccess(item.permission);
    const isActive = activeTab === item.id;
    const Icon = item.icon;

    return (
      <button
        key={item.id}
        type="button"
        data-tutorial={`nav-${item.id}`}
        onClick={() => {
          if (hasAccess) goTo(item.id);
        }}
        disabled={!hasAccess}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all group relative text-left ${
          isActive
            ? 'bg-blue-50 text-blue-700 font-semibold'
            : hasAccess
              ? 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              : 'text-slate-400 cursor-not-allowed opacity-50'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Icon
            className={`${ICON_CLASS} ${
              isActive ? 'text-blue-600' : hasAccess ? 'text-slate-400 group-hover:text-slate-700' : 'text-slate-300'
            }`}
          />
          <span className="truncate">{item.label}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {!hasAccess ? (
            <Lock className="w-3.5 h-3.5 text-slate-400 stroke-[1.75]" />
          ) : (
            <>
              {item.trailing}
              {item.badge ? <span className={ACTION_BADGE}>{item.badge}</span> : null}
            </>
          )}
        </div>
      </button>
    );
  };

  const groupHeader = (
    id: string,
    label: string,
    open: boolean,
    onToggle: () => void,
  ) => (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between px-3 mt-3 mb-1.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600"
      aria-expanded={open}
      aria-controls={id}
    >
      <span>{label}</span>
      <ChevronDown className={`w-3.5 h-3.5 stroke-[1.75] transition-transform ${open ? '' : '-rotate-90'}`} />
    </button>
  );

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full select-none bg-white">
      <nav className="p-3 overflow-y-auto">
        <div className="space-y-0.5">
          {topItems.map(renderItem)}
        </div>

        {groupHeader('nav-group-fleet', 'Fleet', showFleet, () => setFleetOpen((open) => !open))}
        {showFleet && <div id="nav-group-fleet" className="space-y-0.5">{fleetItems.map(renderItem)}</div>}

        {groupHeader('nav-group-team', 'Team', showTeam, () => setTeamOpen((open) => !open))}
        {showTeam && <div id="nav-group-team" className="space-y-0.5">{teamItems.map(renderItem)}</div>}

        {groupHeader('nav-group-business', 'Business', showBusiness, () => setBusinessOpen((open) => !open))}
        {showBusiness && <div id="nav-group-business" className="space-y-0.5">{businessItems.map(renderItem)}</div>}
      </nav>

      <div className="p-3 border-t border-slate-100 bg-slate-50/60 space-y-2">
        <div className="bg-white border border-slate-200 rounded-lg text-xs shadow-2xs overflow-hidden">
          <button
            type="button"
            onClick={() => setOpsOpen((open) => !open)}
            className="w-full flex items-center justify-between gap-2 px-2.5 py-2 text-left"
            aria-expanded={opsOpen}
          >
            {flagTotal === 0 ? (
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                <Check className="w-3.5 h-3.5 stroke-[1.75]" />
                All clear
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 min-w-0">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 stroke-[1.75] shrink-0" />
                <span className="truncate">
                  {flagTotal} flag{flagTotal === 1 ? '' : 's'} — {activeFlags[0].label}
                </span>
              </span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 stroke-[1.75] shrink-0 transition-transform ${opsOpen ? '' : '-rotate-90'}`} />
          </button>
          {opsOpen && (
            <div className="px-2.5 pb-2.5 space-y-1 text-[11px] text-slate-500 border-t border-slate-100 pt-2">
              {flagItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    if (item.label === 'On hold' || item.label === 'Cancelled') goTo('exceptions');
                  }}
                  className="w-full flex justify-between gap-2 text-left hover:text-slate-700"
                >
                  <span>{item.label}</span>
                  <span className={`font-mono font-medium ${item.count > 0 ? 'text-amber-700 font-bold' : 'text-slate-500'}`}>
                    {item.count}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setAccountOpen((open) => !open)}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 text-left hover:bg-slate-50 ${
              accountHasActive ? 'bg-blue-50/60' : ''
            }`}
            aria-expanded={showAccount}
          >
            <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center justify-center shrink-0">
              {(currentUser.name || currentUser.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold text-slate-800 truncate">
                {currentUser.name || currentUser.email || 'Account'}
              </div>
              <div className="text-[10px] text-slate-500 truncate">{currentUser.role}</div>
            </div>
            <Settings className="w-3.5 h-3.5 text-slate-400 stroke-[1.75] shrink-0" />
          </button>
          {showAccount && (
            <div className="border-t border-slate-100 p-1 space-y-0.5">
              {accountItems.map(renderItem)}
              {(currentUser.role === 'Owner' || currentUser.role.toLowerCase().includes('owner')) && (
                <button
                  type="button"
                  onClick={() => {
                    setIsBackupOpen(true);
                    onCloseMobileMenu?.();
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-[12px] font-medium text-slate-700 hover:bg-slate-50"
                >
                  <HardDrive className={`${ICON_CLASS} text-slate-500`} />
                  Backup & restore
                </button>
              )}
            </div>
          )}
        </div>

        <CasinWorksCredit className="text-[10px] text-slate-400 text-center block" />
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200 flex-col justify-between shrink-0 h-[calc(100vh-4rem)] select-none">
        {sidebarContent}
      </aside>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobileMenu}
          />
          <div className="relative w-4/5 max-w-xs bg-white shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-left duration-200">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <CasinFreightLogo className="h-7 w-7 rounded-lg" />
                <div>
                  <div className="font-bold text-slate-900 text-sm">CasinFreight Ops</div>
                  <div className="text-[10px] text-slate-500">Navigation Menu</div>
                </div>
              </div>
              <button
                onClick={onCloseMobileMenu}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5 stroke-[1.75]" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {sidebarContent}
            </div>
          </div>
        </div>
      )}

      <WorkspaceBackupModal isOpen={isBackupOpen} onClose={() => setIsBackupOpen(false)} />
    </>
  );
};
