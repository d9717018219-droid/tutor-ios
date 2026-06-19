import React, { useState } from 'react';
import {
  FlatList, Platform, StyleSheet, Switch, Text,
  TouchableOpacity, View, ActivityIndicator, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useConnections, acceptRequest, rejectRequest } from '@/hooks/useFirebaseChat';
import { useProfile } from '@/contexts/ProfileContext';
import { timeAgo } from '@/utils/format';
import { FirestoreConnection } from '@/types';

type AlertType = 'request' | 'message';

function isParentRequest(conn: FirestoreConnection): boolean {
  return !!conn.parentId && !conn.parentId.startsWith('ORD-');
}

const ICON_MAP: Record<AlertType, string> = {
  request: 'send',
  message: 'message-circle',
};

export default function AlertsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const { profile } = useProfile();
  const { connections, loading } = useConnections(profile.phone);

  const [actioningId, setActioningId] = useState<string | null>(null);
  const [prefs, setPrefs] = useState({ requestUpdates: true, messages: true });

  // Split: pending parent requests vs everything else
  const pendingRequests = connections.filter(
    (c) => isParentRequest(c) && c.status === 'pending',
  );
  const activityFeed = connections
    .filter((c) => !(isParentRequest(c) && c.status === 'pending'))
    .sort((a, b) => new Date(b.lastMessageTime || b.createdAt).getTime() - new Date(a.lastMessageTime || a.createdAt).getTime());

  const unreadCount = pendingRequests.length + connections.filter((c) => c.unreadCount > 0 && !isParentRequest(c)).length;

  async function handleAccept(conn: FirestoreConnection) {
    setActioningId(conn.id);
    try {
      await acceptRequest(conn.id);
      router.push({ pathname: '/chat/[id]', params: { id: conn.id } } as any);
    } catch {
      Alert.alert('Error', 'Could not accept request. Try again.');
    } finally {
      setActioningId(null);
    }
  }

  function handleReject(conn: FirestoreConnection) {
    Alert.alert(
      'Decline Request',
      `Decline request from ${conn.parentName ?? 'this student'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setActioningId(conn.id);
            try { await rejectRequest(conn.id); } catch {}
            finally { setActioningId(null); }
          },
        },
      ],
    );
  }

  function renderPendingRequest(conn: FirestoreConnection) {
    const busy = actioningId === conn.id;
    return (
      <View
        key={conn.id}
        style={[styles.requestCard, { backgroundColor: colors.card, borderColor: colors.primary + '30' }]}
      >
        <View style={[styles.requestIconWrap, { backgroundColor: '#3FA68318' }]}>
          <Feather name="user" size={20} color="#3FA683" />
        </View>
        <View style={styles.requestBody}>
          <Text style={[styles.requestName, { color: colors.text }]}>
            {conn.parentName ?? 'New Student'}
          </Text>
          <Text style={[styles.requestSub, { color: colors.mutedForeground }]}>
            Wants to connect with you
          </Text>
          <Text style={[styles.requestTime, { color: colors.mutedForeground }]}>
            {timeAgo(conn.createdAt)}
          </Text>
          <View style={styles.requestActions}>
            <TouchableOpacity
              onPress={() => handleAccept(conn)}
              disabled={busy}
              style={[styles.acceptBtn, { backgroundColor: '#3FA683' }]}
            >
              {busy ? (
                <ActivityIndicator size={14} color="#fff" />
              ) : (
                <Text style={styles.acceptBtnText}>✓ Accept</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleReject(conn)}
              disabled={busy}
              style={[styles.rejectBtn, { borderColor: '#DC2626' }]}
            >
              <Text style={[styles.rejectBtnText, { color: '#DC2626' }]}>✕ Decline</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  function renderActivity({ item }: { item: FirestoreConnection }) {
    const type: AlertType = isParentRequest(item) ? 'request' : 'message';
    const iconColor = type === 'request' ? '#3FA683' : colors.primary;
    const isUnread = item.unreadCount > 0;

    let title = item.jobTitle ?? 'Activity';
    let body = item.lastMessage ?? '';
    if (isParentRequest(item)) {
      title = item.status === 'accepted' ? `${item.parentName ?? 'Student'} · Accepted` : `${item.parentName ?? 'Student'} · ${item.status}`;
      body = item.lastMessage ?? '';
    }

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.id } } as any)}
        style={[
          styles.activityItem,
          { backgroundColor: isUnread ? colors.primary + '08' : colors.card, borderBottomColor: colors.border },
        ]}
      >
        <View style={[styles.activityIcon, { backgroundColor: iconColor + '18' }]}>
          <Feather name={ICON_MAP[type] as any} size={18} color={iconColor} />
        </View>
        <View style={styles.activityContent}>
          <View style={styles.activityHeader}>
            <Text style={[styles.activityTitle, { color: colors.text }]} numberOfLines={1}>{title}</Text>
            {isUnread && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
          </View>
          <Text style={[styles.activityBody, { color: colors.mutedForeground }]} numberOfLines={1}>{body}</Text>
          <Text style={[styles.activityTime, { color: colors.mutedForeground }]}>
            {timeAgo(item.lastMessageTime || item.createdAt)}
          </Text>
        </View>
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      </TouchableOpacity>
    );
  }

  const ListHeader = (
    <>
      {/* ── Pending Requests section ── */}
      {pendingRequests.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionLabel, { color: colors.text }]}>New Requests</Text>
            <View style={[styles.sectionBadge, { backgroundColor: '#3FA683' }]}>
              <Text style={styles.sectionBadgeText}>{pendingRequests.length}</Text>
            </View>
          </View>
          {pendingRequests.map(renderPendingRequest)}
        </View>
      )}

      {/* ── Activity section header ── */}
      {activityFeed.length > 0 && (
        <Text style={[styles.sectionLabel, { color: colors.text, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6 }]}>
          Activity
        </Text>
      )}
    </>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Alerts</Text>
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={activityFeed}
          keyExtractor={(item) => item.id}
          renderItem={renderActivity}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={{ paddingBottom: bottomPad + 70 }}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <View style={[styles.prefSection, { borderTopColor: colors.border }]}>
              <Text style={[styles.prefTitle, { color: colors.text }]}>Alert Preferences</Text>
              {([
                ['requestUpdates', 'Student Requests', 'send'],
                ['messages', 'New Messages', 'message-circle'],
              ] as [keyof typeof prefs, string, string][]).map(([key, label, icon]) => (
                <View key={key} style={[styles.prefItem, { borderBottomColor: colors.border }]}>
                  <View style={styles.prefLeft}>
                    <View style={[styles.prefIcon, { backgroundColor: colors.secondary }]}>
                      <Feather name={icon as any} size={15} color={colors.primary} />
                    </View>
                    <Text style={[styles.prefLabel, { color: colors.text }]}>{label}</Text>
                  </View>
                  <Switch
                    value={prefs[key]}
                    onValueChange={(v) => setPrefs((p) => ({ ...p, [key]: v }))}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor="#fff"
                  />
                </View>
              ))}
            </View>
          }
          ListEmptyComponent={
            pendingRequests.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="bell-off" size={32} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No alerts yet</Text>
                <Text style={[styles.emptySubtext, { color: colors.mutedForeground }]}>
                  Student requests and messages will appear here
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 4 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { color: '#fff', fontSize: 12, fontFamily: 'Inter_700Bold' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  section: { paddingHorizontal: 16, paddingTop: 16, gap: 10 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionLabel: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  sectionBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  sectionBadgeText: { color: '#fff', fontSize: 11, fontFamily: 'Inter_700Bold' },

  // Pending request card
  requestCard: {
    flexDirection: 'row', gap: 12, padding: 14,
    borderRadius: 14, borderWidth: 1,
    shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6,
    elevation: 2,
  },
  requestIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  requestBody: { flex: 1, gap: 3 },
  requestName: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  requestSub: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  requestTime: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  requestActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  acceptBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  acceptBtnText: { color: '#fff', fontSize: 13, fontFamily: 'Inter_700Bold' },
  rejectBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  rejectBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },

  // Activity feed
  activityItem: { flexDirection: 'row', gap: 12, padding: 14, borderBottomWidth: 1, alignItems: 'center' },
  activityIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  activityContent: { flex: 1, gap: 3 },
  activityHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activityTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold', flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  activityBody: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  activityTime: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },

  prefSection: { padding: 16, borderTopWidth: 1, gap: 4, marginTop: 8 },
  prefTitle: { fontSize: 17, fontFamily: 'Inter_700Bold', marginBottom: 8 },
  prefItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
  prefLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  prefIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  prefLabel: { fontSize: 14, fontFamily: 'Inter_400Regular' },

  emptyState: { alignItems: 'center', padding: 40, gap: 8 },
  emptyText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  emptySubtext: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center' },
});
