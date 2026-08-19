import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import {
  createForumReply,
  formatForumTime,
  isForumAdContent,
  subscribeForumPost,
  subscribeForumReplies,
  type ForumPost,
  type ForumReply,
} from '../utils/forum';
import { getDisplayNameForUser } from '../utils/userProfile';

export default function PostDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [userId, setUserId] = useState<string | null>(null);
  const [post, setPost] = useState<ForumPost | null>(null);
  const [comments, setComments] = useState<ForumReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid ?? null);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    let loadedPost = false;
    let loadedReplies = false;

    const markLoaded = () => {
      if (loadedPost && loadedReplies) {
        setLoading(false);
      }
    };

    const unsubscribePost = subscribeForumPost(
      id,
      (data) => {
        setPost(data);
        loadedPost = true;
        markLoaded();
      },
      (error) => {
        console.error('Failed to load forum post:', error);
        setLoading(false);
      }
    );

    const unsubscribeReplies = subscribeForumReplies(
      id,
      (items) => {
        setComments(items);
        loadedReplies = true;
        markLoaded();
      },
      (error) => {
        console.error('Failed to load forum replies:', error);
        setLoading(false);
      }
    );

    return () => {
      unsubscribePost();
      unsubscribeReplies();
    };
  }, [id]);

  const handleSendReply = async () => {
    if (!id || !replyText.trim()) return;

    if (!userId) {
      Alert.alert('請先登入', '登入後才能回覆貼文', [
        { text: '取消', style: 'cancel' },
        { text: '前往登入', onPress: () => router.push('/login') },
      ]);
      return;
    }

    if (isForumAdContent('', replyText)) {
      Alert.alert('⚠️ 系統攔截', '討論區嚴禁發佈買賣廣告！', [{ text: '我知道了', style: 'cancel' }]);
      return;
    }

    setSending(true);
    const content = replyText.trim();
    setReplyText('');

    try {
      const authorName = await getDisplayNameForUser(userId, auth.currentUser?.email);
      await createForumReply({
        postId: id,
        userId,
        authorName,
        content,
      });
    } catch (error) {
      console.error('Failed to send reply:', error);
      setReplyText(content);
      Alert.alert('發佈失敗', '無法發佈回覆，請稍後再試。');
    } finally {
      setSending(false);
    }
  };

  if (!id) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>找不到貼文</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>返回</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#111111" />
        <Text style={styles.loadingText}>載入貼文中...</Text>
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>貼文不存在或已被刪除</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>返回</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.mainPost}>
          <View style={styles.authorRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{post.authorName.charAt(0).toUpperCase()}</Text>
            </View>
            <View>
              <Text style={styles.authorName}>{post.authorName}</Text>
              <Text style={styles.postTime}>{formatForumTime(post.createdAt)}發佈</Text>
            </View>
          </View>
          <Text style={styles.postTitle}>{post.title}</Text>
          <Text style={styles.postContent}>{post.content}</Text>
        </View>

        <Text style={styles.commentHeader}>留言回覆 ({comments.length})</Text>
        <View style={styles.commentSection}>
          {comments.length > 0 ? (
            comments.map((comment) => (
              <View key={comment.id} style={styles.commentCard}>
                <View style={styles.commentAvatar}>
                  <Text style={styles.commentAvatarText}>{comment.authorName.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.commentBody}>
                  <Text style={styles.commentAuthor}>
                    {comment.authorName}{' '}
                    <Text style={styles.commentTime}>• {formatForumTime(comment.createdAt)}</Text>
                  </Text>
                  <Text style={styles.commentText}>{comment.content}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyComments}>暫無回覆，來搶頭香吧！</Text>
          )}
        </View>
      </ScrollView>

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="寫下你的回覆..."
          value={replyText}
          onChangeText={setReplyText}
          editable={!sending}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!replyText.trim() || sending) && { opacity: 0.5 }]}
          onPress={handleSendReply}
          disabled={!replyText.trim() || sending}
        >
          <Text style={styles.sendBtnText}>{sending ? '...' : '發佈'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  centered: { flex: 1, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', padding: 30 },
  loadingText: { marginTop: 12, fontSize: 16, color: '#6B7280' },
  errorTitle: { fontSize: 18, fontWeight: 'bold', color: '#111111', marginBottom: 20 },
  backBtn: { backgroundColor: '#111111', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  backBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  scrollContent: { padding: 20, paddingBottom: 40 },

  mainPost: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    marginBottom: 20,
  },
  authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#0284C7', fontWeight: 'bold', fontSize: 18 },
  authorName: { fontSize: 15, fontWeight: 'bold', color: '#111111' },
  postTime: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  postTitle: { fontSize: 20, fontWeight: '900', color: '#111111', marginBottom: 10 },
  postContent: { fontSize: 15, color: '#4B5563', lineHeight: 24 },

  commentHeader: { fontSize: 16, fontWeight: 'bold', color: '#111111', marginBottom: 15, marginLeft: 5 },
  commentSection: { gap: 15 },
  emptyComments: { fontSize: 14, color: '#9CA3AF', paddingHorizontal: 5 },
  commentCard: { flexDirection: 'row' },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  commentAvatarText: { color: '#D97706', fontWeight: 'bold', fontSize: 14 },
  commentBody: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  commentAuthor: { fontSize: 13, fontWeight: 'bold', color: '#111111', marginBottom: 4 },
  commentTime: { fontSize: 11, color: '#9CA3AF', fontWeight: 'normal' },
  commentText: { fontSize: 14, color: '#4B5563', lineHeight: 20 },

  inputBar: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 15,
    marginRight: 10,
  },
  sendBtn: { backgroundColor: '#111111', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  sendBtnText: { color: '#FFFFFF', fontWeight: 'bold' },
});
