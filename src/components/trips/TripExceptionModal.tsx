import React, { useState } from 'react';
import { AlertTriangle, PauseCircle, X } from 'lucide-react';
import { CANCEL_EXCEPTION_KINDS, HOLD_EXCEPTION_KINDS, Trip, TripExceptionKind } from '../../types';

interface TripExceptionModalProps {
  trip: Trip;
  mode: 'hold' | 'cancel';
  onClose: () => void;
  onConfirm: (kind: TripExceptionKind, note: string) => void;
}

export const TripExceptionModal: React.FC<TripExceptionModalProps> = ({
  trip,
  mode,
  onClose,
  onConfirm,
}) => {
  const kinds = mode === 'hold' ? HOLD_EXCEPTION_KINDS : CANCEL_EXCEPTION_KINDS;
  const [kind, setKind] = useState<TripExceptionKind>(kinds[0].id);
  const [note, setNote] = useState('');

  return (
    <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {mode === 'hold' ? (
              <PauseCircle className="w-5 h-5 text-amber-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            )}
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                {mode === 'hold' ? 'Put shipment on hold' : 'Cancel shipment'}
              </h3>
              <p className="text-[11px] text-slate-500">{trip.tripNumber} · {trip.waybillNumber}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3 text-xs">
          <p className="text-slate-600 leading-relaxed">
            {mode === 'hold'
              ? 'Use hold when the truck cannot continue yet: client delay, weather, breakdown, checkpoint, or refused delivery. You can resume later.'
              : 'Cancel when this booking will not run. The truck is freed. This does not delete the trip record.'}
          </p>
          <label className="block font-bold text-slate-700">
            Reason
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as TripExceptionKind)}
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 font-medium text-slate-900"
            >
              {kinds.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>
          <label className="block font-bold text-slate-700">
            Note for the timeline
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="What happened, where, and who called it in"
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 font-medium text-slate-900"
            />
          </label>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700">
            Back
          </button>
          <button
            type="button"
            onClick={() => onConfirm(kind, note.trim())}
            className={`px-4 py-2 rounded-xl text-white text-xs font-bold ${
              mode === 'hold' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {mode === 'hold' ? 'Hold shipment' : 'Cancel shipment'}
          </button>
        </div>
      </div>
    </div>
  );
};
