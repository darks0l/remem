/**
 * ReMEM — GitHub Actions CI workflow regression coverage
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '..');
const workflowPath = path.join(repoRoot, '.github', 'workflows', 'ci.yml');
const workflow = readFileSync(workflowPath, 'utf8');

describe('GitHub Actions CI workflow', () => {
  it('runs the core release-validation gates on pushes and pull requests', () => {
    expect(workflow).toContain('name: CI');
    expect(workflow).toContain('push:');
    expect(workflow).toContain('pull_request:');
    expect(workflow).toContain("- '20'");
    expect(workflow).toContain("- '22'");
    expect(workflow).toContain('run: npm ci');
    expect(workflow).toContain('run: npm run lint');
    expect(workflow).toContain('run: npm test');
    expect(workflow).toContain('run: npm run build');
    expect(workflow).toContain('run: npm run bench:public-results:verify');
    expect(workflow).toContain('run: npm pack --dry-run');
  });
});
