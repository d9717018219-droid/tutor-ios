import { useState, useEffect, useRef } from 'react';
import {
  collection, doc, addDoc, updateDoc, setDoc, onSnapshot,
  query, where, orderBy, serverTimestamp, getDocs, Timestamp,
} from 'firebase/firestore';
import * as Location from 'expo-location';
import { db } from '@/services/firebase';
import { TuitionJob, FirestoreConnection, FirestoreMessage, FirestoreReview } from '@/types';
import { playNotificationSound } from '@/utils/sound';

// ── helpers ───────────────────────────────────────────────────────────────────

function tsToISO(ts: unknown): string {
  if (!ts) return new Date().toISOString();
  if (ts instanceof Timestamp) return ts.toDate().toISOString();
  if (typeof ts === 'string') return ts;
  return new Date().toISOString();
}

function jobTitle(job: TuitionJob): string {
  return `${job.studentClass} – ${job.subjects.slice(0, 2).join(', ')}`;
}

// ── useProfileViews ───────────────────────────────────────────────────────────
// Real-time listener: alerts of type 'profile_view' targeting this tutor.
// On new view (after initial load) → fires a local push notification.

export function useProfileViews(tutorPhone: string): { count: number } {
  const [count, setCount] = useState(0);
  const isFirstRef = useRef(true);

  useEffect(() => {
    if (!tutorPhone) return;

    const q = query(
      collection(db, 'alerts'),
      where('type',     '==', 'profile_view'),
      where('targetId', '==', tutorPhone),
    );

    const unsub = onSnapshot(q, async (snap) => {
      setCount(snap.size);

      if (isFirstRef.current) {
        isFirstRef.current = false;
        return;
      }

      for (const change of snap.docChanges()) {
        if (change.type === 'added') {
          const data = change.doc.data();
          try {
            const Notif = await import('expo-notifications');
            await Notif.scheduleNotificationAsync({
              content: {
                title: '👁️ Profile Viewed!',
                body: data.viewerName
                  ? `${data.viewerName} just viewed your profile`
                  : 'Someone just viewed your profile',
                sound: true,
              },
              trigger: null,
            });
          } catch {}
        }
      }
    }, () => {});

    return unsub;
  }, [tutorPhone]);

  return { count };
}

// ── useConnections ────────────────────────────────────────────────────────────
// Real-time listener: all connections where this tutor has sent interest

export function useConnections(tutorPhone: string): {
  connections: FirestoreConnection[];
  loading: boolean;
} {
  const [connections, setConnections] = useState<FirestoreConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const isFirstRef = useRef(true);
  const prevStatusRef = useRef<Record<string, string>>({});

  useEffect(() => {
    if (!tutorPhone) { setLoading(false); return; }

    const q = query(
      collection(db, 'connections'),
      where('tutorId', '==', tutorPhone),
    );

    const unsub = onSnapshot(q, async (snap) => {
      const list: FirestoreConnection[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          tutorId: data.tutorId ?? '',
          tutorName: data.tutorName ?? '',
          parentId: data.parentId ?? '',
          parentName: data.parentName ?? 'Parent',
          parentPhone: data.parentPhone ?? undefined,
          jobId: data.jobId ?? '',
          jobTitle: data.jobTitle ?? '',
          orderId: data.orderId ?? '',
          city: data.city ?? '',
          status: data.status ?? 'pending',
          members: data.members ?? [],
          createdAt: tsToISO(data.createdAt),
          lastMessage: data.lastMessage ?? 'Application sent',
          lastMessageTime: tsToISO(data.lastMessageTime),
          unreadCount: data.unreadCount ?? 0,
        };
      });

      // ── Sound + notification when parent accepts ──────────────────────────
      if (!isFirstRef.current) {
        for (const change of snap.docChanges()) {
          if (change.type === 'modified') {
            const newStatus = change.doc.data().status ?? '';
            const oldStatus = prevStatusRef.current[change.doc.id] ?? '';
            if (oldStatus === 'pending' && newStatus === 'accepted') {
              const parentName = change.doc.data().parentName ?? 'Parent';
              // Play sound
              playNotificationSound();
              // Local push notification
              try {
                const Notif = await import('expo-notifications');
                await Notif.scheduleNotificationAsync({
                  content: {
                    title: '🎉 Request Accepted!',
                    body: `${parentName} accepted your request. Start chatting!`,
                    sound: true,
                  },
                  trigger: null,
                });
              } catch {}
            }
          }
        }
      }
      isFirstRef.current = false;

      // Update prev status map
      snap.docs.forEach((d) => {
        prevStatusRef.current[d.id] = d.data().status ?? '';
      });

      list.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
      setConnections(list);
      setLoading(false);
    }, () => setLoading(false));

    return unsub;
  }, [tutorPhone]);

  return { connections, loading };
}

