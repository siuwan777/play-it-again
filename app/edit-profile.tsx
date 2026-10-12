import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { ensureUserProfile, getUserProfile, resolveDisplayName, updateUserProfile } from '../utils/userProfile';
import { uploadAvatarImage } from '../utils/uploadImages';
import { CollapsibleFieldSection } from '../components/CollapsibleFieldSection';
import { ProfileCompleteness } from '../components/ProfileCompleteness';
import { colors, radii } from '../constants/theme';
import {
  composeInstrumentValue,
  composeRegions,
  formatRegionSummary,
  parseRegions,
  PROFILE_INSTRUMENT_OPTIONS,
  PROFILE_INSTRUMENT_OTHER,
  PROFILE_REGION_GROUPS,
  PROFILE_REGION_OPTIONS,
  resolveInstrumentChoice,
} from '../utils/profileFieldOptions';

export default function EditProfile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [ig, setIg] = useState('');
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [regionOpen, setRegionOpen] = useState(false);
  const [instrumentChoice, setInstrumentChoice] = useState('');
  const [customInstrument, setCustomInstrument] = useState('');
  const [instrumentOpen, setInstrumentOpen] = useState(false);
  const [musicLink, setMusicLink] = useState('');
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
          setSelectedRegions(parseRegions(profile.region));
          const instrument = resolveInstrumentChoice(profile.primaryInstrument);
          setInstrumentChoice(instrument.choice);
          setCustomInstrument(instrument.custom);
          setMusicLink(profile.musicLink || '');
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
        region: composeRegions(selectedRegions),
        primaryInstrument: composeInstrumentValue(instrumentChoice, customInstrument),
        musicLink: musicLink.trim(),
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

  const region = composeRegions(selectedRegions);
  const regionSummary = formatRegionSummary(selectedRegions);
  const primaryInstrument = composeInstrumentValue(instrumentChoice, customInstrument);
  const instrumentSummary = primaryInstrument || '請選擇';
  const knownRegionSet = new Set(PROFILE_REGION_OPTIONS);
  const legacyRegions = selectedRegions.filter((item) => !knownRegionSet.has(item));

  const toggleRegion = (name: string) => {
    setSelectedRegions((current) =>
      current.includes(name) ? current.filter((item) => item !== name) : [...current, name]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.tile} />
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
        <ProfileCompleteness
          variant="checklist"
          avatarUrl={avatarUri}
          bio={bio}
          instagram={ig}
          region={region}
          primaryInstrument={primaryInstrument}
          musicLink={musicLink}
          bioCharCount={bio.trim().length}
        />
        <Text style={styles.label}>用戶名稱</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="例如: Jason_Guitarist"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>個人簡介</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={bio}
          onChangeText={setBio}
          multiline
          placeholder="例如：玩咗幾耐、主要風格、常出沒地區、曾參與嘅 band／演出…"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>Instagram 帳號</Text>
        <TextInput
          style={styles.input}
          value={ig}
          onChangeText={setIg}
          placeholder="@your_handle"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
        />

        <View style={styles.instrumentSection}>
          <CollapsibleFieldSection
            title="常出沒地區"
            summary={regionSummary}
            expanded={regionOpen}
            onToggle={() => setRegionOpen((open) => !open)}
          >
            <Text style={styles.regionHint}>可同時選擇多個地區</Text>
            {legacyRegions.length > 0 ? (
              <View style={styles.regionGroup}>
                <Text style={styles.regionGroupTitle}>先前選擇</Text>
                {legacyRegions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[styles.instrumentOption, styles.instrumentOptionActive]}
                    onPress={() => toggleRegion(option)}
                  >
                    <Text style={[styles.instrumentOptionText, styles.instrumentOptionTextActive]}>
                      {option}  ✓
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
            {PROFILE_REGION_GROUPS.map((group) => (
              <View key={group.title} style={styles.regionGroup}>
                <Text style={styles.regionGroupTitle}>{group.title}</Text>
                {group.options.map((option) => {
                  const selected = selectedRegions.includes(option);
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[styles.instrumentOption, selected && styles.instrumentOptionActive]}
                      onPress={() => toggleRegion(option)}
                    >
                      <Text
                        style={[
                          styles.instrumentOptionText,
                          selected && styles.instrumentOptionTextActive,
                        ]}
                      >
                        {option}
                        {selected ? '  ✓' : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </CollapsibleFieldSection>
        </View>

        <View style={styles.instrumentSection}>
          <CollapsibleFieldSection
            title="主要樂器"
            summary={instrumentSummary}
            expanded={instrumentOpen}
            onToggle={() => setInstrumentOpen((open) => !open)}
          >
            {PROFILE_INSTRUMENT_OPTIONS.map((option) => {
              const selected = instrumentChoice === option;
              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.instrumentOption, selected && styles.instrumentOptionActive]}
                  onPress={() => {
                    setInstrumentChoice(option);
                    if (option !== PROFILE_INSTRUMENT_OTHER) {
                      setCustomInstrument('');
                      setInstrumentOpen(false);
                    }
                  }}
                >
                  <Text
                    style={[styles.instrumentOptionText, selected && styles.instrumentOptionTextActive]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
            {instrumentChoice === PROFILE_INSTRUMENT_OTHER ? (
              <TextInput
                style={styles.customInstrumentInput}
                value={customInstrument}
                onChangeText={setCustomInstrument}
                placeholder="請輸入樂器名字"
                placeholderTextColor={colors.textMuted}
              />
            ) : null}
          </CollapsibleFieldSection>
        </View>

        <Text style={styles.label}>音樂連結</Text>
        <TextInput
          style={styles.input}
          value={musicLink}
          onChangeText={setMusicLink}
          placeholder="YouTube、Bandcamp 或演出片段連結"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          keyboardType="url"
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
  container: { flex: 1, backgroundColor: colors.background },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  loadingText: { marginTop: 12, fontSize: 16, color: colors.textSecondary },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 20 },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 30,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.paper,
  },
  avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 10, backgroundColor: colors.mutedFill },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
    backgroundColor: colors.mutedFill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarPlaceholderText: { fontSize: 36, fontWeight: 'bold', color: colors.text },
  changeAvatarText: { color: colors.textSecondary, fontSize: 16, fontWeight: '600' },
  avatarHint: { marginTop: 8, fontSize: 12, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 24 },
  formSection: { padding: 20 },
  label: { fontSize: 14, fontWeight: 'bold', color: colors.text, marginBottom: 8 },
  input: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: radii.md,
    fontSize: 16,
    marginBottom: 20,
    color: colors.text,
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  instrumentSection: { marginBottom: 20 },
  regionHint: { fontSize: 12, color: colors.textMuted, marginBottom: 10, lineHeight: 18 },
  regionGroup: { marginBottom: 8 },
  regionGroupTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 8,
    marginTop: 4,
  },
  instrumentOption: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.paper,
    marginBottom: 8,
  },
  instrumentOptionActive: {
    backgroundColor: colors.tile,
    borderColor: colors.tile,
  },
  instrumentOptionText: { fontSize: 15, fontWeight: '600', color: colors.text },
  instrumentOptionTextActive: { color: colors.textOnTile },
  customInstrumentInput: {
    backgroundColor: colors.mutedFill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: radii.md,
    fontSize: 16,
    color: colors.text,
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: colors.tile,
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: radii.lg,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 40,
  },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: { color: colors.textOnTile, fontSize: 18, fontWeight: 'bold' },
});
