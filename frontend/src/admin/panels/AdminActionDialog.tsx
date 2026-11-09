import React, { useState } from 'react';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../../firebase';

export interface AdminActionDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  /** When true (default), the administrator must re-enter their password before the action runs. */
  requirePassword?: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

/**
 * Confirmation step for administrator actions. Re-checks the signed-in
 * administrator's password (Firebase re-authentication) before running the action.
 * The server still enforces permissions; this guards against accidental or unattended use.
 */
const AdminActionDialog: React.FC<AdminActionDialogProps> = ({
  open,
  title,
  description,
  confirmLabel,
  danger = false,
  requirePassword = true,
  onConfirm,
  onCancel,
}) => {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const close = () => {
    setPassword('');
    setError(null);
    setBusy(false);
    onCancel();
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (requirePassword) {
        const current = auth.currentUser;
        if (!current?.email) throw new Error('Your administrator session has expired. Sign in again.');
        if (!password) throw new Error('Enter your password to confirm.');
        await reauthenticateWithCredential(current, EmailAuthProvider.credential(current.email, password));
      }
      await onConfirm();
      setPassword('');
      setBusy(false);
      onCancel();
    } catch (err) {
      const message =
        err instanceof Error && err.message.includes('auth/')
          ? 'Your password was not accepted.'
          : err instanceof Error
            ? err.message
            : 'The action could not be completed.';
      setError(message);
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="presentation" onClick={close}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-action-title"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
        onSubmit={submit}
      >
        <h2 id="admin-action-title" className="text-lg font-bold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm text-slate-600">{description}</p>
        {requirePassword && (
          <label className="mt-4 block text-sm font-medium text-slate-700">
            Your administrator password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
              required
            />
          </label>
        )}
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={close} disabled={busy} className="rounded-lg px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100">
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className={`rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50 ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-orange hover:opacity-90'}`}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminActionDialog;
