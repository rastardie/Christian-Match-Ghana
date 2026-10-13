import { db } from '../firebase';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';

/**
 * Block User Service
 * Handles blocking and unblocking users
 */

/**
 * Block a user
 * @param currentUserId - The ID of the user doing the blocking
 * @param userToBlockId - The ID of the user to block
 */
export async function blockUser(currentUserId: string, userToBlockId: string): Promise<boolean> {
  try {
    const userRef = doc(db, 'users', currentUserId);
    
    await updateDoc(userRef, {
      blockedUsers: arrayUnion(userToBlockId)
    });
    
    console.log(`✅ User ${userToBlockId} blocked by ${currentUserId}`);
    return true;
  } catch (error) {
    console.error('❌ Error blocking user:', error);
    throw error;
  }
}

/**
 * Unblock a user
 * @param currentUserId - The ID of the user doing the unblocking
 * @param userToUnblockId - The ID of the user to unblock
 */
export async function unblockUser(currentUserId: string, userToUnblockId: string): Promise<boolean> {
  try {
    const userRef = doc(db, 'users', currentUserId);
    
    await updateDoc(userRef, {
      blockedUsers: arrayRemove(userToUnblockId)
    });
    
    console.log(`✅ User ${userToUnblockId} unblocked by ${currentUserId}`);
    return true;
  } catch (error) {
    console.error('❌ Error unblocking user:', error);
    throw error;
  }
}

/**
 * Check if a user is blocked
 * @param currentUserId - The ID of the current user
 * @param otherUserId - The ID of the other user to check
 * @returns true if the other user is blocked
 */
export async function isUserBlocked(currentUserId: string, otherUserId: string): Promise<boolean> {
  try {
    const userRef = doc(db, 'users', currentUserId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      const blockedUsers = userData.blockedUsers || [];
      return blockedUsers.includes(otherUserId);
    }
    
    return false;
  } catch (error) {
    console.error('❌ Error checking if user is blocked:', error);
    return false;
  }
}

/**
 * Check if two users have blocked each other
 * @param userId1 - First user ID
 * @param userId2 - Second user ID
 * @returns true if either user has blocked the other
 */
export async function areUsersBlocked(userId1: string, userId2: string): Promise<boolean> {
  try {
    const [user1BlockedUser2, user2BlockedUser1] = await Promise.all([
      isUserBlocked(userId1, userId2),
      isUserBlocked(userId2, userId1)
    ]);
    
    return user1BlockedUser2 || user2BlockedUser1;
  } catch (error) {
    console.error('❌ Error checking blocked status:', error);
    return false;
  }
}

/**
 * Get list of blocked user IDs for a user
 * @param userId - The user ID
 * @returns Array of blocked user IDs
 */
export async function getBlockedUsers(userId: string): Promise<string[]> {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      return userData.blockedUsers || [];
    }
    
    return [];
  } catch (error) {
    console.error('❌ Error getting blocked users:', error);
    return [];
  }
}
