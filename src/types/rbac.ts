export type PermissionCategory = 
  | 'operations'
  | 'fleet'
  | 'fuel'
  | 'billing'
  | 'ledger'
  | 'tariffs'
  | 'admin';

export interface RbacPermission {
  id: string;
  name: string;
  description: string;
  category: PermissionCategory;
}

export interface RbacRole {
  id: string;
  name: string;
  description: string;
  color: 'blue' | 'purple' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'cyan' | 'slate' | 'orange';
  isSystem: boolean;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RbacAuditEntry {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: string;
  action: 'ROLE_CREATED' | 'ROLE_UPDATED' | 'ROLE_DELETED' | 'USER_ROLE_ASSIGNED' | 'PERMISSIONS_RESET' | 'DB_IMPORTED';
  targetRole?: string;
  targetUser?: string;
  details: string;
}

export const SYSTEM_PERMISSIONS: RbacPermission[] = [
  // Operations & Trips
  {
    id: 'trips.view',
    name: 'View Trip Board & Waybills',
    description: 'View active trip kanban board, waybill list, and shipment details.',
    category: 'operations',
  },
  {
    id: 'trips.create',
    name: 'Book & Create New Shipments',
    description: 'Create new freight bookings, generate waybills, and specify cargo payload.',
    category: 'operations',
  },
  {
    id: 'trips.edit',
    name: 'Edit Trip Specifications',
    description: 'Modify delivery routes, pickup windows, cargo weight, and accessorial fees.',
    category: 'operations',
  },
  {
    id: 'trips.delete',
    name: 'Cancel & Delete Trips',
    description: 'Executive authority to cancel confirmed shipments or purge trip records.',
    category: 'operations',
  },
  {
    id: 'trips.reassign_fleet',
    name: 'Assign & Reassign Fleet / Driver',
    description: 'Allocate or swap trucks, drivers, and chassis on active shipments.',
    category: 'operations',
  },
  {
    id: 'trips.status_pending',
    name: 'Set Status: Pending',
    description: 'Reset or initialize shipment to Pending dispatch status.',
    category: 'operations',
  },
  {
    id: 'trips.status_loaded',
    name: 'Set Status: Loaded (Weighbridge)',
    description: 'Certify cargo loading, weighbridge tare weight, and container seal number.',
    category: 'operations',
  },
  {
    id: 'trips.status_in_transit',
    name: 'Set Status: In Transit (Dispatch)',
    description: 'Authorize departure from terminal dock and issue official Delivery Note.',
    category: 'operations',
  },
  {
    id: 'trips.status_delivered',
    name: 'Set Status: Delivered (Digital POD)',
    description: 'Record delivery completion, receiver condition report, and capture e-signature.',
    category: 'operations',
  },
  {
    id: 'trips.status_invoiced',
    name: 'Set Status: Invoiced',
    description: 'Verify transport deliverables and move the shipment to billing.',
    category: 'operations',
  },
  {
    id: 'trips.status_retract_approve',
    name: 'Approve Shipment Status Rollback',
    description: 'Owner / General Manager clearance to move a shipment backward after reviewing the written reason.',
    category: 'operations',
  },

  // Fleet & Assets
  {
    id: 'fleet.view',
    name: 'View Truck Registry',
    description: 'View list of fleet assets, GVWR capacity, tare weight, and maintenance notes.',
    category: 'fleet',
  },
  {
    id: 'fleet.crud',
    name: 'Manage Trucks & Units (CRUD)',
    description: 'Register new trucks, update plate numbers, edit GVWR specs, and remove assets.',
    category: 'fleet',
  },
  {
    id: 'drivers.view',
    name: 'View Driver Roster',
    description: 'View driver profiles, contact details, assigned trucks, and trip performance.',
    category: 'fleet',
  },
  {
    id: 'drivers.crud',
    name: 'Manage Driver Profiles (CRUD)',
    description: 'Register drivers, update LTO restriction codes, and manage medical clearances.',
    category: 'fleet',
  },
  {
    id: 'drivers.approve',
    name: 'Approve & Clear Drivers',
    description: 'Formally certify driver onboarding and safety compliance.',
    category: 'fleet',
  },

  // Fuel Tracking & Expense
  {
    id: 'fuel.view',
    name: 'View Fuel Analytics & KM/L Logs',
    description: 'Access fleet fuel consumption charts, cost per km, and efficiency leaderboard.',
    category: 'fuel',
  },
  {
    id: 'fuel.log',
    name: 'Log Fuel Fill-Ups',
    description: 'Record fuel station pump receipts, liters pumped, odometer readings, and payment method.',
    category: 'fuel',
  },
  {
    id: 'fuel.delete',
    name: 'Delete Fuel Audit Logs',
    description: 'Remove erroneous or duplicated fuel transaction records from audit books.',
    category: 'fuel',
  },

  // Billing & VAT/EWT
  {
    id: 'invoices.view',
    name: 'View Invoices & Billing Register',
    description: 'View freight bills, 12% VAT computations, and payment status.',
    category: 'billing',
  },
  {
    id: 'invoices.create',
    name: 'Create freight bills',
    description: 'Itemize freight charges, toll surcharges, demurrage, and create freight bills.',
    category: 'billing',
  },
  {
    id: 'invoices.retract',
    name: 'Request / Approve Invoice Retraction',
    description: 'Void or retract issued freight bills with a written reason.',
    category: 'billing',
  },
  {
    id: 'invoices.reconcile',
    name: 'Reconcile Payments & client Form 2307',
    description: 'Record 1% or 2% creditable withholding from the client’s Form 2307 and bank payment slips.',
    category: 'billing',
  },

  // General Ledger Books
  {
    id: 'ledger.view',
    name: 'View General Ledger & Books',
    description: 'Access Chart of Accounts, Journal Voucher ledger, and real-time Trial Balance.',
    category: 'ledger',
  },
  {
    id: 'ledger.post_jv',
    name: 'Post Manual Journal Adjustments',
    description: 'Create and post manual debit/credit journal vouchers to the general ledger.',
    category: 'ledger',
  },

  // Tariffs & Clients
  {
    id: 'ratecards.view',
    name: 'View Rate Card Matrix',
    description: 'View zone-based freight tariffs, drop fees, and demurrage rate schedules.',
    category: 'tariffs',
  },
  {
    id: 'ratecards.manage',
    name: 'Manage Tariffs & Client Contracts',
    description: 'Create and edit origin-destination pricing matrix and client contract rates.',
    category: 'tariffs',
  },

  // Administration & RBAC
  {
    id: 'dashboard.view',
    name: 'View Owner Executive Dashboard',
    description: 'Access high-level company revenue metrics, profit margin analytics, and fleet health.',
    category: 'admin',
  },
  {
    id: 'rbac.manage',
    name: 'Manage RBAC Roles & Permissions',
    description: 'Create custom roles, edit permission matrices, and assign roles to users.',
    category: 'admin',
  },
  {
    id: 'settings.manage',
    name: 'Manage Company Profile & Settings',
    description: 'Update legal business name, TIN, corporate address, and billing plans.',
    category: 'admin',
  },
];
