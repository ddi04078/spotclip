import type { SourceImage } from '../../domain/types.ts';
import type { OcrProvider } from './types.ts';
/** Thin boundary over Apple Vision today; Android engines can implement the same contract. */
export class OnDeviceOcrProvider implements OcrProvider {
  constructor(private readText: (uri: string) => Promise<string>) {}
  async recognize(image: SourceImage) {
    const text = await this.readText(image.reference);
    return { text: text.slice(0, 30000) };
  }
}
