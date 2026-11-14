import React, { useEffect, useMemo, useState } from 'react';
import { auth } from '../../firebase';
import { getAdminUsers } from '../../services/adminService';
import {
  adminSendMessage,
  listAdminDistributionGroups,
  type AdminSendMessageResult,
  type DistributionGroup,
} from '../../services/adminRbacService';
import AdminActionDialog from './AdminActionDialog';
import ConversationsTable from './messages/ConversationsTable';
import UserPicker from './messages/UserPicker';
import {
  MAX_MESSAGE_LENGTH,
  activeRecipientUsers,
  summariseRecipients,
  toggleIdInSet,
  type AdminDirectoryUser,
  type RecipientMode,
} from './messages/recipients';
import { criteriaSummary } from './groups/audienceModel';
import { buttonClass } from './shared';

type AdminSendPayload = Parameters<typeof adminSendMessage>[0];

const MODE_OPTIONS: ReadonlyArray<{ value: RecipientMode; label: string }> = [
  { value: 'all', label: 'All active users' },
  { value: 'selected', label: 'Selected users' },
  { value: 'audience', label: 'Saved audiences' },
];

interface MessagesPanelProps {
  /** Whether the signed-in admin may send (messages.send, or super admin). Without it the composer is read-only. */
  canSend: boolean;
  /** Whether the signed-in admin may inspect complete conversation transcripts. */
  canReview: boolean;
  /** Opens the Groups section where saved audiences are managed. Omit to hide the link. */
  onManageAudiences?: () => void;
  /** Sidebar sub-view: 'compose' (default) or 'conversations'. Unknown values fall back to 'compose'. */
  view?: string;
}

