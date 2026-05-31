/**
 * ReMEM — benchmark subpath typing contract tests
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '..');
const manifestTypes = readFileSync(path.join(repoRoot, 'benchmarks', 'public-results.d.ts'), 'utf8');
const schemaTypes = readFileSync(
  path.join(repoRoot, 'benchmarks', 'public-results.schema.d.ts'),
  'utf8'
);

describe('benchmark subpath typing contracts', () => {
  it('ships a typed manifest contract for downstream consumers', () => {
    expect(manifestTypes).toContain('export interface PublicBenchmarkResultsManifest');
    expect(manifestTypes).toContain('export interface BenchmarkScenarioManifest');
    expect(manifestTypes).toContain('declare const manifest: PublicBenchmarkResultsManifest;');
    expect(manifestTypes).toContain('export default manifest;');
  });

  it('ships a typed schema contract for downstream consumers', () => {
    expect(schemaTypes).toContain('declare const schema: {');
    expect(schemaTypes).toContain('export default schema;');
  });
});
