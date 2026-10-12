import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { deleteListing, isLegacyListing as isLegacyListingData } from '../utils/deleteListing';
import { getAuthEmail } from '../utils/authSession';
import { DEFAULT_LISTING_CATEGORY } from '../utils/listingCategories';
import {
  buildListingTitle,
  createEmptySpecs,
  getConditionLabel,
  LISTING_CONDITIONS,
  normalizeSpecsFromFirestore,
  resolveConditionId,
  serializeSpecs,
  validateListingForm,
  type ListingSpecs,
} from '../utils/listingSpecs';
import { uploadListingImages } from '../utils/uploadImages';
import { getDisplayNameForUser } from '../utils/userProfile';
import { CollapsibleFieldSection } from '../components/CollapsibleFieldSection';
import { ListingPhotoGuide } from '../components/ListingPhotoGuide';
import { ListingSpecForm } from '../components/ListingSpecForm';
import { OptionSelectField } from '../components/OptionSelectField';
export default function EditListing() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [category, setCategory] = useState(DEFAULT_LISTING_CATEGORY);
  const [specs, setSpecs] = useState<ListingSpecs>(() => createEmptySpecs(DEFAULT_LISTING_CATEGORY));
  const [conditionId, setConditionId] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [videoLink, setVideoLink] = useState('');
  const [isLegacyListing, setIsLegacyListing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expandedFormSection, setExpandedFormSection] = useState<string | null>(null);

  const toggleFormSection = (sectionId: string) => {
    setExpandedFormSection((prev) => (prev === sectionId ? null : sectionId));
  };

  const conditionLabel =
    LISTING_CONDITIONS.find((item) => item.id === conditionId)?.label || '請選擇';

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const fetchListing = async () => {
      try {
        const snapshot = await getDoc(doc(db, 'guitars', id));
        if (snapshot.exists()) {
          const data = snapshot.data();
          const userEmail = auth.currentUser?.email || getAuthEmail();
          const legacy = !data.userId;

          if (data.userId && data.userId !== auth.currentUser?.uid) {
            Alert.alert('無權限', '你只能編輯自己的商品。', [
              { text: '返回', onPress: () => router.back() },
            ]);
            return;
          }

          if (legacy && !isLegacyListingData(data, userEmail)) {
            Alert.alert('無權限', '這是舊版未綁定商品，只有刊登時使用的電郵帳號才能認領。', [
              { text: '返回', onPress: () => router.back() },
            ]);
            return;
          }

          setIsLegacyListing(legacy);
          const nextCategory = data.category || DEFAULT_LISTING_CATEGORY;
          setCategory(nextCategory);
          setSpecs(normalizeSpecsFromFirestore(nextCategory, data.specs));
          setPrice(data.price?.toString() || '');
          setConditionId(resolveConditionId(data));
          setDescription(data.description || '');
          setVideoLink(data.videoLink || '');
          if (data.imageUrls?.length) {
            setImages(data.imageUrls);
          } else if (data.imageUrl) {
            setImages([data.imageUrl]);
          }
        }
      } catch (error) {
        console.error('Failed to load listing:', error);
        Alert.alert('載入失敗', '無法讀取商品資料，請稍後再試。');
      } finally {
        setLoading(false);
      }
    };

    fetchListing();
  }, [id]);

  const handleCategoryChange = (nextCategory: string) => {
    setCategory(nextCategory);
    setSpecs(createEmptySpecs(nextCategory));
  };

  const pickImages = async () => {
    const maxToPick = 6 - images.length;
    if (maxToPick <= 0) {
      Alert.alert('提示', '最多只能上傳 6 張圖片喔！');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: maxToPick,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newImages = result.assets.map(asset => asset.uri);
      setImages([...images, ...newImages].slice(0, 6));
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImages(images.filter((_, index) => index !== indexToRemove));
  };

  const handleSave = async () => {
    if (!id) return;

    if (!auth.currentUser) {
      Alert.alert('請先登入', '請先登入後再編輯商品。');
      return;
    }

    if (images.length < 1) {
      Alert.alert('提示', '請至少保留 1 張照片喔！');
      return;
    }

    const validationError = validateListingForm({
      categoryId: category,
      specs,
      conditionId,
      price,
      description,
      imagesCount: images.length,
    });

    if (validationError) {
      Alert.alert('提示', validationError);
      return;
    }

    const finalTitle = buildListingTitle(category, specs);
    if (!finalTitle) {
      Alert.alert('提示', '請至少選擇品牌與型號。');
      return;
    }

    setSaving(true);
    try {
      const snapshot = await getDoc(doc(db, 'guitars', id));
      if (!snapshot.exists()) {
        Alert.alert('找不到商品', '這件商品可能已被刪除。');
        return;
      }
      if (snapshot.data().userId && snapshot.data().userId !== auth.currentUser.uid) {
        Alert.alert('無權限', '你只能編輯自己的商品。');
        return;
      }

      const listingData = snapshot.data();
      const user = auth.currentUser;
      const sellerEmail = user.email || getAuthEmail() || '';
      const sellerName = await getDisplayNameForUser(user.uid, sellerEmail);
      const claimingLegacy = !listingData.userId;

      const imageUrls = await uploadListingImages(images);

      const updatePayload: Record<string, unknown> = {
        title: finalTitle,
        category,
        specs: serializeSpecs(specs),
        price: Number(price),
        condition: getConditionLabel(conditionId),
        conditionId,
        description,
        videoLink,
        imageUrl: imageUrls[0],
        imageUrls,
      };

      if (claimingLegacy) {
        updatePayload.userId = user.uid;
        updatePayload.sellerName = sellerName;
        updatePayload.sellerEmail = sellerEmail;
        if (!listingData.status) {
          updatePayload.status = 'active';
        }
      }

      await updateDoc(doc(db, 'guitars', id), updatePayload);

      Alert.alert(
        '更新成功',
        claimingLegacy ? '商品已綁定到你的帳號。' : '你的商品資料已儲存。',
        [{ text: '返回個人頁', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert('更新失敗', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!id || !auth.currentUser) return;

    const listingTitle = buildListingTitle(category, specs) || '此商品';

    Alert.alert(
      '刪除商品',
      isLegacyListing
        ? `確定要刪除「${listingTitle}」嗎？這是未綁定帳號的舊商品，刪除後無法復原。`
        : `確定要刪除「${listingTitle}」嗎？此操作無法復原。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '刪除',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteListing(id, auth.currentUser!.uid);
              Alert.alert('已刪除', '商品已成功刪除。', [
                { text: '返回個人頁', onPress: () => router.back() },
              ]);
            } catch (error: any) {
              Alert.alert('刪除失敗', error.message || '無法刪除此商品，請稍後再試。');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#C35A2C" />
        <Text style={styles.loadingText}>載入商品中...</Text>
      </View>
    );
  }

  if (!id) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>找不到商品</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>返回</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>編輯商品</Text>
          <Text style={styles.subtitle}>
            {isLegacyListing ? '舊版未綁定商品，儲存後將綁定到你的帳號' : '修改你的放售資料'}
          </Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.section}>
            <Text style={styles.label}>商品圖片 <Text style={styles.required}>*</Text></Text>
            <Text style={styles.hintText}>最多 6 張，建議包含正面、側面、背面及近距離細節</Text>

            <ListingPhotoGuide />

            <View style={styles.imageGrid}>
              {images.map((uri, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image source={{ uri }} style={styles.thumbnail} />
                  <TouchableOpacity style={styles.deleteButton} onPress={() => removeImage(index)}>
                    <Text style={styles.deleteButtonText}>X</Text>
                  </TouchableOpacity>
                </View>
              ))}

              {images.length < 6 && (
                <TouchableOpacity style={styles.addImageBtn} onPress={pickImages}>
                  <Text style={styles.addImagePlus}>+</Text>
                  <Text style={styles.addImageText}>{images.length}/6</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <ListingSpecForm
              categoryId={category}
              specs={specs}
              onChange={setSpecs}
              onCategoryChange={handleCategoryChange}
            />

            <CollapsibleFieldSection
              title="新舊程度"
              summary={conditionLabel}
              required
              expanded={expandedFormSection === 'condition'}
              onToggle={() => toggleFormSection('condition')}
            >
              <OptionSelectField
                label="新舊程度"
                value={conditionId}
                options={LISTING_CONDITIONS.map((item) => ({ value: item.id, label: item.label }))}
                required
                hideLabel
                onChange={(value) => {
                  setConditionId(value);
                  setExpandedFormSection(null);
                }}
              />
            </CollapsibleFieldSection>

            <CollapsibleFieldSection
              title="售價 (HK$)"
              summary={price.trim() ? `HK$ ${price.trim()}` : '請填寫'}
              required
              expanded={expandedFormSection === 'price'}
              onToggle={() => toggleFormSection('price')}
            >
              <TextInput
                style={styles.inputCompact}
                placeholderTextColor="#8A7B72"
                placeholder="0"
                keyboardType="numeric"
                value={price}
                onChangeText={setPrice}
              />
            </CollapsibleFieldSection>

            <CollapsibleFieldSection
              title="補充描述"
              summary={description.trim() ? description.trim() : '請填寫'}
              required
              expanded={expandedFormSection === 'description'}
              onToggle={() => toggleFormSection('description')}
            >
              <Text style={styles.hintTextInline}>描述瑕疵、改裝、交收方式等補充資訊</Text>
              <TextInput
                style={[styles.inputCompact, styles.textArea]}
                placeholderTextColor="#8A7B72"
                placeholder="例如：琴頸狀態良好，附 Fender Hardcase，觀塘自取..."
                multiline
                value={description}
                onChangeText={setDescription}
              />
            </CollapsibleFieldSection>
          </View>

          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>實測 / 演出片段 <Text style={styles.optional}>(選填)</Text></Text>
            </View>
            <Text style={styles.encourageText}>
              強烈建議：附上 YouTube 或 IG 影片連結，讓買家聽聽它的真實音色！
            </Text>
            <TextInput
              style={styles.input}
              placeholderTextColor="#8A7B72"
              placeholder="貼上影片網址連結..."
              value={videoLink}
              onChangeText={setVideoLink}
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity style={[styles.submitButton, saving && styles.submitButtonDisabled]} onPress={handleSave} disabled={saving || deleting}>
            <Text style={styles.submitButtonText}>{saving ? '儲存中...' : '儲存修改'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.deleteListingBtn, (deleting || saving) && styles.submitButtonDisabled]}
            onPress={handleDelete}
            disabled={deleting || saving}
          >
            <Text style={styles.deleteListingBtnText}>{deleting ? '刪除中...' : '刪除商品'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4EEDD' },
  content: { padding: 20, paddingBottom: 40, paddingTop: 20 },
  centered: { flex: 1, backgroundColor: '#F4EEDD', alignItems: 'center', justifyContent: 'center', padding: 30 },
  loadingText: { marginTop: 12, fontSize: 16, color: '#8A7B72' },
  errorTitle: { fontSize: 18, fontWeight: 'bold', color: '#4A3B32', marginBottom: 20 },
  backBtn: { backgroundColor: '#C35A2C', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  backBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },

  header: { marginTop: 10, marginBottom: 30 },
  title: { fontSize: 28, fontWeight: '900', color: '#4A3B32', marginBottom: 5 },
  subtitle: { fontSize: 14, color: '#8A7B72' },

  formContainer: { width: '100%' },
  section: { marginBottom: 25 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#4A3B32', marginBottom: 8 },
  required: { color: '#C35A2C' },
  optional: { color: '#8A7B72', fontWeight: 'normal', fontSize: 12 },
  hintText: { fontSize: 12, color: '#8A7B72', marginBottom: 10, marginTop: -4 },
  hintTextInline: { fontSize: 12, color: '#8A7B72', marginBottom: 10, lineHeight: 18 },
  inputCompact: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFEFEF',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 16,
    color: '#2C2C2C',
  },
  encourageText: { fontSize: 13, color: '#4E878C', marginBottom: 10, marginTop: -4, lineHeight: 18, fontWeight: 'bold' },

  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E0D8C8', paddingHorizontal: 15, paddingVertical: 12, borderRadius: 12, fontSize: 16, marginBottom: 15, color: '#4A3B32' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfInput: { width: '48%' },
  textArea: { height: 120, textAlignVertical: 'top' },

  submitButton: { backgroundColor: '#C35A2C', paddingVertical: 18, borderRadius: 30, alignItems: 'center', marginTop: 10, shadowColor: '#C35A2C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  deleteListingBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deleteListingBtnText: { color: '#B91C1C', fontSize: 16, fontWeight: 'bold' },

  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  imageWrapper: { width: 80, height: 80, borderRadius: 12, overflow: 'hidden', position: 'relative', borderWidth: 1, borderColor: '#E0D8C8' },
  thumbnail: { width: '100%', height: '100%' },
  deleteButton: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(74, 59, 50, 0.8)', width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  deleteButtonText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },

  addImageBtn: { width: 80, height: 80, borderRadius: 12, borderWidth: 1, borderColor: '#D0C8B8', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  addImagePlus: { fontSize: 24, color: '#8A7B72', marginBottom: -5 },
  addImageText: { fontSize: 12, color: '#8A7B72' },
});
