import { Platform } from 'react-native';

const BASE_URL: string = (() => {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  if (Platform.OS === 'web') return '/api';
  if (process.env.EXPO_PUBLIC_DOMAIN) return `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;
  // Fallback for native builds — should not happen in production (set EXPO_PUBLIC_API_URL in eas.json)
  return 'https://c7854001-eee6-4a81-a9bd-a8c214611eda-00-24nrkhtekd0zo.sisko.replit.dev/api';
})();

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  [key: string]: unknown;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let parsed: ApiResponse<T> = { success: false, message: text };
    try { parsed = JSON.parse(text); } catch {}
    return parsed;
  }

  return res.json() as Promise<ApiResponse<T>>;
}

export const api = {
  get: <T>(path: string, params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
    return request<T>(`${path}${qs}`);
  },
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
};
