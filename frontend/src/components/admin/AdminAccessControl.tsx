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
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());
  const [groupColumnWidths, setGroupColumnWidths] = useState({ number: 72, name: 180, description: 260, members: 90, permissions: 110, type: 100 });

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

  const groupMembers = (groupId: string) => accessUsers
    .filter((accessUser) => accessUser.groupIds.includes(groupId))
    .map((accessUser) => allUsers.find((user) => user.id === accessUser.userId))
    .filter(Boolean);

  const toggleGroupExpanded = (groupId: string) => {
    setExpandedGroupIds((current) => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

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
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div>
                <h3 className="flex items-center gap-2 font-black text-slate-800"><ShieldCheck size={18} /> Groups</h3>
                <p className="mt-1 text-xs text-slate-500">Expand a group to see which users belong to it.</p>
              </div>
              <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-600">{groups.length} groups</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[792px] w-full table-fixed border-collapse text-left">
                <colgroup>
                  <col style={{ width: groupColumnWidths.number }} />
                  <col style={{ width: groupColumnWidths.name }} />
                  <col style={{ width: groupColumnWidths.description }} />
                  <col style={{ width: groupColumnWidths.members }} />
                  <col style={{ width: groupColumnWidths.permissions }} />
                  <col style={{ width: groupColumnWidths.type }} />
                </colgroup>
                <thead className="bg-slate-900 text-[10px] font-black uppercase tracking-wide text-white">
                  <tr>
                    <th style={{ width: groupColumnWidths.number }} className="relative border-r-2 border-brand-orange px-2 py-2 text-center">#<span onMouseDown={(event) => resizeGroupColumn('number', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                    <th style={{ width: groupColumnWidths.name }} className="relative border-r-2 border-brand-orange px-3 py-2">Group name<span onMouseDown={(event) => resizeGroupColumn('name', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                    <th style={{ width: groupColumnWidths.description }} className="relative border-r-2 border-brand-orange px-3 py-2">Description<span onMouseDown={(event) => resizeGroupColumn('description', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                    <th style={{ width: groupColumnWidths.members }} className="relative border-r-2 border-brand-orange px-3 py-2">Members<span onMouseDown={(event) => resizeGroupColumn('members', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                    <th style={{ width: groupColumnWidths.permissions }} className="relative border-r-2 border-brand-orange px-3 py-2">Permissions<span onMouseDown={(event) => resizeGroupColumn('permissions', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                    <th style={{ width: groupColumnWidths.type }} className="relative px-3 py-2">Type<span onMouseDown={(event) => resizeGroupColumn('type', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group, groupIndex) => {
                    const members = groupMembers(group.id);
                    const expanded = expandedGroupIds.has(group.id);
                    return (
                      <React.Fragment key={group.id}>
                        <tr
                          onClick={() => { setSelectedGroup(group); toggleGroupExpanded(group.id); }}
                          className="cursor-pointer border-b border-slate-200 text-xs text-slate-700 transition hover:bg-slate-50"
                        >
                          <td className="px-2 py-2 text-center text-xs font-black text-slate-400">
                            <span className="inline-flex items-center justify-center gap-1 text-brand-orange">
                              <span className="text-slate-400">{groupIndex + 1}</span>
                              <span aria-hidden>{expanded ? '▾' : '▸'}</span>
                            </span>
                          </td>
                          <td className="px-3 py-2 font-black text-slate-900">{group.name}</td>
                          <td className="max-w-[260px] truncate px-3 py-2">{group.description || '—'}</td>
                          <td className="px-3 py-2 font-bold">{members.length}</td>
                          <td className="px-3 py-2">{group.permissions.length}</td>
                          <td className="px-3 py-2">
                            <span className={`rounded px-2 py-1 text-[10px] font-black ${group.system ? 'bg-orange-50 text-orange-700' : 'bg-slate-100 text-slate-600'}`}>{group.system ? 'SYSTEM' : 'CUSTOM'}</span>
                          </td>
                        </tr>
                        {expanded && (
                          <tr className="border-b border-slate-200 bg-[#f7f9fc]">
                            <td colSpan={6} className="px-5 py-3">
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                                <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">Members in {group.name}</span>
                                <span className="text-xs font-bold text-slate-500">{members.length} assigned</span>
                              </div>
                              {members.length === 0 ? (
                                <p className="py-4 text-xs text-slate-500">No users are assigned to this group yet. Use the assignment controls below.</p>
                              ) : (
                                <div className="mt-2 overflow-x-auto">
                                  <table className="min-w-[520px] w-full text-left text-xs">
                                    <thead className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                                      <tr><th className="w-10 px-2 py-1">#</th><th className="px-2 py-1">User</th><th className="px-2 py-1">Email</th><th className="px-2 py-1">Status</th></tr>
                                    </thead>
                                    <tbody>
                                      {members.map((member: any, memberIndex) => (
                                        <tr key={member.id} className="border-t border-slate-200 bg-white">
                                          <td className="px-2 py-2 text-center text-slate-400">{memberIndex + 1}</td>
                                          <td className="px-2 py-2 font-bold text-slate-800">{member.name || 'Unnamed user'}</td>
                                          <td className="px-2 py-2 text-slate-600">{member.email || '—'}</td>
                                          <td className="px-2 py-2 text-slate-600">{member.isBlocked ? 'Blocked' : 'Active'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            {selectedGroup ? <>
              <div className="mb-4 flex items-start justify-between gap-3"><div><h3 className="text-lg font-black text-slate-900">{selectedGroup.name}</h3><p className="text-sm text-slate-500">Edit group permissions</p></div><button disabled={busy || selectedGroup.id === 'super-admins'} onClick={() => void saveGroup()} className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Save size={15} /> Save</button></div>
              <div className="grid gap-2 sm:grid-cols-2">{permissions.map((permission) => <label key={permission} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-700"><input type="checkbox" checked={selectedGroupPermissions.has(permission)} disabled={selectedGroup.id === 'super-admins'} onChange={(event) => setSelectedGroup({ ...selectedGroup, permissions: event.target.checked ? [...selectedGroup.permissions, permission] : selectedGroup.permissions.filter((item) => item !== permission) })} className="h-4 w-4 accent-orange-500" />{labelPermission(permission)}</label>)}</div>
            </> : <p className="text-slate-500">Select a group from the table.</p>}
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
