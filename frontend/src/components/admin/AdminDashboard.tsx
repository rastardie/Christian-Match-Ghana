import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebase';
import { getDashboardStats, getAdminUsers, getAdminPrayers, getAdminReports, deleteUser, toggleBlockUser, getAdminConnections, getAdminPayments, getAnalyticsData, AnalyticsData, adminCreateUser } from '../../services/adminService';
import { LayoutDashboard, Users, Shield, Activity, LogOut, MessageSquare, Heart, Trash2, Search, CheckCircle, XCircle, Link as LinkIcon, CreditCard, DollarSign, Calendar, MoreHorizontal, ChevronDown, RefreshCw, ClipboardList, Settings, Menu, Power, FileText, Printer, KeyRound, X, Edit3, Send } from 'lucide-react';
import { EditProfileView } from '../../MainApp';
import { updateUserDocument } from '../../services/userService';
import AdminAccessControl from './AdminAccessControl';
import LoadingSpinner from '../LoadingSpinner';
import { AdminActionProvider, useAdminActionConfirmation } from './AdminActionConfirmation';

import { getCurrentAdminAccess, listAdminAccessControl, assignAdminUserGroups, listAdminDistributionGroups, createAdminDistributionGroup, updateAdminDistributionGroup, deleteAdminDistributionGroup, previewAdminDistributionGroup, getAdminDistributionMemberships, adminSendMessage, adminSendPasswordResetEmail, adminSetUserPassword, type DistributionGroup, type DistributionGroupCriteria, type AdminMessageRecipientMode } from '../../services/adminRbacService';
import type { User } from '../../types';
type AdminReportKind = 'platform' | 'users' | 'moderation' | 'payments';

