import React, { useEffect, useMemo, useState } from 'react';
import UserPicker from '../messages/UserPicker';
import type { AdminDirectoryUser } from '../messages/recipients';
import {
  ACCOUNT_STATE_OPTIONS,
  AUDIENCE_DESCRIPTION_MAX,
  AUDIENCE_NAME_MAX,
  COUNTRY_OPTIONS,
  GENDER_OPTIONS,
  audienceFormFromGroup,
  criteriaFromForm,
  emptyAudienceForm,
  hasMultiValueCriteria,
  validateAudienceForm,
  type AccountStateOption,
  type AudienceFormValues,
  type AudienceSaveInput,
  type CountryOption,
  type GenderOption,
} from './audienceModel';
import { previewAdminAudience, type AdminAudiencePreview, type DistributionGroup } from '../../../services/adminRbacService';
import { buttonClass, inputClass } from '../shared';

const PREVIEW_SAMPLE_SIZE = 10;

const ACCOUNT_STATE_LABELS: Record<AccountStateOption, string> = {
  active: 'Active users only',
  blocked: 'Blocked users only',
  any: 'Any account state',
};

const fieldLabelClass = 'block text-sm font-bold text-slate-700';

/** Returns the parsed value when it is one of the allowed options, otherwise the fallback. */
function parseOption<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

interface AudienceEditorProps {
  /** The audience being edited, or null when creating a new one. */
  group: DistributionGroup | null;
  /** All users for the custom-audience picker. Null while loading. */
  users: AdminDirectoryUser[] | null;
  usersError: string | null;
  /** Called when the form needs the user list (custom audiences only). Must be stable. */
  onNeedUsers: () => void;
  /** Called with a valid form. The parent asks for confirmation before saving. */
  onSave: (input: AudienceSaveInput) => void;
  onCancel: () => void;
}

