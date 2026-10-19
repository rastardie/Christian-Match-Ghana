import React, { createContext, useContext, useEffect, useState } from 'react';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../../firebase';
import { loginWithPin } from '../../services/pinAuthService';
import {
  authenticateWithBiometry,
  checkNativeBiometry,
  isBiometricCapablePlatform,
} from '../../services/biometricAuthService';

interface ConfirmationOptions {
  title: string;
  description: string;
}

interface ConfirmationContextValue {
  confirmAdminAction: (options: ConfirmationOptions) => Promise<boolean>;
}

const ConfirmationContext = createContext<ConfirmationContextValue | null>(null);

export const useAdminActionConfirmation = (): ConfirmationContextValue => {
  const context = useContext(ConfirmationContext);
  if (!context) throw new Error('useAdminActionConfirmation must be used inside AdminActionProvider');
  return context;
};

export const AdminActionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pending, setPending] = useState<{
    options: ConfirmationOptions;
    resolve: (confirmed: boolean) => void;
  } | null>(null);
  const [method, setMethod] = useState<'password' | 'pin'>('password');
  const [credential, setCredential] = useState('');
  const [error, setError] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!pending || !isBiometricCapablePlatform()) {
      setBiometricAvailable(false);
      return;
    }
    void checkNativeBiometry().then((result) => {
      setBiometricAvailable(Boolean(result?.isAvailable && result.deviceIsSecure));
    }).catch(() => setBiometricAvailable(false));
  }, [pending]);

  const close = (confirmed: boolean) => {
    pending?.resolve(confirmed);
    setPending(null);
    setCredential('');
    setError('');
    setBusy(false);
  };

  const confirmAdminAction = (options: ConfirmationOptions) => new Promise<boolean>((resolve) => {
    setPending({ options, resolve });
  });

  const verify = async () => {
    if (!auth.currentUser) {
      setError('Your Admin session has expired. Please sign in again.');
      return;
    }
    if (!credential.trim()) {
      setError(`Enter your Admin ${method}.`);
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (method === 'pin') {
        await loginWithPin(auth.currentUser.email || '', credential.trim());
      } else {
        if (!auth.currentUser.email) throw new Error('Your Admin account has no email address.');
        const authCredential = EmailAuthProvider.credential(auth.currentUser.email, credential);
        await reauthenticateWithCredential(auth.currentUser, authCredential);
      }
      close(true);
    } catch {
      setBusy(false);
      setError(`Admin ${method} verification failed.`);
    }
  };

  const verifyBiometric = async () => {
    setBusy(true);
    setError('');
    try {
      await authenticateWithBiometry();
      close(true);
    } catch (verificationError: any) {
      setBusy(false);
      setError(verificationError?.message || 'Biometric confirmation failed.');
    }
  };

  return (
    <ConfirmationContext.Provider value={{ confirmAdminAction }}>
      {children}
      {pending && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-950/70 p-4" role="presentation" onClick={() => close(false)}>
          <div className="w-full max-w-sm max-h-[85dvh] overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="admin-action-confirm-title" onClick={(event) => event.stopPropagation()}>
            <h2 id="admin-action-confirm-title" className="text-lg font-black text-slate-900">{pending.options.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{pending.options.description}</p>
            <div className="mt-4 flex rounded-lg bg-slate-100 p-1">
              <button type="button" onClick={() => { setMethod('password'); setCredential(''); setError(''); }} className={`flex-1 rounded-md px-3 py-2 text-xs font-black ${method === 'password' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Password</button>
              <button type="button" onClick={() => { setMethod('pin'); setCredential(''); setError(''); }} className={`flex-1 rounded-md px-3 py-2 text-xs font-black ${method === 'pin' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>PIN</button>
            </div>
            <input autoFocus type={method === 'pin' ? 'password' : 'password'} inputMode={method === 'pin' ? 'numeric' : 'text'} value={credential} onChange={(event) => setCredential(event.target.value)} placeholder={`Admin ${method}`} className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold text-slate-800 focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/20" />
            {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{error}</p>}
            <div className="mt-5 grid gap-2">
              <button type="button" onClick={() => void verify()} disabled={busy} className="rounded-xl bg-brand-orange px-4 py-3 text-sm font-black text-white disabled:opacity-50">{busy ? 'Verifying…' : 'Confirm with credential'}</button>
              {biometricAvailable && <button type="button" onClick={() => void verifyBiometric()} disabled={busy} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 disabled:opacity-50">Confirm with biometrics</button>}
              <button type="button" onClick={() => close(false)} disabled={busy} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-600">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmationContext.Provider>
  );
};
