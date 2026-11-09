/** Formats Firestore Timestamps, ISO strings, and epoch numbers for display. */
export function formatDate(value: unknown): string {
  if (!value) return '—';
  const withToDate = value as { toDate?: () => Date };
  let date: Date | null = null;
  if (typeof withToDate.toDate === 'function') {
    date = withToDate.toDate();
  } else if (typeof value === 'string' || typeof value === 'number') {
    date = new Date(value);
  }
  if (!date || Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

export function truncate(text: unknown, max = 140): string {
  const value = typeof text === 'string' ? text : '';
  return value.length > max ? `${value.slice(0, max)}…` : value || '—';
}

export const tableClass = 'w-full text-left text-sm';
export const thClass = 'border-b border-slate-200 px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-500';
export const tdClass = 'border-b border-slate-100 px-4 py-3 align-top text-slate-800';
export const inputClass =
  'w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none';
export const buttonClass =
  'rounded-lg px-3 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50';
