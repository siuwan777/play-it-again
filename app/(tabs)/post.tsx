import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { uploadListingImages } from '../../utils/uploadImages';
import { getAuthEmail } from '../../utils/authSession';
import { DEFAULT_LISTING_CATEGORY } from '../../utils/listingCategories';
import {
  buildListingTitle,
  createEmptySpecs,
  getConditionLabel,
  LISTING_CONDITIONS,
  serializeSpecs,
  validateListingForm,
  type ListingSpecs,
} from '../../utils/listingSpecs';
import { getDisplayNameForUser } from '../../utils/userProfile';
import { ListingCategoryPicker } from '../../components/ListingCategoryPicker';
import { ListingPhotoGuide } from '../../components/ListingPhotoGuide';
import { ListingSpecForm } from '../../components/ListingSpecForm';
import { OptionSelectField } from '../../components/OptionSelectField';

function getUploadErrorMessage(error: any): string {
  const code = error?.code || '';

  if (code === 'storage/unauthorized' || code === 'storage/unauthenticated') {
    return '沒有上傳權限，請先登入帳號。';
  }
  if (code === 'storage/unknown') {
    return '圖片上傳失敗。請確認 Firebase 已啟用 Storage，並檢查 Storage 規則是否允許上傳。';
  }

  return error?.message || '圖片上傳失敗，請稍後再試。';
}

export default function PostItem() {
  const router = useRouter();

  const [images, setImages] = useState<string[]>([]);
  const [category, setCategory] = useState(DEFAULT_LISTING_CATEGORY);
  const [specs, setSpecs] = useState<ListingSpecs>(() => createEmptySpecs(DEFAULT_LISTING_CATEGORY));
  const [conditionId, setConditionId] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [videoLink, setVideoLink] = useState('');
  const [posting, setPosting] = useState(false);

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

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: maxToPick,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newImages = result.assets.map((asset) => asset.uri);
      const combined = [...images, ...newImages].slice(0, 6);
      setImages(combined);
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImages(images.filter((_, index) => index !== indexToRemove));
  };

  const resetForm = () => {
    setImages([]);
    setCategory(DEFAULT_LISTING_CATEGORY);
    setSpecs(createEmptySpecs(DEFAULT_LISTING_CATEGORY));
    setConditionId('');
    setPrice('');
    setDescription('');
    setVideoLink('');
  };

  const handlePost = async () => {
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

    if (!auth.currentUser) {
      Alert.alert('請先登入', '刊登商品前請先登入你的帳號。', [
        { text: '前往登入', onPress: () => router.push('/login') },
        { text: '取消', style: 'cancel' },
      ]);
      return;
    }

    const finalTitle = buildListingTitle(category, specs);
    if (!finalTitle) {
      Alert.alert('提示', '請至少選擇品牌與型號。');
      return;
    }

    setPosting(true);
    try {
      const user = auth.currentUser!;
      const sellerEmail = user.email || getAuthEmail() || '';
      const sellerName = await getDisplayNameForUser(user.uid, sellerEmail);
      const imageUrls = await uploadListingImages(images);
      const serializedSpecs = serializeSpecs(specs);

      await addDoc(collection(db, 'guitars'), {
        title: finalTitle,
        category,
        specs: serializedSpecs,
        price: Number(price),
        condition: getConditionLabel(conditionId),
        conditionId,
        description,
        videoLink,
        createdAt: serverTimestamp(),
        imageUrl: imageUrls[0],
        imageUrls,
        userId: user.uid,
        sellerName,
        sellerEmail,
        status: 'active',
      });

      Alert.alert('🎉 刊登成功！', '你的樂器已經上架到 Play it again 市集了！', [
        {
          text: '回市集看看',
          onPress: () => {
            resetForm();
            router.push('/(tabs)');
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert('上架失敗', getUploadErrorMessage(error));
    } finally {
      setPosting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>刊登二手樂器</Text>
          <Text style={styles.subtitle}>選好規格即可上架</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.section}>
            <Text style={styles.label}>
              商品圖片 <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.hintText}>最多 6 張，建議包含正面、側面、背面及近距離細節</Text>

            <ListingPhotoGuide />

            <View style={styles.imageGrid}>
              {images.map((uri, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image source={{ uri }} style={styles.thumbnail} />
                  <TouchableOpacity style={styles.deleteButton} onPress={() => removeImage(index)}>
                    <Text style={styles.deleteButtonText}>✕</Text>
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
            <Text style={styles.label}>
              商品分類 <Text style={styles.required}>*</Text>
            </Text>
            <ListingCategoryPicker value={category} onChange={handleCategoryChange} />

            <ListingSpecForm categoryId={category} specs={specs} onChange={setSpecs} />

            <OptionSelectField
              label="新舊程度"
              value={conditionId}
              options={LISTING_CONDITIONS.map((item) => ({ value: item.id, label: item.label }))}
              required
              onChange={setConditionId}
            />

            <Text style={styles.label}>
              售價 (HK$) <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholderTextColor="#8A7B72"
              placeholder="0"
              keyboardType="numeric"
              value={price}
              onChangeText={setPrice}
            />

            <Text style={styles.label}>
              補充描述 <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.hintText}>描述瑕疵、改裝、交收方式等補充資訊</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholderTextColor="#8A7B72"
              placeholder="例如：琴頸狀態良好，附 Fender Hardcase，觀塘自取..."
              multiline
              value={description}
              onChangeText={setDescription}
            />
          </View>

          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>
                實測 / 演出片段 <Text style={styles.optional}>(選填)</Text>
              </Text>
            </View>
            <Text style={styles.encourageText}>強烈建議附上 YouTube 或 IG 影片連結，讓買家聽聽真實音色</Text>
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

          <TouchableOpacity
            style={[styles.submitButton, posting && styles.submitButtonDisabled]}
            onPress={handlePost}
            disabled={posting}
          >
            {posting ? (
              <View style={styles.postingRow}>
                <ActivityIndicator color="#FFFFFF" />
                <Text style={styles.submitButtonText}>上傳圖片中...</Text>
              </View>
            ) : (
              <Text style={styles.submitButtonText}>免費刊登</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4EEDD' },
  content: { padding: 20, paddingBottom: 40, paddingTop: 60 },

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

  encourageText: { fontSize: 13, color: '#4E878C', marginBottom: 10, marginTop: -4, lineHeight: 18, fontWeight: 'bold' },

  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0D8C8',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 15,
    color: '#4A3B32',
  },
  textArea: { height: 120, textAlignVertical: 'top' },

  submitButton: {
    backgroundColor: '#C35A2C',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#C35A2C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonDisabled: { opacity: 0.8 },
  submitButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  postingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  imageWrapper: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E0D8C8',
  },
  thumbnail: { width: '100%', height: '100%' },
  deleteButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(74, 59, 50, 0.8)',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },

  addImageBtn: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D0C8B8',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  addImagePlus: { fontSize: 24, color: '#8A7B72', marginBottom: -5 },
  addImageText: { fontSize: 12, color: '#8A7B72' },
});
