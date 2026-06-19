import React, { useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useProfile } from '@/contexts/ProfileContext';

const BENEFITS = [
  { icon: 'shield', title: 'Verified Badge', desc: 'Display a trust badge on your profile' },
  { icon: 'trending-up', title: 'Higher Visibility', desc: 'Appear higher in search results' },
  { icon: 'star', title: 'Priority Leads', desc: 'Get first access to new tuition jobs' },
  { icon: 'award', title: 'Trust Score', desc: 'Build credibility with parents' },
  { icon: 'users', title: 'Featured Profile', desc: 'Get featured in city-specific listings' },
];

export default function VerifiedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile } = useProfile();
  const [applying, setApplying] = useState(false);
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const status = profile.verificationStatus;

  async function handleApply() {
    setApplying(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await new Promise((r) => setTimeout(r, 1500));
    await updateProfile({ verificationStatus: 'pending' });
    setApplying(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (Platform.OS !== 'web') {
      Alert.alert('Application Submitted!', 'Your verification request has been received. We will review and notify you within 24-48 hours.', [{ text: 'OK', onPress: () => router.back() }]);
    } else {
      router.back();
    }
  }

  const statusConfig = ({
    none: { color: colors.mutedForeground, label: 'Not Applied', icon: 'circle' },
    pending: { color: colors.warning, label: 'Under Review', icon: 'clock' },
    approved: { color: colors.accent, label: 'Verified', icon: 'check-circle' },
    rejected: { color: colors.destructive, label: 'Rejected', icon: 'x-circle' },
  } as Record<string, { color: string; label: string; icon: string }>)[status] ?? { color: colors.mutedForeground, label: 'Not Applied', icon: 'circle' };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={styles.heroContent}>
          <View style={[styles.shieldWrap, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
            <Feather name="shield" size={32} color="#FFD700" />
          </View>
          <Text style={styles.heroTitle}>Verified Tutor</Text>
          <Text style={styles.heroSub}>Build trust with parents and get more leads</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '30' }]}>
            <Feather name={statusConfig.icon as any} size={14} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>Status: {statusConfig.label}</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 100 }]} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Why Get Verified?</Text>
        <View style={[styles.benefitsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {BENEFITS.map((b, i) => (
            <View key={i} style={[styles.benefitItem, { borderBottomColor: colors.border }, i === BENEFITS.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={[styles.benefitIcon, { backgroundColor: colors.primary + '18' }]}>
                <Feather name={b.icon as any} size={18} color={colors.primary} />
              </View>
              <View style={styles.benefitText}>
                <Text style={[styles.benefitTitle, { color: colors.text }]}>{b.title}</Text>
                <Text style={[styles.benefitDesc, { color: colors.mutedForeground }]}>{b.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {status === 'none' || status === 'rejected' ? (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>What to Submit</Text>
            {[
              { icon: 'credit-card', title: 'Government ID Proof', desc: 'Aadhaar Card, PAN Card, or Passport' },
              { icon: 'book', title: 'Qualification Certificate', desc: 'Your highest degree certificate' },
              { icon: 'camera', title: 'Selfie Verification', desc: 'A clear selfie holding your ID card' },
            ].map((doc, i) => (
              <TouchableOpacity key={i} activeOpacity={0.85} style={[styles.uploadCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.uploadIcon, { backgroundColor: colors.secondary }]}>
                  <Feather name={doc.icon as any} size={20} color={colors.primary} />
                </View>
                <View style={styles.uploadInfo}>
                  <Text style={[styles.uploadTitle, { color: colors.text }]}>{doc.title}</Text>
                  <Text style={[styles.uploadDesc, { color: colors.mutedForeground }]}>{doc.desc}</Text>
                </View>
                <View style={[styles.uploadBtn, { backgroundColor: colors.secondary }]}>
                  <Feather name="upload" size={16} color={colors.primary} />
                </View>
              </TouchableOpacity>
            ))}
          </>
        ) : null}

        {status === 'pending' && (
          <View style={[styles.pendingCard, { backgroundColor: colors.warning + '12', borderColor: colors.warning }]}>
            <Feather name="clock" size={20} color={colors.warning} />
            <View style={styles.pendingInfo}>
              <Text style={[styles.pendingTitle, { color: colors.text }]}>Application Under Review</Text>
              <Text style={[styles.pendingDesc, { color: colors.mutedForeground }]}>Our team is reviewing your documents. You will be notified within 24-48 hours.</Text>
            </View>
          </View>
        )}

        {status === 'approved' && (
          <View style={[styles.approvedCard, { backgroundColor: colors.accent + '12', borderColor: colors.accent }]}>
            <Feather name="check-circle" size={24} color={colors.accent} />
            <View>
              <Text style={[styles.approvedTitle, { color: colors.accent }]}>You are Verified!</Text>
              <Text style={[styles.approvedDesc, { color: colors.mutedForeground }]}>Your Verified Tutor badge is live on your profile.</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {(status === 'none' || status === 'rejected') && (
        <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background, paddingBottom: bottomPad + 8 }]}>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={handleApply}
            disabled={applying}
            style={[styles.applyBtn, { backgroundColor: colors.primary }]}
          >
            {applying ? <ActivityIndicator color="#fff" /> : (
              <>
                <Feather name="shield" size={18} color="#fff" />
                <Text style={styles.applyText}>{status === 'rejected' ? 'Reapply for Verification' : 'Apply for Verification'}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 32 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  heroContent: { alignItems: 'center', gap: 8 },
  shieldWrap: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: '#fff', fontSize: 26, fontFamily: 'Inter_700Bold' },
  heroSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, marginTop: 4 },
  statusText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  content: { padding: 16, gap: 14 },
  sectionTitle: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  benefitsCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  benefitItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  benefitIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  benefitText: { flex: 1, gap: 3 },
  benefitTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  benefitDesc: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  uploadCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  uploadIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  uploadInfo: { flex: 1 },
  uploadTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  uploadDesc: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  uploadBtn: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  pendingCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1.5 },
  pendingInfo: { flex: 1, gap: 4 },
  pendingTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  pendingDesc: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  approvedCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 14, borderWidth: 1.5 },
  approvedTitle: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  approvedDesc: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 3 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, borderTopWidth: 1 },
  applyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14 },
  applyText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
});
