import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '../firebase';
import { PASSWORD_POLICY, isStrongPassword } from '../admin/panels/users/userHelpers';

type PageState = 'checking' | 'ready' | 'invalid' | 'done';

/**
 * Reset page reached from the password reset email. Asks for the new password twice,
 * unlike Firebase's hosted action page, which has a single field.
 */
const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const oobCode = searchParams.get('oobCode') || '';
  const [state, setState] = useState<PageState>('checking');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!oobCode) {
      setState('invalid');
      return;
    }
    let active = true;
    verifyPasswordResetCode(auth, oobCode)
      .then((address) => {
        if (!active) return;
        setEmail(address);
        setState('ready');
      })
      .catch(() => {
        if (active) setState('invalid');
      });
    return () => {
      active = false;
    };
  }, [oobCode]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!isStrongPassword(password)) {
      setError(PASSWORD_POLICY);
      return;
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setState('done');
    } catch (err: any) {
      if (err?.code === 'auth/weak-password') {
        setError('Choose a stronger password.');
      } else if (err?.code === 'auth/expired-action-code' || err?.code === 'auth/invalid-action-code') {
        setState('invalid');
      } else {
        setError('Your password could not be reset. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        {state === 'checking' && <p className="text-center text-gray-600">Checking your reset link…</p>}

        {state === 'invalid' && (
          <div className="text-center space-y-4">
            <h1 className="text-lg font-semibold text-gray-900">This reset link is not valid</h1>
            <p className="text-sm text-gray-600">It may have expired or already been used. Request a new password reset email and try again.</p>
            <Link to="/" className="inline-block text-brand-orange font-semibold">Back to Christian Match Ghana</Link>
          </div>
        )}

        {state === 'done' && (
          <div className="text-center space-y-4">
            <h1 className="text-lg font-semibold text-gray-900">Your password has been reset</h1>
            <p className="text-sm text-gray-600">You can now sign in with your new password.</p>
            <Link to="/" className="inline-block bg-brand-orange text-white px-6 py-2.5 rounded-lg font-semibold">Go to sign in</Link>
          </div>
        )}

        {state === 'ready' && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="text-center">
              <h1 className="text-lg font-semibold text-gray-900">Reset your password</h1>
              <p className="text-sm text-gray-500 mt-1 break-all">for {email}</p>
            </div>
            <label className="block text-sm font-semibold text-gray-700">
              New password
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                required
              />
            </label>
            <label className="block text-sm font-semibold text-gray-700">
              Confirm password
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="mt-1 w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                required
              />
            </label>
            <p className="text-xs text-gray-500">{PASSWORD_POLICY}</p>
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={busy} className="w-full bg-brand-orange text-white py-3 rounded-lg font-semibold disabled:opacity-70">
              {busy ? 'Saving…' : 'Save new password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
