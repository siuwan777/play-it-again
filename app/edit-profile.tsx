import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { ensureUserProfile, getUserProfile, resolveDisplayName, updateUserProfile } from '../utils/userProfile';
import { uploadAvatarImage } from '../utils/uploadImages';

export default function EditProfile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [ig, setIg] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      setUserId(user.uid);

      try {
        let profile = await getUserProfile(user.uid);
        if (!profile && user.email) {
          profile = await ensureUserProfile(user.uid, user.email);
        }

        if (profile) {
          setUsername(profile.displayName || resolveDisplayName(null, user.email));
          setBio(profile.bio || '');
          setIg(profile.instagram || '');
          setAvatarUri(profile.avatarUrl || null);
        } else {
          setUsername(resolveDisplayName(null, user.email));
          setAvatarUri(null);
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
        Alert.alert('載入失敗', '無法讀取個人檔案，請稍後再試。');
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!userId) {
      Alert.alert('請先登入', '請先登入後再編輯個人檔案。', [
        { text: '前往登入', onPress: () => router.push('/login') },
      ]);
      return;
    }

    if (!username.trim()) {
      Alert.alert('提示', '請輸入用戶名稱。');
      return;
    }

    setSaving(true);
    try {
      let avatarUrl: string | undefined;
      if (avatarUri) {
        avatarUrl = await uploadAvatarImage(userId, avatarUri);
      }

      await updateUserProfile(userId, {
        displayName: username.trim(),
        bio: bio.trim(),
        instagram: ig.trim(),
        ...(avatarUrl ? { avatarUrl } : {}),
      });

      Alert.alert('儲存成功', '你的個人檔案及所有放售商品的名稱都已更新！', [
        { text: '好的', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('儲存失敗', error.message || '無法更新個人檔案，請稍後再試。');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#C35A2C" />
        <Text style={styles.loadingText}>載入個人檔案中...</Text>
      </View>
    );
  }

  if (!userId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>請先登入</Text>
        <TouchableOpacity style={styles.saveButton} onPress={() => router.push('/login')}>
          <Text style={styles.saveButtonText}>前往登入</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.avatarSection}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarPlaceholderText}>{username.charAt(0).toUpperCase() || '?'}</Text>
          </View>
        )}
        <TouchableOpacity onPress={pickImage}>
          <Text style={styles.changeAvatarText}>更改頭像</Text>
        </TouchableOpacity>
        <Text style={styles.avatarHint}>建議使用正方形照片，儲存後會上傳至雲端</Text>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.label}>用戶名稱</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="例如: Jason_Guitarist"
          placeholderTextColor="#8A7B72"
        />

        <Text style={styles.label}>個人簡介</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={bio}
          onChangeText={setBio}
          multiline
          placeholder="介紹一下你自己..."
          placeholderTextColor="#8A7B72"
        />

        <Text style={styles.label}>Instagram 帳號</Text>
        <TextInput
          style={styles.input}
          value={ig}
          onChangeText={setIg}
          placeholder="@your_handle"
          placeholderTextColor="#8A7B72"
          autoCapitalize="none"
        />
      </View>

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>{saving ? '上傳並儲存中...' : '儲存變更'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4EEDD' },
  centered: { flex: 1, backgroundColor: '#F4EEDD', alignItems: 'center', justifyContent: 'center', padding: 30 },
  loadingText: { marginTop: 12, fontSize: 16, color: '#8A7B72' },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#4A3B32', marginBottom: 20 },
  avatarSection: { alignItems: 'center', paddingVertical: 30, borderBottomWidth: 1, borderBottomColor: '#E0D8C8', backgroundColor: '#FFFFFF' },
  avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 10, backgroundColor: '#F4EEDD' },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
    backgroundColor: '#F4EEDD',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0D8C8',
  },
  avatarPlaceholderText: { fontSize: 36, fontWeight: 'bold', color: '#4A3B32' },
  changeAvatarText: { color: '#4E878C', fontSize: 16, fontWeight: '600' },
  avatarHint: { marginTop: 8, fontSize: 12, color: '#8A7B72' },
  formSection: { padding: 20 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#4A3B32', marginBottom: 8 },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0D8C8',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 20,
    color: '#4A3B32',
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  saveButton: {
    backgroundColor: '#C35A2C',
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 40,
  },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});
