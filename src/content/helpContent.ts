import {
  FOUNDING_BASE_PHP,
  FOUNDING_INCLUDED_TRUCKS,
  FOUNDING_ROLLED_PHP,
  FOUNDING_STORAGE_GB,
  FREE_INCLUDED_TRUCKS,
  FREE_STORAGE_GB,
  FREE_TRIAL_MONTHS,
  LIST_BASE_PHP,
  LIST_INCLUDED_TRUCKS,
  STORAGE_EXTRA_GB_PHP,
  formatPhp,
  formatFoundingDeadline,
} from '../lib/subscriptionPrice';

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface HelpGuide {
  id: string;
  title: string;
  summary: string;
  steps: string[];
  tips?: string[];
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'what',
    question: 'What is CasinFreight in one sentence?',
    answer:
      'Software for a Philippine trucking company: office dispatch, billing, and ledger on the web, plus driver e-POD on the phone.',
  },
  {
    id: 'marketplace',
    question: 'Is this a marketplace where shippers post loads?',
    answer:
      'No. It is for one fleet and that fleet’s clients (billing / shipper records). Warehouse e-POD is signed on the driver’s phone at delivery — not a public load board.',
  },
  {
    id: 'trial',
    question: 'Can we try it before paying?',
    answer: `Yes. Free is a ${FREE_TRIAL_MONTHS}-month trial with ${FREE_INCLUDED_TRUCKS} trucks, 1 login, 10 trips, and ${FREE_STORAGE_GB} GB of photo storage. After the month, subscribe to keep dispatching.`,
  },
  {
    id: 'helper',
    question: 'How do we add a helper on the truck?',
    answer:
      'Open Drivers & Helpers → add a crew member as Helper / pahinante. Then edit the truck and assign Driver and Helper. New Load fills both from the truck.',
  },
  {
    id: 'helper-app',
    question: 'Does the helper use the phone app?',
    answer:
      'No. Only the licensed driver invited as role Driver uses the CasinFreight Driver app.',
  },
  {
    id: 'driver-login',
    question: 'How does the driver log in?',
    answer:
      'Invite them under Company with role Driver. CasinFreight adds or links them on the Driver Roster with that email. They sign in on the CasinFreight Driver app with email and password. There is no Google login.',
  },
  {
    id: 'client-portal',
    question: 'How does the shipper / warehouse sign e-POD?',
    answer:
      'The driver taps I have arrived (Inbound) at the gate, then hands the phone to the warehouse officer. They sign on the pad and type their full name and role. Office staff can also stamp e-POD on the website. There is no separate warehouse login.',
  },
  {
    id: 'tolls',
    question: 'Do you pull Easytrip / Autosweep automatically?',
    answer:
      'No. Tolls are rate-card estimates and reimbursements you record. The ledger has a Tolls & RFID account.',
  },
  {
    id: 'overweight',
    question: 'Is overweight per axle or DPWH weighbridge math?',
    answer:
      'Overweight is cargo kg versus that truck’s net payload (GVWR minus tare), with RA 8794 messaging. It is not an axle-by-axle calculator.',
  },
  {
    id: 'vat',
    question: 'Does billing handle VAT and EWT?',
    answer:
      'Yes. 12% VAT and 2% EWT are computed on the freight bill so your bookkeeper can review it. Attach proof of payment and the client’s Form 2307 when they pay. CasinFreight does not register, transmit, or certify invoices with BIR. This is not a Sales Invoice, Official Receipt, or CAS/PTU e-invoice.',
  },
  {
    id: 'free-seats',
    question: 'How many people can log in on Free?',
    answer:
      'One account and one role (Owner). Subscribe to invite dispatchers, billing, and drivers.',
  },
  {
    id: 'founding-year2',
    question: 'What happens after Founding’s first year?',
    answer: `Price becomes ${formatPhp(FOUNDING_ROLLED_PHP)}/month. You keep the ${FOUNDING_INCLUDED_TRUCKS}-truck allowance. You are not moved to List (List is ${LIST_INCLUDED_TRUCKS} trucks for new companies after the cutoff).`,
  },
  {
    id: 'pay',
    question: 'How do we pay?',
    answer:
      'In Revenue & plans, choose trucks and monthly or annual, then PayMongo checkout (GCash, Maya, card, QR Ph). Annual is 15% off. Extra trucks are ₱150/truck/month. Extra photo storage is ₱99/GB/month.',
  },
  {
    id: 'start',
    question: 'Where do we start?',
    answer:
      'casinfreight.com — create the company, or join with the invite link from the owner.',
  },
];

