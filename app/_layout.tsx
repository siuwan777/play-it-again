import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { setAuthEmail, clearAuthEmail } from "../utils/authSession";
import {
  registerForPushNotificationsAsync,
  saveExpoPushToken,
} from "../utils/pushNotifications";
import { ensureUserProfile, setCachedDisplayName } from "../utils/userProfile";
import { FavoritesProvider } from "./FavoritesContext";

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      const conversationId =
        typeof data?.conversationId === 'string' ? data.conversationId : null;
      if (conversationId) {
        router.push({ pathname: '/chat', params: { conversationId } });
        return;
      }
      if (data?.type === 'buy_intent' || data?.type === 'message') {
        router.push('/(tabs)/messages');
      }
    });

    return () => responseSub.remove();
  }, [router]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user?.email) {
        setAuthEmail(user.email);
        try {
          await ensureUserProfile(user.uid, user.email);
        } catch (error) {
          console.error('Failed to ensure user profile:', error);
        }
        try {
          const pushToken = await registerForPushNotificationsAsync();
          if (pushToken) {
            await saveExpoPushToken(user.uid, pushToken);
          }
        } catch (error) {
          console.warn('Failed to register push notifications:', error);
        }
      } else if (!user) {
        clearAuthEmail();
        setCachedDisplayName(null);
      }
    });
    return unsubscribe;
  }, []);

  return (
    <FavoritesProvider>
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="details" options={{ title: '商品詳情', headerBackTitle: '返回' }} />
        <Stack.Screen name="conversations" options={{ title: '我的訊息', headerBackTitle: '返回' }} />
        <Stack.Screen name="chat" options={{ title: '對話', headerBackTitle: '返回' }} />
        <Stack.Screen name="rate" options={{ title: '交易評價', headerBackTitle: '返回' }} />
        <Stack.Screen name="notifications" options={{ title: '通知', headerBackTitle: '返回' }} />
        <Stack.Screen name="seller-profile" options={{ title: '賣家檔案', headerBackTitle: '返回' }} />
        <Stack.Screen name="report" options={{ title: '檢舉與封鎖', headerBackTitle: '返回' }} />
        <Stack.Screen name="edit-profile" options={{ title: '編輯檔案', headerBackTitle: '返回' }} />
        <Stack.Screen name="edit-listing" options={{ title: '編輯商品', headerBackTitle: '返回' }} />
        <Stack.Screen name="register" options={{ title: '註冊帳號', headerBackTitle: '返回' }} />
        <Stack.Screen name="forgot-password" options={{ title: '重設密碼', headerBackTitle: '返回' }} />
        <Stack.Screen name="rewards" options={{ title: '分數換領中心', headerBackTitle: '返回' }} />
        <Stack.Screen name="premium" options={{ title: '升級與推廣', headerBackTitle: '返回' }} />
        <Stack.Screen name="post-details" options={{ title: '貼文詳情', headerBackTitle: '返回' }} />
      </Stack>
    </FavoritesProvider>
  );
}