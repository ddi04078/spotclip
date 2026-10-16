import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Dimensions, Linking } from 'react-native';
import { AppProvider, type AppDependencies } from '../../src/services/AppProvider.tsx';
import AddScreen from '../../app/(tabs)/index.tsx';
import PlacesScreen from '../../app/(tabs)/places.tsx';
import SettingsScreen from '../../app/settings.tsx';
import { LocalPlaceStorage } from '../../src/storage/LocalPlaceStorage.ts';
import { MemoryStorage, ids } from '../unit/helpers.ts';
import { openMap } from '../../src/platform/linking/openMap.ts';
const mockNavigate = jest.fn(), mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ navigate: mockNavigate, push: mockPush }) }));

function dependencies(): AppDependencies {
  return {
    storage: new LocalPlaceStorage(new MemoryStorage()), id: ids(),
    pickImages: jest.fn(async () => [{ id: 'image-1', name: 'sns.png', reference: 'file:///app/spotclip-images/abc.png', thumbnail: 'file:///app/spotclip-images/abc.png', mediaType: 'image/png', size: 500 }]),
    pruneImages: jest.fn(async () => undefined), openMap,
  };
}
beforeEach(() => {
  jest.clearAllMocks();
  Dimensions.set({ window: { width: 390, height: 844, scale: 3, fontScale: 1 }, screen: { width: 390, height: 844, scale: 3, fontScale: 1 } });
  jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
});

