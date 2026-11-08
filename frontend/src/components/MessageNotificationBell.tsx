/**
 * MessageNotificationBell
 * Shared bell for unread messages. It is shown on every app page.
 *
 * It only shows messages: unread conversations can be opened, all can be
 * marked as read, or the user can go to the Messages list to manage them.
 * Notification settings are not reachable from here; they live in Profile.
 */

import React, { useState } from 'react';
import { Bell, MessageSquare } from 'lucide-react';

export interface MessageNotificationItem {
  id: string;
  label: string;
  unreadCount: number;
}

interface MessageNotificationBellProps {
  unreadCount: number;
  items: MessageNotificationItem[];
  onSelect: (chatId: string) => void;
  onMarkAllRead: () => Promise<void> | void;
  onOpenMessages: () => void;
  buttonClassName?: string;
}

const MessageNotificationBell: React.FC<MessageNotificationBellProps> = ({
  unreadCount,
  items,
  onSelect,
  onMarkAllRead,
  onOpenMessages,
  buttonClassName = 'cmg-main-icon-button',
}) => {
  const [open, setOpen] = useState(false);
  const [marking, setMarking] = useState(false);

  const label = unreadCount > 0
    ? `Messages, ${unreadCount} unread ${unreadCount === 1 ? 'message' : 'messages'}`
    : 'Messages';

  const markAllRead = async () => {
    if (marking) return;
    setMarking(true);
    try {
      await onMarkAllRead();
      setOpen(false);
    } catch (error) {
      console.error('Unable to mark messages as read:', error);
    } finally {
      setMarking(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        title={label}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((visible) => !visible)}
        className={`${buttonClassName} relative`}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            aria-live="polite"
            className="absolute -right-1 -top-1 min-w-4 rounded-full bg-brand-orange px-1 text-center text-[9px] font-black leading-4 text-white shadow-sm"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close messages panel"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-label="Unread messages"
            className="absolute right-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-2.5rem)] rounded-2xl border border-gray-100 bg-white p-3 text-left shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3 px-2 pb-2">
              <h2 className="text-sm font-black text-gray-900">Messages</h2>
              <span className="text-[10px] font-black uppercase tracking-wider text-brand-orange">
                {unreadCount} unread
              </span>
            </div>

            {items.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs font-bold text-gray-500">No unread messages.</p>
            ) : (
              <div className="max-h-64 space-y-1 overflow-y-auto">
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onSelect(item.id);
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-orange-50"
                  >
                    <span className="min-w-0 truncate text-xs font-bold text-gray-700">{item.label}</span>
                    <span className="shrink-0 rounded-full bg-brand-orange px-2 py-0.5 text-[10px] font-black text-white">
                      {item.unreadCount > 99 ? '99+' : item.unreadCount}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-2 space-y-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => void markAllRead()}
                  disabled={marking}
                  className="w-full rounded-xl border border-brand-orange/20 px-3 py-2.5 text-xs font-black uppercase tracking-wider text-brand-orange transition hover:bg-orange-50 disabled:cursor-wait disabled:opacity-50"
                >
                  {marking ? 'Marking as read…' : 'Mark all as read'}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onOpenMessages();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-orange px-3 py-2.5 text-xs font-black uppercase tracking-wider text-white transition hover:brightness-95"
              >
                <MessageSquare size={14} /> Manage messages
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MessageNotificationBell;
