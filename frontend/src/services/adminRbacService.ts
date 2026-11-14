import { httpsCallable } from 'firebase/functions';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

export const ADMIN_PERMISSION_CATALOG = [
  'users.view', 'users.create', 'users.edit', 'users.suspend', 'users.delete',
  'messages.view', 'messages.send', 'messages.moderate', 'messages.content.view', 'messages.groups.manage', 'notifications.manage',
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

export async function adminSendPasswordResetEmail(userId: string) {
  const call = httpsCallable(functions, 'adminSendPasswordResetEmail');
  return (await call({ userId })).data as { sent: boolean; targetUserId: string };
}

export async function adminSetUserPassword(input: { userId: string; newPassword: string; forceChange: boolean }) {
  const call = httpsCallable(functions, 'adminSetUserPassword');
  return (await call(input)).data as { updated: boolean; targetUserId: string; forceChange: boolean };
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

export async function getCurrentAdminAccess(): Promise<{ isSuperAdmin: boolean; permissions: string[]; blocked?: boolean }> {
  const user = auth.currentUser;
  if (!user) return { isSuperAdmin: false, permissions: [] };
  // Blocked accounts get no console access, even if they hold admin rights.
  const profile = await getDoc(doc(db, 'users', user.uid));
  if (profile.exists() && profile.data().isBlocked === true) {
    return { isSuperAdmin: false, permissions: [], blocked: true };
  }
  if (user.email === 'christianmatchghanaltd@gmail.com') {
    return { isSuperAdmin: true, permissions: [...ADMIN_PERMISSION_CATALOG] };
  }
  const snapshot = await getDoc(doc(db, 'adminUsers', user.uid));
  if (!snapshot.exists()) return { isSuperAdmin: false, permissions: [] };
  const data = snapshot.data();
  const permissions = Array.isArray(data.permissions) ? [...data.permissions] : [];
  // Existing members of the built-in Admin group receive the legal-review capability
  // through the group identity even before their stored permission snapshot is refreshed.
  if (Array.isArray(data.groupIds) && data.groupIds.includes('admins') && !permissions.includes('messages.content.view')) {
    permissions.push('messages.content.view');
  }
  return { isSuperAdmin: data.isSuperAdmin === true, permissions };
}

export interface DistributionGroupCriteria {
  mode?: 'criteria' | 'selected';
  userIds?: string[];
  gender: string[];
  country: string[];
  locations: string[];
  accountState: 'active' | 'blocked' | 'any';
}

export interface DistributionGroup {
  id: string;
  name: string;
  description?: string;
  criteria: DistributionGroupCriteria;
  memberCount?: number;
  system?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export async function listAdminDistributionGroups(): Promise<DistributionGroup[]> {
  const call = httpsCallable(functions, 'adminListDistributionGroups');
  return (await call()).data as DistributionGroup[];
}

export async function createAdminDistributionGroup(input: {
  name: string;
  description?: string;
  criteria: DistributionGroupCriteria;
}): Promise<DistributionGroup> {
  const call = httpsCallable(functions, 'adminCreateDistributionGroup');
  return (await call(input)).data as DistributionGroup;
}

export async function updateAdminDistributionGroup(input: {
  groupId: string;
  name: string;
  description?: string;
  criteria: DistributionGroupCriteria;
}): Promise<DistributionGroup> {
  const call = httpsCallable(functions, 'adminUpdateDistributionGroup');
  return (await call(input)).data as DistributionGroup;
}

export async function deleteAdminDistributionGroup(groupId: string): Promise<{ id: string; deleted: boolean }> {
  const call = httpsCallable(functions, 'adminDeleteDistributionGroup');
  return (await call({ groupId })).data as { id: string; deleted: boolean };
}

export async function previewAdminDistributionGroup(input: {
  groupId?: string;
  criteria?: DistributionGroupCriteria;
}): Promise<{ count: number; preview: Array<Record<string, string>> }> {
  const call = httpsCallable(functions, 'adminPreviewDistributionGroup');
  return (await call(input)).data as { count: number; preview: Array<Record<string, string>> };
}

export async function getAdminDistributionMemberships(userIds: string[]): Promise<Record<string, Array<{ id: string; name: string }>>> {
  const call = httpsCallable(functions, 'adminGetDistributionMemberships');
  return (await call({ userIds })).data as Record<string, Array<{ id: string; name: string }>>;
}

export type AdminMessageRecipientMode = 'all' | 'selected' | 'audience';

export interface AdminSendMessageResult {
  broadcastId: string;
  recipientMode: AdminMessageRecipientMode;
  audienceId?: string;
  audienceIds?: string[];
  resolvedCount: number;
  sentCount: number;
  skippedCount: number;
}

export async function adminSendMessage(input: {
  text: string;
  recipientMode: AdminMessageRecipientMode;
  userIds?: string[];
  audienceId?: string;
  audienceIds?: string[];
}): Promise<AdminSendMessageResult> {
  const call = httpsCallable(functions, 'adminSendMessage');
  return (await call(input)).data as AdminSendMessageResult;
}

export interface AdminAudienceMember {
  id: string;
  name: string;
  gender: string;
  country: string;
  location: string;
  accountState: string;
}

export interface AdminAudiencePreview {
  count: number;
  members: AdminAudienceMember[];
}

const asText = (value: unknown): string => (typeof value === 'string' ? value : '');

/**
 * Typed wrapper around previewAdminDistributionGroup. Accepts either a saved
 * audience (groupId) or unsaved criteria. The server returns at most 100 sample members.
 */
export async function previewAdminAudience(input: {
  groupId?: string;
  criteria?: DistributionGroupCriteria;
}): Promise<AdminAudiencePreview> {
  const result = await previewAdminDistributionGroup(input);
  const rows: unknown[] = Array.isArray(result.preview) ? result.preview : [];
  return {
    count: typeof result.count === 'number' ? result.count : 0,
    members: rows
      .filter((row): row is Record<string, string> => typeof row === 'object' && row !== null)
      .map((row) => ({
        id: asText(row.id),
        name: asText(row.name) || 'Unnamed user',
        gender: asText(row.gender),
        country: asText(row.country),
        location: asText(row.location),
        accountState: asText(row.accountState),
      })),
  };
}

export interface AdminConversation {
  id: string;
  archiveId?: string | null;
  archived?: boolean;
  participantNames: [string, string];
  lastMessage: string;
  lastMessageTime: unknown;
  createdAt: unknown;
  deletedAt?: unknown;
}

export interface AdminConversationMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  text: string;
  type: string;
  timestamp: unknown;
  editedAt?: unknown;
  deleted?: boolean;
  deletedAt?: unknown;
  fileName?: string;
  fileUrl?: string;
  location?: unknown;
}

export async function getAdminConversationMessages(chatId: string, archiveId?: string | null): Promise<{ chatId: string; archiveId?: string | null; participants: Array<{ id: string; name: string }>; messages: AdminConversationMessage[]; hasMore: boolean }> {
  const call = httpsCallable(functions, 'adminListConversationMessages');
  return (await call({ chatId, archiveId: archiveId || undefined })).data as { chatId: string; archiveId?: string | null; participants: Array<{ id: string; name: string }>; messages: AdminConversationMessage[]; hasMore: boolean };
}


const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Conversation list for the Messages panel. Reads the same `chats` collection as
 * getAdminConnections, but keeps lastMessageTime and surfaces query errors instead
 * of returning an empty list. Chats without lastMessageTime are excluded by Firestore ordering.
 */
export async function listAdminConversations(): Promise<AdminConversation[]> {
  const call = httpsCallable(functions, 'adminListConversations');
  return (await call()).data as AdminConversation[];
}
