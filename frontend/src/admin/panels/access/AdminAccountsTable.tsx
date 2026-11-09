import React, { useMemo } from 'react';
import type { AdminAccessUser, AdminGroup } from '../../../services/adminRbacService';
import type { AdminUserSummary } from '../../../services/adminAccessActions';
import { buttonClass, tableClass, tdClass, thClass } from '../shared';
import { isProtectedAdmin, memberLabel } from './accessModel';

interface AdminAccountsTableProps {
  admins: AdminAccessUser[];
  groups: AdminGroup[];
  users: AdminUserSummary[];
  onEditGroups: (userId: string) => void;
}

const AdminAccountsTable: React.FC<AdminAccountsTableProps> = ({ admins, groups, users, onEditGroups }) => {
  const userById = useMemo(() => new Map(users.map((user) => [user.id, user] as const)), [users]);
  const groupName = useMemo(() => new Map(groups.map((group) => [group.id, group.name] as const)), [groups]);

  const rows = useMemo(
    () =>
      [...admins].sort((a, b) =>
        memberLabel(userById.get(a.userId), a.userId).localeCompare(memberLabel(userById.get(b.userId), b.userId))
      ),
    [admins, userById]
  );

  return (
    <section aria-labelledby="access-admins-heading" className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 id="access-admins-heading" className="text-lg font-black text-slate-900">
          Administrators
        </h2>
        <p className="text-xs text-slate-500">Admin accounts and the groups they belong to.</p>
      </div>
      {rows.length === 0 ? (
        <p className="p-5 text-sm text-slate-500">No administrator accounts yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className={tableClass}>
            <caption className="sr-only">Administrator accounts, groups, and effective permission counts</caption>
            <thead>
              <tr>
                <th scope="col" className={thClass}>Account</th>
                <th scope="col" className={thClass}>Super Admin</th>
                <th scope="col" className={thClass}>Groups</th>
                <th scope="col" className={thClass}>Permissions</th>
                <th scope="col" className={thClass}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((admin) => {
                const user = userById.get(admin.userId);
                const protectedAdmin = isProtectedAdmin(admin);
                const label = memberLabel(user, admin.userId);
                return (
                  <tr key={admin.userId}>
                    <td className={tdClass}>
                      <div className="font-semibold text-slate-900">{label}</div>
                      <div className="text-xs text-slate-500">{user?.email || admin.userId}</div>
                    </td>
                    <td className={tdClass}>{protectedAdmin ? 'Yes' : 'No'}</td>
                    <td className={tdClass}>
                      {admin.groupIds.length === 0
                        ? '—'
                        : admin.groupIds.map((id) => groupName.get(id) ?? id).join(', ')}
                    </td>
                    <td className={tdClass}>{admin.permissions.length}</td>
                    <td className={`${tdClass} whitespace-nowrap text-right`}>
                      {protectedAdmin ? (
                        <span className="text-xs font-semibold text-slate-500">Protected</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onEditGroups(admin.userId)}
                          aria-label={`Edit groups for ${label}`}
                          className={`${buttonClass} bg-slate-900 text-white`}
                        >
                          Edit groups
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default AdminAccountsTable;
