import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, Alert, Linking, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { getDisplaySellerName } from '../utils/getDisplaySellerName';
import { getCategoryLabel } from '../utils/listingCategories';
import { getConditionLabel, getSpecDisplayRows, normalizeSpecsFromFirestore } from '../utils/listingSpecs';
import { isListingSold } from '../utils/listingStatus';
import { getOrCreateConversation } from '../utils/chat';
import { getDisplayNameForUser } from '../utils/userProfile';
import { formatAvgRating, getRevieweeStats } from '../utils/transactionRating';
import { useFavorites } from './FavoritesContext';

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
          let sellerStats = { avgRating: 0, ratingCount: 0, creditScore: 0 };

          if (sellerId) {
            try {
              sellerStats = await getRevieweeStats(sellerId);
            } catch (error) {
              console.error('Failed to load seller stats:', error);
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
            description: data.description || '',
            videoUrl: data.videoLink || '',
            images: data.imageUrls?.length
              ? data.imageUrls
              : data.imageUrl
                ? [data.imageUrl]
                : [DEFAULT_IMAGE],
            seller: {
              name: getDisplaySellerName(data),
              verified: false,
              credit: sellerStats.creditScore,
              trades: sellerStats.ratingCount,
              avgRating: sellerStats.avgRating,
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

  const openVideo = () => {
    if (!item?.videoUrl) return;
    Alert.alert(
      '即將離開 App',
      '這將會打開外部連結觀看賣家的實測片段，確定要前往嗎？',
      [
        { text: '取消', style: 'cancel' },
        { text: '前往觀看', onPress: () => Linking.openURL(item.videoUrl) }
      ]
    );
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
        <ActivityIndicator size="large" color="#C35A2C" />
        <Text style={styles.loadingText}>載入商品中...</Text>
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorIcon}>😕</Text>
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
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.price}>HK$ {item.price}</Text>
          </View>

          {/* --- 3. 實測影片按鈕 (如果賣家有填寫才顯示) --- */}
          {item.videoUrl ? (
            <TouchableOpacity style={styles.videoButton} onPress={openVideo}>
              <Text style={styles.videoIcon}>▶️</Text>
              <View style={styles.videoTextContainer}>
                <Text style={styles.videoButtonTitle}>觀看實測 / 演出片段</Text>
                <Text style={styles.videoButtonSub}>聽聽它的真實音色</Text>
              </View>
            </TouchableOpacity>
          ) : null}

          {/* --- 4. 賣家資訊卡片 --- */}
          <View style={styles.sellerCard}>
            <View style={styles.sellerAvatar}>
              <Text style={styles.sellerAvatarText}>{item.seller.name.charAt(0)}</Text>
            </View>
            <View style={styles.sellerInfo}>
              <View style={styles.sellerNameRow}>
                <Text style={styles.sellerName}>{item.seller.name}</Text>
                {item.seller.verified && <Text style={styles.verifiedIcon}>✔️</Text>}
              </View>
              <Text style={styles.sellerStats}>
                ⭐ 信用分: {item.seller.credit}
                {item.seller.trades > 0
                  ? `  |  ★ ${formatAvgRating(item.seller.avgRating, item.seller.trades)} (${item.seller.trades} 則評價)`
                  : '  |  尚無評價'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.viewProfileBtn, !item.sellerId && styles.viewProfileBtnDisabled]}
              disabled={!item.sellerId}
              onPress={() =>
                router.push({
                  pathname: '/seller-profile',
                  params: {
                    sellerId: item.sellerId,
                    listingId: item.id,
                    sellerName: item.seller.name,
                  },
                })
              }
            >
              <Text style={styles.viewProfileText}>{item.sellerId ? '查看' : '—'}</Text>
            </TouchableOpacity>
          </View>

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

          {/* --- 7. 交收安全提示 --- */}
          <View style={styles.safetyBox}>
            <Text style={styles.safetyTitle}>🛡️ Play it again 安全交收提示</Text>
            <Text style={styles.safetyText}>
              強烈建議使用官方合作琴行自取點驗貨，免除街頭交收風險。
            </Text>
          </View>

          {/* 底部留白，避免被聯絡按鈕擋住 */}
          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* --- 7. 固定在底部的操作列 (Bottom Action Bar) --- */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.favoriteBtn} onPress={() => toggleFavorite(item)}>
          <Text style={styles.favoriteIcon}>{isFav ? '❤️' : '🤍'}</Text>
          <Text style={[styles.favoriteText, isFav && { color: '#EF4444' }]}>
            {isFav ? '已收藏' : '收藏'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.contactBtn, contacting && styles.contactBtnDisabled]}
          onPress={handleContactSeller}
          disabled={contacting}
        >
          <Text style={styles.contactBtnText}>{contacting ? '開啟中...' : '💬 聯絡賣家'}</Text>
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
  badgeRow: { flexDirection: 'row', marginBottom: 10 },
  categoryBadge: { backgroundColor: '#F3F4F6', color: '#4B5563', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, fontSize: 12, fontWeight: 'bold', marginRight: 8 },
  conditionBadge: { backgroundColor: '#FEF3C7', color: '#D97706', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, fontSize: 12, fontWeight: 'bold' },
  title: { fontSize: 24, fontWeight: '900', color: '#111111', marginBottom: 8, lineHeight: 32 },
  price: { fontSize: 28, fontWeight: '900', color: '#D97706' },

  // 影片按鈕
  videoButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FFEDD5', padding: 15, borderRadius: 12, marginBottom: 20 },
  videoIcon: { fontSize: 28, marginRight: 15 },
  videoTextContainer: { flex: 1 },
  videoButtonTitle: { fontSize: 16, fontWeight: 'bold', color: '#C2410C', marginBottom: 2 },
  videoButtonSub: { fontSize: 13, color: '#EA580C' },

  // 賣家卡片
  sellerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 16, borderRadius: 16, marginBottom: 25, borderWidth: 1, borderColor: '#F3F4F6' },
  sellerAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  sellerAvatarText: { fontSize: 20, fontWeight: 'bold', color: '#D97706' },
  sellerInfo: { flex: 1 },
  sellerNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  sellerName: { fontSize: 16, fontWeight: 'bold', color: '#111111' },
  verifiedIcon: { fontSize: 14, marginLeft: 4 },
  sellerStats: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  viewProfileBtn: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20 },
  viewProfileBtnDisabled: { opacity: 0.4 },
  viewProfileText: { fontSize: 12, fontWeight: 'bold', color: '#374151' },

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

  // 安全提示
  safetyBox: { backgroundColor: '#F0FDF4', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#BBF7D0' },
  safetyTitle: { fontSize: 14, fontWeight: 'bold', color: '#166534', marginBottom: 8 },
  safetyText: { fontSize: 13, color: '#15803D', lineHeight: 20 },

  // 底部固定操作列
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', flexDirection: 'row', padding: 15, paddingBottom: 30, borderTopWidth: 1, borderTopColor: '#EEEEEE', alignItems: 'center' },
  favoriteBtn: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  favoriteIcon: { fontSize: 24, marginBottom: 2 },
  favoriteText: { fontSize: 10, color: '#666666', fontWeight: 'bold' },
  contactBtn: { flex: 1, backgroundColor: '#111111', paddingVertical: 16, borderRadius: 30, alignItems: 'center', marginLeft: 10 },
  contactBtnDisabled: { opacity: 0.6 },
  contactBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});