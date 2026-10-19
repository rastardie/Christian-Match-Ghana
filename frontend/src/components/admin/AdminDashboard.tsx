import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut, sendPasswordResetEmail, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebase';
import { getDashboardStats, getAdminUsers, getAdminPrayers, getAdminReports, deleteUser, toggleBlockUser, getAdminConnections, getAdminPayments, getAnalyticsData, AnalyticsData, adminCreateUser } from '../../services/adminService';
import { LayoutDashboard, Users, Shield, Activity, LogOut, MessageSquare, Heart, Trash2, Search, CheckCircle, XCircle, Link as LinkIcon, CreditCard, DollarSign, Calendar, MoreHorizontal, ChevronDown, RefreshCw, ClipboardList, Settings, Menu, Power, FileText, Printer, KeyRound, X } from 'lucide-react';
import { EditProfileView } from '../../MainApp';
import { updateUserDocument } from '../../services/userService';
import AdminAccessControl from './AdminAccessControl';
import { AdminActionProvider, useAdminActionConfirmation } from './AdminActionConfirmation';

import { getCurrentAdminAccess, listAdminAccessControl, assignAdminUserGroups } from '../../services/adminRbacService';
const ADMIN_MENU_GROUPS = [
  { key: 'users', label: 'Users', icon: Users, items: [
    { key: 'users', label: 'Users' },
    { key: 'access-control', label: 'Groups' },
    { key: 'connections', label: 'Connections' },
    { key: 'prayers', label: 'Prayers' },
  ] },
  { key: 'operations', label: 'Operations', icon: Activity, items: [
    { key: 'moderation', label: 'Reports' },
    { key: 'analytics', label: 'Analytics' },
  ] },
  { key: 'billing', label: 'Billing', icon: CreditCard, items: [
    { key: 'payments', label: 'Payments' },
  ] },
  { key: 'system', label: 'System', icon: Settings, items: [
    { key: 'overview', label: 'Dashboard' },
    { key: 'audit-logs', label: 'Audit' },
  ] },
] as const;

const ADMIN_NAV_STATE_KEY = 'cmg_admin_navigation_state';
const ADMIN_NAV_TABS = new Set([
  'overview', 'reports', 'users', 'access-control', 'connections', 'prayers',
  'moderation', 'analytics', 'payments', 'audit-logs',
]);

function readAdminNavigationState(): { activeTab: string; selectedMenuGroup: string } {
  if (typeof window === 'undefined') return { activeTab: 'overview', selectedMenuGroup: 'dashboard' };
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(ADMIN_NAV_STATE_KEY) || '{}') as { activeTab?: string; selectedMenuGroup?: string };
    const activeTab = stored.activeTab && ADMIN_NAV_TABS.has(stored.activeTab) ? stored.activeTab : 'overview';
    const selectedMenuGroup = activeTab === 'reports'
      ? 'reports'
      : ADMIN_MENU_GROUPS.find((group) => group.items.some((item) => item.key === activeTab))?.key || 'dashboard';
    return { activeTab, selectedMenuGroup };
  } catch {
    return { activeTab: 'overview', selectedMenuGroup: 'dashboard' };
  }
}

const AdminDashboard: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const initialNavigation = readAdminNavigationState();
  const [activeTab, setActiveTab] = useState(initialNavigation.activeTab);
  const [selectedMenuGroup, setSelectedMenuGroup] = useState(initialNavigation.selectedMenuGroup);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    people: true,
    operations: true,
    billing: false,
    system: true,
  });
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [refreshKey, setRefreshKey] = useState(0);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      window.sessionStorage.setItem(ADMIN_NAV_STATE_KEY, JSON.stringify({ activeTab, selectedMenuGroup }));
    } catch {
      // Session storage can be unavailable in restricted browser contexts.
    }
  }, [activeTab, selectedMenuGroup]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) return;
      void getCurrentAdminAccess().then((access) => {
        setPermissions(new Set(access.permissions));
      }).catch((error) => console.error('Unable to load admin permissions:', error));
    });
    return unsubscribe;
  }, []);

  const can = (permission: string) => permissions.has(permission) || permissions.has('permissions.manage');
  const selectTab = (tab: string) => {
    setActiveTab(tab);
    const owningGroup = ADMIN_MENU_GROUPS.find((group) => group.items.some((item) => item.key === tab));
    if (tab === 'reports') setSelectedMenuGroup('reports');
    else if (owningGroup) setSelectedMenuGroup(owningGroup.key);
    setMobileMenuOpen(false);
  };

  const selectMenuGroup = (groupKey: string) => {
    const group = ADMIN_MENU_GROUPS.find((candidate) => candidate.key === groupKey);
    if (!group) return;
    setSelectedMenuGroup(group.key);
    selectTab(group.items[0].key);
  };

  const selectDashboard = () => {
    setSelectedMenuGroup('dashboard');
    setActiveTab('overview');
    setMobileMenuOpen(false);
  };

  const handleRefresh = () => {
    setRefreshKey((currentKey) => currentKey + 1);
  };

  const requestSignOut = () => {
    setShowSignOutDialog(true);
  };

  const handleClose = () => {
    if (onClose) onClose();
    else navigate('/');
  };

  const handleSignOut = async () => {
    try {
      window.sessionStorage.removeItem(ADMIN_NAV_STATE_KEY);
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <Overview />;
      case 'reports':
        return <AdminReportsView />;
      case 'users':
        return <UsersView />;
      case 'connections':
        return <ConnectionsView />;
      case 'payments':
        return <PaymentsView />;
      case 'prayers':
        return <PrayersView />;
      case 'moderation':
        return <ModerationView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'access-control':
        return <AdminAccessControl initialTab="groups" />;
      case 'audit-logs':
        return <AdminAccessControl initialTab="audit" />;
      default:
        return <Overview />;
    }
  };

  const selectedGroup = ADMIN_MENU_GROUPS.find((group) => group.key === selectedMenuGroup);

  return (
    <AdminActionProvider>
      <div className="min-h-screen bg-[#f6f8fc] font-sans text-slate-900">
      {/* Mobile-first CMG Admin header, based on the Onboard Admin pattern. */}
      <header className="cmg-admin-header bg-white shadow-sm">
        <div className="mx-auto flex w-full items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <button type="button" title="Close Admin" aria-label="Close Admin" onClick={handleClose} className="rounded-xl p-2 text-slate-700 transition hover:bg-slate-100">
              <X size={21} />
            </button>
            <button type="button" onClick={selectDashboard} className="text-left">
            <div className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              <span>CMG</span><span className="text-brand-orange"> Admin</span>
            </div>
            <div className="text-xs font-bold text-slate-500 sm:text-sm">Christian Match Ghana</div>
          </button>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <button type="button" title="Refresh" aria-label="Refresh" onClick={handleRefresh} className="rounded-xl p-2 text-slate-700 transition hover:bg-slate-100">
              <RefreshCw size={21} />
            </button>
            <button type="button" title="Notifications" aria-label="Notifications" onClick={() => selectTab('prayers')} className="rounded-xl p-2 text-slate-700 transition hover:bg-slate-100">
              <MessageSquare size={21} />
            </button>
            <button type="button" title="Sign out" aria-label="Sign out" onClick={requestSignOut} className="rounded-xl p-2 text-slate-700 transition hover:bg-slate-100">
              <Power size={21} />
            </button>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-black text-white">A</span>
          </div>
        </div>
          <div className="bg-slate-900 px-3 py-3 sm:px-6">
            <div className={`cmg-admin-branch-panel mx-auto w-full rounded-2xl border p-1.5 transition-colors ${selectedMenuGroup !== 'dashboard' ? 'border-blue-400/70 bg-blue-500/[0.14] shadow-[0_0_0_2px_rgb(59_130_246_/_0.25),0_0_26px_rgb(59_130_246_/_0.30)]' : 'border-white/15'} bg-white/10`}>
              <div className="relative z-10 flex flex-wrap justify-center gap-1.5">
                <button
                  type="button"
                  onClick={selectDashboard}
                  className={`flex min-h-7 w-28 flex-none whitespace-nowrap items-center justify-center gap-1.5 rounded-full border px-2 py-1 text-xs font-black transition ${selectedMenuGroup === 'dashboard' ? 'cmg-admin-menu-top-selected border-blue-400/80 bg-blue-500/30 text-white shadow-[0_0_18px_rgb(59_130_246_/_0.45)]' : 'border-white/25 bg-white/10 text-white/45 hover:border-white/55 hover:bg-white/20 hover:text-white/75'}`}
                >
                  <LayoutDashboard size={16} />
                  Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => selectTab('reports')}
                  className={`flex min-h-7 w-28 flex-none whitespace-nowrap items-center justify-center gap-1.5 rounded-full border px-2 py-1 text-xs font-black transition ${selectedMenuGroup === 'reports' ? 'cmg-admin-menu-top-selected border-blue-400/80 bg-blue-500/30 text-white shadow-[0_0_18px_rgb(59_130_246_/_0.45)]' : 'border-white/25 bg-white/10 text-white/45 hover:border-white/55 hover:bg-white/20 hover:text-white/75'}`}
                >
                  <FileText size={16} />
                  Reports
                </button>
                {ADMIN_MENU_GROUPS.map((group) => {
                  const GroupIcon = group.icon;
                  const isSelected = selectedMenuGroup === group.key;
                  return (
                    <button
                      key={group.key}
                      type="button"
                      onClick={() => selectMenuGroup(group.key)}
                      aria-expanded={isSelected}
                      className={`flex min-h-7 w-28 flex-none whitespace-nowrap items-center justify-center gap-1.5 rounded-full border px-2 py-1 text-xs font-black transition ${isSelected ? 'cmg-admin-menu-top-selected border-blue-400/80 bg-blue-500/30 text-white shadow-[0_0_18px_rgb(59_130_246_/_0.45)]' : 'border-white/25 bg-white/10 text-white/45 hover:border-white/55 hover:bg-white/20 hover:text-white/75'}`}
                    >
                      <GroupIcon size={16} />
                      {group.label}
                    </button>
                  );
                })}
              </div>

              {selectedGroup && selectedMenuGroup !== 'dashboard' && (
                <div className="relative mt-3 border-t border-white/20 pt-3" aria-label={`${selectedGroup.label} options`}>
                  <div className="rounded-xl border border-blue-400/60 bg-blue-500/[0.16] p-1.5 shadow-[0_0_22px_rgb(59_130_246_/_0.22)]">
                    <div className="flex w-full flex-wrap justify-start gap-1.5">
                      {selectedGroup.items.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => selectTab(item.key)}
                          className={`flex min-h-7 flex-none whitespace-nowrap items-center justify-center rounded-full border px-3 py-1 text-xs font-black transition ${activeTab === item.key ? 'border-white/85 bg-white text-slate-950 shadow-md' : 'border-white/25 bg-white/15 text-white/75 hover:border-white/60 hover:bg-white/25 hover:text-white'}`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
      </header>

      <main className="mx-auto w-full overflow-auto px-4 py-5 sm:px-6 sm:py-8">
        <div key={refreshKey}>{renderContent()}</div>
        {showSignOutDialog && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/70 p-4" role="presentation" onClick={() => setShowSignOutDialog(false)}>
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="admin-signout-dialog-title" onClick={(event) => event.stopPropagation()}>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-orange/10 text-brand-orange">
                <Power size={26} />
              </div>
              <h2 id="admin-signout-dialog-title" className="text-xl font-black text-slate-900">Sign out?</h2>
              <p className="mt-2 text-sm text-slate-600">Are you sure you want to sign out of CMG Admin?</p>
              <div className="mt-6 flex gap-3">
                <button type="button" onClick={() => setShowSignOutDialog(false)} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50">Cancel</button>
                <button type="button" onClick={() => { setShowSignOutDialog(false); void handleSignOut(); }} className="flex-1 rounded-xl bg-brand-orange px-4 py-3 text-sm font-black text-white transition hover:brightness-95">Sign out</button>
              </div>
            </div>
          </div>
        )}
      </main>
      </div>
    </AdminActionProvider>
  );
};

