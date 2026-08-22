import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Lock,
  RotateCcw,
  ShieldAlert,
  X,
  XCircle,
} from 'lucide-react';
import { useFreight } from '../../context/FreightContext';
import { closeIfBackdrop } from '../../lib/modal';
import { Trip, TripRetractionReasonCategory, TripStatus } from '../../types';

interface TripStatusRetractionModalProps {
  trip: Trip;
  toStatus: TripStatus;
  isOpen: boolean;
  onClose: () => void;
}

const REASON_CATEGORIES: TripRetractionReasonCategory[] = [
  'Wrong status posted',
  'Loading not actually complete',
  'Truck did not depart',
  'Delivery not actually complete',
  'POD / paperwork correction',
  'Duplicate or mis-click',
  'Other operational error',
];

export const TripStatusRetractionModal: React.FC<TripStatusRetractionModalProps> = ({
  trip,
  toStatus,
  isOpen,
  onClose,
}) => {
  const {
    currentUser,
    canApproveTripStatusRetraction,
    requestTripStatusRetraction,
    applyOwnTripStatusRetraction,
    approveTripStatusRetraction,
    rejectTripStatusRetraction,
  } = useFreight();

  const pending = trip.activeStatusRetraction?.status === 'Pending_Approval' ? trip.activeStatusRetraction : null;
  const target = pending?.toStatus || toStatus;
  const fromStatus = pending?.fromStatus || trip.status;

  const [reasonCategory, setReasonCategory] = useState<TripRetractionReasonCategory>('Wrong status posted');
  const [detailedReason, setDetailedReason] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [readReason, setReadReason] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (canApproveTripStatusRetraction) {
        applyOwnTripStatusRetraction(trip.id, target, reasonCategory, detailedReason);
      } else {
        requestTripStatusRetraction(trip.id, target, reasonCategory, detailedReason);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit the rollback request.');
    }
  };

  const handleApprove = () => {
    if (!readReason) {
      setError('Read the written reason and tick the box before you approve.');
      return;
    }
    setError('');
    try {
      approveTripStatusRetraction(trip.id, reviewNote);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not approve this rollback.');
    }
  };

  const handleReject = () => {
    setError('');
    try {
      rejectTripStatusRetraction(trip.id, reviewNote);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reject this rollback.');
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-y-auto" onClick={closeIfBackdrop(onClose)}>
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 md:px-5 bg-amber-50 border-b border-amber-200 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                {pending ? 'Review shipment status rollback' : 'Request shipment status rollback'}
              </h3>
              <p className="text-[11px] text-slate-600 mt-0.5">
                {trip.tripNumber} · {fromStatus} → {target}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 md:p-5 space-y-4 text-xs text-slate-700">
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-800 p-2.5 flex items-start gap-2">
              <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {pending ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-amber-950">
                    <Clock className="w-3.5 h-3.5" />
                    Written reason (must be read before approval)
                  </div>
                  <span className="text-[10px] font-mono text-amber-800">
                    {new Date(pending.requestedAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-slate-600">
                  Requested by <strong>{pending.requestedBy}</strong> ({pending.requestedByRole})
                </p>
                <p className="font-semibold text-slate-800">Category: {pending.reasonCategory}</p>
                <p className="italic bg-white border border-amber-200 rounded-lg p-2.5 text-slate-800">
                  “{pending.detailedReason}”
                </p>
              </div>

              {canApproveTripStatusRetraction ? (
                <div className="space-y-3">
                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={readReason}
                      onChange={(e) => {
                        setReadReason(e.target.checked);
                        if (error) setError('');
                      }}
                      className="mt-0.5 rounded border-slate-300"
                    />
                    <span>
                      I have read the reason above. Approving will move this shipment from <strong>{fromStatus}</strong> back to <strong>{target}</strong>.
                    </span>
                  </label>
                  <label className="block space-y-1">
                    <span className="font-semibold text-slate-800">Decision note</span>
                    <textarea
                      rows={2}
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      placeholder="Optional for approve. Required if you reject."
                      className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </label>
                  <div className="flex justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleReject}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 font-bold hover:bg-rose-100"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                    <button
                      type="button"
                      disabled={!readReason}
                      onClick={handleApprove}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-40"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve rollback
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-1">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Lock className="w-4 h-4" />
                    Waiting for Owner or General Manager
                  </div>
                  <p>
                    The shipment stays at <strong>{trip.status}</strong> until they read this reason and approve or reject.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmitRequest} className="space-y-4">
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-blue-950 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>
                  Rolling back a shipment is not instant. {canApproveTripStatusRetraction
                    ? 'Record why you are moving it backward. This is kept on the trip timeline.'
                    : 'Write the reason. Only the Owner or General Manager can approve after they have read it.'}
                </p>
              </div>

              <label className="block space-y-1">
                <span className="font-bold uppercase text-[11px] text-slate-700">Category</span>
                <select
                  value={reasonCategory}
                  onChange={(e) => setReasonCategory(e.target.value as TripRetractionReasonCategory)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-900 focus:outline-none focus:border-amber-500"
                >
                  {REASON_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1">
                <span className="font-bold uppercase text-[11px] text-slate-700">Written reason</span>
                <textarea
                  rows={4}
                  value={detailedReason}
                  onChange={(e) => setDetailedReason(e.target.value)}
                  required
                  placeholder="Example: Dispatcher marked In Transit before the truck left the yard. Seal is still on the dock."
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </label>

              <div className="flex justify-end gap-2 pt-1 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-2 rounded-xl border border-slate-200 font-semibold hover:bg-slate-50"
                >
                  Keep current status
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {canApproveTripStatusRetraction ? 'Record reason & roll back' : 'Submit for approval'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
