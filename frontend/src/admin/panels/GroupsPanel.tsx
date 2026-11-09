import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getAdminUsers } from '../../services/adminService';
import {
  createAdminDistributionGroup,
  deleteAdminDistributionGroup,
  listAdminDistributionGroups,
  previewAdminAudience,
  updateAdminDistributionGroup,
  type DistributionGroup,
} from '../../services/adminRbacService';
import AdminActionDialog from './AdminActionDialog';
import AudienceEditor from './groups/AudienceEditor';
import AudienceMembers, { type AudienceMembersState } from './groups/AudienceMembers';
import { audienceKindLabel, criteriaSummary, type AudienceSaveInput } from './groups/audienceModel';
import { toggleIdInSet, userKey, type AdminDirectoryUser } from './messages/recipients';
import { buttonClass, tableClass, tdClass, thClass } from './shared';

type PendingAction =
  | { kind: 'save'; groupId: string | null; input: AudienceSaveInput }
  | { kind: 'delete'; group: DistributionGroup };

interface GroupsPanelProps {
  /** Whether the admin may create, edit, or delete audiences (messages.groups.manage). Defaults to true. */
  canManage?: boolean;
  /** Sidebar sub-view: 'all' (default) lists audiences; 'new' also opens the create editor. */
  view?: string;
}

const withoutKey = <T,>(record: Record<string, T>, key: string): Record<string, T> => {
  const next = { ...record };
  delete next[key];
  return next;
};

function dialogCopy(pending: PendingAction | null): { title: string; description: string; confirmLabel: string } {
  if (pending?.kind === 'delete') {
    return {
      title: 'Delete this audience?',
      description: `Delete "${pending.group.name}". Messages already sent to its members are not affected.`,
      confirmLabel: 'Delete audience',
    };
  }
  if (pending?.kind === 'save' && pending.groupId) {
    return {
      title: 'Save changes?',
      description: `Update "${pending.input.name}". Membership is recalculated from current user profiles.`,
      confirmLabel: 'Save changes',
    };
  }
  return {
    title: 'Create this audience?',
    description: `Create "${pending?.kind === 'save' ? pending.input.name : ''}". Membership is calculated from current user profiles.`,
    confirmLabel: 'Create audience',
  };
}

