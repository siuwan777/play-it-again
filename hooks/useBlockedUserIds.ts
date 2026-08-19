import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { subscribeBlockedUserIds } from '../utils/userSafety';

export function useBlockedUserIds() {
  const [userId, setUserId] = useState<string | null>(null);
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid ?? null);
    });
    return unsubscribeAuth;
  }, []);

  useEffect(() => {
    if (!userId) {
      setBlockedUserIds(new Set());
      return;
    }

    const unsubscribe = subscribeBlockedUserIds(
      userId,
      setBlockedUserIds,
      (error) => console.error('Failed to load blocked users:', error)
    );

    return unsubscribe;
  }, [userId]);

  return { userId, blockedUserIds };
}
