import { StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import { colors } from './theme.ts';
export default function AppFrame({ children }: { children: ReactNode }) {
  return <View style={styles.desktop}><View style={styles.caption}><Text style={styles.title}>SpotClip · PC 테스트</Text><Text style={styles.description}>휴대폰 화면처럼 조작해보세요 · 장소 분석은 Mock입니다</Text></View><View style={styles.phone}>{children}</View></View>;
}
const styles = StyleSheet.create({
  desktop: { flex: 1, backgroundColor: '#E8EDE5', alignItems: 'center' },
  caption: { paddingVertical: 12, paddingHorizontal: 12, alignItems: 'center', gap: 5 },
  title: { fontSize: 13, fontWeight: '600', color: colors.green }, description: { fontSize: 11, color: colors.muted },
  phone: { flex: 1, width: '100%', maxWidth: 430, marginBottom: 12, backgroundColor: colors.background, overflow: 'hidden', borderWidth: 1, borderColor: '#D1DBCB', borderRadius: 20 },
});
