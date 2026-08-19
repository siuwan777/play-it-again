import React, { useState } from 'react';
import { Text, View, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';

export default function Rewards() {
  const [points, setPoints] = useState(2500);

  const handleRedeem = (cost: number, itemName: string) => {
    if (points >= cost) {
      Alert.alert(
        '確認換領',
        `確定要花費 ${cost} 分換領「${itemName}」嗎？`,
        [
          { text: '取消', style: 'cancel' },
          { 
            text: '確定換領', 
            onPress: () => {
              setPoints(points - cost);
              Alert.alert('🎉 換領成功！', `你已成功獲得「${itemName}」！請查閱電郵獲取兌換詳情。`);
            }
          }
        ]
      );
    } else {
      Alert.alert('提示', '信用分不足喔！多進行交易來累積吧！');
    }
  };

  const RewardCard = ({ icon, title, desc, cost }: { icon: string, title: string, desc: string, cost: number }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardIcon}>{icon}</Text>
        <View style={styles.cardTextContainer}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardDesc}>{desc}</Text>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.costText}>⭐ {cost} 分</Text>
        <TouchableOpacity 
          style={[styles.redeemButton, points < cost && styles.disabledButton]} 
          onPress={() => handleRedeem(cost, title)}
          disabled={points < cost}
        >
          <Text style={[styles.redeemButtonText, points < cost && styles.disabledButtonText]}>
            {points >= cost ? '換領' : '分數不足'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>分數換領中心</Text>
          <Text style={styles.subtitle}>使用信用分換取專屬獎賞</Text>
        </View>
        <View style={styles.pointsBadge}>
          <Text style={styles.pointsText}>⭐ {points}</Text>
        </View>
      </View>

      {/* --- 新增：如何賺取分數的守則區塊 --- */}
      <View style={styles.rulesContainer}>
        <Text style={styles.rulesTitle}>📈 如何賺取信用分？</Text>
        
        <View style={styles.ruleItem}>
          <Text style={styles.ruleText}>✅ 完成真實身份或 IG 驗證</Text>
          <Text style={styles.rulePoints}>+100 分</Text>
        </View>
        <View style={styles.ruleItem}>
          <Text style={styles.ruleText}>🤝 成功完成一次二手交易</Text>
          <Text style={styles.rulePoints}>+50 分</Text>
        </View>
        <View style={styles.ruleItem}>
          <Text style={styles.ruleText}>⭐ 獲得買家的 5 星好評</Text>
          <Text style={styles.rulePoints}>+20 分</Text>
        </View>
        
        <Text style={styles.ruleWarning}>
          ⚠️ 注意：惡意爽約或經查實放飛機，將被重罰扣除 200 分！
        </Text>
      </View>

      <Text style={styles.sectionTitle}>🚀 實用功能獎賞</Text>
      <RewardCard icon="⬆️" title="首頁置頂推廣 3天" desc="讓你的樂器在市集首頁優先展示，大幅增加曝光率與成交機會。" cost={50} />
      <RewardCard icon="🎟️" title="GuitarSofa $50 優惠券" desc="於門市購買任何配件或保養服務時，可作現金使用。" cost={100} />
      <RewardCard icon="👑" title="Premium 會員 1個月" desc="解鎖無限刊登及專屬 VIP 認證徽章，顯著提升買家信任度。" cost={200} />

      <Text style={styles.sectionTitle}>🖼️ 專屬頭像邊框</Text>
      <RewardCard icon="🥉" title="專業青銅邊框" desc="展現你的專業身分，適合完成多次交易的活躍樂手。" cost={300} />
      <RewardCard icon="🥇" title="大師黃金邊框" desc="閃耀的黃金邊框，讓你在市集留言和放售中脫穎而出。" cost={800} />
      <RewardCard icon="✨" title="傳奇霓虹邊框" desc="最高榮譽！帶有動態發光效果的專屬邊框，吸引所有買家目光。" cost={2000} />
      
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 10 },
  title: { fontSize: 24, fontWeight: '900', color: '#111111' },
  subtitle: { fontSize: 14, color: '#666666', marginTop: 4 },
  pointsBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#FDE68A' },
  pointsText: { color: '#D97706', fontWeight: 'bold', fontSize: 16 },
  
  // --- 賺分守則專屬樣式 ---
  rulesContainer: { backgroundColor: '#F0FDF4', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#BBF7D0', marginBottom: 25 },
  rulesTitle: { fontSize: 16, fontWeight: 'bold', color: '#166534', marginBottom: 12 },
  ruleItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#DCFCE7', paddingBottom: 8 },
  ruleText: { fontSize: 14, color: '#15803D', fontWeight: '500' },
  rulePoints: { fontSize: 14, fontWeight: 'bold', color: '#16A34A', backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  ruleWarning: { fontSize: 12, color: '#DC2626', marginTop: 8, fontWeight: '600' },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333333', marginBottom: 15 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 15, borderWidth: 1, borderColor: '#F3F4F6' },
  cardHeader: { flexDirection: 'row', marginBottom: 15 },
  cardIcon: { fontSize: 32, marginRight: 15 },
  cardTextContainer: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#111111', marginBottom: 4 },
  cardDesc: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12 },
  costText: { fontSize: 15, fontWeight: 'bold', color: '#D97706' },
  redeemButton: { backgroundColor: '#111111', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8 },
  redeemButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  disabledButton: { backgroundColor: '#F3F4F6' },
  disabledButtonText: { color: '#9CA3AF' },
});