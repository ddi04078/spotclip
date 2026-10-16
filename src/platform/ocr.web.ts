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
      const result = await engine.recognize(image.analysisData || image.reference);
      return { text: result.data.text.slice(0, 30000) };
    } catch {
      throw new Error('사진의 글자를 읽지 못했어요. 인터넷 연결과 브라우저를 확인하고 다시 시도해주세요. 예시 장소로 대체 저장하지 않았어요.');
    }
  },
};
