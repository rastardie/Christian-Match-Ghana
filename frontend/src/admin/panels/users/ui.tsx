import React, { useEffect, useId, useRef } from 'react';

export const fieldClass =
  'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand-orange focus:outline-none disabled:bg-slate-100';
export const labelClass = 'block text-sm font-semibold text-slate-700';
export const primaryButtonClass =
  'rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50';
export const dangerButtonClass =
  'rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50';
export const secondaryButtonClass =
  'rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';
export const toolbarButtonClass =
  'rounded-lg px-3 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50';

interface ModalProps {
  title: string;
  description?: string;
  /** While true, the modal cannot be closed (for example while a confirmation is open or a save is running). */
  locked?: boolean;
  wide?: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

/** Accessible modal shell: labelled dialog, Escape to close, and a visible close button. */
export const Modal: React.FC<ModalProps> = ({ title, description, locked = false, wide = false, onClose, children }) => {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (locked) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [locked, onClose]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4"
      role="presentation"
      onClick={() => {
        if (!locked) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white p-6 shadow-xl ${wide ? 'max-w-2xl' : 'max-w-lg'}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-lg font-bold text-slate-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={locked}
            aria-label="Close"
            className="rounded-lg px-2 py-1 text-xl leading-none text-slate-500 hover:bg-slate-100 disabled:opacity-40"
          >
            ×
          </button>
        </div>
        {description && (
          <p id={descriptionId} className="mt-1 text-sm text-slate-600">
            {description}
          </p>
        )}
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
};

interface IndeterminateCheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  label: string;
  onChange: () => void;
}

/** Checkbox with the indeterminate (mixed) state, which plain HTML cannot set. */
export const IndeterminateCheckbox: React.FC<IndeterminateCheckboxProps> = ({
  checked,
  indeterminate = false,
  disabled = false,
  label,
  onChange,
}) => {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={label}
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      className="h-4 w-4 cursor-pointer accent-brand-orange disabled:cursor-not-allowed"
    />
  );
};
