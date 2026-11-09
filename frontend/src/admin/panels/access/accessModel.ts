import type { AdminAccessUser, AdminGroup } from '../../../services/adminRbacService';

/** The Super Admin group. Read-only in this console, and assignable only by a Super Admin. */
export const SUPER_ADMIN_GROUP_ID = 'super-admins';

export interface AccessContext {
  isSuperAdmin: boolean;
  permissions: ReadonlySet<string>;
}

export interface FeedbackMessage {
  type: 'ok' | 'error';
  text: string;
}

/** Super Admins hold every permission. Everyone else holds what the server reports for their account. */
export function holdsPermission(ctx: AccessContext, permission: string): boolean {
  return ctx.isSuperAdmin || ctx.permissions.has(permission);
}

/** Matches the server: listing and saving groups requires groups.manage. */
export function canManageGroups(ctx: AccessContext): boolean {
  return holdsPermission(ctx, 'groups.manage');
}

export function isProtectedGroup(group: Pick<AdminGroup, 'id'>): boolean {
  return group.id === SUPER_ADMIN_GROUP_ID;
}

/** Super Admin accounts cannot be edited or removed from groups in this console. */
export function isProtectedAdmin(admin: Pick<AdminAccessUser, 'isSuperAdmin' | 'groupIds'>): boolean {
  return admin.isSuperAdmin === true || admin.groupIds.includes(SUPER_ADMIN_GROUP_ID);
}

/** Mirrors the server rule: a group can be granted only if the actor holds every permission it contains. */
export function canAssignGroup(ctx: AccessContext, group: AdminGroup): boolean {
  if (isProtectedGroup(group)) return ctx.isSuperAdmin;
  return group.permissions.every((permission) => holdsPermission(ctx, permission));
}

/** Same label format as the legacy access screen, e.g. "users.view" becomes "Users · View". */
export function permissionLabel(permission: string): string {
  return permission.replace(/\./g, ' · ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function memberLabel(user: { name?: string; email?: string } | undefined, fallback: string): string {
  return user?.name || user?.email || fallback;
}

export function sameIds(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((id) => set.has(id));
}

/** Merges server responses into the local admin list, matching on userId. */
export function mergeAdmins(current: AdminAccessUser[], updates: AdminAccessUser[]): AdminAccessUser[] {
  const byUserId = new Map(current.map((admin) => [admin.userId, admin] as const));
  for (const update of updates) {
    const previous = byUserId.get(update.userId);
    byUserId.set(update.userId, { ...previous, ...update, id: previous?.id ?? update.userId });
  }
  return [...byUserId.values()];
}
