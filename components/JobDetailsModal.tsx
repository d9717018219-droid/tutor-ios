import React from 'react';
import { Modal, Platform, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { TuitionJob } from '@/types';
import { formatCurrency, timeAgo } from '@/utils/format';
import { formatDistance } from '@/utils/haversine';

interface JobDetailsModalProps {
  job: TuitionJob | null;
  visible: boolean;
  onClose: () => void;
  onSendRequest: () => void;
  onSave: () => void;
}

export function JobDetailsModal({ job, visible, onClose, onSendRequest, onSave }: JobDetailsModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === 'web' ? 16 : insets.bottom + 8;
  // On iOS, pageSheet handles safe area automatically. On Android/web, we add it manually.
  const topPad = Platform.OS === 'android' ? insets.top : Platform.OS === 'web' ? 8 : 0;
  if (!job) return null;

  async function handleShare() {
    if (!job) return;
    try {
      await Share.share({ message: `Tuition job: ${job.studentClass} (${job.board}) - ${job.subjects.join(', ')} at ${job.city}. Fee: ${formatCurrency(job.monthlyFee)}/month. Posted ${timeAgo(job.postedAt)}.` });
    } catch {}
  }

  function handleRequest() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSendRequest();
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: 16 + topPad }]}>
          <TouchableOpacity onPress={onClose} style={[styles.iconBtn, { backgroundColor: colors.secondary }]}>
            <Feather name="x" size={18} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Job Details</Text>
          <TouchableOpacity onPress={handleShare} style={[styles.iconBtn, { backgroundColor: colors.secondary }]}>
            <Feather name="share-2" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 90 + bottomPad }]} showsVerticalScrollIndicator={false}>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.topRow}>
              <Text style={[styles.orderId, { color: colors.mutedForeground }]}>{job.orderId}</Text>
              <View style={[styles.modeBadge, { backgroundColor: job.teachingMode === 'Online' ? colors.accent + '18' : colors.primary + '18' }]}>
                <Text style={[styles.modeText, { color: job.teachingMode === 'Online' ? colors.accent : colors.primary }]}>
                {job.teachingMode === 'Home Tuition' ? 'Classes at Home' : job.teachingMode}
              </Text>
              </View>
            </View>
            <Text style={[styles.jobTitle, { color: colors.text }]}>{job.studentClass} • {job.board}</Text>
            <Text style={[styles.subjects, { color: colors.primary }]}>{job.subjects.join(' · ')}</Text>
            <Text style={[styles.fee, { color: colors.text }]}>{formatCurrency(job.monthlyFee)}<Text style={[styles.feeUnit, { color: colors.mutedForeground }]}>/month</Text></Text>
          </View>

          <DetailRow icon="map-pin" label="Location" value={job.address} colors={colors} />
          <DetailRow icon="user-check" label="Gender Preference" value={job.genderPreference === 'Any' ? 'Male or Female' : `${job.genderPreference} Tutor Preferred`} colors={colors} />
          <DetailRow icon="clock" label="Schedule" value={job.schedule} colors={colors} />
          {job.days ? <DetailRow icon="calendar" label="Preferred Days" value={job.days} colors={colors} /> : null}
          {job.duration ? <DetailRow icon="activity" label="Duration" value={job.duration} colors={colors} /> : null}
          {job.residency ? <DetailRow icon="home" label="Residency" value={job.residency} colors={colors} /> : null}
          {job.distance !== undefined && (
            <DetailRow icon="navigation" label="Distance" value={formatDistance(job.distance)} colors={colors} />
          )}

          <View style={[styles.requirementsCard, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.requirementsTitle, { color: colors.text }]}>Student Requirements</Text>
            <Text style={[styles.requirementsText, { color: colors.mutedForeground }]}>{job.requirements}</Text>
          </View>

        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background, paddingBottom: bottomPad }]}>
          <TouchableOpacity onPress={onSave} style={[styles.saveBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Feather name="bookmark" size={18} color={job.isSaved ? colors.primary : colors.mutedForeground} />
          </TouchableOpacity>
          {job.hasApplied ? (
            <View style={[styles.appliedBadge, { backgroundColor: colors.accent + '18', flex: 1 }]}>
              <Feather name="check-circle" size={18} color={colors.accent} />
              <Text style={[styles.appliedText, { color: colors.accent }]}>Request Already Sent</Text>
            </View>
          ) : (
            <TouchableOpacity onPress={handleRequest} style={[styles.requestBtn, { backgroundColor: colors.primary }]}>
              <Feather name="send" size={16} color="#fff" />
              <Text style={styles.requestText}>Send Interest</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({ icon, label, value, colors }: { icon: string; label: string; value: string; colors: any }) {
  return (
    <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.detailIcon, { backgroundColor: colors.secondary }]}>
        <Feather name={icon as any} size={15} color={colors.primary} />
      </View>
      <View style={styles.detailText}>
        <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.detailValue, { color: colors.text }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  iconBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 12 },
  card: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 6 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  modeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  modeText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  jobTitle: { fontSize: 22, fontFamily: 'Inter_700Bold', marginTop: 4 },
  subjects: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  fee: { fontSize: 24, fontFamily: 'Inter_700Bold', marginTop: 4 },
  feeUnit: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  detailIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  detailText: { flex: 1 },
  detailLabel: { fontSize: 11, fontFamily: 'Inter_400Regular', marginBottom: 2 },
  detailValue: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  requirementsCard: { borderRadius: 14, padding: 14, gap: 8 },
  requirementsTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  requirementsText: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 22 },
  postedLabel: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, borderTopWidth: 1, flexDirection: 'row', gap: 12 },
  saveBtn: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  requestBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  requestText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  appliedBadge: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  appliedText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
});
