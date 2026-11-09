import React, { useState } from 'react';
import type { AdminProfileFields } from '../../../services/adminUserActions';
import type { UserRow } from './types';
import { PASSWORD_POLICY, displayName, isStrongPassword } from './userHelpers';
import { Modal, fieldClass, labelClass, primaryButtonClass, secondaryButtonClass } from './ui';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface NewUserValues {
  name: string;
  email: string;
  phone?: string;
  password: string;
}

interface AddUserModalProps {
  locked: boolean;
  onClose: () => void;
  onReview: (values: NewUserValues) => void;
}

/** Collects the new account details. The parent shows a confirmation before calling createUserAsAdmin. */
export const AddUserModal: React.FC<AddUserModalProps> = ({ locked, onClose, onReview }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    let problem: string | null = null;
    if (!trimmedName) problem = 'Enter the full name.';
    else if (!EMAIL_PATTERN.test(trimmedEmail)) problem = 'Enter a valid email address.';
    else if (!isStrongPassword(password)) problem = PASSWORD_POLICY;
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    const trimmedPhone = phone.trim();
    onReview({ name: trimmedName, email: trimmedEmail, phone: trimmedPhone || undefined, password });
  };

  return (
    <Modal
      title="Add user"
      description="Creates a sign-in account with the password you set. The account is created active and is not an administrator."
      locked={locked}
      onClose={onClose}
    >
      <form onSubmit={submit} noValidate>
        <fieldset disabled={locked} className="space-y-4">
          <div>
            <label htmlFor="add-user-name" className={labelClass}>
              Full name
            </label>
            <input
              id="add-user-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="off"
              placeholder="e.g. John Doe"
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="add-user-email" className={labelClass}>
              Email address
            </label>
            <input
              id="add-user-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="off"
              placeholder="e.g. john@example.com"
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="add-user-phone" className={labelClass}>
              Phone (optional)
            </label>
            <input
              id="add-user-phone"
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              autoComplete="off"
              placeholder="+233…"
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="add-user-password" className={labelClass}>
              Temporary password
            </label>
            <input
              id="add-user-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              aria-describedby="add-user-password-policy"
              className={fieldClass}
            />
            <p id="add-user-password-policy" className="mt-1 text-xs text-slate-500">
              {PASSWORD_POLICY}
            </p>
          </div>
        </fieldset>
        {error && (
          <p role="alert" className="mt-4 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={locked} className={secondaryButtonClass}>
            Cancel
          </button>
          <button type="submit" disabled={locked} className={primaryButtonClass}>
            Continue
          </button>
        </div>
      </form>
    </Modal>
  );
};

type ProfileDraft = {
  name: string;
  phone: string;
  age: string;
  gender: string;
  location: string;
  country: string;
  bio: string;
  denomination: string;
};

const TEXT_KEYS = ['name', 'phone', 'gender', 'location', 'country', 'bio', 'denomination'] as const;

function draftFrom(user: UserRow): ProfileDraft {
  return {
    name: user.name ?? '',
    phone: user.phone ?? '',
    age: user.age === undefined || user.age === null ? '' : String(user.age),
    gender: user.gender ?? '',
    location: user.location ?? '',
    country: user.country ?? '',
    bio: user.bio ?? '',
    denomination: user.denomination ?? '',
  };
}

/** Returns only the fields that differ from the stored profile, so unchanged data is not rewritten. */
function changedFields(user: UserRow, draft: ProfileDraft): { fields: AdminProfileFields; error: string | null } {
  const fields: AdminProfileFields = {};
  if (!draft.name.trim()) return { fields, error: 'Name is required.' };

  let age: number | undefined;
  const ageText = draft.age.trim();
  if (ageText !== '') {
    age = Number(ageText);
    if (!Number.isInteger(age) || age < 0 || age > 120) {
      return { fields, error: 'Age must be a whole number from 0 to 120.' };
    }
  }

  for (const key of TEXT_KEYS) {
    const value = draft[key].trim();
    if (value !== (user[key] ?? '').trim()) fields[key] = value;
  }
  if (age !== undefined && age !== user.age) fields.age = age;
  return { fields, error: null };
}

interface EditProfileModalProps {
  user: UserRow;
  locked: boolean;
  onClose: () => void;
  onReview: (fields: AdminProfileFields) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ user, locked, onClose, onReview }) => {
  const [draft, setDraft] = useState<ProfileDraft>(() => draftFrom(user));
  const [error, setError] = useState<string | null>(null);

  const update =
    (key: keyof ProfileDraft) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setDraft((current) => ({ ...current, [key]: event.target.value }));

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = changedFields(user, draft);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (Object.keys(result.fields).length === 0) {
      setError('No changes to save.');
      return;
    }
    setError(null);
    onReview(result.fields);
  };

  // Keep the stored gender visible even if it is not one of the standard options.
  const genderOptions = ['', 'Male', 'Female'];
  if (draft.gender && !genderOptions.includes(draft.gender)) genderOptions.push(draft.gender);

  return (
    <Modal
      title={`Edit profile: ${displayName(user)}`}
      description="Only the fields you change are saved."
      locked={locked}
      wide
      onClose={onClose}
    >
      <form onSubmit={submit} noValidate>
        <fieldset disabled={locked} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="edit-name" className={labelClass}>
              Full name
            </label>
            <input id="edit-name" value={draft.name} onChange={update('name')} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="edit-phone" className={labelClass}>
              Telephone number
            </label>
            <input id="edit-phone" type="tel" value={draft.phone} onChange={update('phone')} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="edit-age" className={labelClass}>
              Age
            </label>
            <input
              id="edit-age"
              type="number"
              inputMode="numeric"
              min={0}
              max={120}
              step={1}
              value={draft.age}
              onChange={update('age')}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="edit-gender" className={labelClass}>
              Gender
            </label>
            <select id="edit-gender" value={draft.gender} onChange={update('gender')} className={fieldClass}>
              {genderOptions.map((option) => (
                <option key={option} value={option}>
                  {option || 'Not set'}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="edit-location" className={labelClass}>
              City / region
            </label>
            <input id="edit-location" value={draft.location} onChange={update('location')} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="edit-country" className={labelClass}>
              Country
            </label>
            <input id="edit-country" value={draft.country} onChange={update('country')} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="edit-denomination" className={labelClass}>
              Denomination
            </label>
            <input
              id="edit-denomination"
              value={draft.denomination}
              onChange={update('denomination')}
              maxLength={80}
              className={fieldClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="edit-bio" className={labelClass}>
              Bio
            </label>
            <textarea
              id="edit-bio"
              rows={4}
              maxLength={1000}
              value={draft.bio}
              onChange={update('bio')}
              className={fieldClass}
            />
            <p className="mt-1 text-xs text-slate-500">{draft.bio.length} / 1000</p>
          </div>
        </fieldset>
        {error && (
          <p role="alert" className="mt-4 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={locked} className={secondaryButtonClass}>
            Cancel
          </button>
          <button type="submit" disabled={locked} className={primaryButtonClass}>
            Review changes
          </button>
        </div>
      </form>
    </Modal>
  );
};
