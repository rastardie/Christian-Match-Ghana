import { db, functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, serverTimestamp, collection, getDocs, query, where } from 'firebase/firestore';
import { User } from '../types';

/**
 * Firestore User Service
 * Handles all database operations for user documents
 */

/**
 * Create a new user document in Firestore
 */
export async function createUserDocument(uid: string, userData: Partial<User>) {
  try {
    const userRef = doc(db, 'users', uid);
    
    const userDoc = {
      id: uid,
      email: userData.email || '',
      phone: userData.phone || '',
      name: userData.name || '',
      age: userData.age || 0,
      gender: userData.gender || '',
      height: userData.height || 0,
      country: userData.country || 'Ghana',
      location: userData.location || '',
      bio: userData.bio || '',
      photos: userData.photos || [],
      
      // Faith-specific
      denomination: userData.denomination || '',
      churchName: userData.churchName || '',
      churchAttendance: userData.churchAttendance || '',
      churchInvolvement: userData.churchInvolvement || '',
      bibleReadingFreq: userData.bibleReadingFreq || '',
      prayerFreq: userData.prayerFreq || '',
      faithMaturity: userData.faithMaturity || '',
      favoriteVerse: userData.favoriteVerse || '',
      spiritualLesson: userData.spiritualLesson || '',
      faithStatement: userData.faithStatement || '',
      
      // Professional
      education: userData.education || '',
      profession: userData.profession || '',
      acceptsLongDistance: userData.acceptsLongDistance || false,
      intentions: userData.intentions || '',
      
      // Lifestyle
      drinking: userData.drinking || false,
      smoking: userData.smoking || false,
      lookingFor: userData.lookingFor || '',
      intendToMarry: userData.intendToMarry || '',
      willingToRelocate: userData.willingToRelocate || '',
      
      // Preferences
      preferredAgeMin: userData.preferredAgeMin || 18,
      preferredAgeMax: userData.preferredAgeMax || 100,
      preferredLocation: userData.preferredLocation || '',
      preferredDenomination: userData.preferredDenomination || '',
      preferredEthnicGroup: userData.preferredEthnicGroup || '',
      dealBreakers: userData.dealBreakers || '',
      
      // Additional Info
      healthCondition: userData.healthCondition || '',
      lifestyleInfo: userData.lifestyleInfo || '',
      hasChildren: userData.hasChildren || '',
      wantChildren: userData.wantChildren || '',
      bodyType: userData.bodyType || '',
      complexion: userData.complexion || '',
      languages: userData.languages || '',
      occupation: userData.occupation || '',
      incomeRange: userData.incomeRange || '',
      dob: userData.dob || '',
      maritalStatus: userData.maritalStatus || '',
      alcohol: userData.alcohol || '',
      
      // Security
      isVerified: userData.isVerified || false,
      verificationStatus: userData.verificationStatus || 'unverified',
      isContactVerified: userData.isContactVerified || false,
      isPremium: userData.isPremium || false,
      termsAccepted: userData.termsAccepted || false,
      termsAcceptedAt: userData.termsAcceptedAt || new Date().toISOString(),
      
      // Subscription properties
      subscriptionStartDate: userData.subscriptionStartDate || null,
      subscriptionEndDate: userData.subscriptionEndDate || null,
      subscriptionType: userData.subscriptionType || null,
      subscriptionStatus: userData.subscriptionStatus || null,
      
      // Blocked users
      blockedUsers: userData.blockedUsers || [],
      
      // Timestamps
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(userRef, userDoc);
    console.log('✅ User document created in Firestore:', uid);
    
    return userDoc;
  } catch (error) {
    console.error('❌ Error creating user document:', error);
    throw error;
  }
}

/**
 * Get user document from Firestore
 */
export async function getUserDocument(uid: string): Promise<User | null> {
  if (!uid) {
    console.error('❌ getUserDocument called with undefined/null uid');
    return null;
  }
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      console.log('✅ User document retrieved from Firestore:', uid);
      const data = userSnap.data();
      // Credential hashes are server-only and must never enter client state.
      const { pinHash: _pinHash, ...safeData } = data;
      return { id: uid, ...safeData } as User;
    } else {
      console.log('⚠️ User document not found in Firestore:', uid);
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting user document:', error);
    return null;
  }
}

