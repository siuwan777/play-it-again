import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
  getConversationBadge,
  getOtherPartyId,
  getOtherPartyName,
  isConversationUnread,
  subscribeUserConversations,
  type Conversation,
} from '../utils/chat';
import { useBlockedUserIds } from '../hooks/useBlockedUserIds';

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1550291652-6ea9114a47b1?q=80&w=800&auto=format&fit=crop';

type ConversationListProps = {
  showHeader?: boolean;
};

export default function ConversationList({ showHeader = false }: ConversationListProps) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const { blockedUserIds } = useBlockedUserIds();

  const visibleConversations = conversations.filter((conversation) => {
    const otherUserId = userId ? getOtherPartyId(conversation, userId) : null;
    return !otherUserId || !blockedUserIds.has(otherUserId);
  });

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid ?? null);
      if (!user) {
        setConversations([]);
        setLoading(false);
      }
    });
    return unsubscribeAuth;
  }, []);

  useEffect(() => {
    if (!userId) return;

    setLoading(true);
    const unsubscribe = subscribeUserConversations(
      userId,
      (items) => {
        setConversations(items);
        setLoading(false);
      },
      (error) => {
        console.error('Failed to load conversations:', error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [userId]);

  if (!userId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>請先登入</Text>
        <Text style={styles.emptySub}>登入後才能查看買賣對話</Text>
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
        <Text style={styles.loadingText}>載入訊息中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showHeader && (
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>我的訊息</Text>
          <Text style={styles.pageSub}>買家聯絡或你想買的商品，對話都會在這裡</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {visibleConversations.length > 0 ? (
          visibleConversations.map((conversation) => {
            const otherName = getOtherPartyName(conversation, userId);
            const badge = getConversationBadge(conversation, userId);
            const unread = isConversationUnread(conversation, userId);

            return (
              <TouchableOpacity
                key={conversation.id}
                style={[styles.card, unread && styles.cardUnread]}
                onPress={() =>
                  router.push({ pathname: '/chat', params: { conversationId: conversation.id } })
                }
              >
                <Image
                  source={{ uri: conversation.listingImage || DEFAULT_IMAGE }}
                  style={styles.image}
                />
                <View style={styles.info}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.otherName, unread && styles.otherNameUnread]}>
                      {otherName}
                    </Text>
                    {unread && <View style={styles.unreadDot} />}
                    {badge ? (
                      <View
                        style={[
                          styles.badge,
                          badge === '待回覆' || badge === '待確認交收'
                            ? styles.badgeUrgent
                            : styles.badgeMuted,
                        ]}
                      >
                        <Text
                          style={[
                            styles.badgeText,
                            badge === '待回覆' || badge === '待確認交收'
                              ? styles.badgeTextUrgent
                              : styles.badgeTextMuted,
                          ]}
                        >
                          {badge === '待回覆'
                            ? '🔥 待回覆'
                            : badge === '待確認交收'
                              ? '📍 待確認交收'
                              : badge}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.listingTitle} numberOfLines={1}>
                    {conversation.listingTitle}
                  </Text>
                  <Text style={[styles.lastMessage, unread && styles.lastMessageUnread]} numberOfLines={1}>
                    {conversation.lastMessage || '開始對話...'}
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>暫無訊息</Text>
            <Text style={styles.emptySub}>
              買家：在商品頁按「聯絡賣家」開始對話{'\n'}
              賣家：有人聯絡你的商品時，對話會自動出現在這裡
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4EEDD' },
  content: { padding: 16, flexGrow: 1 },
  pageHeader: {
    backgroundColor: '#4A3B32',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 18,
  },
  pageTitle: { fontSize: 24, fontWeight: '900', color: '#F4EEDD', marginBottom: 6 },
  pageSub: { fontSize: 13, color: 'rgba(244, 238, 221, 0.75)', lineHeight: 20 },
  centered: {
    flex: 1,
    backgroundColor: '#F4EEDD',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  loadingText: { marginTop: 12, fontSize: 16, color: '#8A7B72' },
  loginBtn: {
    marginTop: 16,
    backgroundColor: '#C35A2C',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  loginBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardUnread: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  image: { width: 56, height: 56, borderRadius: 12, marginRight: 12, backgroundColor: '#F3F4F6' },
  info: { flex: 1 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  otherName: { fontSize: 15, fontWeight: 'bold', color: '#111111', flex: 1 },
  otherNameUnread: { color: '#92400E' },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginLeft: 6,
    marginRight: 4,
  },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginLeft: 8 },
  badgeUrgent: { backgroundColor: '#FEF3C7' },
  badgeMuted: { backgroundColor: '#ECFDF5' },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
  badgeTextUrgent: { color: '#B45309' },
  badgeTextMuted: { color: '#047857' },
  listingTitle: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  lastMessage: { fontSize: 13, color: '#9CA3AF' },
  lastMessageUnread: { color: '#374151', fontWeight: '600' },
  chevron: { fontSize: 24, color: '#D1D5DB', marginLeft: 8 },
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 24 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#4A3B32', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#8A7B72', textAlign: 'center', lineHeight: 22 },
});
