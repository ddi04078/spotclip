> 최신 웹 체험: 기본 업로드는 Tesseract 기반 한국어·영어 브라우저 OCR입니다. 사진은 외부로 전송하지 않습니다.
> 첫 사용에는 같은 사이트의 OCR 인식 파일을 내려받습니다. 지도 API 미연결이므로 후보 확인 후 수동 저장하며, 유료 AI는 호출하지 않습니다.
> Mock은 설정에서 ‘예시 체험 모드’를 명시적으로 선택했을 때만 사용합니다. 다운로드 HTML의 OCR에는 옆의 ocr/ 파일과 HTTP 호스팅이 필요합니다.

# SpotClip · Native MVP

SNS에서 발견한 장소를 **사진 선택 → 분석 → 장소 확인 → 저장 → 지도 열기**로 모으는 iOS/Android 앱입니다. 하나의 저장소에서 **React Native + Expo SDK 57 + TypeScript + Expo Router**를 사용합니다. PC 테스트는 같은 화면·로직의 Expo Web 렌더러를 사용합니다. 별도의 PWA/Vite 앱은 만들지 않습니다.

## PC에서 가장 쉽게 테스트하기

**설치 없는 HTML 체험:** `SpotClip.html`을 다운로드한 뒤 Chrome/Edge에서 열면 됩니다. Node.js, Expo Go, 서버가 필요 없습니다. 아이콘·폰트·화면 스크립트를 한 파일에 포함합니다. 사진과 장소는 이 브라우저에 저장되며 장소 분석은 Mock입니다. HTML 다운로드가 코드 화면으로 표시되면 HTML ZIP을 받아 압축 해제 후 파일을 여세요.

HTML도 같은 React Native 화면과 ingest/storage 서비스를 재사용합니다. 파일 실행을 위한 탐색·저장·아이콘 어댑터만 바꾸었습니다. 생성: `npm run build:html`, 검증: `npm run test:html`. 이 클라우드의 관리형 Chromium은 file:// 열기를 차단하므로, 테스트는 HTML 전체를 로컬 origin에 메모리로 전달하고 오프라인 상태에서 실행합니다. 파일을 더블클릭하는 실제 OS 동작 자체는 이 환경에서 검증하지 못했습니다.

**미리 빌드한 PC 체험 ZIP을 받은 경우:**

