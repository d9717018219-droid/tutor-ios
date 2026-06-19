import { Platform } from "react-native";
import Constants from "expo-constants";
import { api } from "./apiClient";

function isExpoGo(): boolean {
  return Constants.executionEnvironment === "storeClient";
}

export async function registerForPushNotifications(teacherPhone: string): Promise<string | null> {
  if (Platform.OS === "web") return null;
  if (isExpoGo()) {
    console.log("[notifications] Expo Go detected — push registration skipped (needs standalone build)");
    return null;
  }

  try {
    const Notifications = await import("expo-notifications");

    const existingPerm = await Notifications.getPermissionsAsync() as any;
    let granted = !!(existingPerm.granted ?? existingPerm.status === "granted");

    if (!granted) {
      const reqPerm = await Notifications.requestPermissionsAsync() as any;
      granted = !!(reqPerm.granted ?? reqPerm.status === "granted");
    }

    if (!granted) return null;

    // getDevicePushTokenAsync() gives raw FCM token (Android) or APNs (iOS)
    // — no Expo proxy, direct Firebase FCM
    const tokenData = await Notifications.getDevicePushTokenAsync();
    const token     = tokenData.data as string;
    const tokenType = tokenData.type as string;   // "android" | "ios"

    await api.post("/notifications/register", { fcmToken: token, tokenType, teacherPhone });
    return token;
  } catch (err) {
    console.warn("[notifications] Push registration failed:", err);
    return null;
  }
}

export function addNotificationListener(handler: (notification: any) => void): { remove: () => void } {
  let sub: { remove: () => void } | null = null;
  if (!isExpoGo() && Platform.OS !== "web") {
    (async () => {
      try {
        const Notifications = await import("expo-notifications");
        sub = Notifications.addNotificationReceivedListener(handler);
      } catch {}
    })();
  }
  return { remove: () => sub?.remove() };
}

export function addResponseListener(handler: (response: any) => void): { remove: () => void } {
  let sub: { remove: () => void } | null = null;
  if (!isExpoGo() && Platform.OS !== "web") {
    (async () => {
      try {
        const Notifications = await import("expo-notifications");
        sub = Notifications.addNotificationResponseReceivedListener(handler);
      } catch {}
    })();
  }
  return { remove: () => sub?.remove() };
}
