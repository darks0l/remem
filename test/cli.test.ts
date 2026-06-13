import { describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { runCli } from '../src/cli.js';

async function invoke(args: string[]) {
  let stdout = '';
  let stderr = '';

  const exitCode = await runCli(['node', 'remem', ...args], {
    writeStdout: (chunk) => { stdout += chunk; },
    writeStderr: (chunk) => { stderr += chunk; },
    launchUi: async () => {
      throw new Error('ui_not_expected_in_cli_tests');
    },
  });

  return { exitCode, stdout, stderr };
}

describe('ReMEM CLI', () => {
  it('prints help text', async () => {
    const result = await invoke(['help']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('ReMEM CLI');
    expect(result.stdout).toContain('remem smoke-check');
  });

  it('returns JSON status when --json is set', async () => {
    const result = await invoke(['status', '--storage', 'memory', '--db', ':memory:', '--json']);
    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.ok).toBe(true);
    expect(payload.command).toBe('status');
    expect(payload.storage).toBe('memory');
  });

  it('stores and queries data through the CLI JSON contract', async () => {
    const db = './.tmp-cli-test.db';
    const storeResult = await invoke(['store', '--db', db, '--content', 'Meta likes dark mode', '--topics', 'prefs,ui', '--json']);
    expect(storeResult.exitCode).toBe(0);
    expect(JSON.parse(storeResult.stdout).stored).toBe(true);

    const queryResult = await invoke(['query', '--db', db, '--query', 'dark mode', '--json']);
    expect(queryResult.exitCode).toBe(0);
    const payload = JSON.parse(queryResult.stdout);
    expect(payload.results.length).toBeGreaterThan(0);
    expect(payload.results[0].content).toContain('dark mode');
  });

  it('fails unknown commands cleanly', async () => {
    const result = await invoke(['definitely-not-a-command']);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('ReMEM CLI');
  });

  it('runs smoke checks and emits JSON', async () => {
    const result = await invoke(['smoke-check', '--storage', 'memory', '--db', ':memory:', '--json']);
    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.ok).toBe(true);
    expect(Array.isArray(payload.checks)).toBe(true);
    expect(payload.checks.some((check: { name: string }) => check.name === 'snapshot-roundtrip')).toBe(true);
  });

  it('generates init artifacts non-interactively', async () => {
    const outDir = path.resolve('.temp-remem-init');
    const result = await invoke(['init', '--storage', 'memory', '--db', ':memory:', '--runtime', 'hermes', '--out-dir', outDir, '--json']);
    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.ok).toBe(true);
    expect(payload.runtimeFocus).toBe('Hermes');

    const config = await fs.readFile(path.join(outDir, 'remem.config.json'), 'utf8');
    const snippet = await fs.readFile(path.join(outDir, 'remem-snippet.ts'), 'utf8');
    const env = await fs.readFile(path.join(outDir, '.env.example'), 'utf8');

    expect(JSON.parse(config).storage).toBe('memory');
    expect(snippet).toContain('createHermesAdapter');
    expect(env).toContain('REMEM_EMBEDDINGS_URL');
  });
});
