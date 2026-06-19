import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Animated, Modal, Platform, ScrollView, StyleSheet, Text,
  TouchableOpacity, View, ActivityIndicator,
} from 'react-native';
import Svg, { Path, Text as SvgText, Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { JobCard } from '@/components/JobCard';
import { JobDetailsModal } from '@/components/JobDetailsModal';
import { MOCK_NOTIFICATIONS } from '@/services/mockData';
import { fetchRealJobs, fetchLatestLeads } from '@/services/jobsService';
import { sendInterest, useConnections, useProfileViews } from '@/hooks/useFirebaseChat';
import { getItem, setItem } from '@/utils/storage';
import { STORAGE_KEYS } from '@/constants/config';
import { timeAgo, formatCurrency, formatLeadTime } from '@/utils/format';
import { TuitionJob } from '@/types';
import { useProfile } from '@/contexts/ProfileContext';
import { useSubscription } from '@/contexts/SubscriptionContext';

const QUICK_ACTIONS = [
  { label: 'Find Jobs',  icon: 'briefcase',     colors: ['#38784C', '#3FA683'] as const, route: '/(tabs)/jobs' },
  { label: 'Messages',  icon: 'message-circle', colors: ['#3B7A94', '#3FA683'] as const, route: '/chat' },
  { label: 'Earnings',  icon: 'trending-up',    colors: ['#C48B3C', '#BDAA93'] as const, route: '/(tabs)/earnings' },
  { label: 'Verified',  icon: 'shield',         colors: ['#694475', '#A63F84'] as const, route: '/verified' },
  { label: 'Premium',   icon: 'star',           colors: ['#3F66A6', '#3B7A94'] as const, route: '/premium' },
];

const BG      = '#F5F0E8';
const PRIMARY = '#3F66A6';
const ACCENT  = '#3FA683';
const POLL_MS = 60_000;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const { subscription }             = useSubscription();
  const { connections }              = useConnections(profile.phone);
  const { count: profileViewCount }  = useProfileViews(profile.phone);

  const [jobs, setJobs]               = useState<TuitionJob[]>([]);
  const [latestLeads, setLatestLeads] = useState<TuitionJob[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<TuitionJob | null>(null);
  const [unread, setUnread]           = useState(0);
  const [applyingId, setApplyingId]   = useState<string | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);

  const chatAccessCount = connections.filter((c) => c.status === 'accepted').length;

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  async function loadLeads() {
    const leads = await fetchLatestLeads(100);
    const today = new Date().toLocaleDateString('en-CA'); // "YYYY-MM-DD" in local timezone
    const todayLeads = leads.filter((l) => l.postedAt.slice(0, 10) === today);
    setLatestLeads(todayLeads);
    setLeadsLoading(false);
  }

  async function loadJobs() {
    const realJobs = await fetchRealJobs(1000);
    if (realJobs.length > 0) {
      setJobs(realJobs);
    } else {
      const { MOCK_JOBS } = await import('@/services/mockData');
      setJobs(MOCK_JOBS.slice(0, 4));
    }
  }

  useFocusEffect(useCallback(() => {
    // Read notifications count
    getItem<string[]>(STORAGE_KEYS.NOTIFICATIONS).then((readIds) => {
      const count = MOCK_NOTIFICATIONS.filter((n) => {
        if (readIds?.includes(n.id)) return false;
        return !n.isRead;
      }).length;
      setUnread(count);
    });

    // Load data
    loadLeads();
    loadJobs();

    // Poll leads every 60s while tab is focused
    pollRef.current = setInterval(() => loadLeads(), POLL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []));

  const FREE_REQUEST_LIMIT = 20;

  async function handleLeadRequest(lead: TuitionJob) {
    if (applyingId === lead.id) return;

    // ── Free user limit check (Firestore-persistent across re-registration) ────
    if (!subscription.isPremium && connections.length >= FREE_REQUEST_LIMIT) {
      setShowLimitModal(true);
      return;
    }

    setApplyingId(lead.id);
    try {
      await sendInterest(lead, { phone: profile.phone, name: profile.name ?? 'Tutor' });
      const applied = (await getItem<string[]>(STORAGE_KEYS.APPLIED_JOBS)) ?? [];
      if (!applied.includes(lead.id)) {
        await setItem(STORAGE_KEYS.APPLIED_JOBS, [...applied, lead.id]);
      }
      setLatestLeads((prev) => prev.map((l) => l.id === lead.id ? { ...l, hasApplied: true } : l));
    } catch (e) {
      console.warn('[home] sendInterest failed', e);
    } finally {
      setApplyingId(null);
      setSelectedJob(null);
    }
  }

  async function handleSendRequest(job: TuitionJob) {
    const applied = (await getItem<string[]>(STORAGE_KEYS.APPLIED_JOBS)) ?? [];
    if (!applied.includes(job.id)) {
      await setItem(STORAGE_KEYS.APPLIED_JOBS, [...applied, job.id]);
      setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, hasApplied: true } : j)));
    }
    setSelectedJob(null);
  }

  async function handleSave(job: TuitionJob) {
    const saved = (await getItem<string[]>(STORAGE_KEYS.SAVED_JOBS)) ?? [];
    const newSaved = saved.includes(job.id) ? saved.filter((x) => x !== job.id) : [...saved, job.id];
    await setItem(STORAGE_KEYS.SAVED_JOBS, newSaved);
    setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, isSaved: !j.isSaved } : j)));
    if (selectedJob?.id === job.id) setSelectedJob((p) => (p ? { ...p, isSaved: !p.isSaved } : p));
  }

  return (
    <View style={[styles.root, { backgroundColor: BG }]}>
      <AppHeader notificationCount={unread} />

      {/* ── Stat chips ── */}
      <View style={[styles.statsRow, { backgroundColor: BG }]}>
        {([
          { label: 'Profile Views', value: String(profileViewCount),     icon: 'eye',            color: '#3F66A6', bg: '#D8E4F0', route: null },
          { label: 'Job Requests',  value: String(connections.length),   icon: 'send',           color: '#38784C', bg: '#E3EED8', route: '/(tabs)/jobs' },
          { label: 'Chat Access',   value: String(chatAccessCount),      icon: 'message-circle', color: '#A63F84', bg: '#F2DDF0', route: '/chat' },
        ] as const).map((s) => (
          <TouchableOpacity
            key={s.label}
            onPress={() => s.route && router.push(s.route as any)}
            activeOpacity={s.route ? 0.75 : 1}
            style={[styles.statChip, { backgroundColor: s.bg }]}
          >
            <Feather name={s.icon as any} size={14} color={s.color} />
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: s.color + 'CC' }]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad + 90 }}>

        {/* ── Search bar ── */}
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/jobs')}
          activeOpacity={0.85}
          style={[styles.searchBar, { backgroundColor: '#fff', shadowColor: PRIMARY }]}
        >
          <View style={[styles.searchIcon, { backgroundColor: '#D8E4F0' }]}>
            <Feather name="search" size={16} color={PRIMARY} />
          </View>
          <Text style={styles.searchPlaceholder}>Search jobs by subject, city…</Text>
          <View style={[styles.searchFilter, { backgroundColor: PRIMARY }]}>
            <Feather name="sliders" size={14} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* ── Quick Actions ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#1A1025' }]}>Quick Actions</Text>
          <View style={styles.qaRow}>
            {QUICK_ACTIONS.map((item) => (
              <TouchableOpacity
                key={item.label}
                activeOpacity={0.8}
                onPress={() => router.push(item.route as any)}
                style={styles.qaItem}
              >
                <LinearGradient
                  colors={item.colors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.qaGrad}
                >
                  <Feather name={item.icon as any} size={17} color="#fff" />
                </LinearGradient>
                <Text style={styles.qaLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Network stats ── */}
        <View style={[styles.networkCard, { backgroundColor: '#fff' }]}>
          <Text style={[styles.netTitle, { color: '#1A1025' }]}>Our Network</Text>
          <View style={styles.netRow}>
            {[
              { val: '25K+', label: 'Students', color: '#3F66A6' },
              { val: '10K+', label: 'Tutors',   color: '#38784C' },
              { val: '113+', label: 'Cities',   color: '#3FA683' },
              { val: '4.8 ⭐', label: 'Rating',  color: '#C48B3C' },
            ].map((n, i, arr) => (
              <View key={n.label} style={[styles.netItem, i < arr.length - 1 && styles.netItemBorder]}>
                <Text style={[styles.netVal, { color: n.color }]}>{n.val}</Text>
                <Text style={styles.netLabel}>{n.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Market Insights ── */}
        {jobs.length > 0 && (() => {
          const total = jobs.length;

          // ── Mode: FIXED two cards — Classes at Home + Online ──────────────
          const homeCount   = jobs.filter(j => j.teachingMode === 'Classes at Home' || j.teachingMode === 'Home Tuition').length;
          const onlineCount = jobs.filter(j => j.teachingMode === 'Online').length;
          const FIXED_MODES = [
            { label: 'Classes at Home', icon: '🏠', color: '#3F66A6', bg: '#D8E4F0', count: homeCount,   qf: 'Classes at Home' },
            { label: 'Online',          icon: '💻', color: '#38784C', bg: '#D9EDD9', count: onlineCount, qf: 'Online' },
          ];

          // ── Robust class-number parser (handles digits + Roman numerals) ──
          const ROMAN: Record<string, number> = {
            XII:12, XI:11, VIII:8, VII:7, VI:6, IV:4, IX:9, X:10, III:3, II:2, I:1, V:5,
          };
          const toClassNum = (raw: string): number | null => {
            const s = raw.trim().toUpperCase();
            for (const [r, n] of Object.entries(ROMAN)) {
              if (new RegExp(`\\b${r}\\b`).test(s)) return n;
            }
            const n = parseInt(s.replace(/\D/g, ''), 10);
            return isNaN(n) || n < 1 || n > 12 ? null : n;
          };

          // ── Class Group: roman numeral buckets ───────────────────────────
          const CLASS_GROUPS = [
            { label: 'Class I – V',    nums: [1,2,3,4,5], color: '#38784C', bg: '#D9EDD9' },
            { label: 'Class VI – VIII',nums: [6,7,8],      color: '#3B7A94', bg: '#D4E8F0' },
            { label: 'Class IX – X',   nums: [9,10],       color: '#3F66A6', bg: '#D8E4F0' },
            { label: 'Class XI – XII', nums: [11,12],      color: '#8B5CF6', bg: '#EDE9FE' },
          ];
          const classCount = CLASS_GROUPS.map((g) => ({
            ...g,
            count: jobs.filter((j) => {
              const n = toClassNum(j.studentClass ?? '');
              return n !== null && g.nums.includes(n);
            }).length,
          }));
          const classOther = jobs.filter((j) => toClassNum(j.studentClass ?? '') === null).length;

          // ── City: ALL cities sorted by count (normalize whitespace) ──────
          const cityMap: Record<string, number> = {};
          jobs.forEach((j) => {
            const c = (j.city ?? '').trim() || 'Other';
            cityMap[c] = (cityMap[c] ?? 0) + 1;
          });
          const allCities = Object.entries(cityMap).sort((a, b) => b[1] - a[1]);
          const CITY_COLORS = ['#3FA683','#3F66A6','#C48B3C','#A63F84','#38784C','#3B7A94','#E85D04','#8B5CF6','#059669','#DC2626'];
          const cityColor = (i: number) => CITY_COLORS[i % CITY_COLORS.length];

          return (
            <View style={styles.insightSection}>
              {/* Header */}
              <View style={styles.sectionRow}>
                <Text style={[styles.sectionTitle, { color: '#1A1025', paddingHorizontal: 0 }]}>Market Insights</Text>
                <View style={[styles.insightBadge, { backgroundColor: ACCENT + '18', marginRight: 16 }]}>
                  <Text style={[styles.insightBadgeText, { color: ACCENT }]}>{total} Searching Jobs</Text>
                </View>
              </View>

              {/* By Mode — always 2 fixed cards */}
              <View style={[styles.insightCard, { marginHorizontal: 16, backgroundColor: '#fff' }]}>
                <Text style={styles.insightCardTitle}>Jobs by Mode</Text>
                <View style={styles.modeGrid}>
                  {FIXED_MODES.map((m) => {
                    const pct = total > 0 ? Math.round((m.count / total) * 100) : 0;
                    return (
                      <TouchableOpacity
                        key={m.label}
                        style={[styles.modeCell, { backgroundColor: m.bg }]}
                        onPress={() => router.push(`/(tabs)/jobs?filterMode=${encodeURIComponent(m.qf)}` as any)}
                        activeOpacity={0.75}
                      >
                        <Text style={styles.modeCellIcon}>{m.icon}</Text>
                        <Text style={[styles.modeCellCount, { color: m.color }]}>{m.count}</Text>
                        <Text style={[styles.modeCellLabel, { color: m.color }]}>{m.label}</Text>
                        <Text style={[styles.modeCellPct,  { color: m.color + '99' }]}>{pct}%</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* By Class Group — horizontal bar */}
              <View style={[styles.insightCard, { marginHorizontal: 16, backgroundColor: '#fff' }]}>
                <Text style={styles.insightCardTitle}>Jobs by Class Group</Text>
                {classCount.map((g) => {
                  const pct = total > 0 ? Math.round((g.count / total) * 100) : 0;
                  return (
                    <TouchableOpacity
                      key={g.label}
                      style={styles.insightRow}
                      onPress={() => router.push(`/(tabs)/jobs?classNums=${g.nums.join(',')}` as any)}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.insightLabel}>{g.label}</Text>
                      <View style={styles.insightBarWrap}>
                        <View style={styles.insightBarBg}>
                          <View style={[styles.insightBarFill, { width: `${pct}%` as any, backgroundColor: g.color }]} />
                        </View>
                        <Text style={[styles.insightCount, { color: g.color }]}>{g.count}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
                {classOther > 0 && (
                  <View style={styles.insightRow}>
                    <Text style={styles.insightLabel}>Other / Pre-School</Text>
                    <View style={styles.insightBarWrap}>
                      <View style={styles.insightBarBg}>
                        <View style={[styles.insightBarFill, { width: `${Math.round((classOther/total)*100)}%` as any, backgroundColor: '#9CA3AF' }]} />
                      </View>
                      <Text style={[styles.insightCount, { color: '#9CA3AF' }]}>{classOther}</Text>
                    </View>
                  </View>
                )}
              </View>

              {/* By City — Donut Chart */}
              {(() => {
                const SZ = 220; const CX = SZ / 2; const CY = SZ / 2;
                const OR = 88; const IR = 52;
                const GAP_DEG = 1.8;
                let angle = -Math.PI / 2;
                const slices = allCities.map(([city, count], i) => {
                  const frac   = count / total;
                  const sweep  = frac * 2 * Math.PI - (GAP_DEG * Math.PI / 180);
                  const sa = angle + (GAP_DEG * Math.PI / 180) / 2;
                  const ea = sa + sweep;
                  angle = angle + frac * 2 * Math.PI;
                  const x1 = CX + OR * Math.cos(sa), y1 = CY + OR * Math.sin(sa);
                  const x2 = CX + OR * Math.cos(ea), y2 = CY + OR * Math.sin(ea);
                  const x3 = CX + IR * Math.cos(ea), y3 = CY + IR * Math.sin(ea);
                  const x4 = CX + IR * Math.cos(sa), y4 = CY + IR * Math.sin(sa);
                  const lg  = sweep > Math.PI ? 1 : 0;
                  const d   = `M${x1} ${y1} A${OR} ${OR} 0 ${lg} 1 ${x2} ${y2} L${x3} ${y3} A${IR} ${IR} 0 ${lg} 0 ${x4} ${y4}Z`;
                  return { city, count, d, color: cityColor(i) };
                });
                return (
                  <View style={[styles.insightCard, { marginHorizontal: 16, backgroundColor: '#fff' }]}>
                    <Text style={styles.insightCardTitle}>Jobs by City</Text>
                    {/* Donut */}
                    <View style={{ alignItems: 'center' }}>
                      <Svg width={SZ} height={SZ}>
                        {/* bg ring */}
                        <Circle cx={CX} cy={CY} r={(OR + IR) / 2} stroke="#F0EBE3" strokeWidth={OR - IR} fill="none" />
                        {slices.map((s) => (
                          <Path key={s.city} d={s.d} fill={s.color} />
                        ))}
                        {/* center text */}
                        <SvgText x={CX} y={CY - 9} textAnchor="middle" fontSize={28} fontWeight="700" fill="#1A1025">{total}</SvgText>
                        <SvgText x={CX} y={CY + 11} textAnchor="middle" fontSize={11} fill="#9CA3AF">Searching</SvgText>
                      </Svg>
                    </View>
                    {/* Legend grid — 2 cols */}
                    <View style={styles.donutLegend}>
                      {slices.map((s) => (
                        <TouchableOpacity
                          key={s.city}
                          style={styles.donutLegendItem}
                          onPress={() => router.push(`/(tabs)/jobs?filterCity=${encodeURIComponent(s.city)}` as any)}
                          activeOpacity={0.75}
                        >
                          <View style={[styles.donutDot, { backgroundColor: s.color }]} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.donutCity} numberOfLines={1}>{s.city}</Text>
                            <Text style={[styles.donutCount, { color: s.color }]}>{s.count} jobs</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                );
              })()}
            </View>
          );
        })()}

        {/* ── Today's Leads ── */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <View style={styles.sectionTitleRow}>
              <Text style={[styles.sectionTitle, { color: '#1A1025', paddingHorizontal: 0 }]}>Today's Leads</Text>
              <View style={styles.liveChip}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>Live</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/jobs')} style={styles.viewAllBtn}>
              <Text style={[styles.viewAllText, { color: ACCENT }]}>View all</Text>
              <Feather name="chevron-right" size={14} color={ACCENT} />
            </TouchableOpacity>
          </View>
          {/* Day + Date subtitle */}
          <Text style={styles.leadsDateLine}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>

          <View style={{ paddingHorizontal: 16 }}>
            {leadsLoading ? (
              <View style={styles.leadsEmpty}>
                <ActivityIndicator size="small" color={ACCENT} />
              </View>
            ) : latestLeads.length === 0 ? (
              <View style={styles.leadsEmpty}>
                <Feather name="inbox" size={28} color="#C4B8A8" />
                <Text style={styles.leadsEmptyText}>No new leads right now</Text>
                <Text style={styles.leadsEmptySubtext}>Check back soon — we refresh every 60s</Text>
              </View>
            ) : (
              latestLeads.map((lead) => {
                const applying = applyingId === lead.id;
                return (
                  <Animated.View key={lead.id} style={{ marginBottom: 12 }}>
                    <TouchableOpacity
                      activeOpacity={0.82}
                      style={[styles.leadCard, { backgroundColor: '#fff', borderLeftColor: ACCENT }]}
                      onPress={() => setSelectedJob(lead)}
                    >
                      {/* top row: class+board LEFT | #order_id RIGHT */}
                      <View style={styles.lcTopRow}>
                        <View style={styles.lcClassWrap}>
                          <Text style={styles.lcClassName}>
                            {lead.studentClass && lead.studentClass !== 'General'
                              ? lead.studentClass
                              : 'General'}
                          </Text>
                          <Text style={styles.lcBoard}>{lead.board}</Text>
                        </View>
                        <View style={[styles.lcOrderBadge, { backgroundColor: ACCENT + '18' }]}>
                          <Text style={[styles.lcOrderBadgeText, { color: ACCENT }]}>#{lead.id}</Text>
                        </View>
                      </View>

                      {/* info row */}
                      <View style={styles.lcInfoRow}>
                        <Feather name="home" size={12} color="#6B7280" />
                        <Text style={styles.lcInfoText}>
                          {lead.teachingMode === 'Home Tuition' ? 'Classes at Home' : lead.teachingMode}
                        </Text>
                        <View style={styles.lcDot} />
                        <Feather name="map-pin" size={12} color="#6B7280" />
                        <Text style={styles.lcInfoText}>{lead.city}</Text>
                      </View>

                      {/* footer */}
                      <View style={styles.lcFooter}>
                        <View style={styles.lcFooterLeft}>
                          <Feather name="clock" size={11} color="#9CA3AF" />
                          <Text style={styles.lcTimeText}>{formatLeadTime(lead.postedAt)}</Text>
                          {!!lead.leadStatus && (
                            <View style={[styles.lcStatusBadge, {
                              backgroundColor:
                                lead.leadStatus === 'Searching' ? '#D9EDD9' :
                                lead.leadStatus === 'Closed'    ? '#FFE4E4' :
                                lead.leadStatus === 'Hired'     ? '#FFF3CD' : '#EDE9FE',
                            }]}>
                              <Text style={[styles.lcStatusText, {
                                color:
                                  lead.leadStatus === 'Searching' ? '#38784C' :
                                  lead.leadStatus === 'Closed'    ? '#DC2626' :
                                  lead.leadStatus === 'Hired'     ? '#C48B3C' : '#7C3AED',
                              }]}>{lead.leadStatus}</Text>
                            </View>
                          )}
                          {lead.hasApplied && (
                            <View style={styles.lcNewBadge}>
                              <Feather name="check-circle" size={10} color={ACCENT} />
                              <Text style={[styles.lcNewText, { color: ACCENT }]}>Applied</Text>
                            </View>
                          )}
                        </View>
                        <TouchableOpacity
                          style={[styles.lcApplyBtn, {
                            backgroundColor: lead.hasApplied ? '#3B7A94' : ACCENT,
                          }]}
                          onPress={() => {
                            if (lead.hasApplied) {
                              const conn = connections.find((c) => c.jobId === lead.id);
                              if (conn) router.push(`/chat/${conn.id}` as any);
                            } else {
                              handleLeadRequest(lead);
                            }
                          }}
                          disabled={applying}
                        >
                          {applying ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : lead.hasApplied ? (
                            <>
                              <Feather name="message-circle" size={12} color="#fff" />
                              <Text style={styles.lcApplyText}>Chat</Text>
                            </>
                          ) : (
                            <>
                              <Feather name="send" size={12} color="#fff" />
                              <Text style={styles.lcApplyText}>Send Interest</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })
            )}
          </View>
        </View>

      </ScrollView>

      <JobDetailsModal
        job={selectedJob}
        visible={!!selectedJob}
        onClose={() => setSelectedJob(null)}
        onSendRequest={() => selectedJob && handleSendRequest(selectedJob)}
        onSave={() => selectedJob && handleSave(selectedJob)}
      />

      {/* ── Limit Modal ── */}
      <Modal transparent animationType="fade" visible={showLimitModal} onRequestClose={() => setShowLimitModal(false)}>
        <View style={styles.limitOverlay}>
          <View style={styles.limitBox}>
            <Text style={styles.limitIcon}>🔒</Text>
            <Text style={styles.limitTitle}>Request Limit Reached</Text>
            <Text style={styles.limitBody}>
              Free plan allows only {FREE_REQUEST_LIMIT} interest requests.{'\n'}
              Upgrade to Premium for unlimited access!
            </Text>
            <TouchableOpacity
              style={styles.limitUpgradeBtn}
              onPress={() => { setShowLimitModal(false); router.push('/premium' as any); }}
            >
              <Text style={styles.limitUpgradeTxt}>🚀 Upgrade to Premium</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowLimitModal(false)} style={styles.limitCancelBtn}>
              <Text style={styles.limitCancelTxt}>Not Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root:      { flex: 1 },
  statsRow:  { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  statChip:  { flex: 1, borderRadius: 14, padding: 10, alignItems: 'center', gap: 3 },
  statValue: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 10, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginBottom: 4, borderRadius: 16, padding: 10,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4,
  },
  searchIcon:        { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  searchPlaceholder: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', color: '#9CA3AF' },
  searchFilter:      { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  section:       { gap: 12, paddingTop: 20 },
  sectionRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle:  { fontSize: 16, fontFamily: 'Inter_700Bold', paddingHorizontal: 16 },
  viewAllBtn:    { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewAllText:   { fontSize: 13, fontFamily: 'Inter_600SemiBold' },

  liveChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFEAEA', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  liveDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: '#E53935' },
  liveText: { fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#E53935' },

  leadsDateLine:     { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: ACCENT, paddingHorizontal: 16, marginTop: 2, marginBottom: 10 },
  leadsEmpty:        { alignItems: 'center', paddingVertical: 24, gap: 6 },
  leadsEmptyText:    { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#9CA3AF' },
  leadsEmptySubtext: { fontSize: 12, fontFamily: 'Inter_400Regular', color: '#C4B8A8' },

  // Lead card — JobCard-style with teal accent
  leadCard: {
    borderRadius: 16, borderLeftWidth: 4, overflow: 'hidden',
    shadowColor: '#3FA683', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.09, shadowRadius: 12, elevation: 4,
    padding: 14, gap: 10,
  },
  lcTopRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  lcClassWrap: { gap: 1 },
  lcClassName: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#1A1025', lineHeight: 24 },
  lcBoard:         { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#7A6B5A' },
  lcOrderBadge:    { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  lcOrderBadgeText:{ fontSize: 15, fontFamily: 'Inter_700Bold' },
  lcPillsRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  lcPill:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  lcPillText:  { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  lcAppliedPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: '#D3EEE5',
  },
  lcInfoRow:  { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  lcInfoText: { fontSize: 12, fontFamily: 'Inter_400Regular', color: '#6B7280' },
  lcDot:      { width: 3, height: 3, borderRadius: 2, backgroundColor: '#BDAA93' },
  lcFooter:   {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: '#EEE8DF', paddingTop: 10,
  },
  lcFooterLeft: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
  lcTimeText:   { fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9CA3AF' },
  lcStatusBadge:{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  lcStatusText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  lcNewBadge:   {
    flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 2,
    backgroundColor: '#D3EEE5', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6,
  },
  lcNewText:    { fontSize: 10, fontFamily: 'Inter_700Bold' },
  lcApplyBtn:   {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
  },
  lcApplyText:  { fontSize: 12, fontFamily: 'Inter_700Bold', color: '#fff' },

  limitOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  limitBox:        { backgroundColor: '#fff', borderRadius: 20, padding: 28, width: '100%', alignItems: 'center', gap: 8 },
  limitIcon:       { fontSize: 36 },
  limitTitle:      { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#1A1025', textAlign: 'center' },
  limitBody:       { fontSize: 14, fontFamily: 'Inter_400Regular', color: '#6B7280', textAlign: 'center', lineHeight: 22 },
  limitUpgradeBtn: { marginTop: 8, backgroundColor: '#3F66A6', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, width: '100%', alignItems: 'center' },
  limitUpgradeTxt: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#fff' },
  limitCancelBtn:  { paddingVertical: 10 },
  limitCancelTxt:  { fontSize: 14, fontFamily: 'Inter_400Regular', color: '#9CA3AF' },

  qaRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16 },
  qaItem:  { alignItems: 'center', gap: 6, flex: 1 },
  qaGrad:  { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  qaLabel: { fontSize: 9.5, fontFamily: 'Inter_600SemiBold', color: '#4A3B2A', textAlign: 'center', lineHeight: 13 },

  insightSection: { gap: 12, paddingTop: 20 },
  insightCard: {
    borderRadius: 18, padding: 16, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  insightCardTitle: { fontSize: 14, fontFamily: 'Inter_700Bold', color: '#1A1025' },
  insightBadge:     { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8 },
  insightBadgeText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },

  // Mode grid
  modeGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  modeCell: {
    flex: 1, minWidth: '45%', borderRadius: 14, padding: 14,
    alignItems: 'center', gap: 4,
  },
  modeCellIcon:  { fontSize: 24 },
  modeCellCount: { fontSize: 26, fontFamily: 'Inter_700Bold', lineHeight: 30 },
  modeCellLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  modeCellPct:   { fontSize: 11, fontFamily: 'Inter_400Regular' },

  // Bar chart rows
  insightRow:    { gap: 5 },
  insightLabel:  { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#4A3B2A' },
  insightBarWrap:{ flexDirection: 'row', alignItems: 'center', gap: 8 },
  insightBarBg:  { flex: 1, height: 9, borderRadius: 6, backgroundColor: '#F0EBE3', overflow: 'hidden' },
  insightBarFill:{ height: 9, borderRadius: 6 },
  insightCount:  { fontSize: 13, fontFamily: 'Inter_700Bold', minWidth: 24, textAlign: 'right' },

  donutLegend:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  donutLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '47%' },
  donutDot:        { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  donutCity:       { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#1A1025' },
  donutCount:      { fontSize: 11, fontFamily: 'Inter_400Regular' },

  networkCard: {
    marginHorizontal: 16, marginTop: 20, borderRadius: 20, padding: 16, gap: 14,
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  netTitle:      { fontSize: 16, fontFamily: 'Inter_700Bold' },
  netRow:        { flexDirection: 'row' },
  netItem:       { flex: 1, alignItems: 'center', gap: 3 },
  netItemBorder: { borderRightWidth: 1, borderRightColor: '#DDD5C8' },
  netVal:        { fontSize: 20, fontFamily: 'Inter_700Bold' },
  netLabel:      { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#7A6B5A' },
});
