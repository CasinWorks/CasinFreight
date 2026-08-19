import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useFreight } from '../../context/FreightContext';
import { TutorialOverlay } from './TutorialOverlay';
import { tutorialSteps, type TutorialStep } from './tutorialSteps';
import type { NavTab } from '../layout/Sidebar';

interface TutorialContextValue {
  isActive: boolean;
  stepIndex: number;
  stepCount: number;
  currentStep: TutorialStep | null;
  startTutorial: () => void;
  next: () => void;
  back: () => void;
  skip: () => void;
}

const TutorialContext = createContext<TutorialContextValue | undefined>(undefined);

interface TutorialProviderProps {
  children: React.ReactNode;
  activeTab: NavTab;
  onNavigate: (tab: NavTab) => void;
  onOpenMobileMenu?: () => void;
  isBlocked?: boolean;
}

export const TutorialProvider: React.FC<TutorialProviderProps> = ({
  children,
  activeTab,
  onNavigate,
  onOpenMobileMenu,
  isBlocked = false,
}) => {
  const { currentUser, isAuthenticated, trips, trucks, drivers, invoices, markTutorialSeen } = useFreight();
  const [isActive, setIsActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [hasAutoStarted, setHasAutoStarted] = useState(false);

  const currentStep = isActive ? tutorialSteps[stepIndex] ?? null : null;

  const finish = useCallback(() => {
    setIsActive(false);
    setStepIndex(0);
    markTutorialSeen();
  }, [markTutorialSeen]);

  const startTutorial = useCallback(() => {
    setStepIndex(0);
    setIsActive(true);
    onNavigate('board');
  }, [onNavigate]);

  const next = useCallback(() => {
    if (stepIndex >= tutorialSteps.length - 1) {
      finish();
      return;
    }
    setStepIndex((index) => index + 1);
  }, [finish, stepIndex]);

  const back = useCallback(() => {
    setStepIndex((index) => Math.max(0, index - 1));
  }, []);

  const skip = useCallback(() => {
    finish();
  }, [finish]);

  useEffect(() => {
    if (!isAuthenticated || !currentUser.id || hasAutoStarted || isBlocked || isActive) return;
    if (currentUser.has_seen_tutorial) return;
    const timer = window.setTimeout(() => {
      setHasAutoStarted(true);
      startTutorial();
    }, 500);
    return () => window.clearTimeout(timer);
  }, [isAuthenticated, currentUser.id, currentUser.has_seen_tutorial, hasAutoStarted, isBlocked, isActive, startTutorial]);

  useEffect(() => {
    if (!isActive || !currentStep?.tab) return;
    if (currentStep.tab !== activeTab && currentStep.tab !== 'orgsetup' && currentStep.tab !== 'calculator') {
      onNavigate(currentStep.tab);
    }
    if (window.innerWidth < 1024 && currentStep.target.includes('nav-')) {
      onOpenMobileMenu?.();
    }
  }, [isActive, currentStep, activeTab, onNavigate, onOpenMobileMenu]);

  const datasetEmpty = useMemo(() => {
    if (!currentStep?.requires) return false;
    if (currentStep.requires === 'trips') return trips.length === 0;
    if (currentStep.requires === 'trucks') return trucks.length === 0;
    if (currentStep.requires === 'drivers') return drivers.length === 0;
    if (currentStep.requires === 'invoices') return invoices.length === 0;
    return false;
  }, [currentStep, trips.length, trucks.length, drivers.length, invoices.length]);

  const value = useMemo(
    () => ({
      isActive,
      stepIndex,
      stepCount: tutorialSteps.length,
      currentStep,
      startTutorial,
      next,
      back,
      skip,
    }),
    [isActive, stepIndex, currentStep, startTutorial, next, back, skip]
  );

  return (
    <TutorialContext.Provider value={value}>
      {children}
      <TutorialOverlay
        isActive={isActive}
        step={currentStep}
        stepIndex={stepIndex}
        stepCount={tutorialSteps.length}
        datasetEmpty={datasetEmpty}
        onNext={next}
        onBack={back}
        onSkip={skip}
      />
    </TutorialContext.Provider>
  );
};

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
}
