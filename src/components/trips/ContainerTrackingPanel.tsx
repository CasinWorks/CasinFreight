import React, { useMemo, useState } from 'react';
import { Camera, Clock } from 'lucide-react';
import { useFreight } from '../../context/FreightContext';
import {
  DETENTION_ESTIMATE_LABEL,
  RETURN_OUTCOME_LABELS,
  collectShippingLineSuggestions,
  draftFromContainer,
  estimateContainerDetention,
  formatEstimatedPeso,
  formatManilaDate,
  formatManilaDateTime,
  mergeContainerDraft,
  returnAttemptsNewestFirst,
  upsertContainerRateDefault,
  withReturnAttempt,
  type ContainerDraft,
} from '../../lib/containerTracking';
import type { ReturnAttemptOutcome, Trip } from '../../types';
import { ContainerCountdownBadge } from './ContainerCountdownBadge';
import { ContainerMoveFields } from './ContainerMoveFields';

function localDateTimeValue(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export const ContainerTrackingPanel: React.FC<{ trip: Trip }> = ({ trip }) => {
  const { trips, company, updateTrip, updateCompany, currentUser, uploadWorkspaceFile } = useFreight();
  const [draft, setDraft] = useState<ContainerDraft>(() => draftFromContainer(trip.container));
  const [savedNote, setSavedNote] = useState('');
  const [attemptAt, setAttemptAt] = useState(localDateTimeValue);
  const [depot, setDepot] = useState(trip.container?.returnDepot || '');
  const [outcome, setOutcome] = useState<ReturnAttemptOutcome | ''>('');
  const [queueMinutes, setQueueMinutes] = useState('');
  const [note, setNote] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [logNote, setLogNote] = useState('');
  const [logging, setLogging] = useState(false);

  const suggestions = useMemo(
    () => collectShippingLineSuggestions(trips, company.containerRateDefaults),
    [trips, company.containerRateDefaults],
  );
  const estimate = estimateContainerDetention(trip.container);
  const timeline = returnAttemptsNewestFirst(trip.container?.returnAttempts);

  const handleDraftChange = (next: ContainerDraft) => {
    setDraft(next);
  };

  const saveDetails = () => {
    const container = mergeContainerDraft(trip.container, draft);
    updateTrip(trip.id, { moveType: 'container', container });
    const rate = container.detentionRatePerDay;
    if (draft.saveRateDefault && container.shippingLine && container.containerSize && rate !== undefined && rate >= 0) {
      updateCompany({
        containerRateDefaults: upsertContainerRateDefault(company.containerRateDefaults, {
          shippingLine: container.shippingLine,
          containerSize: container.containerSize,
          ratePerDay: rate,
        }),
      });
    }
    setDraft((current) => ({ ...current, saveRateDefault: false }));
    setSavedNote('Container details saved. This does not change the truck or the invoice.');
  };

  const logAttempt = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!outcome) {
      setLogNote('Pick what happened at the depot, then log it.');
      return;
    }
    setLogging(true);
    setLogNote('');
    let photoUrl: string | undefined;
    let photoNote = '';
    if (photoFile) {
      try {
        const uploaded = await uploadWorkspaceFile('container-returns', photoFile);
        photoUrl = uploaded.url;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Photo was not stored.';
        photoNote = message.toLowerCase().includes('storage')
          ? 'Photo storage is full, so the photo was skipped. The written log was still saved.'
          : `Photo was not stored (${message}). The written log was still saved.`;
      }
    }
    const queue = queueMinutes.trim() === '' ? undefined : Number(queueMinutes);
    const attemptedAt = attemptAt ? new Date(attemptAt).toISOString() : new Date().toISOString();
    const container = withReturnAttempt(trip.container, {
      id: `cra-${Date.now()}`,
      attemptedAt,
      depot: depot.trim(),
      outcome,
      queueMinutes: queue !== undefined && Number.isFinite(queue) ? queue : undefined,
      note: note.trim() || undefined,
      photoUrl,
      loggedBy: currentUser.name || currentUser.email || 'Team',
    });
    updateTrip(trip.id, { moveType: 'container', container });
    setNote('');
    setQueueMinutes('');
    setPhotoFile(null);
    setOutcome('');
    const saved =
      outcome === 'returned'
        ? 'Marked returned. The detention estimate stops on this attempt.'
        : 'Return attempt logged.';
    setLogNote(photoNote ? `${photoNote} ${saved}` : saved);
    setLogging(false);
  };

  return (
    <div className="space-y-4 text-xs">
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Free time and return</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{DETENTION_ESTIMATE_LABEL}</p>
          </div>
          <ContainerCountdownBadge trip={trip} />
        </div>
        {trip.container?.returnBy && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
              <div className="text-[10px] uppercase font-bold text-slate-500">Return by</div>
              <div className="font-mono font-bold text-slate-900 mt-0.5">{formatManilaDate(trip.container.returnBy)}</div>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
              <div className="text-[10px] uppercase font-bold text-slate-500">Days past return-by</div>
              <div className="font-mono font-bold text-slate-900 mt-0.5">{estimate.daysOverdue}</div>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
              <div className="text-[10px] uppercase font-bold text-slate-500">Estimated detention</div>
              <div className="font-mono font-bold text-slate-900 mt-0.5">{formatEstimatedPeso(estimate.detentionAccruedPhp)}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{DETENTION_ESTIMATE_LABEL}</div>
            </div>
          </div>
        )}
        {estimate.accrualStopped && (
          <p className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            Returned {formatManilaDateTime(trip.container?.returnedAt)}. The estimate stopped on that day.
          </p>
        )}

        <ContainerMoveFields
          draft={draft}
          onChange={handleDraftChange}
          suggestions={suggestions}
          rateDefaults={company.containerRateDefaults}
          idPrefix={`trip-${trip.id}`}
        />

        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] text-emerald-700">{savedNote}</span>
          <button
            type="button"
            onClick={saveDetails}
            className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold"
          >
            Save container details
          </button>
        </div>
      </div>

      <form onSubmit={logAttempt} className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Log a return attempt</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Newest entries show first. Use this if the depot had no slot or the box was actually returned.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs font-semibold text-slate-700 mb-1">When</span>
            <input
              type="datetime-local"
              value={attemptAt}
              onChange={(e) => setAttemptAt(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-semibold text-slate-700 mb-1">Depot</span>
            <input
              value={depot}
              onChange={(e) => setDepot(e.target.value)}
              placeholder="Where the driver queued"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-semibold text-slate-700 mb-1">What happened</span>
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as ReturnAttemptOutcome | '')}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs"
            >
              <option value="">Choose</option>
              <option value="returned">Returned — stops the estimate</option>
              <option value="no_slot">No slot</option>
              <option value="queue_delay">Queue delay</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="block">
            <span className="block text-xs font-semibold text-slate-700 mb-1">Queue minutes (optional)</span>
            <input
              type="number"
              min="0"
              step="1"
              value={queueMinutes}
              onChange={(e) => setQueueMinutes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono"
            />
          </label>
        </div>
        <label className="block">
          <span className="block text-xs font-semibold text-slate-700 mb-1">Note</span>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Who you spoke to, gate, or why they turned the truck around"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs"
          />
        </label>
        <label className="flex items-center gap-2 text-[11px] text-slate-600">
          <Camera className="w-3.5 h-3.5" />
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
          />
          <span>Photo is optional. If storage is full, the note still saves.</span>
        </label>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-600">{logNote}</span>
          <button
            type="submit"
            disabled={logging}
            className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold disabled:opacity-60"
          >
            {logging ? 'Saving…' : 'Log attempt'}
          </button>
        </div>
      </form>

      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
        <h3 className="text-sm font-bold text-slate-900 mb-3">Return attempt timeline</h3>
        {timeline.length === 0 ? (
          <p className="text-[11px] text-slate-500">No return attempts logged yet.</p>
        ) : (
          <ol className="space-y-3">
            {timeline.map((attempt) => (
              <li key={attempt.id} className="border-l-2 border-slate-200 pl-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span className="font-semibold text-slate-900">{formatManilaDateTime(attempt.attemptedAt)}</span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                      attempt.outcome === 'returned'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : attempt.outcome === 'no_slot'
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : 'bg-amber-50 text-amber-900 border-amber-200'
                    }`}
                  >
                    {RETURN_OUTCOME_LABELS[attempt.outcome]}
                  </span>
                </div>
                <p className="text-slate-700 mt-1">
                  {attempt.depot || 'Depot not named'}
                  {attempt.queueMinutes !== undefined ? ` · queued ${attempt.queueMinutes} min` : ''}
                  {attempt.loggedBy ? ` · logged by ${attempt.loggedBy}` : ''}
                </p>
                {attempt.note && <p className="text-slate-600 mt-1">{attempt.note}</p>}
                {attempt.photoUrl && (
                  <a href={attempt.photoUrl} target="_blank" rel="noreferrer" className="inline-block mt-1 text-blue-700 font-semibold hover:underline">
                    View photo
                  </a>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
};
