import React, { useEffect, useRef, useState } from 'react';
import { saveAdminGroup, groupIdFromName } from '../../../services/adminAccessActions';
import type { AdminGroup } from '../../../services/adminRbacService';
import AdminActionDialog from '../AdminActionDialog';
import { buttonClass } from '../shared';
import {
  type AccessContext,
  holdsPermission,
  isProtectedGroup,
  permissionLabel,
} from './accessModel';

interface GroupEditorProps {
  ctx: AccessContext;
  catalog: string[];
  /** null creates a new group. */
  group: AdminGroup | null;
  groups: AdminGroup[];
  onSaved: (group: AdminGroup) => void;
  onClose: () => void;
}

const fieldClass =
  'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none disabled:bg-slate-100 disabled:text-slate-500';

const GroupEditor: React.FC<GroupEditorProps> = ({ ctx, catalog, group, groups, onSaved, onClose }) => {
  const isNew = group === null;
  const readOnly = group !== null && isProtectedGroup(group);

  const [name, setName] = useState(group?.name ?? '');
  const [description, setDescription] = useState(group?.description ?? '');
  const [permissions, setPermissions] = useState<Set<string>>(() => new Set(group?.permissions ?? []));
  const [confirming, setConfirming] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!readOnly) nameRef.current?.focus();
  }, [readOnly]);

  const trimmedName = name.trim();
  const lowerName = trimmedName.toLowerCase();
  const nameTaken = trimmedName !== '' && groups.some((item) => item.id !== group?.id && item.name.trim().toLowerCase() === lowerName);
  const idTaken = isNew && trimmedName !== '' && groups.some((item) => item.id === groupIdFromName(trimmedName));
  const unheld = catalog.filter((permission) => permissions.has(permission) && !holdsPermission(ctx, permission));

  let hint: string | null = null;
  if (nameTaken || idTaken) hint = 'A group with this name already exists.';
  else if (permissions.size === 0) hint = 'Select at least one permission.';
  else if (unheld.length > 0) {
    hint = `This group includes permissions you do not hold (${unheld.map(permissionLabel).join(', ')}). You cannot save it unless you remove them or are a Super Admin.`;
  }

  const canSave = !readOnly && trimmedName !== '' && hint === null;

  const togglePermission = (permission: string, checked: boolean) => {
    setPermissions((current) => {
      const next = new Set(current);
      if (checked) next.add(permission);
      else next.delete(permission);
      return next;
    });
  };

  const confirmSave = async () => {
    const saved = await saveAdminGroup({
      groupId: group?.id,
      name: trimmedName,
      description,
      permissions: [...permissions],
    });
    onSaved({ ...saved, system: group?.system });
  };

  return (
    <section aria-labelledby="access-group-editor-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="access-group-editor-heading" className="text-lg font-black text-slate-900">
            {isNew ? 'New permission group' : readOnly ? `${group.name} (read-only)` : `Edit ${group.name}`}
          </h2>
          {readOnly && (
            <p className="mt-1 text-sm text-slate-600">The Super Admin group is protected and is shown read-only.</p>
          )}
        </div>
        <button type="button" onClick={onClose} className={`${buttonClass} border border-slate-300 bg-white text-slate-700`}>
          Close
        </button>
      </div>

      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (canSave) setConfirming(true);
        }}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-semibold text-slate-700">
            Group name
            <input
              ref={nameRef}
              type="text"
              value={name}
              maxLength={80}
              required
              disabled={readOnly}
              onChange={(event) => setName(event.target.value)}
              aria-describedby={hint ? 'access-group-editor-hint' : undefined}
              className={fieldClass}
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Description
            <input
              type="text"
              value={description}
              maxLength={200}
              disabled={readOnly}
              onChange={(event) => setDescription(event.target.value)}
              className={fieldClass}
            />
          </label>
        </div>

        <fieldset disabled={readOnly}>
          <legend className="mb-2 text-sm font-semibold text-slate-700">Permissions</legend>
          <p className="mb-3 text-xs text-slate-500">
            Permissions you do not hold are locked. You can only grant what you already have.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {catalog.map((permission) => {
              const allowed = holdsPermission(ctx, permission);
              return (
                <label
                  key={permission}
                  className={`flex items-center gap-3 rounded-xl p-3 text-sm font-semibold ${allowed ? 'bg-slate-50 text-slate-700' : 'bg-slate-100 text-slate-400'}`}
                >
                  <input
                    type="checkbox"
                    checked={permissions.has(permission)}
                    disabled={readOnly || !allowed}
                    onChange={(event) => togglePermission(permission, event.target.checked)}
                    className="h-4 w-4 accent-orange-500"
                  />
                  <span>
                    {permissionLabel(permission)}
                    {!allowed && <span className="sr-only"> (locked: you do not hold this permission)</span>}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {hint && (
          <p id="access-group-editor-hint" role="status" className="text-sm font-semibold text-amber-800">
            {hint}
          </p>
        )}

        {!readOnly && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!canSave}
              className={`${buttonClass} bg-brand-orange px-4 py-2 text-sm text-white`}
            >
              {isNew ? 'Create group' : 'Save permissions'}
            </button>
          </div>
        )}
      </form>

      <AdminActionDialog
        open={confirming}
        title={isNew ? 'Create permission group?' : 'Save group permissions?'}
        description={`${trimmedName || 'This group'} will have ${permissions.size} permission${permissions.size === 1 ? '' : 's'}. The change is recorded in the audit log.`}
        confirmLabel={isNew ? 'Create group' : 'Save permissions'}
        onConfirm={confirmSave}
        onCancel={() => setConfirming(false)}
      />
    </section>
  );
};

export default GroupEditor;
