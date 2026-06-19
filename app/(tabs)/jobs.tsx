import React, { useState, useEffect, useCallback } from 'react';
import {
  ActivityIndicator, Modal, FlatList, Platform, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useConnections } from '@/hooks/useFirebaseChat';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { AppHeader } from '@/components/AppHeader';
import { JobCard } from '@/components/JobCard';
import { FilterSheet } from '@/components/FilterSheet';
import { JobDetailsModal } from '@/components/JobDetailsModal';
import { EmptyState } from '@/components/EmptyState';
import { MOCK_JOBS, MOCK_NOTIFICATIONS } from '@/services/mockData';
import { fetchRealJobs } from '@/services/jobsService';
import { TuitionJob, SortOption, JobFilters } from '@/types';
import { haversineDistance } from '@/utils/haversine';
import { getItem, setItem } from '@/utils/storage';
import { STORAGE_KEYS } from '@/constants/config';
import { useProfile } from '@/contexts/ProfileContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { sendInterest, fetchAppliedCounts } from '@/hooks/useFirebaseChat';

const PRIMARY = '#3F66A6';
const BG = '#F5F0E8';

const DEFAULT_FILTERS: JobFilters = {
  city: null, subject: null, studentClass: null, board: null,
  genderPreference: null, teachingMode: null, distance: null,
};

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: 'newest', label: 'Newest First' },
  { key: 'nearest', label: 'Nearest' },
  { key: 'highest_fee', label: 'Highest Fee' },
];

const QUICK_FILTERS = ['All', 'Classes at Home', 'Online'];

const FREE_REQUEST_LIMIT = 20;

function LimitModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={limitStyles.overlay}>
        <View style={limitStyles.box}>
          <Text style={limitStyles.icon}>🔒</Text>
          <Text style={limitStyles.title}>Request Limit Reached</Text>
          <Text style={limitStyles.body}>
            Free plan allows only {FREE_REQUEST_LIMIT} interest requests.{'\n'}
            Upgrade to Premium for unlimited access!
          </Text>
          <TouchableOpacity
            style={limitStyles.upgradeBtn}
            onPress={() => { onClose(); router.push('/premium' as any); }}
          >
            <Text style={limitStyles.upgradeTxt}>🚀 Upgrade to Premium</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={limitStyles.cancelBtn}>
            <Text style={limitStyles.cancelTxt}>Not Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const limitStyles = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  box:        { backgroundColor: '#fff', borderRadius: 20, padding: 28, width: '100%', alignItems: 'center', gap: 8 },
  icon:       { fontSize: 36 },
  title:      { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#1A1025', textAlign: 'center' },
  body:       { fontSize: 14, fontFamily: 'Inter_400Regular', color: '#6B7280', textAlign: 'center', lineHeight: 22 },
  upgradeBtn: { marginTop: 8, backgroundColor: '#3F66A6', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, width: '100%', alignItems: 'center' },
  upgradeTxt: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#fff' },
  cancelBtn:  { paddingVertical: 10 },
  cancelTxt:  { fontSize: 14, fontFamily: 'Inter_400Regular', color: '#9CA3AF' },
});

