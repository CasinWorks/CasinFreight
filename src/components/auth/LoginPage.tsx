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
  AlertCircle,
  Building2,
  Scale,
  Receipt,
  FileCheck2,
  User,
} from 'lucide-react';
import { useFreight } from '../../context/FreightContext';
import { isFirebaseConfigured } from '../../lib/firebase';

export const LoginPage: React.FC = () => {
  const { login, signup } = useFreight();
  const configured = isFirebaseConfigured();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configured) {
      setErrorMessage('Add your Firebase keys to .env, then restart npm run dev.');
      return;
    }
    setErrorMessage(null);
    setIsLoading(true);
    const res = mode === 'login'
      ? await login(email, password)
      : await signup({ name, email, password, companyName });
    setIsLoading(false);
    if (!res.success) {
      setErrorMessage(res.error || 'Authentication failed.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans selection:bg-blue-500 selection:text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.15),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(99,102,241,0.12),transparent_45%)] pointer-events-none" />

      <header className="relative z-10 px-6 py-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-lg shadow-blue-500/20">
            <TruckIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white">CasinFreight</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950 text-blue-400 font-mono font-semibold border border-blue-800/60">
                PH v3.0
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              Philippine Trucking & Fleet Management Platform
            </span>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-800 text-xs">
          <span className={`w-2 h-2 rounded-full ${configured ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          <span className="text-slate-300 font-medium">{configured ? 'Firebase Auth' : 'Firebase keys required'}</span>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 space-y-6 hidden lg:block pr-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-950/80 border border-blue-800/60 text-blue-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Start free — 1 truck, 1 account, 10 transactions</span>
            </div>
            <h2 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Full fleet ops. Subscribe when you outgrow one truck.
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Dispatch, BIR invoicing, ledger, fuel, and Firebase RBAC are included on Free. Add trucks, team seats, and extra trips on Founding (₱10 live test).
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              {[
                { icon: Scale, title: 'Payload & GVWR', copy: 'Weighbridge checks and overweight alerts.' },
                { icon: FileCheck2, title: 'Digital e-POD', copy: 'Seals, delivery notes, and signatures.' },
                { icon: Receipt, title: 'BIR Invoicing', copy: '12% VAT and 2% EWT on every trip.' },
                { icon: ShieldCheck, title: 'Firebase RBAC', copy: 'Live roles and seats per company.' },
              ].map((item) => (
                <div key={item.title} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
                  <div className="flex items-center gap-2 text-blue-400 text-xs font-bold">
                    <item.icon className="w-4 h-4" />
                    <span>{item.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">{item.copy}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-6 w-full">
            <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-2xl p-6 sm:p-8 backdrop-blur-md space-y-6">
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg ${mode === 'login' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg ${mode === 'signup' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                >
                  Create company
                </button>
              </div>

              {!configured && (
                <div className="bg-amber-950/60 border border-amber-800 text-amber-200 p-3 rounded-xl text-xs space-y-2">
                  <p className="font-bold">Connect your Firebase project</p>
                  <ol className="list-decimal pl-4 space-y-1 text-amber-100/90">
                    <li>Create a Firebase project and enable Email/Password Auth + Firestore.</li>
                    <li>Copy the web app keys into <code className="font-mono">.env</code>.</li>
                    <li>Paste <code className="font-mono">firestore.rules</code> in the Firebase console.</li>
                    <li>Restart <code className="font-mono">npm run dev</code>.</li>
                  </ol>
                </div>
              )}

              {errorMessage && (
                <div className="bg-rose-950/60 border border-rose-800 text-rose-300 p-3 rounded-xl text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'signup' && (
                  <>
                    <label className="block text-xs font-bold text-slate-300">
                      Your name
                      <div className="relative mt-1.5">
                        <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                          placeholder="TJ Casin"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </label>
                    <label className="block text-xs font-bold text-slate-300">
                      Company name
                      <div className="relative mt-1.5">
                        <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          required
                          placeholder="Casin Freight & Logistics Corp."
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </label>
                  </>
                )}

                <label className="block text-xs font-bold text-slate-300">
                  Work email
                  <div className="relative mt-1.5">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="owner@yourfleet.ph"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </label>

                <label className="block text-xs font-bold text-slate-300">
                  Password
                  <div className="relative mt-1.5">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="At least 6 characters"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{mode === 'login' ? 'Sign in' : 'Start free'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
