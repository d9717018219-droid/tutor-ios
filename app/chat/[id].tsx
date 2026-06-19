import React, { useState, useRef, useEffect } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Linking, Modal, Platform,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useProfile } from '@/contexts/ProfileContext';
import { useMessages, sendChatMessage, shareLocation, shareProfile, shareCoordinator, markMessagesRead, usePresence, closeConnection, blockConnection, sendReminder } from '@/hooks/useFirebaseChat';
import { useConnections } from '@/hooks/useFirebaseChat';
import { FirestoreMessage } from '@/types';
import { formatTime } from '@/utils/format';
import { containsPhoneNumber } from '@/utils/phoneFilter';

// ── date-separator helpers ────────────────────────────────────────────────────
type DateSep = { _type: 'date_sep'; label: string; key: string };
type ChatItem = FirestoreMessage | DateSep;

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function dateSepLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (isSameDay(d, now)) return 'Today';
  const yest = new Date(now); yest.setDate(yest.getDate() - 1);
  if (isSameDay(d, yest)) return 'Yesterday';
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', ...(!sameYear ? { year: 'numeric' } : {}) });
}

function buildChatItems(messages: FirestoreMessage[]): ChatItem[] {
  // messages are desc (newest first); FlatList is inverted (newest at bottom)
  // Insert a date separator AFTER the oldest message of each day group
  const result: ChatItem[] = [];
  for (let i = 0; i < messages.length; i++) {
    result.push(messages[i]);
    const curr = new Date(messages[i].timestamp);
    const next = messages[i + 1] ? new Date(messages[i + 1].timestamp) : null;
    if (!next || !isSameDay(curr, next)) {
      result.push({ _type: 'date_sep', label: dateSepLabel(messages[i].timestamp), key: `sep_${i}` });
    }
  }
  return result;
}

const CHAT_COLORS: [string, string][] = [
  ['#3F66A6', '#6B9BD1'],
  ['#0369A1', '#38BDF8'],
  ['#059669', '#34D399'],
  ['#D97706', '#FCD34D'],
];

const SENT_BUBBLE = '#FFFFFF';
const SENT_TEXT   = '#111827';
const SENT_MUTED  = 'rgba(17,24,39,0.45)';

function DoubleTick({ isRead }: { isRead: boolean }) {
  const color = isRead ? '#53BDEB' : 'rgba(17,24,39,0.40)';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Feather name="check" size={11} color={color} />
      <View style={{ marginLeft: -5 }}>
        <Feather name="check" size={11} color={color} />
      </View>
    </View>
  );
}

