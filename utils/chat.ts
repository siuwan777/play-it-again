import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { createBuyIntentNotification, createRateSellerNotification } from './notifications';
import { isInteractionBlocked } from './userSafety';

export type DealStatus = 'chatting' | 'buyer_interested' | 'sold';

export type MeetupDetails = {
  method: string;
  time: string;
  place: string;
  proposedBy: string;
  status: 'proposed' | 'confirmed';
  confirmedBy?: string;
};

export type MessageType = 'text' | 'buy_intent' | 'system';

export type Conversation = {
  id: string;
  listingId: string;
  listingTitle: string;
  listingPrice: string;
  listingImage: string;
  buyerId: string;
  sellerId: string;
  buyerName: string;
  sellerName: string;
  participants: string[];
  lastMessage: string;
  dealStatus: DealStatus;
  buyerInterestedAt?: unknown;
  lastReadAt?: Record<string, unknown>;
  meetup?: MeetupDetails;
  updatedAt?: unknown;
};

export type ChatMessage = {
  id: string;
  text: string;
  senderId: string;
  type: MessageType;
  createdAt?: unknown;
};

const BUY_INTENT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

function mapMeetup(data: Record<string, unknown>): MeetupDetails | undefined {
  const meetup = data.meetup as Record<string, unknown> | undefined;
  if (!meetup?.time || !meetup?.place) return undefined;

  return {
    method: (meetup.method as string) || '面交',
    time: meetup.time as string,
    place: meetup.place as string,
    proposedBy: (meetup.proposedBy as string) || '',
    status: meetup.status === 'confirmed' ? 'confirmed' : 'proposed',
    confirmedBy: meetup.confirmedBy as string | undefined,
  };
}

function mapConversation(id: string, data: Record<string, unknown>): Conversation {
  return {
    id,
    listingId: (data.listingId as string) || '',
    listingTitle: (data.listingTitle as string) || '無標題',
    listingPrice: data.listingPrice?.toString() || '0',
    listingImage: (data.listingImage as string) || '',
    buyerId: (data.buyerId as string) || '',
    sellerId: (data.sellerId as string) || '',
    buyerName: (data.buyerName as string) || '買家',
    sellerName: (data.sellerName as string) || '賣家',
    participants: (data.participants as string[]) || [],
    lastMessage: (data.lastMessage as string) || '',
    dealStatus: (data.dealStatus as DealStatus) || 'chatting',
    buyerInterestedAt: data.buyerInterestedAt,
    lastReadAt: (data.lastReadAt as Record<string, unknown>) || {},
    meetup: mapMeetup(data),
    updatedAt: data.updatedAt,
  };
}

export function buildConversationId(listingId: string, buyerId: string): string {
  return `${listingId}_${buyerId}`;
}

export function getDealStatusLabel(dealStatus: DealStatus, isBuyer: boolean): string {
  switch (dealStatus) {
    case 'buyer_interested':
      return isBuyer ? '已送出購買意願 · 待賣家回覆' : '買家有意購買 · 待你回覆';
    case 'sold':
      return '交易已完成';
    default:
      return '洽談中';
  }
}

export function getConversationBadge(
  conversation: Conversation,
  currentUserId: string
): string | null {
  if (conversation.dealStatus === 'sold') {
    return '已完成';
  }
  if (
    conversation.meetup?.status === 'proposed' &&
    conversation.meetup.proposedBy !== currentUserId
  ) {
    return '待確認交收';
  }
  if (conversation.dealStatus === 'buyer_interested' && currentUserId === conversation.sellerId) {
    return '待回覆';
  }
  if (conversation.dealStatus === 'buyer_interested' && currentUserId === conversation.buyerId) {
    return '已表示購買';
  }
  return null;
}

export function getInboxBadgeCount(conversations: Conversation[], userId: string): number {
  return getUnreadConversationCount(conversations, userId);
}

export function isConversationUnread(conversation: Conversation, userId: string): boolean {
  if (!conversation.lastMessage.trim()) return false;

  const updatedMillis = getTimestampMillis(conversation.updatedAt);
  if (!updatedMillis) return false;

  const readMillis = getTimestampMillis(conversation.lastReadAt?.[userId]);
  if (!readMillis) return true;

  return updatedMillis > readMillis;
}

export function getUnreadConversationCount(conversations: Conversation[], userId: string): number {
  return conversations.filter((conversation) => isConversationUnread(conversation, userId)).length;
}

export async function markConversationRead(conversationId: string, userId: string): Promise<void> {
  await updateDoc(doc(db, 'conversations', conversationId), {
    [`lastReadAt.${userId}`]: serverTimestamp(),
  });
}

