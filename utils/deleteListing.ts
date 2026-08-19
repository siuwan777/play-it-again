import { deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export async function deleteListing(listingId: string, currentUserId: string): Promise<void> {
  const listingRef = doc(db, 'guitars', listingId);
  const snapshot = await getDoc(listingRef);

  if (!snapshot.exists()) {
    throw new Error('找不到這件商品');
  }

  const data = snapshot.data();
  const isOwner = data.userId === currentUserId;
  const isLegacyListing = !data.userId;

  if (!isOwner && !isLegacyListing) {
    throw new Error('你沒有權限刪除此商品');
  }

  await deleteDoc(listingRef);
}

export function isLegacyListing(data: {
  userId?: string;
  sellerEmail?: string;
}, currentUserEmail?: string | null): boolean {
  if (data.userId) return false;

  if (data.sellerEmail && currentUserEmail) {
    return data.sellerEmail.toLowerCase() === currentUserEmail.toLowerCase();
  }

  return false;
}
