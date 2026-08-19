import { RbacRole, RbacAuditEntry, SYSTEM_PERMISSIONS } from '../types/rbac';

const STORAGE_KEYS = {
  ROLES: 'cf_rbac_roles',
  AUDIT_LOGS: 'cf_rbac_audit_logs',
  USERS: 'cf_users',
} as const;

export const DEFAULT_RBAC_ROLES: RbacRole[] = [
  {
    id: 'Owner',
    name: 'Owner / Executive Master',
    description: 'Full uninhibited executive and financial control across operations, billing, general ledger, and system settings.',
    color: 'indigo',
    isSystem: true,
    permissions: SYSTEM_PERMISSIONS.map(p => p.id),
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
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
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
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
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
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
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
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
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
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
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
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
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
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
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

export const initialRbacAuditLogs: RbacAuditEntry[] = [
  {
    id: 'audit-001',
    timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
    actorName: 'Tusherd "TJ" Casin',
    actorRole: 'Owner',
    action: 'PERMISSIONS_RESET',
    details: 'System initialized default Philippine logistics RBAC roles and permissions schema.',
  },
  {
    id: 'audit-002',
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
    actorName: 'Tusherd "TJ" Casin',
    actorRole: 'Owner',
    action: 'ROLE_CREATED',
    targetRole: 'Fleet Manager',
    details: 'Created specialized role for fleet managers with full vehicle CRUD and driver approvals.',
  },
  {
    id: 'audit-003',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    actorName: 'Tusherd "TJ" Casin',
    actorRole: 'Owner',
    action: 'USER_ROLE_ASSIGNED',
    targetUser: 'Mark Lester Santos',
    details: 'Assigned Mark Lester Santos to Dispatcher role.',
  },
];

/**
 * Local Database Engine for RBAC
 */
export class RbacLocalDatabase {
  static getRoles(): RbacRole[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ROLES);
      if (!raw) {
        this.saveRoles(DEFAULT_RBAC_ROLES);
        return DEFAULT_RBAC_ROLES;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
      return DEFAULT_RBAC_ROLES;
    } catch (e) {
      console.warn('Failed to load RBAC roles from local storage, falling back to defaults', e);
      return DEFAULT_RBAC_ROLES;
    }
  }

  static saveRoles(roles: RbacRole[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ROLES, JSON.stringify(roles));
    } catch (e) {
      console.error('Failed to save RBAC roles to local storage', e);
    }
  }

  static getAuditLogs(): RbacAuditEntry[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
      if (!raw) {
        this.saveAuditLogs(initialRbacAuditLogs);
        return initialRbacAuditLogs;
      }
      return JSON.parse(raw);
    } catch (e) {
      return initialRbacAuditLogs;
    }
  }

  static saveAuditLogs(logs: RbacAuditEntry[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs.slice(0, 100))); // Keep last 100 entries
    } catch (e) {
      console.error('Failed to save audit logs to local storage', e);
    }
  }

  static logAction(
    actorName: string,
    actorRole: string,
    action: RbacAuditEntry['action'],
    details: string,
    targetRole?: string,
    targetUser?: string
  ): RbacAuditEntry {
    const currentLogs = this.getAuditLogs();
    const newEntry: RbacAuditEntry = {
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      actorName,
      actorRole,
      action,
      details,
      targetRole,
      targetUser,
    };
    const updated = [newEntry, ...currentLogs];
    this.saveAuditLogs(updated);
    return newEntry;
  }

  static checkPermission(roleId: string, permissionId: string, customRoles?: RbacRole[]): boolean {
    const roles = customRoles || this.getRoles();
    const role = roles.find(r => r.id.toLowerCase() === roleId.toLowerCase() || r.name.toLowerCase() === roleId.toLowerCase());
    
    // Owner always has all permissions
    if (roleId.toLowerCase() === 'owner') return true;
    if (!role) return false;

    return role.permissions.includes(permissionId);
  }

  static getAllowedRolesForPermission(permissionId: string, customRoles?: RbacRole[]): string[] {
    const roles = customRoles || this.getRoles();
    const allowed = roles
      .filter(r => r.id.toLowerCase() === 'owner' || r.permissions.includes(permissionId))
      .map(r => r.id);
    
    if (!allowed.includes('Owner')) {
      allowed.unshift('Owner');
    }
    return allowed;
  }

  static getDbStats() {
    let totalBytes = 0;
    const itemsCount: Record<string, number> = {};

    for (const key of Object.values(STORAGE_KEYS)) {
      const val = localStorage.getItem(key) || '';
      totalBytes += key.length + val.length;
      try {
        const parsed = JSON.parse(val);
        itemsCount[key] = Array.isArray(parsed) ? parsed.length : 1;
      } catch {
        itemsCount[key] = 0;
      }
    }

    return {
      storageEngine: 'Local Database (Browser LocalStorage)',
      status: 'Online (Synchronized)',
      totalBytes,
      totalKilobytes: (totalBytes / 1024).toFixed(2),
      itemsCount,
      lastSync: new Date().toLocaleTimeString(),
    };
  }

  static exportDatabaseJson(): string {
    const data = {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      roles: this.getRoles(),
      auditLogs: this.getAuditLogs(),
    };
    return JSON.stringify(data, null, 2);
  }

  static importDatabaseJson(jsonString: string): { success: boolean; message: string } {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.roles || !Array.isArray(parsed.roles)) {
        return { success: false, message: 'Invalid format: missing roles array.' };
      }
      this.saveRoles(parsed.roles);
      if (Array.isArray(parsed.auditLogs)) {
        this.saveAuditLogs(parsed.auditLogs);
      }
      return { success: true, message: `Successfully imported ${parsed.roles.length} roles from local database snapshot.` };
    } catch (e: any) {
      return { success: false, message: `Import error: ${e.message}` };
    }
  }
}