export function canConfirmSale(conversation: Conversation, userId: string): boolean {
  return conversation.sellerId === userId && conversation.dealStatus !== 'sold';
}

export function formatMeetupSummary(meetup: MeetupDetails): string {
  return `${meetup.method} · ${meetup.time} · ${meetup.place}`;
}

export function getMeetupStatusLabel(
  conversation: Conversation,
  userId: string
): string | null {
  if (!conversation.meetup) return null;

  const summary = formatMeetupSummary(conversation.meetup);
  if (conversation.meetup.status === 'confirmed') {
    return `✅ 已確認交收：${summary}`;
  }
  if (conversation.meetup.proposedBy === userId) {
    return `⏳ 待對方確認交收：${summary}`;
  }
  return `📍 對方提議交收：${summary}`;
}

export function canProposeMeetup(conversation: Conversation, userId: string): boolean {
  if (conversation.dealStatus === 'sold') return false;
  if (!conversation.participants.includes(userId)) return false;
  if (conversation.meetup?.status === 'proposed') return false;
  return true;
}

export function canConfirmMeetup(conversation: Conversation, userId: string): boolean {
  if (conversation.dealStatus === 'sold') return false;
  if (conversation.meetup?.status !== 'proposed') return false;
  return conversation.meetup.proposedBy !== userId;
}

export async function proposeMeetup(
  conversationId: string,
  userId: string,
  params: { method: string; time: string; place: string }
): Promise<void> {
  const conversationRef = doc(db, 'conversations', conversationId);
  const snapshot = await getDoc(conversationRef);

  if (!snapshot.exists()) {
    throw new Error('找不到對話');
  }

  const conversation = mapConversation(snapshot.id, snapshot.data());

  if (!canProposeMeetup(conversation, userId)) {
    throw new Error('目前無法提議交收');
  }

  const proposerName =
    userId === conversation.buyerId ? conversation.buyerName : conversation.sellerName;
  const cardText = `${proposerName} 提議交收：${params.method} · ${params.time} · ${params.place} · 待對方確認`;
  const batch = writeBatch(db);

  batch.set(doc(collection(db, 'conversations', conversationId, 'messages')), {
    type: 'system',
    text: cardText,
    senderId: userId,
    createdAt: serverTimestamp(),
  });

  batch.update(conversationRef, {
    meetup: {
      method: params.method,
      time: params.time,
      place: params.place,
      proposedBy: userId,
      status: 'proposed',
    },
    lastMessage: cardText,
    updatedAt: serverTimestamp(),
    [`lastReadAt.${userId}`]: serverTimestamp(),
  });

  await batch.commit();
}

export async function confirmMeetup(conversationId: string, userId: string): Promise<void> {
  const conversationRef = doc(db, 'conversations', conversationId);
  const snapshot = await getDoc(conversationRef);

  if (!snapshot.exists()) {
    throw new Error('找不到對話');
  }

  const conversation = mapConversation(snapshot.id, snapshot.data());

  if (!canConfirmMeetup(conversation, userId) || !conversation.meetup) {
    throw new Error('目前無法確認交收');
  }

  const confirmerName =
    userId === conversation.buyerId ? conversation.buyerName : conversation.sellerName;
  const summary = formatMeetupSummary(conversation.meetup);
  const cardText = `${confirmerName} 已確認交收安排：${summary}`;
  const batch = writeBatch(db);

  batch.set(doc(collection(db, 'conversations', conversationId, 'messages')), {
    type: 'system',
    text: cardText,
    senderId: userId,
    createdAt: serverTimestamp(),
  });

  batch.update(conversationRef, {
    meetup: {
      ...conversation.meetup,
      status: 'confirmed',
      confirmedBy: userId,
    },
    lastMessage: cardText,
    updatedAt: serverTimestamp(),
    [`lastReadAt.${userId}`]: serverTimestamp(),
  });

  await batch.commit();
}

export function canExpressBuyInterest(conversation: Conversation, buyerId: string): boolean {
  if (conversation.buyerId !== buyerId) return false;
  if (conversation.dealStatus === 'sold') return false;

  if (conversation.dealStatus === 'buyer_interested' && conversation.buyerInterestedAt) {
    const elapsed = Date.now() - getTimestampMillis(conversation.buyerInterestedAt);
    if (elapsed < BUY_INTENT_COOLDOWN_MS) return false;
  }

  return true;
}

