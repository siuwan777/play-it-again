import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

export const REPORT_REASONS = [
  '疑似詐騙或虛假商品',
  '發佈違規或不當內容',
  '態度惡劣或騷擾行為',
  '爽約或惡意棄單',
  '其他原因',
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

export type UserBlock = {
  id: string;
  blockerId: string;
  blockedId: string;
  blockedUserName: string;
  createdAt?: unknown;
};

function buildBlockId(blockerId: string, blockedId: string): string {
  return `${blockerId}_${blockedId}`;
}

export async function isInteractionBlocked(
  currentUserId: string,
  otherUserId: string
): Promise<boolean> {
  if (!currentUserId || !otherUserId || currentUserId === otherUserId) {
    return false;
  }

  const [blockedByMe, blockedMe] = await Promise.all([
    getDoc(doc(db, 'userBlocks', buildBlockId(currentUserId, otherUserId))),
    getDoc(doc(db, 'userBlocks', buildBlockId(otherUserId, currentUserId))),
  ]);

  return blockedByMe.exists() || blockedMe.exists();
}

export function subscribeBlockedUserIds(
  userId: string,
  onData: (blockedIds: Set<string>) => void,
  onError?: (error: Error) => void
): () => void {
  const blockedIds = new Set<string>();
  const blockedByMe = new Set<string>();
  const blockedMe = new Set<string>();

  const emit = () => {
    blockedIds.clear();
    blockedByMe.forEach((id) => blockedIds.add(id));
    blockedMe.forEach((id) => blockedIds.add(id));
    onData(new Set(blockedIds));
  };

  const unsubscribeOutgoing = onSnapshot(
    query(collection(db, 'userBlocks'), where('blockerId', '==', userId)),
    (snapshot) => {
      blockedByMe.clear();
      snapshot.docs.forEach((blockDoc) => {
        blockedByMe.add((blockDoc.data().blockedId as string) || '');
      });
      emit();
    },
    (error) => onError?.(error)
  );

  const unsubscribeIncoming = onSnapshot(
    query(collection(db, 'userBlocks'), where('blockedId', '==', userId)),
    (snapshot) => {
      blockedMe.clear();
      snapshot.docs.forEach((blockDoc) => {
        blockedMe.add((blockDoc.data().blockerId as string) || '');
      });
      emit();
    },
    (error) => onError?.(error)
  );

  return () => {
    unsubscribeOutgoing();
    unsubscribeIncoming();
  };
}

export async function blockUser(
  blockerId: string,
  blockedId: string,
  blockedUserName: string
): Promise<void> {
  if (blockerId === blockedId) {
    throw new Error('無法封鎖自己');
  }

  await setDoc(doc(db, 'userBlocks', buildBlockId(blockerId, blockedId)), {
    blockerId,
    blockedId,
    blockedUserName: blockedUserName.trim() || '用戶',
    createdAt: serverTimestamp(),
  });
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<void> {
  await deleteDoc(doc(db, 'userBlocks', buildBlockId(blockerId, blockedId)));
}

export async function submitUserReport(params: {
  reporterId: string;
  reportedUserId: string;
  reportedUserName: string;
  reason: ReportReason;
  details?: string;
  listingId?: string;
  conversationId?: string;
  alsoBlock?: boolean;
}): Promise<void> {
  if (params.reporterId === params.reportedUserId) {
    throw new Error('無法檢舉自己');
  }

  if (params.alsoBlock) {
    await blockUser(params.reporterId, params.reportedUserId, params.reportedUserName);
  }

  await addDoc(collection(db, 'reports'), {
    reporterId: params.reporterId,
    reportedUserId: params.reportedUserId,
    reportedUserName: params.reportedUserName.trim() || '用戶',
    reason: params.reason,
    details: params.details?.trim() || '',
    listingId: params.listingId || null,
    conversationId: params.conversationId || null,
    alsoBlocked: !!params.alsoBlock,
    createdAt: serverTimestamp(),
  });
}
