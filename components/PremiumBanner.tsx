import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';

interface PremiumBannerProps {
  onPress: () => void;
  compact?: boolean;
}

export function PremiumBanner({ onPress, compact }: PremiumBannerProps) {
  const colors = useColors();

  function handlePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }

  if (compact) {
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePress}
        style={[styles.compact, { backgroundColor: colors.primary }]}
      >
        <Feather name="star" size={14} color="#FFBB00" />
        <Text style={styles.compactText}>Upgrade to Premium — view contact details</Text>
        <Feather name="chevron-right" size={14} color="rgba(255,255,255,0.8)" />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={handlePress} style={[styles.banner, { shadowColor: colors.shadow }]}>
      <View style={[styles.bg, { backgroundColor: colors.primary }]}>
        <View style={styles.decor1} />
        <View style={styles.decor2} />
        <View style={styles.decor3} />
        <View style={styles.left}>
          <View style={styles.crownWrap}>
            <Feather name="star" size={24} color="#FFBB00" />
          </View>
          <View style={styles.textWrap}>
            <Text style={styles.title}>Go Premium</Text>
            <Text style={styles.subtitle}>5× leads · chat freely · view contacts</Text>
          </View>
        </View>
        <View style={styles.cta}>
          <Text style={styles.ctaPrice}>₹99</Text>
          <Text style={styles.ctaUnit}>/mo</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 18, overflow: 'hidden', marginBottom: 4,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6,
  },
  bg: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, gap: 12, overflow: 'hidden' },
  decor1: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,87,87,0.18)', top: -40, right: 60 },
  decor2: { position: 'absolute', width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,187,0,0.20)', bottom: -20, right: -10 },
  decor3: { position: 'absolute', width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(0,201,167,0.15)', top: -10, left: 80 },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  crownWrap: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  textWrap: { flex: 1 },
  title: { fontSize: 17, fontFamily: 'Inter_700Bold', color: '#fff' },
  subtitle: { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.82)', marginTop: 2 },
  cta: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  ctaPrice: { color: '#FFBB00', fontSize: 18, fontFamily: 'Inter_700Bold' },
  ctaUnit: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontFamily: 'Inter_400Regular' },
  compact: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  compactText: { color: '#fff', fontSize: 12, fontFamily: 'Inter_600SemiBold', flex: 1 },
});
