
import { app, db, functions } from '../firebase';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification, signOut } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  where,
  getCountFromServer,
  limit,
  Timestamp,
  doc,
  deleteDoc,
  updateDoc,
  setDoc,
  serverTimestamp,
  getAggregateFromServer,
  sum
} from 'firebase/firestore';
import { User, PrayerRequest } from '../types';
import { deleteUserFiles } from './fileStorageService';
import { deleteUserPrayers } from './prayerService';

/**
 * Admin Service
 * Handles data fetching for the Admin Dashboard
 */

export interface DashboardStats {
  totalUsers: number;
  activeMatches: number; // Placeholder, assuming we can count matches
  totalRevenue: number; // Placeholder
  pendingReports: number;
  userGrowth: number; // Percentage
  matchesGrowth: number; // Percentage
  revenueGrowth: number; // Percentage
  reportsChange: number; // Absolute change
}

/**
 * Get aggregated stats for the dashboard
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // 1. Total Users
    const usersColl = collection(db, 'users');
    const usersSnapshot = await getCountFromServer(usersColl);
    const totalUsers = usersSnapshot.data().count;

    // 2. Active Matches (using 'chats' collection)
    let totalMatches = 0;
    try {
        const matchesColl = collection(db, 'chats');
        const matchesSnapshot = await getCountFromServer(matchesColl);
        totalMatches = matchesSnapshot.data().count;
    } catch (e) {
        console.warn("Could not fetch matches count", e);
    }

    // 3. Reports (Assuming 'reports' collection)
    let pendingReports = 0;
    try {
        const reportsColl = collection(db, 'reports');
        const q = query(reportsColl, where('status', '==', 'pending'));
        const reportsSnapshot = await getCountFromServer(q);
        pendingReports = reportsSnapshot.data().count;
    } catch (e) {
        console.warn("Could not fetch reports count", e);
    }

    // 4. Total Revenue
    let totalRevenue = 0;
    try {
        const paymentsColl = collection(db, 'payments');
        const q = query(paymentsColl, where('status', '==', 'success'));
        const snapshot = await getAggregateFromServer(q, {
            totalRevenue: sum('amount')
        });
        totalRevenue = snapshot.data().totalRevenue || 0;
    } catch (e) {
        console.warn("Could not fetch revenue", e);
    }

    return {
      totalUsers,
      activeMatches: totalMatches,
      totalRevenue, 
      pendingReports,
      userGrowth: 0, // Requires historical data
      matchesGrowth: 0,
      revenueGrowth: 0,
      reportsChange: 0
    };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return {
      totalUsers: 0,
      activeMatches: 0,
      totalRevenue: 0,
      pendingReports: 0,
      userGrowth: 0,
      matchesGrowth: 0,
      revenueGrowth: 0,
      reportsChange: 0
    };
  }
}

/**
 * Get all users for the Users View
 */
export async function getAdminUsers(): Promise<Array<User & { firestoreDocId: string }>> {
  try {
    const usersColl = collection(db, 'users');
    const q = query(usersColl, orderBy('createdAt', 'desc')); // Most recent first
    const snapshot = await getDocs(q);
    return snapshot.docs.map((userDoc) => ({
      ...userDoc.data(),
      firestoreDocId: userDoc.id,
    } as User & { firestoreDocId: string }));
  } catch (error) {
    console.error("Error fetching admin users:", error);
    return [];
  }
}

/**
 * Get all connections (chats) for Connections View
 */
export async function getAdminConnections(): Promise<any[]> {
    try {
        const chatsColl = collection(db, 'chats');
        // Order by lastMessageTime to show most active connections first
        const q = query(chatsColl, orderBy('lastMessageTime', 'desc')); 
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => {
            const data = doc.data();
            const participants = data.participants || [];
            
            // Extract participant names safely
            let userA = 'Unknown';
            let userB = 'Unknown';
            
            if (participants && participants.length >= 2) {
                const idA = participants[0];
                const idB = participants[1];
                
                if (data.participantDetails) {
                    userA = data.participantDetails[idA]?.name || 'Unknown';
                    userB = data.participantDetails[idB]?.name || 'Unknown';
                }
            }

            return {
                id: doc.id,
                userA,
                userB,
                status: 'Matched', // Implicitly matched if chatting
                date: data.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently',
                compatibility: 'N/A', // Not stored in chat
                lastMessage: data.lastMessage || 'No messages yet'
            };
        });
    } catch (error) {
        console.error("Error fetching admin connections:", error);
        return [];
    }
}

/**
 * Get all prayer requests for the Prayers View
 */
export async function getAdminPrayers(): Promise<any[]> {
  try {
    const prayersColl = collection(db, 'prayer_requests');
    const q = query(prayersColl, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Ensure date is formatted for display if needed, or keep as Timestamp to format in UI
        date: data.createdAt?.toDate?.()?.toLocaleString() || 'N/A'
      };
    });
  } catch (error) {
    console.error("Error fetching admin prayers:", error);
    return [];
  }
}

/**
 * Get all reports for Moderation View
 */
