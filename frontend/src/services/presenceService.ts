import {
  onDisconnect,
  onValue,
  ref,
  serverTimestamp,
  set,
  type DataSnapshot,
} from 'firebase/database';
import { realtimeDb } from '../firebase';

const HEARTBEAT_MS = 20_000;
const STALE_AFTER_MS = 65_000;

export interface PresenceInfo {
  isOnline: boolean;
  lastSeen: number | null;
}

interface PresenceRecord {
  state?: 'online' | 'offline';
  lastSeen?: number;
}

function presenceRef(userId: string) {
  return ref(realtimeDb, `presence/${userId}`);
}

function isFresh(lastSeen: number | null): boolean {
  return Boolean(lastSeen && Date.now() - lastSeen <= STALE_AFTER_MS);
}

function readPresence(snapshot: DataSnapshot): PresenceInfo {
  const value = snapshot.val() as PresenceRecord | null;
  const lastSeen = typeof value?.lastSeen === 'number' ? value.lastSeen : null;
  return {
    isOnline: value?.state === 'online' && isFresh(lastSeen),
    lastSeen,
  };
}

async function markOnline(userId: string): Promise<void> {
  const userRef = presenceRef(userId);
  await onDisconnect(userRef).set({
    state: 'offline',
    lastSeen: serverTimestamp(),
  });
  await set(userRef, {
    state: 'online',
    lastSeen: serverTimestamp(),
  });
}

async function markOffline(userId: string): Promise<void> {
  try {
    const userRef = presenceRef(userId);
    await set(userRef, {
      state: 'offline',
      lastSeen: serverTimestamp(),
    });
    await onDisconnect(userRef).cancel();
  } catch (error) {
    console.warn('Unable to mark presence offline:', error);
  }
}

/**
 * Starts connection-backed presence for the active user.
 * Realtime Database onDisconnect is the source of truth when the tab, PWA,
 * device, or network disappears without a clean React unmount.
 */
export function startUserPresence(userId: string): () => void {
  let stopped = false;
  let heartbeat: number | undefined;
  let reconnectTimer: number | undefined;

  const connect = () => {
    if (stopped || document.visibilityState !== 'visible' || !navigator.onLine) return;
    void markOnline(userId).catch((error) => {
      console.warn('Unable to start realtime presence:', error);
    });
    if (heartbeat === undefined) {
      heartbeat = window.setInterval(() => {
        if (!stopped && document.visibilityState === 'visible' && navigator.onLine) {
          void markOnline(userId).catch((error) => {
            console.warn('Presence heartbeat failed:', error);
          });
        }
      }, HEARTBEAT_MS);
    }
  };

  const disconnect = () => {
    if (!stopped) void markOffline(userId);
  };

  const handleVisibility = () => {
    if (document.visibilityState === 'visible') connect();
    else disconnect();
  };
  const handleOnline = () => {
    window.clearTimeout(reconnectTimer);
    reconnectTimer = window.setTimeout(connect, 250);
  };
  const handleOffline = () => disconnect();

  document.addEventListener('visibilitychange', handleVisibility);
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  connect();

  return () => {
    stopped = true;
    if (heartbeat !== undefined) window.clearInterval(heartbeat);
    window.clearTimeout(reconnectTimer);
    document.removeEventListener('visibilitychange', handleVisibility);
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    void markOffline(userId);
  };
}

export function subscribeToPresence(
  userId: string,
  callback: (presence: PresenceInfo) => void,
): () => void {
  let latest: PresenceInfo = { isOnline: false, lastSeen: null };
  const unsubscribe = onValue(presenceRef(userId), (snapshot) => {
    latest = readPresence(snapshot);
    callback(latest);
  });
  const freshnessTimer = window.setInterval(() => {
    callback({
      ...latest,
      isOnline: latest.isOnline && isFresh(latest.lastSeen),
    });
  }, 30_000);
  return () => {
    unsubscribe();
    window.clearInterval(freshnessTimer);
  };
}

export function formatPresenceLabel(presence: PresenceInfo): string {
  if (presence.isOnline) return 'Online';
  if (!presence.lastSeen) return 'Offline';

  const elapsed = Math.max(0, Date.now() - presence.lastSeen);
  if (elapsed < 60 * 60 * 1000) return 'Last seen recently';

  const date = new Date(presence.lastSeen);
  const sameDay = date.toDateString() === new Date().toDateString();
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return sameDay ? `Last seen at ${time}` : `Last seen ${date.toLocaleDateString()} at ${time}`;
}

export { STALE_AFTER_MS };
