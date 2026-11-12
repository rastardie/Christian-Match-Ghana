import type { User } from '../../../types';

/**
 * A profile row from getAdminUsers(). firestoreDocId is the users/{uid} document ID,
 * which the admin callables also treat as the Firebase Auth UID.
 */
export type UserRow = User & {
  firestoreDocId: string;
  /** Not declared on User. Included in search when a profile stores it. */
  loginName?: string;
  /** Written by the server and by profile saves. Shown as Last updated. */
  updatedAt?: unknown;
};

export type StatusFilter = 'all' | 'active' | 'blocked';
export type RoleFilter = 'all' | 'user' | 'subscriber';

export interface Notice {
  tone: 'ok' | 'error';
  text: string;
}

/**
 * A confirmation shown in AdminActionDialog. `run` must throw on failure so the
 * dialog stays open and shows the reason. Bulk runs report failures in the notice instead.
 */
export interface PendingAction {
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  requirePassword: boolean;
  run: () => Promise<void>;
}

export interface PanelAccess {
  isSuperAdmin?: boolean;
  permissions?: string[];
}

/**
 * Returns a permission check. When neither prop is supplied, every action is shown.
 * The server still enforces each permission on every callable.
 */
export function makeCan(access: PanelAccess): (permission: string) => boolean {
  return (permission) =>
    access.isSuperAdmin === true || access.permissions === undefined || access.permissions.includes(permission);
}
