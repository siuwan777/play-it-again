import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { getDisplayNameForUser } from './userProfile';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

function getExpoProjectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('messages', {
      name: '訊息',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#A8A8A8',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const projectId = getExpoProjectId();
  if (!projectId) {
    console.warn('Expo projectId missing; cannot register push token.');
    return null;
  }

  const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
  return tokenResponse.data;
}

export async function saveExpoPushToken(uid: string, token: string): Promise<void> {
  const userRef = doc(db, 'users', uid);
  const snapshot = await getDoc(userRef);
  if (!snapshot.exists()) return;

  const existing = (snapshot.data().expoPushTokens as string[] | undefined) ?? [];
  const nextTokens = existing.includes(token) ? existing : [...existing, token].slice(-5);

  await updateDoc(userRef, {
    expoPushTokens: nextTokens,
    pushUpdatedAt: serverTimestamp(),
  });
}

async function getRecipientPushTokens(uid: string): Promise<string[]> {
  const snapshot = await getDoc(doc(db, 'users', uid));
  if (!snapshot.exists()) return [];
  const tokens = snapshot.data().expoPushTokens;
  if (!Array.isArray(tokens)) return [];
  return tokens.filter((token): token is string => typeof token === 'string' && token.length > 0);
}

type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

async function sendExpoPush(tokens: string[], payload: PushPayload): Promise<void> {
  if (!tokens.length) return;

  const messages = tokens.map((token) => ({
    to: token,
    sound: 'default',
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
    channelId: Platform.OS === 'android' ? 'messages' : undefined,
  }));

  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    const text = await response.text();
    console.warn('Expo push send failed:', text);
  }
}

export async function notifyUserOfNewMessage(params: {
  recipientUserId: string;
  senderId: string;
  senderEmail?: string | null;
  conversationId: string;
  preview: string;
}): Promise<void> {
  if (params.recipientUserId === params.senderId) return;

  const tokens = await getRecipientPushTokens(params.recipientUserId);
  if (!tokens.length) return;

  const senderName = await getDisplayNameForUser(params.senderId, params.senderEmail ?? null);
  const body =
    params.preview.length > 80 ? `${params.preview.slice(0, 80)}…` : params.preview;

  await sendExpoPush(tokens, {
    title: `${senderName} 傳了訊息`,
    body,
    data: {
      type: 'message',
      conversationId: params.conversationId,
    },
  });
}

export async function notifyUserInAppEvent(params: {
  recipientUserId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  const tokens = await getRecipientPushTokens(params.recipientUserId);
  if (!tokens.length) return;

  await sendExpoPush(tokens, {
    title: params.title,
    body: params.body,
    data: params.data,
  });
}
