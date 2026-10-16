import { OnDeviceOcrProvider } from '../services/ocr/OnDeviceOcrProvider.ts';
export const isOnDeviceOcrAvailable = false;
export const onDeviceOcr = new OnDeviceOcrProvider(async () => { throw new Error('기기 OCR은 iPhone Development Build에서 사용할 수 있어요.'); });
