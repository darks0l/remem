export interface BenchmarkClaimBoundary {
  summary: string;
  safeShortClaim: string;
  notSafeToClaim: string[];
}

export interface BenchmarkHarness {
  script: string;
  storage: string;
  seed: number;
  metrics: string[];
}

export interface BenchmarkContextPressure {
  corpusApproxTokens: number;
  fixedWindowApproxTokens: number;
  effectiveCorpusToWindowMultiple: number;
}

export interface BenchmarkScenarioMetrics {
  fixedContextRecallAt1: number;
  rememRecallAt1: number;
  rememRecallAtK: number;
  rememMRR: number;
  avgReturned: number;
  storeMs: number;
  avgStoreMsPerMemory: number;
  storeFailures: number;
  avgQueryMs: number;
  p50QueryMs: number;
  p95QueryMs: number;
}

export interface BenchmarkEmbeddingsConfig {
  [key: string]: unknown;
  baseUrl?: string;
  enabled?: boolean;
  model?: string;
}

export interface BenchmarkScenarioManifest {
  name: string;
  label: string;
  sourceFile: string;
  sourceSha256: string;
  queryStyle: string;
  queryTopics: boolean;
  embeddings: false | BenchmarkEmbeddingsConfig;
  metrics: BenchmarkScenarioMetrics;
}

export interface BenchmarkRunManifest {
  sourceFile: string;
  sourceSha256: string;
  contextPressure: BenchmarkContextPressure;
  queryCount: number;
  scenarios: BenchmarkScenarioManifest[];
}

export interface HistoricalBenchmarkRuns {
  memories2000: BenchmarkRunManifest;
  memories10000: BenchmarkRunManifest;
  memories50000: BenchmarkRunManifest;
  semantic80: BenchmarkRunManifest;
}

export interface BenchmarkValidationRow {
  corpusSize: number;
  sourceFile: string;
  sourceSha256: string;
  fixedRecallAt1: number;
  exactCodenameRecallAt1: number;
  exactCodenameRecallAt5: number;
  topicFilteredExactIdRecallAt1: number;
  topicFilteredExactIdRecallAt5: number;
  avgExactCodenameQueryMs: number;
  avgTopicFilteredQueryMs: number;
}

export interface BenchmarkArtifactDigest {
  sourceFile: string;
  sha256: string;
  timestamp: string;
  totalMemories: number;
  queryCount: number;
}

export interface PublicBenchmarkResultsManifest {
  generatedAt: string;
  $schema: string;
  schemaVersion: number;
  generator: string;
  benchmark: string;
  claimBoundary: BenchmarkClaimBoundary;
  harness: BenchmarkHarness;
  historicalBaseline: {
    releasedAt: string;
    runs: HistoricalBenchmarkRuns;
  };
  currentValidation: {
    rerunDate: string;
    latest50kEnvironment: Record<string, unknown>;
    correctedTopicFilteredExactId: BenchmarkValidationRow[];
  };
  artifactDigests: BenchmarkArtifactDigest[];
}

declare const manifest: PublicBenchmarkResultsManifest;

export default manifest;
