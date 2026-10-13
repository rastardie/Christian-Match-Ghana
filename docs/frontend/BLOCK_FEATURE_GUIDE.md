# Block User Feature Implementation Guide

## Overview

The Block User feature allows users to block other users, preventing them from seeing each other's profiles or sending messages to each other. This document explains how the feature works and how to extend it.

## Architecture

### 1. Data Model

**User Interface Extension** (`types.ts`)

```typescript
export interface User {
  // ... other fields
  blockedUsers?: string[]; // Array of user IDs that this user has blocked
}
```

### 2. Services

**Block Service** (`services/blockService.ts`)

The block service provides the following functions:

- **`blockUser(currentUserId, userToBlockId)`**: Adds a user ID to the blockedUsers array
- **`unblockUser(currentUserId, userToUnblockId)`**: Removes a user ID from the blockedUsers array
- **`isUserBlocked(currentUserId, otherUserId)`**: Checks if a specific user is blocked
- **`areUsersBlocked(userId1, userId2)`**: Checks if either user has blocked the other (bidirectional check)
- **`getBlockedUsers(userId)`**: Gets the list of all blocked user IDs

All functions use Firestore's `arrayUnion` and `arrayRemove` for atomic updates.

### 3. UI Components

**MessageThreadView** (`App.tsx`)

The chat view includes a settings menu with:

- Report User option
- Block User option

When a user clicks "Block User":

1. A confirmation modal appears (or direct action)
2. The `onBlock` callback is triggered with the user ID to block
3. The user is blocked via the block service
4. The UI navigates back to the chat list
5. A success notification is shown

**PublicProfileView** (`App.tsx`)

The public profile view includes a settings menu (top right) with:

- Report User option
- Block User option

When a user clicks "Block User" from a profile:

1. The `onBlock` callback is triggered
2. The user is blocked via the block service
3. A success notification is shown
4. The view can navigate back or stay (depending on UX preference)

**ProfileView** (Your Profile)

Currently not implemented, but you can add:

- A "Blocked Users" section in settings
- List of blocked users with unblock option

## Usage

### Blocking a User

From the main App component:

```typescript
const handleBlockUser = async (userIdToBlock: string) => {
  if (!user) return;

  try {
    // Block the user in Firestore
    await blockUser(user.id, userIdToBlock);

    // Update local user state
    const updatedBlockedUsers = [...(user.blockedUsers || []), userIdToBlock];
    setUser({
      ...user,
      blockedUsers: updatedBlockedUsers,
    });

    // Navigate or update UI
    setActiveChatId(null);

    showNotify("User has been blocked", "success");
  } catch (error) {
    console.error("Error blocking user:", error);
    showNotify("Failed to block user", "error");
  }
};
```

### Checking Block Status

```typescript
// Check if current user has blocked another user
const blocked = await isUserBlocked(currentUser.id, otherUser.id);

// Check if either user has blocked the other
const eitherBlocked = await areUsersBlocked(user1.id, user2.id);
```

### Filtering Blocked Users

To filter blocked users from lists (browse, messages, etc.):

```typescript
// Filter profiles in browse view
const visibleProfiles = allProfiles.filter(
  (profile) => !user.blockedUsers?.includes(profile.id),
);

// Filter chat threads
const visibleChats = allChats.filter(
  (chat) => !user.blockedUsers?.includes(chat.partnerId),
);
```

## Future Enhancements

### 1. Message Filtering

When loading messages, check if users have blocked each other:

```typescript
const canMessage = !(await areUsersBlocked(senderId, receiverId));
if (!canMessage) {
  throw new Error("Cannot send message to blocked user");
}
```

### 2. Profile Visibility

When viewing a profile:

```typescript
const canViewProfile = !(await areUsersBlocked(viewerId, profileOwnerId));
if (!canViewProfile) {
  return <div>This profile is not available</div>;
}
```

### 3. Blocked Users Management UI

Add a section in Settings/Profile to manage blocked users:

```tsx
const BlockedUsersList = ({ user, onUnblock }) => {
  const [blockedUsers, setBlockedUsers] = useState([]);

  useEffect(() => {
    // Load blocked user details
    const loadBlockedUsers = async () => {
      const blockedIds = user.blockedUsers || [];
      const users = await Promise.all(
        blockedIds.map((id) => getUserDocument(id)),
      );
      setBlockedUsers(users.filter(Boolean));
    };
    loadBlockedUsers();
  }, [user.blockedUsers]);

  return (
    <div>
      <h3>Blocked Users</h3>
      {blockedUsers.map((blockedUser) => (
        <div key={blockedUser.id}>
          {blockedUser.name}
          <button onClick={() => onUnblock(blockedUser.id)}>Unblock</button>
        </div>
      ))}
    </div>
  );
};
```

### 4. Real-time Updates

Use Firestore real-time listeners to update the blocked status:

```typescript
import { onSnapshot } from "firebase/firestore";

// Listen for changes to blocked users
const userRef = doc(db, "users", currentUserId);
const unsubscribe = onSnapshot(userRef, (doc) => {
  const userData = doc.data();
  setBlockedUsers(userData.blockedUsers || []);
});
```

## Security Considerations

### Firestore Security Rules

Update your Firestore security rules to ensure users can only modify their own blockedUsers array:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      // Users can read any profile
      allow read: if request.auth != null;

      // Users can only update their own document
      allow update: if request.auth != null && request.auth.uid == userId;

      // Additional validation for blockedUsers field
      allow update: if request.auth != null
        && request.auth.uid == userId
        && request.resource.data.blockedUsers is list;
    }
  }
}
```

### Privacy

- Blocked users should not be notified when they are blocked
- Blocked users should not know they've been blocked (profiles/chats just appear empty)
- The block action should be one-way (if A blocks B, B can still see A unless they also block A)

## Testing

### Test Cases

1. **Block a user from chat**
   - Open a chat thread
   - Click settings menu
   - Click "Block User"
   - Verify user is added to blockedUsers array
   - Verify navigation back to chat list
   - Verify success notification

2. **Block a user from profile**
   - View a public profile
   - Click settings menu
   - Click "Block User"
   - Verify user is blocked

3. **Unblock a user**
   - Go to blocked users list
   - Click unblock on a user
   - Verify user is removed from blockedUsers array

4. **Bidirectional block check**
   - User A blocks User B
   - Verify `areUsersBlocked(A, B)` returns true
   - User B blocks User A
   - Verify block persists

## Troubleshooting

### Common Issues

**Issue**: Block action doesn't work

- Check if user is authenticated (`user.id` exists)
- Check Firestore security rules
- Check browser console for errors

**Issue**: Blocked users still appear

- Ensure you're filtering based on `user.blockedUsers`
- Check if the user state is being updated after blocking

**Issue**: Cannot unblock users

- Verify the unblock function is using `arrayRemove`
- Check if the user ID is correct

## Integration Checklist

- [x] Create `blockedUsers` field in User type
- [x] Create block service with CRUD operations
- [x] Add block UI to MessageThreadView
- [x] Add block UI to PublicProfileView
- [x] Implement handleBlockUser in App component
- [x] Update Firestore user creation to include empty blockedUsers array
- [ ] Filter blocked users from browse view
- [ ] Filter blocked users from chat list
- [ ] Prevent sending messages to blocked users
- [ ] Add blocked users management UI
- [ ] Update Firestore security rules
- [ ] Add real-time updates for block status
