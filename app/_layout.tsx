import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts as useInterFonts,
} from '@expo-google-fonts/inter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Slot, router, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useRef } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ProfileProvider } from '@/contexts/ProfileContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import {
  registerForPushNotifications,
  addNotificationListener,
  addResponseListener,
} from '@/services/notificationService';

SplashScreen.preventAutoHideAsync();
const queryClient = new QueryClient();

function AuthGate() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const segments = useSegments();
  const notifListener = useRef<{ remove: () => void } | null>(null);
  const responseListener = useRef<{ remove: () => void } | null>(null);

  useEffect(() => {
    if (isAuthenticated && user?.phone) {
      registerForPushNotifications(user.phone).catch(() => {});
      notifListener.current = addNotificationListener((notification: any) => {
        console.log('Notification received:', notification?.request?.content?.title);
      });
      responseListener.current = addResponseListener((response: any) => {
        const data = response?.notification?.request?.content?.data as Record<string, string> | undefined;
        if (data?.route) router.push(data.route as any);
      });
    }
    return () => {
      notifListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [isAuthenticated, user?.phone]);

  useEffect(() => {
    if (isLoading) return;
    const inAuth = segments[0] === 'auth';
    const inOtp  = inAuth && segments[1] === 'otp';

    if (!isAuthenticated && !inAuth) {
      router.replace('/auth');
    } else if (isAuthenticated && inAuth && inOtp) {
      // OTP screen: navigate once completeProfile() sets isProfileComplete
      if (user?.isProfileComplete) {
        router.replace('/(tabs)');
      }
      // If not complete yet, otp.tsx navigates to /auth/register for new users
    } else if (isAuthenticated && inAuth && !inOtp) {
      if (!user?.isProfileComplete) {
        router.replace('/auth/register');
      } else {
        router.replace('/(tabs)');
      }
    } else if (isAuthenticated && !inAuth && !user?.isProfileComplete) {
      const inRegister = (segments[0] as string) === 'auth' && (segments[1] as string) === 'register';
      if (!inRegister) router.replace('/auth/register');
    }
  }, [isAuthenticated, isLoading, segments, user]);

  return <Slot />;
}

function RootLayoutNav() {
  return (
    <AuthProvider>
      <ProfileProvider>
        <SubscriptionProvider>
          <AuthGate />
        </SubscriptionProvider>
      </ProfileProvider>
    </AuthProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useInterFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <RootLayoutNav />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
