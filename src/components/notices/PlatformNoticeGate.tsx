import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Bell, Clock, Megaphone, Wrench, X } from 'lucide-react';
import { useFreight } from '../../context/FreightContext';
import { isDowntimeBlocking, isNoticeLive } from '../../services/firestoreNotices';
import { dismissNotice, isNoticeDismissed } from '../../lib/noticeDismiss';
import type { PlatformNotice } from '../../types';

function formatWhen(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function NoticeBody({ notice }: { notice: PlatformNotice }) {
  return (
    <div className="space-y-2 text-sm text-slate-700 whitespace-pre-wrap">
      <p>{notice.message}</p>
      {notice.kind === 'maintenance' && notice.hasDowntime && (notice.downtimeStart || notice.downtimeEnd) && (
        <p className="text-xs text-slate-500 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          {notice.downtimeStart ? formatWhen(notice.downtimeStart) : 'Started'}
          {notice.downtimeEnd ? ` → ${formatWhen(notice.downtimeEnd)}` : ''}
        </p>
      )}
    </div>
  );
}

export const MaintenanceLockScreen: React.FC<{ notice: PlatformNotice }> = ({ notice }) => (
  <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
    <div className="bg-white text-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-amber-200">
      <div className="flex items-center gap-2 text-amber-700 font-bold text-xs uppercase tracking-wider">
        <AlertTriangle className="w-4 h-4" />
        CasinFreight is under maintenance
      </div>
      <h1 className="text-xl font-black text-slate-900 mt-2">{notice.title}</h1>
      <div className="mt-3">
        <NoticeBody notice={notice} />
      </div>
      <p className="text-xs text-slate-500 mt-4">
        Trips, billing, and fleet tools are paused until this window ends. If you are the CasinFreight owner, sign in to turn downtime off.
      </p>
    </div>
  </div>
);

export const PlatformNoticeGate: React.FC = () => {
  const { platformNotices, isPlatformAdmin, isAuthenticated, endActiveDowntime, activeDowntime } = useFreight();
  const [tick, setTick] = useState(0);
  const [ending, setEnding] = useState(false);
  const [openPopup, setOpenPopup] = useState<PlatformNotice | null>(null);
  const closedThisSession = useRef<Set<string>>(new Set());

  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 15000);
    return () => window.clearInterval(timer);
  }, []);

  const hideNotice = (notice: PlatformNotice) => {
    closedThisSession.current.add(notice.id);
    dismissNotice(notice.id, notice.updatedAt);
    setOpenPopup((current) => (current?.id === notice.id ? null : current));
    setTick((value) => value + 1);
  };

  const live = useMemo(
    () => platformNotices.filter((notice) => isNoticeLive(notice)),
    [platformNotices, tick]
  );

  const visible = live.filter((notice) => {
    if (closedThisSession.current.has(notice.id)) return false;
    return !isNoticeDismissed(notice.id, notice.updatedAt);
  });

  const blocking = activeDowntime || live.find((notice) => isDowntimeBlocking(notice));
  const popup = visible.find((notice) => notice.id !== blocking?.id);
  const banners = visible.filter((notice) => {
    if (notice.id === blocking?.id) return false;
    if (notice.kind === 'update') return false;
    return true;
  });

  useEffect(() => {
    setOpenPopup(popup || null);
  }, [popup?.id, popup?.updatedAt]);

  useEffect(() => {
    if (!openPopup) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') hideNotice(openPopup);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openPopup?.id, openPopup?.updatedAt]);

  return (
    <>
      {banners.length > 0 && (
        <div className="fixed top-0 left-0 right-0 z-40 pointer-events-none">
          <div className="max-w-3xl mx-auto pt-2 px-3 space-y-2 pointer-events-auto">
            {banners.map((notice) => (
              <div
                key={notice.id}
                className={`rounded-xl border shadow-lg px-3 py-2.5 flex items-start gap-2.5 ${
                  notice.kind === 'maintenance'
                    ? 'bg-amber-50 border-amber-200 text-amber-950'
                    : 'bg-blue-50 border-blue-200 text-slate-900'
                }`}
              >
                {notice.kind === 'maintenance'
                  ? <Wrench className="w-4 h-4 mt-0.5 shrink-0" />
                  : <Megaphone className="w-4 h-4 mt-0.5 shrink-0 text-blue-700" />}
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold">{notice.title}</div>
                  <div className="text-[11px] mt-0.5 line-clamp-2">{notice.message}</div>
                </div>
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    hideNotice(notice);
                  }}
                  className="w-11 h-11 shrink-0 rounded-lg hover:bg-white/70 text-slate-500 flex items-center justify-center"
                  aria-label="Dismiss notice"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {blocking && isPlatformAdmin && isAuthenticated && (
        <div className="fixed top-0 left-0 right-0 z-[95] bg-amber-500 text-amber-950 px-4 py-2.5 shadow-lg">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              Downtime is on — other users cannot operate CasinFreight. ({blocking.title})
            </span>
            <button
              type="button"
              disabled={ending}
              onClick={() => {
                setEnding(true);
                void endActiveDowntime().finally(() => setEnding(false));
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-950 text-white font-bold disabled:opacity-60"
            >
              {ending ? 'Ending…' : 'End downtime now'}
            </button>
          </div>
        </div>
      )}

      {openPopup && (
        <div
          className="fixed inset-0 z-[75] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => hideNotice(openPopup)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="platform-notice-title"
            onClick={(event) => event.stopPropagation()}
            className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200"
          >
            <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  openPopup.kind === 'maintenance' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {openPopup.kind === 'maintenance' ? <Bell className="w-4 h-4" /> : <Megaphone className="w-4 h-4" />}
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {openPopup.kind === 'maintenance'
                      ? (openPopup.hasDowntime ? 'Maintenance with downtime' : 'Maintenance notice')
                      : 'What is new'}
                  </div>
                  <h2 id="platform-notice-title" className="text-lg font-black text-slate-900 mt-0.5">{openPopup.title}</h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => hideNotice(openPopup)}
                className="w-11 h-11 rounded-lg text-slate-400 hover:bg-slate-100 flex items-center justify-center shrink-0"
                aria-label="Close notice"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-5 py-4 max-h-[50vh] overflow-y-auto">
              <NoticeBody notice={openPopup} />
            </div>
            <div className="px-5 py-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => hideNotice(openPopup)}
                className="w-full sm:w-auto min-h-12 px-5 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
