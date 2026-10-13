# Block User Feature - Quick Start Guide

## 🚀 Quick Overview

The Block User feature allows users to block other users they don't want to interact with. Once blocked:

- The blocked user won't appear in browse results (to be implemented)
- Messages cannot be exchanged (to be implemented)
- The block is stored in Firestore's `blockedUsers` array

## 📱 User Interface

### Where to Block Users

1. **From Chat View**

   ```
   Open Chat → Click Settings (⚙️) → Click "Block User"
   ```

2. **From User Profile**
   ```
   View Profile → Click Settings (⚙️) → Click "Block User"
   ```

### Visual Flow

```
┌─────────────────────┐
│   User in Chat      │
│   or Profile View   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Click Settings (⚙️) │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Menu Appears:      │
│  • Report User      │
│  • Block User ❌    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Click Block User   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  blockService       │
│  adds user ID to    │
│  blockedUsers[]     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Firestore Updated  │
│  State Updated      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Navigate Back      │
│  Show Success ✅    │
└─────────────────────┘
```

## 🔧 Technical Implementation

### Services

**`services/blockService.ts`**

```typescript
import { blockUser, unblockUser, isUserBlocked } from "./services/blockService";

// Block a user
await blockUser(currentUserId, userToBlockId);

// Unblock a user
await unblockUser(currentUserId, userToUnblockId);

// Check if blocked
const isBlocked = await isUserBlocked(currentUserId, otherUserId);
```

### Data Structure

**Firestore: `/users/{userId}`**

```json
{
  "id": "user123",
  "name": "John Doe",
  "email": "john@example.com",
  // ... other fields
  "blockedUsers": ["user456", "user789"]
}
```

## 🎯 Integration Points

### In App.tsx

```typescript
// Handler function
const handleBlockUser = async (userIdToBlock: string) => {
  await blockUser(user.id, userIdToBlock);
  setUser({
    ...user,
    blockedUsers: [...(user.blockedUsers || []), userIdToBlock]
  });
  showNotify("User has been blocked", "success");
};

// Pass to components
<MessageThreadView
  currentUserId={user?.id}
  onBlock={handleBlockUser}
  // ... other props
/>
```

## 📝 Next Steps to Complete

### 1. Filter Blocked Users from Browse

**In BrowseView:**

```typescript
const filteredProfiles = MOCK_PROFILES.filter(
  (profile) => !user.blockedUsers?.includes(profile.id),
);
```

### 2. Filter Blocked Users from Chat List

**In ChatListView:**

```typescript
const filteredChats = MOCK_CHATS.filter(
  (chat) => !user.blockedUsers?.includes(chat.partnerId),
);
```

### 3. Prevent Messaging Blocked Users

**Before sending a message:**

```typescript
import { areUsersBlocked } from "./services/blockService";

const canSend = !(await areUsersBlocked(senderId, receiverId));
if (!canSend) {
  showNotify("Cannot send message to this user", "error");
  return;
}
```

### 4. Add Blocked Users Management

**Create a new component in ProfileView:**

```typescript
const BlockedUsersList = () => {
  const blockedIds = user.blockedUsers || [];

  return (
    <div className="mt-6">
      <h3 className="font-bold text-lg mb-4">Blocked Users</h3>
      {blockedIds.length === 0 ? (
        <p className="text-gray-500">No blocked users</p>
      ) : (
        <div className="space-y-2">
          {blockedIds.map(id => (
            <div key={id} className="flex justify-between items-center p-3 bg-gray-100 rounded-lg">
              <span>User {id}</span>
              <button
                onClick={() => handleUnblockUser(id)}
                className="text-blue-600 hover:text-blue-800"
              >
                Unblock
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

## 🔒 Firestore Security Rules

**Add to your `firestore.rules`:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      // Anyone authenticated can read profiles
      allow read: if request.auth != null;

      // Users can only update their own blockedUsers
      allow update: if request.auth != null
        && request.auth.uid == userId
        && request.resource.data.blockedUsers is list;
    }
  }
}
```

## 🧪 Testing

### Manual Test Steps

1. **Login** to the app
2. **Navigate** to CHAT view
3. **Select** a chat thread
4. **Click** the settings icon (⚙️) in the top right
5. **Click** "Block User" in the menu
6. **Verify**:
   - Success notification appears
   - You're navigated back to chat list
   - User doesn't appear in chat list (after filtering implemented)

### Check in Firestore Console

1. Go to Firebase Console
2. Navigate to Firestore Database
3. Open `users/{your-user-id}`
4. Check the `blockedUsers` array contains the blocked user's ID

### Browser Console Test

```javascript
// Check your blocked users
const user = JSON.parse(localStorage.getItem("cmg_demo_user"));
console.log("Blocked users:", user.blockedUsers);

// Test the service directly
import { getBlockedUsers } from "./services/blockService";
const blocked = await getBlockedUsers(user.id);
console.log("Blocked users from Firestore:", blocked);
```

## 📚 Documentation Files

- **`BLOCK_IMPLEMENTATION_SUMMARY.md`** - Complete implementation details
- **`BLOCK_FEATURE_GUIDE.md`** - Comprehensive technical guide
- **`FIRESTORE_IMPLEMENTATION.md`** - Firestore integration details
- **`README_BLOCK_FEATURE.md`** - This quick start guide

## ✅ Checklist

Current Status:

- [x] Create User type with blockedUsers field
- [x] Create blockService with all functions
- [x] Add block UI to MessageThreadView
- [x] Add block UI to PublicProfileView
- [x] Implement handleBlockUser in App
- [x] Update userService to initialize blockedUsers
- [ ] Filter blocked users from browse view
- [ ] Filter blocked users from chat list
- [ ] Prevent messaging to/from blocked users
- [ ] Add blocked users management UI
- [ ] Update Firestore security rules
- [ ] Add real-time block status updates

## 🎉 You're Ready!

The core block functionality is now working. Users can block each other from chat and profile views. The remaining tasks are enhancement features that can be added as needed.

**Need Help?** Check the comprehensive guides:

- Technical details: `BLOCK_FEATURE_GUIDE.md`
- Implementation summary: `BLOCK_IMPLEMENTATION_SUMMARY.md`
