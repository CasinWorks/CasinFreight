/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { FreightProvider, useFreight } from './context/FreightContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { TripBoard } from './components/trips/TripBoard';
import { TripExceptionsPage } from './components/trips/TripExceptionsPage';
import { NewTripModal } from './components/trips/NewTripModal';
import { TripDetailModal } from './components/trips/TripDetailModal';
import { InvoicePreviewModal } from './components/invoices/InvoicePreviewModal';
import { InvoiceList } from './components/invoices/InvoiceList';
import { FreightLedgerView } from './components/ledger/FreightLedgerView';
import { TruckRegistry } from './components/fleet/TruckRegistry';
import { DriverRegistry } from './components/fleet/DriverRegistry';
import { ClientRegistry } from './components/clients/ClientRegistry';
import { RateCardRegistry } from './components/ratecards/RateCardRegistry';
import { TruckBanRegistry } from './components/truckbans/TruckBanRegistry';
import { OwnerDashboard } from './components/dashboard/OwnerDashboard';
import { RbacManagementView } from './components/rbac/RbacManagementView';
import { OrgSetupModal } from './components/onboarding/OrgSetupModal';
import { ProfileModal } from './components/account/ProfileModal';
import { NotificationDrawer } from './components/notifications/NotificationDrawer';
import { LandingPage } from './landing/LandingPage';
import { BootSplash } from './components/auth/BootSplash';
import { Trip } from './types';
import { KanbanSquare, PlusCircle, Receipt, Truck, LayoutDashboard, Menu } from 'lucide-react';
import { AdminConsoleView } from './components/admin/AdminConsoleView';
import { UpgradeModal } from './components/billing/UpgradeModal';
import { PlatformNoticeGate, MaintenanceLockScreen } from './components/notices/PlatformNoticeGate';
import { TutorialProvider, useTutorial } from './components/tutorial';
import { HowToPage } from './components/help/HowToPage';
import { WorkspaceBackupModal } from './components/onboarding/WorkspaceBackupModal';
import { DriverFieldApp } from './components/driver/DriverFieldApp';
import { helpToolDestination } from './content/helpContent';
import { Analytics } from '@vercel/analytics/react';

