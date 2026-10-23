const PERMISSIONS = [
  'users.view',
  'users.create',
  'users.edit',
  'users.suspend',
  'users.delete',
  'messages.view',
  'messages.send',
  'messages.moderate',
  'messages.groups.manage',
  'notifications.manage',
  'notifications.email.send',
  'notifications.sms.send',
  'subscriptions.manage',
  'payments.view',
  'groups.manage',
  'permissions.manage',
  'settings.manage',
  'audit.view',
];

const DEFAULT_GROUPS = [
  { id: 'super-admins', name: 'Super Admin', description: 'Unrestricted administration access.', permissions: PERMISSIONS },
  { id: 'admins', name: 'Admin', description: 'General platform administration.', permissions: PERMISSIONS.filter((permission) => !permission.startsWith('permissions.') && permission !== 'audit.view') },
  { id: 'moderators', name: 'Moderator', description: 'User and message moderation.', permissions: ['users.view', 'users.suspend', 'messages.view', 'messages.moderate'] },
  { id: 'customer-support', name: 'Customer Support', description: 'Support and user assistance.', permissions: ['users.view', 'users.edit', 'messages.view', 'notifications.manage'] },
  { id: 'finance', name: 'Finance', description: 'Subscriptions and payment records.', permissions: ['payments.view', 'subscriptions.manage'] },
  { id: 'notification-manager', name: 'Notification Manager', description: 'Notification operations.', permissions: ['notifications.manage', 'notifications.email.send', 'notifications.sms.send'] },
];

function permissionsFromGroups(groups, groupIds) {
  const permissions = new Set();
  for (const group of groups) {
    if (groupIds.includes(group.id)) {
      for (const permission of group.permissions || []) permissions.add(permission);
    }
  }
  return [...permissions].sort();
}

module.exports = { PERMISSIONS, DEFAULT_GROUPS, permissionsFromGroups };
