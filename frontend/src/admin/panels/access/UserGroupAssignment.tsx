import React, { useMemo, useState } from 'react';
import { assignAdminUserGroups, type AdminAccessUser, type AdminGroup } from '../../../services/adminRbacService';
import type { AdminUserSummary } from '../../../services/adminAccessActions';
import AdminActionDialog from '../AdminActionDialog';
import { buttonClass } from '../shared';
import {
  type AccessContext,
  canAssignGroup,
  type FeedbackMessage,
  isProtectedAdmin,
  isProtectedGroup,
  memberLabel,
  sameIds,
} from './accessModel';

interface UserGroupAssignmentProps {
  ctx: AccessContext;
  groups: AdminGroup[];
  admins: AdminAccessUser[];
  users: AdminUserSummary[];
  selectedUserId: string;
  onSelectUser: (userId: string) => void;
  onSaved: (updated: AdminAccessUser) => void;
  onMessage: (message: FeedbackMessage) => void;
}

const UserGroupAssignment: React.FC<UserGroupAssignmentProps> = (props) => {
  const { users, admins, selectedUserId, onSelectUser } = props;
  const [filter, setFilter] = useState('');

  const adminIds = useMemo(() => new Set(admins.map((admin) => admin.userId)), [admins]);

  const options = useMemo(() => {
    const term = filter.trim().toLowerCase();
    // The selected user stays in the list even when the filter excludes them, so the dropdown never shows a blank value.
    return users
      .filter((user) => user.id === selectedUserId || !term || [user.name, user.email].some((field) => field?.toLowerCase().includes(term)))
      .sort((a, b) => memberLabel(a, a.id).localeCompare(memberLabel(b, b.id)));
  }, [users, filter, selectedUserId]);

  const selectedAdmin = admins.find((admin) => admin.userId === selectedUserId);
  const selectedUser = users.find((user) => user.id === selectedUserId);

  return (
    <section aria-labelledby="access-assign-heading" className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 id="access-assign-heading" className="text-lg font-black text-slate-900">
        Assign users to groups
      </h2>
      <p className="mb-4 text-xs text-slate-500">
        Choose a user, then tick the groups they should belong to. Saving replaces their group list.
      </p>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700">
            Filter users
            <input
              type="search"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Name or email"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            User
            <select
              value={selectedUserId}
              onChange={(event) => onSelectUser(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
            >
              <option value="">Select a user</option>
              {options.map((user) => (
                <option key={user.id} value={user.id}>
                  {`${memberLabel(user, user.id)}${user.email ? ` — ${user.email}` : ''}${adminIds.has(user.id) ? ' (admin)' : ''}`}
                </option>
              ))}
            </select>
          </label>
          {filter && options.length === 0 && <p className="text-xs text-slate-500">No users match this filter.</p>}
        </div>

        <div>
          {selectedUserId ? (
            <AssignmentForm
              key={selectedUserId}
              {...props}
              userLabel={memberLabel(selectedUser, selectedUserId)}
              initialGroupIds={selectedAdmin?.groupIds ?? []}
              protectedUser={selectedAdmin ? isProtectedAdmin(selectedAdmin) : false}
            />
          ) : (
            <p className="text-sm text-slate-500">Select a user to see their groups.</p>
          )}
        </div>
      </div>
    </section>
  );
};

interface AssignmentFormProps extends UserGroupAssignmentProps {
  userLabel: string;
  initialGroupIds: string[];
  protectedUser: boolean;
}

/** Keyed by user ID so the draft resets whenever a different user is chosen. */
const AssignmentForm: React.FC<AssignmentFormProps> = ({ ctx, groups, selectedUserId, onSaved, onMessage, userLabel, initialGroupIds, protectedUser }) => {
  const [draft, setDraft] = useState<string[]>(initialGroupIds);
  const [confirming, setConfirming] = useState(false);

  const dirty = !sameIds(draft, initialGroupIds);

  const toggle = (groupId: string, checked: boolean) => {
    setDraft((current) => (checked ? [...current.filter((id) => id !== groupId), groupId] : current.filter((id) => id !== groupId)));
  };

  const save = async () => {
    const saved = await assignAdminUserGroups(selectedUserId, draft);
    onSaved(saved);
    onMessage({ type: 'ok', text: `Groups updated for ${userLabel}. The change is audited.` });
  };

  if (protectedUser) {
    return (
      <div className="rounded-xl bg-orange-50 p-4 text-sm text-orange-900">
        <p className="font-black">{userLabel} is a protected Super Admin account.</p>
        <p className="mt-1">Super Admin membership is read-only in this console.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-slate-700">Groups for {userLabel}</legend>
        <div className="grid gap-2">
          {groups.map((group) => {
            const checked = draft.includes(group.id);
            // Unticking is always allowed here (the server re-checks); granting needs the group to be assignable.
            const locked = !checked && !canAssignGroup(ctx, group);
            const reason = isProtectedGroup(group)
              ? 'Only a Super Admin can grant this group.'
              : 'You do not hold every permission in this group.';
            return (
              <label
                key={group.id}
                title={locked ? reason : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold ${locked ? 'bg-slate-100 text-slate-400' : 'bg-slate-50 text-slate-700'}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={locked}
                  onChange={(event) => toggle(group.id, event.target.checked)}
                  className="h-4 w-4 accent-orange-500"
                />
                <span className="flex-1">{group.name}</span>
                <span className="text-xs font-normal">{group.permissions.length} permissions</span>
                {locked && <span className="sr-only">{reason}</span>}
              </label>
            );
          })}
        </div>
      </fieldset>

      {draft.length === 0 && (
        <p role="status" className="text-xs font-semibold text-amber-800">
          With no groups, this account will have no admin access.
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          disabled={!dirty}
          onClick={() => setConfirming(true)}
          className={`${buttonClass} bg-slate-900 px-4 py-2 text-sm text-white`}
        >
          Save groups
        </button>
      </div>

      <AdminActionDialog
        open={confirming}
        title="Update group membership?"
        description={`Save ${draft.length} group${draft.length === 1 ? '' : 's'} for ${userLabel}. The change is recorded in the audit log.`}
        confirmLabel="Save groups"
        onConfirm={save}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
};

export default UserGroupAssignment;