const MessagesPanel: React.FC<MessagesPanelProps> = ({ canSend, canReview, onManageAudiences, view }) => {
  const showConversations = view === 'conversations';

  const [users, setUsers] = useState<AdminDirectoryUser[] | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [audiences, setAudiences] = useState<DistributionGroup[] | null>(null);
  const [audiencesError, setAudiencesError] = useState<string | null>(null);

  const [mode, setMode] = useState<RecipientMode>('all');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [selectedAudienceIds, setSelectedAudienceIds] = useState<Set<string>>(new Set());
  const [text, setText] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<AdminSendMessageResult | null>(null);

  useEffect(() => {
    if (!canSend) return;
    let active = true;
    getAdminUsers()
      .then((rows) => {
        if (active) setUsers(rows);
      })
      .catch((err: unknown) => {
        console.error('Loading message recipients failed:', err);
        if (active) setUsersError('Recipients could not be loaded. Refresh the page to try again.');
      });
    return () => {
      active = false;
    };
  }, [canSend]);

  useEffect(() => {
    if (!canSend) return;
    let active = true;
    listAdminDistributionGroups()
      .then((rows) => {
        if (active) setAudiences(rows);
      })
      .catch((err: unknown) => {
        console.error('Loading saved audiences failed:', err);
        if (active) setAudiencesError('Saved audiences could not be loaded.');
      });
    return () => {
      active = false;
    };
  }, [canSend]);

  const activeUsers = useMemo(() => activeRecipientUsers(users ?? [], auth.currentUser?.uid), [users]);
  const trimmedText = text.trim();

  const summary = useMemo(
    () =>
      summariseRecipients({
        mode,
        activeUsers,
        selectedUserIds,
        audiences: audiences ?? [],
        selectedAudienceIds,
      }),
    [mode, activeUsers, selectedUserIds, audiences, selectedAudienceIds],
  );

  const sourceError = mode === 'audience' ? audiencesError : usersError;
  const sourceLoading = mode === 'audience' ? audiences === null : users === null;

  // The first blocking reason is shown next to the Send button. It is null only when the message can be sent.
  const blocker = !canSend
    ? 'Your account can view messages but cannot send them.'
    : sourceError
      ? sourceError
      : sourceLoading
        ? 'Loading recipients…'
        : trimmedText.length === 0
          ? 'Write a message to send.'
          : summary.blocker;

  const selectedAudiences = (audiences ?? []).filter((audience) => selectedAudienceIds.has(audience.id));

  const buildPayload = (): AdminSendPayload => {
    if (mode === 'all') return { text: trimmedText, recipientMode: 'all' };
    if (mode === 'selected') return { text: trimmedText, recipientMode: 'selected', userIds: [...selectedUserIds] };
    return { text: trimmedText, recipientMode: 'audience', audienceIds: selectedAudiences.map((audience) => audience.id) };
  };

  // Throwing from onConfirm keeps the dialog open and shows the server's message.
  const handleConfirmSend = async () => {
    const sent = await adminSendMessage(buildPayload());
    setResult(sent);
    setText('');
  };

  const changeMode = (next: RecipientMode) => {
    setMode(next);
    setResult(null);
  };

  return (
    <div className="space-y-6">
      {!showConversations && (
        <section aria-labelledby="compose-heading" className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="compose-heading" className="text-lg font-black text-slate-900">Send a message</h2>
              <p className="text-sm text-slate-500">Each recipient receives it as a direct message from you.</p>
            </div>
            {onManageAudiences && (
              <button
                type="button"
                onClick={onManageAudiences}
                className={`${buttonClass} border border-slate-300 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50`}
              >
                Manage audiences
              </button>
            )}
          </div>

          {!canSend && (
            <p role="note" className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              Your account can view messages, but it does not have permission to send them.
            </p>
          )}
          {result && (
            <p role="status" className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              Message sent. {result.sentCount} of {result.resolvedCount} recipient{result.resolvedCount === 1 ? '' : 's'} received it
              {result.skippedCount > 0 ? `; ${result.skippedCount} skipped` : ''}.
            </p>
          )}

          <div className="grid min-w-0 gap-6 lg:grid-cols-2">
            <fieldset disabled={!canSend} className="min-w-0 space-y-4">
              <legend className="mb-2 text-sm font-black text-slate-800">Recipients</legend>
              <div className="space-y-2">
                {MODE_OPTIONS.map((option) => {
                  const hint =
                    option.value === 'all'
                      ? users === null ? 'Loading…' : `${activeUsers.length} active users`
                      : option.value === 'selected'
                        ? `${selectedUserIds.size} added`
                        : `${selectedAudienceIds.size} selected`;
                  return (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 transition focus-within:ring-2 focus-within:ring-brand-orange ${
                        mode === option.value ? 'border-brand-orange bg-orange-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="message-recipient-mode"
                          value={option.value}
                          checked={mode === option.value}
                          onChange={() => changeMode(option.value)}
                          className="h-4 w-4 accent-orange-500"
                        />
                        <span className="text-sm font-bold text-slate-800">{option.label}</span>
                      </span>
                      <span className="text-xs font-semibold text-slate-500">{hint}</span>
                    </label>
                  );
                })}
              </div>

              {mode === 'all' && (
                <p className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-900">
                  Every active user, except blocked accounts and your own. The server confirms the final count when you send.
                </p>
              )}

              {mode === 'selected' &&
                (users === null ? (
                  <p className="text-sm text-slate-500">{usersError ?? 'Loading users…'}</p>
                ) : (
                  <UserPicker
                    idPrefix="message-recipients"
                    users={activeUsers}
                    selectedIds={selectedUserIds}
                    onToggle={(id) => setSelectedUserIds((current) => toggleIdInSet(current, id))}
                    onClear={() => setSelectedUserIds(new Set())}
                    disabled={!canSend}
                  />
                ))}

              {mode === 'audience' && (
                <div>
                  {audiencesError && <p role="alert" className="text-sm font-semibold text-red-600">{audiencesError}</p>}
                  {!audiencesError && audiences === null && <p className="text-sm text-slate-500">Loading audiences…</p>}
                  {audiences !== null && audiences.length === 0 && (
                    <p className="text-sm text-slate-500">No saved audiences yet. Create one in Groups.</p>
                  )}
                  {audiences !== null && audiences.length > 0 && (
                    <ul aria-label="Saved audiences" className="max-h-72 space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2">
                      {audiences.map((audience) => (
                        <li key={audience.id}>
                          <label className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 hover:bg-orange-50 focus-within:ring-2 focus-within:ring-brand-orange">
                            <input
                              type="checkbox"
                              checked={selectedAudienceIds.has(audience.id)}
                              onChange={() => setSelectedAudienceIds((current) => toggleIdInSet(current, audience.id))}
                              className="mt-1 h-4 w-4 shrink-0 accent-orange-500"
                            />
                            <span className="min-w-0">
                              <span className="block break-words text-sm font-bold text-slate-800">
                                {audience.name} · {audience.memberCount ?? 0} members
                              </span>
                              <span className="block break-words text-xs text-slate-500">
                                {audience.description || criteriaSummary(audience)}
                              </span>
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                  {selectedAudiences.length > 1 && (
                    <p className="mt-2 text-xs font-semibold text-slate-600">Members in more than one audience receive one message.</p>
                  )}
                </div>
              )}
            </fieldset>

            <div className="min-w-0">
              <label htmlFor="admin-message-text" className="mb-1 block text-sm font-black text-slate-800">
                Message
              </label>
              <textarea
                id="admin-message-text"
                value={text}
                onChange={(event) => setText(event.target.value)}
                rows={10}
                maxLength={MAX_MESSAGE_LENGTH}
                disabled={!canSend}
                aria-describedby="admin-message-counter"
                placeholder="Write the message recipients should receive…"
                className="w-full resize-y rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-800 focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/20 disabled:opacity-60"
              />
              <div id="admin-message-counter" className="mt-1 text-right text-xs font-semibold text-slate-500">
                {text.length} / {MAX_MESSAGE_LENGTH}
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">Will be sent to</p>
                <p className="mt-1 font-bold text-slate-900">
                  {mode === 'all' && (users === null ? (usersError ? 'Unavailable' : 'Loading…') : `${activeUsers.length} active users`)}
                  {mode === 'selected' && `${summary.count} selected active users`}
                  {mode === 'audience' &&
                    (selectedAudiences.length === 0
                      ? 'No audiences chosen'
                      : `Up to ${summary.count} recipients across ${selectedAudiences.length} audience${selectedAudiences.length === 1 ? '' : 's'}`)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                disabled={!canSend || blocker !== null}
                className={`${buttonClass} mt-4 w-full bg-brand-orange px-5 py-3 text-sm text-white hover:bg-brand-orange/90`}
              >
                Send message
              </button>
              {blocker && canSend && <p className="mt-2 text-sm font-semibold text-slate-600">{blocker}</p>}
            </div>
          </div>
        </section>
      )}

      {showConversations && <ConversationsTable canReview={canReview} />}

      <AdminActionDialog
        open={confirmOpen}
        title="Send this message?"
        description={`Send this message to ${summary.description}. This cannot be recalled.`}
        confirmLabel="Send message"
        onConfirm={handleConfirmSend}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
};

export default MessagesPanel;