export async function getAdminReports(): Promise<any[]> {
    try {
        const reportsColl = collection(db, 'reports');
        const q = query(reportsColl, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching admin reports", error);
        return [];
    }
}


/**
 * Get all payments for Payments View
 */
export async function getAdminPayments(): Promise<any[]> {
    try {
        const paymentsColl = collection(db, 'payments');
        const q = query(collection(db, 'payments'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching admin payments", error);
        return [];
    }
}

/**
 * Delete a user and their profile
 */
export async function deleteUser(userId: string): Promise<boolean> {
  try {
    // Delete/verify the Auth account first so a failed authorization cannot
    // leave the profile data partially removed.
    const deleteAccount = httpsCallable(functions, 'deleteUserAccount');
    await deleteAccount({ userId });

    // Then remove profile-owned data.
    await deleteUserFiles(userId);
    await deleteUserPrayers(userId);
    await deleteDoc(doc(db, 'users', userId));

    return true;
  } catch (error) {
    console.error("Error deleting user:", error);
    return false;
  }
}

/**
 * Block or Unblock a user
 */
export async function toggleBlockUser(userId: string, isBlocked: boolean): Promise<boolean> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      isBlocked: isBlocked
    });
    return true;
  } catch (error) {
    console.error("Error toggling block status:", error);
    return false;
  }
}

/**
 * Analytics Data Interface
 */
export interface AnalyticsData {
    cards: { title: string, value: string, change: string, trend: 'up' | 'down' }[];
    growth: { label: string, value: number }[];
    demographics: {
        gender: { label: string, value: number, color: string }[];
        age: { label: string, value: number }[];
    };
    locations: { city: string, users: number }[];
}

/**
 * Get aggregated analytics data for the Analytics View
 */
