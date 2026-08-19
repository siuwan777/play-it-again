import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { getInboxBadgeCount, getOtherPartyId, subscribeUserConversations } from '../utils/chat';
import { useBlockedUserIds } from './useBlockedUserIds';

export function useInboxBadge() {
  const [userId, setUserId] = useState<string | null>(null);
  const [badgeCount, setBadgeCount] = useState(0);
  const { blockedUserIds } = useBlockedUserIds();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid ?? null);
    });
    return unsubscribeAuth;
  }, []);

  useEffect(() => {
    if (!userId) {
      setBadgeCount(0);
      return;
    }

    const unsubscribe = subscribeUserConversations(
      userId,
      (conversations) => {
        const visibleConversations = conversations.filter((conversation) => {
          const otherUserId = getOtherPartyId(conversation, userId);
          return !otherUserId || !blockedUserIds.has(otherUserId);
        });
        setBadgeCount(getInboxBadgeCount(visibleConversations, userId));
      },
      (error) => console.error('Failed to load inbox badge:', error)
    );

    return unsubscribe;
  }, [userId, blockedUserIds]);

  return { userId, badgeCount };
}
