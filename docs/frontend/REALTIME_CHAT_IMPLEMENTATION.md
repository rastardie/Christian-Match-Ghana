# Real-Time Chat Implementation Guide

## Overview

The Christian Match Ghana dating app now features a complete real-time chat system powered by Firebase Firestore. Users can send and receive messages instantly, with automatic synchronization across devices.

## Architecture

### Firestore Collections

#### 1. **chats** Collection

Stores conversation metadata between two users.

**Document Structure:**

```typescript
{
  participants: string[];                // Sorted array of [userId1, userId2]
  participantDetails: {
    [userId]: {
      name: string;
      photo: string;
    }
  };
  lastMessage: string;
  lastMessageTime: Timestamp;
  lastMessageSenderId: string;
  unreadCount: {
    [userId]: number;                    // Unread count per user
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Example:**

```json
{
  "participants": ["user123", "user456"],
  "participantDetails": {
    "user123": {
      "name": "Sarah Johnson",
      "photo": "https://..."
    },
    "user456": {
      "name": "David Smith",
      "photo": "https://..."
    }
  },
  "lastMessage": "Blessings! How are you?",
  "lastMessageTime": "2026-01-27T11:30:00Z",
  "lastMessageSenderId": "user123",
  "unreadCount": {
    "user123": 0,
    "user456": 3
  },
  "createdAt": "2026-01-27T10:00:00Z",
  "updatedAt": "2026-01-27T11:30:00Z"
}
```

#### 2. **messages** Collection

Stores individual messages within chats.

**Document Structure:**

```typescript
{
  chatId: string;
  senderId: string;
  text: string;
  type: 'text' | 'image' | 'voice' | 'file';
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  timestamp: Timestamp;
  status: 'sent' | 'delivered' | 'read';
  reactions?: {
    [userId]: string;                    // emoji reactions
  };
}
```

**Example:**

```json
{
  "chatId": "chat789",
  "senderId": "user123",
  "text": "Praise God! Have a blessed day! 🙏",
  "type": "text",
  "timestamp": "2026-01-27T11:30:00Z",
  "status": "read",
  "reactions": {
    "user456": "❤️"
  }
}
```

---

## Service Functions

### `chatService.ts`

Located at: `services/chatService.ts`

#### Core Functions

##### 1. **createOrGetChat**

Creates a new chat or retrieves an existing one between two users.

```typescript
createOrGetChat(
  currentUserId: string,
  partnerUserId: string,
  currentUserData: { name: string; photo: string },
  partnerUserData: { name: string; photo: string }
): Promise<string>
```

**Usage:**

```typescript
const chatId = await createOrGetChat(
  user.id,
  partnerId,
  { name: user.name, photo: user.photos[0] },
  { name: partner.name, photo: partner.photos[0] },
);
```

##### 2. **sendMessage**

Sends a message to a chat.

```typescript
sendMessage(
  chatId: string,
  senderId: string,
  message: {
    text: string;
    type?: 'text' | 'image' | 'voice' | 'file';
    fileUrl?: string;
    fileName?: string;
    fileSize?: string;
  }
): Promise<string>
```

**Usage:**

```typescript
await sendMessage(chatId, currentUserId, {
  text: "Hello! Blessings!",
  type: "text",
});
```

##### 3. **subscribeToMessages**

Real-time subscription to messages in a chat.

```typescript
subscribeToMessages(
  chatId: string,
  callback: (messages: Message[]) => void
): () => void
```

**Usage:**

```typescript
const unsubscribe = subscribeToMessages(chatId, (messages) => {
  setMessages(messages);
});

