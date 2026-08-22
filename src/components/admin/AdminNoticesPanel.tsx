import React, { useMemo, useState } from 'react';
import { Bell, Loader2, Megaphone, Plus, Trash2, Wrench } from 'lucide-react';
import { useFreight } from '../../context/FreightContext';
import { isDowntimeBlocking, isNoticeLive } from '../../services/firestoreNotices';
import type { PlatformNotice, PlatformNoticeKind } from '../../types';

function toLocalInput(iso?: string) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInput(value: string) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function defaultShowUntil() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return toLocalInput(date.toISOString());
}

const EMPTY_FORM = {
  kind: 'update' as PlatformNoticeKind,
  title: '',
  message: '',
  hasDowntime: false,
  downtimeStart: '',
  downtimeEnd: '',
  showUntil: defaultShowUntil(),
  isActive: true,
};

export const AdminNoticesPanel: React.FC = () => {
  const { platformNotices, savePlatformNotice, deletePlatformNotice, currentUser, endActiveDowntime, activeDowntime } = useFreight();
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const liveCount = useMemo(() => platformNotices.filter((notice) => isNoticeLive(notice)).length, [platformNotices]);

  const startCreate = (kind: PlatformNoticeKind) => {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      kind,
      hasDowntime: kind === 'maintenance' ? false : false,
      title: kind === 'maintenance' ? 'Scheduled maintenance' : "What's new in CasinFreight",
      showUntil: defaultShowUntil(),
    });
  };

  const startEdit = (notice: PlatformNotice) => {
    setEditingId(notice.id);
    setForm({
      kind: notice.kind,
      title: notice.title,
      message: notice.message,
      hasDowntime: notice.hasDowntime,
      downtimeStart: toLocalInput(notice.downtimeStart),
      downtimeEnd: toLocalInput(notice.downtimeEnd),
      showUntil: toLocalInput(notice.showUntil),
      isActive: notice.isActive,
    });
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim() || !form.message.trim()) {
      setError('Title and message are required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const hasDowntime = form.kind === 'maintenance' && form.hasDowntime;
      const downtimeEnd = hasDowntime ? fromLocalInput(form.downtimeEnd) || undefined : undefined;
      const showUntil = fromLocalInput(form.showUntil) || downtimeEnd || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await savePlatformNotice({
        id: editingId || `notice-${Date.now()}`,
        kind: form.kind,
        title: form.title.trim(),
        message: form.message.trim(),
        hasDowntime,
        downtimeStart: hasDowntime ? (fromLocalInput(form.downtimeStart) || now) : undefined,
        downtimeEnd,
        showUntil,
        isActive: form.isActive,
        createdAt: platformNotices.find((notice) => notice.id === editingId)?.createdAt || now,
        updatedAt: now,
        createdBy: currentUser.email,
      });
      setEditingId(null);
      setForm({ ...EMPTY_FORM, showUntil: defaultShowUntil() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the notice. Publish the latest firestore.rules if this is a permissions error.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex-1 overflow-auto p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-5">
        <div>
          <div className="flex items-center gap-2 text-blue-700">
            <Bell className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">CasinFreight owner</span>
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 mt-1">Maintenance & product notices</h1>
          <p className="text-xs text-slate-500 mt-1">
            Only {currentUser.email} can publish these. “With downtime” locks the app for every company except you, until you tap End downtime.
          </p>
        </div>

        {activeDowntime && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-semibold text-amber-950">
              Downtime is blocking customers now: {activeDowntime.title}
            </div>
            <button
              type="button"
              onClick={() => void endActiveDowntime()}
              className="px-3 py-1.5 rounded-lg bg-slate-950 text-white text-xs font-bold"
            >
              End downtime now
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => startCreate('maintenance')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-xs font-bold"
          >
            <Wrench className="w-3.5 h-3.5" />
            New maintenance notice
          </button>
          <button
            type="button"
            onClick={() => startCreate('update')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-800 text-xs font-bold"
          >
            <Megaphone className="w-3.5 h-3.5" />
            New product update
          </button>
          <span className="text-[11px] text-slate-500 self-center">{liveCount} live now</span>
        </div>

        <form onSubmit={handleSave} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="text-xs font-bold text-slate-900">
            {editingId ? 'Edit notice' : 'Compose notice'}
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-slate-700 space-y-1">
              <span>Type</span>
              <select
                value={form.kind}
                onChange={(e) => setForm((prev) => ({ ...prev, kind: e.target.value as PlatformNoticeKind, hasDowntime: e.target.value === 'maintenance' ? prev.hasDowntime : false }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="maintenance">Maintenance</option>
                <option value="update">Product update / what’s new</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-700 space-y-1">
              <span>Show popup until</span>
              <input
                type="datetime-local"
                required
                value={form.showUntil}
                onChange={(e) => setForm((prev) => ({ ...prev, showUntil: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          </div>

          {form.kind === 'maintenance' && (
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 space-y-2">
              <div className="text-xs font-bold text-amber-900">Downtime</div>
              <div className="flex flex-wrap gap-3 text-xs">
                <label className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    checked={!form.hasDowntime}
                    onChange={() => setForm((prev) => ({ ...prev, hasDowntime: false }))}
                  />
                  Notice only (app stays usable)
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    checked={form.hasDowntime}
                    onChange={() => setForm((prev) => ({ ...prev, hasDowntime: true }))}
                  />
                  With downtime (customers are blocked)
                </label>
              </div>
              {form.hasDowntime && (
                <div className="grid sm:grid-cols-2 gap-3">
                  <label className="text-xs font-semibold text-slate-700 space-y-1">
                    <span>Downtime start</span>
                    <input
                      type="datetime-local"
                      value={form.downtimeStart}
                      onChange={(e) => setForm((prev) => ({ ...prev, downtimeStart: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
                    />
                  </label>
                  <label className="text-xs font-semibold text-slate-700 space-y-1">
                    <span>Downtime end</span>
                    <input
                      type="datetime-local"
                      value={form.downtimeEnd}
                      onChange={(e) => setForm((prev) => ({ ...prev, downtimeEnd: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
                    />
                  </label>
                </div>
              )}
            </div>
          )}

          <label className="block text-xs font-semibold text-slate-700 space-y-1">
            <span>Title</span>
            <input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder={form.kind === 'update' ? 'New: live GPS on the trip board' : 'We will be offline tonight'}
            />
          </label>
          <label className="block text-xs font-semibold text-slate-700 space-y-1">
            <span>Popup message</span>
            <textarea
              rows={5}
              value={form.message}
              onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Write what customers should know. For updates, list the new features."
            />
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
            />
            Active (show to everyone until the end date)
          </label>

          {error && <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs p-2.5">{error}</div>}

          <div className="flex justify-end gap-2">
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm({ ...EMPTY_FORM, showUntil: defaultShowUntil() });
                }}
                className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold"
              >
                Cancel edit
              </button>
            )}
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              {editingId ? 'Save notice' : 'Publish notice'}
            </button>
          </div>
        </form>

        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          {platformNotices.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">No notices yet.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {platformNotices.map((notice) => {
                const live = isNoticeLive(notice);
                const blocking = isDowntimeBlocking(notice);
                return (
                  <li key={notice.id} className="p-4 flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          notice.kind === 'maintenance' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-blue-50 text-blue-800 border border-blue-200'
                        }`}>
                          {notice.kind === 'maintenance'
                            ? (notice.hasDowntime ? 'Maintenance · downtime' : 'Maintenance · no downtime')
                            : 'Update'}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          blocking
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : live ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {blocking ? 'Blocking the app' : live ? 'Live popup' : 'Not showing'}
                        </span>
                      </div>
                      <div className="font-semibold text-slate-900 mt-1">{notice.title}</div>
                      <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap line-clamp-3">{notice.message}</p>
                      <p className="text-[11px] text-slate-400 mt-1">Until {new Date(notice.showUntil).toLocaleString('en-PH')}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEdit(notice)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] font-bold"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!window.confirm('Delete this notice?')) return;
                          void deletePlatformNotice(notice.id);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 text-[11px] font-bold"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
