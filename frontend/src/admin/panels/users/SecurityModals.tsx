import React, { useState } from 'react';
import type { SubscriptionAction } from '../../../services/adminUserActions';
import { formatDate } from '../shared';
import type { UserRow } from './types';
import { PASSWORD_POLICY, PIN_PATTERN, displayName, isStrongPassword, subscriptionExpiry, subscriptionLabel } from './userHelpers';
import { Modal, dangerButtonClass, fieldClass, labelClass, primaryButtonClass, secondaryButtonClass } from './ui';

interface FormButtonsProps {
  locked: boolean;
  submitLabel: string;
  danger?: boolean;
  onCancel: () => void;
}

const FormButtons: React.FC<FormButtonsProps> = ({ locked, submitLabel, danger = false, onCancel }) => (
  <div className="mt-6 flex justify-end gap-3">
    <button type="button" onClick={onCancel} disabled={locked} className={secondaryButtonClass}>
      Cancel
    </button>
    <button
      type="submit"
      disabled={locked}
      className={danger ? dangerButtonClass : primaryButtonClass}
    >
      {submitLabel}
    </button>
  </div>
);

interface SetPasswordModalProps {
  user: UserRow;
  locked: boolean;
  onClose: () => void;
  onReview: (password: string, forceChange: boolean) => void;
}

export const SetPasswordModal: React.FC<SetPasswordModalProps> = ({ user, locked, onClose, onReview }) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [forceChange, setForceChange] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isStrongPassword(password)) {
      setError(PASSWORD_POLICY);
      return;
    }
    if (password !== confirm) {
      setError('The passwords do not match.');
      return;
    }
    setError(null);
    onReview(password, forceChange);
  };

  return (
    <Modal
      title={`Set new password: ${displayName(user)}`}
      description="Replaces the user's password and ends their active sessions."
      locked={locked}
      onClose={onClose}
    >
      <form onSubmit={submit} noValidate>
        <fieldset disabled={locked} className="space-y-4">
          <div>
            <label htmlFor="pw-new" className={labelClass}>
              New password
            </label>
            <input
              id="pw-new"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-describedby="pw-policy"
              className={fieldClass}
            />
            <p id="pw-policy" className="mt-1 text-xs text-slate-500">
              {PASSWORD_POLICY}
            </p>
          </div>
          <div>
            <label htmlFor="pw-confirm" className={labelClass}>
              Confirm password
            </label>
            <input
              id="pw-confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              className={fieldClass}
            />
          </div>
          <label className="flex items-start gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={forceChange}
              onChange={(event) => setForceChange(event.target.checked)}
              className="mt-1 h-4 w-4 accent-brand-orange"
            />
            <span>
              <span className="block font-semibold">Force change at next sign-in</span>
              <span className="block text-xs text-slate-500">Recommended when sharing a temporary password.</span>
            </span>
          </label>
        </fieldset>
        {error && (
          <p role="alert" className="mt-4 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}
        <FormButtons locked={locked} submitLabel="Review and set" onCancel={onClose} />
      </form>
    </Modal>
  );
};

interface SetPinModalProps {
  user: UserRow;
  locked: boolean;
  onClose: () => void;
  onReview: (pin: string) => void;
}

export const SetPinModal: React.FC<SetPinModalProps> = ({ user, locked, onClose, onReview }) => {
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!PIN_PATTERN.test(pin)) {
      setError('PIN must contain 4 to 6 digits.');
      return;
    }
    if (pin !== confirm) {
      setError('The PINs do not match.');
      return;
    }
    setError(null);
    onReview(pin);
  };

  return (
    <Modal
      title={`Set new PIN: ${displayName(user)}`}
      description="A 4 to 6 digit PIN the user can sign in with. It replaces any existing PIN."
      locked={locked}
      onClose={onClose}
    >
      <form onSubmit={submit} noValidate>
        <fieldset disabled={locked} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="pin-new" className={labelClass}>
              New PIN (4 to 6 digits)
            </label>
            <input
              id="pin-new"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="pin-confirm" className={labelClass}>
              Confirm PIN
            </label>
            <input
              id="pin-confirm"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value.replace(/\D/g, ''))}
              className={fieldClass}
            />
          </div>
        </fieldset>
        {error && (
          <p role="alert" className="mt-4 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}
        <FormButtons locked={locked} submitLabel="Review and set" onCancel={onClose} />
      </form>
    </Modal>
  );
};

