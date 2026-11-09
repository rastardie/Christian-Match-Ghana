import React, { useEffect, useMemo, useState } from 'react';
import { listAdminAuditLogs } from '../../services/adminRbacService';
import { formatDate, inputClass, tableClass, tdClass, thClass, truncate } from './shared';

type AuditRow = Record<string, any>;

const AuditPanel: React.FC = () => {
  const [entries, setEntries] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let active = true;
    listAdminAuditLogs()
      .then((rows) => {
        if (active) setEntries(rows);
      })
      .catch((err) => {
        console.error('Loading audit log failed:', err);
        if (active) setError('The audit log could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return entries;
    return entries.filter((entry) => JSON.stringify(entry).toLowerCase().includes(term));
  }, [entries, query]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search actor, action, target…"
          aria-label="Search audit log"
          className={inputClass}
        />
        <span className="text-sm text-slate-500">{filtered.length} of {entries.length} entries</span>
      </div>
      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
        {loading ? (
          <p className="p-6 text-slate-600">Loading audit log…</p>
        ) : error ? (
          <p className="p-6 text-red-600">{error}</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-slate-600">No audit entries match this search.</p>
        ) : (
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>When</th>
                <th className={thClass}>Who</th>
                <th className={thClass}>Action</th>
                <th className={thClass}>Target</th>
                <th className={thClass}>Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry, index) => (
                <tr key={entry.id ?? index}>
                  <td className={tdClass}>{formatDate(entry.createdAt ?? entry.timestamp ?? entry.at)}</td>
                  <td className={tdClass}>{entry.actorEmail || entry.actorId || entry.actor || '—'}</td>
                  <td className={tdClass}>{entry.action || '—'}</td>
                  <td className={tdClass}>{entry.targetId || entry.target || '—'}</td>
                  <td className={`${tdClass} max-w-md`}>{truncate(entry.summary || entry.details ? String(entry.summary || entry.details) : '', 160)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AuditPanel;
