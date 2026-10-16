import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Category, Place } from '../domain/types.ts';
import { Button, Icon, Tag, type IconName } from './ui.tsx';
import { colors, shadow } from './theme.ts';
import { displayImageUri } from '../platform/images/nativeImages';
import { useSpotClip } from '../services/AppProvider.tsx';
const categoryIcons: Record<Category, IconName> = { 맛집: 'restaurant-outline', 카페: 'cafe-outline', 여행: 'leaf-outline', 쇼핑: 'bag-handle-outline', 기타: 'location-outline' };
const platformNames = { instagram: 'Instagram', threads: 'Threads', tiktok: 'TikTok', youtube: 'YouTube', 'naver-blog': '네이버 블로그', web: '웹 링크', photo: '사진', text: '본문' };
export default function PlaceCard({ place, onEdit }: { place: Place; onEdit: () => void }) {
  const app = useSpotClip();
  return <View style={styles.card} testID="place-card"><View style={styles.top}>
    {place.sourceImageUri ? <Image style={styles.picture} source={{ uri: displayImageUri(place.sourceImageUri) }} accessibilityLabel={`${place.name} 저장 사진`} /> : <View style={[styles.picture, styles.picturePlaceholder]}><Icon name={categoryIcons[place.category]} size={30} /></View>}
    <View style={{ flex: 1, gap: 5 }}><View style={styles.tags}><Tag>{place.category}</Tag>{place.verification === 'mock' && <Tag mock>Mock</Tag>}{place.visited && <Text style={styles.visited}>다녀옴</Text>}</View><Text style={styles.name}>{place.name}</Text></View>
    <Pressable accessibilityRole="button" accessibilityLabel={`${place.name} 수정`} onPress={onEdit} disabled={!!app.busy} style={styles.more}><Icon name="ellipsis-horizontal" size={22} color={colors.muted} /></Pressable>
  </View><View style={styles.addressRow}><Icon name="location-outline" size={14} color={colors.muted} /><Text style={styles.address}>{place.address}</Text></View><Text style={styles.source}>{platformNames[place.sourcePlatform]}에서 저장 · {new Date(place.createdAt).toLocaleDateString('ko-KR')}</Text>
    {place.note ? <Text style={styles.note}>{place.note}</Text> : null}
    <View style={styles.maps}><Button label="네이버지도" secondary icon="navigate-outline" onPress={() => void app.map(place, 'naver')} disabled={!!app.busy} style={styles.mapButton} /><Button label="카카오맵" secondary icon="map-outline" onPress={() => void app.map(place, 'kakao')} disabled={!!app.busy} style={styles.mapButton} /></View>
  </View>;
}
const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 19, padding: 17, gap: 10, marginBottom: 14, ...shadow },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 }, picture: { width: 61, height: 68, borderRadius: 13 }, picturePlaceholder: { backgroundColor: colors.greenLight, alignItems: 'center', justifyContent: 'center' }, tags: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { fontSize: 16, lineHeight: 25, color: colors.ink, fontWeight: '600', letterSpacing: -0.3 }, more: { width: 32, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' },
  addressRow: { flexDirection: 'row', gap: 4, alignItems: 'flex-start', marginTop: 3 }, address: { flex: 1, color: colors.muted, fontSize: 12, lineHeight: 19 }, source: { fontSize: 11, color: colors.muted }, note: { backgroundColor: '#F7F8F3', borderRadius: 9, padding: 10, color: colors.muted, fontSize: 13, lineHeight: 22 }, visited: { fontSize: 10, color: colors.green },
  maps: { flexDirection: 'row', gap: 8, marginTop: 5 }, mapButton: { flex: 1, minHeight: 47, paddingHorizontal: 8, paddingVertical: 12, borderRadius: 10 },
});
