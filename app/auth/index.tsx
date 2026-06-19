import React, { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/useColors';

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { checkPhone, sendOtp, loginWithGoogle } = useAuth();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [greeting, setGreeting] = useState<string | null>(null);

  async function handlePhoneChange(t: string) {
    setPhone(t);
    setError('');
    setGreeting(null);
    const cleaned = t.replace(/\D/g, '');
    if (cleaned.length === 10) {
      const info = await checkPhone(cleaned);
      if (info.exists && info.name) {
        setGreeting(`Welcome back, ${info.name.split(' ')[0]}! 👋`);
      }
    }
  }

  async function handleSendOtp() {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length !== 10) { setError('Please enter a valid 10-digit mobile number'); return; }
    setError('');
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const result = await sendOtp(cleaned);
      if (!result.success) { setError('Failed to send OTP. Please try again.'); return; }
      router.push({ pathname: '/auth/otp', params: { phone: cleaned, devOtp: result.devOtp ?? '' } });
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const ok = await loginWithGoogle();
      if (ok) router.replace('/auth/register');
    } finally {
      setGoogleLoading(false);
    }
  }

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.heroBg, { backgroundColor: colors.primary, paddingTop: topPad + 20 }]}>
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />
        <View style={styles.decorCircle3} />

        <View style={styles.logoRow}>
          <View style={[styles.logoBox, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
            <Feather name="book-open" size={28} color="#fff" />
          </View>
        </View>
        <Text style={styles.brand}>DoAble India</Text>
        <Text style={styles.tagline}>For Teachers</Text>

        <View style={styles.pillsRow}>
          {['Find Jobs', 'Chat Parents', 'Earn More'].map((t, i) => (
            <View key={i} style={[styles.pill, { backgroundColor: ['rgba(255,87,87,0.3)', 'rgba(0,201,167,0.3)', 'rgba(255,187,0,0.3)'][i] }]}>
              <Text style={styles.pillText}>{t}</Text>
            </View>
          ))}
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView
          contentContainerStyle={[styles.formContent, { paddingBottom: (Platform.OS === 'web' ? 34 : insets.bottom) + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Login with Mobile</Text>

          <View style={[styles.phoneRow, { borderColor: error ? colors.destructive : colors.border, backgroundColor: colors.card }]}>
            <View style={styles.countryCode}>
              <Text style={[styles.code, { color: colors.text }]}>+91</Text>
            </View>
            <View style={[styles.vertDiv, { backgroundColor: colors.border }]} />
            <TextInput
              style={[styles.phoneInput, { color: colors.text }]}
              placeholder="Enter mobile number"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="phone-pad"
              maxLength={10}
              value={phone}
              onChangeText={handlePhoneChange}
              returnKeyType="done"
              onSubmitEditing={handleSendOtp}
            />
          </View>

          {!!greeting && !error && (
            <View style={[styles.greetingRow, { backgroundColor: colors.accent + '15', borderColor: colors.accent + '30' }]}>
              <Feather name="user-check" size={14} color={colors.accent} />
              <Text style={[styles.greetingText, { color: colors.accent }]}>{greeting}</Text>
            </View>
          )}
          {!!error && <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>}

          <TouchableOpacity
            activeOpacity={0.88}
            onPress={handleSendOtp}
            disabled={loading}
            style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: loading ? 0.75 : 1 }]}
          >
            {loading ? <ActivityIndicator color="#fff" /> : (
              <Text style={styles.primaryBtnText}>Send OTP</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>OR</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <TouchableOpacity
            activeOpacity={0.88}
            onPress={handleGoogle}
            disabled={googleLoading}
            style={[styles.googleBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
          >
            {googleLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Text style={styles.googleG}>G</Text>
                <Text style={[styles.googleText, { color: colors.text }]}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.signupsRow}>
            {[{ icon: 'shield', label: '10K+ Tutors', color: colors.coral }, { icon: 'star', label: 'Verified Jobs', color: colors.amber }, { icon: 'trending-up', label: 'Best Earnings', color: colors.accent }].map((item, i) => (
              <View key={i} style={[styles.signupBadge, { backgroundColor: item.color + '12', borderColor: item.color + '30' }]}>
                <Feather name={item.icon as any} size={13} color={item.color} />
                <Text style={[styles.signupBadgeText, { color: item.color }]}>{item.label}</Text>
              </View>
            ))}
          </View>

          <Text style={[styles.termsText, { color: colors.mutedForeground }]}>
            By continuing, you agree to our{' '}
            <Text style={{ color: colors.primary }}>Terms of Service</Text> &{' '}
            <Text style={{ color: colors.primary }}>Privacy Policy</Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  heroBg: { paddingHorizontal: 24, paddingBottom: 28, overflow: 'hidden', position: 'relative' },
  decorCircle1: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,87,87,0.18)', top: -40, right: -40,
  },
  decorCircle2: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(0,201,167,0.15)', bottom: -20, left: -20,
  },
  decorCircle3: {
    position: 'absolute', width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,187,0,0.20)', top: 30, left: 30,
  },
  logoRow: { alignItems: 'center', marginBottom: 10 },
  logoBox: {
    width: 68, height: 68, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)',
  },
  brand: { color: '#fff', fontSize: 30, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  tagline: { color: 'rgba(255,255,255,0.85)', fontSize: 15, fontFamily: 'Inter_600SemiBold', textAlign: 'center', marginTop: 2 },
  pillsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 14 },
  pill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  pillText: { color: '#fff', fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  formContent: { padding: 24, gap: 14 },
  sectionTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', marginBottom: 4 },
  phoneRow: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1.5,
    borderRadius: 16, overflow: 'hidden', height: 56,
  },
  countryCode: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12 },
  flagText: { fontSize: 20 },
  code: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  vertDiv: { width: 1, height: 30 },
  phoneInput: { flex: 1, paddingHorizontal: 12, fontSize: 16, fontFamily: 'Inter_400Regular' },
  greetingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, marginTop: -6,
  },
  greetingText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', flex: 1 },
  errorText: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: -6 },
  primaryBtn: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_700Bold' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  googleBtn: {
    height: 56, borderRadius: 16, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1.5,
  },
  googleG: { fontSize: 22, fontFamily: 'Inter_700Bold', color: '#4285F4' },
  googleText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  signupsRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', flexWrap: 'wrap' },
  signupBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1,
  },
  signupBadgeText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  termsText: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 18 },
});