const GroupsPanel: React.FC<GroupsPanelProps> = ({ canManage = true, view }) => {
  const [groups, setGroups] = useState<DistributionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const [editor, setEditor] = useState<{ group: DistributionGroup | null; key: number } | null>(null);
  const editorRef = useRef<HTMLElement | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);

  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const [bulkSelected, setBulkSelected] = useState<ReadonlySet<string>>(new Set());
  const [members, setMembers] = useState<Record<string, AudienceMembersState>>({});

  const [users, setUsers] = useState<AdminDirectoryUser[] | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);
  const usersRequested = useRef(false);

  // Users are loaded once, on first need: the custom-audience picker or an email lookup for members.
  const ensureUsers = useCallback(() => {
    if (usersRequested.current) return;
    usersRequested.current = true;
    getAdminUsers()
      .then((rows) => setUsers(rows))
      .catch((err: unknown) => {
        console.error('Loading users for audiences failed:', err);
        setUsersError('Users could not be loaded.');
      });
  }, []);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setGroups(await listAdminDistributionGroups());
    } catch (err: unknown) {
      console.error('Loading audiences failed:', err);
      setLoadError('Audiences could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  const editorKey = editor?.key;
  useEffect(() => {
    if (editorKey !== undefined) editorRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [editorKey]);

  const usersById = useMemo(() => new Map((users ?? []).map((user) => [userKey(user), user])), [users]);
  const emailFor = useCallback((userId: string) => usersById.get(userId)?.email, [usersById]);

  const loadMembers = useCallback(async (groupId: string) => {
    setMembers((current) => ({ ...current, [groupId]: { status: 'loading' } }));
    try {
      const result = await previewAdminAudience({ groupId });
      setMembers((current) => ({
        ...current,
        [groupId]: { status: 'ready', count: result.count, members: result.members },
      }));
    } catch (err: unknown) {
      console.error('Loading audience members failed:', err);
      setMembers((current) => ({ ...current, [groupId]: { status: 'error', message: 'Members could not be loaded.' } }));
    }
  }, []);

  const expandAudience = (groupId: string) => {
    setExpanded((current) => toggleIdInSet(current, groupId, true));
    ensureUsers();
    const existing = members[groupId];
    if (!existing || existing.status === 'error') void loadMembers(groupId);
  };

  const collapseAudience = (groupId: string) => {
    setExpanded((current) => toggleIdInSet(current, groupId, false));
  };

  const toggleAudience = (groupId: string) => {
    if (expanded.has(groupId)) collapseAudience(groupId);
    else expandAudience(groupId);
  };

  const openCreate = useCallback(() => {
    setStatus(null);
    setEditor((previous) => ({ group: null, key: (previous?.key ?? 0) + 1 }));
  }, []);

  // The 'new' sub-view opens the create editor straight away, above the list. Re-entering the view keeps an unsaved draft.
  const showNewEditor = view === 'new' && canManage;
  useEffect(() => {
    if (!showNewEditor) return;
    setEditor((previous) =>
      previous && previous.group === null ? previous : { group: null, key: (previous?.key ?? 0) + 1 },
    );
  }, [showNewEditor]);

  const openEdit = (group: DistributionGroup) => {
    setStatus(null);
    setEditor((previous) => ({ group, key: (previous?.key ?? 0) + 1 }));
  };

  // Runs after the admin confirms. Errors are thrown so the dialog stays open and shows the server's message.
  const confirmPending = async () => {
    const action = pending;
    if (!action) return;

    if (action.kind === 'save') {
      const { groupId } = action;
      if (groupId) {
        await updateAdminDistributionGroup({ groupId, ...action.input });
        setStatus(`Saved "${action.input.name}".`);
        // Membership may have changed, so refresh the open member list rather than showing a stale one.
        setMembers((current) => withoutKey(current, groupId));
        if (expanded.has(groupId)) void loadMembers(groupId);
      } else {
        await createAdminDistributionGroup(action.input);
        setStatus(`Created "${action.input.name}".`);
      }
      setEditor(null);
      await loadGroups();
      return;
    }

    const { group } = action;
    await deleteAdminDistributionGroup(group.id);
    setExpanded((current) => toggleIdInSet(current, group.id, false));
    setBulkSelected((current) => toggleIdInSet(current, group.id, false));
    setMembers((current) => withoutKey(current, group.id));
    if (editor?.group?.id === group.id) setEditor(null);
    setStatus(`Deleted "${group.name}".`);
    await loadGroups();
  };

  const allSelected = groups.length > 0 && groups.every((group) => bulkSelected.has(group.id));
  const copy = dialogCopy(pending);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900">Audiences</h2>
          <p className="text-sm text-slate-500">
            Saved recipient groups for messages. Membership is calculated from current user profiles.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadGroups()}
            disabled={loading}
            className={`${buttonClass} border border-slate-300 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50`}
          >
            Refresh
          </button>
          {canManage && (
            <button
              type="button"
              onClick={openCreate}
              className={`${buttonClass} bg-brand-orange px-4 py-2 text-sm text-white hover:bg-brand-orange/90`}
            >
              New audience
            </button>
          )}
        </div>
      </div>

      {!canManage && (
        <p role="note" className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          You can view audiences, but your account cannot create, edit, or delete them.
        </p>
      )}
      {status && (
        <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {status}
        </p>
      )}
      {loadError && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {loadError}
        </p>
      )}

      {editor && (
        <section
          ref={editorRef}
          aria-labelledby="audience-editor-heading"
          className="rounded-2xl bg-white p-6 shadow-sm"
        >
          <h3 id="audience-editor-heading" className="mb-4 text-base font-black text-slate-900">
            {editor.group ? `Edit ${editor.group.name}` : 'New audience'}
          </h3>
          <AudienceEditor
            key={editor.key}
            group={editor.group}
            users={users}
            usersError={usersError}
            onNeedUsers={ensureUsers}
            onSave={(input) => setPending({ kind: 'save', groupId: editor.group?.id ?? null, input })}
            onCancel={() => setEditor(null)}
          />
        </section>
      )}

      <section aria-labelledby="audience-list-heading" className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <h3 id="audience-list-heading" className="font-black text-slate-800">Saved audiences</h3>
          <span className="text-sm text-slate-500">
            {groups.length} audience{groups.length === 1 ? '' : 's'}
          </span>
        </div>

        {bulkSelected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-orange-200 bg-orange-50 px-4 py-2 text-xs">
            <strong>{bulkSelected.size} selected</strong>
            <button
              type="button"
              onClick={() => bulkSelected.forEach((groupId) => expandAudience(groupId))}
              className="rounded-lg bg-white px-3 py-1.5 font-black text-slate-700 hover:bg-slate-100"
            >
              Expand selected
            </button>
            <button
              type="button"
              onClick={() => setBulkSelected(new Set())}
              className="ml-auto rounded-lg px-3 py-1.5 font-black text-slate-600 hover:bg-orange-100"
            >
              Clear
            </button>
          </div>
        )}

        {loading && groups.length === 0 ? (
          <p className="p-6 text-slate-600">Loading audiences…</p>
        ) : groups.length === 0 ? (
          <p className="p-6 text-slate-600">No audiences yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <caption className="sr-only">Saved audiences. Select an audience name to show its members.</caption>
              <thead>
                <tr>
                  <th scope="col" className={`${thClass} w-10`}>
                    <input
                      type="checkbox"
                      aria-label="Select all audiences"
                      checked={allSelected}
                      onChange={(event) =>
                        setBulkSelected(event.target.checked ? new Set(groups.map((group) => group.id)) : new Set())
                      }
                      className="h-4 w-4 accent-orange-500"
                    />
                  </th>
                  <th scope="col" className={thClass}>Audience</th>
                  <th scope="col" className={thClass}>Members</th>
                  <th scope="col" className={thClass}>Criteria</th>
                  <th scope="col" className={thClass}>Type</th>
                  {canManage && <th scope="col" className={thClass}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => {
                  const isOpen = expanded.has(group.id);
                  const panelId = `audience-members-${group.id}`;
                  const summary = criteriaSummary(group);
                  return (
                    <React.Fragment key={group.id}>
                      <tr>
                        <td className={tdClass}>
                          <input
                            type="checkbox"
                            aria-label={`Select ${group.name}`}
                            checked={bulkSelected.has(group.id)}
                            onChange={(event) => setBulkSelected((current) => toggleIdInSet(current, group.id, event.target.checked))}
                            className="h-4 w-4 accent-orange-500"
                          />
                        </td>
                        <td className={tdClass}>
                          <button
                            type="button"
                            aria-expanded={isOpen}
                            aria-controls={isOpen ? panelId : undefined}
                            onClick={() => toggleAudience(group.id)}
                            className="rounded text-left font-black text-slate-900 hover:text-brand-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
                          >
                            <span aria-hidden="true" className="mr-1 text-brand-orange">{isOpen ? '▾' : '▸'}</span>
                            {group.name}
                          </button>
                          {group.description && <div className="mt-0.5 text-xs text-slate-500">{group.description}</div>}
                        </td>
                        <td className={`${tdClass} font-bold`}>{group.memberCount ?? 0}</td>
                        <td className={`${tdClass} max-w-xs`}>
                          <span className="block truncate text-xs text-slate-600" title={summary}>{summary}</span>
                        </td>
                        <td className={tdClass}>
                          <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-slate-600">
                            {audienceKindLabel(group)}
                          </span>
                        </td>
                        {canManage && (
                          <td className={`${tdClass} whitespace-nowrap`}>
                            {group.system ? (
                              <span className="text-xs font-semibold text-slate-500">Protected</span>
                            ) : (
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  aria-label={`Edit ${group.name}`}
                                  onClick={() => openEdit(group)}
                                  className={`${buttonClass} bg-slate-900 text-white`}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  aria-label={`Delete ${group.name}`}
                                  onClick={() => setPending({ kind: 'delete', group })}
                                  className={`${buttonClass} bg-red-50 text-red-700 hover:bg-red-100`}
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                      {isOpen && (
                        <tr className="bg-slate-50">
                          <td colSpan={canManage ? 6 : 5} className="p-0">
                            <AudienceMembers
                              panelId={panelId}
                              audienceName={group.name}
                              state={members[group.id]}
                              emailFor={emailFor}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <AdminActionDialog
        open={pending !== null}
        title={copy.title}
        description={copy.description}
        confirmLabel={copy.confirmLabel}
        danger={pending?.kind === 'delete'}
        requirePassword={pending?.kind === 'delete'}
        onConfirm={confirmPending}
        onCancel={() => setPending(null)}
      />
    </div>
  );
};

export default GroupsPanel;
