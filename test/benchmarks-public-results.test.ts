/**
 * Benchmark public-results generator smoke test
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import manifest from '../benchmarks/PUBLIC-RESULTS-2026-05-03.json';

function sha256(buffer: Buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

describe('benchmark public results manifest', () => {
  it('captures current validation claims in machine-readable and auditable form', () => {
    expect(manifest.benchmark).toBe('remem-context-window-suite-v1');
    expect(manifest.harness.seed).toBe(1337);
    expect(manifest.currentValidation.rerunDate).toBe('2026-05-31');
    expect(Array.isArray(manifest.currentValidation.correctedTopicFilteredExactId)).toBe(true);
    expect(manifest.currentValidation.correctedTopicFilteredExactId).toHaveLength(3);
    expect(Array.isArray(manifest.currentValidation.deltasVsHistoricalBaseline)).toBe(true);
    expect(manifest.currentValidation.deltasVsHistoricalBaseline).toHaveLength(3);
    expect(Array.isArray(manifest.artifactDigests)).toBe(true);
    expect(manifest.artifactDigests.length).toBeGreaterThanOrEqual(7);

    const latest50k = manifest.currentValidation.correctedTopicFilteredExactId.find(
      (row) => row.corpusSize === 50000
    );

    expect(latest50k).toBeTruthy();
    expect(latest50k?.topicFilteredExactIdRecallAt1).toBe(1);
    expect(latest50k?.topicFilteredExactIdRecallAt5).toBe(1);
    expect(latest50k?.exactCodenameRecallAt5).toBe(1);
    expect(latest50k?.sourceSha256).toMatch(/^[a-f0-9]{64}$/);

    const delta50k = manifest.currentValidation.deltasVsHistoricalBaseline.find(
      (row) => row.corpusSize === 50000
    );

    expect(delta50k).toBeTruthy();
    expect(delta50k?.baselineSourceSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(delta50k?.validationSourceSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(delta50k?.topicFilteredExactIdRecallAt1Delta).toBeGreaterThan(0);

    const baseline50k = manifest.historicalBaseline.runs.memories50000;
    expect(baseline50k.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(baseline50k.scenarios.every((scenario) => scenario.sourceSha256 === baseline50k.sourceSha256)).toBe(true);

    expect(manifest.claimBoundary.notSafeToClaim).toContain(
      'Natural-language retrieval works without embeddings.'
    );
  });

  it('fingerprints each checked-in raw benchmark artifact correctly', () => {
    for (const artifact of manifest.artifactDigests) {
      const artifactPath = path.resolve(__dirname, '..', artifact.sourceFile);
      const raw = readFileSync(artifactPath);
      const parsed = JSON.parse(raw.toString('utf8'));

      expect(sha256(raw)).toBe(artifact.sha256);
      expect(parsed.timestamp).toBe(artifact.timestamp);
      expect(parsed.config.totalMemories).toBe(artifact.totalMemories);
      expect(parsed.config.queryCount).toBe(artifact.queryCount);
    }
  });
});
