import type { NavTab } from '../layout/Sidebar';

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
    id: 'trip-board',
    target: '[data-tutorial="nav-board"]',
    title: 'Your trips live here',
    body: 'This board is the home screen for every load you dispatch.',
    placement: 'right',
    tab: 'board',
    requires: 'trips',
    emptyFallback: {
      title: 'Your trips will show up here',
      body: 'Nothing is booked yet — that is normal for a new company.',
      target: '[data-tutorial="trip-board"]',
    },
  },
  {
    id: 'new-load',
    target: '[data-tutorial="new-load-btn"]',
    title: 'Start a trip',
    body: 'Tap New Load when you are ready to book a truck.',
    placement: 'bottom',
  },
  {
    id: 'drivers',
    target: '[data-tutorial="nav-drivers"]',
    title: 'Drivers',
    body: 'Add your drivers and see who is assigned to a trip.',
    placement: 'right',
    tab: 'drivers',
    requires: 'drivers',
    emptyFallback: {
      title: 'Add your first driver',
      body: 'The roster is empty until you add someone. Tap Add Driver when you are ready.',
      target: '[data-tutorial="drivers-page"]',
    },
  },
  {
    id: 'trucks',
    target: '[data-tutorial="nav-trucks"]',
    title: 'Trucks',
    body: 'Register each truck and keep fuel logs in one place.',
    placement: 'right',
    tab: 'trucks',
    requires: 'trucks',
    emptyFallback: {
      title: 'Add your first truck',
      body: 'Free plans include one truck. Tap Add New Truck to register it.',
      target: '[data-tutorial="trucks-page"]',
    },
  },
  {
    id: 'invoices',
    target: '[data-tutorial="nav-invoices"]',
    title: 'Billing',
    body: 'Send invoices and mark payments after a trip is delivered.',
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
    body: 'Track fuel, payouts, and other expenses in your books.',
    placement: 'right',
    tab: 'ledger',
  },
  {
    id: 'rates',
    target: '[data-tutorial="nav-ratecards"]',
    title: 'Rates',
    body: 'Save origin-to-destination prices so new trips fill in the rate for you.',
    placement: 'right',
    tab: 'ratecards',
  },
  {
    id: 'dashboard',
    target: '[data-tutorial="nav-dashboard"]',
    title: 'Dashboard',
    body: 'See profit, trip volume, and fleet health at a glance.',
    placement: 'right',
    tab: 'dashboard',
  },
  {
    id: 'rbac',
    target: '[data-tutorial="nav-rbac"]',
    title: 'Team access',
    body: 'Invite staff and control what each role can do. Free plans include one account.',
    placement: 'right',
    tab: 'rbac',
  },
  {
    id: 'plan',
    target: '[data-tutorial="plan-badge"]',
    title: 'Your plan',
    body: 'Free includes 1 truck, 1 account, and 10 trips. Upgrade here when you need more.',
    placement: 'bottom',
  },
  {
    id: 'ready',
    target: '[data-tutorial="new-load-btn"]',
    title: 'You are ready',
    body: 'Tap New Load to book your first trip, or press Finish to explore on your own.',
    placement: 'bottom',
    tab: 'board',
    finishOnClick: true,
  },
];