function MainLayout() {
  const { canAccess, isOnboardingOpen, setIsOnboardingOpen, canCreateBooking, setIsUpgradeModalOpen, canManageBilling, canManageCompanyBilling } = useFreight();

  const [activeTab, setActiveTab] = useState<NavTab>('board');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNewTripOpen, setIsNewTripOpen] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [isOrgSetupOpen, setIsOrgSetupOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    if (isOnboardingOpen) {
      setIsOrgSetupOpen(true);
    }
  }, [isOnboardingOpen]);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Handle trip selection
  const handleSelectTrip = (trip: Trip) => {
    setSelectedTripId(trip.id);
  };

  const handleOpenInvoice = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
  };

  const openUpgradeOrNotify = () => {
    if (canManageCompanyBilling) {
      setIsUpgradeModalOpen(true);
      return;
    }
    window.alert('Plan limit reached. Ask the company Owner to upgrade or manage the subscription.');
  };

  const handleTabChange = (tab: NavTab) => {
    if (tab === 'orgsetup') {
      setIsOrgSetupOpen(true);
    } else if (tab === 'calculator') {
      if (!canCreateBooking) {
        openUpgradeOrNotify();
        return;
      }
      setIsNewTripOpen(true);
    } else {
      setActiveTab(tab);
    }
    setIsMobileMenuOpen(false);
  };

  const handleOpenHelpTool = (guideId: string) => {
    const destination = helpToolDestination(guideId);
    if (!destination) return;
    if (destination.kind === 'tab') {
      handleTabChange(destination.tab);
      return;
    }
    if (destination.action === 'profile') {
      setIsProfileOpen(true);
      return;
    }
    if (destination.action === 'notifications') {
      setIsNotificationDrawerOpen(true);
      return;
    }
    if (destination.action === 'backup') {
      setIsBackupOpen(true);
      return;
    }
    if (destination.action === 'billing') {
      if (canManageCompanyBilling) {
        setIsUpgradeModalOpen(true);
        return;
      }
      if (canManageBilling) {
        handleTabChange('admin');
        return;
      }
      window.alert('Only the company Owner can manage the subscription.');
    }
  };

  return (
    <TutorialProvider
      activeTab={activeTab}
      onNavigate={handleTabChange}
      onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
      isBlocked={isOrgSetupOpen || isOnboardingOpen || isProfileOpen}
    >
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans antialiased selection:bg-blue-500 selection:text-white office-mobile-shell">
      {/* Top Navigation */}
      <Navbar
        onOpenNewTrip={() => {
          if (!canCreateBooking) {
            openUpgradeOrNotify();
            return;
          }
          setIsNewTripOpen(true);
        }}
        onOpenOrgSetup={() => setIsOrgSetupOpen(true)}
        onOpenNotifications={() => setIsNotificationDrawerOpen(true)}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMobileMenuOpen={isMobileMenuOpen}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenHowTo={() => handleTabChange('help')}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      {/* Main Content Area with Responsive Sidebar */}
      <div className="flex-1 flex min-w-0 overflow-hidden relative">
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={handleTabChange}
          isMobileMenuOpen={isMobileMenuOpen}
          onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
          onOpenProfile={() => setIsProfileOpen(true)}
        />

        <main data-tutorial="main-workspace" className="flex-1 flex flex-col min-w-0 w-full overflow-hidden bg-[#F8FAFC] pb-[calc(5.25rem+env(safe-area-inset-bottom))] lg:pb-0">
          {activeTab === 'help' && (
            <HowToPage onOpenTool={handleOpenHelpTool} />
          )}

          {activeTab === 'board' && (
            <TripBoard
              onOpenNewTrip={() => {
                if (!canCreateBooking) {
                  openUpgradeOrNotify();
                  return;
                }
                setIsNewTripOpen(true);
              }}
              onSelectTrip={handleSelectTrip}
              onOpenInvoice={handleOpenInvoice}
              onOpenExceptions={() => handleTabChange('exceptions')}
              searchQuery={searchQuery}
            />
          )}

          {activeTab === 'exceptions' && (
            <TripExceptionsPage onSelectTrip={handleSelectTrip} />
          )}

          {activeTab === 'invoices' && (
            <InvoiceList
              onSelectInvoice={handleOpenInvoice}
              onSelectTrip={(tId) => setSelectedTripId(tId)}
            />
          )}

          {activeTab === 'ledger' && (
            <FreightLedgerView />
          )}

          {activeTab === 'trucks' && (
            <TruckRegistry />
          )}

          {activeTab === 'drivers' && (
            <DriverRegistry />
          )}

          {activeTab === 'clients' && (
            <ClientRegistry />
          )}

          {activeTab === 'ratecards' && (
            <RateCardRegistry />
          )}

          {activeTab === 'truckbans' && (
            <TruckBanRegistry />
          )}

          {activeTab === 'dashboard' && (
            <OwnerDashboard
              onSelectTrip={(tId) => setSelectedTripId(tId)}
              onSelectInvoice={handleOpenInvoice}
            />
          )}

          {activeTab === 'rbac' && (
            <RbacManagementView />
          )}

          {activeTab === 'admin' && canManageBilling && (
            <AdminConsoleView />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation — thumb-first, max 4 slots + Menu */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-1 pt-1 shadow-[0_-4px_16px_rgba(15,23,42,0.06)]"
        style={{ paddingBottom: 'max(0.35rem, env(safe-area-inset-bottom))' }}
        aria-label="Primary"
      >
        <div className="flex items-stretch justify-around gap-0.5 max-w-lg mx-auto">
          <button
            type="button"
            data-tutorial="nav-board"
            onClick={() => handleTabChange('board')}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-h-14 rounded-xl text-[11px] font-semibold touch-manipulation active:bg-slate-50 ${
              activeTab === 'board' ? 'text-blue-600' : 'text-slate-500'
            }`}
          >
            <KanbanSquare className="w-5 h-5" />
            <span>Trips</span>
          </button>

          {canAccess('new_trip') && (
            <button
              type="button"
              data-tutorial="new-load-btn"
              onClick={() => {
                if (!canCreateBooking) {
                  openUpgradeOrNotify();
                  return;
                }
                setIsNewTripOpen(true);
              }}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 min-h-14 rounded-xl text-[11px] font-bold text-blue-600 touch-manipulation active:bg-blue-50"
            >
              <div className="w-10 h-10 -mt-4 mb-0.5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md ring-4 ring-white">
                <PlusCircle className="w-5 h-5" />
              </div>
              <span>New</span>
            </button>
          )}

          {canAccess('invoice_manage') ? (
            <button
              type="button"
              data-tutorial="nav-invoices"
              onClick={() => handleTabChange('invoices')}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-h-14 rounded-xl text-[11px] font-semibold touch-manipulation active:bg-slate-50 ${
                activeTab === 'invoices' ? 'text-blue-600' : 'text-slate-500'
              }`}
            >
              <Receipt className="w-5 h-5" />
              <span>Billing</span>
            </button>
          ) : canAccess('dashboard') ? (
            <button
              type="button"
              data-tutorial="nav-dashboard"
              onClick={() => handleTabChange('dashboard')}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-h-14 rounded-xl text-[11px] font-semibold touch-manipulation active:bg-slate-50 ${
                activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-500'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>Home</span>
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-h-14 rounded-xl text-[11px] font-semibold touch-manipulation active:bg-slate-50 ${
              isMobileMenuOpen ? 'text-blue-600' : 'text-slate-500'
            }`}
          >
            <Menu className="w-5 h-5" />
            <span>Menu</span>
          </button>
        </div>
      </nav>

      {/* Modal Overlays */}
      <NewTripModal
        isOpen={isNewTripOpen}
        onClose={() => setIsNewTripOpen(false)}
        onTripCreated={(newTripId) => {
          setSelectedTripId(newTripId);
        }}
      />

      <TripDetailModal
        isOpen={!!selectedTripId}
        tripId={selectedTripId}
        onClose={() => setSelectedTripId(null)}
        onOpenInvoice={(invId) => {
          setSelectedTripId(null);
          setSelectedInvoiceId(invId);
        }}
      />

      <InvoicePreviewModal
        isOpen={!!selectedInvoiceId}
        invoiceId={selectedInvoiceId}
        onClose={() => setSelectedInvoiceId(null)}
      />

      <OrgSetupModal
        isOpen={isOrgSetupOpen}
        onClose={() => {
          setIsOrgSetupOpen(false);
          setIsOnboardingOpen(false);
        }}
      />

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onOpenOrgSetup={() => {
          setIsProfileOpen(false);
          setIsOrgSetupOpen(true);
        }}
      />

      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        onSelectTrip={(tripId) => setSelectedTripId(tripId)}
        onSelectInvoice={(invoiceId) => setSelectedInvoiceId(invoiceId)}
        onNavigateToDrivers={() => setActiveTab('drivers')}
      />

      <WorkspaceBackupModal isOpen={isBackupOpen} onClose={() => setIsBackupOpen(false)} />
    </div>
    <TutorialUpgradeGate />
    </TutorialProvider>
  );
}

function TutorialUpgradeGate() {
  const { isActive } = useTutorial();
  if (isActive) return null;
  return <UpgradeModal />;
}

function AppContent() {
  const { isAuthenticated, isAuthLoading, isPlatformAdmin, activeDowntime, isFieldDriverSession } = useFreight();

  if (isAuthLoading) {
    return <BootSplash />;
  }

  if (isAuthenticated && activeDowntime && !isPlatformAdmin) {
    return <MaintenanceLockScreen notice={activeDowntime} />;
  }

  if (!isAuthenticated) {
    return (
      <>
        <PlatformNoticeGate />
        {activeDowntime && (
          <div className="bg-amber-500 text-amber-950 text-center text-xs font-semibold px-4 py-2">
            CasinFreight is in downtime — {activeDowntime.title}. Team members cannot operate after sign-in. The platform owner can sign in to turn this off.
          </div>
        )}
        <LandingPage />
      </>
    );
  }

  if (isFieldDriverSession) {
    return (
      <>
        <PlatformNoticeGate />
        <DriverFieldApp />
      </>
    );
  }

  return (
    <>
      <PlatformNoticeGate />
      <MainLayout />
    </>
  );
}

export default function App() {
  return (
    <FreightProvider>
      <AppContent />
      <Analytics />
    </FreightProvider>
  );
}