// Clean up when component unmounts
return () => unsubscribe();
```

##### 4. **subscribeToChats**

Real-time subscription to user's chat list.

```typescript
subscribeToChats(
  userId: string,
  callback: (chats: ChatThread[]) => void
): () => void
```

**Usage:**

```typescript
const unsubscribe = subscribeToChats(userId, (chats) => {
  setChats(chats);
});
```

##### 5. **markMessagesAsRead**

Mark all messages in a chat as read for a user.

```typescript
markMessagesAsRead(chatId: string, userId: string): Promise<void>
```

**Usage:**

```typescript
await markMessagesAsRead(chatId, currentUserId);
```

##### 6. **addMessageReaction**

Add emoji reaction to a message.

```typescript
addMessageReaction(
  messageId: string,
  userId: string,
  emoji: string
): Promise<void>
```

##### 7. **deleteMessage**

Delete a specific message.

```typescript
deleteMessage(messageId: string): Promise<void>
```

##### 8. **deleteChat**

Delete an entire chat and all its messages.

```typescript
deleteChat(chatId: string): Promise<void>
```

---

## Component Integration

### App Component Flow

#### 1. **Real-Time Chat Subscription**

```typescript
// In App.tsx
useEffect(() => {
  if (!user?.id) return;

  const unsubscribe = subscribeToChats(user.id, (updatedChats) => {
    console.log("📨 Chats updated:", updatedChats.length);
    setChats(updatedChats);
    setIsLoadingChats(false);
  });

  return () => unsubscribe();
}, [user?.id]);
```

#### 2. **Creating Chats from Connections**

```typescript
const handleConnectRequest = async (profileId: string) => {
  const partnerData = await getUserDocument(profileId);

  const chatId = await createOrGetChat(
    user.id,
    profileId,
    { name: user.name, photo: user.photos[0] },
    { name: partnerData.name, photo: partnerData.photos[0] },
  );

  setActiveChatId(chatId);
  setCurrentView("CHAT");
};
```

### ChatListView Component

Displays list of active chats with:

- Partner name and photo
- Last message preview
- Unread message count
- Loading state
- Empty state

**Props:**

```typescript
{
  chats: ChatThread[];
  onChatSelect: (id: string) => void;
  isLoading?: boolean;
}
```

### MessageThreadView Component

Handles individual chat conversations with:

- Real-time message updates
- Message sending
- Read receipts
- Partner information
- Typing indicators (future)

**Props:**

```typescript
{
  thread: ChatThread;
  chatId: string;
  onBack: () => void;
  onStartCall: (video: boolean) => void;
  currentUserId?: string;
  onBlock?: (userId: string) => void;
}
```

**Real-Time Implementation:**

```typescript
useEffect(() => {
  const unsubscribe = subscribeToMessages(chatId, (updatedMessages) => {
    setMessages(updatedMessages);
  });

  if (currentUserId) {
    markMessagesAsRead(chatId, currentUserId);
  }

  return () => unsubscribe();
}, [chatId, currentUserId]);
```

---

## Firestore Security Rules

**Recommended rules for `chats` and `messages` collections:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Chats collection
    match /chats/{chatId} {
      // Users can read chats they're part of
      allow read: if request.auth != null &&
                     request.auth.uid in resource.data.participants;

      // Users can create chats involving themselves
      allow create: if request.auth != null &&
                       request.auth.uid in request.resource.data.participants;

      // Users can update chats they're part of
      allow update: if request.auth != null &&
                       request.auth.uid in resource.data.participants;

      // Users can delete chats they're part of
      allow delete: if request.auth != null &&
                       request.auth.uid in resource.data.participants;
    }

    // Messages collection
    match /messages/{messageId} {
      // Users can read messages in their chats
      allow read: if request.auth != null &&
                     exists(/databases/$(database)/documents/chats/$(resource.data.chatId)) &&
                     request.auth.uid in get(/databases/$(database)/documents/chats/$(resource.data.chatId)).data.participants;

      // Users can create messages in their chats
      allow create: if request.auth != null &&
                       request.auth.uid == request.resource.data.senderId &&
                       exists(/databases/$(database)/documents/chats/$(request.resource.data.chatId)) &&
                       request.auth.uid in get(/databases/$(database)/documents/chats/$(request.resource.data.chatId)).data.participants;

      // Users can update their own messages
      allow update: if request.auth != null &&
                       request.auth.uid == resource.data.senderId;

      // Users can delete their own messages
      allow delete: if request.auth != null &&
                       request.auth.uid == resource.data.senderId;
    }
  }
}
```

---

## Firestore Indexes

**Required composite indexes:**

### For `chats` collection:

```
Collection: chats
Fields: participants (Array), lastMessageTime (Descending)
```

### For `messages` collection:

```
Collection: messages
Fields: chatId (Ascending), timestamp (Ascending)
```

**To create indexes:**

1. Go to Firebase Console → Firestore Database → Indexes
2. Click "Create Index"
3. Add the fields and directions as specified above
4. Click "Create"

_Note: Firebase will also prompt you with exact index creation links in the console when queries fail due to missing indexes._

