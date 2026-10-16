import { createRoot } from 'react-dom/client';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AddScreen from '../../app/(tabs)/index.tsx';
import PlacesScreen from '../../app/(tabs)/places.tsx';
import SettingsScreen from '../../app/settings.tsx';
import { AppProvider } from '../../src/services/AppProvider.tsx';
import AppFrame from '../../src/components/AppFrame.web.tsx';
import { colors } from '../../src/components/theme.ts';
import { Icon } from '../../src/components/ui.tsx';
import { NavigationProvider, useNavigation } from './navigation.tsx';

function Preview() {
  const { page, setPage } = useNavigation();
  return <AppFrame><View style={styles.app}>
    {page === 'settings' && <Pressable accessibilityRole="button" accessibilityLabel="설정 닫기" onPress={() => setPage('add')} style={styles.back}><Icon name="chevron-back" /><Text style={styles.backText}>돌아가기</Text></Pressable>}
    <View style={styles.content}>{page === 'settings' ? <SettingsScreen /> : page === 'places' ? <PlacesScreen /> : <AddScreen />}</View>
    <View style={styles.nav} accessibilityRole="tablist">{([{ page: 'add', label: '추가', icon: 'add-circle-outline' }, { page: 'places', label: '내 장소', icon: 'bookmark-outline' }] as const).map(item => <Pressable key={item.page} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected: page === item.page }} onPress={() => setPage(item.page)} style={styles.tab}><Icon name={item.icon} color={page === item.page ? colors.green : colors.muted} /><Text style={[styles.tabText, page === item.page && { color: colors.green, fontWeight: '700' }]}>{item.label}</Text></Pressable>)}</View>
  </View></AppFrame>;
}
const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.background }, content: { flex: 1 },
  nav: { flexDirection: 'row', backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border, minHeight: 65 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9 }, tabText: { color: colors.muted, fontSize: 12 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, minHeight: 48 }, backText: { fontSize: 14, color: colors.green },
});
createRoot(document.getElementById('root')!).render(<NavigationProvider><AppProvider><Preview /></AppProvider></NavigationProvider>);