const COORDINATOR = '9711898248';

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useProfile();

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [reminding, setReminding] = useState(false);
  const [reminded, setReminded] = useState(false);
  const flatRef = useRef<FlatList>(null);

  const connectionId = id ?? '';
  const { messages, loading: msgLoading } = useMessages(connectionId);
  const { connections } = useConnections(profile.phone);
  const connection = connections.find((c) => c.id === connectionId);

  const otherId = connection?.parentId || undefined;
  const { lastSeenText } = usePresence(profile.phone, otherId);

  const chatItems = buildChatItems(messages);

  const topPad = Platform.OS === 'web' ? 56 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const avatarColors = CHAT_COLORS[0];

  useEffect(() => {
    if (connectionId) markMessagesRead(connectionId);
  }, [connectionId]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  async function handleSend() {
    const t = text.trim();
    if (!t || sending) return;

    if (containsPhoneNumber(t)) {
      Alert.alert(
        'Number Detected',
        'Phone numbers cannot be shared in chat. Please connect through the app only.',
        [{ text: 'OK' }],
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSending(true);
    setText('');
    try {
      await sendChatMessage(connectionId, profile.phone, t);
    } catch {
      setText(t);
    } finally {
      setSending(false);
    }
  }

  async function handleShareLocation() {
    setSharing(true);
    try {
      await shareLocation(connectionId, profile.phone);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert('Location Error', e?.message ?? 'Could not get location');
    } finally {
      setSharing(false);
    }
  }

  async function handleShareProfile() {
    setSharing(true);
    try {
      await shareProfile(connectionId, profile.phone, {
        name: profile.name,
        qualification: profile.qualification,
        experience: profile.experience,
        subjects: profile.subjects ?? [],
        city: profile.city,
        fee: profile.fee,
        phone: profile.phone,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
    } finally {
      setSharing(false);
    }
  }

  async function handleShareCoordinator() {
    await shareCoordinator(connectionId, profile.phone, profile.phone, profile.name);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  // ── Message renderer ─────────────────────────────────────────────────────────

  function renderMessageContent(item: FirestoreMessage) {
    const isMe = item.senderId === profile.phone;

    if (item.text.startsWith('[ACTION:SHARE_LOCATION|')) {
      const coords = item.text.replace('[ACTION:SHARE_LOCATION|', '').replace(']', '');
      const [lat, lng] = coords.split(',');
      return (
        <TouchableOpacity
          onPress={() => Linking.openURL(`https://maps.google.com/?q=${lat},${lng}`)}
          activeOpacity={0.85}
        >
          <View style={styles.actionCard}>
            <Feather name="map-pin" size={18} color={isMe ? '#3F66A6' : '#059669'} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionTitle, { color: isMe ? SENT_TEXT : colors.text }]}>
                📍 Location Shared
              </Text>
              <Text style={[styles.actionSub, { color: isMe ? SENT_MUTED : colors.mutedForeground }]}>
                Tap to open in Maps
              </Text>
            </View>
            <Feather name="external-link" size={14} color={isMe ? SENT_MUTED : colors.mutedForeground} />
          </View>
        </TouchableOpacity>
      );
    }

    if (item.text.startsWith('[ACTION:SHARE_PROFILE|')) {
      const jsonStr = item.text.replace('[ACTION:SHARE_PROFILE|', '').slice(0, -1);
      let p: { name?: string; qualification?: string; experience?: string; subjects?: string[]; city?: string; fee?: string } = {};
      try { p = JSON.parse(jsonStr); } catch {}
      return (
        <View style={styles.profileCard}>
          <View style={styles.profileCardHeader}>
            <Feather name="user" size={16} color={isMe ? '#3F66A6' : '#6D28D9'} />
            <Text style={[styles.actionTitle, { color: isMe ? SENT_TEXT : colors.text }]}>
              📋 {p.name || 'Tutor'}'s Profile
            </Text>
          </View>
          {!!p.qualification && (
            <Text style={[styles.profileRow, { color: isMe ? SENT_TEXT : colors.text }]}>
              🎓 {p.qualification}
            </Text>
          )}
          {!!p.experience && (
            <Text style={[styles.profileRow, { color: isMe ? SENT_TEXT : colors.text }]}>
              💼 {p.experience}
            </Text>
          )}
          {p.subjects && p.subjects.length > 0 && (
            <Text style={[styles.profileRow, { color: isMe ? SENT_TEXT : colors.text }]}>
              📚 {p.subjects.join(', ')}
            </Text>
          )}
          {!!p.city && (
            <Text style={[styles.profileRow, { color: isMe ? SENT_TEXT : colors.text }]}>
              📍 {p.city}
            </Text>
          )}
          {!!p.fee && (
            <Text style={[styles.profileRow, { color: isMe ? SENT_TEXT : colors.text }]}>
              💰 ₹{p.fee}/month
            </Text>
          )}
        </View>
      );
    }

    if (item.text === '[ACTION:SHARE_PROFILE]') {
      return (
        <View style={styles.actionCard}>
          <Feather name="user" size={18} color={isMe ? '#3F66A6' : '#6D28D9'} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.actionTitle, { color: isMe ? SENT_TEXT : colors.text }]}>
              📋 Profile Shared
            </Text>
          </View>
        </View>
      );
    }

    if (item.text.startsWith('[ACTION:SHARE_CONTACT')) {
      const parts = item.text.replace('[ACTION:SHARE_CONTACT|', '').replace(']', '').split('|');
      const tutorPhone = parts[0] ?? '';
      const tutorName = parts[1] ?? 'Tutor';
      return (
        <View style={styles.actionCard}>
          <Feather name="phone" size={18} color={isMe ? '#3F66A6' : '#059669'} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.actionTitle, { color: isMe ? SENT_TEXT : colors.text }]}>
              📞 Contact via Coordinator
            </Text>
            <Text style={[styles.actionSub, { color: isMe ? SENT_MUTED : colors.mutedForeground }]}>
              Tutor: {tutorName} ({tutorPhone})
            </Text>
            <Text style={[styles.actionSub, { color: isMe ? SENT_MUTED : colors.mutedForeground }]}>
              DoAble Coordinator: {COORDINATOR}
            </Text>
          </View>
          <TouchableOpacity onPress={() => Linking.openURL(`tel:${COORDINATOR}`)}>
            <Feather name="phone-call" size={16} color={isMe ? '#3F66A6' : '#059669'} />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <Text style={[styles.bubbleText, { color: isMe ? SENT_TEXT : colors.text }]}>
        {item.text}
      </Text>
    );
  }

  function renderMessage({ item }: { item: FirestoreMessage }) {
    const isMe = item.senderId === profile.phone;

    // ── System messages (close/block notifications) ──
    if (item.type === 'system' || item.senderId === 'SYSTEM') {
      return (
        <View style={styles.systemMsgRow}>
          <View style={styles.systemMsgBubble}>
            <Text style={styles.systemMsgText}>{item.text}</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
        {!isMe && (
          <LinearGradient colors={avatarColors} style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(connection?.parentName[0] ?? 'P').toUpperCase()}
            </Text>
          </LinearGradient>
        )}
        <View style={[
          styles.bubble,
          isMe
            ? { backgroundColor: SENT_BUBBLE, borderBottomRightRadius: 4, borderWidth: 1, borderColor: '#E5E7EB' }
            : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderBottomLeftRadius: 4 },
        ]}>
          {renderMessageContent(item)}
          <View style={styles.bubbleFooter}>
            <Text style={[styles.bubbleTime, { color: isMe ? SENT_MUTED : colors.mutedForeground }]}>
              {formatTime(item.timestamp)}
            </Text>
            {isMe && <DoubleTick isRead={item.isRead} />}
          </View>
        </View>
      </View>
    );
  }

  // ── Status banner ────────────────────────────────────────────────────────────

  function renderStatusBanner() {
    if (!connection || connection.status === 'accepted') return null;
    if (connection.status === 'rejected') {
      return (
        <View style={[styles.statusBanner, { backgroundColor: '#FFF1F2' }]}>
          <Feather name="x-circle" size={14} color="#DC2626" />
          <Text style={[styles.statusBannerText, { color: '#DC2626' }]}>
            Chat closed by Tutor. No further messages can be sent.
          </Text>
        </View>
      );
    }
    if (connection.status === 'blocked') {
      return (
        <View style={[styles.statusBanner, { backgroundColor: '#F5F3FF' }]}>
          <Feather name="slash" size={14} color="#7C3AED" />
          <Text style={[styles.statusBannerText, { color: '#5B21B6' }]}>
            This user has been blocked.
          </Text>
        </View>
      );
    }
    return (
      <View style={[styles.statusBanner, { backgroundColor: '#FFFBEB' }]}>
        <Feather name="clock" size={14} color="#D97706" />
        <Text style={[styles.statusBannerText, { color: '#92400E', flex: 1 }]}>
          Waiting for parent to accept your request.
        </Text>
        <TouchableOpacity
          disabled={reminding || reminded}
          style={[styles.remindBtn, reminded && { backgroundColor: '#D1FAE5' }]}
          onPress={async () => {
            setReminding(true);
            try {
              await sendReminder(connectionId);
              setReminded(true);
              Alert.alert('Reminder Sent', 'Parent will be notified to respond to your request.');
            } catch {
              Alert.alert('Error', 'Could not send reminder.');
            } finally {
              setReminding(false);
            }
          }}
        >
          <Feather name="bell" size={14} color={reminded ? '#059669' : '#D97706'} />
          <Text style={[styles.remindBtnText, { color: reminded ? '#059669' : '#92400E' }]}>
            {reminding ? '...' : reminded ? 'Sent' : 'Remind'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isAccepted = connection?.status === 'accepted';
  const parentName = connection?.parentName ?? 'Parent';
  const jobTitle = connection?.jobTitle ?? '';
  const rawCity = connection?.city || (parentName.includes('–') ? parentName.split('–').pop()?.trim() ?? '' : '');
  const city = /^\d+$/.test(rawCity) ? '' : rawCity;
  const leadId = connection?.jobId ? `#${connection.jobId}` : (connection?.orderId || '');

  return (
    <View style={[styles.root, { backgroundColor: '#F4F3FF' }]}>
      {/* Header */}
      <LinearGradient
        colors={['#1E1248', '#4C1D95', '#6D28D9']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topPad + 6 }]}
      >
        <View style={styles.blob} />
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <LinearGradient colors={avatarColors} style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>{parentName[0].toUpperCase()}</Text>
          </LinearGradient>
          <View style={styles.headerInfo}>
            {!!leadId && <Text style={styles.leadIdText}>{leadId}</Text>}
            {!!city && <Text style={styles.parentName}>{city}</Text>}
            {lastSeenText ? (
              <View style={styles.lastSeenRow}>
                {lastSeenText === 'online' && <View style={styles.onlineDot} />}
                <Text style={styles.lastSeenText}>{lastSeenText}</Text>
              </View>
            ) : (
              <Text style={styles.jobTitleText} numberOfLines={1}>{jobTitle}</Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.callBtn}
          onPress={() => setShowMenu(true)}
        >
          <Feather name="more-vertical" size={20} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* 3-dot dropdown menu */}
      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
          <View style={styles.menuSheet}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                setTimeout(() => {
                  Alert.alert('Close Chat', 'This will mark the chat as closed. Continue?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Close', style: 'destructive', onPress: async () => {
                      try {
                        await closeConnection(connectionId);
                      } catch (e: any) {
                        Alert.alert('Error', e?.message ?? 'Failed to close chat');
                      }
                    } },
                  ]);
                }, 300);
              }}
            >
              <Feather name="x-circle" size={16} color="#DC2626" />
              <Text style={[styles.menuItemText, { color: '#DC2626' }]}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                setTimeout(() => {
                  Alert.alert('Block Parent', "They won't be able to contact you. Continue?", [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Block', style: 'destructive', onPress: async () => {
                      try {
                        await blockConnection(connectionId);
                      } catch (e: any) {
                        Alert.alert('Error', e?.message ?? 'Failed to block');
                      }
                    } },
                  ]);
                }, 300);
              }}
            >
              <Feather name="slash" size={16} color="#7C3AED" />
              <Text style={[styles.menuItemText, { color: '#7C3AED' }]}>Block</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Status banner (pending / rejected) */}
      {renderStatusBanner()}

      {/* Messages */}
      <KeyboardAvoidingView behavior="padding" style={styles.flex} keyboardVerticalOffset={0}>
        {msgLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#6D28D9" />
          </View>
        ) : (
          <FlatList
            ref={flatRef}
            data={chatItems}
            keyExtractor={(item) => ('_type' in item ? item.key : item.id)}
            renderItem={({ item }) => {
              if ('_type' in item) {
                return (
                  <View style={styles.dateSepWrap}>
                    <View style={[styles.dateSepLine, { backgroundColor: 'rgba(255,255,255,0.15)' }]} />
                    <View style={styles.dateSepChip}>
                      <Text style={styles.dateSepText}>{item.label}</Text>
                    </View>
                    <View style={[styles.dateSepLine, { backgroundColor: 'rgba(255,255,255,0.15)' }]} />
                  </View>
                );
              }
              return renderMessage({ item });
            }}
            inverted
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <LinearGradient colors={avatarColors} style={styles.emptyChatAvatar}>
                  <Text style={styles.headerAvatarText}>{parentName[0].toUpperCase()}</Text>
                </LinearGradient>
                <Text style={[styles.emptyChatName, { color: colors.text }]}>{parentName}</Text>
                <Text style={[styles.emptyChatHint, { color: colors.mutedForeground }]}>
                  Start the conversation! Introduce yourself as a tutor.
                </Text>
              </View>
            }
          />
        )}

        {/* WhatsApp-style Attachment popup */}
        <Modal
          visible={showAttach}
          transparent
          animationType="fade"
          onRequestClose={() => setShowAttach(false)}
        >
          <TouchableOpacity
            style={styles.attachOverlay}
            activeOpacity={1}
            onPress={() => setShowAttach(false)}
          >
            <View style={[styles.attachSheet, { paddingBottom: bottomPad + 16 }]}>
              <View style={styles.attachGrid}>
                <TouchableOpacity
                  style={styles.attachItem}
                  disabled={sharing}
                  onPress={async () => { setShowAttach(false); await handleShareLocation(); }}
                >
                  <View style={[styles.attachIcon, { backgroundColor: '#3B82F6' }]}>
                    <Feather name="map-pin" size={24} color="#fff" />
                  </View>
                  <Text style={styles.attachLabel}>Location</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.attachItem}
                  disabled={sharing}
                  onPress={async () => { setShowAttach(false); await handleShareProfile(); }}
                >
                  <View style={[styles.attachIcon, { backgroundColor: '#8B5CF6' }]}>
                    <Feather name="user" size={24} color="#fff" />
                  </View>
                  <Text style={styles.attachLabel}>Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.attachItem}
                  disabled={sharing}
                  onPress={async () => { setShowAttach(false); await handleShareCoordinator(); }}
                >
                  <View style={[styles.attachIcon, { backgroundColor: '#059669' }]}>
                    <Feather name="phone" size={24} color="#fff" />
                  </View>
                  <Text style={styles.attachLabel}>Contact</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Input row — show for pending + accepted, hide only if rejected */}
        {connection?.status !== 'rejected' && connection?.status !== 'blocked' && (
          <View style={[styles.inputRow, { borderTopColor: colors.border, backgroundColor: '#F0F2F5', paddingBottom: bottomPad + 6 }]}>
            <View style={styles.inputWrap}>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder={isAccepted ? 'Type a message…' : 'Send a message while you wait…'}
                placeholderTextColor="#8696A0"
                style={[styles.input, { color: colors.text }]}
                multiline
                maxLength={500}
                returnKeyType="default"
                onSubmitEditing={handleSend}
              />
              <Feather name="smile" size={20} color="#8696A0" style={{ marginLeft: 6 }} />
              <TouchableOpacity
                onPress={() => setShowAttach(true)}
                style={{ marginLeft: 8 }}
              >
                <Feather name="paperclip" size={20} color="#8696A0" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={handleSend}
              disabled={!text.trim() || sending}
              activeOpacity={0.85}
              style={[styles.sendBtn, { backgroundColor: text.trim() && !sending ? '#3F66A6' : '#3F66A6' }]}
            >
              {sending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Feather name="send" size={18} color="#fff" />
              }
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingBottom: 16, overflow: 'hidden',
  },
  blob: {
    position: 'absolute', width: 150, height: 150, borderRadius: 75,
    backgroundColor: 'rgba(167,139,250,0.12)', top: -50, right: -20,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  headerAvatarText: { color: '#fff', fontSize: 18, fontFamily: 'Inter_700Bold' },
  headerInfo: { flex: 1, gap: 2 },
  parentName: { color: '#fff', fontSize: 16, fontFamily: 'Inter_700Bold' },
  leadIdText: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  jobTitleText: { color: 'rgba(196,181,253,0.85)', fontSize: 11, fontFamily: 'Inter_400Regular' },
  callBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  contactBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#F0FDF4', borderBottomWidth: 1, borderBottomColor: '#DCFCE7',
  },
  contactIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  contactText: { flex: 1, color: '#065F46', fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  callNowBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  callNowText: { color: '#fff', fontSize: 12, fontFamily: 'Inter_700Bold' },
  statusBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  statusBannerText: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 17 },
  remindBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FCD34D',
  },
  remindBtnText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 8 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 4 },
  msgRowMe: { justifyContent: 'flex-end' },
  avatar: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 14, fontFamily: 'Inter_700Bold' },
  bubble: { maxWidth: '80%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, gap: 4 },
  bubbleText: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 21 },
  bubbleFooter: { flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'flex-end' },
  bubbleTime: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  actionCard: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actionTitle: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  actionSub: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  profileCard: { gap: 5 },
  profileCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  profileRow: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  attachOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end',
  },
  attachSheet: {
    backgroundColor: '#1F2C34', borderTopLeftRadius: 18, borderTopRightRadius: 18,
    paddingTop: 20, paddingHorizontal: 20,
  },
  attachGrid: {
    flexDirection: 'row', gap: 20, paddingBottom: 12,
  },
  attachItem: {
    alignItems: 'center', gap: 8, flex: 1,
  },
  attachIcon: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
  },
  attachLabel: {
    color: '#fff', fontSize: 12, fontFamily: 'Inter_600SemiBold',
  },
  systemMsgRow: { alignItems: 'center', marginVertical: 8, paddingHorizontal: 20 },
  systemMsgBubble: {
    backgroundColor: 'rgba(0,0,0,0.07)', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 7, maxWidth: '85%',
  },
  systemMsgText: { fontSize: 12, fontFamily: 'Inter_400Regular', color: '#374151', textAlign: 'center' },
  menuOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.25)',
  },
  menuSheet: {
    position: 'absolute', top: 70, right: 12,
    backgroundColor: '#fff', borderRadius: 12,
    paddingVertical: 6, minWidth: 170,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 13,
  },
  menuItemText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  emptyChat: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyChatAvatar: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  emptyChatName: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  emptyChatHint: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 20, maxWidth: 260 },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 10, paddingTop: 8, borderTopWidth: 0,
  },
  inputWrap: {
    flex: 1, borderRadius: 24, borderWidth: 0,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14, paddingVertical: 6, minHeight: 46,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  input: { flex: 1, fontSize: 15, fontFamily: 'Inter_400Regular', maxHeight: 100, paddingTop: 2 },
  sendBtn: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },

  // last seen
  lastSeenRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ADE80' },
  lastSeenText: { color: 'rgba(196,181,253,0.9)', fontSize: 11, fontFamily: 'Inter_400Regular' },

  // date separator
  dateSepWrap: { flexDirection: 'row', alignItems: 'center', marginVertical: 10, paddingHorizontal: 8 },
  dateSepLine: { flex: 1, height: 1 },
  dateSepChip: {
    backgroundColor: 'rgba(63,102,166,0.35)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 4, marginHorizontal: 10,
  },
  dateSepText: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontFamily: 'Inter_600SemiBold' },
});
