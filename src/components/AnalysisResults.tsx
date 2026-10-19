import { canReviewInBatch } from '../services/ocr/reviewBatch.ts';
import { placeEvidence, buildSearchPlan } from '../services/resolution/placeEvidence.ts';
import { useState } from 'react';
import type { AnalysisItem } from '../domain/types.ts';
import { Image, Pressable, StyleSheet, Text, TextInput, Switch, View } from 'react-native';
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
    <View style={styles.heading}><View style={styles.sparkle}><Icon name="sparkles-outline" size={23} /></View><View style={{ flex: 1 }}><Text style={styles.eyebrow}>YOUR LITTLE DISCOVERIES</Text><Text accessibilityRole="header" style={styles.title}>{completed === report.items.length && completed ? '수집함에 담았어요' : report.mode === 'ocr' ? `미확인 후보 ${report.items.length}개` : `${report.items.length}개의 장소를 찾았어요`}</Text></View>{image && <Image source={{ uri: displayImageUri(image) }} style={styles.preview} accessibilityLabel="선택한 사진" />}</View>
    {report.mode === 'ocr' && <Text style={styles.subtitle}>{report.items.some(item=>item.matches.some(m=>m.verification==='official')) ? '공식 지도 검색 결과를 포함한 후보예요. 이름·주소와 지점을 확인해주세요.' : '사진에서 읽은 미확인 후보예요. 지도 API 확인 전이므로 이름·주소를 확인한 뒤 저장해주세요.'}</Text>}
    {report.mode === 'mock' && <View style={styles.mockBanner}><Tag mock>Mock</Tag><Text style={styles.mockText}>사진을 실제로 분석한 결과가 아닌 체험 데이터예요. 지도 API로 확인하지 않았어요.</Text></View>}
    {report.mode === 'ocr' && report.sources?.length ? <View style={styles.result}><Text style={styles.title}>사진 {report.sources.length}장 분석 결과</Text>{report.sources.map(s => <View key={s.imageId} style={{gap:8}}><Text style={styles.subtitle}>사진 {s.index+1}: {s.status==='found'?`후보 ${s.count}개`:s.status==='duplicate'?'같은 주소의 중복 후보':s.status==='error'?'분석 실패 · 다른 사진의 결과는 유지했어요':'장소 글자를 찾지 못했어요'}</Text>{['empty','error'].includes(s.status) && <Button label={`사진 ${s.index+1} 장소 직접 보완`} secondary disabled={!!app.busy || report.items.some(i=>i.candidate.sourceImageUri === ((report.source.kind==='image'||report.source.kind==='screenshot') ? report.source.images[s.index]?.reference : ''))} onPress={()=>app.addSourceCandidate(s.imageId)}/>}</View>)}</View> : null}
    {report.mode === 'ocr' && report.rawText && <OcrText text={report.rawText} />}
    {!report.items.length && <Text style={styles.subtitle}>장소를 찾지 못했어요. 사진이나 본문을 다시 선택해주세요.</Text>}
    {report.items.map(item => <View style={styles.result} key={item.id}>
      <View style={styles.resultRow}><View style={styles.placeIcon}><Icon name="location-outline" size={21} /></View><View style={{ flex: 1 }}><Text style={styles.placeName}>{item.selected?.name || item.candidate.name}</Text><Text style={styles.address}>{item.selected?.address || item.candidate.addressHint || (report.mode === 'ocr' ? '주소를 읽지 못했어요.' : '어느 곳인가요? 지점만 골라주세요.')}</Text></View>{item.decision === 'saved' && <Icon name="checkmark-circle" />}</View>
      {report.mode === 'ocr' && (report.source.kind === 'image' || report.source.kind === 'screenshot') && <Text style={styles.subtitle}>사진 {report.source.images.findIndex(image => image.reference === item.candidate.sourceImageUri) + 1}에서 읽은 후보</Text>}
      {item.candidate.aliases?.length ? <Text style={styles.subtitle}>함께 읽은 표기: {item.candidate.aliases.join(' · ')}</Text> : null}
      {item.candidate.recognitionWarning && <Text style={styles.warning}>{item.candidate.recognitionWarning}</Text>}
      {item.decision === 'duplicate' && <Text style={styles.savedText}>이미 저장한 장소예요</Text>}
      {item.decision === 'saved' && <Text style={styles.savedText}>{item.selected?.verification === 'mock' ? 'Mock 장소 저장됨' : item.selected?.verification === 'unverified' ? '직접 확인 후 저장 · 지도 API 미확인' : '저장됨'}</Text>}
      {item.matches.length > 1 && !['saved', 'duplicate'].includes(item.decision) && <View accessibilityRole="radiogroup" accessibilityLabel="지점 선택" style={styles.branches}>{item.matches.map(match => <Pressable accessibilityRole="radio" accessibilityLabel={match.name} accessibilityState={{ checked: item.selected?.providerId === match.providerId, disabled: !!app.busy }} disabled={!!app.busy} onPress={() => app.choose(item.id, match)} key={match.providerId || match.address} style={styles.branch}><Icon name={item.selected?.providerId === match.providerId ? 'radio-button-on' : 'radio-button-off'} size={21} /><View style={{ flex: 1 }}><Text style={styles.branchName}>{match.name}</Text><Text style={styles.address}>{match.address}</Text></View></Pressable>)}</View>}
      {report.mode === 'ocr' && !['saved', 'duplicate'].includes(item.decision) && <View style={{gap:12}}><SearchEvidence item={item} />{!item.matches.some(m=>m.verification==='official') && <CandidateReview item={item} />}</View>}
      {item.decision === 'unresolved' && report.mode !== 'ocr' && <Text style={styles.subtitle}>{report.mode === 'mock' ? '이 장소는 아직 확인할 수 없어요. 현재 Mock에 등록된 예시만 분석할 수 있습니다.' : '공식 검색에서 일치하는 장소를 찾지 못했어요. 주소가 보이는 캡처나 본문으로 다시 시도해주세요.'}</Text>}
      {item.decision === 'ready' && item.selected?.verification === 'unverified' && !item.confirmed && report.mode !== 'ocr' && <Text style={styles.subtitle}>실제 장소 검색 API 연결이 필요해요. 확인되지 않은 장소는 자동 저장하지 않아요.</Text>}
    </View>)}
    {report.mode === 'ocr' && <BatchReview key={report.items[0]?.id || 'empty'} />}
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
  placeName: { fontSize: 17, lineHeight: 26, fontWeight: '600', color: colors.ink }, address: { fontSize: 15, color: colors.muted, lineHeight: 24, marginTop: 3 },
  savedText: { color: colors.green, fontSize: 14, marginLeft: 49 }, subtitle: { color: colors.ink, fontSize: 15, lineHeight: 24 }, warning: { color: colors.amber, fontSize: 15, lineHeight: 24 },
  branches: { marginTop: 4, gap: 8 }, branch: { flexDirection: 'row', gap: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, minHeight: 68 },
  branchName: { color: colors.ink, fontSize: 14, fontWeight: '500' }, again: { minHeight: 46, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }, againText: { color: colors.green, fontSize: 13 },
});

