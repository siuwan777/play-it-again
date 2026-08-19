import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import {
  createForumPost,
  formatForumTime,
  isForumAdContent,
  subscribeForumPosts,
  unlockForumAccess,
  type ForumPost,
} from '../../utils/forum';
import { getDisplayNameForUser, subscribeUserProfile } from '../../utils/userProfile';

const USER_CREDIT = 250;
const UNLOCK_COST = 100;

export default function Forum() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [isForumUnlocked, setIsForumUnlocked] = useState(false);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid ?? null);
      if (!user) {
        setIsForumUnlocked(false);
        setLoadingProfile(false);
      }
    });
    return unsubscribeAuth;
  }, []);

  useEffect(() => {
    if (!userId) return;

    setLoadingProfile(true);
    const unsubscribeProfile = subscribeUserProfile(userId, (profile) => {
      setIsForumUnlocked(Boolean(profile?.forumUnlocked));
      setLoadingProfile(false);
    });

    return unsubscribeProfile;
  }, [userId]);

  useEffect(() => {
    if (!isForumUnlocked) {
      setPosts([]);
      setLoadingPosts(false);
      return;
    }

    setLoadingPosts(true);
    const unsubscribe = subscribeForumPosts(
      (items) => {
        setPosts(items);
        setLoadingPosts(false);
      },
      (error) => {
        console.error('Failed to load forum posts:', error);
        setLoadingPosts(false);
      }
    );

    return unsubscribe;
  }, [isForumUnlocked]);

  const handleUnlock = () => {
    if (!userId) {
      Alert.alert('請先登入', '登入後才能解鎖討論區', [
        { text: '取消', style: 'cancel' },
        { text: '前往登入', onPress: () => router.push('/login') },
      ]);
      return;
    }

    Alert.alert(
      '購買討論區通行證',
      `您確定要花費 ${UNLOCK_COST} 信用分，來永久解鎖樂手討論區嗎？\n\n(您目前擁有 ${USER_CREDIT} 分)`,
      [
        { text: '再想想', style: 'cancel' },
        {
          text: '確認解鎖 🔓',
          onPress: async () => {
            setUnlocking(true);
            try {
              await unlockForumAccess(userId);
              setIsForumUnlocked(true);
              Alert.alert('🎉 解鎖成功', '歡迎來到樂手討論區！您的專屬社群已開啟。');
            } catch (error) {
              console.error('Failed to unlock forum:', error);
              Alert.alert('解鎖失敗', '無法解鎖討論區，請稍後再試。');
            } finally {
              setUnlocking(false);
            }
          },
        },
      ]
    );
  };

  const handlePostSubmit = async () => {
    if (!userId) {
      Alert.alert('請先登入', '登入後才能發佈貼文', [
        { text: '取消', style: 'cancel' },
        { text: '前往登入', onPress: () => router.push('/login') },
      ]);
      return;
    }

    if (!newTitle.trim() || !newContent.trim()) {
      Alert.alert('提示', '標題和內容不能為空喔！');
      return;
    }

    if (isForumAdContent(newTitle, newContent)) {
      Alert.alert('⚠️ 系統攔截', '討論區嚴禁發佈買賣廣告！\n如需交易，請將商品上架至【市集區】。', [
        { text: '我知道了', style: 'cancel' },
      ]);
      return;
    }

    setSubmitting(true);
    try {
      const displayName = await getDisplayNameForUser(userId, auth.currentUser?.email);
      await createForumPost({
        userId,
        authorName: displayName,
        title: newTitle,
        content: newContent,
      });
      setModalVisible(false);
      setNewTitle('');
      setNewContent('');
    } catch (error) {
      console.error('Failed to create forum post:', error);
      Alert.alert('發佈失敗', '無法發佈貼文，請稍後再試。');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReportPost = (postAuthor: string) => {
    Alert.alert('舉報貼文', `您確定要舉報 ${postAuthor} 的這篇貼文嗎？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '⚠️ 這是違規廣告',
        style: 'destructive',
        onPress: () => Alert.alert('舉報成功', '系統管理員將會介入審查。'),
      },
    ]);
  };

  if (loadingProfile) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#C35A2C" />
        <Text style={styles.loadingText}>載入中...</Text>
      </View>
    );
  }

  if (!isForumUnlocked) {
    return (
      <View style={styles.lockedContainer}>
        <Text style={styles.lockedIcon}>🎫</Text>
        <Text style={styles.lockedTitle}>解鎖專屬討論區</Text>
        <Text style={styles.lockedDesc}>
          這裡匯聚了全港最專業的樂手。發掘器材心得、尋找 Band 友，立即取得您的通行證！
        </Text>

        <View style={styles.scoreBox}>
          <Text style={styles.scoreText}>門票價格：{UNLOCK_COST} 分</Text>
          <Text style={styles.scoreSubText}>您目前擁有：{USER_CREDIT} 分</Text>
        </View>

        {USER_CREDIT >= UNLOCK_COST ? (
          <TouchableOpacity
            style={[styles.unlockBtn, unlocking && styles.unlockBtnDisabled]}
            onPress={handleUnlock}
            disabled={unlocking}
          >
            <Text style={styles.unlockBtnText}>{unlocking ? '解鎖中...' : `🔓 花費 ${UNLOCK_COST} 分解鎖`}</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ alignItems: 'center' }}>
            <TouchableOpacity style={[styles.unlockBtn, { backgroundColor: '#9CA3AF' }]} disabled>
              <Text style={styles.unlockBtnText}>分數不足</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/profile')} style={{ marginTop: 15 }}>
              <Text style={{ color: '#C35A2C', fontWeight: 'bold' }}>去賺取信用分 ➡️</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>樂手討論區</Text>
        <Text style={styles.headerSub}>技術交流、器材心得、夾Band尋人</Text>
      </View>

      {loadingPosts ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#C35A2C" />
          <Text style={styles.loadingText}>載入貼文中...</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
          {posts.length > 0 ? (
            posts.map((post) => (
              <TouchableOpacity
                key={post.id}
                style={styles.postCard}
                onPress={() => router.push({ pathname: '/post-details', params: { id: post.id } })}
              >
                <View style={styles.postHeaderRow}>
                  <Text style={styles.postTitle}>{post.title}</Text>
                  <TouchableOpacity onPress={() => handleReportPost(post.authorName)} style={{ padding: 4 }}>
                    <Ionicons name="ellipsis-horizontal" size={20} color="#8A7B72" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.postContent} numberOfLines={2}>
                  {post.content}
                </Text>
                <View style={styles.postFooter}>
                  <Text style={styles.postMeta}>
                    {post.authorName} • {formatForumTime(post.createdAt)}
                  </Text>
                  <View style={styles.postActions}>
                    <Text style={styles.actionText}>👍 {post.likeCount}</Text>
                    <Text style={styles.actionText}>💬 {post.replyCount}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🎸</Text>
              <Text style={styles.emptyTitle}>暫無貼文</Text>
              <Text style={styles.emptySub}>成為第一個分享心得的樂手吧！</Text>
            </View>
          )}
        </ScrollView>
      )}

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabText}>✏️</Text>
      </TouchableOpacity>

      <Modal visible={isModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>發佈新貼文</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeBtn}>取消</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.titleInput}
              placeholder="標題..."
              placeholderTextColor="#8A7B72"
              value={newTitle}
              onChangeText={setNewTitle}
              maxLength={30}
              editable={!submitting}
            />
            <TextInput
              style={styles.contentInput}
              placeholder="內容..."
              placeholderTextColor="#8A7B72"
              value={newContent}
              onChangeText={setNewContent}
              multiline
              textAlignVertical="top"
              editable={!submitting}
            />
            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handlePostSubmit}
              disabled={submitting}
            >
              <Text style={styles.submitBtnText}>{submitting ? '發佈中...' : '發佈'}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4EEDD' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  loadingText: { marginTop: 12, fontSize: 16, color: '#8A7B72' },

  lockedContainer: { flex: 1, backgroundColor: '#F4EEDD', alignItems: 'center', justifyContent: 'center', padding: 30 },
  lockedIcon: { fontSize: 70, marginBottom: 15 },
  lockedTitle: { fontSize: 24, fontWeight: '900', color: '#4A3B32', marginBottom: 10 },
  lockedDesc: { fontSize: 14, color: '#8A7B72', textAlign: 'center', lineHeight: 22, marginBottom: 25, paddingHorizontal: 10 },
  scoreBox: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 30,
    paddingVertical: 20,
    borderRadius: 16,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#E0D8C8',
    alignItems: 'center',
    width: '100%',
  },
  scoreText: { color: '#4A3B32', fontWeight: 'bold', fontSize: 18, marginBottom: 5 },
  scoreSubText: { color: '#C35A2C', fontWeight: 'bold', fontSize: 14 },
  unlockBtn: {
    backgroundColor: '#C35A2C',
    paddingHorizontal: 30,
    paddingVertical: 16,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#C35A2C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  unlockBtnDisabled: { opacity: 0.6 },
  unlockBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },

  header: { backgroundColor: '#FFFFFF', padding: 20, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: '#E0D8C8' },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#4A3B32', marginBottom: 4 },
  headerSub: { fontSize: 13, color: '#8A7B72' },
  listContent: { padding: 15, flexGrow: 1 },
  postCard: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E0D8C8' },
  postHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  postTitle: { flex: 1, fontSize: 16, fontWeight: 'bold', color: '#4A3B32', marginRight: 10 },
  postContent: { fontSize: 14, color: '#4A3B32', lineHeight: 20, marginBottom: 12 },
  postFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  postMeta: { fontSize: 12, color: '#8A7B72' },
  postActions: { flexDirection: 'row', gap: 12 },
  actionText: { fontSize: 12, color: '#8A7B72' },
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 24 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#4A3B32', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#8A7B72', textAlign: 'center' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#C35A2C',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4A3B32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  fabText: { fontSize: 24, color: '#FFFFFF' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(74, 59, 50, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#4A3B32' },
  closeBtn: { fontSize: 16, color: '#8A7B72' },
  titleInput: {
    backgroundColor: '#F4EEDD',
    borderWidth: 1,
    borderColor: '#E0D8C8',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
    fontWeight: 'bold',
    color: '#4A3B32',
  },
  contentInput: {
    backgroundColor: '#F4EEDD',
    borderWidth: 1,
    borderColor: '#E0D8C8',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    minHeight: 150,
    marginBottom: 20,
    color: '#4A3B32',
  },
  submitBtn: { backgroundColor: '#4A3B32', paddingVertical: 15, borderRadius: 30, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});