1. [Node.js LTS](https://nodejs.org/)를 한 번 설치합니다.
2. ZIP을 **완전히 압축 해제**합니다. ZIP 안에서 바로 실행하지 마세요.
3. Windows에서는 `start-pc.bat`를 더블클릭합니다. Mac은 `start-pc.command`를 실행합니다.
4. 브라우저가 열리면 휴대폰 폭의 화면에서 ‘사진 / 스크린샷 올리기’를 눌러 PC의 이미지 파일을 선택합니다.
5. 실행한 터미널 창은 테스트하는 동안 열어둡니다. 종료는 Ctrl+C입니다.

체험 ZIP에는 web export가 들어 있어 `npm install`, Expo Go, 휴대폰, API 키가 필요 없습니다. Mac이 실행 권한을 묻는 경우 터미널에서 `bash start-pc.command`로 실행할 수 있습니다. Windows/Mac 런처 자체는 해당 OS에서 직접 시험하지 않았고, 동일한 Node 서버와 앱은 Chromium에서 검증합니다.

**개발 소스를 받은 경우:**

```sh
npm install
npm run web
```

브라우저를 자동으로 여는 Expo 개발 서버가 시작됩니다. 이미 만들어진 web export는 `npm run preview:pc`로 실행할 수 있습니다. 소스 변경 후 체험 파일을 다시 만들 때에는 `npm run build:web`를 실행하세요.

PC의 사진 선택은 브라우저 파일 선택기이며, 작은 사진 미리보기·장소·Mock 분석 설정은 해당 브라우저에 저장됩니다. 새로고침해도 유지되지만 모바일 앱과 동기화하지 않습니다. PC에서 iOS 사진첩 권한이나 네이티브 공유 확장까지 테스트하는 것은 아닙니다. 현재 채팅 환경은 옆 미리보기를 직접 여는 도구를 제공하지 않아 별도 브라우저에서 실행합니다.

추가 PC 검증: `npm run build:web` 후 `npm run test:web`. Chromium 경로는 `CHROMIUM_PATH`로 지정할 수 있습니다.

## 현재 상태

| 구분 | 구현 |
| --- | --- |
| 실제 | Expo Router의 추가/내 장소 탭, iOS/Android 시스템 사진 선택, 여러 사진 선택, 분석 진행 화면 |
| 실제 | AsyncStorage 저장·재실행 복원·중복 방지·목록 검색·카테고리 필터·메모·방문 상태·삭제 |
| 실제 | 사진을 앱 전용 영구 폴더에 복사, 사용하지 않는 복사본 정리, 지도 HTTPS 링크를 React Native Linking으로 열기 |
| Mock | 사진 속 장소 추출, 공식 지도 API를 통한 장소 확인, confidence 값 |
| Mock | 자동 저장 체험, 한 장소/여러 장소/애매한 지점 선택 시나리오 |
| 미연결 | 실제 AI, 실제 공식 장소 검색, SNS URL 본문 읽기, 계정/동기화 |
| 향후 | iOS Share Extension, Android Share Intent, TestFlight/스토어 배포 |

**어떤 사진을 선택해도 준비된 Mock 결과가 나옵니다. 사진을 실제로 인식한 것처럼 표시하지 않습니다.** 첫 화면, 분석 결과, 저장 카드에 Mock을 표시합니다. 기본값은 Mock 자동 저장 켜짐이며, 설정에서 끄면 ‘모두 저장’을 체험할 수 있습니다. 어니언의 안국/성수/미아처럼 애매한 후보는 자동 저장하지 않고 선택을 받습니다.

지도 앱의 개인 즐겨찾기에 자동 추가하지 않습니다. 장소는 SpotClip에 저장되고, 지도 앱에서는 사용자가 별도로 즐겨찾기에 담습니다.

## 설치와 실행

Node.js **24.19.0**에서 검증했습니다. Expo/RN이 지원하는 Node 22.13+ 또는 24.3+ 계열을 사용하세요. 개인 MVP의 Expo Go 테스트에는 Apple Developer 계정, 서버, API 키가 필요하지 않습니다.

```sh
npm install
npm run dev
```

재현 가능한 잠금 파일 설치는 `npm ci`를 사용하세요. 개발 명령은 **Expo Go**를 명시해 실행하며, 웹 서버가 아닌 Metro 개발 서버를 시작합니다.

### iPhone에서 직접 실행

1. 이 소스가 있는 컴퓨터에 저장소를 준비하고 위 명령을 실행합니다. 기본 원격 브랜치에 아직 변경 사항이 없으면 먼저 현재 소스를 GitHub에 반영하거나 파일을 내려받아야 합니다.
2. iPhone에 **SDK 57과 호환되는 최신 Expo Go**를 App Store에서 설치합니다.
3. 컴퓨터와 iPhone을 같은 Wi-Fi에 연결합니다. 컴퓨터 방화벽에서 Metro 포트(기본 8081)를 허용합니다.
4. 터미널 QR을 iPhone 카메라로 스캔하고 Expo Go에서 엽니다.
5. ‘사진 / 스크린샷 올리기’ → SNS 캡처 선택 → ‘3곳 저장했어요’ → 내 장소에서 확인 → 네이버지도/카카오맵을 누릅니다.
6. 설정에서 ‘한 장소’, ‘지점 선택’, ‘Mock 자동 저장 끄기’를 바꿔 나머지 흐름도 시험합니다.

Expo Go 버전과 프로젝트 SDK가 다르면 실행되지 않습니다. Expo Go를 업데이트하거나 해당 SDK가 지원되는 환경을 준비하세요. iOS에서 Expo Go가 지원하지 않는 구 SDK를 임의로 설치할 수 있다고 가정하지 않습니다.

### Android에서 직접 실행

1. Google Play에서 SDK 57과 호환되는 Expo Go를 설치합니다.
2. 컴퓨터에서 `npm run dev`, Android와 같은 Wi-Fi에 연결합니다.
3. Expo Go에서 QR을 스캔합니다.
4. 사진 선택 → Mock 저장 → 내 장소 → 지도 열기를 확인합니다. 사진 선택 취소도 기존 저장 목록을 바꾸지 않습니다.

네트워크가 달라 LAN 접속이 안 되면 `npm run dev -- --tunnel`을 사용할 수 있으나, Expo 계정/터널 도구 설치/외부 네트워크가 필요할 수 있습니다. 터널은 이번 클라우드에서 검증하지 않았습니다. 클라우드가 표시하는 로컬 QR 주소를 외부 휴대폰에서 바로 열 수 있다고 가정하지 마세요. 가장 빠른 실기기 테스트는 **사용자 컴퓨터에서 실행**하는 방식입니다.

## 앱에서 시험할 흐름

- 기본: 사진 선택 → Mock으로 3곳 자동 저장 → 내 장소 → 지도 열기
- 설정 ‘한 장소’ + 자동 저장 끄기: 사진 → 1곳 발견 → 모두 저장
- 설정 ‘여러 장소’ + 자동 저장 끄기: 사진 → 3곳 발견 → 모두 저장
- 같은 사진/시나리오 반복: 이미 저장된 곳은 제외
- 설정 ‘지점 선택’: 사진 → 어니언 안국/성수/미아 선택 → 저장
- URL: Instagram/Threads/TikTok/YouTube/블로그 등의 http(s) 링크 입력 → 읽기 미연결 안내 → 캡처 올리기

URL 분석은 현재 구현한 것처럼 보이지 않도록 명확히 안내합니다. 로그인 자동화나 접근 제한 우회 크롤링을 하지 않습니다. 알려지지 않은 장소명을 Mock resolver가 임의의 실제 사업장으로 만들어 저장하지도 않습니다.

## 구조

```text
app/
  _layout.tsx                  Expo Router + 공통 provider
  (tabs)/index.tsx             사진/링크 입력
  (tabs)/places.tsx            내 장소 목록
  settings.tsx                Mock 시나리오·안내
src/
  components/                 네이티브 UI
  domain/                     Place/PlaceSource, 검증·중복 기준
  services/
    ingestPlaceSource.ts      추출 → resolve → confidence → 저장
    createServices.ts         provider 조합 지점
    providers/                Mock 추출·resolver
    maps/                     순수 지도 URL 생성
    AppProvider.tsx           화면 상태와 use case 연결
  storage/
    LocalPlaceStorage.ts      AsyncStorage 기반 저장소 어댑터
  platform/
    images/                   Expo 사진 선택·파일 복사·정리
    linking/                  React Native Linking
    share/                    미래 공유 payload → PlaceSource
    nativeStorage.ts          AsyncStorage 주입
assets/                       공통 앱 아이콘
```

도메인과 ingest는 React Native, Expo, AsyncStorage를 import하지 않습니다. `PlaceRepository`, `PlaceExtractionProvider`, `PlaceResolverProvider` 인터페이스를 구현하면 저장소나 외부 API를 교체할 수 있습니다. UI에 분석/지도 API 요청이나 저장소 키를 섞지 않았습니다.

### 공통 입력 파이프라인

`ingestPlaceSource()`는 screenshot/image(복수 사진), URL, text를 모두 받습니다. `sourceFromShare()`는 향후 Share Extension/Intent가 받은 URL·텍스트·앱 내부 파일을 같은 타입으로 변환하는 어댑터입니다. **현재 OS 공유 수신은 등록하지 않았습니다.**

공식 provider 연결 시 추출 신뢰도와 최상위 장소 신뢰도가 각각 0.9 이상이고, 다음 후보와 0.15 이상 차이나는 공식 결과만 자동 저장합니다. 그 외에는 선택/확인을 받습니다. Mock 자동 저장은 별도 테스트 정책으로만 허용하고, `verification: 'mock'`을 끝까지 유지합니다.

`saveMany()`는 한 번의 저장으로 처리하고 동시 ingest를 직렬화합니다. provider ID 또는 정규화한 이름+주소로 중복을 막습니다. 저장 실패를 성공으로 표시하거나 손상된 기존 데이터를 빈 목록으로 덮어쓰지 않습니다.

## 사진과 데이터

- 시스템 사진 선택기를 사용하며 카메라/마이크를 요구하지 않습니다. iOS 제한된 사진 접근과 Android 시스템 Photo Picker를 전제로 합니다.
- 사진을 앱 전용 document 폴더에 복사해 캐시 삭제 후에도 저장 카드에 표시할 수 있습니다. 원본 사진첩은 수정하지 않습니다.
- 사진 경로와 장소 메타데이터를 AsyncStorage에 보관합니다. 사진 바이너리를 AsyncStorage JSON에 넣지 않습니다.
- 저장/현재 분석에서 참조하지 않는 SpotClip 복사본만 정리합니다. iOS 앱 컨테이너 이동 시 현재 디렉터리에 맞춰 관리 사진 경로를 해석합니다.
- 서버·계정·자동 동기화·클라우드 백업은 없습니다. 앱 삭제 또는 기기 변경으로 데이터가 사라질 수 있습니다.
- 최대 10장, 장당 15MB. iOS 사진의 호환 형식을 요청합니다. 실제 파일 지원은 기기의 시스템 선택기/이미지 디코더를 따릅니다.

## 지도 연결과 공식 문서

React Native `Linking.openURL()`로 공식 서비스의 HTTPS URL을 엽니다. 설치된 앱으로 전달할지는 OS의 링크 설정에 따르며, 앱이 없으면 모바일 웹으로 열립니다. 현재 Mock 데이터는 **검색**으로 연결합니다. 실제 공식 Kakao ID/좌표가 있는 데이터는 해당 장소 링크로 연결할 수 있습니다. 현재 네이버 연결은 이름+주소 검색이며 특정 업체 상세로 확정한 것처럼 표시하지 않습니다.

- [Kakao Maps URL 가이드](https://apis.map.kakao.com/web/guide/#urlscheme)
- [Kakao Local API 개발 가이드](https://developers.kakao.com/docs/latest/ko/local/dev-guide)
- [Naver Map URL Scheme 가이드](https://guide.ncloud-docs.com/docs/naveropenapiv3-maps-url-scheme)

이 클라우드에서는 위 공식 문서 웹페이지가 프록시 403으로 차단되어 최신 본문을 직접 재확인하지 못했습니다. 현재 일반적으로 문서화된 HTTPS 검색/장소 URL만 사용하고, 개인 즐겨찾기 쓰기·비공식 로그인 기능은 넣지 않았습니다. 최신 문서 대조와 지도 앱 실기기 전환 확인은 다음 실기기 점검 때 필요합니다. 지도 서비스에 직접 접속해 실제 검색 결과가 반환되는 것은 이번 자동 테스트에 포함되지 않습니다.

## 다음 단계: 실제 API 연결

1. 작은 서버리스 API에 이미지 분석 provider를 구현합니다. API 키는 서버의 secret store에만 둡니다.
2. Kakao Local 등 공식 한국 장소 검색 API의 서버 어댑터를 `PlaceResolverProvider`로 구현합니다. 최신 공식 문서, 앱 등록·이용 조건·호출 한도를 확인해야 합니다.
3. 응답 스키마를 검증하고 이름/지역/주소/좌표와 후보 간 차이로 신뢰도를 보정합니다. 프론트엔드가 보내는 confidence를 신뢰해 공식 결과로 확정하지 않습니다.
4. `createServices.ts`의 Mock provider를 실제 provider로 교체합니다. 공식 API의 결과만 `verification: 'official'`로 반환합니다.
5. 본인 캡처/게시물로 정확도와 애매한 지점 UX를 평가합니다.

`.env.example`은 서버용 secret의 예시 이름만 설명합니다. 현재 앱에는 API 키가 필요하지 않습니다. **AI key나 Kakao REST key를 `EXPO_PUBLIC_`에 넣으면 앱 번들에 포함되므로 금지합니다.**

## Share Extension / Share Intent와 출시

먼저 일반 MVP를 두 기기에서 검증한 뒤 진행합니다. Capacitor는 사용하지 않습니다.

- **Development Build 준비:** `npx expo install expo-dev-client` 후 `npx eas-cli login` 및 `npx eas-cli build:configure`. EAS project ID와 본인 고유 bundle/package ID를 설정합니다. `app.spotclip.mobile`은 초기 식별자이며 출시 전 소유/중복 여부를 확인하세요.
- `eas.json`에 development/preview/production 프로필을 준비했습니다. development 프로필을 사용하기 전에 expo-dev-client를 설치해야 합니다. 설치/로그인/서명 없이 빌드가 끝났다고 가정하지 않습니다.
- **iOS:** Swift Share Extension 타깃, App Groups, 보안 공유 컨테이너/큐, 수신 파일 복사, 호스트 앱 인계가 필요합니다. Extension의 시간·메모리 제한을 고려해 큰 AI 작업은 호스트/서버로 넘깁니다. 앱 프로세스가 다르므로 JS context나 AsyncStorage를 직접 공유한다고 가정하지 않습니다.
- **Android:** SEND/SEND_MULTIPLE intent와 MIME 등록, URI 읽기 권한 및 앱 전용 파일 복사, cold/warm start payload 처리가 필요합니다.
- 수신 어댑터는 payload를 `sourceFromShare()` → 기존 `ingestPlaceSource()`에 연결합니다. config plugin/네이티브 모듈을 추가하면 Development Build를 다시 만듭니다. Expo Go에 Share Extension을 붙일 수 없습니다.
- 네이티브 변경을 지속하려면 Expo config plugin 또는 의도적으로 관리하는 `ios/`, `android/` 디렉터리 중 방식을 정합니다. 현재는 CNG 방식이라 생성 폴더를 Git에서 제외했습니다.
- iOS: EAS iOS 서명 빌드 → TestFlight → App Store. 배포에는 Apple Developer 계정/서명/App Store Connect 설정이 필요합니다.
- Android: EAS APK로 내부 테스트 → production AAB → Google Play. Play Console, 앱 서명, 개인정보/데이터 안전성 문서가 필요합니다.

이 저장소에서 EAS 원격 빌드, 서명, TestFlight/Play 업로드는 실행하지 않았습니다. 로컬 네이티브 시뮬레이터 빌드는 macOS Xcode 또는 Android SDK가 필요합니다.

## 검증

```sh
npm run typecheck
npm test
npm run test:ui
npm run build
```

- 단위 14개: 공통 ingest, 자동/수동 저장, 여러 장소, 지점 선택, 중복, 동시 저장, 쓰기 실패, 손상 데이터 보호, URL fallback, 공유 payload, 지도 URL 인코딩
- React Native UI/플랫폼 어댑터 7개: 390×844 iPhone 크기의 화면 상태에서 사진 선택→Mock 분석→자동 저장→목록→Linking 호출, 수동 저장·재실행 복원·검색, 지점 선택, URL 실패 안내, 취소, 여러 사진 복사, 파일 정리
- UI 테스트의 OS 사진 선택/파일시스템/지도 앱은 테스트 어댑터로 대체합니다. 실제 iPhone/Android에서 사진첩이 열렸다고 주장하지 않습니다.
- `npm run build`는 iOS·Android Hermes **JS 번들 export**입니다. `.ipa`/`.apk` 네이티브 서명 빌드나 App Store 출시를 의미하지 않습니다.
- 이 Linux 클라우드에는 Xcode/iOS 시뮬레이터, Android SDK/연결 기기가 없어 실기기 실행은 확인하지 않았습니다.

클라우드의 제한된 홈 디렉터리/외부 네트워크에서는 Expo 명령에 다음 환경변수를 붙여 실행합니다. 사용자 컴퓨터에서는 일반 명령을 사용하면 됩니다.

```sh
EXPO_NO_TELEMETRY=1 EXPO_OFFLINE=1 npm run build
EXPO_NO_TELEMETRY=1 EXPO_OFFLINE=1 npm run dev -- --localhost
```

오프라인 모드의 dependency check는 설치된 Expo SDK의 내장 호환 목록을 기준으로 합니다. 인터넷 기반 Expo Go 버전/React Native Directory 검증이나 원격 EAS 접속을 대신하지 않습니다.

## 이전 PWA 구현 정리

Vite/React DOM 화면, HTML/CSS, manifest/service worker, Tesseract 브라우저 OCR, Leaflet 지도, Express 서버, Playwright 웹 테스트를 제거했습니다. 도메인 타입·장소 파이프라인·일부 parser·아이콘 디자인을 재사용하고, 저장소와 UI/플랫폼 코드는 네이티브로 교체했습니다. 기존 브라우저 localStorage 데이터는 이 앱의 AsyncStorage로 자동 이관하지 않습니다.

### 실제 AI / 카카오 검색 연결 준비

서버 및 파이프라인 연결 코드는 [server/README.md](server/README.md)를 참고하세요.
기본 모드는 Mock입니다. API 키를 설정한 서버를 배포한 뒤, 앱 설정에서 서버 주소·접근 토큰 입력과 전송 동의를 통해 실제 모드로 전환할 수 있습니다. 실제 API 호출은 키 설정 후 검증이 필요합니다.

### 이번 단계: 무료 iPhone 검증 / OCR 우선 구조

- 초보자용 실행: [iPhone 테스트 안내](docs/iphone-test.md)
- 설계·구현 범위: [OCR 안내](docs/ocr.md)
- 기본 Mock 흐름은 Expo Go로, Apple Vision OCR은 iPhone Development Build로 테스트합니다.
- 유료 AI 모드 전환은 현재 기본 정책에서 잠겨 있습니다. API 키·서버 없이 기본 테스트가 가능합니다.

### 장소 검색 단계 개선

상호·영문 별칭·업종·주소를 함께 쓰는 검색 계획과 결과 비교를 추가했습니다.
후보 카드에서 준비된 검색어로 외부 지도를 바로 열 수 있습니다.
자동 카카오 검색은 기본 비활성화이며, 서버 배포·키 설정·전송 동의 후 연결할 수 있습니다.
사진·유료 AI 전송 없이 검색어만 보내는 `/api/search` 경로를 사용합니다.
[연결 방법과 검증 범위](docs/place-resolution.md)를 참고하세요.
