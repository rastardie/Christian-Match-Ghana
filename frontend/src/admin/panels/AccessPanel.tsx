import React, { useEffect, useState } from 'react';
import { listAdminAccessControl, type AdminAccessUser, type AdminGroup } from '../../services/adminRbacService';
import { tableClass, tdClass, thClass } from './shared';

const AccessPanel: React.FC = () => {
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [admins, setAdmins] = useState<AdminAccessUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listAdminAccessControl()
      .then((data) => {
        if (!active) return;
        setGroups(data.groups ?? []);
        setAdmins(data.users ?? []);
      })
      .catch((err) => {
        console.error('Loading access control failed:', err);
        if (active) setError('Access control could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <p className="text-slate-600">Loading access control…</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  const groupName = (id: string) => groups.find((group) => group.id === id)?.name || id;

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-lg font-black text-slate-900">Permission groups</h2>
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Group</th>
                <th className={thClass}>Description</th>
                <th className={thClass}>Permissions</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <tr key={group.id}>
                  <td className={tdClass}>{group.name}</td>
                  <td className={tdClass}>{group.description || '—'}</td>
                  <td className={tdClass}>{group.permissions.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-black text-slate-900">Administrators</h2>
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Account</th>
                <th className={thClass}>Super admin</th>
                <th className={thClass}>Groups</th>
                <th className={thClass}>Direct permissions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.id}>
                  <td className={tdClass}>{admin.userId}</td>
                  <td className={tdClass}>{admin.isSuperAdmin ? 'Yes' : 'No'}</td>
                  <td className={tdClass}>{admin.groupIds.map(groupName).join(', ') || '—'}</td>
                  <td className={tdClass}>{admin.permissions.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <p className="text-xs text-slate-500">Changing groups and permissions will be added in a later step.</p>
    </div>
  );
};

export default AccessPanel;
