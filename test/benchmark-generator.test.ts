/**
 * ReMEM — benchmark public-results generator reproducibility coverage
 */

import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '..');
const generatorPath = path.join(repoRoot, 'benchmarks', 'generate-public-results.mjs');
const checkedInMarkdownPath = path.join(repoRoot, 'benchmarks', 'PUBLIC-RESULTS-2026-05-03.md');
const checkedInManifestPath = path.join(repoRoot, 'benchmarks', 'PUBLIC-RESULTS-2026-05-03.json');
const checkedInSchemaPath = path.join(repoRoot, 'benchmarks', 'public-results.schema.json');

describe('benchmark public-results generator', () => {
  it('sanitizes private embedding hosts before publishing benchmark artifacts', () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'remem-bench-public-results-'));

    try {
      const checkedInManifestRaw = readFileSync(checkedInManifestPath, 'utf8');
      const checkedInManifest = JSON.parse(checkedInManifestRaw);

      execFileSync(
        process.execPath,
        [generatorPath, `--outputDir=${tempDir}`, `--generatedAt=${checkedInManifest.generatedAt}`],
        {
          cwd: repoRoot,
          stdio: 'pipe',
        }
      );

      const generatedManifest = JSON.parse(
        readFileSync(path.join(tempDir, 'PUBLIC-RESULTS-2026-05-03.json'), 'utf8')
      );
      const semanticRun = generatedManifest.historicalBaseline.runs.semantic80;
      const semanticScenario = semanticRun.scenarios.find(
        (scenario: any) => scenario.name === 'core semantic embeddings'
      );

      expect(semanticScenario).toBeTruthy();
      expect(semanticScenario.embeddings?.model).toBe('nomic-embed-text');
      expect(semanticScenario.embeddings?.baseUrl).toBe('[redacted-private-host]');
      expect(JSON.stringify(generatedManifest)).not.toContain('192.168.68.69');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('ships the benchmark schema at the documented lowercase path', () => {
    const schemaRaw = readFileSync(checkedInSchemaPath, 'utf8');
    expect(schemaRaw).toContain('"title": "ReMEM public benchmark results manifest"');
  });

  it('reproduces the checked-in markdown and JSON artifacts from raw benchmark results', () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'remem-bench-public-results-'));

    try {
      const checkedInManifestRaw = readFileSync(checkedInManifestPath, 'utf8');
      const checkedInManifest = JSON.parse(checkedInManifestRaw);

      execFileSync(
        process.execPath,
        [generatorPath, `--outputDir=${tempDir}`, `--generatedAt=${checkedInManifest.generatedAt}`],
        {
          cwd: repoRoot,
          stdio: 'pipe',
        }
      );

      const generatedMarkdown = readFileSync(
        path.join(tempDir, 'PUBLIC-RESULTS-2026-05-03.md'),
        'utf8'
      );
      const generatedManifestRaw = readFileSync(
        path.join(tempDir, 'PUBLIC-RESULTS-2026-05-03.json'),
        'utf8'
      );
      const checkedInMarkdown = readFileSync(checkedInMarkdownPath, 'utf8');

      expect(generatedMarkdown).toBe(checkedInMarkdown);

      const generatedManifest = JSON.parse(generatedManifestRaw);

      expect(generatedManifest.generatedAt).toBe(checkedInManifest.generatedAt);
      expect(generatedManifest).toEqual(checkedInManifest);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('verifies checked-in benchmark artifacts via the CLI', () => {
    expect(() =>
      execFileSync(process.execPath, [generatorPath, '--verify'], {
        cwd: repoRoot,
        stdio: 'pipe',
      })
    ).not.toThrow();
  });
});
