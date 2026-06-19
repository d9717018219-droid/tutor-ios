import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getItem, setItem } from '@/utils/storage';
import { STORAGE_KEYS } from '@/constants/config';
import { Teacher } from '@/types';
import { generateId } from '@/utils/format';
import { api } from '@/services/apiClient';

const DEFAULT_PROFILE: Teacher = {
  id: '',
  name: '',
  email: '',
  phone: '',
  gender: 'Male',
  dob: '',
  age: 0,
  qualification: '',
  experience: '',
  isSchoolTeacher: '',
  haveVehicle: '',
  classGroups: [],
  subjects: [],
  classes: [],
  boards: [],
  teachingModes: [],
  englishLevel: '',
  fee: '',
  preferredDays: [],
  preferredTime: [],
  city: '',
  areas: [],
  profilePhoto: undefined,
  aboutMe: '',
  languages: ['English', 'Hindi'],
  address: '',
  latitude: undefined,
  longitude: undefined,
  isPremium: false,
  premiumExpiry: undefined,
  isVerified: false,
  verificationStatus: 'none',
  profileCompletionPercentage: 0,
  totalJobsApplied: 0,
  activeChats: 0,
  profileViews: 0,
  totalEarnings: 0,
  referralCode: '',
  referralEarnings: 0,
  monthlyEarnings: 0,
  activeTuitions: 0,
};

interface ProfileContextType {
  profile: Teacher;
  isLoading: boolean;
  isSyncing: boolean;
  updateProfile: (data: Partial<Teacher>) => Promise<void>;
  loadProfile: (phone: string) => Promise<boolean>;
  refreshStats: () => void;
}

const ProfileContext = createContext<ProfileContextType | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Teacher>(DEFAULT_PROFILE);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => { loadSavedProfile(); }, []);

  async function loadSavedProfile() {
    const saved = await getItem<Teacher>(STORAGE_KEYS.PROFILE_DATA);
    if (saved) setProfile({ ...DEFAULT_PROFILE, ...saved });
  }

  async function loadProfile(phone: string): Promise<boolean> {
    setIsLoading(true);
    try {
      const res = await api.get<Teacher>(`/teachers/${phone}`);
      if (res.success && res.data) {
        const phpData = res.data as any;
        // Consider real data if ANY meaningful field OR if id/phone came back (record exists)
        const phpHasRealData = !!(phpData.id || phpData.phone || phpData.name || phpData.qualification || phpData.city || phpData.subjects?.length);

        if (phpHasRealData) {
          // PHP has actual profile data — use it as source of truth
          const merged: Teacher = {
            ...DEFAULT_PROFILE,
            ...phpData,
            phone,
            boards: phpData.boards ?? [],
            languages: phpData.languages ?? ['English', 'Hindi'],
            areas: phpData.areas ?? [],
            verificationStatus: phpData.isVerified ? 'approved' : (phpData.verificationStatus ?? 'none'),
            monthlyEarnings: parseFloat(phpData.monthly_earnings ?? phpData.monthlyEarnings ?? 0) || 0,
            activeTuitions: parseInt(phpData.active_tuitions ?? phpData.activeTuitions ?? 0, 10) || 0,
          };
          merged.profileCompletionPercentage = calculateCompletion(merged);
          setProfile(merged);
          await setItem(STORAGE_KEYS.PROFILE_DATA, merged);
          return true;
        }

        // PHP returned empty profile — check local cache first (user may have filled it before)
        const saved = await getItem<Teacher>(STORAGE_KEYS.PROFILE_DATA);
        if (saved && saved.phone === phone && saved.name) {
          setProfile({ ...DEFAULT_PROFILE, ...saved });
          return true;
        }

        // Truly new user — set phone so profile is linked
        const blank: Teacher = { ...DEFAULT_PROFILE, ...phpData, phone };
        setProfile(blank);
        await setItem(STORAGE_KEYS.PROFILE_DATA, blank);
        return true;
      }
    } catch {
    } finally {
      setIsLoading(false);
    }

    // PHP unreachable — load from local storage if available (returning user on slow network).
    const saved = await getItem<Teacher>(STORAGE_KEYS.PROFILE_DATA);
    if (saved && saved.phone === phone) {
      setProfile({ ...DEFAULT_PROFILE, ...saved });
      return !!(saved.name); // true only if they have real data cached
    }
    return false;
  }

  async function updateProfile(data: Partial<Teacher>) {
    const updated: Teacher = { ...profile, ...data };
    updated.profileCompletionPercentage = calculateCompletion(updated);
    setProfile(updated);
    await setItem(STORAGE_KEYS.PROFILE_DATA, updated);

    // Guard: never send empty/blank profile to PHP — it would wipe existing data.
    // Only sync when the profile has at least a name (i.e., meaningful data).
    if (!updated.phone || !updated.name) return;
    setIsSyncing(true);
    try {
      await api.post('/teachers', {
        phone: updated.phone,
        name: updated.name,
        email: updated.email,
        gender: updated.gender,
        age: updated.age,
        dob: updated.dob,
        qualification: updated.qualification,
        experience: updated.experience,
        isSchoolTeacher: updated.isSchoolTeacher,
        haveVehicle: updated.haveVehicle,
        classGroups: updated.classGroups,
        subjects: updated.subjects,
        classes: updated.classes,
        teachingModes: updated.teachingModes,
        englishLevel: updated.englishLevel,
        fee: updated.fee,
        preferredDays: updated.preferredDays,
        preferredTime: updated.preferredTime,
        city: updated.city,
        areas: updated.areas,
        address: updated.address,
        aboutMe: updated.aboutMe,
        profilePhoto: updated.profilePhoto,
        totalEarnings: updated.totalEarnings,
        activeChats: updated.activeChats,
        isPremium: updated.isPremium,
        planId: (updated as any).planId,
        premiumExpiry: updated.premiumExpiry,
        lastPaymentId: (updated as any).lastPaymentId,
      });
    } catch (err) {
      console.warn('[ProfileContext] PHP API sync failed — saved locally only:', err);
    } finally {
      setIsSyncing(false);
    }
  }

  function refreshStats() {
    setProfile((p) => ({ ...p, profileViews: p.profileViews + 1 }));
  }

  return (
    <ProfileContext.Provider value={{ profile, isLoading, isSyncing, updateProfile, loadProfile, refreshStats }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}

function calculateCompletion(p: Teacher): number {
  const fields = [
    !!p.name, !!p.email, !!p.phone, !!p.gender, !!p.dob,
    !!p.qualification, !!p.experience,
    p.subjects.length > 0,
    // classGroups is what PHP stores/returns (class_group column); classes is always [] from PHP
    (p.classGroups?.length ?? 0) > 0 || (p.classes?.length ?? 0) > 0,
    p.teachingModes.length > 0, !!p.city, !!p.aboutMe, !!p.address,
  ];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}
