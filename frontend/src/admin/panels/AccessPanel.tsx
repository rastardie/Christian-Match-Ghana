import React, { useCallback, useEffect, useState } from 'react';
import {
  ADMIN_PERMISSION_CATALOG,
  getCurrentAdminAccess,
  listAdminAccessControl,
  type AdminAccessUser,
  type AdminGroup,
} from '../../services/adminRbacService';
import { loadAdminUserSummaries, type AdminUserSummary } from '../../services/adminAccessActions';
import AccountsTable from './access/AdminAccountsTable';
import CreateAdministratorForm from './access/CreateAdministratorForm';
import GroupEditor from './access/GroupEditor';
import GroupsTable from './access/GroupsTable';
import UserGroupAssignment from './access/UserGroupAssignment';
import { type AccessContext, type FeedbackMessage, canManageGroups, mergeAdmins } from './access/accessModel';

export interface AccessPanelProps {
  /**
   * Selected sub-view from AdminConsole:
   * 'groups' (Groups & permissions), 'admins' (Administrators and group membership),
   * or 'create' (Create administrator, Super Admin only). Unknown or missing values fall back to 'groups'.
   */
  view?: string;
}

/**
 * Access control: permission groups, administrator accounts, group membership, and
 * (Super Admin only) administrator creation. Loads its own access context, so AdminConsole
 * does not need to pass props. Every action is re-checked by the server.
 */
const AccessPanel: React.FC<AccessPanelProps> = ({ view }) => {
  const activeView: 'groups' | 'admins' | 'create' = view === 'admins' || view === 'create' ? view : 'groups';
  const [ctx, setCtx] = useState<AccessContext | null>(null);
  const [catalog, setCatalog] = useState<string[]>([...ADMIN_PERMISSION_CATALOG]);
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [admins, setAdmins] = useState<AdminAccessUser[]>([]);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [message, setMessage] = useState<FeedbackMessage | null>(null);
  const [editor, setEditor] = useState<{ group: AdminGroup | null } | null>(null);
  const [assignUserId, setAssignUserId] = useState('');

  const load = useCallback(async (options: { quiet?: boolean } = {}) => {
    if (!options.quiet) setLoading(true);
    setLoadError(null);
    try {
      const access = await getCurrentAdminAccess();
      const nextCtx: AccessContext = { isSuperAdmin: access.isSuperAdmin, permissions: new Set(access.permissions) };
      setCtx(nextCtx);
      if (!canManageGroups(nextCtx)) return;

      const [rbac, userRows] = await Promise.all([listAdminAccessControl(), loadAdminUserSummaries()]);
      setCatalog(rbac.permissions.length > 0 ? rbac.permissions : [...ADMIN_PERMISSION_CATALOG]);
      setGroups(rbac.groups);
      setAdmins(rbac.users);
      setUsers(userRows);
    } catch (err) {
      console.error('Loading access control failed:', err);
      setLoadError('Access control could not be loaded. Check your permissions and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAdminsUpdated = (updated: AdminAccessUser[]) => {
    setAdmins((current) => mergeAdmins(current, updated));
  };

  const handleGroupSaved = (saved: AdminGroup) => {
    setGroups((current) => {
      const exists = current.some((group) => group.id === saved.id);
      return exists ? current.map((group) => (group.id === saved.id ? saved : group)) : [...current, saved];
    });
    setEditor(null);
    setMessage({ type: 'ok', text: `${saved.name} saved. The change is audited.` });
  };

  const openEditUserGroups = (userId: string) => {
    setAssignUserId(userId);
    document.getElementById('access-assign-heading')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const content = (() => {
    if (loading) return <p className="text-slate-600">Loading access control…</p>;
    if (loadError) {
      return (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-800">
          <span>{loadError}</span>
          <button type="button" onClick={() => void load()} className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-bold text-white">
            Try again
          </button>
        </div>
      );
    }
    if (!ctx) return null;

    if (activeView === 'create') {
      if (!ctx.isSuperAdmin) {
        return (
          <p role="status" className="rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-900">
            Creating administrators is limited to Super Admins. Ask a Super Admin to create the account.
          </p>
        );
      }
      return <CreateAdministratorForm onMessage={setMessage} onCreated={() => void load({ quiet: true })} />;
    }

    if (!canManageGroups(ctx)) {
      return (
        <p role="status" className="rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-900">
          Managing access control requires the Manage groups permission. Ask a Super Admin to grant it.
        </p>
      );
    }

    if (activeView === 'admins') {
      return (
        <div className="space-y-8">
          <AccountsTable admins={admins} groups={groups} users={users} onEditGroups={openEditUserGroups} />
          <UserGroupAssignment
            ctx={ctx}
            groups={groups}
            admins={admins}
            users={users}
            selectedUserId={assignUserId}
            onSelectUser={setAssignUserId}
            onSaved={(updated) => handleAdminsUpdated([updated])}
            onMessage={setMessage}
          />
        </div>
      );
    }

    return (
      <div className="space-y-8">
        <GroupsTable
          groups={groups}
          admins={admins}
          users={users}
          onCreate={() => setEditor({ group: null })}
          onEdit={(group) => setEditor({ group })}
          onAdminsUpdated={handleAdminsUpdated}
          onMessage={setMessage}
        />

        {editor && (
          <GroupEditor
            key={editor.group?.id ?? 'new-group'}
            ctx={ctx}
            catalog={catalog}
            group={editor.group}
            groups={groups}
            onSaved={handleGroupSaved}
            onClose={() => setEditor(null)}
          />
        )}
      </div>
    );
  })();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">Permission groups, administrator accounts, and who belongs to each group.</p>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {message && (
        <p
          role={message.type === 'error' ? 'alert' : 'status'}
          className={`rounded-xl px-4 py-3 text-sm font-semibold ${message.type === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}
        >
          {message.text}
        </p>
      )}

      {content}
    </div>
  );
};

export default AccessPanel;
