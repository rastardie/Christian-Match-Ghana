import React, { useEffect, useState } from 'react';
import { adminSendMessage, listAdminDistributionGroups, type AdminSendMessageResult, type DistributionGroup } from '../../services/adminRbacService';
import { inputClass, buttonClass } from './shared';

const MAX_LENGTH = 2000;

const MessagesPanel: React.FC<{ canSend: boolean }> = ({ canSend }) => {
  const [groups, setGroups] = useState<DistributionGroup[]>([]);
  const [groupId, setGroupId] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<AdminSendMessageResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listAdminDistributionGroups()
      .then((rows) => {
        if (!active) return;
        setGroups(rows);
        if (rows.length > 0) setGroupId(rows[0].id);
      })
      .catch((err) => {
        console.error('Loading message groups failed:', err);
        if (active) setError('Message groups could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const selected = groups.find((group) => group.id === groupId);
  const trimmed = text.trim();
  const canSubmit = canSend && !sending && trimmed.length > 0 && trimmed.length <= MAX_LENGTH && !!selected;

  const handleSend = async () => {
    if (!selected) return;
    const count = selected.memberCount ?? 'the group';
    if (!window.confirm(`Send this message to ${count} member(s) of "${selected.name}"? It cannot be recalled.`)) return;
    setSending(true);
    setError(null);
    setResult(null);
    try {
      const sent = await adminSendMessage({ text: trimmed, recipientMode: 'audience', audienceId: selected.id });
      setResult(sent);
      setText('');
    } catch (err) {
      console.error('Sending admin message failed:', err);
      setError('The message could not be sent. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <p className="text-slate-600">Loading message groups…</p>;

  return (
    <div className="max-w-2xl rounded-2xl bg-white p-6 shadow-sm">
      <label className="block text-sm font-semibold text-slate-700" htmlFor="message-group">
        Send to group
      </label>
      <select
        id="message-group"
        value={groupId}
        onChange={(event) => setGroupId(event.target.value)}
        className={`${inputClass} mt-1`}
        disabled={groups.length === 0}
      >
        {groups.length === 0 && <option value="">No message groups</option>}
        {groups.map((group) => (
          <option key={group.id} value={group.id}>
            {group.name}{group.memberCount !== undefined ? ` (${group.memberCount})` : ''}
          </option>
        ))}
      </select>

      <label className="mt-4 block text-sm font-semibold text-slate-700" htmlFor="message-text">
        Message
      </label>
      <textarea
        id="message-text"
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={5}
        maxLength={MAX_LENGTH}
        className={`${inputClass} mt-1 max-w-none`}
        placeholder="Write the message to send…"
      />
      <div className="mt-1 text-right text-xs text-slate-500">{trimmed.length} / {MAX_LENGTH}</div>

      {!canSend && (
        <p className="mt-4 text-sm text-slate-600">Your account can view messages but cannot send them.</p>
      )}
      {error && <p role="alert" className="mt-4 text-sm font-semibold text-red-600">{error}</p>}
      {result && (
        <p role="status" className="mt-4 text-sm font-semibold text-emerald-700">
          Sent to {result.sentCount} member(s). {result.skippedCount > 0 ? `${result.skippedCount} skipped.` : ''}
        </p>
      )}

      <button
        type="button"
        onClick={() => void handleSend()}
        disabled={!canSubmit}
        className={`${buttonClass} mt-6 bg-brand-orange px-5 py-2.5 text-sm text-white`}
      >
        {sending ? 'Sending…' : 'Send message'}
      </button>
    </div>
  );
};

export default MessagesPanel;
