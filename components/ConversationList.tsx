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
import { TabScreenHeader } from './TabScreenHeader';
import { colors } from '../constants/theme';

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
      {showHeader ? (
        <TabScreenHeader
          variant="messages"
          title="我的訊息"
          subtitle="買家聯絡或你想買的商品，對話都會在這裡"
        />
      ) : null}

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
                          {badge}
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
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, flexGrow: 1 },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  loadingText: { marginTop: 12, fontSize: 16, color: colors.textMuted },
  loginBtn: {
    marginTop: 16,
    backgroundColor: colors.tile,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  loginBtnText: { color: colors.textOnTile, fontWeight: 'bold', fontSize: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardUnread: { backgroundColor: colors.paper, borderColor: colors.text, borderWidth: 1.5 },
  image: { width: 56, height: 56, borderRadius: 12, marginRight: 12, backgroundColor: colors.tile },
  info: { flex: 1 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  otherName: { fontSize: 15, fontWeight: 'bold', color: colors.text, flex: 1 },
  otherNameUnread: { color: colors.text },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginLeft: 6,
    marginRight: 4,
  },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginLeft: 8 },
  badgeUrgent: { backgroundColor: colors.mutedFill },
  badgeMuted: { backgroundColor: colors.mutedFill },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
  badgeTextUrgent: { color: colors.textSecondary },
  badgeTextMuted: { color: colors.textSecondary },
  listingTitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 4 },
  lastMessage: { fontSize: 13, color: colors.textMuted },
  lastMessageUnread: { color: colors.text, fontWeight: '600' },
  chevron: { fontSize: 24, color: colors.textMuted, marginLeft: 8 },
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 24 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 8 },
  emptySub: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
});
