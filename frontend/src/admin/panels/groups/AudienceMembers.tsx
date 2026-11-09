import React from 'react';
import type { AdminAudienceMember } from '../../../services/adminRbacService';
import { tableClass, tdClass, thClass } from '../shared';

export type AudienceMembersState =
  | { status: 'loading' }
  | { status: 'ready'; count: number; members: AdminAudienceMember[] }
  | { status: 'error'; message: string };

interface AudienceMembersProps {
  /** Element id used by the expand button's aria-controls. */
  panelId: string;
  audienceName: string;
  state: AudienceMembersState | undefined;
  /** Emails are not returned by the preview callable, so they are looked up from the loaded user list. */
  emailFor: (userId: string) => string | undefined;
}

/** Members of one audience. The server returns at most 100 members; the count shows the full total. */
const AudienceMembers: React.FC<AudienceMembersProps> = ({ panelId, audienceName, state, emailFor }) => {
  return (
    <div id={panelId} role="region" aria-label={`Members of ${audienceName}`} className="px-4 py-3">
      {(state === undefined || state.status === 'loading') && <p className="py-3 text-sm text-slate-500">Loading members…</p>}

      {state?.status === 'error' && (
        <p role="alert" className="py-3 text-sm font-semibold text-red-600">{state.message}</p>
      )}

      {state?.status === 'ready' && state.count === 0 && (
        <p className="py-3 text-sm text-slate-500">No users are currently in this audience.</p>
      )}

      {state?.status === 'ready' && state.count > 0 && (
        <>
          <p className="mb-2 text-xs font-semibold text-slate-500">
            {state.count} member{state.count === 1 ? '' : 's'}
            {state.members.length < state.count ? ` · showing the first ${state.members.length}` : ''}
          </p>
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <caption className="sr-only">Members of {audienceName}</caption>
              <thead>
                <tr>
                  <th scope="col" className={thClass}>#</th>
                  <th scope="col" className={thClass}>Name</th>
                  <th scope="col" className={thClass}>Email</th>
                  <th scope="col" className={thClass}>Gender</th>
                  <th scope="col" className={thClass}>Country</th>
                  <th scope="col" className={thClass}>Location</th>
                  <th scope="col" className={thClass}>State</th>
                </tr>
              </thead>
              <tbody>
                {state.members.map((member, index) => (
                  <tr key={member.id}>
                    <td className={tdClass}>{index + 1}</td>
                    <td className={`${tdClass} font-bold`}>{member.name}</td>
                    <td className={tdClass}>{emailFor(member.id) || '—'}</td>
                    <td className={`${tdClass} capitalize`}>{member.gender || '—'}</td>
                    <td className={`${tdClass} capitalize`}>{member.country || '—'}</td>
                    <td className={tdClass}>{member.location || '—'}</td>
                    <td className={`${tdClass} capitalize`}>{member.accountState || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default AudienceMembers;
