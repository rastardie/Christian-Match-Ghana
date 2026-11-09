import type { User } from '../../../types';
import type { DistributionGroup } from '../../../services/adminRbacService';

/** A user row from getAdminUsers, with an optional account status used by legacy data. */
export type AdminDirectoryUser = User & { firestoreDocId: string; status?: string };

/** Limits enforced by the adminSendMessage callable. */
export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_SEND_RECIPIENTS = 5000;
export const MAX_SEND_AUDIENCES = 50;

export const userKey = (user: AdminDirectoryUser): string => user.firestoreDocId || user.id;

/** Returns a new set with `id` added or removed. Omit `present` to toggle. */
export function toggleIdInSet(set: ReadonlySet<string>, id: string, present?: boolean): Set<string> {
  const next = new Set(set);
  const add = present ?? !next.has(id);
  if (add) next.add(id);
  else next.delete(id);
  return next;
}

/** Mirrors the server rule: blocked when isBlocked is true or status is "blocked". */
export const isBlockedUser = (user: { isBlocked?: boolean; status?: string }): boolean =>
  user.isBlocked === true || String(user.status || '').trim().toLowerCase() === 'blocked';

/** Users who can receive an admin message: not blocked and not the signed-in admin. */
export function activeRecipientUsers(users: AdminDirectoryUser[], currentUid: string | undefined): AdminDirectoryUser[] {
  return users.filter((user) => !isBlockedUser(user) && userKey(user) !== currentUid);
}

export function matchesUserSearch(user: User, term: string): boolean {
  const needle = term.trim().toLowerCase();
  if (!needle) return true;
  return [user.name, user.email, user.location, user.gender].some((value) =>
    String(value || '').toLowerCase().includes(needle),
  );
}

export function displayName(user: User): string {
  return user.name || user.email || 'Unnamed user';
}

export type RecipientMode = 'all' | 'selected' | 'audience';

export interface RecipientSummary {
  /** Recipient count. Exact for "all" and "selected"; an upper bound for "audience". */
  count: number;
  exact: boolean;
  /** Why sending is not possible yet, or null when the selection is sendable. */
  blocker: string | null;
  /** Plain-language description used in the confirmation dialog. */
  description: string;
}

export function summariseRecipients(args: {
  mode: RecipientMode;
  activeUsers: AdminDirectoryUser[];
  selectedUserIds: ReadonlySet<string>;
  audiences: DistributionGroup[];
  selectedAudienceIds: ReadonlySet<string>;
}): RecipientSummary {
  const { mode, activeUsers, selectedUserIds, audiences, selectedAudienceIds } = args;

  if (mode === 'all') {
    const count = activeUsers.length;
    return {
      count,
      exact: true,
      blocker: count === 0 ? 'There are no active users to message.' : overLimit(count),
      description: `all ${count} active user${count === 1 ? '' : 's'}`,
    };
  }

  if (mode === 'selected') {
    const count = activeUsers.filter((user) => selectedUserIds.has(userKey(user))).length;
    if (selectedUserIds.size === 0) {
      return { count: 0, exact: true, blocker: 'Add at least one recipient.', description: '' };
    }
    return {
      count,
      exact: true,
      blocker: count === 0 ? 'None of the selected users are active recipients.' : overLimit(count),
      description: `${count} selected active user${count === 1 ? '' : 's'}`,
    };
  }

  const chosen = audiences.filter((audience) => selectedAudienceIds.has(audience.id));
  const upperBound = chosen.reduce((total, audience) => total + (audience.memberCount ?? 0), 0);
  const names = chosen.map((audience) => audience.name).join(', ');
  let blocker: string | null = null;
  if (chosen.length === 0) blocker = 'Choose at least one saved audience.';
  else if (chosen.length > MAX_SEND_AUDIENCES) blocker = `Select no more than ${MAX_SEND_AUDIENCES} saved audiences at once.`;
  else if (upperBound === 0) blocker = 'The selected audiences have no members.';
  return {
    count: upperBound,
    exact: false,
    blocker,
    description: `up to ${upperBound} recipient${upperBound === 1 ? '' : 's'} across ${chosen.length} audience${chosen.length === 1 ? '' : 's'} (${names}). Members in more than one audience receive one message, and inactive users and your own account are excluded.`,
  };
}

function overLimit(count: number): string | null {
  return count > MAX_SEND_RECIPIENTS
    ? `This selection has ${count} recipients. A single send supports up to ${MAX_SEND_RECIPIENTS.toLocaleString('en-GB')}.`
    : null;
}
