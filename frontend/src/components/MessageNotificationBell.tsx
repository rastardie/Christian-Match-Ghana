/**
 * MessageNotificationBell
 * Shared bell for unread messages. It is shown on every app page.
 *
 * It only shows messages: unread conversations can be opened, all can be
 * marked as read, or the user can go to the Messages list to manage them.
 * Notification settings are not reachable from here; they live in Profile.
 *
 * The panel is rendered into document.body so it always opens above the page
 * content, the header, the navigation bar, and the call screen. The frame that
 * hosts the pages clips and stacks its children, so an in-place panel would
 * appear underneath them.
 */

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

// Above the call overlay (z-[600]) and the incoming-call overlay (z-[700]);
// below the sign-out dialog (z-[2000]).
const PANEL_Z_CLASS = 'z-[1200]';
const BACKDROP_Z_CLASS = 'z-[1199]';

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
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const measure = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition({
      top: rect.bottom + 8,
      right: Math.max(8, window.innerWidth - rect.right),
    });
  };

  // Position the panel under the bell before it is painted.
  useLayoutEffect(() => {
    if (open) measure();
  }, [open]);

  // Keep the panel attached to the bell: follow resizes, close on page scroll
  // (scrolling inside the panel itself is allowed), and close on Escape.
  useEffect(() => {
    if (!open) return;
    const handleResize = () => measure();
    const handleScroll = (event: Event) => {
      const target = event.target;
      if (panelRef.current && target instanceof Node && panelRef.current.contains(target)) return;
      setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('keydown', handleKey);
    };
  }, [open]);

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

  const panel = open && position
    ? createPortal(
        <>
          <button
            type="button"
            aria-label="Close messages panel"
            className={`fixed inset-0 ${BACKDROP_Z_CLASS} cursor-default bg-transparent`}
            onClick={() => setOpen(false)}
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Unread messages"
            style={{ top: position.top, right: position.right }}
            className={`fixed ${PANEL_Z_CLASS} w-72 max-w-[calc(100vw-1rem)] rounded-2xl border border-gray-100 bg-white p-3 text-left shadow-2xl`}
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
        </>,
        document.body,
      )
    : null;

  return (
    <>
      <div className="relative">
        <button
          ref={buttonRef}
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
      </div>
      {panel}
    </>
  );
};

export default MessageNotificationBell;
