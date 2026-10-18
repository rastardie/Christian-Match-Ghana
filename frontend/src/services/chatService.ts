/**
 * Chat Service
 * Handles real-time chat and messaging operations with Firestore
 */

import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDoc, 
  getDocs,
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  Timestamp,
  serverTimestamp,
  limit,
  setDoc,
  deleteDoc,
  increment
} from 'firebase/firestore';
import { db } from '../firebase';
import type { ChatThread, Message } from '../types';

// Firestore collection names
const CHATS_COLLECTION = 'chats';
const MESSAGES_COLLECTION = 'messages';
const CALLS_COLLECTION = 'calls';

/**
 * Firestore Chat Document Structure
 */
interface ChatDocument {
  participants: string[]; // Array of user IDs
  participantDetails: {
    [userId: string]: {
      name: string;
      photo: string;
    };
  };
  lastMessage: string;
  lastMessageTime: Timestamp;
  lastMessageSenderId: string;
  unreadCount: {
    [userId: string]: number;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Firestore Message Document Structure
 */
interface MessageDocument {
  chatId: string;
  senderId: string;
  text: string;
  type: 'text' | 'image' | 'voice' | 'file';
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
    isLive?: boolean;
  };
  timestamp: Timestamp;
  status: 'sent' | 'delivered' | 'read';
  reactions?: {
    [userId: string]: string; // emoji
  };
  replyTo?: {
    id: string;
    text: string;
    senderName?: string;
  };
}

/**
 * Create or get existing chat between two users
 */
export async function createOrGetChat(
  currentUserId: string,
  partnerUserId: string,
  currentUserData: { name: string; photo: string },
  partnerUserData: { name: string; photo: string }
): Promise<string> {
  try {
    // Check if chat already exists
    const existingChat = await findChatBetweenUsers(currentUserId, partnerUserId);
    
    if (existingChat) {
      return existingChat;
    }

    // Create new chat
    const chatData: ChatDocument = {
      participants: [currentUserId, partnerUserId].sort(), // Sort for consistent querying
      participantDetails: {
        [currentUserId]: currentUserData,
        [partnerUserId]: partnerUserData,
      },
      lastMessage: '',
      lastMessageTime: Timestamp.now(),
      lastMessageSenderId: '',
      unreadCount: {
        [currentUserId]: 0,
        [partnerUserId]: 0,
      },
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const chatRef = await addDoc(collection(db, CHATS_COLLECTION), chatData);
    console.log('✅ Chat created:', chatRef.id);
    return chatRef.id;
  } catch (error) {
    console.error('❌ Error creating chat:', error);
    throw error;
  }
}

/**
 * Find existing chat between two users
 */
async function findChatBetweenUsers(
  userId1: string,
  userId2: string
): Promise<string | null> {
  try {
    const participants = [userId1, userId2].sort();
    
    const q = query(
      collection(db, CHATS_COLLECTION),
      where('participants', '==', participants),
      limit(1)
    );

    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      return snapshot.docs[0].id;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error finding chat:', error);
    return null;
  }
}

/**
 * Send a message in a chat
 */
export async function sendMessage(
  chatId: string,
  senderId: string,
  message: {
    text: string;
    type?: 'text' | 'image' | 'voice' | 'file' | 'location' | 'live_location';
    fileUrl?: string;
    fileName?: string;
    fileSize?: string;
    location?: {
      latitude: number;
      longitude: number;
      address?: string;
      isLive?: boolean;
    };
    replyTo?: {
      id: string;
      text: string;
      senderName?: string;
    };
  }
): Promise<string> {
  try {
    // Create message document
    const messageData: any = {
      chatId,
      senderId,
      text: message.text,
      type: message.type || 'text',
      timestamp: serverTimestamp(),
      status: 'sent',
      reactions: {},
    };

    // Add optional fields only if they exist
    if (message.fileUrl) messageData.fileUrl = message.fileUrl;
    if (message.fileName) messageData.fileName = message.fileName;
    if (message.fileSize) messageData.fileSize = message.fileSize;
    if (message.replyTo) messageData.replyTo = message.replyTo;
    if (message.location) messageData.location = message.location;

    const messageRef = await addDoc(collection(db, MESSAGES_COLLECTION), messageData);
    console.log('✅ Message sent:', messageRef.id);

    // Update chat with last message
    const chatRef = doc(db, CHATS_COLLECTION, chatId);
    const chatDoc = await getDoc(chatRef);
    
    if (chatDoc.exists()) {
      const chatData = chatDoc.data() as ChatDocument;
      const otherUserId = chatData.participants.find(id => id !== senderId);
      
      await updateDoc(chatRef, {
        lastMessage: message.type === 'image' ? '📷 Photo' : 
                     message.type === 'file' ? '📎 File' :
                     message.type === 'location' ? '📍 Location' :
                     message.type === 'live_location' ? '🔴 Live Location' : 
                     message.text,
        lastMessageTime: serverTimestamp(),
        lastMessageSenderId: senderId,
        [`unreadCount.${otherUserId}`]: increment(1),
        updatedAt: serverTimestamp(),
      });
    }

    return messageRef.id;
  } catch (error) {
    console.error('❌ Error sending message:', error);
    throw error;
  }
}

/**
 * Subscribe to messages in a chat (real-time)
 */
export function subscribeToMessages(
  chatId: string,
  callback: (messages: Message[]) => void
): () => void {
  const q = query(
    collection(db, MESSAGES_COLLECTION),
    where('chatId', '==', chatId),
    orderBy('timestamp', 'asc')
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const messages: Message[] = snapshot.docs.map(doc => {
      const data = doc.data() as MessageDocument;
      return {
        id: doc.id,
        senderId: data.senderId,
        text: data.text,
        timestamp: data.timestamp?.toDate?.()?.toLocaleString() || 'Just now',
        type: data.type as any, // Cast to any to avoid strict type issues with location types not in MessageDocument strict def if I missed updating it there
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileSize: data.fileSize,
        location: data.location,
        reactions: data.reactions ? Object.entries(data.reactions).map(([_, emoji]) => ({
          emoji,
          count: 1,
        })) : [],
        myReaction: undefined,
        status: data.status,
        replyTo: data.replyTo,
      };
    });

    callback(messages);
  });

  return unsubscribe;
}

/**
 * Subscribe to user's chats (real-time)
 */
export function subscribeToChats(
  userId: string,
  callback: (chats: ChatThread[]) => void
): () => void {
  const q = query(
    collection(db, CHATS_COLLECTION),
    where('participants', 'array-contains', userId),
    orderBy('lastMessageTime', 'desc')
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const chats: ChatThread[] = snapshot.docs.map(doc => {
      const data = doc.data() as ChatDocument;
      const partnerId = data.participants.find(id => id !== userId) || '';
      const partnerDetails = data.participantDetails[partnerId];

      return {
        id: doc.id,
        partnerId,
        partnerName: partnerDetails?.name || 'Unknown',
        partnerPhoto: partnerDetails?.photo || '',
        lastMessage: data.lastMessage || 'No messages yet',
        timestamp: data.lastMessageTime?.toDate?.()?.toLocaleString() || '',
        unreadCount: data.unreadCount?.[userId] || 0,
        isLocked: false, // You can add premium logic here
      };
    });

    callback(chats);
  }, (error) => {
    // Production Firestore can reject this query when its composite index or
    // permissions are unavailable. End loading instead of leaving the PWA on
    // an infinite spinner; the error remains visible in the console.
    console.error('Unable to subscribe to chats:', error);
    callback([]);
  });

