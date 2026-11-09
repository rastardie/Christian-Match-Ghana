import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithCustomToken, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '../firebase';
import { getCurrentAdminAccess } from '../services/adminRbacService';
import OverviewPanel from './panels/OverviewPanel';
import UsersPanel from './panels/UsersPanel';
import PrayersPanel from './panels/PrayersPanel';
import ModerationPanel from './panels/ModerationPanel';
import PaymentsPanel from './panels/PaymentsPanel';
import AuditPanel from './panels/AuditPanel';
import AccessPanel from './panels/AccessPanel';
import GroupsPanel from './panels/GroupsPanel';
import MessagesPanel from './panels/MessagesPanel';

type Access = { isSuperAdmin: boolean; permissions: string[] };

type Section =
  | 'overview'
  | 'users'
  | 'prayers'
  | 'moderation'
  | 'messages'
  | 'payments'
  | 'groups'
  | 'audit'
  | 'access';

// Each section is shown only to admins who hold its permission. Super admins see everything.
// The server (Firestore rules and callable functions) still enforces the same checks.
const SECTIONS: { key: Section; label: string; permission: string | null }[] = [
  { key: 'overview', label: 'Overview', permission: null },
  { key: 'users', label: 'Users', permission: 'users.view' },
  { key: 'prayers', label: 'Prayers', permission: 'users.view' },
  { key: 'moderation', label: 'Moderation', permission: 'messages.moderate' },
  { key: 'messages', label: 'Messages', permission: 'messages.view' },
  { key: 'payments', label: 'Payments', permission: 'payments.view' },
  { key: 'groups', label: 'Groups', permission: 'groups.manage' },
  { key: 'audit', label: 'Audit log', permission: 'audit.view' },
  { key: 'access', label: 'Access control', permission: 'permissions.manage' },
];

const canSee = (access: Access, permission: string | null) =>
  permission === null || access.isSuperAdmin || access.permissions.includes(permission);

