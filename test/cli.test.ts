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
    expect(result.stdout).toContain('remem stats');
  });

  it('returns JSON status when --json is set', async () => {
    const result = await invoke(['status', '--storage', 'memory', '--db', ':memory:', '--json']);
    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.ok).toBe(true);
    expect(payload.command).toBe('status');
    expect(payload.storage).toBe('memory');
  });

  it('returns memory stats through the CLI JSON contract', async () => {
    const db = './.tmp-cli-stats.db';
    await fs.rm(db, { force: true });
    await invoke(['store', '--db', db, '--content', 'Stats should count memory topics', '--topics', 'ops,stats', '--json']);
    await invoke(['store', '--db', db, '--content', 'Stats should rank repeated topics', '--topics', 'stats', '--json']);

    const result = await invoke(['stats', '--db', db, '--json']);
    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.ok).toBe(true);
    expect(payload.command).toBe('stats');
    expect(payload.coreCount).toBe(2);
    expect(payload.snapshotCount).toBe(0);
    expect(payload.topics[0]).toEqual({ topic: 'stats', count: 2 });
  });

  it('returns memory graph snapshots as JSON and DOT', async () => {
    const db = `./.tmp-cli-graph-${Date.now()}-${Math.random().toString(16).slice(2)}.db`;
    await fs.rm(db, { force: true });
    await invoke(['store', '--db', db, '--content', 'Graph memory one for visualization', '--topics', 'graph,viz', '--json']);
    await invoke(['store', '--db', db, '--content', 'Graph memory two for visualization', '--topics', 'graph', '--json']);

    const jsonResult = await invoke(['graph', '--db', db, '--query', 'visualization', '--json']);
    expect(jsonResult.exitCode).toBe(0);
    const payload = JSON.parse(jsonResult.stdout);
    expect(payload.ok).toBe(true);
    expect(payload.command).toBe('graph');
    expect(payload.name).toBe('ReMEM Memory Graph');
    expect(payload.nodes.length).toBe(2);
    expect(payload.topics[0]).toMatchObject({ topic: 'graph', count: 2 });

    const dotResult = await invoke(['graph', '--db', db, '--query', 'visualization', '--dot']);
    expect(dotResult.exitCode).toBe(0);
    expect(dotResult.stdout).toContain('digraph remem_memory');
    expect(dotResult.stdout).toContain('Graph memory one');
  });

  it('returns memory health through the CLI JSON contract', async () => {
    const db = `./.tmp-cli-health-${Date.now()}-${Math.random().toString(16).slice(2)}.db`;
    await fs.rm(db, { force: true });
    await invoke(['store', '--db', db, '--content', 'Health duplicate memory', '--topics', 'health', '--json']);
    await invoke(['store', '--db', db, '--content', 'Health duplicate memory', '--topics', 'health', '--json']);
    await invoke(['store', '--db', db, '--content', 'Health untagged memory', '--json']);

    const result = await invoke([
      'health',
      '--db', db,
      '--stale-age-ms', '1',
      '--min-snapshot-memories', '2',
      '--max-untagged-ratio', '0.1',
      '--json',
    ]);

    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.command).toBe('health');
    expect(payload.status).toBe('attention');
    expect(payload.stats.duplicateGroups).toBeGreaterThanOrEqual(1);
    expect(payload.recommendations.some((item: { action: string }) => item.action === 'create-snapshot')).toBe(true);
  });

  it('returns storage maintenance through the CLI JSON contract', async () => {
    const db = `./.tmp-cli-storage-maintenance-${Date.now()}-${Math.random().toString(16).slice(2)}.db`;
    await fs.rm(db, { force: true });

    const result = await invoke(['storage-maintenance', '--db', db, '--dry-run', '--compact', '--json']);
    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.ok).toBe(true);
    expect(payload.command).toBe('storage-maintenance');
    expect(payload.dryRun).toBe(true);
    expect(payload.compacted).toBe(false);
    expect(payload.expiredLayerEntries).toBe(0);
    expect(payload.orphanLinks).toBe(0);
    expect(payload.orphanEmbeddings).toBe(0);
  });

  it('registers and ingests knowledge graphs through the CLI JSON contract', async () => {
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const db = `./.tmp-cli-knowledge-${suffix}.db`;
    const artifact = `./.tmp-cli-knowledge-${suffix}.json`;
    await fs.rm(db, { force: true });
    await fs.writeFile(artifact, JSON.stringify({
      source: 'codebase-memory-mcp',
      project: 'remem',
      resourceUri: 'memory://codebase/remem/imported',
      requiredScopes: ['codebase:read'],
      nodes: [
        { id: 'fn:ProcessOrder', label: 'Function', name: 'ProcessOrder' },
        { id: 'fn:ChargeCard', label: 'Function', name: 'ChargeCard' },
      ],
      edges: [
        { from: 'fn:ProcessOrder', to: 'fn:ChargeCard', type: 'CALLS' },
      ],
    }), 'utf8');

    const registered = await invoke([
      'knowledge-artifact',
      '--db', db,
      '--path', '.codebase-memory/graph.db.zst',
      '--source', 'codebase-memory-mcp',
      '--project', 'remem',
      '--resource-uri', 'memory://codebase/remem/graph',
      '--required-scopes', 'codebase:read,graph:snapshot',
      '--format', 'sqlite',
      '--compression', 'zstd',
      '--json',
    ]);
    expect(registered.exitCode).toBe(0);
    const registeredPayload = JSON.parse(registered.stdout);
    expect(registeredPayload.command).toBe('knowledge-artifact');
    expect(registeredPayload.artifactPath).toBe('.codebase-memory/graph.db.zst');
    expect(registeredPayload.resourceUri).toBe('memory://codebase/remem/graph');
    expect(registeredPayload.requiredScopes).toEqual(['codebase:read', 'graph:snapshot']);

    const ingested = await invoke([
      'knowledge-ingest',
      '--db', db,
      '--artifact', artifact,
      '--json',
    ]);
    expect(ingested.exitCode).toBe(0);
    const ingestedPayload = JSON.parse(ingested.stdout);
    expect(ingestedPayload.command).toBe('knowledge-ingest');
    expect(ingestedPayload.nodesStored).toBe(2);
    expect(ingestedPayload.edgesLinked).toBe(1);

    const queried = await invoke(['query', '--db', db, '--query', 'ProcessOrder', '--json']);
    const queriedPayload = JSON.parse(queried.stdout);
    expect(queriedPayload.results[0].metadata.source).toBe('remem.knowledge.node');
    expect(queriedPayload.results[0].metadata.resourceUri).toBe('memory://codebase/remem/imported');

    const overview = await invoke([
      'knowledge-overview',
      '--db', db,
      '--project', 'remem',
      '--labels', 'Function',
      '--json',
    ]);
    expect(overview.exitCode).toBe(0);
    const overviewPayload = JSON.parse(overview.stdout);
    expect(overviewPayload.command).toBe('knowledge-overview');
    expect(overviewPayload.project).toBe('remem');
    expect(overviewPayload.nodes).toBe(2);
    expect(overviewPayload.labels.Function).toBe(2);
    expect(Array.isArray(overviewPayload.hotspots)).toBe(true);

    const subgraph = await invoke([
      'knowledge-subgraph',
      '--db', db,
      '--query', 'ProcessOrder',
      '--project', 'remem',
      '--connections', 'calls',
      '--labels', 'Function',
      '--json',
    ]);
    expect(subgraph.exitCode).toBe(0);
    const subgraphPayload = JSON.parse(subgraph.stdout);
    expect(subgraphPayload.command).toBe('knowledge-subgraph');
    expect(subgraphPayload.results.length).toBe(2);
    expect(subgraphPayload.paths.length).toBeGreaterThanOrEqual(1);
    expect(subgraphPayload.linksTraversed).toBeGreaterThanOrEqual(1);
    expect(subgraphPayload.context).toContain('ProcessOrder');

    await fs.rm(artifact, { force: true });
  });

  it('preserves zero-valued health thresholds', async () => {
    const db = `./.tmp-cli-health-zero-${Date.now()}-${Math.random().toString(16).slice(2)}.db`;
    await fs.rm(db, { force: true });
    for (let i = 0; i < 4; i += 1) {
      await invoke(['store', '--db', db, '--content', `Tagged health memory ${i}`, '--topics', 'health', '--json']);
    }
    await invoke(['store', '--db', db, '--content', 'Single untagged memory', '--json']);

    const result = await invoke([
      'health',
      '--db', db,
      '--min-snapshot-memories', '99',
      '--max-untagged-ratio', '0',
      '--json',
    ]);

    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.checks.some((check: { name: string; status: string }) => check.name === 'topic-coverage' && check.status === 'warn')).toBe(true);
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

  it('classifies intake memories through the remember CLI command', async () => {
    const db = './.tmp-cli-remember.db';
    await fs.rm(db, { force: true });

    const rememberResult = await invoke([
      'remember',
      '--db', db,
      '--content', 'We decided to ship the intake pipeline in the next ReMEM release.',
      '--topics', 'release,roadmap',
      '--source', 'cli-test',
      '--json',
    ]);
    expect(rememberResult.exitCode).toBe(0);
    const payload = JSON.parse(rememberResult.stdout);
    expect(payload.action).toBe('stored');
    expect(payload.kind).toBe('decision');
    expect(payload.layer).toBe('semantic');
    expect(payload.entry.metadata.source).toBe('cli-test');
  });

  it('processes remember batches through the CLI JSON contract', async () => {
    const db = './.tmp-cli-remember-batch.db';
    const batchPath = path.resolve('.tmp-cli-remember-batch.json');
    await fs.rm(db, { force: true });
    await fs.writeFile(batchPath, JSON.stringify([
      {
        content: 'We decided to ship batch remember before the next release.',
        topics: ['release', 'roadmap'],
        source: 'cli-batch',
      },
      {
        content: 'ok',
      },
      {
        content: 'We decided to ship batch remember before the next release.',
        topics: ['release', 'roadmap'],
      },
    ]), 'utf8');

    const result = await invoke([
      'remember-batch',
      '--db', db,
      '--file', batchPath,
      '--json',
    ]);
    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.command).toBe('remember-batch');
    expect(payload.total).toBe(3);
    expect(payload.stored).toBe(1);
    expect(payload.skippedLowSignal).toBe(1);
    expect(payload.skippedDuplicate).toBe(1);
    expect(payload.failed).toBe(0);
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
    await fs.rm(db, { force: true });
    await invoke(['store', '--db', db, '--content', 'Meta prefers short direct replies', '--topics', 'prefs,tone', '--json']);
    await invoke(['procedural-store', '--db', db, '--content', 'Always keep CLI JSON contracts stable before release.', '--trigger', 'release remem', '--topics', 'release,procedure', '--json']);
    const result = await invoke(['smart-recall', '--db', db, '--query', 'How should I release remem safely?', '--profile', 'ops-handoff', '--json']);
    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.ok).toBe(true);
    expect(payload.command).toBe('smart-recall');
    expect(payload.profile).toBe('ops-handoff');
    expect(Array.isArray(payload.results)).toBe(true);
    expect(payload.lanes).toBeTruthy();
  });

  it('lists recall profiles in json mode', async () => {
    const result = await invoke(['recall-profiles', '--json']);
    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.ok).toBe(true);
    expect(payload.command).toBe('recall-profiles');
    expect(Array.isArray(payload.profiles)).toBe(true);
    expect(payload.profiles.some((profile: { profile: string }) => profile.profile === 'coding-agent')).toBe(true);
  });

  it('returns context pack JSON and bounded text', async () => {
    const db = './.tmp-cli-context-pack.db';
    await fs.rm(db, { force: true });
    await invoke(['store', '--db', db, '--content', 'ReMEM context packs should be prompt ready', '--topics', 'remem,context', '--json']);
    await invoke(['procedural-store', '--db', db, '--content', 'When packing context, keep source ids and budget visible', '--trigger', 'packing context', '--topics', 'context,procedure', '--json']);

    const result = await invoke(['context-pack', '--db', db, '--query', 'packing context for remem', '--profile', 'coding-agent', '--max-chars', '1400', '--json']);
    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.ok).toBe(true);
    expect(payload.command).toBe('context-pack');
    expect(payload.content).toContain('ReMEM Context Pack');
    expect(payload.profile).toBe('coding-agent');
    expect(payload.sections.some((section: { kind: string }) => section.kind === 'procedural')).toBe(true);
    expect(payload.usedChars).toBeLessThanOrEqual(1400);
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
