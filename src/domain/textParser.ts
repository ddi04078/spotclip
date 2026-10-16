// OCR is imperfect: these are editable suggestions, never verified businesses.
const region = '(?:서울(?:특별시)?|부산(?:광역시)?|대구(?:광역시)?|인천(?:광역시)?|광주(?:광역시)?|대전(?:광역시)?|울산(?:광역시)?|세종(?:특별자치시)?|경기(?:도)?|강원(?:특별자치도|도)?|충청[남북]도|충[남북]|전라[남북]도|전북(?:특별자치도)?|전[남북]|경상[남북]도|경[남북]|제주(?:특별자치도|도)?)';
const addressStart = new RegExp(`^${region}\\s+`);
const shortAddress = /^[가-힣]{2,}(?:시|군|구)\s+[가-힣\d]+(?:로|길|동|읍|면)/;
const streetNumber = /(?:로|길|동|리)\s*\d/;
const noise = /^(?:\d+\s*\/\s*\d+|서울|부산|좋아요.*|댓글.*|팔로우.*|더 보기|음악.*|저장.*|공유.*|@[\w.]+|[a-z\d_.]{3,}|[♫♪🎵].*)$/i;
const clean = (line: string) => line.replace(/^[\s•·📍▶▷\-]+/, '').replace(/^\d+[.)]\s*/, '').replace(/\s+/g, ' ').trim();
export function extractPlaces(text: string) {
  const lines = String(text).split(/\r?\n/).map(clean).filter(Boolean);
  const result: { name: string; address: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Captions often put a name and address on the same line, separated by | or :.
    const inline = line.match(new RegExp(`^(.{2,70}?)\\s*[|:：]\\s*(${region}\\s+.+)$`));
    let address = inline ? inline[2] : line;
    if (!(addressStart.test(address) || shortAddress.test(address)) || !streetNumber.test(address)) continue;
    let name = inline?.[1] || '';
    if (!name) {
      for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
        const previous = lines[j];
        if (addressStart.test(previous) || shortAddress.test(previous)) break;
        if (noise.test(previous) || /^https?:/.test(previous)) continue;
        if (!name || /[가-힣]/.test(previous)) name = previous;
        if (/[가-힣]/.test(previous)) break;
      }
    }
    name = name.replace(/^장소\s*[:：]\s*/, '').trim();
    address = address.replace(/\s*[#|].*$/, '').trim();
    if (!name) name = '장소 이름을 입력해 주세요';
    if (!result.some(p => normalize(p.address) === normalize(address))) result.push({ name, address });
  }
  return result;
}
export function normalize(value: string) { return String(value).normalize('NFKC').toLowerCase().replace(/[\s\p{P}]/gu, ''); }
