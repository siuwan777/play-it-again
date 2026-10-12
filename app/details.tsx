import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { ListingVideoPlayer } from '../components/ListingVideoPlayer';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { getDisplaySellerName } from '../utils/getDisplaySellerName';
import { getCategoryLabel } from '../utils/listingCategories';
import { getConditionLabel, getSpecDisplayRows, normalizeSpecsFromFirestore, areRequiredSpecsComplete } from '../utils/listingSpecs';
import { isListingSold } from '../utils/listingStatus';
import { getOrCreateConversation } from '../utils/chat';
import { SellerIdentityCard } from '../components/SellerIdentityCard';
import { getSellerPublicProfile } from '../utils/sellerProfile';
import { getDisplayNameForUser } from '../utils/userProfile';
import { getRevieweeStats } from '../utils/transactionRating';
import { Ionicons } from '@expo/vector-icons';
import { useFavorites } from './FavoritesContext';
import { colors, radii } from '../constants/theme';
import { hasListingVideoLink } from '../utils/listingVideo';
import { ListingSignalBadges } from '../components/ListingSignalBadges';
import { TradePolicyNote } from '../components/TradePolicyNote';
import { getIdentityBadgeLabel } from '../utils/profileCompleteness';

const { width } = Dimensions.get('window');

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1550291652-6ea9114a47b1?q=80&w=800&auto=format&fit=crop';

