import React, { useEffect, useMemo, useState } from 'react';
import { getAdminPayments } from '../../services/adminService';
import { formatDate, inputClass, tableClass, tdClass, thClass } from './shared';

type PaymentRow = Record<string, any> & { id: string };

const PaymentsPanel: React.FC = () => {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let active = true;
    getAdminPayments()
      .then((rows) => {
        if (active) setPayments(rows as PaymentRow[]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return payments;
    return payments.filter((payment) =>
      [payment.reference, payment.id, payment.email, payment.userId, payment.plan, payment.status]
        .some((field) => typeof field === 'string' && field.toLowerCase().includes(term))
    );
  }, [payments, query]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search reference, email, plan, status…"
          aria-label="Search payments"
          className={inputClass}
        />
        <span className="text-sm text-slate-500">{filtered.length} of {payments.length} payments</span>
      </div>
      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
        {loading ? (
          <p className="p-6 text-slate-600">Loading payments…</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-slate-600">No payments match this search.</p>
        ) : (
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Date</th>
                <th className={thClass}>Reference</th>
                <th className={thClass}>User</th>
                <th className={thClass}>Plan</th>
                <th className={thClass}>Amount</th>
                <th className={thClass}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((payment) => (
                <tr key={payment.id}>
                  <td className={tdClass}>{formatDate(payment.createdAt)}</td>
                  <td className={tdClass}>{payment.reference || payment.id}</td>
                  <td className={tdClass}>{payment.email || payment.userId || '—'}</td>
                  <td className={tdClass}>{payment.plan || payment.planId || '—'}</td>
                  <td className={tdClass}>{payment.amount ?? '—'}</td>
                  <td className={tdClass}>{payment.status || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default PaymentsPanel;
