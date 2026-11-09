import React, { useMemo, useState } from 'react';
import { displayName, matchesUserSearch, userKey, type AdminDirectoryUser } from './recipients';
import { inputClass } from '../shared';

/** Keeps the rendered list responsive; the search narrows larger sets. */
const RESULT_LIMIT = 100;

interface UserPickerProps {
  /** Id used to connect the search field and the list to their labels. */
  idPrefix: string;
  users: AdminDirectoryUser[];
  selectedIds: ReadonlySet<string>;
  onToggle: (userId: string) => void;
  onClear: () => void;
  disabled?: boolean;
}

/** Searchable multi-select of users. Each row is a native checkbox, so it works with the keyboard and screen readers. */
const UserPicker: React.FC<UserPickerProps> = ({ idPrefix, users, selectedIds, onToggle, onClear, disabled = false }) => {
  const [search, setSearch] = useState('');

  const matches = useMemo(() => users.filter((user) => matchesUserSearch(user, search)), [users, search]);
  const shown = matches.slice(0, RESULT_LIMIT);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-bold text-slate-800" aria-live="polite">
          {selectedIds.size} selected
        </span>
        {selectedIds.size > 0 && !disabled && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
          >
            Clear selection
          </button>
        )}
      </div>

      <label htmlFor={`${idPrefix}-search`} className="sr-only">
        Search users by name, email, location or gender
      </label>
      <input
        id={`${idPrefix}-search`}
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search by name, email, location or gender"
        className={`${inputClass} mb-2 max-w-none`}
        disabled={disabled}
      />

      {users.length === 0 ? (
        <p className="p-2 text-sm text-slate-500">No users loaded.</p>
      ) : matches.length === 0 ? (
        <p className="p-2 text-sm text-slate-500">No users match this search.</p>
      ) : (
        <ul id={`${idPrefix}-list`} className="max-h-64 space-y-1 overflow-y-auto" aria-label="Users">
          {shown.map((user) => {
            const id = userKey(user);
            const checked = selectedIds.has(id);
            return (
              <li key={id}>
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 hover:bg-orange-50 focus-within:ring-2 focus-within:ring-brand-orange ${checked ? 'bg-orange-50' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => onToggle(id)}
                    className="mt-1 h-4 w-4 shrink-0 accent-orange-500"
                  />
                  <span className="min-w-0">
                    <span className="block break-words text-sm font-bold text-slate-800">{displayName(user)}</span>
                    <span className="block break-words text-xs text-slate-500">
                      {user.email || 'No email'} · {user.location || user.country || 'No location'}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
      {matches.length > RESULT_LIMIT && (
        <p className="mt-2 text-xs text-slate-500">
          Showing the first {RESULT_LIMIT} of {matches.length} matches. Refine the search to see more.
        </p>
      )}
    </div>
  );
};

export default UserPicker;
