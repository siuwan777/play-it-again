import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { uploadListingImages } from '../../utils/uploadImages';
import { getAuthEmail } from '../../utils/authSession';
import { getCategoryLabel, UNSELECTED_LISTING_CATEGORY } from '../../utils/listingCategories';
import { ListingCategoryPicker } from '../../components/ListingCategoryPicker';
import {
  buildListingTitle,
  createEmptySpecs,
  getConditionLabel,
  LISTING_CONDITIONS,
  serializeSpecs,
  validateListingForm,
  type ListingSpecs,
} from '../../utils/listingSpecs';
import { getDisplayNameForUser, getUserProfile, userProfileToCompletenessInput } from '../../utils/userProfile';
import { getProfileCompleteness, PROFILE_NUDGE_MIN_PERCENT } from '../../utils/profileCompleteness';
import { CollapsibleFieldSection } from '../../components/CollapsibleFieldSection';
import { ListingPhotoGuide } from '../../components/ListingPhotoGuide';
import { ListingSpecForm } from '../../components/ListingSpecForm';
import { OptionSelectField } from '../../components/OptionSelectField';
import { TabScreenHeader } from '../../components/TabScreenHeader';
import { TradePolicyNote } from '../../components/TradePolicyNote';
import { colors } from '../../constants/theme';
import {
  clearListingDraft,
  hasDraftContent,
  loadListingDraft,
  saveListingDraft,
} from '../../utils/listingDraft';
import { hasListingVideoLink } from '../../utils/listingVideo';

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
  const [category, setCategory] = useState(UNSELECTED_LISTING_CATEGORY);
  const [specs, setSpecs] = useState<ListingSpecs>({});
  const [conditionId, setConditionId] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [videoLink, setVideoLink] = useState('');
  const [posting, setPosting] = useState(false);
  const [expandedFormSection, setExpandedFormSection] = useState<string | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [highlightVideoSection, setHighlightVideoSection] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const videoInputRef = useRef<TextInput>(null);
  const formContainerRef = useRef<View>(null);
  const videoFieldRef = useRef<View>(null);

  const toggleFormSection = (sectionId: string) => {
    setExpandedFormSection((prev) => (prev === sectionId ? null : sectionId));
  };

  const conditionLabel =
    LISTING_CONDITIONS.find((item) => item.id === conditionId)?.label || '請選擇';

  const handleCategoryChange = (nextCategory: string) => {
    setCategory(nextCategory);
    setSpecs(createEmptySpecs(nextCategory));
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const draft = await loadListingDraft();
      if (cancelled || !draft || !hasDraftContent(draft)) {
        setDraftReady(true);
        return;
      }

      const nextCategory = draft.category || UNSELECTED_LISTING_CATEGORY;
      setCategory(nextCategory);
      setSpecs(nextCategory ? { ...createEmptySpecs(nextCategory), ...draft.specs } : {});
      setConditionId(draft.conditionId || '');
      setPrice(draft.price || '');
      setDescription(draft.description || '');
      setVideoLink(draft.videoLink || '');
      setImages(draft.imageUris || []);
      setDraftRestored(true);
      setDraftReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!draftReady) return;

    const timer = setTimeout(() => {
      saveListingDraft({
        category,
        specs,
        conditionId,
        price,
        description,
        videoLink,
        imageUris: images,
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [draftReady, category, specs, conditionId, price, description, videoLink, images]);

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

  const resetForm = async () => {
    setImages([]);
    setCategory(UNSELECTED_LISTING_CATEGORY);
    setSpecs({});
    setConditionId('');
    setPrice('');
    setDescription('');
    setVideoLink('');
    setDraftRestored(false);
    await clearListingDraft();
  };

  const scrollToVideoSection = () => {
    setHighlightVideoSection(true);
    const form = formContainerRef.current;
    const video = videoFieldRef.current;
    if (form && video) {
      form.measure((_fx, formY) => {
        video.measure((_vx, videoY) => {
          scrollRef.current?.scrollTo({ y: Math.max(0, formY + videoY - 24), animated: true });
        });
      });
    }
    setTimeout(() => videoInputRef.current?.focus(), 400);
  };

  const submitListing = async () => {
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

      Alert.alert('刊登成功', '你的樂器已經上架到 Play it again 市集了！', [
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

  const handlePost = () => {
    if (!category) {
      Alert.alert('提示', '請先選擇商品分類。');
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

    void continuePostAfterProfileCheck();
  };

  const continuePostAfterVideoCheck = () => {
    if (!hasListingVideoLink(videoLink)) {
      Alert.alert(
        '加一段試聽片？',
        '買家最想知道真實音色。貼上 YouTube 或 IG 連結通常較快收到問價；你仍可以略過直接刊登。',
        [
          { text: '去貼片連結', onPress: scrollToVideoSection },
          { text: '略過，照樣刊登', onPress: () => submitListing() },
        ]
      );
      return;
    }

    submitListing();
  };

  const continuePostAfterProfileCheck = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const profile = await getUserProfile(user.uid);
      const completeness = getProfileCompleteness(userProfileToCompletenessInput(profile));

      if (completeness.percent < PROFILE_NUDGE_MIN_PERCENT) {
        Alert.alert(
          '完善放售人檔案',
          `你的檔案完整度為 ${completeness.percent}%（建議至少 ${PROFILE_NUDGE_MIN_PERCENT}%）。填好頭像、地區同對外連結，商品會顯示身份標籤，亦較易出現在「值得聯絡」。`,
          [
            { text: '去完善檔案', onPress: () => router.push('/edit-profile') },
            { text: '略過，繼續刊登', onPress: () => continuePostAfterVideoCheck() },
          ]
        );
        return;
      }
    } catch (error) {
      console.warn('Failed to check profile completeness:', error);
    }

    continuePostAfterVideoCheck();
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TabScreenHeader
          variant="post"
          title="刊登二手樂器"
          subtitle={category ? '上傳相片、試音同規格後即可上架' : '請先選擇商品分類'}
        />

        <View ref={formContainerRef} style={styles.formContainer}>
          {draftRestored ? (
            <Text style={styles.draftBanner}>已還原上次未刊登的草稿，會自動儲存</Text>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.label}>
              商品分類 <Text style={styles.required}>*</Text>
            </Text>
            {category ? (
              <View style={styles.selectedCategoryRow}>
                <View style={styles.selectedCategoryChip}>
                  <Text style={styles.selectedCategoryText}>{getCategoryLabel(category)}</Text>
                </View>
                <TouchableOpacity onPress={() => {
                  setCategory(UNSELECTED_LISTING_CATEGORY);
                  setSpecs({});
                  setExpandedFormSection(null);
                }}>
                  <Text style={styles.changeCategoryText}>更改</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.hintText}>揀好分類後，先會出現相片、試音同其他資料</Text>
                <ListingCategoryPicker value={category} onChange={handleCategoryChange} layout="wrap" />
              </>
            )}
          </View>

          {category ? (
            <>
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

          <View
            ref={videoFieldRef}
            style={[styles.section, highlightVideoSection && styles.videoFieldHighlight]}
          >
            <View style={styles.labelRow}>
              <Text style={styles.label}>
                實測 / 演出片段 <Text style={styles.optional}>(選填，建議先填)</Text>
              </Text>
            </View>
            <Text style={styles.encourageText}>
              可貼上 YouTube 或 IG 影片連結，讓買家聽聽真實音色
            </Text>
            <TextInput
              ref={videoInputRef}
              style={styles.input}
              placeholderTextColor="#8A7B72"
              placeholder="貼上 YouTube 或 IG 影片網址..."
              value={videoLink}
              onChangeText={setVideoLink}
              onFocus={() => setHighlightVideoSection(false)}
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.section}>
            <ListingSpecForm
              categoryId={category}
              specs={specs}
              onChange={setSpecs}
              hideCategoryPicker
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

          <View style={styles.policyWrap}>
            <TradePolicyNote />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, posting && styles.submitButtonDisabled]}
            onPress={handlePost}
            disabled={posting}
          >
            {posting ? (
              <View style={styles.postingRow}>
                <ActivityIndicator color={colors.onPrimary} />
                <Text style={styles.submitButtonText}>上傳圖片中...</Text>
              </View>
            ) : (
              <Text style={styles.submitButtonText}>免費刊登</Text>
            )}
          </TouchableOpacity>
            </>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40, paddingTop: 0 },

  draftBanner: {
    fontSize: 13,
    color: colors.textSecondary,
    backgroundColor: colors.mutedFill,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 16,
    lineHeight: 18,
  },

  formContainer: { width: '100%', marginTop: 16 },
  policyWrap: { marginTop: 8, marginBottom: 16 },
  selectedCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  selectedCategoryChip: {
    backgroundColor: colors.tile,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  selectedCategoryText: { fontSize: 15, fontWeight: '700', color: colors.textOnTile },
  changeCategoryText: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  section: { marginBottom: 25 },
  videoFieldHighlight: {
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.tile,
    padding: 12,
    marginHorizontal: -12,
    backgroundColor: colors.mutedFill,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  label: { fontSize: 14, fontWeight: 'bold', color: colors.text, marginBottom: 8 },
  required: { color: colors.text },
  optional: { color: colors.textMuted, fontWeight: 'normal', fontSize: 12 },
  hintText: { fontSize: 12, color: colors.textMuted, marginBottom: 10, marginTop: -4 },
  hintTextInline: { fontSize: 12, color: colors.textMuted, marginBottom: 10, lineHeight: 18 },
  inputCompact: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 16,
    color: colors.text,
  },

  encourageText: { fontSize: 13, color: colors.textSecondary, marginBottom: 10, marginTop: -4, lineHeight: 18, fontWeight: '600' },

  input: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 15,
    color: colors.text,
  },
  textArea: { height: 120, textAlignVertical: 'top' },

  submitButton: {
    backgroundColor: colors.tile,
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: colors.onPrimary, fontSize: 17, fontWeight: 'bold' },
  postingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  imageWrapper: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumbnail: { width: '100%', height: '100%' },
  deleteButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: { color: colors.onPrimary, fontSize: 10, fontWeight: 'bold' },

  addImageBtn: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paper,
  },
  addImagePlus: { fontSize: 24, color: colors.textMuted, marginBottom: -5 },
  addImageText: { fontSize: 12, color: colors.textMuted },
});
