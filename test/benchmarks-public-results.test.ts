/**
 * Benchmark public-results generator smoke test
 */

import { describe, expect, it } from 'vitest';
import manifest from '../benchmarks/PUBLIC-RESULTS-2026-05-03.json';

describe('benchmark public results manifest', () => {
  it('captures current validation claims in machine-readable form', () => {
    expect(manifest.benchmark).toBe('remem-context-window-suite-v1');
    expect(manifest.harness.seed).toBe(1337);
    expect(manifest.currentValidation.rerunDate).toBe('2026-05-31');
    expect(Array.isArray(manifest.currentValidation.correctedTopicFilteredExactId)).toBe(true);
    expect(manifest.currentValidation.correctedTopicFilteredExactId).toHaveLength(3);

    const latest50k = manifest.currentValidation.correctedTopicFilteredExactId.find(
      (row) => row.corpusSize === 50000
    );

    expect(latest50k).toBeTruthy();
    expect(latest50k?.topicFilteredExactIdRecallAt1).toBe(1);
    expect(latest50k?.topicFilteredExactIdRecallAt5).toBe(1);
    expect(latest50k?.exactCodenameRecallAt5).toBe(1);
    expect(manifest.claimBoundary.notSafeToClaim).toContain(
      'Natural-language retrieval works without embeddings.'
    );
  });
});
