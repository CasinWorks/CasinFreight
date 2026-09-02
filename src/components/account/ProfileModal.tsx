import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Camera, Loader2, Trash2, User, X } from 'lucide-react';
import { useFreight } from '../../context/FreightContext';
import { closeIfBackdrop } from '../../lib/modal';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenOrgSetup?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, onOpenOrgSetup }) => {
  const {
    currentUser,
    updateCurrentUserProfile,
    uploadWorkspaceFile,
    isSoleOwnerAccount,
    deleteCurrentUserAccount,
  } = useFreight();

  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(currentUser.name || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [department, setDepartment] = useState(currentUser.department || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName(currentUser.name || '');
    setPhone(currentUser.phone || '');
    setDepartment(currentUser.department || '');
    setAvatarUrl(currentUser.avatarUrl || '');
    setError(null);
    setSaved(false);
    setShowDelete(false);
  }, [isOpen, currentUser.id]);

  if (!isOpen) return null;

  const handleUpload = async (file: File) => {
    setError(null);
    setIsUploading(true);
    try {
      const uploaded = await uploadWorkspaceFile('avatars', file);
      setAvatarUrl(uploaded.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload that photo.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    setError(null);
    setSaved(false);
    setIsSaving(true);
    try {
      await updateCurrentUserProfile({
        name,
        phone,
        department,
        avatarUrl,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4" onClick={closeIfBackdrop(onClose, isSaving || isUploading)}>
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">My profile</h3>
            <p className="text-xs text-slate-500 mt-0.5">Your photo and basic details. Email and role stay as they are.</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto text-xs">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={isUploading}
              className="relative w-16 h-16 rounded-full overflow-hidden border border-slate-200 bg-slate-100 shrink-0"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="w-full h-full flex items-center justify-center text-slate-500">
                  <User className="w-7 h-7" />
                </span>
              )}
              <span className="absolute inset-x-0 bottom-0 bg-slate-900/70 text-white text-[9px] font-bold py-0.5 flex items-center justify-center gap-1">
                {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                Photo
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) void handleUpload(file);
              }}
            />
            <div className="min-w-0">
              <div className="font-bold text-slate-900 text-sm truncate">{currentUser.name || 'Your name'}</div>
              <div className="text-slate-500 truncate">{currentUser.email}</div>
              <div className="text-[10px] font-mono text-blue-700 mt-1">{currentUser.role}</div>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl('')}
                  className="mt-1 text-[11px] font-semibold text-slate-500 hover:text-rose-700"
                >
                  Remove photo
                </button>
              )}
            </div>
          </div>

          <label className="block space-y-1">
            <span className="font-semibold text-slate-800">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </label>

          <label className="block space-y-1">
            <span className="font-semibold text-slate-800">Email</span>
            <input
              value={currentUser.email}
              readOnly
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
            />
            <span className="text-slate-400">This is how you sign in. It cannot be changed here.</span>
          </label>

          <label className="block space-y-1">
            <span className="font-semibold text-slate-800">Mobile</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09xx xxx xxxx"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </label>

          <label className="block space-y-1">
            <span className="font-semibold text-slate-800">Department</span>
            <input
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="Dispatch, Billing, Fleet…"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </label>

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 p-2.5">{error}</div>
          )}
          {saved && !error && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 p-2.5">Profile saved.</div>
          )}

          <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 space-y-2">
            <div className="flex items-center gap-2 text-rose-800 font-bold">
              <AlertTriangle className="w-4 h-4" />
              Delete account
            </div>
            {isSoleOwnerAccount ? (
              <p className="text-slate-600">
                You are the only Owner of this company. Delete the company in Company setup, or assign another Owner first.
              </p>
            ) : (
              <p className="text-slate-600">
                Permanently remove your login and your seat on this company. Trip and invoice records stay with the company.
              </p>
            )}
            {isSoleOwnerAccount && onOpenOrgSetup ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenOrgSetup();
                }}
                className="text-xs font-bold text-rose-700 hover:underline"
              >
                Open Company setup
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowDelete(true)}
                disabled={isSoleOwnerAccount}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-300 bg-white text-rose-700 font-bold disabled:opacity-40"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete my account
              </button>
            )}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50">
            Close
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving || isUploading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white font-bold disabled:opacity-40 hover:bg-blue-700"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save profile
          </button>
        </div>
      </div>

      {showDelete && (
        <DeleteAccountModal
          email={currentUser.email}
          onClose={() => setShowDelete(false)}
          onConfirm={deleteCurrentUserAccount}
        />
      )}
    </div>
  );
};

const DeleteAccountModal: React.FC<{
  email: string;
  onClose: () => void;
  onConfirm: (password: string) => Promise<void>;
}> = ({ email, onClose, onConfirm }) => {
  const [typedEmail, setTypedEmail] = useState('');
  const [typedConfirm, setTypedConfirm] = useState('');
  const [password, setPassword] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailMatches = typedEmail.trim().toLowerCase() === email.trim().toLowerCase();
  const phraseMatches = typedConfirm.trim().toUpperCase() === 'DELETE';
  const canDelete = emailMatches && phraseMatches && acknowledged && Boolean(password.trim()) && !isDeleting;

  const handleDelete = async () => {
    if (!canDelete) return;
    setError(null);
    setIsDeleting(true);
    try {
      await onConfirm(password);
    } catch (err) {
      setIsDeleting(false);
      const message = err instanceof Error ? err.message : 'Could not delete this account.';
      if (message.toLowerCase().includes('auth/invalid-credential') || message.toLowerCase().includes('wrong-password') || message.toLowerCase().includes('auth/wrong-password')) {
        setError('That password is not correct.');
        return;
      }
      setError(message);
    }
  };

  return (
    <div className="absolute inset-0 z-10 bg-slate-950/50 flex items-center justify-center p-4" onClick={closeIfBackdrop(onClose, isDeleting)}>
      <div className="bg-white border border-rose-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-rose-100 bg-rose-50 flex items-start justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Delete your account permanently?</h4>
            <p className="text-xs text-slate-600 mt-1">This cannot be undone. You will be signed out and cannot use this email until you are invited again.</p>
          </div>
          <button type="button" onClick={onClose} disabled={isDeleting} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-3 text-xs text-slate-700">
          <label className="block space-y-1">
            <span className="font-semibold text-slate-800">Type your email</span>
            <input
              value={typedEmail}
              onChange={(e) => setTypedEmail(e.target.value)}
              placeholder={email}
              autoComplete="off"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block space-y-1">
            <span className="font-semibold text-slate-800">Type DELETE</span>
            <input
              value={typedConfirm}
              onChange={(e) => setTypedConfirm(e.target.value)}
              placeholder="DELETE"
              autoComplete="off"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"
            />
          </label>
          <label className="block space-y-1">
            <span className="font-semibold text-slate-800">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} className="mt-0.5 rounded border-slate-300" />
            <span>I understand this login will be permanently deleted.</span>
          </label>
          {error && <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 p-2.5">{error}</div>}
        </div>
        <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={isDeleting} className="px-4 py-2 rounded-lg border border-slate-200 font-semibold">
            Keep account
          </button>
          <button
            type="button"
            disabled={!canDelete}
            onClick={() => void handleDelete()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 text-white font-bold disabled:opacity-40 hover:bg-rose-700"
          >
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete forever
          </button>
        </div>
      </div>
    </div>
  );
};
