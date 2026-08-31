import React, { useState } from 'react';
import { ChevronDown, HelpCircle, PhoneCall, Sparkles, MessageCircle } from 'lucide-react';
import { FAQS } from '../data/mockData';
import { TextScale, LanguageMode } from '../types';

interface FaqSectionProps {
  textScale: TextScale;
  languageMode: LanguageMode;
  onOpenFullFaq?: () => void;
}

export const FaqSection: React.FC<FaqSectionProps> = ({ textScale, languageMode, onOpenFullFaq }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0); // First FAQ open by default

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  const isLarge = textScale === 'large';

  return (
    <section id="faq" className="py-10 sm:py-24 bg-slate-50 border-b border-slate-200 scroll-mt-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100 text-blue-900 text-xs sm:text-sm font-bold">
            <HelpCircle className="w-4 h-4 text-blue-700" />
            <span>
              {languageMode === 'en' ? 'Questions from Fleet Owners' : 'Mga Karaniwang Tanong'}
            </span>
          </div>

          <h2
            className={`font-black text-slate-900 tracking-tight font-display ${
              isLarge ? 'text-3xl sm:text-4xl lg:text-5xl' : 'text-2xl sm:text-3xl lg:text-4xl'
            }`}
          >
            {languageMode === 'en'
              ? 'Frequently Asked Questions'
              : 'Mga Sagot sa Iyong mga Tanong'}
          </h2>

          <p className="text-slate-600 text-base sm:text-lg">
            {languageMode === 'en'
              ? 'Clear, straightforward answers for non-technical business operators.'
              : 'Malinaw na paliwanag para sa mga may-ari ng negosyo.'}
          </p>
          {onOpenFullFaq && (
            <button
              type="button"
              onClick={onOpenFullFaq}
              className="text-sm font-bold text-blue-700 hover:underline"
            >
              {languageMode === 'en' ? 'Read the full FAQ & features →' : 'Tingnan ang buong FAQ →'}
            </button>
          )}
        </div>

        {/* FAQ Accordion List - Big & Accessible */}
        <div className="space-y-4">
          {FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;

            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border-2 border-slate-200 shadow-xs overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer focus:outline-hidden hover:bg-slate-50 transition-colors"
                >
                  <span
                    className={`font-extrabold text-slate-900 ${
                      isLarge ? 'text-lg sm:text-xl' : 'text-base sm:text-lg'
                    }`}
                  >
                    {faq.q}
                  </span>
                  <div
                    className={`w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 shrink-0 transition-transform ${
                      isOpen ? 'rotate-180 bg-blue-100 text-blue-700' : ''
                    }`}
                  >
                    <ChevronDown className="w-5 h-5" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-6 sm:px-6 text-slate-600 border-t border-slate-100 pt-4 leading-relaxed text-base">
                    <p>{faq.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Still Have Questions Box */}
        <div className="mt-12 bg-white rounded-3xl p-6 sm:p-8 border-2 border-blue-200 shadow-md text-center space-y-4">
          <h3 className="text-xl font-black text-slate-900">
            {languageMode === 'en' ? 'Have a special question about your trucks?' : 'May partikular ka bang tanong sa iyong fleet?'}
          </h3>
          <p className="text-slate-600 text-sm max-w-xl mx-auto">
            Our logistics support team in Metro Manila is available to answer all your questions via phone call or Viber message.
          </p>
          <div className="flex flex-wrap justify-center items-center gap-4 pt-2">
            <a
              href="tel:09190036230"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-base rounded-xl transition-all shadow-md cursor-pointer"
            >
              <PhoneCall className="w-5 h-5" />
              <span>Call 0919-003-6230</span>
            </a>
            <a
              href="https://viber.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-base rounded-xl transition-all shadow-md cursor-pointer"
            >
              <MessageCircle className="w-5 h-5" />
              <span>Message on Viber</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
