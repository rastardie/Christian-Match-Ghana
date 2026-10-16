import React, { useEffect, useMemo, useState } from 'react';
import { KeyRound, Save, ShieldCheck, Users, ScrollText, RefreshCw } from 'lucide-react';
import { getAdminUsers } from '../../services/adminService';
import {
  AdminAccessUser,
  AdminGroup,
  assignAdminUserGroups,
  listAdminAccessControl,
  listAdminAuditLogs,
  upsertAdminGroup,
  createAdministrator,
} from '../../services/adminRbacService';

const labelPermission = (permission: string) => permission.replace(/\./g, ' · ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const AdminAccessControl: React.FC<{ initialTab?: 'groups' | 'audit' }> = ({ initialTab = 'groups' }) => {
  const [tab, setTab] = useState<'groups' | 'audit'>(initialTab);
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [accessUsers, setAccessUsers] = useState<AdminAccessUser[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<AdminGroup | null>(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedUserGroups, setSelectedUserGroups] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [newAdmin, setNewAdmin] = useState({ loginName: '', email: '', displayName: '', password: '' });

  const loadAccess = async () => {
    setBusy(true);
    setMessage('');
    try {
      const [access, users] = await Promise.all([listAdminAccessControl(), getAdminUsers()]);
      setGroups(access.groups);
      setPermissions(access.permissions);
      setAccessUsers(access.users);
      setAllUsers(users);
      if (!selectedGroup && access.groups[0]) setSelectedGroup(access.groups[0]);
    } catch (error: any) {
      setMessage(error?.message || 'Unable to load access control data.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { void loadAccess(); }, []);

  useEffect(() => {
    const current = accessUsers.find((item) => item.userId === selectedUserId);
    setSelectedUserGroups(current?.groupIds || []);
  }, [selectedUserId, accessUsers]);

  const selectedGroupPermissions = useMemo(() => new Set(selectedGroup?.permissions || []), [selectedGroup]);

  const saveGroup = async () => {
    if (!selectedGroup) return;
    setBusy(true);
    try {
      const saved = await upsertAdminGroup(selectedGroup);
      setGroups((items) => items.map((item) => item.id === saved.id ? saved : item));
      setSelectedGroup(saved);
      setMessage('Group permissions saved and audited.');
    } catch (error: any) {
      setMessage(error?.message || 'Unable to save group permissions.');
    } finally {
      setBusy(false);
    }
  };

  const saveUserGroups = async () => {
    if (!selectedUserId) return;
    setBusy(true);
    try {
      const saved = await assignAdminUserGroups(selectedUserId, selectedUserGroups);
      setAccessUsers((items) => [...items.filter((item) => item.userId !== selectedUserId), saved]);
      setMessage('User groups updated and audited.');
    } catch (error: any) {
      setMessage(error?.message || 'Unable to update user groups.');
    } finally {
      setBusy(false);
    }
  };

  const createAdmin = async () => {
    if (!newAdmin.loginName || !newAdmin.email || !newAdmin.displayName || newAdmin.password.length < 12) {
      setMessage('Enter a username, name, email, and a temporary password of at least 12 characters.');
      return;
    }
    setBusy(true);
    try {
      await createAdministrator(newAdmin);
      setNewAdmin({ loginName: '', email: '', displayName: '', password: '' });
      await loadAccess();
      setMessage('Super Admin created. They must change the temporary password at first login.');
    } catch (error: any) {
      setMessage(error?.message || 'Unable to create administrator.');
    } finally {
      setBusy(false);
    }
  };

  const loadAudit = async () => {
    setBusy(true);
    try { setAuditLogs(await listAdminAuditLogs()); }
    catch (error: any) { setMessage(error?.message || 'Unable to load audit logs.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Access control</h2>
          <p className="text-sm text-slate-500">Manage groups, permissions, assignments, and audit history.</p>
        </div>
        <button onClick={() => tab === 'audit' ? void loadAudit() : void loadAccess()} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm border border-slate-200"><RefreshCw size={16} /> Refresh</button>
      </div>
      <div className="flex gap-2">
        <button onClick={() => setTab('groups')} className={`rounded-xl px-4 py-2 text-sm font-bold ${tab === 'groups' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border'}`}>Groups & permissions</button>
        <button onClick={() => { setTab('audit'); void loadAudit(); }} className={`rounded-xl px-4 py-2 text-sm font-bold ${tab === 'audit' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border'}`}><ScrollText className="mr-1 inline" size={15} />Audit logs</button>
      </div>
      {message && <p className="rounded-xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">{message}</p>}

      {tab === 'groups' ? (
        <>
          <section className="grid gap-6 lg:grid-cols-[18rem_1fr]">
            <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
              <h3 className="mb-3 flex items-center gap-2 font-black text-slate-800"><ShieldCheck size={18} /> Groups</h3>
              <div className="space-y-2">{groups.map((group) => <button key={group.id} onClick={() => setSelectedGroup(group)} className={`w-full rounded-xl p-3 text-left ${selectedGroup?.id === group.id ? 'bg-orange-50 text-orange-700 border border-orange-200' : 'hover:bg-slate-50 text-slate-700'}`}><span className="block text-sm font-bold">{group.name}</span><span className="text-xs text-slate-400">{group.permissions.length} permissions</span></button>)}</div>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
              {selectedGroup ? <>
                <div className="mb-4 flex items-start justify-between gap-3"><div><h3 className="text-lg font-black text-slate-900">{selectedGroup.name}</h3><p className="text-sm text-slate-500">{selectedGroup.description}</p></div><button disabled={busy || selectedGroup.id === 'super-admins'} onClick={() => void saveGroup()} className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Save size={15} /> Save</button></div>
                <div className="grid gap-2 sm:grid-cols-2">{permissions.map((permission) => <label key={permission} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-700"><input type="checkbox" checked={selectedGroupPermissions.has(permission)} disabled={selectedGroup.id === 'super-admins'} onChange={(event) => setSelectedGroup({ ...selectedGroup, permissions: event.target.checked ? [...selectedGroup.permissions, permission] : selectedGroup.permissions.filter((item) => item !== permission) })} className="h-4 w-4 accent-orange-500" />{labelPermission(permission)}</label>)}</div>
              </> : <p className="text-slate-500">Select a group.</p>}
            </div>
          </section>
          <section className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200"><h3 className="mb-4 flex items-center gap-2 font-black text-slate-800"><Users size={18} /> Assign users to groups</h3><div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]"><select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)} className="rounded-xl border border-slate-200 p-3 text-sm"><option value="">Select user</option>{allUsers.map((user) => <option key={user.id} value={user.id}>{user.name || user.email} — {user.email}</option>)}</select><div className="flex flex-wrap gap-2">{groups.map((group) => <label key={group.id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold"><input type="checkbox" checked={selectedUserGroups.includes(group.id)} disabled={group.id === 'super-admins'} onChange={(event) => setSelectedUserGroups((items) => event.target.checked ? [...items, group.id] : items.filter((id) => id !== group.id))} className="accent-orange-500" />{group.name}</label>)}</div><button disabled={!selectedUserId || busy} onClick={() => void saveUserGroups()} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Assign</button></div></section>
          <section className="rounded-2xl bg-white p-5 shadow-sm border border-orange-200"><h3 className="mb-2 flex items-center gap-2 font-black text-slate-800"><ShieldCheck size={18} /> Create administrator</h3><p className="mb-4 text-sm text-slate-500">Super Admin only. The account is created as non-paid and must change its temporary password at first login.</p><div className="grid gap-3 md:grid-cols-4"><input value={newAdmin.loginName} onChange={(event) => setNewAdmin({ ...newAdmin, loginName: event.target.value.toLowerCase() })} placeholder="Username (e.g. ladmin)" className="rounded-xl border border-slate-200 p-3 text-sm" /><input value={newAdmin.displayName} onChange={(event) => setNewAdmin({ ...newAdmin, displayName: event.target.value })} placeholder="Full name" className="rounded-xl border border-slate-200 p-3 text-sm" /><input value={newAdmin.email} onChange={(event) => setNewAdmin({ ...newAdmin, email: event.target.value })} type="email" placeholder="Email address" className="rounded-xl border border-slate-200 p-3 text-sm" /><input value={newAdmin.password} onChange={(event) => setNewAdmin({ ...newAdmin, password: event.target.value })} type="password" autoComplete="new-password" placeholder="Temporary password (12+ chars)" className="rounded-xl border border-slate-200 p-3 text-sm" /></div><button disabled={busy} onClick={() => void createAdmin()} className="mt-3 rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Create Super Admin</button></section>
        </>
      ) : (
        <section className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200"><h3 className="mb-4 font-black text-slate-800">Recent administrative actions</h3><div className="space-y-2">{auditLogs.length === 0 ? <p className="text-sm text-slate-500">No audit records found.</p> : auditLogs.map((log) => <div key={log.id} className="rounded-xl bg-slate-50 p-3 text-sm"><div className="flex justify-between gap-3"><strong>{log.action}</strong><span className="text-xs text-slate-500">{log.actorEmail || log.actorId}</span></div><p className="mt-1 text-xs text-slate-500">Target: {log.targetId || '—'}</p></div>)}</div></section>
      )}
    </div>
  );
};

export default AdminAccessControl;
