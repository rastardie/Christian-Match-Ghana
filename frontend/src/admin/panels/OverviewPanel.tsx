import React, { useEffect, useState } from 'react';
import { getDashboardStats, type DashboardStats } from '../../services/adminService';

const OverviewPanel: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getDashboardStats()
      .then((result) => {
        if (active) setStats(result);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <p className="text-slate-600">Loading statistics…</p>;
  if (!stats) return <p className="text-slate-600">Statistics are unavailable right now.</p>;

  const cards = [
    { label: 'Total users', value: stats.totalUsers.toLocaleString() },
    { label: 'Connections (chats)', value: stats.activeMatches.toLocaleString() },
    { label: 'Pending reports', value: stats.pendingReports.toLocaleString() },
    { label: 'Successful payments total', value: stats.totalRevenue.toLocaleString() },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{card.label}</div>
            <div className="mt-2 text-3xl font-black text-slate-900">{card.value}</div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-slate-500">
        Payment totals are the amounts recorded on successful payments. Reports show zero until the
        reports collection is enabled.
      </p>
    </div>
  );
};

export default OverviewPanel;
