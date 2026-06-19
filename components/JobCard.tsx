import React, { useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { TuitionJob } from '@/types';
import { formatCurrency } from '@/utils/format';
import { formatDistance } from '@/utils/haversine';
import { useColors } from '@/hooks/useColors';

interface JobCardProps {
  job: TuitionJob;
  onPress: () => void;
  onSendRequest: () => void;
  onSave: () => void;
  appliedCount?: number;
  connectionId?: string;
}

const SUBJECT_COLORS: Record<string, string> = {
  Mathematics: '#38784C', Math: '#38784C',
  Physics: '#3F66A6', Chemistry: '#B83C3C',
  Biology: '#3FA683', Science: '#3B7A94',
  English: '#C48B3C', Hindi: '#A63F84',
  History: '#694475', Geography: '#3F66A6',
  Computer: '#3B7A94', Accountancy: '#38784C',
  Economics: '#3FA683', Commerce: '#3F66A6',
  'Social Science': '#694475',
};

const SUBJECT_BG: Record<string, string> = {
  Mathematics: '#E3EED8', Math: '#E3EED8',
  Physics: '#D8E4F0', Chemistry: '#F5E0E0',
  Biology: '#D3EEE5', Science: '#D3EAF0',
  English: '#F5EDD8', Hindi: '#F2DDF0',
  History: '#E8DFF0', Geography: '#D8E4F0',
  Computer: '#D3E8F0', Accountancy: '#E3EED8',
  Economics: '#D3EEE5', Commerce: '#D8E4F0',
  'Social Science': '#E8DFF0',
};

function getSubjectColor(subjects: string[]) {
  for (const s of subjects) {
    for (const key of Object.keys(SUBJECT_COLORS)) {
      if (s.toLowerCase().includes(key.toLowerCase())) return SUBJECT_COLORS[key];
    }
  }
  return '#3F66A6';
}

function getSubjectPillColor(subject: string): { bg: string; text: string } {
  for (const key of Object.keys(SUBJECT_COLORS)) {
    if (subject.toLowerCase().includes(key.toLowerCase()))
      return { bg: SUBJECT_BG[key] ?? '#F0EBE3', text: SUBJECT_COLORS[key] };
  }
  return { bg: '#F0EBE3', text: '#7A6B5A' };
}

const MODE_ICON: Record<string, string> = {
  'Classes at Home': 'home',
  'Home Tuition': 'home',
  'Online': 'monitor',
  'Group': 'users',
};

export function JobCard({ job, onPress, onSendRequest, onSave, appliedCount, connectionId }: JobCardProps) {
  const colors = useColors();
  const accentColor = getSubjectColor(job.subjects);
  const modeIcon = MODE_ICON[job.teachingMode] ?? 'book';
  const modeLabel = job.teachingMode === 'Home Tuition' ? 'Classes at Home' : job.teachingMode;

  const scale = useRef(new Animated.Value(1)).current;

  function onPressIn() {
    Animated.spring(scale, { toValue: 0.975, useNativeDriver: true, speed: 50 }).start();
  }
  function onPressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50 }).start();
  }
  function handleRequest() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSendRequest();
  }
  function handleSave() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSave();
  }
  function handleChat() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (connectionId) router.push(`/chat/${connectionId}` as any);
    else router.push('/(tabs)/connections' as any);
  }

  return (
    <Animated.View style={{ transform: [{ scale }], marginBottom: 14 }}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={styles.cardShadow}
      >
        <View style={styles.card}>
          {/* ── Accent strip ── */}
          <View style={[styles.accentStrip, { backgroundColor: accentColor }]} />

          <View style={styles.cardInner}>
            {/* ── Top row ── */}
            <View style={styles.topRow}>
              <View style={styles.classBlock}>
                <Text style={[styles.className, { color: colors.text }]}>{job.studentClass}</Text>
                <Text style={[styles.boardName, { color: colors.mutedForeground }]}>{job.board}</Text>
              </View>
              <View style={styles.topRight}>
                <View style={[styles.orderBadge, { backgroundColor: accentColor + '15', borderColor: accentColor + '40' }]}>
                  <Text style={[styles.orderBadgeText, { color: accentColor }]}>#{job.id}</Text>
                </View>
                <View style={[styles.feeBadge, { backgroundColor: accentColor + '12' }]}>
                  <Text style={[styles.feeAmt, { color: accentColor }]}>{formatCurrency(job.monthlyFee)}</Text>
                  <Text style={[styles.feeUnit, { color: accentColor + 'AA' }]}>/mo</Text>
                </View>
              </View>
            </View>

            {/* ── Subject pills ── */}
            <View style={styles.pillsRow}>
              {job.subjects.slice(0, 4).map((s) => {
                const pill = getSubjectPillColor(s);
                return (
                  <View key={s} style={[styles.pill, { backgroundColor: pill.bg }]}>
                    <Text style={[styles.pillText, { color: pill.text }]}>{s}</Text>
                  </View>
                );
              })}
              {job.hasApplied && (
                <View style={styles.appliedPill}>
                  <Feather name="check-circle" size={10} color="#3FA683" />
                  <Text style={styles.appliedPillText}>Interest Sent</Text>
                </View>
              )}
            </View>

            {/* ── Details row ── */}
            <View style={styles.detailsRow}>
              <View style={styles.detailChip}>
                <Feather name={modeIcon as any} size={11} color={accentColor} />
                <Text style={[styles.detailText, { color: '#4B5563' }]}>{modeLabel}</Text>
              </View>
              <View style={styles.detailChip}>
                <Feather name="map-pin" size={11} color={accentColor} />
                <Text style={[styles.detailText, { color: '#4B5563' }]}>{job.city}</Text>
              </View>
              {job.genderPreference !== 'Any' && (
                <View style={styles.detailChip}>
                  <Feather name="user" size={11} color={accentColor} />
                  <Text style={[styles.detailText, { color: '#4B5563' }]}>{job.genderPreference}</Text>
                </View>
              )}
              {job.distance !== undefined && (
                <View style={styles.detailChip}>
                  <Feather name="navigation" size={11} color={accentColor} />
                  <Text style={[styles.detailText, { color: '#4B5563' }]}>{formatDistance(job.distance)}</Text>
                </View>
              )}
            </View>

            {/* ── Applied count ── */}
            {(appliedCount ?? 0) > 0 && (
              <View style={styles.appliedCountRow}>
                <Feather name="users" size={10} color="#3F66A6" />
                <Text style={styles.appliedCountText}>
                  {appliedCount} tutor{appliedCount === 1 ? '' : 's'} interested
                </Text>
              </View>
            )}

            {/* ── Footer ── */}
            <View style={[styles.footer, { borderTopColor: colors.border }]}>
              <View style={styles.footerLeft}>
                <View style={styles.verifiedBadge}>
                  <Feather name="shield" size={11} color="#3F66A6" />
                  <Text style={styles.verifiedText}>Verified Lead</Text>
                </View>
              </View>
              <View style={styles.footerRight}>
                <TouchableOpacity onPress={handleSave} style={styles.iconBtn}>
                  <Feather name="bookmark" size={16} color={job.isSaved ? '#A63F84' : '#9CA3AF'} />
                </TouchableOpacity>
                {job.hasApplied ? (
                  <TouchableOpacity onPress={handleChat} style={[styles.actionBtn, { backgroundColor: '#3B7A94' }]}>
                    <Feather name="message-circle" size={13} color="#fff" />
                    <Text style={styles.actionBtnText}>Chat</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={onPress} style={[styles.actionBtn, { backgroundColor: accentColor }]}>
                    <Text style={styles.actionBtnText}>View Details</Text>
                    <Feather name="arrow-right" size={13} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardShadow: {
    shadowColor: '#1E3A5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 14,
    elevation: 5,
    borderRadius: 18,
  },
  card: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#fff',
    flexDirection: 'row',
  },
  accentStrip: {
    width: 5,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  cardInner: {
    flex: 1,
    padding: 14,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  classBlock: { gap: 2 },
  className: { fontSize: 20, fontFamily: 'Inter_700Bold', lineHeight: 26 },
  boardName: { fontSize: 12, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.3 },
  topRight: { alignItems: 'flex-end', gap: 6 },
  orderBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8, borderWidth: 1,
  },
  orderBadgeText: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  feeBadge: {
    flexDirection: 'row', alignItems: 'baseline', gap: 1,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
  },
  feeAmt: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  feeUnit: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  pillText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  appliedPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    backgroundColor: '#D3EEE5',
  },
  appliedPillText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#3FA683' },
  detailsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  detailChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F3F6FA', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10,
  },
  detailText: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  appliedCountRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#EAF0FB', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, alignSelf: 'flex-start',
  },
  appliedCountText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#3F66A6' },
  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1, paddingTop: 10,
  },
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedText: { color: '#3F66A6', fontSize: 11, fontFamily: 'Inter_700Bold' },
  iconBtn: { padding: 4 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 11,
  },
  actionBtnText: { color: '#fff', fontSize: 12, fontFamily: 'Inter_700Bold' },
});