  return unsubscribe;
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(chatId: string, userId: string): Promise<void> {
  try {
    const chatRef = doc(db, CHATS_COLLECTION, chatId);
    await updateDoc(chatRef, {
      [`unreadCount.${userId}`]: 0,
    });
    
    // Update message statuses
    // Note: Firestore doesn't support multiple != filters, so we fetch and filter client-side
    const q = query(
      collection(db, MESSAGES_COLLECTION),
      where('chatId', '==', chatId),
      where('status', '==', 'sent') // Or 'delivered', fetch unread messages
    );

    const snapshot = await getDocs(q);
    
    // Filter client-side to only update messages not sent by current user
    const updatePromises = snapshot.docs
      .filter(messageDoc => {
        const data = messageDoc.data();
        return data.senderId !== userId; // Only mark others' messages as read
      })
      .map(messageDoc =>
        updateDoc(doc(db, MESSAGES_COLLECTION, messageDoc.id), {
          status: 'read',
        })
      );

    await Promise.all(updatePromises);
    console.log('✅ Messages marked as read');
  } catch (error) {
    console.error('❌ Error marking messages as read:', error);
  }
}


/**
 * Delete a message
 */
export async function deleteMessage(messageId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, MESSAGES_COLLECTION, messageId));
    console.log('✅ Message deleted');
  } catch (error) {
    console.error('❌ Error deleting message:', error);
    throw error;
  }
}

/**
 * Add reaction to a message
 */
export async function addMessageReaction(
  messageId: string,
  userId: string,
  emoji: string
): Promise<void> {
  try {
    const messageRef = doc(db, MESSAGES_COLLECTION, messageId);
    await updateDoc(messageRef, {
      [`reactions.${userId}`]: emoji,
    });
    console.log('✅ Reaction added');
  } catch (error) {
    console.error('❌ Error adding reaction:', error);
    throw error;
  }
}

/**
 * Remove reaction from a message
 */
