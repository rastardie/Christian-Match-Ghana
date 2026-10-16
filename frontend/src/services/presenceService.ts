import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
  type DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';

// Firestore-backed presence. We don't have Realtime Database's onDisconnect, so
// presence is derived from a periodic heartbeat plus a freshness window: a user
// counts as online only if their last heartbeat is recent. A clean unmount also
// writes an explicit offline marker.
const HEARTBEAT_MS = 20_000;
const STALE_AFTER_MS = 65_000;

export interface PresenceInfo {
  isOnline: boolean;
  lastSeen: number | null;
}

interface PresenceRecord {
  state?: 'online' | 'offline';
  lastSeen?: Timestamp | null;
}

function presenceRef(userId: string) {
  return doc(db, 'presence', userId);
}

function toMillis(value: Timestamp | null | undefined): number | null {
  if (!value) return null;
  try {
    return value.toMillis();
  } catch {
    return null;
  }
}

function isFresh(lastSeen: number | null): boolean {
  return Boolean(lastSeen && Date.now() - lastSeen <= STALE_AFTER_MS);
}

function readPresence(snapshot: DocumentSnapshot): PresenceInfo {
  const value = snapshot.data() as PresenceRecord | undefined;
  const lastSeen = toMillis(value?.lastSeen ?? null);
  return {
    isOnline: value?.state === 'online' && isFresh(lastSeen),
    lastSeen,
  };
}

async function writePresence(userId: string, state: 'online' | 'offline'): Promise<void> {
  await setDoc(
    presenceRef(userId),
    { state, lastSeen: serverTimestamp() },
    { merge: true },
  );
}

/**
 * Starts heartbeat-backed presence for the active user. Firestore has no
 * onDisconnect, so an abrupt tab/network loss stops the heartbeat and the record
 * becomes stale within STALE_AFTER_MS; a clean unmount writes offline immediately.
 */
export function startUserPresence(userId: string): () => void {
  let stopped = false;
  let heartbeat: number | undefined;
  let reconnectTimer: number | undefined;

  const beat = () => {
    if (stopped || document.visibilityState !== 'visible' || !navigator.onLine) return;
    void writePresence(userId, 'online').catch((error) => {
      console.warn('Presence heartbeat failed:', error);
    });
  };

  const connect = () => {
    if (stopped || document.visibilityState !== 'visible' || !navigator.onLine) return;
    beat();
    if (heartbeat === undefined) {
      heartbeat = window.setInterval(beat, HEARTBEAT_MS);
    }
  };

  const disconnect = () => {
    if (heartbeat !== undefined) {
      window.clearInterval(heartbeat);
      heartbeat = undefined;
    }
    if (!stopped) {
      void writePresence(userId, 'offline').catch((error) => {
        console.warn('Unable to mark presence offline:', error);
      });
    }
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
    void writePresence(userId, 'offline').catch(() => undefined);
  };
}

export function subscribeToPresence(
  userId: string,
  callback: (presence: PresenceInfo) => void,
): () => void {
  let latest: PresenceInfo = { isOnline: false, lastSeen: null };
  const unsubscribe = onSnapshot(
    presenceRef(userId),
    (snapshot) => {
      latest = readPresence(snapshot);
      callback(latest);
    },
    (error) => console.warn('Presence subscription error:', error),
  );
  // Re-evaluate freshness periodically so a stale "online" record flips to offline
  // even if no new snapshot arrives.
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
