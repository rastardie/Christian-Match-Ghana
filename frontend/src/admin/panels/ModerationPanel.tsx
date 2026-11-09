import React, { useEffect, useState } from 'react';
import { getAdminReports } from '../../services/adminService';
import { formatDate, tableClass, tdClass, thClass, truncate } from './shared';

type ReportRow = {
  id: string;
  reason?: string;
  description?: string;
  status?: string;
  type?: string;
  createdAt?: unknown;
};

const ModerationPanel: React.FC = () => {
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

export default ModerationPanel;