// --- Sub-Views ---

const reportDateValue = (value: any): Date | null => {
    if (!value) return null;
    if (typeof value?.toDate === 'function') return value.toDate();
    if (typeof value?.seconds === 'number') return new Date(value.seconds * 1000);
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const AdminReportsView = () => {
    type ReportKind = 'platform' | 'users' | 'moderation' | 'payments';
    const today = new Date();
    const [reportKind, setReportKind] = useState<ReportKind>('platform');
    const [startDate, setStartDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10));
    const [endDate, setEndDate] = useState(today.toISOString().slice(0, 10));
    const [generatedReport, setGeneratedReport] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const inDateRange = (value: any) => {
        const date = reportDateValue(value);
        if (!date) return false;
        const start = new Date(`${startDate}T00:00:00`);
        const end = new Date(`${endDate}T23:59:59`);
        return date >= start && date <= end;
    };

    const generateReport = async () => {
        if (!startDate || !endDate || startDate > endDate) {
            setError('Choose a valid start and end date.');
            return;
        }
        setError('');
        setLoading(true);
        try {
            if (reportKind === 'platform') {
                const analytics = await getAnalyticsData('custom', startDate, endDate);
                setGeneratedReport({ kind: reportKind, analytics });
            } else if (reportKind === 'users') {
                const users = (await getAdminUsers()).filter((user: any) => inDateRange(user.createdAt));
                setGeneratedReport({ kind: reportKind, rows: users });
            } else if (reportKind === 'moderation') {
                const reports = (await getAdminReports()).filter((report: any) => inDateRange(report.createdAt));
                setGeneratedReport({ kind: reportKind, rows: reports });
            } else {
                const payments = (await getAdminPayments()).filter((payment: any) => inDateRange(payment.createdAt));
                setGeneratedReport({ kind: reportKind, rows: payments });
            }
        } catch (reportError) {
            console.error('Unable to generate report:', reportError);
            setError('Unable to generate this report. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const reportTitle = {
        platform: 'Platform analytics',
        users: 'User activity',
        moderation: 'Moderation reports',
        payments: 'Payments and revenue',
    }[reportKind];

    const renderGeneratedReport = () => {
        if (!generatedReport) return null;
        if (generatedReport.kind === 'platform') {
            const analytics = generatedReport.analytics as AnalyticsData;
            return <>
                <div className="grid gap-3 sm:grid-cols-4">{analytics.cards.map((card) => <div key={card.title} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-bold text-slate-500">{card.title}</p><p className="mt-1 text-2xl font-black text-slate-900">{card.value}</p><p className="text-xs font-bold text-brand-orange">{card.change} vs previous period</p></div>)}</div>
                <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-4"><h4 className="font-black text-slate-800">User growth</h4><div className="mt-3 space-y-2">{analytics.growth.map((item) => <div key={item.label} className="flex justify-between border-b border-slate-100 py-1 text-sm"><span>{item.label}</span><strong>{item.value}</strong></div>)}</div></div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4"><h4 className="font-black text-slate-800">Top locations</h4><div className="mt-3 space-y-2">{analytics.locations.length ? analytics.locations.map((location) => <div key={location.city} className="flex justify-between border-b border-slate-100 py-1 text-sm"><span>{location.city}</span><strong>{location.users}</strong></div>) : <p className="text-sm text-slate-500">No location data for this range.</p>}</div></div>
                </div>
            </>;
        }
        const rows = generatedReport.rows as any[];
        if (generatedReport.kind === 'users') {
            return <ReportTable title="Users created in range" headers={['#', 'Name', 'Email', 'Location', 'Status']} rows={rows.map((user, index) => [index + 1, user.name || 'Unnamed user', user.email || '—', user.location || user.country || '—', user.isBlocked ? 'Blocked' : 'Active'])} />;
        }
        if (generatedReport.kind === 'moderation') {
            return <ReportTable title="Reports created in range" headers={['#', 'Reported user', 'Reason', 'Status', 'Description']} rows={rows.map((report, index) => [index + 1, report.reportedUserName || 'Unknown', report.reason || 'General', report.status || 'pending', report.description || '—'])} />;
        }
        const total = rows.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
        return <>
            <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-bold text-slate-500">Total in range</p><p className="mt-1 text-2xl font-black text-slate-900">₵{total.toFixed(2)}</p><p className="text-xs text-slate-500">{rows.length} transactions</p></div>
            <ReportTable title="Payments in range" headers={['#', 'Reference', 'User', 'Amount', 'Status']} rows={rows.map((payment, index) => [index + 1, payment.reference || payment.id || '—', payment.userName || 'Anonymous', `₵${(Number(payment.amount) || 0).toFixed(2)}`, payment.status || '—'])} />
        </>;
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-black text-slate-900">Reports</h2>
                <p className="mt-1 text-sm text-slate-500">Choose a suggested report or generate a custom report for any date range.</p>
            </div>
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <label className="block text-sm font-black text-slate-700" htmlFor="admin-report-type">Report type</label>
                <p className="mt-1 text-xs text-slate-500">Choose a suggested report, then select the date range below.</p>
                <div className="relative mt-3 w-full max-w-xl">
                    <select id="admin-report-type" value={reportKind} onChange={(event) => { setReportKind(event.target.value as ReportKind); setGeneratedReport(null); }} className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 pr-10 text-sm font-black text-slate-800 focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/20">
                        <option value="platform">Platform analytics</option>
                        <option value="users">User activity</option>
                        <option value="moderation">Moderation report</option>
                        <option value="payments">Payments and revenue</option>
                    </select>
                    <ChevronDown size={21} strokeWidth={3} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-800" />
                </div>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-end gap-3">
                    <label className="text-xs font-black text-slate-600">From<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-700" /></label>
                    <label className="text-xs font-black text-slate-600">To<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-700" /></label>
                    <button type="button" onClick={() => void generateReport()} disabled={loading} className="flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2 text-sm font-black text-white disabled:opacity-50">{loading ? 'Generating…' : 'Generate report'}</button>
                    {generatedReport && <button type="button" onClick={() => window.print()} className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-black text-white"><Printer size={16} /> Print report</button>}
                </div>
                {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</p>}
            </section>
            {generatedReport && <section className="space-y-4" id="generated-admin-report"><div className="flex flex-wrap items-end justify-between gap-2"><div><h3 className="text-xl font-black text-slate-900">{reportTitle}</h3><p className="text-sm text-slate-500">{startDate} — {endDate}</p></div><span className="text-xs font-bold uppercase tracking-wide text-slate-400">Generated report</span></div>{renderGeneratedReport()}</section>}
        </div>
    );
};

const ReportTable = ({ title, headers, rows }: { title: string; headers: string[]; rows: Array<Array<string | number>> }) => (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3"><h4 className="font-black text-slate-800">{title}</h4><p className="text-xs text-slate-500">{rows.length} records</p></div>
        <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-900 text-xs font-black uppercase text-white"><tr>{headers.map((header) => <th key={header} className="px-3 py-2">{header}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, rowIndex) => <tr key={rowIndex} className="border-t border-slate-100"><>{row.map((cell, cellIndex) => <td key={cellIndex} className="max-w-[22rem] truncate px-3 py-2 text-slate-700">{cell}</td>)}</></tr>) : <tr><td colSpan={headers.length} className="px-3 py-8 text-center text-slate-500">No records found for this date range.</td></tr>}</tbody></table></div>
    </div>
);

const Overview = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeMatches: 0,
    totalRevenue: 0,
    pendingReports: 0
  });
  const [dashboardUsers, setDashboardUsers] = useState<any[]>([]);
  const [dashboardReports, setDashboardReports] = useState<any[]>([]);

  useEffect(() => {
    const loadDashboard = async () => {
      const [summary, users, reports] = await Promise.all([
        getDashboardStats(),
        getAdminUsers(),
        getAdminReports(),
      ]);
      setStats(summary);
      setDashboardUsers(users);
      setDashboardReports(reports);
    };
    void loadDashboard();
  }, []);

  const activeUsers = dashboardUsers.filter((user) => !user.isBlocked).length;
  const blockedUsers = dashboardUsers.filter((user) => user.isBlocked).length;
  const verifiedUsers = dashboardUsers.filter((user) => user.isVerified).length;
  const premiumUsers = dashboardUsers.filter((user) => user.isPremium).length;
  const recentUsers = [...dashboardUsers].slice(-5).reverse();
  const recentReports = [...dashboardReports].slice(-5).reverse();
  const signupTrend = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    return {
      label: date.toLocaleDateString(undefined, { weekday: 'short' }),
      count: dashboardUsers.filter((user) => {
        const created = reportDateValue(user.createdAt);
        return created && created >= date && created < nextDate;
      }).length,
    };
  });
  const maxSignups = Math.max(...signupTrend.map((item) => item.count), 1);
  const reportStatus = {
    pending: dashboardReports.filter((report) => (report.status || 'pending') === 'pending').length,
    resolved: dashboardReports.filter((report) => report.status === 'resolved').length,
  };
  const maxReportStatus = Math.max(reportStatus.pending, reportStatus.resolved, 1);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <StatCard title="Total Users" value={stats.totalUsers.toLocaleString()} change="Live" icon={<Users className="text-blue-500" size={18} />} />
        <StatCard title="Active Users" value={activeUsers.toLocaleString()} change="Live" icon={<Activity className="text-green-500" size={18} />} />
        <StatCard title="Verified Users" value={verifiedUsers.toLocaleString()} change="Trust" icon={<CheckCircle className="text-indigo-500" size={18} />} />
        <StatCard title="Pending Reports" value={stats.pendingReports.toLocaleString()} change="Review" isNegative icon={<Shield className="text-red-500" size={18} />} />
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2"><p className="text-[11px] font-bold text-slate-500">Active matches</p><p className="text-lg font-black text-slate-900">{stats.activeMatches.toLocaleString()}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2"><p className="text-[11px] font-bold text-slate-500">Premium users</p><p className="text-lg font-black text-slate-900">{premiumUsers.toLocaleString()}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2"><p className="text-[11px] font-bold text-slate-500">Blocked users</p><p className="text-lg font-black text-slate-900">{blockedUsers.toLocaleString()}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2"><p className="text-[11px] font-bold text-slate-500">Revenue</p><p className="text-lg font-black text-slate-900">₵{stats.totalRevenue.toLocaleString()}</p></div>
      </div>

      <details className="rounded-xl border border-slate-200 bg-white p-3">
        <summary className="cursor-pointer list-none text-sm font-black text-slate-800">Detailed insights and activity</summary>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="font-black text-slate-800">User status</h3>
          <div className="mt-3 space-y-2 text-xs">
            {[['Active', activeUsers, 'bg-green-500'], ['Blocked', blockedUsers, 'bg-red-500'], ['Verified', verifiedUsers, 'bg-blue-500'], ['Premium', premiumUsers, 'bg-orange-500']].map(([label, value, color]) => <div key={String(label)}><div className="mb-1 flex justify-between font-bold text-slate-500"><span>{label}</span><span>{String(value)}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${color}`} style={{ width: `${dashboardUsers.length ? (Number(value) / dashboardUsers.length) * 100 : 0}%` }} /></div></div>)}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="font-black text-slate-800">Moderation queue</h3>
          <div className="mt-3 space-y-2 text-xs">
            {[['Pending', reportStatus.pending, 'bg-orange-500'], ['Resolved', reportStatus.resolved, 'bg-green-500']].map(([label, value, color]) => <div key={String(label)}><div className="mb-1 flex justify-between font-bold text-slate-500"><span>{label}</span><span>{String(value)}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${color}`} style={{ width: `${(Number(value) / maxReportStatus) * 100}%` }} /></div></div>)}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="font-black text-slate-800">New users · 7 days</h3>
          <div className="mt-3 flex h-20 items-end gap-2">
            {signupTrend.map((item) => <div key={item.label} className="flex flex-1 flex-col items-center gap-1"><div className="w-full rounded-t bg-brand-orange/80" style={{ height: `${Math.max((item.count / maxSignups) * 100, item.count ? 12 : 3)}%` }} title={`${item.count} new users`} /><span className="text-[9px] font-bold text-slate-400">{item.label}</span></div>)}
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between"><h3 className="font-black text-slate-800">Recent users</h3><span className="text-xs font-bold text-slate-400">{dashboardUsers.length} total</span></div>
          <div className="divide-y divide-slate-100">{recentUsers.length ? recentUsers.map((user, index) => <div key={`${user.id}-${index}`} className="flex items-center justify-between gap-2 py-2 text-xs"><span className="truncate font-black text-slate-800">{user.name || user.email || 'Unnamed user'}</span><span className="shrink-0 text-slate-500">{user.isBlocked ? 'Blocked' : 'Active'}</span></div>) : <p className="py-4 text-sm text-slate-500">No users found.</p>}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between"><h3 className="font-black text-slate-800">Moderation queue</h3><span className="text-xs font-bold text-slate-400">{stats.pendingReports} pending</span></div>
          <div className="divide-y divide-slate-100">{recentReports.length ? recentReports.map((report, index) => <div key={`${report.id}-${index}`} className="flex items-center justify-between gap-2 py-2 text-xs"><span className="truncate font-black text-slate-800">{report.reason || 'General report'}</span><span className="shrink-0 rounded px-2 py-0.5 font-bold text-orange-700 bg-orange-50">{report.status || 'pending'}</span></div>) : <p className="py-4 text-sm text-slate-500">No reports found.</p>}</div>
        </div>
      </div>
      </details>
    </div>
  );
};