---

## Features Implemented

### ✅ Real-Time Updates

- Messages appear instantly without refresh
- Chat list updates automatically
- Unread counts update in real-time

### ✅ Read Receipts

- Messages marked as read when chat is opened
- Unread count automatically decrements
- Status tracking (sent → delivered → read)

### ✅ Message Management

- Send text messages
- View message history
- Auto-scroll to latest messages
- Timestamp display

### ✅ User Experience

- Loading states for chats
- Empty state when no chats exist
- Instant message sending feedback
- Error handling and retry

### ✅ Data Persistence

- All messages saved to Firestore
- Chat history preserved
- Automatic synchronization

---

## Future Enhancements

### Planned Features

1. **Typing Indicators** - Show when partner is typing
2. **Message Reactions** - Full emoji reaction support
3. **Media Messages** - Send images, voice notes, files
4. **Message Deletion** - Delete for me / everyone
5. **Delivery Timestamps** - Show exact delivery time
6. **Online Status** - Show when user is online/offline
7. **Push Notifications** - Notify users of new messages
8. **Message Search** - Search within conversations
9. **Chat Archiving** - Archive old conversations
10. **Group Chats** - Support for group conversations

---

## Testing Guide

### Manual Testing Steps

#### 1. **Create a Chat**

- Browse profiles
- Click "Connect" on a profile
- Verify chat is created
- Check that chat appears in inbox

#### 2. **Send Messages**

- Open a chat
- Type a message and send
- Verify message appears instantly
- Check message saved in Firestore

#### 3. **Real-Time Updates**

- Open same chat on two devices/browsers
- Send message from one
- Verify it appears on the other instantly

#### 4. **Read Receipts**

- Send messages to a chat
- Note unread count
- Open the chat
- Verify unread count goes to 0

#### 5. **Empty States**

- Log in with new account
- Navigate to Chat view
- Verify empty state shows correctly

---

## Troubleshooting

### Common Issues

#### **Messages not appearing**

- Check Firestore rules are set correctly
- Verify indexes are created
- Check console for errors
- Confirm user is authenticated

#### **Real-time updates not working**

- Verify subscription is active
- Check for component unmounting too early
- Ensure cleanup function is called
- Check network connection

#### **Permission denied errors**

- Review Firestore security rules
- Verify user authentication state
- Check that user IDs match participants array

#### **Slow performance**

- Review Firestore queries
- Ensure indexes exist
- Consider pagination for large chat lists
- Optimize message batch size

---

## Best Practices

### Performance

1. **Limit Query Results** - Use `limit()` for large datasets
2. **Unsubscribe Properly** - Always cleanup subscriptions
3. **Batch Writes** - Group related updates together
4. **Cache Data** - Use local state to reduce reads

### Security

1. **Validate Input** - Sanitize messages before sending
2. **Check Permissions** - Verify user access on every operation
3. **Rate Limiting** - Implement message send rate limits
4. **Report System** - Allow users to report inappropriate messages

### User Experience

1. **Optimistic UI** - Show messages immediately
2. **Error Handling** - Gracefully handle failures
3. **Loading States** - Show feedback during operations
4. **Offline Support** - Handle network disconnections

---

## Code Examples

### Sending a Message with Error Handling

```typescript
const handleSend = async () => {
  try {
    setIsSending(true);
    await sendMessage(chatId, userId, {
      text: messageText,
      type: "text",
    });
    setInput("");
  } catch (error) {
    console.error("Failed to send:", error);
    alert("Failed to send message. Please try again.");
  } finally {
    setIsSending(false);
  }
};
```

### Creating Chat with Loading State

```typescript
const connectWithUser = async (partnerId: string) => {
  try {
    setIsConnecting(true);
    const partnerData = await getUserDocument(partnerId);

    const chatId = await createOrGetChat(
      currentUserId,
      partnerId,
      { name: currentUser.name, photo: currentUser.photo },
      { name: partnerData.name, photo: partnerData.photo },
    );

    navigateToChat(chatId);
  } catch (error) {
    showError("Failed to create chat");
  } finally {
    setIsConnecting(false);
  }
};
```

---

**Last Updated:** January 27, 2026  
**Version:** 1.0.0  
**Status:** ✅ Fully Implemented and Tested

---

_Christian Match Ghana - Building meaningful connections through faith_
