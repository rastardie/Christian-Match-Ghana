import React, { useEffect, useMemo, useState } from 'react';
import {
  getAdminConversationMessages,
  listAdminConversations,
  type AdminConversation,
  type AdminConversationMessage,
} from '../../../services/adminRbacService';
import { formatDate, inputClass, tableClass, tdClass, thClass, truncate } from '../shared';

interface ConversationsTableProps {
  canReview: boolean;
}

/** Read-only conversation list and transcript viewer for authorized legal review. */
const ConversationsTable: React.FC<ConversationsTableProps> = ({ canReview }) => {
  const [conversations, setConversations] = useState<AdminConversation[]>([]);
  const [selected, setSelected] = useState<AdminConversation | null>(null);
  const [messages, setMessages] = useState<AdminConversationMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
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

  const openTranscript = async (conversation: AdminConversation) => {
    if (!canReview) return;
    setSelected(conversation);
    setMessages([]);
    setTranscriptError(null);
    setLoadingTranscript(true);
    try {
      const result = await getAdminConversationMessages(conversation.id);
      setMessages(result.messages);
    } catch (err: unknown) {
      console.error('Loading conversation transcript failed:', err);
      setTranscriptError('The transcript could not be loaded.');
    } finally {
      setLoadingTranscript(false);
    }
  };

  return (
    <section aria-labelledby="conversations-heading" className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="conversations-heading" className="text-lg font-black text-slate-900">Conversations</h2>
          <p className="text-sm text-slate-500">
            {canReview ? 'Read-only legal review. Select a conversation to view its complete message history.' : 'Conversation metadata and latest-message previews.'}
          </p>
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
          <span className="whitespace-nowrap text-sm text-slate-500">{loading ? '' : `${filtered.length} of ${conversations.length}`}</span>
        </div>
      </div>

      {!canReview && (
        <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-800">
          Full transcripts require the messages.content.view permission. Contact a Super Admin for legal-review access.
        </p>
      )}
      {error && <p role="alert" className="mb-4 text-sm font-semibold text-red-600">{error}</p>}

      {loading ? (
        <p className="text-slate-600">Loading conversations…</p>
      ) : error ? null : filtered.length === 0 ? (
        <p className="text-slate-600">{conversations.length === 0 ? 'No conversations yet.' : 'No conversations match this search.'}</p>
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
                {canReview && <th scope="col" className={thClass}>Review</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((conversation, index) => (
                <tr key={conversation.id} className={selected?.id === conversation.id ? 'bg-slate-50' : undefined}>
                  <td className={tdClass}>{index + 1}</td>
                  <td className={tdClass}>
                    <div className="font-bold">{conversation.participantNames[0]}</div>
                    <div className="text-xs text-slate-500">with {conversation.participantNames[1]}</div>
                  </td>
                  <td className={`${tdClass} max-w-md`} title={conversation.lastMessage || undefined}>{conversation.lastMessage ? truncate(conversation.lastMessage, 120) : 'No messages yet'}</td>
                  <td className={`${tdClass} whitespace-nowrap`}>{formatDate(conversation.lastMessageTime)}</td>
                  <td className={`${tdClass} whitespace-nowrap`}>{formatDate(conversation.createdAt)}</td>
                  {canReview && (
                    <td className={tdClass}>
                      <button type="button" onClick={() => void openTranscript(conversation)} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-700">
                        View full chat
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && canReview && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4" aria-live="polite">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900">Full conversation transcript</h3>
              <p className="text-sm text-slate-600">{selected.participantNames.join(' · ')} · Read-only legal review</p>
            </div>
            <button type="button" onClick={() => setSelected(null)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700">Close transcript</button>
          </div>
          {loadingTranscript ? (
            <p className="text-sm text-slate-600">Loading complete message history…</p>
          ) : transcriptError ? (
            <p role="alert" className="text-sm font-semibold text-red-700">{transcriptError}</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-slate-600">No messages were found in this conversation.</p>
          ) : (
            <div className="max-h-[32rem] space-y-3 overflow-y-auto rounded-lg bg-white p-3">
              {messages.map((message) => (
                <article key={message.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2 text-xs">
                    <strong className="text-slate-900">{message.senderName}</strong>
                    <span className="text-slate-500">{formatDate(message.timestamp)} · {message.type}</span>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm text-slate-800">{message.text || '[No text content]'}</p>
                  {message.fileUrl && <a href={message.fileUrl} target="_blank" rel="noreferrer" className="mt-2 block text-xs font-semibold text-blue-700 underline">Attachment{message.fileName ? `: ${message.fileName}` : ''}</a>}
                  {message.editedAt != null && <p className="mt-1 text-xs italic text-slate-500">Edited {formatDate(message.editedAt)}</p>}
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default ConversationsTable;
