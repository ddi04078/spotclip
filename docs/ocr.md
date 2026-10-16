# OCR 우선 파이프라인

기존 Mock/저장/UI는 유지합니다. Expo Go는 Mock을 유지하고, 웹과 OCR 포함 iPhone 빌드는 기본 OCR로 실행합니다. 외부 유료 API는 호출하지 않습니다.
기존 유료 AI 연결 코드는 남겨두고, 기본 AppProvider 정책은 유료 모드 전환을 잠급니다.
테스트에서만 제어된 transport와 명시적 정책 주입으로 기존 remote adapter 흐름을 검증합니다.

- `OcrProvider`: 이미지 → 텍스트 교체 가능한 경계
- `OnDeviceOcrProvider`: 네이티브 문자 인식 함수 주입
- `modules/spotclip-ocr`: iOS Apple Vision VNRecognizeTextRequest, 한국어·영어, 이미지 최대2400px 썸네일/방향 보정
- `platform/ocr`: optional native module. Expo Go는 미지원으로 안내. 웹은 Tesseract 한국어·영어 OCR이며 모델·WASM·worker를 동일 사이트에서 제공합니다. Android 구현은 아직 없음
- `placeCandidateExtractor`: 기존 주소/상호 parser 재사용 + 장소명 휴리스틱. 광고·SNS 문구 필터, 중복 제거, 최대5개
- `createOcrFirstServices`: 기존 ingest service 재사용, 이미지 간 후보 중복 제거, 세션 내 Resolver 결과 최대100개 캐시

성공/실패/낮은 confidence 모두 AI를 자동 호출하지 않습니다. fallback provider 인자만 미래 경계로 남아 있으며 실행하지 않습니다.
OCR 경로는 기존 UnverifiedPlaceResolver를 주입합니다. Mock 예시 데이터와 섞지 않으며 이름·주소를 사용자가 확인해야 저장됩니다. 예시 체험 모드는 기존 MockPlaceResolver를 유지합니다. 실제 카카오 검색 구현을 복제하지 않았습니다.
장소명만 읽으면 confidence .7로 자동 저장을 막고, 주소와 상호를 함께 읽으면 .92입니다.
최종 자동 저장 여부는 기존 Resolver의 official 검증 및 신뢰도·지점 모호성 정책이 결정합니다.
OCR 후보는 unverified 상태이며 명시적으로 확인하고 저장한 경우에도 미확인 표시가 유지됩니다.

이 방식의 문자 인식 외부 API 비용은 0입니다. 단, 실제 카카오 검색을 나중에 주입하면 검색 호출은 발생합니다.
현재 캐시는 세션용입니다. 이후 실제 Resolver 연결 시 TTL/쿼터/영구 캐시 정책을 추가 검토합니다.
후보 누락/오탐이 있을 수 있으며 상호 목록이 아닌 일상 문구를 모두 장소라고 간주하지 않습니다.

네이티브 Swift 모듈은 autolinking 탐색으로 발견되는 것까지 확인했습니다.
Linux 환경에 Xcode/iPhone이 없어 Swift 컴파일 및 Vision 인식 정확도는 미검증입니다.
공식 API 참고: https://developer.apple.com/documentation/vision/recognizing-text-in-images
Expo 로컬 모듈 참고: https://docs.expo.dev/modules/get-started/

다음 단계: iPhone 기본 흐름 확인 → Kakao Developers 앱 생성/Local API 사용 조건·쿼터 확인 →
REST 키를 모바일에 넣지 않고 서버 측 secret으로 설정 → 기존 카카오 검색 코드의 resolver 경계 재사용 →
OCR 후보만 검색하는 최소 proxy 설계/검증. 기존 이미지 AI 분석 endpoint를 OCR의 기본 경로로 연결하면 안 됩니다.
