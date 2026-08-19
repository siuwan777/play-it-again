import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

export type NotificationType = 'buy_intent' | 'message' | 'rate_seller' | 'forum' | 'system';

export type AppNotification = {
  id: string;
  userId: string;
  actorId: string;
  type: NotificationType;
  title: string;
  message: string;
  listingId?: string;
  conversationId?: string;
  listingTitle?: string;
  revieweeId?: string;
  revieweeName?: string;
  isRead: boolean;
  createdAt?: unknown;
};

function mapNotificationDoc(notificationDoc: { id: string; data: () => Record<string, unknown> }): AppNotification {
  const data = notificationDoc.data();
  return {
    id: notificationDoc.id,
    userId: (data.userId as string) || '',
    actorId: (data.actorId as string) || '',
    type: (data.type as NotificationType) || 'system',
    title: (data.title as string) || '',
    message: (data.message as string) || '',
    listingId: data.listingId as string | undefined,
    conversationId: data.conversationId as string | undefined,
    listingTitle: data.listingTitle as string | undefined,
    revieweeId: data.revieweeId as string | undefined,
    revieweeName: data.revieweeName as string | undefined,
    isRead: !!data.isRead,
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

export function formatNotificationTime(value: unknown): string {
  const millis = getTimestampMillis(value);
  if (!millis) return '剛剛';

  const diffMs = Date.now() - millis;
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return '剛剛';
  if (diffMinutes < 60) return `${diffMinutes} 分鐘前`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} 小時前`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return '昨天';
  if (diffDays < 7) return `${diffDays} 天前`;

  return new Date(millis).toLocaleDateString('zh-HK', { month: 'short', day: 'numeric' });
}

export function getNotificationIcon(type: NotificationType): string {
  switch (type) {
    case 'buy_intent':
      return '🔥';
    case 'message':
      return '💬';
    case 'rate_seller':
      return '⭐';
    case 'forum':
      return '🎸';
    default:
      return '🛡️';
  }
}

export async function createBuyIntentNotification(params: {
  sellerId: string;
  buyerId: string;
  buyerName: string;
  listingId: string;
  listingTitle: string;
  listingPrice: string;
  conversationId: string;
}): Promise<void> {
  await addDoc(collection(db, 'notifications'), {
    userId: params.sellerId,
    actorId: params.buyerId,
    type: 'buy_intent',
    title: `${params.buyerName} 想購買你的商品`,
    message: `「${params.listingTitle}」· HK$ ${params.listingPrice} · 快回覆對方吧！`,
    listingId: params.listingId,
    listingTitle: params.listingTitle,
    conversationId: params.conversationId,
    isRead: false,
    createdAt: serverTimestamp(),
  });
}

export async function createRateSellerNotification(params: {
  buyerId: string;
  sellerId: string;
  sellerName: string;
  listingId: string;
  listingTitle: string;
  conversationId: string;
}): Promise<void> {
  await addDoc(collection(db, 'notifications'), {
    userId: params.buyerId,
    actorId: params.sellerId,
    type: 'rate_seller',
    title: '請為你的交易留下評價！',
    message: `${params.sellerName} 已確認將「${params.listingTitle}」售出給你。快去為他打分吧！`,
    listingId: params.listingId,
    listingTitle: params.listingTitle,
    revieweeId: params.sellerId,
    revieweeName: params.sellerName,
    conversationId: params.conversationId,
    isRead: false,
    createdAt: serverTimestamp(),
  });
}

export function subscribeUserNotifications(
  uid: string,
  onData: (notifications: AppNotification[]) => void,
  onError?: (error: Error) => void
): () => void {
  return onSnapshot(
    query(collection(db, 'notifications'), where('userId', '==', uid)),
    (snapshot) => {
      const notifications = snapshot.docs
        .map((notificationDoc) => mapNotificationDoc(notificationDoc))
        .sort((a, b) => getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt));
      onData(notifications);
    },
    (error) => onError?.(error)
  );
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await updateDoc(doc(db, 'notifications', notificationId), { isRead: true });
}

export async function markAllNotificationsRead(uid: string): Promise<void> {
  const snapshot = await getDocs(
    query(collection(db, 'notifications'), where('userId', '==', uid))
  );

  const unread = snapshot.docs.filter((notificationDoc) => !notificationDoc.data().isRead);
  if (unread.length === 0) return;

  let batch = writeBatch(db);
  let count = 0;

  for (const notificationDoc of unread) {
    batch.update(notificationDoc.ref, { isRead: true });
    count++;

    if (count >= 500) {
      await batch.commit();
      batch = writeBatch(db);
      count = 0;
    }
  }

  if (count > 0) {
    await batch.commit();
  }
}

export function getUnreadNotificationCount(notifications: AppNotification[]): number {
  return notifications.filter((notification) => !notification.isRead).length;
}
