import React, { useMemo, useState } from 'react';
import { assignAdminUserGroups, type AdminAccessUser, type AdminGroup } from '../../../services/adminRbacService';
import type { AdminUserSummary } from '../../../services/adminAccessActions';
import AdminActionDialog from '../AdminActionDialog';
import { buttonClass, tableClass, tdClass, thClass } from '../shared';
import { type FeedbackMessage, isProtectedAdmin, isProtectedGroup, memberLabel } from './accessModel';

interface GroupsTableProps {
  groups: AdminGroup[];
  admins: AdminAccessUser[];
  users: AdminUserSummary[];
  onCreate: () => void;
  onEdit: (group: AdminGroup) => void;
  onAdminsUpdated: (updated: AdminAccessUser[]) => void;
  onMessage: (message: FeedbackMessage) => void;
}

interface PendingRemoval {
  group: AdminGroup;
  userIds: string[];
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

const GroupsTable: React.FC<GroupsTableProps> = ({ groups, admins, users, onCreate, onEdit, onAdminsUpdated, onMessage }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(null);

  const userById = useMemo(() => new Map(users.map((user) => [user.id, user] as const)), [users]);

  const membersOf = (groupId: string) =>
    admins
      .filter((admin) => admin.groupIds.includes(groupId))
      .sort((a, b) => memberLabel(userById.get(a.userId), a.userId).localeCompare(memberLabel(userById.get(b.userId), b.userId)));

  const toggleExpanded = (groupId: string) => {
    setSelected(new Set());
    setExpandedId((current) => (current === groupId ? null : groupId));
  };

  const toggleMember = (userId: string, checked: boolean) => {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(userId);
      else next.delete(userId);
      return next;
    });
  };

  const removeSelected = async (group: AdminGroup, userIds: string[]) => {
    // Each assignment replaces the user's full group list, so remove this group from each list.
    const results = await Promise.allSettled(
      userIds.map((userId) => {
        const current = admins.find((admin) => admin.userId === userId);
        const remaining = (current?.groupIds ?? []).filter((id) => id !== group.id);
        return assignAdminUserGroups(userId, remaining);
      })
    );
    const updated: AdminAccessUser[] = [];
    results.forEach((result) => {
      if (result.status === 'fulfilled') updated.push(result.value);
    });
    const failed = userIds.length - updated.length;
    onAdminsUpdated(updated);
    setSelected(new Set());
    onMessage(
      failed === 0
        ? { type: 'ok', text: `Removed ${plural(updated.length, 'user')} from ${group.name}. The change is audited.` }
        : {
            type: 'error',
            text: `Removed ${updated.length} of ${userIds.length} users from ${group.name}. ${plural(failed, 'change')} failed. Refresh and try again.`,
          }
    );
  };

  const confirmRemoval = async () => {
    if (!pendingRemoval) return;
    await removeSelected(pendingRemoval.group, pendingRemoval.userIds);
  };

  return (
    <section aria-labelledby="access-groups-heading" className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div>
          <h2 id="access-groups-heading" className="text-lg font-black text-slate-900">
            Permission groups
          </h2>
          <p className="text-xs text-slate-500">Expand a group to see its members.</p>
        </div>
        <button type="button" onClick={onCreate} className={`${buttonClass} bg-slate-900 px-4 py-2 text-sm text-white`}>
          New group
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className={tableClass}>
          <caption className="sr-only">Permission groups, their permission counts, and members</caption>
          <thead>
            <tr>
              <th scope="col" className={thClass}>#</th>
              <th scope="col" className={thClass}>Group</th>
              <th scope="col" className={thClass}>Description</th>
              <th scope="col" className={thClass}>Permissions</th>
              <th scope="col" className={thClass}>Members</th>
              <th scope="col" className={thClass}>Type</th>
              <th scope="col" className={thClass}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group, index) => {
              const members = membersOf(group.id);
              const expanded = expandedId === group.id;
              const protectedGroup = isProtectedGroup(group);
              const panelId = `access-group-members-${group.id}`;
              const selectable = members.filter((admin) => !isProtectedAdmin(admin)).map((admin) => admin.userId);
              const allSelected = selectable.length > 0 && selectable.every((id) => selected.has(id));

              return (
                <React.Fragment key={group.id}>
                  <tr>
                    <td className={tdClass}>{index + 1}</td>
                    <td className={`${tdClass} font-bold text-slate-900`}>{group.name}</td>
                    <td className={`${tdClass} max-w-xs`}>{group.description || '—'}</td>
                    <td className={tdClass}>{group.permissions.length}</td>
                    <td className={tdClass}>{members.length}</td>
                    <td className={tdClass}>
                      <span
                        className={`rounded px-2 py-1 text-[10px] font-black ${group.system ? 'bg-orange-50 text-orange-700' : 'bg-slate-100 text-slate-600'}`}
                      >
                        {group.system ? 'SYSTEM' : 'CUSTOM'}
                      </span>
                    </td>
                    <td className={`${tdClass} whitespace-nowrap`}>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          aria-expanded={expanded}
                          aria-controls={panelId}
                          onClick={() => toggleExpanded(group.id)}
                          className={`${buttonClass} border border-slate-300 bg-white text-slate-700`}
                        >
                          {expanded ? 'Hide members' : `Members (${members.length})`}
                        </button>
                        <button
                          type="button"
                          onClick={() => onEdit(group)}
                          aria-label={`${protectedGroup ? 'View' : 'Edit'} ${group.name}`}
                          className={`${buttonClass} bg-slate-900 text-white`}
                        >
                          {protectedGroup ? 'View' : 'Edit'}
                        </button>
                      </div>
                    </td>
                  </tr>

                  {expanded && (
                    <tr id={panelId} className="bg-slate-50">
                      <td colSpan={7} className="px-5 py-4">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <h3 className="text-sm font-black text-slate-800">Members of {group.name}</h3>
                          <button
                            type="button"
                            disabled={selected.size === 0}
                            onClick={() => setPendingRemoval({ group, userIds: [...selected] })}
                            className={`${buttonClass} bg-red-600 text-white`}
                          >
                            {selected.size > 0 ? `Remove ${selected.size} selected` : 'Remove selected'}
                          </button>
                        </div>

                        {members.length === 0 ? (
                          <p className="text-sm text-slate-500">No users are assigned to this group.</p>
                        ) : (
                          <div className="overflow-x-auto rounded-xl bg-white">
                            <table className={tableClass}>
                              <thead>
                                <tr>
                                  <th scope="col" className={thClass}>
                                    <input
                                      type="checkbox"
                                      aria-label={`Select all members of ${group.name}`}
                                      checked={allSelected}
                                      disabled={selectable.length === 0}
                                      onChange={(event) =>
                                        setSelected(event.target.checked ? new Set(selectable) : new Set())
                                      }
                                      className="h-4 w-4 accent-orange-500"
                                    />
                                  </th>
                                  <th scope="col" className={thClass}>Name</th>
                                  <th scope="col" className={thClass}>Email</th>
                                  <th scope="col" className={thClass}>Account</th>
                                </tr>
                              </thead>
                              <tbody>
                                {members.map((admin) => {
                                  const user = userById.get(admin.userId);
                                  const label = memberLabel(user, admin.userId);
                                  const locked = isProtectedAdmin(admin);
                                  return (
                                    <tr key={admin.userId}>
                                      <td className={tdClass}>
                                        <input
                                          type="checkbox"
                                          aria-label={`Select ${label}`}
                                          checked={selected.has(admin.userId)}
                                          disabled={locked}
                                          title={locked ? 'Super Admin accounts are protected' : undefined}
                                          onChange={(event) => toggleMember(admin.userId, event.target.checked)}
                                          className="h-4 w-4 accent-orange-500"
                                        />
                                      </td>
                                      <td className={`${tdClass} font-semibold`}>
                                        {label}
                                        {locked && (
                                          <span className="ml-2 rounded bg-orange-50 px-2 py-0.5 text-[10px] font-black text-orange-700">
                                            PROTECTED
                                          </span>
                                        )}
                                      </td>
                                      <td className={tdClass}>{user?.email || '—'}</td>
                                      <td className={tdClass}>{user?.isBlocked ? 'Blocked' : 'Active'}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <AdminActionDialog
        open={pendingRemoval !== null}
        title="Remove selected users from this group?"
        description={`Remove ${plural(pendingRemoval?.userIds.length ?? 0, 'user')} from ${pendingRemoval?.group.name ?? 'this group'}. Their other group memberships stay in place.`}
        confirmLabel="Remove from group"
        danger
        onConfirm={confirmRemoval}
        onCancel={() => setPendingRemoval(null)}
      />
    </section>
  );
};

export default GroupsTable;
