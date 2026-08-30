import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Download,
  FolderOpen,
  HardDrive,
  Loader2,
  Plus,
  RotateCcw,
  Shield,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useFreight } from '../../context/FreightContext';
import { deleteWeeklyBackup, listWeeklyBackups, type StoredWeeklyBackup } from '../../lib/weeklyBackupStore';
import {
  backupFilename,
  backupToCsv,
  downloadTextFile,
  parseBackupFile,
  previewBackup,
  type RestorePreview,
  type WorkspaceBackup,
} from '../../lib/workspaceBackup';
import {
  disconnectEvidenceFolder,
  getDeviceEvidenceStatus,
  pickEvidenceFolder,
  syncDeviceEvidence,
  type DeviceEvidenceStatus,
} from '../../lib/deviceEvidence';
import { closeIfBackdrop } from '../../lib/modal';
import { FeatureHowTo } from '../help/FeatureHowTo';

interface WorkspaceBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
}

export const WorkspaceBackupModal: React.FC<WorkspaceBackupModalProps> = ({ isOpen, onClose }) => {
  const {
    company,
    captureWorkspaceBackup,
    restoreWorkspaceBackup,
    saveWeeklyBackupNow,
    trips,
    invoices,
    fieldEvents,
  } = useFreight();

  const fileRef = useRef<HTMLInputElement>(null);
  const [howOpen, setHowOpen] = useState(true);
  const [weekly, setWeekly] = useState<StoredWeeklyBackup[]>([]);
  const [weeklyError, setWeeklyError] = useState<string | null>(null);
  const [isSavingWeekly, setIsSavingWeekly] = useState(false);
  const [pending, setPending] = useState<WorkspaceBackup | null>(null);
  const [preview, setPreview] = useState<RestorePreview | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [typedMerge, setTypedMerge] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<DeviceEvidenceStatus | null>(null);
  const [isSyncingEvidence, setIsSyncingEvidence] = useState(false);

  const refreshWeekly = useCallback(async () => {
    if (!company.id) return;
    try {
      setWeeklyError(null);
      setWeekly(await listWeeklyBackups(company.id));
    } catch (err) {
      setWeeklyError(err instanceof Error ? err.message : 'This browser blocked local backup storage.');
    }
  }, [company.id]);

  const refreshEvidence = useCallback(async () => {
    if (!company.id) return;
    try {
      setEvidence(await getDeviceEvidenceStatus({ company, trips, invoices, fieldEvents }));
    } catch {
      setEvidence(null);
    }
  }, [company, trips, invoices, fieldEvents]);

  useEffect(() => {
    if (!isOpen) return;
    void refreshWeekly();
    void refreshEvidence();
  }, [isOpen, refreshWeekly, refreshEvidence]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isRestoring) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, isRestoring, onClose]);

  if (!isOpen) return null;

  const canRestore = Boolean(pending && acknowledged && typedMerge.trim().toUpperCase() === 'MERGE' && !isRestoring);
  const sameCompany = !pending || pending.companyId === company.id || pending.company.id === company.id;

  const stageBackup = (backup: WorkspaceBackup) => {
    setError(null);
    setSuccess(null);
    setPending(backup);
    setPreview(previewBackup(backup));
    setAcknowledged(false);
    setTypedMerge('');
    setHowOpen(true);
  };

  const handleExport = () => {
    setIsExporting(true);
    setError(null);
    try {
      const backup = captureWorkspaceBackup();
      downloadTextFile(backupFilename(backup, 'csv'), backupToCsv(backup), 'text/csv;charset=utf-8');
      setSuccess('CSV downloaded. Keep a copy on Google Drive or a USB stick, not only on this computer.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not export the backup.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveWeekly = async () => {
    setIsSavingWeekly(true);
    setError(null);
    try {
      await saveWeeklyBackupNow();
      setSuccess('A snapshot was saved in this browser only. The CSV download is the real backup.');
      await refreshWeekly();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save a local weekly snapshot.');
    } finally {
      setIsSavingWeekly(false);
    }
  };

  const runEvidenceSync = async (forceZip: boolean) => {
    setIsSyncingEvidence(true);
    setError(null);
    try {
      const result = await syncDeviceEvidence({
        company,
        trips,
        invoices,
        fieldEvents,
        backup: captureWorkspaceBackup(),
        userGesture: true,
        forceZip,
      });
      if (result.mode === 'skipped') {
        setSuccess('Choose a folder first (Chrome or Edge), or download a ZIP.');
      } else if (result.failed && result.saved === 0) {
        setError('Could not copy photos to this device. Check that this computer can open CasinFreight photo links.');
      } else {
        const where = result.mode === 'folder' ? 'your chosen folder' : 'a ZIP download';
        setSuccess(
          `Saved ${result.saved} new POD / payment file${result.saved === 1 ? '' : 's'} to ${where}. Keep that copy 10 years. CasinFreight cloud is unchanged.`
        );
      }
      await refreshEvidence();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save copies to this device.');
    } finally {
      setIsSyncingEvidence(false);
    }
  };

  const handlePickFolder = async () => {
    setError(null);
    try {
      await pickEvidenceFolder(company.id);
      await runEvidenceSync(false);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Could not open that folder.');
    }
  };

  const handleDisconnectFolder = async () => {
    await disconnectEvidenceFolder(company.id);
    await refreshEvidence();
    setSuccess('This browser will no longer write into that folder by itself.');
  };

  const handleFile = async (file: File) => {
    setError(null);
    setSuccess(null);
    try {
      stageBackup(parseBackupFile(await file.text()));
    } catch (err) {
      setPending(null);
      setPreview(null);
      setError(err instanceof Error ? err.message : 'Could not read that backup file.');
    }
  };

  const handleRestore = async () => {
    if (!canRestore || !pending) return;
    setIsRestoring(true);
    setError(null);
    try {
      await restoreWorkspaceBackup(pending);
      setSuccess(`Merged ${preview?.totalRecords || 0} records into ${company.name}. Live records that were not in the file were kept.`);
      setPending(null);
      setPreview(null);
      setAcknowledged(false);
      setTypedMerge('');
      await refreshWeekly();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Restore failed. Live data was not wiped. Refresh if the board looks out of date.');
    } finally {
      setIsRestoring(false);
    }
  };

  const clearPending = () => {
    setPending(null);
    setPreview(null);
    setAcknowledged(false);
    setTypedMerge('');
  };

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4" onClick={closeIfBackdrop(onClose, isRestoring)}>
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Backup & restore</h3>
              <p className="text-xs text-slate-600 mt-1">
                Restore is a merge by ID, not a wipe. Live records that are not in the file stay in Firestore.
              </p>
              <div className="mt-2">
                <FeatureHowTo feature="backup" compact />
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isRestoring}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs text-slate-700 overflow-y-auto">
          <div className="rounded-xl border border-blue-200 bg-blue-50 overflow-hidden">
            <button
              type="button"
              onClick={() => setHowOpen((open) => !open)}
              className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-left"
            >
              <span className="font-bold text-blue-950">How restore avoids data loss</span>
              <ChevronDown className={`w-4 h-4 text-blue-700 transition-transform ${howOpen ? 'rotate-180' : ''}`} />
            </button>
            {howOpen && (
              <div className="px-3.5 pb-3.5 space-y-3 border-t border-blue-100 pt-3">
                <p>
                  CasinFreight never replaces the whole company with the backup. Each row is saved with <span className="font-mono font-semibold">merge: true</span>. That is the opposite of a “restore = overwrite the database” tool.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 bg-white/80 border border-blue-100 rounded-lg p-2.5">
                    <RotateCcw className="w-3.5 h-3.5 text-blue-700 mt-0.5 shrink-0" />
                    <span>
                      <strong>Same ID in backup and live</strong> — that trip, invoice, truck, or other record is updated from the file.
                    </span>
                  </li>
                  <li className="flex items-start gap-2 bg-white/80 border border-blue-100 rounded-lg p-2.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-700 mt-0.5 shrink-0" />
                    <span>
                      <strong>Live only</strong> (created after the backup) — left untouched. Nothing is deleted because it is missing from the CSV.
                    </span>
                  </li>
                  <li className="flex items-start gap-2 bg-white/80 border border-blue-100 rounded-lg p-2.5">
                    <Plus className="w-3.5 h-3.5 text-slate-700 mt-0.5 shrink-0" />
                    <span>
                      <strong>Backup only</strong> (you deleted it later) — it is created again.
                    </span>
                  </li>
                </ul>
                <div className="rounded-lg border border-slate-200 bg-white p-2.5 space-y-1">
                  <div className="font-bold text-slate-900">Never restored</div>
                  <p>These stay as they are on the live company, so you cannot accidentally roll back billing or lock yourselves out:</p>
                  <p>PayMongo / subscription · Firebase login accounts (passwords and Auth users) · Live GPS / field events · Who created the company</p>
                  <p className="text-slate-600">
                    Team roster records can come back from the CSV, but people still have to sign in with their existing accounts. Restoring a file does not recreate logins.
                  </p>
                </div>
                <p className="text-slate-600">
                  If restore fails after some writes, the app reloads from Firestore instead of saving stale screen state back on top of the backup.
                </p>
                <p>
                  After a company delete, create the company again, then upload the old CSV. Records are copied into the <strong>current</strong> company; billing on the new company is left as-is.
                </p>
                <p className="font-semibold text-slate-900">
                  Practical rule: the CSV is the books backup. The folder or ZIP on this computer is the 10-year copy of POD photos and payment proofs. Weekly browser snapshots are only a convenience.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || isRestoring}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-40"
            >
              {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Download CSV
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={isRestoring}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 font-bold hover:bg-slate-50"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload backup…
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.json,text/csv,application/json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) void handleFile(file);
              }}
            />
          </div>
          <p className="text-slate-500 -mt-2">
            CSV is lossless (<span className="font-mono">collection, id, json</span>) so nested trip and invoice data survives. It does not include the photo files themselves.
          </p>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 space-y-2">
            <div className="font-bold text-emerald-950">Keep BIR / POD copies on this computer</div>
            <p className="text-emerald-900">
              Books and supporting papers should stay with the company for 10 years. CasinFreight cloud is capped (2 GB free / 5 GB Founding) and is not that archive. Choose a folder on this PC — after that, new POD photos, signatures, and payment proofs copy here by themselves when you sign in. Safari and phones can download a ZIP instead.
            </p>
            {evidence && (
              <p className="text-emerald-800">
                {evidence.savedCount} file{evidence.savedCount === 1 ? '' : 's'} already copied
                {evidence.pendingCount ? ` · ${evidence.pendingCount} new` : ''}
                {evidence.lastSyncAt ? ` · last ${formatWhen(evidence.lastSyncAt)}` : ''}
                {evidence.folderLinked ? ' · folder linked' : ''}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {evidence?.canUseFolder && (
                <button
                  type="button"
                  onClick={() => void handlePickFolder()}
                  disabled={isSyncingEvidence || isRestoring}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-bold hover:bg-emerald-800 disabled:opacity-40"
                >
                  {isSyncingEvidence ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderOpen className="w-3.5 h-3.5" />}
                  {evidence.folderLinked ? 'Save new files to folder' : 'Choose folder on this PC'}
                </button>
              )}
              <button
                type="button"
                onClick={() => void runEvidenceSync(true)}
                disabled={isSyncingEvidence || isRestoring}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-300 bg-white text-emerald-900 font-bold hover:bg-white/80 disabled:opacity-40"
              >
                {isSyncingEvidence ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                Download copies (ZIP)
              </button>
              {evidence?.folderLinked && (
                <button
                  type="button"
                  onClick={() => void handleDisconnectFolder()}
                  disabled={isSyncingEvidence || isRestoring}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-emerald-800 font-semibold hover:bg-white/70 disabled:opacity-40"
                >
                  Stop auto-save
                </button>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="font-bold text-slate-900">Weekly snapshots on this device</div>
                <p className="text-slate-500">
                  Saved in this browser about once a week after sign-in, last 8 weeks. Clearing site data or switching browsers deletes them.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleSaveWeekly()}
                disabled={isSavingWeekly || isRestoring}
                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 font-semibold hover:bg-slate-50 disabled:opacity-40"
              >
                {isSavingWeekly ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Save now
              </button>
            </div>
            {weeklyError && <p className="text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">{weeklyError}</p>}
            {weekly.length === 0 && !weeklyError && (
              <p className="text-slate-500">No local snapshots yet. Download a CSV as well so you are not limited to this computer.</p>
            )}
            <ul className="space-y-1.5">
              {weekly.map((item) => (
                <li key={item.id} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-800 truncate">{formatWhen(item.savedAt)}</div>
                    <div className="text-slate-500">{item.recordCount} records</div>
                  </div>
                  <button
                    type="button"
                    className="p-1.5 rounded-md text-slate-500 hover:bg-white hover:text-slate-800"
                    title="Download this snapshot as CSV"
                    onClick={() => downloadTextFile(backupFilename(item.snapshot, 'csv'), backupToCsv(item.snapshot), 'text/csv;charset=utf-8')}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    className="p-1.5 rounded-md text-slate-500 hover:bg-white hover:text-blue-700"
                    title="Merge this snapshot"
                    onClick={() => stageBackup(item.snapshot)}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    className="p-1.5 rounded-md text-slate-400 hover:bg-white hover:text-rose-700"
                    title="Delete this snapshot"
                    onClick={() => {
                      void deleteWeeklyBackup(item.id).then(() => refreshWeekly());
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {preview && pending && (
            <div className="rounded-xl border border-slate-300 p-3 space-y-3">
              <div>
                <div className="font-bold text-slate-900">Ready to merge — not overwrite</div>
                <p>
                  {preview.companyName} · {formatWhen(preview.exportedAt)} · {preview.totalRecords} records in this file
                </p>
                {!sameCompany && (
                  <p className="mt-1.5 text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-2 flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>
                      This file came from a different company ID. Records will be copied into <strong>{company.name}</strong>. Live billing and logins stay as they are.
                    </span>
                  </p>
                )}
              </div>
              <ul className="grid grid-cols-2 gap-1">
                {preview.tables.map((row) => (
                  <li key={row.name} className="flex justify-between gap-2 bg-slate-50 rounded-md px-2 py-1">
                    <span>{row.label}</span>
                    <span className="font-mono font-semibold">{row.incoming}</span>
                  </li>
                ))}
              </ul>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-950 p-2.5 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                <p>
                  Newer live trips, invoices, trucks, and other records that are <strong>not</strong> in this file will stay. Matching IDs will be updated. Missing IDs from the file will be created again. Billing and logins are not restored.
                </p>
              </div>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(event) => setAcknowledged(event.target.checked)}
                  className="mt-0.5 rounded border-slate-300"
                />
                <span>
                  I understand this is a merge by ID, not a wipe. Live records missing from this file will not be deleted.
                </span>
              </label>
              <label className="block space-y-1">
                <span className="font-semibold text-slate-800">Type MERGE to continue</span>
                <input
                  value={typedMerge}
                  onChange={(event) => setTypedMerge(event.target.value)}
                  placeholder="MERGE"
                  autoComplete="off"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={clearPending}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!canRestore}
                  onClick={() => void handleRestore()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold disabled:opacity-40 hover:bg-blue-700"
                >
                  {isRestoring ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                  Merge backup into live data
                </button>
              </div>
            </div>
          )}

          {error && <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 p-2.5">{error}</div>}
          {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 p-2.5">{success}</div>}
        </div>
      </div>
    </div>
  );
};
