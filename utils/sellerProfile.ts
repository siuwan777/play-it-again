import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { isListingSold } from './listingStatus';
import { resolveDisplayName, type UserProfile } from './userProfile';

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1550291652-6ea9114a47b1?q=80&w=800&auto=format&fit=crop';

export type SellerListingItem = {
  id: string;
  title: string;
  price: string;
  condition: string;
  image: string;
};

export type SellerPublicProfile = {
  displayName: string;
  bio: string;
  instagram: string;
  avatarUrl: string | null;
  joinDate: string;
};

function mapListingDoc(docSnap: QueryDocumentSnapshot): SellerListingItem {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    title: data.title || '無標題',
    price: data.price ? data.price.toString() : '0',
    condition: data.condition || '二手',
    image: data.imageUrls?.[0] || data.imageUrl || DEFAULT_IMAGE,
  };
}

function getCreatedAtMillis(docSnap: QueryDocumentSnapshot): number {
  const createdAt = docSnap.data().createdAt;
  if (createdAt && typeof createdAt.toMillis === 'function') {
    return createdAt.toMillis();
  }
  if (createdAt?.seconds) {
    return createdAt.seconds * 1000;
  }
  return 0;
}

function sortByNewest(docs: QueryDocumentSnapshot[]): QueryDocumentSnapshot[] {
  return [...docs].sort((a, b) => getCreatedAtMillis(b) - getCreatedAtMillis(a));
}

export function formatJoinDate(createdAt: unknown): string {
  if (!createdAt) return '近期加入';

  try {
    const timestamp = createdAt as { toDate?: () => Date };
    const date = timestamp.toDate ? timestamp.toDate() : new Date(createdAt as string);
    return date.toLocaleDateString('zh-HK', { year: 'numeric', month: 'long' });
  } catch {
    return '近期加入';
  }
}

export async function getSellerPublicProfile(
  sellerId: string,
  fallbackName?: string
): Promise<SellerPublicProfile | null> {
  const snapshot = await getDoc(doc(db, 'users', sellerId));
  if (!snapshot.exists()) {
    if (!fallbackName) return null;
    return {
      displayName: fallbackName,
      bio: '',
      instagram: '',
      avatarUrl: null,
      joinDate: '近期加入',
    };
  }

  const profile = snapshot.data() as UserProfile;
  return {
    displayName: resolveDisplayName(profile, profile.email),
    bio: profile.bio?.trim() || '',
    instagram: profile.instagram?.trim() || '',
    avatarUrl: profile.avatarUrl || null,
    joinDate: formatJoinDate(profile.createdAt),
  };
}

export function subscribeSellerListings(
  sellerId: string,
  onUpdate: (listings: SellerListingItem[]) => void,
  onError?: (error: Error) => void
): () => void {
  const listingsQuery = query(collection(db, 'guitars'), where('userId', '==', sellerId));

  return onSnapshot(
    listingsQuery,
    (snapshot) => {
      const active = sortByNewest(snapshot.docs)
        .filter((docSnap) => !isListingSold(docSnap.data().status))
        .map(mapListingDoc);
      onUpdate(active);
    },
    (error) => onError?.(error)
  );
}
