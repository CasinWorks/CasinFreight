import React, { useState } from 'react';
import { FileText, Shield, X } from 'lucide-react';

export type LegalKind = 'privacy' | 'terms';

const CONTACT = 'christianjoshuacasin@gmail.com';

interface LegalPageProps {
  kind: LegalKind;
  onClose: () => void;
}

export const LegalNoticeLinks: React.FC<{
  className?: string;
  onOpen?: () => void;
}> = ({ className = '', onOpen }) => {
  const [kind, setKind] = useState<LegalKind | null>(null);
  const open = (next: LegalKind) => {
    onOpen?.();
    setKind(next);
  };
  return (
    <>
      <button
        type="button"
        onClick={() => open('privacy')}
        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-[12px] font-medium text-slate-700 hover:bg-slate-50 ${className}`}
      >
        <Shield className="w-4 h-4 stroke-[1.75] text-slate-500 shrink-0" />
        Privacy Notice
      </button>
      <button
        type="button"
        onClick={() => open('terms')}
        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-[12px] font-medium text-slate-700 hover:bg-slate-50 ${className}`}
      >
        <FileText className="w-4 h-4 stroke-[1.75] text-slate-500 shrink-0" />
        Terms of use
      </button>
      {kind && <LegalPage kind={kind} onClose={() => setKind(null)} />}
    </>
  );
};

export const LegalPage: React.FC<LegalPageProps> = ({ kind, onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/70 flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="bg-white w-full max-w-2xl max-h-[96dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">CasinFreight</p>
            <h2 className="text-lg font-black text-slate-900">
              {kind === 'privacy' ? 'Privacy Notice' : 'Terms of use'}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-5 text-sm text-slate-700 space-y-4 leading-relaxed">
          {kind === 'privacy' ? <PrivacyBody /> : <TermsBody />}
          <p className="text-xs text-slate-500">
            Questions or a request about your information: <a className="font-bold text-blue-700" href={`mailto:${CONTACT}`}>{CONTACT}</a>
          </p>
        </div>
      </div>
    </div>
  );
};

function PrivacyBody() {
  return (
    <>
      <p>
        This notice explains what CasinFreight keeps so a trucking company can run trips, billing, and proof of delivery. It is written for the Philippine Data Privacy Act of 2012. It is not a claim that CasinFreight is registered with the National Privacy Commission, and it is not a promise that no dispute can ever arise.
      </p>
      <h3 className="font-black text-slate-900">What we keep</h3>
      <ul className="list-disc pl-5 space-y-1">
        <li>Account: your name, work email, and sign-in handled by Firebase. We do not keep your password in our own database.</li>
        <li>Company: business name, address, phone, email, and TIN if you enter them.</li>
        <li>People you add: names, emails, roles, and for drivers the phone number and license details you save.</li>
        <li>Operations: trips, clients, rates, invoices, fuel, and ledger entries your team types in.</li>
        <li>Proof of delivery: signatures, photos, and the receiver’s name when someone signs on the phone or on the website.</li>
        <li>Use of the app: last sign-in time, so the owner can see who is active.</li>
      </ul>
      <h3 className="font-black text-slate-900">Why</h3>
      <p>
        We use this only to provide the workspace your company opened: dispatch, delivery proof, roles, and billing records. We do not sell personal information.
      </p>
      <h3 className="font-black text-slate-900">Who can see it</h3>
      <p>
        People your company invites, according to their role. CasinFreight platform staff can open a workspace when needed for support. Google Firebase stores the data. Vercel hosts the website. PayMongo is used only if a paid checkout is turned on later. During the beta we are not collecting payment.
      </p>
      <h3 className="font-black text-slate-900">Your company’s duty</h3>
      <p>
        The fleet owner is responsible for having a proper reason to enter staff, driver, and client details, and for telling those people that their trip and delivery records are kept in CasinFreight.
      </p>
      <h3 className="font-black text-slate-900">How long, and your requests</h3>
      <p>
        Records stay while the company workspace is open. You may email us to access, correct, or delete your login. Deleting a login does not erase the company’s trips and invoices. The owner can ask us to delete a workspace.
      </p>
      <h3 className="font-black text-slate-900">Security</h3>
      <p>
        Access is limited by company and role. No online system is risk-free. Do not put passwords in trip notes or photos.
      </p>
    </>
  );
}

function TermsBody() {
  return (
    <>
      <p>
        By creating a company or joining a team, you agree to these terms and the Privacy Notice.
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>CasinFreight is a fleet operations tool. It does not register, transmit, or certify invoices with BIR. A bill in the app is not a Sales Invoice, Official Receipt, or CAS/PTU e-invoice.</li>
        <li>You confirm you are allowed to enter the company, staff, driver, and client information you save.</li>
        <li>Beta access is free through December 31, 2026. We are not collecting subscription fees while the business is not yet registered. Prices shown for later plans are not a bill today.</li>
        <li>You keep your own copies of records you need for tax, claims, or court. CasinFreight is not your lawyer, accountant, or insurer.</li>
        <li>We may suspend access that is used to harm others, break the law, or attack the service.</li>
        <li>These terms follow Philippine law. Write to us first if something is wrong so we can fix it.</li>
      </ul>
    </>
  );
}
