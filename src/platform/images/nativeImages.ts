import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { randomUUID } from 'expo-crypto';
import type { SourceImage } from '../../domain/types.ts';

const directory = () => {
  if (!FileSystem.documentDirectory) throw new Error('이 기기에서 사진 저장 공간에 접근할 수 없어요.');
  return `${FileSystem.documentDirectory}spotclip-images/`;
};
/** Native system picker; no full-library or camera permissions needed for manual selection. */
export async function pickScreenshots(): Promise<SourceImage[] | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: 10,
    quality: 0.85, preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  });
  if (result.canceled) return null;
  if (!result.assets.length || result.assets.length > 10) throw new Error('사진을 한 번에 1~10장 선택해주세요.');
  await FileSystem.makeDirectoryAsync(directory(), { intermediates: true });
  const imported: SourceImage[] = [];
  try {
    for (const asset of result.assets) {
      const info = await FileSystem.getInfoAsync(asset.uri);
      const size = asset.fileSize ?? (info.exists && 'size' in info ? info.size : 0);
      if (!info.exists || !size || size > 15 * 1024 * 1024) throw new Error('사진은 장당 15MB 이하로 선택해주세요.');
      const id = randomUUID();
      const extension = asset.mimeType?.includes('png') ? 'png' : asset.mimeType?.includes('webp') ? 'webp' : asset.mimeType?.includes('heic') ? 'heic' : 'jpg';
      const reference = `${directory()}${id}.${extension}`;
      await FileSystem.copyAsync({ from: asset.uri, to: reference });
      imported.push({ id, name: asset.fileName || `screenshot.${extension}`, mediaType: asset.mimeType || 'image/jpeg', size, reference, thumbnail: reference });
    }
    return imported;
  } catch (e) {
    for (const image of imported) await FileSystem.deleteAsync(image.reference, { idempotent: true }).catch(() => undefined);
    throw e;
  }
}
/** Delete only files in SpotClip's managed folder and never touch OS photo-library originals. */
export async function pruneImages(keepUris: string[]): Promise<void> {
  const dir = directory();
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) return;
  const keep = new Set(keepUris.map(uri => uri.split('/').at(-1)));
  for (const name of await FileSystem.readDirectoryAsync(dir)) {
    if (!/^[a-f0-9-]+\.(jpg|png|webp|heic)$/.test(name)) continue;
    const uri = `${dir}${name}`;
    if (!keep.has(name)) await FileSystem.deleteAsync(uri, { idempotent: true });
  }
}
/** iOS may relocate an app's sandbox after update/restore. Resolve managed images in the current container. */
export function displayImageUri(uri: string): string {
  const match = uri.match(/\/spotclip-images\/([a-f0-9-]+\.(?:jpg|png|webp|heic))$/);
  return match ? `${directory()}${match[1]}` : uri;
}

/** Reads only picker-owned files; never sends arbitrary remote URLs to the server. */
export async function readAnalysisImage(image: SourceImage): Promise<string> {
  if (!image.reference.startsWith(directory()) || !['image/jpeg', 'image/png', 'image/webp'].includes(image.mediaType)) throw new Error('JPG, PNG, WebP 사진을 선택해주세요.');
  const data = await FileSystem.readAsStringAsync(image.reference, { encoding: FileSystem.EncodingType.Base64 });
  if (data.length > 2_000_000) throw new Error('실제 분석용 사진은 1.5MB 이하로 줄여주세요.');
  return `data:${image.mediaType};base64,${data}`;
}