function CandidateReview({ item }: { item: AnalysisItem }) {
  const app = useSpotClip();
  const [name, setName] = useState(item.candidate.name);
  const [address, setAddress] = useState(item.candidate.addressHint || '');
  return <View style={{ gap: 10 }}><Text style={styles.subtitle}>지도 API 미확인 · 잘못 읽힌 글자가 있으면 수정해주세요.</Text>
    <Text style={styles.subtitle}>장소명</Text><TextInput accessibilityLabel="후보 장소명" value={name} onChangeText={value => {setName(value);app.editCandidate(item.id,value,address);}} maxLength={150} editable={!app.busy} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, color: colors.ink, fontSize: 16, minHeight: 48 }} />
    <Text style={styles.subtitle}>주소</Text><TextInput accessibilityLabel="후보 주소" placeholder="주소를 못 읽었으면 비워둬도 돼요" value={address} onChangeText={value => {setAddress(value);app.editCandidate(item.id,name,value);}} maxLength={300} editable={!app.busy} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, color: colors.ink, fontSize: 16, minHeight: 48 }} />
    <Button label="확인하고 저장" secondary disabled={!!app.busy || !name.trim()} onPress={() => { app.confirmCandidate(item.id, name, address); void app.save(); }} />
  </View>;
}
function OcrText({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return <View><Pressable accessibilityRole="button" onPress={() => setOpen(!open)} style={{ paddingVertical: 12 }}><Text style={styles.againText}>{open ? '읽은 원문 접기' : '사진에서 읽은 원문 보기'}</Text></Pressable>{open && <Text selectable style={styles.subtitle}>{text}</Text>}</View>;
}

function SearchEvidence({ item }: { item: AnalysisItem }) {
  const app = useSpotClip(); const evidence = placeEvidence(item.candidate);
  const [open, setOpen] = useState(false); const plan = buildSearchPlan(item.candidate);
  return <View style={{gap:10}}>
    <Text style={styles.subtitle}>{[evidence.category && `업종 단서: ${evidence.category}`, evidence.region && `지역 단서: ${evidence.region}`].filter(Boolean).join(' · ') || '읽힌 상호로 검색할 수 있어요.'}</Text>
    <Pressable accessibilityRole="button" onPress={() => setOpen(!open)} style={{minHeight:44,justifyContent:'center'}}><Text style={styles.againText}>{open ? '검색 단서 접기' : '검색 단서 보기'}</Text></Pressable>
    {open && <View style={{gap:8}}><Text style={styles.subtitle}>{app.placeSearchConfigured ? '장소 검색 서버가 설정되어 있어요. 아래는 검색어 계획이며 결과 자체가 아닙니다.' : '자동 장소 검색은 아직 미연결이에요. 아래는 준비된 검색어이며 실제 검색 결과가 아닙니다.'}</Text>{plan.map((s,i) => <Text key={s.query} style={styles.subtitle}>{i+1}. {s.query}</Text>)}</View>}
    {open && <Button label="네이버지도에서 찾기" secondary disabled={!!app.busy || !plan.length} onPress={() => void app.searchCandidate(item.candidate,'naver')} />}
    {open && <Button label="카카오맵에서 찾기" secondary disabled={!!app.busy || !plan.length} onPress={() => void app.searchCandidate(item.candidate,'kakao')} />}
  </View>;
}

function BatchReview() {
  const app=useSpotClip();const [checked,setChecked]=useState(false);const report=app.report!;
  const count=report.items.filter(canReviewInBatch).length;
  const pending=report.items.filter(i=>!['saved','duplicate'].includes(i.decision)).length;
  if(!pending)return null;
  return <View style={styles.result}>
    <Text style={styles.title}>확인한 장소 한 번에 담기</Text>
    <Text style={styles.subtitle}>이름을 확인한 {count}곳을 SpotClip에 저장해요. 지도 즐겨찾기에 자동 저장되는 기능은 아니에요.</Text>
    {report.items.some(i=>canReviewInBatch(i)&&!i.candidate.addressHint?.trim()&&i.selected?.verification!=='official') && <Text style={styles.warning}>주소를 못 읽은 장소도 미확인 상태로 저장해요. 주소를 만들어 넣지 않습니다.</Text>}
    {pending>count && <Text style={styles.warning}>이름이 없거나 지점 선택이 필요한 {pending-count}곳은 확인이 필요해요.</Text>}
    <View style={{flexDirection:'row',gap:12,alignItems:'center'}}><Text style={[styles.subtitle,{flex:1}]}>저장할 이름과 주소를 확인했어요.</Text><Switch accessibilityLabel="일괄 저장할 이름과 주소 확인" value={checked} onValueChange={setChecked} disabled={!!app.busy}/></View>
    <Button label={`한 번에 저장 (${count}곳)`} disabled={!!app.busy || !checked || !count} onPress={() => void app.saveBatch()}/>
  </View>;
}
