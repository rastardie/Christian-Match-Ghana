import React, { useEffect, useMemo, useState } from 'react';
import { listAdminConversations, type AdminConversation } from '../../../services/adminRbacService';
import { formatDate, inputClass, tableClass, tdClass, thClass, truncate } from '../shared';

/** Read-only list of direct conversations (chats), newest activity first. */
const ConversationsTable: React.FC = () => {
  const [conversations, setConversations] = useState<AdminConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let active = true;
    listAdminConversations()
      .then((rows) => {
        if (active) setConversations(rows);
      })
      .catch((err: unknown) => {
        console.error('Loading conversations failed:', err);
        if (active) setError('Conversations could not be loaded.');
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
    if (!term) return conversations;
    return conversations.filter((conversation) =>
      conversation.participantNames.some((name) => name.toLowerCase().includes(term)),
    );
  }, [conversations, query]);

  return (
    <section aria-labelledby="conversations-heading" className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="conversations-heading" className="text-lg font-black text-slate-900">Conversations</h2>
          <p className="text-sm text-slate-500">Read-only. Shows each direct conversation and its most recent message.</p>
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="conversation-search" className="sr-only">Search conversations by participant name</label>
          <input
            id="conversation-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name"
            className={`${inputClass} w-64 max-w-none`}
          />
          <span className="whitespace-nowrap text-sm text-slate-500">
            {loading ? '' : `${filtered.length} of ${conversations.length}`}
          </span>
        </div>
      </div>

      {error && <p role="alert" className="mb-4 text-sm font-semibold text-red-600">{error}</p>}

      {loading ? (
        <p className="text-slate-600">Loading conversations…</p>
      ) : error ? null : filtered.length === 0 ? (
        <p className="text-slate-600">
          {conversations.length === 0 ? 'No conversations yet.' : 'No conversations match this search.'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className={tableClass}>
            <caption className="sr-only">Conversations between users, most recent activity first</caption>
            <thead>
              <tr>
                <th scope="col" className={thClass}>#</th>
                <th scope="col" className={thClass}>Participants</th>
                <th scope="col" className={thClass}>Last message</th>
                <th scope="col" className={thClass}>Last activity</th>
                <th scope="col" className={thClass}>Started</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((conversation, index) => (
                <tr key={conversation.id}>
                  <td className={tdClass}>{index + 1}</td>
                  <td className={tdClass}>
                    <div className="font-bold">{conversation.participantNames[0]}</div>
                    <div className="text-xs text-slate-500">with {conversation.participantNames[1]}</div>
                  </td>
                  <td className={`${tdClass} max-w-md`} title={conversation.lastMessage || undefined}>
                    {conversation.lastMessage ? truncate(conversation.lastMessage, 120) : 'No messages yet'}
                  </td>
                  <td className={`${tdClass} whitespace-nowrap`}>{formatDate(conversation.lastMessageTime)}</td>
                  <td className={`${tdClass} whitespace-nowrap`}>{formatDate(conversation.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default ConversationsTable;
