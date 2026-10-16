# 실제 분석 연결 준비 (키 미설정 / 운영 연결 전)

이 서버 코드는 프런트엔드에 포함하지 않습니다. 기존 공개 체험은 여전히 Mock입니다.
OpenAI Responses 이미지·텍스트 추출 → Kakao Local 키워드 검색 → 기존 ingest pipeline을 사용합니다.
공식 문서 URL은 아래와 같지만 현재 개발 환경에서 문서 접근이 403으로 차단되었습니다.
최신 API 계약 및 실제 응답 검증은 배포 전에 필요합니다. 테스트는 제어된 응답이며 라이브 호출이 아닙니다.

- https://platform.openai.com/docs/api-reference/responses
- https://developers.kakao.com/docs/latest/ko/local/dev-guide

## 개인 로컬 테스트 서버

1. 루트 `.env.example`을 `.env`로 복사합니다 (gitignore 대상).
2. `.env`에 OpenAI 키와 Kakao REST 키를 설정합니다. 키를 채팅이나 앱 코드에 넣지 마세요.
3. `SPOTCLIP_ACCESS_TOKEN`에는 별도로 생성한 무작위 32자 이상 토큰을 설정합니다.
4. `SPOTCLIP_ALLOWED_ORIGINS`에는 실제 웹 앱 origin을 쉼표로 구분해 설정합니다.
   GitHub Pages는 `https://ddi04078.github.io`이며 경로 `/spotclip`은 넣지 않습니다.
5. `npm run server` 실행. `GET /health`는 서버 프로세스만 확인하며 키 유효성 검사가 아닙니다.
6. `POST /api/analyze`에 `Authorization: Bearer <토큰>`과 JSON을 보냅니다.
   입력: `{kind:'text',text:'...'}` 또는 `{kind:'image',images:['data:image/jpeg;base64,...']}`.

서버는 기본적으로 127.0.0.1에만 바인딩합니다. 외부 공개용 서버가 아닙니다.
URL은 가져오지 않으며 캡처 대체 응답(422)을 반환합니다. 원본·응답·키를 로그나 DB에 저장하지 않습니다.
AI 제공업체 데이터 처리 정책은 별도로 적용됩니다 (`store:false`가 무보관 보장은 아닙니다).
요청 JSON 4MB, 장당 base64 2백만 문자, 이미지 10장, 결과 10곳 제한입니다.
네이티브 분석 입력은 JPG/PNG/WebP 장당 약1.5MB 이하이며 HEIC는 변환 후 사용해야 합니다.

## 앱 연결 지점

`src/services/createServices.ts`의 네 번째 인자에 `RemoteAnalysisOptions`를 주면
Mock 대신 동일한 파이프라인의 실제 분석 어댑터를 사용합니다.

```ts
const services = createServices(repository, settings, id, {
  endpoint: 'https://YOUR-SERVER/api/analyze',
  accessToken: async () => runtimeUserToken,
  consent: async () => userHasAcceptedImageAndTextTransmission,
  readImage: readAnalysisImage, // src/platform/images/nativeImages (.web 자동 선택)
});
```

`consent`는 반드시 사진·본문이 분석 서버와 AI 제공업체로 전송된다는 안내에 사용자가 동의했는지
반영해야 합니다. 예제의 토큰·동의 변수는 앱 설정 UI에서 런타임에 받아야 하는 값입니다.
**설정 화면에서 서버 주소·접근 토큰을 입력하고 외부 전송에 동의하면 실제 모드로 전환됩니다.**
연결 성공을 미리 주장하지 않으며 첫 분석 요청에서 서버 설정·키를 검증합니다.
토큰과 동의는 메모리에만 보관하며 앱 재시작/새로고침 시 Mock으로 돌아갑니다.
서버 오류 시 Mock 데이터로 대체 저장하지 않습니다. 실제 API 확인은 아직 미완료입니다.
공유 토큰을 EXPO_PUBLIC 변수, HTML, GitHub Pages 파일, repository에 넣지 마세요.

웹에서는 저장용 420px 미리보기와 별도로 최대1600px 분석용 JPEG를 메모리에 준비합니다.
분석용 데이터는 Place 저장소에 넣지 않습니다. 앱을 닫으면 사라집니다.
네이티브에서는 시스템 picker로 복사한 앱 소유 파일만 읽습니다.

## 호스팅 / 운영 전 확인

`api/analyze.mjs`는 Vercel Node 함수 진입점입니다. GitHub Pages에는 서버를 올릴 수 없습니다.
Vercel 설정에서 Node 함수 배포와 환경변수, HTTPS endpoint를 설정하고 실제 호출을 확인해야 합니다.
이번 작업에서 서버를 배포하거나 키를 설정하지 않았습니다.

개인 테스트용 공유 토큰은 사용자 인증 체계를 대체하지 않습니다.
OpenAI 프로젝트 예산·사용량 알림을 설정하고 외부 공개 전에 gateway의 지속적 rate limit을 추가하세요.
현재 동시성 제한은 프로세스별 1개로, 여러 인스턴스의 전체 과금을 제한하지 못합니다.
CORS는 브라우저 제한이며 인증을 대체하지 않습니다. 접근 토큰은 사용자별 인증으로 교체할 수 있습니다.

실제 지도 목록은 `official`이지만 AI 추출과 동일 장소라고 단정하지 않습니다.
이름과 도로명/지번 주소의 정확한 일치만 confidence .99, 나머지는 .7로 수동 확인합니다.
추출 confidence .9 이상, 최상위 검색 결과 .9 이상, 차점과 .15 이상 차이 조건에서만 자동 저장됩니다.
상호·주소 표기 차이는 자동 저장 대신 검토로 이어질 수 있습니다.
네이버/카카오 개인 즐겨찾기는 수정하지 않습니다.

검증: `npm test`, `npm run typecheck`. 라이브 키 연결 후 이미지 한 장, 복수 장소,
동일 장소 재입력, 지점 선택, API 실패·과금 확인을 실제 기기에서 추가 검증해야 합니다.
