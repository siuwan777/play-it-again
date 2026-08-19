import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { useInboxBadge } from '../../hooks/useInboxBadge';
import { useBlockedUserIds } from '../../hooks/useBlockedUserIds';
import { getDisplaySellerName } from '../../utils/getDisplaySellerName';
import { MARKETPLACE_CATEGORIES } from '../../utils/listingCategories';

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
  const [filterOfficial, setFilterOfficial] = useState(false);
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
          verified: false,
          isOfficialPickup: false,
          image: data.imageUrls?.[0] || data.imageUrl || 'https://images.unsplash.com/photo-1550291652-6ea9114a47b1?q=80&w=800&auto=format&fit=crop' 
        };
      });
      setListings(fetchedGuitars); // 把抓下來的資料放進箱子裡
    });

    return () => unsubscribe(); // 離開畫面時關閉雷達，節省效能
  }, []);

  // 篩選邏輯 (使用真實抓下來的 listings)
  const filteredListings = listings.filter(item => {
    if (item.userId && blockedUserIds.has(item.userId)) {
      return false;
    }

    const matchCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchOfficial = !filterOfficial || item.isOfficialPickup;

    let matchCondition = true;
    if (filterCondition === 'new') matchCondition = item.condition === '全新';
    if (filterCondition === 'used') matchCondition = item.condition !== '全新';

    const numericPrice = parseInt(item.price.replace(/,/g, ''), 10);
    let matchPrice = true;
    if (filterPrice === 'low') matchPrice = numericPrice < 1000;
    if (filterPrice === 'mid') matchPrice = numericPrice >= 1000 && numericPrice <= 5000;
    if (filterPrice === 'high') matchPrice = numericPrice > 5000;

    return matchCategory && matchSearch && matchOfficial && matchCondition && matchPrice;
  });

  const activeFiltersCount = (filterPrice !== 'all' ? 1 : 0) + (filterCondition !== 'all' ? 1 : 0) + (filterOfficial ? 1 : 0);

  return (
    <View style={styles.container}>
      <View style={styles.bannerContainer}>
        <View style={styles.bannerBadge}>
          <Text style={styles.bannerBadgeText}>首年完全免費 0% 手續費 🎉</Text>
        </View>
        <View style={styles.logoRow}>
          <Text style={styles.bannerTitle}>
            Play it <Text style={{color: '#DCA744'}}>again</Text>
          </Text>
        </View>
        <Text style={styles.bannerSub}>香港首個專為樂手設計的二手樂器社群</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => (isLoggedIn ? router.push('/(tabs)/messages') : router.push('/login'))}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={24} color="#F4EEDD" />
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
            <Ionicons name={isLoggedIn ? 'notifications-outline' : 'person-outline'} size={24} color="#F4EEDD" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchBarWrapper}>
          <Ionicons name="search" size={20} color="#4A3B32" style={styles.searchIcon} />
          <TextInput style={styles.searchInput} placeholder="搜尋結他、效果器..." placeholderTextColor="#8A7B72" value={searchQuery} onChangeText={setSearchQuery} />
        </View>
        <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilter(true)}>
          <Ionicons name="options-outline" size={24} color="#4A3B32" />
          {activeFiltersCount > 0 && <View style={styles.filterBadge}><Text style={styles.filterBadgeText}>{activeFiltersCount}</Text></View>}
        </TouchableOpacity>
      </View>

      <View style={styles.categoryContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity key={cat.id} style={[styles.categoryButton, activeCategory === cat.id && styles.categoryButtonActive]} onPress={() => setActiveCategory(cat.id)}>
              <Text style={[styles.categoryText, activeCategory === cat.id && styles.categoryTextActive]}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.listContainer} contentContainerStyle={styles.listContent}>
        <View style={styles.grid}>
          {filteredListings.length > 0 ? (
            filteredListings.map(item => (
              <TouchableOpacity key={item.id} style={styles.card} onPress={() => router.push({ pathname: '/details', params: { id: item.id } })}>
                <View style={styles.imageContainer}>
                  <Image source={{ uri: item.image }} style={styles.cardImage} />
                  <View style={styles.conditionBadge}><Text style={styles.conditionText}>{item.condition}</Text></View>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                  <Text style={styles.cardPrice}>HK$ {item.price}</Text>
                  <View style={styles.sellerRow}>
                    <View style={styles.sellerAvatar}><Text style={styles.sellerAvatarText}>{item.seller.charAt(0)}</Text></View>
                    <Text style={styles.sellerName} numberOfLines={1}>{item.seller}</Text>
                    {item.isOfficialPickup && <Text style={{fontSize: 12, marginLeft: 'auto'}}>🛡️</Text>}
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>🔍</Text>
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
              <Text style={styles.modalTitle}>進階篩選</Text>
              <TouchableOpacity onPress={() => setShowFilter(false)}><Ionicons name="close" size={28} color="#4A3B32" /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>💰 價格範圍</Text>
                <View style={styles.filterOptionsRow}>
                  {['all', 'low', 'mid', 'high'].map(val => (
                    <TouchableOpacity key={val} style={[styles.optionBtn, filterPrice === val && styles.optionBtnActive]} onPress={() => setFilterPrice(val)}>
                      <Text style={[styles.optionText, filterPrice === val && styles.optionTextActive]}>{val === 'all' ? '全部' : val === 'low' ? '$1k 以下' : val === 'mid' ? '$1k-$5k' : '$5k 以上'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>✨ 新舊程度</Text>
                <View style={styles.filterOptionsRow}>
                  {['all', 'new', 'used'].map(val => (
                    <TouchableOpacity key={val} style={[styles.optionBtn, filterCondition === val && styles.optionBtnActive]} onPress={() => setFilterCondition(val)}>
                      <Text style={[styles.optionText, filterCondition === val && styles.optionTextActive]}>{val === 'all' ? '全部' : val === 'new' ? '全新' : '二手'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.switchSection}>
                <View style={{flex: 1}}>
                  <Text style={styles.filterSectionTitle}>🛡️ 安全交收</Text>
                  <Text style={styles.switchSub}>只顯示提供「官方自取點」的樂器</Text>
                </View>
                <Switch value={filterOfficial} onValueChange={setFilterOfficial} trackColor={{ false: '#E0D8C8', true: '#C35A2C' }} thumbColor="#FFFFFF" />
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.resetBtn} onPress={() => {setFilterPrice('all'); setFilterCondition('all'); setFilterOfficial(false);}}><Text style={styles.resetBtnText}>重設</Text></TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={() => setShowFilter(false)}><Text style={styles.applyBtnText}>套用篩選 ({filteredListings.length} 件)</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ... 你的 styles 完全不用動，直接保留！
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4EEDD' },
  bannerContainer: { backgroundColor: '#4A3B32', padding: 20, paddingTop: 60, paddingBottom: 20, position: 'relative' },
  bannerBadge: { backgroundColor: '#C35A2C', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 12 },
  bannerBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  logoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  logoCat: { fontSize: 32, marginRight: 8 },
  bannerTitle: { fontSize: 32, fontWeight: '900', color: '#F4EEDD', letterSpacing: -0.5 },
  bannerSub: { fontSize: 13, color: '#D0C8B8', marginTop: 4 },
  headerActions: {
    position: 'absolute',
    top: 60,
    right: 16,
    flexDirection: 'row',
    gap: 8,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(244, 238, 221, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#4A3B32',
  },
  headerBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
  searchSection: { flexDirection: 'row', padding: 15, backgroundColor: '#FFFFFF', alignItems: 'center' },
  searchBarWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4EEDD', borderRadius: 12, paddingHorizontal: 12, height: 46 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16, color: '#4A3B32' },
  filterButton: { width: 46, height: 46, backgroundColor: '#F4EEDD', borderRadius: 12, marginLeft: 10, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  filterBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#C35A2C', width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
  filterBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
  categoryContainer: { backgroundColor: '#FFFFFF', paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#E0D8C8' },
  categoryScroll: { paddingHorizontal: 15, gap: 10 },
  categoryButton: { backgroundColor: '#F4EEDD', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#E0D8C8' },
  categoryButtonActive: { backgroundColor: '#4A3B32', borderColor: '#4A3B32' },
  categoryText: { fontSize: 14, color: '#4A3B32', fontWeight: '600' },
  categoryTextActive: { color: '#F4EEDD' },
  listContainer: { flex: 1 },
  listContent: { padding: 15, paddingBottom: 40 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '48%', backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 15, overflow: 'hidden', borderWidth: 1, borderColor: '#E0D8C8', shadowColor: '#4A3B32', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  imageContainer: { width: '100%', height: 160, backgroundColor: '#F4EEDD', position: 'relative' },
  cardImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  conditionBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  conditionText: { fontSize: 10, fontWeight: 'bold', color: '#4A3B32' },
  cardInfo: { padding: 12 },
  cardTitle: { fontSize: 14, fontWeight: 'bold', color: '#4A3B32', marginBottom: 6, lineHeight: 20, height: 40 },
  cardPrice: { fontSize: 18, fontWeight: '900', color: '#C35A2C', marginBottom: 12 },
  sellerRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F4EEDD', paddingTop: 10 },
  sellerAvatar: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#F4EEDD', alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  sellerAvatarText: { fontSize: 10, fontWeight: 'bold', color: '#4A3B32' },
  sellerName: { flex: 1, fontSize: 11, color: '#8A7B72', fontWeight: '500' },
  emptyState: { width: '100%', alignItems: 'center', paddingVertical: 60 },
  emptyStateIcon: { fontSize: 50, marginBottom: 10 },
  emptyStateText: { fontSize: 18, fontWeight: 'bold', color: '#4A3B32', marginBottom: 5 },
  emptyStateSub: { fontSize: 14, color: '#8A7B72' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(74, 59, 50, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#E0D8C8' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#4A3B32' },
  filterSection: { marginBottom: 25 },
  filterSectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#4A3B32', marginBottom: 12 },
  filterOptionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  optionBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#F4EEDD', borderWidth: 1, borderColor: '#E0D8C8' },
  optionBtnActive: { backgroundColor: '#FCEFE9', borderColor: '#C35A2C' },
  optionText: { fontSize: 14, color: '#8A7B72', fontWeight: '500' },
  optionTextActive: { color: '#C35A2C', fontWeight: 'bold' },
  switchSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30, padding: 15, backgroundColor: '#F4EEDD', borderRadius: 12, borderWidth: 1, borderColor: '#E0D8C8' },
  switchSub: { fontSize: 12, color: '#8A7B72', marginTop: 4 },
  modalFooter: { flexDirection: 'row', gap: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#E0D8C8' },
  resetBtn: { flex: 1, paddingVertical: 16, borderRadius: 30, backgroundColor: '#F4EEDD', alignItems: 'center' },
  resetBtnText: { color: '#8A7B72', fontSize: 16, fontWeight: 'bold' },
  applyBtn: { flex: 2, paddingVertical: 16, borderRadius: 30, backgroundColor: '#C35A2C', alignItems: 'center' },
  applyBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }
});