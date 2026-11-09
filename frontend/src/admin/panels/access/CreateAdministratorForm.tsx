import React, { useState } from 'react';
import { createAdministrator } from '../../../services/adminRbacService';
import AdminActionDialog from '../AdminActionDialog';
import { buttonClass } from '../shared';
import type { FeedbackMessage } from './accessModel';

/** Matches the server's login name rule: 3–32 characters, lowercase letters, digits, dot, underscore, hyphen. */
const LOGIN_NAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/;
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 128;

interface CreateAdministratorFormProps {
  onCreated: () => void;
  onMessage: (message: FeedbackMessage) => void;
}

const fieldClass =
  'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none';

/** Super Admin only. The parent renders this component only for Super Admins; the server enforces it too. */
const CreateAdministratorForm: React.FC<CreateAdministratorFormProps> = ({ onCreated, onMessage }) => {
  const [loginName, setLoginName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirming, setConfirming] = useState(false);

  const login = loginName.trim().toLowerCase();
  const problems: string[] = [];
  if (login && !LOGIN_NAME_PATTERN.test(login)) problems.push('Username: 3–32 characters, letters, numbers, dot, underscore or hyphen.');
  if (email && !EMAIL_PATTERN.test(email.trim())) problems.push('Enter a valid email address.');
  if (password && (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH)) {
    problems.push(`Temporary password must be ${MIN_PASSWORD_LENGTH}–${MAX_PASSWORD_LENGTH} characters.`);
  }
  const ready =
    LOGIN_NAME_PATTERN.test(login) &&
    displayName.trim() !== '' &&
    EMAIL_PATTERN.test(email.trim()) &&
    password.length >= MIN_PASSWORD_LENGTH &&
    password.length <= MAX_PASSWORD_LENGTH;

  const submit = async () => {
    const created = await createAdministrator({
      loginName: login,
      email: email.trim(),
      displayName: displayName.trim(),
      password,
    });
    setLoginName('');
    setDisplayName('');
    setEmail('');
    setPassword('');
    onMessage({
      type: 'ok',
      text: `Super Admin ${created.displayName} created. They must change the temporary password at first sign-in.`,
    });
    onCreated();
  };

  return (
    <section aria-labelledby="access-create-admin-heading" className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm">
      <h2 id="access-create-admin-heading" className="text-lg font-black text-slate-900">
        Create administrator
      </h2>
      <p className="mb-4 text-sm text-slate-600">
        Creates a Super Admin account with a temporary password. The account must change the password at first sign-in.
      </p>

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (ready) setConfirming(true);
        }}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-semibold text-slate-700">
            Username
            <input
              type="text"
              value={loginName}
              onChange={(event) => setLoginName(event.target.value.toLowerCase())}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={32}
              required
              className={fieldClass}
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Full name
            <input
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              maxLength={120}
              required
              className={fieldClass}
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Email address
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="off"
              required
              className={fieldClass}
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Temporary password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              maxLength={MAX_PASSWORD_LENGTH}
              required
              aria-describedby="access-create-admin-password-hint"
              className={fieldClass}
            />
            <span id="access-create-admin-password-hint" className="mt-1 block text-xs font-normal text-slate-500">
              At least {MIN_PASSWORD_LENGTH} characters. Share it securely; it is not shown again.
            </span>
          </label>
        </div>

        {problems.length > 0 && (
          <ul className="space-y-1 text-sm text-amber-800" role="status">
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        )}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!ready}
            className={`${buttonClass} bg-brand-orange px-4 py-2 text-sm text-white`}
          >
            Create administrator
          </button>
        </div>
      </form>

      <AdminActionDialog
        open={confirming}
        title="Create administrator?"
        description={`Create a Super Admin account for ${displayName.trim() || login} (${email.trim()}). This is recorded in the audit log.`}
        confirmLabel="Create administrator"
        onConfirm={submit}
        onCancel={() => setConfirming(false)}
      />
    </section>
  );
};

export default CreateAdministratorForm;
