import { storage, db } from '../firebase';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject,
  listAll,
  getMetadata,
  UploadMetadata
} from 'firebase/storage';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  query,
  serverTimestamp,
  Timestamp,
  orderBy
} from 'firebase/firestore';

/**
 * Firebase Storage Service
 * Handles all file upload/download/delete operations with automatic Firestore metadata syncing
 */

export type FileType = 'profile_photo' | 'cover_photo' | 'gallery_photo' | 'other';

export interface FileMetadata {
  fileId: string;
  fileName: string;
  fileType: FileType;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  downloadURL: string;
  uploadedAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  userId: string;
}

/**
 * Upload a file to Firebase Storage and sync metadata to Firestore
 * @param userId - User ID
 * @param file - File to upload (File or Blob)
 * @param fileType - Type of file (profile_photo, cover_photo, gallery_photo, other)
 * @param fileName - Optional custom file name
 * @returns FileMetadata object with download URL and file info
 */
export async function uploadFile(
  userId: string,
  file: File | Blob,
  fileType: FileType,
  fileName?: string
): Promise<FileMetadata> {
  try {
    // Generate unique file ID and name
    const fileId = `${fileType}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const extension = file instanceof File && file.name ? file.name.split('.').pop() : 'jpg';
    const finalFileName = fileName || `${fileType}_${Date.now()}.${extension}`;
    
    // Create storage path: /user_uploads/{uid}/{fileName}
    const storagePath = `user_uploads/${userId}/${finalFileName}`;
    const storageRef = ref(storage, storagePath);
    
    // Prepare metadata
    const metadata: UploadMetadata = {
      contentType: file instanceof File ? file.type : 'image/jpeg',
      customMetadata: {
        userId: userId,
        fileType: fileType,
        fileId: fileId,
        uploadedAt: new Date().toISOString()
      }
    };
    
    console.log(`📤 Uploading file to Storage: ${storagePath}`);
    
    // Upload file to Firebase Storage
    const uploadResult = await uploadBytes(storageRef, file, metadata);
    console.log('✅ File uploaded to Storage successfully');
    
    // Get download URL
    const downloadURL = await getDownloadURL(uploadResult.ref);
    console.log('🔗 Download URL obtained:', downloadURL);
    
    // Create file metadata document in Firestore
    const fileMetadata: FileMetadata = {
      fileId: fileId,
      fileName: finalFileName,
      fileType: fileType,
      fileSize: file.size,
      mimeType: file instanceof File ? file.type : 'image/jpeg',
      storagePath: storagePath,
      downloadURL: downloadURL,
      uploadedAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
      userId: userId
    };
    
    // Save metadata to Firestore: /users/{uid}/files/{fileId}
    const fileDocRef = doc(db, 'users', userId, 'files', fileId);
    await setDoc(fileDocRef, fileMetadata);
    console.log('✅ File metadata synced to Firestore:', fileId);
    
    return { ...fileMetadata, uploadedAt: new Date(), updatedAt: new Date() };
  } catch (error: any) {
    console.error('❌ Error uploading file:', error);
    throw new Error(`File upload failed: ${error.message}`);
  }
}

/**
 * Delete a file from Firebase Storage and remove metadata from Firestore
 * @param userId - User ID
 * @param fileId - File ID to delete
 * @param storagePath - Storage path of the file
 */
export async function deleteFile(
  userId: string,
  fileId: string,
  storagePath: string
): Promise<void> {
  try {
    console.log(`🗑️ Deleting file: ${storagePath}`);
    
    // Delete from Firebase Storage
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
    console.log('✅ File deleted from Storage');
    
    // Delete metadata from Firestore
    const fileDocRef = doc(db, 'users', userId, 'files', fileId);
    await deleteDoc(fileDocRef);
    console.log('✅ File metadata deleted from Firestore');
  } catch (error: any) {
    console.error('❌ Error deleting file:', error);
    throw new Error(`File deletion failed: ${error.message}`);
  }
}

/**
 * Get all files for a user from Firestore
 * @param userId - User ID
 * @returns Array of FileMetadata objects
 */
export async function getUserFiles(userId: string): Promise<FileMetadata[]> {
  try {
    console.log(`📂 Fetching files for user: ${userId}`);
    
    const filesCollectionRef = collection(db, 'users', userId, 'files');
    const filesQuery = query(filesCollectionRef, orderBy('uploadedAt', 'desc'));
    const querySnapshot = await getDocs(filesQuery);
    
    const files: FileMetadata[] = [];
    querySnapshot.forEach((doc) => {
      files.push(doc.data() as FileMetadata);
    });
    
    console.log(`✅ Found ${files.length} files for user`);
    return files;
  } catch (error: any) {
    console.error('❌ Error fetching user files:', error);
    return [];
  }
}

/**
 * Get files by type for a user
 * @param userId - User ID
 * @param fileType - Type of files to fetch
 * @returns Array of FileMetadata objects
 */
export async function getUserFilesByType(
  userId: string,
  fileType: FileType
): Promise<FileMetadata[]> {
  try {
    const allFiles = await getUserFiles(userId);
    return allFiles.filter(file => file.fileType === fileType);
  } catch (error: any) {
    console.error('❌ Error fetching files by type:', error);
    return [];
  }
}

/**
 * Get download URL for a file
 * @param storagePath - Storage path of the file
 * @returns Download URL
 */
export async function getFileDownloadURL(storagePath: string): Promise<string> {
  try {
    const storageRef = ref(storage, storagePath);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error: any) {
    console.error('❌ Error getting download URL:', error);
    throw new Error(`Failed to get download URL: ${error.message}`);
  }
}

/**
 * List all files in user's storage folder
 * @param userId - User ID
 * @returns Array of storage references
 */
export async function listUserStorageFiles(userId: string) {
  try {
    const userFolderRef = ref(storage, `user_uploads/${userId}`);
    const result = await listAll(userFolderRef);
    console.log(`📋 Found ${result.items.length} files in storage for user`);
    return result.items;
  } catch (error: any) {
    console.error('❌ Error listing storage files:', error);
    return [];
  }
}

/**
 * Upload profile photo and sync to Firestore
 * @param userId - User ID
 * @param file - Photo file
 * @returns FileMetadata with download URL
 */
export async function uploadProfilePhoto(userId: string, file: File | Blob): Promise<FileMetadata> {
  return uploadFile(userId, file, 'profile_photo', `profile_${userId}_${Date.now()}.jpg`);
}

/**
 * Upload cover photo and sync to Firestore
 * @param userId - User ID
 * @param file - Photo file
 * @returns FileMetadata with download URL
 */
export async function uploadCoverPhoto(userId: string, file: File | Blob): Promise<FileMetadata> {
  return uploadFile(userId, file, 'cover_photo', `cover_${userId}_${Date.now()}.jpg`);
}

/**
 * Upload gallery photo and sync to Firestore
 * @param userId - User ID
 * @param file - Photo file
 * @returns FileMetadata with download URL
 */
export async function uploadGalleryPhoto(userId: string, file: File | Blob): Promise<FileMetadata> {
  return uploadFile(userId, file, 'gallery_photo', `gallery_${userId}_${Date.now()}.jpg`);
}

/**
 * Compress image before upload
 * @param file - Image file
 * @param maxWidth - Maximum width
 * @param maxHeight - Maximum height
 * @param quality - JPEG quality (0-1)
 * @returns Compressed image as Blob
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1200,
  maxHeight: number = 1200,
  quality: number = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Delete all files for a user from Storage and Firestore
 * @param userId - User ID
 */
export async function deleteUserFiles(userId: string): Promise<void> {
  try {
    const files = await getUserFiles(userId);
    console.log(`🗑️ Deleting ${files.length} files for user ${userId}`);
    
    // Execute deletions in parallel
    await Promise.all(files.map(file => 
      deleteFile(userId, file.fileId, file.storagePath)
        .catch(err => console.error(`Failed to delete file ${file.fileId}:`, err))
    ));
    
    console.log(`✅ All files deleted for user ${userId}`);
  } catch (error: any) {
    console.error('❌ Error deleting user files:', error);
    // Don't throw, just log. We want to continue deleting the user profile even if file deletion fails partially.
  }
}
