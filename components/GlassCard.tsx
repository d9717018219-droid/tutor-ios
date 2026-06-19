import React, { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface GlassCardProps {
  children: ReactNode;
  style?: ViewStyle;
  padding?: number;
  borderRadius?: number;
}

export function GlassCard({ children, style, padding = 16, borderRadius = 16 }: GlassCardProps) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.glass,
          borderRadius,
          padding,
          borderColor: colors.glassBorder,
          shadowColor: colors.shadow,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 4,
  },
});
