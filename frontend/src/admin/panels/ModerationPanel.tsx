import React, { useCallback, useEffect, useState } from 'react';
import { getAdminReports, getAdminUsers } from '../../services/adminService';
import { setUserBlockedAsAdmin } from '../../services/adminUserActions';
import AdminActionDialog from './AdminActionDialog';
import { formatDate, tableClass, tdClass, thClass, truncate } from './shared';
import { displayName, errorMessage, isUserBlocked } from './users/userHelpers';
import { type UserRow } from './users/types';
import { toolbarButtonClass } from './users/ui';

export interface ModerationPanelProps {
  /** Sidebar sub-view: 'reports' (default) or 'blocked'. Unknown values show 'reports'. */
  view?: string;
  /** The viewer's admin permissions; Unblock needs users.suspend. */
  permissions?: string[];
  isSuperAdmin?: boolean;
}

type ReportRow = {
  id: string;
  reason?: string;
  description?: string;
  status?: string;
  type?: string;
  createdAt?: unknown;
};

const ModerationPanel: React.FC<ModerationPanelProps> = ({ view, permissions = [], isSuperAdmin = false }) => {
  const canUnblock = isSuperAdmin || permissions.includes('users.suspend');
  return view === 'blocked' ? <BlockedAccountsView canUnblock={canUnblock} /> : <ReportsView />;
};

const ReportsView: React.FC = () => {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getAdminReports()
      .then((rows) => {
        if (active) setReports(rows as ReportRow[]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <p className="text-slate-600">Loading reports…</p>;

  if (reports.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-8 text-slate-700 shadow-sm">
        <h2 className="text-lg font-black text-slate-900">No reports to review</h2>
        <p className="mt-2 text-sm">
          Reports are not connected yet. The app does not create reports, and the Firestore rules do not
          give admins access to the reports collection. Enabling this needs a rules change, which will be
          reviewed separately before it is deployed.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
      <table className={tableClass}>
        <thead>
          <tr>
            <th className={thClass}>Reported</th>
            <th className={thClass}>Type</th>
            <th className={thClass}>Reason</th>
            <th className={thClass}>Details</th>
            <th className={thClass}>Status</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => (
            <tr key={report.id}>
              <td className={tdClass}>{formatDate(report.createdAt)}</td>
              <td className={tdClass}>{report.type || '—'}</td>
              <td className={tdClass}>{report.reason || '—'}</td>
              <td className={`${tdClass} max-w-md`}>{truncate(report.description)}</td>
              <td className={tdClass}>{report.status || 'pending'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const refreshButtonClass = `${toolbarButtonClass} border border-slate-300 bg-white text-slate-800 hover:bg-slate-50`;
const unblockButtonClass = `${toolbarButtonClass} bg-emerald-600 text-white hover:bg-emerald-700`;

/** Blocked accounts, loaded from the same profile list as the Users section. */
const BlockedAccountsView: React.FC<{ canUnblock: boolean }> = ({ canUnblock }) => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState<UserRow | null>(null);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const rows = await getAdminUsers();
      setUsers(rows.filter((row) => isUserBlocked(row)));
    } catch (error) {
      setLoadError(errorMessage(error, 'Blocked accounts could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const confirmUnblock = async () => {
    const target = pending;
    if (!target) return;
    try {
      await setUserBlockedAsAdmin(target.firestoreDocId, false);
    } catch (error) {
      // Thrown so the confirmation dialog stays open and shows the reason.
      throw new Error(errorMessage(error, `${displayName(target)} could not be unblocked. Try again.`));
    }
    setUsers((rows) => rows.filter((row) => row.firestoreDocId !== target.firestoreDocId));
    setNotice({ tone: 'ok', text: `${displayName(target)} was unblocked.` });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-slate-600">
          {loading ? 'Loading blocked accounts…' : `${users.length} blocked ${users.length === 1 ? 'account' : 'accounts'}`}
        </p>
        <button type="button" onClick={() => void load()} disabled={loading} className={refreshButtonClass}>
          Refresh
        </button>
      </div>

      {notice && (
        <p role={notice.tone === 'error' ? 'alert' : 'status'} className={`text-sm font-semibold ${notice.tone === 'ok' ? 'text-emerald-700' : 'text-red-700'}`}>
          {notice.text}
        </p>
      )}
      {loadError && (
        <p role="alert" className="flex flex-wrap items-center gap-3 text-sm font-semibold text-red-700">
          {loadError}
          <button type="button" onClick={() => void load()} className={refreshButtonClass}>
            Try again
          </button>
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
        {loading ? (
          <p className="p-6 text-slate-600">Loading blocked accounts…</p>
        ) : users.length === 0 ? (
          <p className="p-6 text-slate-600">No blocked accounts. Users blocked in the Users section appear here.</p>
        ) : (
          <table className={tableClass}>
            <caption className="sr-only">Blocked accounts</caption>
            <thead>
              <tr>
                <th scope="col" className={thClass}>Name</th>
                <th scope="col" className={thClass}>Email</th>
                <th scope="col" className={thClass}>Phone</th>
                <th scope="col" className={thClass}>Joined</th>
                <th scope="col" className={thClass}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.firestoreDocId}>
                  <td className={`${tdClass} font-semibold`}>{user.name || '—'}</td>
                  <td className={tdClass}>{user.email || '—'}</td>
                  <td className={tdClass}>{user.phone || '—'}</td>
                  <td className={tdClass}>{formatDate(user.createdAt)}</td>
                  <td className={`${tdClass} whitespace-nowrap`}>
                    {canUnblock ? (
                      <button
                        type="button"
                        onClick={() => setPending(user)}
                        aria-label={`Unblock ${displayName(user)}`}
                        className={unblockButtonClass}
                      >
                        Unblock
                      </button>
                    ) : (
                      <span className="text-xs text-slate-500">Needs Suspend users</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AdminActionDialog
        open={pending !== null}
        title={`Unblock ${pending ? displayName(pending) : 'this user'}?`}
        description="They will be able to use the app again."
        confirmLabel="Unblock"
        requirePassword
        onConfirm={confirmUnblock}
        onCancel={() => setPending(null)}
      />
    </div>
  );
};

export default ModerationPanel;
