import {
  collection,
  onSnapshot,
  query,
  where,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { isLegacyListing } from './deleteListing';
import { formatSoldDate, isListingSold } from './listingStatus';

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1550291652-6ea9114a47b1?q=80&w=800&auto=format&fit=crop';

export type UserListingItem = {
  id: string;
  title: string;
  price: string;
  condition: string;
  image: string;
  soldDate: string;
  soldToBuyerId?: string;
  soldToBuyerName?: string;
};

export type UserListingsSnapshot = {
  active: UserListingItem[];
  legacy: UserListingItem[];
  sold: UserListingItem[];
};

function mapListingDoc(docSnap: QueryDocumentSnapshot): UserListingItem {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    title: data.title || '無標題',
    price: data.price ? data.price.toString() : '0',
    condition: data.condition || '二手',
    image: data.imageUrls?.[0] || data.imageUrl || DEFAULT_IMAGE,
    soldDate: formatSoldDate(data.soldAt),
    soldToBuyerId: data.soldToBuyerId || undefined,
    soldToBuyerName: data.soldToBuyerName || undefined,
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

export function subscribeUserListings(
  userId: string,
  userEmail: string | null | undefined,
  onUpdate: (data: UserListingsSnapshot) => void,
  onError?: (error: Error) => void
): () => void {
  let ownedDocs: QueryDocumentSnapshot[] = [];
  let legacyDocs: QueryDocumentSnapshot[] = [];

  const emit = () => {
    const active: UserListingItem[] = [];
    const sold: UserListingItem[] = [];

    sortByNewest(ownedDocs).forEach((docSnap) => {
      const item = mapListingDoc(docSnap);
      if (isListingSold(docSnap.data().status)) {
        sold.push(item);
      } else {
        active.push(item);
      }
    });

    const legacy = sortByNewest(legacyDocs)
      .filter((docSnap) => isLegacyListing(docSnap.data(), userEmail))
      .map(mapListingDoc);

    onUpdate({ active, legacy, sold });
  };

  const ownedQuery = query(collection(db, 'guitars'), where('userId', '==', userId));

  const unsubOwned = onSnapshot(
    ownedQuery,
    (snapshot) => {
      ownedDocs = snapshot.docs;
      emit();
    },
    (error) => onError?.(error)
  );

  let unsubLegacy = () => {};

  if (userEmail) {
    const legacyQuery = query(collection(db, 'guitars'), where('sellerEmail', '==', userEmail));

    unsubLegacy = onSnapshot(
      legacyQuery,
      (snapshot) => {
        legacyDocs = snapshot.docs.filter((docSnap) => !docSnap.data().userId);
        emit();
      },
      (error) => onError?.(error)
    );
  }

  return () => {
    unsubOwned();
    unsubLegacy();
  };
}
