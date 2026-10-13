# Prayer Wall - Real Data Implementation

## Overview

The Community Prayer Wall has been upgraded to use **real-time Firestore data**. Users can now share prayer requests, pray for others (like), and comment on requests.

## Features Implemented

### 1. Prayer Service (`services/prayerService.ts`)

A dedicated service handling:

- **`addPrayerRequest`**: Creates a new document in `prayer_requests`.
- **`subscribeToPrayerRequests`**: Real-time listener for the prayer wall feed.
- **`togglePray`**: Atomically increments/decrements the prayer count and tracks user status.
- **`addComment`**: Adds comments to a `comments` subcollection within a prayer request.
- **`subscribeToComments`**: Real-time listener for comments on a specific prayer.

### 2. Community View Updates (`App.tsx`)

- **Real-time Feed**: The "Prayer Wall" tab now subscribes to the database.
- **Posting**: "Share a prayer request" now saves to the database.
- **Praying**: Clicking "Pray" updates the database instantly.
- **Commenting**: Opening a request shows real comments and allows adding new ones.

## Firestore Schema

### Collection: `prayer_requests`

| Field          | Type      | Description                      |
| -------------- | --------- | -------------------------------- |
| `userId`       | string    | ID of the poster                 |
| `userName`     | string    | Name of the poster               |
| `content`      | string    | The prayer request text          |
| `prayingCount` | number    | Total number of people praying   |
| `prayedBy`     | array     | List of user IDs who have prayed |
| `commentCount` | number    | Total number of comments         |
| `createdAt`    | timestamp | Server timestamp                 |
| `isPublic`     | boolean   | Visibility status                |

### Subcollection: `comments` (nested in `prayer_requests/{id}`)

| Field       | Type      | Description      |
| ----------- | --------- | ---------------- |
| `userId`    | string    | Commenter ID     |
| `userName`  | string    | Commenter Name   |
| `text`      | string    | Comment content  |
| `createdAt` | timestamp | Server timestamp |

## User Experience

- **Loading States**: Spinners appear while fetching prayers or comments.
- **Empty States**: Helpful messages when no prayers or comments exist.
- **Real-time**: Content updates instantly without refreshing (when others post or pray).

## Notes

- **Comment Reactions**: Placeholder logic is in place; currently disabled in the UI to focus on core functionality.
- **Devotional**: The "Daily Word" tab still uses the mocked/API logic as requested (or unchanged).

## Testing

1. Go to **Community > Prayer Wall**.
2. Click **Share a prayer request** and post something.
3. Verify it appears on the wall.
4. Click **Pray** on a request.
5. Click **Comments** to open the detail view and post a comment.
