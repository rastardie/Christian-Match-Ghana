import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getAdminPrayers, getAdminReports, getDashboardStats, type DashboardStats } from '../../services/adminService';
import { loadAdminUserSummaries, probeReportsAvailable, type AdminUserSummary } from '../../services/adminAccessActions';
import AnalyticsSection from './overview/AnalyticsSection';

type ReportRow = { id: string; reason?: string; status?: string; createdAt?: unknown };

interface OverviewData {
  stats: DashboardStats;
  users: AdminUserSummary[];
  prayerCount: number;
  reportsConnected: boolean;
  reports: ReportRow[];
}

/** Accepts Firestore Timestamps, {seconds} objects, ISO strings, and epoch numbers. */
function toDate(value: unknown): Date | null {
  if (!value) return null;
  const stamp = value as { toDate?: () => Date; seconds?: number };
  if (typeof stamp.toDate === 'function') return stamp.toDate();
  if (typeof stamp.seconds === 'number') return new Date(stamp.seconds * 1000);
  const date = new Date(value as string | number);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Signups per day for the last seven days, oldest first. */
function signupsLastSevenDays(users: AdminUserSummary[]): Array<{ label: string; count: number }> {
  const created = users.map((user) => toDate(user.createdAt)).filter((date): date is Date => date !== null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, index) => {
    const start = new Date(today);
    start.setDate(today.getDate() - (6 - index));
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    return {
      label: start.toLocaleDateString(undefined, { weekday: 'short' }),
      count: created.filter((date) => date >= start && date < end).length,
    };
  });
}

const NOT_CONNECTED = 'Not connected';

