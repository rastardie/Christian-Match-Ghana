/**
 * Left-hand navigation for the desktop admin console.
 * Each section is shown only to admins who hold its permission (super admins see everything).
 * Each sub-item is passed to its panel as the `view` prop. The server still enforces every permission.
 */

export type SectionKey =
  | 'overview'
  | 'users'
  | 'prayers'
  | 'moderation'
  | 'messages'
  | 'payments'
  | 'groups'
  | 'audit'
  | 'access';

export interface SubsectionItem {
  key: string;
  label: string;
  /** Only shown to Super Admins. */
  superOnly?: boolean;
}

export interface SectionItem {
  key: SectionKey;
  label: string;
  permission: string | null;
  children: SubsectionItem[];
}

export const SECTIONS: SectionItem[] = [
  {
    key: 'overview',
    label: 'Overview',
    permission: null,
    children: [
      { key: 'dashboard', label: 'Dashboard' },
      { key: 'analytics', label: 'Analytics & reports' },
    ],
  },
  {
    key: 'users',
    label: 'Users',
    permission: 'users.view',
    children: [
      { key: 'all', label: 'All users' },
      { key: 'add', label: 'Add user' },
      { key: 'subscribers', label: 'Subscribers' },
      { key: 'blocked', label: 'Blocked users' },
    ],
  },
  {
    key: 'prayers',
    label: 'Prayers',
    permission: 'users.view',
    children: [
      { key: 'requests', label: 'Prayer requests' },
      { key: 'export', label: 'Export' },
    ],
  },
  {
    key: 'moderation',
    label: 'Moderation',
    permission: 'messages.moderate',
    children: [
      { key: 'reports', label: 'Reports' },
      { key: 'blocked', label: 'Blocked accounts' },
    ],
  },
  {
    key: 'messages',
    label: 'Messages',
    permission: 'messages.view',
    children: [
      { key: 'compose', label: 'Compose' },
      { key: 'conversations', label: 'Conversations' },
    ],
  },
  {
    key: 'payments',
    label: 'Payments',
    permission: 'payments.view',
    children: [
      { key: 'payments', label: 'Payment records' },
      { key: 'subscriptions', label: 'Subscriptions' },
    ],
  },
  {
    key: 'groups',
    label: 'Audiences',
    permission: 'messages.groups.manage',
    children: [
      { key: 'all', label: 'All audiences' },
      { key: 'new', label: 'New audience' },
    ],
  },
  {
    key: 'audit',
    label: 'Audit log',
    permission: 'audit.view',
    children: [
      { key: 'all', label: 'All activity' },
      { key: 'accounts', label: 'Account changes' },
      { key: 'admins', label: 'Admin changes' },
    ],
  },
  {
    key: 'access',
    label: 'Access control',
    permission: 'groups.manage',
    children: [
      { key: 'groups', label: 'Groups & permissions' },
      { key: 'admins', label: 'Administrators' },
      { key: 'create', label: 'Create administrator', superOnly: true },
    ],
  },
];