// ── useMessages ───────────────────────────────────────────────────────────────
// Real-time listener: messages inside a single connection

export function useMessages(connectionId: string): {
  messages: FirestoreMessage[];
  loading: boolean;
} {
  const [messages, setMessages] = useState<FirestoreMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!connectionId) { setLoading(false); return; }

    // Single-field orderBy on a subcollection — no composite index needed.
    const q = query(
      collection(db, 'connections', connectionId, 'messages'),
      orderBy('createdAt', 'desc'),
    );

    const unsub = onSnapshot(q, (snap) => {
      const list: FirestoreMessage[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          senderId: data.senderId ?? '',
          text: data.text ?? '',
          timestamp: tsToISO(data.createdAt),
          isRead: data.read ?? false,
          type: data.type ?? 'chat',
        };
      });
      setMessages(list);
      setLoading(false);
    }, () => setLoading(false));

    return unsub;
  }, [connectionId]);

  return { messages, loading };
}

// ── sendInterest ──────────────────────────────────────────────────────────────
// Called when tutor taps "Show Interest" on a job

export async function sendInterest(
  job: TuitionJob,
  tutor: { phone: string; name: string },
): Promise<{ connectionId: string; alreadyApplied: boolean }> {
  // Check for existing connection for this job + tutor
  const existing = await getDocs(
    query(
      collection(db, 'connections'),
      where('tutorId', '==', tutor.phone),
      where('jobId', '==', job.id),
    ),
  );
  if (!existing.empty) {
    return { connectionId: existing.docs[0].id, alreadyApplied: true };
  }

  const title = jobTitle(job);
  const parentId = job.orderId || job.id;
  const parentDisplayName = `Parent – ${job.city}`;

  // Create connection document
  const connRef = await addDoc(collection(db, 'connections'), {
    tutorId: tutor.phone,
    tutorName: tutor.name || 'Tutor',
    parentId,
    parentName: parentDisplayName,
    jobId: job.id,
    jobTitle: title,
    orderId: job.orderId || '',
    city: job.city || '',
    status: 'pending',
    members: [tutor.phone, parentId],
    createdAt: serverTimestamp(),
    lastMessage: `Hi, I'm interested in your job: ${title}`,
    lastMessageTime: serverTimestamp(),
    unreadCount: 0,
  });

  // First message in the chat
  await addDoc(collection(db, 'connections', connRef.id, 'messages'), {
    senderId: tutor.phone,
    text: `Hi! I am ${tutor.name || 'a tutor'} and I am interested in your job posting for ${title} in ${job.city}.`,
    createdAt: serverTimestamp(),
    read: false,
  });

  // Alert for parent app / Cloud Functions to trigger FCM notification
  await addDoc(collection(db, 'alerts'), {
    type: 'interest',
    targetUserType: 'parent',
    targetId: parentId,
    tutorName: tutor.name || 'Tutor',
    jobTitle: title,
    connectionId: connRef.id,
    message: `💬 New Job Application from ${tutor.name || 'a Tutor'}!`,
    timestamp: serverTimestamp(),
    read: false,
  });

  return { connectionId: connRef.id, alreadyApplied: false };
}

// ── sendChatMessage ───────────────────────────────────────────────────────────

export async function sendChatMessage(
  connectionId: string,
  senderId: string,
  text: string,
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;

  await addDoc(collection(db, 'connections', connectionId, 'messages'), {
    senderId,
    text: trimmed,
    createdAt: serverTimestamp(),
    read: false,
  });

  await updateDoc(doc(db, 'connections', connectionId), {
    lastMessage: trimmed.length > 60 ? trimmed.slice(0, 57) + '…' : trimmed,
    lastMessageTime: serverTimestamp(),
    status: 'accepted',
  });
}

// ── shareLocation ─────────────────────────────────────────────────────────────

export async function shareLocation(
  connectionId: string,
  senderId: string,
): Promise<void> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') throw new Error('Location permission denied');

  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  const lat = pos.coords.latitude.toFixed(6);
  const lng = pos.coords.longitude.toFixed(6);
  const actionText = `[ACTION:SHARE_LOCATION|${lat},${lng}]`;

  await addDoc(collection(db, 'connections', connectionId, 'messages'), {
    senderId,
    text: actionText,
    createdAt: serverTimestamp(),
    read: false,
  });

  await updateDoc(doc(db, 'connections', connectionId), {
    lastMessage: '📍 Location shared',
    lastMessageTime: serverTimestamp(),
    status: 'accepted',
  });
}