export interface SubscriptionInput {
  action: SubscriptionAction;
  plan?: '6months' | '12months';
  days?: number;
}

/** Confirmation wording for a subscription change. */
export function subscriptionSummary(
  input: SubscriptionInput,
  name: string
): { title: string; description: string; confirmLabel: string; danger: boolean } {
  if (input.action === 'revoke') {
    return {
      title: `Revoke subscription for ${name}?`,
      description: 'Their messaging access ends immediately.',
      confirmLabel: 'Revoke subscription',
      danger: true,
    };
  }
  if (input.action === 'grant') {
    const label = input.plan === '12months' ? '12-month' : '6-month';
    return {
      title: `Grant a ${label} subscription?`,
      description: `Grant ${name} a ${label} subscription. Their current subscription period is replaced.`,
      confirmLabel: 'Grant subscription',
      danger: false,
    };
  }
  return {
    title: 'Extend subscription?',
    description: `Add ${input.days} day${input.days === 1 ? '' : 's'} to ${name}'s subscription. Days are added to the current expiry, or start today if it has already ended.`,
    confirmLabel: 'Extend subscription',
    danger: false,
  };
}

interface SubscriptionModalProps {
  user: UserRow;
  locked: boolean;
  onClose: () => void;
  onReview: (input: SubscriptionInput) => void;
}

const ACTION_OPTIONS: Array<{ value: SubscriptionAction; label: string }> = [
  { value: 'grant', label: 'Grant a new subscription' },
  { value: 'extend', label: 'Extend the current subscription' },
  { value: 'revoke', label: 'Revoke (end now)' },
];

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ user, locked, onClose, onReview }) => {
  const [action, setAction] = useState<SubscriptionAction>('grant');
  const [plan, setPlan] = useState<'6months' | '12months'>('6months');
  const [days, setDays] = useState('30');
  const [error, setError] = useState<string | null>(null);

  const expiry = subscriptionExpiry(user);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (action === 'grant') {
      setError(null);
      onReview({ action, plan });
      return;
    }
    if (action === 'extend') {
      const count = Number(days);
      if (!Number.isInteger(count) || count < 1 || count > 730) {
        setError('Enter a whole number of days from 1 to 730.');
        return;
      }
      setError(null);
      onReview({ action, days: count });
      return;
    }
    setError(null);
    onReview({ action });
  };

  return (
    <Modal
      title={`Subscription: ${displayName(user)}`}
      description={`Current status: ${subscriptionLabel(user)}${expiry ? `, expires ${formatDate(expiry.toISOString())}` : ''}.`}
      locked={locked}
      onClose={onClose}
    >
      <form onSubmit={submit} noValidate>
        <fieldset disabled={locked} className="space-y-4">
          <fieldset className="space-y-2">
            <legend className={labelClass}>Action</legend>
            {ACTION_OPTIONS.map((option) => (
              <label key={option.value} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="subscription-action"
                  value={option.value}
                  checked={action === option.value}
                  onChange={() => setAction(option.value)}
                  className="accent-brand-orange"
                />
                {option.label}
              </label>
            ))}
          </fieldset>

          {action === 'grant' && (
            <div>
              <label htmlFor="sub-plan" className={labelClass}>
                Plan
              </label>
              <select
                id="sub-plan"
                value={plan}
                onChange={(event) => setPlan(event.target.value as '6months' | '12months')}
                className={fieldClass}
              >
                <option value="6months">6 months</option>
                <option value="12months">12 months</option>
              </select>
            </div>
          )}

          {action === 'extend' && (
            <div>
              <label htmlFor="sub-days" className={labelClass}>
                Days to add (1 to 730)
              </label>
              <input
                id="sub-days"
                type="number"
                inputMode="numeric"
                min={1}
                max={730}
                step={1}
                value={days}
                onChange={(event) => setDays(event.target.value)}
                className={fieldClass}
              />
            </div>
          )}

          {action === 'revoke' && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
              Revoking ends this user's subscription immediately and removes messaging access.
            </p>
          )}
        </fieldset>
        {error && (
          <p role="alert" className="mt-4 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}
        <FormButtons
          locked={locked}
          submitLabel={action === 'grant' ? 'Review grant' : action === 'extend' ? 'Review extension' : 'Review revoke'}
          danger={action === 'revoke'}
          onCancel={onClose}
        />
      </form>
    </Modal>
  );
};
