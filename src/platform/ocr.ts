import { requireOptionalNativeModule } from 'expo-modules-core';
import { OnDeviceOcrProvider } from '../services/ocr/OnDeviceOcrProvider.ts';
const native = requireOptionalNativeModule<{ recognize(uri: string): Promise<string> }>('SpotClipOcr');
export const isOnDeviceOcrAvailable = !!native;
export const onDeviceOcr = new OnDeviceOcrProvider(async uri => {
  if (!native) throw new Error('기기 OCR은 iPhone Development Build가 필요해요. Expo Go에서는 Mock을 사용해주세요.');
  return native.recognize(uri);
});
