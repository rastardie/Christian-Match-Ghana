import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { deleteUser, getAdminUsers } from '../../services/adminService';
import {
  adminSendPasswordResetEmail,
  adminSetUserPassword,
  assignAdminUserGroups,
  listAdminAccessControl,
  type AdminAccessUser,
  type AdminGroup,
} from '../../services/adminRbacService';
import {
  createUserAsAdmin,
  resetUserPinAsAdmin,
  setMustChangePasswordAsAdmin,
  setSubscriptionAsAdmin,
  setUserBlockedAsAdmin,
  updateUserProfileAsAdmin,
  type AdminProfileFields,
} from '../../services/adminUserActions';
import AdminActionDialog from './AdminActionDialog';
import { formatDate, tableClass, tdClass, thClass } from './shared';
import { AddUserModal, EditProfileModal, type NewUserValues } from './users/UserFormModals';
import { SetPasswordModal, SetPinModal, SubscriptionModal, subscriptionSummary, type SubscriptionInput } from './users/SecurityModals';
import { GroupModal } from './users/GroupModal';
import UserRowMenu, { type RowAction } from './users/UserRowMenu';
import { IndeterminateCheckbox, fieldClass, toolbarButtonClass } from './users/ui';
import {
  applyGroupChanges,
  buildUsersCsv,
  displayName,
  downloadTextFile,
  errorMessage,
  isUserBlocked,
  roleLabel,
  runSequentially,
  sameMembers,
  subscriptionExpiry,
  subscriptionLabel,
  summariseBulk,
  toDateOrNull,
  type BulkResult,
  type GroupChanges,
} from './users/userHelpers';
import { makeCan, type Notice, type PendingAction, type RoleFilter, type StatusFilter, type UserRow } from './users/types';
import { VIEW_INTRO, VIEW_PRESETS, resolveUserView, type UserView } from './users/views';

/** Columns that can be sorted in the users table. */
type SortKey = 'name' | 'email' | 'phone' | 'role' | 'status' | 'subscription' | 'groups' | 'joined' | 'updated';
interface SortState {
  key: SortKey;
  dir: 'asc' | 'desc';
}
/** Date columns start newest-first on the first click. Text columns start A to Z. */
const DATE_SORT_KEYS: SortKey[] = ['joined', 'updated'];

export interface UsersPanelProps {
  /** The caller's admin permissions. Omit to show every action. AdminConsole should pass this. */
  permissions?: string[];
  /** Super Admins pass every permission check. */
  isSuperAdmin?: boolean;
  /** Sidebar sub-view: 'all' (default), 'add', 'subscribers', or 'blocked'. Unknown values show 'all'. */
  view?: string;
}

type ModalState =
  | { kind: 'add' }
  | { kind: 'edit' | 'password' | 'pin' | 'subscription'; userId: string }
  | { kind: 'groups'; userIds: string[] };

interface AccessState {
  groups: AdminGroup[];
  accessUsers: AdminAccessUser[];
  error: string | null;
}

const inputClass = `${fieldClass} mt-1 max-w-md`;
const selectClass = 'mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-orange focus:outline-none';
const primaryToolbarButton = `${toolbarButtonClass} bg-slate-900 text-white hover:bg-slate-800`;
const secondaryToolbarButton = `${toolbarButtonClass} border border-slate-300 bg-white text-slate-800 hover:bg-slate-50`;
const bulkButton = `${toolbarButtonClass} bg-white text-slate-900 hover:bg-slate-100`;
const bulkBlockButton = `${toolbarButtonClass} bg-amber-200 text-amber-950 hover:bg-amber-300`;
const bulkDeleteButton = `${toolbarButtonClass} bg-red-600 text-white hover:bg-red-700`;
const unblockButton = `${toolbarButtonClass} bg-emerald-600 text-white hover:bg-emerald-700`;

