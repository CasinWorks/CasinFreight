import React, { useState } from 'react';
import { useFreight } from '../../context/FreightContext';
import { LegalPage, type LegalKind } from './LegalPage';

export const PrivacyConsentGate: React.FC = () => {
  const { isAuthenticated, isAuthLoading, currentUser, acceptPrivacyNotice } = useFreight();
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [legal, setLegal] = useState<LegalKind | null>(null);

  if (isAuthLoading || !isAuthenticated || currentUser.privacyAcceptedAt) return null;

  return (
    <>
      <div className="fixed inset-0 z-[85] bg-slate-950/80 flex items-end sm:items-center justify-center p-0 sm:p-6">
        <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl">
          <h2 className="text-lg font-black text-slate-900">Privacy agreement</h2>
          <p className="mt-2 text-sm text-slate-600">
            Before you continue, please read how CasinFreight handles names, emails, driver details, photos, and signatures. We do not sell this information.
          </p>
          <label className="mt-4 flex items-start gap-2 text-sm text-slate-800">
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) => setChecked(event.target.checked)}
              className="mt-1"
            />
            <span>
              I agree to the{' '}
              <button type="button" className="font-bold text-blue-700" onClick={() => setLegal('privacy')}>Privacy Notice</button>
              {' '}and{' '}
              <button type="button" className="font-bold text-blue-700" onClick={() => setLegal('terms')}>Terms</button>
              . I will only enter information my company is allowed to keep.
            </span>
          </label>
          {error && <p className="mt-2 text-xs text-rose-700">{error}</p>}
          <button
            type="button"
            disabled={!checked || busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                await acceptPrivacyNotice();
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Could not save your agreement.');
              } finally {
                setBusy(false);
              }
            }}
            className="mt-5 w-full py-3 rounded-2xl bg-blue-600 text-white font-black disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Agree and continue'}
          </button>
        </div>
      </div>
      {legal && <LegalPage kind={legal} onClose={() => setLegal(null)} />}
    </>
  );
};
