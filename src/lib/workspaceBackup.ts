import type { WorkspaceCollection } from '../services/firestoreCompany';
import type { ChartOfAccount, Company } from '../types';

export const BACKUP_FORMAT = 'casinfreight-backup';
export const BACKUP_VERSION = 1;

export const BACKUP_COLLECTIONS: WorkspaceCollection[] = [
  'trucks',
  'drivers',
  'clients',
  'rateCards',
  'truckBans',
  'trips',
  'invoices',
  'fuelLogs',
  'journalEntries',
  'roles',
  'members',
  'auditLogs',
];

export const COLLECTION_LABELS: Record<string, string> = {
  company: 'Company profile',
  chartOfAccounts: 'Chart of accounts',
  trucks: 'Trucks',
  drivers: 'Drivers',
  clients: 'Shippers & clients',
  rateCards: 'Rate cards',
  truckBans: 'Truck bans',
  trips: 'Trips',
  invoices: 'Invoices',
  fuelLogs: 'Fuel logs',
  journalEntries: 'Ledger entries',
  roles: 'Roles',
  members: 'Team roster',
  auditLogs: 'Audit log',
};

export type BackupRecord = { id: string } & Record<string, unknown>;

export interface WorkspaceBackup {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  companyId: string;
  companyName: string;
  company: Pick<Company, 'id' | 'name' | 'tin' | 'address' | 'contactNumber' | 'email' | 'currency' | 'logoUrl' | 'registeredDate'>;
  chartOfAccounts: ChartOfAccount[];
  collections: Partial<Record<WorkspaceCollection, BackupRecord[]>>;
}

export interface RestorePreview {
  companyName: string;
  exportedAt: string;
  sourceCompanyId: string;
  tables: Array<{ name: string; label: string; incoming: number }>;
  totalRecords: number;
}

export function emptyCollections(): WorkspaceBackup['collections'] {
  return Object.fromEntries(BACKUP_COLLECTIONS.map((name) => [name, []])) as WorkspaceBackup['collections'];
}

export function stripSecrets<T extends Record<string, unknown>>(item: T): T {
  const { password: _password, ...rest } = item;
  return rest as T;
}

export function remapCompanyId<T extends BackupRecord>(item: T, companyId: string): T {
  return { ...stripSecrets(item), companyId } as T;
}

export function mergeChartOfAccounts(live: ChartOfAccount[], incoming: ChartOfAccount[]): ChartOfAccount[] {
  if (!incoming.length) return live;
  const map = new Map(live.map((account) => [account.code, account]));
  for (const account of incoming) {
    if (account.code) map.set(account.code, account);
  }
  return Array.from(map.values());
}

export function countBackupRecords(backup: WorkspaceBackup): number {
  const collectionCount = BACKUP_COLLECTIONS.reduce((sum, name) => sum + (backup.collections[name]?.length || 0), 0);
  return collectionCount + (backup.chartOfAccounts?.length || 0);
}

export function previewBackup(backup: WorkspaceBackup): RestorePreview {
  const tables = [
    { name: 'chartOfAccounts', incoming: backup.chartOfAccounts?.length || 0 },
    ...BACKUP_COLLECTIONS.map((name) => ({
      name,
      incoming: backup.collections[name]?.length || 0,
    })),
  ]
    .filter((row) => row.incoming > 0)
    .map((row) => ({ ...row, label: COLLECTION_LABELS[row.name] || row.name }));

  return {
    companyName: backup.companyName || backup.company.name,
    exportedAt: backup.exportedAt,
    sourceCompanyId: backup.companyId || backup.company.id,
    tables,
    totalRecords: countBackupRecords(backup),
  };
}

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function backupToCsv(backup: WorkspaceBackup): string {
  const lines = [
    'format,version,exportedAt,companyId,companyName',
    [
      csvEscape(backup.format),
      String(backup.version),
      csvEscape(backup.exportedAt),
      csvEscape(backup.companyId),
      csvEscape(backup.companyName),
    ].join(','),
    '',
    'collection,id,json',
  ];

  const companyRow = JSON.stringify(backup.company);
  lines.push(['company', csvEscape(backup.company.id), csvEscape(companyRow)].join(','));

  for (const account of backup.chartOfAccounts || []) {
    lines.push(['chartOfAccounts', csvEscape(account.code), csvEscape(JSON.stringify(account))].join(','));
  }

  for (const name of BACKUP_COLLECTIONS) {
    for (const item of backup.collections[name] || []) {
      lines.push([name, csvEscape(item.id), csvEscape(JSON.stringify(item))].join(','));
    }
  }

  return `\uFEFF${lines.join('\r\n')}`;
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  const input = text.replace(/^\uFEFF/, '');

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const next = input[i + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n' || (char === '\r' && next === '\n')) {
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = '';
      if (char === '\r') i += 1;
    } else if (char !== '\r') {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

export function parseBackupFile(raw: string): WorkspaceBackup {
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) {
    const parsed = JSON.parse(trimmed) as WorkspaceBackup;
    if (parsed.format !== BACKUP_FORMAT) {
      throw new Error('This file is not a CasinFreight workspace backup.');
    }
    return {
      ...parsed,
      chartOfAccounts: parsed.chartOfAccounts || [],
      collections: { ...emptyCollections(), ...parsed.collections },
    };
  }

  const rows = parseCsvRows(trimmed);
  if (!rows.length) throw new Error('This backup file is empty.');

  let exportedAt = new Date().toISOString();
  let companyId = '';
  let companyName = '';
  let company: WorkspaceBackup['company'] | null = null;
  const chartOfAccounts: ChartOfAccount[] = [];
  const collections = emptyCollections();

  let dataStarted = false;
  for (const row of rows) {
    if (row[0] === 'format' && row[1] === 'version') continue;
    if (row[0] === BACKUP_FORMAT || row[0] === 'casinfreight-backup') {
      exportedAt = row[2] || exportedAt;
      companyId = row[3] || '';
      companyName = row[4] || '';
      continue;
    }
    if (row[0] === 'collection' && row[1] === 'id') {
      dataStarted = true;
      continue;
    }
    if (!dataStarted) continue;
    const [collectionName, id, json] = row;
    if (!collectionName || !json) continue;
    const record = JSON.parse(json) as { id: string } & Record<string, unknown>;
    if (collectionName === 'company') {
      company = record as unknown as WorkspaceBackup['company'];
      companyId = company.id || companyId;
      companyName = company.name || companyName;
      continue;
    }
    if (collectionName === 'chartOfAccounts') {
      chartOfAccounts.push(record as unknown as ChartOfAccount);
      continue;
    }
    if (!BACKUP_COLLECTIONS.includes(collectionName as WorkspaceCollection)) continue;
    const list = collections[collectionName as WorkspaceCollection] || [];
    list.push({ ...record, id: record.id || id });
    collections[collectionName as WorkspaceCollection] = list;
  }

  if (!company) {
    throw new Error('This CSV is missing company data. Export a new backup from CasinFreight.');
  }

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt,
    companyId: companyId || company.id,
    companyName: companyName || company.name,
    company,
    chartOfAccounts,
    collections,
  };
}

export function downloadTextFile(filename: string, contents: string, type: string): void {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function backupFilename(backup: WorkspaceBackup, ext: 'csv' | 'json'): string {
  const day = backup.exportedAt.slice(0, 10);
  const slug = (backup.companyName || 'company').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
  return `casinfreight-backup-${slug || 'workspace'}-${day}.${ext}`;
}
