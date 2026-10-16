# iPhone에서 SpotClip 테스트하기

## 먼저 무료 Mock 흐름부터 (Expo Go)

준비물: 컴퓨터(Windows 또는 Mac), iPhone, 같은 Wi-Fi. API 키, 서버, Apple Developer 유료 가입은 필요 없습니다.

1. 컴퓨터에 Node.js 24 LTS와 iPhone에 App Store의 Expo Go를 설치합니다.
2. GitHub `ddi04078/spotclip`에서 `iphone-test` 브랜치를 선택합니다.
   Code → Download ZIP을 누르고 압축을 완전히 풉니다.
   Git 사용자는 `git clone --branch iphone-test https://github.com/ddi04078/spotclip.git`로 받을 수 있습니다.
3. 컴퓨터에서 `package.json`이 보이는 폴더를 엽니다. Windows는 폴더 주소창에 `powershell`을 입력합니다.
   Mac은 터미널에서 `cd ` 다음에 해당 폴더를 끌어놓고 Enter를 누릅니다.
4. 다음을 한 줄씩 실행합니다.

   ```sh
   npm ci
   npm run dev
   ```

5. 터미널을 켜둔 채 iPhone 카메라로 QR을 비추고 Expo Go에서 열기를 누릅니다.
6. iOS가 로컬 네트워크 사용을 물으면 허용합니다. 설정 → 앱 → Expo Go에서 권한을 다시 확인할 수 있습니다.
7. SpotClip에서 **체험 모드 · Mock** 표시를 확인합니다.
8. 사진 / 스크린샷 올리기 → SNS 캡처 선택 → Mock 결과 확인 → 내 장소 확인 순서로 사용합니다.
   기본 설정은 3곳 자동 저장입니다. 설정의 ‘한 장소’, ‘지점 선택’, ‘Mock 자동 저장’을 바꿔 수동 저장도 확인하세요.
9. 같은 사진을 다시 선택해 중복이 늘지 않는지 확인합니다. 앱을 다시 열어 목록도 확인합니다.
10. 내 장소 카드의 네이버지도·카카오맵을 눌러 이동을 확인합니다.
    Mock 장소는 실제 주소와 다를 수 있고, 검색/브라우저가 열릴 수 있습니다. 지도 앱 즐겨찾기에 자동 추가하지 않습니다.

### 실행이 안 될 때

- 이 프로젝트는 Expo SDK 57입니다. Expo Go가 다른 SDK만 지원한다는 메시지가 나오면 **표시된 메시지를 먼저 확인**하세요.
  현재 App Store의 호환 상태를 이 환경에서는 확인하지 못했습니다. SDK/의존성을 임의로 다운그레이드하지 마세요.
- 컴퓨터·폰을 같은 일반 Wi-Fi에 연결하세요. 회사/게스트 Wi-Fi는 기기 간 통신을 막을 수 있습니다.
- 컴퓨터 방화벽에서 Node/8081 포트의 개인 네트워크 통신을 허용하고 VPN을 잠시 끄고 확인하세요.
- Expo Go의 로컬 네트워크 권한을 확인하세요. 같은 Wi-Fi 접속이 어려우면 `npm run dev -- --tunnel`을 시도할 수 있으나
  터널 도구 설치·Expo 계정·외부 연결이 필요할 수 있고 이 작업에서는 검증하지 않았습니다.
- 클라우드 개발 환경의 localhost QR은 내 iPhone에서 바로 접근할 수 없습니다. **내 컴퓨터에서 위 명령을 실행하세요.**

## OCR 테스트는 별도: iPhone Development Build

Expo Go에는 SpotClip의 Apple Vision 네이티브 모듈이 없습니다. 기본 Mock 테스트에 Development Build는 필요하지 않습니다.
OCR은 한국어·영어를 기기에서 읽습니다. 사진 업로드, 유료 OCR/AI API, API 키가 필요 없습니다.
Android·웹 OCR 엔진은 아직 구현하지 않았습니다.

가장 비용이 적은 경로는 **Mac + Xcode + 케이블로 연결한 iPhone**에서 로컬 빌드하는 방법입니다.
Xcode 설치·Apple ID 서명·기기 신뢰/개발자 모드가 필요합니다. 개인 Apple ID 무료 서명은 일반적으로 7일 유효하며 제한이 있습니다.
이 경로는 로컬 debug 빌드이며 App Store 배포가 아닙니다.

1. Mac에서 Xcode를 설치하고 한 번 실행해 필요한 구성요소/라이선스를 완료합니다.
2. Xcode Settings → Accounts에 Apple ID를 추가합니다. iPhone을 연결하고 ‘이 컴퓨터 신뢰’를 누릅니다.
3. iPhone 설정 → 개인정보 보호 및 보안 → 개발자 모드를 켭니다(필요 시 재시작).
4. 위와 같은 소스 폴더에서 `npm ci` 후 다음 명령을 실행합니다.

   ```sh
   npm run ios:device
   ```

5. 서명 팀을 요구하면 본인 Personal Team을 선택합니다. 필요하면 생성된 `ios/SpotClip.xcworkspace`를 Xcode로 열고
   Signing & Capabilities에서 본인 팀과 고유 Bundle Identifier를 설정한 뒤 연결된 iPhone으로 실행합니다.
   macOS CocoaPods 설치 등 추가 도구가 필요할 수 있습니다. 생성된 ios 폴더를 다른 repository로 분리하지 마세요.
6. 앱에서 설정 → **기기 OCR 테스트 켜기**를 누릅니다. 버튼이 비활성화되어 있으면 Expo Go 또는 OCR 미포함 빌드입니다.
7. 한국어 장소명·주소가 크게 보이는 캡처를 선택합니다. 글자를 읽은 뒤 최대 5개 장소 후보를 만듭니다.
   Resolver는 아직 Mock입니다. 등록되지 않은 장소는 저장되지 않을 수 있으며 이는 실제 검색을 아직 연결하지 않았기 때문입니다.
8. 다음부터 Metro만 다시 켤 때는 `npm run dev:client`를 사용합니다. 네이티브 모듈 변경 시에는 다시 빌드해야 합니다.

Windows만 있고 Mac이 없으면 이번 단계의 기본 검증은 Expo Go로 진행하세요.
향후 EAS Development Build를 사용할 수 있지만 Expo 계정, iOS 실기기 배포용 Apple Developer 멤버십,
빌드 사용량/대기열 등의 조건을 확인해야 하며 이번 작업에서는 가입·결제·원격 빌드를 진행하지 않았습니다.

## 테스트 결과를 확인할 체크리스트

- [ ] QR로 Expo Go 앱이 열림 (컴퓨터/Expo Go/iOS 버전 기록)
- [ ] 사진첩에서 캡처 한 장 및 여러 장 선택 / 선택 취소
- [ ] Mock 한 장소·여러 장소 저장 / 지점 선택
- [ ] 같은 장소 재입력 시 중복 방지
- [ ] 앱을 다시 열어 내 장소 유지
- [ ] 네이버지도·카카오맵 버튼으로 이동
- [ ] 메모·방문 표시·분류·검색·삭제
- [ ] (Development Build만) OCR 켜기 / 한국어·영어 인식 / 인식 실패 시 저장 안 함

이 체크리스트는 사용자가 실제 기기에서 확인해야 합니다. 클라우드의 JS 번들 빌드·UI 테스트 통과는 실기기 검증 완료가 아닙니다.
