import React, { useEffect, useMemo, useState } from 'react';
import { loadAdminPayments, loadAdminSubscriptions } from '../../services/adminService';
import { formatDate, inputClass, tableClass, tdClass, thClass } from './shared';

type Row = Record<string, any> & { id: string };

type LoadState<T> = {
  rows: T[];
  loading: boolean;
  error: string | null;
};

function useAdminLoad<T>(loader: () => Promise<T[]>): LoadState<T> {
  const [state, setState] = useState<LoadState<T>>({ rows: [], loading: true, error: null });

  useEffect(() => {
    let active = true;
    loader()
      .then((rows) => {
        if (active) setState({ rows, loading: false, error: null });
      })
      .catch((error: unknown) => {
        console.error('Admin payments load failed', error);
        if (active) {
          setState({
            rows: [],
            loading: false,
            error: error instanceof Error ? error.message : 'Could not load data.',
          });
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return state;
}

/** Converts Firestore Timestamp, ISO string, or epoch to a Date (null if missing). */
function toDate(value: unknown): Date | null {
  if (!value) return null;
  const withToDate = value as { toDate?: () => Date };
  const date =
    typeof withToDate.toDate === 'function'
      ? withToDate.toDate()
      : new Date(value as string | number);
  return Number.isNaN(date.getTime()) ? null : date;
}

function subscriptionStatus(row: Row): 'Active' | 'Expired' | 'Unknown' {
  const expires = toDate(row.subscriptionExpiresAt) ?? toDate(row.subscriptionEndDate);
  if (!expires) return 'Unknown';
  return expires.getTime() > Date.now() ? 'Active' : 'Expired';
}

function memberName(row: Row): string {
  return row.name || row.fullName || row.displayName || row.email || row.id;
}

const statusBadge: Record<string, string> = {
  Active: 'bg-emerald-100 text-emerald-800',
  Expired: 'bg-slate-200 text-slate-700',
  Unknown: 'bg-amber-100 text-amber-800',
};

const ErrorNotice: React.FC<{ message: string }> = ({ message }) => (
  <p role="alert" className="p-6 text-sm text-red-700">
    Could not load this list: {message}. Check that your admin account has the payments.view permission.
  </p>
);

/** Payments sub-view: Paystack payment records with search. Loads only when shown. */
const PaymentRecords: React.FC = () => {
  const payments = useAdminLoad<Row>(() => loadAdminPayments() as Promise<Row[]>);
  const [paymentQuery, setPaymentQuery] = useState('');

  const filteredPayments = useMemo(() => {
    const term = paymentQuery.trim().toLowerCase();
    if (!term) return payments.rows;
    return payments.rows.filter((payment) =>
      [payment.reference, payment.id, payment.email, payment.userEmail, payment.userId, payment.plan, payment.status]
        .some((field) => typeof field === 'string' && field.toLowerCase().includes(term))
    );
  }, [payments.rows, paymentQuery]);

  return (
    <section aria-labelledby="payments-heading">
      <h2 id="payments-heading" className="mb-1 text-lg font-bold text-slate-900">Payment records</h2>
      <p className="mb-4 text-sm text-slate-600">
        Verified Paystack payments. Records are created by the server after Paystack confirms the charge.
      </p>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={paymentQuery}
          onChange={(event) => setPaymentQuery(event.target.value)}
          placeholder="Search reference, email, plan, status…"
          aria-label="Search payments"
          className={inputClass}
        />
        <span className="text-sm text-slate-500">
          {filteredPayments.length} of {payments.rows.length} payments
        </span>
      </div>
      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
        {payments.loading ? (
          <p className="p-6 text-slate-600">Loading payments…</p>
        ) : payments.error ? (
          <ErrorNotice message={payments.error} />
        ) : filteredPayments.length === 0 ? (
          <p className="p-6 text-slate-600">No payments match this search.</p>
        ) : (
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>#</th>
                <th className={thClass}>Date</th>
                <th className={thClass}>Reference</th>
                <th className={thClass}>User</th>
                <th className={thClass}>Plan</th>
                <th className={thClass}>Amount</th>
                <th className={thClass}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((payment, index) => (
                <tr key={payment.id}>
                  <td className={tdClass}>{index + 1}</td>
                  <td className={tdClass}>{formatDate(payment.createdAt)}</td>
                  <td className={tdClass}>{payment.reference || payment.id}</td>
                  <td className={tdClass}>{payment.email || payment.userEmail || payment.userId || '—'}</td>
                  <td className={tdClass}>{payment.plan || payment.planId || '—'}</td>
                  <td className={tdClass}>
                    {payment.amount != null ? `${payment.currency || 'GHS'} ${payment.amount}` : '—'}
                  </td>
                  <td className={tdClass}>{payment.status || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
};

/** Subscriptions sub-view: members' subscription status from their profile, with search. Loads only when shown. */
const SubscriptionRecords: React.FC = () => {
  const subscriptions = useAdminLoad<Row>(() => loadAdminSubscriptions() as Promise<Row[]>);
  const [subscriptionQuery, setSubscriptionQuery] = useState('');

  const filteredSubscriptions = useMemo(() => {
    const term = subscriptionQuery.trim().toLowerCase();
    if (!term) return subscriptions.rows;
    return subscriptions.rows.filter((row) =>
      [row.email, row.name, row.fullName, row.displayName, row.subscriptionType, row.id]
        .some((field) => typeof field === 'string' && field.toLowerCase().includes(term))
    );
  }, [subscriptions.rows, subscriptionQuery]);

  return (
    <section aria-labelledby="subscriptions-heading">
      <h2 id="subscriptions-heading" className="mb-1 text-lg font-bold text-slate-900">Subscriptions</h2>
      <p className="mb-4 text-sm text-slate-600">
        Members with a subscription, from their profile. Active means the expiry date is still in the future.
      </p>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={subscriptionQuery}
          onChange={(event) => setSubscriptionQuery(event.target.value)}
          placeholder="Search member, email, plan…"
          aria-label="Search subscriptions"
          className={inputClass}
        />
        <span className="text-sm text-slate-500">
          {filteredSubscriptions.length} of {subscriptions.rows.length} subscriptions
        </span>
      </div>
      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
        {subscriptions.loading ? (
          <p className="p-6 text-slate-600">Loading subscriptions…</p>
        ) : subscriptions.error ? (
          <ErrorNotice message={subscriptions.error} />
        ) : filteredSubscriptions.length === 0 ? (
          <p className="p-6 text-slate-600">No subscriptions match this search.</p>
        ) : (
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>#</th>
                <th className={thClass}>Member</th>
                <th className={thClass}>Plan</th>
                <th className={thClass}>Status</th>
                <th className={thClass}>Started</th>
                <th className={thClass}>Expires</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubscriptions.map((row, index) => {
                const status = subscriptionStatus(row);
                return (
                  <tr key={row.id}>
                    <td className={tdClass}>{index + 1}</td>
                    <td className={tdClass}>
                      <div className="font-medium">{memberName(row)}</div>
                      {row.email && memberName(row) !== row.email && (
                        <div className="text-xs text-slate-500">{row.email}</div>
                      )}
                    </td>
                    <td className={tdClass}>{row.subscriptionType || '—'}</td>
                    <td className={tdClass}>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${statusBadge[status]}`}>
                        {status}
                      </span>
                    </td>
                    <td className={tdClass}>{formatDate(row.subscriptionStartAt ?? row.subscriptionStartDate)}</td>
                    <td className={tdClass}>{formatDate(row.subscriptionExpiresAt ?? row.subscriptionEndDate)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
};

interface PaymentsPanelProps {
  /** Sidebar sub-view: 'payments' (default) or 'subscriptions'. Unknown values fall back to 'payments'. */
  view?: string;
}

const PaymentsPanel: React.FC<PaymentsPanelProps> = ({ view }) => (
  <div className="space-y-10">
    {view === 'subscriptions' ? <SubscriptionRecords /> : <PaymentRecords />}
  </div>
);

export default PaymentsPanel;