// ── shareProfile ──────────────────────────────────────────────────────────────

export interface TutorProfileSnapshot {
  name: string;
  qualification: string;
  experience: string;
  subjects: string[];
  city: string;
  fee: string;
  phone: string;
}

export async function shareProfile(
  connectionId: string,
  senderId: string,
  profile: TutorProfileSnapshot,
): Promise<void> {
  const payload = JSON.stringify({
    name: profile.name || 'Tutor',
    qualification: profile.qualification || '',
    experience: profile.experience || '',
    subjects: (profile.subjects ?? []).slice(0, 4),
    city: profile.city || '',
    fee: profile.fee || '',
    phone: profile.phone || '',
  });

  await addDoc(collection(db, 'connections', connectionId, 'messages'), {
    senderId,
    text: `[ACTION:SHARE_PROFILE|${payload}]`,
    createdAt: serverTimestamp(),
    read: false,
  });

  await updateDoc(doc(db, 'connections', connectionId), {
    lastMessage: `📋 ${profile.name || 'Tutor'}'s profile shared`,
    lastMessageTime: serverTimestamp(),
    status: 'accepted',
  });
}

// ── shareCoordinator ──────────────────────────────────────────────────────────

export async function shareCoordinator(
  connectionId: string,
  senderId: string,
  tutorPhone: string,
  tutorName: string,
): Promise<void> {
  const text = `[ACTION:SHARE_CONTACT|${tutorPhone}|${tutorName}]`;

  await addDoc(collection(db, 'connections', connectionId, 'messages'), {
    senderId,
    text,
    createdAt: serverTimestamp(),
    read: false,
  });

  await updateDoc(doc(db, 'connections', connectionId), {
    lastMessage: '📞 Contact info shared',
    lastMessageTime: serverTimestamp(),
    status: 'accepted',
  });
}

// ── markMessagesRead ──────────────────────────────────────────────────────────

export async function markMessagesRead(connectionId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'connections', connectionId), { unreadCount: 0 });
  } catch {}
}

// ── acceptRequest ─────────────────────────────────────────────────────────────
// Accept a parent-initiated connection request

export async function acceptRequest(connectionId: string): Promise<void> {
  await updateDoc(doc(db, 'connections', connectionId), {
    status: 'accepted',
    lastMessage: 'Request accepted! Start chatting.',
    lastMessageTime: serverTimestamp(),
    unreadCount: 1,
  });
}

// ── rejectRequest ─────────────────────────────────────────────────────────────
// Reject a parent-initiated connection request

export async function rejectRequest(connectionId: string): Promise<void> {
  await updateDoc(doc(db, 'connections', connectionId), {
    status: 'rejected',
    lastMessage: 'Request declined.',
    lastMessageTime: serverTimestamp(),
    unreadCount: 0,
  });
}

// ── useReviews ────────────────────────────────────────────────────────────────
// Real-time listener: all reviews for a tutor (ordered newest first)

export function useReviews(tutorPhone: string): {
  reviews: FirestoreReview[];
  loading: boolean;
  avgRating: number;
} {
  const [reviews, setReviews] = useState<FirestoreReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tutorPhone) { setLoading(false); return; }

    const q = query(
      collection(db, 'reviews'),
      where('tutorPhone', '==', tutorPhone),
    );

    const unsub = onSnapshot(q, (snap) => {
      const list: FirestoreReview[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          tutorPhone: data.tutorPhone ?? '',
          rating: Number(data.rating ?? 0),
          reviewText: data.reviewText ?? '',
          parentName: data.parentName ?? 'Parent',
          parentPhone: data.parentPhone ?? undefined,
          tutorReply: data.tutorReply ?? undefined,
          createdAt: tsToISO(data.createdAt),
          updatedAt: tsToISO(data.updatedAt),
        };
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setReviews(list);
      setLoading(false);
    }, () => setLoading(false));

    return unsub;
  }, [tutorPhone]);

  const avgRating = reviews.length
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : 0;

  return { reviews, loading, avgRating };
}

// ── replyToReview ─────────────────────────────────────────────────────────────
// Tutor writes a reply to a parent review

export async function replyToReview(reviewId: string, replyText: string): Promise<void> {
  await updateDoc(doc(db, 'reviews', reviewId), {
    tutorReply: replyText.trim(),
    updatedAt: serverTimestamp(),
  });
}

// ── submitReview ──────────────────────────────────────────────────────────────
// Called from parent app (or admin) to post a review for a tutor

