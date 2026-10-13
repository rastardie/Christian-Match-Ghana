
import { MatchProfile, ChatThread, PrayerRequest, FaithMoment } from './types';

export const TERMS_TEXT = `
By creating an account on CMG (Christian Match Ghana), you agree to our Terms of Service and Privacy Policy.
We are a community rooted in Christian values. We expect all users to interact with respect, purity, and honesty.
Harassment, inappropriate content, or unchristian behavior will result in immediate account termination.
`;

export const MOCK_PROFILES: MatchProfile[] = [
  {
    id: '2',
    email: 'sarah@example.com',
    name: 'Sarah A.',
    age: 24,
    gender: 'Female',
    height: 165,
    country: 'Ghana',
    location: 'Accra, Greater Accra',
    bio: 'Lover of Christ, worship leader, and coffee enthusiast. Looking for a God-fearing man to build a kingdom marriage with.',
    photos: [
      'https://picsum.photos/400/600?random=1',
      'https://picsum.photos/400/600?random=2',
      'https://picsum.photos/400/600?random=3',
    ],
    denomination: 'Pentecostal',
    churchName: 'ICGC Christ Temple',
    churchAttendance: 'Weekly',
    churchInvolvement: 'Worship Leader',
    bibleReadingFreq: 'Daily',
    prayerFreq: 'Daily',
    faithMaturity: 'Mature',
    favoriteVerse: 'Jeremiah 29:11',
    spiritualLesson: 'Learning to trust God in the waiting seasons.',
    faithStatement: 'I believe in the power of prayer and the Holy Spirit.',
    education: 'Bachelors in Communications',
    profession: 'Digital Marketer',
    acceptsLongDistance: true,
    intentions: 'Marriage Soon',
    lifestyle: { drinking: false, smoking: false },
    isVerified: true,
    isContactVerified: true,
    isPremium: false,
    termsAccepted: true,
    termsAcceptedAt: new Date().toISOString(),
    compatibilityScore: { faith: 95, values: 90, lifestyle: 100, goals: 88, total: 93 },
    distance: '5 km away'
  },
  {
    id: '3',
    email: 'david@example.com',
    name: 'David K.',
    age: 28,
    gender: 'Male',
    height: 180,
    country: 'Ghana',
    location: 'Kumasi, Ashanti',
    bio: 'Youth pastor and entrepreneur. Passionate about youth ministry and tech. Seeking a partner who loves God above all else.',
    photos: [
      'https://picsum.photos/400/600?random=4',
      'https://picsum.photos/400/600?random=5',
    ],
    denomination: 'Methodist',
    churchName: 'Wesley Cathedral',
    churchAttendance: 'Multiple times a week',
    churchInvolvement: 'Youth President',
    bibleReadingFreq: 'Daily',
    prayerFreq: 'Multiple times a day',
    faithMaturity: 'Mature',
    favoriteVerse: 'Philippians 4:13',
    spiritualLesson: 'The importance of humility in leadership.',
    faithStatement: 'Saved by grace through faith.',
    education: 'Masters in Theology',
    profession: 'Software Engineer',
    acceptsLongDistance: false,
    intentions: 'Courtship',
    lifestyle: { drinking: false, smoking: false },
    isVerified: true,
    isContactVerified: true,
    isPremium: false,
    termsAccepted: true,
    termsAcceptedAt: new Date().toISOString(),
    compatibilityScore: { faith: 88, values: 85, lifestyle: 95, goals: 90, total: 89 },
    distance: '200 km away'
  },
   {
    id: '4',
    email: 'grace@example.com',
    name: 'Grace O.',
    age: 26,
    gender: 'Female',
    height: 170,
    country: 'International',
    location: 'London, UK',
    bio: 'Relocated for masters, missing the warmth of home. Presbyterian background. I love cooking and gospel music.',
    photos: [
      'https://picsum.photos/400/600?random=6',
      'https://picsum.photos/400/600?random=7',
    ],
    denomination: 'Presbyterian',
    churchName: 'Hillsong London',
    churchAttendance: 'Weekly',
    churchInvolvement: 'Usher',
    bibleReadingFreq: 'Weekly',
    prayerFreq: 'Daily',
    faithMaturity: 'Growing',
    favoriteVerse: 'Psalm 23',
    spiritualLesson: 'God is my shepherd, I shall not want.',
    faithStatement: 'Walking with Jesus every day.',
    education: 'MSc Data Science',
    profession: 'Data Analyst',
    acceptsLongDistance: true,
    intentions: 'Friendship',
    lifestyle: { drinking: false, smoking: false },
    isVerified: false,
    isContactVerified: true,
    isPremium: false,
    termsAccepted: true,
    termsAcceptedAt: new Date().toISOString(),
    compatibilityScore: { faith: 80, values: 82, lifestyle: 90, goals: 75, total: 82 },
    distance: '5000 km away'
  }
];

