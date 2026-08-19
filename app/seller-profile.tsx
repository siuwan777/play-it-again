import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { auth } from '../firebaseConfig';
import { getOrCreateConversation } from '../utils/chat';
import {
  getSellerPublicProfile,
  subscribeSellerListings,
  type SellerListingItem,
  type SellerPublicProfile,
} from '../utils/sellerProfile';
import { getDisplayNameForUser } from '../utils/userProfile';
import { formatAvgRating, getRevieweeStats, type RevieweeStats } from '../utils/transactionRating';

export default function SellerProfile() {
  const router = useRouter();
  const { sellerId, listingId, sellerName } = useLocalSearchParams<{
    sellerId?: string;
    listingId?: string;
    sellerName?: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<SellerPublicProfile | null>(null);
  const [listings, setListings] = useState<SellerListingItem[]>([]);
  const [contacting, setContacting] = useState(false);
  const [sellerStats, setSellerStats] = useState<RevieweeStats | null>(null);

  useEffect(() => {
    if (!sellerId) {
      setLoading(false);
      return;
    }

    let unsubscribeListings = () => {};

    const loadProfile = async () => {
      try {
        const sellerProfile = await getSellerPublicProfile(
          sellerId,
          typeof sellerName === 'string' ? sellerName : undefined
        );
        setProfile(sellerProfile);

        const stats = await getRevieweeStats(sellerId);
        setSellerStats(stats);
      } catch (error) {
        console.error('Failed to load seller profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
    unsubscribeListings = subscribeSellerListings(
      sellerId,
      setListings,
      (error) => console.error('Failed to load seller listings:', error)
    );

    return () => unsubscribeListings();
  }, [sellerId, sellerName]);

  const handleContact = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('請先登入', '登入後才能聯絡賣家', [
        { text: '取消', style: 'cancel' },
        { text: '前往登入', onPress: () => router.push('/login') },
      ]);
      return;
    }

    if (!sellerId) return;

    if (user.uid === sellerId) {
      Alert.alert('提示', '這是你自己的檔案喔！');
      return;
    }

    const targetListing =
      listings.find((item) => item.id === listingId) || listings[0];

    if (!targetListing) {
      Alert.alert('無法聯絡', '此賣家目前沒有放售中的商品。');
      return;
    }

    setContacting(true);
    try {
      const buyerName = await getDisplayNameForUser(user.uid, user.email);
      const conversationId = await getOrCreateConversation({
        listingId: targetListing.id,
        buyerId: user.uid,
        sellerId,
        listingTitle: targetListing.title,
        listingPrice: targetListing.price,
        listingImage: targetListing.image,
        buyerName,
        sellerName: profile?.displayName || '賣家',
      });

      router.push({ pathname: '/chat', params: { conversationId } });
    } catch (error) {
      console.error('Failed to start conversation:', error);
      const message = error instanceof Error && error.message.includes('無法與此用戶聯絡')
        ? '你已封鎖此賣家，或對方已封鎖你，無法開啟對話。'
        : '請稍後再試。';
      Alert.alert('無法開啟對話', message);
    } finally {
      setContacting(false);
    }
  };

  if (!sellerId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>找不到賣家</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>返回</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#C35A2C" />
        <Text style={styles.loadingText}>載入賣家檔案中...</Text>
      </View>
    );
  }

  const displayName = profile?.displayName || sellerName || '賣家';
  const isOwnProfile = auth.currentUser?.uid === sellerId;

  const handleReport = () => {
    if (!sellerId) return;

    const user = auth.currentUser;
    if (!user) {
      Alert.alert('請先登入', '登入後才能檢舉用戶', [
        { text: '取消', style: 'cancel' },
        { text: '前往登入', onPress: () => router.push('/login') },
      ]);
      return;
    }

    router.push({
      pathname: '/report',
      params: {
        userId: sellerId,
        userName: displayName,
        listingId: typeof listingId === 'string' ? listingId : listings[0]?.id,
      },
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.profileCard}>
          <View style={styles.headerRow}>
            {profile?.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.userInfo}>
              <Text style={styles.name}>{displayName}</Text>
              <Text style={styles.roleText}>加入時間：{profile?.joinDate || '近期加入'}</Text>
              {profile?.instagram ? (
                <Text style={styles.instagramText}>IG: {profile.instagram}</Text>
              ) : null}
            </View>
            {!isOwnProfile ? (
              <TouchableOpacity onPress={handleReport}>
                <Text style={styles.reportIcon}>🚨</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {profile?.bio ? (
            <Text style={styles.bioText}>{profile.bio}</Text>
          ) : (
            <Text style={styles.bioPlaceholder}>這位賣家尚未填寫個人簡介。</Text>
          )}

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>評價</Text>
              <Text style={styles.statValue}>
                {sellerStats
                  ? `${formatAvgRating(sellerStats.avgRating, sellerStats.ratingCount)} (${sellerStats.ratingCount})`
                  : '—'}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>信用分</Text>
              <Text style={styles.statValue}>{sellerStats?.creditScore ?? 0}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>放售中</Text>
              <Text style={styles.statValue}>{listings.length} 件</Text>
            </View>
          </View>
        </View>

        <View style={styles.listingsSection}>
          <Text style={styles.sectionTitle}>正在放售的樂器 ({listings.length})</Text>

          {listings.length > 0 ? (
            <View style={styles.grid}>
              {listings.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.card}
                  onPress={() => router.push({ pathname: '/details', params: { id: item.id } })}
                >
                  <View style={styles.imageContainer}>
                    <Image source={{ uri: item.image }} style={styles.cardImage} />
                    <View style={styles.conditionBadge}>
                      <Text style={styles.conditionText}>{item.condition}</Text>
                    </View>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={styles.cardPrice}>HK$ {item.price}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyListings}>
              <Text style={styles.emptyListingsText}>此賣家目前沒有放售中的商品。</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.contactBtn, contacting && styles.contactBtnDisabled]}
          onPress={handleContact}
          disabled={contacting || listings.length === 0}
        >
          <Text style={styles.contactBtnText}>
            {contacting ? '開啟對話中...' : `💬 聯絡 ${displayName}`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4EEDD' },
  centered: { flex: 1, backgroundColor: '#F4EEDD', alignItems: 'center', justifyContent: 'center', padding: 30 },
  loadingText: { marginTop: 12, fontSize: 16, color: '#8A7B72' },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#4A3B32', marginBottom: 20 },
  backBtn: { backgroundColor: '#C35A2C', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  backBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  profileCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    paddingTop: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E0D8C8',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F4EEDD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#E0D8C8',
  },
  avatarImage: { width: 60, height: 60, borderRadius: 30, marginRight: 15, backgroundColor: '#F4EEDD' },
  avatarText: { fontSize: 24, fontWeight: 'bold', color: '#4A3B32' },
  userInfo: { flex: 1 },
  name: { fontSize: 18, fontWeight: '900', color: '#4A3B32', marginBottom: 4 },
  roleText: { fontSize: 13, color: '#8A7B72' },
  instagramText: { fontSize: 13, color: '#4E878C', marginTop: 4, fontWeight: '600' },
  reportIcon: { fontSize: 20, padding: 5 },
  bioText: {
    fontSize: 15,
    color: '#4A3B32',
    lineHeight: 24,
    marginBottom: 16,
    backgroundColor: '#F4EEDD',
    padding: 12,
    borderRadius: 12,
  },
  bioPlaceholder: { fontSize: 14, color: '#8A7B72', marginBottom: 16, fontStyle: 'italic' },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#F4EEDD',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E0D8C8',
  },
  statBox: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 12, color: '#8A7B72', marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#C35A2C' },
  listingsSection: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#4A3B32', marginBottom: 15 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0D8C8',
  },
  imageContainer: { width: '100%', height: 140, backgroundColor: '#F4EEDD', position: 'relative' },
  cardImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  conditionBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  conditionText: { fontSize: 10, fontWeight: 'bold', color: '#4A3B32' },
  cardInfo: { padding: 10 },
  cardTitle: { fontSize: 13, fontWeight: 'bold', color: '#4A3B32', marginBottom: 6, lineHeight: 18, height: 36 },
  cardPrice: { fontSize: 16, fontWeight: '900', color: '#C35A2C' },
  emptyListings: { paddingVertical: 30, alignItems: 'center' },
  emptyListingsText: { fontSize: 14, color: '#8A7B72' },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: 15,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: '#E0D8C8',
  },
  contactBtn: { backgroundColor: '#4A3B32', paddingVertical: 16, borderRadius: 30, alignItems: 'center' },
  contactBtnDisabled: { opacity: 0.7 },
  contactBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});
