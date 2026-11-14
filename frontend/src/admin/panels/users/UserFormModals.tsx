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

const PROFILE_EDIT_KEYS = [
  'name', 'phone', 'dob', 'age', 'gender', 'country', 'location', 'bio', 'height',
  'maritalStatus', 'hasChildren', 'wantChildren', 'bodyType', 'complexion', 'languages',
  'smoking', 'alcohol', 'drinking', 'healthCondition', 'lifestyleInfo',
  'denomination', 'churchName', 'churchAttendance', 'churchInvolvement', 'bibleReadingFreq',
  'prayerFreq', 'faithMaturity', 'favoriteVerse', 'spiritualLesson', 'faithStatement',
  'education', 'profession', 'occupation', 'incomeRange', 'intentions', 'lookingFor',
  'intendToMarry', 'willingToRelocate', 'acceptsLongDistance', 'preferredAgeMin',
  'preferredAgeMax', 'preferredLocation', 'preferredDenomination', 'preferredEthnicGroup',
  'dealBreakers',
] as const;

type ProfileKey = (typeof PROFILE_EDIT_KEYS)[number];
type ProfileDraft = Record<ProfileKey, string>;

const PROFILE_SECTIONS: Array<{ title: string; keys: ProfileKey[] }> = [
  { title: 'Identity and contact', keys: ['name', 'phone', 'dob', 'age', 'gender', 'country', 'location', 'bio'] },
  { title: 'Personal and lifestyle', keys: ['height', 'maritalStatus', 'hasChildren', 'wantChildren', 'bodyType', 'complexion', 'languages', 'smoking', 'alcohol', 'drinking', 'healthCondition', 'lifestyleInfo'] },
  { title: 'Faith and church', keys: ['denomination', 'churchName', 'churchAttendance', 'churchInvolvement', 'bibleReadingFreq', 'prayerFreq', 'faithMaturity', 'favoriteVerse', 'spiritualLesson', 'faithStatement'] },
  { title: 'Education and work', keys: ['education', 'profession', 'occupation', 'incomeRange'] },
  { title: 'Relationship intentions and preferences', keys: ['intentions', 'lookingFor', 'intendToMarry', 'willingToRelocate', 'acceptsLongDistance', 'preferredAgeMin', 'preferredAgeMax', 'preferredLocation', 'preferredDenomination', 'preferredEthnicGroup', 'dealBreakers'] },
];

const PROFILE_LABELS: Record<ProfileKey, string> = {
  name: 'Full name', phone: 'Telephone number', dob: 'Date of birth', age: 'Age', gender: 'Gender', country: 'Country', location: 'City / region', bio: 'Bio',
  height: 'Height', maritalStatus: 'Marital status', hasChildren: 'Has children', wantChildren: 'Wants children', bodyType: 'Body type', complexion: 'Complexion', languages: 'Languages', smoking: 'Smoking', alcohol: 'Alcohol', drinking: 'Drinking', healthCondition: 'Health condition', lifestyleInfo: 'Lifestyle information',
  denomination: 'Denomination', churchName: 'Church name', churchAttendance: 'Church attendance', churchInvolvement: 'Church involvement', bibleReadingFreq: 'Bible reading frequency', prayerFreq: 'Prayer frequency', faithMaturity: 'Faith maturity', favoriteVerse: 'Favorite Bible verse', spiritualLesson: 'Spiritual lesson', faithStatement: 'Faith statement',
  education: 'Education', profession: 'Profession', occupation: 'Occupation', incomeRange: 'Income range', intentions: 'Relationship intentions', lookingFor: 'Looking for', intendToMarry: 'Intends to marry', willingToRelocate: 'Willing to relocate', acceptsLongDistance: 'Accepts long distance', preferredAgeMin: 'Preferred minimum age', preferredAgeMax: 'Preferred maximum age', preferredLocation: 'Preferred location', preferredDenomination: 'Preferred denomination', preferredEthnicGroup: 'Preferred ethnic group', dealBreakers: 'Deal breakers',
};

const NUMERIC_KEYS = new Set<ProfileKey>(['age', 'height', 'preferredAgeMin', 'preferredAgeMax']);
const BOOLEAN_KEYS = new Set<ProfileKey>(['smoking', 'drinking', 'acceptsLongDistance']);

