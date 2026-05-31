/**
 * ReMEM — docs hygiene regression checks
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '..');
const filesToCheck = [
  'README.md',
  'benchmarks/README.md',
] as const;

const privateLanUrlPattern = /https?:\/\/(?:192\.168\.|10\.|172\.(?:1[6-9]|2\d|3[01])\.)/;
const stalePassingCountPattern = /tests-\d+%2F\d+%20passing/i;

describe('documentation hygiene', () => {
  it('does not publish private network URLs in README examples', () => {
    for (const relativePath of filesToCheck) {
      const content = readFileSync(path.join(repoRoot, relativePath), 'utf8');
      expect(content, `${relativePath} should not contain private LAN URLs`).not.toMatch(
        privateLanUrlPattern
      );
    }
  });

  it('does not hardcode a stale passing-test count badge in README', () => {
    const readme = readFileSync(path.join(repoRoot, 'README.md'), 'utf8');
    expect(readme).not.toMatch(stalePassingCountPattern);
    expect(readme).toContain('https://img.shields.io/badge/tests-passing-00e676');
  });
});