export const FEATURE_HIGHLIGHTS: { title: string; body: string }[] = [
  {
    title: 'Trip Board',
    body: 'Kanban of loads: Pending → Loaded → In Transit → Inbound → Delivered → Invoiced, plus On Hold / Cancelled.',
  },
  {
    title: 'New Load / Load Calculator',
    body: 'GVWR payload gauge, rate-card rates, fuel surcharge, toll estimate, multi-stop, and RA 8794 overweight vs net payload.',
  },
  {
    title: 'Trip file & e-POD',
    body: 'Waybill, seal, custody signatures. After Inbound, warehouse signs e-POD on the driver phone (or office stamps it on the web).',
  },
  {
    title: 'Invoices & ledger',
    body: '12% VAT + EWT calculator on freight bills. Attach the client’s Form 2307 when they pay. Dual-control void. Double-entry books, trial balance, AR, per-truck costs.',
  },
  {
    title: 'Fleet crew',
    body: 'Trucks with a licensed driver and a helper / pahinante. Drivers use the phone app; helpers stay on the roster.',
  },
  {
    title: 'Philippine ops',
    body: 'TIN, MMDA-style truck bans, LTO plates, PH truck types, fuel km/L, rate cards, shipper master.',
  },
];

export const HELP_GUIDES: HelpGuide[] = [
  {
    id: 'board',
    title: 'Trip Board',
    summary: 'See every load and move it through the pipeline.',
    steps: [
      'Open Trip Board. Each card is one booked trip.',
      'Use Kanban for the pipeline or List for a spreadsheet-style table.',
      'Filter by pickup date, destination, customer, truck, or stage in the bar under the stats. Order by pickup, delivery, booked date, trip #, customer, destination, or rate.',
      'Tap a card to open the trip file (waybill, seal, POD, invoice).',
      'Use New Load to book. Search the top bar for plate, client, or trip number.',
      'Export CSV from the board when you need a dispatch list.',
    ],
    tips: [
      'Statuses: Pending → Loaded → In Transit → Inbound (driver arrived) → Delivered → Invoiced.',
      'Holds and cancellations leave this board and live on Exceptions.',
    ],
  },
  {
    id: 'calculator',
    title: 'New Load / Load Calculator',
    summary: 'Book a trip with payload, rates, and crew already filled.',
    steps: [
      'Tap New Load (or Load Calculator in the sidebar).',
      'Pick the truck. Driver and helper fill from that truck if assigned.',
      'Choose shipper, origin, destination, cargo kg and CBM.',
      'Check the payload gauge. Overweight is cargo vs GVWR minus tare (RA 8794).',
      'Confirm rate (from your rate card), fuel surcharge, toll estimate, and extra stops.',
      'Save. The trip appears on the board as Pending.',
    ],
    tips: [
      'Add the shipper and rate card first if they are not in the list yet.',
      'Truck-ban windows show a warning if the corridor is restricted at pickup time.',
    ],
  },
  {
    id: 'tripfile',
    title: 'Trip file',
    summary: 'Run one load: status, seals, signatures, accessorials, invoice.',
    steps: [
      'Open a trip from the board.',
      'Advance status when each gate is ready (seal → yard release → In Transit).',
      'Driver taps I have arrived (Inbound). Then warehouse signs e-POD on the driver phone (name + role), or office stamps it here.',
      'Add accessorials (demurrage, overweight, helper crew, overnight, etc.) if they apply.',
      'Print or share the delivery note / waybill.',
      'When Delivered, create the invoice from this file or from Invoices.',
    ],
    tips: [
      'Owner / GM can request a status rollback if a stage was marked too early.',
      'There is no separate warehouse portal login — e-POD is on the driver phone or the web trip file.',
    ],
  },
  {
    id: 'exceptions',
    title: 'Exceptions',
    summary: 'Holds and cancellations stay off the happy-path board.',
    steps: [
      'Open Exceptions from the sidebar or the Trip Board link.',
      'On Hold: the truck is delayed (gate pass, congestion, checkpoint). Resume when ready.',
      'Cancelled: the load will not run. Pick a Philippine ops reason.',
      'Tap a card to open the trip file and resume or rebook.',
    ],
  },
  {
    id: 'invoices',
    title: 'Invoices & Billing',
    summary: 'Bill the shipper after delivery, then mark paid.',
    steps: [
      'Deliver the trip first. Unbilled deliveries show at the top of Invoices.',
      'Create the freight bill. VAT 12% and EWT (default 2%) are computed for your bookkeeper.',
      'Send it, then attach proof of payment and the client’s Form 2307 when they pay. The PDF is a billing aid, not an Official Receipt.',
      'Mark Paid to lock collections. Void or retract needs dual control (Owner).',
    ],
    tips: [
      'Invoice numbers and TIN come from Company setup and the shipper record. This is not a Sales Invoice, Official Receipt, or CAS/PTU e-invoice.',
    ],
  },
  {
    id: 'trucks',
    title: 'Trucks & Fuel',
    summary: 'Register units, assign crew, and log diesel.',
    steps: [
      'Tap Add New Truck. Enter plate, type, GVWR, tare, CBM.',
      'Assign a licensed driver and a helper on the truck record.',
      'Log Fuel Fill-Up with liters, pesos, odometer, and station.',
      'Open a truck to see km/L versus the target for that type.',
    ],
    tips: [
      `Free includes ${FREE_INCLUDED_TRUCKS} trucks. Paid plans add extras at ₱150/truck/month.`,
    ],
  },
  {
    id: 'drivers',
    title: 'Drivers & Helpers',
    summary: 'Roster licensed drivers and pahinante.',
    steps: [
      'Tap Add driver or helper.',
      'Drivers need LTO license number, restrictions, and expiry. Put the same email they will use on the phone app.',
      'Helpers can skip a license. Mark the role as Helper / pahinante.',
      'Assign them to a truck here or on the truck record.',
    ],
    tips: [
      'Helpers do not log in to the driver app.',
      'Invite the driver under Company with role Driver — the roster row is created or linked automatically.',
      'On web and phone, Drivers only see trips assigned to them on the roster.',
    ],
  },
  {
    id: 'driverapp',
    title: 'Driver phone app',
    summary: 'Seal photos and e-POD for the assigned driver only.',
    steps: [
      'Invite the person under Company → role Driver (roster syncs automatically).',
      'They install CasinFreight Driver and sign in with email and password.',
      'They only see trips assigned to them. They take seal photos, sign cargo handoff, and collect warehouse e-POD on the same phone after Inbound (hand the phone to the warehouse officer for name + role + signature).',
      'Office staff can also stamp e-POD on the website if needed.',
    ],
  },
  {
    id: 'truckbans',
    title: 'Truck Bans & Hours',
    summary: 'Warn dispatch when a corridor is restricted.',
    steps: [
      'Open Truck Bans & Hours.',
      'Seed Metro Manila presets or add your own place, coverage, and hours.',
      'New Load shows an alert if pickup time hits a live window.',
    ],
  },
  {
    id: 'ratecards',
    title: 'Rate Card Matrix',
    summary: 'Save origin → destination prices so New Load fills the rate.',
    steps: [
      'Add a rate card: origin zone, destination, truck type, base rate, toll estimate, lead hours.',
      'Book a matching trip. The calculator suggests that rate.',
      'Edit a card when diesel or tolls change; new trips pick up the new number.',
    ],
  },
  {
    id: 'clients',
    title: 'Shippers & Clients',
    summary: 'Client master for billing and invoices.',
    steps: [
      'Add the shipper: legal name, TIN, billing address, contacts, payment terms.',
      'Pick that shipper on New Load.',
      'Invoices pull TIN and terms from this record.',
      'Warehouse e-POD is signed on the driver’s phone at delivery (or by office on the web).',
    ],
  },
  {
    id: 'ledger',
    title: 'General Ledger',
    summary: 'Double-entry books for the fleet.',
    steps: [
      'Open General Ledger for journal, trial balance, P&L, and AR.',
      'Post a Journal Voucher for expenses not auto-created from trips (PMS, wages).',
      'Fuel, RFID/tolls, and invoice activity post into the chart of accounts.',
      'Print or export when you need a bookkeeper copy (not a BIR-filed book).',
    ],
  },
  {
    id: 'dashboard',
    title: 'Owner Dashboard',
    summary: 'Profit, utilization, aging, and flags at a glance.',
    steps: [
      'Open Owner Dashboard at the top of the sidebar.',
      'Switch This Month / Quarter / Year.',
      'Tap a trip or invoice card to jump to the file.',
    ],
    tips: ['Cards stay at zero until you have trips and invoices.'],
  },
  {
    id: 'rbac',
    title: 'Roles & permissions',
    summary: 'Invite staff and lock down what each role can do.',
    steps: [
      'Open Roles & permissions.',
      'Invite by email and pick a role (Dispatcher, Billing, Driver, custom).',
      'Remove a teammate from this company when they should no longer have access. They can be invited again later.',
      'If Remove takes them off the roster but their login is still tied here, use Untie login on that same tab.',
      'Edit a role’s permission matrix. Changes apply immediately.',
      'Read the audit log when you need to see who changed access.',
    ],
    tips: ['Free includes one Owner seat. Subscribe to add more accounts.'],
  },
  {
    id: 'profile',
    title: 'My profile',
    summary: 'Your photo, name, mobile, and account delete.',
    steps: [
      'Open My profile from your name in the top bar or the account block in the sidebar.',
      'Change your photo, name, mobile, and department. Email and role stay as they are.',
      'Save profile.',
      'Delete account permanently only if you are not the only Owner. Type your email, DELETE, and your password.',
    ],
    tips: [
      'The only Owner must delete the company in Company setup, or assign another Owner first.',
    ],
  },
  {
    id: 'orgsetup',
    title: 'Company setup',
    summary: 'TIN, address, first truck, and invites.',
    steps: [
      'Open Org Setup (top bar) or Company in the sidebar.',
      'Save legal name, TIN, address, and contact — these print on invoices and waybills.',
      'Invite teammates. Drivers also need a matching roster email.',
      'Optionally add the first truck and a default rate card from the wizard.',
    ],
  },
  {
    id: 'billing',
    title: 'Plans & PayMongo',
    summary: 'Subscribe, add trucks, or buy extra photo storage.',
    steps: [
      'Tap the plan badge in the top bar, or Revenue & plans in the account menu.',
      'Choose truck count and monthly or annual (15% off).',
      'Pay with GCash, Maya, card, or QR Ph.',
      'Add extra GB if seal/POD photos are filling the cap.',
    ],
    tips: [
      `Founding is ${formatPhp(FOUNDING_BASE_PHP)}/mo with ${FOUNDING_INCLUDED_TRUCKS} trucks until ${formatFoundingDeadline()}. After year 1: ${formatPhp(FOUNDING_ROLLED_PHP)}/mo, keep ${FOUNDING_INCLUDED_TRUCKS} trucks.`,
      `After the cutoff, new paid companies pay List ${formatPhp(LIST_BASE_PHP)}/mo with ${LIST_INCLUDED_TRUCKS} trucks included.`,
      `Photo storage: Free ${FREE_STORAGE_GB} GB, paid ${FOUNDING_STORAGE_GB} GB, extra ${formatPhp(STORAGE_EXTRA_GB_PHP)}/GB/month.`,
    ],
  },
  {
    id: 'notifications',
    title: 'Notifications',
    summary: 'Ops alerts for overdue invoices and license expiry.',
    steps: [
      'Tap the bell in the top bar.',
      'Open an alert to jump to the trip, invoice, or driver.',
    ],
  },
  {
    id: 'backup',
    title: 'Backup & restore',
    summary: 'Owners can export or restore the workspace.',
    steps: [
      'Open the account menu at the bottom of the sidebar.',
      'Tap Backup & restore.',
      'Download a snapshot or restore from a previous weekly backup.',
    ],
  },
];

