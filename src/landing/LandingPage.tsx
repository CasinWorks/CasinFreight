import React, { useEffect, useState } from 'react';
import { PhoneCall } from 'lucide-react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { StoryTutorialSection } from './components/StoryTutorialSection';
import { StoryTutorialModal } from './components/StoryTutorialModal';
import { FeatureModules } from './components/FeatureModules';
import { InteractiveLiveDemo } from './components/InteractiveLiveDemo';
import { SavingsCalculator } from './components/SavingsCalculator';
import { PricingSection } from './components/PricingSection';
import { FaqSection } from './components/FaqSection';
import { Footer } from './components/Footer';
import { AuthModal } from './components/AuthModal';
import { FaqPage } from '../components/help/FaqPage';
import { TextScale, LanguageMode } from './types';

export type AuthMode = 'signin' | 'signup' | 'join';

export const LandingPage: React.FC = () => {
  const [textScale, setTextScale] = useState<TextScale>('normal');
  const [languageMode, setLanguageMode] = useState<LanguageMode>('en');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const [showFullFaq, setShowFullFaq] = useState(() => window.location.hash.replace('#', '') === 'faq-full');

  const handleOpenAuth = (mode: AuthMode) => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  const handleScrollToDemo = () => {
    document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' });
  };

  const closeFullFaq = () => {
    if (window.location.hash.replace('#', '') === 'faq-full') {
      history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    }
    setShowFullFaq(false);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('join') === '1') {
      setAuthMode('join');
      setIsAuthOpen(true);
    }

    const applyHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'faq-full') {
        setShowFullFaq(true);
        return;
      }
      setShowFullFaq(false);
      if (hash === 'faq' || hash === 'pricing' || hash === 'demo' || hash === 'features' || hash === 'calculator' || hash === 'how-it-works') {
        window.requestAnimationFrame(() => {
          document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
        });
      }
    };

    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, []);

  if (showFullFaq) {
    return <FaqPage onBack={closeFullFaq} />;
  }

  return (
    <div
      className={`landing-root min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 font-sans ${
        textScale === 'large' ? 'text-lg leading-relaxed' : 'text-base leading-normal'
      }`}
    >
      <Header
        textScale={textScale}
        setTextScale={setTextScale}
        languageMode={languageMode}
        setLanguageMode={setLanguageMode}
        onOpenAuth={handleOpenAuth}
        onOpenStoryModal={() => setIsStoryModalOpen(true)}
      />

      <main className="flex-1">
        <Hero
          textScale={textScale}
          languageMode={languageMode}
          onOpenAuth={handleOpenAuth}
          onOpenStoryModal={() => setIsStoryModalOpen(true)}
          onOpenDemo={handleScrollToDemo}
        />

        <StoryTutorialSection
          textScale={textScale}
          languageMode={languageMode}
          onOpenAuth={handleOpenAuth}
        />

        <FeatureModules
          textScale={textScale}
          languageMode={languageMode}
          onOpenAuth={handleOpenAuth}
        />

        <InteractiveLiveDemo
          textScale={textScale}
          languageMode={languageMode}
          onOpenAuth={handleOpenAuth}
        />

        <SavingsCalculator
          textScale={textScale}
          languageMode={languageMode}
          onOpenAuth={handleOpenAuth}
        />

        <PricingSection
          textScale={textScale}
          languageMode={languageMode}
          onOpenAuth={handleOpenAuth}
        />

        <FaqSection
          textScale={textScale}
          languageMode={languageMode}
          onOpenFullFaq={() => {
            window.location.hash = 'faq-full';
            setShowFullFaq(true);
          }}
        />
      </main>

      <Footer
        languageMode={languageMode}
        onOpenAuth={handleOpenAuth}
        onOpenStoryModal={() => setIsStoryModalOpen(true)}
      />

      <div className="fixed bottom-4 right-4 z-40 flex flex-col gap-2 items-end pb-[env(safe-area-inset-bottom)]">
        <a
          href="tel:09190036230"
          className="flex items-center gap-2 px-3.5 py-2.5 sm:px-4 sm:py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-full font-black text-sm shadow-xl shadow-emerald-700/30 transition-all cursor-pointer border-2 border-white"
          title="Call Manila Support Helpline"
        >
          <PhoneCall className="w-4 h-4" />
          <span className="hidden sm:inline">Owner Hotline: 0919-003-6230</span>
          <span className="sm:hidden">Call</span>
        </a>
      </div>

      <StoryTutorialModal
        isOpen={isStoryModalOpen}
        onClose={() => setIsStoryModalOpen(false)}
        textScale={textScale}
        languageMode={languageMode}
        onOpenAuth={handleOpenAuth}
      />

      <AuthModal
        isOpen={isAuthOpen}
        initialMode={authMode}
        onClose={() => setIsAuthOpen(false)}
        textScale={textScale}
        languageMode={languageMode}
      />
    </div>
  );
};
