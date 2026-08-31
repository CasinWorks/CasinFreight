import React from 'react';
import { ShieldCheck, MapPin, Phone, Mail, CheckCircle } from 'lucide-react';
import { LanguageMode } from '../types';
import { CasinFreightLogo } from '../../components/brand/CasinFreightLogo';
import { CasinWorksCredit } from '../../components/brand/CasinWorksCredit';
import { VAT_EWT_DISCLAIMER } from '../../content/taxCopy';

interface FooterProps {
  languageMode: LanguageMode;
  onOpenAuth: (mode: 'signin' | 'signup') => void;
  onOpenStoryModal: () => void;
}

export const Footer: React.FC<FooterProps> = ({ languageMode, onOpenAuth, onOpenStoryModal }) => {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Top Footer Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Col 1 & 2: Brand & Mission */}
          <div className="lg:col-span-2 space-y-4 text-left">
            <div className="flex items-center gap-3">
              <CasinFreightLogo className="w-10 h-10 rounded-xl shadow-xs" />
              <span className="text-2xl font-black tracking-tight text-white font-display">
                Casin<span className="text-blue-400">Freight</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              The premier Philippine trucking operations platform. Eliminating paper delivery receipts, preventing DPWH overload penalties, and computing VAT and EWT on freight bills for logistics business owners nationwide.
            </p>
            <div className="flex items-center gap-3 pt-2 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                SEC & DTI Registered
              </span>
              <span className="inline-flex items-center gap-1 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                <CheckCircle className="w-4 h-4 text-blue-400" />
                12% VAT + 2% EWT calculator
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed max-w-sm">
              {VAT_EWT_DISCLAIMER}
            </p>
          </div>

          {/* Col 3: Quick Links */}
          <div className="space-y-3 text-left">
            <h4 className="text-sm font-extrabold uppercase tracking-wider text-white">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  type="button"
                  onClick={onOpenStoryModal}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  📱 Mobile Story Tutorial
                </button>
              </li>
              <li>
                <a href="#how-it-works" className="text-slate-400 hover:text-white transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#features" className="text-slate-400 hover:text-white transition-colors">
                  DPWH Weight Checker
                </a>
              </li>
              <li>
                <a href="#demo" className="text-slate-400 hover:text-white transition-colors">
                  Digital e-POD Waybill
                </a>
              </li>
              <li>
                <a href="#calculator" className="text-slate-400 hover:text-white transition-colors">
                  Savings Calculator
                </a>
              </li>
              <li>
                <a href="#pricing" className="text-slate-400 hover:text-white transition-colors">
                  Founding Pricing
                </a>
              </li>
              <li>
                <a href="#faq" className="text-slate-400 hover:text-white transition-colors">
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Founding Offer */}
          <div className="space-y-3 text-left">
            <h4 className="text-sm font-extrabold uppercase tracking-wider text-white">Founding Pricing</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="text-white font-bold">₱899/mo Year 1 Lock</li>
              <li>Includes 5 Trucks</li>
              <li>30-Day Free Trial</li>
              <li>Cut-off: Dec 31, 2026</li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenAuth('signup')}
                  className="text-emerald-400 hover:text-emerald-300 font-bold underline cursor-pointer"
                >
                  Claim 1 Month Free →
                </button>
              </li>
            </ul>
          </div>

          {/* Col 5: Manila Office & Hotline */}
          <div className="space-y-3 text-left">
            <h4 className="text-sm font-extrabold uppercase tracking-wider text-white">Support & Office</h4>
            <div className="space-y-2 text-xs text-slate-400">
              <p className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>Metro Manila, Philippines</span>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                <a href="tel:09190036230" className="text-white font-bold hover:text-emerald-300 transition-colors">
                  0919-003-6230
                </a>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                <a
                  href="mailto:christianjoshuacasin@gmail.com"
                  className="text-slate-300 hover:text-white break-all transition-colors"
                >
                  christianjoshuacasin@gmail.com
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Copyright & Trust Line */}
        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="space-y-1">
            <p>© {new Date().getFullYear()} CasinFreight. All rights reserved.</p>
            <CasinWorksCredit className="text-slate-500" />
          </div>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-slate-400">Privacy Policy</a>
            <span>•</span>
            <a href="#" className="hover:text-slate-400">Terms of Service</a>
            <span>•</span>
            <a href="#" className="hover:text-slate-400">Security Guarantee</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
