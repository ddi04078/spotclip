import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSpotClip } from '../../src/services/AppProvider.tsx';
import { Button, Icon, Notice, Tag, sharedStyles } from '../../src/components/ui.tsx';
import { colors, shadow } from '../../src/components/theme.ts';
import AnalysisResults from '../../src/components/AnalysisResults.tsx';
import { sourceFromShare } from '../../src/platform/share/payload.ts';
import { parsePublicUrl } from '../../src/domain/place.ts';

export default function AddScreen() {
  const app = useSpotClip(); const router = useRouter();
  const [tab, setTab] = useState<'photo' | 'link'>('photo'); const [input, setInput] = useState('');
  const scroll = useRef<ScrollView>(null);
  const disabled = !!app.busy || !app.ready;
  function submit() {
    const trimmed = input.trim();
    void app.ingestPlaceSource(parsePublicUrl(trimmed) ? sourceFromShare({ url: trimmed }) : { kind: 'text', text: trimmed });
  }
  return <SafeAreaView edges={['top']} style={sharedStyles.screen}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={sharedStyles.scroll}>
    <View style={styles.topbar}><View style={styles.brand}><View style={styles.brandIcon}><Icon name="location-outline" color="#FFFFFF" size={21} /></View><Text style={styles.brandText}>spotclip<Text style={{ color: '#C39B72' }}>.</Text></Text></View><Pressable accessibilityRole="button" accessibilityLabel="설정 및 사용 안내" onPress={() => router.push('/settings')} style={styles.settings}><Icon name="options-outline" size={23} /></Pressable></View>
    <View style={styles.intro}><View style={styles.eyebrow}><View style={styles.line} /><Text style={styles.eyebrowText}>FROM YOUR FEED, TO YOUR MAP</Text></View><Text accessibilityRole="header" style={sharedStyles.h1}>SNS에서 발견한 장소,{`\n`}사진이나 링크만 넣으세요.</Text><Text style={sharedStyles.body}>스크롤하다 만난 그곳, 잊지 않도록.{`\n`}SpotClip에 담아두고 다음에 찾아가요.</Text><View style={styles.heroStamp}><Icon name="sparkles-outline" size={18} /><Text style={styles.stampText}>작은 발견이 다음 여행이 되는 곳</Text></View></View>
    <View style={styles.modeRow}><Tag mock={!app.realMode}>{app.ocrMode ? '기기 OCR · 장소 검색 Mock' : app.realMode ? '실제 분석 모드' : '체험 모드 · Mock'}</Tag><Pressable disabled={disabled} accessibilityRole="button" accessibilityLabel="Mock 테스트 설정" onPress={() => router.push('/settings')} style={styles.modeButton}><Text style={styles.modeText}>{app.ocrMode ? 'OCR 테스트 중' : app.realMode ? '연결 설정' : app.mockAutoSave ? '자동 저장 켜짐' : '확인 후 저장'}</Text><Icon name="chevron-forward" size={14} /></Pressable></View>
    <View style={styles.inputCard}><View style={styles.tabs}><Pressable accessibilityRole="tab" accessibilityState={{ selected: tab === 'photo' }} accessibilityLabel="사진" disabled={disabled} onPress={() => setTab('photo')} style={[styles.tab, tab === 'photo' && styles.selectedTab]}><Icon name="images-outline" size={18} color={tab === 'photo' ? colors.green : colors.muted} /><Text style={[styles.tabText, tab === 'photo' && styles.selectedText]}>사진</Text></Pressable><Pressable accessibilityRole="tab" accessibilityState={{ selected: tab === 'link' }} accessibilityLabel="링크 · 본문" disabled={disabled} onPress={() => setTab('link')} style={[styles.tab, tab === 'link' && styles.selectedTab]}><Icon name="link-outline" size={18} /><Text style={[styles.tabText, tab === 'link' && styles.selectedText]}>링크 · 본문</Text></Pressable></View>
      {tab === 'photo' ? <View style={styles.photoPanel}><View style={styles.uploadIcon}><Icon name="image-outline" size={34} /><View style={styles.uploadPlus}><Icon name="add" size={12} /></View></View><Text style={styles.uploadHeading}>가고 싶은 곳이 보이는 캡처가 있나요?</Text><Text style={styles.uploadDescription}>사진을 골라 한 번에 장소를 모아보세요.</Text><Button label="사진 / 스크린샷 올리기" icon="add-outline" onPress={() => void app.pick()} disabled={disabled} style={{ alignSelf: 'stretch' }} /><Text style={styles.uploadFootnote}>{app.realMode ? '분석 요청 합계 4MB 이하 · JPG, PNG, WebP' : '사진 최대 10장 · 장당 15MB'}</Text></View>
        : <View style={styles.linkPanel}><Text style={sharedStyles.label}>SNS 게시물 링크 또는 본문</Text><TextInput accessibilityLabel="게시물 링크 또는 본문" placeholder="Instagram, Threads, TikTok, 블로그 링크…" placeholderTextColor="#9BA593" value={input} maxLength={15000} onChangeText={setInput} multiline autoCapitalize="none" autoCorrect={false} style={[sharedStyles.field, { minHeight: 120, textAlignVertical: 'top' }]} editable={!disabled} /><Text style={styles.linkHint}>게시물 링크의 본문은 직접 읽을 수 없어요. 캡처 사진이나 복사한 본문을 넣어주세요.</Text><Button label="장소 찾기" icon="sparkles-outline" onPress={submit} disabled={disabled || !input.trim()} /></View>}
    </View>
    <Text style={styles.mockWarning}>{app.ocrMode ? 'Apple Vision이 기기에서 글자를 읽어요. 장소 검색은 아직 Mock이며, 확인되지 않은 후보는 저장하지 않아요. AI 호출은 없어요.' : app.realMode ? '선택한 사진·본문을 외부 서버와 AI로 전송해 분석해요. 명확하지 않은 장소는 확인 후 저장해요. 서버 오류 시 Mock 결과로 대신 저장하지 않아요.' : '현재는 선택한 사진과 무관한 Mock 예시로 분석·저장 흐름을 체험합니다. 실제 분석은 설정에서 서버 연결 후 사용할 수 있어요.'}</Text>
    {app.busy && <Notice progress>{app.busy}</Notice>}{app.error && <Notice error>{app.error}</Notice>}{app.notice && <Notice>{app.notice}</Notice>}
    {app.urlBlocked && <Button label="게시물 캡처 사진 올리기" secondary icon="image-outline" disabled={disabled} onPress={() => { setTab('photo'); void app.pick(); }} />}
    <View onLayout={() => { if (app.report) scroll.current?.scrollToEnd({ animated: true }); }}><AnalysisResults /></View>
    <View style={styles.footer}><Icon name="lock-closed-outline" size={13} color={colors.muted} /><Text style={styles.footerText}>{app.realMode ? '장소는 이 기기에 보관해요. 분석할 사진·본문은 외부로 전송해요.' : '장소는 이 기기에만 보관해요. 사진은 서버에 보내지 않아요.'}</Text></View>
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandIcon: { width: 31, height: 35, borderRadius: 11, borderBottomLeftRadius: 3, backgroundColor: colors.green, justifyContent: 'center', alignItems: 'center' },
  brandText: { fontSize: 27, fontWeight: '800', letterSpacing: -1.2, color: colors.ink }, settings: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  intro: { gap: 14, marginTop: 16, marginBottom: 4 }, eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 7 }, line: { width: 17, height: 1, backgroundColor: '#A0B396' }, eyebrowText: { fontSize: 9, letterSpacing: 1.1, color: colors.muted },
  heroStamp: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 1 }, stampText: { color: colors.muted, fontSize: 11 },
  modeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6 }, modeButton: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 3 }, modeText: { fontSize: 11, color: colors.muted },
  inputCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 22, overflow: 'hidden', ...shadow },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderColor: colors.border, paddingHorizontal: 22, gap: 26 }, tab: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingVertical: 16, borderBottomWidth: 2, borderBottomColor: 'transparent' }, selectedTab: { borderBottomColor: colors.green }, tabText: { fontSize: 13, fontWeight: '500', color: colors.muted }, selectedText: { color: colors.green, fontWeight: '700' },
  photoPanel: { padding: 22, alignItems: 'center', gap: 12 }, uploadIcon: { width: 64, height: 64, backgroundColor: colors.greenLight, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginTop: 7, marginBottom: 5 }, uploadPlus: { position: 'absolute', right: -4, bottom: -2, backgroundColor: colors.white, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 3 },
  uploadHeading: { fontSize: 14, fontWeight: '600', color: colors.ink, textAlign: 'center', lineHeight: 22 }, uploadDescription: { fontSize: 12, color: colors.muted, lineHeight: 20, textAlign: 'center', marginBottom: 6 }, uploadFootnote: { color: colors.muted, fontSize: 10 }, mockWarning: { fontSize: 11, lineHeight: 19, color: colors.amber, marginTop: -6 },
  linkPanel: { padding: 20, gap: 12 }, linkHint: { color: colors.muted, fontSize: 12, lineHeight: 21 }, footer: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginTop: 3 }, footerText: { fontSize: 10, color: colors.muted, lineHeight: 18 },
});
