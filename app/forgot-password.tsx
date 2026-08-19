import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebaseConfig';

function getResetErrorMessage(error: any): string {
  const code = error?.code || '';

  if (code === 'auth/invalid-email') {
    return 'Email 格式不正確，請再檢查一次。';
  }
  if (code === 'auth/user-not-found') {
    return '找不到這個 Email 對應的帳號。';
  }
  if (code === 'auth/too-many-requests') {
    return '請求太頻繁，請稍後再試。';
  }

  return error?.message || '無法發送重設郵件，請稍後再試。';
}

export default function ForgotPassword() {
  const router = useRouter();
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(typeof emailParam === 'string' ? emailParam : '');
  const [sending, setSending] = useState(false);

  const handleReset = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      Alert.alert('提示', '請輸入你註冊時使用的電郵地址。');
      return;
    }

    setSending(true);
    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      Alert.alert(
        '郵件已發送',
        `重設密碼連結已發送至\n${trimmedEmail}\n請到信箱（及垃圾郵件）查收。`,
        [{ text: '返回登入', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert('發送失敗', getResetErrorMessage(error));
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>忘記密碼？</Text>
          <Text style={styles.subtitle}>輸入註冊電郵，我們會發送重設密碼連結給你。</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.label}>電郵地址</Text>
          <TextInput
            style={styles.input}
            placeholder="請輸入註冊的 Email"
            placeholderTextColor="#8A7B72"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!sending}
          />

          <TouchableOpacity
            style={[styles.resetButton, sending && styles.resetButtonDisabled]}
            onPress={handleReset}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.resetButtonText}>發送重設連結</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} disabled={sending}>
            <Text style={styles.backBtnText}>返回登入</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4EEDD' },
  content: { flex: 1, justifyContent: 'center', padding: 30 },
  header: { marginBottom: 32, alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '900', color: '#4A3B32', marginBottom: 10 },
  subtitle: { fontSize: 15, color: '#8A7B72', fontWeight: '500', lineHeight: 22, textAlign: 'center' },
  formContainer: { width: '100%' },
  label: { fontSize: 14, fontWeight: 'bold', color: '#4A3B32', marginBottom: 8, marginLeft: 4 },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0D8C8',
    paddingHorizontal: 18,
    paddingVertical: 15,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 20,
    color: '#4A3B32',
  },
  resetButton: {
    backgroundColor: '#C35A2C',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 4,
  },
  resetButtonDisabled: { opacity: 0.7 },
  resetButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  backBtn: { marginTop: 20, alignItems: 'center', paddingVertical: 12 },
  backBtnText: { color: '#4E878C', fontSize: 15, fontWeight: '600' },
});
