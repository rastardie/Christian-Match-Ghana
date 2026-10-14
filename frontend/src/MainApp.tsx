import React, { useState, useEffect, useRef } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import {
  GoogleGenAI,
  Chat,
  GenerateContentResponse,
  Modality,
  LiveServerMessage,
} from "@google/genai";
import {
  ViewState,
  User,
  Devotional,
  PrayerRequest,
  MatchProfile,
  Message,
  ChatThread,
  Friendship,
  FaithMoment,
  Comment,
} from "./types";
import Layout from "./components/Layout";
import PaymentModal from "./components/PaymentModal";
import ImageCropper from "./components/ImageCropper";
import Logo from "./components/Logo";
import { blockUser, unblockUser, isUserBlocked } from "./services/blockService";
import {
  MOCK_PROFILES,
  MOCK_CHATS,
  MOCK_PRAYERS,
  MOCK_MOMENTS,
} from "./constants";
import {
  MapPin,
  Check,
  X,
  Heart,
  Send,
  PlusCircle,
  FileText,
  Clock,
  Camera,
  Church,
  ArrowLeft,
  Edit2,
  Bot,
  Bell,
  Share2,
  ThumbsUp,
  Phone,
  Video,
  MessageCircle,
  CheckCheck,
  Search,
  CheckCircle,
  Smile,
  BookOpen,
  RotateCcw,
  Eye,
  EyeOff,
  GraduationCap,
  Briefcase,
  Settings,
  LogOut,
  AlertCircle,
  Upload,
  Sparkles,
  TrendingUp,
  Image as ImageIcon,
  ChevronRight,
  User as UserIcon,
  Mic,
  MicOff,
  VideoOff,
  PhoneOff,
  Award,
  MessageSquare,
  Quote,
  Key,
  Lock,
  Mail,
  Trash2,
  Moon,
  Flag,
  Users,
} from "lucide-react";

const authActionUrl = import.meta.env.VITE_PUBLIC_APP_URL || 'https://christianmatchghana.com';
const isLocalFirebaseEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';
const freshLocalTestStart = import.meta.env.VITE_LOCAL_TEST_FRESH_START === 'true';

export const TERMS_TEXT =
  "By using CMG, you agree to honor God in your interactions. We have zero tolerance for harassment, vulgarity, or scammers. Violators will be banned without earning.";

export const DENOMINATIONS = [
  "Pentecostal",
  "Charismatic",
  "Methodist",
  "Presbyterian",
  "Catholic",
  "Baptist",
  "Anglican",
  "Adventist",
  "Evangelical",
  "Non-Denominational",
  "Other",
];
export const MARITAL_STATUSES = ["Single", "Divorced", "Widowed", "Separated"];
export const BODY_TYPES = [
  "Slim",
  "Athletic",
  "Average",
  "Curvy",
  "Plus Size",
  "Muscular",
];
export const EDUCATION_LEVELS = [
  "High School",
  "Diploma",
  "HND",
  "Bachelor's Degree",
  "Master's Degree",
  "Doctorate",
  "Vocational",
  "Other",
];

export const COUNTRIES = [
  "Ghana", "Nigeria", "United Kingdom", "United States", "Canada", "Germany", "South Africa", "Kenya", 
  "Togo", "Ivory Coast", "Benin", "Liberia", "Sierra Leone", "Gambia",
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
  "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
  "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo (Congo-Brazzaville)", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czechia (Czech Republic)",
  "Democratic Republic of the Congo", "Denmark", "Djibouti", "Dominica", "Dominican Republic",
  "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini (fmr. 'Swaziland')", "Ethiopia",
  "Fiji", "Finland", "France",
  "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana",
  "Haiti", "Holy See", "Honduras", "Hungary",
  "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Ivory Coast",
  "Jamaica", "Japan", "Jordan",
  "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan",
  "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
  "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar (formerly Burma)",
  "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway",
  "Oman",
  "Pakistan", "Palau", "Palestine State", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
  "Qatar",
  "Romania", "Russia", "Rwanda",
  "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
  "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
  "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States of America", "Uruguay", "Uzbekistan",
  "Vanuatu", "Venezuela", "Vietnam",
  "Yemen",
  "Zambia", "Zimbabwe"
];
export const INTENTIONS = ["Courtship", "Marriage Soon", "Friendship"];
// --- UTILS ---

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

interface ProfileRule {
  field: keyof User;
  weight: number;
  label: string;
  check?: (value: any) => boolean;
}

const calculateProfileStrength = (user: User | null) => {
  if (!user) return { percentage: 0, suggestions: [] };

  const rules: ProfileRule[] = [
    { field: "name", weight: 10, label: "Name" },
    { field: "age", weight: 10, label: "Age" },
    { field: "location", weight: 10, label: "Location" },
    { field: "bio", weight: 15, label: "Bio" },
    {
      field: "photos",
      weight: 15,
      label: "Photos",
      check: (v: string[]) => v && v.length >= 2,
    },
    { field: "denomination", weight: 10, label: "Denomination" },
    { field: "churchName", weight: 10, label: "Church Name" },
    { field: "faithStatement", weight: 10, label: "Faith Statement" },
    { field: "profession", weight: 10, label: "Profession" },
    { field: "intentions", weight: 10, label: "Intentions" },
  ];

  let score = 0;
  const missing: string[] = [];

  rules.forEach((rule) => {
    const value = user[rule.field];
    const isComplete = rule.check ? rule.check(value) : value && value !== "";

    if (isComplete) {
      score += rule.weight;
    } else {
      missing.push(rule.label);
    }
  });

  return { percentage: Math.min(score, 100), suggestions: missing };
};

export const isProfileFullyComplete = (user: User | null) => {
  if (!user) return false;
  
  const requiredFields = [
    'name', 'phone', 'dob', 'country', 'location', 'gender', 'maritalStatus', 
    'hasChildren', 'wantChildren', 'height', 'bodyType', 'complexion', 
    'languages', 'smoking', 'alcohol', 'education', 'occupation', 
    'incomeRange', 'intentions', 'intendToMarry', 'willingToRelocate',
    'preferredAgeMin', 'preferredAgeMax', 'preferredLocation', 'preferredDenomination',
    'preferredEthnicGroup', 'dealBreakers', 'healthCondition', 'lifestyleInfo',
    'denomination', 'churchAttendance', 'churchName', 'bio'
  ];

  const hasProfilePhoto = user.photos && user.photos[0] && user.photos[0].trim() !== '';
  const hasCoverPhoto = user.photos && user.photos[1] && user.photos[1].trim() !== '';

  const dataFilled = requiredFields.every(field => {
    let val = (user as any)[field];
    if (field === 'location' && !val) val = (user as any).city;
    if (field === 'churchName' && !val) val = (user as any).church;
    if (field === 'occupation' && !val) val = (user as any).profession;
    return val !== null && val !== undefined && String(val).trim() !== '';
  });

  const hasAge = typeof user.age === 'number' && user.age > 0;

  return dataFilled && hasProfilePhoto && hasCoverPhoto && hasAge;
};

const mapProfileToUser = (profile: any): Partial<User> => {
  if (!profile) return {};
  return {
    ...profile,
    // Map snake_case DB columns to camelCase User Props
    churchName: profile.church_name || profile.churchName,
    churchAttendance: profile.church_attendance || profile.churchAttendance,
    churchInvolvement: profile.church_involvement || profile.churchInvolvement,
    bibleReadingFreq: profile.bible_reading_freq || profile.bibleReadingFreq,
    prayerFreq: profile.prayer_freq || profile.prayerFreq,
    faithMaturity: profile.faith_maturity || profile.faithMaturity,
    favoriteVerse: profile.favorite_verse || profile.favoriteVerse,
    spiritualLesson: profile.spiritual_lesson || profile.spiritualLesson,
    faithStatement: profile.faith_statement || profile.faithStatement,
    acceptsLongDistance:
      profile.accepts_long_distance ?? profile.acceptsLongDistance,
    isVerified: profile.is_verified ?? profile.isVerified,
    verificationStatus:
      profile.verification_status || profile.verificationStatus,
    isContactVerified: profile.is_contact_verified ?? profile.isContactVerified,
    isPremium: profile.is_premium ?? profile.isPremium,
    termsAccepted: profile.terms_accepted ?? profile.termsAccepted,
    termsAcceptedAt: profile.terms_accepted_at || profile.termsAcceptedAt,
    // Ensure photos is array
    photos: profile.photos || [],

    // Map missing fields
    phone: profile.phone,
    dob: profile.dob,
    maritalStatus: profile.marital_status || profile.maritalStatus,
    hasChildren: profile.has_children || profile.hasChildren,
    wantChildren: profile.want_children || profile.wantChildren,
    height: profile.height,
    bodyType: profile.body_type || profile.bodyType,
    complexion: profile.complexion,
    languages: profile.languages,
    smoking: profile.smoking,
    alcohol: profile.alcohol,
    drinking: profile.drinking,
    incomeRange: profile.income_range || profile.incomeRange,
    lookingFor: profile.looking_for || profile.lookingFor,
    intendToMarry: profile.intend_to_marry || profile.intendToMarry,
    willingToRelocate: profile.willing_to_relocate || profile.willingToRelocate,
    preferredAgeMin: profile.preferred_age_min || profile.preferredAgeMin,
    preferredAgeMax: profile.preferred_age_max || profile.preferredAgeMax,
    preferredLocation: profile.preferred_location || profile.preferredLocation,
    preferredDenomination:
      profile.preferred_denomination || profile.preferredDenomination,
    preferredEthnicGroup:
      profile.preferred_ethnic_group || profile.preferredEthnicGroup,
    dealBreakers: profile.deal_breakers || profile.dealBreakers,
    healthCondition: profile.health_condition || profile.healthCondition,
    lifestyleInfo: profile.lifestyle_info || profile.lifestyleInfo,
  };
};

// --- SUB-COMPONENTS ---