/**
 * Remove undefined values from an object
 */
function removeUndefinedValues(obj: any): any {
  const cleaned: any = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      cleaned[key] = obj[key];
    }
  }
  return cleaned;
}

/**
 * Update user document in Firestore
 */
export async function updateUserDocument(uid: string, updates: Partial<User>) {
  try {
    const userRef = doc(db, 'users', uid);
    
    // Remove undefined values from updates (Firestore doesn't allow undefined)
    const cleanedUpdates = removeUndefinedValues(updates);
    
    const updateData = {
      ...cleanedUpdates,
      updatedAt: serverTimestamp(),
    };
    
    await updateDoc(userRef, updateData);
    console.log('✅ User document updated in Firestore:', uid);
    
    return true;
  } catch (error) {
    console.error('❌ Error updating user document:', error);
    throw error;
  }
}

/**
 * Delete user document from Firestore
 */
export async function deleteUserDocument(uid: string) {
  try {
    const userRef = doc(db, 'users', uid);
    await deleteDoc(userRef);
    console.log('✅ User document deleted from Firestore:', uid);
    
    return true;
  } catch (error) {
    console.error('❌ Error deleting user document:', error);
    throw error;
  }
}

/**
 * Check if user document exists in Firestore
 */
export async function userDocumentExists(uid: string): Promise<boolean> {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    return userSnap.exists();
  } catch (error) {
    console.error('❌ Error checking user document existence:', error);
    return false;
  }
}

/**
 * Get all users from Firestore (for Browse view)
 * Excludes the current user and their blocked users
 */
export async function getAllUsers(currentUserId?: string, blockedUserIds: string[] = [], currentUserGender?: string): Promise<User[]> {
  try {
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);
    
    const users: User[] = [];
    querySnapshot.forEach((doc) => {
      const userData = doc.data() as User;
      
      // Exclude current user and blocked users
      if (userData.id !== currentUserId && !blockedUserIds.includes(userData.id)) {
        // Gender filtering: Male sees Female, Female sees Male
        let includeUser = true;
 
        if (currentUserGender) {
          const userGenderLower = currentUserGender.toLowerCase();
          const targetGenderLower = (userData.gender || '').toLowerCase();
          
          if (userGenderLower === 'male' && targetGenderLower !== 'female') {
            includeUser = false;
          } else if (userGenderLower === 'female' && targetGenderLower !== 'male') {
            includeUser = false;
          }
        }
        
        if (includeUser) {
          users.push(userData);
        }
      }
    });
    
    console.log(`✅ Retrieved ${users.length} users from Firestore`);
    return users;
  } catch (error) {
    console.error('❌ Error getting all users:', error);
    return [];
  }
}

/**
 * Delete User Account completely
 */
export async function deleteUserAccountAndData(): Promise<boolean> {
  try {
    const deleteMyAccount = httpsCallable(functions, 'deleteMyAccount');
    await deleteMyAccount();
    console.log('✅ Successfully deleted user account and data via Cloud Function');
    return true;
  } catch (error) {
    console.error('❌ Error deleting user account:', error);
    throw error;
  }
}

/**
 * Check if email is eligible for signup (10-day block check)
 */
export async function checkSignupEligibility(email: string): Promise<{allowed: boolean; reason?: string}> {
  try {
    const checkEligibility = httpsCallable(functions, 'checkSignupEligibility');
    const result = await checkEligibility({ email });
    return result.data as {allowed: boolean; reason?: string};
  } catch (error) {
    console.error('❌ Error checking signup eligibility:', error);
    // On error, let them try rather than hard blocking, or log it
    return { allowed: true };
  }
}

/**
 * Claim the free-access promo (server-side eligibility: cohort or new member, verified).
 * The server independently verifies eligibility; the client only triggers the claim.
 */
export async function claimFreePromo(): Promise<{ granted: boolean; reason?: string; eligibility?: string; promoEndsOn?: string }> {
  try {
    const claim = httpsCallable(functions, 'sendUnverifiedVerificationReminders');
    const result = await claim({ action: 'claimFreePromo' });
    return result.data as { granted: boolean; reason?: string; eligibility?: string; promoEndsOn?: string };
  } catch (error) {
    console.error('❌ Error claiming free promo:', error);
    return { granted: false, reason: 'error' };
  }
}
