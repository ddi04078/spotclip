import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSpotClip } from '../services/AppProvider.tsx';
import { Button, Icon, Tag } from './ui.tsx';
import { colors, shadow } from './theme.ts';
import { displayImageUri } from '../platform/images/nativeImages';

export default function AnalysisResults() {
  const app = useSpotClip(); const router = useRouter();
  const report = app.report;
  if (!report) return null;
  const ready = report.items.filter(item => item.decision === 'ready' && item.confirmed).length;
  const completed = report.items.filter(item => ['saved', 'duplicate'].includes(item.decision)).length;
  const image = report.source.kind === 'image' || report.source.kind === 'screenshot' ? report.source.images[0]?.reference : undefined;
  return <View style={styles.container} testID="analysis-results">
    <View style={styles.heading}><View style={styles.sparkle}><Icon name="sparkles-outline" size={23} /></View><View style={{ flex: 1 }}><Text style={styles.eyebrow}>YOUR LITTLE DISCOVERIES</Text><Text accessibilityRole="header" style={styles.title}>{completed === report.items.length && completed ? '수집함에 담았어요' : `${report.items.length}개의 장소를 찾았어요`}</Text></View>{image && <Image source={{ uri: displayImageUri(image) }} style={styles.preview} accessibilityLabel="선택한 사진" />}</View>
    {report.mode === 'ocr' && <Text style={styles.subtitle}>기기 OCR 결과예요. 장소 검색은 아직 Mock이며 AI는 호출하지 않았어요.</Text>}
    {report.mode === 'mock' && <View style={styles.mockBanner}><Tag mock>Mock</Tag><Text style={styles.mockText}>사진을 실제로 분석한 결과가 아닌 체험 데이터예요. 지도 API로 확인하지 않았어요.</Text></View>}
    {!report.items.length && <Text style={styles.subtitle}>장소를 찾지 못했어요. 사진이나 본문을 다시 선택해주세요.</Text>}
    {report.items.map(item => <View style={styles.result} key={item.id}>
      <View style={styles.resultRow}><View style={styles.placeIcon}><Icon name="location-outline" size={21} /></View><View style={{ flex: 1 }}><Text style={styles.placeName}>{item.selected?.name || item.candidate.name}</Text><Text style={styles.address}>{item.selected?.address || '어느 곳인가요? 지점만 골라주세요.'}</Text></View>{item.decision === 'saved' && <Icon name="checkmark-circle" />}</View>
      {item.decision === 'duplicate' && <Text style={styles.savedText}>이미 저장한 장소예요</Text>}
      {item.decision === 'saved' && <Text style={styles.savedText}>{item.selected?.verification === 'mock' ? 'Mock 장소 저장됨' : '저장됨'}</Text>}
      {item.matches.length > 1 && !['saved', 'duplicate'].includes(item.decision) && <View accessibilityRole="radiogroup" accessibilityLabel="지점 선택" style={styles.branches}>{item.matches.map(match => <Pressable accessibilityRole="radio" accessibilityLabel={match.name} accessibilityState={{ checked: item.selected?.providerId === match.providerId, disabled: !!app.busy }} disabled={!!app.busy} onPress={() => app.choose(item.id, match)} key={match.providerId || match.address} style={styles.branch}><Icon name={item.selected?.providerId === match.providerId ? 'radio-button-on' : 'radio-button-off'} size={21} /><View style={{ flex: 1 }}><Text style={styles.branchName}>{match.name}</Text><Text style={styles.address}>{match.address}</Text></View></Pressable>)}</View>}
      {item.decision === 'unresolved' && <Text style={styles.subtitle}>{report.mode === 'mock' ? '이 장소는 아직 확인할 수 없어요. 현재 Mock에 등록된 예시만 분석할 수 있습니다.' : '공식 검색에서 일치하는 장소를 찾지 못했어요. 주소가 보이는 캡처나 본문으로 다시 시도해주세요.'}</Text>}
      {item.decision === 'ready' && item.selected?.verification === 'unverified' && <Text style={styles.subtitle}>실제 장소 검색 API 연결이 필요해요. 확인되지 않은 장소는 자동 저장하지 않아요.</Text>}
    </View>)}
    {ready > 0 && <Button label={`모두 저장 (${ready}곳)`} onPress={() => void app.save()} disabled={!!app.busy} icon="bookmark-outline" />}
    {completed > 0 && <Button label="내 장소에서 확인하기" icon="arrow-forward" onPress={() => router.navigate('/places')} disabled={!!app.busy} />}
    <Pressable accessibilityRole="button" disabled={!!app.busy} onPress={() => void app.reset()} style={styles.again}><Text style={styles.againText}>다른 사진으로 새로 담기</Text><Icon name="add" size={18} /></Pressable>
  </View>;
}
const styles = StyleSheet.create({
  container: { gap: 14 }, heading: { flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 6 },
  sparkle: { width: 43, height: 43, borderRadius: 14, backgroundColor: colors.greenLight, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 8, letterSpacing: 1.3, color: colors.muted, marginBottom: 6 },
  title: { fontSize: 20, fontWeight: '700', letterSpacing: -0.6, color: colors.ink },
  preview: { width: 43, height: 54, borderRadius: 9 },
  mockBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FBF2E5', borderRadius: 12, padding: 12 },
  mockText: { fontSize: 11, lineHeight: 18, color: colors.amber, flex: 1 },
  result: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 17, padding: 16, gap: 10, ...shadow },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  placeIcon: { width: 38, height: 43, borderRadius: 12, backgroundColor: colors.greenLight, alignItems: 'center', justifyContent: 'center' },
  placeName: { fontSize: 15, lineHeight: 23, fontWeight: '600', color: colors.ink }, address: { fontSize: 12, color: colors.muted, lineHeight: 20, marginTop: 3 },
  savedText: { color: colors.green, fontSize: 11, marginLeft: 49 }, subtitle: { color: colors.muted, fontSize: 12, lineHeight: 21 },
  branches: { marginTop: 4, gap: 8 }, branch: { flexDirection: 'row', gap: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, minHeight: 68 },
  branchName: { color: colors.ink, fontSize: 14, fontWeight: '500' }, again: { minHeight: 46, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }, againText: { color: colors.green, fontSize: 13 },
});
