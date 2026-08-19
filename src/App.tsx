/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { FreightProvider, useFreight } from './context/FreightContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { TripBoard } from './components/trips/TripBoard';
import { NewTripModal } from './components/trips/NewTripModal';
import { TripDetailModal } from './components/trips/TripDetailModal';
import { InvoicePreviewModal } from './components/invoices/InvoicePreviewModal';
import { InvoiceList } from './components/invoices/InvoiceList';
import { FreightLedgerView } from './components/ledger/FreightLedgerView';
import { TruckRegistry } from './components/fleet/TruckRegistry';
import { DriverRegistry } from './components/fleet/DriverRegistry';
import { RateCardRegistry } from './components/ratecards/RateCardRegistry';
import { OwnerDashboard } from './components/dashboard/OwnerDashboard';
import { RbacManagementView } from './components/rbac/RbacManagementView';
import { OrgSetupModal } from './components/onboarding/OrgSetupModal';
import { NotificationDrawer } from './components/notifications/NotificationDrawer';
import { LoginPage } from './components/auth/LoginPage';
import { Trip } from './types';
import { KanbanSquare, PlusCircle, Receipt, Truck, LayoutDashboard, Menu } from 'lucide-react';
import { AdminSubscriptionsView } from './components/admin/AdminSubscriptionsView';
import { UpgradeModal } from './components/billing/UpgradeModal';
import { TutorialProvider, useTutorial } from './components/tutorial';

function MainLayout() {
  const { canAccess, isOnboardingOpen, setIsOnboardingOpen, canCreateBooking, setIsUpgradeModalOpen, canManageBilling } = useFreight();

  const [activeTab, setActiveTab] = useState<NavTab>('board');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNewTripOpen, setIsNewTripOpen] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [isOrgSetupOpen, setIsOrgSetupOpen] = useState(false);

  useEffect(() => {
    if (isOnboardingOpen) {
      setIsOrgSetupOpen(true);
    }
  }, [isOnboardingOpen]);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Handle trip selection
  const handleSelectTrip = (trip: Trip) => {
    setSelectedTripId(trip.id);
  };

  const handleOpenInvoice = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
  };

  const handleTabChange = (tab: NavTab) => {
    if (tab === 'orgsetup') {
      setIsOrgSetupOpen(true);
    } else if (tab === 'calculator') {
      if (!canCreateBooking) {
        setIsUpgradeModalOpen(true);
        return;
      }
      setIsNewTripOpen(true);
    } else {
      setActiveTab(tab);
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <TutorialProvider
      activeTab={activeTab}
      onNavigate={handleTabChange}
      onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
      isBlocked={isOrgSetupOpen || isOnboardingOpen}
    >
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans antialiased selection:bg-blue-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        onOpenNewTrip={() => {
          if (!canCreateBooking) {
            setIsUpgradeModalOpen(true);
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
      />

      {/* Main Content Area with Responsive Sidebar */}
      <div className="flex-1 flex min-w-0 overflow-hidden relative">
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={handleTabChange}
          isMobileMenuOpen={isMobileMenuOpen}
          onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
        />

        <main data-tutorial="main-workspace" className="flex-1 flex flex-col min-w-0 w-full overflow-hidden bg-[#F8FAFC] pb-16 lg:pb-0">
          {activeTab === 'board' && (
            <TripBoard
              onOpenNewTrip={() => {
                if (!canCreateBooking) {
                  setIsUpgradeModalOpen(true);
                  return;
                }
                setIsNewTripOpen(true);
              }}
              onSelectTrip={handleSelectTrip}
              onOpenInvoice={handleOpenInvoice}
              searchQuery={searchQuery}
            />
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

          {activeTab === 'ratecards' && (
            <RateCardRegistry />
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
            <AdminSubscriptionsView />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar for rapid thumb access */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-1.5 flex items-center justify-around shadow-lg">
        <button
          data-tutorial="nav-board"
          onClick={() => handleTabChange('board')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors ${
            activeTab === 'board' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <KanbanSquare className="w-5 h-5" />
          <span>Trips</span>
        </button>

        {canAccess('new_trip') && (
          <button
            data-tutorial="new-load-btn"
            onClick={() => {
              if (!canCreateBooking) {
                setIsUpgradeModalOpen(true);
                return;
              }
              setIsNewTripOpen(true);
            }}
            className="flex flex-col items-center gap-0.5 py-1 px-2 text-blue-600 hover:text-blue-700 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center -mt-3 shadow-md">
              <PlusCircle className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold">New Load</span>
          </button>
        )}

        {canAccess('invoice_manage') && (
          <button
            data-tutorial="nav-invoices"
            onClick={() => handleTabChange('invoices')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors ${
              activeTab === 'invoices' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Receipt className="w-5 h-5" />
            <span>Billing</span>
          </button>
        )}

        {canAccess('truck_crud') && (
          <button
            data-tutorial="nav-trucks"
            onClick={() => handleTabChange('trucks')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors ${
              activeTab === 'trucks' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Truck className="w-5 h-5" />
            <span>Fleet</span>
          </button>
        )}

        {canAccess('dashboard') && (
          <button
            data-tutorial="nav-dashboard"
            onClick={() => handleTabChange('dashboard')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors ${
              activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Dashboard</span>
          </button>
        )}

        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors ${
            isMobileMenuOpen ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Menu className="w-5 h-5" />
          <span>Menu</span>
        </button>
      </div>

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

      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        onSelectTrip={(tripId) => setSelectedTripId(tripId)}
        onSelectInvoice={(invoiceId) => setSelectedInvoiceId(invoiceId)}
        onNavigateToDrivers={() => setActiveTab('drivers')}
      />
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
  const { isAuthenticated, isAuthLoading } = useFreight();

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-medium">Connecting to Firebase…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <>
      <MainLayout />
    </>
  );
}

export default function App() {
  return (
    <FreightProvider>
      <AppContent />
    </FreightProvider>
  );
}
