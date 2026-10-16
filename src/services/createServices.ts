import { createRemoteProviders, type RemoteAnalysisOptions } from './providers/RemoteAnalysisProvider.ts';
import { createIngestService } from './ingestPlaceSource.ts';
import { MockExtractionProvider, type MockScenario } from './providers/MockExtractionProvider.ts';
import { MockPlaceResolver } from './providers/MockPlaceResolver.ts';
import type { PlaceRepository } from '../domain/types.ts';
export interface AnalysisSettings { scenario: MockScenario; mockAutoSave: boolean }
export function createServices(repository: PlaceRepository, settings: AnalysisSettings, id: () => string, remote?: RemoteAnalysisOptions) {
  const providers = remote ? createRemoteProviders(remote) : { extraction: new MockExtractionProvider(settings.scenario), resolver: new MockPlaceResolver() };
  return createIngestService({
    ...providers,
    repository, id, now: () => new Date().toISOString(), allowMockAutoSave: settings.mockAutoSave,
  });
}
