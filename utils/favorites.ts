import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

export type FavoriteItem = {
  id: string;
  title: string;
  price: string;
  image: string;
};

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1550291652-6ea9114a47b1?q=80&w=800&auto=format&fit=crop';

export function listingToFavorite(item: {
  id: string;
  title?: string;
  price?: string | number;
  image?: string;
  images?: string[];
}): FavoriteItem {
  const image =
    item.image ||
    (item.images?.length ? item.images[0] : '') ||
    DEFAULT_IMAGE;

  return {
    id: item.id,
    title: item.title || '無標題',
    price: item.price?.toString() || '0',
    image,
  };
}

function favoritesCollection(uid: string) {
  return collection(db, 'users', uid, 'favorites');
}

export async function addFavorite(uid: string, item: FavoriteItem) {
  await setDoc(doc(favoritesCollection(uid), item.id), {
    listingId: item.id,
    title: item.title,
    price: item.price,
    image: item.image,
    createdAt: serverTimestamp(),
  });
}

export async function removeFavorite(uid: string, listingId: string) {
  await deleteDoc(doc(favoritesCollection(uid), listingId));
}

export function subscribeFavorites(
  uid: string,
  onData: (favorites: FavoriteItem[]) => void,
  onError?: (error: Error) => void
) {
  return onSnapshot(
    favoritesCollection(uid),
    (snapshot) => {
      const favorites = snapshot.docs.map((favoriteDoc) => {
        const data = favoriteDoc.data();
        return {
          id: favoriteDoc.id,
          title: data.title || '無標題',
          price: data.price?.toString() || '0',
          image: data.image || DEFAULT_IMAGE,
        } satisfies FavoriteItem;
      });
      onData(favorites);
    },
    (error) => onError?.(error)
  );
}
