import {
  addDoc,
  collection,
  doc,
  getDoc,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

export type ForumPost = {
  id: string;
  userId: string;
  authorName: string;
  title: string;
  content: string;
  likeCount: number;
  replyCount: number;
  createdAt?: unknown;
};

export type ForumReply = {
  id: string;
  userId: string;
  authorName: string;
  content: string;
  createdAt?: unknown;
};

export const BANNED_KEYWORDS = [
  'hk$',
  '放售',
  '有意pm',
  '出售',
  '平放',
  '出讓',
  '收購',
  '賣琴',
  '放琴',
  'pm我',
  '代放',
];

export function isForumAdContent(title: string, content: string): boolean {
  const fullText = (title + content).toLowerCase();
  const textWithoutSpaces = fullText.replace(/[\s,，。！!]/g, '');
  const hasAdKeyword = BANNED_KEYWORDS.some((keyword) =>
    textWithoutSpaces.includes(keyword.replace(/\s/g, ''))
  );
  const hasPriceIntent =
    (fullText.includes('放') || fullText.includes('賣')) &&
    (fullText.includes('$') || /\d{3,}/.test(fullText));

  return hasAdKeyword || hasPriceIntent;
}

export function formatForumTime(value: unknown): string {
  const millis = getTimestampMillis(value);
  if (!millis) return '剛剛';

  const diffMs = Date.now() - millis;
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return '剛剛';
  if (diffMinutes < 60) return `${diffMinutes} 分鐘前`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} 小時前`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} 天前`;

  return new Date(millis).toLocaleDateString('zh-HK');
}

export function subscribeForumPosts(
  onData: (posts: ForumPost[]) => void,
  onError?: (error: Error) => void
) {
  return onSnapshot(
    query(collection(db, 'forumPosts')),
    (snapshot) => {
      const posts = snapshot.docs
        .map((postDoc) => mapPostDoc(postDoc.id, postDoc.data()))
        .sort((a, b) => getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt));
      onData(posts);
    },
    (error) => onError?.(error)
  );
}

export async function getForumPost(postId: string): Promise<ForumPost | null> {
  const snapshot = await getDoc(doc(db, 'forumPosts', postId));
  if (!snapshot.exists()) return null;
  return mapPostDoc(snapshot.id, snapshot.data());
}

export function subscribeForumPost(
  postId: string,
  onData: (post: ForumPost | null) => void,
  onError?: (error: Error) => void
) {
  return onSnapshot(
    doc(db, 'forumPosts', postId),
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null);
        return;
      }
      onData(mapPostDoc(snapshot.id, snapshot.data()));
    },
    (error) => onError?.(error)
  );
}

export function subscribeForumReplies(
  postId: string,
  onData: (replies: ForumReply[]) => void,
  onError?: (error: Error) => void
) {
  return onSnapshot(
    query(collection(db, 'forumPosts', postId, 'replies')),
    (snapshot) => {
      const replies = snapshot.docs
        .map((replyDoc) => mapReplyDoc(replyDoc.id, replyDoc.data()))
        .sort((a, b) => getTimestampMillis(a.createdAt) - getTimestampMillis(b.createdAt));
      onData(replies);
    },
    (error) => onError?.(error)
  );
}

export async function createForumPost(params: {
  userId: string;
  authorName: string;
  title: string;
  content: string;
}) {
  await addDoc(collection(db, 'forumPosts'), {
    userId: params.userId,
    authorName: params.authorName,
    title: params.title.trim(),
    content: params.content.trim(),
    likeCount: 0,
    replyCount: 0,
    createdAt: serverTimestamp(),
  });
}

export async function createForumReply(params: {
  postId: string;
  userId: string;
  authorName: string;
  content: string;
}) {
  await addDoc(collection(db, 'forumPosts', params.postId, 'replies'), {
    userId: params.userId,
    authorName: params.authorName,
    content: params.content.trim(),
    createdAt: serverTimestamp(),
  });

  await updateDoc(doc(db, 'forumPosts', params.postId), {
    replyCount: increment(1),
  });
}

export async function unlockForumAccess(userId: string) {
  await setDoc(
    doc(db, 'users', userId),
    {
      forumUnlocked: true,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

function mapPostDoc(id: string, data: Record<string, unknown>): ForumPost {
  return {
    id,
    userId: (data.userId as string) || '',
    authorName: (data.authorName as string) || '音樂愛好者',
    title: (data.title as string) || '無標題',
    content: (data.content as string) || '',
    likeCount: typeof data.likeCount === 'number' ? data.likeCount : 0,
    replyCount: typeof data.replyCount === 'number' ? data.replyCount : 0,
    createdAt: data.createdAt,
  };
}

function mapReplyDoc(id: string, data: Record<string, unknown>): ForumReply {
  return {
    id,
    userId: (data.userId as string) || '',
    authorName: (data.authorName as string) || '音樂愛好者',
    content: (data.content as string) || '',
    createdAt: data.createdAt,
  };
}

function getTimestampMillis(value: unknown): number {
  if (!value) return 0;
  if (typeof value === 'object' && value !== null && 'toMillis' in value) {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (value instanceof Date) return value.getTime();
  return 0;
}