const UsersView = () => {
    const { confirmAdminAction } = useAdminActionConfirmation();
    // Real Data
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUsers = async () => {
            const data = await getAdminUsers();
            // Map Firestore data to UI format if needed
            const formattedUsers = data.map(user => ({
                ...user,
                id: user.id,
                firestoreDocId: user.firestoreDocId,
                email: user.email || 'No Email',
                phone: user.phone || 'N/A',
                role: user.isPremium ? 'Subscriber' : 'User',
                status: user.isBlocked ? 'Blocked' : 'Active', // Updated to use isBlocked flag
                joined: user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : 'N/A',
                verified: user.isVerified,
                location: user.location || user.country || 'N/A',
                bio: user.bio || '',
                denomination: user.denomination || 'N/A',
                profileCompletion: 50 // Placeholder logic for completion
            }));
            setUsers(formattedUsers);
            setLoading(false);
        };
        fetchUsers();
    }, []);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
    const [selectedUser, setSelectedUser] = useState<any>(null); // State for the details modal
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [userColumnWidths, setUserColumnWidths] = useState({ number: 72, user: 220, email: 200, firestoreId: 180, telephone: 140, role: 120, status: 120, joined: 140, actions: 84 });

    const resizeUserColumn = (column: keyof typeof userColumnWidths, event: React.MouseEvent<HTMLSpanElement>) => {
        event.preventDefault();
        const startX = event.clientX;
        const startWidth = userColumnWidths[column];
        const handleMove = (moveEvent: MouseEvent) => {
            const nextWidth = Math.max(80, startWidth + moveEvent.clientX - startX);
            setUserColumnWidths((current) => ({ ...current, [column]: nextWidth }));
        };
        const handleUp = () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
        };
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
    };
    
    // Filter & Add User State
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const [filterStatus, setFilterStatus] = useState<'All' | 'Active' | 'Blocked'>('All');
    const [filterRole, setFilterRole] = useState<'All' | 'User' | 'Subscriber'>('All');
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [isSavingUser, setIsSavingUser] = useState(false);
    const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'User', phone: '', status: 'Active' });
    const [manageGroupsOpen, setManageGroupsOpen] = useState(false);
    const [manageGroups, setManageGroups] = useState<any[]>([]);
    const [userGroupAssignments, setUserGroupAssignments] = useState<Record<string, string[]>>({});
    const [manageGroupsBusy, setManageGroupsBusy] = useState(false);
    const [groupMembershipEditing, setGroupMembershipEditing] = useState(false);

    const toggleMenu = (e: React.MouseEvent, id: string) => {
        e.stopPropagation(); // Prevent row click
        setOpenMenuId(openMenuId === id ? null : id);
    };

    const handleBlock = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const user = users.find(u => u.id === id);
        if (!user) return;

        const newStatus = user.status === 'Blocked' ? 'Active' : 'Blocked';
        const isBlocked = newStatus === 'Blocked';
        const confirmed = await confirmAdminAction({ title: `${isBlocked ? 'Disable / lock' : 'Unlock'} user?`, description: `Confirm this account action for ${user.name}.` });
        if (!confirmed) return;

        // Optimistic update
        setUsers(users.map(u => {
            if (u.id === id) {
                return { ...u, status: newStatus };
            }
            return u;
        }));
        setOpenMenuId(null);

        const success = await toggleBlockUser(id, isBlocked);
        if (!success) {
            // Revert if failed
            alert("Failed to update user status");
             setUsers(users.map(u => {
                if (u.id === id) {
                    return { ...u, status: user.status };
                }
                return u;
            }));
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const confirmed = await confirmAdminAction({ title: 'Delete user?', description: `Permanently delete ${users.find((user) => user.id === id)?.name || 'this user'} and their account data.` });
        if (confirmed) {
             // Optimistic update
            const prevUsers = [...users];
            setUsers(users.filter(user => user.id !== id));
            if (selectedUser?.id === id) setSelectedUser(null);
            setOpenMenuId(null);

            const success = await deleteUser(id);
             if (!success) {
                alert("Failed to delete user");
                setUsers(prevUsers);
            }
        }
    };

    const handleAddUser = async () => {
        if (!newUser.name || !newUser.email || !newUser.password) {
            alert("Name, Email, and Password are required!");
            return;
        }
        if (newUser.password.length < 6) {
            alert("Password must be at least 6 characters.");
            return;
        }

        const confirmed = await confirmAdminAction({ title: 'Create user?', description: `Create the new user account for ${newUser.name}.` });
        if (!confirmed) return;
        setIsSavingUser(true);
        const result = await adminCreateUser(newUser);
        setIsSavingUser(false);

        if (result.success) {
            const userToAdd = {
                id: result.userId || String(Date.now()),
                ...newUser,
                joined: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                verified: false,
                location: "N/A",
                bio: "New user.",
                denomination: "N/A",
                profileCompletion: 0
            };
            // @ts-ignore
            setUsers([userToAdd, ...users]); // Add to the top
            setIsAddUserModalOpen(false);
            setNewUser({ name: '', email: '', password: '', role: 'User', phone: '', status: 'Active' });
            alert("User created successfully! A verification email has been sent.");
        } else {
            alert(`Error: ${result.message}`);
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'All' || user.status === filterStatus;
        const matchesRole = filterRole === 'All' || user.role === filterRole;
        return matchesSearch && matchesStatus && matchesRole;
    });

    const duplicateEmailRows = Object.values(users.reduce<Record<string, number>>((counts, user) => {
        const email = String(user.email || '').trim().toLowerCase();
        if (email) counts[email] = (counts[email] || 0) + 1;
        return counts;
    }, {})).filter((count) => count > 1).reduce((total, count) => total + count, 0);

    const selectedUsersForActions = users.filter((user) => selectedUserIds.has(user.id));
    const allSelectedUsersActive = selectedUsersForActions.length > 0 && selectedUsersForActions.every((user) => user.status === 'Active');
    const allSelectedUsersBlocked = selectedUsersForActions.length > 0 && selectedUsersForActions.every((user) => user.status === 'Blocked');

    const toggleUserSelection = (event: React.ChangeEvent<HTMLInputElement>, userId: string) => {
        event.stopPropagation();
        setSelectedUserIds((current) => {
            const next = new Set(current);
            if (event.target.checked) next.add(userId);
            else next.delete(userId);
            return next;
        });
    };

    const toggleAllUserSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedUserIds((current) => {
            const next = new Set(current);
            filteredUsers.forEach((user) => event.target.checked ? next.add(user.id) : next.delete(user.id));
            return next;
        });
    };

    const handleBulkBlock = async (blocked: boolean) => {
        const confirmed = await confirmAdminAction({ title: blocked ? 'Disable / lock selected users?' : 'Unlock selected users?', description: `Confirm this account action for ${selectedUserIds.size} selected user${selectedUserIds.size === 1 ? '' : 's'}.` });
        if (!confirmed) return;
        const ids = [...selectedUserIds];
        await Promise.all(ids.map((id) => toggleBlockUser(id, blocked)));
        setUsers((current) => current.map((user) => ids.includes(user.id) ? { ...user, status: blocked ? 'Blocked' : 'Active' } : user));
    };

    const handlePasswordReset = async (userIds: string[]) => {
        const confirmed = await confirmAdminAction({ title: 'Reset selected passwords?', description: `Send password reset emails for ${userIds.length} selected user${userIds.length === 1 ? '' : 's'}.` });
        if (!confirmed) return;
        const selected = users.filter((user) => userIds.includes(user.id) && user.email);
        await Promise.all(selected.map((user) => sendPasswordResetEmail(auth, user.email)));
        alert(`Password reset email sent for ${selected.length} user${selected.length === 1 ? '' : 's'}.`);
    };

    const handleBulkPasswordReset = async () => {
        await handlePasswordReset([...selectedUserIds]);
    };

    const handleBulkDeleteUsers = async () => {
        const ids = [...selectedUserIds];
        const confirmed = await confirmAdminAction({ title: 'Delete selected users?', description: `Permanently delete ${ids.length} selected user${ids.length === 1 ? '' : 's'} and their account data.` });
        if (!confirmed) return;
        const results = await Promise.all(ids.map(async (id) => ({ id, success: await deleteUser(id) })));
        const deletedIds = results.filter((result) => result.success).map((result) => result.id);
        setUsers((current) => current.filter((user) => !deletedIds.includes(user.id)));
        setSelectedUserIds((current) => new Set([...current].filter((id) => !deletedIds.includes(id))));
    };

    const openManageGroups = async (userIds: string[] = [...selectedUserIds]) => {
        if (!userIds.length) return;
        setSelectedUserIds(new Set(userIds));
        setGroupMembershipEditing(false);
        setManageGroupsBusy(true);
        try {
            const access = await listAdminAccessControl();
            setManageGroups(access.groups);
            const assignments: Record<string, string[]> = {};
            userIds.forEach((userId) => {
                assignments[userId] = access.users.find((item) => item.userId === userId)?.groupIds || [];
            });
            setUserGroupAssignments(assignments);
            setManageGroupsOpen(true);
        } catch (error) {
            alert('Unable to load group assignments.');
        } finally {
            setManageGroupsBusy(false);
        }
    };

    const toggleSelectedUsersGroup = (groupId: string, checked: boolean) => {
        setUserGroupAssignments((current) => {
            const next: Record<string, string[]> = {};
            Object.entries(current).forEach(([userId, groupIds]) => {
                next[userId] = checked
                    ? [...new Set([...groupIds, groupId])]
                    : groupIds.filter((id) => id !== groupId);
            });
            return next;
        });
    };

    const saveSelectedUserGroups = async () => {
        const confirmed = await confirmAdminAction({ title: 'Update group membership?', description: `Apply group membership changes to ${Object.keys(userGroupAssignments).length} selected user${Object.keys(userGroupAssignments).length === 1 ? '' : 's'}.` });
        if (!confirmed) return;
        setManageGroupsBusy(true);
        try {
            await Promise.all(Object.entries(userGroupAssignments).map(([userId, groupIds]) => assignAdminUserGroups(userId, groupIds)));
            setManageGroupsOpen(false);
            alert('Group assignments updated.');
        } catch (error) {
            alert('Unable to update group assignments.');
        } finally {
            setManageGroupsBusy(false);
        }
    };

    const handleExport = () => {
        const headers = ["Name", "Email", "Phone", "Role", "Status", "Joined", "Location", "Bio", "Denomination"];
        const csvContent = [
            headers.join(","),
            ...filteredUsers.map((u: any) => [
                `"${(u.name || '').replace(/"/g, '""')}"`,
                `"${(u.email || '').replace(/"/g, '""')}"`,
                `"${(u.phone || '').replace(/"/g, '""')}"`,
                `"${u.role}"`,
                `"${u.status}"`,
                `"${u.joined}"`,
                `"${(u.location || '').replace(/"/g, '""')}"`,
                `"${(u.bio || '').replace(/"/g, '""')}"`,
                `"${(u.denomination || '').replace(/"/g, '""')}"`
            ].join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "users_export.csv");
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search users..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
                    />
                </div>
                <div className="flex gap-2 relative">
                    <button 
                        onClick={() => setShowFilterMenu(!showFilterMenu)}
                        className={`px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2 ${showFilterMenu ? 'bg-gray-50 ring-2 ring-brand-orange/20' : ''}`}
                    >
                        Filter
                    </button>
                    {showFilterMenu && (
                        <div className="absolute top-12 right-0 w-64 bg-white rounded-xl shadow-xl border border-gray-100 z-50 p-4 animate-in fade-in zoom-in-95 duration-200">
                            <h4 className="font-semibold text-gray-900 mb-3 text-sm">Filter Users</h4>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-medium text-gray-500 mb-1 block">Status</label>
                                    <div className="flex bg-gray-100 p-1 rounded-lg">
                                        {['All', 'Active', 'Blocked'].map(status => (
                                            <button 
                                                key={status}
                                                onClick={() => setFilterStatus(status as any)}
                                                className={`flex-1 py-1 text-xs font-medium rounded-md transition-all ${filterStatus === status ? 'bg-white shadow-sm text-brand-orange' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                {status}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="text-xs font-medium text-gray-500 mb-1 block">Role</label>
                                    <select 
                                        value={filterRole}
                                        onChange={(e) => setFilterRole(e.target.value as any)}
                                        className="w-full text-sm border border-gray-200 rounded-lg p-2 focus:outline-none focus:border-brand-orange"
                                    >
                                        <option value="All">All Roles</option>
                                        <option value="User">User</option>
                                        <option value="Subscriber">Subscriber</option>
                                    </select>
                                </div>

                                <button 
                                    onClick={() => {
                                        setFilterStatus('All');
                                        setFilterRole('All');
                                    }}
                                    className="w-full py-2 text-sm text-gray-500 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors"
                                >
                                    Reset Filters
                                </button>
                            </div>
                        </div>
                    )}
                    
                    <button 
                        onClick={() => setIsAddUserModalOpen(true)}
                        className="px-4 py-2 bg-brand-orange text-white rounded-lg text-sm hover:bg-brand-orange/90 shadow-sm shadow-brand-orange/20"
                    >
                        Add User
                    </button>
                    <button 
                        onClick={handleExport}
                        className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm hover:bg-slate-800 shadow-sm flex items-center gap-2"
                    >
                        Export CSV
                    </button>
                </div>
            </div>

            {duplicateEmailRows > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    <strong>{duplicateEmailRows} duplicate-email profile rows detected.</strong> Review each Firestore document ID before deleting anything; these rows are not automatically linked to Authentication accounts.
                </div>
            )}
            {selectedUserIds.size > 0 && (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm">
                    <strong>{selectedUserIds.size} selected</strong>
                    <button type="button" onClick={() => void openManageGroups()} disabled={manageGroupsBusy} className="rounded-lg bg-brand-orange px-3 py-1.5 text-xs font-black text-white disabled:opacity-50">{manageGroupsBusy ? 'Loading…' : selectedUserIds.size === 1 ? 'Manage user' : 'Manage users'}</button>
                    <button type="button" onClick={() => setSelectedUserIds(new Set())} className="ml-auto rounded-lg px-3 py-1.5 text-xs font-black text-slate-500">Clear</button>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-0">
                <div className="overflow-x-auto">
                    <table className="cmg-admin-compact-table min-w-[1076px] w-full table-fixed border-collapse text-left">
                        <colgroup>
                            <col style={{ width: userColumnWidths.number }} />
                            <col style={{ width: userColumnWidths.user }} />
                            <col style={{ width: userColumnWidths.email }} />
                            <col style={{ width: userColumnWidths.telephone }} />
                            <col style={{ width: userColumnWidths.role }} />
                            <col style={{ width: userColumnWidths.status }} />
                            <col style={{ width: userColumnWidths.joined }} />
                            <col style={{ width: userColumnWidths.actions }} />
                        </colgroup>
                    <thead className="bg-slate-900 border-b border-brand-orange text-white">
                        <tr>
                            <th style={{ width: userColumnWidths.number }} className="relative whitespace-nowrap px-3 py-2 text-center text-[10px] font-black uppercase tracking-wide text-white border-r-2 border-brand-orange"><input type="checkbox" aria-label="Select all users" checked={filteredUsers.length > 0 && filteredUsers.every((user) => selectedUserIds.has(user.id))} onChange={toggleAllUserSelection} onClick={(event) => event.stopPropagation()} className="mr-1 h-3.5 w-3.5 accent-orange-500" />#<span onMouseDown={(event) => resizeUserColumn('number', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                            <th style={{ width: userColumnWidths.user }} className="relative px-3 py-2 text-[10px] font-black uppercase tracking-wide text-white border-r-2 border-brand-orange">User<span onMouseDown={(event) => resizeUserColumn('user', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                            <th style={{ width: userColumnWidths.email }} className="relative px-3 py-2 text-[10px] font-black uppercase tracking-wide text-white border-r-2 border-brand-orange">Email<span onMouseDown={(event) => resizeUserColumn('email', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                            <th style={{ width: userColumnWidths.telephone }} className="relative px-3 py-2 text-[10px] font-black uppercase tracking-wide text-white border-r-2 border-brand-orange">Telephone<span onMouseDown={(event) => resizeUserColumn('telephone', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                            <th style={{ width: userColumnWidths.role }} className="relative px-3 py-2 text-[10px] font-black uppercase tracking-wide text-white border-r-2 border-brand-orange">Role<span onMouseDown={(event) => resizeUserColumn('role', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                            <th style={{ width: userColumnWidths.status }} className="relative px-3 py-2 text-[10px] font-black uppercase tracking-wide text-white border-r-2 border-brand-orange">Status<span onMouseDown={(event) => resizeUserColumn('status', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                            <th style={{ width: userColumnWidths.joined }} className="relative px-3 py-2 text-[10px] font-black uppercase tracking-wide text-white border-r-2 border-brand-orange">Joined<span onMouseDown={(event) => resizeUserColumn('joined', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                            <th style={{ width: userColumnWidths.actions }} className="px-3 py-2 text-right text-[10px] font-black uppercase tracking-wide text-white">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {filteredUsers.map((user, userIndex) => (
                            <tr 
                                key={user.id} 
                                onClick={() => setSelectedUser(user)}
                                className="h-9 border-b border-slate-200 text-xs hover:bg-slate-50 transition-colors group cursor-pointer"
                            >
                                <td className="whitespace-nowrap px-3 py-1.5 text-center text-xs font-black text-slate-400"><input type="checkbox" aria-label={`Select ${user.name}`} checked={selectedUserIds.has(user.id)} onChange={(event) => toggleUserSelection(event, user.id)} onClick={(event) => event.stopPropagation()} className="mr-1 h-3.5 w-3.5 accent-orange-500" /><span className="inline-block truncate align-middle" style={{ maxWidth: 'calc(100% - 1.5rem)' }} title={String(userIndex + 1)}>{userIndex + 1}</span></td>
                                <td className="px-3 py-1.5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-[9px] font-black">
                                            {user.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="text-xs font-black text-slate-900 flex items-center gap-1">
                                                {user.name}
                                                {user.verified && <CheckCircle size={14} className="text-blue-500" fill="currentColor" color="white" />}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-3 py-1.5 text-xs text-slate-600">{user.email}</td>
                                <td className="px-3 py-1.5 text-xs text-slate-600">{user.phone || 'N/A'}</td>
                                <td className="px-3 py-1.5 text-xs text-slate-600">{user.role}</td>
                                <td className="px-3 py-1.5">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black ${
                                        user.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                        {user.status}
                                    </span>
                                </td>
                                <td className="px-3 py-1.5 text-xs text-slate-500">{user.joined}</td>
                                <td className="px-3 py-1.5 text-right relative">
                                    <button 
                                        onClick={(e) => toggleMenu(e, user.id)}
                                        className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
                                    >
                                        <MoreHorizontal size={18} />
                                    </button>
                                    
                                    {openMenuId === user.id && (
                                        <div className="absolute right-8 top-10 w-48 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); void openManageGroups([user.id]); }}
                                                className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                            >
                                                <Users size={16} />
                                                Manage user
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); void handleBlock(e, user.id); }}
                                                className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 border-t border-gray-100"
                                            >
                                                <Shield size={16} />
                                                {user.status === 'Blocked' ? 'Enable user' : 'Disable user'}
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); void handlePasswordReset([user.id]); }}
                                                className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 border-t border-gray-100"
                                            >
                                                <KeyRound size={16} />
                                                Reset password
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); void openManageGroups([user.id]); }}
                                                className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-t border-gray-100"
                                            >
                                                <Users size={16} />
                                                Add to group
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); void openManageGroups([user.id]); }}
                                                className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-t border-gray-100"
                                            >
                                                <Users size={16} />
                                                Remove from group
                                            </button>
                                            <button 
                                                onClick={(e) => handleDelete(e, user.id)}
                                                className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-gray-100"
                                            >
                                                <Trash2 size={16} />
                                                Delete User
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
            </div>
            

             {/* Filter Menu Overlay */}
            {showFilterMenu && (
                <div 
                    className="fixed inset-0 z-40 bg-transparent" 
                    onClick={() => setShowFilterMenu(false)}
                />
            )}

            {manageGroupsOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-sm max-h-[85dvh] overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-xl font-black text-slate-900">{selectedUserIds.size === 1 ? 'Manage user' : 'Manage users'}</h2>
                                <p className="mt-1 text-sm text-slate-500">Manage account actions and group membership for {selectedUserIds.size} selected user{selectedUserIds.size === 1 ? '' : 's'}.</p>
                            </div>
                            <button type="button" onClick={() => setManageGroupsOpen(false)} className="text-2xl font-black text-slate-400">×</button>
                        </div>
                        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Managing</p>
                            <div className="mt-2 space-y-1">
                                {users.filter((user) => selectedUserIds.has(user.id)).map((user) => <p key={user.id} className="truncate text-sm font-black text-slate-800">{user.name} <span className="font-normal text-slate-500">— {user.email}</span></p>)}
                            </div>
                        </div>
                        <div className="mt-4">
                            <h3 className="text-xs font-black uppercase tracking-wide text-slate-500">Account actions</h3>
                            <div className="mt-2 grid grid-cols-2 gap-2">
                                <button type="button" onClick={() => void handleBulkBlock(false)} disabled={allSelectedUsersActive || manageGroupsBusy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-700 shadow-sm transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-200 disabled:text-slate-400"><Power size={15} />Unlock {selectedUserIds.size === 1 ? 'user' : 'users'}</button>
                                <button type="button" onClick={() => void handleBulkBlock(!allSelectedUsersBlocked)} disabled={manageGroupsBusy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-black uppercase tracking-wide text-amber-800 shadow-sm transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-200 disabled:text-slate-400"><Power size={15} />{allSelectedUsersBlocked ? 'Enable' : 'Disable / lock'} {selectedUserIds.size === 1 ? 'user' : 'users'}</button>
                                <button type="button" onClick={() => void handleBulkPasswordReset()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-black uppercase tracking-wide text-blue-800 shadow-sm transition hover:bg-blue-100"><KeyRound size={15} />Reset password</button>
                                <button type="button" onClick={() => void handleBulkDeleteUsers()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-xs font-black uppercase tracking-wide text-red-700 shadow-sm transition hover:bg-red-100"><Trash2 size={15} />Delete {selectedUserIds.size === 1 ? 'user' : 'users'}</button>
                            </div>
                        </div>
                        <div className="mt-5 flex items-center justify-between gap-3">
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-wide text-slate-500">Group membership</h3>
                                <p className="mt-1 text-xs text-slate-500">{groupMembershipEditing ? 'Check a group to add the selected user(s); uncheck it to remove them.' : 'Group membership is locked until you activate editing.'}</p>
                            </div>
                            <button type="button" onClick={() => setGroupMembershipEditing(true)} disabled={groupMembershipEditing || manageGroupsBusy} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand-orange px-3 py-2 text-xs font-black uppercase tracking-wide text-white shadow-sm transition hover:bg-brand-orange/90 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"><Users size={15} />Add user(s) to group</button>
                        </div>
                        <div className={`mt-2 space-y-2 rounded-xl p-2 transition-colors ${groupMembershipEditing ? 'bg-orange-50/60' : 'bg-slate-100/80'}`}>
                            {manageGroups.map((group) => {
                                const checked = selectedUserIds.size > 0 && [...selectedUserIds].every((userId) => (userGroupAssignments[userId] || []).includes(group.id));
                                return <label key={group.id} className={`flex min-w-0 items-center gap-3 rounded-xl border px-3 py-3 text-sm font-bold transition-colors ${groupMembershipEditing ? 'border-orange-200 bg-white text-slate-700' : 'border-slate-200 bg-slate-200 text-slate-400'}`}>
                                    <input type="checkbox" checked={checked} disabled={!groupMembershipEditing || manageGroupsBusy} onChange={(event) => toggleSelectedUsersGroup(group.id, event.target.checked)} className="h-5 w-5 shrink-0 accent-orange-500 disabled:cursor-not-allowed disabled:grayscale" />
                                    <span className="truncate">{group.name}</span>
                                    <span className="ml-auto max-w-[42%] truncate text-right text-xs font-normal text-slate-400">{group.description}</span>
                                </label>;
                            })}
                        </div>
                        <div className="mt-6 flex gap-3">
                            <button type="button" onClick={() => setManageGroupsOpen(false)} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700">Cancel</button>
                            <button type="button" onClick={() => void saveSelectedUserGroups()} disabled={!groupMembershipEditing || manageGroupsBusy} className="flex-1 rounded-xl bg-brand-orange px-4 py-3 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500">{manageGroupsBusy ? 'Saving…' : 'Save groups'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add User Modal */}
            {isAddUserModalOpen && (
                <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">Add New User</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                <input 
                                    type="text" 
                                    value={newUser.name}
                                    onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
                                    placeholder="e.g. John Doe"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                <input 
                                    type="email" 
                                    value={newUser.email}
                                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
                                    placeholder="e.g. john@example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                <input 
                                    type="password" 
                                    value={newUser.password}
                                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
                                    placeholder="Min 6 characters"
                                />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone (Optional)</label>
                                <input 
                                    type="tel" 
                                    value={newUser.phone}
                                    onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
                                    placeholder="+233..."
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                    <select 
                                        value={newUser.role}
                                        onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange bg-white"
                                    >
                                        <option value="User">User</option>
                                        <option value="Subscriber">Subscriber</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select 
                                        value={newUser.status}
                                        onChange={(e) => setNewUser({...newUser, status: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange bg-white"
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Blocked">Blocked</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-8">
                            <button 
                                onClick={() => setIsAddUserModalOpen(false)}
                                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleAddUser}
                                disabled={isSavingUser}
                                className="flex-1 px-4 py-2 bg-brand-orange text-white rounded-lg hover:bg-brand-orange/90 font-medium shadow-lg shadow-brand-orange/20 disabled:opacity-50"
                            >
                                {isSavingUser ? 'Saving...' : 'Save User'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Overlay to close menu when clicking outside */}
            {openMenuId !== null && (
                <div 
                    className="fixed inset-0 z-0 bg-transparent" 
                    onClick={() => setOpenMenuId(null)}
                />
            )}

            {/* User Details Modal */}
            {selectedUser && (
                <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="relative bg-slate-900 h-32">
                            <button 
                                onClick={() => setSelectedUser(null)}
                                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                            >
                                <XCircle size={24} />
                            </button>
                        </div>
                        
                        {/* Body */}
                        <div className="px-8 pb-8">
                            <div className="relative -mt-12 mb-6 flex justify-between items-end">
                                <div className="w-24 h-24 rounded-full border-4 border-white bg-gray-200 flex items-center justify-center text-3xl font-bold text-gray-500 shadow-md">
                                    {selectedUser.name.charAt(0)}
                                </div>
                                <div className="flex gap-3 mb-1">
                                    <button 
                                        onClick={() => window.location.href = `mailto:${selectedUser.email}?from=christianmatchghanaltd@gmail.com`}
                                        className="px-4 py-2 bg-white border border-gray-200 text-gray-700 font-medium rounded-lg text-sm hover:bg-gray-50 shadow-sm"
                                    >
                                        Message
                                    </button>
                                    <button 
                                        onClick={() => setIsEditingProfile(true)}
                                        className="px-4 py-2 bg-brand-orange text-white font-medium rounded-lg text-sm hover:bg-brand-orange/90 shadow-sm shadow-brand-orange/20"
                                    >
                                        Edit Profile
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 mb-1">
                                <h2 className="text-2xl font-bold text-gray-900">{selectedUser.name}</h2>
                                {selectedUser.verified && <CheckCircle size={20} className="text-blue-500" fill="currentColor" color="white" />}
                            </div>
                            <p className="text-sm text-gray-500 mb-6">{selectedUser.location} • Joined {selectedUser.joined}</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-gray-900 border-b border-gray-100 pb-2">Account Info</h3>
                                    <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                                        <span className="text-gray-500">Email:</span>
                                        <span className="text-gray-900 font-medium">{selectedUser.email}</span>
                                        
                                        <span className="text-gray-500">Phone:</span>
                                        <span className="text-gray-900 font-medium">{selectedUser.phone}</span>
                                        
                                        <span className="text-gray-500">Role:</span>
                                        <span className="text-gray-900 font-medium">{selectedUser.role}</span>
                                        
                                        <span className="text-gray-500">Status:</span>
                                        <span>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                selectedUser.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                                {selectedUser.status}
                                            </span>
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="font-semibold text-gray-900 border-b border-gray-100 pb-2">Profile Details</h3>
                                    <div className="space-y-3">
                                        <div>
                                            <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Bio</span>
                                            <p className="text-sm text-gray-700 mt-1 leading-relaxed bg-gray-50 p-2 rounded-lg">
                                                "{selectedUser.bio}"
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                                            <span className="text-gray-500">Denomination:</span>
                                            <span className="text-gray-900 font-medium">{selectedUser.denomination}</span>
                                            
                                            <span className="text-gray-500">Completion:</span>
                                            <span className="text-gray-900 font-medium">{selectedUser.profileCompletion}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Edit Profile Overlay */}
            {isEditingProfile && selectedUser && (
                <div className="fixed inset-0 z-[200] bg-white overflow-hidden flex flex-col">
                    <EditProfileView
                        user={selectedUser}
                        onCancel={() => setIsEditingProfile(false)}
                        onNotify={(msg) => alert(msg)}
                        onSave={async (updatedUser) => {
                            const confirmed = await confirmAdminAction({ title: 'Save user profile?', description: `Save profile changes for ${selectedUser.name}.` });
                            if (!confirmed) return;
                            try {
                                await updateUserDocument(selectedUser.id, updatedUser);
                                
                                // Update local state so UI reflects immediately
                                const updatedSelectedUser = { ...selectedUser, ...updatedUser };
                                setSelectedUser(updatedSelectedUser);
                                
                                setUsers(users.map(u => u.id === selectedUser.id ? updatedSelectedUser : u));
                                setIsEditingProfile(false);
                                alert("User profile updated successfully");
                            } catch (e) {
                                console.error(e);
                                alert("Failed to save changes");
                            }
                        }}
                    />
                </div>
            )}
            
        </div>
    );
};

const PrayersView = () => {
    // Real Data
    const [prayers, setPrayers] = useState<any[]>([]);
    
    useEffect(() => {
        const fetchPrayers = async () => {
             const data = await getAdminPrayers();
             const formattedPrayers = data.map(p => ({
                 id: p.id,
                 user: p.userName || 'Anonymous',
                 content: p.content,
                 likes: p.prayingCount || 0,
                 comments: p.commentCount || 0,
                 date: p.date, // Formatted in service
                 reported: p.reported || false
             }));
             setPrayers(formattedPrayers);
        };
        fetchPrayers();
    }, []);
    const [searchTerm, setSearchTerm] = useState('');
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const [filterStatus, setFilterStatus] = useState<'All' | 'Active' | 'Reported'>('All');

    const filteredPrayers = prayers.filter(p => {
        const matchesSearch = p.user.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              p.content.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'All' || 
                              (filterStatus === 'Reported' ? p.reported : !p.reported);
        return matchesSearch && matchesStatus;
    });

    const handleExport = () => {
        const headers = ["User", "Content", "Likes", "Comments", "Date", "Status"];
        const csvContent = [
            headers.join(","),
            ...filteredPrayers.map(p => [
                `"${p.user}"`,
                `"${p.content.replace(/"/g, '""')}"`,
                p.likes,
                p.comments,
                `"${p.date}"`,
                p.reported ? "Reported" : "Active"
            ].join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "prayer_requests.csv");
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search prayers..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
                    />
                </div>
                <div className="flex gap-2 relative">
                    <button 
                        onClick={() => setShowFilterMenu(!showFilterMenu)}
                        className={`px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2 ${showFilterMenu ? 'bg-gray-50 ring-2 ring-brand-orange/20' : ''}`}
                    >
                        Filter
                    </button>
                    {showFilterMenu && (
                        <div className="absolute top-12 right-0 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50 p-4 animate-in fade-in zoom-in-95 duration-200">
                            <h4 className="font-semibold text-gray-900 mb-3 text-sm">Filter Requests</h4>
                            <div className="space-y-2">
                                {['All', 'Active', 'Reported'].map(status => (
                                    <button 
                                        key={status}
                                        onClick={() => {
                                            setFilterStatus(status as any);
                                            setShowFilterMenu(false);
                                        }}
                                        className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                                            filterStatus === status 
                                            ? 'bg-brand-orange/10 text-brand-orange font-medium' 
                                            : 'text-gray-600 hover:bg-gray-50'
                                        }`}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    <button 
                        onClick={handleExport}
                        className="px-4 py-2 bg-brand-orange text-white rounded-lg text-sm hover:bg-brand-orange/90 flex items-center gap-2 shadow-sm shadow-brand-orange/20"
                    >
                        Export CSV
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-gray-600 text-sm">User</th>
                            <th className="px-6 py-4 font-semibold text-gray-600 text-sm">Content</th>
                            <th className="px-6 py-4 font-semibold text-gray-600 text-sm">Engagement</th>
                            <th className="px-6 py-4 font-semibold text-gray-600 text-sm">Status</th>
                            <th className="px-6 py-4 font-semibold text-gray-600 text-sm text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredPrayers.map((prayer) => (
                            <tr key={prayer.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-gray-900">{prayer.user}</div>
                                    <div className="text-xs text-gray-400">{prayer.date}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="text-gray-600 text-sm line-clamp-2 max-w-sm">{prayer.content}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                        <span className="flex items-center gap-1"><Heart size={14} /> {prayer.likes}</span>
                                        <span className="flex items-center gap-1"><MessageSquare size={14} /> {prayer.comments}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {prayer.reported ? (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                            Reported
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            Active
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="text-gray-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-full" title="Delete">
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {/* Filter Menu Overlay */}
            {showFilterMenu && (
                <div 
                    className="fixed inset-0 z-40 bg-transparent" 
                    onClick={() => setShowFilterMenu(false)}
                />
            )}
        </div>
    );
};

const ConnectionsView = () => {
    // Real Data
    const [connections, setConnections] = useState<any[]>([]);
    
    useEffect(() => {
        const fetchConnections = async () => {
             const data = await getAdminConnections();
             setConnections(data);
        };
        fetchConnections();
    }, []);

    const [searchTerm, setSearchTerm] = useState('');

    const filteredConnections = connections.filter(conn => 
        conn.userA.toLowerCase().includes(searchTerm.toLowerCase()) || 
        conn.userB.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800">Active Connections</h3>
                <div className="flex gap-2">
                     <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search users..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-gray-600 text-sm">Initiator</th>
                            <th className="px-6 py-4 font-semibold text-gray-600 text-sm">Recipient</th>
                            <th className="px-6 py-4 font-semibold text-gray-600 text-sm">Status</th>
                            <th className="px-6 py-4 font-semibold text-gray-600 text-sm">Connected On</th>
                            <th className="px-6 py-4 font-semibold text-gray-600 text-sm">Last Message</th>
                            <th className="px-6 py-4 font-semibold text-gray-600 text-sm text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredConnections.map((conn) => (
                            <tr key={conn.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 font-medium text-gray-900">{conn.userA}</td>
                                <td className="px-6 py-4 font-medium text-gray-900">{conn.userB}</td>
                                <td className="px-6 py-4">
                                     <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        conn.status === 'Matched' ? 'bg-green-100 text-green-800' :
                                        conn.status === 'Blocked' ? 'bg-red-100 text-red-800' : 
                                        'bg-yellow-100 text-yellow-800'
                                    }`}>
                                        {conn.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">{conn.date}</td>
                                <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-[200px]" title={conn.lastMessage}>{conn.lastMessage}</td>
                                <td className="px-6 py-4 text-right">
                                    <button className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full">
                                        <MoreHorizontal size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const PaymentsView = () => {
    // Real Data
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPayments = async () => {
            const data = await getAdminPayments();
            const formatted = data.map(t => ({
                id: t.reference || t.id.slice(0, 8),
                user: t.userName || 'Anonymous',
                amount: t.amount,
                type: t.type === 'connection_fee' ? 'Connection Fee' : 'Premium',
                date: t.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently',
                status: t.status === 'success' ? 'Success' : 'Failed'
            }));
            setTransactions(formatted);
            setLoading(false);
        };
        fetchPayments();
    }, []);

    const totalRevenue = transactions.reduce((sum, t) => t.status === 'Success' ? sum + t.amount : sum, 0);
    const successCount = transactions.filter(t => t.status === 'Success').length;
    const failedCount = transactions.filter(t => t.status === 'Failed').length;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500 font-medium mb-1">Total Revenue</p>
                    <h3 className="text-2xl font-bold text-gray-900">₵{totalRevenue.toFixed(2)}</h3>
                </div>
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500 font-medium mb-1">Successful Transactions</p>
                    <h3 className="text-2xl font-bold text-green-600">{successCount}</h3>
                </div>
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500 font-medium mb-1">Failed Transactions</p>
                    <h3 className="text-2xl font-bold text-red-600">{failedCount}</h3>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800">Recent Transactions</h3>
                    <button className="text-brand-orange text-sm font-semibold hover:underline">View All</button>
                </div>
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading transactions...</div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                             <tr>
                                <th className="px-6 py-4 font-semibold text-gray-600 text-sm">Ref ID</th>
                                <th className="px-6 py-4 font-semibold text-gray-600 text-sm">User</th>
                                <th className="px-6 py-4 font-semibold text-gray-600 text-sm">Service</th>
                                 <th className="px-6 py-4 font-semibold text-gray-600 text-sm">Date</th>
                                <th className="px-6 py-4 font-semibold text-gray-600 text-sm">Amount</th>
                                <th className="px-6 py-4 font-semibold text-gray-600 text-sm">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {transactions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 text-sm">
                                        No transactions yet.
                                    </td>
                                </tr>
                            ) : transactions.map((trx) => (
                                <tr key={trx.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-mono text-sm text-gray-500">{trx.id}</td>
                                    <td className="px-6 py-4 font-medium text-gray-900">{trx.user}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{trx.type}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{trx.date}</td>
                                    <td className="px-6 py-4 font-medium text-gray-900">₵{trx.amount.toFixed(2)}</td>
                                    <td className="px-6 py-4">
                                         <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            trx.status === 'Success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                            {trx.status}
                                        </span>
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

const ModerationView = () => {
    const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('all');
    const [reports, setReports] = useState<any[]>([]);

    useEffect(() => {
        const fetchReports = async () => {
            const data = await getAdminReports();
            const formattedReports = data.map(r => ({
                id: r.id,
                reporter: r.reporterName || 'System',
                reportedUser: r.reportedUserName || 'Unknown',
                type: r.reason || 'General',
                content: r.description || 'No details',
                date: r.createdAt ? new Date(r.createdAt.seconds * 1000).toLocaleDateString() : 'N/A',
                status: r.status || 'pending'
            }));
             setReports(formattedReports);
        };
        fetchReports();
    }, []);

    const handleResolve = (id: string) => {
        // Optimistic update
        setReports(reports.map(r => r.id === id ? { ...r, status: 'resolved' } : r));
        // TODO: Call service to update in DB
    };

    const handleDismiss = (id: string) => {
         if (window.confirm("Dismiss this report?")) {
            setReports(reports.filter(r => r.id !== id));
            // TODO: Call service to delete/archive in DB
        }
    };

    const handleBanUser = (id: string, user: string) => {
        if (window.confirm(`Are you sure you want to BAN user ${user}?`)) {
             setReports(reports.map(r => r.id === id ? { ...r, status: 'resolved' } : r));
             alert(`User ${user} has been banned.`);
             // TODO: Call service to block user in DB
        }
    };

    const filteredReports = reports.filter(r => {
        if (filter === 'all') return true;
        return r.status === filter;
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                 <div className="flex gap-2">
                    <button 
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'all' ? 'bg-slate-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                        All
                    </button>
                    <button 
                        onClick={() => setFilter('pending')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'pending' ? 'bg-orange-100 text-orange-800' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                        Pending
                    </button>
                     <button 
                        onClick={() => setFilter('resolved')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'resolved' ? 'bg-green-100 text-green-800' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                        Resolved
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-gray-600 text-sm">Reported User</th>
                            <th className="px-6 py-4 font-semibold text-gray-600 text-sm">Reason</th>
                            <th className="px-6 py-4 font-semibold text-gray-600 text-sm">Details</th>
                             <th className="px-6 py-4 font-semibold text-gray-600 text-sm">Date</th>
                            <th className="px-6 py-4 font-semibold text-gray-600 text-sm">Status</th>
                            <th className="px-6 py-4 font-semibold text-gray-600 text-sm text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredReports.map((report) => (
                            <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-gray-900">{report.reportedUser}</div>
                                    <div className="text-xs text-gray-500">Rep by: {report.reporter}</div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                    <span className="bg-red-50 text-red-700 px-2 py-1 rounded-md text-xs font-medium border border-red-100">{report.type}</span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate" title={report.content}>{report.content}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">{report.date}</td>
                                <td className="px-6 py-4">
                                     <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        report.status === 'resolved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                        {report.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {report.status === 'pending' && (
                                        <div className="flex items-center justify-end gap-2">
                                            <button 
                                                onClick={() => handleResolve(report.id)}
                                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" 
                                                title="Resolve (Keep Content)"
                                            >
                                                <CheckCircle size={18} />
                                            </button>
                                            <button 
                                                onClick={() => handleDismiss(report.id)}
                                                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" 
                                                title="Dismiss Report"
                                            >
                                                <XCircle size={18} />
                                            </button>
                                            <button 
                                                onClick={() => handleBanUser(report.id, report.reportedUser)}
                                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" 
                                                title="Ban User"
                                            >
                                                <Shield size={18} />
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                         {filteredReports.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                    <div className="flex flex-col items-center justify-center">
                                        <CheckCircle size={48} className="text-gray-200 mb-4" />
                                        <p>No reports found.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};




const AnalyticsView = () => {
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'custom'>('7d');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            if (timeRange === 'custom' && (!customStartDate || !customEndDate)) return;
            setLoading(true);
            try {
                const result = await getAnalyticsData(
                    timeRange,
                    timeRange === 'custom' ? customStartDate : undefined,
                    timeRange === 'custom' ? customEndDate : undefined,
                );
                setData(result);
            } catch (error) {
                console.error("Failed to load analytics", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, [timeRange, customStartDate, customEndDate]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 h-96">
                <div className="w-10 h-10 border-4 border-brand-orange border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-500 font-medium">Crunching the numbers...</p>
            </div>
        );
    }

    if (!data) return <div className="p-10 text-center text-gray-500">Failed to load analytics data.</div>;

    const currentData = data;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header / Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <h3 className="text-lg font-semibold text-gray-800">Platform Analytics</h3>
                    <p className="mt-1 text-xs text-gray-500">Use the period controls or choose exact dates for a printable report.</p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        {(['7d', '30d', '90d'] as const).map((range) => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${timeRange === range ? 'bg-white text-brand-orange shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                {range === '7d' ? 'Week' : range === '30d' ? 'Month' : 'Quarter'}
                            </button>
                        ))}
                        <button
                            onClick={() => setTimeRange('custom')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${timeRange === 'custom' ? 'bg-white text-brand-orange shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Custom
                        </button>
                    </div>
                    {timeRange === 'custom' && (
                        <div className="flex flex-wrap items-center gap-2">
                            <label className="text-xs font-bold text-gray-500">From <input type="date" value={customStartDate} onChange={(event) => setCustomStartDate(event.target.value)} className="ml-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-700" /></label>
                            <label className="text-xs font-bold text-gray-500">To <input type="date" value={customEndDate} onChange={(event) => setCustomEndDate(event.target.value)} className="ml-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-700" /></label>
                        </div>
                    )}
                    <button type="button" onClick={() => window.print()} className="flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white hover:bg-slate-800">
                        Print report
                    </button>
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {currentData.cards.map((card, idx) => (
                    <AnalyticsCard 
                        key={idx}
                        title={card.title} 
                        value={card.value} 
                        change={card.change} 
                        trend={card.trend as 'up' | 'down'} 
                    />
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Visual Chart 1: User Growth */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="font-semibold text-gray-800">User Growth Trend</h4>
                        <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">{currentData.cards[0].change} vs prev</span>
                    </div>
                    {/* CSS Bar Chart */}
                    <div className="flex items-end justify-between h-48 gap-3">
                        {currentData.growth.map((item, idx) => {
                            // Calculate max value for scaling (with some padding)
                            const maxVal = Math.max(...currentData.growth.map(d => d.value), 1);
                            const heightPct = (item.value / maxVal) * 100;
                            
                            return (
                                <div key={idx} className="flex flex-col items-center gap-2 flex-1 group">
                                    <div className="relative w-full bg-gray-100 rounded-t-lg h-full flex items-end overflow-hidden">
                                         <div 
                                            className="w-full bg-brand-orange/80 group-hover:bg-brand-orange transition-all duration-500 rounded-t-lg"
                                            style={{ height: `${heightPct}%` }} 
                                         />
                                         {/* Tooltip */}
                                         <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full bg-slate-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                                            {item.value} users
                                         </div>
                                    </div>
                                    <span className="text-[10px] sm:text-xs text-gray-500 font-medium whitespace-nowrap">{item.label}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Visual Chart 2: Demographics */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
                     <h4 className="font-semibold text-gray-800 mb-6">Demographics</h4>
                     
                     <div className="space-y-8">
                        {/* Gender Split */}
                        <div>
                            <div className="flex justify-between text-sm mb-2 text-gray-600">
                                <span>Gender Distribution</span>
                            </div>
                            <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden flex">
                                {currentData.demographics.gender.map((item) => (
                                    <div 
                                        key={item.label}
                                        className={`${item.color} h-full relative group transition-all duration-500`}
                                        style={{ width: `${Math.max(item.value, 5)}%` }} // Minimum visible width
                                        title={`${item.label}: ${item.value}%`}
                                    >
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-4 mt-2 justify-center">
                                {currentData.demographics.gender.map(item => (
                                    <div key={item.label} className="flex items-center gap-2 text-xs text-gray-500">
                                        <div className={`w-3 h-3 rounded-full ${item.color}`} />
                                        {item.label} ({item.value}%)
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Age Distribution */}
                         <div>
                            <div className="flex justify-between text-sm mb-3 text-gray-600">
                                <span>Age Groups</span>
                            </div>
                            <div className="space-y-3">
                                {currentData.demographics.age.map((item) => (
                                    <div key={item.label}>
                                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                                            <span>{item.label}</span>
                                            <span>{item.value}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-slate-600 rounded-full transition-all duration-500"
                                                style={{ width: `${item.value}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                     </div>
                </div>
            </div>

            {/* Top Locations */}
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h4 className="font-semibold text-gray-800 mb-4">Top Locations</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {currentData.locations.length === 0 ? (
                        <div className="col-span-3 text-center text-gray-500 py-4">No location data yet.</div>
                    ) : (
                        currentData.locations.map((loc, idx) => (
                            <div key={loc.city} className="flex items-center gap-4 p-4 rounded-lg bg-gray-50">
                                <div className="w-10 h-10 rounded-full bg-brand-orange/10 flex items-center justify-center text-brand-orange font-bold">
                                    {idx + 1}
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900">{loc.city}</p>
                                    <p className="text-sm text-gray-500">{loc.users.toLocaleString()} users</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

const AnalyticsCard = ({ title, value, change, trend }: { title: string, value: string, change: string, trend: 'up' | 'down' }) => (
    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <div className="flex items-end gap-3 mt-1">
            <h4 className="text-2xl font-bold text-gray-900">{value}</h4>
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded mb-1 ${
                trend === 'up' 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
            }`}>
                {change}
            </span>
        </div>
    </div>
);

// --- Components ---

const NavItem = ({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all cursor-pointer ${
    active 
      ? 'bg-brand-orange text-white shadow-lg shadow-brand-orange/20' 
      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
  }`}>
    {icon}
    <span className="font-medium">{label}</span>
  </button>
);

const StatCard = ({ title, value, change, isNegative, icon }: { title: string, value: string, change: string, isNegative?: boolean, icon?: React.ReactNode }) => (
  <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md">
    <div className="mb-2 flex items-center justify-between gap-2">
        <div className="rounded-lg bg-gray-50 p-1.5">{icon || <Activity size={18} className="text-gray-400" />}</div>
        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${isNegative ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>{change}</span>
    </div>
    <p className="truncate text-[11px] font-bold text-gray-500">{title}</p>
    <h3 className="text-xl font-black tracking-tight text-gray-900">{value}</h3>
  </div>
);

export default AdminDashboard;