const ADMIN_MENU_GROUPS = [
  { key: 'users', label: 'Users', icon: Users, items: [
    { key: 'users', label: 'Users' },
    { key: 'groups', label: 'Groups' },
    { key: 'connections', label: 'Connections' },
    { key: 'prayers', label: 'Prayers' },
  ] },
  { key: 'reports', label: 'Reports', icon: FileText, items: [
    { key: 'reports', label: 'Analytics' },
    { key: 'report-users', label: 'Users' },
    { key: 'report-moderation', label: 'Moderate' },
    { key: 'report-payments', label: 'Payments' },
  ] },
  { key: 'operations', label: 'Ops', icon: Activity, items: [
    { key: 'moderation', label: 'Moderate' },
    { key: 'messages', label: 'Messages' },
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
  'overview', 'reports', 'report-users', 'report-moderation', 'report-payments', 'users', 'groups', 'access-control', 'message-distribution-groups', 'connections', 'prayers',
  'moderation', 'messages', 'analytics', 'payments', 'audit-logs',
]);

function readAdminNavigationState(): { activeTab: string; selectedMenuGroup: string } {
  if (typeof window === 'undefined') return { activeTab: 'overview', selectedMenuGroup: 'dashboard' };
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(ADMIN_NAV_STATE_KEY) || '{}') as { activeTab?: string; selectedMenuGroup?: string };
    const requestedTab = stored.activeTab && ADMIN_NAV_TABS.has(stored.activeTab) ? stored.activeTab : 'overview';
    const activeTab = requestedTab === 'access-control' || requestedTab === 'message-distribution-groups' ? 'groups' : requestedTab;
    const selectedMenuGroup = ADMIN_MENU_GROUPS.find((group) => group.items.some((item) => item.key === activeTab))?.key || 'dashboard';
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
  const [refreshing, setRefreshing] = useState(false);
  const [ribbonScrolling, setRibbonScrolling] = useState(false);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [highlightX, setHighlightX] = useState(50);
  const [focusUserId, setFocusUserId] = useState<string | null>(null);
  const [focusGroupId, setFocusGroupId] = useState<string | null>(null);
  const [focusPermissionGroupId, setFocusPermissionGroupId] = useState<string | null>(null);
  const mainMenuRef = useRef<HTMLDivElement>(null);
  const activeButtonRef = useRef<HTMLButtonElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useLayoutEffect(() => {
    const updateHighlight = () => {
      const button = activeButtonRef.current;
      const submenu = submenuRef.current;
      if (!button || !submenu) {
        setHighlightX(50);
        return;
      }

      const buttonRect = button.getBoundingClientRect();
      const submenuRect = submenu.getBoundingClientRect();
      setHighlightX(buttonRect.left + buttonRect.width / 2 - submenuRect.left);
    };

    updateHighlight();
    const frame = window.requestAnimationFrame(updateHighlight);
    window.addEventListener('resize', updateHighlight);

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(updateHighlight)
      : null;
    if (resizeObserver) {
      if (mainMenuRef.current) resizeObserver.observe(mainMenuRef.current);
      if (submenuRef.current) resizeObserver.observe(submenuRef.current);
    }

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', updateHighlight);
      resizeObserver?.disconnect();
    };
  }, [selectedMenuGroup, activeTab]);

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
    if (owningGroup) setSelectedMenuGroup(owningGroup.key);
    setMobileMenuOpen(false);
  };

  const selectMenuGroup = (groupKey: string) => {
    const group = ADMIN_MENU_GROUPS.find((candidate) => candidate.key === groupKey);
    if (!group) return;
    setSelectedMenuGroup(group.key);
    selectTab(group.items[0].key);
  };

  const openAdminUser = (userId: string) => {
    setFocusUserId(userId);
    setFocusGroupId(null);
    setFocusPermissionGroupId(null);
    selectTab('users');
  };

  const openDistributionGroup = (groupId: string) => {
    setFocusGroupId(groupId);
    setFocusUserId(null);
    setFocusPermissionGroupId(null);
    selectTab('groups');
  };

  const openPermissionGroup = (groupId: string) => {
    setFocusPermissionGroupId(groupId);
    setFocusUserId(null);
    setFocusGroupId(null);
    selectTab('groups');
  };

  const selectDashboard = () => {
    setSelectedMenuGroup('dashboard');
    setActiveTab('overview');
    setMobileMenuOpen(false);
  };

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setRefreshKey((currentKey) => currentKey + 1);
    await new Promise((resolve) => window.setTimeout(resolve, 250));
    setRefreshing(false);
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
        return <AdminReportsView key={activeTab} reportKind="platform" />;
      case 'report-users':
        return <AdminReportsView key={activeTab} reportKind="users" />;
      case 'report-moderation':
        return <AdminReportsView key={activeTab} reportKind="moderation" />;
      case 'report-payments':
        return <AdminReportsView key={activeTab} reportKind="payments" />;
      case 'users':
        return <UsersView focusUserId={focusUserId} onOpenGroup={openDistributionGroup} onOpenPermissionGroup={openPermissionGroup} onOpenMessages={() => selectTab('messages')} />;
      case 'connections':
        return <ConnectionsView />;
      case 'payments':
        return <PaymentsView />;
      case 'prayers':
        return <PrayersView />;
      case 'moderation':
        return <ModerationView />;
      case 'messages':
        return <AdminMessagesView canSend={can('messages.send') || can('messages.moderate')} onManageAudiences={() => selectTab('groups')} />;
      case 'analytics':
        return <AnalyticsView />;
      case 'groups':
        return <GroupsView focusGroupId={focusGroupId} focusPermissionGroupId={focusPermissionGroupId} onOpenUser={openAdminUser} />;
      case 'access-control':
        return <AdminAccessControl initialTab="groups" focusGroupId={focusPermissionGroupId} onOpenUser={openAdminUser} />;
      case 'message-distribution-groups':
        return <DistributionGroupsView focusGroupId={focusGroupId} onOpenUser={openAdminUser} />;
      case 'audit-logs':
        return <AdminAccessControl initialTab="audit" />;
      default:
        return <Overview />;
    }
  };

  const selectedGroup = ADMIN_MENU_GROUPS.find((group) => group.key === selectedMenuGroup);

  return (
    <AdminActionProvider>
      <div className={`cmg-admin-page relative flex h-full min-h-full flex-col bg-[#f6f8fc] font-sans text-slate-900 ${ribbonScrolling ? 'is-ribbon-scrolling' : ''}`}>
      {/* Mobile-first CMG Admin header, based on the Onboard Admin pattern. */}
      <header className="cmg-admin-header shrink-0 bg-white shadow-sm">
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
            <button type="button" title={refreshing ? 'Refreshing admin data' : 'Refresh'} aria-label={refreshing ? 'Refreshing admin data' : 'Refresh'} aria-busy={refreshing} disabled={refreshing} onClick={() => void handleRefresh()} className="rounded-xl p-2 text-slate-700 transition hover:bg-slate-100 disabled:cursor-wait disabled:opacity-60">
              {refreshing ? <LoadingSpinner size={21} /> : <RefreshCw size={21} />}
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
            <div className="cmg-admin-branch-panel mx-auto w-full rounded-2xl border border-white/15 bg-white/10 p-1.5 transition-colors">
              <div ref={mainMenuRef} className="relative z-10 flex flex-wrap justify-center gap-1.5">
                <button
                  type="button"
                  ref={selectedMenuGroup === 'dashboard' ? activeButtonRef : undefined}
                  onClick={selectDashboard}
                  className={`flex min-h-7 w-28 flex-none whitespace-nowrap items-center justify-center gap-1.5 rounded-full border px-2 py-1 text-xs font-black transition ${selectedMenuGroup === 'dashboard' ? 'cmg-admin-menu-top-selected border-blue-400/80 bg-blue-500/30 text-white shadow-[0_0_18px_rgb(59_130_246_/_0.45)]' : 'border-white/25 bg-white/10 text-white/45 hover:border-white/55 hover:bg-white/20 hover:text-white/75'}`}
                >
                  <LayoutDashboard size={16} />
                  Dashboard
                </button>
                {ADMIN_MENU_GROUPS.map((group) => {
                  const GroupIcon = group.icon;
                  const isSelected = selectedMenuGroup === group.key;
                  return (
                    <button
                      key={group.key}
                      type="button"
                      ref={isSelected ? activeButtonRef : undefined}
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
                <div className="relative mt-3 pt-3" aria-label={`${selectedGroup.label} options`}>
                  <div
                    ref={submenuRef}
                    className="submenu-connected"
                    style={{ '--highlight-x': `${highlightX}px` } as React.CSSProperties}
                  >
                    <div className="grid w-full grid-cols-2 gap-1.5 sm:grid-cols-3">
                      {selectedGroup.items.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => selectTab(item.key)}
                          className={`flex min-h-7 w-full min-w-0 items-center justify-center rounded-full border px-3 py-1 text-xs font-black transition ${activeTab === item.key ? 'border-white/85 bg-white text-slate-950 shadow-md' : 'border-white/25 bg-white/15 text-white/75 hover:border-white/60 hover:bg-white/25 hover:text-white'}`}
                        >
                          <span className="truncate">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
      </header>

      <main
        onScroll={(event) => {
          setRibbonScrolling(event.currentTarget.scrollTop > 2);
        }}
        className="cmg-admin-content mx-auto w-full min-h-0 flex-1 overflow-auto px-4 py-5 sm:px-6 sm:py-8"
      >
        <div key={refreshKey}>{renderContent()}</div>
        {showSignOutDialog && (
          <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-slate-950/70 p-4" role="presentation" onClick={() => setShowSignOutDialog(false)}>
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
      <div
        aria-hidden="true"
        data-view="ADMIN"
        className="cmg-admin-bottom-ribbon cmg-nav-bottom-ribbon pointer-events-none absolute inset-x-0 bottom-0 z-10"
      />
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

const AdminReportsView = ({ reportKind }: { reportKind: AdminReportKind }) => {
    const today = new Date();
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
                <p className="mt-1 text-sm text-slate-500">Choose a report from the Reports menu, then generate it for any date range.</p>
            </div>
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
    <div className="space-y-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-orange">Platform overview</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">Christian Match Ghana at a glance</h2>
          </div>
          <span className="rounded-full bg-green-50 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-green-700">Live snapshot</span>
        </div>
        <div className="grid grid-cols-2 justify-items-center gap-3 md:grid-cols-4">
          <StatCard title="Total Users" value={stats.totalUsers.toLocaleString()} change="Live" icon={<Users className="text-blue-500" size={18} />} />
          <StatCard title="Active Users" value={activeUsers.toLocaleString()} change="Live" icon={<Activity className="text-green-500" size={18} />} />
          <StatCard title="Verified Users" value={verifiedUsers.toLocaleString()} change="Trust" icon={<CheckCircle className="text-indigo-500" size={18} />} />
          <StatCard title="Pending Reports" value={stats.pendingReports.toLocaleString()} change="Review" isNegative icon={<Shield className="text-red-500" size={18} />} />
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 justify-items-center gap-3 md:grid-cols-4">
        <div className="flex min-h-[92px] w-full flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"><p className="whitespace-normal break-words text-[11px] font-black leading-tight text-slate-500">Active Matches</p><p className="mt-1 text-2xl font-black text-slate-900">{stats.activeMatches.toLocaleString()}</p></div>
        <div className="flex min-h-[92px] w-full flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"><p className="whitespace-normal break-words text-[11px] font-black leading-tight text-slate-500">Premium Users</p><p className="mt-1 text-2xl font-black text-slate-900">{premiumUsers.toLocaleString()}</p></div>
        <div className="flex min-h-[92px] w-full flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"><p className="whitespace-normal break-words text-[11px] font-black leading-tight text-slate-500">Blocked Users</p><p className="mt-1 text-2xl font-black text-slate-900">{blockedUsers.toLocaleString()}</p></div>
        <div className="flex min-h-[92px] w-full flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"><p className="whitespace-normal break-words text-[11px] font-black leading-tight text-slate-500">Revenue</p><p className="mt-1 text-2xl font-black text-slate-900">₵{stats.totalRevenue.toLocaleString()}</p></div>
      </div>

      <details open className="cmg-admin-overview-details w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-2 py-1 text-sm font-black text-slate-800 transition hover:bg-slate-50">
          <span>Detailed insights and activity</span>
          <span className="cmg-admin-details-chevron flex shrink-0 items-center justify-center rounded-full bg-slate-100 p-1 text-slate-600" aria-hidden="true"><ChevronDown size={18} /></span>
        </summary>
        <div className="mt-4 grid w-full gap-4">
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

      <div className="mt-4 grid w-full gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between"><h3 className="font-black text-slate-800">Recent users</h3><span className="text-xs font-bold text-slate-400">{dashboardUsers.length} total</span></div>
          <div className="divide-y divide-slate-100">{recentUsers.length ? recentUsers.map((user, index) => <div key={`${user.id}-${index}`} className="flex items-start justify-between gap-3 py-3 text-xs"><span className="min-w-0 whitespace-normal break-words font-black text-slate-800">{user.name || user.email || 'Unnamed user'}</span><span className="shrink-0 text-slate-500">{user.isBlocked ? 'Blocked' : 'Active'}</span></div>) : <p className="py-4 text-sm text-slate-500">No users found.</p>}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between"><h3 className="font-black text-slate-800">Moderation queue</h3><span className="text-xs font-bold text-slate-400">{stats.pendingReports} pending</span></div>
          <div className="divide-y divide-slate-100">{recentReports.length ? recentReports.map((report, index) => <div key={`${report.id}-${index}`} className="flex items-start justify-between gap-3 py-3 text-xs"><span className="min-w-0 whitespace-normal break-words font-black text-slate-800">{report.reason || 'General report'}</span><span className="shrink-0 rounded px-2 py-0.5 font-bold text-orange-700 bg-orange-50">{report.status || 'pending'}</span></div>) : <p className="py-4 text-sm text-slate-500">No reports found.</p>}</div>
        </div>
      </div>
      </details>
    </div>
  );
};

type UnifiedGroupRow = {
    id: string;
    name: string;
    description?: string;
    type: 'Security Group' | 'Distribution Group';
    memberCount: number;
    system?: boolean;
};

const GroupsView = ({ focusGroupId, focusPermissionGroupId, onOpenUser }: { focusGroupId?: string | null; focusPermissionGroupId?: string | null; onOpenUser?: (userId: string) => void }) => {
    const [groups, setGroups] = useState<UnifiedGroupRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [workspace, setWorkspace] = useState<'all' | 'security' | 'distribution'>('all');
    const [securityFocusGroupId, setSecurityFocusGroupId] = useState<string | null>(focusPermissionGroupId || null);
    const [distributionFocusGroupId, setDistributionFocusGroupId] = useState<string | null>(focusGroupId || null);
    const [groupColumnWidths, setGroupColumnWidths] = useState({ number: 60, name: 220, type: 180, description: 300, members: 100, actions: 120 });

    const loadGroups = async () => {
        setLoading(true);
        setError('');
        const [securityResult, distributionResult] = await Promise.allSettled([
            listAdminAccessControl(),
            listAdminDistributionGroups(),
        ]);
        const merged: UnifiedGroupRow[] = [];
        if (securityResult.status === 'fulfilled') {
            const access = securityResult.value;
            access.groups.forEach((group) => merged.push({
                id: group.id,
                name: group.name,
                description: group.description,
                type: 'Security Group',
                memberCount: access.users.filter((user) => (user.groupIds || []).includes(group.id)).length,
                system: group.system,
            }));
        } else {
            setError(securityResult.reason?.message || 'Unable to load security groups.');
        }
        if (distributionResult.status === 'fulfilled') {
            distributionResult.value.forEach((group) => merged.push({
                id: group.id,
                name: group.name,
                description: group.description,
                type: 'Distribution Group',
                memberCount: group.memberCount || 0,
                system: group.system,
            }));
        } else {
            setError((current) => current || distributionResult.reason?.message || 'Unable to load distribution groups.');
        }
        setGroups(merged.sort((left, right) => left.name.localeCompare(right.name)));
        setLoading(false);
    };

    useEffect(() => { void loadGroups(); }, []);

    useEffect(() => {
        if (focusPermissionGroupId) {
            setSecurityFocusGroupId(focusPermissionGroupId);
            setWorkspace('security');
        }
    }, [focusPermissionGroupId]);

    useEffect(() => {
        if (focusGroupId) {
            setDistributionFocusGroupId(focusGroupId);
            setWorkspace('distribution');
        }
    }, [focusGroupId]);

    const resizeGroupColumn = (column: keyof typeof groupColumnWidths, event: React.MouseEvent<HTMLSpanElement>) => {
        event.preventDefault();
        const startX = event.clientX;
        const startWidth = groupColumnWidths[column];
        const handleMove = (moveEvent: MouseEvent) => {
            const nextWidth = Math.max(80, startWidth + moveEvent.clientX - startX);
            setGroupColumnWidths((current) => ({ ...current, [column]: nextWidth }));
        };
        const handleUp = () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
        };
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
    };

    const openGroup = (group: UnifiedGroupRow) => {
        if (group.type === 'Security Group') {
            setSecurityFocusGroupId(group.id);
            setWorkspace('security');
        } else {
            setDistributionFocusGroupId(group.id);
            setWorkspace('distribution');
        }
    };

    if (workspace === 'security') {
        return <div className="space-y-4"><button type="button" onClick={() => setWorkspace('all')} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700">← Back to Groups</button><AdminAccessControl initialTab="groups" focusGroupId={securityFocusGroupId} onOpenUser={onOpenUser} /></div>;
    }
    if (workspace === 'distribution') {
        return <div className="space-y-4"><button type="button" onClick={() => setWorkspace('all')} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700">← Back to Groups</button><DistributionGroupsView focusGroupId={distributionFocusGroupId} onOpenUser={onOpenUser} /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h2 className="text-2xl font-black text-slate-900">Groups</h2><p className="mt-1 text-sm text-slate-500">Manage security and distribution groups from one workspace.</p></div>
                <button type="button" onClick={() => void loadGroups()} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"><RefreshCw size={16} />Refresh</button>
            </div>
            {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p>}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3"><div><h3 className="flex items-center gap-2 font-black text-slate-800"><Shield size={18} />Groups</h3><p className="mt-1 text-xs text-slate-500">Select a group to review or edit it in its existing management workspace.</p></div><span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-600">{groups.length} groups</span></div>
                {loading ? <p className="px-4 py-6 text-sm text-slate-500">Loading groups…</p> : (
                    <div className="overflow-x-auto">
                        <table className="cmg-admin-compact-table min-w-[980px] w-full table-fixed border-collapse text-left">
                            <colgroup><col style={{ width: groupColumnWidths.number }} /><col style={{ width: groupColumnWidths.name }} /><col style={{ width: groupColumnWidths.type }} /><col style={{ width: groupColumnWidths.description }} /><col style={{ width: groupColumnWidths.members }} /><col style={{ width: groupColumnWidths.actions }} /></colgroup>
                            <thead className="bg-slate-900 text-[10px] font-black uppercase tracking-wide text-white"><tr>
                                <th style={{ width: groupColumnWidths.number }} className="relative px-2 py-2">#<span onMouseDown={(event) => resizeGroupColumn('number', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                                <th style={{ width: groupColumnWidths.name }} className="relative px-3 py-2">Group name<span onMouseDown={(event) => resizeGroupColumn('name', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                                <th style={{ width: groupColumnWidths.type }} className="relative px-3 py-2">Group Type<span onMouseDown={(event) => resizeGroupColumn('type', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                                <th style={{ width: groupColumnWidths.description }} className="relative px-3 py-2">Description<span onMouseDown={(event) => resizeGroupColumn('description', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                                <th style={{ width: groupColumnWidths.members }} className="relative px-3 py-2">Members<span onMouseDown={(event) => resizeGroupColumn('members', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                                <th style={{ width: groupColumnWidths.actions }} className="relative px-3 py-2">Actions<span onMouseDown={(event) => resizeGroupColumn('actions', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                            </tr></thead>
                            <tbody>{groups.map((group, index) => <tr key={`${group.type}-${group.id}`} className="h-9 cursor-pointer border-b border-slate-200 text-xs text-slate-700 transition hover:bg-slate-50" onClick={() => openGroup(group)}>
                                <td className="px-2 py-1.5 font-black text-slate-400">{index + 1}</td>
                                <td className="px-3 py-1.5"><button type="button" onClick={(event) => { event.stopPropagation(); openGroup(group); }} className="font-black text-slate-900 underline decoration-orange-200 underline-offset-2 hover:text-brand-orange">{group.name}</button></td>
                                <td className="px-3 py-1.5"><span className={`rounded px-2 py-1 text-[10px] font-black ${group.type === 'Security Group' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>{group.type}</span></td>
                                <td className="truncate px-3 py-1.5">{group.description || '—'}</td>
                                <td className="px-3 py-1.5 font-bold">{group.memberCount}</td>
                                <td className="px-3 py-1.5"><button type="button" onClick={(event) => { event.stopPropagation(); openGroup(group); }} className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-[10px] font-black text-white hover:bg-slate-700">Manage</button></td>
                            </tr>)}</tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
};

const UsersView = ({ focusUserId, onOpenGroup, onOpenPermissionGroup, onOpenMessages }: { focusUserId?: string | null; onOpenGroup?: (groupId: string) => void; onOpenPermissionGroup?: (groupId: string) => void; onOpenMessages?: () => void }) => {
    const { confirmAdminAction } = useAdminActionConfirmation();
    // Real Data
    const [users, setUsers] = useState<any[]>([]);
    const [distributionMemberships, setDistributionMemberships] = useState<Record<string, Array<{ id: string; name: string }>>>({});
    const [permissionMemberships, setPermissionMemberships] = useState<Record<string, Array<{ id: string; name: string }>>>({});
    const [expandedUserIds, setExpandedUserIds] = useState<Set<string>>(new Set());
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
            const userIds = formattedUsers.map((user) => user.firestoreDocId || user.id);
            try {
                const membershipMap = await getAdminDistributionMemberships(userIds);
                setDistributionMemberships(membershipMap);
            } catch (membershipError) {
                console.warn('Unable to load distribution memberships:', membershipError);
            }
            try {
                const access = await listAdminAccessControl();
                const groupNames = new Map(access.groups.map((group) => [group.id, group.name]));
                const permissionMap: Record<string, Array<{ id: string; name: string }>> = Object.fromEntries(userIds.map((userId) => [userId, []]));
                access.users.forEach((accessUser) => {
                    const userId = accessUser.userId;
                    permissionMap[userId] = (accessUser.groupIds || [])
                        .map((groupId) => ({ id: groupId, name: groupNames.get(groupId) || groupId }))
                        .filter((group) => Boolean(group.name));
                });
                setPermissionMemberships(permissionMap);
            } catch (permissionError) {
                console.warn('Unable to load permission group memberships:', permissionError);
            }
            setLoading(false);
        };
        fetchUsers();
    }, []);
    useEffect(() => {
        if (!focusUserId || !users.some((user) => user.id === focusUserId || user.firestoreDocId === focusUserId)) return;
        setExpandedUserIds((current) => new Set([...current, focusUserId]));
        void openManageGroups([focusUserId]);
        window.setTimeout(() => document.getElementById(`admin-user-${focusUserId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0);
    }, [focusUserId, users]);

    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [openMenuPosition, setOpenMenuPosition] = useState<{ top: number; left: number } | null>(null);
    const openMenuUser = openMenuId ? users.find((user) => user.id === openMenuId) : null;
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
    const [selectedUser, setSelectedUser] = useState<any>(null); // State for the details modal
    const [message, setMessage] = useState('');
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [userColumnWidths, setUserColumnWidths] = useState({ number: 72, user: 220, email: 200, firestoreId: 180, telephone: 140, role: 120, status: 120, joined: 140, actions: 84 });
    const [userGroupColumnWidths, setUserGroupColumnWidths] = useState({ number: 60, group: 260, type: 180 });

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

    const resizeUserGroupColumn = (column: keyof typeof userGroupColumnWidths, event: React.MouseEvent<HTMLSpanElement>) => {
        event.preventDefault();
        const startX = event.clientX;
        const startWidth = userGroupColumnWidths[column];
        const handleMove = (moveEvent: MouseEvent) => {
            const nextWidth = Math.max(80, startWidth + moveEvent.clientX - startX);
            setUserGroupColumnWidths((current) => ({ ...current, [column]: nextWidth }));
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
    const [passwordResetTarget, setPasswordResetTarget] = useState<any | null>(null);
    const [passwordResetPassword, setPasswordResetPassword] = useState('');
    const [passwordResetConfirmation, setPasswordResetConfirmation] = useState('');
    const [passwordResetForceChange, setPasswordResetForceChange] = useState(true);
    const [passwordResetBusy, setPasswordResetBusy] = useState(false);
    const [passwordResetError, setPasswordResetError] = useState('');

    const toggleMenu = (e: React.MouseEvent, id: string) => {
        e.stopPropagation(); // Prevent row click
        if (openMenuId === id) {
            setOpenMenuId(null);
            setOpenMenuPosition(null);
            return;
        }
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const menuWidth = 192;
        const menuHeight = 320;
        const gap = 8;
        const top = rect.bottom + menuHeight + gap > window.innerHeight
            ? Math.max(8, rect.top - menuHeight - gap)
            : rect.bottom + gap;
        const left = Math.min(
            Math.max(8, rect.right - menuWidth),
            Math.max(8, window.innerWidth - menuWidth - 8),
        );
        setOpenMenuPosition({ top, left });
        setOpenMenuId(id);
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

    const getTargetUserId = (user: any) => user.firestoreDocId || user.id;

    const handlePasswordResetEmail = async (userIds: string[]) => {
        const selected = users.filter((user) => userIds.includes(user.id) || userIds.includes(user.firestoreDocId)).filter((user) => getTargetUserId(user));
        const confirmed = await confirmAdminAction({ title: 'Send password reset email?', description: `Send a password reset email to ${selected.length} selected user${selected.length === 1 ? '' : 's'}.` });
        if (!confirmed) return;
        const results = await Promise.allSettled(selected.map((user) => adminSendPasswordResetEmail(getTargetUserId(user))));
        const sent = results.filter((result) => result.status === 'fulfilled').length;
        const failed = results.length - sent;
        alert(`${sent} password reset email${sent === 1 ? '' : 's'} sent${failed ? `; ${failed} failed.` : '.'}`);
    };

    const openSetPassword = (userId: string) => {
        const target = users.find((user) => user.id === userId || user.firestoreDocId === userId);
        if (!target) return;
        setPasswordResetTarget(target);
        setPasswordResetPassword('');
        setPasswordResetConfirmation('');
        setPasswordResetForceChange(true);
        setPasswordResetError('');
    };

    const handleSetPassword = async () => {
        if (!passwordResetTarget) return;
        if (passwordResetPassword !== passwordResetConfirmation) {
            setPasswordResetError('The passwords do not match.');
            return;
        }
        if (passwordResetPassword.length < 12 || !/[A-Z]/.test(passwordResetPassword) || !/[a-z]/.test(passwordResetPassword) || !/[0-9]/.test(passwordResetPassword) || !/[^A-Za-z0-9]/.test(passwordResetPassword)) {
            setPasswordResetError('Use at least 12 characters with uppercase, lowercase, number, and special character.');
            return;
        }
        const targetUserId = getTargetUserId(passwordResetTarget);
        const confirmed = await confirmAdminAction({ title: 'Set a new user password?', description: `Set a new password for ${passwordResetTarget.name || passwordResetTarget.email || 'this user'}${passwordResetForceChange ? ' and require a change at next login' : ''}.` });
        if (!confirmed) return;
        setPasswordResetBusy(true);
        setPasswordResetError('');
        try {
            await adminSetUserPassword({ userId: targetUserId, newPassword: passwordResetPassword, forceChange: passwordResetForceChange });
            setPasswordResetPassword('');
            setPasswordResetConfirmation('');
            setPasswordResetTarget(null);
            alert(`Password updated for ${passwordResetTarget.name || passwordResetTarget.email || 'the user'}.${passwordResetForceChange ? ' The user must change it at next login.' : ''}`);
        } catch (error: any) {
            setPasswordResetError(error?.message || 'Unable to set the user password.');
        } finally {
            setPasswordResetBusy(false);
        }
    };

    const handleBulkPasswordReset = async () => {
        await handlePasswordResetEmail([...selectedUserIds]);
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
        setSelectedUser(users.find((user) => userIds.includes(user.id)) || null);
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

    const closeManageGroups = () => {
        setManageGroupsOpen(false);
        setSelectedUser(null);
        setSelectedUserIds(new Set());
        setGroupMembershipEditing(false);
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
            closeManageGroups();
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

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-0">
                <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
                    <div className="min-w-0">
                        <h3 className="flex items-center gap-2 font-black text-slate-800"><Users size={18} />Users</h3>
                        <p className="mt-1 text-xs text-slate-500">Manage user profiles, account status, access, and administrative actions.</p>
                    </div>
                    <span className="shrink-0 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-600">{users.length} users</span>
                </div>
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
                    <thead className="bg-slate-900 text-[10px] font-black uppercase tracking-wide text-white">
                        <tr>
                            <th style={{ width: userColumnWidths.number }} className="relative whitespace-nowrap px-3 py-2 text-left text-[10px] font-black uppercase tracking-wide text-white border-r-2 border-brand-orange"><input type="checkbox" aria-label="Select all users" checked={filteredUsers.length > 0 && filteredUsers.every((user) => selectedUserIds.has(user.id))} onChange={toggleAllUserSelection} onClick={(event) => event.stopPropagation()} className="mr-1 h-3.5 w-3.5 accent-orange-500" />#<span onMouseDown={(event) => resizeUserColumn('number', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
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
                            <React.Fragment key={user.id}>
                            <tr 
                                id={`admin-user-${user.id}`}
                                onClick={() => void openManageGroups([user.id])}
                                className="h-9 border-b border-slate-200 text-xs hover:bg-slate-50 transition-colors group cursor-pointer"
                            >
                                <td className="whitespace-nowrap px-3 py-1.5 text-left text-xs font-black text-slate-400"><span className="cmg-admin-row-leading"><input type="checkbox" aria-label={`Select ${user.name}`} checked={selectedUserIds.has(user.id)} onChange={(event) => toggleUserSelection(event, user.id)} onClick={(event) => event.stopPropagation()} className="h-3.5 w-3.5 accent-orange-500" /><button type="button" aria-label={`${expandedUserIds.has(user.id) ? 'Collapse' : 'Expand'} groups for ${user.name}`} onClick={(event) => { event.stopPropagation(); setExpandedUserIds((current) => { const next = new Set(current); if (next.has(user.id)) next.delete(user.id); else next.add(user.id); return next; }); }} className="text-lg font-black leading-none text-brand-orange">{expandedUserIds.has(user.id) ? '▾' : '▸'}</button><span className="text-slate-400">{userIndex + 1}</span></span></td>
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
                                <td className="px-3 py-1.5 text-left relative">
                                    <button 
                                        onClick={(e) => toggleMenu(e, user.id)}
                                        className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
                                    >
                                        <MoreHorizontal size={18} />
                                    </button>

                                </td>
                            </tr>
                            {expandedUserIds.has(user.id) && (() => {
                                const userId = user.firestoreDocId || user.id;
                                const groups = [
                                    ...((distributionMemberships[userId] || []).map((group) => ({ ...group, type: 'Distribution Group' as const, open: () => onOpenGroup?.(group.id) }))),
                                    ...((permissionMemberships[userId] || []).map((group) => ({ ...group, type: 'Security Group' as const, open: () => onOpenPermissionGroup?.(group.id) }))),
                                ];
                                return (
                                <tr className="border-b border-slate-200 bg-[#f7f9fc]">
                                    <td colSpan={8} className="px-5 py-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                                            <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">Groups for {user.name}</span>
                                            <span className="text-xs font-bold text-slate-500">{groups.length} group{groups.length === 1 ? '' : 's'}</span>
                                        </div>
                                        {groups.length === 0 ? (
                                            <p className="py-3 text-xs text-slate-500">No groups assigned.</p>
                                        ) : (
                                            <div className="mt-3 overflow-x-auto">
                                                <table className="min-w-[500px] w-full table-fixed text-left text-xs">
                                                    <colgroup>
                                                        <col style={{ width: userGroupColumnWidths.number }} />
                                                        <col style={{ width: userGroupColumnWidths.group }} />
                                                        <col style={{ width: userGroupColumnWidths.type }} />
                                                    </colgroup>
                                                    <thead className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                                                        <tr>
                                                            <th style={{ width: userGroupColumnWidths.number }} className="relative w-12 border-b border-slate-200 px-3 py-2">#<span onMouseDown={(event) => resizeUserGroupColumn('number', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                                                            <th style={{ width: userGroupColumnWidths.group }} className="relative border-b border-slate-200 px-3 py-2">Group<span onMouseDown={(event) => resizeUserGroupColumn('group', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                                                            <th style={{ width: userGroupColumnWidths.type }} className="relative border-b border-slate-200 px-3 py-2">Type<span onMouseDown={(event) => resizeUserGroupColumn('type', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {groups.map((group, groupIndex) => (
                                                            <tr key={`${group.type}-${group.id}`} className="border-b border-slate-100 last:border-0">
                                                                <td className="w-12 px-3 py-2 font-black text-slate-400">{groupIndex + 1}</td>
                                                                <td className="px-3 py-2">
                                                                    <button type="button" onClick={(event) => { event.stopPropagation(); group.open(); }} className="font-black text-slate-800 underline decoration-orange-200 underline-offset-2 hover:text-brand-orange">{group.name}</button>
                                                                </td>
                                                                <td className="px-3 py-2">
                                                                    <span className={`inline-flex rounded px-2 py-1 text-[10px] font-black ${group.type === 'Security Group' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>{group.type}</span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                                );
                            })()}
                            </React.Fragment>
                        ))}
                    </tbody>
                    </table>
                </div>
            </div>
            

            {isEditingProfile && selectedUser && (
                <div className="absolute inset-0 z-[300] overflow-y-auto bg-white">
                    <EditProfileView
                        user={selectedUser}
                        onCancel={() => setIsEditingProfile(false)}
                        onNotify={(message, type) => setMessage(`${type === 'error' ? 'Error: ' : ''}${message}`)}
                        onSave={(updatedUser) => {
                            setUsers((current) => current.map((user) => user.id === updatedUser.id ? { ...user, ...updatedUser, status: updatedUser.isBlocked ? 'Blocked' : 'Active' } : user));
                            setSelectedUser((current: any) => current ? { ...current, ...updatedUser } : updatedUser);
                            setIsEditingProfile(false);
                            setMessage('User profile updated.');
                        }}
                    />
                </div>
            )}

             {/* Filter Menu Overlay */}
            {showFilterMenu && (
                <div 
                    className="absolute inset-0 z-40 bg-transparent"
                    onClick={() => setShowFilterMenu(false)}
                />
            )}

            {manageGroupsOpen && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-sm max-h-[85dvh] overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-xl font-black text-slate-900">{selectedUserIds.size === 1 ? 'Manage user' : 'Manage users'}</h2>
                                <p className="mt-1 text-sm text-slate-500">Manage account actions and group membership for {selectedUserIds.size} selected user{selectedUserIds.size === 1 ? '' : 's'}.</p>
                            </div>
                            <button type="button" onClick={closeManageGroups} className="text-2xl font-black text-slate-400">×</button>
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
                                <button type="button" onClick={() => { setManageGroupsOpen(false); setIsEditingProfile(true); }} disabled={selectedUserIds.size !== 1} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"><Edit3 size={15} />Edit User</button>
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
                            <button type="button" onClick={closeManageGroups} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700">Cancel</button>
                            <button type="button" onClick={() => void saveSelectedUserGroups()} disabled={!groupMembershipEditing || manageGroupsBusy} className="flex-1 rounded-xl bg-brand-orange px-4 py-3 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500">{manageGroupsBusy ? 'Saving…' : 'Save groups'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add User Modal */}
            {isAddUserModalOpen && (
                <div className="absolute inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
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
                    className="absolute inset-0 z-0 bg-transparent"
                    onClick={() => setOpenMenuId(null)}
                />
            )}

            {/* User Details Modal */}
            {selectedUser && !manageGroupsOpen && (
                <div className="absolute inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
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
                                        onClick={() => { setSelectedUser(null); onOpenMessages?.(); }}
                                        className="px-4 py-2 bg-white border border-gray-200 text-gray-700 font-medium rounded-lg text-sm hover:bg-gray-50 shadow-sm"
                                    >
                                        Open Messages
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
                <div className="absolute inset-0 z-[200] bg-white overflow-hidden flex flex-col">
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

          {openMenuUser && openMenuPosition && createPortal(
            <>
              <button
                type="button"
                aria-label="Close user actions"
                className="fixed inset-0 z-[9998] cursor-default"
                onClick={() => { setOpenMenuId(null); setOpenMenuPosition(null); }}
              />
              <div
                className="fixed z-[9999] w-48 overflow-hidden rounded-lg border border-gray-100 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200"
                style={{ top: openMenuPosition.top, left: openMenuPosition.left }}
                role="menu"
                aria-label={`Actions for ${openMenuUser.name}`}
              >
                <button type="button" role="menuitem" onClick={(event) => { event.stopPropagation(); setOpenMenuId(null); setOpenMenuPosition(null); void openManageGroups([openMenuUser.id]); }} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50"><Users size={16} />Manage user</button>
                <button type="button" role="menuitem" onClick={(event) => { event.stopPropagation(); setOpenMenuId(null); setOpenMenuPosition(null); void handleBlock(event as unknown as React.MouseEvent, openMenuUser.id); }} className="flex w-full items-center gap-2 border-t border-gray-100 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"><Shield size={16} />{openMenuUser.status === 'Blocked' ? 'Enable user' : 'Disable user'}</button>
                <button type="button" role="menuitem" onClick={(event) => { event.stopPropagation(); setOpenMenuId(null); setOpenMenuPosition(null); void handlePasswordResetEmail([getTargetUserId(openMenuUser)]); }} className="flex w-full items-center gap-2 border-t border-gray-100 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"><KeyRound size={16} />Send reset email</button>
                <button type="button" role="menuitem" onClick={(event) => { event.stopPropagation(); setOpenMenuId(null); setOpenMenuPosition(null); openSetPassword(getTargetUserId(openMenuUser)); }} className="flex w-full items-center gap-2 border-t border-gray-100 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"><KeyRound size={16} />Set new password</button>
                <button type="button" role="menuitem" onClick={(event) => { event.stopPropagation(); setOpenMenuId(null); setOpenMenuPosition(null); void openManageGroups([openMenuUser.id]); }} className="flex w-full items-center gap-2 border-t border-gray-100 px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50"><Users size={16} />Add to group</button>
                <button type="button" role="menuitem" onClick={(event) => { event.stopPropagation(); setOpenMenuId(null); setOpenMenuPosition(null); void openManageGroups([openMenuUser.id]); }} className="flex w-full items-center gap-2 border-t border-gray-100 px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50"><Users size={16} />Remove from group</button>
                <button type="button" role="menuitem" onClick={(event) => { event.stopPropagation(); setOpenMenuId(null); setOpenMenuPosition(null); void handleDelete(event as unknown as React.MouseEvent, openMenuUser.id); }} className="flex w-full items-center gap-2 border-t border-gray-100 px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50"><Trash2 size={16} />Delete User</button>
              </div>
            </>,
            document.body,
          )}

          {passwordResetTarget && createPortal(
            <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/60 p-4" role="presentation" onClick={() => !passwordResetBusy && setPasswordResetTarget(null)}>
              <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="admin-set-password-title" onClick={(event) => event.stopPropagation()}>
                <h2 id="admin-set-password-title" className="text-lg font-black text-slate-900">Set new password</h2>
                <p className="mt-1 break-words text-sm text-slate-500">{passwordResetTarget.name || passwordResetTarget.email || 'Selected user'}</p>
                <div className="mt-4 space-y-3">
                  <label className="block text-sm font-bold text-slate-700">New password<input autoFocus type="password" value={passwordResetPassword} onChange={(event) => setPasswordResetPassword(event.target.value)} autoComplete="new-password" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-brand-orange" placeholder="12+ characters" /></label>
                  <label className="block text-sm font-bold text-slate-700">Confirm password<input type="password" value={passwordResetConfirmation} onChange={(event) => setPasswordResetConfirmation(event.target.value)} autoComplete="new-password" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-brand-orange" placeholder="Repeat the password" /></label>
                  <label className="flex items-start gap-3 rounded-xl border border-orange-100 bg-orange-50 p-3 text-sm text-slate-700"><input type="checkbox" checked={passwordResetForceChange} onChange={(event) => setPasswordResetForceChange(event.target.checked)} className="mt-0.5 h-4 w-4 accent-orange-500" /><span><strong className="block text-slate-900">Force change at next login</strong><span className="text-xs text-slate-600">Recommended when sharing a temporary password.</span></span></label>
                  <p className="text-xs text-slate-500">Password must include uppercase, lowercase, number, and special character. Existing sessions will be revoked.</p>
                  {passwordResetError && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{passwordResetError}</p>}
                </div>
                <div className="mt-5 flex gap-2"><button type="button" onClick={() => setPasswordResetTarget(null)} disabled={passwordResetBusy} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-600">Cancel</button><button type="button" onClick={() => void handleSetPassword()} disabled={passwordResetBusy || !passwordResetPassword || !passwordResetConfirmation} className="flex-1 rounded-xl bg-brand-orange px-4 py-3 text-sm font-black text-white disabled:opacity-50">{passwordResetBusy ? 'Saving…' : 'Set password'}</button></div>
              </div>
            </div>,
            document.body,
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
    const [prayerColumnWidths, setPrayerColumnWidths] = useState({
        number: 60,
        user: 190,
        content: 420,
        engagement: 160,
        status: 130,
        actions: 110,
    });

    const resizePrayerColumn = (column: keyof typeof prayerColumnWidths, event: React.MouseEvent<HTMLSpanElement>) => {
        event.preventDefault();
        const startX = event.clientX;
        const startWidth = prayerColumnWidths[column];
        const handleMove = (moveEvent: MouseEvent) => {
            const nextWidth = Math.max(80, startWidth + moveEvent.clientX - startX);
            setPrayerColumnWidths((current) => ({ ...current, [column]: nextWidth }));
        };
        const handleUp = () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
        };
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
    };

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
                <div className="overflow-x-auto">
                    <table className="cmg-admin-compact-table min-w-[1070px] w-full table-fixed border-collapse text-left">
                        <colgroup>
                            <col style={{ width: prayerColumnWidths.number }} />
                            <col style={{ width: prayerColumnWidths.user }} />
                            <col style={{ width: prayerColumnWidths.content }} />
                            <col style={{ width: prayerColumnWidths.engagement }} />
                            <col style={{ width: prayerColumnWidths.status }} />
                            <col style={{ width: prayerColumnWidths.actions }} />
                        </colgroup>
                        <thead className="bg-slate-900 text-[10px] font-black uppercase tracking-wide text-white">
                            <tr>
                                <th style={{ width: prayerColumnWidths.number }} className="relative px-2 py-2">#<span onMouseDown={(event) => resizePrayerColumn('number', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                                <th style={{ width: prayerColumnWidths.user }} className="relative px-3 py-2">User<span onMouseDown={(event) => resizePrayerColumn('user', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                                <th style={{ width: prayerColumnWidths.content }} className="relative px-3 py-2">Content<span onMouseDown={(event) => resizePrayerColumn('content', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                                <th style={{ width: prayerColumnWidths.engagement }} className="relative px-3 py-2">Engagement<span onMouseDown={(event) => resizePrayerColumn('engagement', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                                <th style={{ width: prayerColumnWidths.status }} className="relative px-3 py-2">Status<span onMouseDown={(event) => resizePrayerColumn('status', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                                <th style={{ width: prayerColumnWidths.actions }} className="relative px-3 py-2">Actions<span onMouseDown={(event) => resizePrayerColumn('actions', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPrayers.map((prayer, index) => (
                                <tr key={prayer.id} className="h-9 border-b border-slate-200 text-xs text-slate-700 transition hover:bg-slate-50">
                                    <td className="px-2 py-1.5 font-black text-slate-400">{index + 1}</td>
                                    <td className="px-3 py-1.5">
                                        <div className="truncate font-black text-slate-900" title={prayer.user}>{prayer.user}</div>
                                        <div className="truncate text-[10px] italic text-slate-400" title={prayer.date}>{prayer.date}</div>
                                    </td>
                                    <td className="px-3 py-1.5">
                                        <p className="truncate text-slate-600" title={prayer.content}>{prayer.content}</p>
                                    </td>
                                    <td className="px-3 py-1.5">
                                        <div className="flex items-center gap-4 text-slate-500">
                                            <span className="flex items-center gap-1"><Heart size={14} /> {prayer.likes}</span>
                                            <span className="flex items-center gap-1"><MessageSquare size={14} /> {prayer.comments}</span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-1.5">
                                        {prayer.reported ? (
                                            <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">Reported</span>
                                        ) : (
                                            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">Active</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-1.5">
                                        <button className="rounded-full p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500" title="Delete">
                                            <Trash2 size={18} />
                                        </button>
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
                    className="absolute inset-0 z-40 bg-transparent"
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
    const [connectionColumnWidths, setConnectionColumnWidths] = useState({
        initiator: 190,
        recipient: 190,
        status: 130,
        connectedOn: 150,
        lastMessage: 360,
        actions: 110,
    });

    const filteredConnections = connections.filter(conn =>
        conn.userA.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conn.userB.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const resizeConnectionColumn = (column: keyof typeof connectionColumnWidths, event: React.MouseEvent<HTMLSpanElement>) => {
        event.preventDefault();
        const startX = event.clientX;
        const startWidth = connectionColumnWidths[column];
        const handleMove = (moveEvent: MouseEvent) => {
            const nextWidth = Math.max(80, startWidth + moveEvent.clientX - startX);
            setConnectionColumnWidths((current) => ({ ...current, [column]: nextWidth }));
        };
        const handleUp = () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
        };
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
    };

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
                <div className="overflow-x-auto">
                    <table className="cmg-admin-compact-table min-w-[1130px] w-full table-fixed border-collapse text-left">
                        <colgroup>
                            <col style={{ width: connectionColumnWidths.initiator }} />
                            <col style={{ width: connectionColumnWidths.recipient }} />
                            <col style={{ width: connectionColumnWidths.status }} />
                            <col style={{ width: connectionColumnWidths.connectedOn }} />
                            <col style={{ width: connectionColumnWidths.lastMessage }} />
                            <col style={{ width: connectionColumnWidths.actions }} />
                        </colgroup>
                        <thead className="bg-slate-900 text-[10px] font-black uppercase tracking-wide text-white">
                            <tr>
                                <th style={{ width: connectionColumnWidths.initiator }} className="relative px-3 py-2">Initiator<span onMouseDown={(event) => resizeConnectionColumn('initiator', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                                <th style={{ width: connectionColumnWidths.recipient }} className="relative px-3 py-2">Recipient<span onMouseDown={(event) => resizeConnectionColumn('recipient', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                                <th style={{ width: connectionColumnWidths.status }} className="relative px-3 py-2">Status<span onMouseDown={(event) => resizeConnectionColumn('status', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                                <th style={{ width: connectionColumnWidths.connectedOn }} className="relative px-3 py-2">Connected On<span onMouseDown={(event) => resizeConnectionColumn('connectedOn', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                                <th style={{ width: connectionColumnWidths.lastMessage }} className="relative px-3 py-2">Last Message<span onMouseDown={(event) => resizeConnectionColumn('lastMessage', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                                <th style={{ width: connectionColumnWidths.actions }} className="relative px-3 py-2">Actions<span onMouseDown={(event) => resizeConnectionColumn('actions', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredConnections.map((conn) => (
                                <tr key={conn.id} className="h-9 border-b border-slate-200 text-xs text-slate-700 transition hover:bg-slate-50">
                                    <td className="px-3 py-1.5 font-black text-slate-900">{conn.userA}</td>
                                    <td className="px-3 py-1.5 font-black text-slate-900">{conn.userB}</td>
                                    <td className="px-3 py-1.5">
                                         <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            conn.status === 'Matched' ? 'bg-green-100 text-green-800' :
                                            conn.status === 'Blocked' ? 'bg-red-100 text-red-800' :
                                            'bg-yellow-100 text-yellow-800'
                                        }`}>
                                            {conn.status}
                                        </span>
                                    </td>
                                    <td className="px-3 py-1.5 text-slate-500">{conn.date}</td>
                                    <td className="max-w-[360px] truncate px-3 py-1.5 text-slate-500" title={conn.lastMessage}>{conn.lastMessage}</td>
                                    <td className="px-3 py-1.5">
                                        <button className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
                                            <MoreHorizontal size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const AdminMessagesView: React.FC<{
    canSend: boolean;
    onManageAudiences: () => void;
}> = ({ canSend, onManageAudiences }) => {
    const { confirmAdminAction } = useAdminActionConfirmation();
    const [connections, setConnections] = useState<any[]>([]);
    const [availableUsers, setAvailableUsers] = useState<Array<User & { firestoreDocId: string; status?: string }>>([]);
    const [audiences, setAudiences] = useState<DistributionGroup[]>([]);
    const [recipientMode, setRecipientMode] = useState<AdminMessageRecipientMode>('all');
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
    const [selectedAudienceIds, setSelectedAudienceIds] = useState<Set<string>>(new Set());
    const [recipientSearch, setRecipientSearch] = useState('');
    const [messageText, setMessageText] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [audiencesLoading, setAudiencesLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [sendStatus, setSendStatus] = useState('');

    useEffect(() => {
        let active = true;
        const load = async () => {
            const [groupResult, usersResult, connectionsResult] = await Promise.all([
                listAdminDistributionGroups().catch((loadError) => {
                    console.error('Unable to load message audiences:', loadError);
                    return [] as DistributionGroup[];
                }),
                getAdminUsers().catch((loadError) => {
                    console.error('Unable to load message recipients:', loadError);
                    return [] as Array<User & { firestoreDocId: string }>;
                }),
                getAdminConnections().catch((loadError) => {
                    console.error('Unable to load conversations:', loadError);
                    return [] as any[];
                }),
            ]);
            if (!active) return;
            setAudiences(groupResult);
            setAvailableUsers(usersResult);
            setConnections(connectionsResult);
            setAudiencesLoading(false);
            setLoading(false);
        };
        void load();
        return () => {
            active = false;
        };
    }, []);

    const isActiveRecipient = (user: User & { status?: string }) =>
        user.isBlocked !== true && String(user.status || '').toLowerCase() !== 'blocked';
    const activeUsers = availableUsers.filter((user) =>
        isActiveRecipient(user) && (user.firestoreDocId || user.id) !== auth.currentUser?.uid,
    );
    const selectedAudiences = audiences.filter((audience) => selectedAudienceIds.has(audience.id));
    const selectedAudienceNames = selectedAudiences.map((audience) => audience.name);
    const selectedAudienceSummary = selectedAudiences.length === 0
        ? 'Choose saved audiences'
        : `${selectedAudiences.length} selected · ${selectedAudienceNames.slice(0, 2).join(', ')}${selectedAudiences.length > 2 ? ` +${selectedAudiences.length - 2} more` : ''}`;
    const selectedUsers = availableUsers.filter((user) => selectedUserIds.has(user.firestoreDocId || user.id));
    const filteredUsers = activeUsers.filter((user) => {
        const term = recipientSearch.trim().toLowerCase();
        if (!term) return true;
        return [user.name, user.email, user.location, user.gender]
            .some((value) => String(value || '').toLowerCase().includes(term));
    });
    const filteredConnections = connections.filter((connection) => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return true;
        return [connection.userA, connection.userB, connection.lastMessage]
            .some((value) => String(value || '').toLowerCase().includes(term));
    });
    const audienceCriteriaSummary = (audience: DistributionGroup) => audience.criteria?.mode === 'selected'
        ? `Custom users · ${audience.memberCount ?? audience.criteria.userIds?.length ?? 0} members`
        : [
            audience.criteria?.gender?.length ? `Gender: ${audience.criteria.gender.join(', ')}` : '',
            audience.criteria?.country?.length ? `Country: ${audience.criteria.country.join(', ')}` : '',
            audience.criteria?.locations?.length ? `Location: ${audience.criteria.locations.join(', ')}` : '',
            `State: ${audience.criteria?.accountState || 'active'}`,
        ].filter(Boolean).join(' · ');

    const toggleUser = (userId: string) => {
        setSelectedUserIds((current) => {
            const next = new Set(current);
            if (next.has(userId)) next.delete(userId);
            else next.add(userId);
            return next;
        });
    };

    const toggleAudienceSelection = (audienceId: string) => {
        setSelectedAudienceIds((current) => {
            const next = new Set(current);
            if (next.has(audienceId)) next.delete(audienceId);
            else next.add(audienceId);
            return next;
        });
        setError('');
        setSendStatus('');
    };

    const selectRecipientMode = (mode: AdminMessageRecipientMode) => {
        setRecipientMode(mode);
        setError('');
        setSendStatus('');
    };

    const handleSend = async () => {
        const text = messageText.trim();
        if (!canSend) {
            setError('Your admin account does not have permission to send broadcast messages.');
            return;
        }
        if (!text) {
            setError('Enter a message before sending.');
            return;
        }
        if (recipientMode === 'selected' && selectedUserIds.size === 0) {
            setError('Select at least one user.');
            return;
        }
        if (recipientMode === 'audience' && selectedAudienceIds.size === 0) {
            setError('Choose at least one saved audience.');
            return;
        }
        const recipientDescription = recipientMode === 'all'
            ? `all ${activeUsers.length} active users`
            : recipientMode === 'selected'
                ? `${selectedUserIds.size} selected users`
                : `${selectedAudiences.length} saved audience${selectedAudiences.length === 1 ? '' : 's'} (${selectedAudienceNames.join(', ')}). Overlapping members will receive one message, and inactive users plus your Admin account will be excluded.`;
        const confirmed = await confirmAdminAction({
            title: 'Send admin message?',
            description: `Send this message to ${recipientDescription}. This will create a conversation message for each active recipient.`,
        });
        if (!confirmed) return;
        setSending(true);
        setError('');
        setSendStatus('');
        try {
            const result = await adminSendMessage({
                text,
                recipientMode,
                ...(recipientMode === 'selected' ? { userIds: [...selectedUserIds] } : {}),
                ...(recipientMode === 'audience' ? { audienceIds: [...selectedAudienceIds] } : {}),
            });
            setSendStatus(`Message sent to ${result.sentCount} user${result.sentCount === 1 ? '' : 's'}.`);
            setMessageText('');
        } catch (sendError: any) {
            setError(sendError?.message || 'Unable to send the admin message.');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-orange">Ops · Messages</p>
                        <h3 className="mt-1 text-2xl font-black leading-tight text-slate-900">Send a message</h3>
                        <p className="mt-1 text-sm text-slate-500">Choose recipients, write your message, and send securely.</p>
                    </div>
                    <button type="button" onClick={onManageAudiences} className="shrink-0 rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">Manage audiences</button>
                </div>

                {!canSend && <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">Your account can view Messages, but does not have the message-sending permission.</div>}
                {(error || sendStatus) && <div className={`mt-4 rounded-xl px-4 py-3 text-sm font-semibold ${error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{error || sendStatus}</div>}

                <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)]">
                    <div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <label htmlFor="admin-recipient-mode" className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">Recipient type</label>
                            <div className="relative">
                                <select id="admin-recipient-mode" value={recipientMode} onChange={(event) => selectRecipientMode(event.target.value as AdminMessageRecipientMode)} className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-3 pr-11 text-sm font-black text-slate-800 focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/20">
                                    <option value="all">All active users · {activeUsers.length} recipients</option>
                                    <option value="selected">Selected users · {selectedUserIds.size} added</option>
                                    <option value="audience">Saved audience · {selectedAudienceSummary}</option>
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} strokeWidth={2.5} aria-hidden="true" />
                            </div>
                        </div>

                        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            {recipientMode === 'all' && <div className="flex items-center justify-between gap-3 rounded-xl border border-green-100 bg-green-50 p-4"><div><p className="text-sm font-black text-slate-900">All active users</p><p className="mt-1 text-xs font-semibold text-slate-600">The server will confirm eligibility and exclude you when sending.</p></div><span className="shrink-0 text-2xl font-black text-green-700">{activeUsers.length}</span></div>}
                            {recipientMode === 'selected' && (
                                <div>
                                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h4 className="text-sm font-black text-slate-800">Recipients</h4><p className="text-xs text-slate-500">Search active users and add them to this message.</p></div><div className="flex items-center gap-2"><span className="text-xs font-black text-brand-orange">{selectedUserIds.size} added</span>{selectedUserIds.size > 0 && <button type="button" onClick={() => setSelectedUserIds(new Set())} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-black text-slate-600 hover:bg-slate-100">Clear all</button>}</div></div>
                                    <div className="mb-3 min-h-10 rounded-xl border border-dashed border-slate-300 bg-white p-2">
                                        {selectedUsers.length === 0 ? <p className="px-2 py-1 text-xs text-slate-400">No recipients added yet.</p> : <div className="flex flex-wrap gap-2">{selectedUsers.map((user) => { const userId = user.firestoreDocId || user.id; return <button key={userId} type="button" onClick={() => toggleUser(userId)} className="inline-flex max-w-full items-center gap-1 rounded-full bg-orange-100 px-3 py-1.5 text-left text-xs font-black text-orange-800 hover:bg-orange-200" title="Remove recipient"><span className="max-w-[16rem] break-words">{user.name || user.email || 'Unnamed user'}</span><X size={13} aria-hidden="true" /></button>; })}</div>}
                                    </div>
                                    <div className="relative mb-3"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} /><input type="search" value={recipientSearch} onChange={(event) => setRecipientSearch(event.target.value)} placeholder="Search by name, email, location, or gender" aria-label="Search active users" className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-9 pr-3 text-sm" /></div>
                                    <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2">{filteredUsers.length === 0 ? <p className="p-3 text-sm text-slate-500">No active users match this search.</p> : filteredUsers.map((user) => { const userId = user.firestoreDocId || user.id; const selected = selectedUserIds.has(userId); return <button key={userId} type="button" role="option" aria-selected={selected} onClick={() => toggleUser(userId)} className={`cmg-admin-content-button flex w-full min-w-0 items-center gap-3 rounded-lg px-3 py-2 text-left transition ${selected ? 'bg-orange-50' : 'hover:bg-slate-50'}`}><span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${selected ? 'border-brand-orange bg-brand-orange text-white' : 'border-slate-300 text-transparent'}`}><CheckCircle size={13} aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block break-words text-sm font-bold text-slate-800">{user.name || 'Unnamed user'}</span><span className="block break-words text-xs text-slate-500">{user.email || 'No email'} · {user.location || user.country || 'No location'}</span></span><span className={`shrink-0 text-[10px] font-black uppercase ${selected ? 'text-brand-orange' : 'text-slate-400'}`}>{selected ? 'Added' : 'Add'}</span></button>; })}</div>
                                </div>
                            )}
                            {recipientMode === 'audience' && <div><label className="mb-2 block text-sm font-black text-slate-800">Saved audiences</label><details className="group relative"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-800 shadow-sm"><span className="min-w-0 break-words">{selectedAudienceSummary}</span><ChevronDown className="shrink-0 text-slate-500 transition-transform group-open:rotate-180" size={20} strokeWidth={2.5} aria-hidden="true" /></summary><div className="absolute left-0 right-0 z-20 mt-2 max-h-64 space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl">{audiencesLoading ? <p className="p-3 text-sm text-slate-500">Loading audiences…</p> : audiences.length === 0 ? <p className="p-3 text-sm text-slate-500">No saved audiences available.</p> : audiences.map((audience) => <label key={audience.id} className="flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2 hover:bg-orange-50"><input type="checkbox" checked={selectedAudienceIds.has(audience.id)} onChange={() => toggleAudienceSelection(audience.id)} className="mt-0.5 h-4 w-4 shrink-0 accent-orange-500" /><span className="min-w-0"><span className="block break-words text-sm font-bold text-slate-800">{audience.name} · {audience.memberCount ?? 0} members</span><span className="mt-0.5 block break-words text-xs text-slate-500">{audience.description || audienceCriteriaSummary(audience)}</span></span></label>)}</div></details>{selectedAudiences.length > 0 && <div className="mt-3 rounded-xl border border-orange-100 bg-orange-50/60 p-3"><p className="text-sm font-black text-slate-800">{selectedAudiences.length} audience{selectedAudiences.length === 1 ? '' : 's'} selected</p><p className="mt-1 break-words text-xs text-slate-600">{selectedAudienceNames.join(', ')}</p><p className="mt-2 text-[11px] font-semibold text-orange-800">Overlapping members will receive one message.</p></div>}</div>}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-orange-100 bg-orange-50/40 p-4">
                        <div className="mb-2 flex items-center justify-between gap-3"><label htmlFor="admin-message-text" className="text-sm font-black text-slate-800">Message</label><span className="text-xs font-black text-slate-400">{messageText.length}/2000</span></div>
                        <textarea id="admin-message-text" value={messageText} onChange={(event) => setMessageText(event.target.value.slice(0, 2000))} rows={10} placeholder="Write the message users should receive…" className="w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 shadow-sm focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/20" />
                        <div className="mt-4 rounded-xl border border-orange-100 bg-white p-3"><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Send summary</p><p className="mt-1 break-words text-sm font-black text-slate-800">{recipientMode === 'all' ? `All active users · ${activeUsers.length}` : recipientMode === 'selected' ? `${selectedUserIds.size} selected users` : `${selectedAudiences.length} saved audience${selectedAudiences.length === 1 ? '' : 's'} · ${selectedAudienceNames.join(', ')}`}</p><p className="mt-1 text-xs text-slate-500">Final eligibility is checked securely before delivery.</p></div>
                        <button type="button" onClick={() => void handleSend()} disabled={sending || !canSend || !messageText.trim()} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-orange px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-brand-orange/90 disabled:cursor-not-allowed disabled:opacity-50"><Send size={16} />{sending ? 'Sending…' : 'Send message'}</button>
                    </div>
                </div>
            </section>

            <details className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm font-black text-slate-800"><span>Recent conversations</span><span className="text-xs font-bold text-slate-400">{connections.length} available</span></summary>
                <div className="border-t border-slate-100 p-4">
                    <div className="mb-4 flex justify-end"><div className="relative w-full sm:w-72"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} /><input type="search" placeholder="Search conversations..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20" /></div></div>
                    {loading ? <div className="p-8 text-center text-sm text-gray-500">Loading conversations...</div> : filteredConnections.length === 0 ? <div className="p-8 text-center text-sm text-gray-500">No conversations found.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead className="border-b border-gray-200 bg-gray-50"><tr><th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-gray-600">Conversation</th><th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-gray-600">Latest message</th><th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-gray-600">Last activity</th><th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-gray-600">Status</th></tr></thead><tbody className="divide-y divide-gray-100">{filteredConnections.map((connection) => <tr key={connection.id} className="hover:bg-gray-50"><td className="px-4 py-3"><div className="font-medium text-gray-900">{connection.userA}</div><div className="text-xs text-gray-500">with {connection.userB}</div></td><td className="max-w-[360px] break-words px-4 py-3 text-sm text-gray-600" title={connection.lastMessage}>{connection.lastMessage || 'No messages yet'}</td><td className="px-4 py-3 text-sm text-gray-500">{connection.date}</td><td className="px-4 py-3"><span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">Active</span></td></tr>)}</tbody></table></div>}
                </div>
            </details>
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
  <div className="relative flex min-h-[132px] w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
    <div className="mb-3 flex items-center justify-center gap-2">
        <div className="rounded-xl bg-slate-50 p-2">{icon || <Activity size={18} className="text-slate-400" />}</div>
        <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wide ${isNegative ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>{change}</span>
    </div>
    <p className="w-full whitespace-normal break-words text-[11px] font-black leading-tight text-slate-500">{title}</p>
    <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">{value}</h3>
  </div>
);

export default AdminDashboard;


type DistributionGroupForm = {
    name: string;
    description: string;
    criteria: DistributionGroupCriteria;
};

const emptyDistributionCriteria = (): DistributionGroupCriteria => ({
    mode: 'criteria',
    userIds: [],
    gender: [],
    country: [],
    locations: [],
    accountState: 'active',
});

const DistributionGroupsView = ({ focusGroupId, onOpenUser }: { focusGroupId?: string | null; onOpenUser?: (userId: string) => void }) => {
    const { confirmAdminAction } = useAdminActionConfirmation();
    const [manageAudiencePageOpen, setManageAudiencePageOpen] = useState(false);
    const [groups, setGroups] = useState<DistributionGroup[]>([]);
    const [availableUsers, setAvailableUsers] = useState<Array<any>>([]);
    const [userSearch, setUserSearch] = useState('');
    const [usersLoading, setUsersLoading] = useState(false);
    const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());
    const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
    const [groupColumnWidths, setGroupColumnWidths] = useState({ number: 70, name: 210, description: 250, members: 100, criteria: 260, type: 110, actions: 130 });
    const [audienceMemberColumnWidths, setAudienceMemberColumnWidths] = useState({ number: 70, user: 220, email: 240, location: 180, status: 120 });
    const [audienceMembers, setAudienceMembers] = useState<Record<string, Array<any>>>({});
    const [audienceMembersLoading, setAudienceMembersLoading] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [status, setStatus] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<DistributionGroupForm>({ name: '', description: '', criteria: emptyDistributionCriteria() });
    const [preview, setPreview] = useState<{ count: number; preview: Array<Record<string, string>> } | null>(null);

    const loadGroups = async () => {
        setLoading(true);
        setError('');
        try {
            setGroups(await listAdminDistributionGroups());
        } catch (loadError: any) {
            setError(loadError?.message || 'Unable to load distribution groups.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadGroups();
    }, []);

    useEffect(() => {
        if (form.criteria.mode !== 'selected' || availableUsers.length > 0) return;
        setUsersLoading(true);
        void getAdminUsers()
            .then((users) => setAvailableUsers(users))
            .catch((loadError: any) => setError(loadError?.message || 'Unable to load users.'))
            .finally(() => setUsersLoading(false));
    }, [form.criteria.mode, availableUsers.length]);

    useEffect(() => {
        if (!focusGroupId || !groups.some((group) => group.id === focusGroupId)) return;
        setExpandedGroupIds((current) => new Set([...current, focusGroupId]));
        window.setTimeout(() => document.getElementById(`distribution-group-${focusGroupId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0);
    }, [focusGroupId, groups]);

    const resizeGroupColumn = (column: keyof typeof groupColumnWidths, event: React.MouseEvent<HTMLSpanElement>) => {
        event.preventDefault();
        const startX = event.clientX;
        const startWidth = groupColumnWidths[column];
        const handleMove = (moveEvent: MouseEvent) => {
            const nextWidth = Math.max(80, startWidth + moveEvent.clientX - startX);
            setGroupColumnWidths((current) => ({ ...current, [column]: nextWidth }));
        };
        const handleUp = () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
        };
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
    };

    const resizeAudienceMemberColumn = (column: keyof typeof audienceMemberColumnWidths, event: React.MouseEvent<HTMLSpanElement>) => {
        event.preventDefault();
        const startX = event.clientX;
        const startWidth = audienceMemberColumnWidths[column];
        const handleMove = (moveEvent: MouseEvent) => {
            const nextWidth = Math.max(80, startWidth + moveEvent.clientX - startX);
            setAudienceMemberColumnWidths((current) => ({ ...current, [column]: nextWidth }));
        };
        const handleUp = () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
        };
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
    };

    const toggleAudienceExpanded = async (group: DistributionGroup) => {
        const willExpand = !expandedGroupIds.has(group.id);
        setExpandedGroupIds((current) => {
            const next = new Set(current);
            if (next.has(group.id)) next.delete(group.id);
            else next.add(group.id);
            return next;
        });
        if (!willExpand || audienceMembers[group.id] || audienceMembersLoading.has(group.id)) return;
        setAudienceMembersLoading((current) => new Set([...current, group.id]));
        try {
            const result = await previewAdminDistributionGroup({ groupId: group.id });
            setAudienceMembers((current) => ({ ...current, [group.id]: result.preview || [] }));
        } catch (loadError: any) {
            setError(loadError?.message || 'Unable to load audience members.');
        } finally {
            setAudienceMembersLoading((current) => {
                const next = new Set(current);
                next.delete(group.id);
                return next;
            });
        }
    };

    const toggleAudienceSelection = (event: React.ChangeEvent<HTMLInputElement>, groupId: string) => {
        event.stopPropagation();
        setSelectedGroupIds((current) => {
            const next = new Set(current);
            if (event.target.checked) next.add(groupId);
            else next.delete(groupId);
            return next;
        });
    };

    const audienceCriteriaSummary = (group: DistributionGroup) => group.criteria?.mode === 'selected'
        ? `Custom users: ${group.criteria?.userIds?.length || group.memberCount || 0}`
        : `Gender: ${criterionLabel(group.criteria?.gender)} · Country: ${criterionLabel(group.criteria?.country)} · Location: ${criterionLabel(group.criteria?.locations)} · State: ${group.criteria?.accountState || 'active'}`;

    const resetForm = () => {
        setEditingId(null);
        setForm({ name: '', description: '', criteria: emptyDistributionCriteria() });
        setPreview(null);
        setUserSearch('');
        setStatus('');
    };

    const closeAudienceManager = () => {
        resetForm();
        setManageAudiencePageOpen(false);
    };

    const updateCriterion = (key: keyof DistributionGroupCriteria, value: string) => {
        setForm((current) => ({
            ...current,
            criteria: {
                ...current.criteria,
                [key]: key === 'accountState' ? value : (value ? [value.trim().toLowerCase()] : []),
            } as DistributionGroupCriteria,
        }));
        setPreview(null);
    };

    const setAudienceMode = (mode: 'criteria' | 'selected') => {
        setForm((current) => ({
            ...current,
            criteria: {
                ...current.criteria,
                mode,
                userIds: mode === 'selected' ? (current.criteria.userIds || []) : [],
            },
        }));
        setPreview(null);
    };

    const toggleSelectedUser = (userId: string) => {
        setForm((current) => {
            const selected = new Set(current.criteria.userIds || []);
            if (selected.has(userId)) selected.delete(userId);
            else selected.add(userId);
            return { ...current, criteria: { ...current.criteria, mode: 'selected', userIds: [...selected] } };
        });
        setPreview(null);
    };

    const editGroup = (group: DistributionGroup) => {
        setEditingId(group.id);
        setForm({
            name: group.name,
            description: group.description || '',
            criteria: {
                mode: group.criteria?.mode || (group.criteria?.userIds?.length ? 'selected' : 'criteria'),
                userIds: group.criteria?.userIds || [],
                gender: group.criteria?.gender || [],
                country: group.criteria?.country || [],
                locations: group.criteria?.locations || [],
                accountState: group.criteria?.accountState || 'active',
            },
        });
        setPreview(null);
        setStatus('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const saveGroup = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!form.name.trim()) {
            setError('Enter a name for this distribution group.');
            return;
        }
        const confirmed = await confirmAdminAction({
            title: editingId ? 'Update distribution group?' : 'Create distribution group?',
            description: editingId
                ? `Confirm the audience changes for ${form.name || 'this distribution group'}.`
                : `Confirm creation of the ${form.name || 'new'} message distribution group.`,
        });
        if (!confirmed) return;
        setSaving(true);
        setError('');
        setStatus('');
        try {
            const successMessage = editingId ? 'Distribution group updated.' : 'Distribution group created.';
            if (editingId) {
                await updateAdminDistributionGroup({ groupId: editingId, ...form });
            } else {
                await createAdminDistributionGroup(form);
            }
            resetForm();
            setStatus(successMessage);
            await loadGroups();
        } catch (saveError: any) {
            setError(saveError?.message || 'Unable to save distribution group.');
        } finally {
            setSaving(false);
        }
    };

    const previewGroup = async () => {
        setError('');
        try {
            setPreview(await previewAdminDistributionGroup({ criteria: form.criteria }));
        } catch (previewError: any) {
            setError(previewError?.message || 'Unable to preview this audience.');
        }
    };

    const removeGroup = async (group: DistributionGroup) => {
        const confirmed = await confirmAdminAction({
            title: 'Delete distribution group?',
            description: `Permanently delete the ${group.name} audience definition.`,
        });
        if (!confirmed) return;
        setError('');
        try {
            await deleteAdminDistributionGroup(group.id);
            setStatus('Distribution group deleted.');
            if (editingId === group.id) resetForm();
            await loadGroups();
        } catch (deleteError: any) {
            setError(deleteError?.message || 'Unable to delete distribution group.');
        }
    };

    const criterionLabel = (values?: string[]) => values?.length ? values.join(', ') : 'Any';
    const selectedUserIds = form.criteria.userIds || [];
    const visibleUsers = availableUsers.filter((user) => {
        const term = userSearch.trim().toLowerCase();
        if (!term) return true;
        return [user.name, user.email, user.location, user.gender]
            .some((value) => String(value || '').toLowerCase().includes(term));
    });

    return (
        <div className="flex flex-col space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="text-lg font-semibold text-gray-800">Message Distribution Groups</h3>
                    <p className="text-sm text-gray-500">Reusable audiences for future admin messages.</p>
                </div>
                <button type="button" onClick={() => { resetForm(); setManageAudiencePageOpen(true); }} className="rounded-xl bg-brand-orange px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-brand-orange/90">Manage Audience</button>
            </div>

            {(error || status) && (
                <div className={`rounded-xl px-4 py-3 text-sm font-semibold ${error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`} role="status">
                    {error || status}
                </div>
            )}

            {manageAudiencePageOpen && (
            <div className="absolute inset-0 z-[120] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <form onSubmit={saveGroup} className="max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                        <h4 className="font-bold text-gray-800">{editingId ? 'Edit distribution group' : 'Create distribution group'}</h4>
                        <p className="text-xs text-gray-500">Audience membership is calculated from current user profiles.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={closeAudienceManager} aria-label="Close audience editor" title="Close" className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">×</button>
                        <button type="button" onClick={closeAudienceManager} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600">Back to Audiences</button>
                    </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    <label className="text-sm font-semibold text-gray-700">Group name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="All males" className="mt-1 w-full rounded-lg border border-gray-200 p-2.5 font-normal" maxLength={80} /></label>
                    <label className="text-sm font-semibold text-gray-700">Description<input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Active male members" className="mt-1 w-full rounded-lg border border-gray-200 p-2.5 font-normal" maxLength={240} /></label>
                    <label className="text-sm font-semibold text-gray-700 md:col-span-2">Audience type<select value={form.criteria.mode || 'criteria'} onChange={(event) => setAudienceMode(event.target.value as 'criteria' | 'selected')} className="mt-1 w-full rounded-lg border border-gray-200 p-2.5 font-normal"><option value="criteria">Profile criteria (gender, country, city)</option><option value="selected">Selected users (custom audience)</option></select></label>
                    {form.criteria.mode !== 'selected' ? (
                        <>
                            <label className="text-sm font-semibold text-gray-700">Gender<select value={form.criteria.gender[0] || ''} onChange={(event) => updateCriterion('gender', event.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 p-2.5 font-normal"><option value="">Any gender</option><option value="male">Male</option><option value="female">Female</option></select></label>
                            <label className="text-sm font-semibold text-gray-700">Country<select value={form.criteria.country[0] || ''} onChange={(event) => updateCriterion('country', event.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 p-2.5 font-normal"><option value="">Any country</option><option value="ghana">Ghana</option><option value="international">International</option></select></label>
                            <label className="text-sm font-semibold text-gray-700">City / location<input value={form.criteria.locations[0] || ''} onChange={(event) => updateCriterion('locations', event.target.value)} placeholder="Accra or Kumasi" className="mt-1 w-full rounded-lg border border-gray-200 p-2.5 font-normal" /></label>
                            <label className="text-sm font-semibold text-gray-700">Account state<select value={form.criteria.accountState} onChange={(event) => updateCriterion('accountState', event.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 p-2.5 font-normal"><option value="active">Active users only</option><option value="blocked">Blocked users only</option><option value="any">Any account state</option></select></label>
                        </>
                    ) : (
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 md:col-span-2">
                            <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                                <div><h5 className="font-bold text-gray-800">Select users for this custom audience</h5><p className="text-xs text-gray-500">Selected users can be diverse by gender, city, country, or any other profile field.</p></div>
                                <span className="text-sm font-black text-brand-blue">{selectedUserIds.length} selected</span>
                            </div>
                            <input type="search" value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Search by name, email, location, or gender" className="mb-3 w-full rounded-lg border border-gray-200 bg-white p-2.5 text-sm" />
                            <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2">
                                {usersLoading ? <p className="p-3 text-sm text-gray-500">Loading users…</p> : visibleUsers.length === 0 ? <p className="p-3 text-sm text-gray-500">No users found.</p> : visibleUsers.map((user) => {
                                    const userId = user.firestoreDocId || user.id;
                                    const checked = selectedUserIds.includes(userId);
                                    return <label key={userId} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-orange-50"><input type="checkbox" checked={checked} onChange={() => toggleSelectedUser(userId)} className="h-4 w-4 accent-brand-orange" /><span className="min-w-0"><span className="block truncate text-sm font-bold text-gray-800">{user.name || 'Unnamed user'}</span><span className="block truncate text-xs text-gray-500">{user.email || 'No email'} · {user.location || user.country || 'No location'}</span></span></label>;
                                })}
                            </div>
                        </div>
                    )}
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                    <button type="submit" disabled={saving} className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : editingId ? 'Update group' : 'Create group'}</button>
                    <button type="button" onClick={() => void previewGroup()} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50">Preview audience</button>
                    <button type="button" onClick={closeAudienceManager} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50">Cancel</button>
                    {preview && <span className="text-sm font-bold text-brand-blue">{preview.count} matching user{preview.count === 1 ? '' : 's'}</span>}
                </div>
            </form>
            </div>
            )}

            <section className="order-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                    <div>
                        <h4 className="font-black text-slate-800">Saved audiences</h4>
                        <p className="mt-1 text-xs text-slate-500">Expand an audience to review its criteria or selected users.</p>
                    </div>
                    <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-600">{groups.length} audiences</span>
                </div>
                {selectedGroupIds.size > 0 && (
                    <div className="flex flex-wrap items-center gap-2 border-b border-orange-200 bg-orange-50 px-4 py-2 text-xs">
                        <strong>{selectedGroupIds.size} selected</strong>
                        <button type="button" onClick={() => setExpandedGroupIds((current) => new Set([...current, ...selectedGroupIds]))} className="rounded-lg bg-white px-3 py-1.5 font-black text-slate-700">Expand selected</button>
                        <button type="button" onClick={() => setSelectedGroupIds(new Set())} className="ml-auto rounded-lg px-3 py-1.5 font-black text-slate-500">Clear</button>
                    </div>
                )}
                {loading ? <div className="p-6 text-sm text-slate-500">Loading audiences…</div> : groups.length === 0 ? <div className="p-6 text-sm text-slate-500">No distribution groups created yet.</div> : (
                    <div className="overflow-x-auto">
                        <table className="cmg-admin-compact-table min-w-[960px] w-full table-fixed border-collapse text-left">
                            <colgroup>
                                <col style={{ width: groupColumnWidths.number }} />
                                <col style={{ width: groupColumnWidths.name }} />
                                <col style={{ width: groupColumnWidths.description }} />
                                <col style={{ width: groupColumnWidths.members }} />
                                <col style={{ width: groupColumnWidths.criteria }} />
                                <col style={{ width: groupColumnWidths.type }} />
                                <col style={{ width: groupColumnWidths.actions }} />
                            </colgroup>
                            <thead className="bg-slate-900 text-[10px] font-black uppercase tracking-wide text-white">
                                <tr>
                                    <th style={{ width: groupColumnWidths.number }} className="relative whitespace-nowrap border-r-2 border-brand-orange px-2 py-2 text-left"><input type="checkbox" aria-label="Select all audiences" checked={groups.length > 0 && groups.every((group) => selectedGroupIds.has(group.id))} onChange={(event) => setSelectedGroupIds(event.target.checked ? new Set(groups.map((group) => group.id)) : new Set())} className="mr-1 h-3.5 w-3.5 accent-orange-500" />#<span onMouseDown={(event) => resizeGroupColumn('number', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                                    <th style={{ width: groupColumnWidths.name }} className="relative border-r-2 border-brand-orange px-3 py-2">Audience<span onMouseDown={(event) => resizeGroupColumn('name', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                                    <th style={{ width: groupColumnWidths.description }} className="relative border-r-2 border-brand-orange px-3 py-2">Description<span onMouseDown={(event) => resizeGroupColumn('description', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                                    <th style={{ width: groupColumnWidths.members }} className="relative border-r-2 border-brand-orange px-3 py-2">Members<span onMouseDown={(event) => resizeGroupColumn('members', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                                    <th style={{ width: groupColumnWidths.criteria }} className="relative border-r-2 border-brand-orange px-3 py-2">Criteria<span onMouseDown={(event) => resizeGroupColumn('criteria', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                                    <th style={{ width: groupColumnWidths.type }} className="relative px-3 py-2">Type<span onMouseDown={(event) => resizeGroupColumn('type', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                                    <th style={{ width: groupColumnWidths.actions }} className="relative px-3 py-2">Actions<span onMouseDown={(event) => resizeGroupColumn('actions', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                                </tr>
                            </thead>
                            <tbody>
                                {groups.map((group, groupIndex) => {
                                    const expanded = expandedGroupIds.has(group.id);
                                    const selectedUserIdsForGroup = group.criteria?.userIds || [];
                                    const selectedUsers = availableUsers.filter((user) => selectedUserIdsForGroup.includes(user.firestoreDocId || user.id));
                                    return (
                                        <React.Fragment key={group.id}>
                                            <tr id={`distribution-group-${group.id}`} onClick={() => void toggleAudienceExpanded(group)} className="h-9 cursor-pointer border-b border-slate-200 text-xs text-slate-700 transition hover:bg-slate-50">
                                                <td className="whitespace-nowrap px-2 py-1.5 text-left text-xs font-black text-slate-400"><span className="cmg-admin-row-leading"><input type="checkbox" aria-label={`Select ${group.name}`} checked={selectedGroupIds.has(group.id)} onChange={(event) => toggleAudienceSelection(event, group.id)} onClick={(event) => event.stopPropagation()} className="h-3.5 w-3.5 accent-orange-500" /><span className="text-slate-400">{groupIndex + 1}</span><span aria-hidden className="text-lg font-black leading-none text-brand-orange">{expanded ? '▾' : '▸'}</span></span></td>
                                                <td className="px-3 py-1.5 font-black text-slate-900">{group.name}</td>
                                                <td className="max-w-[260px] truncate px-3 py-1.5">{group.description || '—'}</td>
                                                <td className="px-3 py-1.5 font-bold">{group.memberCount ?? 0}</td>
                                                <td className="max-w-[300px] truncate px-3 py-1.5" title={audienceCriteriaSummary(group)}>{audienceCriteriaSummary(group)}</td>
                                                <td className="px-3 py-1.5"><span className="rounded px-2 py-1 text-[10px] font-black text-slate-600 bg-slate-100">{group.system ? 'SYSTEM' : group.criteria?.mode === 'selected' ? 'CUSTOM' : 'DYNAMIC'}</span></td>
                                                <td className="px-3 py-1.5 text-left"><button type="button" onClick={(event) => { event.stopPropagation(); setManageAudiencePageOpen(true); editGroup(group); }} className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-[10px] font-black text-white hover:bg-slate-700">Manage Audience</button></td>
                                            </tr>
                                            {expanded && (() => {
                                                const members = audienceMembers[group.id] || [];
                                                const membersLoading = audienceMembersLoading.has(group.id);
                                                return (
                                                <tr className="border-b border-slate-200 bg-[#f7f9fc]">
                                                    <td colSpan={7} className="px-5 py-3">
                                                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                                                            <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">Users in {group.name}</span>
                                                            <div className="flex items-center gap-2"><span className="text-xs font-bold text-slate-500">{group.memberCount ?? 0} members{members.length > 0 && members.length < (group.memberCount ?? 0) ? ` · showing ${members.length}` : ''}</span><button type="button" disabled={group.system} onClick={(event) => { event.stopPropagation(); setManageAudiencePageOpen(true); editGroup(group); }} className="rounded-lg bg-slate-900 px-2 py-1 text-[10px] font-black text-white disabled:cursor-not-allowed disabled:opacity-40">{group.system ? 'SYSTEM' : 'Edit'}</button>{!group.system && <button type="button" onClick={(event) => { event.stopPropagation(); void removeGroup(group); }} className="rounded-lg bg-red-50 px-2 py-1 text-[10px] font-black text-red-700">Delete</button>}</div>
                                                        </div>
                                                        {membersLoading ? (
                                                            <p className="py-4 text-xs text-slate-500">Loading audience users…</p>
                                                        ) : members.length === 0 ? (
                                                            <p className="py-4 text-xs text-slate-500">No users are currently in this audience.</p>
                                                        ) : (
                                                            <div className="mt-2 overflow-x-auto">
                                                                <table className="min-w-[830px] w-full table-fixed text-left text-xs">
                                                                    <colgroup>
                                                                        <col style={{ width: audienceMemberColumnWidths.number }} />
                                                                        <col style={{ width: audienceMemberColumnWidths.user }} />
                                                                        <col style={{ width: audienceMemberColumnWidths.email }} />
                                                                        <col style={{ width: audienceMemberColumnWidths.location }} />
                                                                        <col style={{ width: audienceMemberColumnWidths.status }} />
                                                                    </colgroup>
                                                                    <thead className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                                                                        <tr>
                                                                            <th style={{ width: audienceMemberColumnWidths.number }} className="relative px-2 py-1">#<span onMouseDown={(event) => resizeAudienceMemberColumn('number', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                                                                            <th style={{ width: audienceMemberColumnWidths.user }} className="relative px-2 py-1">User<span onMouseDown={(event) => resizeAudienceMemberColumn('user', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                                                                            <th style={{ width: audienceMemberColumnWidths.email }} className="relative px-2 py-1">Email<span onMouseDown={(event) => resizeAudienceMemberColumn('email', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                                                                            <th style={{ width: audienceMemberColumnWidths.location }} className="relative px-2 py-1">Location<span onMouseDown={(event) => resizeAudienceMemberColumn('location', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                                                                            <th style={{ width: audienceMemberColumnWidths.status }} className="relative px-2 py-1">Status<span onMouseDown={(event) => resizeAudienceMemberColumn('status', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {members.map((member: any, memberIndex) => (
                                                                            <tr key={member.id} className="border-t border-slate-200 bg-white">
                                                                                <td className="px-2 py-1.5 text-center text-slate-400">{memberIndex + 1}</td>
                                                                                <td className="px-2 py-1.5 font-bold text-slate-800"><button type="button" onClick={(event) => { event.stopPropagation(); onOpenUser?.(member.id); }} className="text-left font-bold text-slate-800 underline decoration-orange-200 underline-offset-2 hover:text-brand-orange">{member.name || 'Unnamed user'}</button></td>
                                                                                <td className="px-2 py-1.5 text-slate-600">{member.email || '—'}</td>
                                                                                <td className="px-2 py-1.5 text-slate-600">{member.location || member.country || '—'}</td>
                                                                                <td className="px-2 py-1.5 text-slate-600">{member.accountState || (member.isBlocked ? 'Blocked' : 'Active')}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                                );
                                            })()}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
};
