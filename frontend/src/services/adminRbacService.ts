import { httpsCallable } from 'firebase/functions';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

export const ADMIN_PERMISSION_CATALOG = [
  'users.view', 'users.create', 'users.edit', 'users.suspend', 'users.delete',
  'messages.view', 'messages.moderate', 'notifications.manage',
  'notifications.email.send', 'notifications.sms.send', 'subscriptions.manage',
  'payments.view', 'groups.manage', 'permissions.manage', 'settings.manage', 'audit.view',
] as const;

import { functions } from '../firebase';

export interface AdminGroup {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  system?: boolean;
}

export interface AdminAccessUser {
  id: string;
  userId: string;
  groupIds: string[];
  permissions: string[];
  isSuperAdmin?: boolean;
}

export async function listAdminAccessControl() {
  const call = httpsCallable(functions, 'adminListAccessControl');
  return (await call()).data as { permissions: string[]; groups: AdminGroup[]; users: AdminAccessUser[] };
}

export async function createAdministrator(input: { loginName: string; email: string; displayName: string; password: string }) {
  const call = httpsCallable(functions, 'adminCreateAdministrator');
  return (await call(input)).data as { userId: string; loginName: string; email: string; displayName: string; isSuperAdmin: boolean; mustChangePassword: boolean; isPremium: boolean };
}

export async function upsertAdminGroup(input: Partial<AdminGroup>) {
  const call = httpsCallable(functions, 'adminUpsertGroup');
  return (await call(input)).data as AdminGroup;
}

export async function assignAdminUserGroups(userId: string, groupIds: string[]) {
  const call = httpsCallable(functions, 'adminAssignUserGroups');
  return (await call({ userId, groupIds })).data as AdminAccessUser;
}

export async function listAdminAuditLogs() {
  const call = httpsCallable(functions, 'adminListAuditLogs');
  return (await call()).data as Array<Record<string, any>>;
}

export async function getCurrentAdminAccess(): Promise<{ isSuperAdmin: boolean; permissions: string[] }> {
  const user = auth.currentUser;
  if (!user) return { isSuperAdmin: false, permissions: [] };
  if (user.email === 'christianmatchghanaltd@gmail.com' || user.email === 'admin@example.com') {
    return { isSuperAdmin: true, permissions: [...ADMIN_PERMISSION_CATALOG] };
  }
  const snapshot = await getDoc(doc(db, 'adminUsers', user.uid));
  if (!snapshot.exists()) return { isSuperAdmin: false, permissions: [] };
  const data = snapshot.data();
  return { isSuperAdmin: data.isSuperAdmin === true, permissions: Array.isArray(data.permissions) ? data.permissions : [] };
}
