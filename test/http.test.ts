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

  it('classifies intake memories over HTTP when advanced runtime is configured', async () => {
    const memory = new ReMEM({ storage: 'memory', dbPath: ':memory:' });
    await memory.init();
    await memory.enableLayers();

    const adapter = new HttpAdapter({ port: 18914, store: memory.getStore(), memory });
    adapters.push(adapter);
    await adapter.start();

    const remembered = await fetch('http://127.0.0.1:18914/memory/remember', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'We decided to ship ReMEM intake memory before the next release.',
        topics: ['release', 'roadmap'],
        source: 'http-test',
      }),
    });
    expect(remembered.status).toBe(201);
    const rememberJson = await readJson(remembered) as { action: string; kind: string; layer: string; entry?: { metadata: Record<string, unknown> } };
    expect(rememberJson.action).toBe('stored');
    expect(rememberJson.kind).toBe('decision');
    expect(rememberJson.layer).toBe('semantic');
    expect(rememberJson.entry?.metadata.source).toBe('http-test');

    memory.close();
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

    const recallProfiles = await fetch('http://127.0.0.1:18913/memory/recall-profiles');
    expect(recallProfiles.status).toBe(200);
    const recallProfilesJson = await readJson(recallProfiles) as { profiles: Array<{ profile: string }> };
    expect(recallProfilesJson.profiles.some((profile) => profile.profile === 'ops-handoff')).toBe(true);

    const recallProfile = await fetch('http://127.0.0.1:18913/memory/recall-profiles/coding-agent');
    expect(recallProfile.status).toBe(200);
    const recallProfileJson = await readJson(recallProfile) as { profile: string; recommendedFor: string[] };
    expect(recallProfileJson.profile).toBe('coding-agent');
    expect(recallProfileJson.recommendedFor.length).toBeGreaterThan(0);

    const recallProfileAlias = await fetch('http://127.0.0.1:18913/memory/recall-profiles/Coding_Agent');
    expect(recallProfileAlias.status).toBe(200);
    const recallProfileAliasJson = await readJson(recallProfileAlias) as { profile: string };
    expect(recallProfileAliasJson.profile).toBe('coding-agent');

    const smartRecall = await fetch('http://127.0.0.1:18913/memory/smart-recall', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'publish remem', options: { profile: 'OPS_HANDOFF', includeRecent: true } }),
    });
    expect(smartRecall.status).toBe(200);
    const smartRecallJson = await readJson(smartRecall) as { profile: string; results: Array<{ sourceLane: string }>; lanes: Record<string, number> };
    expect(smartRecallJson.profile).toBe('ops-handoff');
    expect(smartRecallJson.results.length).toBeGreaterThan(0);
    expect(Object.keys(smartRecallJson.lanes)).toContain('procedural');

    const contextPack = await fetch('http://127.0.0.1:18913/memory/context-pack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'publish remem', options: { profile: 'Coding_Agent', maxChars: 1400 } }),
    });
    expect(contextPack.status).toBe(200);
    const contextPackJson = await readJson(contextPack) as { profile: string; content: string; sourceIds: string[]; usedChars: number; sections: Array<{ kind: string }> };
    expect(contextPackJson.profile).toBe('coding-agent');
    expect(contextPackJson.content).toContain('ReMEM Context Pack');
    expect(contextPackJson.sections.some((section) => section.kind === 'actions')).toBe(true);
    expect(contextPackJson.sourceIds.length).toBeGreaterThan(0);
    expect(contextPackJson.usedChars).toBeLessThanOrEqual(1400);

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
        resourceUri: 'memory://codebase/remem/graph',
        requiredScopes: ['codebase:read'],
        format: 'sqlite',
        compression: 'zstd',
      }),
    });
    expect(artifact.status).toBe(201);
    const artifactJson = await readJson(artifact) as { source: string; artifactPath: string; resourceUri?: string; requiredScopes?: string[] };
    expect(artifactJson.source).toBe('codebase-memory-mcp');
    expect(artifactJson.artifactPath).toBe('.codebase-memory/graph.db.zst');
    expect(artifactJson.resourceUri).toBe('memory://codebase/remem/graph');
    expect(artifactJson.requiredScopes).toEqual(['codebase:read']);

    const knowledgeIngest = await fetch('http://127.0.0.1:18913/knowledge/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        graph: {
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
        },
      }),
    });
    expect(knowledgeIngest.status).toBe(201);
    const knowledgeIngestJson = await readJson(knowledgeIngest) as { nodesStored: number; edgesLinked: number };
    expect(knowledgeIngestJson.nodesStored).toBe(2);
    expect(knowledgeIngestJson.edgesLinked).toBe(1);

    const knowledgeOverview = await fetch('http://127.0.0.1:18913/knowledge/overview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project: 'remem', limit: 5 }),
    });
    expect(knowledgeOverview.status).toBe(200);
    const knowledgeOverviewJson = await readJson(knowledgeOverview) as {
      project?: string;
      nodes: number;
      labels: Record<string, number>;
      hotspots: unknown[];
    };
    expect(knowledgeOverviewJson.project).toBe('remem');
    expect(knowledgeOverviewJson.nodes).toBe(2);
    expect(knowledgeOverviewJson.labels.Function).toBe(2);
    expect(Array.isArray(knowledgeOverviewJson.hotspots)).toBe(true);

    const knowledgeSubgraph = await fetch('http://127.0.0.1:18913/knowledge/subgraph', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'ProcessOrder',
        options: { project: 'remem', connectionTypes: ['calls'], limit: 8, neighborLimit: 8 },
      }),
    });
    expect(knowledgeSubgraph.status).toBe(200);
    const knowledgeSubgraphJson = await readJson(knowledgeSubgraph) as {
      results: Array<{ content: string }>;
      paths: unknown[];
      linksTraversed: number;
      context: string;
    };
    expect(knowledgeSubgraphJson.results.length).toBe(2);
    expect(knowledgeSubgraphJson.paths.length).toBeGreaterThanOrEqual(1);
    expect(knowledgeSubgraphJson.linksTraversed).toBeGreaterThanOrEqual(1);
    expect(knowledgeSubgraphJson.context).toContain('ProcessOrder');

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