export async function submitReview(
  tutorPhone: string,
  rating: number,
  reviewText: string,
  parentName: string,
  parentPhone?: string,
): Promise<string> {
  const ref = await addDoc(collection(db, 'reviews'), {
    tutorPhone,
    rating,
    reviewText: reviewText.trim(),
    parentName: parentName.trim(),
    parentPhone: parentPhone ?? null,
    tutorReply: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

// ── usePresence ───────────────────────────────────────────────────────────────
// Updates own lastSeen every 30s; listens to other user's lastSeen.
// Returns a WhatsApp-style "last seen …" string.

function isSameDayLocal(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function formatLastSeenText(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);

  if (diffMins < 2) return 'online';
  if (diffMins < 60) return `last seen ${diffMins} min ago`;

  const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  if (isSameDayLocal(date, now)) return `last seen today at ${timeStr}`;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDayLocal(date, yesterday)) return `last seen yesterday at ${timeStr}`;

  const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return `last seen ${dateStr} at ${timeStr}`;
}

export function usePresence(myPhone: string, otherId?: string): { lastSeenText: string } {
  const [lastSeenText, setLastSeenText] = useState('');
  const lastSeenIsoRef = useRef<string | null>(null);
  const touchIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Update own presence every 30s
  useEffect(() => {
    if (!myPhone) return;
    const myRef = doc(db, 'presence', myPhone);
    const touch = () => setDoc(myRef, { lastSeen: serverTimestamp() }, { merge: true }).catch(() => {});
    touch();
    touchIntervalRef.current = setInterval(touch, 30_000);
    return () => { if (touchIntervalRef.current) clearInterval(touchIntervalRef.current); };
  }, [myPhone]);

  // Listen to other user's lastSeen (keyed by parentId/order_id or tutorPhone)
  useEffect(() => {
    if (!otherId) return;
    const otherRef = doc(db, 'presence', otherId);
    const unsub = onSnapshot(otherRef, (snap) => {
      const data = snap.data();
      if (data?.lastSeen) {
        const iso = tsToISO(data.lastSeen);
        lastSeenIsoRef.current = iso;
        setLastSeenText(formatLastSeenText(iso));
      }
    }, () => {});
    return unsub;
  }, [otherId]);

  // Refresh "X min ago" text every minute by recalculating from stored iso
  useEffect(() => {
    refreshIntervalRef.current = setInterval(() => {
      if (lastSeenIsoRef.current) {
        setLastSeenText(formatLastSeenText(lastSeenIsoRef.current));
      }
    }, 60_000);
    return () => { if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current); };
  }, []);

  return { lastSeenText };
}

// ── fetchAppliedCounts ────────────────────────────────────────────────────────
// Returns a map of jobId → number of tutors who applied (connection docs in Firestore)

export async function fetchAppliedCounts(): Promise<Record<string, number>> {
  try {
    const snap = await getDocs(collection(db, 'connections'));
    const counts: Record<string, number> = {};
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.jobId) {
        counts[data.jobId] = (counts[data.jobId] ?? 0) + 1;
      }
    });
    return counts;
  } catch {
    return {};
  }
}

// ── sendReminder ──────────────────────────────────────────────────────────────
export async function sendReminder(connectionId: string): Promise<void> {
  await updateDoc(doc(db, 'connections', connectionId), {
    reminderAt: serverTimestamp(),
  });
}

// ── closeConnection ───────────────────────────────────────────────────────────
export async function closeConnection(connectionId: string): Promise<void> {
  await addDoc(collection(db, 'connections', connectionId, 'messages'), {
    senderId: 'SYSTEM',
    text: '🔒 Chat closed by Tutor. No further messages can be sent.',
    type: 'system',
    createdAt: serverTimestamp(),
    read: true,
  });
  await updateDoc(doc(db, 'connections', connectionId), {
    status: 'rejected',
    closedAt: serverTimestamp(),
    lastMessage: 'Chat closed by Tutor',
    lastMessageTime: serverTimestamp(),
  });
}

// ── blockConnection ───────────────────────────────────────────────────────────
export async function blockConnection(connectionId: string): Promise<void> {
  await addDoc(collection(db, 'connections', connectionId, 'messages'), {
    senderId: 'SYSTEM',
    text: '🚫 You have been blocked by the Tutor.',
    type: 'system',
    createdAt: serverTimestamp(),
    read: true,
  });
  await updateDoc(doc(db, 'connections', connectionId), {
    status: 'blocked',
    blockedAt: serverTimestamp(),
    lastMessage: 'Blocked by Tutor',
    lastMessageTime: serverTimestamp(),
  });
}
