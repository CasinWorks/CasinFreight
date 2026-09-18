import React, { useMemo, useState } from 'react';
import { ArrowRight, BookOpen, CircleHelp, Play, Sparkles } from 'lucide-react';
import { FAQ_ITEMS, HELP_GUIDES, helpToolDestination, tutorialStepForGuide } from '../../content/helpContent';
import { useTutorial } from '../tutorial';

interface HowToPageProps {
  onOpenTool: (guideId: string) => void;
}

export const HowToPage: React.FC<HowToPageProps> = ({ onOpenTool }) => {
  const { startTutorial, startTutorialAt } = useTutorial();
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string>(HELP_GUIDES[0]?.id ?? 'board');
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  const guides = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return HELP_GUIDES;
    return HELP_GUIDES.filter(
      (guide) =>
        guide.title.toLowerCase().includes(q) ||
        guide.summary.toLowerCase().includes(q) ||
        guide.steps.some((step) => step.toLowerCase().includes(q))
    );
  }, [query]);

  const faqs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FAQ_ITEMS;
    return FAQ_ITEMS.filter(
      (item) => item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q)
    );
  }, [query]);

  const showOnScreen = (guideId: string) => {
    onOpenTool(guideId);
    const stepId = tutorialStepForGuide(guideId);
    if (!stepId) return;
    window.setTimeout(() => startTutorialAt(stepId, { single: true }), 180);
  };

  return (
    <div data-tutorial="help-page" className="flex-1 flex flex-col min-w-0 bg-slate-50 text-slate-900 overflow-y-auto">
      <div className="p-4 md:px-6 md:pt-6 md:pb-4 border-b border-slate-200 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">How to use CasinFreight</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Open a guide, then tap Show on screen to jump there with a highlight. Or replay the full tour.
            </p>
          </div>
          <button
            type="button"
            onClick={startTutorial}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold"
          >
            <Play className="w-3.5 h-3.5" />
            Replay guided tour
          </button>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search how-to or FAQ…"
          className="mt-4 w-full max-w-md bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
        />
      </div>

      <div className="p-4 md:p-6 space-y-8 max-w-3xl">
        <section className="space-y-2">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Features</h2>
          {guides.length === 0 && <p className="text-xs text-slate-500">No matching how-to.</p>}
          {guides.map((guide) => {
            const open = openId === guide.id;
            const canOpenTool = Boolean(helpToolDestination(guide.id));
            const canHighlight = Boolean(tutorialStepForGuide(guide.id));
            return (
              <div key={guide.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? '' : guide.id)}
                  className="w-full flex items-start gap-2 px-4 py-3 text-left"
                  aria-expanded={open}
                >
                  <CircleHelp className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-slate-900">{guide.title}</div>
                    <p className="text-[12px] text-slate-500">{guide.summary}</p>
                  </div>
                  <span className="text-slate-400 text-xs">{open ? '−' : '+'}</span>
                </button>
                {open && (
                  <div className="px-4 pb-4">
                    <ol className="list-decimal pl-4 space-y-1.5 text-xs text-slate-700">
                      {guide.steps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                    {guide.tips && guide.tips.length > 0 && (
                      <ul className="mt-3 space-y-1 text-[11px] text-slate-500">
                        {guide.tips.map((tip) => (
                          <li key={tip}>• {tip}</li>
                        ))}
                      </ul>
                    )}
                    {(canOpenTool || canHighlight) && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {canHighlight && (
                          <button
                            type="button"
                            onClick={() => showOnScreen(guide.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            Show on screen
                          </button>
                        )}
                        {canOpenTool && !canHighlight && (
                          <button
                            type="button"
                            onClick={() => onOpenTool(guide.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
                          >
                            Open this tool
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                    {guide.id === 'driverapp' && (
                      <p className="mt-3 text-[11px] text-slate-500">
                        Seal photos and warehouse e-POD run on the driver’s phone. Show on screen highlights Trip Board for the office side (Inbound → Delivered).
                      </p>
                    )}
                    {guide.id === 'tripfile' && (
                      <p className="mt-2 text-[11px] text-slate-500">
                        Opens Trip Board with a highlight — tap a load there for the full trip file.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </section>

        <section className="space-y-2">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">FAQ</h2>
          {faqs.map((item) => {
            const open = openFaq === item.id;
            return (
              <div key={item.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenFaq(open ? null : item.id)}
                  className="w-full flex items-center gap-2 px-4 py-3 text-left"
                >
                  <span className="flex-1 text-sm font-semibold text-slate-900">{item.question}</span>
                  <span className="text-slate-400 text-xs">{open ? '−' : '+'}</span>
                </button>
                {open && <p className="px-4 pb-3 text-xs text-slate-600 leading-relaxed">{item.answer}</p>}
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
};
