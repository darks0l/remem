/**
 * ReMEM — README benchmark claim regression coverage
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import manifest from '../benchmarks/PUBLIC-RESULTS-2026-05-03.json';

const readmePath = path.resolve(__dirname, '..', 'README.md');
const readme = readFileSync(readmePath, 'utf8');

describe('README benchmark claims', () => {
  it('anchors public benchmark numbers to the audited manifest', () => {
    const latest50k = manifest.currentValidation.correctedTopicFilteredExactId.find(
      (row) => row.corpusSize === 50000
    );

    expect(latest50k).toBeTruthy();

    expect(readme).toContain('## Benchmark: External Memory Beyond Active Context');
    expect(readme).toContain('benchmarks/PUBLIC-RESULTS-2026-05-03.md');
    expect(readme).toContain('benchmarks/PUBLIC-RESULTS-2026-05-03.json');
    expect(readme).toContain("@darksol/remem/benchmarks/public-results");
    expect(readme).toContain("@darksol/remem/benchmarks/public-results.schema");
    expect(readme).toContain(`- **50,000 memories**`);
    expect(readme).toContain(`- Approx **3,625,526 stored tokens**`);
    expect(readme).toContain(`- Simulated active context: **7,264 tokens**`);
    expect(readme).toContain(`- Corpus/window pressure: **499x**`);
    expect(readme).toContain(
      `- ReMEM exact-codename lookup: **99.4% recall@1**, **100% recall@5**`
    );
    expect(readme).toContain(
      `- ReMEM topic-filtered exact-ID lookup: **100% recall@1/@5** after the exact-topic-match fix`
    );
    expect(readme).toContain(
      `- Avg query latency: **${latest50k?.avgExactCodenameQueryMs.toFixed(2)}ms** local in-memory sql.js run on the 50k exact-codename pass`
    );
  });

  it('preserves benchmark claim boundaries and limitations in README copy', () => {
    expect(readme).toContain("ReMEM does **not** change a model's native context length.");
    expect(readme).toContain('It gives agents an external memory layer they can query');
    expect(readme).toContain('Safe wording:');
    expect(readme).toContain('Do **not** claim infinite context or universal semantic recall.');
    expect(manifest.claimBoundary.safeShortClaim).toContain("does not make the model's native context window bigger");
    expect(manifest.claimBoundary.notSafeToClaim).toContain('ReMEM gives any model infinite context.');
    expect(manifest.claimBoundary.notSafeToClaim).toContain(
      '100% semantic recall at millions of tokens.'
    );
  });
});