const AdminConsole: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [access, setAccess] = useState<Access | null>(null);
  const [checking, setChecking] = useState(true);
  const [section, setSection] = useState<Section>('overview');
  const [login, setLogin] = useState('');
  const [secret, setSecret] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Firebase normally reports the session within a moment. If it stalls (for
    // example when the auth helper frame is blocked), show the sign-in form
    // instead of spinning forever. The listener still updates the page if Auth
    // responds later.
    const fallback = window.setTimeout(() => setChecking(false), 6000);
    const unsubscribe = onAuthStateChanged(auth, async (current) => {
      window.clearTimeout(fallback);
      setUser(current);
      if (!current) {
        setAccess(null);
        setChecking(false);
        return;
      }
      try {
        setAccess(await getCurrentAdminAccess());
      } catch (err) {
        console.error('Admin access check failed:', err);
        setAccess({ isSuperAdmin: false, permissions: [] });
      } finally {
        setChecking(false);
      }
    });
    return () => {
      window.clearTimeout(fallback);
      unsubscribe();
    };
  }, []);

  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      // Accept a login name (like the Dev admin account) or an email address.
      const identifier = login.trim();
      let loginEmail = identifier;
      if (!identifier.includes('@')) {
        const resolve = httpsCallable(functions, 'resolveLoginIdentifier');
        const result = await resolve({ identifier });
        loginEmail = String((result.data as { email?: string }).email || '');
      }
      if (!loginEmail) throw new Error('Invalid credentials.');

      // A 4–6 digit value is the admin PIN; anything else is the password.
      if (/^\d{4,6}$/.test(secret.trim())) {
        const result = await httpsCallable(functions, 'loginWithPin')({ identifier: loginEmail, pin: secret });
        const token = String((result.data as { token?: string }).token || '');
        if (!token) throw new Error('Invalid credentials.');
        await signInWithCustomToken(auth, token);
      } else {
        await signInWithEmailAndPassword(auth, loginEmail, secret);
      }

      const uid = auth.currentUser?.uid || '';
      const profile = await getDoc(doc(db, 'adminUsers', uid));
      if (profile.exists() && profile.data().mustChangePassword === true) {
        await signOut(auth);
        setError('Password change required. Change it in the Admin area of the app, then sign in here.');
        return;
      }

      // Only admin accounts may stay signed in here. Anyone else is signed out at once.
      const access = await getCurrentAdminAccess();
      if (!access.isSuperAdmin && access.permissions.length === 0) {
        await signOut(auth);
        setError('This account does not have admin access.');
      }
    } catch (err) {
      console.error('Admin sign-in failed:', err);
      setError('Sign-in failed. Check your login name and password.');
    } finally {
      setBusy(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-600">
        Checking access…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <form onSubmit={handleSignIn} className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
          <h1 className="text-2xl font-black text-slate-900">
            CMG <span className="text-brand-orange">Admin</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">Christian Match Ghana administration</p>
          <label className="mt-6 block text-sm font-semibold text-slate-700" htmlFor="admin-login">
            Login name or email
          </label>
          <input
            id="admin-login"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            value={login}
            onChange={(event) => setLogin(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-orange focus:outline-none"
          />
          <label className="mt-4 block text-sm font-semibold text-slate-700" htmlFor="admin-secret">
            Password or PIN
          </label>
          <input
            id="admin-secret"
            type="password"
            autoComplete="current-password"
            required
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-orange focus:outline-none"
          />
          {error && (
            <p role="alert" className="mt-3 text-sm font-medium text-red-600">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="mt-6 w-full rounded-lg bg-brand-orange py-3 font-bold text-white transition hover:brightness-95 disabled:opacity-60"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    );
  }

  const hasAnyAccess = access !== null && (access.isSuperAdmin || access.permissions.length > 0);

  if (!hasAnyAccess || access === null) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-lg">
          <h1 className="text-xl font-black text-slate-900">Access not granted</h1>
          <p className="mt-2 text-sm text-slate-600">
            {user.email} does not have admin permissions. Ask a super admin to grant access.
          </p>
          <button
            type="button"
            onClick={() => signOut(auth)}
            className="mt-6 w-full rounded-lg bg-slate-900 py-3 font-bold text-white"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  const current = SECTIONS.find((item) => item.key === section);
  const visibleSections = SECTIONS.filter((item) => canSee(access, item.permission));

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans text-slate-900">
      <aside className="flex w-60 shrink-0 flex-col bg-slate-900 text-white">
        <div className="border-b border-white/10 px-5 py-5">
          <div className="text-lg font-black">
            CMG <span className="text-brand-orange">Admin</span>
          </div>
          <div className="text-xs text-white/60">Christian Match Ghana</div>
        </div>
        <nav className="flex-1 space-y-1 p-3" aria-label="Admin sections">
          {visibleSections.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setSection(item.key)}
              aria-current={section === item.key ? 'page' : undefined}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${
                section === item.key ? 'bg-brand-orange text-white' : 'text-white/80 hover:bg-white/10'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4 text-xs text-white/70">
          <div className="truncate">{user.email}</div>
          <button
            type="button"
            onClick={() => signOut(auth)}
            className="mt-2 font-bold text-brand-orange"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-8">
        <h1 className="text-2xl font-black text-slate-900">{current?.label ?? 'Overview'}</h1>
        <div className="mt-6">
          {section === 'overview' && <OverviewPanel />}
          {section === 'users' && <UsersPanel />}
          {section === 'prayers' && <PrayersPanel />}
          {section === 'moderation' && <ModerationPanel />}
          {section === 'payments' && <PaymentsPanel />}
          {section === 'audit' && <AuditPanel />}
          {section === 'access' && <AccessPanel />}
          {section === 'groups' && <GroupsPanel />}
          {section === 'messages' && (
            <MessagesPanel canSend={access.isSuperAdmin || access.permissions.includes('messages.send')} />
          )}
          {!['overview', 'users', 'prayers', 'moderation', 'payments', 'audit', 'access', 'groups', 'messages'].includes(section) && (
            <div className="rounded-2xl bg-white p-8 text-slate-600 shadow-sm">
              This section is part of the next phase and will be added here.
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminConsole;
