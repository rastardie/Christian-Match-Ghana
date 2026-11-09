import React, { useState } from 'react';
import type { AdminGroup } from '../../../services/adminRbacService';
import type { UserRow } from './types';
import { type GroupChanges, SUPER_ADMIN_GROUP_ID, displayName } from './userHelpers';
import { IndeterminateCheckbox, Modal, primaryButtonClass, secondaryButtonClass } from './ui';

interface GroupModalProps {
  targets: UserRow[];
  groups: AdminGroup[];
  loadError: string | null;
  canGrantSuperAdmin: boolean;
  /** Current admin group IDs for a user. Empty for accounts that are not administrators. */
  groupIdsFor: (userId: string) => string[];
  adminUserIds: Set<string>;
  locked: boolean;
  onClose: () => void;
  onReview: (changes: GroupChanges) => void;
}

/**
 * Edits group membership for one or more users. Only checkbox changes are recorded
 * as add or remove, so each user's other groups are kept.
 */
export const GroupModal: React.FC<GroupModalProps> = ({
  targets,
  groups,
  loadError,
  canGrantSuperAdmin,
  groupIdsFor,
  adminUserIds,
  locked,
  onClose,
  onReview,
}) => {
  const [changes, setChanges] = useState<GroupChanges>({});
  const [error, setError] = useState<string | null>(null);

  const single = targets.length === 1;
  const changeCount = Object.keys(changes).length;
  const addCount = Object.values(changes).filter((change) => change === 'add').length;
  const nonAdminCount = targets.filter((user) => !adminUserIds.has(user.firestoreDocId)).length;

  const stateFor = (groupId: string) => {
    const holders = targets.filter((user) => groupIdsFor(user.firestoreDocId).includes(groupId)).length;
    const all = targets.length > 0 && holders === targets.length;
    const mixed = holders > 0 && holders < targets.length;
    const change = changes[groupId];
    return {
      all,
      mixed,
      checked: change ? change === 'add' : all,
      indeterminate: !change && mixed,
    };
  };

  const toggle = (groupId: string) => {
    const { all, mixed, checked } = stateFor(groupId);
    const next = !checked;
    setChanges((current) => {
      const copy = { ...current };
      // Ticking back to the starting state clears the change.
      if (!mixed && next === all) delete copy[groupId];
      else copy[groupId] = next ? 'add' : 'remove';
      return copy;
    });
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (changeCount === 0) {
      setError('No group changes to save.');
      return;
    }
    setError(null);
    onReview(changes);
  };

  return (
    <Modal
      title={single ? `Admin groups: ${displayName(targets[0])}` : `Manage admin groups for ${targets.length} users`}
      description="Check a group to add it and uncheck it to remove it. Groups you do not change are left as they are."
      locked={locked}
      wide
      onClose={onClose}
    >
      <form onSubmit={submit} noValidate>
        <fieldset disabled={locked} className="space-y-4">
          <div role="note" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-bold">Console access</p>
            <p>
              Adding a group gives the account access to the admin console with that group's permissions. Only add
              groups to people who should be administrators.
            </p>
            {addCount > 0 && nonAdminCount > 0 && (
              <p className="mt-2 font-bold text-red-800">
                {nonAdminCount} selected account{nonAdminCount === 1 ? ' is' : 's are'} not administrators yet. Saving
                will give {nonAdminCount === 1 ? 'it' : 'them'} console access.
              </p>
            )}
          </div>

          {loadError && (
            <p role="alert" className="text-sm font-semibold text-red-700">
              {loadError}
            </p>
          )}

          {groups.length === 0 ? (
            <p className="text-sm text-slate-600">No admin groups are available.</p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {groups.map((group) => {
                const state = stateFor(group.id);
                const superAdminLocked = group.id === SUPER_ADMIN_GROUP_ID && !canGrantSuperAdmin;
                return (
                  <li key={group.id} className="flex items-start gap-3 p-3">
                    <div className="pt-0.5">
                      <IndeterminateCheckbox
                        checked={state.checked}
                        indeterminate={state.indeterminate}
                        disabled={superAdminLocked}
                        label={group.name}
                        onChange={() => toggle(group.id)}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900">
                        {group.name}
                        {superAdminLocked && <span className="ml-2 text-xs font-semibold text-slate-500">Super Admin only</span>}
                      </p>
                      {group.description && <p className="text-xs text-slate-600">{group.description}</p>}
                      {state.indeterminate && (
                        <p className="text-xs text-slate-500">Some selected users already have this group.</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </fieldset>

        {error && (
          <p role="alert" className="mt-4 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-600" aria-live="polite">
            {changeCount} change{changeCount === 1 ? '' : 's'} pending
          </p>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} disabled={locked} className={secondaryButtonClass}>
              Cancel
            </button>
            <button type="submit" disabled={locked || changeCount === 0} className={primaryButtonClass}>
              Review group changes
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
