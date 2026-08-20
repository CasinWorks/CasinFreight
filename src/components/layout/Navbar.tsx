import React from 'react';
import { 
  Truck as TruckIcon, 
  Search, 
  Plus, 
  Bell, 
  ChevronDown, 
  Layers, 
  Menu, 
  X,
  LogOut,
} from 'lucide-react';
import { useFreight } from '../../context/FreightContext';
import { formatPhDate } from '../../config/plans';
import { useTutorial } from '../tutorial';

interface NavbarProps {
  onOpenNewTrip: () => void;
  onOpenOrgSetup: () => void;
  onOpenNotifications: () => void;
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onOpenNewTrip, 
  onOpenOrgSetup,
  onOpenNotifications,
  onToggleMobileMenu,
  isMobileMenuOpen,
  searchQuery, 
  setSearchQuery 
}) => {
  const { 
    company, 
    currentUser, 
    canAccess, 
    unreadNotificationsCount, 
    logout,
    activePlan,
    setIsUpgradeModalOpen,
    subscriptionUsage,
    subscription,
    resetCurrentPlanToFree,
  } = useFreight();
  const { startTutorial } = useTutorial();

  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);

  return (
    <header className="h-16 bg-white border-b border-slate-200 text-slate-800 px-3 md:px-6 flex items-center justify-between sticky top-0 z-30 select-none shadow-xs">
      {/* Brand & Mobile Hamburger Toggle */}
      <div className="flex items-center gap-2 md:gap-3">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Toggle Navigation Menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        )}

        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold tracking-wider shadow-sm shrink-0">
          <TruckIcon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold tracking-tight text-slate-900 text-sm md:text-base truncate">CasinFreight</span>
            <span className="text-[9px] md:text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono font-medium border border-slate-200 shrink-0">
              PH v3.0
            </span>
          </div>
          <div className="text-[11px] md:text-xs text-slate-500 font-medium truncate max-w-[120px] sm:max-w-[180px] md:max-w-[260px]">
            {company.name}
          </div>
        </div>
      </div>

      {/* Center Operational Status Pill */}
      <div className="hidden lg:flex items-center gap-4">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full text-xs font-medium text-slate-700 shadow-2xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-semibold text-slate-800">Fleet Operations Live</span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-600">Manila & South Luzon Corridor</span>
        </div>
      </div>

      {/* Right Controls & Role Switcher */}
      <div className="flex items-center gap-1.5 md:gap-3">
        <button
          type="button"
          data-tutorial="plan-badge"
          onClick={() => setIsUpgradeModalOpen(true)}
          className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border ${
            activePlan.id === 'plan_free'
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          {activePlan.name}
          <span className="font-mono font-medium text-[10px] opacity-80">
            {activePlan.id === 'plan_free'
              ? `${subscriptionUsage.transactionsUsed}/${subscriptionUsage.maxTransactions ?? '∞'} trips`
              : subscription.cancel_at_period_end
                ? `ends ${formatPhDate(subscription.current_period_end)}`
                : `renews ${formatPhDate(subscription.current_period_end)}`}
          </span>
        </button>

        {/* Quick Action: New Trip */}
        {canAccess('new_trip') && (
          <button
            data-tutorial="new-load-btn"
            onClick={onOpenNewTrip}
            className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-2.5 md:px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all shadow-sm active:scale-95 shrink-0"
          >
            <Plus className="w-3.5 h-3.5 md:w-4 md:h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">New Load</span>
            <span className="sm:hidden text-[11px]">New</span>
          </button>
        )}

        {/* Org Setup / Preset Wizard */}
        <button
          data-tutorial="org-setup-btn"
          onClick={onOpenOrgSetup}
          title="Company Setup & Fleet Wizard"
          className="hidden sm:flex items-center gap-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors shadow-2xs shrink-0"
        >
          <Layers className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden md:inline">Org Setup</span>
        </button>

        {/* Notifications */}
        <button
          data-tutorial="notifications-btn"
          onClick={onOpenNotifications}
          title="Notifications & Operations Alerts"
          aria-label="View notifications"
          className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-all shrink-0 active:scale-95 shadow-2xs group"
        >
          <Bell className="w-4 h-4 transition-transform group-hover:rotate-12" />
          
          {unreadNotificationsCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-blue-600 text-white text-[10px] font-bold ring-2 ring-white">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative">{unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}</span>
            </span>
          )}
        </button>

        {/* User profile dropdown & logout */}
        <div className="relative pl-1 border-l border-slate-200 shrink-0">
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 transition-colors text-left"
          >
            <img 
              src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'} 
              alt={currentUser.name}
              className="w-7 h-7 md:w-8 md:h-8 rounded-full border border-slate-200 object-cover"
            />
            <div className="hidden xl:block text-left">
              <div className="text-xs font-semibold text-slate-800 truncate max-w-[100px]">{currentUser.name}</div>
              <div className="text-[10px] text-slate-500 font-mono">{currentUser.role}</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {/* User Dropdown Menu */}
          {isUserMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsUserMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 p-2 text-xs animate-in zoom-in-95 duration-150">
                {/* Header User Details */}
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <div className="font-bold text-slate-900 text-xs">{currentUser.name}</div>
                  <div className="text-[11px] text-slate-500 truncate">{currentUser.email}</div>
                  <div className="flex items-center gap-1 pt-1">
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 font-mono">
                      {currentUser.role}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {currentUser.department || 'Fleet Operations'}
                    </span>
                  </div>
                </div>

                <div className="py-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      startTutorial();
                    }}
                    className="w-full p-2 rounded-lg hover:bg-slate-50 text-left text-xs font-semibold text-slate-700"
                  >
                    Replay tutorial
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setIsUpgradeModalOpen(true);
                    }}
                    className="w-full p-2 rounded-lg hover:bg-slate-50 text-left text-xs font-semibold text-slate-700"
                  >
                    {activePlan.id === 'plan_free' ? 'Upgrade to Founding' : 'Manage subscription'}
                  </button>
                  {activePlan.id !== 'plan_free' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!window.confirm('Reset this workspace to the Free plan?')) return;
                        setIsUserMenuOpen(false);
                        void resetCurrentPlanToFree().catch((err) => {
                          window.alert(err instanceof Error ? err.message : 'Could not reset to Free.');
                        });
                      }}
                      className="w-full p-2 rounded-lg hover:bg-slate-50 text-left text-xs font-semibold text-slate-700"
                    >
                      Reset to Free plan
                    </button>
                  )}
                </div>

                {/* Logout Button */}
                <div className="pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full p-2 rounded-xl text-rose-600 hover:bg-rose-50 font-bold text-xs flex items-center gap-2 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>Sign Out / Lock Terminal</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
