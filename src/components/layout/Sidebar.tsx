import React from 'react';
import { 
  LayoutDashboard, 
  KanbanSquare, 
  Calculator, 
  Receipt, 
  Truck, 
  Users, 
  Tag, 
  Building2, 
  Clock, 
  AlertTriangle, 
  FileCheck2,
  Lock,
  ChevronRight,
  X,
  BookOpen,
  ShieldCheck,
  Shield
} from 'lucide-react';
import { useFreight } from '../../context/FreightContext';

export type NavTab = 
  | 'board' 
  | 'calculator' 
  | 'invoices' 
  | 'ledger'
  | 'trucks' 
  | 'drivers' 
  | 'ratecards' 
  | 'dashboard' 
  | 'rbac'
  | 'orgsetup'
  | 'admin';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  isMobileMenuOpen?: boolean;
  onCloseMobileMenu?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab,
  isMobileMenuOpen = false,
  onCloseMobileMenu
}) => {
  const { trips, invoices, trucks, roles, canAccess, currentUser, canManageBilling } = useFreight();

  // Active counts for badges
  const activeTripsCount = trips.filter(t => t.status === 'In Transit' || t.status === 'Loaded').length;
  const demurrageCount = trips.filter(t => t.demurrageHours > 0).length;
  const overweightCount = trips.filter(t => t.isOverweight).length;
  const pendingInvoicesCount = invoices.filter(i => i.status === 'Draft' || i.status === 'Sent').length;
  const availableTrucksCount = trucks.filter(t => t.status === 'Available').length;

  const navItems = [
    {
      id: 'board' as NavTab,
      label: 'Trip Board',
      icon: KanbanSquare,
      permission: 'pod_upload' as const, // Loading staff, Dispatcher, Owner all see board
      badge: activeTripsCount > 0 ? `${activeTripsCount} active` : undefined,
      badgeColor: 'bg-blue-50 text-blue-700 border border-blue-100',
      description: 'Live Kanban & shipment flow',
    },
    {
      id: 'calculator' as NavTab,
      label: 'Load Calculator',
      icon: Calculator,
      permission: 'new_trip' as const,
      badge: overweightCount > 0 ? `${overweightCount} alert` : undefined,
      badgeColor: 'bg-amber-50 text-amber-700 border border-amber-200',
      description: 'Capacity, payload & zone rates',
    },
    {
      id: 'invoices' as NavTab,
      label: 'Invoices & Billing',
      icon: Receipt,
      permission: 'invoice_manage' as const,
      badge: pendingInvoicesCount > 0 ? `${pendingInvoicesCount} due` : undefined,
      badgeColor: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      description: 'Itemized BIR invoices & accessorials',
    },
    {
      id: 'ledger' as NavTab,
      label: 'General Ledger Books',
      icon: BookOpen,
      permission: 'ledger_view' as const,
      badge: 'BIR',
      badgeColor: 'bg-blue-50 text-blue-700 border border-blue-200',
      description: 'Double-entry accounting, JVs & Trial Balance',
    },
    {
      id: 'trucks' as NavTab,
      label: 'Trucks & Fuel Registry',
      icon: Truck,
      permission: 'truck_crud' as const,
      badge: `${availableTrucksCount}/${trucks.length} ready`,
      badgeColor: 'bg-slate-100 text-slate-600 border border-slate-200',
      description: 'GVWR, Tare & Fuel KM/L Audit',
    },
    {
      id: 'drivers' as NavTab,
      label: 'Driver Roster',
      icon: Users,
      permission: 'driver_crud' as const,
      description: 'LTO licenses & restrictions',
    },
    {
      id: 'ratecards' as NavTab,
      label: 'Rate Card Matrix',
      icon: Tag,
      permission: 'ratecard_crud' as const,
      description: 'Port & Luzon zone tariffs',
    },
    {
      id: 'dashboard' as NavTab,
      label: 'Owner Dashboard',
      icon: LayoutDashboard,
      permission: 'dashboard' as const,
      badge: 'Owner',
      badgeColor: 'bg-purple-50 text-purple-700 border border-purple-200',
      description: 'Fleet margin & trip volume',
    },
    {
      id: 'rbac' as NavTab,
      label: 'RBAC & Permissions',
      icon: ShieldCheck,
      permission: 'rbac' as const,
      badge: `${roles.length} roles`,
      badgeColor: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
      description: 'Granular security matrix & local DB',
    },
    {
      id: 'orgsetup' as NavTab,
      label: 'Company & Team',
      icon: Building2,
      permission: 'settings' as const,
      description: 'TIN, contacts & role management',
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full select-none bg-white">
      {/* Navigation list */}
      <nav className="p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Operations & Logistics
        </div>

        {navItems.map((item) => {
          const hasAccess = canAccess(item.permission);
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              data-tutorial={`nav-${item.id}`}
              onClick={() => {
                if (hasAccess) {
                  setActiveTab(item.id);
                  if (onCloseMobileMenu) onCloseMobileMenu();
                }
              }}
              disabled={!hasAccess}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative text-left ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : hasAccess
                  ? 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  : 'text-slate-400 cursor-not-allowed opacity-50'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : hasAccess ? 'text-slate-400 group-hover:text-slate-700' : 'text-slate-300'}`} />
                <div className="truncate">
                  <div className="truncate">{item.label}</div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                {!hasAccess ? (
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                ) : item.badge ? (
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}

        {canManageBilling && (
          <>
            <div className="px-3 pt-4 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Platform
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveTab('admin');
                if (onCloseMobileMenu) onCloseMobileMenu();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
                activeTab === 'admin'
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Shield className={`w-4 h-4 shrink-0 ${activeTab === 'admin' ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className="truncate">Revenue & plans</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-medium bg-slate-900 text-white">
                Admin
              </span>
            </button>
          </>
        )}
      </nav>

      {/* Operational Quick Alert Footer */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/60">
        <div className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs shadow-2xs">
          <div className="flex items-center justify-between text-slate-700 font-semibold mb-1">
            <span className="flex items-center gap-1.5 text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Live Ops Flags
            </span>
            <span className="text-[10px] font-mono text-slate-400">PH Tollways</span>
          </div>
          <div className="space-y-1 text-[11px] text-slate-500">
            <div className="flex justify-between">
              <span>Demurrage running:</span>
              <span className={`font-mono font-medium ${demurrageCount > 0 ? 'text-amber-600 font-bold' : 'text-slate-600'}`}>
                {demurrageCount} trip(s)
              </span>
            </div>
            <div className="flex justify-between">
              <span>Overweight trips:</span>
              <span className={`font-mono font-medium ${overweightCount > 0 ? 'text-rose-600 font-bold' : 'text-slate-600'}`}>
                {overweightCount} flagged
              </span>
            </div>
          </div>
        </div>

        <div className="mt-2 text-center text-[10px] text-slate-400">
          Logged as <span className="font-semibold text-slate-600">{currentUser.role}</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200 flex-col justify-between shrink-0 h-[calc(100vh-4rem)] select-none">
        {sidebarContent}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobileMenu}
          />

          {/* Drawer Content */}
          <div className="relative w-4/5 max-w-xs bg-white shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-left duration-200">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                  <Truck className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-sm">CasinFreight Ops</div>
                  <div className="text-[10px] text-slate-500">Navigation Menu</div>
                </div>
              </div>
              <button
                onClick={onCloseMobileMenu}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {sidebarContent}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
