import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../../constants/theme';

/** 設為 true 即可在底部 Tab 重新顯示討論區 */
const SHOW_FORUM_TAB = false;

export default function TabLayout() {
  return (
    <>
    <StatusBar style="dark" backgroundColor={colors.background} />
    <Tabs 
      screenOptions={{
        sceneContainerStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          backgroundColor: colors.paper,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerShown: false, // 隱藏系統預設的頂部標題（因為我們自己在頁面裡有做更漂亮的 Header 了）
      }}
    >
      {/* 第 1 顆按鈕：市集首頁 */}
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: '逛市集',
          tabBarIcon: ({ color, size }) => <Ionicons name="storefront" size={size} color={color} />
        }} 
      />
      
      {/* 第 2 顆按鈕：訊息 */}
      <Tabs.Screen
        name="messages"
        options={{
          title: '訊息',
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble-ellipses" size={size} color={color} />,
        }}
      />

      {/* 討論區（SHOW_FORUM_TAB 為 false 時隱藏 Tab，路由仍保留） */}
      <Tabs.Screen
        name="forum"
        options={{
          title: '討論區',
          href: SHOW_FORUM_TAB ? undefined : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
        }}
      />
      
      {/* 第 4 顆按鈕：免費放售 (稍微放大一點點，強調主要功能) */}
      <Tabs.Screen 
        name="post" 
        options={{ 
          title: '放售',
          tabBarIcon: ({ color }) => <Ionicons name="add-circle" size={28} color={color} />
        }} 
      />
      
      {/* 第 5 顆按鈕：個人檔案 */}
      <Tabs.Screen 
        name="profile" 
        options={{ 
          title: '個人',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />
        }} 
      />
    </Tabs>
    </>
  );
}