export function hasRecentBuyIntent(conversation: Conversation): boolean {
  if (conversation.dealStatus !== 'buyer_interested' || !conversation.buyerInterestedAt) {
    return false;
  }

  return Date.now() - getTimestampMillis(conversation.buyerInterestedAt) < BUY_INTENT_COOLDOWN_MS;
}

export async function getOrCreateConversation(params: {
  listingId: string;
  buyerId: string;
  sellerId: string;
  listingTitle: string;
  listingPrice: string;
  listingImage: string;
  buyerName: string;
  sellerName: string;
}): Promise<string> {
  const blocked = await isInteractionBlocked(params.buyerId, params.sellerId);
  if (blocked) {
    throw new Error('無法與此用戶聯絡');
  }

  const conversationId = buildConversationId(params.listingId, params.buyerId);
  const ref = doc(db, 'conversations', conversationId);

  await setDoc(
    ref,
    {
      listingId: params.listingId,
      listingTitle: params.listingTitle,
      listingPrice: params.listingPrice,
      listingImage: params.listingImage,
      buyerId: params.buyerId,
      sellerId: params.sellerId,
      buyerName: params.buyerName,
      sellerName: params.sellerName,
      participants: [params.buyerId, params.sellerId],
      dealStatus: 'chatting',
      lastMessage: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return conversationId;
}

export async function expressBuyInterest(conversationId: string, buyerId: string): Promise<void> {
  const conversationRef = doc(db, 'conversations', conversationId);
  const snapshot = await getDoc(conversationRef);

  if (!snapshot.exists()) {
    throw new Error('找不到對話');
  }

  const conversation = mapConversation(snapshot.id, snapshot.data());

  if (conversation.buyerId !== buyerId) {
    throw new Error('只有買家可以表示購買意願');
  }

  if (!canExpressBuyInterest(conversation, buyerId)) {
    throw new Error('24 小時內已表示過購買意願，請稍後再試');
  }

  const cardText = `${conversation.buyerName} 想購買「${conversation.listingTitle}」· HK$ ${conversation.listingPrice} · 待賣家回覆`;
  const batch = writeBatch(db);

  batch.set(doc(collection(db, 'conversations', conversationId, 'messages')), {
    type: 'buy_intent',
    text: cardText,
    senderId: buyerId,
    createdAt: serverTimestamp(),
  });

  batch.update(conversationRef, {
    dealStatus: 'buyer_interested',
    buyerInterestedAt: serverTimestamp(),
    lastMessage: cardText,
    updatedAt: serverTimestamp(),
    [`lastReadAt.${buyerId}`]: serverTimestamp(),
  });

  await batch.commit();

  await createBuyIntentNotification({
    sellerId: conversation.sellerId,
    buyerId: conversation.buyerId,
    buyerName: conversation.buyerName,
    listingId: conversation.listingId,
    listingTitle: conversation.listingTitle,
    listingPrice: conversation.listingPrice,
    conversationId,
  });
}

export async function confirmSaleToBuyer(conversationId: string, sellerId: string): Promise<void> {
  const conversationRef = doc(db, 'conversations', conversationId);
  const conversationSnap = await getDoc(conversationRef);

  if (!conversationSnap.exists()) {
    throw new Error('找不到對話');
  }

  const conversation = mapConversation(conversationSnap.id, conversationSnap.data());

  if (conversation.sellerId !== sellerId) {
    throw new Error('只有賣家可以確認交易');
  }

  if (conversation.dealStatus === 'sold') {
    throw new Error('此交易已完成');
  }

  const listingRef = doc(db, 'guitars', conversation.listingId);
  const listingSnap = await getDoc(listingRef);

  if (!listingSnap.exists()) {
    throw new Error('找不到商品');
  }

  const listing = listingSnap.data();
  if (listing.userId !== sellerId) {
    throw new Error('你無權出售此商品');
  }

  if (listing.status === 'sold') {
    throw new Error('此商品已售出');
  }

  const cardText = `${conversation.sellerName} 已確認將「${conversation.listingTitle}」售予 ${conversation.buyerName} · 交易完成`;
  const batch = writeBatch(db);

  batch.update(listingRef, {
    status: 'sold',
    soldAt: serverTimestamp(),
    soldToBuyerId: conversation.buyerId,
    soldToBuyerName: conversation.buyerName,
  });

  batch.set(doc(collection(db, 'conversations', conversationId, 'messages')), {
    type: 'system',
    text: cardText,
    senderId: sellerId,
    createdAt: serverTimestamp(),
  });

  batch.update(conversationRef, {
    dealStatus: 'sold',
    lastMessage: cardText,
    updatedAt: serverTimestamp(),
    [`lastReadAt.${sellerId}`]: serverTimestamp(),
  });

  await batch.commit();

  await createRateSellerNotification({
    buyerId: conversation.buyerId,
    sellerId: conversation.sellerId,
    sellerName: conversation.sellerName,
    listingId: conversation.listingId,
    listingTitle: conversation.listingTitle,
    conversationId,
  });
}

export async function getConversation(conversationId: string): Promise<Conversation | null> {
  const snapshot = await getDoc(doc(db, 'conversations', conversationId));
  if (!snapshot.exists()) return null;
  return mapConversation(snapshot.id, snapshot.data());
}

export function subscribeConversation(
  conversationId: string,
  onData: (conversation: Conversation | null) => void,
  onError?: (error: Error) => void
) {
  return onSnapshot(
    doc(db, 'conversations', conversationId),
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null);
        return;
      }

      onData(mapConversation(snapshot.id, snapshot.data()));
    },
    (error) => onError?.(error)
  );
}