const UsersPanel: React.FC<UsersPanelProps> = ({ permissions, isSuperAdmin, view }) => {
  const can = useMemo(() => makeCan({ permissions, isSuperAdmin }), [permissions, isSuperAdmin]);
  // Without a permissions list the console shows everything, so super-admin-only groups are allowed too.
  const canGrantSuperAdmin = isSuperAdmin === true || permissions === undefined;
  const canManageGroups = can('groups.manage');
  const canAdd = can('users.create');
  const activeView = resolveUserView(view);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [access, setAccess] = useState<AccessState | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(VIEW_PRESETS[activeView].status);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>(VIEW_PRESETS[activeView].role);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [notice, setNotice] = useState<Notice | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  // The 'add' view opens the Add user modal on mount when the administrator may create users.
  const [modal, setModal] = useState<ModalState | null>(() => (activeView === 'add' && canAdd ? { kind: 'add' } : null));
  const [pending, setPending] = useState<PendingAction | null>(null);
  // Newest-joined first by default, matching the previous fixed order.
  const [sort, setSort] = useState<SortState>({ key: 'joined', dir: 'desc' });

  // When the sidebar view changes, apply its preset filters and open or close the Add user modal.
  // This runs during render so the first paint already shows the new preset.
  const [shownView, setShownView] = useState<UserView>(activeView);
  if (shownView !== activeView) {
    setShownView(activeView);
    setStatusFilter(VIEW_PRESETS[activeView].status);
    setRoleFilter(VIEW_PRESETS[activeView].role);
    setModal((previous) => (activeView === 'add' && canAdd ? { kind: 'add' } : previous?.kind === 'add' ? null : previous));
  }

  const busy = progress !== null;
  const locked = busy || pending !== null;

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const rows = await getAdminUsers();
      setUsers(rows);
      const ids = new Set(rows.map((row) => row.firestoreDocId));
      setSelected((current) => new Set([...current].filter((id) => ids.has(id))));
    } catch (error) {
      setLoadError(errorMessage(error, 'Users could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAccess = useCallback(async () => {
    if (!canManageGroups) return;
    try {
      const result = await listAdminAccessControl();
      setAccess({ groups: result.groups, accessUsers: result.users, error: null });
    } catch (error) {
      setAccess((current) => ({
        groups: current?.groups ?? [],
        accessUsers: current?.accessUsers ?? [],
        error: errorMessage(error, 'Admin groups could not be loaded.'),
      }));
    }
  }, [canManageGroups]);

  useEffect(() => {
    void loadUsers();
    void loadAccess();
  }, [loadUsers, loadAccess]);

  const groupNameById = useMemo(
    () => new Map<string, string>((access?.groups ?? []).map((group): [string, string] => [group.id, group.name])),
    [access]
  );
  const groupIdsByUser = useMemo(
    () => new Map<string, string[]>((access?.accessUsers ?? []).map((entry): [string, string[]] => [entry.userId, entry.groupIds])),
    [access]
  );
  const adminUserIds = useMemo(() => new Set((access?.accessUsers ?? []).map((entry) => entry.userId)), [access]);
  const groupIdsFor = useCallback((userId: string) => groupIdsByUser.get(userId) ?? [], [groupIdsByUser]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return users.filter((user) => {
      if (statusFilter === 'active' && isUserBlocked(user)) return false;
      if (statusFilter === 'blocked' && !isUserBlocked(user)) return false;
      if (roleFilter === 'subscriber' && !user.isPremium) return false;
      if (roleFilter === 'user' && user.isPremium) return false;
      if (!term) return true;
      return [user.name, user.email, user.loginName, user.phone].some(
        (field) => typeof field === 'string' && field.toLowerCase().includes(term)
      );
    });
  }, [users, query, statusFilter, roleFilter]);

  // Sorts the filtered rows by the chosen column. Missing dates always sort last.
  const sortedUsers = useMemo(() => {
    const direction = sort.dir === 'asc' ? 1 : -1;
    const valueOf = (user: UserRow): string | number | null => {
      switch (sort.key) {
        case 'name': return (user.name || '').toLowerCase();
        case 'email': return (user.email || '').toLowerCase();
        case 'phone': return (user.phone || '').toLowerCase();
        case 'role': return roleLabel(user);
        case 'status': return isUserBlocked(user) ? 'blocked' : 'active';
        case 'subscription': return subscriptionLabel(user);
        case 'groups': return canManageGroups
          ? groupIdsFor(user.firestoreDocId).map((id) => groupNameById.get(id) ?? id).sort().join(', ').toLowerCase()
          : '';
        case 'joined': return toDateOrNull(user.createdAt)?.getTime() ?? null;
        case 'updated': return toDateOrNull(user.updatedAt)?.getTime() ?? null;
      }
    };
    return [...filtered].sort((a, b) => {
      const left = valueOf(a);
      const right = valueOf(b);
      if (left === null || right === null) return left === right ? 0 : left === null ? 1 : -1;
      if (typeof left === 'number' && typeof right === 'number') return (left - right) * direction;
      return String(left).localeCompare(String(right), 'en', { numeric: true, sensitivity: 'base' }) * direction;
    });
  }, [filtered, sort, canManageGroups, groupIdsFor, groupNameById]);

  const toggleSort = (key: SortKey) => {
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: DATE_SORT_KEYS.includes(key) ? 'desc' : 'asc' }
    );
  };

  const sortHeader = (key: SortKey, label: string) => {
    const active = sort.key === key;
    return (
      <th scope="col" className={thClass} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
        <button
          type="button"
          onClick={() => toggleSort(key)}
          className="inline-flex items-center gap-1 font-black uppercase tracking-wide hover:text-slate-900"
        >
          {label}
          <span aria-hidden="true" className="text-[10px]">{active ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}</span>
        </button>
      </th>
    );
  };

  const visibleIds = useMemo(() => sortedUsers.map((user) => user.firestoreDocId), [sortedUsers]);
  const visibleSelectedCount = visibleIds.filter((id) => selected.has(id)).length;
  const allVisibleSelected = visibleIds.length > 0 && visibleSelectedCount === visibleIds.length;
  const hiddenSelectedCount = selected.size - visibleSelectedCount;
  const selectedUsers = useMemo(() => users.filter((user) => selected.has(user.firestoreDocId)), [users, selected]);

  const duplicateEmailRows = useMemo(() => {
    const counts = new Map<string, number>();
    for (const user of users) {
      const key = user.email?.trim().toLowerCase();
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return users.filter((user) => {
      const key = user.email?.trim().toLowerCase();
      return key ? (counts.get(key) ?? 0) > 1 : false;
    }).length;
  }, [users]);

  const findUser = (userId: string) => users.find((user) => user.firestoreDocId === userId);

  const patchUsers = (ids: string[], patch: Partial<UserRow>) => {
    setUsers((rows) => rows.map((row) => (ids.includes(row.firestoreDocId) ? { ...row, ...patch } : row)));
  };

  const removeUsers = (ids: string[]) => {
    setUsers((rows) => rows.filter((row) => !ids.includes(row.firestoreDocId)));
    setSelected((current) => new Set([...current].filter((id) => !ids.includes(id))));
  };

  const toggleOne = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleVisible = () => {
    setSelected((current) => {
      const next = new Set(current);
      for (const id of visibleIds) {
        if (allVisibleSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  };

  /** Runs one request per user in order and shows progress. Failures are returned, not thrown. */
  const runBulk = async (targets: UserRow[], verb: string, task: (userId: string) => Promise<void>): Promise<BulkResult> => {
    setNotice(null);
    setProgress(`${verb} 0 of ${targets.length}…`);
    try {
      return await runSequentially(
        targets.map((user) => ({ id: user.firestoreDocId, label: displayName(user) })),
        task,
        (done, total) => setProgress(`${verb} ${done} of ${total}…`)
      );
    } finally {
      setProgress(null);
    }
  };

  const requestCreate = (values: NewUserValues) => {
    setPending({
      title: 'Create this user?',
      description: `Create an account for ${values.name} (${values.email}).`,
      confirmLabel: 'Create user',
      requirePassword: false,
      run: async () => {
        const result = await createUserAsAdmin({
          name: values.name,
          email: values.email,
          phone: values.phone,
          password: values.password,
        });
        setModal(null);
        setNotice(
          result.verificationEmailSent
            ? { tone: 'ok', text: `User created. A verification email was sent to ${values.email}.` }
            : { tone: 'error', text: `User created, but the verification email could not be sent to ${values.email}.` }
        );
        await loadUsers();
      },
    });
  };

  const requestProfileSave = (user: UserRow, fields: AdminProfileFields) => {
    const name = displayName(user);
    const count = Object.keys(fields).length;
    setPending({
      title: 'Save profile changes?',
      description: `Save ${count} changed field${count === 1 ? '' : 's'} for ${name}.`,
      confirmLabel: 'Save changes',
      requirePassword: false,
      run: async () => {
        await updateUserProfileAsAdmin(user.firestoreDocId, fields);
        patchUsers([user.firestoreDocId], fields);
        setModal(null);
        setNotice({ tone: 'ok', text: `Profile updated for ${name}.` });
      },
    });
  };

  const requestBlock = (targets: UserRow[], blocked: boolean) => {
    const work = targets.filter((user) => isUserBlocked(user) !== blocked);
    if (work.length === 0) {
      setNotice({ tone: 'ok', text: `Nothing to change. The selected ${targets.length === 1 ? 'user is' : 'users are'} already ${blocked ? 'blocked' : 'active'}.` });
      return;
    }
    const single = targets.length === 1;
    const skipped = targets.length - work.length;
    const subject = single ? displayName(targets[0]) : `${work.length} users`;
    setPending({
      title: `${blocked ? 'Block' : 'Unblock'} ${subject}?`,
      description: [
        blocked
          ? 'Their active sessions will be ended and they cannot use the app until unblocked.'
          : 'They will be able to use the app again.',
        skipped > 0 ? `${skipped} already in this state ${skipped === 1 ? 'is' : 'are'} skipped.` : '',
      ]
        .filter(Boolean)
        .join(' '),
      confirmLabel: blocked ? 'Block' : 'Unblock',
      danger: blocked,
      requirePassword: true,
      run: async () => {
        if (single) {
          const user = work[0];
          await setUserBlockedAsAdmin(user.firestoreDocId, blocked);
          patchUsers([user.firestoreDocId], { isBlocked: blocked });
          setNotice({ tone: 'ok', text: `${displayName(user)} ${blocked ? 'blocked' : 'unblocked'}.` });
          return;
        }
        const result = await runBulk(work, blocked ? 'Blocking' : 'Unblocking', (id) => setUserBlockedAsAdmin(id, blocked));
        patchUsers(result.succeeded, { isBlocked: blocked });
        setNotice(summariseBulk(blocked ? 'Blocked' : 'Unblocked', work.length, result));
      },
    });
  };

  const requestDelete = (targets: UserRow[]) => {
    const single = targets.length === 1;
    const subject = single ? displayName(targets[0]) : `${targets.length} users`;
    setPending({
      title: `Permanently delete ${subject}?`,
      description: 'Their account, photos, and prayers will be removed. This cannot be undone.',
      confirmLabel: 'Delete permanently',
      danger: true,
      requirePassword: true,
      run: async () => {
        if (single) {
          const user = targets[0];
          const ok = await deleteUser(user.firestoreDocId);
          if (!ok) throw new Error(`${displayName(user)} could not be deleted. Try again.`);
          removeUsers([user.firestoreDocId]);
          setNotice({ tone: 'ok', text: `${displayName(user)} was deleted.` });
          return;
        }
        const result = await runBulk(targets, 'Deleting', async (id) => {
          const ok = await deleteUser(id);
          if (!ok) throw new Error('The account could not be deleted.');
        });
        removeUsers(result.succeeded);
        setNotice(summariseBulk('Deleted', targets.length, result));
      },
    });
  };

  const requestResetEmail = (targets: UserRow[]) => {
    const single = targets.length === 1;
    setPending({
      title: single ? `Send a password reset email to ${displayName(targets[0])}?` : `Send password reset emails to ${targets.length} users?`,
      description: 'Each email contains a link that lets the user choose a new password.',
      confirmLabel: 'Send reset email',
      requirePassword: true,
      run: async () => {
        if (single) {
          await adminSendPasswordResetEmail(targets[0].firestoreDocId);
          setNotice({ tone: 'ok', text: `Password reset email sent to ${targets[0].email}.` });
          return;
        }
        const result = await runBulk(targets, 'Sending', async (id) => {
          await adminSendPasswordResetEmail(id);
        });
        setNotice(summariseBulk('Sent reset email to', targets.length, result));
      },
    });
  };

  const requestSetPassword = (user: UserRow, newPassword: string, forceChange: boolean) => {
    const name = displayName(user);
    setPending({
      title: 'Set a new password?',
      description: `Set a new password for ${name}${forceChange ? ' and require a change at next sign-in' : ''}. Their existing sessions will be ended.`,
      confirmLabel: 'Set password',
      requirePassword: true,
      run: async () => {
        await adminSetUserPassword({ userId: user.firestoreDocId, newPassword, forceChange });
        patchUsers([user.firestoreDocId], { mustChangePassword: forceChange });
        setModal(null);
        setNotice({
          tone: 'ok',
          text: `Password updated for ${name}.${forceChange ? ' They must change it at next sign-in.' : ''}`,
        });
      },
    });
  };

  const requestMustChange = (user: UserRow) => {
    const name = displayName(user);
    const next = user.mustChangePassword !== true;
    setPending({
      title: next ? `Require ${name} to change their password?` : `Clear the password change requirement for ${name}?`,
      description: next
        ? 'They will be asked to choose a new password at their next sign-in.'
        : 'They will no longer be asked to change their password at sign-in.',
      confirmLabel: next ? 'Require change' : 'Clear requirement',
      requirePassword: true,
      run: async () => {
        await setMustChangePasswordAsAdmin(user.firestoreDocId, next);
        patchUsers([user.firestoreDocId], { mustChangePassword: next });
        setNotice({ tone: 'ok', text: `Password change requirement ${next ? 'set' : 'cleared'} for ${name}.` });
      },
    });
  };

  const requestSetPin = (user: UserRow, pin: string) => {
    const name = displayName(user);
    setPending({
      title: `Set a new PIN for ${name}?`,
      description: 'This replaces any existing PIN for the account.',
      confirmLabel: 'Set PIN',
      requirePassword: true,
      run: async () => {
        await resetUserPinAsAdmin(user.firestoreDocId, 'set', pin);
        patchUsers([user.firestoreDocId], { hasPin: true });
        setModal(null);
        setNotice({ tone: 'ok', text: `PIN set for ${name}.` });
      },
    });
  };

  const requestClearPin = (user: UserRow) => {
    const name = displayName(user);
    setPending({
      title: `Clear the PIN for ${name}?`,
      description: 'The user will need their password to sign in until a new PIN is set.',
      confirmLabel: 'Clear PIN',
      danger: true,
      requirePassword: true,
      run: async () => {
        await resetUserPinAsAdmin(user.firestoreDocId, 'clear');
        patchUsers([user.firestoreDocId], { hasPin: false });
        setNotice({ tone: 'ok', text: `PIN cleared for ${name}.` });
      },
    });
  };

  const requestSubscription = (user: UserRow, input: SubscriptionInput) => {
    const name = displayName(user);
    const summary = subscriptionSummary(input, name);
    setPending({
      title: summary.title,
      description: summary.description,
      confirmLabel: summary.confirmLabel,
      danger: summary.danger,
      requirePassword: true,
      run: async () => {
        const result = await setSubscriptionAsAdmin(user.firestoreDocId, input);
        const expiresAt = result.expiresAt ?? null;
        patchUsers([user.firestoreDocId], {
          isPremium: input.action !== 'revoke',
          subscriptionStatus: result.subscriptionStatus as UserRow['subscriptionStatus'],
          subscriptionEndDate: expiresAt,
          subscriptionExpiresAt: expiresAt ? new Date(expiresAt) : null,
        });
        setModal(null);
        setNotice({ tone: 'ok', text: `Subscription updated for ${name}.` });
      },
    });
  };

  const requestGroupChanges = (targets: UserRow[], changes: GroupChanges) => {
    const adds = Object.values(changes).filter((change) => change === 'add').length;
    const count = Object.keys(changes).length;
    const subject = targets.length === 1 ? displayName(targets[0]) : `${targets.length} users`;
    setPending({
      title: 'Update admin group membership?',
      description: `Apply ${count} group change${count === 1 ? '' : 's'} to ${subject}.${
        adds > 0 ? ' Adding a group gives the account admin console access.' : ''
      }`,
      confirmLabel: 'Save groups',
      requirePassword: true,
      run: async () => {
        const result = await runBulk(targets, 'Updating', async (id) => {
          const current = groupIdsFor(id);
          const next = applyGroupChanges(current, changes);
          if (sameMembers(current, next)) return;
          await assignAdminUserGroups(id, next);
        });
        setModal(null);
        await loadAccess();
        setNotice(summariseBulk('Updated group membership for', targets.length, result));
      },
    });
  };

  const exportCsv = () => {
    if (filtered.length === 0) {
      setNotice({ tone: 'error', text: 'There are no users to export with the current filters.' });
      return;
    }
    downloadTextFile('users_export.csv', buildUsersCsv(filtered), 'text/csv;charset=utf-8');
    setNotice({ tone: 'ok', text: `Exported ${filtered.length} user${filtered.length === 1 ? '' : 's'}.` });
  };

  const rowActions = (user: UserRow): RowAction[] => {
    const id = user.firestoreDocId;
    const blocked = isUserBlocked(user);
    const actions: RowAction[] = [];
    if (can('users.edit')) {
      actions.push({ key: 'edit', label: 'Edit profile', onSelect: () => setModal({ kind: 'edit', userId: id }) });
    }
    if (can('users.suspend')) {
      actions.push({
        key: 'block',
        label: blocked ? 'Unblock user' : 'Block user',
        danger: !blocked,
        onSelect: () => requestBlock([user], !blocked),
      });
    }
    if (can('users.edit')) {
      actions.push(
        { key: 'password', label: 'Set new password', onSelect: () => setModal({ kind: 'password', userId: id }) },
        { key: 'reset-email', label: 'Send password reset email', onSelect: () => requestResetEmail([user]) },
        {
          key: 'must-change',
          label: user.mustChangePassword === true ? 'Clear forced password change' : 'Require password change at next sign-in',
          onSelect: () => requestMustChange(user),
        },
        { key: 'set-pin', label: 'Set new PIN', onSelect: () => setModal({ kind: 'pin', userId: id }) },
        { key: 'clear-pin', label: 'Clear PIN', danger: true, onSelect: () => requestClearPin(user) }
      );
    }
    if (can('subscriptions.manage')) {
      actions.push({
        key: 'subscription',
        label: 'Subscription: grant, extend, or revoke',
        onSelect: () => setModal({ kind: 'subscription', userId: id }),
      });
    }
    if (canManageGroups) {
      actions.push({ key: 'groups', label: 'Admin groups', onSelect: () => setModal({ kind: 'groups', userIds: [id] }) });
    }
    if (can('users.delete')) {
      actions.push({ key: 'delete', label: 'Delete user', danger: true, onSelect: () => requestDelete([user]) });
    }
    return actions;
  };

  const renderModal = () => {
    if (!modal) return null;
    const close = () => setModal(null);

    if (modal.kind === 'add') {
      return <AddUserModal locked={locked} onClose={close} onReview={requestCreate} />;
    }

    if (modal.kind === 'groups') {
      const targets = users.filter((user) => modal.userIds.includes(user.firestoreDocId));
      if (targets.length === 0) return null;
      return (
        <GroupModal
          targets={targets}
          groups={access?.groups ?? []}
          loadError={access ? access.error : 'Admin groups are still loading.'}
          canGrantSuperAdmin={canGrantSuperAdmin}
          groupIdsFor={groupIdsFor}
          adminUserIds={adminUserIds}
          locked={locked}
          onClose={close}
          onReview={(changes) => requestGroupChanges(targets, changes)}
        />
      );
    }

    const user = findUser(modal.userId);
    if (!user) return null;
    switch (modal.kind) {
      case 'edit':
        return <EditProfileModal user={user} locked={locked} onClose={close} onReview={(fields) => requestProfileSave(user, fields)} />;
      case 'password':
        return (
          <SetPasswordModal
            user={user}
            locked={locked}
            onClose={close}
            onReview={(password, forceChange) => requestSetPassword(user, password, forceChange)}
          />
        );
      case 'pin':
        return <SetPinModal user={user} locked={locked} onClose={close} onReview={(pin) => requestSetPin(user, pin)} />;
      case 'subscription':
        return (
          <SubscriptionModal user={user} locked={locked} onClose={close} onReview={(input) => requestSubscription(user, input)} />
        );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {VIEW_INTRO[activeView] && <p className="text-sm text-slate-600">{VIEW_INTRO[activeView]}</p>}
      {activeView === 'add' && !canAdd && (
        <p role="note" className="text-sm font-semibold text-amber-800">
          You do not have permission to add users.
        </p>
      )}

      {duplicateEmailRows > 0 && (
        <div role="note" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {duplicateEmailRows} profile row{duplicateEmailRows === 1 ? '' : 's'} share an email address. Check each document
          ID before deleting. These rows are not automatically linked to Authentication accounts.
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="users-search" className="block text-xs font-bold text-slate-600">
            Search
          </label>
          <input
            id="users-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, email, login name, or phone"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="users-status" className="block text-xs font-bold text-slate-600">
            Status
          </label>
          <select
            id="users-status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className={selectClass}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
        <div>
          <label htmlFor="users-role" className="block text-xs font-bold text-slate-600">
            Role
          </label>
          <select
            id="users-role"
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
            className={selectClass}
          >
            <option value="all">All roles</option>
            <option value="user">User</option>
            <option value="subscriber">Subscriber</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          {can('users.create') && (
            <button type="button" disabled={locked} onClick={() => setModal({ kind: 'add' })} className={primaryToolbarButton}>
              Add user
            </button>
          )}
          <button type="button" disabled={locked} onClick={exportCsv} className={secondaryToolbarButton}>
            Export CSV
          </button>
          <button
            type="button"
            disabled={locked}
            onClick={() => {
              void loadUsers();
              void loadAccess();
            }}
            className={secondaryToolbarButton}
          >
            Refresh
          </button>
        </div>
      </div>

      <p className="text-sm text-slate-600" aria-live="polite">
        Showing {filtered.length} of {users.length} users
        {selected.size > 0 ? ` · ${selected.size} selected` : ''}
      </p>

      {selected.size > 0 && (
        <div role="region" aria-label="Bulk actions" className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-white">
          <span className="mr-2 text-sm font-bold">
            {selected.size} selected
            {hiddenSelectedCount > 0 ? ` (${hiddenSelectedCount} hidden by the current filters, included)` : ''}
          </span>
          {can('users.suspend') && (
            <>
              <button type="button" disabled={locked} onClick={() => requestBlock(selectedUsers, true)} className={bulkBlockButton}>
                Block selected
              </button>
              <button
                type="button"
                disabled={locked}
                onClick={() => requestBlock(selectedUsers, false)}
                className={activeView === 'blocked' ? unblockButton : bulkButton}
              >
                Unblock selected
              </button>
            </>
          )}
          {can('users.edit') && (
            <button type="button" disabled={locked} onClick={() => requestResetEmail(selectedUsers)} className={bulkButton}>
              Send reset emails
            </button>
          )}
          {canManageGroups && (
            <button
              type="button"
              disabled={locked}
              onClick={() => setModal({ kind: 'groups', userIds: selectedUsers.map((user) => user.firestoreDocId) })}
              className={bulkButton}
            >
              Manage admin groups
            </button>
          )}
          {can('users.delete') && (
            <button type="button" disabled={locked} onClick={() => requestDelete(selectedUsers)} className={bulkDeleteButton}>
              Delete selected
            </button>
          )}
          <button
            type="button"
            disabled={locked}
            onClick={() => setSelected(new Set())}
            className="ml-auto rounded-lg px-3 py-2 text-xs font-bold text-white underline-offset-2 hover:underline"
          >
            Clear selection
          </button>
        </div>
      )}

      {progress && (
        <p role="status" className="text-sm font-semibold text-slate-700">
          {progress}
        </p>
      )}
      {notice && (
        <p role={notice.tone === 'error' ? 'alert' : 'status'} className={`text-sm font-semibold ${notice.tone === 'ok' ? 'text-emerald-700' : 'text-red-700'}`}>
          {notice.text}
        </p>
      )}
      {loadError && (
        <p role="alert" className="flex flex-wrap items-center gap-3 text-sm font-semibold text-red-700">
          {loadError}
          <button type="button" onClick={() => void loadUsers()} className={secondaryToolbarButton}>
            Try again
          </button>
        </p>
      )}
      {canManageGroups && access?.error && (
        <p role="alert" className="text-sm font-semibold text-red-700">
          {access.error}
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
        {loading ? (
          <p className="p-6 text-slate-600">Loading users…</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-slate-600">
            {users.length === 0 ? 'No users found.' : 'No users match the current filters.'}
          </p>
        ) : (
          <table className={tableClass}>
            <caption className="sr-only">Users. Select rows to act on several at once, or use the Actions menu on a row.</caption>
            <thead>
              <tr>
                <th scope="col" className={thClass}>
                  <IndeterminateCheckbox
                    checked={allVisibleSelected}
                    indeterminate={visibleSelectedCount > 0 && !allVisibleSelected}
                    disabled={busy}
                    label="Select all users shown"
                    onChange={toggleVisible}
                  />
                </th>
                {sortHeader('name', 'Name')}
                {sortHeader('email', 'Email')}
                {sortHeader('phone', 'Phone')}
                {sortHeader('role', 'Role')}
                {sortHeader('status', 'Status')}
                {sortHeader('subscription', 'Subscription')}
                {sortHeader('groups', 'Admin groups')}
                {sortHeader('joined', 'Joined')}
                {sortHeader('updated', 'Last updated')}
                <th scope="col" className={thClass}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((user) => {
                const id = user.firestoreDocId;
                const isSelected = selected.has(id);
                const blocked = isUserBlocked(user);
                const expiry = subscriptionExpiry(user);
                const groupNames = groupIdsFor(id).map((groupId) => groupNameById.get(groupId) ?? groupId);
                return (
                  <tr key={id} className={isSelected ? 'bg-amber-50' : undefined}>
                    <td className={tdClass}>
                      <IndeterminateCheckbox
                        checked={isSelected}
                        disabled={busy}
                        label={`Select ${displayName(user)}`}
                        onChange={() => toggleOne(id)}
                      />
                    </td>
                    <td className={`${tdClass} font-semibold`}>{user.name || '—'}</td>
                    <td className={tdClass}>{user.email || '—'}</td>
                    <td className={tdClass}>{user.phone || '—'}</td>
                    <td className={tdClass}>{roleLabel(user)}</td>
                    <td className={tdClass}>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${blocked ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                        {blocked ? 'Blocked' : 'Active'}
                      </span>
                      {user.mustChangePassword === true && (
                        <span className="mt-1 block text-xs font-semibold text-amber-800">Must change password</span>
                      )}
                    </td>
                    <td className={tdClass}>
                      <span className="block font-semibold">{subscriptionLabel(user)}</span>
                      {expiry && <span className="block text-xs text-slate-500">Expires {formatDate(expiry.toISOString())}</span>}
                    </td>
                    <td className={tdClass}>
                      {!canManageGroups ? '—' : groupNames.length > 0 ? groupNames.join(', ') : 'None'}
                    </td>
                    <td className={tdClass}>{formatDate(user.createdAt)}</td>
                    <td className={tdClass}>{formatDate(user.updatedAt)}</td>
                    <td className={`${tdClass} whitespace-nowrap`}>
                      <div className="flex items-center gap-2">
                        {activeView === 'blocked' && blocked && can('users.suspend') && (
                          <button type="button" disabled={busy} onClick={() => requestBlock([user], false)} className={unblockButton}>
                            Unblock
                          </button>
                        )}
                        {activeView === 'subscribers' && can('subscriptions.manage') && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setModal({ kind: 'subscription', userId: id })}
                            className={secondaryToolbarButton}
                          >
                            Subscription
                          </button>
                        )}
                        <UserRowMenu id={id} userName={displayName(user)} actions={rowActions(user)} disabled={busy} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {renderModal()}

      <AdminActionDialog
        open={pending !== null}
        title={pending?.title ?? ''}
        description={pending?.description ?? ''}
        confirmLabel={pending?.confirmLabel ?? 'Confirm'}
        danger={pending?.danger ?? false}
        requirePassword={pending?.requirePassword ?? true}
        onConfirm={async () => {
          if (pending) await pending.run();
        }}
        onCancel={() => setPending(null)}
      />
    </div>
  );
};

export default UsersPanel;