const IncomingCallOverlay = ({
  call,
  onAnswer,
  onReject,
}: {
  call: any;
  onAnswer: () => void;
  onReject: () => void;
}) => {
  return (
    <div className="fixed inset-0 z-[700] bg-black/80 flex items-center justify-center animate-in fade-in zoom-in duration-300">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full mx-4 flex flex-col items-center gap-6 shadow-2xl relative overflow-hidden">
        {/* Background animation */}
        <div className="absolute inset-0 bg-brand-orange/5 animate-pulse"></div>
        
        <div className="relative z-10">
          <div className="w-24 h-24 rounded-full border-4 border-brand-orange p-1">
            <img
              src={call.callerPhoto || "https://picsum.photos/200"}
              className="w-full h-full object-cover rounded-full"
              alt={call.callerName}
            />
          </div>
          <div className="absolute inset-0 border-4 border-brand-orange rounded-full animate-ping opacity-20"></div>
        </div>

        <div className="text-center z-10">
          <h3 className="text-2xl font-black text-gray-900 mb-1">{call.callerName}</h3>
          <p className="text-brand-orange text-sm font-bold uppercase tracking-widest animate-pulse">
            Incoming {call.isVideo ? "Video" : "Voice"} Call...
          </p>
        </div>

        <div className="flex items-center gap-8 w-full justify-center z-10 mt-4">
          <button
            onClick={onReject}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 transition-all group-active:scale-90 shadow-lg">
              <PhoneOff size={32} fill="currentColor" />
            </div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Decline</span>
          </button>

          <button
            onClick={onAnswer}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white transition-all group-active:scale-90 shadow-lg shadow-green-500/30 animate-bounce">
              <Phone size={32} fill="currentColor" />
            </div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Answer</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const CallView = ({
  isVideo,
  onEnd,
  onMissed,
  partnerName,
  partnerImage,
  callId,
  isCaller,
}: {
  isVideo: boolean;
  onEnd: () => void;
  onMissed: () => void;
  partnerName: string;
  partnerImage: string;
  callId?: string;
  isCaller?: boolean;
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(!isVideo);
  const [status, setStatus] = useState(isCaller ? "Calling..." : "Connecting...");
  const [elapsed, setElapsed] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Audio/media state
  const streamRef = useRef<MediaStream | null>(null);

  // Listen to call status
  useEffect(() => {
    if (!callId) return;

    let unsubscribe: (() => void) | undefined;

    const setupListener = async () => {
      try {
        const { subscribeToCallStatus } = await import('./services/chatService');
        unsubscribe = subscribeToCallStatus(callId, (newStatus: string) => {
          console.log("📞 Call Status:", newStatus);
          
          if (newStatus === 'accepted') {
            setStatus("Connected");
            // Here you would initialize WebRTC connection
          } else if (newStatus === 'rejected') {
            setStatus("Call Declined");
            setTimeout(onEnd, 2000);
          } else if (newStatus === 'ended') {
            setStatus("Call Ended");
            setTimeout(onEnd, 1000);
          }
        });
      } catch (error) {
        console.error("Error subscribing to call status", error);
      }
    };

    setupListener();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [callId, onEnd]);

  // Timer for missed call (Only for caller)
  useEffect(() => {
    if (!isCaller || status === 'Connected') return; // Only caller handles timeout, limit if connected

    const maxDuration = 60; // 60 seconds timeout
    const interval = setInterval(() => {
      setElapsed((prev) => {
        if (prev >= maxDuration) {
          clearInterval(interval);
          if (status !== 'Connected') {
             onMissed();
             onEnd();
          }
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [onMissed, onEnd, isCaller, status]);

  // Setup local media stream
  useEffect(() => {
    const startLocalStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: isVideo,
        });
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Failed to access media devices:", err);
        setStatus("Camera/Mic Error");
      }
    };

    startLocalStream();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isVideo]);

  // Toggle Mute/Video tracks
  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(t => t.enabled = !isMuted);
      streamRef.current.getVideoTracks().forEach(t => t.enabled = !isCameraOff);
    }
  }, [isMuted, isCameraOff]);

  return (
    <div className="fixed inset-0 z-[600] bg-gray-900 flex flex-col items-center justify-center animate-in fade-in duration-500">
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={partnerImage}
          className="w-full h-full object-cover opacity-30 blur-xl scale-110"
          alt="Background"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 p-8 text-center w-full max-w-md mx-auto">
        <div className="relative">
          <div className="w-32 h-32 rounded-full border-4 border-white/10 p-1 relative z-10 overflow-hidden shadow-2xl">
            <img
              src={partnerImage}
              className="w-full h-full object-cover rounded-full"
              alt={partnerName}
            />
          </div>
          <div className="absolute inset-0 bg-white/10 rounded-full animate-ping opacity-20 scale-110"></div>
          <div className="absolute inset-0 bg-brand-orange/20 rounded-full animate-pulse opacity-20 scale-150 duration-1000"></div>
        </div>

        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">
            {partnerName}
          </h2>
          <p className="text-gray-300 text-sm font-bold uppercase tracking-widest animate-pulse">
            {status}
          </p>
        </div>

        {isVideo && (
          <div className="w-40 aspect-[3/4] bg-black/50 rounded-2xl overflow-hidden shadow-2xl border border-white/10 relative backdrop-blur-sm">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transform scale-x-[-1] ${
                isCameraOff ? "hidden" : ""
              }`}
            />
            {isCameraOff && (
              <div className="w-full h-full flex items-center justify-center text-gray-500">
                <VideoOff size={24} />
              </div>
            )}
            <div className="absolute bottom-2 right-2 w-3 h-3 bg-green-500 rounded-full border-2 border-black"></div>
          </div>
        )}
      </div>

      <div className="absolute bottom-16 left-0 right-0 px-8 flex justify-center items-center gap-6 z-20">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className={`p-4 rounded-full backdrop-blur-xl border border-white/10 transition-all active:scale-95 ${
            isMuted ? "bg-white text-gray-900" : "bg-white/10 text-white"
          }`}
        >
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
        </button>

        <button
          onClick={onEnd}
          className="p-6 bg-red-500 text-white rounded-full shadow-2xl shadow-red-500/40 active:scale-90 transition-transform hover:bg-red-600"
        >
          <PhoneOff size={32} fill="currentColor" />
        </button>

        {isVideo && (
          <button
            onClick={() => setIsCameraOff(!isCameraOff)}
            className={`p-4 rounded-full backdrop-blur-xl border border-white/10 transition-all active:scale-95 ${
              isCameraOff ? "bg-white text-gray-900" : "bg-white/10 text-white"
            }`}
          >
            {isCameraOff ? <VideoOff size={24} /> : <Video size={24} />}
          </button>
        )}
      </div>
    </div>
  );
};

const NotificationBanner = ({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 6000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[200] p-4 ${
        type === "success" ? "bg-green-600" : "bg-red-500"
      } text-white shadow-xl flex items-start gap-3 animate-in slide-in-from-top duration-300`}
    >
      <div className="mt-0.5 shrink-0">
        {type === "success" ? (
          <CheckCircle size={20} />
        ) : (
          <AlertCircle size={20} />
        )}
      </div>
      <p className="font-medium text-sm flex-1 leading-snug">{message}</p>
      <button
        onClick={onClose}
        title="Close notification"
        aria-label="Close notification"
        className="p-0.5 hover:bg-white/20 rounded-full shrink-0 transition-colors"
      >
        <X size={20} />
      </button>
    </div>
  );
};

// --- VIEWS ---

const AuthView = ({
  onLogin,
  onNotify,
}: {
  onLogin: (userData: Partial<User>, isNewUser?: boolean) => void;
  onNotify: (msg: string, type: "success" | "error") => void;
}) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [passwordResetSent, setPasswordResetSent] = useState(false);
  
  // Auth State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // Signup Only State
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [phone, setPhone] = useState("");
  const [profilePhoto, setProfilePhoto] = useState<string>("");
  const [coverPhoto, setCoverPhoto] = useState<string>("");
  
  const [loading, setLoading] = useState(false);
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((seconds) => Math.max(seconds - 1, 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const resetVerificationFlow = async () => {
    setLoading(false);
    try {
      const { auth } = await import('./firebase');
      const { signOut } = await import('firebase/auth');
      await signOut(auth);
    } catch (error) {
      console.warn('Auth sign-out during verification reset failed:', error);
    } finally {
      setIsVerificationSent(false);
      setIsLogin(true);
      setPassword('');
      setRepeatPassword('');
      setFirstName('');
      setSurname('');
      setPhone('');
      setProfilePhoto('');
      setCoverPhoto('');
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'cover') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (type === 'profile') {
          setProfilePhoto(result);
        } else {
          setCoverPhoto(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    // Import Firebase auth functions dynamically
    const { auth } = await import('./firebase');
    const { signInWithEmailAndPassword, createUserWithEmailAndPassword } = await import('firebase/auth');

    setLoading(true);

    try {
      if (isLogin) {
        // FIREBASE LOGIN
        console.log('🔐 Attempting login with email:', email);
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          const firebaseUser = userCredential.user;
          
          console.log('✅ Login successful! User:', firebaseUser.uid);
          console.log('📧 Email verified:', firebaseUser.emailVerified);
          
          // Check if email is verified
          if (!firebaseUser.emailVerified) {
            console.log('⚠️ Email not verified, showing verification screen');
            setEmail(firebaseUser.email || email);
            setIsVerificationSent(true);
            setLoading(false);
            return;
          }
          
          // Load user from Firestore or create if doesn't exist
          const { getUserDocument, createUserDocument, userDocumentExists } = await import('./services/userService');
          
          let userData = await getUserDocument(firebaseUser.uid);
          
          // If user doesn't exist in Firestore, create document
          if (!userData) {
            console.log('⚠️ User not in Firestore, creating document...');
            await createUserDocument(firebaseUser.uid, {
              id: firebaseUser.uid,
              email: firebaseUser.email || email,
              name: firebaseUser.displayName || 'User',
              age: 0,
              gender: '',
              height: 0,
              country: 'Ghana',
              location: '',
              bio: '',
              photos: firebaseUser.photoURL ? [firebaseUser.photoURL] : [],
              denomination: '',
              churchName: '',
             churchAttendance: '',
              churchInvolvement: '',
              bibleReadingFreq: '',
              prayerFreq: '',
              faithMaturity: '',
              favoriteVerse: '',
              spiritualLesson: '',
              education: '',
              profession: '',
              acceptsLongDistance: false,
              intentions: '',
              isVerified: firebaseUser.emailVerified,
              verificationStatus: firebaseUser.emailVerified ? 'verified' : 'unverified',
              isContactVerified: false,
              isPremium: false,
              termsAccepted: true,
              termsAcceptedAt: new Date().toISOString(),
            });
            
            // Reload user data
            userData = await getUserDocument(firebaseUser.uid);
          }
          
          console.log('📝 User data loaded from Firestore:', userData);
          
          if (userData && (userData as User).isBlocked) {
             console.warn("User is blocked, denying login");
             onNotify("Your account has been blocked. Please contact support.", "error");
             setLoading(false);
             // Optionally sign out from Firebase auth to ensure clean state
             await import('firebase/auth').then(({ signOut }) => signOut(auth));
             return;
          }

          // Claim the free-access promo if eligible. The server independently verifies
          // email verification and cohort/new-member eligibility; the client only triggers it.
          try {
            const { claimFreePromo } = await import('./services/userService');
            const promo = await claimFreePromo();
            if (promo.granted) {
              const refreshed = await getUserDocument(firebaseUser.uid);
              if (refreshed) userData = refreshed;
              onNotify("You've unlocked free premium access!", "success");
            }
          } catch (promoError) {
            console.error('Promo claim error (non-blocking):', promoError);
          }

          onLogin(userData as User, false);
          onNotify("Welcome back!", "success");
        } catch (error: any) {
          console.error('❌ Login error:', error);
          console.error('Error code:', error.code);
          console.error('Error message:', error.message);
          
          if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
            onNotify("Password or Email Incorrect", "error");
          } else if (error.code === 'auth/too-many-requests') {
            onNotify("Too many failed attempts. Please try again later.", "error");
          } else if (error.code === 'auth/network-request-failed') {
            onNotify("Network error. Please check your connection.", "error");
          } else {
            onNotify(error.message || "Login failed", "error");
          }
          setLoading(false);
          return;
        }
      } else {
        // FIREBASE SIGNUP
        if (!firstName || !surname) {
          onNotify("Name is required", "error");
          setLoading(false);
          return;
        }

        if (!phone.trim()) {
          onNotify("Telephone number is required", "error");
          setLoading(false);
          return;
        }

        if (password !== repeatPassword) {
          onNotify("Passwords do not match", "error");
          setLoading(false);
          return;
        }

        if (password.length < 6) {
          onNotify("Password must be at least 6 characters", "error");
          setLoading(false);
          return;
        }

        // Check if terms are accepted
        if (!termsAccepted) {
          onNotify("Please accept the Terms & Conditions to continue", "error");
          setLoading(false);
          return;
        }



        try {
          // Check if email is eligible for signup (10-day block check)
          const { checkSignupEligibility } = await import('./services/userService');
          const eligibility = await checkSignupEligibility(email);
          
          if (!eligibility.allowed) {
            onNotify(eligibility.reason || "You cannot use this email to create an account at this time.", "error");
            setLoading(false);
            return;
          }

          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const firebaseUser = userCredential.user;
          
          console.log('✅ Account created! User:', firebaseUser.uid);
          
          // Upload photos to Firebase Storage if provided
          let photoURLs: string[] = [];
          
          if (profilePhoto || coverPhoto) {
            console.log('📤 Uploading signup photos to Firebase Storage...');
            const { uploadProfilePhoto, uploadCoverPhoto, compressImage } = await import('./services/fileStorageService');
            
            // Helper: convert data URL to File
            const dataURLtoFile = (dataUrl: string, filename: string): File => {
              const arr = dataUrl.split(',');
              const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
              const bstr = atob(arr[1]);
              let n = bstr.length;
              const u8arr = new Uint8Array(n);
              while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
              }
              return new File([u8arr], filename, { type: mime });
            };

            // Upload profile photo (index 0)
            if (profilePhoto) {
              try {
                const profileFile = dataURLtoFile(profilePhoto, 'profile.jpg');
                const compressedProfile = await compressImage(profileFile, 1200, 1200, 0.8);
                const profileMetadata = await uploadProfilePhoto(firebaseUser.uid, compressedProfile);
                photoURLs[0] = profileMetadata.downloadURL;
                console.log('✅ Profile photo uploaded:', photoURLs[0]);
              } catch (profileUploadError) {
                console.error('⚠️ Profile photo upload failed:', profileUploadError);
              }
            }
            
            // Upload cover photo (index 1)
            if (coverPhoto) {
              try {
                // Ensure index 0 exists (Firestore rejects sparse arrays)
                if (!photoURLs[0]) photoURLs[0] = '';
                const coverFile = dataURLtoFile(coverPhoto, 'cover.jpg');
                const compressedCover = await compressImage(coverFile, 1200, 1200, 0.8);
                const coverMetadata = await uploadCoverPhoto(firebaseUser.uid, compressedCover);
                photoURLs[1] = coverMetadata.downloadURL;
                console.log('✅ Cover photo uploaded:', photoURLs[1]);
              } catch (coverUploadError) {
                console.error('⚠️ Cover photo upload failed:', coverUploadError);
              }
            }

            // Filter out empty strings from the array
            photoURLs = photoURLs.filter(url => url && url.length > 0);
            console.log('📸 Final photo URLs to save:', photoURLs);
          }
          
          // Create user document in Firestore
          const { createUserDocument } = await import('./services/userService');
          
          await createUserDocument(firebaseUser.uid, {
            id: firebaseUser.uid,
            email: email,
            phone: phone.trim(),
            name: `${firstName} ${surname}`,
            age: 0, // Will be set in onboarding
            gender: '',
            height: 0,
            country: 'Ghana',
            location: '',
            bio: '',
            photos: photoURLs, // Store Firebase Storage URLs
            denomination: '',
            churchName: '',
            churchAttendance: '',
            churchInvolvement: '',
            bibleReadingFreq: '',
            prayerFreq: '',
            faithMaturity: '',
            favoriteVerse: '',
            spiritualLesson: '',
            education: '',
            profession: '',
            acceptsLongDistance: false,
            intentions: '',
            isVerified: false,
            verificationStatus: 'unverified',
            isContactVerified: false,
            isPremium: false,
            termsAccepted: true,
            termsAcceptedAt: new Date().toISOString(),
          });
          
          console.log('✅ User document created in Firestore');
          
          // Send verification email
          const { sendEmailVerification } = await import('firebase/auth');
          const actionCodeSettings = {
            url: authActionUrl,
            handleCodeInApp: false,
          };
          await sendEmailVerification(firebaseUser, actionCodeSettings);
          
          console.log('📧 Verification email sent to:', email);
          
          // Show verification screen instead of logging in
          setIsVerificationSent(true);
          setLoading(false);
          onNotify("Account created! Please verify your email.", "success");
          return;
        } catch (error: any) {
          console.error('Signup error:', error);
          if (error.code === 'auth/email-already-in-use') {
            onNotify("User already exists. Sign in?", "error");
          } else {
            onNotify(error.message || "Signup failed", "error");
          }
          setLoading(false);
          return;
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      onNotify("Authentication failed", "error");
      setLoading(false);
    } finally {
      if (loading) setLoading(false);
    }
  };

  if (isVerificationSent) {
    const handleResendEmail = async () => {
      if (resendCooldown > 0 || loading) return;

      try {
        setLoading(true);
        const { auth } = await import('./firebase');
        const { sendEmailVerification } = await import('firebase/auth');
        
        if (auth.currentUser) {
          const actionCodeSettings = {
            url: authActionUrl,
            handleCodeInApp: false,
          };
          await sendEmailVerification(auth.currentUser, actionCodeSettings);
          setResendCooldown(30);
          onNotify(
            isLocalFirebaseEmulator
              ? "Verification link generated. Copy it from the Firebase emulator Terminal."
              : "Verification email resent!",
            "success"
          );
        } else {
          onNotify("Your signup session has expired. Please start again.", "error");
        }
      } catch (error: any) {
        if (error.code === 'auth/too-many-requests') {
          setResendCooldown(30);
          onNotify(
            isLocalFirebaseEmulator
              ? "The local Auth emulator is rate-limiting resend requests. Wait 30 seconds and use the newest link in the Firebase Terminal."
              : "Too many verification requests. Please wait before trying again.",
            "error"
          );
        } else {
          onNotify(error.message || "Failed to resend email", "error");
        }
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="cmg-auth-panel flex flex-col h-full bg-transparent p-8 justify-center items-center text-center animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-brand-orange/10 rounded-full flex items-center justify-center text-brand-orange mb-6 animate-bounce">
          <Mail size={40} />
        </div>
        <h2 className="text-3xl font-black text-brand-blue uppercase tracking-tighter mb-4">
          Verify Your Email
        </h2>
        <p className="text-gray-700 font-medium mb-4 max-w-md leading-relaxed text-base">
          We have sent you a verification email to{" "}
          <span className="text-brand-orange font-bold">{email}</span>. Verify it and log in.
        </p>

        {isLocalFirebaseEmulator && (
          <div className="w-full max-w-sm mb-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-left text-xs text-blue-900">
            <p className="font-black uppercase tracking-wide mb-2">Local test</p>
            <p>
              No real email is delivered by the Firebase emulator. Copy the newest verification link from the Terminal running the Firebase emulators, then open it in Chrome.
            </p>
            <p className="mt-2">
              For Android Emulator links, replace <code>127.0.0.1:9099</code> with <code>10.0.2.2:9099</code>.
            </p>
          </div>
        )}
        
        <div className="flex flex-col gap-3 w-full max-w-sm">
          <button
            onClick={resetVerificationFlow}
            className="bg-brand-blue text-white px-12 py-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl active:scale-95 transition-all hover:bg-brand-blue/90"
          >
            Return to Login
          </button>
          
          <button
            onClick={handleResendEmail}
            disabled={loading || resendCooldown > 0}
            className="bg-white text-brand-orange border-2 border-brand-orange px-8 py-3 rounded-2xl font-bold uppercase tracking-widest text-xs active:scale-95 transition-all hover:bg-brand-orange/5 disabled:opacity-50"
          >
            {loading
              ? "Sending..."
              : resendCooldown > 0
                ? `Try again in ${resendCooldown}s`
                : "Resend Verification Email"}
          </button>

          <button
            type="button"
            onClick={resetVerificationFlow}
            className="text-gray-500 py-3 rounded-2xl font-bold uppercase tracking-widest text-xs hover:text-brand-orange transition-colors"
          >
            Cancel / Log Out
          </button>
        </div>
      </div>
    );
  }

  // Password Reset Success Screen
  if (passwordResetSent) {
    return (
      <div className="cmg-auth-panel flex flex-col h-full bg-transparent p-8 justify-center items-center text-center animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-brand-orange/10 rounded-full flex items-center justify-center text-brand-orange mb-6 animate-bounce">
          <Mail size={40} />
        </div>
        <h2 className="text-3xl font-black text-brand-blue uppercase tracking-tighter mb-4">
          Reset Link Sent
        </h2>
        <p className="text-gray-700 font-medium mb-8 max-w-md leading-relaxed text-base">
          We sent you a password change link to{" "}
          <span className="text-brand-orange font-bold">{email}</span>
        </p>
        <button
          onClick={() => {
            setPasswordResetSent(false);
            setIsLogin(true);
            setPassword("");
          }}
          className="bg-brand-blue text-white px-12 py-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl active:scale-95 transition-all hover:bg-brand-blue/90"
        >
          Sign In
        </button>
      </div>
    );
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return onNotify("Please enter your email address", "error");
    
    setLoading(true);
    try {
      const { auth } = await import('./firebase');
      const { sendPasswordResetEmail } = await import('firebase/auth');
      const actionCodeSettings = {
        url: authActionUrl,
        handleCodeInApp: false,
      };
      
      await sendPasswordResetEmail(auth, email, actionCodeSettings);
      
      console.log('📧 Password reset email sent to:', email);
      setPasswordResetSent(true);
      setShowForgotPassword(false);
    } catch (error: any) {
      console.error('Password reset error:', error);
      if (error.code === 'auth/user-not-found') {
        onNotify("No account found with this email", "error");
      } else if (error.code === 'auth/invalid-email') {
        onNotify("Invalid email address", "error");
      } else {
        onNotify(error.message || "Failed to send reset email", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className="cmg-auth-panel flex flex-col h-full bg-transparent p-8 justify-start items-center text-center overflow-y-auto animate-in fade-in duration-500">
        <button
          title="Back"
          aria-label="Back"
          onClick={() => setShowForgotPassword(false)}
          className="absolute top-12 left-8 p-3 text-gray-500 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>

        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 bg-brand-orange/10 rounded-[2rem] flex items-center justify-center text-brand-orange mb-6">
            <Key size={32} />
          </div>
          <h2 className="text-3xl font-black text-brand-blue uppercase tracking-tighter leading-none mb-3">
            Forgot Password
          </h2>
          <p className="text-gray-400 text-xs font-medium max-w-[240px]">
            Enter your email below and we'll send you a link to reset your
            account.
          </p>
        </div>

        <form
          onSubmit={handleForgotPassword}
          className="space-y-4 w-full max-w-sm"
        >
          <div className="space-y-1 text-left">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">
              Email Address
            </label>
            <input
              type="email"
              placeholder="grace@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 bg-gray-50 rounded-2xl outline-none border-2 border-transparent focus:border-brand-orange/20 text-gray-900 font-medium transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-blue text-white py-5 rounded-2xl font-black shadow-2xl shadow-brand-blue/20 active:scale-95 transition-transform disabled:opacity-50 mt-4 uppercase tracking-widest text-xs"
          >
            {loading ? "SENDING LINK..." : "Get Reset Link"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="cmg-auth-panel flex flex-col h-full bg-transparent p-8 justify-start items-center text-center overflow-y-auto">
      {/* Terms & Conditions Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-2xl w-full h-[95vh] sm:max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white shrink-0">
              <h2 className="text-lg sm:text-2xl font-black text-brand-blue">
                Terms & Conditions
              </h2>
              <button
                onClick={() => setShowTermsModal(false)}
                className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="sm:w-6 sm:h-6 text-gray-600" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 text-left space-y-3 sm:space-y-4">
              <div className="space-y-2">
                <h3 className="font-bold text-base sm:text-lg text-gray-900">Welcome to Christian Match Ghana</h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  By creating an account and using Christian Match Ghana (CMG), you agree to honor God in all your interactions and abide by these terms.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-sm sm:text-base text-gray-900">1. Faith-Based Community</h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  CMG is a Christian dating platform designed to help believers find meaningful relationships rooted in faith. All members must respect Christian values and conduct themselves with integrity.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-sm sm:text-base text-gray-900">2. Code of Conduct</h3>
                <ul className="list-disc list-inside text-xs sm:text-sm text-gray-600 space-y-1 sm:space-y-2 leading-relaxed">
                  <li>Treat all members with respect, kindness, and Christian love</li>
                  <li>Be honest in your profile information and intentions</li>
                  <li>Maintain appropriate and God-honoring communication</li>
                  <li>Report any suspicious or inappropriate behavior immediately</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-sm sm:text-base text-gray-900">3. Zero Tolerance Policy</h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  We have zero tolerance for:
                </p>
                <ul className="list-disc list-inside text-xs sm:text-sm text-gray-600 space-y-1 sm:space-y-2 leading-relaxed">
                  <li><strong>Harassment</strong> - Any form of bullying, threats, or unwanted advances</li>
                  <li><strong>Vulgarity</strong> - Inappropriate language, images, or content</li>
                  <li><strong>Scammers</strong> - Fraudulent activities, fake profiles, or financial scams</li>
                  <li><strong>Disrespect</strong> - Discrimination based on denomination, tribe, or background</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-sm sm:text-base text-gray-900">4. Consequences</h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  Violators of these terms will be permanently banned from the platform without warning or refund of any payments.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-sm sm:text-base text-gray-900">5. Privacy & Data</h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  We respect your privacy and will never share your personal information with third parties without your consent. Your data is protected and used only to enhance your experience on the platform.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-sm sm:text-base text-gray-900">6. User Responsibility</h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  You are responsible for your own safety. Always exercise wisdom when meeting someone in person. We recommend:
                </p>
                <ul className="list-disc list-inside text-xs sm:text-sm text-gray-600 space-y-1 sm:space-y-2 leading-relaxed">
                  <li>Meeting in public places for first meetings</li>
                  <li>Informing friends or family of your plans</li>
                  <li>Never sending money to people you haven't met</li>
                  <li>Trusting your instincts and reporting concerns</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-sm sm:text-base text-gray-900">7. Accuracy of Information</h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  You agree to provide accurate information in your profile and keep it updated. Misrepresentation may result in account suspension.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-sm sm:text-base text-gray-900">8. Changes to Terms</h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  We reserve the right to update these terms at any time. Continued use of the platform constitutes acceptance of updated terms.
                </p>
              </div>

              <div className="bg-brand-orange/5 border-l-4 border-brand-orange p-3 sm:p-4 rounded-lg">
                <p className="text-xs sm:text-sm font-semibold text-gray-900">
                  "Let love be genuine. Abhor what is evil; hold fast to what is good." - Romans 12:9
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-6 border-t border-gray-100 flex gap-2 sm:gap-3 shrink-0">
              <button
                onClick={() => setShowTermsModal(false)}
                className="flex-1 py-2.5 sm:py-3 bg-gray-100 text-gray-700 rounded-xl text-sm sm:text-base font-bold hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setTermsAccepted(true);
                  setShowTermsModal(false);
                }}
                className="flex-1 py-2.5 sm:py-3 bg-brand-orange text-white rounded-xl text-sm sm:text-base font-bold hover:bg-brand-orange/90 transition-colors shadow-lg active:scale-95"
              >
                I Accept
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="cmg-auth-brand animate-in fade-in slide-in-from-bottom-6 duration-700">
        <Logo size={160} className="drop-shadow-xl" />
        <h2>
          {isLogin ? "Welcome back" : "Create your account"}
        </h2>
        <p>
          {isLogin
            ? "Your journey to a Christ-centred connection continues."
            : "Join a community of believers seeking meaningful, Christ-centred relationships."}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 w-full max-w-sm animate-in fade-in duration-1000 delay-300"
      >
        {!isLogin && (
          <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-4">
            <div className="space-y-1 text-left">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2">
                First Name
              </label>
              <input
                placeholder="Grace"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-brand-orange/10"
                required
              />
            </div>
            <div className="space-y-1 text-left">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2">
                Surname
              </label>
              <input
                placeholder="Amoah"
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                className="w-full p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-brand-orange/10"
                required
              />
            </div>
          </div>
        )}

        {!isLogin && (
          <div className="space-y-3">
            <div className="space-y-1 text-left">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2">
                Profile Photo
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handlePhotoUpload(e, 'profile')}
                  className="w-full p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-brand-orange/10 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-brand-orange/10 file:text-brand-orange hover:file:bg-brand-orange/20"
                />
                {profilePhoto && (
                  <div className="mt-2">
                    <img src={profilePhoto} alt="Profile preview" className="w-20 h-20 rounded-full object-cover" />
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-1 text-left">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2">
                Cover Photo (Optional)
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handlePhotoUpload(e, 'cover')}
                  className="w-full p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-brand-orange/10 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-brand-orange/10 file:text-brand-orange hover:file:bg-brand-orange/20"
                />
                {coverPhoto && (
                  <div className="mt-2">
                    <img src={coverPhoto} alt="Cover preview" className="w-full h-24 rounded-xl object-cover" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-1 text-left">
          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2">
            Email Address
          </label>
          <input
            type="email"
            placeholder="grace@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-4 bg-gray-50 rounded-2xl outline-none border-2 border-transparent focus:border-brand-orange/20 text-gray-900 font-medium transition-all"
            required
          />
        </div>

        {!isLogin && (
          <div className="space-y-1 text-left animate-in fade-in slide-in-from-bottom-4">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2">
              Telephone Number
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <Phone size={18} />
              </div>
              <input
                type="tel"
                placeholder="0241234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-4 pl-12 bg-gray-50 rounded-2xl outline-none border-2 border-transparent focus:border-brand-orange/20 text-gray-900 font-medium transition-all"
                required
              />
            </div>
          </div>
        )}

        <div className="space-y-1 text-left">
          <div className="flex justify-between items-center px-2">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
              Password
            </label>
            {isLogin && (
              <button
                type="button"
                tabIndex={-1}
                title="Forgot password"
                onClick={() => setShowForgotPassword(true)}
                className="text-[9px] font-black text-brand-orange uppercase tracking-widest"
              >
                Forgot?
              </button>
            )}
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 bg-gray-50 rounded-2xl outline-none border-2 border-transparent focus:border-brand-orange/20 text-gray-900 font-medium transition-all"
              required
            />
            <button
              type="button"
              title={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-orange"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        {!isLogin && (
          <div className="space-y-1 text-left">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2">
              Repeat Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={repeatPassword}
                onChange={(e) => setRepeatPassword(e.target.value)}
                className="w-full p-4 bg-gray-50 rounded-2xl outline-none border-2 border-transparent focus:border-brand-orange/20 text-gray-900 font-medium transition-all"
                required
              />
            </div>
          </div>
        )}

        {/* Terms & Conditions Checkbox */}
        {!isLogin && (
          <div className="text-left space-y-3 py-4">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="w-5 h-5 mt-0.5 text-brand-orange bg-gray-50 border-gray-300 rounded focus:ring-brand-orange focus:ring-2 cursor-pointer"
                required
              />
              <span className="text-xs text-gray-600 leading-relaxed">
                I agree to the{" "}
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="text-brand-orange font-bold underline hover:text-brand-blue transition-colors"
                >
                  Terms & Conditions
                </button>
                {" "}and confirm that I will honor God in all my interactions on this platform.
              </span>
            </label>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-blue text-white py-5 rounded-2xl font-black shadow-xl shadow-brand-blue/20 active:scale-95 transition-transform disabled:opacity-50 mt-4 uppercase tracking-widest text-xs"
        >
          {loading 
            ? "PROCESSING..." 
            : isLogin 
              ? "SIGN IN" 
              : "CREATE ACCOUNT"
          }
        </button>
      </form>

      <button
        onClick={() => setIsLogin(!isLogin)}
        title={isLogin ? "Register a new account" : "Sign in to your account"}
        className="mt-8 text-[10px] font-black text-brand-orange uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 bg-brand-orange/5 px-6 py-3 rounded-xl border border-brand-orange/10"
      >
        {isLogin
          ? "New Member? Create Account"
          : "Have an account? Sign In"}
      </button>

      <div className="mt-8 max-w-xs mx-auto">
         <p className="text-[9px] text-gray-300 font-medium leading-relaxed">
            By continuing, you agree to our Terms of Service honoring God in your interactions.
         </p>
      </div>
    </div>
  );
};

const OnboardingView = ({
  onComplete,
  onCancel,
}: {
  onComplete: (profile: any) => void;
  onCancel: () => void;
}) => {
  const [step, setStep] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [croppingType, setCroppingType] = useState<
    "profile" | "cover" | "gallery" | null
  >(null);
  const [croppingImage, setCroppingImage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    location: "",
    denomination: "",
    churchName: "",
    bio: "",
    intentions: "",
    photos: [] as string[],
  });

  const next = () => {
    if (step < 4) setStep(step + 1);
    else {
      if (formData.photos.length < 2) {
        alert("Please upload at least a profile and cover photo to continue.");
        return;
      }
      // Ensure numerical data is converted from string to number before completion
      onComplete({
        ...formData,
        age: parseInt(formData.age || "0", 10),
      });
    }
  };

  const handlePhotoSelect = (type: "profile" | "cover" | "gallery") => {
    setCroppingType(type);
    fileInputRef.current?.click();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setCroppingImage(reader.result as string);
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const denominations = [
    "Pentecostal",
    "Methodist",
    "Catholic",
    "Presbyterian",
    "Baptist",
    "Anglican",
    "Charismatic",
    "SDA",
    "Other",
  ];
  const steps = [
    { id: 1, label: "Identity" },
    { id: 2, label: "Faith" },
    { id: 3, label: "Life" },
    { id: 4, label: "Media" },
  ];

  return (
    <div className="cmg-onboarding-panel h-full flex flex-col bg-transparent overflow-hidden relative">
      {croppingImage && (
        <ImageCropper
          imageSrc={croppingImage}
          aspectRatio={
            croppingType === "cover"
              ? 1.77
              : croppingType === "profile"
              ? 1
              : 0.75
          }
          onCancel={() => {
            setCroppingImage(null);
            setCroppingType(null);
          }}
          onCrop={(img) => {
            const newPhotos = [...formData.photos];
            if (croppingType === "profile") newPhotos[0] = img;
            else if (croppingType === "cover") newPhotos[1] = img;
            else newPhotos.push(img);
            setFormData({ ...formData, photos: newPhotos });
            setCroppingImage(null);
            setCroppingType(null);
          }}
        />
      )}

      {/* Compact brand mark above the four-step wizard. */}
      <div className="flex justify-center pt-4 pb-1 shrink-0">
        <Logo size={170} className="drop-shadow-lg" />
      </div>

      {/* Wizard Progress Header */}
      <div className="bg-brand-surface pt-12 pb-6 px-8 border-b flex justify-between items-center relative shrink-0">
        {steps.map((s, idx) => (
          <div key={s.id} className="z-10 flex flex-col items-center gap-2">
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-black transition-all duration-500 ${
                step >= s.id
                  ? "bg-brand-orange text-white shadow-lg"
                  : "bg-gray-100 text-gray-300"
              }`}
            >
              {step > s.id ? <Check size={16} strokeWidth={3} /> : s.id}
            </div>
            <span
              className={`text-[8px] font-black uppercase tracking-widest ${
                step >= s.id ? "text-brand-orange" : "text-gray-300"
              }`}
            >
              {s.label}
            </span>
          </div>
        ))}
        <div className="absolute top-[70px] left-12 right-12 h-1 bg-gray-100 -z-0 rounded-full">
          <div
            role="progressbar"
            aria-label="Onboarding progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(((step - 1) / 3) * 100)}
            className="h-full bg-brand-orange transition-all duration-500 rounded-full progress-bar-fill"
            style={{
              ["--progress-width" as any]: `${((step - 1) / 3) * 100}%`,
            }}
          ></div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 pt-5 pb-24 hide-scrollbar">
        {step === 1 && (
          <div className="space-y-6 animate-in slide-in-from-right duration-500">
            <div>
              <h2 className="text-3xl font-black text-brand-blue mb-2 tracking-tighter">
                Tell us about yourself
              </h2>
              <p className="text-gray-400 text-sm font-medium">
                Let's start your journey to a Godly union.
              </p>
            </div>
            <div className="space-y-1">
              <label
                htmlFor="name"
                className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2"
              >
                Display Name
              </label>
              <input
                id="name"
                className="w-full p-4 bg-gray-50 rounded-2xl text-gray-900 font-bold outline-none focus:ring-2 focus:ring-brand-orange/20"
                placeholder="Grace Amoah"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label
                  htmlFor="age"
                  className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2"
                >
                  Age
                </label>
                <input
                  id="age"
                  type="number"
                  className="w-full p-4 bg-gray-50 rounded-2xl text-gray-900 font-bold outline-none"
                  placeholder="25"
                  value={formData.age}
                  onChange={(e) =>
                    setFormData({ ...formData, age: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="location"
                  className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2"
                >
                  Location
                </label>
                <input
                  id="location"
                  className="w-full p-4 bg-gray-50 rounded-2xl text-gray-900 font-bold outline-none"
                  placeholder="Accra"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in slide-in-from-right duration-500">
            <div>
              <h2 className="text-3xl font-black text-brand-blue mb-2 tracking-tighter">
                Your Faith Foundation
              </h2>
              <p className="text-gray-400 text-sm font-medium">
                CMG connects believers of like-mind.
              </p>
            </div>
            <div className="space-y-1">
              <label
                htmlFor="denomination"
                className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2"
              >
                Denomination
              </label>
              <select
                id="denomination"
                aria-label="Denomination"
                className="w-full p-4 bg-gray-50 rounded-2xl text-gray-900 font-bold outline-none appearance-none"
                value={formData.denomination}
                onChange={(e) =>
                  setFormData({ ...formData, denomination: e.target.value })
                }
              >
                <option value="">Select Denomination</option>
                {denominations.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label
                htmlFor="churchName"
                className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2"
              >
                Church Name
              </label>
              <input
                id="churchName"
                className="w-full p-4 bg-gray-50 rounded-2xl text-gray-900 font-bold outline-none"
                placeholder="ICGC Christ Temple"
                value={formData.churchName}
                onChange={(e) =>
                  setFormData({ ...formData, churchName: e.target.value })
                }
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in slide-in-from-right duration-500">
            <div>
              <h2 className="text-3xl font-black text-brand-blue mb-2 tracking-tighter">
                Life & Intentions
              </h2>
              <p className="text-gray-400 text-sm font-medium">
                What is your vision for this season?
              </p>
            </div>
            <div className="space-y-1">
              <label
                htmlFor="intentions"
                className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2"
              >
                Relationship Goal
              </label>
              <select
                id="intentions"
                aria-label="Relationship goal"
                className="w-full p-4 bg-gray-50 rounded-2xl text-gray-900 font-bold outline-none"
                value={formData.intentions}
                onChange={(e) =>
                  setFormData({ ...formData, intentions: e.target.value })
                }
              >
                <option value="">What are you seeking?</option>
                <option value="Marriage Soon">Marriage Soon</option>
                <option value="Courtship">Courtship</option>
                <option value="Friendship">Friendship</option>
              </select>
            </div>
            <div className="space-y-1">
              <label
                htmlFor="bio"
                className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2"
              >
                Brief Bio
              </label>
              <textarea
                id="bio"
                className="w-full p-4 bg-gray-50 rounded-2xl h-32 text-gray-900 font-medium outline-none"
                placeholder="Tell us about your journey with Christ..."
                value={formData.bio}
                onChange={(e) =>
                  setFormData({ ...formData, bio: e.target.value })
                }
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 animate-in slide-in-from-right duration-500">
            <div className="text-center">
              <h2 className="text-2xl font-black text-brand-blue mb-1 uppercase tracking-tighter">
                Visualize your grace
              </h2>
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">
                Profile & Cover are required
              </p>
            </div>

            <div className="relative">
              <div
                onClick={() => handlePhotoSelect("cover")}
                className="h-32 bg-gray-100 rounded-3xl overflow-hidden group border-2 border-dashed border-gray-200 hover:border-brand-orange transition-all cursor-pointer"
              >
                {formData.photos[1] ? (
                  <img
                    src={formData.photos[1]}
                    className="w-full h-full object-cover"
                    alt="Cover photo"
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-300">
                    <ImageIcon size={28} />
                    <span className="text-[8px] font-black uppercase mt-2">
                      Add Cover Photo
                    </span>
                  </div>
                )}
              </div>
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
                <div
                  onClick={() => handlePhotoSelect("profile")}
                  className="w-24 h-24 rounded-full bg-white p-1.5 shadow-2xl group cursor-pointer hover:scale-105 transition-transform"
                >
                  <div className="w-full h-full rounded-full bg-gray-100 overflow-hidden flex items-center justify-center text-gray-300">
                    {formData.photos[0] ? (
                      <img
                        src={formData.photos[0]}
                        className="w-full h-full object-cover"
                        alt="Profile photo"
                      />
                    ) : (
                      <UserIcon size={32} />
                    )}
                  </div>
                  <div className="absolute bottom-1 right-1 bg-brand-orange text-white p-2 rounded-full shadow-lg border-2 border-white">
                    <Camera size={14} />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-8 grid grid-cols-3 gap-2">
              {formData.photos.slice(2).map((p, i) => (
                <div
                  key={i}
                  className="aspect-[3/4] relative rounded-2xl overflow-hidden shadow-sm"
                >
                  <img
                    src={p}
                    className="w-full h-full object-cover"
                    alt={`Gallery photo ${i + 1}`}
                  />
                  <button
                    title="Remove photo"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        photos: formData.photos.filter(
                          (_, idx) => idx !== i + 2
                        ),
                      })
                    }
                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
              {formData.photos.length < 6 && (
                <button
                  title="Add photo"
                  onClick={() => handlePhotoSelect("gallery")}
                  className="aspect-[3/4] bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center text-gray-400 hover:text-brand-orange hover:border-brand-orange transition-all"
                >
                  <PlusCircle size={24} />
                </button>
              )}
            </div>
          </div>
        )}
        <div className="mt-6 mb-4 flex gap-4">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 py-4 bg-white text-brand-orange border-2 border-brand-orange/40 rounded-2xl font-black text-[12px] uppercase tracking-[0.2em] shadow-xl shadow-brand-orange/10 active:scale-95 transition-all"
            >
              Back
            </button>
          )}
          <button
            onClick={next}
            className="flex-1 bg-brand-orange text-white py-4 rounded-2xl font-black text-[12px] uppercase tracking-[0.2em] shadow-xl shadow-brand-orange/20 active:scale-95 transition-all"
          >
            {step === 4 ? "Finish Setup" : "Continue"}
          </button>
        </div>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        aria-label="Upload image"
        className="hidden"
        accept="image/*"
        onChange={onFileChange}
      />
    </div>
  );
};

export const EditProfileView = ({
  user,
  onCancel,
  onSave,
  onNotify,
}: {
  user: User;
  onCancel: () => void;
  onSave: (u: User) => void;
  onNotify: (msg: string, type: "success" | "error") => void;
}) => {
  const [formData, setFormData] = React.useState<any>({
    ...user,
    ...(user as any).raw_user_meta_data,
  });
  // Keep previously-saved details (e.g. from onboarding) populated here without
  // discarding any in-progress edits the user has already made on this screen.
  React.useEffect(() => {
    setFormData((prev: any) => ({
      ...user,
      ...(user as any).raw_user_meta_data,
      ...prev,
    }));
  }, [user]);
  const [loading, setLoading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const triggerFileInput = (type: "profile" | "cover" | "gallery") => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute("data-type", type);
      fileInputRef.current.click();
    }
  };
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          // Compress to JPEG with 0.7 quality
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
          resolve(compressedBase64);
        };
        img.src = event.target?.result as string;
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const [croppingType, setCroppingType] = React.useState<"profile" | "cover" | "gallery" | null>(null);
  const [croppingImage, setCroppingImage] = React.useState<string | null>(null);

  const uploadCroppedPhoto = async (croppedDataUrl: string, type: "profile" | "cover" | "gallery") => {
    // Helper to convert data URL back to Blob for uploading
    const dataURLtoBlob = (dataUrl: string): Blob => {
      const arr = dataUrl.split(',');
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], { type: mime });
    };
    
    try {
      setLoading(true);
      const { 
        uploadProfilePhoto, 
        uploadCoverPhoto, 
        uploadGalleryPhoto 
      } = await import('./services/fileStorageService');
      
      const { auth } = await import('./firebase');
      const userId = auth.currentUser?.uid || user.id || (user as any).uid;
      if (!userId) {
        throw new Error("Unable to resolve User ID. Please sign out and sign in again.");
      }

      const blob = dataURLtoBlob(croppedDataUrl);
      console.log(`📸 Starting cropped ${type} photo upload...`);
      
      let fileMetadata;
      if (type === "profile") {
        fileMetadata = await uploadProfilePhoto(userId, blob);
      } else if (type === "cover") {
        fileMetadata = await uploadCoverPhoto(userId, blob);
      } else {
        fileMetadata = await uploadGalleryPhoto(userId, blob);
      }
      
      console.log('✅ Photo uploaded successfully:', fileMetadata);

      // Update form data with download URL
      setFormData((prev: any) => {
        const newPhotos = [...(prev.photos || [])];
        if (type === "profile") {
          newPhotos[0] = fileMetadata.downloadURL;
        } else if (type === "cover") {
          newPhotos[1] = fileMetadata.downloadURL;
        } else {
          newPhotos.push(fileMetadata.downloadURL);
        }
        return { ...prev, photos: newPhotos };
      });
      
      onNotify("Photo uploaded successfully", "success");
    } catch (error: any) {
      console.error("❌ Error uploading image:", error);
      onNotify("Upload failed: " + error.message, "error");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const REQUIRED_FIELD_LABELS: Record<string, string> = {
    name: 'Full Name', phone: 'Phone Number', dob: 'Date of Birth', country: 'Country',
    location: 'City / Location', gender: 'Gender', maritalStatus: 'Marital Status',
    hasChildren: 'Has Children', wantChildren: 'Want Children', height: 'Height',
    bodyType: 'Body Type', complexion: 'Complexion', languages: 'Languages',
    smoking: 'Smoking', alcohol: 'Alcohol', education: 'Education', occupation: 'Occupation',
    incomeRange: 'Income Range', intentions: 'Intentions', intendToMarry: 'Intend to Marry',
    willingToRelocate: 'Willing to Relocate', preferredAgeMin: 'Preferred Min Age',
    preferredAgeMax: 'Preferred Max Age', preferredLocation: 'Preferred Location',
    preferredDenomination: 'Preferred Denomination', preferredEthnicGroup: 'Preferred Ethnic Group',
    dealBreakers: 'Deal Breakers', healthCondition: 'Health Condition',
    lifestyleInfo: 'Lifestyle Info', denomination: 'Denomination',
    churchAttendance: 'Church Attendance', church: 'Church Name', bio: 'Bio',
  };

  const getMissingFields = (): string[] => {
    const requiredFields = [
      'name', 'phone', 'dob', 'country', 'location', 'gender', 'maritalStatus', 
      'hasChildren', 'wantChildren', 'height', 'bodyType', 'complexion', 
      'languages', 'smoking', 'alcohol', 'education', 'occupation', 
      'incomeRange', 'intentions', 'intendToMarry', 'willingToRelocate',
      'preferredAgeMin', 'preferredAgeMax', 'preferredLocation', 'preferredDenomination',
      'preferredEthnicGroup', 'dealBreakers', 'healthCondition', 'lifestyleInfo',
      'denomination', 'churchAttendance', 'church', 'bio'
    ];
    
    const getVal = (f: string) => {
        if (f === 'location') return formData.location || formData.city;
        if (f === 'church') return formData.church || formData.churchName;
        if (f === 'occupation') return formData.occupation || formData.profession;
        return formData[f];
    };

    const missing: string[] = [];

    // Only profile photo (index 0) and cover photo (index 1) are required — gallery photos are optional
    const hasProfilePhoto = formData.photos && formData.photos[0] && formData.photos[0].trim() !== '';
    const hasCoverPhoto = formData.photos && formData.photos[1] && formData.photos[1].trim() !== '';
    if (!hasProfilePhoto) missing.push('Profile Photo');
    if (!hasCoverPhoto) missing.push('Cover Photo');

    requiredFields.forEach(field => {
      const val = getVal(field);
      if (val === null || val === undefined || String(val).trim() === '') {
        missing.push(REQUIRED_FIELD_LABELS[field] || field);
      }
    });

    return missing;
  };

  const saveProfile = async () => {
    // Validate required fields before saving
    const missing = getMissingFields();
    if (missing.length > 0) {
      const maxShow = 5;
      const shown = missing.slice(0, maxShow).join(', ');
      const extra = missing.length > maxShow ? ` and ${missing.length - maxShow} more` : '';
      onNotify(`Please fill in: ${shown}${extra}`, 'error');
      return;
    }

    setLoading(true);
    try {
      // Calculate age from DOB if present
      let age = formData.age;
      if (formData.dob) {
        const birthDate = new Date(formData.dob);
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
      }

      // Import Firestore service
      const { updateUserDocument } = await import('./services/userService');

      // Prepare updates for Firestore (using camelCase for Firestore)
      const updates: Partial<User> = {
        name: formData.name,
        phone: formData.phone,
        age: age,
        gender: formData.gender,
        country: formData.country,
        location: formData.location || formData.city,
        bio: formData.bio,
        photos: formData.photos || [],
        
        // Faith details
        denomination: formData.denomination,
        churchName: formData.church || formData.churchName,
        churchAttendance: formData.churchAttendance,
        churchInvolvement: formData.churchInvolvement,
        bibleReadingFreq: formData.bibleReadingFreq,
        prayerFreq: formData.prayerFreq,
        faithMaturity: formData.faithMaturity,
        favoriteVerse: formData.favoriteVerse,
        spiritualLesson: formData.spiritualLesson,
        faithStatement: formData.faithStatement,
        
        // Personal & Lifestyle
        dob: formData.dob,
        maritalStatus: formData.maritalStatus,
        hasChildren: formData.hasChildren,
        wantChildren: formData.wantChildren,
        height: formData.height,
        bodyType: formData.bodyType,
        complexion: formData.complexion,
        languages: formData.languages,
        smoking: formData.smoking || '',
        alcohol: formData.alcohol || '',
        drinking: formData.alcohol === 'Yes' || formData.alcohol === 'Occasionally' ? true : formData.alcohol === 'No' ? false : formData.drinking,
        
        // Education & Work
        education: formData.education,
        profession: formData.occupation || formData.profession,
        occupation: formData.occupation || formData.profession,
        incomeRange: formData.incomeRange,
        
        // Relationship Intentions
        intentions: formData.intentions,
        lookingFor: formData.lookingFor || formData.intentions,
        intendToMarry: formData.intendToMarry,
        willingToRelocate: formData.willingToRelocate,
        
        // Partner Preferences
        preferredAgeMin: formData.preferredAgeMin ? parseInt(formData.preferredAgeMin) : undefined,
        preferredAgeMax: formData.preferredAgeMax ? parseInt(formData.preferredAgeMax) : undefined,
        preferredLocation: formData.preferredLocation,
        preferredDenomination: formData.preferredDenomination,
        preferredEthnicGroup: formData.preferredEthnicGroup,
        dealBreakers: formData.dealBreakers,
        
        // Sensitive Information
        healthCondition: formData.healthCondition,
        lifestyleInfo: formData.lifestyleInfo,
      };

      // Save to Firestore
      console.log('💾 Saving profile updates to Firestore...');
      await updateUserDocument(user.id, updates);
      console.log('✅ Profile saved to Firestore successfully!');
      
      // Update local user state
      const updatedUser = { ...user, ...updates };
      onSave(updatedUser as User);
      onNotify("Profile updated successfully!", "success");
    } catch (err: any) {
      console.error('❌ Error saving profile:', err);
      onNotify("Failed to update profile: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cmg-edit-profile h-full flex flex-col bg-transparent relative overflow-hidden">
      {/* Frozen header: top ribbon, controls, logo and title stay visible while scrolling. */}
      <div className="shrink-0 relative z-20">
      {/* Floating controls over the top ribbon, matching the onboarding card. */}
      <div className="relative z-40 flex items-center justify-between px-4 pt-5">
        <button
          onClick={onCancel}
          title="Back"
          aria-label="Back"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-brand-blue shadow-lg border border-gray-100"
        >
          <ArrowLeft size={21} />
        </button>
        <button
          onClick={saveProfile}
          disabled={loading}
          className="px-5 py-2.5 rounded-full bg-brand-orange text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-lg disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save"}
        </button>
      </div>

      {/* App logo, consistent with the login and onboarding screens. */}
      <div className="flex justify-center pt-2 pb-1">
        <Logo size={120} className="drop-shadow-lg" />
      </div>
      <div className="text-center pb-2">
        <h2 className="text-2xl font-black text-brand-blue uppercase tracking-tighter">
          Edit Profile
        </h2>
      </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pt-4 pb-52 hide-scrollbar space-y-8 relative z-10">
        {/* Photos Management */}
        <div>
          <div className="flex justify-between items-end mb-3">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">
              Media
            </h3>
            <span className="text-[10px] text-gray-400 font-bold">
              {formData.photos?.filter((p: string) => p?.length > 0).length ||
                0}
              /6
            </span>
          </div>

          <div className="space-y-6">
            {/* Profile & Cover Preview Area */}
            <div className="relative">
              {/* Cover Photo (Index 1) */}
              <div
                onClick={() => triggerFileInput("cover")}
                className="h-44 bg-gray-100 rounded-3xl overflow-hidden group border-2 border-dashed border-gray-200 hover:border-brand-orange transition-all cursor-pointer relative"
              >
                {formData.photos?.[1] ? (
                  <>
                    <img
                      src={formData.photos[1]}
                      className="w-full h-full object-cover"
                      alt="Cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs uppercase tracking-widest">
                      Change Cover
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const p = [...(formData.photos || [])];
                        p[1] = "";
                        setFormData({ ...formData, photos: p });
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full hover:scale-110 transition-transform"
                      title="Remove Cover Photo"
                    >
                      <X size={12} />
                    </button>
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-300">
                    <ImageIcon size={28} />
                    <span className="text-[8px] font-black uppercase mt-2">
                      Add Cover Photo
                    </span>
                  </div>
                )}
              </div>

              {/* Profile Photo (Index 0) */}
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
                <div
                  onClick={() => triggerFileInput("profile")}
                  className="w-28 h-28 rounded-full bg-white p-1.5 shadow-xl group cursor-pointer hover:scale-105 transition-transform relative"
                >
                  <div className="w-full h-full rounded-full bg-gray-100 overflow-hidden flex items-center justify-center text-gray-300 relative">
                    {formData.photos?.[0] ? (
                      <>
                        <img
                          src={formData.photos[0]}
                          className="w-full h-full object-cover"
                          alt="Profile"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <Camera size={20} />
                        </div>
                      </>
                    ) : (
                      <UserIcon size={32} />
                    )}
                  </div>
                  {formData.photos?.[0] && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const p = [...(formData.photos || [])];
                        p[0] = "";
                        setFormData({ ...formData, photos: p });
                      }}
                      className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full shadow-md z-10 hover:scale-110 transition-transform"
                      title="Remove Profile Photo"
                    >
                      <X size={10} />
                    </button>
                  )}
                  {!formData.photos?.[0] && (
                    <div className="absolute bottom-1 right-1 bg-brand-orange text-white p-2 rounded-full shadow-lg border-2 border-white">
                      <PlusCircle size={14} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Gallery Grid (Index 2+) */}
            <div className="pt-12">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                Gallery
              </h4>
              <div className="grid grid-cols-3 gap-3">
                {formData.photos?.slice(2).filter((p: string) => p && p.trim() !== '').map((p: string, i: number) => (
                  <div
                    key={i}
                    className="aspect-[3/4] relative rounded-xl overflow-hidden group"
                  >
                    <img
                      src={p}
                      className="w-full h-full object-cover"
                      alt="Gallery"
                    />
                    <button
                      onClick={() =>
                        setFormData({
                          ...formData,
                          photos: formData.photos.filter(
                            (_: any, idx: number) => idx !== i + 2
                          ),
                        })
                      }
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {(formData.photos?.filter((p: string) => p && p.trim() !== '').length || 0) < 6 && (
                  <button
                    onClick={() => triggerFileInput("gallery")}
                    className="aspect-[3/4] border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center text-gray-400 hover:text-brand-orange hover:border-brand-orange transition-colors"
                  >
                    <PlusCircle size={24} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={(e) => {
              const type = fileInputRef.current?.getAttribute("data-type") as
                | "profile"
                | "cover"
                | "gallery";
              const file = e.target.files?.[0];
              if (file) {
                setCroppingType(type);
                const reader = new FileReader();
                reader.onloadend = () => setCroppingImage(reader.result as string);
                reader.readAsDataURL(file);
              }
              e.target.value = "";
            }}
          />
        </div>

        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">
            A. Basic Details
          </h3>
          <input
            type="text"
            placeholder="Full Name"
            value={formData.name || ""}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full p-4 bg-gray-50 rounded-2xl"
          />
          <input
            type="text"
            placeholder="Phone Number"
            value={formData.phone || ""}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            className="w-full p-4 bg-gray-50 rounded-2xl"
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase font-bold text-gray-400 ml-2">
                Date of Birth
              </label>
              <input
                type="date"
                value={formData.dob || ""}
                onChange={(e) =>
                  setFormData({ ...formData, dob: e.target.value })
                }
                className="w-full p-4 bg-gray-50 rounded-2xl"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-gray-400 ml-2">
                Country
              </label>
              <select
                value={formData.country || ""}
                onChange={(e) =>
                  setFormData({ ...formData, country: e.target.value })
                }
                className="w-full p-4 bg-gray-50 rounded-2xl"
              >
                <option value="">Select Country</option>
                {COUNTRIES.map((c, i) => (
                  <option key={`${c}-${i}`} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase font-bold text-gray-400 ml-2">
                City / Region
              </label>
              <input
                type="text"
                placeholder="City / Region"
                value={formData.location || formData.city || ""}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                className="w-full p-4 bg-gray-50 rounded-2xl"
              />
            </div>
            <select
              value={formData.gender || ""}
              onChange={(e) =>
                setFormData({ ...formData, gender: e.target.value })
              }
              className="w-full p-4 bg-gray-50 rounded-2xl"
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <select
              value={formData.maritalStatus || ""}
              onChange={(e) =>
                setFormData({ ...formData, maritalStatus: e.target.value })
              }
              className="w-full p-4 bg-gray-50 rounded-2xl"
            >
              <option value="">Marital Status</option>
              {MARITAL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Faith */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">
            Faith Profile
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <select
              value={formData.denomination || ""}
              onChange={(e) =>
                setFormData({ ...formData, denomination: e.target.value })
              }
              className="w-full p-4 bg-gray-50 rounded-2xl"
            >
              <option value="">Denomination</option>
              {DENOMINATIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select
              value={formData.churchAttendance || ""}
              onChange={(e) =>
                setFormData({ ...formData, churchAttendance: e.target.value })
              }
              className="w-full p-4 bg-gray-50 rounded-2xl"
            >
              <option value="">Attendance</option>
              <option>Weekly</option>
              <option>Twice a week</option>
              <option>Occasional</option>
              <option>Online Only</option>
            </select>
          </div>
          <input
            type="text"
            placeholder="Home Church"
            value={formData.church || formData.churchName || ""}
            onChange={(e) =>
              setFormData({ ...formData, church: e.target.value })
            }
            className="w-full p-4 bg-gray-50 rounded-2xl"
          />
          <textarea
            placeholder="Your Faith Statement / Bio"
            value={formData.bio || ""}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            className="w-full p-4 bg-gray-50 rounded-2xl h-32"
          />
        </div>

        {/* Personal & Lifestyle */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">
            B. Personal & Lifestyle
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <select
              value={formData.maritalStatus || ""}
              onChange={(e) =>
                setFormData({ ...formData, maritalStatus: e.target.value })
              }
              className="w-full p-4 bg-gray-50 rounded-2xl"
            >
              <option value="">Marital Status</option>
              {MARITAL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={formData.hasChildren || ""}
              onChange={(e) =>
                setFormData({ ...formData, hasChildren: e.target.value })
              }
              className="w-full p-4 bg-gray-50 rounded-2xl"
            >
              <option value="">Have Children?</option>
              <option>No</option>
              <option>Yes</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <select
              value={formData.wantChildren || ""}
              onChange={(e) =>
                setFormData({ ...formData, wantChildren: e.target.value })
              }
              className="w-full p-4 bg-gray-50 rounded-2xl"
            >
              <option value="">Want Children?</option>
              <option>Yes</option>
              <option>No</option>
              <option>Maybe</option>
            </select>
            <input
              type="text"
              placeholder="Height (e.g. 5'7)"
              value={formData.height || ""}
              onChange={(e) =>
                setFormData({ ...formData, height: e.target.value })
              }
              className="w-full p-4 bg-gray-50 rounded-2xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <select
              value={formData.bodyType || ""}
              onChange={(e) =>
                setFormData({ ...formData, bodyType: e.target.value })
              }
              className="w-full p-4 bg-gray-50 rounded-2xl"
            >
              <option value="">Body Type</option>
              {BODY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Complexion"
              value={formData.complexion || ""}
              onChange={(e) =>
                setFormData({ ...formData, complexion: e.target.value })
              }
              className="w-full p-4 bg-gray-50 rounded-2xl"
            />
          </div>

          <input
            type="text"
            placeholder="Languages (comma separated)"
            value={formData.languages || ""}
            onChange={(e) =>
              setFormData({ ...formData, languages: e.target.value })
            }
            className="w-full p-4 bg-gray-50 rounded-2xl"
          />

          <div className="grid grid-cols-2 gap-4">
            <select
              value={formData.smoking || ""}
              onChange={(e) =>
                setFormData({ ...formData, smoking: e.target.value })
              }
              className="w-full p-4 bg-gray-50 rounded-2xl"
            >
              <option value="">Smoking</option>
              <option>No</option>
              <option>Yes</option>
            </select>
            <select
              value={formData.alcohol || ""}
              onChange={(e) =>
                setFormData({ ...formData, alcohol: e.target.value })
              }
              className="w-full p-4 bg-gray-50 rounded-2xl"
            >
              <option value="">Alcohol</option>
              <option>No</option>
              <option>Occasionally</option>
              <option>Yes</option>
            </select>
          </div>
        </div>

        {/* Education & Work */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">
            C. Education & Work
          </h3>
          <select
            value={formData.education || ""}
            onChange={(e) =>
              setFormData({ ...formData, education: e.target.value })
            }
            className="w-full p-4 bg-gray-50 rounded-2xl"
          >
            <option value="">Education Level</option>
            {EDUCATION_LEVELS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Occupation"
              value={formData.occupation || formData.profession || ""}
              onChange={(e) =>
                setFormData({ ...formData, occupation: e.target.value })
              }
              className="w-full p-4 bg-gray-50 rounded-2xl"
            />
            <input
              type="text"
              placeholder="Income Range"
              value={formData.incomeRange || ""}
              onChange={(e) =>
                setFormData({ ...formData, incomeRange: e.target.value })
              }
              className="w-full p-4 bg-gray-50 rounded-2xl"
            />
          </div>
        </div>

        {/* Relationship Intentions */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">
            D. Relationship Intentions
          </h3>
          <select
            value={formData.intentions || formData.lookingFor || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                intentions: e.target.value,
                lookingFor: e.target.value,
              })
            }
            className="w-full p-4 bg-gray-50 rounded-2xl"
          >
            <option value="">What are you looking for?</option>
            {INTENTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-4">
            <select
              value={formData.intendToMarry || ""}
              onChange={(e) =>
                setFormData({ ...formData, intendToMarry: e.target.value })
              }
              className="w-full p-4 bg-gray-50 rounded-2xl"
            >
              <option value="">Intend to Marry?</option>
              <option>Yes</option>
              <option>No</option>
            </select>
            <select
              value={formData.willingToRelocate || ""}
              onChange={(e) =>
                setFormData({ ...formData, willingToRelocate: e.target.value })
              }
              className="w-full p-4 bg-gray-50 rounded-2xl"
            >
              <option value="">Willing to Relocate?</option>
              <option>Yes</option>
              <option>No</option>
              <option>Maybe</option>
            </select>
          </div>
        </div>

        {/* Partner Preferences */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">
            Partner Preferences
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="number"
              placeholder="Min Age"
              value={formData.preferredAgeMin || ""}
              onChange={(e) =>
                setFormData({ ...formData, preferredAgeMin: e.target.value })
              }
              className="w-full p-4 bg-gray-50 rounded-2xl"
            />
            <input
              type="number"
              placeholder="Max Age"
              value={formData.preferredAgeMax || ""}
              onChange={(e) =>
                setFormData({ ...formData, preferredAgeMax: e.target.value })
              }
              className="w-full p-4 bg-gray-50 rounded-2xl"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-gray-400 ml-2">
              Preferred Location (Select all that apply)
            </label>
            <div className="flex flex-wrap gap-2">
              {["Same region", "Anywhere in Ghana", "Outside Ghana"].map((loc) => {
                const currentLocs = formData.preferredLocation 
                  ? String(formData.preferredLocation).split(',').map((s: string) => s.trim()) 
                  : [];
                const isSelected = currentLocs.includes(loc);
                
                return (
                  <button
                    key={loc}
                    onClick={() => {
                      let newLocs = [...currentLocs];
                      if (isSelected) {
                        newLocs = newLocs.filter((l) => l !== loc);
                      } else {
                        newLocs.push(loc);
                      }
                      setFormData({ ...formData, preferredLocation: newLocs.join(',') });
                    }}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                      isSelected
                        ? "bg-brand-orange text-white border-brand-orange shadow-md"
                        : "bg-white text-gray-400 border-gray-200 hover:border-brand-orange hover:text-brand-orange"
                    }`}
                  >
                    {loc}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <select
              value={formData.preferredDenomination || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  preferredDenomination: e.target.value,
                })
              }
              className="w-full p-4 bg-gray-50 rounded-2xl"
            >
              <option value="">Pref. Denomination</option>
              <option value="Any">Any</option>
              {DENOMINATIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Pref. Ethnic Group"
              value={formData.preferredEthnicGroup || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  preferredEthnicGroup: e.target.value,
                })
              }
              className="w-full p-4 bg-gray-50 rounded-2xl"
            />
          </div>

          <textarea
            placeholder="Deal Breakers"
            value={formData.dealBreakers || ""}
            onChange={(e) =>
              setFormData({ ...formData, dealBreakers: e.target.value })
            }
            className="w-full p-4 bg-gray-50 rounded-2xl h-24"
          />
        </div>

        {/* Sensitive Info */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">
            Sensitive Information (Private)
          </h3>
          <textarea
            placeholder="Health conditions (optional)"
            value={formData.healthCondition || ""}
            onChange={(e) =>
              setFormData({ ...formData, healthCondition: e.target.value })
            }
            className="w-full p-4 bg-gray-50 rounded-2xl h-24"
          />
          <textarea
            placeholder="Lifestyle / Values note"
            value={formData.lifestyleInfo || ""}
            onChange={(e) =>
              setFormData({ ...formData, lifestyleInfo: e.target.value })
            }
            className="w-full p-4 bg-gray-50 rounded-2xl h-24"
          />
        </div>
      </div>

      {/* Bottom ribbon + heart overlay: form content scrolls beneath this. */}
      <div
        aria-hidden
        className="cmg-edit-bottom-ribbon pointer-events-none absolute inset-x-0 bottom-0 z-30"
      ></div>
      
      {croppingImage && (
        <ImageCropper
          imageSrc={croppingImage}
          aspectRatio={
            croppingType === "cover"
              ? 1.77
              : croppingType === "profile"
              ? 1
              : 0.75
          }
          onCancel={() => {
            setCroppingImage(null);
            setCroppingType(null);
          }}
          onCrop={async (croppedDataUrl) => {
            const type = croppingType;
            setCroppingImage(null);
            setCroppingType(null);
            if (type) {
              await uploadCroppedPhoto(croppedDataUrl, type);
            }
          }}
        />
      )}
    </div>
  );
};

const ProfileView = ({
  user,
  onEdit,
  onLogout,
  onDeleteAccount,
  onOpenPayment,
  onOpenCommunity,
}: {
  user: User;
  onEdit: () => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
  onOpenPayment?: () => void;
  onOpenCommunity?: () => void;
}) => {
  const strength = calculateProfileStrength(user);
  const [showSettings, setShowSettings] = React.useState(false);
  const [isDarkMode, setIsDarkMode] = React.useState(false);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleReport = () => {
    // In a real app, open a modal or navigation
    alert("Report submitted! We will review this issue shortly.");
  };

  return (
    <div
      className={`h-full flex flex-col bg-transparent relative overflow-hidden ${
        isDarkMode ? "dark:bg-gray-900" : ""
      }`}
    >
      {/* Settings Modal/Dropdown */}
      {showSettings && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setShowSettings(false)}
          ></div>
          <div className="absolute top-16 right-6 z-50 bg-white rounded-2xl shadow-2xl p-2 w-56 border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => {
                setShowSettings(false);
                onEdit();
              }}
              className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 text-gray-700 font-bold text-sm"
            >
              <Edit2 size={16} /> Edit Profile
            </button>
            {onOpenCommunity && (
              <>
                <div className="h-px bg-gray-100 my-1"></div>
                <button
                  onClick={() => {
                    setShowSettings(false);
                    onOpenCommunity();
                  }}
                  className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 text-gray-700 font-bold text-sm"
                >
                  <BookOpen size={16} /> Daily Word & Prayer Wall
                </button>
              </>
            )}
            <div className="h-px bg-gray-100 my-1"></div>
            <button
              onClick={toggleDarkMode}
              className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 text-gray-700 font-bold text-sm justify-between"
            >
              <div className="flex items-center gap-3">
                <Moon size={16} /> Dark Mode
              </div>
              <div
                className={`w-8 h-4 rounded-full transition-colors relative ${
                  isDarkMode ? "bg-brand-orange" : "bg-gray-200"
                }`}
              >
                <div
                  className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all ${
                    isDarkMode ? "left-[18px]" : "left-0.5"
                  }`}
                ></div>
              </div>
            </button>
            <div className="h-px bg-gray-100 my-1"></div>
            <button
              onClick={handleReport}
              className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 text-gray-700 font-bold text-sm"
            >
              <Flag size={16} /> Report a Problem
            </button>
            <div className="h-px bg-gray-100 my-1"></div>
            <button
              onClick={onLogout}
              className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 text-gray-700 font-bold text-sm"
            >
              <LogOut size={16} /> Log Out
            </button>
            <div className="h-px bg-gray-100 my-1"></div>
            <button
              onClick={onDeleteAccount}
              className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 text-red-500 font-bold text-sm"
            >
              <Trash2 size={16} /> Delete Account
            </button>
          </div>
        </>
      )}

      {/* Fixed header: centered brand logo with merged settings + logout actions. */}
      <div className="shrink-0 relative z-30 px-5 pt-5 pb-2">
        <div className="relative flex items-center justify-center">
          <Logo size={64} className="drop-shadow-lg rounded-full" />
          <div className="absolute right-0 flex gap-2">
            <button
              title="Settings"
              aria-label="Settings"
              onClick={() => setShowSettings(!showSettings)}
              className="p-2.5 bg-white/90 text-brand-blue rounded-full border border-gray-100 shadow-lg active:scale-90 transition-transform hover:bg-white"
            >
              <Settings size={18} />
            </button>
            <button
              title="Log out"
              aria-label="Log out"
              onClick={onLogout}
              className="p-2.5 bg-white/90 text-brand-blue rounded-full border border-gray-100 shadow-lg active:scale-90 transition-transform hover:bg-white"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto pb-40 hide-scrollbar relative z-10">
      {/* Cover photo card with overlapping profile photo, within the cream body. */}
      <div className="px-6 pt-4">
        <div className="relative rounded-3xl overflow-hidden h-40 bg-brand-blue shadow-lg">
          <img
            src={user.photos?.[1] || user.photos?.[0] || 'https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?w=800&h=600&fit=crop'}
            className="w-full h-full object-cover opacity-90"
            alt="Cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
        </div>
        <div className="flex justify-center -mt-14">
          <div className="border-4 border-white rounded-full overflow-hidden w-28 h-28 shadow-[0_15px_40px_rgba(0,0,0,0.25)] bg-white z-20">
            <img
              src={user.photos?.[0] || 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=400&h=400&fit=crop'}
              className="w-full h-full object-cover"
              alt="Profile"
            />
          </div>
        </div>
      </div>

      <div className="pt-4 p-8 space-y-8 pb-32">
        {/* Identity Title */}
        <div className="text-center relative">
          <h1 className="text-3xl font-black text-gray-900 flex items-center justify-center gap-3 tracking-tighter">
            {user.name}
            {user.isVerified && (
              <div className="text-blue-500 bg-blue-50 p-1 rounded-full">
                <CheckCircle size={18} />
              </div>
            )}
          </h1>
          <p className="text-gray-400 font-bold flex items-center justify-center gap-2 uppercase tracking-widest text-[10px] mt-2 italic">
            <MapPin size={14} className="text-brand-orange" /> {user.location}
          </p>
          {strength.percentage < 100 && (
            <div className="absolute -top-1 right-0 bg-brand-orange/10 text-brand-orange px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
              <Award size={10} /> {strength.percentage}% Built
            </div>
          )}
        </div>

        {/* Profile Completeness Indicator (Gamified) */}
        {strength.percentage < 100 ? (
          <div className="bg-white p-7 rounded-[3rem] shadow-[0_20px_40px_rgba(0,0,0,0.03)] border border-orange-100/40 animate-in slide-in-from-top duration-700 relative overflow-hidden group">
            {/* Background Polish */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-orange/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-1000"></div>

            <div className="relative z-10">
              <div className="flex justify-between items-center mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-brand-orange/10 rounded-xl">
                    <TrendingUp size={18} className="text-brand-orange" />
                  </div>
                  <div>
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Complete Your Profile
                    </h3>
                    <p className="text-[11px] font-bold text-gray-600">
                      Add missing details to get verified
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-brand-orange bg-orange-50 px-4 py-1.5 rounded-full shadow-sm">
                    {strength.percentage}%
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-gray-50 rounded-full mb-8 overflow-hidden">
                <div
                  role="progressbar"
                  aria-label="Profile completeness"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(strength.percentage)}
                  className="h-full bg-gradient-to-r from-brand-orange via-orange-400 to-brand-gold transition-all duration-1000 ease-out rounded-full shadow-[0_0_10px_rgba(255,122,0,0.2)] profile-progress-fill"
                  style={{
                    ["--profile-width" as any]: `${strength.percentage}%`,
                  }}
                ></div>
              </div>

              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[9px] font-black text-gray-300 uppercase tracking-[0.2em] px-1">
                  Boost Your Visibility
                </h4>
                <Sparkles size={14} className="text-brand-gold animate-pulse" />
              </div>

              {/* Suggestions Grid */}
              <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
                {strength.suggestions.map((s, i) => (
                  <button
                    key={i}
                    title={"Add " + s}
                    onClick={onEdit}
                    className="shrink-0 px-5 py-3 bg-brand-orange text-white rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-brand-orange/20 border border-white/20"
                  >
                    <PlusCircle size={14} strokeWidth={3} />
                    Add {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 rounded-[2.5rem] shadow-xl text-white flex items-center justify-between animate-in zoom-in duration-500">
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">
                Spiritually Solid
              </h3>
              <p className="font-bold text-sm">
                Your profile is 100% complete!
              </p>
            </div>
            <div className="bg-white/20 p-3 rounded-2xl">
              <CheckCircle size={28} />
            </div>
          </div>
        )}

        {/* Subscription Status Card */}
        {isSubscriptionActive(user) ? (
          <div className="bg-gradient-to-br from-brand-blue to-blue-900 p-6 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden group">
            <div className="absolute right-0 bottom-0 w-32 h-32 bg-white/5 rounded-full translate-x-10 translate-y-10 group-hover:scale-110 transition-transform duration-1000"></div>
            <div className="relative z-10 flex justify-between items-center">
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/30">
                  ● Active Subscription
                </span>
                <h3 className="text-lg font-black tracking-tight mt-3">
                  {user.subscriptionType === '12months'
                    ? '12 Months Premium'
                    : user.subscriptionType === '6months'
                      ? '6 Months Premium'
                      : 'Free Premium Access'}
                </h3>
                <p className="text-xs text-blue-200">
                  Expires on {
                    (() => {
                      try {
                        const rawEnd = user.subscriptionEndDate as any;
                        const dateObj = (rawEnd && typeof rawEnd.toDate === 'function') ? rawEnd.toDate() : new Date(rawEnd);
                        return dateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
                      } catch(e) {
                        return 'Unknown';
                      }
                    })()
                  }
                </p>
                <p className="text-[10px] text-blue-300 font-bold uppercase tracking-widest mt-1">
                  {
                    (() => {
                      try {
                        const rawEnd = user.subscriptionEndDate as any;
                        const dateObj = (rawEnd && typeof rawEnd.toDate === 'function') ? rawEnd.toDate() : new Date(rawEnd);
                        return Math.max(0, Math.ceil((dateObj.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
                      } catch(e) {
                        return 0;
                      }
                    })()
                  } Days Remaining
                </p>
              </div>
              {onOpenPayment && (
                <button
                  onClick={onOpenPayment}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-black uppercase tracking-widest border border-white/15 active:scale-95 transition-all"
                >
                  Renew
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-red-100/50 relative overflow-hidden group">
            <div className="absolute right-0 bottom-0 w-32 h-32 bg-red-500/5 rounded-full translate-x-10 translate-y-10 group-hover:scale-110 transition-transform duration-1000"></div>
            <div className="relative z-10 flex justify-between items-center gap-4">
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-widest bg-red-100 text-red-500 px-3 py-1 rounded-full">
                  Inactive / Expired
                </span>
                <h3 className="text-lg font-black text-gray-900 tracking-tight mt-3">No Active Plan</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Subscribe to a plan to start chatting and calling with potential matches.
                </p>
              </div>
              {onOpenPayment && (
                <button
                  onClick={onOpenPayment}
                  className="shrink-0 px-5 py-3 bg-brand-orange text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-brand-orange/20 border border-white/20"
                >
                  Subscribe
                </button>
              )}
            </div>
          </div>
        )}

        {/* Faith Walk Quote */}
        <div className="bg-white p-7 rounded-[2.5rem] shadow-sm border border-gray-100 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-brand-orange opacity-20 group-hover:opacity-100 transition-opacity"></div>
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 px-1">
            Walk with Christ
          </h3>
          <p className="text-gray-700 italic leading-relaxed text-[15px] font-bold border-l-4 border-brand-orange pl-5 bg-brand-surface/50 py-6 rounded-r-3xl">
            "
            {user.faithStatement ||
              "Growing daily in the grace of our Lord and Savior."}
            "
          </p>
        </div>

        {/* Profile Sections matching signup structure */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
              A. Basic Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[11px] text-gray-500 font-black">Name</div>
                <div className="text-sm font-bold text-gray-900">
                  {(user as any).firstName
                    ? `${(user as any).firstName} ${
                        (user as any).surname || ""
                      }`
                    : user.name}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-gray-500 font-black">
                  Telephone
                </div>
                <div className="text-sm font-bold text-gray-900">
                  {user.phone || "-"}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-gray-500 font-black">
                  Date of Birth
                </div>
                <div className="text-sm font-bold text-gray-900">
                  {(user as any).dob || "-"}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-gray-500 font-black">
                  Gender
                </div>
                <div className="text-sm font-bold text-gray-900">
                  {(user as any).gender || user.gender || "-"}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-gray-500 font-black">
                  Location
                </div>
                <div className="text-sm font-bold text-gray-900">
                  {(user as any).city || user.location || "-"}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-gray-500 font-black">
                  Church
                </div>
                <div className="text-sm font-bold text-gray-900">
                  {(user as any).church || user.churchName || "-"}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-gray-500 font-black">
                  Denomination
                </div>
                <div className="text-sm font-bold text-gray-900">
                  {(user as any).denomination || user.denomination || "-"}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
              B. Personal & Lifestyle
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[11px] text-gray-500 font-black">
                  Marital Status
                </div>
                <div className="text-sm font-bold text-gray-900">
                  {(user as any).maritalStatus || "-"}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-gray-500 font-black">
                  Children
                </div>
                <div className="text-sm font-bold text-gray-900">
                  {(user as any).hasChildren || "-"}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-gray-500 font-black">
                  Want Children
                </div>
                <div className="text-sm font-bold text-gray-900">
                  {(user as any).wantChildren || "-"}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-gray-500 font-black">
                  Height
                </div>
                <div className="text-sm font-bold text-gray-900">
                  {(user as any).height || user.height || "-"}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-gray-500 font-black">
                  Body Type
                </div>
                <div className="text-sm font-bold text-gray-900">
                  {(user as any).bodyType || "-"}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-gray-500 font-black">
                  Complexion
                </div>
                <div className="text-sm font-bold text-gray-900">
                  {(user as any).complexion || "-"}
                </div>
              </div>
              <div className="col-span-2">
                <div className="text-[11px] text-gray-500 font-black">
                  Languages
                </div>
                <div className="text-sm font-bold text-gray-900">
                  {(user as any).languages || "-"}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-gray-500 font-black">
                  Smoking
                </div>
                <div className="text-sm font-bold text-gray-900">
                  {typeof (user as any).smoking === 'boolean' ? ((user as any).smoking ? 'Yes' : 'No') : ((user as any).smoking || "-")}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-gray-500 font-black">
                  Alcohol
                </div>
                <div className="text-sm font-bold text-gray-900">
                  {(user as any).alcohol || (typeof (user as any).drinking === 'boolean' ? ((user as any).drinking ? 'Yes' : 'No') : "-")}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
              C. Education & Work
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[11px] text-gray-500 font-black">
                  Education
                </div>
                <div className="text-sm font-bold text-gray-900">
                  {(user as any).education || user.education || "-"}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-gray-500 font-black">
                  Occupation
                </div>
                <div className="text-sm font-bold text-gray-900">
                  {(user as any).occupation || user.profession || "-"}
                </div>
              </div>
              <div className="col-span-2">
                <div className="text-[11px] text-gray-500 font-black">
                  Income Range
                </div>
                <div className="text-sm font-bold text-gray-900">
                  {(user as any).incomeRange || "-"}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
              D. Relationship Intentions
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[11px] text-gray-500 font-black">
                  Looking For
                </div>
                <div className="text-sm font-bold text-gray-900">
                  {(user as any).lookingFor || user.intentions || "-"}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-gray-500 font-black">
                  Intend to Marry?
                </div>
                <div className="text-sm font-bold text-gray-900">
                  {(user as any).intendToMarry || "-"}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-gray-500 font-black">
                  Willing to Relocate?
                </div>
                <div className="text-sm font-bold text-gray-900">
                  {(user as any).willingToRelocate || "-"}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
              Partner Preferences
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[11px] text-gray-500 font-black">
                  Preferred Age
                </div>
                <div className="text-sm font-bold text-gray-900">
                  {(user as any).preferredAgeMin || "-"} -{" "}
                  {(user as any).preferredAgeMax || "-"}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-gray-500 font-black">
                  Preferred Location
                </div>
                <div className="text-sm font-bold text-gray-900">
                  {(user as any).preferredLocation || "-"}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-gray-500 font-black">
                  Preferred Denomination
                </div>
                <div className="text-sm font-bold text-gray-900">
                  {(user as any).preferredDenomination || "-"}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-gray-500 font-black">
                  Preferred Ethnic Group
                </div>
                <div className="text-sm font-bold text-gray-900">
                  {(user as any).preferredEthnicGroup || "-"}
                </div>
              </div>
              <div className="col-span-2">
                <div className="text-[11px] text-gray-500 font-black">
                  Deal Breakers
                </div>
                <div className="text-sm font-bold text-gray-900">
                  {(user as any).dealBreakers || "-"}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
              Sensitive Information
            </h3>
            <div className="text-sm text-gray-700">
              {(user as any).healthCondition || "-"}
            </div>
            <div className="text-sm text-gray-700 mt-3">
              {(user as any).lifestyleInfo || "-"}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
              Media
            </h3>
            <div className="grid grid-cols-5 gap-2">
              {((user as any).displayPhotos || user.photos?.slice(2) || [])
                .filter((p: string) => p && p.trim() !== "")
                .map((p: string, i: number) => (
                  <div
                    key={i}
                    className="aspect-[3/4] rounded-2xl overflow-hidden bg-gray-100"
                  >
                    <img
                      src={p}
                      className="w-full h-full object-cover"
                      alt={`Photo ${i + 1}`}
                    />
                  </div>
                ))}
              {!(
                (user as any).displayPhotos ||
                user.photos?.slice(2) ||
                []
              ).filter((p: string) => p && p.trim() !== "").length && (
                <p className="col-span-5 text-gray-400 text-xs italic">
                  No gallery photos added.
                </p>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
              Terms & Confirmations
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Terms Accepted:</span>
                <span className={`text-sm font-bold ${user.termsAccepted ? 'text-green-600' : 'text-red-600'}`}>
                  {user.termsAccepted ? 'Yes' : 'No'}
                </span>
              </div>
              {user.termsAcceptedAt && (
                <div className="text-xs text-gray-400">
                  Accepted on: {new Date(user.termsAcceptedAt).toLocaleDateString()}
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Agrees to Values:</span>
                <span className={`text-sm font-bold ${user.termsAccepted ? 'text-green-600' : 'text-red-600'}`}>
                  {user.termsAccepted ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Base ribbon + heart overlay (reduced height to leave room for the nav). */}
      <div
        aria-hidden
        className="cmg-profile-bottom-ribbon pointer-events-none absolute inset-x-0 bottom-0 z-20"
      ></div>
    </div>
  );
};


const MessageThreadView = ({
  thread,
  chatId,
  onBack,
  onStartCall,
  currentUserId,
  onBlock,
  currentUser,
  onOpenPayment,
}: {
  thread: ChatThread;
  chatId: string;
  onBack: () => void;
  onStartCall: (video: boolean) => void;
  currentUserId?: string;
  onBlock?: (userId: string) => void;
  currentUser?: User | null;
  onOpenPayment?: () => void;
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [isPartnerOnline, setIsPartnerOnline] = useState(false);

  const [partnerProfile, setPartnerProfile] = useState<User | null>(null);

  // Subscribe to partner's online presence and profile status
  useEffect(() => {
    if (!thread.partnerId) return;

    let unsubscribe: (() => void) | undefined;

    const listenToPartnerStatus = async () => {
      try {
        const { doc, onSnapshot } = await import('firebase/firestore');
        const { db } = await import('./firebase');
        const partnerRef = doc(db, 'users', thread.partnerId);
        unsubscribe = onSnapshot(partnerRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as User;
            setIsPartnerOnline(!!data.isOnline);
            setPartnerProfile(data);
          }
        });
      } catch (err) {
        console.error('Error listening to partner online status:', err);
      }
    };

    listenToPartnerStatus();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [thread.partnerId]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Subscribe to real-time messages
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setupSubscription = async () => {
      try {
        const { subscribeToMessages, markMessagesAsRead } = await import('./services/chatService');
        
        unsubscribe = subscribeToMessages(chatId, (updatedMessages: Message[]) => {
          console.log('💬 Messages updated:', updatedMessages.length);
          setMessages(updatedMessages);
        });

        // Mark messages as read when viewing
        if (currentUserId) {
          await markMessagesAsRead(chatId, currentUserId);
        }
      } catch (error) {
        console.error('❌ Error subscribing to messages:', error);
      }
    };

    setupSubscription();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [chatId, currentUserId]);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, replyingTo]);

  const handleSend = async (
    e?: React.FormEvent, 
    customMessage?: { type: string; text?: string; file?: File; location?: any }
  ) => {
    if (e) e.preventDefault();
    
    // Validation
    if ((!input.trim() && !customMessage) || !currentUserId || isSending) return;

    setIsSending(true);
    const messageText = customMessage?.text || input;
    const currentReply = replyingTo;
    
    // Only clear input if sending text
    if (!customMessage) {
      setInput(""); 
      setReplyingTo(null);
    }
    setShowAttachMenu(false);

    try {
      const { sendMessage } = await import('./services/chatService');
      
      let messageData: any = {
        text: messageText,
        type: customMessage?.type || 'text',
      };

      // Handle File Uploads
      if (customMessage?.file) {
        const { uploadFile } = await import('./services/fileStorageService');
        const fileType = customMessage.type === 'image' ? 'gallery_photo' : 'other'; // simple mapping
        
        // Notify uploading
        // In a real app we'd show a progress bar
        
        const fileMeta = await uploadFile(currentUserId, customMessage.file, fileType);
        
        messageData.fileUrl = fileMeta.downloadURL;
        messageData.fileName = customMessage.file.name;
        messageData.fileSize = (customMessage.file.size / 1024).toFixed(1) + ' KB';
        messageData.text = customMessage.type === 'image' ? '📷 Photo' : '📎 File';
      }

      // Handle Location
      if (customMessage?.location) {
        messageData.location = customMessage.location;
        messageData.text = '📍 Location';
      }

      if (currentReply) {
        messageData.replyTo = {
          id: currentReply.id,
          text: currentReply.text,
          senderName: currentReply.senderId === currentUserId ? 'You' : (thread.partnerName || 'Partner'),
        };
      }

      await sendMessage(chatId, currentUserId, messageData);
      console.log('✅ Message sent successfully');
    } catch (error) {
      console.error('❌ Error sending message:', error);
      if (!customMessage) {
        setInput(messageText); 
        setReplyingTo(currentReply);
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleBlockUser = async () => {
    setShowMenu(false);
    if (onBlock && currentUserId) {
      onBlock(thread.partnerId);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'file') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check size limit (e.g. 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("File too large. Max 10MB.");
      return;
    }

    handleSend(undefined, { type, file });
    if (e.target) e.target.value = ''; // Reset input
  };

  const handleLocationShare = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        handleSend(undefined, {
          type: 'location',
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }
        });
      },
      (error) => {
        console.error("Error getting location", error);
        alert("Unable to retrieve your location");
      }
    );
  };
  
  const handleLiveLocationShare = () => {
      if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    
    // For MVP, strictly send current location but marked as live
    // In full implementation, this would trigger a background watcher
    navigator.geolocation.getCurrentPosition(
      (position) => {
        handleSend(undefined, {
          type: 'live_location',
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            isLive: true
          }
        });
      },
      (error) => {
         alert("Unable to retrieve your location");
      }
    );
  };


  return (
    <div className="h-full flex flex-col bg-gray-50 animate-in slide-in-from-right duration-300 relative" onClick={() => setActiveMessageId(null)}>
      {/* Settings Menu */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setShowMenu(false)}
          ></div>
          <div className="absolute top-16 right-6 z-50 bg-white rounded-2xl shadow-2xl p-2 w-48 border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => {
                setShowMenu(false);
                alert("Report submitted.");
              }}
              className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 text-gray-700 font-bold text-sm"
            >
              <Flag size={16} /> Report User
            </button>
            <div className="h-px bg-gray-100 my-1"></div>
            <button
              onClick={handleBlockUser}
              className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 text-red-500 font-bold text-sm"
            >
              <X size={16} /> Block User
            </button>
          </div>
        </>
      )}

      {/* Attach Menu */}
      {showAttachMenu && (
        <>
            <div
            className="fixed inset-0 z-40 bg-transparent"
            onClick={() => setShowAttachMenu(false)}
          ></div>
          <div className="absolute bottom-24 left-4 z-50 bg-white rounded-3xl shadow-2xl p-4 w-64 border border-gray-100 animate-in slide-in-from-bottom-4 duration-200 grid grid-cols-2 gap-4">
             <button onClick={() => imageInputRef.current?.click()} className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-blue-50 transition-colors group">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                   <ImageIcon size={24} />
                </div>
                <span className="text-xs font-bold text-gray-600">Photo</span>
             </button>
             <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-purple-50 transition-colors group">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                   <FileText size={24} />
                </div>
                <span className="text-xs font-bold text-gray-600">Document</span>
             </button>
             <button onClick={handleLocationShare} className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-green-50 transition-colors group">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform">
                   <MapPin size={24} />
                </div>
                <span className="text-xs font-bold text-gray-600">Location</span>
             </button>
             <button onClick={handleLiveLocationShare} className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-red-50 transition-colors group">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 group-hover:scale-110 transition-transform">
                   <Users size={24} />
                </div>
                <span className="text-xs font-bold text-gray-600">Live</span>
             </button>
          </div>
        </>
      )}
      
      {/* Hidden Inputs */}
      <input type="file" ref={imageInputRef} accept="image/*" className="hidden" onChange={(e) => handleFileSelect(e, 'image')} />
      <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => handleFileSelect(e, 'file')} />

      <div className="bg-white p-3 pt-12 border-b flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            title="Back"
            aria-label="Back"
            className="p-2 text-gray-500 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="w-10 h-10 rounded-2xl bg-gray-200 overflow-hidden shadow-inner ring-1 ring-gray-100">
            <img
              src={thread.partnerPhoto || `https://picsum.photos/200?random=${thread.partnerId}`}
              className="w-full h-full object-cover"
              alt={`${thread.partnerName || 'Partner'} avatar`}
            />
          </div>
          <div>
            <h3 className="font-bold text-sm text-gray-900">
              {thread.partnerName || `Partner ${thread.partnerId}`}
            </h3>
            <p className={`text-[9px] font-black uppercase tracking-widest ${isPartnerOnline ? 'text-green-500' : 'text-gray-400'}`}>
              {isPartnerOnline ? 'Active now' : 'Offline'}
            </p>
          </div>
        </div>
        <div className="flex gap-2 mr-2">
          <button
            title="Start voice call"
            onClick={() => {
              if (isSubscriptionActive(currentUser) || isSubscriptionActive(partnerProfile)) {
                onStartCall(false);
              } else if (onOpenPayment) {
                onOpenPayment();
              }
            }}
            className="p-3 text-brand-blue bg-brand-surface rounded-2xl shadow-sm hover:text-brand-orange transition-colors"
          >
            <Phone size={20} />
          </button>
          <button
            title="Start video call"
            onClick={() => {
              if (isSubscriptionActive(currentUser) || isSubscriptionActive(partnerProfile)) {
                onStartCall(true);
              } else if (onOpenPayment) {
                onOpenPayment();
              }
            }}
            className="p-3 text-brand-blue bg-brand-surface rounded-2xl shadow-sm hover:text-brand-orange transition-colors"
          >
            <Video size={20} />
          </button>
          <button
            title="More options"
            onClick={() => setShowMenu(!showMenu)}
            className="p-3 text-brand-blue bg-brand-surface rounded-2xl shadow-sm hover:text-brand-orange transition-colors"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto p-4 space-y-6 hide-scrollbar"
        ref={scrollRef}
      >
        {messages.map((m) => {
          const isMe = m.senderId === currentUserId || m.senderId === "me";
          const isActive = activeMessageId === m.id;
          
          return (
            <div
              key={m.id}
              className={`flex flex-col ${
                isMe ? "items-end" : "items-start"
              } animate-in fade-in slide-in-from-bottom-2 duration-300 relative group`}
            >
              {}
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMessageId(isActive ? null : m.id);
                }}
                className={`max-w-[85%] p-4 rounded-[1.5rem] text-[15px] relative transition-all shadow-sm cursor-pointer active:scale-95 ${
                  isMe
                    ? "bg-brand-blue text-white rounded-tr-none"
                    : "bg-white text-gray-900 border border-gray-100 rounded-tl-none font-medium"
                }`}
              >
                {/* Quoted Message */}
                {m.replyTo && (
                  <div className={`mb-2 p-2 rounded-lg text-xs border-l-4 ${
                    isMe 
                      ? "bg-white/10 border-white/50 text-white/90" 
                      : "bg-gray-50 border-brand-orange text-gray-600"
                  }`}>
                    <p className="font-bold mb-0.5 opacity-75">{m.replyTo.senderName || 'Unknown'}</p>
                    <p className="line-clamp-2 italic">{m.replyTo.text}</p>
                  </div>
                )}
                
                {/* Message Content Based on Type */}
                {m.type === 'image' && m.fileUrl ? (
                    <div className="mb-1 rounded-xl overflow-hidden">
                        <img src={m.fileUrl} alt="Sent photo" className="max-w-full h-auto" loading="lazy" />
                    </div>
                ) : m.type === 'file' ? (
                    <div className="flex items-center gap-3 bg-black/5 p-3 rounded-xl mb-1">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                            <FileText size={20} className="text-brand-blue" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm truncate">{m.fileName || 'Document'}</p>
                            <p className="text-[10px] opacity-70">{m.fileSize || 'Unknown size'}</p>
                        </div>
                        {m.fileUrl && (
                            <a href={m.fileUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="p-2 bg-white rounded-full shadow-sm hover:scale-110 transition-transform">
                                <Upload size={16} className="rotate-180" />
                            </a>
                        )}
                    </div>
                ) : (m.type === 'location' || m.type === 'live_location') && m.location ? (
                    <div className="mb-1 overflow-hidden">
                         <div className="bg-gray-100 h-32 w-48 rounded-xl flex items-center justify-center relative mb-2">
                             <MapPin size={32} className="text-brand-orange animate-bounce" />
                             {m.type === 'live_location' && (
                                 <span className="absolute top-2 right-2 bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full animate-pulse shadow-lg">LIVE</span>
                             )}
                         </div>
                         <a 
                             href={`https://www.google.com/maps/search/?api=1&query=${m.location.latitude},${m.location.longitude}`} 
                             target="_blank" 
                             rel="noopener noreferrer"
                             onClick={(e) => e.stopPropagation()}
                             className="block w-full text-center text-xs font-bold underline opacity-90 hover:opacity-100"
                         >
                             View on Google Maps
                         </a>
                    </div>
                ) : (
                    m.text
                )}

                {/* Reply Popup Option */}
                {isActive && (
                  <div className={`absolute ${isMe ? "right-0" : "left-0"} -top-12 z-10 animate-in zoom-in-95 duration-200`}>
                     <div className="bg-gray-800 text-white rounded-xl shadow-xl p-1.5 flex gap-1">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setReplyingTo(m);
                            setActiveMessageId(null);
                            inputRef.current?.focus();
                          }}
                          className="px-3 py-1.5 hover:bg-white/20 rounded-lg text-xs font-bold flex items-center gap-1.5"
                        >
                          <RotateCcw size={12} className="scale-x-[-1]" /> Reply
                        </button>
                     </div>
                     {/* Triangle pointer */}
                     <div className={`absolute bottom-[-6px] ${isMe ? "right-6" : "left-6"} w-0 h-0 border-l-[6px] border-l-transparent border-t-[6px] border-t-gray-800 border-r-[6px] border-r-transparent`}></div>
                  </div>
                )}
              </div>
              
              <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                {m.timestamp}
              </div>
            </div>
          );
        })}
      </div>

      {isSubscriptionActive(currentUser) || isSubscriptionActive(partnerProfile) ? (
        <form
          onSubmit={(e) => handleSend(e)}
          className="p-4 bg-white border-t flex flex-col gap-2 pb-10"
        >
          {/* Reply Preview Banner */}
          {replyingTo && (
            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-2xl border-l-4 border-brand-orange animate-in slide-in-from-bottom duration-200 mb-2">
              <div className="flex-1 mr-4">
                <p className="text-[10px] font-black text-brand-orange uppercase tracking-widest mb-1">
                  Replying to {replyingTo.senderId === currentUserId ? 'yourself' : (thread.partnerName || 'Partner')}
                </p>
                <p className="text-gray-600 text-xs line-clamp-1">{replyingTo.text}</p>
              </div>
              <button 
                type="button"
                onClick={() => setReplyingTo(null)}
                className="p-1 text-gray-400 hover:text-gray-600 bg-gray-200 rounded-full"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div className="flex gap-2 items-center">
            <button 
              type="button" 
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              className={`p-3 rounded-2xl transition-all ${showAttachMenu ? 'bg-gray-200 text-gray-800 rotate-45' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
            >
               <PlusCircle size={22} />
            </button>
          
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                aria-label="Chat message input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full bg-gray-50 rounded-2xl pl-5 pr-12 py-4 text-sm outline-none focus:ring-2 focus:ring-brand-orange/20 text-gray-900 font-bold"
                placeholder={replyingTo ? "Type your reply..." : "Send a message..."}
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim()}
              title="Send message"
              aria-label="Send message"
              className="bg-brand-orange text-white p-4 rounded-2xl shadow-lg active:scale-90 transition-all"
            >
              <Send size={22} />
            </button>
          </div>
        </form>
      ) : (
        <div className="p-6 bg-white border-t flex flex-col items-center gap-3 text-center pb-12 shadow-[0_-5px_15px_rgba(0,0,0,0.03)] animate-in slide-in-from-bottom duration-300">
          <div className="w-10 h-10 bg-brand-orange/10 text-brand-orange rounded-full flex items-center justify-center">
            <Lock size={20} />
          </div>
          <div>
            <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">Chat Locked</h4>
            <p className="text-[11px] text-gray-500 mt-1 max-w-[260px] mx-auto leading-relaxed">
              Your subscription is not active. Subscribe to a plan to send messages and make calls to opposite-sex believers.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenPayment}
            className="w-full max-w-xs py-3.5 bg-brand-orange text-white rounded-xl text-xs font-black uppercase tracking-[0.15em] shadow-md hover:brightness-105 active:scale-95 transition-all"
          >
            Subscribe Now
          </button>
        </div>
      )}
    </div>
  );
};

// --- MAIN APP ---



// --- SHARED UI COMPONENTS ---

const PublicProfileView = ({
  profile,
  onBack,
  onConnect,
  currentUserId,
  onBlock,
}: {
  profile: any;
  onBack: () => void;
  onConnect: () => void;
  currentUserId?: string;
  onBlock?: (userId: string) => void;
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const handleBlockUser = () => {
    setShowMenu(false);
    if (onBlock && currentUserId) {
      onBlock(profile.id);
    } else {
      alert("User blocked.");
    }
  };

  return (
    <div className="h-full bg-gray-50 relative animate-in slide-in-from-bottom duration-300 z-50 flex flex-col">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto hide-scrollbar pb-24">
        {/* Action Menu */}
        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/20"
              onClick={() => setShowMenu(false)}
            ></div>
            <div className="absolute top-16 right-6 z-50 bg-white rounded-2xl shadow-2xl p-2 w-48 border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
              <button
                onClick={() => {
                  setShowMenu(false);
                  alert("Report submitted.");
                }}
                className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 text-gray-700 font-bold text-sm"
              >
                <Flag size={16} /> Report User
              </button>
              <div className="h-px bg-gray-100 my-1"></div>
              <button
                onClick={handleBlockUser}
                className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 text-red-500 font-bold text-sm"
              >
                <X size={16} /> Block User
              </button>
            </div>
          </>
        )}

        {/* Header / Cover */}
        <div className="relative h-80 bg-brand-blue shrink-0">
          <img
            src={profile.photos?.[1] || profile.photos?.[0]}
            className="w-full h-full object-cover opacity-90"
            alt="Cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>

          {/* Navigation Buttons */}
          <div className="absolute top-6 left-6 z-30">
            <button
              onClick={onBack}
              className="p-2.5 bg-black/20 rounded-full border border-white/20 backdrop-blur-md text-white hover:bg-black/30 transition-all active:scale-90"
            >
              <ArrowLeft size={20} />
            </button>
          </div>
          <div className="absolute top-6 right-6 z-30">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2.5 bg-black/20 rounded-full border border-white/20 backdrop-blur-md text-white hover:bg-black/30 transition-all active:scale-90"
            >
              <Settings size={20} />
            </button>
          </div>

          {/* Profile Photo */}
          <div className="absolute bottom-[-50px] left-1/2 -translate-x-1/2 border-4 border-white rounded-full overflow-hidden w-36 h-36 shadow-[0_15px_40px_rgba(0,0,0,0.3)] bg-white z-20">
            <img
              src={profile.photos?.[0]}
              className="w-full h-full object-cover"
              alt="Profile"
            />
          </div>
        </div>

        <div className="pt-16 p-8 space-y-8">
          {/* Name & Basic Info */}
          <div className="text-center">
            <h1 className="text-3xl font-black text-gray-900 flex items-center justify-center gap-2 mb-1 dark:text-white">
              {profile.name} <span className="font-medium text-2xl text-gray-400">, {profile.age}</span>
              {profile.isVerified && <CheckCircle size={24} className="text-blue-500 fill-blue-50" />}
            </h1>
            <div className="flex items-center justify-center gap-2 text-gray-500 font-bold text-xs uppercase tracking-widest mb-4">
              <MapPin size={12} /> {profile.location?.split(',')[0] || profile.location}
            </div>
            {/* Tags */}
            <div className="flex flex-wrap justify-center gap-2">
              <span className="px-4 py-1.5 bg-brand-orange/10 text-brand-orange rounded-full text-[10px] font-black uppercase tracking-widest border border-brand-orange/20">
                {profile.denomination}
              </span>
              <span className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">
                {profile.intentions}
              </span>
              {profile.height && (
                <span className="px-4 py-1.5 bg-gray-100 text-gray-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-gray-200">
                {profile.height} cm
              </span>
              )}
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">About Me</h3>
              <p className="text-gray-700 leading-relaxed font-medium text-sm dark:text-gray-300">"{profile.bio}"</p>
            </div>
          )}

          {/* Faith Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">Faith & Values</h3>
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm dark:bg-gray-800 dark:border-gray-700">
                  <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center text-purple-600 mb-3">
                      <Church size={20} />
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Congregation</p>
                  <p className="font-bold text-gray-800 text-sm mt-0.5 dark:text-gray-200">{profile.churchName || 'Not specified'}</p>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm dark:bg-gray-800 dark:border-gray-700">
                  <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center text-green-600 mb-3">
                      <BookOpen size={20} />
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Bible Reading</p>
                  <p className="font-bold text-gray-800 text-sm mt-0.5 dark:text-gray-200">{profile.bibleReadingFreq || 'Not specified'}</p>
                </div>
            </div>
            {profile.favoriteVerse && (
              <div className="bg-brand-surface p-6 rounded-[2rem] border-l-4 border-brand-orange dark:bg-gray-800 dark:border-brand-orange">
                  <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-2">Favorite Verse</p>
                  <p className="font-serif italic text-gray-800 text-lg dark:text-gray-200">"{profile.favoriteVerse}"</p>
              </div>
            )}
          </div>

          {/* Details: Education, Profession */}
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 space-y-4 dark:bg-gray-800 dark:border-gray-700">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Details</h3>
            
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 dark:bg-gray-700">
                  <Briefcase size={20} />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Profession</p>
                  <p className="font-bold text-gray-900 dark:text-white">{profile.profession || "Hidden"}</p>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 dark:bg-gray-700">
                  <GraduationCap size={20} />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Education</p>
                  <p className="font-bold text-gray-900 dark:text-white">{profile.education || "Hidden"}</p>
                </div>
            </div>
          </div>

          {/* Gallery Preview (Simple) */}
          {profile.photos?.length > 1 && (
            <div className="space-y-3">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">Gallery</h3>
              <div className="grid grid-cols-2 gap-3">
                {profile.photos.slice(1).map((photo: string, i: number) => (
                  <div key={i} className="rounded-2xl overflow-hidden h-40">
                    <img src={photo} className="w-full h-full object-cover" alt="Gallery" />
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="h-10"></div>
        </div>
      </div>

       {/* Sticky Bottom Action */}
       <div className="p-4 bg-transparent z-40 max-w-md mx-auto pointer-events-none mb-10">
          <button
            onClick={onConnect}
            className="w-full py-4 bg-brand-orange text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-brand-orange/20 active:scale-95 transition-all flex items-center justify-center gap-2 pointer-events-auto"
          >
            <MessageCircle size={20} /> Connect with {profile.name.split(' ')[0]}
          </button>
       </div>
    </div>
  );
};

const BrowseView = ({
  profiles,
  onMessage,
  currentUser,
}: {
  profiles: any[];
  onMessage: (id: string) => void;
  currentUser: User | null;
}) => {
  const [index, setIndex] = useState(0);
  const [viewingProfile, setViewingProfile] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter state
  const [filters, setFilters] = useState({
    churchAttendance: [] as string[],
    intentions: [] as string[],
    ageMin: 18,
    ageMax: 60,
    locationPreferences: [] as string[],
    faithMaturity: [] as string[],
    noDrinking: false,
    noSmoking: false,
    verifiedOnly: false,
  });

  // Apply filters to profiles
  const filteredProfiles = profiles.filter(profile => {
    // Strict Opposite Gender Filter (Male sees Female, Female sees Male)
    if (currentUser && currentUser.gender) {
      const userGenderLower = currentUser.gender.toLowerCase();
      const targetGenderLower = (profile.gender || '').toLowerCase();
      if (userGenderLower === 'male' && targetGenderLower !== 'female') {
        return false;
      }
      if (userGenderLower === 'female' && targetGenderLower !== 'male') {
        return false;
      }
    }

    // Location Preferences Filter
    if (filters.locationPreferences.length > 0 && currentUser) {
      const matchesPreference = filters.locationPreferences.some(pref => {
        if (pref === 'Same Country') {
          return profile.country === currentUser.country;
        }
        if (pref === 'Same Region') {
          return profile.location === currentUser.location;
        }
        if (pref === 'Different Country') {
            return profile.country !== currentUser.country;
        }
        return false;
      });
      
      if (!matchesPreference) return false;
    }

    // Church attendance filter
    if (filters.churchAttendance.length > 0 && !filters.churchAttendance.includes(profile.churchAttendance)) {
      return false;
    }
    
    // Intentions filter
    if (filters.intentions.length > 0 && !filters.intentions.includes(profile.intentions)) {
      return false;
    }
    
    // Age range filter
    if (profile.age < filters.ageMin || profile.age > filters.ageMax) {
      return false;
    }
    
    // Faith maturity filter
    if (filters.faithMaturity.length > 0 && !filters.faithMaturity.includes(profile.faithMaturity)) {
      return false;
    }
    
    // Lifestyle filters
    if (filters.noDrinking && profile.lifestyle?.drinking) {
      return false;
    }
    if (filters.noSmoking && profile.lifestyle?.smoking) {
      return false;
    }
    
    // Verified only filter
    if (filters.verifiedOnly && !profile.isVerified) {
      return false;
    }
    
    return true;
  });

  const profile = filteredProfiles[index];

  // Toggle filter option
  const toggleFilter = (filterKey: keyof typeof filters, value: any) => {
    setFilters(prev => {
      const currentValue = prev[filterKey];
      if (Array.isArray(currentValue)) {
        const newArray = currentValue.includes(value)
          ? currentValue.filter(v => v !== value)
          : [...currentValue, value];
        return { ...prev, [filterKey]: newArray };
      }
      return { ...prev, [filterKey]: value };
    });
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      churchAttendance: [],
      intentions: [],
      ageMin: 18,
      ageMax: 60,
      locationPreferences: [],
      faithMaturity: [],
      noDrinking: false,
      noSmoking: false,
      verifiedOnly: false,
    });
    setIndex(0);
  };

  // Count active filters
  const activeFilterCount = 
    filters.churchAttendance.length +
    filters.intentions.length +
    filters.faithMaturity.length +
    filters.locationPreferences.length +
    (filters.noDrinking ? 1 : 0) +
    (filters.noSmoking ? 1 : 0) +
    (filters.verifiedOnly ? 1 : 0) +
    (filters.ageMin !== 18 || filters.ageMax !== 60 ? 1 : 0);

  if (viewingProfile) {
    return (
      <PublicProfileView 
        profile={viewingProfile} 
        onBack={() => setViewingProfile(null)}
        onConnect={() => {
           onMessage(viewingProfile.id);
           setViewingProfile(null);
        }}
      />
    );
  }

  if (!profile)
    return (
      <div className="h-full flex items-center justify-center p-6 text-center text-gray-400">
        <div>
          <RotateCcw size={48} className="mx-auto mb-4 opacity-20" />
          {profiles.length === 0 ? (
            <>
              <p className="font-black uppercase tracking-widest text-xs">
                No users yet
              </p>
              <p className="text-xs mt-2 opacity-60">
                Check back later for new profiles
              </p>
            </>
          ) : (
            <>
              <p className="font-black uppercase tracking-widest text-xs">
                No profiles match your filters
              </p>
              <p className="text-xs mt-2 opacity-60">
                Try adjusting your search criteria
              </p>
              <button
                onClick={() => {
                  setIndex(0);
                  clearFilters();
                }}
                className="mt-4 text-brand-orange font-black underline uppercase text-[10px] tracking-widest"
              >
                Reset Filters
              </button>
            </>
          )}
        </div>
      </div>
    );

  return (
    <div className="h-full flex flex-col bg-transparent relative">
      {/* Filter Toggle Button */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="absolute top-4 right-4 z-30 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg flex items-center gap-2 border border-gray-200 active:scale-95 transition-all"
      >
        <Search size={16} className="text-brand-orange" />
        <span className="text-xs font-black uppercase tracking-wide text-gray-800">
          Filters
        </span>
        {activeFilterCount > 0 && (
          <span className="bg-brand-orange text-white text-[10px] font-black px-2 py-0.5 rounded-full">
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Filter Panel */}
      {showFilters && (
        <div className="absolute inset-0 z-40 bg-white flex flex-col animate-in slide-in-from-top duration-300">
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 pb-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-gray-900">
                    Search Filters
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    {filteredProfiles.length} profile{filteredProfiles.length !== 1 ? 's' : ''} found
                  </p>
                </div>
                <button
                  onClick={() => setShowFilters(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={24} className="text-gray-600" />
                </button>
              </div>

              {/* Location Preferences Filter */}
              <div className="mb-6">
                <h3 className="text-sm font-black uppercase tracking-wider text-gray-700 mb-3">
                  Location Preference
                </h3>
                <div className="flex flex-wrap gap-2">
                  {['Same Country', 'Same Region', 'Different Country'].map(pref => (
                    <button
                      key={pref}
                      onClick={() => toggleFilter('locationPreferences', pref)}
                      className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-all ${
                        filters.locationPreferences.includes(pref)
                          ? 'bg-brand-orange text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {pref}
                    </button>
                  ))}
                </div>
              </div>

              {/* Church Attendance Filter */}
              <div className="mb-6">
                <h3 className="text-sm font-black uppercase tracking-wider text-gray-700 mb-3">
                  Church Attendance
                </h3>
                <div className="flex flex-wrap gap-2">
                  {['Weekly', 'Multiple times a week', 'Irregular', 'Monthly'].map(freq => (
                    <button
                      key={freq}
                      onClick={() => toggleFilter('churchAttendance', freq)}
                      className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-all ${
                        filters.churchAttendance.includes(freq)
                          ? 'bg-brand-orange text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {freq}
                    </button>
                  ))}
                </div>
              </div>

              {/* Intentions Filter */}
              <div className="mb-6">
                <h3 className="text-sm font-black uppercase tracking-wider text-gray-700 mb-3">
                  Match Preferences
                </h3>
                <div className="flex flex-wrap gap-2">
                  {INTENTIONS.map(intention => (
                    <button
                      key={intention}
                      onClick={() => toggleFilter('intentions', intention)}
                      className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-all ${
                        filters.intentions.includes(intention)
                          ? 'bg-brand-orange text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {intention}
                    </button>
                  ))}
                </div>
              </div>

              {/* Faith Maturity Filter */}
              <div className="mb-6">
                <h3 className="text-sm font-black uppercase tracking-wider text-gray-700 mb-3">
                  Faith Maturity
                </h3>
                <div className="flex flex-wrap gap-2">
                  {['Growing', 'Mature', 'Leader'].map(maturity => (
                    <button
                      key={maturity}
                      onClick={() => toggleFilter('faithMaturity', maturity)}
                      className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-all ${
                        filters.faithMaturity.includes(maturity)
                          ? 'bg-brand-orange text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {maturity}
                    </button>
                  ))}
                </div>
              </div>

              {/* Age Range Filter */}
              <div className="mb-6">
                <h3 className="text-sm font-black uppercase tracking-wider text-gray-700 mb-3">
                  Age Range: {filters.ageMin} - {filters.ageMax}
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">
                      Min Age: {filters.ageMin}
                    </label>
                    <input
                      type="range"
                      min="18"
                      max="60"
                      value={filters.ageMin}
                      onChange={(e) => setFilters(prev => ({ 
                        ...prev, 
                        ageMin: parseInt(e.target.value),
                        ageMax: Math.max(parseInt(e.target.value), prev.ageMax)
                      }))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-orange"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">
                      Max Age: {filters.ageMax}
                    </label>
                    <input
                      type="range"
                      min="18"
                      max="60"
                      value={filters.ageMax}
                      onChange={(e) => setFilters(prev => ({ 
                        ...prev, 
                        ageMax: parseInt(e.target.value),
                        ageMin: Math.min(parseInt(e.target.value), prev.ageMin)
                      }))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-orange"
                    />
                  </div>
                </div>
              </div>



              {/* Lifestyle Filters */}
              <div className="mb-6">
                <h3 className="text-sm font-black uppercase tracking-wider text-gray-700 mb-3">
                  Lifestyle Preferences
                </h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={filters.noDrinking}
                      onChange={(e) => setFilters(prev => ({ ...prev, noDrinking: e.target.checked }))}
                      className="w-5 h-5 text-brand-orange rounded focus:ring-brand-orange cursor-pointer"
                    />
                    <span className="text-sm font-semibold text-gray-700">No Drinking</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={filters.noSmoking}
                      onChange={(e) => setFilters(prev => ({ ...prev, noSmoking: e.target.checked }))}
                      className="w-5 h-5 text-brand-orange rounded focus:ring-brand-orange cursor-pointer"
                    />
                    <span className="text-sm font-semibold text-gray-700">No Smoking</span>
                  </label>
                </div>
              </div>

              {/* Verification Filter */}
              <div className="mb-6">
                <h3 className="text-sm font-black uppercase tracking-wider text-gray-700 mb-3">
                  Verification
                </h3>
                <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={filters.verifiedOnly}
                    onChange={(e) => setFilters(prev => ({ ...prev, verifiedOnly: e.target.checked }))}
                    className="w-5 h-5 text-brand-orange rounded focus:ring-brand-orange cursor-pointer"
                  />
                  <span className="text-sm font-semibold text-gray-700">Verified Profiles Only</span>
                </label>
              </div>
            </div>
          </div>

          {/* Fixed Action Buttons */}
          <div className="flex-shrink-0 p-6 bg-white border-t border-gray-200 flex gap-3">
            <button
              onClick={clearFilters}
              className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-black uppercase tracking-wide text-xs hover:bg-gray-200 transition-colors active:scale-95"
            >
              Clear All
            </button>
            <button
              onClick={() => {
                setIndex(0);
                setShowFilters(false);
              }}
              className="flex-1 py-3 bg-brand-orange text-white rounded-xl font-black uppercase tracking-wide text-xs shadow-lg shadow-brand-orange/20 hover:bg-brand-orange/90 transition-colors active:scale-95"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Profile Card */}
      <div 
        className="flex-1 relative overflow-hidden group cursor-pointer"
        onClick={() => setViewingProfile(profile)}
      >
        <img
          src={profile.photos[0]}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          alt={`${profile.name} cover photo`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent"></div>
        
        {/* Tap Hint Overlay */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm text-white px-6 py-3 rounded-full font-bold text-xs pointer-events-none transform scale-90 group-hover:scale-100 duration-300">
           Tap to view profile
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-8 text-white pb-24">
          <h2 className="text-4xl font-black mb-2 tracking-tighter shadow-black drop-shadow-lg">
            {profile.name}, {profile.age}
          </h2>
          <div className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-widest opacity-80">
            <MapPin size={12} /> {profile.location?.split(',')[0]}
            {profile.isVerified && (
              <div className="flex items-center gap-1 ml-2 bg-blue-500/80 px-2 py-0.5 rounded-full">
                <CheckCircle size={10} />
                <span className="text-[8px]">Verified</span>
              </div>
            )}
          </div>
          <p className="text-sm opacity-90 mb-6 font-medium leading-relaxed line-clamp-2">
            "{profile.bio}"
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-2xl text-[9px] font-black uppercase tracking-widest border border-white/20">
              {profile.denomination}
            </span>
            <span className="px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-2xl text-[9px] font-black uppercase tracking-widest border border-white/20">
              {profile.intentions}
            </span>
            <span className="px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-2xl text-[9px] font-black uppercase tracking-widest border border-white/20">
              {profile.faithMaturity}
            </span>
          </div>
        </div>
      </div>
      
      {/* Action Bar - Fixed Bottom over the Image */}
      <div className="absolute bottom-0 left-0 right-0 p-6 pt-0 bg-gradient-to-t from-black/80 to-transparent flex gap-4 shrink-0 z-20">
        <button
          title="Skip profile"
          onClick={(e) => {
             e.stopPropagation();
             setIndex((i) => i + 1);
          }}
          className="flex-1 py-4 bg-gray-900/50 backdrop-blur-md border border-white/10 rounded-2xl text-white font-black uppercase tracking-widest text-[10px] active:scale-95 transition-all hover:bg-gray-900"
        >
          Skip
        </button>
        <button
          title="Send connection request"
          onClick={(e) => {
             e.stopPropagation();
             onMessage(profile.id);
          }}
          className="flex-1 py-4 bg-brand-orange text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-brand-orange/20 active:scale-95 transition-all"
        >
          Connect
        </button>
      </div>
    </div>
  );
};

const ChatListItem = ({
  chat,
  onChatSelect,
}: {
  chat: ChatThread;
  onChatSelect: (id: string) => void;
}) => {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    if (!chat.partnerId) return;

    let unsubscribe: (() => void) | undefined;

    const listenToPartnerStatus = async () => {
      try {
        const { doc, onSnapshot } = await import('firebase/firestore');
        const { db } = await import('./firebase');
        const partnerRef = doc(db, 'users', chat.partnerId);
        unsubscribe = onSnapshot(partnerRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setIsOnline(!!data.isOnline);
          }
        });
      } catch (err) {
        console.error('Error listening to partner online status in list:', err);
      }
    };

    listenToPartnerStatus();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [chat.partnerId]);

  return (
    <div
      onClick={() => onChatSelect(chat.id)}
      className="flex items-center gap-4 p-5 hover:bg-gray-50 cursor-pointer border-b border-gray-50 transition-all active:bg-gray-100 group"
    >
      <div className="w-16 h-16 bg-gray-200 rounded-3xl overflow-hidden relative border border-gray-100 shadow-sm transition-transform group-hover:scale-105">
        <img
          src={chat.partnerPhoto || `https://picsum.photos/200?random=${chat.partnerId}`}
          className="w-full h-full object-cover"
          alt={chat.partnerName || 'Partner'}
        />
        {isOnline && (
          <div className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"></div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <h3 className="font-bold text-gray-900 text-sm">
            {chat.partnerName || `Partner ${chat.partnerId}`}
          </h3>
          <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
            {chat.timestamp}
          </span>
        </div>
        <p className="text-xs text-gray-500 truncate font-medium">
          {chat.lastMessage || 'No messages yet'}
        </p>
      </div>
      {chat.unreadCount > 0 && (
        <div className="w-5 h-5 bg-brand-orange rounded-full flex items-center justify-center text-[10px] font-black text-white">
          {chat.unreadCount}
        </div>
      )}
    </div>
  );
};

const ChatListView = ({
  chats,
  onChatSelect,
  isLoading = false,
}: {
  chats: ChatThread[];
  onChatSelect: (id: string) => void;
  isLoading?: boolean;
}) => {
  const [tab, setTab] = useState<"all" | "matches" | "requests">("all");
  const visibleChats =
    tab === "requests"
      ? chats.filter((c) => c.unreadCount > 0)
      : chats;

  return (
    <div className="h-full flex flex-col bg-transparent">
      <div className="cmg-sticky-head px-5 pt-12 pb-3 border-b border-gray-100 sticky top-0 z-10 shrink-0">
        <div className="flex justify-between items-center mb-4">
          <h1 className="font-black text-3xl text-brand-blue tracking-tight" style={{ fontFamily: "Georgia, serif" }}>
            Messages
          </h1>
          <button
            title="Search messages"
            aria-label="Search messages"
            className="p-2.5 rounded-full bg-white/80 border border-gray-100 text-gray-500 shadow-sm"
          >
            <Search size={20} />
          </button>
        </div>
        <div className="flex gap-2">
          {([
            { id: "all", label: "All" },
            { id: "matches", label: "Matches" },
            { id: "requests", label: "Requests" },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              data-active={tab === t.id}
              className="cmg-messages-tab px-5 py-2 rounded-full text-xs font-black tracking-wide transition-all"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto hide-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-brand-orange border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-sm text-gray-500 font-semibold">Loading chats...</p>
            </div>
          </div>
        ) : visibleChats.length === 0 ? (
          <div className="flex items-center justify-center h-64 p-8 text-center">
            <div>
              <MessageCircle size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="font-black uppercase tracking-widest text-xs text-gray-400 mb-2">
                {tab === "requests" ? "No new requests" : "No conversations yet"}
              </p>
              <p className="text-xs text-gray-500">
                Connect with someone to start chatting!
              </p>
            </div>
          </div>
        ) : (
          visibleChats.map((c) => (
            <ChatListItem key={c.id} chat={c} onChatSelect={onChatSelect} />
          ))
        )}
      </div>
    </div>
  );
};

const CommunityView = ({ user }: { user: User | null }) => {
  const [tab, setTab] = useState<"devotional" | "prayer">("devotional");
  const [devotional, setDevotional] = useState<Devotional | null>(null);
  const [loading, setLoading] = useState(false);
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [showAddPrayer, setShowAddPrayer] = useState(false);
  const [newPrayerText, setNewPrayerText] = useState("");
  const [selectedPrayer, setSelectedPrayer] = useState<PrayerRequest | null>(
    null
  );
  const [commentText, setCommentText] = useState("");
  const [loadingPrayers, setLoadingPrayers] = useState(false);

  // Subscribe to Prayer Requests
  useEffect(() => {
    if (tab === "prayer") {
      setLoadingPrayers(true);
      let unsubscribe: (() => void) | undefined;

      const setupSubscription = async () => {
        try {
          const { subscribeToPrayerRequests } = await import('./services/prayerService');
          unsubscribe = subscribeToPrayerRequests(
            user?.id || '', 
            (updatedPrayers) => {
              setPrayers(updatedPrayers);
              setLoadingPrayers(false);
            },
            (error) => {
              console.error("Subscription error:", error);
              setLoadingPrayers(false);
            }
          );
        } catch (error) {
          console.error("Error subscribing to prayers:", error);
          setLoadingPrayers(false);
        }
      };

      setupSubscription();

      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [tab, user?.id]);

  // Subscribe to Comments when a prayer is selected
  useEffect(() => {
    if (selectedPrayer) {
      let unsubscribe: (() => void) | undefined;
      const setupComments = async () => {
        try {
          const { subscribeToComments } = await import('./services/prayerService');
          unsubscribe = subscribeToComments(selectedPrayer.id, (comments) => {
             setSelectedPrayer(prev => prev ? ({ ...prev, comments }) : null);
          });
        } catch (error) {
          console.error("Error subscribing to comments:", error);
        }
      };
      setupComments();
      return () => { if (unsubscribe) unsubscribe(); };
    }
  }, [selectedPrayer?.id]);

  useEffect(() => {
    if (tab === "devotional" && !devotional && !loading) {
      setLoading(true);
      fetch("/api/devotional", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt:
            "Short Christian devotional for singles focusing on purposeful dating and patience.",
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data && data.ok !== false) {
            setDevotional({
              date: "Today",
              title: "Favor in the Waiting",
              verse: "Proverbs 18:22",
              content: data.text || "",
            });
          } else {
            setDevotional({
              date: "Today",
              title: "Wait on the Lord",
              verse: "Psalm 27:14",
              content:
                "Wait on the Lord; be of good courage, and He shall strengthen your heart.",
            });
          }
        })
        .catch(() =>
          setDevotional({
            date: "Today",
            title: "Wait on the Lord",
            verse: "Psalm 27:14",
            content:
              "Wait on the Lord; be of good courage, and He shall strengthen your heart.",
          })
        )
        .finally(() => setLoading(false));
    }
  }, [tab, devotional, loading]);

  const handlePray = async (id: string, hasPrayed: boolean) => {
    if (!user) return;
    try {
      const { togglePray } = await import('./services/prayerService');
      await togglePray(id, user.id, hasPrayed);
      // Optimistic update handled by real-time listener, but we can do a quick local toggle if needed
      // For now, rely on listener
    } catch (error) {
       console.error("Error praying:", error);
    }
  };

  const handlePostPrayer = async () => {
    if (!newPrayerText.trim() || !user) return;
    
    try {
      const { addPrayerRequest } = await import('./services/prayerService');
      await addPrayerRequest(user.id, user.name, newPrayerText);
      setNewPrayerText("");
      setShowAddPrayer(false);
    } catch (error) {
      console.error("Error posting prayer:", error);
    }
  };

  const handlePostComment = async () => {
    if (!commentText.trim() || !selectedPrayer || !user) return;
    
    try {
      const { addComment } = await import('./services/prayerService');
      await addComment(selectedPrayer.id, user.id, user.name, commentText);
      setCommentText("");
    } catch (error) {
      console.error("Error posting comment:", error);
    }
  };

  const handleReact = (prayerId: string, commentId: string, emoji: string) => {
    console.log("Comment reactions coming soon!");
    // TODO: Implement toggleCommentReaction
  };

  return (
    <div className="h-full flex flex-col bg-transparent relative">
      <div className="bg-white p-2.5 pt-12 border-b flex gap-1.5 sticky top-0 z-10 shadow-sm shrink-0">
        <button
          onClick={() => setTab("devotional")}
          className={`flex-1 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
            tab === "devotional"
              ? "bg-brand-orange text-white shadow-lg shadow-brand-orange/20"
              : "text-gray-400"
          }`}
        >
          Daily Word
        </button>
        <button
          onClick={() => setTab("prayer")}
          className={`flex-1 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
            tab === "prayer"
              ? "bg-brand-orange text-white shadow-lg shadow-brand-orange/20"
              : "text-gray-400"
          }`}
        >
          Prayer Wall
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 hide-scrollbar">
        {tab === "devotional" ? (
          loading ? (
            <div className="flex flex-col items-center justify-center h-80">
              <div className="w-10 h-10 border-4 border-brand-orange border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : ( /* ... devotional content ... */
            devotional && (
              <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 animate-in slide-in-from-bottom duration-500">
                <h2 className="text-2xl font-black text-brand-blue mb-5 uppercase tracking-tighter">
                  {devotional.title}
                </h2>
                <p className="italic text-gray-800 font-bold bg-brand-surface p-6 border-l-4 border-brand-orange rounded-r-3xl mb-8">
                  "{devotional.verse}"
                </p>
                <div className="text-gray-600 leading-relaxed text-sm font-medium space-y-4 whitespace-pre-line tracking-tight">
                  {devotional.content}
                </div>
              </div>
            )
          )
        ) : (
          loadingPrayers ? (
            <div className="flex flex-col items-center justify-center h-80">
              <div className="w-8 h-8 border-4 border-brand-orange border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-4 pb-20">
              <button
                title="Share a prayer request"
                onClick={() => setShowAddPrayer(true)}
                className="w-full py-5 bg-white border-2 border-dashed border-gray-200 rounded-[2rem] flex items-center justify-center gap-3 text-gray-400 font-black uppercase text-[10px] tracking-widest hover:border-brand-orange hover:text-brand-orange transition-all active:scale-[0.98]"
              >
                <PlusCircle size={20} /> Share a prayer request
              </button>
              {prayers.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Quote size={24} className="opacity-20" />
                  </div>
                  <p className="font-black uppercase tracking-widest text-xs">No prayer requests yet</p>
                  <p className="text-[10px] mt-1 opacity-60">Be the first to share one</p>
                </div>
              ) : (
                prayers.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 animate-in slide-in-from-bottom duration-300"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-brand-orange/10 rounded-2xl flex items-center justify-center text-brand-orange">
                          <Quote
                            size={18}
                            fill="currentColor"
                            className="opacity-40"
                          />
                        </div>
                        <div>
                          <span className="font-black text-gray-900 text-xs uppercase tracking-tight">
                            {p.userName}
                          </span>
                          <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest">
                            {p.createdAt}
                          </p>
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-700 text-[15px] leading-relaxed mb-6 font-medium bg-gray-50/50 p-4 rounded-3xl">
                      {p.content}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        title={
                          p.hasPrayed ? "You are praying for this" : "Pray for this"
                        }
                        onClick={() => handlePray(p.id, p.hasPrayed || false)}
                        className={`px-5 py-2.5 rounded-full text-[10px] font-black flex items-center gap-2 uppercase tracking-widest transition-all active:scale-90 ${
                          p.hasPrayed
                            ? "bg-brand-orange text-white shadow-lg shadow-brand-orange/20"
                            : "bg-brand-orange/5 text-brand-orange"
                        }`}
                      >
                        <Heart
                          size={14}
                          className={p.hasPrayed ? "fill-current" : ""}
                        />{" "}
                        {p.prayingCount} Praying
                      </button>
                      <button
                        title="View comments"
                        onClick={() => setSelectedPrayer(p)}
                        className="px-5 py-2.5 bg-gray-50 text-gray-500 rounded-full text-[10px] font-black flex items-center gap-2 uppercase tracking-widest hover:bg-gray-100 transition-all active:scale-90"
                      >
                        <MessageSquare size={14} /> {p.commentCount || 0} Comments
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )
        )}
      </div>
      {/* Add Prayer Modal */}
      {showAddPrayer && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-xl text-brand-blue uppercase tracking-tighter">
                New Prayer
              </h3>
              <button
                title="Close"
                onClick={() => setShowAddPrayer(false)}
                className="p-2 text-gray-400"
              >
                <X size={24} />
              </button>
            </div>
            <textarea
              value={newPrayerText}
              onChange={(e) => setNewPrayerText(e.target.value)}
              placeholder="How can the community stand in faith with you today?"
              className="w-full h-40 p-5 bg-gray-50 rounded-3xl outline-none focus:ring-2 focus:ring-brand-orange/20 text-gray-900 font-medium resize-none mb-6"
            />
            <button
              onClick={handlePostPrayer}
              disabled={!newPrayerText.trim()}
              className="w-full py-4 bg-brand-orange text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-brand-orange/20 active:scale-95 disabled:opacity-50 transition-all"
            >
              Post to Wall
            </button>
          </div>
        </div>
      )}
      {/* Selected Prayer / Comments Detail View */}
      {selectedPrayer && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md h-[85vh] sm:h-[80vh] rounded-t-[3rem] sm:rounded-[2.5rem] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white z-20 rounded-t-[3rem] sm:rounded-t-[2.5rem]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-orange/10 rounded-2xl flex items-center justify-center text-brand-orange">
                  <MessageSquare size={20} />
                </div>
                <h3 className="font-black text-lg text-brand-blue uppercase tracking-tighter">
                  Words of Faith
                </h3>
              </div>
              <button
                title="Close comments"
                aria-label="Close comments"
                onClick={() => setSelectedPrayer(null)}
                className="p-2 text-gray-400 bg-gray-100 rounded-2xl"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 hide-scrollbar">
              <div className="bg-brand-surface p-6 rounded-[2rem] border border-gray-100 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-brand-orange opacity-40"></div>
                <p className="text-gray-900 text-[15px] font-bold leading-relaxed">
                  {selectedPrayer.content}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[10px] font-black text-brand-orange uppercase tracking-widest">
                    {selectedPrayer.userName} • {selectedPrayer.createdAt}
                  </span>
                  <div className="flex items-center gap-1 text-[10px] font-black text-gray-400">
                    <Heart
                      size={12}
                      className="fill-brand-orange text-brand-orange"
                    />{" "}
                    {selectedPrayer.prayingCount}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">
                  Encouragements ({(selectedPrayer.comments || []).length})
                </h4>
                {(selectedPrayer.comments || []).length === 0 ? (
                  <div className="py-10 text-center text-gray-300">
                    <Quote size={40} className="mx-auto mb-3 opacity-10" />
                    <p className="font-black uppercase text-[10px] tracking-widest">
                      Be the first to encourage
                    </p>
                  </div>
                ) : (
                  (selectedPrayer.comments || []).map((c) => (
                    <div
                      key={c.id}
                      className="group animate-in slide-in-from-left duration-300"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-[10px] font-black text-gray-400">
                          {c.userName.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <div className="bg-gray-50 p-4 rounded-3xl rounded-tl-none relative shadow-sm border border-gray-100">
                            <p className="text-sm font-bold text-gray-800 leading-relaxed">
                              {c.text}
                            </p>

                            {/* Reaction Badges */}
                            <div className="flex gap-1 mt-3">
                              {c.reactions.map((r) => (
                                <button
                                  key={r.emoji}
                                  title={"React with " + r.emoji}
                                  onClick={() =>
                                    handleReact(
                                      selectedPrayer.id,
                                      c.id,
                                      r.emoji
                                    )
                                  }
                                  className={`px-2 py-1 rounded-full text-[9px] flex items-center gap-1 transition-all border ${
                                    r.hasReacted
                                      ? "bg-brand-orange/10 border-brand-orange/30 text-brand-orange"
                                      : "bg-white border-gray-100 text-gray-500"
                                  }`}
                                >
                                  {r.emoji}{" "}
                                  <span className="font-black">{r.count}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="mt-2 flex items-center gap-4 px-1">
                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">
                              {c.userName} • {c.createdAt}
                            </span>
                            <div className="flex gap-3">
                              {["🙏", "❤️", "✨", "🙌"].map((emoji) => (
                                <button
                                  key={emoji}
                                  title={"React with " + emoji}
                                  onClick={() =>
                                    handleReact(selectedPrayer.id, c.id, emoji)
                                  }
                                  className="text-xs hover:scale-125 transition-transform active:scale-90"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-6 border-t bg-white pb-10 sticky bottom-0">
              <div className="flex gap-2">
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Offer a word of faith..."
                  className="flex-1 p-4 bg-gray-50 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-brand-orange/20"
                />
                <button
                  title="Send comment"
                  onClick={handlePostComment}
                  disabled={!commentText.trim()}
                  className="p-4 bg-brand-orange text-white rounded-2xl shadow-lg shadow-brand-orange/20 active:scale-95 disabled:opacity-50 transition-all"
                >
                  <Send size={22} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};



const FriendsView = ({
  user,
  onChat,
}: {
  user: User;
  onChat: (partnerId: string) => void;
}) => {
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch real connections (users you have chats with)
    const fetchConnections = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        
        // Import Firestore functions dynamically
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const { db } = await import('./firebase');
        const { getUserDocument } = await import('./services/userService');
        
        // Query chats where user is a participant
        const q = query(
          collection(db, 'chats'),
          where('participants', 'array-contains', user.id)
        );
        
        const snapshot = await getDocs(q);
        const partnerIds = new Set<string>();
        
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          const partnerId = data.participants.find((id: string) => id !== user.id);
          if (partnerId) partnerIds.add(partnerId);
        });
        
        // Fetch user profiles for each partner
        const profiles = [];
        for (const pid of Array.from(partnerIds)) {
          const profile = await getUserDocument(pid);
          if (profile) profiles.push(profile);
        }
        
        console.log(`✅ Found ${profiles.length} connections`);
        setFriends(profiles);
      } catch (err) {
        console.error("❌ Error fetching connections:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchConnections();
  }, [user?.id]);

  if (loading)
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-orange border-t-transparent rounded-full animate-spin"></div>
      </div>
    );

  return (
    <div className="h-full bg-transparent flex flex-col">
      <div className="p-6 pt-12 border-b shrink-0">
        <h1 className="text-2xl font-black text-brand-blue dark:text-brand-orange uppercase tracking-tighter">
          Your Connections
        </h1>
        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">
          {friends.length} Blessed Souls
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 hide-scrollbar">
        {friends.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 pb-20">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <Users size={32} className="opacity-20" />
            </div>
            <p className="font-black uppercase tracking-widest text-xs">
              No connections yet
            </p>
            <p className="text-[10px] mt-2 max-w-[200px]">
              Start browsing to find like-minded believers.
            </p>
          </div>
        ) : (
          friends.map((friend) => (
            <div
              key={friend.id}
              className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 transition-all hover:bg-white hover:shadow-md hover:border-brand-orange/20 group"
            >
              <div className="w-14 h-14 rounded-2xl bg-gray-200 overflow-hidden relative">
                <img
                  src={friend.photos?.[0] || "https://via.placeholder.com/150"}
                  className="w-full h-full object-cover"
                  alt={friend.name}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 text-sm truncate">
                  {friend.name}
                </h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wide flex items-center gap-1">
                  {friend.location}
                </p>
              </div>
              <button
                onClick={() => onChat(friend.id)}
                className="p-3 bg-white dark:bg-brand-blue text-brand-blue dark:text-white rounded-xl shadow-sm border border-gray-100 hover:text-brand-orange hover:border-brand-orange transition-all active:scale-95"
              >
                <MessageCircle size={20} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export const isSubscriptionActive = (user: User | null | undefined): boolean => {
  if (!user) return false;
  if (!user.subscriptionEndDate) return false;
  try {
    let endDate: Date;
    const rawEnd = user.subscriptionEndDate as any;
    if (rawEnd && typeof rawEnd.toDate === 'function') {
      endDate = rawEnd.toDate();
    } else {
      endDate = new Date(rawEnd);
    }
    return endDate > new Date();
  } catch (e) {
    return false;
  }
};

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>("AUTH");
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Payment State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingConnectId, setPendingConnectId] = useState<string | null>(null);
  
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isCallingVideo, setIsCallingVideo] = useState(false);
  const [showIncompleteProfileModal, setShowIncompleteProfileModal] = useState(false);
  const [profileReminderDeferred, setProfileReminderDeferred] = useState(false);
  
  // Account Deletion State
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    if (user && currentView !== "AUTH" && currentView !== "ONBOARDING") {
      if (!isProfileFullyComplete(user) && !profileReminderDeferred) {
        setShowIncompleteProfileModal(true);
      } else {
        setShowIncompleteProfileModal(false);
      }
    } else {
      setShowIncompleteProfileModal(false);
    }
  }, [user, currentView, profileReminderDeferred]);
  
  // Real-time Chat State
  const [chats, setChats] = useState<ChatThread[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  
  // Browse Users State
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const showNotify = (message: string, type: "success" | "error") =>
    setNotification({ message, type });

  // Handle the native Android back button. Close overlays and nested views
  // first; exit only when the user is already at the app root.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let removeListener: (() => void) | undefined;
    CapacitorApp.addListener("backButton", ({ canGoBack }) => {
      if (showDeleteAccountModal) {
        setShowDeleteAccountModal(false);
        return;
      }
      if (showPaymentModal) {
        setShowPaymentModal(false);
        return;
      }
      if (currentView === "EDIT_PROFILE") {
        setCurrentView("PROFILE");
        return;
      }
      if (currentView === "CHAT" && activeChatId) {
        setActiveChatId(null);
        return;
      }
      if (currentView !== "BROWSE" && currentView !== "AUTH") {
        setCurrentView("BROWSE");
        return;
      }

      if (canGoBack) {
        window.history.back();
      } else {
        void CapacitorApp.exitApp();
      }
    }).then((handle) => {
      removeListener = () => {
        void handle.remove();
      };
    });

    return () => removeListener?.();
  }, [activeChatId, currentView, showDeleteAccountModal, showPaymentModal]);

  const handleLogout = async () => {
    try {
      const { auth } = await import("./firebase");
      const { signOut } = await import("firebase/auth");
      await signOut(auth);
    } catch (error) {
      console.error("Firebase sign-out failed:", error);
    } finally {
      localStorage.removeItem("cmg_demo_user");
      localStorage.removeItem("cmg_current_view");
      setActiveChatId(null);
      setUser(null);
      setCurrentView("AUTH");
    }
  };

  const handleUiBack = () => {
    if (showDeleteAccountModal) {
      setShowDeleteAccountModal(false);
      return;
    }
    if (showPaymentModal) {
      setShowPaymentModal(false);
      return;
    }
    if (currentView === "EDIT_PROFILE") {
      setCurrentView("PROFILE");
      return;
    }
    if (currentView === "CHAT" && activeChatId) {
      setActiveChatId(null);
      return;
    }
    if (currentView !== "BROWSE" && currentView !== "AUTH" && currentView !== "ONBOARDING") {
      setCurrentView("BROWSE");
    }
  };

  // Subscribe to real-time chats
  // Call States
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [isCaller, setIsCaller] = useState(false);
  const [callPartner, setCallPartner] = useState<{name: string, photo: string} | null>(null);

  // Subscribe to real-time chats
  useEffect(() => {
    if (!user?.id) {
      setChats([]);
      setIsLoadingChats(false);
      return;
    }

    setIsLoadingChats(true);
    
    // Create a variable to hold the unsubscribe function from the async operation
    let unsubscribeChats: (() => void) | undefined;
    let unsubscribeCalls: (() => void) | undefined;

    const setupSubscriptions = async () => {
      try {
        const { subscribeToChats, subscribeToIncomingCalls } = await import('./services/chatService');
        
        // Subscribe to incoming calls
        unsubscribeCalls = subscribeToIncomingCalls(user.id, (call: any) => {
             // Only set active incoming call if we are not already in a call
             if (call && !currentCallId) {
               setIncomingCall(call);
               // Play ringtone logic here if needed
             } else if (!call) {
               setIncomingCall(null);
             }
        });
        
        unsubscribeChats = subscribeToChats(user.id, (updatedChats: ChatThread[]) => {
          console.log('📨 Chats updated:', updatedChats.length);
          setChats(updatedChats);
          setIsLoadingChats(false);
        });
      } catch (error) {
        console.error('❌ Error subscribing to chats:', error);
        setIsLoadingChats(false);
      }
    };

    setupSubscriptions();

    return () => {
      if (unsubscribeChats) unsubscribeChats();
      if (unsubscribeCalls) unsubscribeCalls();
    };
  }, [user?.id]);

  // Setup Push Notifications
  useEffect(() => {
    if (!user?.id) return;
    
    const initPush = async () => {
      try {
        const { setupPushNotifications } = await import('./services/notificationService');
        await setupPushNotifications(user.id, (payload) => {
           // Handle foreground notifications
           const title = payload.notification?.title || payload.title || "New Notification";
           showNotify(title, "success");
        });
      } catch (e) {
        console.error("Failed to initialize push notifications", e);
      }
    };
    
    initPush();
  }, [user?.id]);

  // Fetch all users for Browse view
  useEffect(() => {
    if (!user?.id) {
      setAllUsers([]);
      setIsLoadingUsers(false);
      return;
    }

    const fetchUsers = async () => {
      setIsLoadingUsers(true);
      try {
        const { getAllUsers } = await import('./services/userService');
        const users = await getAllUsers(user.id, user.blockedUsers || [], user.gender);
        setAllUsers(users);
      } catch (error) {
        console.error('❌ Error fetching users:', error);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [user?.id, user?.blockedUsers, user?.gender]);

  const handleConnectRequest = async (profileId: string) => {
    if (!user) return;
    
    if (isSubscriptionActive(user)) {
      // User is already subscribed! Connect directly.
      try {
        const { createOrGetChat } = await import('./services/chatService');
        const { getUserDocument } = await import('./services/userService');
        
        const partnerData = await getUserDocument(profileId);
        if (!partnerData) {
          showNotify("User not found", "error");
          return;
        }
        
        const chatId = await createOrGetChat(
          user.id,
          profileId,
          { name: user.name, photo: user.photos[0] || '' },
          { name: partnerData.name, photo: partnerData.photos[0] || '' }
        );
        
        setActiveChatId(chatId);
        setCurrentView("CHAT");
        showNotify(`You're now connected with ${partnerData.name}!`, "success");
      } catch (error) {
        console.error('❌ Error creating chat:', error);
        showNotify("Failed to create chat", "error");
      }
    } else {
      // Show payment modal to subscribe
      setPendingConnectId(profileId);
      setShowPaymentModal(true);
    }
  };

  const handleBlockUser = async (userIdToBlock: string) => {
    if (!user) return;
    
    try {
      // Block the user in Firestore
      await blockUser(user.id, userIdToBlock);
      
      // Update local user state with blocked user
      const updatedBlockedUsers = [...(user.blockedUsers || []), userIdToBlock];
      setUser({
        ...user,
        blockedUsers: updatedBlockedUsers
      });
      
      // Navigate back to chat list
      setActiveChatId(null);
      
      showNotify("User has been blocked", "success");
    } catch (error) {
      console.error("Error blocking user:", error);
      showNotify("Failed to block user", "error");
    }
  };

  const handlePaymentSuccess = async (reference?: string, plan?: '6months' | '12months') => {
    if (!user) return;

    try {
      const selectedPlan = plan || '6months';
      const durationDays = selectedPlan === '6months' ? 180 : 365;
      const amount = selectedPlan === '6months' ? 150 : 280;

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + durationDays);

      const ref = reference || `MOCK-${Date.now()}`;

      // 1. Record payment transaction in Firestore
      const { recordTransaction } = await import('./services/paymentService');
      await recordTransaction(user.id, user.name, user.email, amount, ref, 'subscription');

      // 2. Update user's subscription in Firestore
      const { updateUserDocument } = await import('./services/userService');
      const subscriptionUpdates = {
        subscriptionStartDate: startDate.toISOString(),
        subscriptionEndDate: endDate.toISOString(),
        subscriptionType: selectedPlan,
        subscriptionStatus: 'active' as const,
        isPremium: true
      };
      await updateUserDocument(user.id, subscriptionUpdates);

      // Update local user state
      const updatedUser = {
        ...user,
        ...subscriptionUpdates
      };
      setUser(updatedUser);

      showNotify(`Subscription successful! You now have unlimited chat access.`, "success");

      // 3. Connect to pending partner profile if available
      const targetId = pendingConnectId;
      if (targetId) {
        const { createOrGetChat } = await import('./services/chatService');
        const { getUserDocument } = await import('./services/userService');
        
        const partnerData = await getUserDocument(targetId);
        if (partnerData) {
          const chatId = await createOrGetChat(
            user.id,
            targetId,
            { name: user.name, photo: user.photos[0] || '' },
            { name: partnerData.name, photo: partnerData.photos[0] || '' }
          );
          setActiveChatId(chatId);
          setCurrentView("CHAT");
        }
      }
    } catch (error) {
      console.error('❌ Error updating subscription after payment:', error);
      showNotify("Failed to update subscription", "error");
    } finally {
      setPendingConnectId(null);
    }
  };

  useEffect(() => {
    const checkUser = async () => {
      // MOCK SESSION CHECK
      const storedUser = localStorage.getItem('cmg_demo_user');
      const storedView = localStorage.getItem('cmg_current_view');
      
      if (freshLocalTestStart) {
        localStorage.removeItem('cmg_demo_user');
        localStorage.removeItem('cmg_current_view');
        return;
      }

      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          
          // Fallback to Firebase Auth currentUser uid if parsedUser.id/uid is missing!
          const { auth } = await import('./firebase');
          const userId = parsedUser.id || parsedUser.uid || auth.currentUser?.uid;
          
          if (userId) {
            parsedUser.id = userId;
            setUser(parsedUser);
            
            // Check query parameters for deep linking
            const params = new URLSearchParams(window.location.search);
            const viewParam = params.get('view');
            const chatIdParam = params.get('chatId');
            
            if (parsedUser.age === 0) {
              setCurrentView("ONBOARDING");
            } else if (viewParam === 'CHAT') {
              setCurrentView('CHAT');
              if (chatIdParam) {
                setActiveChatId(chatIdParam);
              }
            } else {
              // Restore saved view or default to PROFILE
              setCurrentView((storedView as ViewState) || "PROFILE");
            }
            
            // Fetch fresh user data from Firestore to sync subscription status
            const { getUserDocument } = await import('./services/userService');
            const freshUser = await getUserDocument(userId);
            if (freshUser) {
              freshUser.id = userId;
              setUser(freshUser);
              if (freshUser.age === 0) {
                setCurrentView("ONBOARDING");
              }
            }
          }
        } catch (e) {
          console.error("Failed to parse stored user or sync from Firestore:", e);
        }
      }
    };
    checkUser();
  }, []);

  // Save current view on change
  useEffect(() => {
    if (currentView !== "AUTH" && currentView !== "ONBOARDING") {
      localStorage.setItem('cmg_current_view', currentView);
    }
  }, [currentView]);

  // Update local storage on user change
  useEffect(() => {
    if (user) {
      localStorage.setItem('cmg_demo_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('cmg_demo_user');
    }
  }, [user]);

  // Presence system: set user online status in Firestore
  useEffect(() => {
    if (!user?.id) return;

    let active = true;

    const setOnlineStatus = async (online: boolean) => {
      try {
        const { updateUserDocument } = await import('./services/userService');
        if (active) {
          await updateUserDocument(user.id, { isOnline: online });
        }
      } catch (error) {
        console.error(`Error setting presence to ${online}:`, error);
      }
    };

    setOnlineStatus(true);

    const handleUnload = async () => {
      try {
        const { doc, updateDoc } = await import('firebase/firestore');
        const { db } = await import('./firebase');
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, { isOnline: false });
      } catch (error) {
        console.error('Error setting offline status on unload:', error);
      }
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      active = false;
      window.removeEventListener('beforeunload', handleUnload);
      setOnlineStatus(false);
    };
  }, [user?.id]);


  if (currentView === "AUTH")
    return (
      <div className="cmg-stage min-h-screen flex items-center justify-center">
        <div className="cmg-auth-card cmg-theme-sunrise w-full max-w-md h-full sm:h-[90vh] relative">
          {notification && (
            <NotificationBanner
              message={notification.message}
              type={notification.type}
              onClose={() => setNotification(null)}
            />
          )}
          <AuthView
            onLogin={(u) => {
              setUser(u as User);
              const params = new URLSearchParams(window.location.search);
              const viewParam = params.get('view');
              const chatIdParam = params.get('chatId');
              if (u.age === 0) {
                setCurrentView("ONBOARDING");
              } else if (viewParam === 'CHAT') {
                setCurrentView("CHAT");
                if (chatIdParam) {
                  setActiveChatId(chatIdParam);
                }
              } else {
                setCurrentView("PROFILE");
              }
            }}
            onNotify={showNotify}
          />
        </div>
      </div>
    );

  if (currentView === "ONBOARDING")
    return (
      <div className="cmg-stage min-h-screen flex items-center justify-center">
        <div className="cmg-auth-card cmg-theme-leaf w-full max-w-md h-full sm:h-[90vh] relative">
          <div className="absolute top-4 left-4 right-4 z-[200] flex items-center justify-between pointer-events-none">
            <button
              type="button"
              title="Back"
              aria-label="Back"
              onClick={() => setCurrentView("PROFILE")}
              className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-brand-blue shadow-lg border border-gray-100"
            >
              <ArrowLeft size={21} />
            </button>
            <button
              type="button"
              title="Log out"
              aria-label="Log out"
              onClick={handleLogout}
              className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-brand-blue text-white shadow-lg"
            >
              <LogOut size={19} />
            </button>
          </div>
          <OnboardingView
            onCancel={handleLogout}
            onComplete={async (data) => {
              if (user?.id) {
                try {
                  const uid = user.id;
                  // Onboarding keeps photos as base64 data URLs. Persisting those
                  // directly to Firestore exceeds the 1MB document limit (which was
                  // causing "Failed to save onboarding details"), so upload them to
                  // Storage first and keep only the lightweight download URLs.
                  const {
                    uploadProfilePhoto,
                    uploadCoverPhoto,
                    uploadGalleryPhoto,
                    compressImage,
                  } = await import('./services/fileStorageService');

                  const dataURLtoFile = (dataUrl: string, filename: string): File => {
                    const arr = dataUrl.split(',');
                    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
                    const bstr = atob(arr[1]);
                    let n = bstr.length;
                    const u8arr = new Uint8Array(n);
                    while (n--) u8arr[n] = bstr.charCodeAt(n);
                    return new File([u8arr], filename, { type: mime });
                  };

                  const sourcePhotos: string[] = Array.isArray(data.photos)
                    ? data.photos
                    : [];
                  const uploadedPhotos: string[] = [];
                  for (let i = 0; i < sourcePhotos.length; i++) {
                    const photo = sourcePhotos[i];
                    if (typeof photo === 'string' && photo.startsWith('data:')) {
                      const file = dataURLtoFile(photo, `onboarding-${i}.jpg`);
                      const compressed = await compressImage(file, 1200, 1200, 0.8);
                      const meta =
                        i === 0
                          ? await uploadProfilePhoto(uid, compressed)
                          : i === 1
                          ? await uploadCoverPhoto(uid, compressed)
                          : await uploadGalleryPhoto(uid, compressed);
                      uploadedPhotos[i] = meta.downloadURL;
                    } else if (typeof photo === 'string' && photo.length > 0) {
                      uploadedPhotos[i] = photo; // already a hosted URL
                    } else {
                      uploadedPhotos[i] = '';
                    }
                  }

                  const payload = { ...data, photos: uploadedPhotos };
                  const { updateUserDocument } = await import('./services/userService');
                  await updateUserDocument(uid, payload);
                  setUser((prev) => ({ ...prev!, ...payload }));
                } catch (e) {
                  console.error("Failed to save onboarding data:", e);
                  showNotify("Failed to save onboarding details", "error");
                  return; // stay on onboarding so the user can retry without losing input
                }
              } else {
                setUser((prev) => ({ ...prev!, ...data }));
              }
              setCurrentView("BROWSE");
            }}
          />
        </div>
      </div>
    );

  const activeChat = activeChatId
    ? chats.find((c) => c.id === activeChatId)
    : null;

  return (
    <Layout
      currentView={currentView}
      onBack={handleUiBack}
      onLogout={handleLogout}
      onChangeView={(v) => {
        if (user && !isProfileFullyComplete(user) && !profileReminderDeferred && v !== "EDIT_PROFILE") {
          setShowIncompleteProfileModal(true);
          return;
        }
        setCurrentView(v);
      }}
      hideNav={["CHAT", "CALL"].includes(currentView) && !!activeChatId}
    >
      {showIncompleteProfileModal && currentView !== "EDIT_PROFILE" && (
        <div className="fixed inset-0 z-[1000] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 bg-brand-orange/10 text-brand-orange rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-lg font-black text-gray-900 mb-2 whitespace-nowrap">Complete Additional Profile</h2>
            <p className="text-sm text-gray-600 mb-6">
              Add your additional profile details to get the most out of Christian Match Ghana. You can finish now or continue later.
            </p>
            <button
              onClick={() => {
                setShowIncompleteProfileModal(false);
                setCurrentView("EDIT_PROFILE");
              }}
              className="w-full bg-brand-orange text-white font-bold py-4 rounded-xl hover:bg-brand-orange/90 transition-colors shadow-lg shadow-brand-orange/30"
            >
              Complete Now
            </button>
            <button
              onClick={() => {
                setProfileReminderDeferred(true);
                setShowIncompleteProfileModal(false);
              }}
              className="w-full mt-3 text-gray-500 font-bold py-3 rounded-xl hover:text-brand-orange transition-colors"
            >
              I'll continue later
            </button>
          </div>
        </div>
      )}
      {notification && (
        <NotificationBanner
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
      
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={handlePaymentSuccess}
        userCountry={user?.country || "Ghana"}
        email={user?.email}
      />

      {currentView === "BROWSE" && (
        <BrowseView
          profiles={allUsers}
          onMessage={handleConnectRequest} // Use new handler
          currentUser={user}
        />
      )}
      {currentView === "COMMUNITY" && <CommunityView user={user} />}
      {currentView === "FRIENDS" && user && (
        <FriendsView
          user={user}
          onChat={async (partnerId) => {
            // Create or get chat with friend
            try {
              const { createOrGetChat } = await import('./services/chatService');
              const { getUserDocument } = await import('./services/userService');
              
              const partnerData = await getUserDocument(partnerId);
              if (!partnerData) return;
              
              const chatId = await createOrGetChat(
                user.id,
                partnerId,
                { name: user.name, photo: user.photos[0] || '' },
                { name: partnerData.name, photo: partnerData.photos[0] || '' }
              );
              
              setActiveChatId(chatId);
              setCurrentView("CHAT");
            } catch (error) {
              console.error('❌ Error creating chat:', error);
            }
          }}
        />
      )}
      {currentView === "CHAT" && !activeChatId && (
        <ChatListView chats={chats} onChatSelect={setActiveChatId} isLoading={isLoadingChats} />
      )}
      {currentView === "CHAT" && activeChatId && activeChat && (
        <MessageThreadView
          thread={activeChat}
          chatId={activeChatId}
          onBack={() => setActiveChatId(null)}
          onStartCall={async (video) => {
            if (!user) return;
            setIsCallingVideo(video);
            setIsCaller(true);
            
            try {
              const { initiateCall } = await import('./services/chatService');
              // Find partner details
              const partnerId = activeChat.partnerId;
              const partnerName = activeChat.partnerName || "Partner";
              const partnerPhoto = activeChat.partnerPhoto || "";
              
              const callId = await initiateCall(user.id, partnerId, user.name, user.photos?.[0] || "", video);
              setCurrentCallId(callId);
              setCallPartner({ name: partnerName, photo: partnerPhoto });
              setCurrentView("CALL");
            } catch (error) {
              console.error("Failed to start call", error);
              showNotify("Failed to start call", "error");
            }
          }}
          currentUserId={user?.id}
          onBlock={handleBlockUser}
          currentUser={user}
          onOpenPayment={() => setShowPaymentModal(true)}
        />
      )}
      {currentView === "CALL" && (activeChat || callPartner) && (
        <CallView
          isVideo={isCallingVideo}
          onEnd={async () => {
             if (currentCallId) {
               try {
                 const { endCall } = await import('./services/chatService');
                 await endCall(currentCallId, 'ended');
               } catch(e) {}
             }
             setCurrentCallId(null);
             setCallPartner(null);
             setCurrentView("CHAT");
          }}
          onMissed={async () => {
             if (currentCallId) {
                try {
                 const { endCall } = await import('./services/chatService');
                 await endCall(currentCallId, 'missed');
               } catch(e) {}
             }
             
             if (activeChatId && user) {
               try {
                 const { sendMessage } = await import('./services/chatService');
                 await sendMessage(activeChatId, user.id, {
                    text: isCallingVideo ? '📹 Missed Video Call' : '📞 Missed Voice Call',
                    type: 'text'
                 });
               } catch (e) {
                 console.error("Failed to send missed call notification", e);
               }
             }
             setCurrentCallId(null);
             setCallPartner(null);
          }}
          partnerName={activeChat?.partnerName || callPartner?.name || `Partner`}
          partnerImage={activeChat?.partnerPhoto || callPartner?.photo || `https://picsum.photos/400/600`}
          callId={currentCallId || undefined}
          isCaller={isCaller}
        />
      )}
      
      {/* Incoming Call Overlay */}
      {incomingCall && !currentCallId && (
        <IncomingCallOverlay
          call={incomingCall}
          onAnswer={async () => {
            try {
              const { answerCall } = await import('./services/chatService');
              await answerCall(incomingCall.id);
              
              setCurrentCallId(incomingCall.id);
              setIsCallingVideo(incomingCall.isVideo);
              setIsCaller(false);
              
              // Set active chat context if not set?
              // For now, simpler to just open call view overlay without changing active chat fully underneath
              // But CallView relies on activeChat prop...
              // We need to fetch partner details if not in active chat
              // Or we can mock activeChat for CallView from incomingCall data
              
              // Simplification: We need activeChat for CallView
              // Let's create a temporary object if activeChatId doesn't match
              
              setIncomingCall(null);
              setCallPartner({
                name: incomingCall.callerName || "Caller",
                photo: incomingCall.callerPhoto || ""
              });
              setCurrentView("CALL");
            } catch (e) {
              console.error("Error answering call", e);
            }
          }}
          onReject={async () => {
            try {
              const { endCall } = await import('./services/chatService');
              await endCall(incomingCall.id, 'rejected');
              setIncomingCall(null);
            } catch (e) {}
          }}
        />
      )}
      {currentView === "PROFILE" && user && (
        <ProfileView
          user={user}
          onEdit={() => setCurrentView("EDIT_PROFILE")}
          onLogout={handleLogout}
          onDeleteAccount={() => {
            setShowDeleteAccountModal(true);
          }}
          onOpenPayment={() => setShowPaymentModal(true)}
          onOpenCommunity={() => setCurrentView("COMMUNITY")}
        />
      )}
      {currentView === "EDIT_PROFILE" && user && (
        <EditProfileView
          user={user}
          onCancel={() => setCurrentView("PROFILE")}
          onNotify={showNotify}
          onSave={(u) => {
            setUser(u);
            setCurrentView("PROFILE"); // Return to profile after save
          }}
        />
      )}

      {/* Delete Account Modal */}
      {showDeleteAccountModal && (
        <div className="fixed inset-0 z-[1000] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2 text-center">Delete Account</h2>
            <p className="text-sm text-gray-600 mb-6 text-center">
              Are you sure you want to delete your account? All your data will be permanently removed.
              <br/><br/>
              <span className="font-bold text-brand-orange">Note: You cannot create an account with the same email unless in 10 days.</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteAccountModal(false)}
                disabled={isDeletingAccount}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setIsDeletingAccount(true);
                  try {
                    const { deleteUserAccountAndData } = await import('./services/userService');
                    await deleteUserAccountAndData();
                    
                    setShowDeleteAccountModal(false);
                    setUser(null);
                    setCurrentView("AUTH");
                    showNotify("Account deleted successfully.", "success");
                  } catch (error: any) {
                    showNotify("Failed to delete account: " + (error.message || "Unknown error"), "error");
                  } finally {
                    setIsDeletingAccount(false);
                  }
                }}
                disabled={isDeletingAccount}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30 flex items-center justify-center disabled:opacity-50"
              >
                {isDeletingAccount ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
