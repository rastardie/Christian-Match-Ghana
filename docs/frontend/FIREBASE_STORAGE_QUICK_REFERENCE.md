# Firebase Storage Quick Reference

## 🚀 Quick Start

### Upload a Profile Photo

```typescript
import { uploadProfilePhoto } from "./services/fileStorageService";

const handleProfileUpload = async (file: File, userId: string) => {
  try {
    const metadata = await uploadProfilePhoto(userId, file);
    console.log("Photo uploaded:", metadata.downloadURL);

    // Update user document with download URL
    await updateUserDocument(userId, {
      photos: [metadata.downloadURL], // Set as profile photo (index 0)
    });
  } catch (error) {
    console.error("Upload failed:", error);
  }
};
```

### Upload a Cover Photo

```typescript
import { uploadCoverPhoto } from "./services/fileStorageService";

const metadata = await uploadCoverPhoto(userId, file);
// Update photos array at index 1
await updateUserDocument(userId, {
  photos: [currentProfilePhoto, metadata.downloadURL],
});
```

### Upload a Gallery Photo

```typescript
import { uploadGalleryPhoto } from "./services/fileStorageService";

const metadata = await uploadGalleryPhoto(userId, file);
// Add to photos array (index 2+)
await updateUserDocument(userId, {
  photos: [...currentPhotos, metadata.downloadURL],
});
```

### Get All User Files

```typescript
import { getUserFiles } from "./services/fileStorageService";

const files = await getUserFiles(userId);
files.forEach((file) => {
  console.log({
    name: file.fileName,
    type: file.fileType,
    size: file.fileSize,
    url: file.downloadURL,
    uploaded: file.uploadedAt,
  });
});
```

### Get Files by Type

```typescript
import { getUserFilesByType } from "./services/fileStorageService";

// Get all profile photos
const profilePhotos = await getUserFilesByType(userId, "profile_photo");

// Get all gallery photos
const galleryPhotos = await getUserFilesByType(userId, "gallery_photo");
```

### Delete a File

```typescript
import { deleteFile } from "./services/fileStorageService";

await deleteFile(userId, fileId, storagePath);
// File is deleted from both Storage and Firestore
```

### Compress Image Before Upload

```typescript
import { compressImage, uploadFile } from "./services/fileStorageService";

// Compress to max 1200x1200, 80% quality
const compressedBlob = await compressImage(file, 1200, 1200, 0.8);

// Upload the compressed version
const metadata = await uploadFile(
  userId,
  compressedBlob,
  "profile_photo",
  `profile_${userId}.jpg`,
);
```

## 📋 File Types

```typescript
type FileType = "profile_photo" | "cover_photo" | "gallery_photo" | "other";
```

- **`profile_photo`** - Profile picture (index 0 in photos array)
- **`cover_photo`** - Cover image (index 1 in photos array)
- **`gallery_photo`** - Additional gallery images (index 2+ in photos array)
- **`other`** - Any other file type

## 📊 File Metadata Structure

```typescript
interface FileMetadata {
  fileId: string; // Unique ID
  fileName: string; // Original filename
  fileType: FileType; // Type of file
  fileSize: number; // Size in bytes
  mimeType: string; // MIME type
  storagePath: string; // Path in Firebase Storage
  downloadURL: string; // Public download URL
  uploadedAt: Timestamp; // Upload timestamp
  updatedAt: Timestamp; // Last update timestamp
  userId: string; // Owner's user ID
}
```

## 🔗 Storage Paths

### Firebase Storage

```
/user_uploads/{uid}/filename.jpg
```

### Firestore Metadata

```
/users/{uid}/files/{fileId}
```

### User Photos Array

```
/users/{uid}/photos
```

## 💡 Common Patterns

### Update Profile Photo in Edit Profile

```typescript
const handlePhotoUpload = async (file: File) => {
  setLoading(true);
  try {
    // Compress
    const compressed = await compressImage(file, 1200, 1200, 0.8);

    // Upload
    const metadata = await uploadProfilePhoto(userId, compressed);

    // Update form data
    setFormData((prev) => ({
      ...prev,
      photos: [metadata.downloadURL, ...prev.photos.slice(1)],
    }));

    // Save to Firestore
    await updateUserDocument(userId, {
      photos: [metadata.downloadURL, ...currentPhotos.slice(1)],
    });

    console.log("✅ Photo updated successfully");
  } catch (error) {
    console.error("❌ Upload failed:", error);
  } finally {
    setLoading(false);
  }
};
```

### Upload During Signup

