import React, { useState } from 'react';
import {
  ActivityIndicator, Platform,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import DatePickerField from '@/components/DatePickerField';
import { useColors } from '@/hooks/useColors';
import { useProfile } from '@/contexts/ProfileContext';
import {
  QUALIFICATIONS, EXPERIENCE_OPTIONS, CITIES, CITY_AREAS, BOARDS, LANGUAGES,
  CLASS_GROUPS, getClassesForGroups, getSubjectsForGroups,
  DAYS, TIME_SLOT_GROUPS, ENGLISH_LEVELS, ENGLISH_LEVEL_DESC, FEE_OPTIONS,
  TEACHING_MODES,
} from '@/constants/config';

const GENDERS = ['Male', 'Female', 'Other'] as const;
const TOTAL_STEPS = 4;

const STEP_CONFIG = [
  { num: 1, label: 'Personal',  title: 'Personal Info',      desc: 'Basic details about you' },
  { num: 2, label: 'Teaching',  title: 'Teaching Details',   desc: 'Qualifications & subjects' },
  { num: 3, label: 'Avail.',    title: 'Availability',       desc: 'When can parents reach you?' },
  { num: 4, label: 'Location',  title: 'Location & About',   desc: 'Where you teach & about you' },
];

export default function EditProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile } = useProfile();
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const [form, setForm] = useState({
    name: profile.name, email: profile.email,
    gender: profile.gender, dob: profile.dob,
    qualification: profile.qualification, experience: profile.experience,
    isSchoolTeacher: profile.isSchoolTeacher, haveVehicle: profile.haveVehicle,
    classGroups: [...(profile.classGroups ?? [])],
    subjects: [...profile.subjects], classes: [...profile.classes],
    boards: [...profile.boards], teachingModes: [...profile.teachingModes],
    englishLevel: profile.englishLevel ?? '',
    fee: profile.fee ?? '',
    preferredDays: [...(profile.preferredDays ?? [])],
    preferredTime: [...(profile.preferredTime ?? [])],
    city: profile.city, areas: [...(profile.areas ?? [])],
    languages: [...profile.languages], address: profile.address, aboutMe: profile.aboutMe,
  });

  function setF(key: keyof typeof form, val: any) {
    setForm((p) => ({ ...p, [key]: val }));
  }

  type ArrKey = 'subjects' | 'classes' | 'boards' | 'teachingModes' | 'areas' | 'languages' | 'preferredDays' | 'preferredTime';
  function toggleArr(key: ArrKey, val: string) {
    const cur = form[key] as string[];
    setF(key, cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val]);
  }

  function toggleClassGroup(group: string) {
    const next = form.classGroups.includes(group)
      ? form.classGroups.filter((x) => x !== group)
      : [...form.classGroups, group];
    const validClasses = getClassesForGroups(next);
    const validSubjects = getSubjectsForGroups(next);
    setForm((p) => ({
      ...p, classGroups: next,
      classes: p.classes.filter((c) => validClasses.includes(c)),
      subjects: p.subjects.filter((s) => validSubjects.includes(s)),
    }));
  }

  function goNext() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }
  function goBack() {
    if (step > 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setStep((s) => s - 1);
    } else {
      router.back();
    }
  }

  async function handleSave() {
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await updateProfile({
        name: form.name, email: form.email, gender: form.gender as any, dob: form.dob,
        qualification: form.qualification, experience: form.experience,
        isSchoolTeacher: form.isSchoolTeacher, haveVehicle: form.haveVehicle,
        classGroups: form.classGroups, subjects: form.subjects, classes: form.classes,
        boards: form.boards, teachingModes: form.teachingModes as any,
        englishLevel: form.englishLevel, fee: form.fee,
        preferredDays: form.preferredDays, preferredTime: form.preferredTime,
        city: form.city, areas: form.areas,
        languages: form.languages, address: form.address, aboutMe: form.aboutMe,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } finally {
      setSaving(false);
    }
  }

  const cityAreas: string[] = form.city ? (CITY_AREAS[form.city] ?? []) : [];
  const availableClasses = getClassesForGroups(form.classGroups);
  const availableSubjects = getSubjectsForGroups(form.classGroups);
  const isLastStep = step === TOTAL_STEPS;
  const current = STEP_CONFIG[step - 1];

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>

      {/* ── Header ── */}
      <View style={[s.header, { paddingTop: topPad + 8, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={goBack} style={[s.backBtn, { backgroundColor: colors.secondary }]}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={[s.headerTitle, { color: colors.text }]}>Edit Profile</Text>
          <Text style={[s.headerSub, { color: colors.mutedForeground }]}>{current.label} · {step}/{TOTAL_STEPS}</Text>
        </View>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[s.closeText, { color: colors.mutedForeground }]}>Close</Text>
        </TouchableOpacity>
      </View>

      {/* ── Step indicator ── */}
      <View style={[s.stepsRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {STEP_CONFIG.map((cfg, i) => {
          const done = step > cfg.num;
          const active = step === cfg.num;
          return (
            <React.Fragment key={cfg.num}>
              <TouchableOpacity onPress={() => setStep(cfg.num)} style={s.stepCol} activeOpacity={0.7}>
                <View style={[s.stepCircle, {
                  backgroundColor: active ? colors.primary : done ? colors.primary : colors.border,
                  width: active ? 30 : 22, height: active ? 30 : 22, borderRadius: active ? 10 : 11,
                }]}>
                  {done
                    ? <Feather name="check" size={12} color="#fff" />
                    : <Text style={[s.stepNum, { fontSize: active ? 13 : 11 }]}>{cfg.num}</Text>}
                </View>
                <Text style={[s.stepLabel, { color: active ? colors.primary : done ? colors.primary : colors.mutedForeground, fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>
                  {cfg.label}
                </Text>
              </TouchableOpacity>
              {i < STEP_CONFIG.length - 1 && (
                <View style={[s.stepConnector, { backgroundColor: step > cfg.num ? colors.primary : colors.border }]} />
              )}
            </React.Fragment>
          );
        })}
      </View>

      {/* ── Content ── */}
      <KeyboardAwareScrollView
        contentContainerStyle={[s.content, { paddingBottom: bottomPad + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bottomOffset={100}
        style={s.flex}
      >
          {/* Step heading */}
          <View style={s.stepHeading}>
            <Text style={[s.stepHeadTitle, { color: colors.text }]}>{current.title}</Text>
            <Text style={[s.stepHeadDesc, { color: colors.mutedForeground }]}>{current.desc}</Text>
          </View>

          {step === 1 && (
            <>
              <FField label="Full Name" value={form.name} onChangeText={(v) => setF('name', v)} placeholder="Your full name" colors={colors} />
              <FField label="Email Address" value={form.email} onChangeText={(v) => setF('email', v)} placeholder="your@email.com" keyboardType="email-address" colors={colors} />
              <FSelect label="Gender" options={[...GENDERS]} selected={form.gender} onSelect={(v) => setF('gender', v)} colors={colors} />
              <DatePickerField label="Date of Birth" value={form.dob} onChange={(v) => setF('dob', v)} colors={colors} />
            </>
          )}

          {step === 2 && (
            <>
              <FSelect label="Qualification" options={QUALIFICATIONS} selected={form.qualification} onSelect={(v) => setF('qualification', v)} colors={colors} />
              <FSelect label="Teaching Experience" options={EXPERIENCE_OPTIONS} selected={form.experience} onSelect={(v) => setF('experience', v)} colors={colors} />
              <FSelect label="School Teacher Experience?" options={['Yes', 'No']} selected={form.isSchoolTeacher} onSelect={(v) => setF('isSchoolTeacher', v)} colors={colors} />
              <FSelect label="Have Own Vehicle?" options={['Yes', 'No']} selected={form.haveVehicle} onSelect={(v) => setF('haveVehicle', v)} colors={colors} />
              <FMulti label="Class Group" options={[...CLASS_GROUPS]} selected={form.classGroups} onToggle={toggleClassGroup} colors={colors} />
              {form.classGroups.length > 0 && (
                <>
                  <FMulti label="Classes" options={availableClasses} selected={form.classes} onToggle={(v) => toggleArr('classes', v)} colors={colors} hint="Filtered by group" />
                  <FMulti label="Subjects" options={availableSubjects} selected={form.subjects} onToggle={(v) => toggleArr('subjects', v)} colors={colors} hint="Filtered by group" />
                </>
              )}
              <FMulti label="Boards" options={BOARDS} selected={form.boards} onToggle={(v) => toggleArr('boards', v)} colors={colors} />
              <FMulti label="Teaching Modes" options={[...TEACHING_MODES]} selected={form.teachingModes} onToggle={(v) => toggleArr('teachingModes', v)} colors={colors} />
              <FEnglish selected={form.englishLevel} onSelect={(v) => setF('englishLevel', v)} colors={colors} />
              <FSelect label="Fee per Hour" options={FEE_OPTIONS} selected={form.fee} onSelect={(v) => setF('fee', v)} colors={colors} hint="₹300–₹500 for Primary · ₹600+ for 10+ yrs or specialised" />
            </>
          )}

          {step === 3 && (
            <>
              <FMulti label="Preferred Days" options={DAYS} selected={form.preferredDays} onToggle={(v) => toggleArr('preferredDays', v)} colors={colors} />
              <FTimeSlots selected={form.preferredTime} onToggle={(v) => toggleArr('preferredTime', v)} colors={colors} />
            </>
          )}

          {step === 4 && (
            <>
              <FSelect label="Select City" options={CITIES} selected={form.city} onSelect={(v) => { setF('city', v); setF('areas', []); }} colors={colors} />
              {form.city && cityAreas.length > 0 && (
                <FMulti label={`Areas in ${form.city}`} options={cityAreas} selected={form.areas} onToggle={(v) => toggleArr('areas', v)} colors={colors} />
              )}
              <FMulti label="Languages Known" options={LANGUAGES} selected={form.languages} onToggle={(v) => toggleArr('languages', v)} colors={colors} />
              <FField label="Home Address" value={form.address} onChangeText={(v) => setF('address', v)} placeholder="Your locality, city" colors={colors} />
              <FLarge label="About Me" value={form.aboutMe} onChangeText={(v) => setF('aboutMe', v)} placeholder="Tell parents about your teaching style, experience, and achievements..." colors={colors} />
            </>
          )}

      </KeyboardAwareScrollView>

      {/* ── Footer ── */}
      <View style={[s.footer, { borderTopColor: colors.border, backgroundColor: colors.background, paddingBottom: bottomPad + 8 }]}>
        <TouchableOpacity activeOpacity={0.88} onPress={isLastStep ? handleSave : goNext} disabled={saving} style={[s.mainBtn, { backgroundColor: colors.primary }]}>
          {saving
            ? <ActivityIndicator color="#fff" />
            : <>
                <Text style={s.mainBtnText}>{isLastStep ? 'Save Profile' : 'Save & Continue'}</Text>
                <Feather name={isLastStep ? 'check' : 'arrow-right'} size={18} color="#fff" />
              </>
          }
        </TouchableOpacity>
      </View>

    </View>
  );
}

/* ─── Sub-components (no hooks) ─── */

function FField({ label, value, onChangeText, placeholder, keyboardType, colors }: any) {
  return (
    <View style={f.wrap}>
      <Text style={[f.label, { color: colors.text }]}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.mutedForeground} keyboardType={keyboardType ?? 'default'} style={[f.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.text }]} autoCapitalize="none" />
    </View>
  );
}

function FLarge({ label, value, onChangeText, placeholder, colors }: any) {
  return (
    <View style={f.wrap}>
      <Text style={[f.label, { color: colors.text }]}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.mutedForeground} multiline numberOfLines={5} style={[f.input, f.large, { borderColor: colors.border, backgroundColor: colors.card, color: colors.text }]} textAlignVertical="top" />
    </View>
  );
}

function FSelect({ label, options, selected, onSelect, colors, hint }: any) {
  return (
    <View style={f.wrap}>
      <View style={f.labelCol}>
        <Text style={[f.label, { color: colors.text }]}>{label}</Text>
        {hint ? <Text style={[f.hint, { color: colors.mutedForeground }]}>{hint}</Text> : null}
      </View>
      <View style={f.chips}>
        {options.map((o: string) => {
          const on = selected === o;
          return (
            <TouchableOpacity key={o} onPress={() => onSelect(o)} style={[f.chip, { backgroundColor: on ? colors.primary : colors.secondary, borderColor: on ? colors.primary : colors.border }]}>
              <Text style={[f.chipTxt, { color: on ? '#fff' : colors.mutedForeground }]}>{o}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function FMulti({ label, options, selected, onToggle, colors, hint }: any) {
  return (
    <View style={f.wrap}>
      <View style={f.labelRow}>
        <Text style={[f.label, { color: colors.text }]}>{label}</Text>
        {hint ? <Text style={[f.hint, { color: colors.mutedForeground }]}>{hint}</Text> : null}
      </View>
      <View style={f.chips}>
        {options.map((o: string) => {
          const on = selected.includes(o);
          return (
            <TouchableOpacity key={o} onPress={() => onToggle(o)} style={[f.chip, { backgroundColor: on ? colors.primary : colors.secondary, borderColor: on ? colors.primary : colors.border }]}>
              <Text style={[f.chipTxt, { color: on ? '#fff' : colors.mutedForeground }]}>{o}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function FEnglish({ selected, onSelect, colors }: { selected: string; onSelect: (v: string) => void; colors: any }) {
  return (
    <View style={f.wrap}>
      <Text style={[f.label, { color: colors.text }]}>English Communication</Text>
      <View style={{ gap: 8 }}>
        {(ENGLISH_LEVELS as readonly string[]).map((level) => {
          const on = selected === level;
          return (
            <TouchableOpacity key={level} onPress={() => onSelect(level)} style={[f.levelCard, { borderColor: on ? colors.primary : colors.border, backgroundColor: on ? colors.primary + '15' : colors.card }]}>
              <View style={[f.levelDot, { backgroundColor: on ? colors.primary : colors.border }]} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[f.levelTitle, { color: on ? colors.primary : colors.text }]}>{level}</Text>
                <Text style={[f.levelDesc, { color: colors.mutedForeground }]}>{ENGLISH_LEVEL_DESC[level]}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function FTimeSlots({ selected, onToggle, colors }: { selected: string[]; onToggle: (v: string) => void; colors: any }) {
  return (
    <View style={f.wrap}>
      <View style={f.labelRow}>
        <Text style={[f.label, { color: colors.text }]}>Preferred Time Slots</Text>
        {selected.length > 0 ? <Text style={[f.hint, { color: colors.primary }]}>{selected.length} selected</Text> : null}
      </View>
      {TIME_SLOT_GROUPS.map((group) => (
        <View key={group.label} style={f.slotGroup}>
          <Text style={[f.slotGroupLabel, { color: colors.mutedForeground }]}>{group.label}</Text>
          <View style={f.timeGrid}>
            {group.slots.map((t) => {
              const on = selected.includes(t);
              return (
                <TouchableOpacity key={t} onPress={() => onToggle(t)} style={[f.timeChip, { backgroundColor: on ? colors.primary : colors.secondary, borderColor: on ? colors.primary : colors.border }]}>
                  <Text style={[f.timeChipTxt, { color: on ? '#fff' : colors.mutedForeground }]}>{t}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

/* ─── Styles ─── */

const s = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { alignItems: 'center', gap: 2 },
  headerTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  headerSub: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  closeText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  stepsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  stepCol: { alignItems: 'center', gap: 4, flex: 1 },
  stepCircle: { alignItems: 'center', justifyContent: 'center' },
  stepNum: { color: '#fff', fontFamily: 'Inter_700Bold' },
  stepLabel: { fontSize: 10, textAlign: 'center' },
  stepConnector: { height: 2, flex: 0.5, marginBottom: 16 },
  content: { padding: 20, gap: 18 },
  stepHeading: { gap: 4, marginBottom: 4 },
  stepHeadTitle: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  stepHeadDesc: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
  mainBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  mainBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
});

const f = StyleSheet.create({
  wrap: { gap: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  labelCol: { gap: 2 },
  label: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  hint: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  input: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: 'Inter_400Regular' },
  large: { height: 120, paddingTop: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  chipTxt: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  timeChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  timeChipTxt: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  slotGroup: { gap: 6, marginTop: 4 },
  slotGroupLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  levelCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1.5 },
  levelDot: { width: 14, height: 14, borderRadius: 7 },
  levelTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  levelDesc: { fontSize: 12, fontFamily: 'Inter_400Regular' },
});