export function guideById(id: string): HelpGuide | undefined {
  return HELP_GUIDES.find((guide) => guide.id === id);
}

/** Sidebar tabs How to can jump into (matches NavTab except help). */
export type HelpNavTab =
  | 'board'
  | 'exceptions'
  | 'calculator'
  | 'invoices'
  | 'ledger'
  | 'trucks'
  | 'drivers'
  | 'clients'
  | 'ratecards'
  | 'truckbans'
  | 'dashboard'
  | 'rbac'
  | 'orgsetup'
  | 'admin';

export type HelpToolAction = 'profile' | 'notifications' | 'backup' | 'billing';

export type HelpToolDestination =
  | { kind: 'tab'; tab: HelpNavTab }
  | { kind: 'action'; action: HelpToolAction };

/**
 * Where “Open this tool” goes from How to use CasinFreight.
 * tripfile → Trip Board (needs a specific trip). driverapp highlights e-POD on the board.
 */
const HELP_TOOL_DESTINATIONS: Record<string, HelpToolDestination> = {
  board: { kind: 'tab', tab: 'board' },
  tripfile: { kind: 'tab', tab: 'board' },
  exceptions: { kind: 'tab', tab: 'exceptions' },
  calculator: { kind: 'tab', tab: 'calculator' },
  invoices: { kind: 'tab', tab: 'invoices' },
  trucks: { kind: 'tab', tab: 'trucks' },
  drivers: { kind: 'tab', tab: 'drivers' },
  truckbans: { kind: 'tab', tab: 'truckbans' },
  ratecards: { kind: 'tab', tab: 'ratecards' },
  clients: { kind: 'tab', tab: 'clients' },
  ledger: { kind: 'tab', tab: 'ledger' },
  dashboard: { kind: 'tab', tab: 'dashboard' },
  rbac: { kind: 'tab', tab: 'rbac' },
  orgsetup: { kind: 'tab', tab: 'orgsetup' },
  driverapp: { kind: 'tab', tab: 'board' },
  profile: { kind: 'action', action: 'profile' },
  billing: { kind: 'action', action: 'billing' },
  notifications: { kind: 'action', action: 'notifications' },
  backup: { kind: 'action', action: 'backup' },
};

/** Map How-to guide ids → guided tour step ids for spotlight highlighting. */
const GUIDE_TO_TUTORIAL_STEP: Record<string, string> = {
  help: 'help',
  board: 'trip-board',
  tripfile: 'epod',
  driverapp: 'epod',
  exceptions: 'exceptions',
  calculator: 'new-load',
  invoices: 'invoices',
  trucks: 'trucks',
  drivers: 'drivers',
  truckbans: 'bans',
  ratecards: 'rates',
  clients: 'clients',
  ledger: 'ledger',
  dashboard: 'dashboard',
  rbac: 'rbac',
  orgsetup: 'org',
  notifications: 'notifications',
  billing: 'plan',
};

export function helpToolDestination(guideId: string): HelpToolDestination | null {
  return HELP_TOOL_DESTINATIONS[guideId] || null;
}

export function tutorialStepForGuide(guideId: string): string | null {
  return GUIDE_TO_TUTORIAL_STEP[guideId] || null;
}
