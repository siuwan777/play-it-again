import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { router } from 'expo-router';
import { auth } from '../firebaseConfig';
import {
  addFavorite,
  FavoriteItem,
  listingToFavorite,
  removeFavorite,
  subscribeFavorites,
} from '../utils/favorites';

type FavoritesContextValue = {
  favorites: FavoriteItem[];
  loading: boolean;
  toggleFavorite: (item: { id: string; title?: string; price?: string | number; image?: string; images?: string[] }) => void;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeFavorites: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      unsubscribeFavorites?.();
      unsubscribeFavorites = undefined;

      if (!user) {
        setFavorites([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      unsubscribeFavorites = subscribeFavorites(
        user.uid,
        (items) => {
          setFavorites(items);
          setLoading(false);
        },
        (error) => {
          console.error('Failed to load favorites:', error);
          setLoading(false);
        }
      );
    });

    return () => {
      unsubscribeFavorites?.();
      unsubscribeAuth();
    };
  }, []);

  const toggleFavorite = (item: { id: string; title?: string; price?: string | number; image?: string; images?: string[] }) => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('請先登入', '登入後才能收藏商品', [
        { text: '取消', style: 'cancel' },
        { text: '前往登入', onPress: () => router.push('/login') },
      ]);
      return;
    }

    const favorite = listingToFavorite(item);
    const isExist = favorites.some((fav) => fav.id === favorite.id);

    if (isExist) {
      removeFavorite(user.uid, favorite.id).catch((error) => {
        console.error('Failed to remove favorite:', error);
        Alert.alert('操作失敗', '無法取消收藏，請稍後再試');
      });
    } else {
      addFavorite(user.uid, favorite).catch((error) => {
        console.error('Failed to add favorite:', error);
        Alert.alert('操作失敗', '無法加入收藏，請稍後再試');
      });
    }
  };

  return (
    <FavoritesContext.Provider value={{ favorites, loading, toggleFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within FavoritesProvider');
  }
  return context;
}
