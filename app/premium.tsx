import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Modal, Platform, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useProfile } from '@/contexts/ProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { PREMIUM_PLANS, PREMIUM_BENEFITS } from '@/constants/config';
import { formatCurrency } from '@/utils/format';
import {
  createPaymentOrder,
  validateCoupon,
  openRazorpayInApp,
  type PaymentOrderResult,
} from '@/services/paymentService';
import { api } from '@/services/apiClient';

type CouponStatus = 'idle' | 'checking' | 'valid' | 'invalid';

export default function PremiumScreen() {
  const colors   = useColors();
  const insets   = useSafeAreaInsets();
  const { profile } = useProfile();
  const { user }    = useAuth();
  const { subscription, restorePurchases, activatePlan } = useSubscription();

  const [selectedPlan, setSelectedPlan] = useState(PREMIUM_PLANS[1].id);

  const PLAN_META: Record<string, { color: string; icon: string; gradient: [string, string]; label: string; tagline: string }> = {
    free:     { color: '#3F66A6', icon: '🆓', gradient: ['#3F66A6', '#5B87C5'], label: 'Starter Tutor',  tagline: 'Try it risk-free · Just ₹1 for 30 days' },
    silver:   { color: '#78909C', icon: '🥈', gradient: ['#546E7A', '#90A4AE'], label: 'Silver Tutor',   tagline: 'Ideal for new tutors · More leads, less wait' },
    gold:     { color: '#F59E0B', icon: '🥇', gradient: ['#D97706', '#FBBF24'], label: 'Gold Tutor',     tagline: 'Where serious tutors grow · Best value pick' },
    platinum: { color: '#7C3AED', icon: '💎', gradient: ['#5B21B6', '#8B5CF6'], label: 'Platinum Tutor', tagline: 'Go all in · Maximum visibility · Zero limits' },
  };
  const [isLoading, setIsLoading]       = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);
  const popupRef = useRef<Window | null>(null);

  // Coupon state
  const [couponInput,  setCouponInput]  = useState('');
  const [couponStatus, setCouponStatus] = useState<CouponStatus>('idle');
  const [couponResult, setCouponResult] = useState<{
    discountPct: number; label: string; discountedAmt: number;
  } | null>(null);

  const topPad    = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  // Reset coupon when plan changes (discounted amount changes)
  useEffect(() => {
    if (couponResult) handleApplyCoupon(couponInput, selectedPlan);
  }, [selectedPlan]); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for postMessage from payment popup
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    function onMessage(e: MessageEvent) {
      const type = e.data?.type;
      if (type === 'ZOHO_PAYMENT_SUCCESS' || type === 'RAZORPAY_SUCCESS') {
        try { popupRef.current?.close(); } catch {}
        popupRef.current = null;
        onPaymentSuccess();
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Coupon handlers ──────────────────────────────────────────────────────
  async function handleApplyCoupon(code: string, plan: string) {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setCouponStatus('checking');
    const result = await validateCoupon(trimmed, plan);
    if (result) {
      setCouponResult(result);
      setCouponStatus('valid');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setCouponResult(null);
      setCouponStatus('invalid');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }

  function handleRemoveCoupon() {
    setCouponInput('');
    setCouponResult(null);
    setCouponStatus('idle');
  }

  // ── Payment helpers ──────────────────────────────────────────────────────
  async function onPaymentSuccess() {
    setIsLoading(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const plan = PREMIUM_PLANS.find((p) => p.id === selectedPlan)!;
    await activatePlan(selectedPlan, plan.months);
    setShowCongrats(true);
  }

  function openPopup(url: string) {
    const w = 480, h = 720;
    const left = Math.max(0, (window.screen.width  - w) / 2);
    const top  = Math.max(0, (window.screen.height - h) / 2);
    const popup = window.open(
      url, 'zoho_payment',
      `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`,
    );
    if (!popup) { window.open(url, '_blank'); setIsLoading(false); return; }
    popupRef.current = popup;
    const timer = setInterval(() => {
      if (popup.closed) { clearInterval(timer); popupRef.current = null; setIsLoading(false); }
    }, 600);
  }

  async function openInAppWeb(order: PaymentOrderResult, planLabel: string) {
    if (order.provider === 'razorpay' && order.orderId && order.keyId) {
      try {
        await openRazorpayInApp({
          orderId: order.orderId, amount: order.amount, keyId: order.keyId,
          description: planLabel, reference: order.reference,
          phone: profile.phone || user?.phone || '',
          name:  profile.name  || user?.name  || '',
          onSuccess: () => onPaymentSuccess(),
          onDismiss: () => setIsLoading(false),
        });
        return;
      } catch {}
    }
    openPopup(order.checkoutUrl);
  }

  async function handlePurchase() {
    const plan = PREMIUM_PLANS.find((p) => p.id === selectedPlan)!;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const phone = profile.phone || user?.phone || '';
    const tid   = profile.id   || phone        || 'guest';
    const name  = profile.name || user?.name   || '';

    setIsLoading(true);
    try {
      const order = await createPaymentOrder({
        plan:         plan.id,
        teacherId:    tid,
        teacherPhone: phone,
        teacherName:  name,
        couponCode:   couponStatus === 'valid' ? couponInput.trim().toUpperCase() : undefined,
      });

      if (!order) {
        setIsLoading(false);
        Alert.alert('Error', 'Could not create payment order. Please try again.');
        return;
      }

      // Free coupon (100% off) — server already activated premium
      if ((order as any).provider === 'free' || (order as any).activated === true) {
        onPaymentSuccess();
        return;
      }

      if (Platform.OS === 'web') {
        await openInAppWeb(order, plan.duration + ' Premium Plan');
      } else {
        const result = await WebBrowser.openBrowserAsync(order.checkoutUrl, { dismissButtonStyle: 'cancel' });
        setIsLoading(false);
        if (result.type !== 'cancel') onPaymentSuccess();
      }
    } catch {
      setIsLoading(false);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  }

  // ── Restore Purchases ────────────────────────────────────────────────────
  async function handleRestorePurchases() {
    const phone = (profile.phone || user?.phone || '').trim();
    if (!phone) {
      Alert.alert('Not Logged In', 'Please log in before restoring purchases.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await api.get<any>(`/teachers/${encodeURIComponent(phone)}`);
      if (res.success && res.data) {
        const data = res.data as any;
        const phpIsPremium = !!(data.is_premium || data.isPremium);
        const phpExpiry   = data.premium_expiry ?? data.premiumExpiry ?? null;
        const phpPlanId   = data.plan_id ?? data.planId ?? null;
        if (phpIsPremium && phpExpiry && new Date(phpExpiry) > new Date()) {
          const planId   = phpPlanId ?? 'silver';
          const plan     = PREMIUM_PLANS.find((p) => p.id === planId) ?? PREMIUM_PLANS[1];
          await activatePlan(planId, plan.months);
          Alert.alert('✅ Restored!', `Your ${plan.name} plan is now active.`);
          return;
        }
      }
      Alert.alert('No Active Plan', 'No active premium subscription found on your account.');
    } catch {
      Alert.alert('Error', 'Could not restore purchases. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  // ── Derived display values ────────────────────────────────────────────────
  const activePlan   = PREMIUM_PLANS.find((p) => p.id === selectedPlan)!;
  const displayPrice = couponResult ? couponResult.discountedAmt : activePlan.price;
  const isFree       = couponResult?.discountPct === 100;
  // Already on this exact plan and it's still active — no need to pay again
  const isCurrentPlan = subscription.isPremium
    && subscription.planId === selectedPlan
    && !!subscription.expiresAt
    && new Date(subscription.expiresAt) > new Date();

  // ── Congratulation modal data ─────────────────────────────────────────────
  const congratsPlan = PREMIUM_PLANS.find((p) => p.id === selectedPlan)!;
  const congratsMeta = PLAN_META[selectedPlan] ?? PLAN_META.silver;
  const congratsExpiry = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + congratsPlan.months);
    const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${d.getDate()} ${M[d.getMonth()]} ${d.getFullYear()}`;
  })();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>

      {/* ── Congratulation Modal ── */}
      <Modal visible={showCongrats} transparent animationType="fade">
        <View style={styles.congratsOverlay}>
          <View style={[styles.congratsCard, { backgroundColor: colors.card }]}>
            <Text style={styles.congratsEmoji}>🎉</Text>
            <Text style={[styles.congratsTitle, { color: colors.text }]}>Congratulations!</Text>
            <Text style={[styles.congratsSub, { color: colors.mutedForeground }]}>You are now a Premium Tutor</Text>

            <View style={[styles.congratsBadge, { backgroundColor: congratsMeta.gradient[0] }]}>
              <Text style={styles.congratsBadgeIcon}>{congratsMeta.icon}</Text>
              <Text style={styles.congratsBadgeLabel}>{congratsMeta.label}</Text>
            </View>

            <View style={[styles.congratsInfoRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Feather name="calendar" size={15} color={congratsMeta.color} />
              <Text style={[styles.congratsInfoText, { color: colors.text }]}>
                Valid till <Text style={{ fontFamily: 'Inter_700Bold', color: congratsMeta.color }}>{congratsExpiry}</Text>
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.congratsBtn, { backgroundColor: congratsMeta.gradient[0] }]}
              onPress={() => { setShowCongrats(false); router.replace('/(tabs)'); }}
            >
              <Feather name="home" size={18} color="#fff" />
              <Text style={styles.congratsBtnText}>Go to Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 4, backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={styles.heroContent}>
          <View style={styles.crownWrap}>
            <Feather name="star" size={22} color="#FFD700" />
          </View>
          <Text style={styles.heroTitle}>Go Premium</Text>
          <Text style={styles.heroSub}>More jobs · Better earnings · Grow your career</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 110 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Plans — 2×2 grid */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Choose a Plan</Text>
        <View style={styles.plansGrid}>
          {PREMIUM_PLANS.map((plan) => {
            const isSelected = selectedPlan === plan.id;
            const meta = PLAN_META[plan.id] ?? { color: colors.primary, icon: '⭐', gradient: [colors.primary, colors.primary] as [string,string] };
            return (
              <TouchableOpacity
                key={plan.id}
                activeOpacity={0.85}
                onPress={() => { setSelectedPlan(plan.id); Haptics.selectionAsync(); }}
                style={[
                  styles.planGridCard,
                  { borderColor: isSelected ? meta.color : colors.border, backgroundColor: isSelected ? meta.gradient[0] : colors.card },
                ]}
              >
                {plan.popular && !isSelected && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText}>⭐ Best</Text>
                  </View>
                )}
                {isSelected && (
                  <View style={styles.planGridCheck}>
                    <Feather name="check-circle" size={14} color="#fff" />
                  </View>
                )}
                <Text style={styles.planGridIcon}>{meta.icon}</Text>
                <Text style={[styles.planGridName, { color: isSelected ? '#fff' : colors.text }]}>{plan.name}</Text>
                <Text style={[styles.planGridPriceRow, { color: isSelected ? '#FFD700' : meta.color }]}>
                  {formatCurrency(plan.price)}<Text style={[styles.planGridPeriod, { color: isSelected ? 'rgba(255,255,255,0.55)' : colors.mutedForeground }]}>/mo</Text>
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected plan detail card */}
        {(() => {
          const plan = PREMIUM_PLANS.find((p) => p.id === selectedPlan)!;
          const meta = PLAN_META[plan.id] ?? { color: colors.primary, icon: '⭐', gradient: [colors.primary, colors.primary] as [string,string] };
          const savePercent = plan.originalPrice ? Math.round((1 - plan.price / plan.originalPrice) * 100) : 0;
          const displayAmt = couponResult ? couponResult.discountedAmt : plan.price;
          return (
            <View style={[styles.planDetailBig, { borderColor: meta.color + '50' }]}>
              {/* Header */}
              <View style={[styles.planDetailBigHeader, { backgroundColor: meta.gradient[0] }]}>
                <View style={styles.planDetailBigLeft}>
                  <Text style={styles.planDetailBigIcon}>{meta.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.planDetailBigName}>{plan.name} Plan</Text>
                    <Text style={styles.planDetailBigTagline}>{meta.tagline}</Text>
                    {plan.popular && (
                      <View style={[styles.bestValuePill, { backgroundColor: '#FFD700', marginTop: 6 }]}>
                        <Text style={styles.bestValueText}>⭐ Best Value</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.planDetailBigPriceCol}>
                  {couponResult ? (
                    <>
                      <Text style={styles.planDetailBigStrike}>{formatCurrency(plan.price)}</Text>
                      <Text style={[styles.planDetailBigPrice, { color: isFree ? '#4ADE80' : '#FFD700' }]}>
                        {isFree ? 'FREE' : formatCurrency(displayAmt)}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.planDetailBigPrice}>{formatCurrency(plan.price)}</Text>
                      {plan.originalPrice && (
                        <Text style={styles.planDetailBigStrike}>{formatCurrency(plan.originalPrice)}</Text>
                      )}
                    </>
                  )}
                  <Text style={styles.planDetailBigPeriod}>/ month</Text>
                  {savePercent > 0 && !couponResult && (
                    <View style={styles.planDetailSaveBadge}>
                      <Text style={styles.planDetailSaveText}>Save {savePercent}%</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Features — 3 only */}
              <View style={[styles.planDetailFeatures, { backgroundColor: colors.card }]}>
                {[
                  { icon: 'send',           text: `Job Requests: ${plan.requestLimit === 'unlimited' ? '♾ Unlimited' : `${plan.requestLimit} Jobs/Month`}` },
                  { icon: 'message-circle', text: `Chat Access: ${plan.chatLimit === 'unlimited' ? '♾ Unlimited' : `${plan.chatLimit} Chats`}` },
                  { icon: 'percent',        text: `DoAble Commission: ${plan.commission}% per tuition (1st fee)` },
                ].map((row, i) => (
                  <View
                    key={i}
                    style={[
                      styles.featureRow,
                      { borderBottomColor: colors.border },
                      i === 2 && { borderBottomWidth: 0 },
                    ]}
                  >
                    <View style={[styles.featureIconBox, { backgroundColor: meta.color + '18' }]}>
                      <Feather name={row.icon as any} size={14} color={meta.color} />
                    </View>
                    <Text style={[styles.featureText, { color: colors.text }]}>{row.text}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })()}


        {/* Coupon Input */}
        <View style={[styles.couponBox, { backgroundColor: colors.card, borderColor: couponStatus === 'valid' ? colors.accent : couponStatus === 'invalid' ? '#EF4444' : colors.border }]}>
          <Feather name="tag" size={16} color={couponStatus === 'valid' ? colors.accent : colors.mutedForeground} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.couponInput, { color: colors.text }]}
            placeholder="Enter coupon code"
            placeholderTextColor={colors.mutedForeground}
            value={couponInput}
            onChangeText={(t) => { setCouponInput(t); if (couponStatus !== 'idle') setCouponStatus('idle'); }}
            autoCapitalize="characters"
            returnKeyType="done"
            onSubmitEditing={() => handleApplyCoupon(couponInput, selectedPlan)}
            editable={couponStatus !== 'valid'}
          />
          {couponStatus === 'valid' ? (
            <TouchableOpacity onPress={handleRemoveCoupon} style={[styles.couponBtn, { backgroundColor: '#EF444420' }]}>
              <Text style={[styles.couponBtnText, { color: '#EF4444' }]}>Remove</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => handleApplyCoupon(couponInput, selectedPlan)}
              disabled={couponStatus === 'checking' || !couponInput.trim()}
              style={[styles.couponBtn, { backgroundColor: colors.primary + (couponInput.trim() ? 'ff' : '44') }]}
            >
              {couponStatus === 'checking'
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={[styles.couponBtnText, { color: '#fff' }]}>Apply</Text>}
            </TouchableOpacity>
          )}
        </View>

        {/* Coupon feedback */}
        {couponStatus === 'valid' && couponResult && (
          <View style={[styles.couponSuccess, { backgroundColor: colors.accent + '15', borderColor: colors.accent }]}>
            <Feather name="check-circle" size={15} color={colors.accent} />
            <Text style={[styles.couponSuccessText, { color: colors.accent }]}>
              {couponResult.label} applied!
              {!isFree && ` You save ₹${activePlan.price - couponResult.discountedAmt}`}
            </Text>
          </View>
        )}
        {couponStatus === 'invalid' && (
          <View style={[styles.couponError, { backgroundColor: '#EF444415', borderColor: '#EF4444' }]}>
            <Feather name="x-circle" size={15} color="#EF4444" />
            <Text style={[styles.couponErrorText, { color: '#EF4444' }]}>Invalid coupon code. Please try again.</Text>
          </View>
        )}

        {/* Payment info */}
        <View style={[styles.paymentRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Feather name="shield" size={14} color={colors.mutedForeground} />
          <Text style={[styles.paymentText, { color: colors.mutedForeground }]}>
            Secure payment · UPI · Cards · Net Banking · Zoho Payments
          </Text>
        </View>

        {subscription.isPremium && (
          <View style={[styles.activeCard, { backgroundColor: colors.accent + '15', borderColor: colors.accent }]}>
            <Feather name="check-circle" size={18} color={colors.accent} />
            <Text style={[styles.activeText, { color: colors.accent }]}>Premium is currently active!</Text>
          </View>
        )}

      </ScrollView>

      {/* Footer CTA */}
      <View style={[styles.footer, {
        borderTopColor: colors.border,
        backgroundColor: colors.background,
        paddingBottom: bottomPad + 8,
      }]}>
        {isCurrentPlan ? (
          /* Already on this plan — no payment needed */
          <View style={[styles.purchaseBtn, { backgroundColor: colors.accent + 'CC', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }]}>
            <Feather name="check-circle" size={18} color="#fff" />
            <Text style={styles.purchaseBtnText}>Current Plan Active ✓</Text>
          </View>
        ) : (
          /* Outer View absorbs the opacity flash — same bg as button so no white shows */
          <View style={[styles.purchaseBtnOuter, { backgroundColor: isFree ? colors.accent : colors.primary }]}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handlePurchase}
              disabled={isLoading}
              style={[styles.purchaseBtn, { backgroundColor: 'transparent' }]}
            >
              {isLoading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.purchaseBtnText}>{isFree ? 'Activating…' : 'Opening payment…'}</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.purchaseBtnText}>
                    {isFree
                      ? 'Activate for FREE'
                      : `Subscribe for ${formatCurrency(displayPrice)}`}
                  </Text>
                  <Feather name="arrow-right" size={18} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
        <TouchableOpacity onPress={handleRestorePurchases} style={styles.restoreBtn}>
          <Text style={[styles.restoreText, { color: colors.mutedForeground }]}>Restore Purchases</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:             { flex: 1 },
  header:           { paddingHorizontal: 20, paddingBottom: 14 },
  backBtn:          { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  heroContent:      { alignItems: 'center', gap: 4 },
  crownWrap:        { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  heroTitle:        { color: '#fff', fontSize: 20, fontFamily: 'Inter_700Bold' },
  heroSub:          { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  content:          { padding: 16, gap: 14 },
  sectionTitle:     { fontSize: 16, fontFamily: 'Inter_700Bold' },
  // Plan 2×2 grid
  plansGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  planGridCard:     { width: '47.5%', borderRadius: 18, borderWidth: 2, paddingVertical: 16, paddingHorizontal: 8, alignItems: 'center', gap: 3, position: 'relative', overflow: 'hidden' },
  planGridIcon:     { fontSize: 28, marginBottom: 2 },
  planGridName:     { fontFamily: 'Inter_700Bold', fontSize: 14 },
  planGridPriceRow: { fontFamily: 'Inter_700Bold', fontSize: 18, textAlign: 'center' },
  planGridPricePre: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  planGridPeriod:   { fontFamily: 'Inter_400Regular', fontSize: 11 },
  planGridCheck:    { position: 'absolute', top: 8, right: 8 },
  popularBadge:     { position: 'absolute', top: 6, left: 6, backgroundColor: '#FFD700', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5 },
  popularBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 8, color: '#7A5000' },

  // Big detail card below tabs
  planDetailBig:       { borderRadius: 20, borderWidth: 1.5, overflow: 'hidden' },
  planDetailBigHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, gap: 12 },
  planDetailBigLeft:   { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  planDetailBigIcon:   { fontSize: 36 },
  planDetailBigName:    { color: '#fff', fontSize: 18, fontFamily: 'Inter_700Bold' },
  planDetailBigTagline: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 3, lineHeight: 17 },
  bestValuePill:       { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 4 },
  bestValueText:       { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#7A5000' },
  planDetailBigPriceCol:{ alignItems: 'flex-end', gap: 2 },
  planDetailBigPrice:  { color: '#fff', fontSize: 30, fontFamily: 'Inter_700Bold', lineHeight: 36 },
  planDetailBigStrike: { color: 'rgba(255,255,255,0.55)', fontSize: 13, fontFamily: 'Inter_400Regular', textDecorationLine: 'line-through' },
  planDetailBigPeriod: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontFamily: 'Inter_400Regular' },
  planDetailSaveBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 2 },
  planDetailSaveText:  { color: '#fff', fontSize: 11, fontFamily: 'Inter_700Bold' },
  planDetailFeatures:  { padding: 16, gap: 0 },
  featureRow:          { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  featureIconBox:      { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  featureText:         { fontFamily: 'Inter_400Regular', fontSize: 13, flex: 1, lineHeight: 19 },

  // Legacy (kept for coupon/benefits sections)
  planDetailCard:   { borderRadius: 16, borderWidth: 1.5, padding: 16, gap: 10 },
  planDetailTitle:  { fontSize: 14, fontFamily: 'Inter_700Bold', marginBottom: 4 },
  planDetailRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  planDetailText:   { fontSize: 13, fontFamily: 'Inter_400Regular', flex: 1, lineHeight: 19 },
  couponBox:        { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 4 },
  couponInput:      { flex: 1, fontSize: 15, fontFamily: 'Inter_600SemiBold', paddingVertical: 10, letterSpacing: 1 },
  couponBtn:        { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, minWidth: 70, alignItems: 'center' },
  couponBtnText:    { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  couponSuccess:    { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  couponSuccessText:{ fontSize: 13, fontFamily: 'Inter_600SemiBold', flex: 1 },
  couponError:      { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  couponErrorText:  { fontSize: 13, fontFamily: 'Inter_600SemiBold', flex: 1 },
  benefitsCard:     { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  benefitItem:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  checkCircle:      { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  benefitText:      { fontSize: 14, fontFamily: 'Inter_400Regular', flex: 1 },
  paymentRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  paymentText:      { fontSize: 12, fontFamily: 'Inter_400Regular', flex: 1 },
  activeCard:       { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1.5 },
  activeText:       { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  termsCard:        { borderRadius: 16, borderWidth: 1, padding: 16, gap: 14 },
  termsTitle:       { fontSize: 15, fontFamily: 'Inter_700Bold', marginBottom: 4 },
  termsItem:        { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  termsEmoji:       { fontSize: 18, width: 26 },
  termsBold:        { fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 2 },
  termsBody:        { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  footer:           { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, borderTopWidth: 1, gap: 10 },
  purchaseBtnOuter: { borderRadius: 14, overflow: 'hidden' },
  purchaseBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14 },
  loadingRow:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  purchaseBtnText:  { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  restoreBtn:       { alignItems: 'center', paddingVertical: 4 },
  restoreText:      { fontSize: 13, fontFamily: 'Inter_400Regular' },

  // Congratulation modal
  congratsOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  congratsCard:      { width: '100%', borderRadius: 24, padding: 28, alignItems: 'center', gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 12 },
  congratsEmoji:     { fontSize: 56 },
  congratsTitle:     { fontSize: 26, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  congratsSub:       { fontSize: 15, fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: -6 },
  congratsBadge:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16, marginTop: 4 },
  congratsBadgeIcon: { fontSize: 26 },
  congratsBadgeLabel:{ color: '#fff', fontSize: 18, fontFamily: 'Inter_700Bold' },
  congratsInfoRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, width: '100%' },
  congratsInfoText:  { fontSize: 14, fontFamily: 'Inter_400Regular', flex: 1 },
  congratsBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 15, paddingHorizontal: 32, borderRadius: 14, width: '100%', marginTop: 4 },
  congratsBtnText:   { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
});
