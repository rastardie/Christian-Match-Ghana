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
const PRESENCE_LABEL_REFRESH_MS = 1_000;

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
  // Re-evaluate freshness and refresh the relative label every second so an
  // offline user's display moves from seconds to minutes without a new write.
  const freshnessTimer = window.setInterval(() => {
    callback({
      ...latest,
      isOnline: latest.isOnline && isFresh(latest.lastSeen),
    });
  }, PRESENCE_LABEL_REFRESH_MS);
  return () => {
    unsubscribe();
    window.clearInterval(freshnessTimer);
  };
}

export function formatPresenceLabel(presence: PresenceInfo): string {
  if (presence.isOnline) return 'Online';
  if (!presence.lastSeen) return 'Last seen unavailable';

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - presence.lastSeen) / 1000));
  if (elapsedSeconds < 60) {
    return elapsedSeconds === 0
      ? 'Last seen just now'
      : `Last seen ${elapsedSeconds} second${elapsedSeconds === 1 ? '' : 's'} ago`;
  }

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) {
    return `Last seen ${elapsedMinutes} minute${elapsedMinutes === 1 ? '' : 's'} ago`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) {
    return `Last seen ${elapsedHours} hour${elapsedHours === 1 ? '' : 's'} ago`;
  }

  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays < 30) {
    return `Last seen ${elapsedDays} day${elapsedDays === 1 ? '' : 's'} ago`;
  }

  const elapsedMonths = Math.floor(elapsedDays / 30);
  if (elapsedMonths < 12) {
    return `Last seen ${elapsedMonths} month${elapsedMonths === 1 ? '' : 's'} ago`;
  }

  const elapsedYears = Math.floor(elapsedMonths / 12);
  return `Last seen ${elapsedYears} year${elapsedYears === 1 ? '' : 's'} ago`;
}

export { STALE_AFTER_MS };
