import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle, type ColorValue } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { colors } from './theme.ts';
export type IconName = ComponentProps<typeof Ionicons>['name'];
export function Icon({ name, size = 22, color = colors.green }: { name: IconName; size?: number; color?: ColorValue }) { return <Ionicons name={name} size={size} color={color} />; }
export function Button({ label, onPress, disabled, secondary, icon, style, testID }: { label: string; onPress: () => void; disabled?: boolean; secondary?: boolean; icon?: IconName; style?: StyleProp<ViewStyle>; testID?: string }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }} disabled={disabled} testID={testID} onPress={onPress} style={({ pressed }) => [styles.button, secondary && styles.secondary, pressed && { opacity: 0.78 }, disabled && { opacity: 0.45 }, style]}>{icon && <Icon name={icon} size={20} color={secondary ? colors.green : colors.white} />}<Text style={[styles.buttonText, secondary && { color: colors.green }]}>{label}</Text></Pressable>;
}
export function Tag({ children, mock = false }: { children: ReactNode; mock?: boolean }) { return <View style={[styles.tag, mock && { backgroundColor: colors.peach }]}><Text style={[styles.tagText, mock && { color: colors.amber }]}>{children}</Text></View>; }
export function Notice({ children, error = false, progress = false }: { children: ReactNode; error?: boolean; progress?: boolean }) {
  return <View accessibilityRole={error ? 'alert' : undefined} accessibilityLiveRegion="polite" style={[styles.notice, error && { backgroundColor: '#F9ECE7' }]}>{progress ? <ActivityIndicator color={colors.green} /> : <Icon name={error ? 'alert-circle-outline' : 'checkmark-circle-outline'} color={error ? colors.red : colors.green} size={21} />}<Text style={[styles.noticeText, error && { color: colors.red }]}>{children}</Text></View>;
}
export const sharedStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: 22, paddingTop: 18, paddingBottom: 38, gap: 20, width: '100%', maxWidth: 720, alignSelf: 'center' },
  h1: { fontSize: 30, lineHeight: 43, fontWeight: '800', letterSpacing: -1.1, color: colors.ink },
  h2: { fontSize: 21, fontWeight: '700', letterSpacing: -0.5, color: colors.ink },
  body: { fontSize: 14, lineHeight: 24, color: colors.muted },
  label: { fontSize: 13, fontWeight: '600', color: colors.ink, marginBottom: 8 },
  field: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.white, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, color: colors.ink },
});
const styles = StyleSheet.create({
  button: { minHeight: 54, borderRadius: 15, backgroundColor: colors.green, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 9, paddingHorizontal: 18, paddingVertical: 14 },
  secondary: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  buttonText: { color: colors.white, fontSize: 15, fontWeight: '600' },
  tag: { backgroundColor: colors.greenLight, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 5, alignSelf: 'flex-start' },
  tagText: { color: colors.green, fontSize: 11, fontWeight: '600' },
  notice: { backgroundColor: colors.greenLight, borderRadius: 13, padding: 14, flexDirection: 'row', gap: 10, alignItems: 'center' },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 21, color: colors.green },
});
