import type { SourceImage } from '../../domain/types.ts';

/** PC preview adapter. Uses compact local data URLs so saved previews survive browser reloads. */
export async function pickScreenshots(): Promise<SourceImage[] | null> {
  const files = await new Promise<File[] | null>(resolve => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/jpeg,image/png,image/webp'; input.multiple = true;
    input.style.display = 'none'; input.setAttribute('aria-label', '스크린샷 파일 선택');
    const finish = (files: File[] | null) => { input.remove(); resolve(files); };
    input.onchange = () => finish(input.files?.length ? Array.from(input.files) : null);
    input.addEventListener('cancel', () => finish(null), { once: true });
    document.body.append(input); input.click();
  });
  if (!files) return null;
  if (files.length > 10) throw new Error('사진을 한 번에 1~10장 선택해주세요.');
  if (files.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 15 * 1024 * 1024 || !file.size)) throw new Error('JPG, PNG, WebP 사진을 장당 15MB 이하로 선택해주세요.');
  const result: SourceImage[] = [];
  for (const file of files) {
    const temporary = URL.createObjectURL(file);
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error('사진을 읽지 못했어요. 다른 파일을 선택해주세요.')); img.src = temporary;
      });
      if (image.naturalWidth * image.naturalHeight > 48_000_000) throw new Error('사진 해상도가 너무 커요. 크기를 줄여주세요.');
      const scale = Math.min(1, 420 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d'); if (!context) throw new Error('브라우저에서 사진을 처리하지 못했어요.');
      context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const reference = canvas.toDataURL('image/jpeg', 0.65);
      if (reference.length > 300_000) throw new Error('미리보기 크기가 너무 커요. 다른 사진으로 시도해주세요.');
      const analysisScale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * analysisScale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * analysisScale));
      context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const analysisData = canvas.toDataURL('image/jpeg', 0.8);
      result.push({ analysisData, id: crypto.randomUUID(), name: file.name, mediaType: 'image/jpeg', size: file.size, reference, thumbnail: reference });
    } finally { URL.revokeObjectURL(temporary); }
  }
  return result;
}
// Data URLs belong to records; dropping the record releases the preview without file-system access.
export async function pruneImages(_keepUris: string[]): Promise<void> {}
export function displayImageUri(uri: string): string { return uri; }

export async function readAnalysisImage(image: SourceImage): Promise<string> {
  const data = image.analysisData;
  if (!data || data.length > 2_000_000) throw new Error('분석용 사진을 다시 선택하거나 크기를 줄여주세요.');
  return data;
}
