import React, { useState } from 'react';
import {
  ActivityIndicator, FlatList, Platform, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useProfile } from '@/contexts/ProfileContext';
import { useConnections } from '@/hooks/useFirebaseChat';
import { FirestoreConnection } from '@/types';
import { timeAgo } from '@/utils/format';

const AVATAR_COLORS: [string, string][] = [
  ['#6D28D9', '#A78BFA'],
  ['#0369A1', '#38BDF8'],
  ['#059669', '#34D399'],
  ['#D97706', '#FCD34D'],
  ['#DC2626', '#FCA5A5'],
];

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  pending:  { bg: '#FFFBEB', text: '#D97706', label: '⏳ Pending' },
  accepted: { bg: '#F0FDF4', text: '#059669', label: '✅ Accepted' },
  rejected: { bg: '#FFF1F2', text: '#DC2626', label: '❌ Declined' },
};

export default function ChatListScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const topPad = Platform.OS === 'web' ? 56 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;
  const [search, setSearch] = useState('');

  const { connections, loading } = useConnections(profile.phone);

  const filtered = connections.filter((c) =>
    c.parentName.toLowerCase().includes(search.toLowerCase()) ||
    c.jobTitle.toLowerCase().includes(search.toLowerCase()),
  );

  const totalUnread = connections.reduce(
    (s, c) => s + (c.status === 'accepted' ? c.unreadCount : 0), 0,
  );

  function renderConnection({ item, index }: { item: FirestoreConnection; index: number }) {
    const colorPair = AVATAR_COLORS[index % AVATAR_COLORS.length];
    const st = STATUS_STYLE[item.status] ?? STATUS_STYLE.pending;
    const isAccepted = item.status === 'accepted';

    return (
      <TouchableOpacity
        onPress={() => router.push(`/chat/${item.id}` as any)}
        activeOpacity={0.82}
        style={[
          styles.chatRow,
          { backgroundColor: colors.card, borderColor: colors.border },
          item.status === 'rejected' && { opacity: 0.5 },
        ]}
      >
        <LinearGradient
          colors={isAccepted ? colorPair : ['#9CA3AF', '#D1D5DB']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.avatar}
        >
          <Text style={styles.avatarText}>{(item.parentName[0] ?? 'P').toUpperCase()}</Text>
        </LinearGradient>

        <View style={styles.chatInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.parentName, { color: colors.text }]} numberOfLines={1}>
              {item.parentName}
            </Text>
            <Text style={[styles.timeText, { color: colors.mutedForeground }]}>
              {timeAgo(item.lastMessageTime)}
            </Text>
          </View>

          <Text style={[styles.jobChip, { color: colorPair[0] }]} numberOfLines={1}>
            📚 {item.jobTitle}
          </Text>

          <View style={styles.msgRow}>
            <Text
              style={[styles.lastMsg, {
                color: item.unreadCount > 0 && isAccepted ? colors.text : colors.mutedForeground,
              }]}
              numberOfLines={1}
            >
              {item.lastMessage}
            </Text>
            <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
              <Text style={[styles.statusText, { color: st.text }]}>{st.label}</Text>
            </View>
            {item.unreadCount > 0 && isAccepted && (
              <View style={[styles.unreadBadge, { backgroundColor: colorPair[0] }]}>
                <Text style={styles.unreadText}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: '#F4F3FF' }]}>
      <LinearGradient
        colors={['#1E1248', '#4C1D95', '#6D28D9']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topPad + 6 }]}
      >
        <View style={styles.blob} />
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Messages</Text>
            <Text style={styles.headerSub}>PARENT CONVERSATIONS</Text>
          </View>
          <View style={[styles.unreadTotal, totalUnread === 0 && { opacity: 0 }]}>
            <Text style={styles.unreadTotalText}>{totalUnread}</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={[styles.searchWrap, { backgroundColor: '#F4F3FF' }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.card }]}>
          <Feather name="search" size={16} color="#9CA3AF" />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search parent or job…"
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Feather name="x-circle" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#6D28D9" />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Loading conversations…
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => c.id}
          renderItem={renderConnection}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 24 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={[styles.emptyIcon, { backgroundColor: '#EDE9FE' }]}>
                <Feather name="message-circle" size={36} color="#6D28D9" />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No conversations yet</Text>
              <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
                Apply to jobs — conversations with parents will appear here
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/jobs')}
                style={[styles.emptyBtn, { backgroundColor: '#6D28D9' }]}
              >
                <Text style={styles.emptyBtnText}>Browse Jobs</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 18, overflow: 'hidden' },
  blob: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(167,139,250,0.12)', top: -50, right: -20,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 4 },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1 },
  headerTitle: { color: '#fff', fontSize: 22, fontFamily: 'Inter_700Bold' },
  headerSub: { color: 'rgba(196,181,253,0.85)', fontSize: 10, fontFamily: 'Inter_600SemiBold', letterSpacing: 1.3 },
  unreadTotal: {
    minWidth: 28, height: 28, borderRadius: 14,
    backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  unreadTotalText: { color: '#fff', fontSize: 13, fontFamily: 'Inter_700Bold' },
  searchWrap: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, paddingHorizontal: 14, height: 46,
    shadowColor: '#6D28D9', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  list: { paddingHorizontal: 16, gap: 10, paddingTop: 4 },
  chatRow: {
    flexDirection: 'row', gap: 12, padding: 14, borderRadius: 18, borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#6D28D9', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  avatar: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { color: '#fff', fontSize: 22, fontFamily: 'Inter_700Bold' },
  chatInfo: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  parentName: { fontSize: 15, fontFamily: 'Inter_700Bold', flex: 1 },
  timeText: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  jobChip: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  msgRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  lastMsg: { fontSize: 12, fontFamily: 'Inter_400Regular', flex: 1 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  unreadBadge: {
    minWidth: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
  },
  unreadText: { color: '#fff', fontSize: 10, fontFamily: 'Inter_700Bold' },
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 14, paddingHorizontal: 32 },
  emptyIcon: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  emptyDesc: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 21 },
  emptyBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, marginTop: 4 },
  emptyBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },
});
