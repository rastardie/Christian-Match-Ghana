import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getAdminPrayers } from '../../services/adminService';
import { deletePrayerRequest, downloadCsv, toCsv } from '../../services/adminAccessActions';
import AdminActionDialog from './AdminActionDialog';
import { buttonClass, formatDate, inputClass, tableClass, tdClass, thClass, truncate } from './shared';

type PrayerRow = {
  id: string;
  userName?: string;
  content?: string;
  prayingCount?: number;
  commentCount?: number;
  isPublic?: boolean;
  reported?: boolean;
  createdAt?: unknown;
};

type StatusFilter = 'all' | 'active' | 'reported';

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: 'All requests',
  active: 'Active',
  reported: 'Reported',
};

const PrayersPanel: React.FC = () => {
  const [prayers, setPrayers] = useState<PrayerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [pendingDelete, setPendingDelete] = useState<PrayerRow | null>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const rows: PrayerRow[] = await getAdminPrayers();
    setPrayers(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return prayers.filter((prayer) => {
      const matchesText =
        !term || [prayer.userName, prayer.content].some((field) => typeof field === 'string' && field.toLowerCase().includes(term));
      const matchesStatus =
        status === 'all' || (status === 'reported' ? prayer.reported === true : prayer.reported !== true);
      return matchesText && matchesStatus;
    });
  }, [prayers, query, status]);

  const exportCsv = () => {
    const headers = ['User', 'Content', 'Likes', 'Comments', 'Date', 'Status'];
    const rows = filtered.map((prayer) => [
      prayer.userName || 'Anonymous',
      prayer.content || '',
      prayer.prayingCount ?? 0,
      prayer.commentCount ?? 0,
      formatDate(prayer.createdAt),
      prayer.reported === true ? 'Reported' : 'Active',
    ]);
    downloadCsv('prayer_requests.csv', toCsv(headers, rows));
    setMessage({ type: 'ok', text: `Exported ${filtered.length} prayer ${filtered.length === 1 ? 'request' : 'requests'}.` });
  };

  const confirmDelete = async () => {
    const target = pendingDelete;
    if (!target) return;
    try {
      await deletePrayerRequest(target.id);
      setPrayers((rows) => rows.filter((row) => row.id !== target.id));
      setMessage({ type: 'ok', text: 'Prayer request and its comments deleted.' });
    } catch (error) {
      console.error('Deleting prayer failed:', error);
      // Thrown so the confirmation dialog stays open and shows the reason.
      throw new Error('The prayer request could not be deleted. Try again.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name or request…"
          aria-label="Search prayers"
          className={inputClass}
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as StatusFilter)}
          aria-label="Filter by status"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
        >
          {(Object.keys(STATUS_LABELS) as StatusFilter[]).map((key) => (
            <option key={key} value={key}>
              {STATUS_LABELS[key]}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => void load()} disabled={loading} className={`${buttonClass} bg-slate-900 text-white`}>
          Refresh
        </button>
        <button
          type="button"
          onClick={exportCsv}
          disabled={loading || filtered.length === 0}
          className={`${buttonClass} bg-brand-orange px-3 py-2 text-sm text-white`}
        >
          Export CSV
        </button>
        <span className="text-sm text-slate-500">
          {filtered.length} of {prayers.length} requests
        </span>
      </div>

      {message && (
        <p role={message.type === 'error' ? 'alert' : 'status'} className={`text-sm font-semibold ${message.type === 'ok' ? 'text-emerald-700' : 'text-red-600'}`}>
          {message.text}
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
        {loading ? (
          <p className="p-6 text-slate-600">Loading prayer requests…</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-slate-600">No prayer requests match this search.</p>
        ) : (
          <table className={tableClass}>
            <caption className="sr-only">Prayer requests</caption>
            <thead>
              <tr>
                <th scope="col" className={thClass}>Posted</th>
                <th scope="col" className={thClass}>By</th>
                <th scope="col" className={thClass}>Request</th>
                <th scope="col" className={thClass}>Praying</th>
                <th scope="col" className={thClass}>Comments</th>
                <th scope="col" className={thClass}>Visibility</th>
                <th scope="col" className={thClass}>Status</th>
                <th scope="col" className={thClass}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((prayer) => {
                const author = prayer.userName || 'Anonymous';
                return (
                  <tr key={prayer.id}>
                    <td className={tdClass}>{formatDate(prayer.createdAt)}</td>
                    <td className={tdClass}>{prayer.userName || '—'}</td>
                    <td className={`${tdClass} max-w-md`}>{truncate(prayer.content)}</td>
                    <td className={tdClass}>{prayer.prayingCount ?? 0}</td>
                    <td className={tdClass}>{prayer.commentCount ?? 0}</td>
                    <td className={tdClass}>{prayer.isPublic === false ? 'Private' : 'Public'}</td>
                    <td className={tdClass}>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${prayer.reported ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}
                      >
                        {prayer.reported ? 'Reported' : 'Active'}
                      </span>
                    </td>
                    <td className={`${tdClass} whitespace-nowrap`}>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(prayer)}
                        aria-label={`Delete prayer by ${author}`}
                        className={`${buttonClass} bg-red-600 text-white`}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <AdminActionDialog
        open={pendingDelete !== null}
        title="Delete this prayer request?"
        description={`The request by ${pendingDelete?.userName || 'Anonymous'} and its ${pendingDelete?.commentCount ?? 0} comments will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete prayer"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
};

export default PrayersPanel;
