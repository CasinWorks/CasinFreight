import React, { useMemo, useState } from 'react';
import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react';
import { useFreight } from '../../context/FreightContext';
import { closeIfBackdrop } from '../../lib/modal';

interface DeleteCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeleteCompanyModal: React.FC<DeleteCompanyModalProps> = ({ isOpen, onClose }) => {
  const { company, users, trucks, trips, invoices, deleteCompanyWorkspace } = useFreight();
  const [typedName, setTypedName] = useState('');
  const [typedConfirm, setTypedConfirm] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameMatches = typedName.trim() === company.name.trim();
  const phraseMatches = typedConfirm.trim().toUpperCase() === 'DELETE';
  const canDelete = nameMatches && phraseMatches && acknowledged && !isDeleting && Boolean(company.name.trim());

  const summary = useMemo(() => ([
    `${users.length} account${users.length === 1 ? '' : 's'}`,
    `${trucks.length} truck${trucks.length === 1 ? '' : 's'}`,
    `${trips.length} trip${trips.length === 1 ? '' : 's'}`,
    `${invoices.length} invoice${invoices.length === 1 ? '' : 's'}`,
  ]), [users.length, trucks.length, trips.length, invoices.length]);

  if (!isOpen) return null;

  const handleDelete = async () => {
    if (!canDelete) return;
    setError(null);
    setIsDeleting(true);
    try {
      await deleteCompanyWorkspace();
    } catch (err) {
      setIsDeleting(false);
      setError(err instanceof Error ? err.message : 'Could not delete this company.');
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4" onClick={closeIfBackdrop(onClose, isDeleting)}>
      <div className="bg-white border border-rose-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-rose-100 bg-rose-50 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete this company?</h3>
              <p className="text-xs text-slate-600 mt-1">
                This permanently removes <span className="font-semibold">{company.name || 'this company'}</span> and cannot be undone.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs text-slate-700">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="font-bold text-slate-900 mb-1">What will be deleted</div>
            <p>{summary.join(' · ')}, plus drivers, clients, rate cards, ledger entries, and team access.</p>
          </div>

          <label className="block space-y-1">
            <span className="font-semibold text-slate-800">Type the company name to continue</span>
            <input
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder={company.name}
              autoComplete="off"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-rose-500"
            />
          </label>

          <label className="block space-y-1">
            <span className="font-semibold text-slate-800">Type DELETE</span>
            <input
              value={typedConfirm}
              onChange={(e) => setTypedConfirm(e.target.value)}
              placeholder="DELETE"
              autoComplete="off"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-mono text-slate-900 focus:outline-none focus:border-rose-500"
            />
          </label>

          <label className="flex items-start gap-2 text-slate-700">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5 rounded border-slate-300"
            />
            <span>I understand trips, invoices, team members, and billing history for this company will be permanently removed.</span>
          </label>

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 p-2.5">{error}</div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
          >
            Keep company
          </button>
          <button
            type="button"
            disabled={!canDelete}
            onClick={() => void handleDelete()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 text-white font-bold disabled:opacity-40 hover:bg-rose-700"
          >
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete company forever
          </button>
        </div>
      </div>
    </div>
  );
};