export function subscribeMessages(
  conversationId: string,
  onData: (messages: ChatMessage[]) => void,
  onError?: (error: Error) => void
) {
  return onSnapshot(
    query(collection(db, 'conversations', conversationId, 'messages')),
    (snapshot) => {
      const messages = snapshot.docs
        .map((messageDoc) => {
          const data = messageDoc.data();
          return {
            id: messageDoc.id,
            text: data.text || '',
            senderId: data.senderId,
            type: (data.type as MessageType) || 'text',
            createdAt: data.createdAt,
          } satisfies ChatMessage;
        })
        .sort((a, b) => getTimestampMillis(a.createdAt) - getTimestampMillis(b.createdAt));
      onData(messages);
    },
    (error) => onError?.(error)
  );
}

export function subscribeUserConversations(
  uid: string,
  onData: (conversations: Conversation[]) => void,
  onError?: (error: Error) => void
) {
  return onSnapshot(
    query(collection(db, 'conversations'), where('participants', 'array-contains', uid)),
    (snapshot) => {
      const conversations = snapshot.docs
        .map((conversationDoc) => mapConversation(conversationDoc.id, conversationDoc.data()))
        .sort((a, b) => getTimestampMillis(b.updatedAt) - getTimestampMillis(a.updatedAt));
      onData(conversations);
    },
    (error) => onError?.(error)
  );
}

export async function sendMessage(conversationId: string, senderId: string, text: string) {
  const trimmed = text.trim();
  if (!trimmed) return;

  const conversationSnap = await getDoc(doc(db, 'conversations', conversationId));
  if (!conversationSnap.exists()) {
    throw new Error('找不到對話');
  }

  const conversation = mapConversation(conversationSnap.id, conversationSnap.data());
  const otherUserId = getOtherPartyId(conversation, senderId);
  if (!otherUserId) {
    throw new Error('找不到對話對象');
  }

  const blocked = await isInteractionBlocked(senderId, otherUserId);
  if (blocked) {
    throw new Error('無法與此用戶傳送訊息');
  }

  await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
    type: 'text',
    text: trimmed,
    senderId,
    createdAt: serverTimestamp(),
  });

  await updateDoc(doc(db, 'conversations', conversationId), {
    lastMessage: trimmed,
    updatedAt: serverTimestamp(),
    [`lastReadAt.${senderId}`]: serverTimestamp(),
  });
}

export async function getListingConversationsAsSeller(
  listingId: string,
  sellerId: string
): Promise<Conversation[]> {
  const snapshot = await getDocs(
    query(collection(db, 'conversations'), where('sellerId', '==', sellerId))
  );

  return snapshot.docs
    .map((conversationDoc) => mapConversation(conversationDoc.id, conversationDoc.data()))
    .filter((conversation) => conversation.listingId === listingId);
}

export function getOtherPartyName(conversation: Conversation, currentUserId: string): string {
  if (currentUserId === conversation.buyerId) {
    return conversation.sellerName;
  }
  return conversation.buyerName;
}

export function getOtherPartyId(conversation: Conversation, currentUserId: string): string | null {
  if (currentUserId === conversation.buyerId) {
    return conversation.sellerId;
  }
  if (currentUserId === conversation.sellerId) {
    return conversation.buyerId;
  }
  return null;
}

export function formatMessageTime(value: unknown): string {
  const millis = getTimestampMillis(value);
  if (!millis) {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return new Date(millis).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getTimestampMillis(value: unknown): number {
  if (!value) return 0;
  if (typeof value === 'object' && value !== null && 'toMillis' in value) {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (value instanceof Date) return value.getTime();
  return 0;
}
