import type { Notice, UserRow } from './types';

/** Mirrors the server rule in backend isStrongAdminPassword: 12 to 128 characters with four character classes. */
export const PASSWORD_POLICY =
  'Use 12 to 128 characters, including an uppercase letter, a lowercase letter, a number, and a special character.';

export const PIN_PATTERN = /^\d{4,6}$/;

/** Server id of the Super Admin group. Only Super Admins may grant it. */
export const SUPER_ADMIN_GROUP_ID = 'super-admins';

export function isStrongPassword(password: string): boolean {
  return (
    password.length >= 12 &&
    password.length <= 128 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

export function displayName(user: UserRow): string {
  return user.name || user.email || 'this user';
}

export function isUserBlocked(user: UserRow): boolean {
  return user.isBlocked === true;
}

/** Role is derived from isPremium, as the legacy dashboard does. */
export function roleLabel(user: UserRow): 'Subscriber' | 'User' {
  return user.isPremium ? 'Subscriber' : 'User';
}

export function toDateOrNull(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const withToDate = value as { toDate?: () => Date };
  let date: Date | null = null;
  if (typeof withToDate.toDate === 'function') {
    date = withToDate.toDate();
  } else if (typeof value === 'string' || typeof value === 'number') {
    date = new Date(value);
  }
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

/** Expiry from the Timestamp the server writes, falling back to the ISO string. */
export function subscriptionExpiry(user: UserRow): Date | null {
  return toDateOrNull(user.subscriptionExpiresAt) ?? toDateOrNull(user.subscriptionEndDate);
}

export function subscriptionLabel(user: UserRow, now: Date = new Date()): string {
  const expiry = subscriptionExpiry(user);
  if (user.isPremium) {
    if (!expiry) return 'Active (no expiry)';
    return expiry > now ? 'Active' : 'Expired';
  }
  // The server writes 'revoked', which is not in the User type's union.
  if (String(user.subscriptionStatus ?? '') === 'revoked') return 'Revoked';
  if (expiry) return 'Expired';
  return 'None';
}

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/**
 * Quotes a CSV cell. Values that start with a spreadsheet formula character are
 * prefixed with an apostrophe, but plain numbers such as phone numbers are left as they are.
 */
function csvCell(value: string): string {
  let text = value;
  if (/^[=+\-@\t\r]/.test(text) && !/^[+-]?[\d\s().-]+$/.test(text)) {
    text = `'${text}`;
  }
  return `"${text.replace(/"/g, '""')}"`;
}

const CSV_HEADERS = ['Name', 'Email', 'Phone', 'Status', 'Subscription status', 'Subscription expires', 'Created'];

export function buildUsersCsv(rows: UserRow[], now: Date = new Date()): string {
  const lines = [CSV_HEADERS.map(csvCell).join(',')];
  for (const user of rows) {
    const expiry = subscriptionExpiry(user);
    const created = toDateOrNull(user.createdAt);
    lines.push(
      [
        user.name || '',
        user.email || '',
        user.phone || '',
        isUserBlocked(user) ? 'Blocked' : 'Active',
        subscriptionLabel(user, now),
        expiry ? expiry.toISOString() : '',
        created ? created.toISOString() : '',
      ]
        .map(csvCell)
        .join(',')
    );
  }
  // The byte order mark lets Excel read UTF-8 names correctly.
  return `\ufeff${lines.join('\r\n')}`;
}

export function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface BulkItem {
  id: string;
  label: string;
}

export interface BulkResult {
  succeeded: string[];
  failed: Array<BulkItem & { reason: string }>;
}

/** Runs one request per item in order. A failure on one item does not stop the rest. */
export async function runSequentially(
  items: BulkItem[],
  task: (id: string) => Promise<void>,
  onProgress?: (done: number, total: number) => void
): Promise<BulkResult> {
  const result: BulkResult = { succeeded: [], failed: [] };
  for (const [index, item] of items.entries()) {
    try {
      await task(item.id);
      result.succeeded.push(item.id);
    } catch (error) {
      result.failed.push({ ...item, reason: errorMessage(error, 'The change failed.') });
    }
    onProgress?.(index + 1, items.length);
  }
  return result;
}

export function summariseBulk(action: string, total: number, result: BulkResult): Notice {
  const ok = result.succeeded.length;
  if (result.failed.length === 0) {
    return { tone: 'ok', text: `${action} ${ok} of ${total}.` };
  }
  const shown = result.failed
    .slice(0, 5)
    .map((failure) => `${failure.label} (${failure.reason})`)
    .join('; ');
  const more = result.failed.length > 5 ? `; and ${result.failed.length - 5} more` : '';
  return { tone: 'error', text: `${action} ${ok} of ${total}. Failed: ${shown}${more}.` };
}

/** Group changes made in the modal. Only groups the admin touched are listed. */
export type GroupChanges = Record<string, 'add' | 'remove'>;

/** Applies changes to a user's current groups, so unrelated groups are kept. */
export function applyGroupChanges(current: string[], changes: GroupChanges): string[] {
  const next = new Set(current);
  for (const [groupId, change] of Object.entries(changes)) {
    if (change === 'add') next.add(groupId);
    else next.delete(groupId);
  }
  return [...next];
}

export function sameMembers(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id) => b.includes(id));
}
