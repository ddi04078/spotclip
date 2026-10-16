import { extractPlaceCandidates } from '../services/ocr/placeCandidateExtractor.ts';
import { createWorker, PSM, type Worker } from 'tesseract.js';
import type { OcrProvider } from '../services/ocr/types.ts';
export const isOnDeviceOcrAvailable = true;
let worker: Promise<Worker> | undefined;
async function getWorker() {
  if (location.protocol === 'file:') throw new Error('웹 OCR은 브라우저 체험 주소에서 사용해주세요. 파일로 연 HTML에서는 예시 체험만 가능해요.');
  if (!worker) {
    const root = new URL('./ocr/', document.baseURI).href;
    worker = createWorker(['kor', 'eng'], 1, { workerPath: root + 'worker.min.js', corePath: root, langPath: root, workerBlobURL: false });
    worker.catch(() => { worker = undefined; });
  }
  return worker;
}
export const onDeviceOcr: OcrProvider = {
  async recognize(image) {
    try {
      const engine = await getWorker();
      await engine.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
      const uri = image.analysisData || image.reference;
      const result = await engine.recognize(uri);
      let text = result.data.text;
      const candidates = extractPlaceCandidates(text);
      // One additional LOCAL pass for hard captions; never an API fallback.
      if (!candidates.length || candidates.some(c => !c.addressHint || c.recognitionWarning)) {
        const input = await prepareCaption(uri);
        await engine.setParameters({ tessedit_pageseg_mode: PSM.AUTO });
        const retry = await engine.recognize(input);
        const quality = (value: string) => extractPlaceCandidates(value).reduce((n, c) => n + (c.addressHint ? 4 : 1) - (c.recognitionWarning ? 2 : 0), 0);
        if (quality(retry.data.text) > quality(text)) text = retry.data.text;
      }
      return { text: text.slice(0, 30000) };
    } catch {
      throw new Error('사진의 글자를 읽지 못했어요. 인터넷 연결과 브라우저를 확인하고 다시 시도해주세요. 예시 장소로 대체 저장하지 않았어요.');
    }
  },
};

/** Upscale caption region and normalize contrast. Keeps full image when not portrait. */
async function prepareCaption(uri: string): Promise<string> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = uri; });
  const top = image.height > image.width * 1.2 ? Math.round(image.height * .45) : 0;
  const scale = Math.min(3, 2200 / image.width);
  const canvas = document.createElement('canvas'); canvas.width = Math.round(image.width * scale); canvas.height = Math.round((image.height - top) * scale);
  const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, top, image.width, image.height - top, 0, 0, canvas.width, canvas.height);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let sum = 0; for (let i = 0; i < pixels.data.length; i += 4) sum += (pixels.data[i] + pixels.data[i + 1] + pixels.data[i + 2]) / 3;
  const invert = sum / (pixels.data.length / 4) < 128;
  for (let i = 0; i < pixels.data.length; i += 4) { let v = .299 * pixels.data[i] + .587 * pixels.data[i + 1] + .114 * pixels.data[i + 2]; if (invert) v = 255 - v; v = Math.max(0, Math.min(255, (v - 128) * 1.4 + 128)); pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = v; }
  ctx.putImageData(pixels, 0, 0); return canvas.toDataURL('image/png');
}
