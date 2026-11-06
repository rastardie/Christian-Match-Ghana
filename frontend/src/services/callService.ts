import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';

const CALLS_COLLECTION = 'calls';
const CANDIDATES_COLLECTION = 'candidates';

export type WebRtcCallState = 'connecting' | 'connected' | 'reconnecting' | 'failed' | 'ended';

export interface WebRtcCallSessionOptions {
  callId: string;
  userId: string;
  remoteUserId: string;
  isCaller: boolean;
  localStream: MediaStream;
  onRemoteStream: (stream: MediaStream) => void;
  onStateChange: (state: WebRtcCallState) => void;
  onError?: (error: unknown) => void;
}

const STUN_FALLBACK: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

/**
 * ICE servers for this call. Order: explicit build-time override, then short-lived
 * TURN credentials from the getCallIceServers callable (Metered), then STUN only.
 * TURN is what lets calls connect across different networks.
 */
async function resolveIceServers(): Promise<RTCIceServer[]> {
  const configured = import.meta.env.VITE_WEBRTC_ICE_SERVERS;
  if (configured) {
    try {
      const parsed = JSON.parse(configured);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as RTCIceServer[];
    } catch (error) {
      console.warn('[WebRTC] Invalid VITE_WEBRTC_ICE_SERVERS configuration:', error);
    }
  }
  try {
    const fetchIceServers = httpsCallable<unknown, { iceServers?: RTCIceServer[] }>(functions, 'getCallIceServers');
    const result = await fetchIceServers({});
    const servers = result.data?.iceServers;
    if (Array.isArray(servers) && servers.length > 0) return servers;
  } catch (error) {
    console.warn('[WebRTC] TURN credentials unavailable, using STUN only:', error);
  }
  return STUN_FALLBACK;
}

/**
 * Logs which ICE path carries the call: "host"/"srflx" is direct peer-to-peer,
 * "relay" means a TURN server is carrying the media. Used to validate call
 * connectivity on DEV without exposing candidate addresses.
 */
async function logSelectedPath(peer: RTCPeerConnection): Promise<void> {
  try {
    const stats = await peer.getStats();
    stats.forEach((report) => {
      if (report.type !== 'candidate-pair' || !report.nominated || report.state !== 'succeeded') return;
      const local = stats.get(report.localCandidateId) as { candidateType?: string } | undefined;
      const remote = stats.get(report.remoteCandidateId) as { candidateType?: string } | undefined;
      console.info('[WebRTC] connected path', { local: local?.candidateType, remote: remote?.candidateType });
    });
  } catch (error) {
    console.warn('[WebRTC] Unable to read selected candidate pair:', error);
  }
}

function candidateRef(callId: string, candidateId?: string) {
  return candidateId
    ? doc(db, CALLS_COLLECTION, callId, CANDIDATES_COLLECTION, candidateId)
    : doc(collection(db, CALLS_COLLECTION, callId, CANDIDATES_COLLECTION));
}

/**
 * Establishes the media connection after Firestore has delivered the call.
 * Firestore carries only SDP/ICE signaling; audio/video stays peer-to-peer.
 */
