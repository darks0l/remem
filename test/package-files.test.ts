/**
 * ReMEM — npm package reproducibility coverage tests
 */

import { describe, expect, it } from 'vitest';
import pkg from '../package.json';
import manifest from '../benchmarks/PUBLIC-RESULTS-2026-05-03.json';

function filePatternToRegex(pattern: string) {
  const escaped = pattern.replace(/[|\\{}()[\]^$+?.]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`);
}

function isIncluded(path: string, patterns: string[]) {
  return patterns.some((pattern) => filePatternToRegex(pattern).test(path));
}

describe('package files allowlist', () => {
  const files = pkg.files ?? [];

  it('ships benchmark reproducibility entrypoints and published summaries', () => {
    expect(files).toEqual(
      expect.arrayContaining([
        'benchmarks/README.md',
        'benchmarks/context-window-suite.mjs',
        'benchmarks/generate-public-results.mjs',
        'benchmarks/public-results.d.ts',
        'benchmarks/public-results.schema.d.ts',
        'benchmarks/public-results.schema.json',
        'benchmarks/PUBLIC-RESULTS-2026-05-03.md',
        'benchmarks/PUBLIC-RESULTS-2026-05-03.json',
        'benchmarks/results/*.json',
        'benchmarks/results/*.md',
        'ROADMAP.md',
        'docs/openclaw-quickstart.md',
        'docs/hermes-quickstart.md',
      ])
    );
  });

  it('does not accidentally ship scratch reset notes from the docs folder', () => {
    expect(isIncluded('docs/remem-v2-reset.md', files)).toBe(false);
  });

  it('ships runnable dist runtime files, not only declarations', () => {
    expect(files).toEqual(
      expect.arrayContaining([
        'dist/**',
      ])
    );
  });

  it('keeps package exports aligned with shipped benchmark files', () => {
    const exportsField = (pkg.exports ?? {}) as Record<string, string | Record<string, string>>;

    expect(exportsField['./benchmarks/public-results']).toEqual({
      types: './benchmarks/public-results.d.ts',
      default: './benchmarks/PUBLIC-RESULTS-2026-05-03.json',
    });
    expect(exportsField['./benchmarks/public-results.schema']).toEqual({
      types: './benchmarks/public-results.schema.d.ts',
      default: './benchmarks/public-results.schema.json',
    });
    expect(isIncluded('benchmarks/PUBLIC-RESULTS-2026-05-03.json', files)).toBe(true);
    expect(isIncluded('benchmarks/public-results.d.ts', files)).toBe(true);
    expect(isIncluded('benchmarks/public-results.schema.d.ts', files)).toBe(true);
    expect(isIncluded('benchmarks/public-results.schema.json', files)).toBe(true);
  });

  it('covers every benchmark artifact referenced by the machine-readable manifest', () => {
    const referencedFiles = new Set<string>();

    for (const digest of manifest.artifactDigests) {
      referencedFiles.add(digest.sourceFile);
    }

    for (const run of manifest.currentValidation.correctedTopicFilteredExactId) {
      referencedFiles.add(run.sourceFile);
    }

    for (const baseline of Object.values(manifest.historicalBaseline.runs)) {
      referencedFiles.add(baseline.sourceFile);
      for (const scenario of baseline.scenarios) {
        referencedFiles.add(scenario.sourceFile);
      }
    }

    for (const referencedFile of referencedFiles) {
      expect(isIncluded(referencedFile, files)).toBe(true);
    }
  });
});
