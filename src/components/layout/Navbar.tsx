import React from 'react';
import { 
  Truck as TruckIcon, 
  ShieldCheck, 
  Search, 
  Plus, 
  Bell, 
  UserCheck, 
  Sparkles, 
  ChevronDown, 
  RotateCcw, 
  Layers, 
  Menu, 
  X,
  LogOut,
  Check,
  Building2
} from 'lucide-react';
import { useFreight } from '../../context/FreightContext';
import { UserRole } from '../../types';

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
    switchUserRole, 
    switchUserAccount, 
    canAccess, 
    resetToSampleData, 
    unreadNotificationsCount, 
    roles, 
    users, 
    logout 
  } = useFreight();

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
              PH v2.4
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
        {/* Role Switcher Pill */}
        <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-0.5 md:p-1">
          <div className="hidden md:flex text-[11px] font-medium text-slate-500 px-1.5 items-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-slate-500" />
            <span>Role:</span>
          </div>
          <div className="relative">
            <select
              value={currentUser.role}
              onChange={(e) => switchUserRole(e.target.value as UserRole)}
              className="bg-white border border-slate-200 text-xs font-semibold text-slate-700 rounded px-2 py-1 pr-5 appearance-none focus:outline-none focus:border-blue-500 cursor-pointer shadow-2xs max-w-[135px] sm:max-w-none"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id === 'Owner' ? '👑' : r.id === 'Dispatcher' ? '🚛' : r.id === 'Loading Staff' ? '📦' : r.id === 'Billing' ? '🧾' : '🛡️'} {r.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Quick Action: New Trip */}
        {canAccess('new_trip') && (
          <button
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
          onClick={onOpenOrgSetup}
          title="Company Setup & Fleet Wizard"
          className="hidden sm:flex items-center gap-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors shadow-2xs shrink-0"
        >
          <Layers className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden md:inline">Org Setup</span>
        </button>

        {/* Reset Mock Data button */}
        <button
          onClick={() => {
            if (window.confirm('Reset CasinFreight to default sample data?')) {
              resetToSampleData();
            }
          }}
          title="Reset to Sample Data"
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg border border-transparent hover:border-slate-200 transition-colors shrink-0"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Notification Bell Icon */}
        <button
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

                {/* Operator Switcher section */}
                <div className="py-2 space-y-1">
                  <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Switch Active Operator
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-0.5">
                    {users.map((u) => {
                      const isActive = u.id === currentUser.id;
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            switchUserAccount(u.id);
                            setIsUserMenuOpen(false);
                          }}
                          className={`w-full p-1.5 rounded-lg flex items-center justify-between text-left transition-colors ${
                            isActive ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <img src={u.avatarUrl} alt={u.name} className="w-5 h-5 rounded-full object-cover" />
                            <span className="truncate text-xs">{u.name}</span>
                          </div>
                          {isActive && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
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
