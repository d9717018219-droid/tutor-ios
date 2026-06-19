import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Platform, StyleSheet, View, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useProfile } from '@/contexts/ProfileContext';
import { useConnections } from '@/hooks/useFirebaseChat';

function useUnreadAlertsCount(): number {
  const { profile } = useProfile();
  const { connections } = useConnections(profile.phone);
  return connections.filter((c) => c.unreadCount > 0).length;
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';
  const unreadAlerts = useUnreadAlertsCount();

  const safeBottom = Platform.OS === 'android' ? Math.max(insets.bottom, 8) : insets.bottom;
  const tabHeight = isWeb ? 84 : 56 + safeBottom;
  const tabPadBottom = isWeb ? 20 : safeBottom;

  const TAB_COLORS: Record<string, string> = {
    index:    colors.tabHome,
    jobs:     colors.tabJobs,
    earnings: colors.tabEarnings,
    alerts:   colors.tabAlerts,
    profile:  colors.tabProfile,
  };

  function tabIcon(featherIcon: string, color: string, focused: boolean) {
    return (
      <View style={[styles.iconWrap, focused && { backgroundColor: color + '22' }]}>
        <Feather name={featherIcon as any} size={21} color={color} />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isIOS ? 'transparent' : '#FFFDFB',
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          height: tabHeight,
          paddingBottom: tabPadBottom,
          paddingTop: 8,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={90} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFDFB' }]} />
          ) : null,
        tabBarLabelStyle: { fontSize: 10, fontFamily: 'Inter_600SemiBold', marginTop: 1 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarActiveTintColor: TAB_COLORS.index,
          tabBarIcon: ({ color, focused }) => tabIcon('home', color, focused),
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: 'Jobs',
          tabBarActiveTintColor: TAB_COLORS.jobs,
          tabBarIcon: ({ color, focused }) => tabIcon('briefcase', color, focused),
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: 'Earnings',
          tabBarActiveTintColor: TAB_COLORS.earnings,
          tabBarIcon: ({ color, focused }) => tabIcon('trending-up', color, focused),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarActiveTintColor: TAB_COLORS.alerts,
          tabBarIcon: ({ color, focused }) => tabIcon('bell', color, focused),
          tabBarBadge: unreadAlerts > 0 ? unreadAlerts : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.primary, fontSize: 10 },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarActiveTintColor: TAB_COLORS.profile,
          tabBarIcon: ({ color, focused }) => tabIcon('user', color, focused),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: { width: 42, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});

export default function TabLayout() {
  return <ClassicTabLayout />;
}
