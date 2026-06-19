import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProfile } from '@/contexts/ProfileContext';

interface AppHeaderProps {
  notificationCount?: number;
  title?: string;
  subtitle?: string;
}

export function AppHeader({ notificationCount = 0, title, subtitle }: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const topPad = Platform.OS === 'web' ? 56 : insets.top;
  const firstName = (profile.name || 'Teacher').split(' ')[0];
  const hour = new Date().getHours();
  const timeEmoji = hour < 12 ? '🌅' : hour < 17 ? '☀️' : '🌙';

  // Tutor ID: only show if it's a short numeric string (from PHP API)
  const tutorId = profile.id && /^\d+$/.test(profile.id) ? profile.id : null;

  const showMeta = !!(tutorId || profile.city);

  return (
    <LinearGradient
      colors={['#2A1040', '#694475', '#3B7A94']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.root, { paddingTop: topPad + 6 }]}
    >
      {/* decorative blobs */}
      <View style={styles.blob1} />
      <View style={styles.blob2} />
      <View style={styles.blob3} />

      <View style={styles.inner}>
        <View style={styles.left}>
          {title ? (
            <>
              <Text style={styles.pageTitle}>{title}</Text>
              {subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}
            </>
          ) : (
            <>
              <Text style={styles.greet}>{timeEmoji} Good {hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening'}</Text>
              <Text style={styles.name}>{firstName} 👋</Text>
              {showMeta && (
                <View style={styles.metaRow}>
                  {tutorId && (
                    <View style={styles.metaChip}>
                      <Feather name="hash" size={10} color="rgba(220,200,230,0.85)" />
                      <Text style={styles.metaText}>ID {tutorId}</Text>
                    </View>
                  )}
                  {profile.city && (
                    <View style={styles.metaChip}>
                      <Feather name="map-pin" size={10} color="rgba(220,200,230,0.85)" />
                      <Text style={styles.metaText}>{profile.city}</Text>
                    </View>
                  )}
                </View>
              )}
            </>
          )}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/alerts')} style={styles.iconBtn}>
            <Feather name="bell" size={20} color="#fff" />
            {notificationCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeTxt}>{notificationCount > 9 ? '9+' : notificationCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} style={styles.avatarBtn}>
            <Text style={styles.avatarInitial}>{firstName[0].toUpperCase()}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: 20, paddingBottom: 20, overflow: 'hidden' },
  blob1: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(189,170,147,0.12)', top: -60, right: -40,
  },
  blob2: {
    position: 'absolute', width: 110, height: 110, borderRadius: 55,
    backgroundColor: 'rgba(63,166,131,0.10)', bottom: -30, left: 50,
  },
  blob3: {
    position: 'absolute', width: 70, height: 70, borderRadius: 35,
    backgroundColor: 'rgba(166,63,132,0.12)', top: 10, left: 160,
  },
  inner: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 6 },
  left: { gap: 2, flex: 1 },
  greet: { color: 'rgba(220,200,230,0.9)', fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  name: { color: '#fff', fontSize: 26, fontFamily: 'Inter_700Bold', marginTop: 2 },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { color: 'rgba(220,200,230,0.85)', fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  pageTitle: { color: '#fff', fontSize: 26, fontFamily: 'Inter_700Bold' },
  pageSubtitle: { color: 'rgba(220,200,230,0.85)', fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1.4, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  iconBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#A63F84', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3, borderWidth: 2, borderColor: '#694475',
  },
  badgeTxt: { color: '#fff', fontSize: 9, fontFamily: 'Inter_700Bold' },
  avatarBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.20)', borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { color: '#fff', fontSize: 17, fontFamily: 'Inter_700Bold' },
});
