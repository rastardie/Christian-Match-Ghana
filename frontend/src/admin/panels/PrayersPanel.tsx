import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { getAdminPrayers } from '../../services/adminService';
import { buttonClass, formatDate, inputClass, tableClass, tdClass, thClass, truncate } from './shared';

type PrayerRow = {
  id: string;
  userName?: string;
  content?: string;
  prayingCount?: number;
  commentCount?: number;
  isPublic?: boolean;
  createdAt?: unknown;
};

const PrayersPanel: React.FC = () => {
  const [prayers, setPrayers] = useState<PrayerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setPrayers((await getAdminPrayers()) as PrayerRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return prayers;
    return prayers.filter((prayer) =>
      [prayer.userName, prayer.content].some((field) => typeof field === 'string' && field.toLowerCase().includes(term))
    );
  }, [prayers, query]);

  const handleDelete = async (prayer: PrayerRow) => {
    if (!window.confirm('Delete this prayer request and its comments? This cannot be undone.')) return;
    setBusyId(prayer.id);
    try {
      // Remove the comments first so none are left behind on a deleted prayer.
      const comments = await getDocs(collection(db, 'prayer_requests', prayer.id, 'comments'));
      await Promise.all(comments.docs.map((comment) => deleteDoc(comment.ref)));
      await deleteDoc(doc(db, 'prayer_requests', prayer.id));
      setPrayers((rows) => rows.filter((row) => row.id !== prayer.id));
      setMessage({ type: 'ok', text: 'Prayer request deleted.' });
    } catch (error) {
      console.error('Deleting prayer failed:', error);
      setMessage({ type: 'error', text: 'The prayer request could not be deleted.' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name or request…"
          aria-label="Search prayers"
          className={inputClass}
        />
        <button type="button" onClick={() => void load()} className={`${buttonClass} bg-slate-900 text-white`}>
          Refresh
        </button>
        <span className="text-sm text-slate-500">{filtered.length} of {prayers.length} requests</span>
      </div>

      {message && (
        <p role="status" className={`mb-4 text-sm font-semibold ${message.type === 'ok' ? 'text-emerald-700' : 'text-red-600'}`}>
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
            <thead>
              <tr>
                <th className={thClass}>Posted</th>
                <th className={thClass}>By</th>
                <th className={thClass}>Request</th>
                <th className={thClass}>Praying</th>
                <th className={thClass}>Comments</th>
                <th className={thClass}>Visibility</th>
                <th className={thClass}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((prayer) => (
                <tr key={prayer.id}>
                  <td className={tdClass}>{formatDate(prayer.createdAt)}</td>
                  <td className={tdClass}>{prayer.userName || '—'}</td>
                  <td className={`${tdClass} max-w-md`}>{truncate(prayer.content)}</td>
                  <td className={tdClass}>{prayer.prayingCount ?? 0}</td>
                  <td className={tdClass}>{prayer.commentCount ?? 0}</td>
                  <td className={tdClass}>{prayer.isPublic === false ? 'Private' : 'Public'}</td>
                  <td className={`${tdClass} whitespace-nowrap`}>
                    <button
                      type="button"
                      disabled={busyId === prayer.id}
                      onClick={() => void handleDelete(prayer)}
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

export default PrayersPanel;
