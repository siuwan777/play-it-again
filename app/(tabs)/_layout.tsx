import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons'; // 引入 Expo 內建的強大圖示庫

export default function TabLayout() {
  return (
    <Tabs 
      screenOptions={{
        tabBarActiveTintColor: '#D97706', // 點擊時變成 PawnGong 專屬的琥珀色
        tabBarInactiveTintColor: '#9CA3AF', // 沒點擊時是低調的灰色
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#F3F4F6',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60, // 稍微加高一點點，按起來手感更好
          elevation: 10, // 給 Android 一點陰影
          shadowColor: '#000', // 給 iOS 一點陰影
          shadowOpacity: 0.05,
          shadowRadius: 10,
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

      {/* 第 3 顆按鈕：討論區 */}
      <Tabs.Screen 
        name="forum" 
        options={{ 
          title: '討論區',
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />
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
  );
}