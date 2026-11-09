import React, { useEffect, useState } from 'react';
import { listAdminDistributionGroups, type DistributionGroup } from '../../services/adminRbacService';
import { formatDate, tableClass, tdClass, thClass } from './shared';

const summarise = (values: string[] | undefined, fallback: string) =>
  values && values.length > 0 ? values.join(', ') : fallback;

const GroupsPanel: React.FC = () => {
  const [groups, setGroups] = useState<DistributionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listAdminDistributionGroups()
      .then((rows) => {
        if (active) setGroups(rows);
      })
      .catch((err) => {
        console.error('Loading message groups failed:', err);
        if (active) setError('Message groups could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <p className="text-slate-600">Loading message groups…</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (groups.length === 0) return <p className="text-slate-600">No message groups yet.</p>;

  return (
    <div>
      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className={tableClass}>
          <thead>
            <tr>
              <th className={thClass}>Group</th>
              <th className={thClass}>Members</th>
              <th className={thClass}>Gender</th>
              <th className={thClass}>Country</th>
              <th className={thClass}>Locations</th>
              <th className={thClass}>Account state</th>
              <th className={thClass}>Updated</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <tr key={group.id}>
                <td className={tdClass}>
                  <div className="font-bold">{group.name}</div>
                  {group.description && <div className="text-xs text-slate-500">{group.description}</div>}
                  {group.system && <span className="text-xs font-bold text-brand-orange">System group</span>}
                </td>
                <td className={tdClass}>{group.memberCount ?? '—'}</td>
                <td className={tdClass}>{summarise(group.criteria?.gender, 'Any')}</td>
                <td className={tdClass}>{summarise(group.criteria?.country, 'Any')}</td>
                <td className={tdClass}>{summarise(group.criteria?.locations, 'Any')}</td>
                <td className={tdClass}>{group.criteria?.accountState ?? 'any'}</td>
                <td className={tdClass}>{formatDate(group.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-slate-500">Creating and editing groups will be added in a later step.</p>
    </div>
  );
};

export default GroupsPanel;
