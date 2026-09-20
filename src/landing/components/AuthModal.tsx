import React, { useEffect, useState } from 'react';
import { X, Mail, Lock, Eye, EyeOff, Building, ArrowRight, Truck, AlertCircle, User } from 'lucide-react';
import { TextScale, LanguageMode } from '../types';
import { useFreight } from '../../context/FreightContext';
import { isFirebaseConfigured } from '../../lib/firebase';
import { MIN_SIGNUP_PASSWORD_LENGTH } from '../../config/auth';

type AuthMode = 'signin' | 'signup' | 'join';

const SAVED_EMAIL_KEY = 'casinfreight_saved_email';

function readSavedEmail() {
  try {
    return localStorage.getItem(SAVED_EMAIL_KEY) || '';
  } catch {
    return '';
  }
}

function writeSavedEmail(email: string, remember: boolean) {
  try {
    if (remember && email.trim()) localStorage.setItem(SAVED_EMAIL_KEY, email.trim());
    else localStorage.removeItem(SAVED_EMAIL_KEY);
  } catch {
    // Private mode can block storage. Sign-in still works.
  }
}

interface AuthModalProps {
  isOpen: boolean;
  initialMode: AuthMode;
  onClose: () => void;
  textScale: TextScale;
  languageMode: LanguageMode;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode,
  onClose,
  textScale,
  languageMode,
}) => {
  const { login, signup, joinTeam, requestPasswordReset, isAuthenticated } = useFreight();
  const configured = isFirebaseConfigured();
  const params = new URLSearchParams(window.location.search);
  const invitedEmail = (params.get('email') || '').trim();
  const isJoinLink = params.get('join') === '1';

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState(invitedEmail || readSavedEmail());
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    setErrorMessage(null);
    setInfoMessage(
      initialMode === 'join' && invitedEmail
        ? 'You were invited. Enter your name, choose a password, and join. This website is for fleet staff (office / dispatch).'
        : null
    );
    setPassword('');
    if (invitedEmail) setEmail(invitedEmail);
  }, [initialMode, isOpen, invitedEmail]);

  useEffect(() => {
    if (isAuthenticated) setIsLoading(false);
  }, [isAuthenticated]);

  if (!isOpen) return null;

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setErrorMessage('Enter your work email first, then tap Forgot password.');
      return;
    }
    setErrorMessage(null);
    setInfoMessage(null);
    setIsResetting(true);
    const res = await requestPasswordReset(email);
    setIsResetting(false);
    if (!res.success) {
      setErrorMessage(res.error || 'Could not send the reset email.');
      return;
    }
    setInfoMessage(
      `If ${email.trim()} already has a CasinFreight login, Firebase emailed a reset link. Check Inbox, Spam, and Promotions. New hires should use the join link from the owner, not Forgot password.`
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configured) {
      setErrorMessage('Add your Firebase keys to .env, then restart npm run dev.');
      return;
    }
    setErrorMessage(null);
    setInfoMessage(null);
    if (mode !== 'signin' && password.length < MIN_SIGNUP_PASSWORD_LENGTH) {
      setErrorMessage(`Password must be at least ${MIN_SIGNUP_PASSWORD_LENGTH} characters.`);
      return;
    }
    setIsLoading(true);
    let ok = false;
    try {
      const res =
        mode === 'signin'
          ? await login(email, password, { rememberMe })
          : mode === 'join'
            ? await joinTeam({ name, email, password })
            : await signup({ name, email, password, companyName });
      if (!res.success) {
        setErrorMessage(res.error || 'Authentication failed.');
        return;
      }
      ok = true;
      if (mode === 'signin') writeSavedEmail(email, rememberMe);
      // Keep spinner until isAuthenticated swaps the landing for the app (BootSplash covers it).
    } finally {
      if (!ok) setIsLoading(false);
    }
  };

  const isLarge = textScale === 'large';
  const joinLocked = mode === 'join' && Boolean(invitedEmail);

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border-2 border-slate-200 overflow-y-auto my-0 sm:my-auto max-h-[96dvh] landing-auth-in">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black shadow-xs">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg">CasinFreight Portal</h3>
              <p className="text-xs text-slate-400">Philippine Trucking & Fleet Management</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {mode === 'join' ? (
            <div className="text-left">
              <h4 className="font-extrabold text-slate-900 text-lg">Finish your invite</h4>
              <p className="text-sm text-slate-500 mt-1">
                Choose a password, then tap Join. Fleet staff open the website after this; warehouse / client portal contacts use the CasinFreight Driver app on the phone.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
              <button
                type="button"
                id="modal-tab-signin"
                onClick={() => {
                  setMode('signin');
                  setErrorMessage(null);
                  setInfoMessage(null);
                }}
                className={`py-3 rounded-xl font-extrabold text-sm sm:text-base transition-all cursor-pointer ${
                  mode === 'signin' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                id="modal-tab-signup"
                onClick={() => {
                  setMode('signup');
                  setErrorMessage(null);
                  setInfoMessage('Owners only: this creates a new CasinFreight company. Invited staff should use the join link instead.');
                }}
                className={`py-3 rounded-xl font-extrabold text-sm sm:text-base transition-all cursor-pointer ${
                  mode === 'signup' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Create Company (Free)
              </button>
            </div>
          )}

          {mode === 'signup' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2.5 text-amber-950 text-xs font-bold">
              <span className="text-base">🎁</span>
              <span>Includes 5 Trucks Free for 30 Days • Founding Rate locked for Year 1</span>
            </div>
          )}

          {!configured && (
            <div className="bg-amber-50 border border-amber-200 text-amber-950 p-3 rounded-xl text-xs space-y-1">
              <p className="font-bold">Connect your Firebase project</p>
              <p>Add your Firebase keys to <code className="font-mono">.env</code>, then restart the app.</p>
            </div>
          )}

          {infoMessage && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 rounded-xl text-xs">
              {infoMessage}
            </div>
          )}

          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            {(mode === 'signup' || mode === 'join') && (
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Your name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="TJ Casin"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-base font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Trucking / Logistics Company Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Building className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramos Forwarding & Cargo Inc."
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-base font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                {mode === 'signin' ? 'Work Email' : mode === 'join' ? 'Work email' : 'Owner Email Address'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  autoComplete="username"
                  required
                  readOnly={joinLocked}
                  placeholder="owner@yourfleet.ph"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-base font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                {mode === 'join' ? 'Choose a password' : 'Password'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  required
                  minLength={mode === 'signin' ? 6 : MIN_SIGNUP_PASSWORD_LENGTH}
                  placeholder={mode === 'signin' ? 'Your password' : `At least ${MIN_SIGNUP_PASSWORD_LENGTH} characters`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-300 rounded-xl text-base font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-800 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {mode === 'signin' && (
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => void handleForgotPassword()}
                  disabled={isResetting}
                  className="text-xs font-bold text-blue-600 hover:underline cursor-pointer disabled:opacity-50"
                >
                  {isResetting ? 'Sending reset link…' : 'Forgot password?'}
                </button>
              </div>
            )}

            {mode === 'join' && (
              <p className="text-xs text-slate-500">
                After you join, sign in with this email and password next time. You will not become a new company owner.
              </p>
            )}

            {mode === 'signup' && (
              <p className="text-xs text-slate-500">
                This opens a new workspace. If your boss invited you, use the join link instead.
              </p>
            )}

            <button
              type="submit"
              id="modal-submit-button"
              disabled={isLoading}
              className={`w-full font-black text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-2xl shadow-lg shadow-blue-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 ${
                isLarge ? 'py-4.5 text-xl' : 'py-4 text-lg'
              }`}
            >
              {isLoading ? (
                <div className="w-5 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>
                    {mode === 'signin'
                      ? languageMode === 'en'
                        ? 'Sign In to My Fleet'
                        : 'Mag-Sign In sa Fleet'
                      : mode === 'join'
                        ? languageMode === 'en'
                          ? 'Join company'
                          : 'Sumali sa kumpanya'
                        : languageMode === 'en'
                          ? 'Start 1-Month Free Trial'
                          : 'Simulan ang Libreng Buwan'}
                  </span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            {mode === 'join' && (
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setErrorMessage(null);
                  setInfoMessage('Use the password you already set. If join failed, ask the owner to send the join link again.');
                }}
                className="w-full text-xs font-bold text-slate-500 hover:text-slate-800"
              >
                Already set a password? Sign in
              </button>
            )}

            {mode === 'signin' && isJoinLink && (
              <button
                type="button"
                onClick={() => {
                  setMode('join');
                  setErrorMessage(null);
                  setInfoMessage(invitedEmail ? 'Enter your name, choose a password, and join the company that invited you.' : null);
                }}
                className="w-full text-xs font-bold text-slate-500 hover:text-slate-800"
              >
                Have an invite? Join company
              </button>
            )}
          </form>

          <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
            <p>Prefer setting up with a real person? Call our Manila office:</p>
            <a
              href="tel:09190036230"
              className="font-bold text-blue-700 hover:underline inline-flex items-center gap-1 mt-1"
            >
              0919-003-6230 • Mon–Sat 7am–8pm
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
