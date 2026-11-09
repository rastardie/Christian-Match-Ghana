import React, { useEffect, useState } from 'react';
import { getAnalyticsData, type AnalyticsData } from '../../../services/adminService';

type RangeKey = '7d' | '30d' | '90d' | 'custom';
type PresetKey = Exclude<RangeKey, 'custom'>;

/** Same presets as the legacy analytics view: Week, Month, Quarter, and Custom. */
const PRESETS: Array<{ key: PresetKey; label: string; period: string }> = [
  { key: '7d', label: 'Week', period: 'Last 7 days' },
  { key: '30d', label: 'Month', period: 'Last 30 days' },
  { key: '90d', label: 'Quarter', period: 'Last 90 days' },
];

/**
 * Print styles. Only the element with class admin-print-report is printed, the
 * admin-print-hide controls are removed, and the print-only header is shown.
 */
const PRINT_CSS = `
.admin-print-only { display: none; }
@media print {
  body * { visibility: hidden !important; }
  .admin-print-report, .admin-print-report * { visibility: visible !important; }
  .admin-print-report {
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    margin: 0 !important;
    padding: 16px !important;
    border: 0 !important;
    box-shadow: none !important;
    background: #fff !important;
  }
  .admin-print-hide { display: none !important; }
  .admin-print-only { display: block !important; }
}
`;

function customRangeError(start: string, end: string): string | null {
  if (!start || !end) return 'Choose a start and end date to run a custom period.';
  if (start > end) return 'The start date must be on or before the end date.';
  return null;
}

