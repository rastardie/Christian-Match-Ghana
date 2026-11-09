import type { RoleFilter, StatusFilter } from './types';

/** Sidebar sub-views for the Users section. Keys match src/admin/adminNav.ts. */
export const USER_VIEWS = ['all', 'add', 'subscribers', 'blocked'] as const;
export type UserView = (typeof USER_VIEWS)[number];

export interface ViewPreset {
  status: StatusFilter;
  role: RoleFilter;
}

/**
 * Filters applied when a view is opened. Changing the sidebar view resets the
 * filters to these values, so 'all' always starts unfiltered. Within a view the
 * administrator can still change the search and filter dropdowns.
 */
export const VIEW_PRESETS: Record<UserView, ViewPreset> = {
  all: { status: 'all', role: 'all' },
  add: { status: 'all', role: 'all' },
  subscribers: { status: 'all', role: 'subscriber' },
  blocked: { status: 'blocked', role: 'all' },
};

/** Short explanation shown above the table. Null when a view needs no note. */
export const VIEW_INTRO: Record<UserView, string | null> = {
  all: null,
  add: null,
  subscribers:
    'Showing users with a premium subscription. Use the Subscription button on a row to grant, extend, or revoke access.',
  blocked: 'Showing blocked users. Unblocking restores their access to the app after you confirm with your password.',
};

/** Unknown or missing values fall back to the first sub-item, 'all'. */
export function resolveUserView(view: string | undefined): UserView {
  return (USER_VIEWS as readonly string[]).includes(view ?? '') ? (view as UserView) : 'all';
}
