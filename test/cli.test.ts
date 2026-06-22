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
    expect(result.stdout).toContain('remem doctor');
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

  it('runs doctor diagnostics and emits JSON', async () => {
    const result = await invoke(['doctor', '--storage', 'memory', '--db', ':memory:', '--json']);
    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.ok).toBe(true);
    expect(payload.command).toBe('doctor');
    expect(payload.checks.some((check: { name: string }) => check.name === 'package-version')).toBe(true);
    expect(payload.checks.some((check: { name: string }) => check.name === 'snapshot-roundtrip')).toBe(true);
  });

  it('validates generated config files without echoing config secrets', async () => {
    const outDir = path.resolve('.temp-remem-validate');
    await fs.mkdir(outDir, { recursive: true });
    const configPath = path.join(outDir, 'remem.config.json');
    await fs.writeFile(configPath, JSON.stringify({
      storage: 'memory',
      llm: { type: 'openai', apiKey: 'SECRET_SHOULD_NOT_ECHO' },
    }), 'utf8');

    const result = await invoke(['validate-config', '--config', configPath, '--json']);
    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.ok).toBe(true);
    expect(payload.command).toBe('validate-config');
    expect(payload.config).toBeUndefined();
    expect(result.stdout).not.toContain('SECRET_SHOULD_NOT_ECHO');
  });

  it('rejects unrelated JSON files as config', async () => {
    const outDir = path.resolve('.temp-remem-invalid-config');
    await fs.mkdir(outDir, { recursive: true });
    const configPath = path.join(outDir, 'package-like.json');
    await fs.writeFile(configPath, JSON.stringify({ name: 'not-remem-config', version: '1.0.0' }), 'utf8');

    const result = await invoke(['validate-config', '--config', configPath, '--json']);
    expect(result.exitCode).toBe(1);
    const payload = JSON.parse(result.stdout);
    expect(payload.ok).toBe(false);
    expect(payload.checks.some((check: { detail: string }) => check.detail.includes('No ReMEM config fields found'))).toBe(true);
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

  it('can run doctor checks after init artifact generation', async () => {
    const outDir = path.resolve('.temp-remem-init-check');
    const result = await invoke(['init', '--storage', 'memory', '--db', ':memory:', '--runtime', 'openclaw', '--out-dir', outDir, '--check', '--json']);
    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.ok).toBe(true);
    expect(payload.configValidation.ok).toBe(true);
    expect(payload.doctorChecks.some((check: { name: string }) => check.name === 'config-schema')).toBe(true);
  });

  it('returns recent entries scoped to a namespace', async () => {
    const db = './.tmp-cli-namespace.db';
    const storeResult = await invoke([
      'shared-store',
      '--db', db,
      '--namespace', 'team/ops',
      '--content', 'Meta approved the new rollout lane',
      '--topics', 'ops,release',
      '--visibility', 'shared',
      '--json',
    ]);
    expect(storeResult.exitCode).toBe(0);
    expect(JSON.parse(storeResult.stdout).stored).toBe(true);

    const recentResult = await invoke([
      'namespace-recent',
      '--db', db,
      '--namespace', 'team/ops',
      '--limit', '5',
      '--json',
    ]);
    expect(recentResult.exitCode).toBe(0);
    const payload = JSON.parse(recentResult.stdout);
    expect(payload.results.length).toBeGreaterThan(0);
    expect(payload.results[0].content).toContain('rollout lane');
  });

  it('returns smart recall JSON', async () => {
    const db = './.tmp-cli-smart-recall.db';
    await invoke(['store', '--db', db, '--content', 'Meta prefers short direct replies', '--topics', 'prefs,tone', '--json']);
    const result = await invoke(['smart-recall', '--db', db, '--query', 'How should I reply to Meta?', '--profile', 'fast', '--json']);
    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.ok).toBe(true);
    expect(payload.command).toBe('smart-recall');
    expect(payload.profile).toBe('fast');
    expect(Array.isArray(payload.results)).toBe(true);
    expect(payload.lanes).toBeTruthy();
  });

  it('returns context pack JSON and bounded text', async () => {
    const db = './.tmp-cli-context-pack.db';
    await invoke(['store', '--db', db, '--content', 'ReMEM context packs should be prompt ready', '--topics', 'remem,context', '--json']);
    await invoke(['procedural-store', '--db', db, '--content', 'When packing context, keep source ids and budget visible', '--trigger', 'packing context', '--topics', 'context,procedure', '--json']);

    const result = await invoke(['context-pack', '--db', db, '--query', 'packing context for remem', '--profile', 'agent-safe', '--max-chars', '1200', '--json']);
    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.ok).toBe(true);
    expect(payload.command).toBe('context-pack');
    expect(payload.content).toContain('ReMEM Context Pack');
    expect(payload.usedChars).toBeLessThanOrEqual(1200);
    expect(payload.sourceIds.length).toBeGreaterThan(0);
  });

  it('returns dream synthesis JSON from long memory layers', async () => {
    const db = './.tmp-cli-dream.db';
    await invoke(['layer-store', '--db', db, '--layer', 'identity', '--content', 'Darksol values durable agent memory and direct execution', '--topics', 'identity,values', '--json']);
    await invoke(['layer-store', '--db', db, '--layer', 'semantic', '--content', 'Repeated operator interest is forming around long-memory synthesis', '--topics', 'memory,roadmap', '--json']);
    await invoke(['procedural-store', '--db', db, '--content', 'When patterns repeat across long memory, synthesize them into durable next actions', '--trigger', 'patterns repeat', '--topics', 'procedure,memory', '--json']);

    const result = await invoke(['dream', '--db', db, '--query', 'What should long memory tell us next?', '--json']);
    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.ok).toBe(true);
    expect(payload.command).toBe('dream');
    expect(typeof payload.content).toBe('string');
    expect(payload.sourceCount).toBeGreaterThan(0);
    expect(Array.isArray(payload.sourceLayers)).toBe(true);
  });
});
