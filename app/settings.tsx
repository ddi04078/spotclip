import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSpotClip } from '../src/services/AppProvider.tsx';
import { colors } from '../src/components/theme.ts';
import { Button, Icon, Notice, Tag, sharedStyles } from '../src/components/ui.tsx';
import type { MockScenario } from '../src/services/providers/MockExtractionProvider.ts';
const scenarios: { id: MockScenario; label: string; description: string }[] = [
  { id: 'multiple', label: '여러 장소', description: '3곳을 찾는 흐름' },
  { id: 'single', label: '한 장소', description: '1곳을 찾는 흐름' },
  { id: 'ambiguous', label: '지점 선택', description: '어니언 지점을 고르는 흐름' },
];
export default function SettingsScreen() {
  const app = useSpotClip(); const router = useRouter();
  const [endpoint, setEndpoint] = useState(app.remoteEndpoint);
  const [token, setToken] = useState('');
  const [consent, setConsent] = useState(false);
  const disabled = !!app.busy || !app.ready;
  async function connect() { if (await app.configureRemote(endpoint, token, consent)) setToken(''); }
  return <ScrollView style={sharedStyles.screen} contentContainerStyle={sharedStyles.scroll}>
    <Button label="사진 올리기로 돌아가기" secondary onPress={() => router.back()} />
    <View style={styles.intro}><View style={styles.symbol}><Icon name="sparkles-outline" size={28} /></View><Text style={sharedStyles.h2}>가볍게 담고, 나중에 떠나요.</Text><Text style={sharedStyles.body}>사진을 고르면 장소를 찾고,{`\n`}명확한 장소는 바로 저장하는 앱을 만들고 있어요.</Text></View>
    <View style={styles.card}><Text style={sharedStyles.h2}>사진 속 글자 인식 · 무료 OCR</Text><Text style={sharedStyles.body}>{app.ocrAvailable ? '사진 속 글자를 기기에서 읽고, 장소 후보는 최대 5개만 만들어요. 웹은 한국어·영어 인식 파일을 처음 내려받습니다. 사진은 외부로 전송하지 않아요. 지도 API 확인과 AI 호출은 하지 않아요.' : '이 실행 환경에서는 기기 OCR을 사용할 수 없어요. 기본 Mock 테스트는 그대로 가능해요. OCR 테스트에는 iPhone Development Build가 필요합니다.'}</Text><Button label="기기 OCR 테스트 켜기" disabled={disabled || !app.ocrAvailable || app.ocrMode} onPress={() => void app.enableOcr()} />{app.ocrMode && <Button label="Mock으로 돌아가기" secondary disabled={disabled} onPress={() => void app.disableRemote()} />}</View>
    <View style={styles.card}><Text style={sharedStyles.body}>이번 검증 단계에서는 유료 AI 분석을 잠가두었어요. 기존 연결 코드는 유지하며 외부 API를 호출하지 않아요.</Text><Tag mock={!app.realMode}>{app.realMode ? '실제 분석 모드 · 연결 전 확인 필요' : '실제 분석 연결 설정'}</Tag>
      <Text style={sharedStyles.body}>배포한 분석 서버가 있을 때만 켜주세요. API 키는 서버에 설정하고, 아래에는 별도의 접근 토큰을 넣어요. 실제 분석에는 비용이 발생할 수 있어요.</Text>
      <Text style={sharedStyles.label}>분석 서버 주소</Text><TextInput accessibilityLabel="분석 서버 주소" value={endpoint} onChangeText={setEndpoint} placeholder="https://your-server.example/api/analyze" autoCapitalize="none" autoCorrect={false} editable={!disabled} style={sharedStyles.field} />
      <Text style={sharedStyles.label}>서버 접근 토큰 (API 키 아님)</Text><TextInput accessibilityLabel="서버 접근 토큰" value={token} onChangeText={setToken} secureTextEntry autoCapitalize="none" autoCorrect={false} editable={!disabled} style={sharedStyles.field} />
      <View style={styles.switch}><Text style={[sharedStyles.body, { flex: 1 }]}>선택한 사진·본문을 분석 서버와 OpenAI로 보내고, 추출한 장소명을 카카오 검색에 전달하는 데 동의해요.</Text><Switch accessibilityLabel="사진·본문 외부 전송 동의" value={consent} onValueChange={setConsent} disabled={disabled} /></View>
      <Text style={styles.scenarioDescription}>토큰과 동의는 이번 실행 중에만 유지해요. 새로고침하거나 앱을 다시 시작하면 Mock으로 돌아와요. 저장된 장소는 유지돼요. 서버 설정·API 키가 없으면 실제 분석은 동작하지 않아요.</Text>
      <Button label="실제 분석 모드 켜기" onPress={() => void connect()} disabled={disabled || !app.paidAnalysisEnabled || !consent || !endpoint.trim() || token.trim().length < 32} />
      {app.realMode && <Button label="Mock 체험으로 돌아가기" secondary onPress={() => { setToken(''); setConsent(false); void app.disableRemote(); }} disabled={disabled} />}
      {app.error && <Notice error>{app.error}</Notice>}{app.notice && <Notice>{app.notice}</Notice>}
    </View>
    {!app.realMode && <View style={styles.card}><Button label="예시 체험 모드" secondary disabled={disabled} onPress={() => void app.disableRemote()} /><Tag mock>사진과 무관한 예시 체험</Tag><Text style={sharedStyles.body}>‘예시 체험 모드’를 누른 경우에만 사진과 무관한 준비된 예시를 사용합니다. 예시 결과에는 Mock 표시가 남아요. 실제 사진은 OCR 모드에서 읽어주세요.</Text><Text style={sharedStyles.label}>어떤 흐름을 체험할까요?</Text>{scenarios.map(item => <Pressable key={item.id} accessibilityRole="radio" accessibilityLabel={item.label} accessibilityState={{ checked: app.scenario === item.id, disabled: !!app.busy }} disabled={!!app.busy} onPress={() => app.setScenario(item.id)} style={styles.scenario}><Icon name={app.scenario === item.id ? 'radio-button-on' : 'radio-button-off'} /><View><Text style={styles.scenarioTitle}>{item.label}</Text><Text style={styles.scenarioDescription}>{item.description}</Text></View></Pressable>)}<View style={styles.switch}><View style={{ flex: 1 }}><Text style={styles.scenarioTitle}>Mock 자동 저장</Text><Text style={styles.scenarioDescription}>켜면 명확한 체험 장소는 바로 저장돼요.{`\n`}애매한 지점은 항상 직접 선택해요.</Text></View><Switch accessibilityLabel="Mock 자동 저장" disabled={!!app.busy} value={app.mockAutoSave} onValueChange={app.setMockAutoSave} trackColor={{ true: colors.green, false: '#DCE4D7' }} /></View></View>}
    <View style={styles.card}><Text style={sharedStyles.h2}>사용 방법</Text><Text style={sharedStyles.body}>1. ‘사진 / 스크린샷 올리기’를 눌러요.{`\n`}2. 분석이 끝나면 저장 결과를 확인해요.{`\n`}3. 내 장소에서 네이버지도·카카오맵을 열어요.</Text><Text style={sharedStyles.body}>주소를 다시 타이핑할 필요 없이 지도 검색으로 연결해요. 현재는 Mock 결과라 실제 장소와 다를 수 있습니다.</Text></View>
    <View style={styles.card}><Text style={sharedStyles.h2}>사진과 장소 보관</Text><Text style={sharedStyles.body}>실제 분석 모드에서는 선택한 사진·본문을 외부 분석 서버로 보냅니다. 서버 구현은 사진을 저장하지 않으며, AI 제공업체의 데이터 처리 정책은 별도로 적용돼요. 장소 목록은 계속 이 기기에 보관돼요.</Text><Text style={sharedStyles.body}>{Platform.OS === 'web' ? 'PC 테스트에서는 작은 사진 미리보기와 장소를 이 브라우저에 보관해요. 모바일 앱과 동기화하지 않으며, 브라우저 데이터 삭제 시 사라질 수 있어요. Mock 모드에서는 사진을 서버로 전송하지 않아요.' : '선택한 사진은 앱 전용 폴더에 복사하고, 장소는 기기의 AsyncStorage에 보관해요. 사진 원본을 수정하지 않아요. Mock 모드에서는 서버로 전송하지 않아요. 앱 삭제 시 목록과 복사본도 삭제될 수 있어요.'}</Text><Text style={sharedStyles.body}>네이버지도·카카오맵의 개인 즐겨찾기에 자동으로 추가하지는 않아요. 지도 앱에서 저장 버튼을 눌러주세요.</Text></View>
    <View style={styles.card}><Text style={sharedStyles.h2}>앞으로 더 간편하게</Text><Text style={sharedStyles.body}>실제 AI·장소 검색 서버를 설정하고 검증한 뒤, iOS Share Extension과 Android Share Intent를 추가할 예정이에요. 이번 버전은 SNS 공유 메뉴에 직접 나타나지 않아요.</Text></View><Text style={styles.version}>SpotClip 0.2.0 · React Native + Expo</Text>
  </ScrollView>;
}
const styles = StyleSheet.create({
  intro: { gap: 13, marginBottom: 2 }, symbol: { width: 57, height: 57, borderRadius: 17, backgroundColor: colors.greenLight, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: colors.card, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: colors.border, gap: 15 }, scenario: { flexDirection: 'row', alignItems: 'center', gap: 11, minHeight: 62 }, scenarioTitle: { color: colors.ink, fontSize: 15, fontWeight: '500' }, scenarioDescription: { color: colors.muted, fontSize: 12, lineHeight: 21, marginTop: 5 }, switch: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 18 }, version: { textAlign: 'center', color: colors.muted, fontSize: 11, marginBottom: 8 },
});
