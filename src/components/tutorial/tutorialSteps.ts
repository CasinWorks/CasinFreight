import type { NavTab } from '../layout/Sidebar';
import { FREE_INCLUDED_TRUCKS, FREE_TRIAL_MONTHS } from '../../lib/subscriptionPrice';

export type TutorialPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface TutorialStep {
  id: string;
  target: string;
  title: string;
  body: string;
  placement: TutorialPlacement;
  tab?: NavTab;
  /** If the target is missing or this dataset is empty, use this copy and fallbackTarget. */
  requires?: 'trips' | 'trucks' | 'drivers' | 'invoices';
  emptyFallback?: {
    title: string;
    body: string;
    target?: string;
  };
  /** Clicking the target finishes the tour instead of going to the next step. */
  finishOnClick?: boolean;
}

export const tutorialSteps: TutorialStep[] = [
  {
    id: 'help',
    target: '[data-tutorial="nav-help"]',
    title: 'How to is always here',
    body: 'Open How to any time for step-by-step on every screen. Tap “Open this tool” on a guide to jump there with this highlight.',
    placement: 'right',
    tab: 'help',
  },
  {
    id: 'org',
    target: '[data-tutorial="org-setup-btn"]',
    title: 'Company first',
    body: 'Save legal name, TIN, and address. Those print on invoices and waybills.',
    placement: 'bottom',
  },
  {
    id: 'clients',
    target: '[data-tutorial="nav-clients"]',
    title: 'Shippers',
    body: 'Add each client with TIN and payment terms before you book. Warehouse e-POD is signed on the driver’s phone at delivery — no separate warehouse login.',
    placement: 'right',
    tab: 'clients',
  },
  {
    id: 'rates',
    target: '[data-tutorial="nav-ratecards"]',
    title: 'Rates',
    body: 'Save origin-to-destination prices so New Load fills the rate for you. Tolls here are estimates, not live Easytrip.',
    placement: 'right',
    tab: 'ratecards',
  },
  {
    id: 'drivers',
    target: '[data-tutorial="nav-drivers"]',
    title: 'Drivers & helpers',
    body: 'Licensed drivers use the phone app (same email as the invite). After Inbound they hand the phone to the warehouse officer for e-POD. Helpers / pahinante stay on the roster and do not log in.',
    placement: 'right',
    tab: 'drivers',
    requires: 'drivers',
    emptyFallback: {
      title: 'Add your first driver',
      body: 'Add a licensed driver, then a helper if the truck runs with a pahinante.',
      target: '[data-tutorial="drivers-page"]',
    },
  },
  {
    id: 'trucks',
    target: '[data-tutorial="nav-trucks"]',
    title: 'Trucks & fuel',
    body: 'Register plate, GVWR, and tare. Assign driver and helper. Log diesel for km/L.',
    placement: 'right',
    tab: 'trucks',
    requires: 'trucks',
    emptyFallback: {
      title: 'Add your first truck',
      body: `Free includes up to ${FREE_INCLUDED_TRUCKS} trucks for ${FREE_TRIAL_MONTHS} month. Tap Add New Truck.`,
      target: '[data-tutorial="trucks-page"]',
    },
  },
  {
    id: 'bans',
    target: '[data-tutorial="nav-truckbans"]',
    title: 'Truck bans',
    body: 'Record MMDA-style hours. New Load warns you if pickup hits a live window.',
    placement: 'right',
    tab: 'truckbans',
  },
  {
    id: 'new-load',
    target: '[data-tutorial="new-load-btn"]',
    title: 'Book a trip',
    body: 'New Load is the calculator: payload vs GVWR, rate card, fuel surcharge, extra stops.',
    placement: 'bottom',
  },
  {
    id: 'trip-board',
    target: '[data-tutorial="nav-board"]',
    title: 'Trip Board',
    body: 'Pending → Loaded → In Transit → Inbound → Delivered → Invoiced. Open a card for seal, waybill, and office e-POD if needed.',
    placement: 'right',
    tab: 'board',
    requires: 'trips',
    emptyFallback: {
      title: 'Your trips will show up here',
      body: 'Nothing is booked yet — that is normal. Tap New Load after the truck and shipper exist.',
      target: '[data-tutorial="trip-board"]',
    },
  },
  {
    id: 'epod',
    target: '[data-tutorial="nav-board"]',
    title: 'Warehouse e-POD',
    body: 'Driver taps I have arrived (Inbound), then hands the phone to the warehouse officer for signature, name, and role. Office can still stamp e-POD from a trip card on the web.',
    placement: 'right',
    tab: 'board',
  },
  {
    id: 'exceptions',
    target: '[data-tutorial="nav-exceptions"]',
    title: 'Exceptions',
    body: 'Holds and cancellations leave the board so dispatch stays on the happy path. Resume a hold from here.',
    placement: 'right',
    tab: 'exceptions',
  },
  {
    id: 'invoices',
    target: '[data-tutorial="nav-invoices"]',
    title: 'Billing',
    body: 'Bill after delivery. 12% VAT and 2% EWT are computed for your bookkeeper. Attach proof of payment and the client’s Form 2307, then mark Paid.',
    placement: 'right',
    tab: 'invoices',
    requires: 'invoices',
    emptyFallback: {
      title: 'Invoices appear after trips',
      body: 'Bill a customer from a delivered trip. This list stays empty until then.',
      target: '[data-tutorial="invoices-page"]',
    },
  },
  {
    id: 'ledger',
    target: '[data-tutorial="nav-ledger"]',
    title: 'Ledger',
    body: 'Double-entry books. Fuel and invoices post automatically. Use a journal voucher for PMS and wages.',
    placement: 'right',
    tab: 'ledger',
  },
  {
    id: 'dashboard',
    target: '[data-tutorial="nav-dashboard"]',
    title: 'Dashboard',
    body: 'Owner view: utilization, collections aging, overweight and demurrage flags.',
    placement: 'right',
    tab: 'dashboard',
  },
  {
    id: 'rbac',
    target: '[data-tutorial="nav-rbac"]',
    title: 'Team access',
    body: 'Invite staff and lock what each role can do. Free includes one Owner account.',
    placement: 'right',
    tab: 'rbac',
  },
  {
    id: 'notifications',
    target: '[data-tutorial="notifications-btn"]',
    title: 'Alerts',
    body: 'The bell lists license expiry and collections. Tap an alert to jump there.',
    placement: 'bottom',
  },
  {
    id: 'plan',
    target: '[data-tutorial="plan-badge"]',
    title: 'Your plan',
    body: `Free is a ${FREE_TRIAL_MONTHS}-month trial: up to ${FREE_INCLUDED_TRUCKS} trucks, 1 account, and 10 trips. Upgrade here when you need more.`,
    placement: 'bottom',
  },
  {
    id: 'ready',
    target: '[data-tutorial="new-load-btn"]',
    title: 'You are ready',
    body: 'Tap New Load to book, or Finish and use How to whenever you get stuck. Each How to guide can open that screen with this highlight.',
    placement: 'bottom',
    tab: 'board',
    finishOnClick: true,
  },
];

export function tutorialStepIndexById(stepId: string): number {
  const index = tutorialSteps.findIndex((step) => step.id === stepId);
  return index >= 0 ? index : 0;
}
