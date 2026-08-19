import React, { useState } from 'react';
import { 
  Truck as TruckIcon, 
  ShieldCheck, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  Database, 
  Key, 
  Layers, 
  UserCheck, 
  MapPin, 
  Clock, 
  Scale, 
  Receipt,
  FileCheck2,
  Users
} from 'lucide-react';
import { useFreight } from '../../context/FreightContext';
import { UserRole } from '../../types';

export const LoginPage: React.FC = () => {
  const { users, roles, login, company } = useFreight();

  const [email, setEmail] = useState('tj.casin@casinfreight.ph');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDemoUser, setSelectedDemoUser] = useState<string | null>('user-01');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    setTimeout(() => {
      const res = login(email, password);
      setIsLoading(false);
      if (!res.success) {
        setErrorMessage(res.error || 'Authentication failed.');
      }
    }, 400);
  };

  const handleSelectDemoUser = (user: typeof users[0]) => {
    setEmail(user.email);
    setPassword(user.password || 'password123');
    setSelectedDemoUser(user.id);
    setErrorMessage(null);
  };

  const handleInstantDemoLogin = (user: typeof users[0]) => {
    setEmail(user.email);
    setPassword(user.password || 'password123');
    setSelectedDemoUser(user.id);
    setErrorMessage(null);
    setIsLoading(true);

    setTimeout(() => {
      login(user.email, user.password || 'password123');
      setIsLoading(false);
    }, 250);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans selection:bg-blue-500 selection:text-white relative overflow-hidden">
      
      {/* Ambient background glow & grid */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.15),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(99,102,241,0.12),transparent_45%)] pointer-events-none"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b08_1px,transparent_1px),linear-gradient(to_bottom,#1e293b08_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none"></div>

      {/* Top Bar */}
      <header className="relative z-10 px-6 py-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-lg shadow-blue-500/20">
            <TruckIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white">CasinFreight</span>
              <span className="text-[10px] px-2 py-0.2 rounded bg-blue-950 text-blue-400 font-mono font-semibold border border-blue-800/60">
                PH v2.4
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              Philippine Trucking & Fleet Management Platform
            </span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-300 font-medium">Local Database Online</span>
          </div>
          <div className="flex items-center gap-1 text-slate-500 font-mono text-[11px]">
            <span>🇵🇭</span>
            <span>MNL Terminal 1</span>
          </div>
        </div>
      </header>

      {/* Main Center Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Brand Story & Live Operations Highlights */}
          <div className="lg:col-span-6 space-y-6 text-left hidden lg:block pr-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-950/80 border border-blue-800/60 text-blue-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Offline-First Workstation Security</span>
            </div>

            <div className="space-y-3">
              <h2 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
                Enterprise Logistics Engine for Philippine Fleets.
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Centralize linehaul dispatching, weighbridge gross vehicle compliance, driver licensing, BIR 12% VAT invoicing, and granular Role-Based Access Control.
              </p>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xs space-y-1">
                <div className="flex items-center gap-2 text-blue-400 text-xs font-bold">
                  <Scale className="w-4 h-4" />
                  <span>Payload & GVWR</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Weighbridge tare weight verification and overweight trip warnings.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xs space-y-1">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                  <FileCheck2 className="w-4 h-4" />
                  <span>Digital e-POD</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Receiver signature capture, cargo seal audits, and delivery notes.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xs space-y-1">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
                  <Receipt className="w-4 h-4" />
                  <span>BIR Sales Invoicing</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  12% VAT, 2% creditable withholding (BIR 2307), and demurrage billing.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xs space-y-1">
                <div className="flex items-center gap-2 text-purple-400 text-xs font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Granular RBAC</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Role permissions matrix stored directly in your local workstation database.
                </p>
              </div>
            </div>

            {/* Registered Company Pill */}
            <div className="pt-2 flex items-center gap-3 text-xs text-slate-400">
              <Building2 className="w-4 h-4 text-slate-500" />
              <span>Registered to: <strong className="text-slate-200">{company.name}</strong></span>
              <span className="text-slate-600">•</span>
              <span className="font-mono text-[11px] text-slate-500">TIN: {company.tin}</span>
            </div>
          </div>

          {/* Right Column: Authentication Card & 1-Click Demo Profiles */}
          <div className="lg:col-span-6 w-full">
            <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-2xl p-6 sm:p-8 backdrop-blur-md space-y-6">
              
              {/* Form Header */}
              <div className="text-left space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    Terminal Operator Login
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-950 text-blue-400 border border-blue-800">
                    Session Auth
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Sign in with your company email or select a pre-configured role below.
                </p>
              </div>

              {/* Error Banner */}
              {errorMessage && (
                <div className="bg-rose-950/60 border border-rose-800 text-rose-300 p-3 rounded-xl text-xs flex items-center gap-2.5 animate-in shake duration-150">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-4 text-left">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Company Work Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setErrorMessage(null);
                      }}
                      placeholder="operator@casinfreight.ph"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors font-medium"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-300">
                      Workstation Password
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">
                      (Demo: password123)
                    </span>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setErrorMessage(null);
                      }}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors font-medium"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-500 hover:text-slate-300 absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-slate-400 hover:text-slate-300">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer"
                    />
                    <span className="text-[11px]">Remember this terminal workstation</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setEmail('tj.casin@casinfreight.ph');
                      setPassword('password123');
                      setErrorMessage(null);
                    }}
                    className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold"
                  >
                    Auto-Fill Owner
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold rounded-xl transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 active:scale-98 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Sign In to Terminal</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* 1-Click Quick Operator Demo Logins */}
              <div className="pt-4 border-t border-slate-800/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-400" />
                    <span>1-Click Operator Login (RBAC Demo)</span>
                  </span>
                  <span className="text-[10px] text-slate-500">Tap to log in</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[190px] overflow-y-auto pr-1">
                  {users.map((u) => {
                    const isSelected = selectedDemoUser === u.id;
                    const roleColorBadge = 
                      u.role === 'Owner' ? 'bg-indigo-950 text-indigo-300 border-indigo-800' :
                      u.role === 'Dispatcher' ? 'bg-blue-950 text-blue-300 border-blue-800' :
                      u.role === 'Loading Staff' ? 'bg-emerald-950 text-emerald-300 border-emerald-800' :
                      u.role === 'Billing' ? 'bg-amber-950 text-amber-300 border-amber-800' :
                      'bg-purple-950 text-purple-300 border-purple-800';

                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleInstantDemoLogin(u)}
                        className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 group cursor-pointer ${
                          isSelected
                            ? 'bg-slate-800 border-blue-500/60 ring-1 ring-blue-500/40'
                            : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700'
                        }`}
                      >
                        <img
                          src={u.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                          alt={u.name}
                          className="w-7 h-7 rounded-lg object-cover border border-slate-700 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-bold text-white truncate group-hover:text-blue-300">
                            {u.name}
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${roleColorBadge} truncate`}>
                              {u.role}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Workstation Security Footer */}
              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>256-Bit Workstation Encryption</span>
                </div>
                <span>Terminal: PH-MNL-01</span>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* Page Footer */}
      <footer className="relative z-10 px-6 py-3 border-t border-slate-800/60 bg-slate-950/80 text-[11px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div>
          © 2026 {company.name} • CasinFreight PH Trucking SaaS
        </div>
        <div className="flex items-center gap-4 text-[10px]">
          <span>Security Policy</span>
          <span>•</span>
          <span>BIR 2307 Certified</span>
          <span>•</span>
          <span>LTO Restriction Compliant</span>
        </div>
      </footer>

    </div>
  );
};
