import React, { useEffect, useRef, useState } from 'react';

export interface RowAction {
  key: string;
  label: string;
  danger?: boolean;
  onSelect: () => void;
}

interface UserRowMenuProps {
  /** Unique key for the row, used to link the button to its list. */
  id: string;
  userName: string;
  actions: RowAction[];
  disabled?: boolean;
}

/**
 * Row actions behind a disclosure button. Every item is a native button, so it is
 * reachable with Tab and Enter. Escape or a click outside closes the list.
 */
const UserRowMenu: React.FC<UserRowMenuProps> = ({ id, userName, actions, disabled = false }) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listId = `row-actions-${id}`;

  useEffect(() => {
    if (!open) return;
    const handlePointer = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  if (actions.length === 0) return <span className="text-xs text-slate-400">No actions</span>;

  return (
    <div ref={wrapperRef} className="relative inline-block text-left">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`Actions for ${userName}`}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Actions
        <span aria-hidden="true"> ▾</span>
      </button>
      {open && (
        <div
          id={listId}
          role="group"
          aria-label={`Actions for ${userName}`}
          className="absolute right-0 z-30 mt-1 w-64 rounded-xl bg-white p-1 shadow-lg ring-1 ring-slate-200"
        >
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={() => {
                setOpen(false);
                action.onSelect();
              }}
              className={`block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-slate-100 ${
                action.danger ? 'text-red-700' : 'text-slate-800'
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserRowMenu;
