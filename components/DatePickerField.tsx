import React, { useState } from 'react';
import {
  FlatList, Modal, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

interface Colors {
  text: string; mutedForeground: string; border: string;
  card: string; primary: string; background: string; [k: string]: any;
}

interface Props {
  label?: string;
  value: string;          // "DD/MM/YYYY" or ""
  onChange: (v: string) => void;
  colors: Colors;
  style?: object;
}

const DAYS   = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const MONTHS = [
  { num: '01', name: 'January' }, { num: '02', name: 'February' }, { num: '03', name: 'March' },
  { num: '04', name: 'April' },   { num: '05', name: 'May' },      { num: '06', name: 'June' },
  { num: '07', name: 'July' },    { num: '08', name: 'August' },   { num: '09', name: 'September' },
  { num: '10', name: 'October' }, { num: '11', name: 'November' }, { num: '12', name: 'December' },
];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1949 }, (_, i) => String(currentYear - i));

function parseValue(v: string) {
  const parts = v.split('/');
  if (parts.length === 3) return { day: parts[0], month: parts[1], year: parts[2] };
  return { day: '', month: '', year: '' };
}

function buildValue(day: string, month: string, year: string): string {
  return `${day}/${month}/${year}`;
}

function formatDisplay(v: string): string {
  const { day, month, year } = parseValue(v);
  if (!day || !month || !year) return '';
  const m = MONTHS.find((x) => x.num === month);
  return `${day} ${m?.name ?? ''} ${year}`;
}

type PickerType = 'day' | 'month' | 'year' | null;

export default function DatePickerField({ label, value, onChange, colors, style }: Props) {
  const [open, setOpen] = useState<PickerType>(null);
  const { day, month, year } = parseValue(value);
  const display = formatDisplay(value);

  const items: string[] =
    open === 'day' ? DAYS :
    open === 'month' ? MONTHS.map((m) => m.num) :
    open === 'year' ? YEARS : [];

  const renderLabel = (item: string) =>
    open === 'month' ? (MONTHS.find((m) => m.num === item)?.name ?? item) : item;

  const isSelected = (item: string) =>
    open === 'day' ? item === day : open === 'month' ? item === month : item === year;

  function handleSelect(item: string) {
    if (open === 'day')   onChange(buildValue(item, month, year));
    if (open === 'month') onChange(buildValue(day, item, year));
    if (open === 'year')  onChange(buildValue(day, month, item));
    setOpen(null);
  }

  return (
    <View style={[st.wrap, style]}>
      {label ? <Text style={[st.label, { color: colors.text }]}>{label}</Text> : null}

      <View style={st.row}>
        <TouchableOpacity
          onPress={() => setOpen('day')}
          style={[st.cell, { borderColor: open === 'day' ? colors.primary : colors.border, backgroundColor: colors.card }]}
        >
          <Text style={[st.cellValue, { color: day ? colors.text : colors.mutedForeground }]}>{day || 'DD'}</Text>
          <Feather name="chevron-down" size={13} color={colors.mutedForeground} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setOpen('month')}
          style={[st.cell, st.cellWide, { borderColor: open === 'month' ? colors.primary : colors.border, backgroundColor: colors.card }]}
        >
          <Text style={[st.cellValue, { color: month ? colors.text : colors.mutedForeground }]}>
            {month ? (MONTHS.find((m) => m.num === month)?.name ?? 'Month') : 'Month'}
          </Text>
          <Feather name="chevron-down" size={13} color={colors.mutedForeground} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setOpen('year')}
          style={[st.cell, { borderColor: open === 'year' ? colors.primary : colors.border, backgroundColor: colors.card }]}
        >
          <Text style={[st.cellValue, { color: year ? colors.text : colors.mutedForeground }]}>{year || 'YYYY'}</Text>
          <Feather name="chevron-down" size={13} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {display ? <Text style={[st.preview, { color: colors.mutedForeground }]}>📅 {display}</Text> : null}

      <Modal visible={open !== null} transparent animationType="fade" onRequestClose={() => setOpen(null)}>
        <TouchableOpacity style={st.backdrop} activeOpacity={1} onPress={() => setOpen(null)}>
          <View style={[st.sheet, { backgroundColor: colors.card }]}>
            <View style={[st.sheetHeader, { borderBottomColor: colors.border }]}>
              <Text style={[st.sheetTitle, { color: colors.text }]}>
                {open === 'day' ? 'Select Day' : open === 'month' ? 'Select Month' : 'Select Year'}
              </Text>
              <TouchableOpacity onPress={() => setOpen(null)}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={items}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
              getItemLayout={(_, index) => ({ length: 50, offset: 50 * index, index })}
              renderItem={({ item }) => {
                const sel = isSelected(item);
                return (
                  <TouchableOpacity
                    onPress={() => handleSelect(item)}
                    style={[st.option, sel && { backgroundColor: colors.primary + '15' }]}
                  >
                    <Text style={[st.optionText, { color: sel ? colors.primary : colors.text }]}>
                      {renderLabel(item)}
                    </Text>
                    {sel && <Feather name="check" size={16} color={colors.primary} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  row: { flexDirection: 'row', gap: 8 },
  cell: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 12,
  },
  cellWide: { flex: 1.8 },
  cellValue: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  preview: { fontSize: 12, fontFamily: 'Inter_400Regular', paddingLeft: 2 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '65%', overflow: 'hidden' },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
  },
  sheetTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  option: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  optionText: { fontSize: 15, fontFamily: 'Inter_400Regular' },
});
