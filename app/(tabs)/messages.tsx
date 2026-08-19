import { useNavigation } from 'expo-router';
import React, { useEffect } from 'react';
import ConversationList from '../../components/ConversationList';
import { useInboxBadge } from '../../hooks/useInboxBadge';

export default function MessagesTab() {
  const navigation = useNavigation();
  const { badgeCount } = useInboxBadge();

  useEffect(() => {
    const tabNavigation = navigation.getParent();
    if (!tabNavigation) return;

    tabNavigation.setOptions({
      tabBarBadge: badgeCount > 0 ? badgeCount : undefined,
    });
  }, [badgeCount, navigation]);

  return <ConversationList showHeader />;
}
