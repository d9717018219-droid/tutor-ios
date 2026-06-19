import { Platform } from 'react-native';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore } from 'firebase/firestore';

const FIREBASE_CONFIG = {
  // Android API key (from google-services.json) and iOS API key (from GoogleService-Info.plist) differ
  apiKey: Platform.OS === 'ios'
    ? 'AIzaSyBOW8XUGf6Cb6bRwfLupeHUgVjLzJHSfJg'
    : 'AIzaSyDURPKldQ7cxmoB-zltg8HHj8SW8FlIpa4',
  authDomain: 'doable-india-app-9564b-496310.firebaseapp.com',
  projectId: 'doable-india-app-9564b-496310',
  storageBucket: 'doable-india-app-9564b-496310.firebasestorage.app',
  messagingSenderId: '237759117673',
  // Use correct platform App ID — iOS and Android have different App IDs
  appId: Platform.OS === 'ios'
    ? '1:237759117673:ios:0db7c35c97e40d901ce5f8'
    : '1:237759117673:android:88cc6796db80663e1ce5f8',
};

const wasEmpty = getApps().length === 0;
const firebaseApp = wasEmpty ? initializeApp(FIREBASE_CONFIG) : getApp();

// experimentalForceLongPolling = required for React Native / Expo Go (no WebSocket)
export const db = wasEmpty
  ? initializeFirestore(firebaseApp, { experimentalForceLongPolling: true })
  : getFirestore(firebaseApp);

export { firebaseApp as app };
