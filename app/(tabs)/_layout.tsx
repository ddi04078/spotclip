import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Icon } from '../../src/components/ui.tsx';
import { colors } from '../../src/components/theme.ts';
export default function TabLayout() {
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.green, tabBarInactiveTintColor: '#8A9786', tabBarStyle: { backgroundColor: '#FFFFFF', borderTopColor: colors.border, ...(Platform.OS === 'web' ? { height: 64, paddingBottom: 8, paddingTop: 5 } : {}) }, tabBarLabelStyle: { fontSize: 12, fontWeight: '600' } }}>
    <Tabs.Screen name="index" options={{ title: '추가', tabBarIcon: ({ color, focused }) => <Icon name={focused ? 'add-circle' : 'add-circle-outline'} color={color} size={25} /> }} />
    <Tabs.Screen name="places" options={{ title: '내 장소', tabBarIcon: ({ color, focused }) => <Icon name={focused ? 'bookmark' : 'bookmark-outline'} color={color} size={24} /> }} />
  </Tabs>;
}
