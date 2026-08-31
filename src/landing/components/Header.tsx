import React, { useEffect, useState } from 'react';
import { PhoneCall, Sparkles, User, ShieldCheck, ZoomIn, Menu, X } from 'lucide-react';
import { TextScale, LanguageMode } from '../types';
import { CasinFreightLogo } from '../../components/brand/CasinFreightLogo';

const NAV_LINK =
  'inline-flex items-center justify-center h-10 px-3 rounded-lg text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors whitespace-nowrap';

const NAV_LINK_ACTIVE =
  'inline-flex items-center justify-center h-10 px-3 rounded-lg text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors whitespace-nowrap';

const DRAWER_LINK =
  'flex items-center w-full min-h-12 px-4 rounded-xl text-base font-semibold text-slate-800 hover:bg-blue-50 hover:text-blue-700 transition-colors';

interface HeaderProps {
  textScale: TextScale;
  setTextScale: (scale: TextScale) => void;
  languageMode: LanguageMode;
  setLanguageMode: (mode: LanguageMode) => void;
  onOpenAuth: (mode: 'signin' | 'signup') => void;
  onOpenStoryModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  textScale,
  setTextScale,
  languageMode,
  setLanguageMode,
  onOpenAuth,
  onOpenStoryModal,
}) => {
  const isLarge = textScale === 'large';
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  const goTo = (hash: string) => {
    closeMenu();
    window.location.hash = hash;
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="hidden lg:block bg-slate-900 text-slate-100 text-xs sm:text-sm py-2 px-4 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold border border-blue-400/30">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              PH v3.0 Official Platform
            </span>
            <span className="hidden xl:inline text-slate-300">
              {languageMode === 'en'
                ? 'Need help setting up your trucks? Speak to our Manila team:'
                : 'Kailangan ng tulong sa trucking app? Tawagan ang aming team:'}
            </span>
            <a
              href="tel:09190036230"
              className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-bold transition-colors"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              0919-003-6230
            </a>
          </div>

          <div className="flex items-center gap-3 ml-auto">
              <FontLanguageToggles
                isLarge={isLarge}
                setTextScale={setTextScale}
                languageMode={languageMode}
                setLanguageMode={setLanguageMode}
              />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 lg:min-h-16 lg:h-auto lg:py-2.5 flex items-center justify-between gap-3">
        <a href="#" className="flex items-center gap-2.5 group focus:outline-hidden min-w-0">
          <CasinFreightLogo className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform" />
          <div className="leading-tight min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg lg:text-xl font-black tracking-tight text-slate-900 font-display">
                Casin<span className="text-blue-600">Freight</span>
              </span>
              <span className="hidden sm:inline px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-blue-100 text-blue-800 rounded-md border border-blue-200">
                PH Fleet
              </span>
            </div>
            <p className="hidden md:block text-[11px] font-medium text-slate-500">
              {languageMode === 'en'
                ? 'Trucking & Logistics for Business Owners'
                : 'Simpleng Trucking System para sa mga Boss'}
            </p>
          </div>
        </a>

        <nav className="hidden lg:flex items-center gap-1">
          <button type="button" onClick={onOpenStoryModal} className={NAV_LINK_ACTIVE}>
            <Sparkles className="w-4 h-4 mr-1.5 shrink-0" />
            <span>{languageMode === 'en' ? 'Story Tutorial' : 'Tutorial'}</span>
          </button>
          <a href="#how-it-works" className={NAV_LINK}>
            {languageMode === 'en' ? 'How It Works' : 'Paano Gamitin'}
          </a>
          <a href="#features" className={NAV_LINK}>
            {languageMode === 'en' ? 'Features' : 'Mga Gamit'}
          </a>
          <a href="#calculator" className={NAV_LINK}>
            {languageMode === 'en' ? 'Savings' : 'Tipid'}
          </a>
          <a href="#pricing" className={NAV_LINK}>
            {languageMode === 'en' ? 'Pricing' : 'Presyo'}
          </a>
          <a href="#faq" className={NAV_LINK}>
            FAQ
          </a>
        </nav>

        <div className="hidden lg:flex items-center gap-2 shrink-0">
          <button
            type="button"
            id="nav-signin-button"
            onClick={() => onOpenAuth('signin')}
            className="inline-flex items-center justify-center gap-1.5 h-10 px-3.5 rounded-lg text-sm font-bold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 transition-colors cursor-pointer"
          >
            <User className="w-4 h-4 text-slate-600" />
            <span>{languageMode === 'en' ? 'Sign In' : 'Mag-Log In'}</span>
          </button>
          <button
            type="button"
            id="nav-start-free-button"
            onClick={() => onOpenAuth('signup')}
            className="inline-flex items-center justify-center h-10 px-4 rounded-lg text-sm font-extrabold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-600/25 hover:shadow-md transition-all cursor-pointer"
          >
            <span>{languageMode === 'en' ? '1 Month Free' : 'Subukan Libre'}</span>
          </button>
        </div>

        <button
          type="button"
          className="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-xl border border-slate-300 bg-white text-slate-800"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {menuOpen && (
        <div className="lg:hidden">
          <button
            type="button"
            className="fixed inset-0 z-40 bg-slate-950/50"
            aria-label="Close menu"
            onClick={closeMenu}
          />
          <div className="absolute left-0 right-0 top-full z-50 max-h-[min(85dvh,calc(100dvh-3.5rem))] overflow-y-auto bg-white border-t border-slate-200 shadow-xl">
            <div className="px-4 py-4 space-y-2">
              <button
                type="button"
                className={`${DRAWER_LINK} bg-blue-50 text-blue-800`}
                onClick={() => {
                  closeMenu();
                  onOpenStoryModal();
                }}
              >
                <Sparkles className="w-4 h-4 mr-2 text-blue-600" />
                {languageMode === 'en' ? 'Story Tutorial' : 'Tutorial'}
              </button>
              <button type="button" className={DRAWER_LINK} onClick={() => goTo('how-it-works')}>
                {languageMode === 'en' ? 'How It Works' : 'Paano Gamitin'}
              </button>
              <button type="button" className={DRAWER_LINK} onClick={() => goTo('features')}>
                {languageMode === 'en' ? 'Features' : 'Mga Gamit'}
              </button>
              <button type="button" className={DRAWER_LINK} onClick={() => goTo('calculator')}>
                {languageMode === 'en' ? 'Savings Calculator' : 'Kalkula ng Tipid'}
              </button>
              <button type="button" className={DRAWER_LINK} onClick={() => goTo('pricing')}>
                {languageMode === 'en' ? 'Founding Pricing' : 'Presyo'}
              </button>
              <button type="button" className={DRAWER_LINK} onClick={() => goTo('faq')}>
                FAQ
              </button>
            </div>

            <div className="px-4 pb-3 space-y-2">
              <button
                type="button"
                className="flex items-center justify-center gap-2 w-full min-h-12 rounded-xl border border-slate-300 font-bold text-slate-800"
                onClick={() => {
                  closeMenu();
                  onOpenAuth('signin');
                }}
              >
                <User className="w-4 h-4" />
                {languageMode === 'en' ? 'Sign In' : 'Mag-Log In'}
              </button>
              <button
                type="button"
                className="flex items-center justify-center w-full min-h-12 rounded-xl bg-blue-600 text-white font-extrabold"
                onClick={() => {
                  closeMenu();
                  onOpenAuth('signup');
                }}
              >
                {languageMode === 'en' ? '1 Month Free' : 'Subukan Libre'}
              </button>
            </div>

            <div className="px-4 py-4 border-t border-slate-100 space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Display</p>
              <FontLanguageToggles
                isLarge={isLarge}
                setTextScale={setTextScale}
                languageMode={languageMode}
                setLanguageMode={setLanguageMode}
                inverted
              />
              <a
                href="tel:09190036230"
                className="flex items-center gap-2 min-h-11 text-sm font-bold text-emerald-700"
              >
                <PhoneCall className="w-4 h-4" />
                0919-003-6230
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

function FontLanguageToggles({
  isLarge,
  setTextScale,
  languageMode,
  setLanguageMode,
  inverted = false,
}: {
  isLarge: boolean;
  setTextScale: (scale: TextScale) => void;
  languageMode: LanguageMode;
  setLanguageMode: (mode: LanguageMode) => void;
  inverted?: boolean;
}) {
  const shell = inverted
    ? 'flex items-center gap-1 bg-slate-100 rounded-lg p-0.5 border border-slate-200'
    : 'flex items-center gap-1 bg-slate-800 rounded-lg p-0.5 border border-slate-700';
  const idle = inverted ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className={shell}>
        <button
          type="button"
          onClick={() => setTextScale('normal')}
          className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
            !isLarge ? 'bg-blue-600 text-white shadow-xs' : idle
          }`}
        >
          Normal
        </button>
        <button
          type="button"
          onClick={() => setTextScale('large')}
          className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all ${
            isLarge ? 'bg-amber-500 text-slate-950 font-bold shadow-xs' : idle
          }`}
        >
          <ZoomIn className="w-3 h-3" />
          Bigger fonts
        </button>
      </div>
      <div className={shell}>
        <button
          type="button"
          onClick={() => setLanguageMode('en')}
          className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
            languageMode === 'en' ? 'bg-blue-600 text-white' : idle
          }`}
        >
          English
        </button>
        <button
          type="button"
          onClick={() => setLanguageMode('taglish')}
          className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
            languageMode === 'taglish' ? 'bg-blue-600 text-white' : idle
          }`}
        >
          Taglish
        </button>
      </div>
    </div>
  );
}
