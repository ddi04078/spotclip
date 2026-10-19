import { pathToFileURL } from 'node:url';

/** @param {{SPOTCLIP_ACCESS_TOKEN?: string, SPOTCLIP_SEARCH_ENDPOINT?: string}} env */
export async function checkPlaceSearch(env = process.env, request = fetch, live = false) {
  const token = env.SPOTCLIP_ACCESS_TOKEN;
  if (!token || token.length < 32) throw new Error('SPOTCLIP_ACCESS_TOKEN을 32자 이상으로 설정하세요.');
  let endpoint;
  try { endpoint = new URL(env.SPOTCLIP_SEARCH_ENDPOINT); } catch { throw new Error('SPOTCLIP_SEARCH_ENDPOINT에 배포된 /api/search HTTPS 주소를 설정하세요.'); }
  if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.search || endpoint.hash || endpoint.pathname !== '/api/search') {
    throw new Error('인증정보·쿼리 없이 https://서버/api/search 형식으로 설정하세요.');
  }
  if (!live) return '로컬 입력 형식 확인 완료. 서버 연결·카카오 키는 아직 검증하지 않았습니다.';
  let response;
  try {
    response = await request(endpoint.href, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '국립현대미술관 서울' }), signal: AbortSignal.timeout(25_000),
      redirect: 'error',
    });
  } catch { throw new Error('서버 연결 실패: 주소·네트워크·배포 상태를 확인하세요.'); }
  if (!response.ok) {
    const reasons = {401: '접근 토큰 불일치',403: '접근 정책 또는 카카오 권한 확인 필요',404: '배포 주소 또는 소스 브랜치 확인 필요',429: '호출 한도 또는 동시 요청 제한',503: '서버 환경변수 설정 필요'};
    throw new Error(`검색 실패 HTTP ${response.status}: ${reasons[response.status] || '서버 로그에서 원인을 확인하세요.'}`);
  }
  let body;
  try { body = await response.json(); } catch { throw new Error('JSON 응답이 아닙니다. 배포 보호 또는 주소를 확인하세요.'); }
  if (!Array.isArray(body.matches) || !body.matches.length || body.matches.some(p => p.verification !== 'official' || p.mapProvider !== 'kakao' || !p.providerId || !p.name || !p.address)) {
    throw new Error('공식 카카오 장소 결과를 확인하지 못했습니다.');
  }
  return `공식 장소 응답 ${body.matches.length}개 확인. 이 점검은 카카오 검색 1회만 요청했고 이미지·AI는 전송하지 않았습니다. 브라우저 CORS와 사진 인식 정확도는 별도 검증이 필요합니다.`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log(await checkPlaceSearch(process.env, fetch, process.argv.includes('--live'))); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
