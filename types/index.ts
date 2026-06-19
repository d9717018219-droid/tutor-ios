export interface AuthUser {
  id: string;
  phone: string;
  name?: string;
  isProfileComplete: boolean;
}

export interface Teacher {
  id: string;
  name: string;
  email: string;
  phone: string;
  gender: 'Male' | 'Female' | 'Other';
  dob: string;
  age: number;
  qualification: string;
  experience: string;
  isSchoolTeacher: string;
  haveVehicle: string;
  classGroups: string[];
  subjects: string[];
  classes: string[];
  boards: string[];
  teachingModes: ('Classes at Home' | 'Home Tuition' | 'Online' | 'Group')[];
  englishLevel: string;
  fee: string;
  preferredDays: string[];
  preferredTime: string[];
  city: string;
  areas: string[];
  profilePhoto?: string;
  aboutMe: string;
  languages: string[];
  address: string;
  latitude?: number;
  longitude?: number;
  isPremium: boolean;
  premiumExpiry?: string;
  isVerified: boolean;
  verificationStatus: 'none' | 'pending' | 'approved' | 'rejected';
  profileCompletionPercentage: number;
  totalJobsApplied: number;
  activeChats: number;
  profileViews: number;
  totalEarnings: number;
  referralCode: string;
  referralEarnings: number;
  monthlyEarnings: number;
  activeTuitions: number;
}

export interface TuitionJob {
  id: string;
  orderId: string;
  studentClass: string;
  board: string;
  subjects: string[];
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  gender: 'Male' | 'Female' | 'Any';
  monthlyFee: number;
  schedule: string;
  teachingMode: 'Classes at Home' | 'Home Tuition' | 'Online' | 'Group';
  genderPreference: 'Male' | 'Female' | 'Any';
  postedAt: string;
  requirements: string;
  duration?: string;
  days?: string;
  residency?: string;
  distance?: number;
  isSaved?: boolean;
  hasApplied?: boolean;
  appliedCount?: number;
  leadStatus?: string;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  text?: string;
  image?: string;
  timestamp: string;
  isRead: boolean;
}

export interface Chat {
  id: string;
  jobId: string;
  parentName: string;
  parentPhone?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
  jobTitle: string;
}

// ── Firestore-backed reviews ──────────────────────────────────────────────────

export interface FirestoreReview {
  id: string;
  tutorPhone: string;
  rating: number;
  reviewText: string;
  parentName: string;
  parentPhone?: string;
  tutorReply?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Firestore-backed chat types ───────────────────────────────────────────────

export interface FirestoreConnection {
  id: string;
  tutorId: string;
  tutorName: string;
  parentId: string;
  parentName: string;
  parentPhone?: string;
  jobId: string;
  jobTitle: string;
  orderId?: string;
  city?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  members: string[];
  createdAt: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export interface FirestoreMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  isRead: boolean;
  type?: 'system' | 'chat';
}

export interface Transaction {
  id: string;
  type: 'subscription' | 'refund' | 'referral';
  amount: number;
  description: string;
  date: string;
  status: 'success' | 'pending' | 'failed';
}

export interface PremiumPlan {
  id: string;
  name: string;
  duration: string;
  months: number;
  price: number;
  originalPrice?: number;
  popular?: boolean;
  requestLimit: number | 'unlimited';
  chatLimit: number | 'unlimited';
  commission: number;
}

export interface Notification {
  id: string;
  type: 'job' | 'request' | 'message' | 'premium' | 'verification';
  title: string;
  body: string;
  timestamp: string;
  isRead: boolean;
  data?: Record<string, string>;
}

export interface JobRequest {
  id: string;
  jobId: string;
  status: 'pending' | 'accepted' | 'rejected';
  sentAt: string;
}

export type SortOption = 'nearest' | 'highest_fee' | 'newest';
export type DistanceFilter = 2 | 5 | 10 | null;

export interface JobFilters {
  city: string | null;
  subject: string | null;
  studentClass: string | null;
  board: string | null;
  genderPreference: 'Male' | 'Female' | 'Any' | null;
  teachingMode: 'Home Tuition' | 'Online' | 'Group' | null;
  distance: DistanceFilter;
}
