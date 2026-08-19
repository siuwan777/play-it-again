import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { setAuthEmail } from '../utils/authSession';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  // 處理真實登入的邏輯
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('提示', '請輸入 Email 和密碼喔！');
      return;
    }

    try {
      // 🚀 呼叫 Firebase 驗證這組帳號密碼是否在資料庫裡
      await signInWithEmailAndPassword(auth, email, password);
      setAuthEmail(email);
      router.replace('/(tabs)');
      
    } catch (error: any) {
      // 處理各種登入失敗的情況 (防呆機制)
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        Alert.alert('登入失敗', '找不到這個帳號，或是密碼輸入錯誤喔！');
      } else if (error.code === 'auth/invalid-email') {
        Alert.alert('登入失敗', 'Email 格式好像不正確？');
      } else {
        Alert.alert('發生錯誤', '系統有點小狀況，請稍後再試。');
      }
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.content}>
        
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Play it again</Text>
          <Text style={styles.subtitle}>歡迎回來，繼續你的音樂尋寶之旅</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.label}>電子郵件</Text>
          <TextInput 
            style={styles.input} 
            placeholder="請輸入註冊的 Email" 
            placeholderTextColor="#8A7B72"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>密碼</Text>
          <TextInput 
            style={styles.input} 
            placeholder="請輸入密碼" 
            placeholderTextColor="#8A7B72"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            style={styles.forgotBtn}
            onPress={() => router.push({ pathname: '/forgot-password', params: { email } })}
          >
            <Text style={styles.forgotText}>忘記密碼？</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
            <Text style={styles.loginBtnText}>登入</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>還沒有專屬帳號嗎？ </Text>
          <TouchableOpacity onPress={() => router.push('/register')}>
            <Text style={styles.registerText}>立即註冊</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.browseBtn} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.browseBtnText}>先逛逛市集，不用登入</Text>
        </TouchableOpacity>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4EEDD' },
  content: { flex: 1, justifyContent: 'center', padding: 30 },
  
  headerContainer: { marginBottom: 40, alignItems: 'center' },
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
  
  loginBtn: { 
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
  loginBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  forgotBtn: { alignSelf: 'flex-end', marginTop: -8, marginBottom: 16, paddingVertical: 4 },
  forgotText: { color: '#4E878C', fontSize: 14, fontWeight: '600' },
  
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 40 },
  footerText: { color: '#8A7B72', fontSize: 15 },
  registerText: { color: '#4E878C', fontSize: 15, fontWeight: 'bold' },
  browseBtn: { marginTop: 24, alignItems: 'center', paddingVertical: 12 },
  browseBtnText: { color: '#8A7B72', fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
  authLoading: { flex: 1, backgroundColor: '#F4EEDD' },
});