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
import {
  CLASS_GROUPS, BOARDS,
  getClassesForGroups, getSubjectsForGroups,
} from '@/constants/config';

export default function ManageSubjectsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile } = useProfile();
  const [saving, setSaving] = useState(false);
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const [classGroups, setClassGroups] = useState<string[]>([...(profile.classGroups ?? [])]);
  const [classes, setClasses] = useState<string[]>([...profile.classes]);
  const [subjects, setSubjects] = useState<string[]>([...profile.subjects]);
  const [boards, setBoards] = useState<string[]>([...profile.boards]);

  function toggleClassGroup(group: string) {
    const next = classGroups.includes(group)
      ? classGroups.filter((x) => x !== group)
      : [...classGroups, group];
    const validClasses = getClassesForGroups(next);
    const validSubjects = getSubjectsForGroups(next);
    setClassGroups(next);
    setClasses((c) => c.filter((x) => validClasses.includes(x)));
    setSubjects((s) => s.filter((x) => validSubjects.includes(x)));
  }

  function toggleItem(arr: string[], setArr: (v: string[]) => void, val: string) {
    setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  }

  async function handleSave() {
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await updateProfile({ classGroups, classes, subjects, boards });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } finally {
      setSaving(false);
    }
  }

  const availableClasses = getClassesForGroups(classGroups);
  const availableSubjects = getSubjectsForGroups(classGroups);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.secondary }]}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Manage Subjects</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Save</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 30 }]} showsVerticalScrollIndicator={false}>

        <Section title="Class Group" subtitle="Select the class groups you teach" colors={colors}>
          <ChipGroup options={[...CLASS_GROUPS]} selected={classGroups} onToggle={toggleClassGroup} colors={colors} />
        </Section>

        {classGroups.length > 0 && (
          <>
            <Section title="Classes" subtitle="Filtered based on selected groups" colors={colors}>
              <ChipGroup options={availableClasses} selected={classes} onToggle={(v) => toggleItem(classes, setClasses, v)} colors={colors} />
            </Section>

            <Section title="Subjects" subtitle="Filtered based on selected groups" colors={colors}>
              <ChipGroup options={availableSubjects} selected={subjects} onToggle={(v) => toggleItem(subjects, setSubjects, v)} colors={colors} />
            </Section>
          </>
        )}

        {classGroups.length === 0 && (
          <View style={[styles.emptyHint, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Feather name="info" size={16} color={colors.mutedForeground} />
            <Text style={[styles.emptyHintText, { color: colors.mutedForeground }]}>
              Select a class group above to see relevant classes and subjects
            </Text>
          </View>
        )}

        <Section title="Boards" subtitle="Select boards you are comfortable teaching" colors={colors}>
          <ChipGroup options={BOARDS} selected={boards} onToggle={(v) => toggleItem(boards, setBoards, v)} colors={colors} />
        </Section>

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

function ChipGroup({ options, selected, onToggle, colors }: { options: string[]; selected: string[]; onToggle: (v: string) => void; colors: any }) {
  return (
    <View style={styles.chips}>
      {options.map((o) => {
        const active = selected.includes(o);
        return (
          <TouchableOpacity
            key={o}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onToggle(o); }}
            style={[styles.chip, { backgroundColor: active ? colors.primary : colors.card, borderColor: active ? colors.primary : colors.border }]}
          >
            {active && <Feather name="check" size={11} color="#fff" />}
            <Text style={[styles.chipText, { color: active ? '#fff' : colors.mutedForeground }]}>{o}</Text>
          </TouchableOpacity>
        );
      })}
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
