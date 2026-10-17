
/**
 * CORE TYPE DEFINITIONS
 * Defines the domain models, view states, and component prop interfaces.
 */

// ViewState governs the main navigation routing within the single-page application
export type ViewState = 'AUTH' | 'ONBOARDING' | 'CHANGE_PASSWORD' | 'BROWSE' | 'COMMUNITY' | 'CHAT' | 'PROFILE' | 'SETTINGS' | 'SUPPORT' | 'LIKES' | 'EDIT_PROFILE' | 'VERIFICATION' | 'CHURCH_DETAILS' | 'MATCHES' | 'FRIENDS' | 'CALL';

// FaithMoment represents a temporary photo or video update (Story feature)
export interface FaithMoment {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  mediaUrl: string;
  isSeen: boolean;
}



// Primary User profile containing identity, faith, and lifestyle data
// We keep the camelCase interface for the frontend application logic
export interface User {
  id: string;
  email: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | string;
  height: number | string;
  country: 'Ghana' | 'International' | string;
  location: string;
  bio: string;
  photos: string[]; // [0] is profile, [1] is cover, rest are gallery
  
  // Faith-specific metrics for compatibility
  denomination: string;
  churchName: string;
  churchAttendance: string; 
  churchInvolvement: string;
  bibleReadingFreq: string;
  prayerFreq: string;
  faithMaturity: string;
  favoriteVerse: string;
  spiritualLesson: string;
  faithStatement?: string; 
  
  // Professional and Intentionality data
  education: string; 
  profession: string; 
  acceptsLongDistance: boolean;
  intentions: 'Courtship' | 'Marriage Soon' | 'Friendship' | string;
  
  // Simplified for UI, but could map to DB columns 
  lifestyle?: {
    drinking: boolean;
    smoking: boolean;
  } | any;
  
  // Direct DB mappings that were missing
  drinking?: boolean;
  smoking?: boolean;
  lookingFor?: string;
  intendToMarry?: string;
  willingToRelocate?: string;
  preferredAgeMin?: number;
  preferredAgeMax?: number;
  preferredLocation?: string;
  preferredDenomination?: string;
  preferredEthnicGroup?: string;
  dealBreakers?: string;
  healthCondition?: string;
  lifestyleInfo?: string;
  hasChildren?: string;
  wantChildren?: string;
  bodyType?: string;
  complexion?: string;
  languages?: string;
  occupation?: string;
  incomeRange?: string;
  dob?: string;
  maritalStatus?: string;
  alcohol?: string;


  // Security and Trust indicators
  isVerified: boolean; // pastoral/ID verification
  verificationStatus?: 'unverified' | 'pending' | 'verified' | string;
  isContactVerified: boolean; 
  isPremium: boolean; // Governs messaging access
  termsAccepted: boolean;
  termsAcceptedAt: string;

  // Subscription properties
  subscriptionStartDate?: string | null;
  subscriptionEndDate?: string | null;
  subscriptionType?: '6months' | '12months' | null;
  subscriptionStatus?: 'active' | 'expired' | null;
  
  // Blocked users - stores IDs of users blocked by this user
  blockedUsers?: string[];

  // Administrative onboarding/security
  mustChangePassword?: boolean;
  hasPin?: boolean;
  isSystemAdmin?: boolean;

  // System Metadata
  phone?: string;
  smsNotificationsEnabled?: boolean;
  notificationPreferences?: NotificationPreferences;
  createdAt?: any;
  updatedAt?: any;
  profileDraft?: Record<string, any> | null;
  isBlocked?: boolean; // Admin blocked status
  isOnline?: boolean;
}


export interface NotificationPreferences {
  inApp: boolean;
  push: boolean;
  email: boolean;
  sms: boolean;
  newChatMessages: boolean;
  connectionRequests: boolean;
  verificationReminders: boolean;
  securityEmails: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  inApp: true,
  push: true,
  email: true,
  sms: false,
  newChatMessages: true,
  connectionRequests: true,
  verificationReminders: true,
  securityEmails: true,
};
// Friendship handles the social graph between users
export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  friend_profile?: Partial<User>;
}

// MatchProfile extends User with computed compatibility scores
export interface MatchProfile extends User {
  compatibilityScore: {
    faith: number;
    values: number;
    lifestyle: number;
    goals: number;
    total: number;
  };
  distance: string;
}

// ChatThread represents a conversation summary in the Inbox
export interface ChatThread {
  id: string;
  partnerId: string;
  partnerName?: string;
  partnerPhoto?: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  isLocked: boolean; // Premium gating logic
}

// Individual Message entity within a thread
export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  type: 'text' | 'image' | 'voice' | 'file' | 'location' | 'live_location';
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
    isLive?: boolean;
  };
  reactions?: { emoji: string; count: number }[];
  myReaction?: string;
  status?: 'sent' | 'delivered' | 'read';
  replyTo?: {
    id: string;
    text: string;
    senderName?: string;
  };
}

// Social interactions for the Prayer Wall
export interface CommentReaction {
  emoji: string;
  count: number;
  hasReacted: boolean;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
  reactions: CommentReaction[];
}

// PrayerRequest is the core entity for the Community Wall
export interface PrayerRequest {
  id: string;
  userId: string;
  userName: string;
  content: string;
  prayingCount: number;
  isPublic: boolean;
  createdAt: string;
  comments: Comment[];
  hasPrayed?: boolean;
  commentCount?: number;
}

// Spiritual content delivered via Gemini API
export interface Devotional {
  date: string;
  title: string;
  verse: string;
  content: string;
}

export interface Transaction {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  currency: string;
  type: 'subscription' | 'connection_fee' | 'boost' | string;
  status: 'success' | 'failed' | 'pending';
  provider: 'paystack' | 'stripe' | 'manual';
  reference: string;
  createdAt: any;
}
