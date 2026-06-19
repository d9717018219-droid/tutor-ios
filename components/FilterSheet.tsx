import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { JobFilters } from '@/types';
import { SUBJECTS, CLASSES, BOARDS, CITIES } from '@/constants/config';

interface FilterSheetProps {
  visible: boolean;
  filters: JobFilters;
  onApply: (f: JobFilters) => void;
  onClose: () => void;
}

const DISTANCE_OPTIONS: { label: string; value: JobFilters['distance'] }[] = [
  { label: 'Under 2 km', value: 2 },
  { label: 'Under 5 km', value: 5 },
  { label: 'Under 10 km', value: 10 },
  { label: 'All', value: null },
];

const MODES = ['Home Tuition', 'Online', 'Group'] as const;
const GENDERS = ['Any', 'Male', 'Female'] as const;

export function FilterSheet({ visible, filters, onApply, onClose }: FilterSheetProps) {
  const colors = useColors();
  const [local, setLocal] = useState<JobFilters>(filters);

  function toggle<K extends keyof JobFilters>(key: K, value: JobFilters[K]) {
    setLocal((p) => ({ ...p, [key]: p[key] === value ? null : value }));
  }

  function apply() { onApply(local); onClose(); }
  function reset() { setLocal({ city: null, subject: null, studentClass: null, board: null, genderPreference: null, teachingMode: null, distance: null }); }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose}><Feather name="x" size={22} color={colors.text} /></TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Filters</Text>
          <TouchableOpacity onPress={reset}><Text style={[styles.resetText, { color: colors.primary }]}>Reset</Text></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Section title="Distance" colors={colors}>
            <View style={styles.chips}>
              {DISTANCE_OPTIONS.map((o) => (
                <Chip key={String(o.value)} label={o.label} selected={local.distance === o.value} onPress={() => setLocal(p => ({ ...p, distance: o.value }))} colors={colors} />
              ))}
            </View>
          </Section>
          <Section title="Teaching Mode" colors={colors}>
            <View style={styles.chips}>
              {MODES.map((m) => <Chip key={m} label={m} selected={local.teachingMode === m} onPress={() => toggle('teachingMode', m as any)} colors={colors} />)}
            </View>
          </Section>
          <Section title="Gender Preference" colors={colors}>
            <View style={styles.chips}>
              {GENDERS.map((g) => <Chip key={g} label={g} selected={local.genderPreference === g} onPress={() => toggle('genderPreference', g as any)} colors={colors} />)}
            </View>
          </Section>
          <Section title="City" colors={colors}>
            <View style={styles.chips}>
              {CITIES.slice(0, 10).map((c) => <Chip key={c} label={c} selected={local.city === c} onPress={() => toggle('city', c)} colors={colors} />)}
            </View>
          </Section>
          <Section title="Subject" colors={colors}>
            <View style={styles.chips}>
              {SUBJECTS.slice(0, 10).map((s) => <Chip key={s} label={s} selected={local.subject === s} onPress={() => toggle('subject', s)} colors={colors} />)}
            </View>
          </Section>
          <Section title="Class" colors={colors}>
            <View style={styles.chips}>
              {CLASSES.map((c) => <Chip key={c} label={c} selected={local.studentClass === c} onPress={() => toggle('studentClass', c)} colors={colors} />)}
            </View>
          </Section>
          <Section title="Board" colors={colors}>
            <View style={styles.chips}>
              {BOARDS.map((b) => <Chip key={b} label={b} selected={local.board === b} onPress={() => toggle('board', b)} colors={colors} />)}
            </View>
          </Section>
        </ScrollView>
        <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          <TouchableOpacity onPress={apply} style={[styles.applyBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.applyText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function Section({ title, children, colors }: { title: string; children: React.ReactNode; colors: any }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {children}
    </View>
  );
}

function Chip({ label, selected, onPress, colors }: { label: string; selected: boolean; onPress: () => void; colors: any }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, { backgroundColor: selected ? colors.primary : colors.secondary, borderColor: selected ? colors.primary : colors.border }]}
    >
      <Text style={[styles.chipText, { color: selected ? '#fff' : colors.mutedForeground }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  resetText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  content: { padding: 16, gap: 20, paddingBottom: 100 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  chipText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, borderTopWidth: 1 },
  applyBtn: { paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  applyText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
});
