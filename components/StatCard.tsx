import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: boolean;
  color?: string;
  style?: ViewStyle;
}

export function StatCard({ label, value, icon, accent, color, style }: StatCardProps) {
  const colors = useColors();
  const activeColor = color ?? colors.primary;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: accent ? activeColor : colors.card,
          borderColor: accent ? activeColor : colors.border,
          shadowColor: activeColor,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: accent ? 'rgba(255,255,255,0.22)' : activeColor + '18' },
        ]}
      >
        {icon}
      </View>
      <Text style={[styles.value, { color: accent ? '#fff' : colors.text }]}>{value}</Text>
      <Text style={[styles.label, { color: accent ? 'rgba(255,255,255,0.82)' : colors.mutedForeground }]}>
        {label}
      </Text>
      {!accent && (
        <View style={[styles.accent, { backgroundColor: activeColor }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
    alignItems: 'flex-start',
    gap: 5,
    overflow: 'hidden',
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  value: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
  },
  label: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    lineHeight: 16,
  },
  accent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    opacity: 0.7,
  },
});
