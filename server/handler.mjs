import { timingSafeEqual } from 'node:crypto';
import { analyze, RequestError } from './analysis.mjs';
/** @param {(body: any, env: any, request: typeof fetch) => Promise<unknown>} operation */
export function createHandler(env = process.env, request = fetch, operation = analyze) {
  let active = false; // Personal-test concurrency guard. Use a shared rate limiter for multi-instance production.
  return async (req, res) => {
    const send = (status, value) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(value)); };
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Vary', 'Origin');
    const origins = (env.SPOTCLIP_ALLOWED_ORIGINS || '').split(',').map(x => x.trim());
    const origin = req.headers.origin;
    if (origin && !origins.includes(origin)) return send(403, { error: '허용되지 않은 앱 주소예요.' });
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS'); res.statusCode = 204; return res.end();
    }
    if (req.method !== 'POST') return send(405, { error: 'POST 요청만 지원해요.' });
    const expected = env.SPOTCLIP_ACCESS_TOKEN;
    if (!expected || expected.length < 32) return send(503, { error: '서버 접근 토큰 설정이 필요해요.' });
    const given = Buffer.from(req.headers.authorization || '');
    const wanted = Buffer.from(`Bearer ${expected}`);
    if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) return send(401, { error: '분석 서버 접근 토큰을 확인해주세요.' });
    if (active) return send(429, { error: '분석이 진행 중이에요. 잠시 후 다시 시도해주세요.' });
    active = true;
    try {
      let body;
      if (req.body !== undefined) {
        const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        if (Buffer.byteLength(raw) > 4_000_000) throw new RequestError(413, '한 번에 보내는 사진 크기를 줄여주세요.');
        body = JSON.parse(raw);
      } else {
        const chunks = []; let size = 0;
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 4_000_000) throw new RequestError(413, '한 번에 보내는 사진 크기를 줄여주세요.');
          chunks.push(chunk);
        }
        body = JSON.parse(Buffer.concat(chunks).toString());
      }
      send(200, await operation(body, env, request));
    } catch (error) {
      const status = error instanceof RequestError ? error.status : error instanceof SyntaxError ? 400 : 502;
      send(status, { error: error instanceof RequestError ? error.message : '분석 요청을 처리하지 못했어요. 다시 시도해주세요.' });
    } finally { active = false; }
  };
}