```typescript
// After user account created
if (profilePhoto) {
  const blob = await fetch(profilePhoto).then((r) => r.blob());
  const compressed = await compressImage(
    new File([blob], "profile.jpg"),
    1200,
    1200,
    0.8,
  );
  const metadata = await uploadProfilePhoto(userId, compressed);
  photoURLs[0] = metadata.downloadURL;
}

// Create user document with photo URLs
await createUserDocument(userId, {
  ...userData,
  photos: photoURLs,
});
```

### Delete and Update Photos Array

```typescript
const handleDeletePhoto = async (photoIndex: number) => {
  // Get file from history
  const files = await getUserFiles(userId);
  const fileToDelete = files[photoIndex];

  // Delete from Storage + Firestore
  await deleteFile(userId, fileToDelete.fileId, fileToDelete.storagePath);

  // Update photos array
  const newPhotos = [...currentPhotos];
  newPhotos.splice(photoIndex, 1);

  await updateUserDocument(userId, { photos: newPhotos });
};
```

## 🎯 Best Practices

### Always Compress Images

```typescript
// ❌ Bad - Upload original
await uploadFile(userId, originalFile, "profile_photo");

// ✅ Good - Compress first
const compressed = await compressImage(originalFile, 1200, 1200, 0.8);
await uploadFile(userId, compressed, "profile_photo");
```

### Handle Errors Gracefully

```typescript
try {
  const metadata = await uploadProfilePhoto(userId, file);
  onSuccess(metadata);
} catch (error) {
  console.error("Upload error:", error);
  onError(error.message);
  // Don't crash app if upload fails
}
```

### Show Loading States

```typescript
const [uploading, setUploading] = useState(false);

const upload = async () => {
  setUploading(true);
  try {
    await uploadProfilePhoto(userId, file);
  } finally {
    setUploading(false); // Always reset loading
  }
};
```

### Clear File Input After Upload

```typescript
const fileInputRef = useRef<HTMLInputElement>(null);

const handleUpload = async () => {
  // ... upload logic

  // Clear input so same file can be selected again
  if (fileInputRef.current) {
    fileInputRef.current.value = "";
  }
};
```

## 🐛 Common Issues

### Issue: Upload fails silently

**Solution:** Check console for errors. Ensure user is authenticated.

### Issue: Images too large

**Solution:** Always use `compressImage()` before uploading.

### Issue: Photo not displaying

**Solution:** Use the `downloadURL` from metadata, not the storage path.

### Issue: Metadata not syncing

**Solution:** Check Firestore permissions. Ensure user is logged in.

### Issue: Old files not cleaning up

**Solution:** Use `deleteFile()` when replacing photos to remove old versions.

## 📞 Function Reference

| Function               | Purpose              | Returns          |
| ---------------------- | -------------------- | ---------------- |
| `uploadFile()`         | Upload any file      | `FileMetadata`   |
| `uploadProfilePhoto()` | Upload profile photo | `FileMetadata`   |
| `uploadCoverPhoto()`   | Upload cover photo   | `FileMetadata`   |
| `uploadGalleryPhoto()` | Upload gallery photo | `FileMetadata`   |
| `deleteFile()`         | Delete file          | `void`           |
| `getUserFiles()`       | Get all user files   | `FileMetadata[]` |
| `getUserFilesByType()` | Filter by type       | `FileMetadata[]` |
| `compressImage()`      | Compress image       | `Blob`           |
| `getFileDownloadURL()` | Get download URL     | `string`         |

## 🔍 Debugging

### Enable Detailed Logging

All functions include console logging. Check for:

- `📸` Upload started
- `✅` Operation completed
- `❌` Error occurred
- `🔗` URL obtained
- `🗑️` File deleted

### Check Firebase Console

1. **Storage**: Verify files exist at `/user_uploads/{uid}/`
2. **Firestore**: Check metadata at `/users/{uid}/files/`
3. **Console**: Look for errors in Firebase Console logs

### Common Console Logs

```
📸 Starting profile photo upload...
✅ Image compressed: 250KB → 85KB
📤 Uploading file to Storage: user_uploads/abc123/profile_...
✅ File uploaded to Storage successfully
🔗 Download URL obtained: https://firebasestorage...
✅ File metadata synced to Firestore: profile_photo_123456
```

## 🎉 That's It!

You now have everything you need to work with Firebase Storage in the CMG app!

For more details, see:

- `FIREBASE_STORAGE_GUIDE.md` - Complete implementation guide
- `FIREBASE_STORAGE_IMPLEMENTATION_SUMMARY.md` - Full summary
- `services/fileStorageService.ts` - Source code
