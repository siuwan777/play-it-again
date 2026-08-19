import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../firebaseConfig';
import {
  getExistingRating,
  RATING_CREDIT_REWARD,
  submitTransactionRating,
} from '../utils/transactionRating';

const TAGS = ['準時交收', '爽快有禮', '檢查仔細', '溝通順暢', '超級推薦'];

export default function RateTransaction() {
  const router = useRouter();
  const { listingId, revieweeId, revieweeName, listingTitle } = useLocalSearchParams<{
    listingId?: string;
    revieweeId?: string;
    revieweeName?: string;
    listingTitle?: string;
  }>();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alreadyRated, setAlreadyRated] = useState(false);

  const resolvedListingId = typeof listingId === 'string' ? listingId : '';
  const resolvedRevieweeId = typeof revieweeId === 'string' ? revieweeId : '';
  const resolvedRevieweeName = typeof revieweeName === 'string' ? revieweeName : '交易對象';
  const resolvedListingTitle = typeof listingTitle === 'string' ? listingTitle : '商品';

  useEffect(() => {
    const checkExisting = async () => {
      const user = auth.currentUser;
      if (!user || !resolvedListingId) {
        setLoading(false);
        return;
      }

      try {
        const existing = await getExistingRating(resolvedListingId, user.uid);
        setAlreadyRated(!!existing);
      } catch (error) {
        console.error('Failed to check existing rating:', error);
      } finally {
        setLoading(false);
      }
    };

    checkExisting();
  }, [resolvedListingId]);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('請先登入', '登入後才能提交評價', [
        { text: '取消', style: 'cancel' },
        { text: '前往登入', onPress: () => router.push('/login') },
      ]);
      return;
    }

    if (!resolvedListingId || !resolvedRevieweeId) {
      Alert.alert('無法評價', '缺少交易資訊，請從通知或交易紀錄進入。');
      return;
    }

    if (rating === 0) {
      Alert.alert('提示', '請至少給予一顆星的評價喔！');
      return;
    }

    setSubmitting(true);
    try {
      await submitTransactionRating({
        listingId: resolvedListingId,
        listingTitle: resolvedListingTitle,
        reviewerId: user.uid,
        revieweeId: resolvedRevieweeId,
        revieweeName: resolvedRevieweeName,
        rating,
        tags: selectedTags,
        comment,
      });

      Alert.alert(
        '評價成功！',
        `感謝你的評價！你已成功獲得 ${RATING_CREDIT_REWARD} 信用分獎勵。`,
        [{ text: '返回', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert('提交失敗', error.message || '無法提交評價，請稍後再試。');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#D97706" />
      </View>
    );
  }

  if (!resolvedListingId || !resolvedRevieweeId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>缺少交易資訊</Text>
        <Text style={styles.errorText}>請從通知中心或已售商品進入評價頁面。</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>返回</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (alreadyRated) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>已評價過</Text>
        <Text style={styles.errorText}>你已為「{resolvedListingTitle}」提交過評價。</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>返回</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerBox}>
          <Text style={styles.headerTitle}>正在為本次交易打分</Text>
          <View style={styles.userRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{resolvedRevieweeName.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>{resolvedRevieweeName}</Text>
              <Text style={styles.itemTitle} numberOfLines={2}>
                {resolvedListingTitle}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            你對這次交收滿意嗎？ <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)} style={styles.starBtn}>
                <Ionicons
                  name={rating >= star ? 'star' : 'star-outline'}
                  size={40}
                  color={rating >= star ? '#D97706' : '#D1D5DB'}
                />
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.ratingHint}>
            {rating === 5
              ? '極度滿意！完美交收'
              : rating === 4
                ? '很不錯的體驗'
                : rating === 3
                  ? '普通，還過得去'
                  : rating > 0
                    ? '有待改進'
                    : '點擊星星評分'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>快速評價標籤 (多選)</Text>
          <View style={styles.tagsContainer}>
            {TAGS.map((tag) => {
              const isActive = selectedTags.includes(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  style={[styles.tag, isActive && styles.tagActive]}
                  onPress={() => toggleTag(tag)}
                >
                  <Text style={[styles.tagText, isActive && styles.tagTextActive]}>{tag}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>想說的話 (選填)</Text>
          <TextInput
            style={styles.input}
            placeholder="例如：買家很準時，試琴也很愛惜，極度推薦！"
            multiline
            value={comment}
            onChangeText={setComment}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitBtnText}>送出評價 (+{RATING_CREDIT_REWARD} 信用分)</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 20, paddingBottom: 40 },
  centered: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: { fontSize: 18, fontWeight: 'bold', color: '#111111', marginBottom: 8 },
  errorText: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 20 },
  backBtn: {
    backgroundColor: '#111111',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  backBtnText: { color: '#FFFFFF', fontWeight: 'bold' },

  headerBox: {
    backgroundColor: '#F9FAFB',
    padding: 20,
    borderRadius: 16,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  headerTitle: { fontSize: 13, color: '#6B7280', fontWeight: 'bold', marginBottom: 12 },
  userRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: '#1D4ED8' },
  userName: { fontSize: 16, fontWeight: 'bold', color: '#111111', marginBottom: 4 },
  itemTitle: { fontSize: 12, color: '#666666' },

  section: { marginBottom: 30 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333333', marginBottom: 15 },
  required: { color: '#DC2626' },

  starsContainer: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 10 },
  starBtn: { padding: 5 },
  ratingHint: { textAlign: 'center', fontSize: 14, color: '#D97706', fontWeight: 'bold' },

  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tagActive: { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' },
  tagText: { color: '#4B5563', fontSize: 14, fontWeight: '500' },
  tagTextActive: { color: '#D97706', fontWeight: 'bold' },

  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 15,
    paddingTop: 15,
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 15,
  },

  submitBtn: {
    backgroundColor: '#111111',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 10,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});