export default function Details() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeImage, setActiveImage] = useState(0);
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [contacting, setContacting] = useState(false);

  const { favorites, toggleFavorite } = useFavorites();
  const isFav = item ? favorites.some((fav: any) => fav.id === item.id) : false;

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const fetchItem = async () => {
      try {
        const snapshot = await getDoc(doc(db, 'guitars', id));
        if (snapshot.exists()) {
          const data = snapshot.data();
          const categoryId = data.category || '';
          const specs = normalizeSpecsFromFirestore(categoryId, data.specs);
          const sellerId = data.userId || '';
          const sellerDisplayName = getDisplaySellerName(data);
          let sellerStats = { avgRating: 0, ratingCount: 0, creditScore: 0 };
          let sellerProfile = null;

          if (sellerId) {
            try {
              const [stats, profile] = await Promise.all([
                getRevieweeStats(sellerId),
                getSellerPublicProfile(sellerId, sellerDisplayName),
              ]);
              sellerStats = stats;
              sellerProfile = profile;
            } catch (error) {
              console.error('Failed to load seller profile:', error);
            }
          }

          setItem({
            id: snapshot.id,
            title: data.title || '無標題',
            price: data.price?.toString() || '0',
            condition: getConditionLabel(data.conditionId, data.condition || '二手'),
            category: getCategoryLabel(categoryId),
            categoryId,
            specs,
            specRows: getSpecDisplayRows(categoryId, specs),
            hasCompleteSpecs: areRequiredSpecsComplete(categoryId, specs),
            description: data.description || '',
            videoUrl: data.videoLink || '',
            images: data.imageUrls?.length
              ? data.imageUrls
              : data.imageUrl
                ? [data.imageUrl]
                : [DEFAULT_IMAGE],
            seller: {
              name: sellerProfile?.displayName || sellerDisplayName,
              credit: sellerStats.creditScore,
              trades: sellerStats.ratingCount,
              avgRating: sellerStats.avgRating,
              avatarUrl: sellerProfile?.avatarUrl ?? null,
              joinDate: sellerProfile?.joinDate,
              region: sellerProfile?.region,
              primaryInstrument: sellerProfile?.primaryInstrument,
              bio: sellerProfile?.bio,
              instagram: sellerProfile?.instagram,
              musicLink: sellerProfile?.musicLink,
              completenessPercent: sellerProfile?.completenessPercent ?? 0,
            },
            sellerId,
            status: data.status || 'active',
          });
        }
      } catch (error) {
        console.error('Failed to load listing:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchItem();
  }, [id]);

  // 👇 下面這些原本的函數都要乖乖留著！不要動它們！
  // 當圖片滑動時，更新底下的小圓點
  const handleScroll = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = Math.floor(event.nativeEvent.contentOffset.x / slideSize);
    if (index !== activeImage) {
      setActiveImage(index);
    }
  };

  const handleContactSeller = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('請先登入', '登入後才能聯絡賣家', [
        { text: '取消', style: 'cancel' },
        { text: '前往登入', onPress: () => router.push('/login') },
      ]);
      return;
    }

    if (!item?.sellerId) {
      Alert.alert('無法聯絡', '此商品尚未綁定賣家帳號。');
      return;
    }

    if (user.uid === item.sellerId) {
      Alert.alert('提示', '這是你自己的商品喔！');
      return;
    }

    setContacting(true);
    try {
      const buyerName = await getDisplayNameForUser(user.uid, user.email);
      const conversationId = await getOrCreateConversation({
        listingId: item.id,
        buyerId: user.uid,
        sellerId: item.sellerId,
        listingTitle: item.title,
        listingPrice: item.price,
        listingImage: item.images?.[0] || DEFAULT_IMAGE,
        buyerName,
        sellerName: item.seller.name,
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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.tile} />
        <Text style={styles.loadingText}>載入商品中...</Text>
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>找不到這件商品</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>返回市集</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* --- 1. 多張圖片滑動展示區 (Image Swiper) --- */}
        <View style={styles.imageGallery}>
          <ScrollView 
            horizontal 
            pagingEnabled 
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {item.images.map((img: string, index: number) => (
              <Image key={index} source={{ uri: img }} style={styles.galleryImage} />
            ))}
          </ScrollView>
          
          {/* 圖片指示器 (小圓點) */}
          <View style={styles.pagination}>
            {item.images.map((_: string, index: number) => (
              <View key={index} style={[styles.dot, activeImage === index && styles.activeDot]} />
            ))}
          </View>
        </View>

        {hasListingVideoLink(item.videoUrl) ? (
          <View style={styles.videoHighlightWrap}>
            <View style={styles.videoHighlightBadge}>
              <Text style={styles.videoHighlightBadgeText}>有試音</Text>
            </View>
            <ListingVideoPlayer videoUrl={item.videoUrl} compact />
          </View>
        ) : null}

        <View style={styles.content}>
          {isListingSold(item.status) && (
            <View style={styles.soldBanner}>
              <Text style={styles.soldBannerText}>此商品已售出</Text>
            </View>
          )}
          {/* --- 2. 商品基礎資訊 --- */}
          <View style={styles.infoSection}>
            <View style={styles.badgeRow}>
              <Text style={styles.categoryBadge}>{item.category}</Text>
              <Text style={styles.conditionBadge}>{item.condition}</Text>
            </View>
            <View style={styles.signalRow}>
              <ListingSignalBadges
                hasDemoVideo={hasListingVideoLink(item.videoUrl)}
                hasCompleteSpecs={item.hasCompleteSpecs}
                identityLabel={getIdentityBadgeLabel(item.seller.completenessPercent ?? 0)}
              />
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.price}>HK$ {item.price}</Text>
          </View>

          <Text style={styles.sectionTitle}>放售人</Text>
          <SellerIdentityCard
            sellerId={item.sellerId}
            seller={{
              displayName: item.seller.name,
              avatarUrl: item.seller.avatarUrl,
              joinDate: item.seller.joinDate,
              region: item.seller.region,
              primaryInstrument: item.seller.primaryInstrument,
              bio: item.seller.bio,
              instagram: item.seller.instagram,
              musicLink: item.seller.musicLink,
              completenessPercent: item.seller.completenessPercent,
              creditScore: item.seller.credit,
              avgRating: item.seller.avgRating,
              ratingCount: item.seller.trades,
            }}
            onPressProfile={
              item.sellerId
                ? () =>
                    router.push({
                      pathname: '/seller-profile',
                      params: {
                        sellerId: item.sellerId,
                        listingId: item.id,
                        sellerName: item.seller.name,
                      },
                    })
                : undefined
            }
          />

          {/* --- 5. 詳細規格 --- */}
          {item.specRows?.length > 0 && (
            <View style={styles.specSection}>
              <Text style={styles.sectionTitle}>商品規格</Text>
              <View style={styles.specGrid}>
                {item.specRows.map((row: { label: string; value: string }) => (
                  <View key={row.label} style={styles.specRow}>
                    <Text style={styles.specLabel}>{row.label}</Text>
                    <Text style={styles.specValue}>{row.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* --- 6. 詳細描述 --- */}
          <View style={styles.descSection}>
            <Text style={styles.sectionTitle}>賣家補充描述</Text>
            <Text style={styles.description}>{item.description}</Text>
          </View>

          <TradePolicyNote showSafetyTip />

          {/* 底部留白，避免被聯絡按鈕擋住 */}
          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* --- 7. 固定在底部的操作列 (Bottom Action Bar) --- */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.favoriteBtn} onPress={() => toggleFavorite(item)}>
          <Ionicons
            name={isFav ? 'heart' : 'heart-outline'}
            size={22}
            color={isFav ? '#EF4444' : '#2C2C2C'}
            style={styles.favoriteIcon}
          />
          <Text style={[styles.favoriteText, isFav && { color: '#EF4444' }]}>
            {isFav ? '已收藏' : '收藏'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.contactBtn, contacting && styles.contactBtnDisabled]}
          onPress={handleContactSeller}
          disabled={contacting}
        >
          <Text style={styles.contactBtnText}>{contacting ? '開啟中...' : '聯絡賣家'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { flex: 1, backgroundColor: '#F4EEDD', alignItems: 'center', justifyContent: 'center', padding: 30 },
  loadingText: { marginTop: 12, fontSize: 16, color: '#8A7B72' },
  errorIcon: { fontSize: 48, marginBottom: 12 },
  errorTitle: { fontSize: 18, fontWeight: 'bold', color: '#4A3B32', marginBottom: 20 },
  backBtn: { backgroundColor: '#C35A2C', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  backBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  
  // 圖片滑動區
  imageGallery: { width: '100%', height: width }, // 設為正方形
  galleryImage: { width: width, height: width, resizeMode: 'cover' },
  pagination: { position: 'absolute', bottom: 15, flexDirection: 'row', width: '100%', justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.4)', marginHorizontal: 4 },
  activeDot: { backgroundColor: '#FFFFFF', width: 16 },

  content: { padding: 20 },
  soldBanner: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  soldBannerText: { color: '#B91C1C', fontWeight: 'bold', fontSize: 15 },
  
  // 基礎資訊
  infoSection: { marginBottom: 20 },
  badgeRow: { flexDirection: 'row', marginBottom: 8, flexWrap: 'wrap' },
  signalRow: { marginBottom: 10 },
  categoryBadge: { backgroundColor: '#F3F4F6', color: '#4B5563', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, fontSize: 12, fontWeight: 'bold', marginRight: 8 },
  conditionBadge: { backgroundColor: '#FEF3C7', color: '#D97706', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, fontSize: 12, fontWeight: 'bold' },
  title: { fontSize: 24, fontWeight: '900', color: '#111111', marginBottom: 8, lineHeight: 32 },
  price: { fontSize: 28, fontWeight: '900', color: '#D97706' },

  videoHighlightWrap: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
    backgroundColor: colors.background,
  },
  videoHighlightBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.tile,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.sm,
    marginBottom: 10,
  },
  videoHighlightBadgeText: { fontSize: 11, fontWeight: '800', color: colors.textOnTile },

  // 詳細描述
  specSection: { marginBottom: 25 },
  specGrid: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: 16,
    gap: 12,
  },
  specRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  specLabel: { flex: 1, fontSize: 13, color: '#6B7280', fontWeight: '600' },
  specValue: { flex: 1.2, fontSize: 14, color: '#111111', fontWeight: '600', textAlign: 'right' },
  descSection: { marginBottom: 25 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111111', marginBottom: 12 },
  description: { fontSize: 16, color: '#374151', lineHeight: 26 },

  // 底部固定操作列
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', flexDirection: 'row', padding: 15, paddingBottom: 30, borderTopWidth: 1, borderTopColor: '#EEEEEE', alignItems: 'center' },
  favoriteBtn: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  favoriteIcon: { fontSize: 24, marginBottom: 2 },
  favoriteText: { fontSize: 10, color: '#666666', fontWeight: 'bold' },
  contactBtn: { flex: 1, backgroundColor: '#111111', paddingVertical: 16, borderRadius: 30, alignItems: 'center', marginLeft: 10 },
  contactBtnDisabled: { opacity: 0.6 },
  contactBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});