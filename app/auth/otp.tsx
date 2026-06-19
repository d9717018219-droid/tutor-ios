import React, { useRef, useState, useEffect } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { useColors } from '@/hooks/useColors';

const OTP_LENGTH = 4;

export default function OtpScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { phone, devOtp } = useLocalSearchParams<{ phone: string; devOtp?: string }>();
  const { login, sendOtp, completeProfile } = useAuth();
  const { loadProfile } = useProfile();
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(30);
  const [devCode, setDevCode] = useState<string | undefined>(devOtp || undefined);
  const ref0 = useRef<TextInput>(null);
  const ref1 = useRef<TextInput>(null);
  const ref2 = useRef<TextInput>(null);
  const ref3 = useRef<TextInput>(null);
  const refs = [ref0, ref1, ref2, ref3];

  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [resendTimer]);

  function handleChange(val: string, idx: number) {
    const digit = val.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[idx] = digit;
    setOtp(newOtp);
    setError('');
    if (digit && idx < OTP_LENGTH - 1) refs[idx + 1].current?.focus();
    if (!digit && idx > 0) refs[idx - 1].current?.focus();
  }

  function handleKeyPress(key: string, idx: number) {
    if (key === 'Backspace' && !otp[idx] && idx > 0) refs[idx - 1].current?.focus();
  }

  function autoFillOtp() {
    if (!devCode) return;
    const digits = devCode.split('').slice(0, OTP_LENGTH);
    setOtp(digits);
    refs[OTP_LENGTH - 1].current?.focus();
  }

  async function handleVerify() {
    const code = otp.join('');
    if (code.length !== OTP_LENGTH) {
      setError(`Please enter the complete ${OTP_LENGTH}-digit OTP`);
      return;
    }
    setLoading(true);
    setError('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await login(phone ?? '', code);
      if (result.success) {
        const isExistingUser = await loadProfile(phone ?? '');
        // Also treat as existing if PHP auth already said this phone is registered —
        // loadProfile can fail temporarily (network), but we shouldn't force re-registration.
        const phpKnowsUser = result.phoneCheck?.exists === true;
        if (isExistingUser || phpKnowsUser) {
          // completeProfile() sets isProfileComplete: true → AuthGate navigates to /(tabs)
          // Don't call router.replace here — avoids race condition where AuthGate
          // fires with stale isProfileComplete:false and redirects back to register.
          completeProfile();
        } else {
          router.replace('/auth/register');
        }
      } else {
        setError('Invalid OTP. Please try again.');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendTimer > 0) return;
    setResendTimer(30);
    setOtp(Array(OTP_LENGTH).fill(''));
    setDevCode(undefined);
    refs[0].current?.focus();
    const result = await sendOtp(phone ?? '');
    if (result.devOtp) setDevCode(result.devOtp);
  }

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.secondary }]}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Verify OTP</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={[styles.content, { paddingBottom: bottomPad + 24 }]}>

          <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
            <Text style={styles.waIcon}>💬</Text>
          </View>

          <Text style={[styles.title, { color: colors.text }]}>Check WhatsApp</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            We sent a 4-digit OTP on WhatsApp to{'\n'}
            <Text style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}>
              +91 {phone?.slice(0, 5)} {phone?.slice(5)}
            </Text>
          </Text>

          {!!devCode && (
            <TouchableOpacity
              onPress={autoFillOtp}
              activeOpacity={0.8}
              style={[styles.devBanner, { backgroundColor: '#FFF8E1', borderColor: '#FFCA28' }]}
            >
              <Feather name="info" size={14} color="#B45309" />
              <Text style={styles.devBannerText}>
                Dev mode — OTP:{' '}
                <Text style={{ fontFamily: 'Inter_700Bold', color: '#6D28D9' }}>{devCode}</Text>
                {'  '}
                <Text style={{ color: '#7C3AED', textDecorationLine: 'underline' }}>Tap to fill</Text>
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.otpRow}>
            {otp.map((digit, idx) => (
              <TextInput
                key={idx}
                ref={refs[idx]}
                value={digit}
                onChangeText={(v) => handleChange(v, idx)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, idx)}
                style={[
                  styles.otpBox,
                  {
                    borderColor: digit ? colors.primary : colors.border,
                    backgroundColor: digit ? colors.primary + '10' : colors.card,
                    color: colors.text,
                  },
                ]}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                autoFocus={idx === 0}
              />
            ))}
          </View>

          {!!error && (
            <View style={[styles.errorRow, { backgroundColor: colors.destructive + '12', borderColor: colors.destructive + '30' }]}>
              <Feather name="alert-circle" size={14} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            activeOpacity={0.88}
            onPress={handleVerify}
            disabled={loading}
            style={[styles.verifyBtn, { backgroundColor: colors.primary, opacity: loading ? 0.75 : 1 }]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="check" size={18} color="#fff" />
                <Text style={styles.verifyText}>Verify & Continue</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={handleResend} disabled={resendTimer > 0} style={styles.resendBtn}>
            <Feather
              name="refresh-cw"
              size={13}
              color={resendTimer > 0 ? colors.mutedForeground : colors.primary}
            />
            <Text style={[styles.resendText, { color: resendTimer > 0 ? colors.mutedForeground : colors.primary }]}>
              {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
            </Text>
          </TouchableOpacity>

          <View style={[styles.infoBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Feather name="shield" size={13} color={colors.mutedForeground} />
            <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
              OTP is valid for 5 minutes. Do not share it with anyone.
            </Text>
          </View>

        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16 },
  iconWrap: { width: 76, height: 76, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  waIcon: { fontSize: 36 },
  title: { fontSize: 24, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  subtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 22 },
  devBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, width: '100%',
  },
  devBannerText: { fontSize: 13, fontFamily: 'Inter_400Regular', color: '#92400E', flex: 1 },
  otpRow: { flexDirection: 'row', gap: 14, marginVertical: 8 },
  otpBox: {
    width: 62, height: 70, borderRadius: 16, borderWidth: 2,
    textAlign: 'center', fontSize: 28, fontFamily: 'Inter_700Bold',
  },
  errorRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, width: '100%',
  },
  errorText: { fontSize: 13, fontFamily: 'Inter_400Regular', flex: 1 },
  verifyBtn: {
    width: '100%', height: 54, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4,
  },
  verifyText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  resendBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  resendText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  infoBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 12, borderWidth: 1, width: '100%', marginTop: 4,
  },
  infoText: { fontSize: 12, fontFamily: 'Inter_400Regular', flex: 1, lineHeight: 18 },
});
