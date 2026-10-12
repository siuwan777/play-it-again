import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { useInboxBadge } from '../../hooks/useInboxBadge';
import { useBlockedUserIds } from '../../hooks/useBlockedUserIds';
import { getDisplaySellerName } from '../../utils/getDisplaySellerName';
import { colors, radii } from '../../constants/theme';
import { getCategoryLabel, MARKETPLACE_CATEGORIES } from '../../utils/listingCategories';
import { areRequiredSpecsComplete } from '../../utils/listingSpecs';
import { hasListingVideoLink } from '../../utils/listingVideo';
import { useSellerPublicMeta } from '../../hooks/useSellerPublicMeta';
import { ListingSignalBadges } from '../../components/ListingSignalBadges';
import {
  getIdentityBadgeLabel,
  isTrustedSeller,
  isVerifiableSeller,
  shouldShowSellerRegion,
} from '../../utils/profileCompleteness';

const CATEGORIES = MARKETPLACE_CATEGORIES;

export default function Marketplace() {
  const router = useRouter();
  
  // 📦 裝真實雲端資料的箱子 (取代原本的 MOCK_LISTINGS)
  const [listings, setListings] = useState<any[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [showFilter, setShowFilter] = useState(false);
  const [filterPrice, setFilterPrice] = useState('all');
  const [filterCondition, setFilterCondition] = useState('all');
  const [filterDemoAudio, setFilterDemoAudio] = useState(false);
  const [filterTrustedSellers, setFilterTrustedSellers] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { badgeCount: inboxBadgeCount } = useInboxBadge();
  const { blockedUserIds } = useBlockedUserIds();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(Boolean(user));
    });
    return unsubscribeAuth;
  }, []);

  // 🚀 掛上 Firebase 真實資料監聽天線
  useEffect(() => {
    // 設定查詢條件：去 guitars 倉庫找，並依照建立時間(createdAt)新到舊排序
    const q = query(collection(db, 'guitars'), orderBy('createdAt', 'desc'));
    
    // onSnapshot 會像雷達一樣，資料庫一有變化就馬上通知 App 更新畫面
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedGuitars = snapshot.docs
        .filter((docSnap) => docSnap.data().status !== 'sold')
        .map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          userId: data.userId || '',
          title: data.title || '無標題',
          price: data.price ? data.price.toString() : '0', 
          category: data.category || '',
          condition: data.condition || '二手',
          seller: getDisplaySellerName(data),
          image: data.imageUrls?.[0] || data.imageUrl || 'https://images.unsplash.com/photo-1550291652-6ea9114a47b1?q=80&w=800&auto=format&fit=crop',
          hasDemoAudio: hasListingVideoLink(data.videoLink),
          hasCompleteSpecs: areRequiredSpecsComplete(data.category || '', data.specs),
          createdAtMillis:
            data.createdAt?.toMillis?.() ?? (data.createdAt?.seconds ? data.createdAt.seconds * 1000 : 0),
        };
      });
      setListings(fetchedGuitars); // 把抓下來的資料放進箱子裡
    });

    return () => unsubscribe(); // 離開畫面時關閉雷達，節省效能
  }, []);

  const sellerIds = useMemo(
    () => listings.map((item) => item.userId).filter(Boolean) as string[],
    [listings]
  );
  const sellerMetaByUserId = useSellerPublicMeta(sellerIds);

  // 篩選邏輯 (使用真實抓下來的 listings)
  const filteredListings = listings.filter(item => {
    if (item.userId && blockedUserIds.has(item.userId)) {
      return false;
    }

    const matchCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());

    let matchCondition = true;
    if (filterCondition === 'new') matchCondition = item.condition === '全新';
    if (filterCondition === 'used') matchCondition = item.condition !== '全新';

    const numericPrice = parseInt(item.price.replace(/,/g, ''), 10) || 0;
    let matchPrice = true;
    if (filterPrice === 'under1k') matchPrice = numericPrice >= 0 && numericPrice <= 999;
    if (filterPrice === '1k_9999') matchPrice = numericPrice >= 1000 && numericPrice <= 9999;
    if (filterPrice === '10k_20k') matchPrice = numericPrice >= 10000 && numericPrice <= 20000;
    if (filterPrice === 'over20k') matchPrice = numericPrice > 20000;

    const matchDemoAudio = !filterDemoAudio || item.hasDemoAudio;

    const sellerCompleteness = item.userId
      ? sellerMetaByUserId[item.userId]?.completenessPercent ?? 0
      : 0;
    const matchTrusted =
      !filterTrustedSellers || isTrustedSeller(sellerCompleteness);

    return (
      matchCategory &&
      matchSearch &&
      matchCondition &&
      matchPrice &&
      matchDemoAudio &&
      matchTrusted
    );
  });

  const displayListings = useMemo(() => {
    return [...filteredListings].sort((a, b) => {
      const scoreA = a.userId ? sellerMetaByUserId[a.userId]?.completenessPercent ?? 0 : 0;
      const scoreB = b.userId ? sellerMetaByUserId[b.userId]?.completenessPercent ?? 0 : 0;
      const trustedA = isTrustedSeller(scoreA) ? 1 : 0;
      const trustedB = isTrustedSeller(scoreB) ? 1 : 0;
      if (trustedB !== trustedA) return trustedB - trustedA;
      return (b.createdAtMillis ?? 0) - (a.createdAtMillis ?? 0);
    });
  }, [filteredListings, sellerMetaByUserId]);

  const worthContactingListings = useMemo(
    () =>
      displayListings.filter((item) =>
        isVerifiableSeller(item.userId ? sellerMetaByUserId[item.userId]?.completenessPercent ?? 0 : 0)
      ),
    [displayListings, sellerMetaByUserId]
  );

  const activeFiltersCount =
    (activeCategory !== 'all' ? 1 : 0) +
    (filterPrice !== 'all' ? 1 : 0) +
    (filterCondition !== 'all' ? 1 : 0) +
    (filterDemoAudio ? 1 : 0) +
    (filterTrustedSellers ? 1 : 0);

  return (
    <View style={styles.container}>
      <View style={styles.bannerContainer}>
        <View style={styles.bannerAccentBar} />
        <View style={styles.bannerBadge}>
          <Text style={styles.bannerBadgeText}>貨寫得明 · 人睇得清</Text>
        </View>
        <View style={styles.logoRow}>
          <Text style={styles.bannerTitle}>Play it again</Text>
          <View style={styles.bannerTagPill}>
            <Text style={styles.bannerTagText}>市集</Text>
          </View>
        </View>
        <Text style={styles.bannerSub}>香港樂手二手樂器市集</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => (isLoggedIn ? router.push('/(tabs)/messages') : router.push('/login'))}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.textOnTile} />
            {isLoggedIn && inboxBadgeCount > 0 && (
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>
                  {inboxBadgeCount > 9 ? '9+' : inboxBadgeCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => (isLoggedIn ? router.push('/notifications') : router.push('/login'))}
          >
            <Ionicons name={isLoggedIn ? 'notifications-outline' : 'person-outline'} size={22} color={colors.textOnTile} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchBlock}>
        <View style={styles.searchSection}>
          <View style={styles.searchBarWrapper}>
            <Ionicons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput style={styles.searchInput} placeholder="搜尋結他、效果器..." placeholderTextColor={colors.textMuted} value={searchQuery} onChangeText={setSearchQuery} />
          </View>
          <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilter(true)}>
            <Ionicons name="options-outline" size={22} color={colors.textSecondary} />
            {activeFiltersCount > 0 && <View style={styles.filterBadge}><Text style={styles.filterBadgeText}>{activeFiltersCount}</Text></View>}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.listContainer} contentContainerStyle={styles.listContent}>
        {worthContactingListings.length > 0 ? (
          <View style={styles.spotlightSection}>
            <Text style={styles.spotlightTitle}>值得聯絡</Text>
            <Text style={styles.spotlightSub}>檔案可核對身份的放售人，買家較易信任</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.spotlightRow}
            >
              {worthContactingListings.map((item) => {
                const sellerMeta = item.userId ? sellerMetaByUserId[item.userId] : undefined;
                const region = shouldShowSellerRegion(
                  sellerMeta?.completenessPercent ?? 0,
                  sellerMeta?.region
                )
                  ? sellerMeta?.region
                  : null;

                return (
                  <TouchableOpacity
                    key={`spotlight-${item.id}`}
                    style={styles.spotlightCard}
                    activeOpacity={0.8}
                    onPress={() => router.push({ pathname: '/details', params: { id: item.id } })}
                  >
                    <Image source={{ uri: item.image }} style={styles.spotlightImage} />
                    <ListingSignalBadges
                      hasDemoVideo={item.hasDemoAudio}
                      hasCompleteSpecs={item.hasCompleteSpecs}
                      identityLabel="可核對身份"
                    />
                    <Text style={styles.spotlightCardTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={styles.spotlightPrice}>HK$ {item.price}</Text>
                    <Text style={styles.spotlightSeller} numberOfLines={1}>
                      {item.seller}
                      {region ? ` · ${region}` : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.list}>
          {displayListings.length > 0 ? (
            displayListings.map((item) => {
              const sellerMeta = item.userId ? sellerMetaByUserId[item.userId] : undefined;
              const sellerCompleteness = sellerMeta?.completenessPercent ?? 0;
              const sellerAvatar = sellerMeta?.avatarUrl;
              const identityLabel = getIdentityBadgeLabel(sellerCompleteness);
              const region = shouldShowSellerRegion(sellerCompleteness, sellerMeta?.region)
                ? sellerMeta?.region
                : null;

              return (
              <TouchableOpacity
                key={item.id}
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => router.push({ pathname: '/details', params: { id: item.id } })}
              >
                <View style={styles.thumbWrap}>
                  <Image source={{ uri: item.image }} style={styles.thumbImage} />
                </View>
                  <View style={styles.cardBody}>
                  <Text style={styles.cardMeta} numberOfLines={1}>
                    {getCategoryLabel(item.category)} · {item.condition}
                  </Text>
                  {item.hasDemoAudio || item.hasCompleteSpecs || identityLabel ? (
                    <View style={styles.cardBadgeRow}>
                      <ListingSignalBadges
                        hasDemoVideo={item.hasDemoAudio}
                        hasCompleteSpecs={item.hasCompleteSpecs}
                        identityLabel={identityLabel}
                      />
                    </View>
                  ) : null}
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <View style={styles.sellerRow}>
                    {sellerAvatar ? (
                      <Image source={{ uri: sellerAvatar }} style={styles.sellerAvatar} />
                    ) : (
                      <View style={styles.sellerAvatarPlaceholder}>
                        <Text style={styles.sellerAvatarLetter}>
                          {item.seller.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.sellerName} numberOfLines={1}>
                      {item.seller}
                      {region ? ` · ${region}` : ''}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
            })
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>目前市集還沒有樂器</Text>
              <Text style={styles.emptyStateSub}>趕快成為第一個放售的人吧！</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={showFilter} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>篩選</Text>
              <TouchableOpacity onPress={() => setShowFilter(false)}><Ionicons name="close" size={28} color={colors.text} /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>商品分類</Text>
                <View style={styles.categoryGrid}>
                  {CATEGORIES.map((cat) => {
                    const selected = activeCategory === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[styles.categoryGridItem, selected && styles.categoryGridItemActive]}
                        onPress={() => setActiveCategory(cat.id)}
                      >
                        <Text style={[styles.categoryGridText, selected && styles.categoryGridTextActive]} numberOfLines={2}>
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>價格範圍</Text>
                <View style={styles.filterOptionsRow}>
                  {(
                    [
                      { id: 'all', label: '全部' },
                      { id: 'under1k', label: '$0–$999' },
                      { id: '1k_9999', label: '$1k–$9,999' },
                      { id: '10k_20k', label: '$10k–$20k' },
                      { id: 'over20k', label: '$20k 以上' },
                    ] as const
                  ).map((option) => (
                    <TouchableOpacity
                      key={option.id}
                      style={[styles.optionBtn, filterPrice === option.id && styles.optionBtnActive]}
                      onPress={() => setFilterPrice(option.id)}
                    >
                      <Text style={[styles.optionText, filterPrice === option.id && styles.optionTextActive]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>新舊程度</Text>
                <View style={styles.filterOptionsRow}>
                  {['all', 'new', 'used'].map(val => (
                    <TouchableOpacity key={val} style={[styles.optionBtn, filterCondition === val && styles.optionBtnActive]} onPress={() => setFilterCondition(val)}>
                      <Text style={[styles.optionText, filterCondition === val && styles.optionTextActive]}>{val === 'all' ? '全部' : val === 'new' ? '全新' : '二手'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.switchSection}>
                <View style={styles.switchTextWrap}>
                  <Text style={styles.filterSectionTitle}>有試音</Text>
                  <Text style={styles.switchSub}>只顯示附有試音／實測影片的商品</Text>
                </View>
                <Switch
                  value={filterDemoAudio}
                  onValueChange={setFilterDemoAudio}
                  trackColor={{ false: colors.border, true: colors.tile }}
                  thumbColor={colors.onPrimary}
                />
              </View>
              <View style={styles.switchSection}>
                <View style={styles.switchTextWrap}>
                  <Text style={styles.filterSectionTitle}>較可信賣家</Text>
                  <Text style={styles.switchSub}>只顯示「身份較齊」或「可核對身份」的放售人</Text>
                </View>
                <Switch
                  value={filterTrustedSellers}
                  onValueChange={setFilterTrustedSellers}
                  trackColor={{ false: colors.border, true: colors.tile }}
                  thumbColor={colors.onPrimary}
                />
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={() => {
                  setActiveCategory('all');
                  setFilterPrice('all');
                  setFilterCondition('all');
                  setFilterDemoAudio(false);
                  setFilterTrustedSellers(false);
                }}
              >
                <Text style={styles.resetBtnText}>重設</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={() => setShowFilter(false)}><Text style={styles.applyBtnText}>套用篩選 ({displayListings.length} 件)</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  bannerContainer: {
    backgroundColor: colors.tile,
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 18,
    position: 'relative',
    overflow: 'hidden',
    borderBottomLeftRadius: radii.lg,
    borderBottomRightRadius: radii.lg,
  },
  bannerAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  bannerBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  bannerBadgeText: { color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    paddingRight: 100,
    gap: 10,
  },
  bannerTitle: { flex: 1, fontSize: 26, fontWeight: '800', color: colors.textOnTile, letterSpacing: -0.3 },
  bannerTagPill: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  bannerTagText: { fontSize: 11, fontWeight: '700', color: colors.textOnTile },
  bannerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  headerActions: {
    position: 'absolute',
    top: 56,
    right: 16,
    flexDirection: 'row',
    gap: 8,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.tile,
  },
  headerBadgeText: { color: colors.onPrimary, fontSize: 10, fontWeight: 'bold' },
  searchBlock: {
    backgroundColor: colors.paper,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    borderBottomLeftRadius: radii.lg,
    borderBottomRightRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopWidth: 0,
  },
  searchSection: { flexDirection: 'row', alignItems: 'center' },
  searchBarWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.mutedFill,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16, color: colors.text },
  filterButton: {
    width: 46,
    height: 46,
    backgroundColor: colors.mutedFill,
    borderRadius: 12,
    marginLeft: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.danger,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  filterBadgeText: { color: colors.onPrimary, fontSize: 10, fontWeight: 'bold' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryGridItem: {
    width: '31%',
    minWidth: 100,
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryGridItemActive: { backgroundColor: colors.tile, borderColor: colors.tile },
  categoryGridIcon: { fontSize: 26, marginBottom: 6 },
  categoryGridText: { fontSize: 13, color: colors.text, fontWeight: '600', textAlign: 'center' },
  categoryGridTextActive: { color: colors.textOnTile },
  listContainer: { flex: 1, backgroundColor: colors.background },
  listContent: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 48, backgroundColor: colors.background },
  list: { gap: 0 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderRadius: radii.lg,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumbWrap: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: colors.mutedFill,
    overflow: 'hidden',
  },
  thumbImage: { width: '100%', height: '100%', resizeMode: 'contain' },
  cardBody: { flex: 1, minWidth: 0 },
  cardBadgeRow: {
    marginBottom: 6,
  },
  cardMeta: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
    marginBottom: 6,
  },
  cardTitle: { fontSize: 15, fontWeight: '500', color: colors.text, lineHeight: 22, marginBottom: 8 },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sellerAvatar: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.mutedFill },
  sellerAvatarPlaceholder: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.mutedFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerAvatarLetter: { fontSize: 10, fontWeight: '800', color: colors.textSecondary },
  sellerName: { flex: 1, fontSize: 12, color: colors.textMuted, fontWeight: '400' },
  spotlightSection: { marginBottom: 8 },
  spotlightTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 4 },
  spotlightSub: { fontSize: 12, color: colors.textMuted, marginBottom: 12, lineHeight: 18 },
  spotlightRow: { gap: 12, paddingRight: 8, paddingBottom: 8 },
  spotlightCard: {
    width: 168,
    backgroundColor: colors.paper,
    borderRadius: radii.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  spotlightImage: {
    width: '100%',
    height: 100,
    borderRadius: 10,
    backgroundColor: colors.mutedFill,
    resizeMode: 'cover',
  },
  spotlightCardTitle: { fontSize: 14, fontWeight: '600', color: colors.text, lineHeight: 20 },
  spotlightPrice: { fontSize: 14, fontWeight: '800', color: colors.text },
  spotlightSeller: { fontSize: 12, color: colors.textMuted },
  emptyState: { width: '100%', alignItems: 'center', paddingVertical: 60 },
  emptyStateIcon: { fontSize: 50, marginBottom: 10 },
  emptyStateText: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 5 },
  emptyStateSub: { fontSize: 14, color: colors.textMuted },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  filterSection: { marginBottom: 25 },
  filterSectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 12 },
  filterOptionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  optionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionBtnActive: { backgroundColor: colors.tile, borderColor: colors.tile },
  optionText: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
  optionTextActive: { color: colors.textOnTile, fontWeight: 'bold' },
  switchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    padding: 15,
    backgroundColor: colors.mutedFill,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  switchTextWrap: { flex: 1, paddingRight: 12 },
  switchSub: { fontSize: 12, color: colors.textMuted, marginTop: 4, lineHeight: 18 },
  modalFooter: { flexDirection: 'row', gap: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: colors.border },
  resetBtn: { flex: 1, paddingVertical: 16, borderRadius: 999, backgroundColor: colors.paper, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  resetBtnText: { color: colors.textSecondary, fontSize: 16, fontWeight: 'bold' },
  applyBtn: { flex: 2, paddingVertical: 16, borderRadius: 999, backgroundColor: colors.tile, alignItems: 'center' },
  applyBtnText: { color: colors.onPrimary, fontSize: 16, fontWeight: 'bold' },
});