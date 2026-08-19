import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';

export default function PremiumCenter() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'pro' | 'coins'>('pro');

  const handleSubscribe = () => {
    Alert.alert('跳轉至支付系統', '將會呼叫 Stripe 或 Apple Pay 進行每月 HK$ 68 的信用卡綁定與扣款。');
  };

  const handleBuyCoins = (amount: number, price: number) => {
    // 👇 已更名為 PlayCoin
    Alert.alert('購買 PlayCoin', `確定要以 HK$ ${price} 購買 ${amount} 枚金幣嗎？`);
  };

  const handleBoost = () => {
    Alert.alert('確認推廣', '將扣除 150 枚 PlayCoin，您的商品將在市集首頁置頂 3 天！');
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tabButton, activeTab === 'pro' && styles.tabButtonActive]} onPress={() => setActiveTab('pro')}>
          <Text style={[styles.tabText, activeTab === 'pro' && styles.tabTextActive]}>👑 專業賣家 (月費)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabButton, activeTab === 'coins' && styles.tabButtonActive]} onPress={() => setActiveTab('coins')}>
          <Text style={[styles.tabText, activeTab === 'coins' && styles.tabTextActive]}>🪙 金幣與推廣</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {activeTab === 'pro' && (
          <View>
            <View style={styles.proCard}>
              <View style={styles.proBadge}><Text style={styles.proBadgeText}>PRO</Text></View>
              {/* 👇 已更名為 Play it again */}
              <Text style={styles.proTitle}>Play it again 專業賣家</Text>
              <Text style={styles.proPrice}>HK$ 68 <Text style={styles.proPriceSub}>/ 月</Text></Text>
              <Text style={styles.proDesc}>適合擁有大量器材、或是獨立經營二手樂器買賣的進階玩家與店家。</Text>
              
              <View style={styles.featureList}>
                <Text style={styles.featureItem}>✅ 解除「最多 2 件商品」上架限制</Text>
                <Text style={styles.featureItem}>✅ 無上限同時放售您的所有樂器</Text>
                <Text style={styles.featureItem}>✅ 專屬 🛡️ 官方認證店家/專業徽章</Text>
                <Text style={styles.featureItem}>✅ 個人檔案支援加入實體店面地址</Text>
              </View>

              <TouchableOpacity style={styles.subscribeBtn} onPress={handleSubscribe}>
                <Text style={styles.subscribeBtnText}>立即升級 PRO</Text>
              </TouchableOpacity>
              <Text style={styles.cancelText}>隨時可取消訂閱，無合約綁定。</Text>
            </View>

            <View style={styles.statusBox}>
              <Text style={styles.statusTitle}>您目前的額度 (普通用戶)</Text>
              <Text style={styles.statusText}>已上架：1 / 2 件</Text>
              <View style={styles.progressBar}><View style={[styles.progressFill, {width: '50%'}]} /></View>
            </View>
          </View>
        )}

        {activeTab === 'coins' && (
          <View>
            <View style={styles.walletBox}>
              <Text style={styles.walletTitle}>目前持有 PlayCoin</Text>
              <Text style={styles.walletBalance}>🪙 250</Text>
              <Text style={styles.walletSub}>💡 提示：您可透過每日登入與完成評價免費賺取金幣！</Text>
            </View>

            <Text style={styles.sectionTitle}>為您的商品增加曝光 🚀</Text>
            <View style={styles.boostCard}>
              <View style={styles.boostInfo}>
                <Text style={styles.boostTitle}>首頁置頂 3 天</Text>
                <Text style={styles.boostDesc}>讓您的商品出現在搜尋結果的最上方。</Text>
              </View>
              <TouchableOpacity style={styles.actionBtn} onPress={handleBoost}>
                <Text style={styles.actionBtnText}>🪙 150 兌換</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>儲值 PlayCoin</Text>
            <View style={styles.coinPackages}>
              <TouchableOpacity style={styles.coinPkg} onPress={() => handleBuyCoins(500, 50)}>
                <Text style={styles.pkgCoins}>🪙 500</Text>
                <Text style={styles.pkgPrice}>HK$ 50</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.coinPkg, styles.coinPkgBest]} onPress={() => handleBuyCoins(1200, 100)}>
                {/* 🌟 復古青 (#4E878C) 作為超值標籤 */}
                <View style={styles.bestTag}><Text style={styles.bestTagText}>多送 20%</Text></View>
                <Text style={styles.pkgCoins}>🪙 1200</Text>
                <Text style={styles.pkgPrice}>HK$ 100</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4EEDD' }, // 奶油白
  tabContainer: { flexDirection: 'row', backgroundColor: '#FFFFFF', paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#E0D8C8' },
  tabButton: { flex: 1, paddingVertical: 15, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabButtonActive: { borderBottomColor: '#C35A2C' }, // 焦糖橘
  tabText: { fontSize: 15, color: '#8A7B72', fontWeight: 'bold' },
  tabTextActive: { color: '#C35A2C' },
  content: { padding: 20 },

  // Pro Card Styles (暖褐色主題)
  proCard: { backgroundColor: '#4A3B32', borderRadius: 20, padding: 25, position: 'relative', overflow: 'hidden', shadowColor: '#4A3B32', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  proBadge: { position: 'absolute', top: 0, right: 0, backgroundColor: '#C35A2C', paddingHorizontal: 15, paddingVertical: 6, borderBottomLeftRadius: 15 }, // 焦糖橘 Badge
  proBadgeText: { color: '#FFFFFF', fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  proTitle: { color: '#DCA744', fontSize: 18, fontWeight: 'bold', marginBottom: 10, marginTop: 10 }, // 芥末黃標題
  proPrice: { color: '#F4EEDD', fontSize: 40, fontWeight: '900', marginBottom: 10 },
  proPriceSub: { fontSize: 16, color: '#D0C8B8', fontWeight: 'normal' },
  proDesc: { color: '#D0C8B8', fontSize: 13, lineHeight: 20, marginBottom: 20 },
  featureList: { borderTopWidth: 1, borderTopColor: '#5C4A40', paddingTop: 20, marginBottom: 25 },
  featureItem: { color: '#F4EEDD', fontSize: 14, marginBottom: 12, fontWeight: '500' },
  subscribeBtn: { backgroundColor: '#C35A2C', borderRadius: 30, paddingVertical: 16, alignItems: 'center', marginBottom: 10 }, // 焦糖橘按鈕
  subscribeBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  cancelText: { color: '#D0C8B8', fontSize: 12, textAlign: 'center' },

  statusBox: { marginTop: 20, backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#E0D8C8' },
  statusTitle: { fontSize: 14, color: '#8A7B72', marginBottom: 8 },
  statusText: { fontSize: 18, fontWeight: 'bold', color: '#4A3B32', marginBottom: 12 },
  progressBar: { height: 8, backgroundColor: '#F4EEDD', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#DCA744' }, // 芥末黃進度條

  // Coins Styles
  walletBox: { backgroundColor: '#FDFBF7', padding: 25, borderRadius: 16, alignItems: 'center', marginBottom: 30, borderWidth: 1, borderColor: '#EADDCB' },
  walletTitle: { fontSize: 14, color: '#4A3B32', fontWeight: 'bold', marginBottom: 5 },
  walletBalance: { fontSize: 40, fontWeight: '900', color: '#DCA744', marginBottom: 10 }, // 芥末黃餘額
  walletSub: { fontSize: 12, color: '#C35A2C', textAlign: 'center' },

  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#4A3B32', marginBottom: 15 },
  boostCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#E0D8C8', marginBottom: 30 },
  boostInfo: { flex: 1, marginRight: 15 },
  boostTitle: { fontSize: 16, fontWeight: 'bold', color: '#4A3B32', marginBottom: 4 },
  boostDesc: { fontSize: 12, color: '#8A7B72', lineHeight: 18 },
  actionBtn: { backgroundColor: '#FDFBF7', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#DCA744' },
  actionBtnText: { color: '#DCA744', fontWeight: 'bold', fontSize: 14 },

  coinPackages: { flexDirection: 'row', gap: 15 },
  coinPkg: { flex: 1, backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#E0D8C8', alignItems: 'center' },
  coinPkgBest: { borderColor: '#C35A2C', borderWidth: 2, backgroundColor: '#FDFBF7', position: 'relative' }, // 焦糖橘邊框
  bestTag: { position: 'absolute', top: -12, backgroundColor: '#4E878C', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }, // 🌟 復古青標籤
  bestTagText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
  pkgCoins: { fontSize: 20, fontWeight: 'bold', color: '#4A3B32', marginBottom: 5, marginTop: 5 },
  pkgPrice: { fontSize: 14, color: '#8A7B72' }
});