const AnalyticsSection: React.FC = () => {
  const [range, setRange] = useState<RangeKey>('7d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rangeProblem = range === 'custom' ? customRangeError(customStart, customEnd) : null;
  const runnable = rangeProblem === null;

  useEffect(() => {
    if (!runnable) return;
    let active = true;
    const custom = range === 'custom';
    setLoading(true);
    setError(null);
    getAnalyticsData(range, custom ? customStart : undefined, custom ? customEnd : undefined)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err: unknown) => {
        console.error('Analytics could not be loaded:', err);
        if (active) setError('Analytics could not be loaded. Try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [range, customStart, customEnd, runnable]);

  const periodLabel =
    range === 'custom' ? `${customStart} to ${customEnd}` : PRESETS.find((preset) => preset.key === range)?.period ?? '';

  const segmentClass = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-sm font-semibold transition ${active ? 'bg-white text-brand-orange shadow-sm' : 'text-slate-600 hover:text-slate-900'}`;

  return (
    <section aria-labelledby="analytics-heading" className="admin-print-report space-y-6 rounded-2xl bg-white p-6 shadow-sm">
      <style>{PRINT_CSS}</style>

      <div className="admin-print-hide flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="analytics-heading" className="text-lg font-black text-slate-900">
            Platform analytics
          </h2>
          <p className="text-xs text-slate-500">Use a period button, or choose exact dates for a printable report.</p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div role="group" aria-label="Period" className="flex gap-1 rounded-lg bg-slate-100 p-1">
            {PRESETS.map((preset) => (
              <button
                key={preset.key}
                type="button"
                aria-pressed={range === preset.key}
                onClick={() => setRange(preset.key)}
                className={segmentClass(range === preset.key)}
              >
                {preset.label}
              </button>
            ))}
            <button type="button" aria-pressed={range === 'custom'} onClick={() => setRange('custom')} className={segmentClass(range === 'custom')}>
              Custom
            </button>
          </div>

          {range === 'custom' && (
            <>
              <label className="text-xs font-bold text-slate-600">
                From
                <input
                  type="date"
                  value={customStart}
                  max={customEnd || undefined}
                  onChange={(event) => setCustomStart(event.target.value)}
                  className="mt-1 block rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-normal text-slate-800"
                />
              </label>
              <label className="text-xs font-bold text-slate-600">
                To
                <input
                  type="date"
                  value={customEnd}
                  min={customStart || undefined}
                  onChange={(event) => setCustomEnd(event.target.value)}
                  className="mt-1 block rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-normal text-slate-800"
                />
              </label>
            </>
          )}

          <button
            type="button"
            onClick={() => window.print()}
            disabled={!runnable || loading || !data}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            Print report
          </button>
        </div>
      </div>

      <p className="admin-print-only text-sm font-bold text-slate-700">Christian Match Ghana · Platform analytics · {periodLabel}</p>

      {rangeProblem ? (
        <p role="status" className="admin-print-hide text-sm font-semibold text-amber-800">
          {rangeProblem}
        </p>
      ) : error ? (
        <p role="alert" className="text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : loading || !data ? (
        <p role="status" className="py-12 text-center text-sm font-medium text-slate-600">
          Loading analytics…
        </p>
      ) : (
        <AnalyticsBody data={data} />
      )}
    </section>
  );
};

const AnalyticsBody: React.FC<{ data: AnalyticsData }> = ({ data }) => {
  const maxGrowth = Math.max(...data.growth.map((item) => item.value), 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {data.cards.map((card) => (
          <div key={card.title} className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-medium text-slate-500">{card.title}</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{card.value}</p>
            <p className={`mt-1 text-xs font-bold ${card.trend === 'up' ? 'text-emerald-700' : 'text-red-600'}`}>
              {card.change} vs previous period
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-5">
          <h3 className="mb-4 font-semibold text-slate-800">New users by period</h3>
          {data.growth.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">No growth data for this period.</p>
          ) : (
            <ol className="flex h-44 items-end gap-3">
              {data.growth.map((item, index) => (
                <li key={`${item.label}-${index}`} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-xs font-bold text-slate-700">{item.value}</span>
                  <div className="flex h-full w-full items-end overflow-hidden rounded-t-lg bg-slate-100">
                    <div
                      className="w-full rounded-t-lg bg-brand-orange/80"
                      style={{ height: `${(item.value / maxGrowth) * 100}%` }}
                    />
                  </div>
                  <span className="whitespace-nowrap text-[10px] font-medium text-slate-500">
                    {item.label}
                    <span className="sr-only">: {item.value} new users</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 p-5">
          <h3 className="mb-4 font-semibold text-slate-800">Demographics</h3>
          <div className="space-y-6">
            <div>
              <p className="mb-2 text-sm text-slate-600">Gender distribution</p>
              <div className="flex h-4 w-full overflow-hidden rounded-full bg-slate-100" role="img" aria-label={data.demographics.gender.map((item) => `${item.label} ${item.value}%`).join(', ')}>
                {data.demographics.gender.map((item) => (
                  <div key={item.label} className={`${item.color} h-full`} style={{ width: `${Math.max(item.value, 5)}%` }} />
                ))}
              </div>
              <div className="mt-2 flex flex-wrap justify-center gap-4 text-xs text-slate-600">
                {data.demographics.gender.map((item) => (
                  <span key={item.label} className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${item.color}`} aria-hidden="true" />
                    {item.label} ({item.value}%)
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm text-slate-600">Age groups</p>
              <div className="space-y-3">
                {data.demographics.age.map((item) => (
                  <div key={item.label}>
                    <div className="mb-1 flex justify-between text-xs text-slate-600">
                      <span>{item.label}</span>
                      <span>{item.value}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100" role="meter" aria-label={`Age ${item.label}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={item.value}>
                      <div className="h-full rounded-full bg-slate-600" style={{ width: `${item.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 p-5">
        <h3 className="mb-4 font-semibold text-slate-800">Top locations</h3>
        {data.locations.length === 0 ? (
          <p className="text-sm text-slate-500">No location data for this period.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {data.locations.map((location, index) => (
              <div key={location.city} className="flex items-center gap-4 rounded-lg bg-slate-50 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-orange/10 font-bold text-brand-orange">{index + 1}</div>
                <div>
                  <p className="font-semibold text-slate-900">{location.city}</p>
                  <p className="text-sm text-slate-500">{location.users.toLocaleString()} users</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsSection;
