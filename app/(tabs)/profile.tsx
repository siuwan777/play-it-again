import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFavorites } from '../FavoritesContext';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { clearAuthEmail, getAuthEmail } from '../../utils/authSession';
import { getListingConversationsAsSeller } from '../../utils/chat';
import { useInboxBadge } from '../../hooks/useInboxBadge';
import { subscribeUserListings } from '../../utils/userListings';
import { resolveDisplayName, setCachedDisplayName, subscribeUserProfile } from '../../utils/userProfile';

export default function Profile() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('sell');
  const { favorites, loading: favoritesLoading } = useFavorites();

  const USER = {
    name: 'Jason_Guitarist',
    role: '活躍樂手',
    joinDate: '2026年1月',
    verified: true,
  };

  const [activeListings, setActiveListings] = useState<any[]>([]);
  const [legacyListings, setLegacyListings] = useState<any[]>([]);
  const [historyListings, setHistoryListings] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState(USER.name);
  const [profileBio, setProfileBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [creditScore, setCreditScore] = useState(0);
  const { badgeCount: inboxBadgeCount } = useInboxBadge();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid ?? null);
      if (!user) {
        setProfileName(USER.name);
        setProfileBio('');
        setAvatarUrl(null);
      }
    });
    return unsubscribeAuth;
  }, []);

  useEffect(() => {
    if (!userId) return;

    const unsubscribeProfile = subscribeUserProfile(userId, (profile) => {
      const email = auth.currentUser?.email || null;
      setProfileName(resolveDisplayName(profile, email));
      setProfileBio(profile?.bio || '');
      setAvatarUrl(profile?.avatarUrl || null);
      setCreditScore(typeof profile?.creditScore === 'number' ? profile.creditScore : 0);
    });

    return unsubscribeProfile;
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setActiveListings([]);
      setLegacyListings([]);
      setHistoryListings([]);
      return;
    }

    const userEmail = auth.currentUser?.email || getAuthEmail();

    const unsubscribe = subscribeUserListings(
      userId,
      userEmail,
      ({ active, legacy, sold }) => {
        setActiveListings(active);
        setLegacyListings(legacy);
        setHistoryListings(sold);
      },
      (error) => {
        console.error('Failed to load user listings:', error);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  const renderListingCard = (item: any, options?: { isLegacy?: boolean }) => {
    const isLegacy = options?.isLegacy ?? false;

    return (
      <View key={item.id} style={styles.listingCard}>
        <Image source={{ uri: item.image }} style={styles.listingImage} />
        <View style={styles.listingInfo}>
          {isLegacy && (
            <View style={styles.legacyBadge}>
              <Text style={styles.legacyBadgeText}>舊版未綁定</Text>
            </View>
          )}
          <Text style={styles.listingTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.listingPrice}>HK$ {item.price}</Text>
          <View style={styles.listingActions}>
            <TouchableOpacity
              style={[styles.editBtn, !isLegacy && styles.editBtnHalf]}
              onPress={() => router.push({ pathname: '/edit-listing', params: { id: item.id } })}
            >
              <Text style={styles.editBtnText}>✏️ 編輯</Text>
            </TouchableOpacity>
            {!isLegacy && (
              <TouchableOpacity style={styles.soldBtn} onPress={() => handleMarkAsSold(item)}>
                <Text style={styles.soldBtnText}>✔️ 已售</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  const navigateToRate = (params: {
    listingId: string;
    listingTitle: string;
    revieweeId: string;
    revieweeName: string;
  }) => {
    router.push({
      pathname: '/rate',
      params,
    });
  };

  const promptRateBuyer = async (itemToSell: { id: string; title: string }) => {
    if (!userId) return;

    const conversations = await getListingConversationsAsSeller(itemToSell.id, userId);

    if (conversations.length === 0) {
      Alert.alert('已標示售出', '商品已從市集下架。若買家之後確認交易，可再為對方評分。');
      return;
    }

    if (conversations.length === 1) {
      const buyer = conversations[0];
      navigateToRate({
        listingId: itemToSell.id,
        listingTitle: itemToSell.title,
        revieweeId: buyer.buyerId,
        revieweeName: buyer.buyerName,
      });
      return;
    }

    Alert.alert('選擇買家', '此商品有多位聯絡過的買家，請選擇要評分的對象：', [
      { text: '稍後再評', style: 'cancel' },
      ...conversations.map((conversation) => ({
        text: conversation.buyerName,
        onPress: () =>
          navigateToRate({
            listingId: itemToSell.id,
            listingTitle: itemToSell.title,
            revieweeId: conversation.buyerId,
            revieweeName: conversation.buyerName,
          }),
      })),
    ]);
  };

  const handleMarkAsSold = (itemToSell: any) => {
    if (!userId) return;

    Alert.alert(
      '標示已售',
      `確定要將「${itemToSell.title}」標示為已售出嗎？商品將從市集下架。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '確定',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'guitars', itemToSell.id), {
                status: 'sold',
                soldAt: serverTimestamp(),
              });
              await promptRateBuyer(itemToSell);
            } catch (error: any) {
              Alert.alert('更新失敗', error.message || '無法標示已售，請稍後再試。');
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('登出', '確定要登出 Play it again 嗎？', [
      { text: '取消', style: 'cancel' },
      {
        text: '確定登出',
        style: 'destructive',
        onPress: async () => {
          clearAuthEmail();
          setCachedDisplayName(null);
          await signOut(auth);
          router.replace('/login');
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.profileCard}>
        <View style={styles.headerRow}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{profileName.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.userInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{profileName}</Text>
              {USER.verified && <Text style={styles.verifiedIcon}>✔️</Text>}
            </View>
            <Text style={styles.roleText}>
              {profileBio ? profileBio : `加入時間: ${USER.joinDate} • ${USER.role}`}
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>信用分</Text>
            <Text style={styles.statValue}>⭐ {creditScore}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>成功交易</Text>
            <Text style={[styles.statValue, {color: '#F4EEDD'}]}>🤝 {historyListings.length}</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.premiumBtn} onPress={() => router.push('/premium')}>
            <Text style={styles.premiumBtnText}>👑 升級 PRO / 推廣</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.messagesBtn} onPress={() => router.push('/(tabs)/messages')}>
          <Text style={styles.messagesBtnText}>💬 我的訊息</Text>
          {inboxBadgeCount > 0 ? (
            <View style={styles.messagesBadge}>
              <Text style={styles.messagesBadgeText}>
                {inboxBadgeCount > 9 ? '9+' : inboxBadgeCount} 則未讀
              </Text>
            </View>
          ) : (
            <Text style={styles.messagesBtnHint}>查看買家聯絡</Text>
          )}
        </TouchableOpacity>

        <View style={styles.secondaryActionRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/rewards')}>
            <Text style={styles.actionBtnText}>🎁 獎賞</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/edit-profile')}>
            <Text style={styles.actionBtnText}>編輯</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tabButton, activeTab === 'sell' && styles.tabButtonActive]} onPress={() => setActiveTab('sell')}>
          <Text style={[styles.tabText, activeTab === 'sell' && styles.tabTextActive]}>
            我的放售 ({activeListings.length + legacyListings.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabButton, activeTab === 'fav' && styles.tabButtonActive]} onPress={() => setActiveTab('fav')}>
          <Text style={[styles.tabText, activeTab === 'fav' && styles.tabTextActive]}>收藏 ({favorites.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabButton, activeTab === 'history' && styles.tabButtonActive]} onPress={() => setActiveTab('history')}>
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>歷史 ({historyListings.length})</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.contentArea}>
        {activeTab === 'sell' && (
          <View>
            {!userId ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🔐</Text>
                <Text style={styles.emptyTitle}>請先登入</Text>
                <Text style={styles.emptySub}>登入後才能查看你的放售商品</Text>
                <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/login')}>
                  <Text style={styles.loginBtnText}>前往登入</Text>
                </TouchableOpacity>
              </View>
            ) : activeListings.length > 0 || legacyListings.length > 0 ? (
              <View>
                {activeListings.map(item => renderListingCard(item))}

                {legacyListings.length > 0 && (
                  <View style={styles.legacySection}>
                    <Text style={styles.legacySectionTitle}>舊版未綁定商品 ({legacyListings.length})</Text>
                    <Text style={styles.legacySectionSub}>
                      這些是更新帳號系統前刊登的商品。如電郵吻合，編輯並儲存即可綁定到你的帳號。
                    </Text>
                    {legacyListings.map(item => renderListingCard(item, { isLegacy: true }))}
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🎸</Text>
                <Text style={styles.emptyTitle}>目前沒有放售中的樂器</Text>
                <Text style={styles.emptySub}>去「放售」頁刊登你的第一件商品吧！</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'fav' && (
          <View>
            {favoritesLoading ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>載入收藏中...</Text>
              </View>
            ) : favorites.length > 0 ? (
              favorites.map((item) => (
                <TouchableOpacity key={item.id} style={styles.listingCard} onPress={() => router.push({ pathname: '/details', params: { id: item.id } })}>
                  <Image source={{ uri: item.image }} style={styles.listingImage} />
                  <View style={styles.listingInfo}>
                    <Text style={styles.listingTitle} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.listingPrice}>HK$ {item.price}</Text>
                    <View style={styles.cyanBadge}><Text style={styles.cyanBadgeText}>❤️ 已收藏</Text></View>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>❤️</Text>
                <Text style={styles.emptyTitle}>暫無收藏</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'history' && (
          <View>
            {historyListings.length > 0 ? (
              historyListings.map((item) => (
                <View key={item.id} style={[styles.listingCard, { opacity: 0.85 }]}>
                  <Image source={{ uri: item.image }} style={styles.listingImage} />
                  <View style={styles.listingInfo}>
                    <Text style={styles.listingTitle} numberOfLines={2}>{item.title}</Text>
                    <Text style={[styles.listingPrice, { color: '#8A7B72' }]}>HK$ {item.price}</Text>
                    <View style={styles.cyanBadge}>
                      <Text style={styles.cyanBadgeText}>✅ 已售出 ({item.soldDate})</Text>
                    </View>
                    {item.soldToBuyerId ? (
                      <TouchableOpacity
                        style={styles.rateHistoryBtn}
                        onPress={() =>
                          navigateToRate({
                            listingId: item.id,
                            listingTitle: item.title,
                            revieweeId: item.soldToBuyerId!,
                            revieweeName: item.soldToBuyerName || '買家',
                          })
                        }
                      >
                        <Text style={styles.rateHistoryBtnText}>⭐ 為買家評分</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.rateHistoryBtnSecondary}
                        onPress={() => router.push('/(tabs)/messages')}
                      >
                        <Text style={styles.rateHistoryBtnSecondaryText}>💬 到訊息找買家評分</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🤝</Text>
                <Text style={styles.emptyTitle}>暫無交易紀錄</Text>
              </View>
            )}
          </View>
        )}
      </View>

      <View style={styles.systemSection}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}><Text style={styles.logoutText}>登出帳戶</Text></TouchableOpacity>
        <Text style={styles.versionText}>Play it again v1.0.0 (MVP)</Text>
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ... 你的 styles 完全不用動，直接保留！
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4EEDD' },
  profileCard: { backgroundColor: '#4A3B32', padding: 20, paddingTop: 60, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatar: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#F4EEDD', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  avatarImage: { width: 70, height: 70, borderRadius: 35, marginRight: 15, backgroundColor: '#F4EEDD' },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#4A3B32' },
  userInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  name: { fontSize: 22, fontWeight: '900', color: '#F4EEDD' },
  verifiedIcon: { fontSize: 16, marginLeft: 6 },
  roleText: { fontSize: 13, color: '#D0C8B8' },
  statsRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: 15, marginBottom: 20 },
  statBox: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  statLabel: { fontSize: 12, color: '#D0C8B8', marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#DCA744' }, 
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  secondaryActionRow: { flexDirection: 'row', gap: 10 },
  premiumBtn: { flex: 1, backgroundColor: '#C35A2C', paddingVertical: 12, borderRadius: 25, alignItems: 'center' },
  premiumBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  messagesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 25,
    marginBottom: 10,
  },
  messagesBtnText: { color: '#4A3B32', fontWeight: 'bold', fontSize: 15 },
  messagesBtnHint: { color: '#8A7B72', fontSize: 12, fontWeight: '600' },
  messagesBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  messagesBadgeText: { color: '#B45309', fontSize: 12, fontWeight: 'bold' },
  actionBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', paddingVertical: 12, borderRadius: 25, alignItems: 'center' },
  actionBtnText: { color: '#F4EEDD', fontWeight: 'bold', fontSize: 14 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E0D8C8' },
  tabButton: { flex: 1, paddingVertical: 15, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabButtonActive: { borderBottomColor: '#C35A2C' },
  tabText: { fontSize: 14, color: '#8A7B72', fontWeight: '600' },
  tabTextActive: { color: '#C35A2C' },
  contentArea: { padding: 15 },
  listingCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 12, marginBottom: 15, borderWidth: 1, borderColor: '#E0D8C8' },
  listingImage: { width: 90, height: 90, borderRadius: 12, backgroundColor: '#F4EEDD', marginRight: 15 },
  listingInfo: { flex: 1, justifyContent: 'space-between' },
  listingTitle: { fontSize: 14, fontWeight: 'bold', color: '#4A3B32', lineHeight: 20 },
  listingPrice: { fontSize: 16, fontWeight: '900', color: '#C35A2C', marginTop: 4 },
  listingActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  editBtn: { flex: 1, backgroundColor: '#F4EEDD', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  editBtnHalf: { flex: 1 },
  editBtnText: { fontSize: 12, fontWeight: 'bold', color: '#4A3B32' },
  soldBtn: { flex: 1, backgroundColor: '#4A3B32', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  soldBtnText: { fontSize: 12, fontWeight: 'bold', color: '#FFFFFF' },
  legacySection: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E0D8C8' },
  legacySectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#4A3B32', marginBottom: 6 },
  legacySectionSub: { fontSize: 13, color: '#8A7B72', marginBottom: 12, lineHeight: 18 },
  legacyBadge: { alignSelf: 'flex-start', backgroundColor: '#FFF7ED', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 6, borderWidth: 1, borderColor: '#FED7AA' },
  legacyBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#C35A2C' },
  cyanBadge: { marginTop: 10, backgroundColor: '#E8F2F2', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#D0E5E5' },
  cyanBadgeText: { fontSize: 11, fontWeight: 'bold', color: '#4E878C' },
  rateHistoryBtn: {
    marginTop: 10,
    backgroundColor: '#111111',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  rateHistoryBtnText: { fontSize: 12, fontWeight: 'bold', color: '#FFFFFF' },
  rateHistoryBtnSecondary: {
    marginTop: 10,
    backgroundColor: '#F4EEDD',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#E0D8C8',
  },
  rateHistoryBtnSecondaryText: { fontSize: 12, fontWeight: 'bold', color: '#4A3B32' },
  emptyState: { alignItems: 'center', paddingVertical: 50 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: '#4A3B32', marginBottom: 5 },
  emptySub: { fontSize: 14, color: '#8A7B72', marginBottom: 16, textAlign: 'center' },
  loginBtn: { backgroundColor: '#C35A2C', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, marginTop: 8 },
  loginBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
  systemSection: { padding: 20, alignItems: 'center' },
  logoutButton: { paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25, backgroundColor: '#4A3B32' },
  logoutText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  versionText: { marginTop: 15, fontSize: 12, color: '#8A7B72' }
});