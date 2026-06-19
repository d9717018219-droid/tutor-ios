import React, { useState, useRef } from 'react';
import {
  Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;

const SLIDES = [
  {
    id: '1',
    label: 'EXCELLENCE REDEFINED 🏆',
    title: 'Premium Tuition ⭐',
    desc: 'Get access to verified, high-paying tuition jobs near you.',
    cta: 'FIND JOBS →',
    badge: 'Top Paying\nJobs',
    colors: ['#4A20B5', '#7B2FFF', '#A020D0'] as const,
    icon: 'briefcase',
    route: '/(tabs)/jobs',
  },
  {
    id: '2',
    label: 'GROW YOUR CAREER 🚀',
    title: 'Get Verified ⭐',
    desc: 'Verified tutors get 5× more leads & priority listing in search.',
    cta: 'APPLY NOW →',
    badge: 'Priority\nListing',
    colors: ['#0D6B8A', '#1A9CB5', '#00BCD4'] as const,
    icon: 'shield',
    route: '/verified',
  },
  {
    id: '3',
    label: 'EARN MORE DAILY 💰',
    title: 'Go Premium ⭐',
    desc: 'Unlock parent contacts, unlimited chats & premium leads.',
    cta: 'UPGRADE →',
    badge: '₹99/mo\nOnly',
    colors: ['#8B1A1A', '#C0392B', '#E74C3C'] as const,
    icon: 'star',
    route: '/premium',
  },
];

export function HeroBanner() {
  const [active, setActive] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  function handleScroll(e: any) {
    const idx = Math.round(e.nativeEvent.contentOffset.x / CARD_WIDTH);
    setActive(idx);
  }

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + 12}
        contentContainerStyle={{ gap: 12, paddingRight: 12 }}
      >
        {SLIDES.map((slide) => (
          <LinearGradient
            key={slide.id}
            colors={slide.colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <View style={styles.decorCircle1} />
            <View style={styles.decorCircle2} />
            <View style={styles.left}>
              <Text style={styles.label}>{slide.label}</Text>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.desc}>{slide.desc}</Text>
              <TouchableOpacity onPress={() => router.push(slide.route as any)} style={styles.ctaBtn}>
                <Text style={styles.ctaText}>{slide.cta}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.right}>
              <View style={styles.badgeCard}>
                <Feather name={slide.icon as any} size={28} color="#FFD700" />
                <Text style={styles.badgeText}>{slide.badge}</Text>
              </View>
            </View>
          </LinearGradient>
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === active && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 10 },
  card: {
    width: CARD_WIDTH, borderRadius: 20, padding: 20,
    flexDirection: 'row', alignItems: 'center', minHeight: 160, overflow: 'hidden',
  },
  decorCircle1: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -60, right: -30,
  },
  decorCircle2: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.05)', bottom: -40, right: 40,
  },
  left: { flex: 1, gap: 6 },
  label: { color: '#FFD700', fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 0.8 },
  title: { color: '#fff', fontSize: 22, fontFamily: 'Inter_700Bold', lineHeight: 28 },
  desc: { color: 'rgba(255,255,255,0.82)', fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  ctaBtn: {
    alignSelf: 'flex-start', backgroundColor: '#FF4FA8',
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, marginTop: 4,
  },
  ctaText: { color: '#fff', fontSize: 12, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  right: { width: 80, alignItems: 'center' },
  badgeCard: {
    backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 16, padding: 12,
    alignItems: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  badgeText: { color: '#fff', fontSize: 10, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(124,58,237,0.25)' },
  dotActive: { width: 18, backgroundColor: '#7C3AED' },
});