export async function startWebRtcCallSession(options: WebRtcCallSessionOptions): Promise<() => void> {
  const {
    callId,
    userId,
    remoteUserId,
    isCaller,
    localStream,
    onRemoteStream,
    onStateChange,
    onError,
  } = options;
  const callRef = doc(db, CALLS_COLLECTION, callId);
  const candidatesRef = collection(db, CALLS_COLLECTION, callId, CANDIDATES_COLLECTION);
  const peer = new RTCPeerConnection({ iceServers: await resolveIceServers() });
  const remoteStream = new MediaStream();
  const pendingCandidates: RTCIceCandidateInit[] = [];
  let remoteDescriptionSet = false;
  let answerWritten = false;
  let disposed = false;

  localStream.getTracks().forEach((track) => peer.addTrack(track, localStream));
  onRemoteStream(remoteStream);
  onStateChange('connecting');

  const addCandidate = async (candidate: RTCIceCandidateInit) => {
    if (disposed) return;
    if (!remoteDescriptionSet) {
      pendingCandidates.push(candidate);
      return;
    }
    try {
      await peer.addIceCandidate(candidate);
    } catch (error) {
      onError?.(error);
    }
  };

  const flushCandidates = async () => {
    const queued = pendingCandidates.splice(0, pendingCandidates.length);
    for (const candidate of queued) await addCandidate(candidate);
  };

  peer.ontrack = (event) => {
    const stream = event.streams[0];
    if (stream) {
      stream.getTracks().forEach((track) => {
        if (!remoteStream.getTracks().some((existing) => existing.id === track.id)) {
          remoteStream.addTrack(track);
        }
      });
    } else {
      remoteStream.addTrack(event.track);
    }
    onRemoteStream(remoteStream);
  };

  peer.onicecandidate = async (event) => {
    if (!event.candidate || disposed) return;
    try {
      const json = event.candidate.toJSON();
      // Write only the keys the Firestore rule allows (hasOnly). Omit any
      // null/undefined optional fields so the payload never carries an
      // unexpected key or value that would fail validation.
      const payload: Record<string, unknown> = {
        senderId: userId,
        candidate: json.candidate ?? '',
        createdAt: serverTimestamp(),
      };
      if (json.sdpMid !== null && json.sdpMid !== undefined) payload.sdpMid = json.sdpMid;
      if (json.sdpMLineIndex !== null && json.sdpMLineIndex !== undefined) payload.sdpMLineIndex = json.sdpMLineIndex;
      if (json.usernameFragment !== null && json.usernameFragment !== undefined) payload.usernameFragment = json.usernameFragment;
      await setDoc(candidateRef(callId), payload);
    } catch (error) {
      onError?.(error);
    }
  };

  peer.onconnectionstatechange = () => {
    if (disposed) return;
    if (peer.connectionState === 'connected') {
      onStateChange('connected');
      void logSelectedPath(peer);
      void updateDoc(callRef, { status: 'connected', connectedAt: serverTimestamp() }).catch(onError);
    } else if (peer.connectionState === 'connecting' || peer.connectionState === 'new') {
      // Initial negotiation — keep showing "connecting", not "reconnecting".
      onStateChange('connecting');
    } else if (peer.connectionState === 'disconnected') {
      onStateChange('reconnecting');
    } else if (peer.connectionState === 'failed') {
      onStateChange('failed');
      void updateDoc(callRef, { status: 'failed', failedAt: serverTimestamp() }).catch(onError);
    } else if (peer.connectionState === 'closed') onStateChange('ended');
  };

  const unsubscribeCandidates = onSnapshot(
    query(candidatesRef, where('senderId', '==', remoteUserId)),
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type !== 'added') return;
        const data = change.doc.data();
        void addCandidate({
          candidate: data.candidate,
          sdpMid: data.sdpMid ?? null,
          sdpMLineIndex: data.sdpMLineIndex ?? null,
          usernameFragment: data.usernameFragment,
        });
      });
    },
    (error) => onError?.(error),
  );

  const unsubscribeCall = onSnapshot(
    callRef,
    (snapshot) => {
      const data = snapshot.data();
      if (!data || disposed) return;
      void (async () => {
        try {
          if (isCaller && data.answer && !remoteDescriptionSet) {
            await peer.setRemoteDescription(data.answer as RTCSessionDescriptionInit);
            remoteDescriptionSet = true;
            await flushCandidates();
          }

          if (!isCaller && data.offer && !answerWritten) {
            await peer.setRemoteDescription(data.offer as RTCSessionDescriptionInit);
            remoteDescriptionSet = true;
            await flushCandidates();
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            await updateDoc(callRef, {
              answer: {
                type: answer.type,
                sdp: answer.sdp,
              },
              status: 'connecting',
            });
            answerWritten = true;
          }

          if (['ended', 'rejected', 'missed', 'failed', 'expired'].includes(data.status)) {
            onStateChange('ended');
          }
        } catch (error) {
          onError?.(error);
          onStateChange('failed');
        }
      })();
    },
    (error) => onError?.(error),
  );

  if (isCaller) {
    try {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      await updateDoc(callRef, {
        offer: {
          type: offer.type,
          sdp: offer.sdp,
        },
      });
    } catch (error) {
      onError?.(error);
      onStateChange('failed');
    }
  }

  return () => {
    disposed = true;
    unsubscribeCall();
    unsubscribeCandidates();
    peer.ontrack = null;
    peer.onicecandidate = null;
    peer.close();
    remoteStream.getTracks().forEach((track) => track.stop());
  };
}