export const MOCK_LIKED_BY: MatchProfile[] = [
  {
    id: '10',
    email: 'esther@example.com',
    name: 'Esther M.',
    age: 23,
    gender: 'Female',
    height: 162,
    country: 'Ghana',
    location: 'Tema',
    bio: 'Sunday school teacher.',
    photos: ['https://picsum.photos/400/600?random=10'],
    denomination: 'Baptist',
    churchName: 'Grace Baptist',
    churchAttendance: 'Weekly',
    churchInvolvement: 'Teacher',
    bibleReadingFreq: 'Daily',
    prayerFreq: 'Daily',
    faithMaturity: 'Growing',
    favoriteVerse: 'Proverbs 31',
    spiritualLesson: 'Virtue',
    faithStatement: 'Faith is the substance of things hoped for.',
    education: 'BEd Education',
    profession: 'Teacher',
    acceptsLongDistance: false,
    intentions: 'Courtship',
    lifestyle: { drinking: false, smoking: false },
    isVerified: true,
    isContactVerified: true,
    isPremium: false,
    termsAccepted: true,
    termsAcceptedAt: new Date().toISOString(),
    compatibilityScore: { faith: 90, values: 85, lifestyle: 100, goals: 90, total: 91 },
    distance: '15 km away'
  },
  {
    id: '11',
    email: 'ruth@example.com',
    name: 'Ruth B.',
    age: 25,
    gender: 'Female',
    height: 168,
    country: 'Ghana',
    location: 'Accra',
    bio: 'Love singing.',
    photos: ['https://picsum.photos/400/600?random=11'],
    denomination: 'Charismatic',
    churchName: 'Action Chapel',
    churchAttendance: 'Weekly',
    churchInvolvement: 'Choir',
    bibleReadingFreq: 'Daily',
    prayerFreq: 'Daily',
    faithMaturity: 'Mature',
    favoriteVerse: 'Psalm 150',
    spiritualLesson: 'Praise',
    education: 'BA Arts',
    profession: 'Musician',
    acceptsLongDistance: true,
    intentions: 'Marriage Soon',
    lifestyle: { drinking: false, smoking: false },
    isVerified: false,
    isContactVerified: true,
    isPremium: false,
    termsAccepted: true,
    termsAcceptedAt: new Date().toISOString(),
    compatibilityScore: { faith: 85, values: 88, lifestyle: 90, goals: 85, total: 87 },
    distance: '10 km away'
  },
  {
    id: '12',
    email: 'hannah@example.com',
    name: 'Hannah D.',
    age: 27,
    gender: 'Female',
    height: 170,
    country: 'International',
    location: 'New York',
    bio: 'Nurse.',
    photos: ['https://picsum.photos/400/600?random=12'],
    denomination: 'Non-denominational',
    churchName: 'Redeemer',
    churchAttendance: 'Irregular',
    churchInvolvement: 'Volunteer',
    bibleReadingFreq: 'Weekly',
    prayerFreq: 'Daily',
    faithMaturity: 'Growing',
    favoriteVerse: 'John 3:16',
    spiritualLesson: 'Love',
    education: 'BSc Nursing',
    profession: 'Nurse',
    acceptsLongDistance: true,
    intentions: 'Friendship',
    lifestyle: { drinking: false, smoking: false },
    isVerified: true,
    isContactVerified: true,
    isPremium: false,
    termsAccepted: true,
    termsAcceptedAt: new Date().toISOString(),
    compatibilityScore: { faith: 80, values: 80, lifestyle: 85, goals: 80, total: 81 },
    distance: '8000 km away'
  }
];

export const MOCK_CHATS: ChatThread[] = [
  {
    id: 'chat_1',
    partnerId: '2',
    lastMessage: 'Amen! God bless you too.',
    timestamp: '10:30 AM',
    unreadCount: 1,
    isLocked: true 
  },
  {
    id: 'chat_2',
    partnerId: '3',
    lastMessage: 'Are you going to the conference?',
    timestamp: 'Yesterday',
    unreadCount: 0,
    isLocked: true
  }
];

export const MOCK_PRAYERS: PrayerRequest[] = [
  {
    id: 'p1',
    userId: '99',
    userName: 'Kwame',
    content: 'Please pray for my job interview on Tuesday. I really need this breakthrough.',
    prayingCount: 12,
    isPublic: true,
    createdAt: '2h ago',
    comments: [
      {
        id: 'c1',
        userId: '2',
        userName: 'Sarah',
        text: 'Amen! Standing in faith with you. God favors the upright.',
        createdAt: '1h ago',
        reactions: [{ emoji: '🙏', count: 3, hasReacted: false }, { emoji: '❤️', count: 1, hasReacted: true }]
      }
    ]
  },
  {
    id: 'p2',
    userId: '100',
    userName: 'Abena',
    content: 'Praying for healing for my mother. She has been unwell for 2 weeks.',
    prayingCount: 45,
    isPublic: true,
    createdAt: '5h ago',
    comments: []
  }
];

/**
 * Mock data for the Faith Moments bar.
 */
export const MOCK_MOMENTS: FaithMoment[] = [
  {
    id: 'm1',
    userId: '2',
    userName: 'Sarah',
    userPhoto: 'https://picsum.photos/200?random=1',
    mediaUrl: 'https://picsum.photos/400/600?random=101',
    isSeen: false
  },
  {
    id: 'm2',
    userId: '3',
    userName: 'David',
    userPhoto: 'https://picsum.photos/200?random=4',
    mediaUrl: 'https://picsum.photos/400/600?random=102',
    isSeen: true
  },
  {
    id: 'm3',
    userId: '10',
    userName: 'Esther',
    userPhoto: 'https://picsum.photos/200?random=10',
    mediaUrl: 'https://picsum.photos/400/600?random=103',
    isSeen: false
  }
];
