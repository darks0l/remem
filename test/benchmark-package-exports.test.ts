/**
 * ReMEM — benchmark package export contract tests
 */

import { describe, expect, it } from 'vitest';
import pkg from '../package.json';

const exportsField = pkg.exports as Record<string, unknown>;

describe('benchmark package exports', () => {
  it('publishes stable subpath exports for benchmark consumers', () => {
    expect(exportsField['./package.json']).toBe('./package.json');
    expect(exportsField['./benchmarks/public-results']).toEqual({
      types: './benchmarks/public-results.d.ts',
      default: './benchmarks/PUBLIC-RESULTS-2026-05-03.json',
    });
    expect(exportsField['./benchmarks/public-results.json']).toEqual({
      types: './benchmarks/public-results.d.ts',
      default: './benchmarks/PUBLIC-RESULTS-2026-05-03.json',
    });
    expect(exportsField['./benchmarks/public-results.schema']).toEqual({
      types: './benchmarks/public-results.schema.d.ts',
      default: './benchmarks/public-results.schema.json',
    });
    expect(exportsField['./benchmarks/public-results.schema.json']).toEqual({
      types: './benchmarks/public-results.schema.d.ts',
      default: './benchmarks/public-results.schema.json',
    });
    expect(exportsField['./benchmarks/README.md']).toBe('./benchmarks/README.md');
  });
});
