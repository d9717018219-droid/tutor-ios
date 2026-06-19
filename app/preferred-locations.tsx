import React, { useState } from 'react';
import {
  ActivityIndicator, Platform, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useProfile } from '@/contexts/ProfileContext';
import { CITIES, CITY_AREAS } from '@/constants/config';

export default function PreferredLocationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile } = useProfile();
  const [saving, setSaving] = useState(false);
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const [city, setCity] = useState(profile.city ?? '');
  const [areas, setAreas] = useState<string[]>([...(profile.areas ?? [])]);

  function selectCity(c: string) {
    if (c === city) return;
    setCity(c);
    setAreas([]);
  }

  function toggleArea(area: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAreas((a) => a.includes(area) ? a.filter((x) => x !== area) : [...a, area]);
  }

  async function handleSave() {
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await updateProfile({ city, areas });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } finally {
      setSaving(false);
    }
  }

  const cityAreas: string[] = city ? (CITY_AREAS[city] ?? []) : [];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.secondary }]}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Preferred Locations</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Save</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 30 }]} showsVerticalScrollIndicator={false}>

        <Section title="Select City" subtitle="Choose your primary teaching city" colors={colors}>
          <View style={styles.chips}>
            {CITIES.map((c) => {
              const active = city === c;
              return (
                <TouchableOpacity
                  key={c}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); selectCity(c); }}
                  style={[styles.chip, { backgroundColor: active ? colors.primary : colors.card, borderColor: active ? colors.primary : colors.border }]}
                >
                  {active && <Feather name="check" size={11} color="#fff" />}
                  <Text style={[styles.chipText, { color: active ? '#fff' : colors.mutedForeground }]}>{c}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Section>

        {city && cityAreas.length > 0 && (
          <Section title={`Areas in ${city}`} subtitle={`${areas.length} selected — select where you can teach`} colors={colors}>
            <View style={styles.chips}>
              {cityAreas.map((area) => {
                const active = areas.includes(area);
                return (
                  <TouchableOpacity
                    key={area}
                    onPress={() => toggleArea(area)}
                    style={[styles.chip, { backgroundColor: active ? colors.primary : colors.card, borderColor: active ? colors.primary : colors.border }]}
                  >
                    {active && <Feather name="check" size={11} color="#fff" />}
                    <Text style={[styles.chipText, { color: active ? '#fff' : colors.mutedForeground }]}>{area}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Section>
        )}

        {city && cityAreas.length === 0 && (
          <View style={[styles.emptyHint, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Feather name="map-pin" size={16} color={colors.mutedForeground} />
            <Text style={[styles.emptyHintText, { color: colors.mutedForeground }]}>
              No specific areas listed for {city}. Your profile will show the city.
            </Text>
          </View>
        )}

        {!city && (
          <View style={[styles.emptyHint, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Feather name="info" size={16} color={colors.mutedForeground} />
            <Text style={[styles.emptyHintText, { color: colors.mutedForeground }]}>
              Select a city above to see available areas
            </Text>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

function Section({ title, subtitle, children, colors }: { title: string; subtitle: string; children: React.ReactNode; colors: any }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>{subtitle}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  saveBtn: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10 },
  saveBtnText: { color: '#fff', fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  content: { padding: 20, gap: 24 },
  section: { gap: 10 },
  sectionHeader: { gap: 2 },
  sectionTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  sectionSub: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5 },
  chipText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  emptyHint: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1 },
  emptyHintText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular' },
});