function userValue(user: UserRow, key: ProfileKey): unknown {
  return (user as UserRow & Record<string, unknown>)[key];
}

function draftFrom(user: UserRow): ProfileDraft {
  return Object.fromEntries(PROFILE_EDIT_KEYS.map((key) => [key, userValue(user, key) == null ? '' : String(userValue(user, key))])) as ProfileDraft;
}

/** Returns only fields that differ from the stored profile, so unchanged data is not rewritten. */
function changedFields(user: UserRow, draft: ProfileDraft): { fields: AdminProfileFields; error: string | null } {
  const fields: AdminProfileFields = {};
  const mutableFields = fields as Record<ProfileKey, unknown>;
  if (!draft.name.trim()) return { fields, error: 'Name is required.' };

  for (const key of PROFILE_EDIT_KEYS) {
    const raw = draft[key].trim();
    const previous = userValue(user, key);
    const previousText = previous == null ? '' : String(previous);
    if (raw === previousText) continue;
    if (NUMERIC_KEYS.has(key)) {
      if (raw === '') continue;
      const number = Number(raw);
      const max = key === 'height' ? 300 : key === 'age' ? 120 : 120;
      if (!Number.isFinite(number) || number < 0 || number > max) return { fields, error: `${PROFILE_LABELS[key]} must be between 0 and ${max}.` };
      mutableFields[key] = number;
    } else if (BOOLEAN_KEYS.has(key)) {
      if (raw !== 'true' && raw !== 'false' && raw !== '') return { fields, error: `${PROFILE_LABELS[key]} must be true or false.` };
      mutableFields[key] = raw === 'true';
    } else {
      mutableFields[key] = raw;
    }
  }
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
    (key: ProfileKey) =>
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

  const renderField = (key: ProfileKey) => {
    const value = draft[key];
    const id = `edit-${key}`;
    const multiline = ['bio', 'healthCondition', 'lifestyleInfo', 'churchInvolvement', 'spiritualLesson', 'faithStatement', 'lookingFor', 'dealBreakers'].includes(key);
    const date = key === 'dob';
    const number = NUMERIC_KEYS.has(key);
    const boolean = BOOLEAN_KEYS.has(key);

    return (
      <div key={key} className={multiline ? 'sm:col-span-2' : undefined}>
        <label htmlFor={id} className={labelClass}>{PROFILE_LABELS[key]}</label>
        {boolean ? (
          <select id={id} value={value} onChange={update(key)} className={fieldClass}>
            <option value="">Not set</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        ) : multiline ? (
          <textarea id={id} rows={3} value={value} onChange={update(key)} className={fieldClass} />
        ) : (
          <input
            id={id}
            type={date ? 'date' : number ? 'number' : key === 'phone' ? 'tel' : 'text'}
            inputMode={number ? 'numeric' : undefined}
            min={number ? 0 : undefined}
            max={key === 'age' || key === 'preferredAgeMin' || key === 'preferredAgeMax' ? 120 : key === 'height' ? 300 : undefined}
            value={value}
            onChange={update(key)}
            className={fieldClass}
          />
        )}
      </div>
    );
  };

  return (
    <Modal
      title={`Edit profile: ${displayName(user)}`}
      description="Administrators can update the client's profile details. Security, subscription, verification, and admin fields remain protected."
      locked={locked}
      wide
      onClose={onClose}
    >
      <form onSubmit={submit} noValidate>
        <fieldset disabled={locked} className="space-y-6">
          {PROFILE_SECTIONS.map((section) => (
            <section key={section.title}>
              <h3 className="mb-3 border-b border-slate-200 pb-2 text-sm font-bold text-slate-800">{section.title}</h3>
              <div className="grid gap-4 sm:grid-cols-2">{section.keys.map(renderField)}</div>
            </section>
          ))}
        </fieldset>
        {error && (
          <p role="alert" className="mt-4 text-sm font-semibold text-red-700">{error}</p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={locked} className={secondaryButtonClass}>Cancel</button>
          <button type="submit" disabled={locked} className={primaryButtonClass}>Review changes</button>
        </div>
      </form>
    </Modal>
  );
};
