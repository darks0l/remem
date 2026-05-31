/**
 * ReMEM — published npm tarball benchmark artifact coverage
 */

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import manifest from '../benchmarks/PUBLIC-RESULTS-2026-05-03.json';
import pkg from '../package.json';

type NpmPackFile = {
  path: string;
  size: number;
  mode: number;
};

type NpmPackResult = {
  files: NpmPackFile[];
  filename: string;
  name: string;
  version: string;
};

const repoRoot = path.resolve(__dirname, '..');

function runPackDryRun(): NpmPackResult {
  const npmExecPath = process.env.npm_execpath;
  if (!npmExecPath) {
    throw new Error('npm_execpath is not available; run this test through npm so pack dry-run can be reproduced.');
  }

  const raw = execFileSync(process.execPath, [npmExecPath, 'pack', '--dry-run', '--json'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  const parsed = JSON.parse(raw) as NpmPackResult[];
  expect(parsed).toHaveLength(1);
  return parsed[0];
}

describe('npm pack benchmark artifacts', () => {
  it('includes the published benchmark contract and every referenced raw artifact in the tarball', () => {
    const pack = runPackDryRun();
    const packedPaths = new Set(pack.files.map((file) => file.path));

    expect(pack.name).toBe(pkg.name);
    expect(pack.version).toBe(pkg.version);
    expect(pack.filename).toBe(`${pkg.name.replace('@', '').replace('/', '-')}-${pkg.version}.tgz`);

    expect(packedPaths.has('benchmarks/PUBLIC-RESULTS-2026-05-03.json')).toBe(true);
    expect(packedPaths.has('benchmarks/PUBLIC-RESULTS-2026-05-03.md')).toBe(true);
    expect(packedPaths.has('benchmarks/public-results.schema.json')).toBe(true);
    expect(packedPaths.has('benchmarks/README.md')).toBe(true);
    expect(packedPaths.has('benchmarks/generate-public-results.mjs')).toBe(true);

    const referencedFiles = new Set<string>();

    for (const artifact of manifest.artifactDigests) {
      referencedFiles.add(artifact.sourceFile);
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
      expect(
        packedPaths.has(referencedFile),
        `expected npm pack tarball to include ${referencedFile}`
      ).toBe(true);
    }
  });

  it('does not accidentally ship test files alongside the benchmark package contract', () => {
    const pack = runPackDryRun();
    const packedPaths = pack.files.map((file) => file.path);

    expect(packedPaths.some((file) => file.startsWith('test/'))).toBe(false);
  });
});