export async function getAnalyticsData(
  timeRange: '7d' | '30d' | '90d' | 'custom',
  customStartDate?: string,
  customEndDate?: string,
): Promise<AnalyticsData> {
    let now = new Date();
    let startDate = new Date();
    let prevStartDate = new Date(); // To calculate "vs previous period" change
    
    // 1. Determine Date Range
    if (timeRange === 'custom' && customStartDate && customEndDate) {
        startDate = new Date(`${customStartDate}T00:00:00`);
        now = new Date(`${customEndDate}T23:59:59`);
        const rangeLength = Math.max(now.getTime() - startDate.getTime(), 24 * 60 * 60 * 1000);
        prevStartDate = new Date(startDate.getTime() - rangeLength);
    } else if (timeRange === '7d') {
        startDate.setDate(now.getDate() - 7);
        prevStartDate.setDate(now.getDate() - 14);
    } else if (timeRange === '30d') {
        startDate.setDate(now.getDate() - 30);
        prevStartDate.setDate(now.getDate() - 60);
    } else {
        startDate.setDate(now.getDate() - 90);
        prevStartDate.setDate(now.getDate() - 180);
    }

    try {
        // 2. Fetch All Relevant Data (Optimized: In a real app, use Aggregation Queries or Cloud Functions)
        // For this scale, client-side aggregation is acceptable.
        
        // Users
        const usersColl = collection(db, 'users');
        const usersSnapshot = await getDocs(usersColl);
        const users = usersSnapshot.docs.map(doc => ({ ...doc.data(), createdAt: doc.data().createdAt?.toDate() || new Date(0) })) as any[];
        
        // Chats
        const chatsColl = collection(db, 'chats');
        const chatsSnapshot = await getDocs(chatsColl);
        const totalMatches = chatsSnapshot.size;

        // Payments
        const paymentsColl = collection(db, 'payments');
        const paymentsSnapshot = await getDocs(paymentsColl);
        const payments = paymentsSnapshot.docs.map(doc => doc.data());

        // 3. Compute Metrics
        
        // -- New Signups --
        const newSignups = users.filter(u => u.createdAt >= startDate).length;
        const prevSignups = users.filter(u => u.createdAt >= prevStartDate && u.createdAt < startDate).length;
        const signupChange = prevSignups === 0 ? 100 : Math.round(((newSignups - prevSignups) / prevSignups) * 100);

        // -- Active Users (Approximation: Users created or updated recently) --
        // In a real app, track 'lastActiveAt'. using 'totalUsers' as a baseline for now.
        const activeUsersCount = users.length; 
        // For change, we can assume linear growth or just 0 for now if we don't have historical snapshots
        
        // -- Match Rate --
        const matchRate = users.length > 0 ? (totalMatches / users.length) * 100 : 0;
        
        // -- Premium Conversion --
        const premiumUsers = users.filter(u => u.isVerified || u.isPremium).length; // using Verified as proxy or isPremium if set
        const premiumConv = users.length > 0 ? (premiumUsers / users.length) * 100 : 0;

        // 4. Compute Growth Graph (Group by Day/Week)
        const growthLabels: string[] = [];
        const growthValues: number[] = [];
        
        const isWeekly = timeRange === '90d'; // Group by month? or week?
        const dateFormat = new Intl.DateTimeFormat('en-US', { weekday: 'short' });
        
        // Simple daily buckets for graph
        // Create buckets for the range
        const bucketCount = timeRange === '7d' ? 7 : (timeRange === '30d' ? 6 : 6); // 7 days or 6 weeks/chunks
        const interval = (now.getTime() - startDate.getTime()) / bucketCount;

        for (let i = 0; i < bucketCount; i++) {
             const bucketStart = new Date(startDate.getTime() + (i * interval));
             const bucketEnd = new Date(bucketStart.getTime() + interval);
             
             const count = users.filter(u => u.createdAt >= bucketStart && u.createdAt < bucketEnd).length;
             
             let label = "";
             if (timeRange === '7d') label = dateFormat.format(bucketEnd);
             else if (timeRange === '30d') label = `W${i+1}`;
             else label = bucketEnd.toLocaleString('default', { month: 'short' });

             growthLabels.push(label);
             growthValues.push(count);
        }


        // 5. Compute Demographics
        const maleCount = users.filter(u => u.gender === 'Male').length;
        const femaleCount = users.filter(u => u.gender === 'Female').length;
        const totalGender = maleCount + femaleCount || 1;
        
        // Age Distribution
        const ageRanges = [
            { label: '18-24', min: 18, max: 24, count: 0 },
            { label: '25-34', min: 25, max: 34, count: 0 },
            { label: '35-44', min: 35, max: 44, count: 0 },
            { label: '45+', min: 45, max: 100, count: 0 },
        ];
        
        users.forEach(u => {
            const age = u.age || 0;
            const range = ageRanges.find(r => age >= r.min && age <= r.max);
            if (range) range.count++;
        });

        // 6. Compute Locations (Top 3)
        const locationCounts: Record<string, number> = {};
        users.forEach(u => {
            const loc = u.location?.split(',')[0] || u.country || 'Unknown';
            locationCounts[loc] = (locationCounts[loc] || 0) + 1;
        });
        
        const sortedLocations = Object.entries(locationCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([city, count]) => ({ city, users: count }));


        return {
            cards: [
                { title: "New Signups", value: newSignups.toString(), change: `${signupChange > 0 ? '+' : ''}${signupChange}%`, trend: signupChange >= 0 ? 'up' : 'down' },
                { title: "Active Users", value: activeUsersCount.toLocaleString(), change: "+0%", trend: "up" },
                { title: "Match Rate", value: `${Math.round(matchRate)}%`, change: "+--", trend: "up" },
                { title: "Premium Conv.", value: `${premiumConv.toFixed(1)}%`, change: "+--", trend: "up" },
            ],
            growth: growthLabels.map((l, i) => ({ label: l, value: growthValues[i] })),
            demographics: {
                gender: [
                    { label: 'Male', value: Math.round((maleCount / totalGender) * 100), color: 'bg-blue-500' },
                    { label: 'Female', value: Math.round((femaleCount / totalGender) * 100), color: 'bg-pink-500' },
                ],
                age: ageRanges.map(r => ({ label: r.label, value: Math.round((r.count / (users.length || 1)) * 100) }))
            },
            locations: sortedLocations
        };

    } catch (error) {
        console.error("Error calculating analytics:", error);
        // Return zeros on error
         return {
            cards: [
                { title: "New Signups", value: "0", change: "0%", trend: "up" },
                { title: "Active Users", value: "0", change: "0%", trend: "up" },
                { title: "Match Rate", value: "0%", change: "0%", trend: "up" },
                { title: "Premium Conv.", value: "0%", change: "0%", trend: "up" },
            ],
            growth: [],
            demographics: {
                gender: [],
                age: []
            },
            locations: []
        };
    }
}

/**
 * Create a new user account (Admin functionality)
 * Uses a secondary Firebase app to avoid logging out the admin.
 */
export async function adminCreateUser(userData: any): Promise<{success: boolean, message: string, userId?: string}> {
  try {
    // Retrieve or initialize secondary app
    const apps = getApps();
    let secondaryApp = apps.find(a => a.name === 'SecondaryApp');
    if (!secondaryApp) {
      secondaryApp = initializeApp(app.options, 'SecondaryApp');
    }
    
    const secondaryAuth = getAuth(secondaryApp);

    // 1. Create auth user
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, userData.email, userData.password);
    const newUserId = userCredential.user.uid;

    // 2. Send verification email
    await sendEmailVerification(userCredential.user);

    // 3. Create Firestore document
    const userRef = doc(db, 'users', newUserId);
    await setDoc(userRef, {
      id: newUserId,
      name: userData.name,
      email: userData.email,
      phone: userData.phone || '',
      role: userData.role || 'User',
      status: userData.status || 'Active', // Active/Blocked
      isVerified: false,
      verificationStatus: 'unverified',
      
      // Defaults to prevent undefined issues
      age: 0,
      gender: '',
      location: 'N/A',
      country: 'Ghana',
      bio: 'New user.',
      photos: [],
      denomination: 'N/A',
      profileCompletion: 0,
      
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // 4. Sign out the secondary instance to clean up
    await signOut(secondaryAuth);

    return { success: true, message: 'User created successfully', userId: newUserId };
  } catch (error: any) {
    console.error("Error creating user as admin:", error);
    return { success: false, message: error.message || "Failed to create user" };
  }
}