export async function removeMessageReaction(
  messageId: string,
  userId: string
): Promise<void> {
  try {
    const messageRef = doc(db, MESSAGES_COLLECTION, messageId);
    const messageDoc = await getDoc(messageRef);
    
    if (messageDoc.exists()) {
      const data = messageDoc.data() as MessageDocument;
      const reactions = { ...data.reactions };
      delete reactions[userId];
      
      await updateDoc(messageRef, { reactions });
      console.log('✅ Reaction removed');
    }
  } catch (error) {
    console.error('❌ Error removing reaction:', error);
    throw error;
  }
}

/**
 * Get chat details
 */
export async function getChatDetails(chatId: string): Promise<ChatDocument | null> {
  try {
    const chatRef = doc(db, CHATS_COLLECTION, chatId);
    const chatDoc = await getDoc(chatRef);
    
    if (chatDoc.exists()) {
      return chatDoc.data() as ChatDocument;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error getting chat details:', error);
    return null;
  }
}

/**
 * Delete a chat and all its messages
 */
export async function deleteChat(chatId: string): Promise<void> {
  try {
    // Delete all messages in the chat
    const messagesQuery = query(
      collection(db, MESSAGES_COLLECTION),
      where('chatId', '==', chatId)
    );
    
    const messagesSnapshot = await getDocs(messagesQuery);
    const deletePromises = messagesSnapshot.docs.map(messageDoc =>
      deleteDoc(doc(db, MESSAGES_COLLECTION, messageDoc.id))
    );
    
    await Promise.all(deletePromises);
    
    // Delete the chat
    await deleteDoc(doc(db, CHATS_COLLECTION, chatId));
    console.log('✅ Chat and messages deleted');
  } catch (error) {
    console.error('❌ Error deleting chat:', error);
    throw error;
  }
}

/**
 * Update message status
 */
export async function updateMessageStatus(
  messageId: string,
  status: 'sent' | 'delivered' | 'read'
): Promise<void> {
  try {
    const messageRef = doc(db, MESSAGES_COLLECTION, messageId);
    await updateDoc(messageRef, { status });
  } catch (error) {
    console.error('❌ Error updating message status:', error);
  }
}

// ------------------------------------------------------------------
// CALL SIGNALING FUNCTIONS
// ------------------------------------------------------------------

/**
 * Initiate a call
 */
export async function initiateCall(
  callerId: string,
  receiverId: string,
  callerName: string,
  callerPhoto: string,
  isVideo: boolean
): Promise<string> {
  try {
    const callData = {
      callerId,
      receiverId,
      callerName,
      callerPhoto,
      isVideo,
      status: 'ringing',
      createdAt: serverTimestamp(),
    };
    
    // Add to calls collection
    const callRef = await addDoc(collection(db, CALLS_COLLECTION), callData);
    console.log('✅ Call initiated:', callRef.id);
    return callRef.id;
  } catch (error) {
    console.error('❌ Error initiating call:', error);
    throw error;
  }
}

/**
 * Answer a call
 */
export async function answerCall(callId: string): Promise<void> {
  try {
    const callRef = doc(db, CALLS_COLLECTION, callId);
    await updateDoc(callRef, {
      status: 'accepted',
      acceptedAt: serverTimestamp(),
    });
    console.log('✅ Call answered');
  } catch (error) {
    console.error('❌ Error answering call:', error);
    throw error;
  }
}

/**
 * End/Reject a call
 */
export async function endCall(callId: string, reason: 'rejected' | 'ended' | 'missed' = 'ended'): Promise<void> {
  try {
    const callRef = doc(db, CALLS_COLLECTION, callId);
    await updateDoc(callRef, {
      status: reason,
      endedAt: serverTimestamp(),
    });
    console.log(`✅ Call ${reason}`);
  } catch (error) {
    console.error('❌ Error ending call:', error);
    // Don't throw if document doesn't exist (maybe already deleted)
  }
}

/**
 * Subscribe to incoming calls for a user
 */
export function subscribeToIncomingCalls(
  userId: string,
  callback: (call: any | null) => void
): () => void {
  // Query for ringing calls where user is receiver
  // Order by createdAt desc to get latest
  const q = query(
    collection(db, CALLS_COLLECTION),
    where('receiverId', '==', userId),
    where('status', '==', 'ringing'),
    orderBy('createdAt', 'desc'),
    limit(1)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      callback({ id: doc.id, ...doc.data() });
    } else {
      callback(null);
    }
  });

  return unsubscribe;
}

/**
 * Subscribe to status of a specific call (for caller)
 */
export function subscribeToCallStatus(
  callId: string,
  callback: (status: string) => void
): () => void {
  const callRef = doc(db, CALLS_COLLECTION, callId);
  
  const unsubscribe = onSnapshot(callRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      callback(data.status);
    } else {
      callback('ended'); // Document deleted or not found
    }
  });

  return unsubscribe;
}
