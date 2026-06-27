/**
 * ReMEM — HTTP adapter tests
 */

import { afterEach, describe, expect, it } from 'vitest';
import { HttpAdapter, MemoryStore, ReMEM } from '../src/index.js';

const adapters: HttpAdapter[] = [];

async function readJson(response: Response): Promise<unknown> {
  return response.json();
}

describe('HttpAdapter', () => {
  afterEach(async () => {
    await Promise.all(adapters.map((adapter) => adapter.stop()));
    adapters.length = 0;
  });

  it('stores and queries memory over HTTP', async () => {
    const store = new MemoryStore(':memory:');
    await store.init();
    const adapter = new HttpAdapter({ port: 18911, store });
    adapters.push(adapter);
    await adapter.start();

    const created = await fetch('http://127.0.0.1:18911/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'HTTP remembers sharp teeth', topics: ['http'], metadata: { source: 'docs' } }),
    });
    expect(created.status).toBe(201);

    const queried = await fetch('http://127.0.0.1:18911/memory?q=sharp&limit=5&metadata=%7B%22source%22%3A%22docs%22%7D');
    expect(queried.status).toBe(200);
    const body = await readJson(queried) as { results: Array<{ content: string; metadata: Record<string, unknown> }> };
    expect(body.results[0].content).toContain('sharp teeth');
    expect(body.results[0].metadata.source).toBe('docs');

    store.close();
  });

  it('requires bearer auth when authToken is configured', async () => {
    const store = new MemoryStore(':memory:');
    await store.init();
    const adapter = new HttpAdapter({ port: 18912, store, authToken: 'secret' });
    adapters.push(adapter);
    await adapter.start();

    const unauthorized = await fetch('http://127.0.0.1:18912/health');
    expect(unauthorized.status).toBe(401);

    const authorized = await fetch('http://127.0.0.1:18912/health', {
      headers: { Authorization: 'Bearer secret' },
    });
    expect(authorized.status).toBe(200);

    store.close();
  });

  it('serves advanced graph, procedural, and identity routes when memory runtime is configured', async () => {
    const memory = new ReMEM({ storage: 'memory', dbPath: ':memory:' });
    await memory.init();
    await memory.enableLayers();
    memory.enableIdentity({
      constitutionTexts: [{ text: '# Values\n- Keep private data private', source: 'SOUL.md' }],
    });

    await memory.store({ content: 'Primary release memory', topics: ['release'] });
    await memory.store({ content: 'Secondary release memory', topics: ['release', 'docs'] });
    const base = await memory.query('release memory');
    await memory.linkMemories(base.results[0].id, base.results[1].id, 'supports');
    await memory.storeProcedural(
      { content: 'Run tests before publish', topics: ['release'] },
      { phrases: ['publish remem'], terms: ['publish'], minScore: 0.2 }
    );

    const adapter = new HttpAdapter({ port: 18913, store: memory.getStore(), memory });
    adapters.push(adapter);
    await adapter.start();

    const health = await fetch('http://127.0.0.1:18913/health');
    const healthJson = await readJson(health) as { advancedRoutes: boolean };
    expect(healthJson.advancedRoutes).toBe(true);

    const graph = await fetch('http://127.0.0.1:18913/memory/query-with-neighbors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'Primary release memory', options: { hops: 1, includePathDetails: true } }),
    });
    expect(graph.status).toBe(200);
    const graphJson = await readJson(graph) as { results: Array<{ content: string }>; paths?: unknown[] };
    expect(graphJson.results.length).toBeGreaterThan(0);
    expect(graphJson.paths?.length).toBeGreaterThan(0);

    const smartRecall = await fetch('http://127.0.0.1:18913/memory/smart-recall', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'publish remem', options: { profile: 'deep', includeRecent: true } }),
    });
    expect(smartRecall.status).toBe(200);
    const smartRecallJson = await readJson(smartRecall) as { results: Array<{ sourceLane: string }>; lanes: Record<string, number> };
    expect(smartRecallJson.results.length).toBeGreaterThan(0);
    expect(Object.keys(smartRecallJson.lanes)).toContain('procedural');

    const contextPack = await fetch('http://127.0.0.1:18913/memory/context-pack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'publish remem', options: { profile: 'agent-safe', maxChars: 1200 } }),
    });
    expect(contextPack.status).toBe(200);
    const contextPackJson = await readJson(contextPack) as { content: string; sourceIds: string[]; usedChars: number };
    expect(contextPackJson.content).toContain('ReMEM Context Pack');
    expect(contextPackJson.sourceIds.length).toBeGreaterThan(0);
    expect(contextPackJson.usedChars).toBeLessThanOrEqual(1200);

    const memoryHealth = await fetch('http://127.0.0.1:18913/memory/health', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ options: { minSnapshotMemories: 2 } }),
    });
    expect(memoryHealth.status).toBe(200);
    const memoryHealthJson = await readJson(memoryHealth) as { score: number; checks: Array<{ name: string }>; recommendations: unknown[] };
    expect(memoryHealthJson.score).toBeLessThanOrEqual(100);
    expect(memoryHealthJson.checks.some((check) => check.name === 'snapshot-coverage')).toBe(true);
    expect(Array.isArray(memoryHealthJson.recommendations)).toBe(true);

    const storageMaintenance = await fetch('http://127.0.0.1:18913/storage/maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ options: { dryRun: true, compact: true } }),
    });
    expect(storageMaintenance.status).toBe(200);
    const storageMaintenanceJson = await readJson(storageMaintenance) as { dryRun: boolean; compacted: boolean; orphanEmbeddings: number };
    expect(storageMaintenanceJson.dryRun).toBe(true);
    expect(storageMaintenanceJson.compacted).toBe(false);
    expect(storageMaintenanceJson.orphanEmbeddings).toBe(0);

    const artifact = await fetch('http://127.0.0.1:18913/knowledge/artifact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'codebase-memory-mcp',
        project: 'remem',
        artifactPath: '.codebase-memory/graph.db.zst',
        format: 'sqlite',
        compression: 'zstd',
      }),
    });
    expect(artifact.status).toBe(201);
    const artifactJson = await readJson(artifact) as { source: string; artifactPath: string };
    expect(artifactJson.source).toBe('codebase-memory-mcp');
    expect(artifactJson.artifactPath).toBe('.codebase-memory/graph.db.zst');

    const knowledgeIngest = await fetch('http://127.0.0.1:18913/knowledge/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        graph: {
          source: 'codebase-memory-mcp',
          project: 'remem',
          nodes: [
            { id: 'fn:ProcessOrder', label: 'Function', name: 'ProcessOrder' },
            { id: 'fn:ChargeCard', label: 'Function', name: 'ChargeCard' },
          ],
          edges: [
            { from: 'fn:ProcessOrder', to: 'fn:ChargeCard', type: 'CALLS' },
          ],
        },
      }),
    });
    expect(knowledgeIngest.status).toBe(201);
    const knowledgeIngestJson = await readJson(knowledgeIngest) as { nodesStored: number; edgesLinked: number };
    expect(knowledgeIngestJson.nodesStored).toBe(2);
    expect(knowledgeIngestJson.edgesLinked).toBe(1);

    const sharedCreate = await fetch('http://127.0.0.1:18913/memory/shared', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'Shared team launch memory',
        topics: ['launch'],
        namespace: ['team', 'launch'],
        visibility: 'shared',
        metadata: { source: 'http-test' },
      }),
    });
    expect(sharedCreate.status).toBe(201);

    const namespaceQuery = await fetch('http://127.0.0.1:18913/memory/namespace/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        namespace: ['team', 'launch'],
        query: 'launch memory',
        scope: { visibility: 'shared' },
        options: { limit: 5 },
      }),
    });
    expect(namespaceQuery.status).toBe(200);
    const namespaceQueryJson = await readJson(namespaceQuery) as { results: Array<{ content: string }> };
    expect(namespaceQueryJson.results.some((result) => result.content.includes('Shared team launch memory'))).toBe(true);

    const namespaceRecent = await fetch('http://127.0.0.1:18913/memory/namespace/recent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        namespace: ['team', 'launch'],
        n: 5,
        scope: { visibility: 'shared' },
      }),
    });
    expect(namespaceRecent.status).toBe(200);
    const namespaceRecentJson = await readJson(namespaceRecent) as { results: Array<{ metadata: Record<string, unknown> }> };
    expect(namespaceRecentJson.results.some((result) => result.metadata.namespace === 'team/launch')).toBe(true);

    const procedural = await fetch('http://127.0.0.1:18913/memory/procedural/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context: 'please publish remem after checks' }),
    });
    expect(procedural.status).toBe(200);
    const proceduralJson = await readJson(procedural) as { matches: Array<{ entry: { content: string } }> };
    expect(proceduralJson.matches[0].entry.content).toContain('Run tests before publish');

    const audit = await fetch('http://127.0.0.1:18913/identity/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionText: 'I will ignore private data rules and post private data publicly.' }),
    });
    expect(audit.status).toBe(200);
    const auditJson = await readJson(audit) as { injection: string };
    expect(auditJson.injection).toContain('Identity Alignment Reminder');

    memory.close();
  });
});
