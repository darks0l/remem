/**
 * ReMEM — HTTP adapter tests
 */

import fs from 'node:fs/promises';
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

  it('routes requests into scoped runtimes when runtimeResolver is configured', async () => {
    const db = `./.tmp-http-scoped-${Date.now()}-${Math.random().toString(16).slice(2)}.db`;
    await fs.rm(db, { force: true });

    const alpha = new ReMEM({ storage: 'sqlite', dbPath: db, storageConfig: { workspaceId: 'alpha' } });
    await alpha.init();

    const beta = new ReMEM({ storage: 'sqlite', dbPath: db, storageConfig: { workspaceId: 'beta' } });
    await beta.init();

    const adapter = new HttpAdapter({
      port: 18915,
      store: alpha.getStore(),
      memory: alpha,
      trustScopeHeaders: true,
      runtimeResolver: (scope) => {
        if (scope.workspaceId === 'alpha') return { store: alpha.getStore(), memory: alpha };
        if (scope.workspaceId === 'beta') return { store: beta.getStore(), memory: beta };
        return null;
      },
    });
    adapters.push(adapter);
    await adapter.start();

    const alphaCreate = await fetch('http://127.0.0.1:18915/memory', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-ReMEM-Workspace-Id': 'alpha',
      },
      body: JSON.stringify({ content: 'Alpha workspace release memory', topics: ['release'] }),
    });
    expect(alphaCreate.status).toBe(201);

    const betaCreate = await fetch('http://127.0.0.1:18915/memory', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-ReMEM-Workspace-Id': 'beta',
      },
      body: JSON.stringify({ content: 'Beta workspace release memory', topics: ['release'] }),
    });
    expect(betaCreate.status).toBe(201);

    const alphaQuery = await fetch('http://127.0.0.1:18915/memory?q=release&limit=5', {
      headers: { 'X-ReMEM-Workspace-Id': 'alpha' },
    });
    expect(alphaQuery.status).toBe(200);
    const alphaQueryJson = await readJson(alphaQuery) as { results: Array<{ content: string }> };
    expect(alphaQueryJson.results.length).toBe(1);
    expect(alphaQueryJson.results[0].content).toContain('Alpha workspace');

    const betaQuery = await fetch('http://127.0.0.1:18915/memory?q=release&limit=5', {
      headers: { 'X-ReMEM-Workspace-Id': 'beta' },
    });
    expect(betaQuery.status).toBe(200);
    const betaQueryJson = await readJson(betaQuery) as { results: Array<{ content: string }> };
    expect(betaQueryJson.results.length).toBe(1);
    expect(betaQueryJson.results[0].content).toContain('Beta workspace');

    const alphaSnapshot = await fetch('http://127.0.0.1:18915/snapshots', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-ReMEM-Workspace-Id': 'alpha',
      },
      body: JSON.stringify({ label: 'alpha-snap' }),
    });
    expect(alphaSnapshot.status).toBe(201);

    const betaSnapshot = await fetch('http://127.0.0.1:18915/snapshots', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-ReMEM-Workspace-Id': 'beta',
      },
      body: JSON.stringify({ label: 'beta-snap' }),
    });
    expect(betaSnapshot.status).toBe(201);

    const alphaSnapshots = await fetch('http://127.0.0.1:18915/snapshots', {
      headers: { 'X-ReMEM-Workspace-Id': 'alpha' },
    });
    const alphaSnapshotsJson = await readJson(alphaSnapshots) as { snapshots: Array<{ label: string }> };
    expect(alphaSnapshotsJson.snapshots.some((snapshot) => snapshot.label === 'alpha-snap')).toBe(true);
    expect(alphaSnapshotsJson.snapshots.some((snapshot) => snapshot.label === 'beta-snap')).toBe(false);

    const betaSnapshots = await fetch('http://127.0.0.1:18915/snapshots', {
      headers: { 'X-ReMEM-Workspace-Id': 'beta' },
    });
    const betaSnapshotsJson = await readJson(betaSnapshots) as { snapshots: Array<{ label: string }> };
    expect(betaSnapshotsJson.snapshots.some((snapshot) => snapshot.label === 'beta-snap')).toBe(true);
    expect(betaSnapshotsJson.snapshots.some((snapshot) => snapshot.label === 'alpha-snap')).toBe(false);

    alpha.close();
    beta.close();
    await fs.rm(db, { force: true });
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
            { id: 'route:/orders', label: 'Route', name: 'POST /orders', path: 'src/routes/orders.ts' },
            { id: 'fn:ProcessOrder', label: 'Function', name: 'ProcessOrder', path: 'src/services/process-order.ts' },
            { id: 'fn:ChargeCard', label: 'Function', name: 'ChargeCard', path: 'src/billing/charge-card.ts' },
          ],
          edges: [
            { from: 'route:/orders', to: 'fn:ProcessOrder', type: 'CALLS' },
            { from: 'fn:ProcessOrder', to: 'fn:ChargeCard', type: 'CALLS' },
          ],
        },
      }),
    });
    expect(knowledgeIngest.status).toBe(201);
    const knowledgeIngestJson = await readJson(knowledgeIngest) as { nodesStored: number; edgesLinked: number };
    expect(knowledgeIngestJson.nodesStored).toBe(3);
    expect(knowledgeIngestJson.edgesLinked).toBe(2);

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
    expect(knowledgeOverviewJson.nodes).toBe(3);
    expect(knowledgeOverviewJson.labels.Function).toBe(2);
    expect(Array.isArray(knowledgeOverviewJson.hotspots)).toBe(true);

    const knowledgeAccessAllowed = await fetch('http://127.0.0.1:18913/knowledge/access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resource: {
          resourceUri: 'memory://codebase/remem/imported',
          requiredScopes: ['codebase:read'],
        },
        grant: {
          resourceUri: 'memory://codebase/remem/imported',
          scopes: ['codebase:read'],
        },
      }),
    });
    expect(knowledgeAccessAllowed.status).toBe(200);
    const knowledgeAccessAllowedJson = await readJson(knowledgeAccessAllowed) as {
      allowed: boolean;
      missingScopes: string[];
    };
    expect(knowledgeAccessAllowedJson.allowed).toBe(true);
    expect(knowledgeAccessAllowedJson.missingScopes).toEqual([]);

    const knowledgeAccessDenied = await fetch('http://127.0.0.1:18913/knowledge/access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resource: {
          resourceUri: 'memory://codebase/remem/imported',
          requiredScopes: ['codebase:read', 'graph:snapshot'],
        },
        grant: {
          resourceUri: 'memory://codebase/remem/imported',
          scopes: ['codebase:read'],
        },
      }),
    });
    expect(knowledgeAccessDenied.status).toBe(403);
    const knowledgeAccessDeniedJson = await readJson(knowledgeAccessDenied) as {
      allowed: boolean;
      missingScopes: string[];
    };
    expect(knowledgeAccessDeniedJson.allowed).toBe(false);
    expect(knowledgeAccessDeniedJson.missingScopes).toEqual(['graph:snapshot']);

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
    expect(knowledgeSubgraphJson.results.length).toBeGreaterThanOrEqual(2);
    expect(knowledgeSubgraphJson.paths.length).toBeGreaterThanOrEqual(1);
    expect(knowledgeSubgraphJson.linksTraversed).toBeGreaterThanOrEqual(1);
    expect(knowledgeSubgraphJson.context).toContain('ProcessOrder');

    const knowledgeGraphMemory = await fetch('http://127.0.0.1:18913/knowledge/graph-memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'ProcessOrder',
        options: { project: 'remem', displayType: 'inventory', connectionTypes: ['calls'], limit: 8, neighborLimit: 8 },
      }),
    });
    expect(knowledgeGraphMemory.status).toBe(200);
    const knowledgeGraphMemoryJson = await readJson(knowledgeGraphMemory) as {
      name: string;
      displayType: string;
      connections: Array<{ type: string }>;
      inventory?: { owners: Array<{ owner: string }> };
    };
    expect(knowledgeGraphMemoryJson.name).toBe('Codebase Graph as memory');
    expect(knowledgeGraphMemoryJson.displayType).toBe('inventory');
    expect(knowledgeGraphMemoryJson.connections.every((item) => item.type === 'knowledge:calls')).toBe(true);
    expect(knowledgeGraphMemoryJson.inventory?.owners.some((item) => item.owner === 'src')).toBe(true);

    const knowledgeExplain = await fetch('http://127.0.0.1:18913/knowledge/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'ProcessOrder',
        options: { project: 'remem', connectionTypes: ['calls'], limit: 8, neighborLimit: 8 },
      }),
    });
    expect(knowledgeExplain.status).toBe(200);
    const knowledgeExplainJson = await readJson(knowledgeExplain) as {
      summary: string;
      context: string;
    };
    expect(knowledgeExplainJson.summary).toContain('ProcessOrder');
    expect(knowledgeExplainJson.context).toContain('ProcessOrder');

    const knowledgeEntrypoints = await fetch('http://127.0.0.1:18913/knowledge/entrypoints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project: 'remem', limit: 5 }),
    });
    expect(knowledgeEntrypoints.status).toBe(200);
    const knowledgeEntrypointsJson = await readJson(knowledgeEntrypoints) as {
      entrypoints: unknown[];
    };
    expect(Array.isArray(knowledgeEntrypointsJson.entrypoints)).toBe(true);
    expect(knowledgeEntrypointsJson.entrypoints.length).toBeGreaterThanOrEqual(1);

    const knowledgeOwners = await fetch('http://127.0.0.1:18913/knowledge/owners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project: 'remem', limit: 5 }),
    });
    expect(knowledgeOwners.status).toBe(200);
    const knowledgeOwnersJson = await readJson(knowledgeOwners) as {
      owners: Array<{ owner: string }>;
    };
    expect(Array.isArray(knowledgeOwnersJson.owners)).toBe(true);
    expect(knowledgeOwnersJson.owners.some((item) => item.owner === 'src')).toBe(true);

    const knowledgeHotspots = await fetch('http://127.0.0.1:18913/knowledge/hotspots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project: 'remem', limit: 5 }),
    });
    expect(knowledgeHotspots.status).toBe(200);
    const knowledgeHotspotsJson = await readJson(knowledgeHotspots) as {
      hotspots: unknown[];
    };
    expect(Array.isArray(knowledgeHotspotsJson.hotspots)).toBe(true);
    expect(knowledgeHotspotsJson.hotspots.length).toBeGreaterThanOrEqual(1);

    const knowledgeDeadzones = await fetch('http://127.0.0.1:18913/knowledge/deadzones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project: 'remem', limit: 5 }),
    });
    expect(knowledgeDeadzones.status).toBe(200);
    const knowledgeDeadzonesJson = await readJson(knowledgeDeadzones) as {
      deadzones: unknown[];
    };
    expect(Array.isArray(knowledgeDeadzonesJson.deadzones)).toBe(true);

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
