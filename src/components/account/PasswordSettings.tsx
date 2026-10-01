import React, { useState } from 'react';
import { useFreight } from '../../context/FreightContext';
import { MIN_SIGNUP_PASSWORD_LENGTH } from '../../config/auth';

export const PasswordSettings: React.FC = () => {
  const { currentUser, changePassword, requestPasswordReset } = useFreight();
  const [currentPassword, setCurrentPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState<'change' | 'reset' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleChange = async () => {
    setError(null);
    setNotice(null);
    if (nextPassword !== confirmPassword) {
      setError('The new password and the confirmation do not match.');
      return;
    }
    setBusy('change');
    try {
      await changePassword(currentPassword, nextPassword);
      setCurrentPassword('');
      setNextPassword('');
      setConfirmPassword('');
      setNotice('Password changed. Use the new one the next time you sign in.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change the password.');
    } finally {
      setBusy(null);
    }
  };

  const handleReset = async () => {
    setError(null);
    setNotice(null);
    const email = (currentUser.email || '').trim();
    if (!email) {
      setError('This login has no email, so a reset link cannot be sent.');
      return;
    }
    setBusy('reset');
    const result = await requestPasswordReset(email);
    setBusy(null);
    if (!result.success) {
      setError(result.error || 'Could not send the reset email.');
      return;
    }
    setNotice(`We emailed a reset link to ${email}. Check Inbox and Spam, then choose a new password from that message.`);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-3">
      <div>
        <div className="font-bold text-slate-900">Password</div>
        <p className="text-slate-500 mt-0.5 leading-relaxed">
          Change it here with your current password, or email yourself a reset link if you do not remember it.
        </p>
      </div>

      <label className="block space-y-1">
        <span className="font-semibold text-slate-800">Current password</span>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500"
        />
      </label>
      <label className="block space-y-1">
        <span className="font-semibold text-slate-800">New password</span>
        <input
          type="password"
          value={nextPassword}
          onChange={(e) => setNextPassword(e.target.value)}
          autoComplete="new-password"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500"
        />
        <span className="text-slate-400">At least {MIN_SIGNUP_PASSWORD_LENGTH} characters.</span>
      </label>
      <label className="block space-y-1">
        <span className="font-semibold text-slate-800">Confirm new password</span>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500"
        />
      </label>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 p-2.5">{error}</div>
      )}
      {notice && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 p-2.5">{notice}</div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => { void handleChange(); }}
          disabled={busy !== null}
          className="h-9 px-3 rounded-lg bg-slate-900 text-white text-xs font-bold disabled:opacity-60"
        >
          {busy === 'change' ? 'Saving…' : 'Change password'}
        </button>
        <button
          type="button"
          onClick={() => { void handleReset(); }}
          disabled={busy !== null}
          className="h-9 px-3 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-semibold disabled:opacity-60"
        >
          {busy === 'reset' ? 'Sending…' : 'Email me a reset link'}
        </button>
      </div>
    </div>
  );
};
