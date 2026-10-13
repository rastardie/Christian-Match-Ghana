# Quick Start: Chat Setup Guide

## Step 1: Deploy Firestore Security Rules

### Option A: Using Firebase Console (Easiest)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Firestore Database** → **Rules**
4. Copy the contents of `firestore.rules` file
5. Paste into the rules editor
6. Click **Publish**

### Option B: Using Firebase CLI

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firestore (if not done)
firebase init firestore

# Deploy rules
firebase deploy --only firestore:rules
```

---

## Step 2: Create Required Indexes

### Method 1: Automatic (Recommended)

1. Run your app and try to use the chat feature
2. Firebase will log error messages with direct links to create indexes
3. Click the links in the console to automatically create the required indexes

### Method 2: Manual Creation

Go to Firebase Console → Firestore Database → Indexes → Create Index

#### Index 1: For Chats List Query

```
Collection ID: chats
Fields to index:
  - participants (Array)
  - lastMessageTime (Descending)
Query scope: Collection
```

**Steps:**

1. Click "Create Index"
2. Collection ID: `chats`
3. Add field: `participants` → Type: `Arrays`
4. Add field: `lastMessageTime` → Type: `Descending`
5. Click "Create"

#### Index 2: For Messages Query

```
Collection ID: messages
Fields to index:
  - chatId (Ascending)
  - timestamp (Ascending)
Query scope: Collection
```

**Steps:**

1. Click "Create Index"
2. Collection ID: `messages`
3. Add field: `chatId` → Type: `Ascending`
4. Add field: `timestamp` → Type: `Ascending`
5. Click "Create"

**Note:** Index creation can take a few minutes. Firebase will show status and notify when complete.

---

## Step 3: Test the Chat System

### Test Checklist

#### 1. Create a Chat

- [ ] Log in with a user account
- [ ] Browse profiles
- [ ] Click "Connect" on a profile
- [ ] Verify chat appears in the Chat/Inbox view

#### 2. Send Messages

- [ ] Open a chat
- [ ] Type a message
- [ ] Press Send
- [ ] Verify message appears instantly
- [ ] Check Firestore to confirm message was saved

#### 3. Real-Time Updates

- [ ] Open the same chat in two different browser windows/tabs
- [ ] Send a message from one window
- [ ] Verify it appears instantly in the other window

#### 4. Read Receipts

- [ ] Send messages to yourself (or a test user)
- [ ] Leave the chat (go back to inbox)
- [ ] Note the unread count badge
- [ ] Open the chat again
- [ ] Verify unread count goes to 0

#### 5. Multiple Chats

- [ ] Create chats with multiple users
- [ ] Verify all chats appear in inbox
- [ ] Verify chats are sorted by last message time
- [ ] Switch between chats and verify messages load correctly

---

## Step 4: Verify Firestore Structure

### Check Collections in Firebase Console

Navigate to **Firestore Database** → **Data**

#### Expected Collections

**1. `chats` collection**
Should contain documents with this structure:

```
Document ID: (auto-generated)
Fields:
  ├─ participants: [userId1, userId2]
  ├─ participantDetails: {
  │   ├─ userId1: {name: "...", photo: "..."}
  │   └─ userId2: {name: "...", photo: "..."}
  │  }
  ├─ lastMessage: "Hello!"
  ├─ lastMessageTime: (timestamp)
  ├─ lastMessageSenderId: "userId1"
  ├─ unreadCount: {userId1: 0, userId2: 2}
  ├─ createdAt: (timestamp)
  └─ updatedAt: (timestamp)
```

**2. `messages` collection**
Should contain documents with this structure:

```
Document ID: (auto-generated)
Fields:
  ├─ chatId: "chatId123"
  ├─ senderId: "userId1"
  ├─ text: "Hello there!"
  ├─ type: "text"
  ├─ timestamp: (timestamp)
  ├─ status: "read"
  └─ reactions: {} (optional)
```

---

## Troubleshooting

### Issue: "Missing or insufficient permissions"

**Solution:**

1. Check that security rules are deployed
2. Verify user is authenticated (`request.auth != null`)
3. Check that user ID is in the chat's `participants` array

### Issue: "The query requires an index"

**Solution:**

1. Click the link in the error message to create the index
2. OR manually create indexes as described in Step 2
3. Wait a few minutes for indexes to build

### Issue: Messages not appearing in real-time

**Solution:**

1. Check browser console for errors
2. Verify Firestore rules allow read access
3. Ensure the subscription is active (not unsubscribed too early)
4. Check network connectivity

### Issue: "Cannot read chats"

**Solution:**

1. Verify user is logged in
2. Check that `user.id` is not null/undefined
3. Review Firestore rules for the `chats` collection
4. Ensure indexes are created

---

## Performance Optimization

### For Large-Scale Deployment

#### 1. Enable Offline Persistence

```typescript
import { enableIndexedDbPersistence } from "firebase/firestore";

enableIndexedDbPersistence(db).catch((err) => {
  if (err.code == "failed-precondition") {
    console.log("Multiple tabs open");
  } else if (err.code == "unimplemented") {
    console.log("Browser not supported");
  }
});
```

#### 2. Implement Pagination

For users with many chats:

```typescript
const q = query(
  collection(db, "chats"),
  where("participants", "array-contains", userId),
  orderBy("lastMessageTime", "desc"),
  limit(20), // Load 20 chats at a time
);
```

#### 3. Message Batching

Load messages in batches:

```typescript
const q = query(
  collection(db, "messages"),
  where("chatId", "==", chatId),
  orderBy("timestamp", "desc"),
  limit(50), // Load latest 50 messages
);
```

---

## Next Steps

### Monitoring

1. Set up Firebase Performance Monitoring
2. Track chat load times
3. Monitor Firestore read/write counts

### Analytics

1. Track message send success rate
2. Monitor average response time
3. Analyze user engagement metrics

### Enhancements

1. Implement typing indicators
2. Add image/file sending
3. Create push notifications
4. Build message search

---

## Support

If you encounter issues:

1. **Check Documentation**: Review `REALTIME_CHAT_IMPLEMENTATION.md`
2. **Console Logs**: Look for error messages in browser console
3. **Firebase Console**: Check Firestore Database → Usage and logs
4. **Security Rules**: Verify rules in Firestore → Rules tab

---

**Quick Links:**

- [Firebase Console](https://console.firebase.google.com/)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Security Rules Guide](https://firebase.google.com/docs/firestore/security/get-started)

---

**Setup Complete! 🎉**

Your real-time chat system is now ready to use. Users can:

- ✅ Create chats instantly
- ✅ Send and receive messages in real-time
- ✅ See unread counts
- ✅ View chat history
- ✅ Get automatic read receipts

_Christian Match Ghana - Connecting hearts through faith_
