# Messaging Fix - Firestore Undefined Values

## Issue

Messages were not being sent. Sending a message resulted in a silent failure or error because Firestore rejected the document creation.

## Root Cause

The `sendMessage` function in `services/chatService.ts` was attempting to save an object with `undefined` values for optional fields:

```typescript
{
  fileUrl: message.fileUrl, // undefined when sending text only
  fileName: message.fileName, // undefined
  fileSize: message.fileSize // undefined
}
```

Firestore **throws an error** if any field value is `undefined`.

## Solution

Updated the `sendMessage` function to construct the message object dynamically. Optional fields (`fileUrl`, `fileName`, `fileSize`) are now only added to the object if they are defined/truthy.

### Code Change

**Before:**

```typescript
const messageData = {
  // ...
  fileUrl: message.fileUrl,
  // ...
};
```

**After:**

```typescript
const messageData: any = {
  // ... required fields
};

if (message.fileUrl) messageData.fileUrl = message.fileUrl;
// ... other optional fields added conditionally
```

## Verification

1. Open a chat.
2. Type a text message.
3. Press Send.
4. The message should now appear in the chat stream immediately (due to real-time listeners) and persist in Firestore.
