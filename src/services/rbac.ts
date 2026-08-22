import { RbacAuditEntry, RbacRole, SYSTEM_PERMISSIONS } from '../types/rbac';

export { SYSTEM_PERMISSIONS };

export const OWNER_ROLE_ID = 'Owner';

export const OWNER_RBAC_ROLE: RbacRole = {
  id: OWNER_ROLE_ID,
  name: 'Owner / Executive Master',
  description: 'Full uninhibited executive and financial control across operations, billing, general ledger, and system settings.',
  color: 'indigo',
  isSystem: true,
  permissions: SYSTEM_PERMISSIONS.map((p) => p.id),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const DEFAULT_RBAC_ROLES: RbacRole[] = [
  OWNER_RBAC_ROLE,
  {
    id: 'General Manager',
    name: 'General Manager',
    description: 'Company-wide operations lead. Can approve shipment status rollbacks after reviewing the written reason.',
    color: 'slate',
    isSystem: true,
    permissions: [
      'trips.view',
      'trips.create',
      'trips.edit',
      'trips.delete',
      'trips.reassign_fleet',
      'trips.status_pending',
      'trips.status_loaded',
      'trips.status_in_transit',
      'trips.status_delivered',
      'trips.status_invoiced',
      'trips.status_retract_approve',
      'fleet.view',
      'fleet.crud',
      'drivers.view',
      'drivers.crud',
      'drivers.approve',
      'fuel.view',
      'fuel.log',
      'invoices.view',
      'invoices.create',
      'ratecards.view',
      'ratecards.manage',
      'dashboard.view',
      'settings.manage',
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'Fleet Manager',
    name: 'Fleet & Operations Manager',
    description: 'Oversees fleet vehicle registry, driver certifications, dispatch schedules, and fuel auditing.',
    color: 'cyan',
    isSystem: true,
    permissions: [
      'trips.view',
      'trips.create',
      'trips.edit',
      'trips.reassign_fleet',
      'trips.status_pending',
      'trips.status_loaded',
      'trips.status_in_transit',
      'trips.status_delivered',
      'fleet.view',
      'fleet.crud',
      'drivers.view',
      'drivers.crud',
      'drivers.approve',
      'fuel.view',
      'fuel.log',
      'ratecards.view',
      'ratecards.manage',
      'dashboard.view',
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'Dispatcher',
    name: 'Dispatcher / Load Planner',
    description: 'Creates shipment waybills, allocates trucks & drivers, issues transit departure notes, and checks zone tariffs.',
    color: 'blue',
    isSystem: true,
    permissions: [
      'trips.view',
      'trips.create',
      'trips.edit',
      'trips.reassign_fleet',
      'trips.status_pending',
      'trips.status_in_transit',
      'fleet.view',
      'drivers.view',
      'fuel.view',
      'fuel.log',
      'ratecards.view',
      'ratecards.manage',
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'Loading Staff',
    name: 'Loading Staff / Dock Inspector',
    description: 'Inspects weighbridge tare weights, seals containers, verifies cargo conditions, and captures digital e-POD signatures.',
    color: 'emerald',
    isSystem: true,
    permissions: [
      'trips.view',
      'trips.status_loaded',
      'trips.status_delivered',
      'fleet.view',
      'fuel.view',
      'fuel.log',
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'Billing',
    name: 'Billing Specialist',
    description: 'Calculates 12% VAT, issues itemized BIR sales invoices, manages accessorial surcharges, and reconciles 2307 withholding certificates.',
    color: 'amber',
    isSystem: true,
    permissions: [
      'trips.view',
      'trips.status_invoiced',
      'invoices.view',
      'invoices.create',
      'invoices.retract',
      'invoices.reconcile',
      'ledger.view',
      'ratecards.view',
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'Auditor',
    name: 'Finance & Accounting Auditor',
    description: 'Inspects general ledger books, posts manual journal adjustments, audits trial balance, and verifies fuel expense authenticity.',
    color: 'purple',
    isSystem: false,
    permissions: [
      'trips.view',
      'invoices.view',
      'ledger.view',
      'ledger.post_jv',
      'fuel.view',
      'fuel.delete',
      'dashboard.view',
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'Safety Officer',
    name: 'Safety & Compliance Officer',
    description: 'Audits driver LTO restriction codes, medical certificates, and truck maintenance health records.',
    color: 'rose',
    isSystem: false,
    permissions: [
      'trips.view',
      'fleet.view',
      'drivers.view',
      'drivers.approve',
      'fuel.view',
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'Driver',
    name: 'Field Driver / Mobile Operator',
    description: 'Assigned waybill viewer, dock delivery e-POD submission, and gas station fuel receipt upload.',
    color: 'orange',
    isSystem: false,
    permissions: [
      'trips.view',
      'trips.status_delivered',
      'fuel.log',
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function checkPermission(roleId: string, permissionId: string, customRoles: RbacRole[] = []): boolean {
  if (roleId.toLowerCase() === 'owner' || roleId.toLowerCase().includes('owner')) return true;
  const role = customRoles.find(
    (r) => r.id.toLowerCase() === roleId.toLowerCase() || r.name.toLowerCase() === roleId.toLowerCase()
  );
  if (!role) return false;
  return role.permissions.includes(permissionId);
}

export function isTripRetractionApprover(roleId: string, customRoles: RbacRole[] = []): boolean {
  const n = (roleId || '').toLowerCase();
  if (n.includes('owner')) return true;
  if (n.includes('general manager') || n === 'gm') return true;
  return checkPermission(roleId, 'trips.status_retract_approve', customRoles);
}

export function ensureDefaultSystemRoles(loaded: RbacRole[]): RbacRole[] {
  const byId = new Map(loaded.map((role) => [role.id, role]));
  for (const systemRole of DEFAULT_RBAC_ROLES.filter((role) => role.isSystem)) {
    if (!byId.has(systemRole.id)) {
      byId.set(systemRole.id, systemRole);
    }
  }
  const owner = byId.get(OWNER_ROLE_ID);
  if (owner) {
    const missing = SYSTEM_PERMISSIONS.map((permission) => permission.id).filter((id) => !owner.permissions.includes(id));
    if (missing.length) {
      byId.set(OWNER_ROLE_ID, { ...owner, permissions: [...owner.permissions, ...missing] });
    }
  }
  return Array.from(byId.values());
}

export function getAllowedRolesForPermission(permissionId: string, customRoles: RbacRole[] = []): string[] {
  const allowed = customRoles
    .filter((r) => r.id.toLowerCase() === 'owner' || r.permissions.includes(permissionId))
    .map((r) => r.id);

  if (!allowed.includes(OWNER_ROLE_ID)) {
    allowed.unshift(OWNER_ROLE_ID);
  }
  return allowed;
}

export function buildAuditEntry(
  actorName: string,
  actorRole: string,
  action: RbacAuditEntry['action'],
  details: string,
  targetRole?: string,
  targetUser?: string
): RbacAuditEntry {
  return {
    id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    actorName,
    actorRole,
    action,
    details,
    targetRole,
    targetUser,
  };
}
