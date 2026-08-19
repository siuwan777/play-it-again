import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { createUserWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { setAuthEmail } from '../utils/authSession';
import { ensureUserProfile, updateUserProfile } from '../utils/userProfile';

export default function Register() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace('/(tabs)');
        return;
      }
      setCheckingAuth(false);
    });
    return unsubscribe;
  }, [router]);

  if (checkingAuth) {
    return <View style={styles.authLoading} />;
  }

  // 處理真實註冊的邏輯
  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('提示', '請填寫所有欄位喔！');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('提示', '兩次輸入的密碼不一致，請檢查一下！');
      return;
    }

    try {
      // 🚀 呼叫 Firebase 創建真實帳號！
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      setAuthEmail(email);
      await ensureUserProfile(credential.user.uid, email);
      if (displayName.trim()) {
        await updateUserProfile(credential.user.uid, { displayName: displayName.trim() });
      }

      Alert.alert('🎉 註冊成功！', '歡迎加入 Play it again 樂手社群！', [
        { text: '立即開始', onPress: () => router.replace('/(tabs)') }
      ]);
    } catch (error: any) {
      // 處理各種錯誤情況 (例如信箱被用過、密碼太短)
      if (error.code === 'auth/email-already-in-use') {
        Alert.alert('註冊失敗', '這個 Email 已經被註冊過囉！');
      } else if (error.code === 'auth/weak-password') {
        Alert.alert('註冊失敗', '密碼太弱了，請至少輸入 6 個字元！');
      } else if (error.code === 'auth/invalid-email') {
        Alert.alert('註冊失敗', 'Email 格式好像怪怪的？');
      } else {
        Alert.alert('發生錯誤', error.message);
      }
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.content}>
        
        <View style={styles.headerContainer}>
          <Text style={styles.title}>加入我們</Text>
          <Text style={styles.subtitle}>建立您的 Play it again 專屬帳號</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.label}>電子郵件</Text>
          <TextInput 
            style={styles.input} 
            placeholder="例如: jason@example.com" 
            placeholderTextColor="#8A7B72"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>暱稱 (選填)</Text>
          <TextInput
            style={styles.input}
            placeholder="例如: Jason_Guitarist"
            placeholderTextColor="#8A7B72"
            autoCapitalize="none"
            value={displayName}
            onChangeText={setDisplayName}
          />

          <Text style={styles.label}>設定密碼 (至少 6 個字元)</Text>
          <TextInput 
            style={styles.input} 
            placeholder="請輸入密碼" 
            placeholderTextColor="#8A7B72"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Text style={styles.label}>確認密碼</Text>
          <TextInput 
            style={styles.input} 
            placeholder="請再次輸入密碼" 
            placeholderTextColor="#8A7B72"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <TouchableOpacity style={styles.registerBtn} onPress={handleRegister}>
            <Text style={styles.registerBtnText}>立即註冊</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>已經有帳號了嗎？ </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.loginText}>返回登入</Text>
          </TouchableOpacity>
        </View>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4EEDD' },
  content: { flex: 1, justifyContent: 'center', padding: 30 },
  
  headerContainer: { marginBottom: 40 },
  title: { fontSize: 36, fontWeight: '900', color: '#4A3B32', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#8A7B72', fontWeight: '500' },
  
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
    color: '#4A3B32' 
  },
  
  registerBtn: { 
    backgroundColor: '#C35A2C', 
    paddingVertical: 18, 
    borderRadius: 30, 
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#C35A2C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5
  },
  registerBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 40 },
  footerText: { color: '#8A7B72', fontSize: 15 },
  loginText: { color: '#4E878C', fontSize: 15, fontWeight: 'bold' },
  authLoading: { flex: 1, backgroundColor: '#F4EEDD' },
});