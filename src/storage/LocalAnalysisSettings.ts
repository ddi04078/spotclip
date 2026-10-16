import type { AnalysisSettings } from '../services/createServices.ts';
import type { AsyncKeyValueStorage } from './LocalPlaceStorage.ts';
export interface AnalysisSettingsStorage {
  load(): Promise<AnalysisSettings>;
  save(settings: AnalysisSettings): Promise<void>;
}
export class LocalAnalysisSettings implements AnalysisSettingsStorage {
  private storage: AsyncKeyValueStorage;
  private queue = Promise.resolve();
  constructor(storage: AsyncKeyValueStorage) { this.storage = storage; }
  async load(): Promise<AnalysisSettings> {
    const raw = await this.storage.getItem('@spotclip/analysis-settings/v1');
    if (!raw) return { scenario: 'multiple', mockAutoSave: true };
    const data = JSON.parse(raw);
    if (!['multiple', 'single', 'ambiguous'].includes(data.scenario) || typeof data.mockAutoSave !== 'boolean') throw new Error('분석 설정을 읽지 못했어요. 설정을 다시 선택해주세요.');
    return { scenario: data.scenario, mockAutoSave: data.mockAutoSave };
  }
  save(settings: AnalysisSettings): Promise<void> {
    const result = this.queue.then(() => this.storage.setItem('@spotclip/analysis-settings/v1', JSON.stringify(settings)));
    this.queue = result.catch(() => undefined);
    return result;
  }
}