export default function JobsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const { subscription } = useSubscription();
  const { connections } = useConnections(profile.phone);
  const params = useLocalSearchParams<{ filterMode?: string; filterCity?: string; classNums?: string }>();
  const [jobs, setJobs] = useState<TuitionJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('newest');
  const [sortOpen, setSortOpen] = useState(false);
  const [filters, setFilters] = useState<JobFilters>(DEFAULT_FILTERS);
  const [classNumsFilter, setClassNumsFilter] = useState<number[] | null>(null);

  // Apply incoming params from Home screen insights (re-run whenever params change)
  useEffect(() => {
    if (params.filterMode) setActiveQF(params.filterMode);
    else setActiveQF('All');
    if (params.filterCity) setFilters((prev) => ({ ...prev, city: params.filterCity! }));
    else setFilters((prev) => ({ ...prev, city: profile.city ?? null }));
    if (params.classNums) setClassNumsFilter(params.classNums.split(',').map(Number));
    else setClassNumsFilter(null);
  }, [params.filterMode, params.filterCity, params.classNums]);

  // Pre-filter by tutor's city when profile loads
  useEffect(() => {
    if (profile.city && !params.filterCity) {
      setFilters((prev) => prev.city ? prev : { ...prev, city: profile.city });
    }
  }, [profile.city]);
  const [filterVisible, setFilterVisible] = useState(false);
  const [selectedJob, setSelectedJob] = useState<TuitionJob | null>(null);
  const [activeQF, setActiveQF] = useState('All');
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLon, setUserLon] = useState<number | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  useFocusEffect(useCallback(() => {
    getItem<string[]>(STORAGE_KEYS.NOTIFICATIONS).then((readIds) => {
      const count = MOCK_NOTIFICATIONS.filter((n) => !readIds?.includes(n.id)).length;
      setUnread(count);
    });
  }, []));

  useEffect(() => { loadJobs(); fetchLocation(); }, []);

  async function loadJobs() {
    setLoading(true);
    try {
      const [real, saved, applied, counts] = await Promise.all([
        fetchRealJobs(100),
        getItem<string[]>(STORAGE_KEYS.SAVED_JOBS).then((v) => v ?? []),
        getItem<string[]>(STORAGE_KEYS.APPLIED_JOBS).then((v) => v ?? []),
        fetchAppliedCounts(),
      ]);
      const source = real.length > 0 ? real : MOCK_JOBS;
      setJobs(source.map((j) => ({
        ...j,
        isSaved: saved.includes(j.id),
        hasApplied: applied.includes(j.id),
        appliedCount: counts[j.id] ?? 0,
      })));
    } finally {
      setLoading(false);
    }
  }

  async function fetchLocation() {
    if (Platform.OS === 'web') return;
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLat(loc.coords.latitude); setUserLon(loc.coords.longitude);
      }
    } catch {} finally { setLocationLoading(false); }
  }

  const filteredJobs = useCallback(() => {
    let result = jobs.map((j) => ({
      ...j,
      distance: userLat !== null && userLon !== null
        ? haversineDistance(userLat, userLon, j.latitude, j.longitude) : undefined,
    }));
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((j) =>
        j.city.toLowerCase().includes(q) ||
        j.subjects.some((s) => s.toLowerCase().includes(q)) ||
        j.studentClass.toLowerCase().includes(q) ||
        j.board.toLowerCase().includes(q),
      );
    }
    if (activeQF !== 'All') {
      const modeMatch = activeQF === 'Classes at Home'
        ? (j: any) => j.teachingMode === 'Classes at Home' || j.teachingMode === 'Home Tuition'
        : (j: any) => j.teachingMode === activeQF || j.board === activeQF;
      result = result.filter(modeMatch);
    }
    if (classNumsFilter) {
      const ROMAN_MAP: Record<string, number> = {
        XII:12, XI:11, VIII:8, VII:7, VI:6, IV:4, IX:9, X:10, III:3, II:2, I:1, V:5,
      };
      const toNum = (raw: string): number | null => {
        const s = raw.trim().toUpperCase();
        for (const [r, n] of Object.entries(ROMAN_MAP)) {
          if (new RegExp(`\\b${r}\\b`).test(s)) return n;
        }
        const n = parseInt(s.replace(/\D/g, ''), 10);
        return isNaN(n) || n < 1 || n > 12 ? null : n;
      };
      result = result.filter((j) => {
        const n = toNum(j.studentClass ?? '');
        return n !== null && classNumsFilter.includes(n);
      });
    }
    if (filters.city) result = result.filter((j) => j.city === filters.city);
    if (filters.subject) result = result.filter((j) => j.subjects.includes(filters.subject!));
    if (filters.studentClass) result = result.filter((j) => j.studentClass === filters.studentClass);
    if (filters.board) result = result.filter((j) => j.board === filters.board);
    if (filters.teachingMode) result = result.filter((j) => j.teachingMode === filters.teachingMode);
    if (filters.genderPreference) result = result.filter((j) => j.genderPreference === filters.genderPreference || j.genderPreference === 'Any');
    if (filters.distance && userLat !== null && userLon !== null) result = result.filter((j) => (j.distance ?? 999) <= filters.distance!);
    if (sort === 'nearest') result.sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));
    else if (sort === 'highest_fee') result.sort((a, b) => b.monthlyFee - a.monthlyFee);
    else result.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
    return result;
  }, [jobs, search, sort, filters, activeQF, classNumsFilter, userLat, userLon]);

  async function handleSendRequest(job: TuitionJob) {
    // ── Free user limit check (Firestore-persistent across re-registration) ────
    if (!subscription.isPremium && connections.length >= FREE_REQUEST_LIMIT) {
      setSelectedJob(null);
      setShowLimitModal(true);
      return;
    }

    // Mark as applied locally
    const applied = (await getItem<string[]>(STORAGE_KEYS.APPLIED_JOBS)) ?? [];
    if (!applied.includes(job.id)) {
      await setItem(STORAGE_KEYS.APPLIED_JOBS, [...applied, job.id]);
      setJobs((prev) => prev.map((j) => j.id === job.id ? { ...j, hasApplied: true } : j));
    }

    // Create Firestore connection + alert doc for parent app
    try {
      const { connectionId } = await sendInterest(job, {
        phone: profile.phone,
        name: profile.name,
      });
      setSelectedJob(null);
      if (connectionId) router.push(`/chat/${connectionId}` as any);
    } catch {
      setSelectedJob(null);
    }
  }

  async function handleSave(job: TuitionJob) {
    const saved = (await getItem<string[]>(STORAGE_KEYS.SAVED_JOBS)) ?? [];
    const newSaved = saved.includes(job.id) ? saved.filter((x) => x !== job.id) : [...saved, job.id];
    await setItem(STORAGE_KEYS.SAVED_JOBS, newSaved);
    setJobs((prev) => prev.map((j) => j.id === job.id ? { ...j, isSaved: !j.isSaved } : j));
    if (selectedJob?.id === job.id) setSelectedJob((p) => p ? { ...p, isSaved: !p.isSaved } : p);
  }

  const activeFilterCount = Object.values(filters).filter((v) => v !== null).length;
  const displayedJobs = filteredJobs();
  const sortLabel = SORT_OPTIONS.find((o) => o.key === sort)?.label ?? 'Sort';

  return (
    <View style={[styles.root, { backgroundColor: BG }]}>
      <AppHeader title="Jobs Portal" subtitle="TEACHING OPPORTUNITIES" notificationCount={unread} />

      {/* Search + Filter */}
      <View style={[styles.searchArea, { backgroundColor: BG }]}>
        <View style={[styles.searchBar, { backgroundColor: '#fff' }]}>
          <Feather name="search" size={16} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search subject, city, class…"
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
        <TouchableOpacity
          onPress={() => setFilterVisible(true)}
          style={[styles.filterBtn, { backgroundColor: activeFilterCount > 0 ? PRIMARY : '#fff' }]}
        >
          <Feather name="sliders" size={17} color={activeFilterCount > 0 ? '#fff' : PRIMARY} />
          {activeFilterCount > 0 && (
            <View style={styles.filterCount}>
              <Text style={styles.filterCountText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Quick filter tabs */}
      <View style={[styles.qfRow, { backgroundColor: BG }]}>
        {QUICK_FILTERS.map((qf) => (
          <TouchableOpacity
            key={qf}
            onPress={() => setActiveQF(qf)}
            style={[
              styles.qfChip,
              activeQF === qf
                ? { backgroundColor: PRIMARY, borderColor: PRIMARY }
                : { backgroundColor: '#fff', borderColor: '#DDD5C8' },
            ]}
          >
            <Text style={[styles.qfText, { color: activeQF === qf ? '#fff' : '#4A3B2A' }]}>{qf}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Count + Sort */}
      <View style={[styles.countBar, { backgroundColor: BG }]}>
        <Text style={styles.countText}>
          <Text style={[styles.countNum, { color: '#1A1025' }]}>{displayedJobs.length}</Text> jobs found
        </Text>
        <TouchableOpacity onPress={() => setSortOpen((v) => !v)} style={styles.sortBtn}>
          <Feather name="bar-chart-2" size={14} color={PRIMARY} />
          <Text style={[styles.sortLabel, { color: PRIMARY }]}>{sortLabel}</Text>
          <Feather name={sortOpen ? 'chevron-up' : 'chevron-down'} size={14} color={PRIMARY} />
        </TouchableOpacity>
      </View>

      {sortOpen && (
        <View style={[styles.sortDropdown, { backgroundColor: '#fff' }]}>
          {SORT_OPTIONS.map((o) => (
            <TouchableOpacity
              key={o.key}
              onPress={() => { setSort(o.key); setSortOpen(false); }}
              style={[styles.sortOption, sort === o.key && { backgroundColor: '#D8E4F0' }]}
            >
              <Text style={[styles.sortOptionText, { color: sort === o.key ? PRIMARY : '#4A3B2A' }]}>{o.label}</Text>
              {sort === o.key && <Feather name="check" size={14} color={PRIMARY} />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {locationLoading && (
        <View style={styles.locationRow}>
          <ActivityIndicator size="small" color={PRIMARY} />
          <Text style={styles.locationText}>Getting your location…</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>Fetching latest jobs…</Text>
        </View>
      ) : (
        <FlatList
          data={displayedJobs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 90 }]}
          renderItem={({ item }) => (
            <JobCard
              job={item}
              onPress={() => setSelectedJob(item)}
              onSendRequest={() => handleSendRequest(item)}
              onSave={() => handleSave(item)}
              appliedCount={item.appliedCount}
              connectionId={connections.find((c) => c.jobId === item.id)?.id}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="briefcase"
              title="No jobs found"
              description="Try adjusting your filters to see more opportunities."
              action={{ label: 'Clear Filters', onPress: () => { setFilters(DEFAULT_FILTERS); setSearch(''); setActiveQF('All'); } }}
            />
          }
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      )}

      <FilterSheet visible={filterVisible} filters={filters} onApply={setFilters} onClose={() => setFilterVisible(false)} />
      <JobDetailsModal
        job={selectedJob}
        visible={!!selectedJob}
        onClose={() => setSelectedJob(null)}
        onSendRequest={() => selectedJob && handleSendRequest(selectedJob)}
        onSave={() => selectedJob && handleSave(selectedJob)}
      />
      <LimitModal visible={showLimitModal} onClose={() => setShowLimitModal(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  searchArea: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, paddingHorizontal: 14, height: 46,
    shadowColor: '#3F66A6', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', color: '#1A1025' },
  filterBtn: {
    width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#3F66A6', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  filterCount: {
    position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#A63F84', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff',
  },
  filterCountText: { color: '#fff', fontSize: 9, fontFamily: 'Inter_700Bold' },
  qfRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 12, flexWrap: 'wrap' },
  qfChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  qfText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  countBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 10,
  },
  countText: { fontSize: 14, fontFamily: 'Inter_400Regular', color: '#7A6B5A' },
  countNum: { fontFamily: 'Inter_700Bold' },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sortLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  sortDropdown: {
    position: 'absolute', top: 195, right: 16, zIndex: 999,
    borderRadius: 14, overflow: 'hidden', minWidth: 170,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 10,
  },
  sortOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 13,
  },
  sortOptionText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  locationText: { fontSize: 12, fontFamily: 'Inter_400Regular', color: '#9CA3AF' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#7A6B5A' },
  list: { paddingHorizontal: 16, paddingTop: 4 },
});