test('390px iPhone flow: pick photo, auto-save 3 mock places, list, open real Linking map targets', async () => {
  const deps = dependencies();
  await render(<AppProvider dependencies={deps}><AddScreen /></AppProvider>);
  const upload = screen.getByRole('button', { name: '사진 / 스크린샷 올리기' });
  await waitFor(() => expect(upload).toBeEnabled());
  await fireEvent.press(upload);
  expect(deps.pickImages).toHaveBeenCalledTimes(1);
  expect(await screen.findByText(/사진 분석 중/)).toBeTruthy();
  expect(await screen.findByText('3곳 저장했어요.')).toBeTruthy();
  expect(await deps.storage.list()).toHaveLength(3);
  expect(screen.getAllByText(/Mock/).length).toBeGreaterThan(0);
  await fireEvent.press(screen.getByRole('button', { name: '내 장소에서 확인하기' }));
  expect(mockNavigate).toHaveBeenCalledWith('/places');
  await screen.rerender(<AppProvider dependencies={deps}><PlacesScreen /></AppProvider>);
  expect(screen.getAllByTestId('place-card')).toHaveLength(3);
  await fireEvent.press(screen.getAllByRole('button', { name: '네이버지도' })[0]);
  await waitFor(() => expect(Linking.openURL).toHaveBeenCalledWith(expect.stringMatching(/^https:\/\/map.naver.com\/p\/search\//)));
  await fireEvent.press(screen.getAllByRole('button', { name: '카카오맵' })[0]);
  await waitFor(() => expect(Linking.openURL).toHaveBeenCalledWith(expect.stringMatching(/^https:\/\/map.kakao.com\/link\/search\//)));
});

test('one-place manual-save mode, durable reload, search and duplicate prevention', async () => {
  const deps = dependencies();
  await render(<AppProvider dependencies={deps}><SettingsScreen /></AppProvider>);
  await waitFor(() => expect(screen.getByRole('radio', { name: '한 장소' })).toBeEnabled());
  await fireEvent.press(screen.getByRole('radio', { name: '한 장소' }));
  await fireEvent(screen.getByRole('switch', { name: 'Mock 자동 저장' }), 'valueChange', false);
  await screen.rerender(<AppProvider dependencies={deps}><AddScreen /></AppProvider>);
  await fireEvent.press(screen.getByRole('button', { name: '사진 / 스크린샷 올리기' }));
  await fireEvent.press(await screen.findByRole('button', { name: '모두 저장 (1곳)' }));
  expect(await screen.findByText('1곳 저장했어요.')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '사진 / 스크린샷 올리기' }));
  await fireEvent.press(await screen.findByRole('button', { name: '모두 저장 (1곳)' }));
  expect(await screen.findByText(/이미 저장한 1곳은 제외/)).toBeTruthy();
  expect(await deps.storage.list()).toHaveLength(1);
  await screen.unmount();
  await render(<AppProvider dependencies={deps}><PlacesScreen /></AppProvider>);
  expect(await screen.findByText('도온정 홍대')).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText('저장한 장소 검색'), '부산');
  expect(screen.queryAllByTestId('place-card')).toHaveLength(0);
});

test('ambiguous extraction asks for branch selection, never name typing', async () => {
  const deps = dependencies();
  await render(<AppProvider dependencies={deps}><SettingsScreen /></AppProvider>);
  await waitFor(() => expect(screen.getByRole('radio', { name: '지점 선택' })).toBeEnabled());
  await fireEvent.press(screen.getByRole('radio', { name: '지점 선택' }));
  await screen.rerender(<AppProvider dependencies={deps}><AddScreen /></AppProvider>);
  await fireEvent.press(screen.getByRole('button', { name: '사진 / 스크린샷 올리기' }));
  await screen.findByRole('radio', { name: '카페 어니언 성수' });
  expect(await deps.storage.list()).toHaveLength(0);
  await fireEvent.press(screen.getByRole('radio', { name: '카페 어니언 성수' }));
  await fireEvent.press(screen.getByRole('button', { name: '모두 저장 (1곳)' }));
  expect(await screen.findByText('1곳 저장했어요.')).toBeTruthy();
  expect((await deps.storage.list())[0].name).toBe('카페 어니언 성수');
});

test('URL reading is explicitly unavailable, gives actionable screenshot button', async () => {
  const deps = dependencies();
  await render(<AppProvider dependencies={deps}><AddScreen /></AppProvider>);
  await waitFor(() => expect(screen.getByRole('button', { name: '사진 / 스크린샷 올리기' })).toBeEnabled());
  await fireEvent.press(screen.getByRole('tab', { name: '링크 · 본문' }));
  await fireEvent.changeText(screen.getByLabelText('게시물 링크 또는 본문'), 'https://www.threads.com/@user/post/abc');
  await fireEvent.press(screen.getByRole('button', { name: '장소 찾기' }));
  expect(await screen.findByText(/이 게시물은 직접 읽을 수 없어요/)).toBeTruthy();
  expect(screen.getByRole('button', { name: '게시물 캡처 사진 올리기' })).toBeEnabled();
  expect(await deps.storage.list()).toHaveLength(0);
});

test('photo picker cancellation keeps previous results and does not fabricate a save', async () => {
  const deps = dependencies(); deps.pickImages = jest.fn(async () => null);
  await render(<AppProvider dependencies={deps}><AddScreen /></AppProvider>);
  await waitFor(() => expect(screen.getByRole('button', { name: '사진 / 스크린샷 올리기' })).toBeEnabled());
  await fireEvent.press(screen.getByRole('button', { name: '사진 / 스크린샷 올리기' }));
  expect(await deps.storage.list()).toHaveLength(0);
  expect(screen.queryByTestId('analysis-results')).toBeNull();
});

test('real analysis settings require consent, use injected transport and save an official result', async () => {
  const deps = dependencies(); deps.paidAnalysisEnabled = true; // Controlled transport only; production remains disabled.
  deps.readImage = jest.fn(async () => 'data:image/png;base64,aGVsbG8=');
  deps.request = jest.fn(async () => ({ ok: true, json: async () => ({ mode: 'api', items: [{ candidate: { name: '연결 테스트', confidence: .98 }, matches: [{ name: '연결 테스트', address: '서울 종로구 1', category: '카페', mapProvider: 'kakao', providerId: '123', verification: 'official', confidence: .99 }] }] }) })) as unknown as typeof fetch;
  await render(<AppProvider dependencies={deps}><SettingsScreen /></AppProvider>);
  await waitFor(() => expect(screen.getByRole('radio', { name: '한 장소' })).toBeEnabled());
  await fireEvent.changeText(screen.getByLabelText('분석 서버 주소'), 'https://analysis.example/api/analyze');
  await fireEvent.changeText(screen.getByLabelText('서버 접근 토큰'), 'a'.repeat(40));
  expect(screen.getByRole('button', { name: '실제 분석 모드 켜기' })).toBeDisabled();
  await fireEvent(screen.getByRole('switch', { name: '사진·본문 외부 전송 동의' }), 'valueChange', true);
  await fireEvent.press(screen.getByRole('button', { name: '실제 분석 모드 켜기' }));
  await screen.rerender(<AppProvider dependencies={deps}><AddScreen /></AppProvider>);
  await fireEvent.press(screen.getByRole('button', { name: '사진 / 스크린샷 올리기' }));
  expect(await screen.findByText('1곳 저장했어요.')).toBeTruthy();
  expect(deps.request).toHaveBeenCalledTimes(1);
  expect((await deps.storage.list())[0].verification).toBe('official');
});


test('default Expo Go flow disables paid AI and explains that native OCR needs a development build', async () => {
  const deps = dependencies(); deps.request = jest.fn();
  await render(<AppProvider dependencies={deps}><SettingsScreen /></AppProvider>);
  await waitFor(() => expect(screen.getByRole('radio', { name: '한 장소' })).toBeEnabled());
  await fireEvent.changeText(screen.getByLabelText('분석 서버 주소'), 'https://analysis.example/api/analyze');
  await fireEvent.changeText(screen.getByLabelText('서버 접근 토큰'), 'a'.repeat(40));
  await fireEvent(screen.getByRole('switch', { name: '사진·본문 외부 전송 동의' }), 'valueChange', true);
  expect(screen.getByRole('button', { name: '실제 분석 모드 켜기' })).toBeDisabled();
  expect(screen.getByRole('button', { name: '기기 OCR 테스트 켜기' })).toBeDisabled();
  expect(deps.request).not.toHaveBeenCalled();
});
