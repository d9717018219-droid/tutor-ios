import React, { useState } from 'react';
import {
  ActivityIndicator, Platform, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import DatePickerField from '@/components/DatePickerField';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { useColors } from '@/hooks/useColors';
import {
  QUALIFICATIONS, EXPERIENCE_OPTIONS, CITIES, CITY_AREAS, BOARDS,
  CLASS_GROUPS, getClassesForGroups, getSubjectsForGroups,
  DAYS, TIME_SLOT_GROUPS, ENGLISH_LEVELS, ENGLISH_LEVEL_DESC, FEE_OPTIONS,
  TEACHING_MODES,
} from '@/constants/config';

const GENDERS = ['Male', 'Female', 'Other'] as const;


export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { completeProfile } = useAuth();
  const { updateProfile, profile } = useProfile();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const TOTAL_STEPS = 3;

  const [form, setForm] = useState({
    name: profile.name || '',
    email: profile.email || '',
    gender: (profile.gender as typeof GENDERS[number]) || '' as typeof GENDERS[number] | '',
    dob: profile.dob || '',
    qualification: profile.qualification || '',
    experience: profile.experience || '',
    isSchoolTeacher: (profile.isSchoolTeacher as 'Yes' | 'No') || '' as 'Yes' | 'No' | '',
    haveVehicle: (profile.haveVehicle as 'Yes' | 'No') || '' as 'Yes' | 'No' | '',
    classGroups: profile.classGroups?.length ? profile.classGroups : [] as string[],
    subjects: profile.subjects?.length ? profile.subjects : [] as string[],
    classes: profile.classes?.length ? profile.classes : [] as string[],
    boards: profile.boards?.length ? profile.boards : [] as string[],
    teachingModes: profile.teachingModes?.length ? profile.teachingModes : [] as string[],
    englishLevel: profile.englishLevel || '',
    fee: profile.fee || '',
    preferredDays: profile.preferredDays?.length ? profile.preferredDays : [] as string[],
    preferredTime: profile.preferredTime?.length ? profile.preferredTime : [] as string[],
    city: profile.city || '',
    areas: profile.areas?.length ? profile.areas : [] as string[],
    address: profile.address || '',
    aboutMe: profile.aboutMe || '',
  });

  // If profile loads asynchronously after component mounts, sync it into form
  React.useEffect(() => {
    if (!profile.name) return;
    setForm((prev) => ({
      name: prev.name || profile.name || '',
      email: prev.email || profile.email || '',
      gender: prev.gender || (profile.gender as typeof GENDERS[number]) || '' as any,
      dob: prev.dob || profile.dob || '',
      qualification: prev.qualification || profile.qualification || '',
      experience: prev.experience || profile.experience || '',
      isSchoolTeacher: prev.isSchoolTeacher || (profile.isSchoolTeacher as 'Yes' | 'No') || '' as any,
      haveVehicle: prev.haveVehicle || (profile.haveVehicle as 'Yes' | 'No') || '' as any,
      classGroups: prev.classGroups.length ? prev.classGroups : (profile.classGroups ?? []),
      subjects: prev.subjects.length ? prev.subjects : (profile.subjects ?? []),
      classes: prev.classes.length ? prev.classes : (profile.classes ?? []),
      boards: prev.boards.length ? prev.boards : (profile.boards ?? []),
      teachingModes: prev.teachingModes.length ? prev.teachingModes : (profile.teachingModes ?? []),
      englishLevel: prev.englishLevel || profile.englishLevel || '',
      fee: prev.fee || profile.fee || '',
      preferredDays: prev.preferredDays.length ? prev.preferredDays : (profile.preferredDays ?? []),
      preferredTime: prev.preferredTime.length ? prev.preferredTime : (profile.preferredTime ?? []),
      city: prev.city || profile.city || '',
      areas: prev.areas.length ? prev.areas : (profile.areas ?? []),
      address: prev.address || profile.address || '',
      aboutMe: prev.aboutMe || profile.aboutMe || '',
    }));
  }, [profile.name]);

  function set(key: keyof typeof form, val: any) { setForm((p) => ({ ...p, [key]: val })); }

  function toggleArr(key: 'subjects' | 'classes' | 'boards' | 'teachingModes' | 'areas' | 'preferredDays' | 'preferredTime', val: string) {
    const cur = form[key] as string[];
    set(key, cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val]);
  }

  // Issue 3 fix: Class Group is SINGLE-select only
  function selectClassGroup(group: string) {
    const isAlreadySelected = form.classGroups[0] === group;
    const next = isAlreadySelected ? [] : [group];
    const validClasses  = getClassesForGroups(next);
    const validSubjects = getSubjectsForGroups(next);
    setForm((p) => ({
      ...p, classGroups: next,
      classes:  p.classes.filter((c) => validClasses.includes(c)),
      subjects: p.subjects.filter((s) => validSubjects.includes(s)),
    }));
  }

  function nextStep() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }
  function prevStep() { setStep((s) => Math.max(s - 1, 1)); }

  async function handleFinish() {
    setLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await updateProfile({
        name: form.name, email: form.email,
        gender: (form.gender || 'Male') as any, dob: form.dob,
        qualification: form.qualification, experience: form.experience,
        isSchoolTeacher: form.isSchoolTeacher, haveVehicle: form.haveVehicle,
        classGroups: form.classGroups, subjects: form.subjects, classes: form.classes,
        boards: form.boards, teachingModes: form.teachingModes as any,
        englishLevel: form.englishLevel, fee: form.fee,
        preferredDays: form.preferredDays, preferredTime: form.preferredTime,
        city: form.city, areas: form.areas, address: form.address, aboutMe: form.aboutMe,
      });
      completeProfile();
      router.replace('/(tabs)');
    } finally {
      setLoading(false);
    }
  }

  const topPad    = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;
  const cityAreas: string[] = form.city ? (CITY_AREAS[form.city] ?? []) : [];
  const availableClasses  = getClassesForGroups(form.classGroups);
  const availableSubjects = getSubjectsForGroups(form.classGroups);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        {step > 1 ? (
          <TouchableOpacity onPress={prevStep} style={[styles.backBtn, { backgroundColor: colors.secondary }]}>
            <Feather name="arrow-left" size={20} color={colors.text} />
          </TouchableOpacity>
        ) : <View style={{ width: 40 }} />}
        <View style={styles.stepInfo}>
          <Text style={[styles.stepLabel, { color: colors.mutedForeground }]}>Step {step} of {TOTAL_STEPS}</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {step === 1 ? 'Personal Details' : step === 2 ? 'Teaching Details' : 'Availability & Location'}
          </Text>
        </View>
        <TouchableOpacity onPress={step < TOTAL_STEPS ? nextStep : handleFinish}>
          <Text style={[styles.skipText, { color: colors.mutedForeground }]}>Skip</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
        <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${(step / TOTAL_STEPS) * 100}%` as any }]} />
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bottomOffset={100}
        style={styles.flex}
      >

          {step === 1 && (
            <>
              <Field label="Full Name" value={form.name} onChangeText={(v) => set('name', v)} placeholder="Your full name" colors={colors} />
              <Field label="Email Address" value={form.email} onChangeText={(v) => set('email', v)} placeholder="your@email.com" keyboardType="email-address" colors={colors} />
              <SelectField label="Gender" options={[...GENDERS]} selected={form.gender} onSelect={(v) => set('gender', v)} colors={colors} />
              {/* Issue 2 fix: calendar date picker */}
              <DatePickerField label="Date of Birth" value={form.dob} onChange={(v) => set('dob', v)} colors={colors} />
            </>
          )}

          {step === 2 && (
            <>
              <SelectField label="Qualification" options={QUALIFICATIONS} selected={form.qualification} onSelect={(v) => set('qualification', v)} colors={colors} />
              <SelectField label="Teaching Experience" options={EXPERIENCE_OPTIONS} selected={form.experience} onSelect={(v) => set('experience', v)} colors={colors} />
              <SelectField label="School Teacher Experience?" options={['Yes', 'No']} selected={form.isSchoolTeacher} onSelect={(v) => set('isSchoolTeacher', v)} colors={colors} />
              <SelectField label="Have Own Vehicle?" options={['Yes', 'No']} selected={form.haveVehicle} onSelect={(v) => set('haveVehicle', v)} colors={colors} />
              {/* Issue 4 fix: Boards moved ABOVE Class Group */}
              <MultiSelectField label="Boards" options={BOARDS} selected={form.boards} onToggle={(v) => toggleArr('boards', v)} colors={colors} />
              {/* Issue 3 fix: Class Group is single-select */}
              <SingleSelectChips label="Class Group" note="Select one group" options={[...CLASS_GROUPS]} selected={form.classGroups[0] ?? ''} onSelect={selectClassGroup} colors={colors} />
              {form.classGroups.length > 0 && (
                <>
                  <MultiSelectField label="Classes" options={availableClasses} selected={form.classes} onToggle={(v) => toggleArr('classes', v)} colors={colors} hint="Filtered by group" />
                  <MultiSelectField label="Subjects" options={availableSubjects} selected={form.subjects} onToggle={(v) => toggleArr('subjects', v)} colors={colors} hint="Filtered by group" />
                </>
              )}
              <MultiSelectField label="Teaching Mode" options={[...TEACHING_MODES]} selected={form.teachingModes} onToggle={(v) => toggleArr('teachingModes', v)} colors={colors} />
              <EnglishLevelField selected={form.englishLevel} onSelect={(v) => set('englishLevel', v)} colors={colors} />
              <SelectField label="Fee per Hour" options={FEE_OPTIONS} selected={form.fee} onSelect={(v) => set('fee', v)} colors={colors} hint="Competitive: ₹300–₹500 for Primary | Premium: ₹600+ for 10+ yrs or specialized subjects" />
            </>
          )}

          {step === 3 && (
            <>
              <MultiSelectField label="Preferred Days" options={DAYS} selected={form.preferredDays} onToggle={(v) => toggleArr('preferredDays', v)} colors={colors} />
              <TimeSlotField selected={form.preferredTime} onToggle={(v) => toggleArr('preferredTime', v)} colors={colors} />
              <SelectField label="Select City" options={CITIES} selected={form.city} onSelect={(v) => { set('city', v); set('areas', []); }} colors={colors} />
              {form.city && cityAreas.length > 0 && (
                <MultiSelectField label={`Areas in ${form.city}`} options={cityAreas} selected={form.areas} onToggle={(v) => toggleArr('areas', v)} colors={colors} />
              )}
              <Field label="Home Address / Locality" value={form.address} onChangeText={(v) => set('address', v)} placeholder="Your locality, city" colors={colors} />
              <LargeField label="About Me" value={form.aboutMe} onChangeText={(v) => set('aboutMe', v)} placeholder="Tell parents about your teaching style, experience, and achievements..." colors={colors} />
            </>
          )}

      </KeyboardAwareScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background, paddingBottom: bottomPad + 8 }]}>
        <TouchableOpacity activeOpacity={0.88} onPress={step < TOTAL_STEPS ? nextStep : handleFinish} disabled={loading} style={[styles.nextBtn, { backgroundColor: colors.primary }]}>
          {loading ? <ActivityIndicator color="#fff" /> : (
            <>
              <Text style={styles.nextBtnText}>{step < TOTAL_STEPS ? 'Continue' : 'Complete Setup'}</Text>
              {step < TOTAL_STEPS && <Feather name="arrow-right" size={18} color="#fff" />}
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Issue 3: Single-select Class Group ───────────────────────────────────────
function SingleSelectChips({ label, note, options, selected, onSelect, colors }: {
  label: string; note?: string; options: string[]; selected: string;
  onSelect: (v: string) => void; colors: any;
}) {
  return (
    <View style={styles.fieldWrap}>
      <View style={styles.labelRow}>
        <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
        {note && <Text style={[styles.hint, { color: colors.mutedForeground }]}>{note}</Text>}
      </View>
      <View style={styles.chips}>
        {options.map((o) => {
          const isSelected = selected === o;
          return (
            <TouchableOpacity
              key={o}
              onPress={() => onSelect(o)}
              style={[styles.chip, {
                backgroundColor: isSelected ? colors.primary : colors.secondary,
                borderColor:     isSelected ? colors.primary : colors.border,
                flexDirection: 'row', alignItems: 'center', gap: 5,
              }]}
            >
              <View style={[styles.radioOuter, { borderColor: isSelected ? '#fff' : colors.border }]}>
                {isSelected && <View style={[styles.radioInner, { backgroundColor: '#fff' }]} />}
              </View>
              <Text style={[styles.chipText, { color: isSelected ? '#fff' : colors.mutedForeground }]}>{o}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function EnglishLevelField({ selected, onSelect, colors }: { selected: string; onSelect: (v: string) => void; colors: any }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>English Communication</Text>
      <View style={{ gap: 8 }}>
        {(ENGLISH_LEVELS as readonly string[]).map((level) => (
          <TouchableOpacity key={level} onPress={() => onSelect(level)} style={[styles.levelCard, { borderColor: selected === level ? colors.primary : colors.border, backgroundColor: selected === level ? colors.primary + '15' : colors.card }]}>
            <View style={[styles.levelDot, { backgroundColor: selected === level ? colors.primary : colors.border }]} />
            <View style={styles.levelText}>
              <Text style={[styles.levelTitle, { color: selected === level ? colors.primary : colors.text }]}>{level}</Text>
              <Text style={[styles.levelDesc, { color: colors.mutedForeground }]}>{ENGLISH_LEVEL_DESC[level]}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function TimeSlotField({ selected, onToggle, colors }: { selected: string[]; onToggle: (v: string) => void; colors: any }) {
  return (
    <View style={styles.fieldWrap}>
      <View style={styles.labelRow}>
        <Text style={[styles.fieldLabel, { color: colors.text }]}>Preferred Time Slots</Text>
        {selected.length > 0 && <Text style={[styles.hint, { color: colors.primary }]}>{selected.length} selected</Text>}
      </View>
      {TIME_SLOT_GROUPS.map((group) => (
        <View key={group.label} style={styles.slotGroup}>
          <Text style={[styles.slotGroupLabel, { color: colors.mutedForeground }]}>{group.label}</Text>
          <View style={styles.timeGrid}>
            {group.slots.map((t) => {
              const on = selected.includes(t);
              return (
                <TouchableOpacity key={t} onPress={() => onToggle(t)} style={[styles.timeChip, { backgroundColor: on ? colors.primary : colors.secondary, borderColor: on ? colors.primary : colors.border }]}>
                  <Text style={[styles.timeChipText, { color: on ? '#fff' : colors.mutedForeground }]}>{t}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

interface Colors { text: string; mutedForeground: string; border: string; card: string; primary: string; secondary: string; [k: string]: any }

function Field({ label, value, onChangeText, placeholder, keyboardType, colors }: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboardType?: string; colors: Colors;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.mutedForeground} keyboardType={(keyboardType ?? 'default') as any} style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.text }]} autoCapitalize="none" />
    </View>
  );
}

function LargeField({ label, value, onChangeText, placeholder, colors }: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; colors: Colors;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.mutedForeground} multiline numberOfLines={4} style={[styles.input, styles.largeInput, { borderColor: colors.border, backgroundColor: colors.card, color: colors.text }]} textAlignVertical="top" />
    </View>
  );
}

function SelectField({ label, options, selected, onSelect, colors, hint }: {
  label: string; options: string[]; selected: string; onSelect: (v: string) => void;
  colors: Colors; hint?: string;
}) {
  return (
    <View style={styles.fieldWrap}>
      <View style={styles.labelRow}>
        <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
        {hint && <Text style={[styles.hint, { color: colors.mutedForeground }]} numberOfLines={2}>{hint}</Text>}
      </View>
      <View style={styles.chips}>
        {options.map((o) => (
          <TouchableOpacity key={o} onPress={() => onSelect(o)} style={[styles.chip, { backgroundColor: selected === o ? colors.primary : colors.secondary, borderColor: selected === o ? colors.primary : colors.border }]}>
            <Text style={[styles.chipText, { color: selected === o ? '#fff' : colors.mutedForeground }]}>{o}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function MultiSelectField({ label, options, selected, onToggle, colors, hint }: {
  label: string; options: string[]; selected: string[]; onToggle: (v: string) => void;
  colors: Colors; hint?: string;
}) {
  return (
    <View style={styles.fieldWrap}>
      <View style={styles.labelRow}>
        <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
        {hint && <Text style={[styles.hint, { color: colors.mutedForeground }]}>{hint}</Text>}
      </View>
      <View style={styles.chips}>
        {options.map((o) => (
          <TouchableOpacity key={o} onPress={() => onToggle(o)} style={[styles.chip, { backgroundColor: selected.includes(o) ? colors.primary : colors.secondary, borderColor: selected.includes(o) ? colors.primary : colors.border }]}>
            <Text style={[styles.chipText, { color: selected.includes(o) ? '#fff' : colors.mutedForeground }]}>{o}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stepInfo: { alignItems: 'center' },
  stepLabel: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  headerTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold', marginTop: 2 },
  skipText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  progressBar: { height: 3 },
  progressFill: { height: 3 },
  content: { padding: 20, gap: 16 },
  fieldWrap: { gap: 8 },
  labelRow: { gap: 3 },
  fieldLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  hint: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  input: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: 'Inter_400Regular' },
  largeInput: { height: 100, paddingTop: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  chipText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  radioOuter: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 6, height: 6, borderRadius: 3 },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  timeChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  timeChipText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  slotGroup: { gap: 6, marginTop: 4 },
  slotGroupLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  levelCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1.5 },
  levelDot: { width: 14, height: 14, borderRadius: 7 },
  levelText: { flex: 1, gap: 2 },
  levelTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  levelDesc: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
  nextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  nextBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
});