const StatCard: React.FC<{ label: string; value: React.ReactNode; hint?: string }> = ({ label, value, hint }) => (
  <div className="rounded-2xl bg-white p-5 shadow-sm">
    <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
    <div className="mt-2 text-3xl font-black text-slate-900">{value}</div>
    {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
  </div>
);

const Bar: React.FC<{ label: string; value: number; total: number; colorClass: string }> = ({ label, value, total, colorClass }) => {
  const percent = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs font-bold text-slate-500">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
};

/** Dashboard sub-view: stat cards, insights, and recent activity. Owns its own data loading. */
const DashboardView: React.FC = () => {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [stats, users, prayers, reportsConnected] = await Promise.all([
        getDashboardStats(),
        loadAdminUserSummaries(),
        getAdminPrayers(),
        probeReportsAvailable(),
      ]);
      const reports: ReportRow[] = reportsConnected ? await getAdminReports() : [];
      setData({ stats, users, prayerCount: prayers.length, reportsConnected, reports });
    } catch (err) {
      console.error('Loading overview failed:', err);
      setError('Overview statistics could not be loaded. Try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const derived = useMemo(() => {
    if (!data) return null;
    const { users, reports, reportsConnected } = data;
    const pending = reports.filter((report) => (report.status || 'pending') === 'pending').length;
    const resolved = reports.filter((report) => report.status === 'resolved').length;
    const signups = signupsLastSevenDays(users);
    return {
      active: users.filter((user) => !user.isBlocked).length,
      blocked: users.filter((user) => user.isBlocked).length,
      verified: users.filter((user) => user.isVerified).length,
      premium: users.filter((user) => user.isPremium).length,
      // getAdminUsers returns newest first, so the first five are the most recent.
      recentUsers: users.slice(0, 5),
      recentReports: reports.slice(0, 5),
      pending,
      resolved,
      signups,
      maxSignup: Math.max(...signups.map((day) => day.count), 1),
      reportsConnected,
    };
  }, [data]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-orange">Platform overview</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">Christian Match Ghana at a glance</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-green-50 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-green-700">Live snapshot</span>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {error}
        </p>
      )}

      {loading && !data && <p role="status" className="text-slate-600">Loading statistics…</p>}

      {data && derived && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total users" value={data.stats.totalUsers.toLocaleString()} />
            <StatCard label="Active users" value={derived.active.toLocaleString()} hint="Not blocked" />
            <StatCard label="Verified users" value={derived.verified.toLocaleString()} />
            <StatCard
              label="Pending reports"
              value={derived.reportsConnected ? data.stats.pendingReports.toLocaleString() : <span className="text-xl">{NOT_CONNECTED}</span>}
              hint={derived.reportsConnected ? 'Awaiting review' : 'Reports are not readable yet'}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
            <StatCard label="Active matches" value={data.stats.activeMatches.toLocaleString()} hint="Chats" />
            <StatCard label="Premium users" value={derived.premium.toLocaleString()} />
            <StatCard label="Blocked users" value={derived.blocked.toLocaleString()} />
            <StatCard label="Revenue" value={`₵${data.stats.totalRevenue.toLocaleString()}`} hint="Successful payments" />
            <StatCard label="Prayer requests" value={data.prayerCount.toLocaleString()} />
          </div>

          <details open className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <summary className="cursor-pointer rounded-xl px-2 py-1 text-sm font-black text-slate-800 hover:bg-slate-50">
              Detailed insights and activity
            </summary>
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-slate-200 p-4">
                <h3 className="font-black text-slate-800">User status</h3>
                <div className="mt-3 space-y-3 text-xs">
                  <Bar label="Active" value={derived.active} total={data.users.length} colorClass="bg-green-500" />
                  <Bar label="Blocked" value={derived.blocked} total={data.users.length} colorClass="bg-red-500" />
                  <Bar label="Verified" value={derived.verified} total={data.users.length} colorClass="bg-blue-500" />
                  <Bar label="Premium" value={derived.premium} total={data.users.length} colorClass="bg-orange-500" />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <h3 className="font-black text-slate-800">Moderation queue</h3>
                {derived.reportsConnected ? (
                  <div className="mt-3 space-y-3 text-xs">
                    <Bar label="Pending" value={derived.pending} total={Math.max(derived.pending, derived.resolved, 1)} colorClass="bg-orange-500" />
                    <Bar label="Resolved" value={derived.resolved} total={Math.max(derived.pending, derived.resolved, 1)} colorClass="bg-green-500" />
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">
                    Not connected. Reports appear here once the reports collection is readable by admins.
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <h3 className="font-black text-slate-800">New users · 7 days</h3>
                <ol className="mt-3 flex h-24 items-end gap-2">
                  {derived.signups.map((item, index) => {
                    return (
                      <li key={`${item.label}-${index}`} className="flex flex-1 flex-col items-center gap-1">
                        <div className="flex h-full w-full items-end">
                          <div
                            className="w-full rounded-t bg-brand-orange/80"
                            style={{ height: `${Math.max((item.count / derived.maxSignup) * 100, item.count ? 12 : 3)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500">
                          {item.label}
                          <span className="sr-only">: {item.count} new users</span>
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-black text-slate-800">Recent users</h3>
                  <span className="text-xs font-bold text-slate-400">{data.users.length} total</span>
                </div>
                {derived.recentUsers.length === 0 ? (
                  <p className="py-4 text-sm text-slate-500">No users found.</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {derived.recentUsers.map((user) => (
                      <li key={user.id} className="flex items-start justify-between gap-3 py-3 text-xs">
                        <span className="min-w-0 break-words font-black text-slate-800">{user.name || user.email || 'Unnamed user'}</span>
                        <span className="shrink-0 text-slate-500">{user.isBlocked ? 'Blocked' : 'Active'}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-black text-slate-800">Recent reports</h3>
                  <span className="text-xs font-bold text-slate-400">
                    {derived.reportsConnected ? `${derived.pending} pending` : NOT_CONNECTED}
                  </span>
                </div>
                {!derived.reportsConnected ? (
                  <p className="py-4 text-sm text-slate-500">Reports are not connected yet.</p>
                ) : derived.recentReports.length === 0 ? (
                  <p className="py-4 text-sm text-slate-500">No reports found.</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {derived.recentReports.map((report) => (
                      <li key={report.id} className="flex items-start justify-between gap-3 py-3 text-xs">
                        <span className="min-w-0 break-words font-black text-slate-800">{report.reason || 'General report'}</span>
                        <span className="shrink-0 rounded bg-orange-50 px-2 py-0.5 font-bold text-orange-700">{report.status || 'pending'}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </details>
        </>
      )}

    </div>
  );
};

export interface OverviewPanelProps {
  /** Selected sub-view from AdminConsole. Unknown or missing values fall back to 'dashboard'. */
  view?: string;
}

const OverviewPanel: React.FC<OverviewPanelProps> = ({ view }) => {
  if (view === 'analytics') return <AnalyticsSection />;
  return <DashboardView />;
};

export default OverviewPanel;
