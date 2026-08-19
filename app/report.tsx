import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { REPORT_REASONS, submitUserReport, type ReportReason } from '../utils/userSafety';

export default function ReportUser() {
  const router = useRouter();
  const {
    userId: reportedUserId,
    userName,
    listingId,
    conversationId,
  } = useLocalSearchParams<{
    userId?: string;
    userName?: string;
    listingId?: string;
    conversationId?: string;
  }>();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [selectedReason, setSelectedReason] = useState<ReportReason | ''>('');
  const [details, setDetails] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const displayName =
    typeof userName === 'string' && userName.trim() ? userName.trim() : '此用戶';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUserId(user?.uid ?? null);
      setAuthReady(true);
    });
    return unsubscribe;
  }, []);

  const handleSubmit = async () => {
    if (!currentUserId) {
      Alert.alert('請先登入', '登入後才能提交檢舉', [
        { text: '取消', style: 'cancel' },
        { text: '前往登入', onPress: () => router.push('/login') },
      ]);
      return;
    }

    if (!reportedUserId || typeof reportedUserId !== 'string') {
      Alert.alert('無法檢舉', '缺少用戶資料，請返回後再試。');
      return;
    }

    if (currentUserId === reportedUserId) {
      Alert.alert('無法檢舉', '你不能檢舉自己。');
      return;
    }

    if (!selectedReason) {
      Alert.alert('提示', '請先選擇一個檢舉原因。');
      return;
    }

    setSubmitting(true);
    try {
      await submitUserReport({
        reporterId: currentUserId,
        reportedUserId,
        reportedUserName: displayName,
        reason: selectedReason,
        details,
        listingId: typeof listingId === 'string' ? listingId : undefined,
        conversationId: typeof conversationId === 'string' ? conversationId : undefined,
        alsoBlock: isBlocked,
      });

      Alert.alert(
        '已收到檢舉',
        `我們已收到你的檢舉，管理團隊會盡快審查。${
          isBlocked ? '\n\n你已封鎖此用戶，之後不會再看到他的商品，雙方也無法互相傳送訊息。' : ''
        }`,
        [{ text: '知道了', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Failed to submit report:', error);
      Alert.alert('提交失敗', '檢舉無法送出，請稍後再試。');
    } finally {
      setSubmitting(false);
    }
  };

  if (!authReady) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#111111" />
      </View>
    );
  }

  if (!reportedUserId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>無法開啟檢舉頁</Text>
        <Text style={styles.errorSub}>請從賣家檔案或聊天頁進入檢舉。</Text>
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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.headerBox}>
          <Text style={styles.headerIcon}>🛡️</Text>
          <Text style={styles.headerTitle}>檢舉 {displayName}</Text>
          <Text style={styles.headerSub}>
            請告訴我們發生了什麼事。你的檢舉會匿名處理，對方不會知道是誰檢舉的。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            請選擇檢舉原因 <Text style={styles.required}>*</Text>
          </Text>
          {REPORT_REASONS.map((reason) => (
            <TouchableOpacity
              key={reason}
              style={[styles.reasonBtn, selectedReason === reason && styles.reasonBtnActive]}
              onPress={() => setSelectedReason(reason)}
              disabled={submitting}
            >
              <View style={[styles.radio, selectedReason === reason && styles.radioActive]}>
                {selectedReason === reason && <View style={styles.radioInner} />}
              </View>
              <Text
                style={[styles.reasonText, selectedReason === reason && styles.reasonTextActive]}
              >
                {reason}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>補充詳細情況（選填）</Text>
          <TextInput
            style={styles.input}
            placeholder="請描述具體發生的經過，這將幫助我們更快處理..."
            multiline
            value={details}
            onChangeText={setDetails}
            editable={!submitting}
          />
        </View>

        <View style={styles.blockSection}>
          <View style={styles.blockTextInfo}>
            <Text style={styles.blockTitle}>🚫 同時封鎖此用戶</Text>
            <Text style={styles.blockSub}>
              封鎖後，你不會在市集看到他的商品，雙方也無法互相傳送訊息。
            </Text>
          </View>
          <Switch
            value={isBlocked}
            onValueChange={setIsBlocked}
            disabled={submitting}
            trackColor={{ false: '#E5E7EB', true: '#EF4444' }}
            thumbColor="#FFFFFF"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.submitBtnText}>確認送出</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 20, paddingBottom: 40 },
  centered: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  errorTitle: { fontSize: 18, fontWeight: 'bold', color: '#111111', marginBottom: 8 },
  errorSub: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 20 },
  backBtn: { backgroundColor: '#111111', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  backBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },

  headerBox: {
    alignItems: 'center',
    marginBottom: 25,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  headerIcon: { fontSize: 40, marginBottom: 10 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111111', marginBottom: 8 },
  headerSub: { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 20 },

  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#333333', marginBottom: 12 },
  required: { color: '#EF4444' },

  reasonBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  reasonBtnActive: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: '#EF4444' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444' },
  reasonText: { fontSize: 15, color: '#4B5563', flex: 1 },
  reasonTextActive: { color: '#EF4444', fontWeight: 'bold' },

  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 15,
    paddingTop: 15,
    minHeight: 120,
    textAlignVertical: 'top',
    fontSize: 15,
  },

  blockSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 30,
  },
  blockTextInfo: { flex: 1, marginRight: 15 },
  blockTitle: { fontSize: 15, fontWeight: 'bold', color: '#111111', marginBottom: 4 },
  blockSub: { fontSize: 12, color: '#6B7280', lineHeight: 18 },

  submitBtn: {
    backgroundColor: '#111111',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});
