import { httpsCallable } from 'firebase/functions';
import { collection, onSnapshot, query, where, type Unsubscribe } from 'firebase/firestore';
import { db, functions } from '../firebase';

/**
 * Facebook-style connection requests. The server decides every transition
 * (see backend/functions/src/index.js: requestConnection, respondToConnection,
 * cancelConnectionRequest). The browser only reads and calls these.
 */

export type ConnectionRequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

export interface ConnectionRequestProfile {
  name: string;
  photo: string;
}

export interface ConnectionRequest {
  id: string;
  fromUid: string;
  toUid: string;
  status: ConnectionRequestStatus;
  fromProfile: ConnectionRequestProfile;
  toProfile: ConnectionRequestProfile;
}

export type RequestConnectionResult =
  | { status: 'connected'; chatId: string }
  | { status: 'requested'; requestId: string }
  | { status: 'incoming'; requestId: string };

export async function requestConnection(toUid: string): Promise<RequestConnectionResult> {
  const call = httpsCallable(functions, 'requestConnection');
  return (await call({ toUid })).data as RequestConnectionResult;
}

export async function respondToConnection(requestId: string, decision: 'accept' | 'decline'): Promise<{ status: string; chatId?: string }> {
  const call = httpsCallable(functions, 'respondToConnection');
  return (await call({ requestId, decision })).data as { status: string; chatId?: string };
}

export async function cancelConnectionRequest(requestId: string): Promise<void> {
  const call = httpsCallable(functions, 'cancelConnectionRequest');
  await call({ requestId });
}

/** Live list of requests the signed-in member sent or received. */
export function subscribeToConnectionRequests(uid: string, onChange: (requests: ConnectionRequest[]) => void): Unsubscribe {
  const q = query(collection(db, 'connectionRequests'), where('participants', 'array-contains', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      onChange(
        snapshot.docs.map((requestDoc) => {
          const data = requestDoc.data();
          return {
            id: requestDoc.id,
            fromUid: String(data.fromUid || ''),
            toUid: String(data.toUid || ''),
            status: data.status as ConnectionRequestStatus,
            fromProfile: { name: data.fromProfile?.name || '', photo: data.fromProfile?.photo || '' },
            toProfile: { name: data.toProfile?.name || '', photo: data.toProfile?.photo || '' },
          };
        })
      );
    },
    (error) => console.error('Connection request listener failed:', error)
  );
}
