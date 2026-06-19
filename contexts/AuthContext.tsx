import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { router } from 'expo-router';
import { getItem, setItem, removeItem } from '@/utils/storage';
import { STORAGE_KEYS } from '@/constants/config';
import { AuthUser } from '@/types';
import { api } from '@/services/apiClient';

export interface PhoneCheckResult {
  exists: boolean;
  userType: 'teacher' | 'parent' | null;
  name: string | null;
  isRegistered: boolean;
}

export interface LoginResult {
  success: boolean;
  phoneCheck?: PhoneCheckResult;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  checkPhone: (phone: string) => Promise<PhoneCheckResult>;
  sendOtp: (phone: string) => Promise<{ success: boolean; devOtp?: string }>;
  login: (phone: string, otp: string) => Promise<LoginResult>;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => Promise<void>;
  completeProfile: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { loadUser(); }, []);

  async function loadUser() {
    try {
      const saved = await getItem<AuthUser>(STORAGE_KEYS.USER_DATA);
      if (saved) setUser(saved);
    } finally {
      setIsLoading(false);
    }
  }

  async function checkPhone(phone: string): Promise<PhoneCheckResult> {
    try {
      const res = await api.post('/auth/check-phone', { phone });
      if (res.success) return {
        exists: (res.exists as boolean) ?? false,
        userType: (res.userType as 'teacher' | 'parent' | null) ?? null,
        name: (res.name as string | null) ?? null,
        isRegistered: (res.isRegistered as boolean) ?? false,
      };
    } catch {}
    return { exists: false, userType: null, name: null, isRegistered: false };
  }

  async function sendOtp(phone: string): Promise<{ success: boolean; devOtp?: string }> {
    try {
      const res = await api.post<{ dev?: boolean; otp?: string }>('/auth/send-otp', { phone });
      if (res.success) {
        return { success: true, devOtp: res.dev ? (res as any).otp : undefined };
      }
      return { success: false };
    } catch {
      return { success: false };
    }
  }

  async function login(phone: string, otp: string): Promise<LoginResult> {
    try {
      const res = await api.post('/auth/verify-otp', { phone, otp });
      if (res.success) {
        const newUser: AuthUser = { id: Date.now().toString(), phone, isProfileComplete: false };
        await setItem(STORAGE_KEYS.USER_DATA, newUser);
        setUser(newUser);
        return {
          success: true,
          phoneCheck: {
            exists: (res.exists as boolean) ?? false,
            userType: (res.userType as 'teacher' | 'parent' | null) ?? null,
            name: (res.name as string | null) ?? null,
            isRegistered: (res.isRegistered as boolean) ?? false,
          },
        };
      }
      return { success: false };
    } catch {
      return { success: false };
    }
  }

  async function loginWithGoogle(): Promise<boolean> {
    const newUser: AuthUser = {
      id: Date.now().toString(),
      phone: '',
      name: 'Rajesh Sharma',
      isProfileComplete: false,
    };
    await setItem(STORAGE_KEYS.USER_DATA, newUser);
    setUser(newUser);
    return true;
  }

  function completeProfile() {
    // Use functional setUser so we always get the latest state —
    // avoids stale closure bug when called right after login() schedules setUser.
    setUser((current) => {
      if (!current) return current;
      const updated = { ...current, isProfileComplete: true };
      setItem(STORAGE_KEYS.USER_DATA, updated);
      return updated;
    });
  }

  async function logout() {
    await removeItem(STORAGE_KEYS.USER_DATA);
    // Keep PROFILE_DATA so returning user gets their data pre-filled.
    // loadProfile always checks saved.phone === phone, so cross-user leaks are impossible.
    setUser(null);
    router.replace('/auth');
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, checkPhone, sendOtp, login, loginWithGoogle, logout, completeProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
