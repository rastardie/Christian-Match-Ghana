import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { deleteUser, getAdminUsers, toggleBlockUser } from '../../services/adminService';
import { buttonClass, formatDate, inputClass, tableClass, tdClass, thClass } from './shared';

type AdminUserRow = {
  firestoreDocId: string;
  name?: string;
  email?: string;
  location?: string;
  country?: string;
  isBlocked?: boolean;
  subscriptionStatus?: string;
  createdAt?: unknown;
};

const UsersPanel: React.FC = () => {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const rows = await getAdminUsers();
    setUsers(rows as AdminUserRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return users;
    return users.filter((user) =>
      [user.name, user.email, user.location, user.country]
        .some((field) => typeof field === 'string' && field.toLowerCase().includes(term))
    );
  }, [users, query]);

  const handleBlock = async (user: AdminUserRow) => {
    const next = !user.isBlocked;
    const label = user.name || user.email || 'this user';
    if (!window.confirm(`${next ? 'Block' : 'Unblock'} ${label}?`)) return;
    setBusyId(user.firestoreDocId);
    const ok = await toggleBlockUser(user.firestoreDocId, next);
    setBusyId(null);
    setMessage(ok ? { type: 'ok', text: `${label} ${next ? 'blocked' : 'unblocked'}.` } : { type: 'error', text: 'The change could not be saved.' });
    if (ok) {
      setUsers((rows) => rows.map((row) => (row.firestoreDocId === user.firestoreDocId ? { ...row, isBlocked: next } : row)));
    }
  };

  const handleDelete = async (user: AdminUserRow) => {
    const label = user.name || user.email || 'this user';
    if (!window.confirm(`Permanently delete ${label}? Their account, photos, and prayers will be removed. This cannot be undone.`)) return;
    setBusyId(user.firestoreDocId);
    const ok = await deleteUser(user.firestoreDocId);
    setBusyId(null);
    setMessage(ok ? { type: 'ok', text: `${label} was deleted.` } : { type: 'error', text: `${label} could not be deleted.` });
    if (ok) setUsers((rows) => rows.filter((row) => row.firestoreDocId !== user.firestoreDocId));
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, email, location…"
          aria-label="Search users"
          className={inputClass}
        />
        <button type="button" onClick={() => void load()} className={`${buttonClass} bg-slate-900 text-white`}>
          Refresh
        </button>
        <span className="text-sm text-slate-500">{filtered.length} of {users.length} users</span>
      </div>

      {message && (
        <p role="status" className={`mb-4 text-sm font-semibold ${message.type === 'ok' ? 'text-emerald-700' : 'text-red-600'}`}>
          {message.text}
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
        {loading ? (
          <p className="p-6 text-slate-600">Loading users…</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-slate-600">No users match this search.</p>
        ) : (
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Name</th>
                <th className={thClass}>Email</th>
                <th className={thClass}>Location</th>
                <th className={thClass}>Subscription</th>
                <th className={thClass}>Status</th>
                <th className={thClass}>Joined</th>
                <th className={thClass}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.firestoreDocId}>
                  <td className={tdClass}>{user.name || '—'}</td>
                  <td className={tdClass}>{user.email || '—'}</td>
                  <td className={tdClass}>{[user.location, user.country].filter(Boolean).join(', ') || '—'}</td>
                  <td className={tdClass}>{user.subscriptionStatus || '—'}</td>
                  <td className={tdClass}>
                    <span className={user.isBlocked ? 'font-bold text-red-600' : 'font-bold text-emerald-700'}>
                      {user.isBlocked ? 'Blocked' : 'Active'}
                    </span>
                  </td>
                  <td className={tdClass}>{formatDate(user.createdAt)}</td>
                  <td className={`${tdClass} whitespace-nowrap`}>
                    <button
                      type="button"
                      disabled={busyId === user.firestoreDocId}
                      onClick={() => void handleBlock(user)}
                      className={`${buttonClass} mr-2 bg-amber-100 text-amber-900`}
                    >
                      {user.isBlocked ? 'Unblock' : 'Block'}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === user.firestoreDocId}
                      onClick={() => void handleDelete(user)}
                      className={`${buttonClass} bg-red-600 text-white`}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default UsersPanel;
