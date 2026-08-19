import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import {
  formatNotificationTime,
  getNotificationIcon,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeUserNotifications,
  type AppNotification,
} from '../utils/notifications';

export default function Notifications() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid ?? null);
      if (!user) {
        setNotifications([]);
        setLoading(false);
      }
    });
    return unsubscribeAuth;
  }, []);

  useEffect(() => {
    if (!userId) return;

    setLoading(true);
    const unsubscribe = subscribeUserNotifications(
      userId,
      (items) => {
        setNotifications(items);
        setLoading(false);
      },
      (error) => {
        console.error('Failed to load notifications:', error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [userId]);

  const handlePress = async (notification: AppNotification) => {
    if (!notification.isRead) {
      try {
        await markNotificationRead(notification.id);
      } catch (error) {
        console.error('Failed to mark notification read:', error);
      }
    }

    if (notification.type === 'buy_intent' && notification.conversationId) {
      router.push({ pathname: '/chat', params: { conversationId: notification.conversationId } });
      return;
    }

    if (notification.type === 'message') {
      router.push('/(tabs)/messages');
      return;
    }

    if (notification.type === 'rate_seller' && notification.listingId && notification.revieweeId) {
      router.push({
        pathname: '/rate',
        params: {
          listingId: notification.listingId,
          revieweeId: notification.revieweeId,
          revieweeName: notification.revieweeName || '賣家',
          listingTitle: notification.listingTitle || '商品',
        },
      });
      return;
    }

    Alert.alert('通知', notification.message);
  };

  const handleMarkAllRead = async () => {
    if (!userId) return;

    try {
      await markAllNotificationsRead(userId);
    } catch (error) {
      console.error('Failed to mark all notifications read:', error);
      Alert.alert('操作失敗', '無法標記全部已讀，請稍後再試。');
    }
  };

  if (!userId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>請先登入</Text>
        <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/login')}>
          <Text style={styles.loginBtnText}>前往登入</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#D97706" />
        <Text style={styles.loadingText}>載入通知中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>通知中心</Text>
        {notifications.some((item) => !item.isRead) && (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={styles.readAllBtn}>全部標記為已讀</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
        {notifications.length > 0 ? (
          notifications.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.notificationCard, !item.isRead && styles.unreadCard]}
              onPress={() => handlePress(item)}
            >
              <View style={[styles.iconContainer, !item.isRead && styles.unreadIconContainer]}>
                <Text style={styles.iconText}>{getNotificationIcon(item.type)}</Text>
              </View>

              <View style={styles.textContainer}>
                <View style={styles.titleRow}>
                  <Text style={[styles.title, !item.isRead && styles.unreadText]}>{item.title}</Text>
                  {!item.isRead && <View style={styles.unreadDot} />}
                </View>
                <Text style={styles.message} numberOfLines={2}>
                  {item.message}
                </Text>
                <Text style={styles.time}>{formatNotificationTime(item.createdAt)}</Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>暫無通知</Text>
            <Text style={styles.emptySub}>當有人想購買你的商品，或交易有更新時，會在這裡顯示</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  centered: { flex: 1, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', padding: 30 },
  loadingText: { marginTop: 12, fontSize: 16, color: '#8A7B72' },
  loginBtn: { marginTop: 16, backgroundColor: '#C35A2C', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  loginBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    padding: 20,
    paddingTop: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#111111' },
  readAllBtn: { fontSize: 14, color: '#D97706', fontWeight: 'bold', marginBottom: 4 },

  listContent: { padding: 15, flexGrow: 1 },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  unreadCard: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },

  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  unreadIconContainer: { backgroundColor: '#FEF3C7' },
  iconText: { fontSize: 22 },

  textContainer: { flex: 1, justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title: { fontSize: 15, fontWeight: 'bold', color: '#4B5563', flex: 1 },
  unreadText: { color: '#111111', fontWeight: '900' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', marginLeft: 8 },

  message: { fontSize: 14, color: '#6B7280', lineHeight: 20, marginBottom: 6 },
  time: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },

  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 24 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#4A3B32', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#8A7B72', textAlign: 'center', lineHeight: 22 },
});
