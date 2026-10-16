import type { SourceImage } from '../../domain/types.ts';
export interface OcrResult { text: string }
/** Recognition engines are injected; domain code never imports native SDKs. */
export interface OcrProvider { recognize(image: SourceImage): Promise<OcrResult> }
