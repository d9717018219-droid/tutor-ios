import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Animated, FlatList, Platform, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useProfile } from '@/contexts/ProfileContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { MOCK_TRANSACTIONS } from '@/services/mockData';
import { formatCurrency, formatDate } from '@/utils/format';
import { Transaction } from '@/types';

const GOAL = 50000;

interface TutorRank {
  name: string;
  city: string;
  monthly_earnings: number;
  active_tuitions: number;
}

async function fetchLeaderboard(city: string): Promise<TutorRank[]> {
  try {
    const resp = await fetch(
      `https://doableindia.com/app-sys/api_copy.php?action=leaderboard&city=${encodeURIComponent(city)}`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } }
    );
    if (!resp.ok) return [];
    const json = await resp.json();
    const rows: any[] = json?.data ?? json?.tutors ?? (Array.isArray(json) ? json : []);
    return rows
      .filter((r) => (Number(r.monthly_earnings) || 0) > 0)
      .sort((a, b) => (Number(b.monthly_earnings) || 0) - (Number(a.monthly_earnings) || 0))
      .slice(0, 20);
  } catch {
    return [];
  }
}

export default function EarningsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const { subscription } = useSubscription();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const [leaderboard, setLeaderboard] = useState<TutorRank[]>([]);
  const [loadingBoard, setLoadingBoard] = useState(false);

  const totalIncome = profile.monthlyEarnings ?? 0;
  const activeTuitions = profile.activeTuitions ?? 0;
  const progress = Math.min((totalIncome / GOAL) * 100, 100);
  const remaining = Math.max(0, GOAL - totalIncome);

  const barWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(barWidth, {
      toValue: progress,
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  useEffect(() => {
    if (profile.city) {
      setLoadingBoard(true);
      fetchLeaderboard(profile.city).then((data) => {
        setLeaderboard(data);
        setLoadingBoard(false);
      });
    }
  }, [profile.city]);

  const thisMonth = MOCK_TRANSACTIONS.filter((t) => {
    const d = new Date(t.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && t.status === 'success';
  }).reduce((sum, t) => sum + t.amount, 0);

  function renderTransaction({ item }: { item: Transaction }) {
    const iconMap: Record<Transaction['type'], string> = { subscription: 'star', refund: 'rotate-ccw', referral: 'users' };
    const colorMap: Record<Transaction['status'], string> = { success: colors.accent, pending: '#C48B3C', failed: colors.destructive };
    return (
      <View style={[styles.txItem, { borderBottomColor: colors.border }]}>
        <View style={[styles.txIcon, { backgroundColor: colors.secondary }]}>
          <Feather name={iconMap[item.type] as any} size={18} color={colors.primary} />
        </View>
        <View style={styles.txInfo}>
          <Text style={[styles.txDesc, { color: colors.text }]}>{item.description}</Text>
          <Text style={[styles.txDate, { color: colors.mutedForeground }]}>{formatDate(item.date)}</Text>
        </View>
        <View style={styles.txRight}>
          <Text style={[styles.txAmount, { color: item.type === 'refund' ? colors.accent : colors.text }]}>
            {item.type === 'refund' ? '+' : '-'}{formatCurrency(item.amount)}
          </Text>
          <View style={[styles.txStatus, { backgroundColor: colorMap[item.status] + '20' }]}>
            <Text style={[styles.txStatusText, { color: colorMap[item.status] }]}>{item.status}</Text>
          </View>
        </View>
      </View>
    );
  }

  const ListHeader = (
    <View style={{ gap: 16, paddingBottom: 8 }}>

      {/* ── Dark Wallet Card ── */}
      <View style={styles.walletCard}>
        <View style={styles.walletBg1} />
        <View style={styles.walletBg2} />
        <View style={styles.walletInner}>
          <Text style={styles.walletLabel}>Secure Wallet</Text>
          <View style={styles.walletAmtRow}>
            <Text style={styles.walletRupee}>₹</Text>
            <Text style={styles.walletAmt}>{totalIncome.toLocaleString('en-IN')}</Text>
            <Text style={styles.walletUnit}>/month</Text>
          </View>

          <View style={styles.walletProgressBox}>
            <View style={styles.walletProgressHeader}>
              <Text style={styles.walletProgressLabel}>Goal Progress</Text>
              <Text style={styles.walletProgressTarget}>
                ₹{remaining.toLocaleString('en-IN')} more to ₹50K
              </Text>
            </View>
            <View style={styles.walletProgressTrack}>
              <Animated.View
                style={[
                  styles.walletProgressFill,
                  {
                    width: barWidth.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
          </View>
        </View>
      </View>

      {/* ── Stats row ── */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="briefcase" size={18} color="#3FA683" />
          <Text style={[styles.statVal, { color: colors.text }]}>{activeTuitions}</Text>
          <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>Active Tuitions</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="trending-up" size={18} color="#3F66A6" />
          <Text style={[styles.statVal, { color: colors.text }]}>{formatCurrency(profile.totalEarnings)}</Text>
          <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>Total Earned</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="users" size={18} color="#A63F84" />
          <Text style={[styles.statVal, { color: colors.text }]}>{formatCurrency(profile.referralEarnings)}</Text>
          <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>Referrals</Text>
        </View>
      </View>

      {/* ── Leaderboard ── */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <Feather name="award" size={18} color="#C48B3C" />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Top 20 Earners{profile.city ? ` in ${profile.city}` : ''}
          </Text>
        </View>

        {loadingBoard ? (
          <Text style={[styles.boardEmpty, { color: colors.mutedForeground }]}>Loading…</Text>
        ) : leaderboard.length === 0 ? (
          <Text style={[styles.boardEmpty, { color: colors.mutedForeground }]}>
            No data available yet for {profile.city || 'your city'}.
          </Text>
        ) : (
          <View>
            <View style={[styles.boardHeadRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.boardHeadCell, { width: 30, textAlign: 'center' }]}>#</Text>
              <Text style={[styles.boardHeadCell, { flex: 1 }]}>Tutor</Text>
              <Text style={[styles.boardHeadCell, { textAlign: 'right' }]}>Earnings</Text>
            </View>
            {leaderboard.map((t, i) => (
              <View key={i} style={[styles.boardRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.rankBadge, i < 3 ? { backgroundColor: ['#FFD700', '#C0C0C0', '#CD7F32'][i] + '22' } : { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.rankNum, { color: i < 3 ? ['#C48B3C', '#7A7A7A', '#7A4A2A'][i] : colors.mutedForeground }]}>
                    {i + 1}
                  </Text>
                </View>
                <View style={styles.boardTutorInfo}>
                  <Text style={[styles.boardName, { color: colors.text }]} numberOfLines={1}>{t.name}</Text>
                  <Text style={[styles.boardSub, { color: colors.mutedForeground }]}>{t.active_tuitions} active batches</Text>
                </View>
                <Text style={[styles.boardEarning, { color: '#3FA683' }]}>
                  ₹{Number(t.monthly_earnings).toLocaleString('en-IN')}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* ── Subscription card ── */}
      <View style={[styles.subCard, { backgroundColor: subscription.isPremium ? '#FFF8E7' : colors.secondary, borderColor: subscription.isPremium ? '#FFD700' : colors.border }]}>
        <View style={styles.subLeft}>
          <Feather name="star" size={20} color={subscription.isPremium ? '#FF8C00' : colors.mutedForeground} />
          <View>
            <Text style={[styles.subTitle, { color: colors.text }]}>
              {subscription.isPremium ? 'Premium Active' : 'Free Plan'}
            </Text>
            <Text style={[styles.subSub, { color: colors.mutedForeground }]}>
              {subscription.isPremium && subscription.expiresAt
                ? `Expires ${formatDate(subscription.expiresAt)}`
                : 'Upgrade to get more leads'}
            </Text>
          </View>
        </View>
        {!subscription.isPremium && (
          <TouchableOpacity onPress={() => router.push('/premium')} style={[styles.upgradeBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.upgradeBtnText}>Upgrade</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={[styles.txTitle, { color: colors.text }]}>Transaction History</Text>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad + 8 }]}>
        <Text style={styles.topBarTitle}>Earnings</Text>
      </View>

      <FlatList
        data={MOCK_TRANSACTIONS}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        contentContainerStyle={{ padding: 16, paddingBottom: bottomPad + 80 }}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <View style={styles.emptyTx}>
            <Feather name="credit-card" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No transactions yet</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { paddingHorizontal: 20, paddingBottom: 14, backgroundColor: '#3F66A6' },
  topBarTitle: { color: '#fff', fontSize: 22, fontFamily: 'Inter_700Bold' },

  walletCard: {
    backgroundColor: '#0A0F1E', borderRadius: 28, overflow: 'hidden',
    padding: 20, marginBottom: 0,
  },
  walletBg1: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(63,166,131,0.07)', top: -60, right: -40,
  },
  walletBg2: {
    position: 'absolute', width: 130, height: 130, borderRadius: 65,
    backgroundColor: 'rgba(63,102,166,0.10)', bottom: -40, left: 20,
  },
  walletInner: { gap: 16 },
  walletLabel: {
    color: 'rgba(255,255,255,0.4)', fontSize: 9, fontFamily: 'Inter_700Bold',
    letterSpacing: 2, textTransform: 'uppercase',
  },
  walletAmtRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  walletRupee: { color: '#3FA683', fontSize: 22, fontFamily: 'Inter_700Bold', lineHeight: 48 },
  walletAmt: { color: '#fff', fontSize: 42, fontFamily: 'Inter_700Bold', lineHeight: 48 },
  walletUnit: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontFamily: 'Inter_600SemiBold', marginBottom: 6 },
  walletProgressBox: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 14, gap: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  walletProgressHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  walletProgressLabel: {
    color: 'rgba(255,255,255,0.3)', fontSize: 9, fontFamily: 'Inter_700Bold',
    letterSpacing: 1.5, textTransform: 'uppercase',
  },
  walletProgressTarget: { color: '#3FA683', fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  walletProgressTrack: {
    height: 7, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden',
  },
  walletProgressFill: {
    height: '100%', borderRadius: 4,
    backgroundColor: '#3FA683',
  },

  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, borderRadius: 16, padding: 12, alignItems: 'center', gap: 4,
    borderWidth: 1, shadowColor: '#3F66A6', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  statVal: { fontSize: 15, fontFamily: 'Inter_700Bold', marginTop: 2 },
  statLbl: { fontSize: 9.5, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },

  section: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16, paddingBottom: 12 },
  sectionTitle: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  boardEmpty: { padding: 20, textAlign: 'center', fontSize: 13, fontFamily: 'Inter_400Regular' },
  boardHeadRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8,
    borderBottomWidth: 1, backgroundColor: 'rgba(0,0,0,0.03)',
  },
  boardHeadCell: { fontSize: 9, fontFamily: 'Inter_700Bold', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.8 },
  boardRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, gap: 10 },
  rankBadge: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rankNum: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  boardTutorInfo: { flex: 1 },
  boardName: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  boardSub: { fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 1 },
  boardEarning: { fontSize: 14, fontFamily: 'Inter_700Bold' },

  subCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderRadius: 16, borderWidth: 1.5,
  },
  subLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  subTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  subSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  upgradeBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  upgradeBtnText: { color: '#fff', fontSize: 13, fontFamily: 'Inter_600SemiBold' },

  txTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', marginTop: 4 },
  txItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1 },
  txIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txInfo: { flex: 1 },
  txDesc: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  txDate: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 3 },
  txRight: { alignItems: 'flex-end', gap: 4 },
  txAmount: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  txStatus: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  txStatusText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  emptyTx: { alignItems: 'center', padding: 32, gap: 8 },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
});
