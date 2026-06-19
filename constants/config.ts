import { PremiumPlan } from '@/types';
export { CITIES, CITY_AREAS } from './cityAreas';

export const API_BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN ?? 'localhost'}/api`;

export const PREMIUM_PLANS: PremiumPlan[] = [
  {
    id: 'free', name: 'Starter', duration: '1 Month', months: 1,
    price: 1,
    requestLimit: 20, chatLimit: 5, commission: 50,
  },
  {
    id: 'silver', name: 'Silver', duration: '1 Month', months: 1,
    price: 299, originalPrice: 399,
    requestLimit: 'unlimited', chatLimit: 30, commission: 50,
  },
  {
    id: 'gold', name: 'Gold', duration: '1 Month', months: 1,
    price: 599, originalPrice: 799, popular: true,
    requestLimit: 'unlimited', chatLimit: 60, commission: 45,
  },
  {
    id: 'platinum', name: 'Platinum', duration: '1 Month', months: 1,
    price: 899, originalPrice: 1199,
    requestLimit: 'unlimited', chatLimit: 'unlimited', commission: 40,
  },
];

export const PREMIUM_BENEFITS = [
  'Priority Profile Placement',
  'Verified Tutor Badge',
  'More Tuition Leads',
  'Higher Search Ranking',
  'Premium Support 24/7',
];

export const CLASS_GROUPS = [
  'Class I to V',
  'Class VI to VIII',
  'Class IX to X',
  'Class XI to XII',
] as const;

export const CLASSES_BY_GROUP: Record<string, string[]> = {
  'Class I to V':    ['1st Std', '2nd Std', '3rd Std', '4th Std', '5th Std'],
  'Class VI to VIII':['6th Std', '7th Std', '8th Std', '9th Std'],
  'Class IX to X':   ['9th Std', '10th Std'],
  'Class XI to XII': ['11th Std', '12th Std'],
};

export const SUBJECTS_BY_GROUP: Record<string, string[]> = {
  'Class I to V': [
    'All Subjects (General)', 'English', 'Hindi', 'Maths', 'EVS',
    'Jolly Phonics', 'Abacus', 'Vedic Maths', 'Computer',
    'Cursive Writing', 'Storytelling', 'Art & Craft',
  ],
  'Class VI to VIII': [
    'Maths', 'Science (Physics, Chemistry, Biology)', 'Social Science (SST)',
    'English', 'Hindi', 'Sanskrit', 'French', 'German', 'Spanish',
    'Computer/ICT', 'Robotics',
  ],
  'Class IX to X': [
    'Maths (Standard/Basic)', 'Physics', 'Chemistry', 'Biology',
    'History', 'Civics', 'Geography', 'Economics',
    'English (Language & Literature)', 'Hindi (A/B)', 'French', 'German',
    'Information Technology (IT)', 'Artificial Intelligence (AI)',
  ],
  'Class XI to XII': [
    'Physics', 'Chemistry', 'Maths', 'Biology', 'Biotechnology', 'IP',
    'Accounts', 'Business Studies', 'Economics', 'Applied Maths',
    'Entrepreneurship', 'Psychology', 'Sociology', 'Political Science',
    'History', 'Geography', 'Home Science', 'Legal Studies',
    'English Core', 'English Elective', 'Physical Education', 'Fine Arts',
  ],
};

export function getSubjectsForGroups(groups: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const g of groups) {
    for (const s of SUBJECTS_BY_GROUP[g] ?? []) {
      if (!seen.has(s)) { seen.add(s); result.push(s); }
    }
  }
  return result;
}

export function getClassesForGroups(groups: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const g of groups) {
    for (const c of CLASSES_BY_GROUP[g] ?? []) {
      if (!seen.has(c)) { seen.add(c); result.push(c); }
    }
  }
  return result;
}

export const CLASSES = [
  '1st Std', '2nd Std', '3rd Std', '4th Std', '5th Std',
  '6th Std', '7th Std', '8th Std', '9th Std', '10th Std', '11th Std', '12th Std',
];

export const SUBJECTS = [
  'All Subjects (General)', 'English', 'Hindi', 'Maths', 'EVS',
  'Jolly Phonics', 'Abacus', 'Vedic Maths', 'Computer', 'Cursive Writing',
  'Storytelling', 'Art & Craft',
  'Science (Physics, Chemistry, Biology)', 'Social Science (SST)',
  'Sanskrit', 'French', 'German', 'Spanish', 'Computer/ICT', 'Robotics',
  'Maths (Standard/Basic)', 'Physics', 'Chemistry', 'Biology',
  'History', 'Civics', 'Geography', 'Economics',
  'English (Language & Literature)', 'Hindi (A/B)',
  'Information Technology (IT)', 'Artificial Intelligence (AI)',
  'Biotechnology', 'IP', 'Accounts', 'Business Studies', 'Applied Maths',
  'Entrepreneurship', 'Psychology', 'Sociology', 'Political Science',
  'Home Science', 'Legal Studies', 'English Core', 'English Elective',
  'Physical Education', 'Fine Arts',
];

export const BOARDS = ['CBSE', 'ICSE', 'State Board', 'IB', 'IGCSE', 'NIOS'];

export const LANGUAGES = [
  'English', 'Hindi', 'Bengali', 'Tamil', 'Telugu', 'Marathi',
  'Gujarati', 'Kannada', 'Malayalam', 'Punjabi', 'Urdu',
];

export const QUALIFICATIONS = [
  'B.Arch', 'B.Com', 'B.Ed', 'B.LLB', 'B.Lib', 'B.Ped', 'B.Pharma', 'B.Sc', 'B.Tech',
  'BA', 'BBA', 'BBM', 'BCA', 'BDS', 'BFA', 'BHM', 'BJ', 'BPT',
  'CA', 'CFA', 'CS',
  'D.Ed', 'D.El.Ed', 'DM', 'DNB',
  'Ed.D.', 'ICWA',
  'LLB', 'LLM',
  'M.Arch', 'M.Com', 'M.Ed', 'M.Ped', 'M.Pharma', 'M.Sc', 'M.Tech',
  'MA', 'MBA', 'MBBS', 'MCA', 'MD', 'MDS', 'MS',
  'NTT', 'PGDCA', 'PGDM',
  'Ph.D.',
];

export const EXPERIENCE_OPTIONS = [
  'Less than 1 Year',
  '1 to 3 Years',
  '3 to 5 Years',
  '5 to 10 Years',
  'More than 10 Years',
];

export const TEACHING_MODES = [
  'Classes at Home',
  'Online',
] as const;

export const TIME_SLOT_GROUPS: { label: string; slots: string[] }[] = [
  { label: '🌅 Morning', slots: ['06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM'] },
  { label: '☀️ Afternoon', slots: ['12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'] },
  { label: '🌆 Evening', slots: ['06:00 PM', '07:00 PM', '08:00 PM', '09:00 PM'] },
];

export const YES_NO = ['Yes', 'No'] as const;

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const TIME_SLOTS = [
  '06:00 AM', '06:30 AM', '07:00 AM', '07:30 AM', '08:00 AM', '08:30 AM',
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
  '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM',
  '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM', '08:00 PM', '08:30 PM',
  '09:00 PM',
];

export const ENGLISH_LEVELS = [
  'Beginner',
  'Intermediate',
  'Fluent',
] as const;

export const ENGLISH_LEVEL_DESC: Record<string, string> = {
  Beginner: 'Understands English, prefers Hindi/Regional',
  Intermediate: 'Speaks comfortably, explains in English',
  Fluent: 'Teaches entire session strictly in English',
};

export const FEE_OPTIONS = [
  '₹200/hr (Entry Level)',
  '₹300/hr (Standard)',
  '₹400/hr (Recommended)',
  '₹500/hr (Experienced)',
  '₹600/hr (Expert)',
  '₹700/hr (Senior)',
  '₹800/hr (Premium)',
  '₹1000+/hr (Specialist)',
];

export const STORAGE_KEYS = {
  AUTH_TOKEN: '@doable_auth_token',
  USER_DATA: '@doable_user_data',
  PROFILE_DATA: '@doable_profile_data',
  SAVED_JOBS: '@doable_saved_jobs',
  APPLIED_JOBS: '@doable_applied_jobs',
  CHATS: '@doable_chats',
  MESSAGES: '@doable_messages',
  NOTIFICATIONS: '@doable_notifications',
  SUBSCRIPTION: '@doable_subscription',
};

export const TEACHER_TIPS = [
  { title: 'Complete Your Profile', desc: 'Profiles with photos get 3x more responses from parents.' },
  { title: 'Get Verified', desc: 'Verified tutors appear higher in search results.' },
  { title: 'Be Responsive', desc: 'Replying quickly to parents increases your acceptance rate.' },
  { title: 'Set Competitive Fees', desc: 'Research local rates to attract more job offers.' },
  { title: 'Go Premium', desc: 'Premium tutors get 5x more visibility and lead access.' },
];