const AudienceEditor: React.FC<AudienceEditorProps> = ({ group, users, usersError, onNeedUsers, onSave, onCancel }) => {
  const [form, setForm] = useState<AudienceFormValues>(() => (group ? audienceFormFromGroup(group) : emptyAudienceForm()));
  const [formError, setFormError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ key: string; data: AdminAudiencePreview } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const criteria = useMemo(() => criteriaFromForm(form), [form]);
  const criteriaKey = JSON.stringify(criteria);
  // A preview only applies to the criteria it was run for, so changing the form hides it.
  const currentPreview = preview?.key === criteriaKey ? preview.data : null;

  useEffect(() => {
    if (form.kind === 'selected') onNeedUsers();
  }, [form.kind, onNeedUsers]);

  const update = <K extends keyof AudienceFormValues>(key: K, value: AudienceFormValues[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFormError(null);
  };

  const runPreview = async () => {
    const key = criteriaKey;
    setPreviewing(true);
    setPreviewError(null);
    try {
      const data = await previewAdminAudience({ criteria });
      setPreview({ key, data });
    } catch (err: unknown) {
      console.error('Audience preview failed:', err);
      setPreviewError(err instanceof Error ? err.message : 'The audience could not be previewed.');
    } finally {
      setPreviewing(false);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const problem = validateAudienceForm(form);
    if (problem) {
      setFormError(problem);
      return;
    }
    onSave({ name: form.name.trim(), description: form.description.trim(), criteria });
  };

  const toggleUser = (userId: string) => {
    setForm((current) => {
      const next = new Set(current.userIds);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return { ...current, userIds: [...next] };
    });
    setFormError(null);
  };

  const selectedIds = useMemo(() => new Set(form.userIds), [form.userIds]);

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {group && hasMultiValueCriteria(group) && (
        <p role="note" className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          This audience uses more than one gender, country, or city value. Saving here keeps only the first value of each.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="audience-name" className={fieldLabelClass}>Audience name</label>
          <input
            id="audience-name"
            type="text"
            value={form.name}
            onChange={(event) => update('name', event.target.value)}
            maxLength={AUDIENCE_NAME_MAX}
            placeholder="All males"
            required
            autoFocus
            aria-describedby="audience-name-hint"
            className={`${inputClass} mt-1 max-w-none`}
          />
          <p id="audience-name-hint" className="mt-1 text-xs text-slate-500">2 to {AUDIENCE_NAME_MAX} characters.</p>
        </div>

        <div>
          <label htmlFor="audience-description" className={fieldLabelClass}>Description (optional)</label>
          <input
            id="audience-description"
            type="text"
            value={form.description}
            onChange={(event) => update('description', event.target.value)}
            maxLength={AUDIENCE_DESCRIPTION_MAX}
            placeholder="Active male members"
            className={`${inputClass} mt-1 max-w-none`}
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="audience-kind" className={fieldLabelClass}>Audience type</label>
          <select
            id="audience-kind"
            value={form.kind}
            onChange={(event) => update('kind', parseOption(event.target.value, ['criteria', 'selected'] as const, 'criteria'))}
            className={`${inputClass} mt-1 max-w-none`}
          >
            <option value="criteria">Profile criteria (gender, country, city)</option>
            <option value="selected">Selected users (custom audience)</option>
          </select>
        </div>

        {form.kind === 'criteria' && (
          <>
            <div>
              <label htmlFor="audience-gender" className={fieldLabelClass}>Gender</label>
              <select
                id="audience-gender"
                value={form.gender}
                onChange={(event) => update('gender', parseOption<GenderOption>(event.target.value, ['', ...GENDER_OPTIONS], ''))}
                className={`${inputClass} mt-1 max-w-none`}
              >
                <option value="">Any gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            <div>
              <label htmlFor="audience-country" className={fieldLabelClass}>Country</label>
              <select
                id="audience-country"
                value={form.country}
                onChange={(event) => update('country', parseOption<CountryOption>(event.target.value, ['', ...COUNTRY_OPTIONS], ''))}
                className={`${inputClass} mt-1 max-w-none`}
              >
                <option value="">Any country</option>
                <option value="ghana">Ghana</option>
                <option value="international">International</option>
              </select>
            </div>

            <div>
              <label htmlFor="audience-city" className={fieldLabelClass}>City</label>
              <input
                id="audience-city"
                type="text"
                value={form.location}
                onChange={(event) => update('location', event.target.value)}
                placeholder="Accra"
                aria-describedby="audience-city-hint"
                className={`${inputClass} mt-1 max-w-none`}
              />
              <p id="audience-city-hint" className="mt-1 text-xs text-slate-500">
                Optional. Enter the city only, for example Accra or Kumasi.
              </p>
            </div>

            <div>
              <label htmlFor="audience-account-state" className={fieldLabelClass}>Account state</label>
              <select
                id="audience-account-state"
                value={form.accountState}
                onChange={(event) => update('accountState', parseOption(event.target.value, ACCOUNT_STATE_OPTIONS, 'active'))}
                className={`${inputClass} mt-1 max-w-none`}
              >
                {ACCOUNT_STATE_OPTIONS.map((option) => (
                  <option key={option} value={option}>{ACCOUNT_STATE_LABELS[option]}</option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>

      {form.kind === 'selected' && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold text-slate-700">Users in this audience</p>
            <p className="text-xs text-slate-500">Membership is fixed to the users you select here.</p>
          </div>
          {users === null ? (
            <p className="text-sm text-slate-500">{usersError ?? 'Loading users…'}</p>
          ) : (
            <UserPicker
              idPrefix="audience-members"
              users={users}
              selectedIds={selectedIds}
              onToggle={toggleUser}
              onClear={() => update('userIds', [])}
            />
          )}
        </div>
      )}

      {formError && <p role="alert" className="text-sm font-semibold text-red-600">{formError}</p>}
      {previewError && <p role="alert" className="text-sm font-semibold text-red-600">{previewError}</p>}

      {currentPreview && (
        <div role="status" aria-live="polite" className="rounded-xl border border-orange-100 bg-orange-50/60 p-4">
          <p className="text-sm font-black text-slate-900">
            {currentPreview.count} matching user{currentPreview.count === 1 ? '' : 's'}
          </p>
          {currentPreview.members.length > 0 && (
            <>
              <p className="mt-1 text-xs text-slate-500">
                Sample: first {Math.min(PREVIEW_SAMPLE_SIZE, currentPreview.members.length)} of {currentPreview.count}
              </p>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {currentPreview.members.slice(0, PREVIEW_SAMPLE_SIZE).map((member) => (
                  <li key={member.id}>
                    {member.name}
                    <span className="text-xs text-slate-500">
                      {' '}· {[member.gender, member.location || member.country].filter(Boolean).join(' · ') || 'No profile details'}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className={`${buttonClass} bg-brand-orange px-4 py-2.5 text-sm text-white hover:bg-brand-orange/90`}
        >
          {group ? 'Save changes' : 'Create audience'}
        </button>
        <button
          type="button"
          onClick={() => void runPreview()}
          disabled={previewing}
          className={`${buttonClass} border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50`}
        >
          {previewing ? 'Previewing…' : 'Preview audience'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className={`${buttonClass} px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100`}
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default AudienceEditor;
