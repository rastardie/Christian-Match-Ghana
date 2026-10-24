import React, { useEffect, useMemo, useState } from 'react';
import { KeyRound, Save, ShieldCheck, Users, ScrollText, RefreshCw } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebase';
import { useAdminActionConfirmation } from './AdminActionConfirmation';
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

const AdminAccessControl: React.FC<{ initialTab?: 'groups' | 'audit'; focusGroupId?: string | null; onOpenUser?: (userId: string) => void }> = ({ initialTab = 'groups', focusGroupId, onOpenUser }) => {
  const { confirmAdminAction } = useAdminActionConfirmation();
  const [tab, setTab] = useState<'groups' | 'audit'>(initialTab);
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [accessUsers, setAccessUsers] = useState<AdminAccessUser[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<AdminGroup | null>(null);
  const [editingGroup, setEditingGroup] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedUserGroups, setSelectedUserGroups] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [newAdmin, setNewAdmin] = useState({ loginName: '', email: '', displayName: '', password: '' });
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [groupManagerOpen, setGroupManagerOpen] = useState(false);
  const [manageGroupsPageOpen, setManageGroupsPageOpen] = useState(false);
  const [selectedGroupMemberIds, setSelectedGroupMemberIds] = useState<Record<string, Set<string>>>({});
  const [groupColumnWidths, setGroupColumnWidths] = useState({ number: 80, name: 180, description: 260, members: 90, permissions: 110, type: 100, actions: 130 });

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
      const firebaseUser = await new Promise<any>((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          unsubscribe();
          resolve(user);
        });
      });
      if (!firebaseUser) throw new Error('Admin authentication is not ready. Please sign in again.');
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
    if (!focusGroupId || !groups.length) return;
    const focusedGroup = groups.find((group) => group.id === focusGroupId);
    if (!focusedGroup) return;
    setSelectedGroup(focusedGroup);
    setSelectedGroupIds(new Set([focusedGroup.id]));
    setExpandedGroupIds((current) => new Set([...current, focusedGroup.id]));
    setManageGroupsPageOpen(true);
    window.setTimeout(() => document.getElementById(`admin-permission-group-${focusedGroup.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0);
  }, [focusGroupId, groups]);

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

  const expandSelectedGroups = () => {
    setExpandedGroupIds((current) => new Set([...current, ...selectedGroupIds]));
    setGroupManagerOpen(false);
  };

  const openSelectedGroupForEditing = () => {
    const group = groups.find((item) => selectedGroupIds.has(item.id));
    if (group) { setSelectedGroup(group); setEditingGroup(true); }
    setGroupManagerOpen(false);
  };

  const toggleGroupSelection = (event: React.ChangeEvent<HTMLInputElement>, groupId: string) => {
    event.stopPropagation();
    setSelectedGroupIds((current) => {
      const next = new Set(current);
      if (event.target.checked) next.add(groupId);
      else next.delete(groupId);
      return next;
    });
  };

  const toggleMemberSelection = (groupId: string, memberId: string, checked: boolean) => {
    setSelectedGroupMemberIds((current) => {
      const next = new Set(current[groupId] || []);
      if (checked) next.add(memberId);
      else next.delete(memberId);
      return { ...current, [groupId]: next };
    });
  };

  const removeSelectedMembers = async (groupId: string) => {
    const memberIds = [...(selectedGroupMemberIds[groupId] || [])];
    if (!memberIds.length) return;
    const confirmed = await confirmAdminAction({ title: 'Remove selected users from this group?', description: `Remove ${memberIds.length} selected user${memberIds.length === 1 ? '' : 's'} from the group.` });
    if (!confirmed) return;
    setBusy(true);
    try {
      const updated = await Promise.all(memberIds.map(async (userId) => {
        const accessUser = accessUsers.find((item) => item.userId === userId);
        if (!accessUser) return null;
        return assignAdminUserGroups(userId, accessUser.groupIds.filter((id) => id !== groupId));
      }));
      setAccessUsers((items) => items.map((item) => updated.find((saved) => saved?.userId === item.userId) || item));
      setSelectedGroupMemberIds((current) => ({ ...current, [groupId]: new Set() }));
      setMessage('Selected users removed from the group.');
    } catch (error: any) {
      setMessage(error?.message || 'Unable to remove selected users from the group.');
    } finally {
      setBusy(false);
    }
  };

  const saveGroup = async () => {
    if (!selectedGroup) return;
    const confirmed = await confirmAdminAction({ title: 'Save group permissions?', description: `Save permission changes for ${selectedGroup.name}.` });
    if (!confirmed) return;
    setBusy(true);
    try {
      const saved = await upsertAdminGroup(selectedGroup);
      setGroups((items) => items.map((item) => item.id === saved.id ? saved : item));
      setSelectedGroup(saved);
      setEditingGroup(false);
      setMessage('Group permissions saved and audited.');
    } catch (error: any) {
      setMessage(error?.message || 'Unable to save group permissions.');
    } finally {
      setBusy(false);
    }
  };

  const saveUserGroups = async () => {
    if (!selectedUserId) return;
    const confirmed = await confirmAdminAction({ title: 'Update user group membership?', description: 'Save the selected user’s group assignments.' });
    if (!confirmed) return;
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
    const confirmed = await confirmAdminAction({ title: 'Create administrator?', description: `Create the new administrator account ${newAdmin.displayName || newAdmin.loginName}.` });
    if (!confirmed) {
      setBusy(false);
      return;
    }
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
          <h2 className="text-2xl font-black text-slate-900">{tab === 'groups' ? 'Groups' : 'Audit logs'}</h2>
        </div>
        <div className="flex items-center gap-2">
          {tab === 'groups' && <button type="button" onClick={() => { if (!selectedGroup && groups[0]) setSelectedGroup(groups[0]); if (selectedGroupIds.size === 0 && groups[0]) setSelectedGroupIds(new Set([groups[0].id])); setManageGroupsPageOpen(true); }} className="rounded-xl bg-brand-orange px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-brand-orange/90">Manage Groups</button>}
          <button onClick={() => tab === 'audit' ? void loadAudit() : void loadAccess()} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm border border-slate-200"><RefreshCw size={16} /> Refresh</button>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => setTab('groups')} className={`rounded-xl px-4 py-2 text-sm font-bold ${tab === 'groups' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border'}`}>Groups & permissions</button>
        <button onClick={() => { setTab('audit'); void loadAudit(); }} className={`rounded-xl px-4 py-2 text-sm font-bold ${tab === 'audit' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border'}`}><ScrollText className="mr-1 inline" size={15} />Audit logs</button>
      </div>
      {message && <p className="rounded-xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">{message}</p>}
      {groupManagerOpen && (
        <div className="absolute inset-0 z-[120] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm max-h-[85dvh] overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
            <h2 className="text-xl font-black text-slate-900">{selectedGroupIds.size === 1 ? 'Manage group' : 'Manage groups'}</h2>
            <p className="mt-1 text-sm text-slate-500">Choose an action for {selectedGroupIds.size} selected group{selectedGroupIds.size === 1 ? '' : 's'}.</p>
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-black text-slate-800">{groups.filter((group) => selectedGroupIds.has(group.id)).map((group) => <div key={group.id} className="truncate">{group.name}</div>)}</div>
            <div className="mt-5 grid gap-2">
              <button type="button" onClick={expandSelectedGroups} className="rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-black text-slate-700 hover:bg-slate-50">Expand group{selectedGroupIds.size === 1 ? '' : 's'}</button>
              <button type="button" onClick={openSelectedGroupForEditing} className="rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-black text-slate-700 hover:bg-slate-50">Edit permissions</button>
              <button type="button" onClick={() => { const group = groups.find((item) => selectedGroupIds.has(item.id)); if (group) setSelectedGroup(group); setGroupManagerOpen(false); }} className="rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-black text-slate-700 hover:bg-slate-50">Add users to group</button>
              <button type="button" onClick={() => { void Promise.all([...selectedGroupIds].map((id) => removeSelectedMembers(id))); setGroupManagerOpen(false); }} className="rounded-xl border border-red-200 px-4 py-3 text-left text-sm font-black text-red-700 hover:bg-red-50">Remove selected users from group</button>
            </div>
            <button type="button" onClick={() => setGroupManagerOpen(false)} className="mt-5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-600">Cancel</button>
          </div>
        </div>
      )}

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
            {manageGroupsPageOpen && selectedGroupIds.size > 0 && (
              <div className="flex flex-wrap items-center gap-2 border-b border-orange-200 bg-orange-50 px-4 py-2 text-xs">
                <strong>{selectedGroupIds.size} selected</strong>
                <button type="button" onClick={() => setGroupManagerOpen(true)} className="rounded-lg bg-brand-orange px-3 py-1.5 font-black text-white">{selectedGroupIds.size === 1 ? 'Manage group' : 'Manage groups'}</button>
                <button type="button" onClick={expandSelectedGroups} className="rounded-lg bg-white px-3 py-1.5 font-black text-slate-700">Expand selected</button>
                <button type="button" onClick={() => setSelectedGroupIds(new Set())} className="ml-auto rounded-lg px-3 py-1.5 font-black text-slate-500">Clear</button>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="cmg-admin-compact-table min-w-[792px] w-full table-fixed border-collapse text-left">
                <colgroup>
                  <col style={{ width: groupColumnWidths.number }} />
                  <col style={{ width: groupColumnWidths.name }} />
                  <col style={{ width: groupColumnWidths.description }} />
                  <col style={{ width: groupColumnWidths.members }} />
                  <col style={{ width: groupColumnWidths.permissions }} />
                  <col style={{ width: groupColumnWidths.type }} />
                  <col style={{ width: groupColumnWidths.actions }} />
                </colgroup>
                <thead className="bg-slate-900 text-[10px] font-black uppercase tracking-wide text-white">
                  <tr>
                    <th style={{ width: groupColumnWidths.number }} className="relative whitespace-nowrap border-r-2 border-brand-orange px-2 py-2 text-left"><input type="checkbox" aria-label="Select all groups" checked={groups.length > 0 && groups.every((group) => selectedGroupIds.has(group.id))} onChange={(event) => setSelectedGroupIds(event.target.checked ? new Set(groups.map((group) => group.id)) : new Set())} className="mr-1 h-3.5 w-3.5 accent-orange-500" />#<span onMouseDown={(event) => resizeGroupColumn('number', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                    <th style={{ width: groupColumnWidths.name }} className="relative border-r-2 border-brand-orange px-3 py-2">Group name<span onMouseDown={(event) => resizeGroupColumn('name', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                    <th style={{ width: groupColumnWidths.description }} className="relative border-r-2 border-brand-orange px-3 py-2">Description<span onMouseDown={(event) => resizeGroupColumn('description', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                    <th style={{ width: groupColumnWidths.members }} className="relative border-r-2 border-brand-orange px-3 py-2">Members<span onMouseDown={(event) => resizeGroupColumn('members', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                    <th style={{ width: groupColumnWidths.permissions }} className="relative border-r-2 border-brand-orange px-3 py-2">Permissions<span onMouseDown={(event) => resizeGroupColumn('permissions', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                    <th style={{ width: groupColumnWidths.type }} className="relative border-r-2 border-brand-orange px-3 py-2">Type<span onMouseDown={(event) => resizeGroupColumn('type', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                    <th style={{ width: groupColumnWidths.actions }} className="relative px-3 py-2">Actions<span onMouseDown={(event) => resizeGroupColumn('actions', event)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-brand-orange/70" /></th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group, groupIndex) => {
                    const members = groupMembers(group.id);
                    const expanded = expandedGroupIds.has(group.id);
                    const selectedMembersForGroup = selectedGroupMemberIds[group.id] || new Set<string>();
                    return (
                      <React.Fragment key={group.id}>
                        <tr
                          id={`admin-permission-group-${group.id}`}
                          onClick={() => { setSelectedGroup(group); setEditingGroup(false); toggleGroupExpanded(group.id); }}
                          className="h-9 cursor-pointer border-b border-slate-200 text-xs text-slate-700 transition hover:bg-slate-50"
                        >
                          <td className="whitespace-nowrap px-2 py-1.5 text-left text-xs font-black text-slate-400">
                            <span className="cmg-admin-row-leading">
                              <input type="checkbox" aria-label={`Select ${group.name}`} checked={selectedGroupIds.has(group.id)} onChange={(event) => toggleGroupSelection(event, group.id)} onClick={(event) => event.stopPropagation()} className="h-3.5 w-3.5 accent-orange-500" />
                              <span className="text-slate-400">{groupIndex + 1}</span>
                              <span aria-hidden className="text-lg font-black leading-none text-brand-orange">{expanded ? '▾' : '▸'}</span>
                            </span>
                          </td>
                          <td className="px-3 py-1.5 font-black text-slate-900">{group.name}</td>
                          <td className="max-w-[260px] truncate px-3 py-1.5">{group.description || '—'}</td>
                          <td className="px-3 py-1.5 font-bold">{members.length}</td>
                          <td className="px-3 py-1.5">{group.permissions.length}</td>
                          <td className="px-3 py-1.5">
                            <span className={`rounded px-2 py-1 text-[10px] font-black ${group.system ? 'bg-orange-50 text-orange-700' : 'bg-slate-100 text-slate-600'}`}>{group.system ? 'SYSTEM' : 'CUSTOM'}</span>
                          </td>
                          <td className="px-3 py-1.5 text-left"><button type="button" onClick={(event) => { event.stopPropagation(); setSelectedGroupIds(new Set([group.id])); setGroupManagerOpen(true); }} className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-[10px] font-black text-white hover:bg-slate-700">Manage Group</button></td>
                        </tr>
                        {expanded && (
                          <tr className="border-b border-slate-200 bg-[#f7f9fc]">
                            <td colSpan={7} className="px-5 py-3">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                                  <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">Members in {group.name}</span>
                                  <div className="flex items-center gap-2"><span className="text-xs font-bold text-slate-500">{members.length} assigned</span>{selectedMembersForGroup.size > 0 && <button type="button" onClick={() => void removeSelectedMembers(group.id)} className="rounded-lg bg-red-50 px-2 py-1 text-[10px] font-black text-red-700">Remove selected</button>}</div>
                                </div>
                              {members.length === 0 ? (
                                <p className="py-4 text-xs text-slate-500">No users are assigned to this group yet. Use the assignment controls below.</p>
                              ) : (
                                <div className="mt-2 overflow-x-auto">
                                  <table className="min-w-[520px] w-full text-left text-xs">
                                    <thead className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                                      <tr><th className="w-20 whitespace-nowrap px-2 py-1"><input type="checkbox" aria-label={`Select all members in ${group.name}`} checked={members.length > 0 && members.every((member: any) => selectedMembersForGroup.has(member.id))} onChange={(event) => setSelectedGroupMemberIds((current) => ({ ...current, [group.id]: event.target.checked ? new Set(members.map((member: any) => member.id)) : new Set() }))} className="h-3.5 w-3.5 accent-orange-500" /> #</th><th className="px-2 py-1">User</th><th className="px-2 py-1">Email</th><th className="px-2 py-1">Status</th></tr>
                                    </thead>
                                    <tbody>
                                      {members.map((member: any, memberIndex) => (
                                        <tr key={member.id} className="border-t border-slate-200 bg-white">
                                          <td className="whitespace-nowrap px-2 py-1.5 text-center text-slate-400"><input type="checkbox" aria-label={`Select ${member.name || 'member'}`} checked={selectedMembersForGroup.has(member.id)} onChange={(event) => toggleMemberSelection(group.id, member.id, event.target.checked)} className="mr-1 h-3.5 w-3.5 accent-orange-500" /><span className="inline-block truncate align-middle" style={{ maxWidth: 'calc(100% - 1.5rem)' }} title={String(memberIndex + 1)}>{memberIndex + 1}</span></td>
                                          <td className="px-2 py-1.5 font-bold text-slate-800"><button type="button" onClick={(event) => { event.stopPropagation(); onOpenUser?.(member.id); }} className="text-left font-bold text-slate-800 underline decoration-orange-200 underline-offset-2 hover:text-brand-orange">{member.name || 'Unnamed user'}</button></td>
                                          <td className="px-2 py-1.5 text-slate-600">{member.email || '—'}</td>
                                          <td className="px-2 py-1.5 text-slate-600">{member.isBlocked ? 'Blocked' : 'Active'}</td>
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
          {manageGroupsPageOpen && <>
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3">
              <div><h3 className="font-black text-slate-900">Manage Groups</h3><p className="text-xs text-slate-600">Manage group permissions, users, and administrator access.</p></div>
              <button type="button" onClick={() => setManageGroupsPageOpen(false)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700">Back to Groups</button>
            </div>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            {selectedGroup ? <>
              <div className="mb-4 flex items-start justify-between gap-3"><div><h3 className="text-lg font-black text-slate-900">{selectedGroup.name}</h3><p className="text-sm text-slate-500">{editingGroup ? 'Edit group permissions' : 'Permissions are locked until Edit is selected.'}</p></div><div className="flex gap-2">{editingGroup && <button onClick={() => { setEditingGroup(false); setSelectedGroup(groups.find((group) => group.id === selectedGroup.id) || selectedGroup); }} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600">Cancel</button>}{editingGroup ? <button disabled={busy || selectedGroup.id === 'super-admins'} onClick={() => void saveGroup()} className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Save size={15} /> Save</button> : <button disabled={selectedGroup.id === 'super-admins'} onClick={() => setEditingGroup(true)} className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><KeyRound size={15} /> Edit permissions</button>}</div></div>
              <div className="grid gap-2 sm:grid-cols-2">{permissions.map((permission) => <label key={permission} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-700"><input type="checkbox" checked={selectedGroupPermissions.has(permission)} disabled={!editingGroup || selectedGroup.id === 'super-admins'} onChange={(event) => setSelectedGroup({ ...selectedGroup, permissions: event.target.checked ? [...selectedGroup.permissions, permission] : selectedGroup.permissions.filter((item) => item !== permission) })} className="h-4 w-4 accent-orange-500" />{labelPermission(permission)}</label>)}</div>
            </> : <p className="text-slate-500">Select a group from the table.</p>}
          </section>
          <section className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200"><h3 className="mb-4 flex items-center gap-2 font-black text-slate-800"><Users size={18} /> Assign users to groups</h3><div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]"><select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)} className="rounded-xl border border-slate-200 p-3 text-sm"><option value="">Select user</option>{allUsers.map((user) => <option key={user.id} value={user.id}>{user.name || user.email} — {user.email}</option>)}</select><div className="flex flex-wrap gap-2">{groups.map((group) => <label key={group.id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold"><input type="checkbox" checked={selectedUserGroups.includes(group.id)} disabled={group.id === 'super-admins'} onChange={(event) => setSelectedUserGroups((items) => event.target.checked ? [...items, group.id] : items.filter((id) => id !== group.id))} className="accent-orange-500" />{group.name}</label>)}</div><button disabled={!selectedUserId || busy} onClick={() => void saveUserGroups()} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Assign</button></div></section>
          <section className="rounded-2xl bg-white p-5 shadow-sm border border-orange-200"><h3 className="mb-2 flex items-center gap-2 font-black text-slate-800"><ShieldCheck size={18} /> Create administrator</h3><p className="mb-4 text-sm text-slate-500">Super Admin only. The account is created as non-paid and must change its temporary password at first login.</p><div className="grid gap-3 md:grid-cols-4"><input value={newAdmin.loginName} onChange={(event) => setNewAdmin({ ...newAdmin, loginName: event.target.value.toLowerCase() })} placeholder="Username (e.g. ladmin)" className="rounded-xl border border-slate-200 p-3 text-sm" /><input value={newAdmin.displayName} onChange={(event) => setNewAdmin({ ...newAdmin, displayName: event.target.value })} placeholder="Full name" className="rounded-xl border border-slate-200 p-3 text-sm" /><input value={newAdmin.email} onChange={(event) => setNewAdmin({ ...newAdmin, email: event.target.value })} type="email" placeholder="Email address" className="rounded-xl border border-slate-200 p-3 text-sm" /><input value={newAdmin.password} onChange={(event) => setNewAdmin({ ...newAdmin, password: event.target.value })} type="password" autoComplete="new-password" placeholder="Temporary password (12+ chars)" className="rounded-xl border border-slate-200 p-3 text-sm" /></div><button disabled={busy} onClick={() => void createAdmin()} className="mt-3 rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Create Super Admin</button></section>
        </>}
        </>
      ) : (
        <section className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200"><h3 className="mb-4 font-black text-slate-800">Recent administrative actions</h3><div className="space-y-2">{auditLogs.length === 0 ? <p className="text-sm text-slate-500">No audit records found.</p> : auditLogs.map((log) => <div key={log.id} className="rounded-xl bg-slate-50 p-3 text-sm"><div className="flex justify-between gap-3"><strong>{log.action}</strong><span className="text-xs text-slate-500">{log.actorEmail || log.actorId}</span></div><p className="mt-1 text-xs text-slate-500">Target: {log.targetId || '—'}</p></div>)}</div></section>
      )}
    </div>
  );
};

export default AdminAccessControl;
