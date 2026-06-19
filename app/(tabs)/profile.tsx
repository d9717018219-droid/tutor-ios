import React, { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { getInitials, formatDate } from '@/utils/format';
import { PREMIUM_PLANS, API_BASE_URL } from '@/constants/config';
import { useReviews, replyToReview } from '@/hooks/useFirebaseChat';
import { FirestoreReview } from '@/types';

const PLAN_META: Record<string, { icon: string; label: string; color: string; bg: string; desc: string }> = {
  free:     { icon: '🆓', label: 'Free Member',    color: '#3F66A6', bg: '#EBF0FA', desc: '20 job requests • 5 accepted chats • 50% commission' },
  silver:   { icon: '🥈', label: 'Silver Member',  color: '#546E7A', bg: '#ECEFF1', desc: 'Unlimited job requests • 30 accepted chats • 50% commission' },
  gold:     { icon: '🥇', label: 'Gold Tutor',     color: '#B45309', bg: '#FFFBEB', desc: 'Unlimited job requests • 60 accepted chats • 45% commission' },
  platinum: { icon: '💎', label: 'Platinum Tutor', color: '#5B21B6', bg: '#F5F3FF', desc: 'Unlimited requests • Unlimited chats • 40% commission' },
};

interface MenuItem {
  icon: string;
  label: string;
  onPress: () => void;
  danger?: boolean;
  badge?: string;
}

const PRIVACY_ITEMS = [
  { e: '🔐', t: 'Verification & Safety', d: 'All tutors go through identity verification, background check & academic interview before placement. Your personal data stays private and is never shared with third parties.' },
  { e: '📱', t: 'Data We Collect', d: 'We collect your name, phone number, qualifications, and location to match you with relevant tuition opportunities in your area.' },
  { e: '🔒', t: 'Data Security', d: 'Your data is stored securely on encrypted servers. Phone numbers are never displayed directly — parents connect through DoAble\'s coordinator system.' },
  { e: '🚫', t: 'No Data Selling', d: 'DoAble India does not sell your personal information to advertisers or third parties. Your profile is only visible to verified parents on the platform.' },
];

const TERMS_ITEMS = [
  { e: '🆓', t: 'Zero Upfront Fees', d: 'Registration is free. DoAble takes a service fee only after you collect your 1st month\'s payment from the client.' },
  { e: '💰', t: 'Commission Structure', d: '50% of 1st month fee goes to DoAble. From the 2nd month onward, you keep 100% of your earnings.' },
  { e: '🚫', t: 'Financial Guidelines', d: 'Never ask clients for personal loans or financial advances. All 1st-month payments must go through the agency.' },
  { e: '📅', t: 'Scheduling & Leaves', d: 'Timings can be shifted via the student/parent WhatsApp group. Missed classes must be made up before the next billing cycle.' },
  { e: '⏰', t: 'Trial Week', d: 'Every placement has a risk-free trial week. Both tutor and student must be satisfied before continuing long-term.' },
  { e: '🔍', t: 'No Guaranteed Jobs', d: 'Jobs depend on parent searches. DoAble verifies you and gives chat access — but cannot guarantee tuition placements.' },
  { e: '❌', t: 'No Refund Policy', d: 'Subscription fees are non-refundable. Premium unlocks access features; it does not guarantee job allocation.' },
];

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const { profile } = useProfile();
  const { subscription } = useSubscription();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;
  const { reviews, avgRating } = useReviews(profile.phone);
  const [openModal, setOpenModal] = useState<'privacy' | 'terms' | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [replyingReview, setReplyingReview] = useState<FirestoreReview | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);

  const displayName = profile.name || 'Complete Profile';
  const isPremium = subscription.isPremium;

  function fmtDate(iso: string | null | undefined): string | null {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${d.getDate()} ${M[d.getMonth()]} ${d.getFullYear()}`;
  }

  const validTillRaw = profile.premiumExpiry ?? subscription.expiresAt ?? null;
  const validTill = fmtDate(validTillRaw);

  const menuGroups: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Account',
      items: [
        { icon: 'edit-2', label: 'Edit Profile', onPress: () => router.push('/edit-profile') },
        { icon: 'book-open', label: 'Manage Subjects', onPress: () => router.push('/manage-subjects') },
        { icon: 'map-pin', label: 'Preferred Locations', onPress: () => router.push('/preferred-locations') },
      ],
    },
    {
      title: 'Premium',
      items: [
        {
          icon: 'star',
          label: isPremium ? 'Premium Active' : 'Upgrade to Premium',
          onPress: () => router.push('/premium'),
          badge: isPremium ? (validTill ? `Till ${validTill}` : 'Active') : undefined,
        },
        { icon: 'shield', label: 'Verified Tutor', onPress: () => router.push('/verified'), badge: profile.verificationStatus === 'approved' ? 'Verified' : profile.verificationStatus === 'pending' ? 'Pending' : undefined },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: 'users', label: 'Join Community', onPress: () => router.push('/community') },
        {
          icon: 'help-circle',
          label: 'Help & Support',
          onPress: () => {
            Alert.alert(
              'Help & Support',
              'DoAble India Support\n📞 WhatsApp: +91 99719 69197\n📧 info@doableindia.com\n\n⏰ Available 9:00 AM – 6:00 PM',
              [
                { text: 'WhatsApp', onPress: () => Linking.openURL('https://wa.me/919971969197') },
                { text: 'Email', onPress: () => Linking.openURL('mailto:info@doableindia.com') },
                { text: 'Cancel', style: 'cancel' },
              ]
            );
          },
        },
        { icon: 'lock', label: 'Privacy Policy', onPress: () => setOpenModal('privacy') },
        { icon: 'file-text', label: 'Terms of Service', onPress: () => setOpenModal('terms') },
      ],
    },
    {
      title: 'Account',
      items: [
        {
          icon: 'log-out',
          label: 'Logout',
          danger: true,
          onPress: () => setShowLogoutModal(true),
        },
        {
          icon: 'trash-2',
          label: 'Delete My Profile',
          danger: true,
          onPress: () => setDeleteStep(1),
        },
      ],
    },
  ];

  return (
    <>
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: bottomPad + 80 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={() => router.push('/edit-profile')} style={[styles.avatarCircle, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{getInitials(displayName)}</Text>
            <View style={[styles.editOverlay, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
              <Feather name="camera" size={14} color="#fff" />
            </View>
          </TouchableOpacity>
          <View style={styles.nameSection}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: colors.text }]}>{displayName}</Text>
              {isPremium && <Feather name="star" size={16} color="#FFD700" />}
              {profile.isVerified && (
                <View style={[styles.verifiedBadge, { backgroundColor: colors.accent + '20' }]}>
                  <Feather name="shield" size={12} color={colors.accent} />
                  <Text style={[styles.verifiedText, { color: colors.accent }]}>Verified</Text>
                </View>
              )}
            </View>
            <Text style={[styles.phone, { color: colors.mutedForeground }]}>{profile.phone || 'Add phone'}</Text>
            {profile.qualification && (
              <Text style={[styles.qual, { color: colors.mutedForeground }]}>{profile.qualification}{profile.experience ? ` • ${profile.experience}` : ''}</Text>
            )}
          </View>
        </View>

        {profile.profileCompletionPercentage < 100 && (
          <TouchableOpacity onPress={() => router.push('/edit-profile')} style={[styles.completionCard, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}>
            <View style={styles.completionRow}>
              <Text style={[styles.completionLabel, { color: colors.primary }]}>Profile {profile.profileCompletionPercentage}% complete</Text>
              <Feather name="chevron-right" size={16} color={colors.primary} />
            </View>
            <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
              <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${profile.profileCompletionPercentage}%` as any }]} />
            </View>
          </TouchableOpacity>
        )}

        {profile.subjects.length > 0 && (
          <View style={styles.tagsRow}>
            {profile.subjects.slice(0, 4).map((s) => (
              <View key={s} style={[styles.tag, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.tagText, { color: colors.primary }]}>{s}</Text>
              </View>
            ))}
            {profile.subjects.length > 4 && (
              <Text style={[styles.moreTag, { color: colors.mutedForeground }]}>+{profile.subjects.length - 4} more</Text>
            )}
          </View>
        )}

        {isPremium && (() => {
          const planId = subscription.planId ?? '';
          const meta = PLAN_META[planId];
          if (!meta) return null;
          return (
            <TouchableOpacity
              onPress={() => router.push('/premium')}
              activeOpacity={0.85}
              style={[styles.memberBadge, { backgroundColor: meta.bg, borderColor: meta.color + '40' }]}
            >
              <Text style={styles.memberIcon}>{meta.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.memberLabel, { color: meta.color }]}>{meta.label}</Text>
                <Text style={[styles.memberDesc, { color: meta.color + 'BB' }]}>{meta.desc}</Text>
              </View>
              <Feather name="chevron-right" size={15} color={meta.color} />
            </TouchableOpacity>
          );
        })()}
      </View>

      <View style={styles.menuList}>
        {menuGroups.map((group, gi) => (
          <View key={gi} style={styles.menuGroup}>
            <Text style={[styles.groupTitle, { color: colors.mutedForeground }]}>{group.title}</Text>
            <View style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {group.items.map((item, ii) => (
                <TouchableOpacity
                  key={ii}
                  activeOpacity={0.8}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); item.onPress(); }}
                  style={[styles.menuItem, { borderBottomColor: colors.border }, ii === group.items.length - 1 && { borderBottomWidth: 0 }]}
                >
                  <View style={[styles.menuIcon, { backgroundColor: item.danger ? colors.destructive + '15' : colors.secondary }]}>
                    <Feather name={item.icon as any} size={17} color={item.danger ? colors.destructive : colors.primary} />
                  </View>
                  <Text style={[styles.menuLabel, { color: item.danger ? colors.destructive : colors.text }]}>{item.label}</Text>
                  {item.badge && (
                    <View style={[styles.menuBadge, { backgroundColor: item.badge === 'Active' ? colors.accent + '20' : colors.secondary }]}>
                      <Text style={[styles.menuBadgeText, { color: item.badge === 'Active' ? colors.accent : colors.mutedForeground }]}>{item.badge}</Text>
                    </View>
                  )}
                  {!item.badge && <Feather name="chevron-right" size={16} color={colors.mutedForeground} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </View>

      {/* ── My Ratings & Reviews ── */}
      <View style={styles.reviewsSection}>
        <View style={styles.reviewsHeader}>
          <Text style={[styles.reviewsTitle, { color: colors.text }]}>⭐ My Ratings & Reviews</Text>
          {reviews.length > 0 && (
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingBig}>{avgRating.toFixed(1)}</Text>
              <View>
                <Text style={styles.ratingStars}>
                  {[1,2,3,4,5].map(i => i <= Math.round(avgRating) ? '★' : '☆').join('')}
                </Text>
                <Text style={styles.ratingCount}>{reviews.length} review{reviews.length !== 1 ? 's' : ''}</Text>
              </View>
            </View>
          )}
        </View>

        {reviews.length === 0 ? (
          <View style={[styles.emptyReviews, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={styles.emptyEmoji}>🌟</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No reviews yet</Text>
            <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
              Parents can rate and review your tutoring once you complete sessions with them.
            </Text>
          </View>
        ) : (
          reviews.map((rev) => (
            <View key={rev.id} style={[styles.reviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Parent info + stars */}
              <View style={styles.reviewTop}>
                <View style={[styles.reviewAvatar, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.reviewAvatarText, { color: colors.primary }]}>
                    {rev.parentName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.reviewParent, { color: colors.text }]}>{rev.parentName}</Text>
                  <Text style={styles.reviewStars}>
                    {[1,2,3,4,5].map(i => i <= rev.rating ? '★' : '☆').join('')}
                  </Text>
                </View>
                <Text style={[styles.reviewDate, { color: colors.mutedForeground }]}>
                  {new Date(rev.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </Text>
              </View>

              {/* Review text */}
              {rev.reviewText ? (
                <Text style={[styles.reviewText, { color: colors.text }]}>"{rev.reviewText}"</Text>
              ) : null}

              {/* Tutor reply */}
              {rev.tutorReply ? (
                <View style={[styles.replyBubble, { backgroundColor: colors.primary + '10', borderLeftColor: colors.primary }]}>
                  <Text style={[styles.replyLabel, { color: colors.primary }]}>Your reply</Text>
                  <Text style={[styles.replyText, { color: colors.text }]}>{rev.tutorReply}</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.replyBtn, { borderColor: colors.border }]}
                  onPress={() => { setReplyingReview(rev); setReplyText(''); }}
                >
                  <Feather name="corner-down-right" size={13} color={colors.primary} />
                  <Text style={[styles.replyBtnTxt, { color: colors.primary }]}>Reply to this review</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </View>

      <Text style={[styles.version, { color: colors.mutedForeground }]}>DoAble India for Teachers v1.0.0</Text>
    </ScrollView>

    {/* ── Reply to Review Modal ── */}
    <Modal transparent animationType="slide" visible={!!replyingReview} onRequestClose={() => setReplyingReview(null)}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
          <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View style={styles.modalHeaderLeft}>
              <Feather name="corner-down-right" size={18} color="#3F66A6" />
              <Text style={[styles.modalTitle, { color: colors.text }]}>Reply to Review</Text>
            </View>
            <TouchableOpacity onPress={() => setReplyingReview(null)} style={styles.modalClose}>
              <Feather name="x" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {replyingReview && (
            <View style={{ padding: 20, gap: 16 }}>
              {/* Original review summary */}
              <View style={[styles.replyPreview, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Text style={styles.reviewStars}>
                  {[1,2,3,4,5].map(i => i <= replyingReview.rating ? '★' : '☆').join('')}
                  <Text style={[styles.reviewParent, { color: colors.mutedForeground }]}>  {replyingReview.parentName}</Text>
                </Text>
                {replyingReview.reviewText ? (
                  <Text style={[styles.replyPreviewText, { color: colors.mutedForeground }]} numberOfLines={2}>
                    "{replyingReview.reviewText}"
                  </Text>
                ) : null}
              </View>

              {/* Reply input */}
              <TextInput
                style={[styles.replyInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                placeholder="Write a professional reply to this review..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={4}
                value={replyText}
                onChangeText={setReplyText}
              />

              {replyLoading ? (
                <ActivityIndicator color="#3F66A6" />
              ) : (
                <TouchableOpacity
                  style={[styles.confirmDangerBtn, { backgroundColor: replyText.trim() ? '#3F66A6' : colors.border }]}
                  disabled={!replyText.trim()}
                  onPress={async () => {
                    if (!replyText.trim()) return;
                    setReplyLoading(true);
                    try {
                      await replyToReview(replyingReview.id, replyText);
                      setReplyingReview(null);
                    } catch {}
                    setReplyLoading(false);
                  }}
                >
                  <Text style={styles.confirmDangerTxt}>Post Reply</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>

    {/* ── Logout Confirm Modal ── */}
    <Modal transparent animationType="fade" visible={showLogoutModal} onRequestClose={() => setShowLogoutModal(false)}>
      <View style={styles.centerOverlay}>
        <View style={[styles.confirmBox, { backgroundColor: colors.card }]}>
          <Text style={styles.confirmIcon}>👋</Text>
          <Text style={[styles.confirmTitle, { color: colors.text }]}>Logout?</Text>
          <Text style={[styles.confirmBody, { color: colors.mutedForeground }]}>
            Are you sure you want to logout from DoAble India?
          </Text>
          <TouchableOpacity
            style={[styles.confirmDangerBtn, { backgroundColor: colors.destructive }]}
            onPress={() => { setShowLogoutModal(false); logout(); }}
          >
            <Text style={styles.confirmDangerTxt}>Logout</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowLogoutModal(false)} style={styles.confirmCancelBtn}>
            <Text style={[styles.confirmCancelTxt, { color: colors.mutedForeground }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>

    {/* ── Delete Profile — Step 1: Warning ── */}
    <Modal transparent animationType="fade" visible={deleteStep === 1} onRequestClose={() => setDeleteStep(0)}>
      <View style={styles.centerOverlay}>
        <View style={[styles.confirmBox, { backgroundColor: colors.card }]}>
          <Text style={styles.confirmIcon}>⚠️</Text>
          <Text style={[styles.confirmTitle, { color: colors.text }]}>Delete Profile?</Text>
          <Text style={[styles.confirmBody, { color: colors.mutedForeground }]}>
            This will remove your profile from DoAble India.{'\n\n'}
            <Text style={{ fontFamily: 'Inter_600SemiBold', color: '#B45309' }}>
              Your request history will be preserved.
            </Text>
            {' '}If you re-register with the same phone number, your sent request count will carry forward — so free limit cannot be exploited.
          </Text>
          <TouchableOpacity
            style={[styles.confirmDangerBtn, { backgroundColor: '#B91C1C' }]}
            onPress={() => setDeleteStep(2)}
          >
            <Text style={styles.confirmDangerTxt}>I understand, continue →</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setDeleteStep(0)} style={styles.confirmCancelBtn}>
            <Text style={[styles.confirmCancelTxt, { color: colors.mutedForeground }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>

    {/* ── Delete Profile — Step 2: Final Confirm ── */}
    <Modal transparent animationType="fade" visible={deleteStep === 2} onRequestClose={() => setDeleteStep(0)}>
      <View style={styles.centerOverlay}>
        <View style={[styles.confirmBox, { backgroundColor: colors.card }]}>
          <Text style={styles.confirmIcon}>🗑️</Text>
          <Text style={[styles.confirmTitle, { color: '#B91C1C' }]}>Permanently Delete?</Text>
          <Text style={[styles.confirmBody, { color: colors.mutedForeground }]}>
            Your profile for <Text style={{ fontFamily: 'Inter_700Bold', color: colors.text }}>{profile.phone}</Text> will be deleted. This cannot be undone.
          </Text>
          {deleteLoading ? (
            <ActivityIndicator color="#B91C1C" style={{ marginVertical: 16 }} />
          ) : (
            <>
              <TouchableOpacity
                style={[styles.confirmDangerBtn, { backgroundColor: '#B91C1C' }]}
                onPress={async () => {
                  setDeleteLoading(true);
                  try {
                    await fetch(`${API_BASE_URL}/teachers/${profile.phone}`, { method: 'DELETE' });
                  } catch { /* soft-fail — still logout */ }
                  setDeleteLoading(false);
                  setDeleteStep(0);
                  logout();
                }}
              >
                <Text style={styles.confirmDangerTxt}>Yes, Delete My Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setDeleteStep(1)} style={styles.confirmCancelBtn}>
                <Text style={[styles.confirmCancelTxt, { color: colors.mutedForeground }]}>← Go Back</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>

    {/* ── Privacy / Terms Modal ── */}
    <Modal
      visible={openModal !== null}
      animationType="slide"
      transparent
      onRequestClose={() => setOpenModal(null)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
          {/* Handle */}
          <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View style={styles.modalHeaderLeft}>
              <Feather
                name={openModal === 'privacy' ? 'lock' : 'file-text'}
                size={18}
                color="#3F66A6"
              />
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {openModal === 'privacy' ? '🔐 Privacy Policy' : '📋 Terms of Service'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setOpenModal(null)} style={styles.modalClose}>
              <Feather name="x" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* Subtitle */}
          <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>
            {openModal === 'privacy'
              ? 'How DoAble India handles your personal data'
              : 'Rules, fees & guidelines for using DoAble India'}
          </Text>

          {/* Items */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalList}>
            {(openModal === 'privacy' ? PRIVACY_ITEMS : TERMS_ITEMS).map((item, i) => (
              <View key={i} style={[styles.modalItem, { borderBottomColor: colors.border }]}>
                <Text style={styles.modalEmoji}>{item.e}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalItemTitle, { color: colors.text }]}>{item.t}</Text>
                  <Text style={[styles.modalItemBody, { color: colors.mutedForeground }]}>{item.d}</Text>
                </View>
              </View>
            ))}
            <Text style={[styles.modalFooter, { color: colors.mutedForeground }]}>
              Last updated: June 2025 · DoAble India Private Limited
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, gap: 14 },
  avatarSection: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 8 },
  avatarCircle: { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  avatarText: { color: '#fff', fontSize: 26, fontFamily: 'Inter_700Bold' },
  editOverlay: { position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  nameSection: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  verifiedText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  name: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  tutorId: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.5 },
  phone: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  qual: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  completionCard: { borderRadius: 12, padding: 12, borderWidth: 1, gap: 8 },
  completionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  completionLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  progressBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  tagText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  moreTag: { fontSize: 12, fontFamily: 'Inter_400Regular', alignSelf: 'center' },
  memberBadge: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1.5 },
  memberIcon: { fontSize: 24 },
  memberLabel: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  memberDesc: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2, lineHeight: 16 },
  menuList: { padding: 16, gap: 20 },
  menuGroup: { gap: 8 },
  groupTitle: { fontSize: 12, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.5 },
  groupCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: 1 },
  menuIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular' },
  menuBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  menuBadgeText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  version: { textAlign: 'center', fontSize: 12, fontFamily: 'Inter_400Regular', paddingBottom: 8 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '88%', paddingBottom: 32, width: '100%',
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: 'center', marginTop: 10, marginBottom: 6,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
  modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalTitle: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  modalClose: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  modalSubtitle: {
    fontSize: 12, fontFamily: 'Inter_400Regular',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4,
  },
  modalList: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 20, gap: 2 },
  modalItem: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    paddingVertical: 14, borderBottomWidth: 1,
  },
  modalEmoji: { fontSize: 20, width: 28 },
  modalItemTitle: { fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 4 },
  modalItemBody: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  modalFooter: {
    fontSize: 11, fontFamily: 'Inter_400Regular',
    textAlign: 'center', paddingTop: 20,
  },

  reviewsSection:   { paddingHorizontal: 16, paddingBottom: 8, gap: 12 },
  reviewsHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewsTitle:     { fontSize: 16, fontFamily: 'Inter_700Bold' },
  ratingBadge:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ratingBig:        { fontSize: 28, fontFamily: 'Inter_700Bold', color: '#F59E0B' },
  ratingStars:      { fontSize: 14, color: '#F59E0B', letterSpacing: 2 },
  ratingCount:      { fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9CA3AF' },
  emptyReviews:     { borderRadius: 16, borderWidth: 1, padding: 24, alignItems: 'center', gap: 8 },
  emptyEmoji:       { fontSize: 32 },
  emptyTitle:       { fontSize: 15, fontFamily: 'Inter_700Bold' },
  emptyBody:        { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 20, color: '#9CA3AF' },
  reviewCard:       { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
  reviewTop:        { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewAvatar:     { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  reviewAvatarText: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  reviewParent:     { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  reviewStars:      { fontSize: 15, color: '#F59E0B', letterSpacing: 1 },
  reviewDate:       { fontSize: 11, fontFamily: 'Inter_400Regular' },
  reviewText:       { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 20, fontStyle: 'italic' },
  replyBubble:      { borderLeftWidth: 3, paddingLeft: 10, paddingVertical: 6, borderRadius: 4, gap: 3 },
  replyLabel:       { fontSize: 11, fontFamily: 'Inter_700Bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  replyText:        { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  replyBtn:         { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, alignSelf: 'flex-start' },
  replyBtnTxt:      { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  replyPreview:     { borderRadius: 12, borderWidth: 1, padding: 12, gap: 4 },
  replyPreviewText: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  replyInput:       { borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 14, fontFamily: 'Inter_400Regular', minHeight: 100, textAlignVertical: 'top' },

  centerOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  confirmBox:       { borderRadius: 20, padding: 28, width: '100%', alignItems: 'center', gap: 8 },
  confirmIcon:      { fontSize: 36 },
  confirmTitle:     { fontSize: 18, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  confirmBody:      { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 20, paddingHorizontal: 4 },
  confirmDangerBtn: { marginTop: 8, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 24, width: '100%', alignItems: 'center' },
  confirmDangerTxt: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#fff' },
  confirmCancelBtn: { paddingVertical: 10 },
  confirmCancelTxt: { fontSize: 14, fontFamily: 'Inter_400Regular' },
});
