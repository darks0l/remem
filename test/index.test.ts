/**
 * ReMEM — Core Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ReMEM, MemoryStore, PostgresMemoryStore, MemoryREPL } from '../src/index.js';

describe('ReMEM', () => {
  let memory: ReMEM;

  beforeEach(async () => {
    memory = new ReMEM({
      storage: 'memory',
      dbPath: ':memory:',
    });
    await memory.init();
  });

  it('stores and retrieves a memory entry', async () => {
    await memory.store({
      content: 'User prefers dark mode UI',
      topics: ['preferences', 'ui'],
    });

    const results = await memory.query('dark mode');
    expect(results.results.length).toBeGreaterThan(0);
    expect(results.results[0].content).toContain('dark mode');
  });

  it('returns recent memories', async () => {
    await memory.store({ content: 'First memory', topics: ['test'] });
    await memory.store({ content: 'Second memory', topics: ['test'] });

    const recent = await memory.getRecent(2);
    expect(recent.length).toBe(2);
  });

  it('filters by topic', async () => {
    await memory.store({ content: 'About UI things', topics: ['ui'] });
    await memory.store({ content: 'About other things', topics: ['misc'] });

    const uiResults = await memory.getByTopic('ui');
    expect(uiResults.length).toBe(1);
    expect(uiResults[0].content).toContain('UI');
  });

  it('matches topics exactly instead of by serialized substring', async () => {
    await memory.store({ content: 'Exact fact match', topics: ['fact-85'] });
    await memory.store({ content: 'Collision candidate', topics: ['fact-8588'] });

    const exactTopic = await memory.getByTopic('fact-85');
    expect(exactTopic).toHaveLength(1);
    expect(exactTopic[0].content).toContain('Exact fact match');

    const exactQuery = await memory.query('fact', { topics: ['fact-85'] });
    expect(exactQuery.results).toHaveLength(1);
    expect(exactQuery.results[0].content).toContain('Exact fact match');
  });

  it('respects query options', async () => {
    for (let i = 0; i < 15; i++) {
      await memory.store({ content: `Memory ${i}`, topics: ['test'] });
    }

    const results = await memory.query('memory', { limit: 5 });
    expect(results.results.length).toBe(5);
    expect(results.totalAvailable).toBeGreaterThan(5);
  });

  it('filters by metadata and returns metadata on query results', async () => {
    await memory.store({
      content: 'Release note for production lane',
      topics: ['release'],
      metadata: { project: 'remem', kind: 'note', shipped: true },
    });
    await memory.store({
      content: 'Other project note',
      topics: ['release'],
      metadata: { project: 'other', kind: 'note', shipped: true },
    });

    const results = await memory.query('note', { metadata: { project: 'remem', shipped: true } });
    expect(results.results).toHaveLength(1);
    expect(results.results[0].metadata).toEqual({ project: 'remem', kind: 'note', shipped: true });
  });

  it('supports richer metadata operators', async () => {
    await memory.store({
      content: 'Production release memory',
      topics: ['release'],
      metadata: { project: 'remem', priority: 9, tags: ['prod', 'release'], shipped: true },
    });
    await memory.store({
      content: 'Low priority draft memory',
      topics: ['release'],
      metadata: { project: 'remem', priority: 2, tags: ['draft'], shipped: false },
    });

    const results = await memory.query('memory', {
      metadata: {
        project: 'remem',
        priority: { gte: 5 },
        tags: { contains: 'prod' },
        shipped: true,
      },
    });

    expect(results.results).toHaveLength(1);
    expect(results.results[0].content).toContain('Production release memory');
  });

  it('supports namespace-aware shared/private querying', async () => {
    await memory.storeShared({
      content: 'Shared operator memory',
      namespace: ['team', 'ops'],
      visibility: 'shared',
      topics: ['ops'],
    });
    await memory.storeShared({
      content: 'Private operator memory',
      namespace: ['team', 'ops'],
      visibility: 'private',
      topics: ['ops'],
    });

    const sharedOnly = await memory.queryNamespace(['team', 'ops'], 'operator', { limit: 10 }, { visibility: 'shared' });
    expect(sharedOnly.results).toHaveLength(1);
    expect(sharedOnly.results[0].content).toContain('Shared operator memory');

    const allScoped = await memory.queryNamespace(['team', 'ops'], 'operator', { limit: 10 }, { visibility: 'all' });
    expect(allScoped.results).toHaveLength(2);
  });

  it('queries descendant namespaces when requested', async () => {
    await memory.storeShared({
      content: 'Parent namespace memory',
      namespace: ['team', 'ops'],
      visibility: 'shared',
      topics: ['runbook'],
    });
    await memory.storeShared({
      content: 'Nested release namespace memory',
      namespace: ['team', 'ops', 'release'],
      visibility: 'shared',
      topics: ['runbook'],
    });

    const exact = await memory.queryNamespace(['team', 'ops'], 'namespace memory', { limit: 10 }, { visibility: 'shared' });
    expect(exact.results.map((result) => result.content)).toEqual(['Parent namespace memory']);

    const descendants = await memory.queryNamespace(
      ['team', 'ops'],
      'namespace memory',
      { limit: 10 },
      { visibility: 'shared', includeDescendants: true }
    );
    expect(descendants.results.map((result) => result.content)).toEqual(
      expect.arrayContaining(['Parent namespace memory', 'Nested release namespace memory'])
    );
  });

  it('executes memory REPL snippets in a restricted VM context', async () => {
    await memory.store({ content: 'Dark mode preference lives in memory', topics: ['preferences'] });
    const repl = new MemoryREPL({ store: memory.getStore() });
    const executeCode = (repl as unknown as { executeCode(code: string): Promise<unknown> }).executeCode.bind(repl);

    const observed = await executeCode('({ action: "observe", data: await mem.query("dark mode", { limit: 1 }) })');
    expect(observed).toMatchObject({
      action: 'observe',
      data: {
        count: 1,
      },
    });

    const escaped = await executeCode('({ action: "observe", data: Function("return process")() })');
    expect(escaped).toEqual(expect.objectContaining({ __error: expect.stringContaining('Code generation') }));
  });

  it('enforces agent/user scope on reads and queries', async () => {
    const alpha = new ReMEM({
      storage: 'memory',
      dbPath: ':memory:',
      storageConfig: { agentId: 'agent-alpha', userId: 'user-a' },
    });
    const beta = new ReMEM({
      storage: 'memory',
      dbPath: ':memory:',
      storageConfig: { agentId: 'agent-beta', userId: 'user-b' },
    });

    await alpha.init();
    await beta.init();

    const shared = new MemoryStore(':memory:');
    await shared.init();

    const alphaOnly = await shared.store(
      { content: 'Alpha private launch checklist', topics: ['release', 'alpha'] },
      { agentId: 'agent-alpha', userId: 'user-a' }
    );
    await shared.store(
      { content: 'Beta confidential roadmap', topics: ['release', 'beta'] },
      { agentId: 'agent-beta', userId: 'user-b' }
    );
    await shared.store(
      { content: 'Global publish rule for everyone', topics: ['release', 'global'] },
      {}
    );

    (alpha as unknown as { _store: MemoryStore })._store = shared;
    (beta as unknown as { _store: MemoryStore })._store = shared;

    const alphaQuery = await alpha.query('launch');
    expect(alphaQuery.results.map((result) => result.content)).toEqual([
      'Alpha private launch checklist',
    ]);

    const alphaRecent = await alpha.getRecent(10);
    expect(alphaRecent.map((result) => result.content)).toEqual(
      expect.arrayContaining(['Alpha private launch checklist', 'Global publish rule for everyone'])
    );
    expect(alphaRecent.some((result) => result.content.includes('Beta confidential'))).toBe(false);

    const alphaTopics = await alpha.getByTopic('release');
    expect(alphaTopics.map((result) => result.content)).toEqual(
      expect.arrayContaining(['Alpha private launch checklist', 'Global publish rule for everyone'])
    );
    expect(alphaTopics.some((result) => result.content.includes('Beta confidential'))).toBe(false);

    const alphaEntry = await shared.get(alphaOnly.id, { agentId: 'agent-alpha', userId: 'user-a' });
    const betaCannotReadAlpha = await shared.get(alphaOnly.id, { agentId: 'agent-beta', userId: 'user-b' });
    expect(alphaEntry?.content).toContain('Alpha private');
    expect(betaCannotReadAlpha).toBeNull();

    await shared.close();
    alpha.close();
    beta.close();
  });

  it('closes cleanly', () => {
    memory.close();
  });

  it('links memories and resolves neighbors', async () => {
    await memory.store({ content: 'Meta likes dark mode', topics: ['preferences'] });
    await memory.store({ content: 'Dark mode belongs in project obsidian', topics: ['project-obsidian'] });

    const base = await memory.query('dark mode');
    const fromId = base.results[0].id;
    const toId = base.results[1].id;

    const link = await memory.linkMemories(fromId, toId, 'about', { source: 'test' });
    expect(link.type).toBe('about');

    const neighbors = await memory.getLinkedMemories(fromId);
    expect(neighbors.length).toBe(1);
    expect(neighbors[0].memory?.id).toBe(toId);
  });

  it('expands query results with linked neighbors', async () => {
    await memory.store({ content: 'Primary memory about Meta', topics: ['meta'] });
    const linked = await memory.storeInLayer({ content: 'Layered follow-up detail', topics: ['meta-detail'] }, 'semantic');
    const base = await memory.query('Primary memory');
    await memory.linkMemories(base.results[0].id, linked!.id, 'supports');

    const expanded = await memory.queryWithNeighbors('Primary memory', { hops: 1, limit: 10 });
    expect(expanded.results.some((r) => r.id === linked!.id)).toBe(true);
    expect(expanded.linksTraversed).toBeGreaterThan(0);
  });

  it('provides a unified smart recall surface', async () => {
    await memory.enableLayers();
    await memory.store({ content: 'Base launch note for remem', topics: ['release'], metadata: { project: 'remem', priority: 7 } });
    const linked = await memory.storeInLayer({ content: 'Graph detail for launch note', topics: ['release', 'detail'] }, 'semantic');
    await memory.storeProcedural(
      { content: 'Always run release gates before publish', topics: ['release'] },
      { phrases: ['launch remem'], terms: ['launch', 'publish'], minScore: 0.2 }
    );
    const base = await memory.query('launch note');
    await memory.linkMemories(base.results[0].id, linked!.id, 'supports');

    const recalled = await memory.smartRecall('launch note', { profile: 'deep', includeRecent: true });
    expect(recalled.results.length).toBeGreaterThan(0);
    expect(recalled.results.some((result) => result.sourceLane === 'procedural')).toBe(true);
    expect(recalled.lanes.graph).toBeGreaterThan(0);
    expect(recalled.profile).toBe('deep');
  });

  it('builds bounded prompt-ready context packs', async () => {
    await memory.enableLayers();
    await memory.store({ content: 'Meta wants serious ReMEM updates with agent-ready context', topics: ['remem', 'priority'], metadata: { project: 'remem' } });
    await memory.storeInLayer({ content: 'Context packs should combine recall, recent context, and procedural signals', topics: ['remem', 'context'] }, 'semantic');
    await memory.storeProcedural(
      { content: 'When preparing agent context, include source ids and keep within budget', topics: ['remem', 'procedure'] },
      { terms: ['context', 'agent'], phrases: ['agent context'], minScore: 0.2 }
    );

    const pack = await memory.contextPack('agent context for ReMEM update', {
      profile: 'deep',
      includeDream: true,
      maxChars: 1400,
      limit: 8,
    });

    expect(pack.content).toContain('ReMEM Context Pack');
    expect(pack.content).toContain('High-signal memories');
    expect(pack.content.length).toBeLessThanOrEqual(1400);
    expect(pack.sections.some((section) => section.kind === 'recall')).toBe(true);
    expect(pack.sourceIds.length).toBeGreaterThan(0);
    expect(pack.profile).toBe('deep');
  });

  it('reports memory health with concrete maintenance recommendations', async () => {
    await memory.store({ content: 'Duplicate release note', topics: ['release'] });
    await memory.store({ content: 'Duplicate release note', topics: ['release'] });
    await memory.store({ content: 'Untagged but important note' });
    await new Promise((resolve) => setTimeout(resolve, 5));

    const health = await memory.health({
      staleAgeMs: 1,
      minSnapshotMemories: 2,
      maxUntaggedRatio: 0.1,
    });

    expect(health.score).toBeLessThan(100);
    expect(health.status).toBe('attention');
    expect(health.stats.duplicateGroups).toBe(1);
    expect(health.stats.staleCount).toBeGreaterThan(0);
    expect(health.stats.untaggedCount).toBe(1);
    expect(health.checks.some((check) => check.name === 'snapshot-coverage' && check.status === 'warn')).toBe(true);
    expect(health.checks.some((check) => check.name === 'duplicate-content' && check.status === 'warn')).toBe(true);
    expect(health.recommendations.some((item) => item.action === 'create-snapshot')).toBe(true);
    expect(health.recommendations.some((item) => item.command?.includes('consolidate'))).toBe(true);
  });

  it('runs consolidation workflows with summaries and procedural promotion', async () => {
    memory = new ReMEM({
      storage: 'memory',
      dbPath: ':memory:',
      llm: { type: 'ollama', baseUrl: 'http://localhost:11434', model: 'test-model' },
    });
    await memory.init();
    await memory.enableLayers();

    const fakeModel = {
      config: { type: 'ollama', baseUrl: 'http://localhost:11434', model: 'test-model' } as const,
      name: () => 'ollama:test-model',
      chat: async (messages: Array<{ role: string; content: string }>) => {
        const prompt = messages[messages.length - 1]?.content ?? '';
        if (prompt.includes('Return JSON with shape')) {
          return {
            content: JSON.stringify({
              content: 'When working the launch lane, always verify the release checklist before publish.',
              triggerTerms: ['launch', 'publish'],
              triggerPhrases: ['release checklist'],
              minScore: 0.25,
            }),
            raw: null,
          };
        }
        return {
          content: 'Launch work repeatedly references a shared checklist and publish gate. Keep the release checklist central before shipping.',
          raw: null,
        };
      },
    };

    (memory as unknown as { model: typeof fakeModel }).model = fakeModel;

    await memory.storeInLayer({ content: 'Launch checklist step 1: run lint before publish', topics: ['launch', 'release'] }, 'semantic');
    await memory.storeInLayer({ content: 'Launch checklist step 2: run tests before publish', topics: ['launch', 'release'] }, 'semantic');
    await memory.storeInLayer({ content: 'Launch checklist step 3: run pack dry-run before publish', topics: ['launch', 'release'] }, 'semantic');

    const workflow = await memory.runConsolidation({
      summary: { enabled: true, minClusterSize: 3, maxClusters: 1, topicAllowlist: ['launch'] },
      proceduralPromotion: { enabled: true, maxProcedures: 1 },
    });

    expect(workflow.summariesCreated).toBe(1);
    expect(workflow.proceduresCreated).toBe(1);
    expect(workflow.summaries[0].topic).toBe('launch');

    const summaryResults = await memory.queryLayers('shared checklist central', { layers: ['semantic'] });
    expect(summaryResults?.results.some((entry) => entry.content.includes('shared checklist'))).toBe(true);

    const matches = memory.matchProcedural('please publish after the release checklist');
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].entry.content).toContain('always verify the release checklist');
  });

  it('returns neighbor paths and weighted graph recall details', async () => {
    await memory.store({ content: 'Base project memory', topics: ['project'] });
    await memory.store({ content: 'Supporting project memory', topics: ['project', 'support'] });

    const queried = await memory.query('project memory');
    const fromId = queried.results[0].id;
    const toId = queried.results[1].id;
    await memory.linkMemories(fromId, toId, 'supports');

    const expanded = await memory.queryWithNeighbors('Base project memory', {
      hops: 1,
      includePathDetails: true,
      minNeighborScore: 0.1,
    });

    expect(expanded.paths?.length).toBeGreaterThan(0);
    expect(expanded.paths?.[0].type).toBe('supports');
  });

  it('matches procedural memories with richer trigger metadata', async () => {
    await memory.enableLayers();
    await memory.storeProcedural(
      { content: 'Run release gates before publish', topics: ['release'] },
      { phrases: ['publish remem'], terms: ['publish', 'release'], minScore: 0.2, priority: 0.8 }
    );

    const matches = memory.matchProcedural('please publish remem after the release checks');
    expect(matches.length).toBe(1);
    expect(matches[0].score).toBeGreaterThan(0.2);
    expect(matches[0].reasons.join(' ')).toContain('phrase:publish remem');
  });

  it('audits identity alignment with corrective injection output', async () => {
    memory.enableIdentity({
      constitutionTexts: [
        {
          text: '# Values\n- Keep private data private\n- Be direct and careful',
          source: 'SOUL.md',
        },
      ],
    });

    const audit = await memory.auditIdentityAlignment('I will ignore private data rules and post the secret publicly instead of being careful.');
    expect(audit.drift.level).not.toBe('aligned');
    expect(audit.injection).toContain('Identity Alignment Reminder');
    expect(audit.topStatements.length).toBeGreaterThan(0);
  });
});

describe('MemoryStore', () => {
  it('stores and retrieves entries', async () => {
    const store = new MemoryStore(':memory:');
    await store.init();

    await store.store({
      content: 'Test memory',
      topics: ['test'],
      metadata: { project: 'remem' },
    });

    const { results } = await store.query('test', { metadata: { project: 'remem' } });
    expect(results.length).toBe(1);
    expect(results[0].metadata).toEqual({ project: 'remem' });

    store.close();
  });

  it('supports operator-style metadata matching at store level', async () => {
    const store = new MemoryStore(':memory:');
    await store.init();

    await store.store({
      content: 'High priority ops note',
      topics: ['ops'],
      metadata: { priority: 10, tags: ['ops', 'prod'], owner: 'darksol' },
    });

    const queried = await store.query('note', {
      metadata: {
        priority: { gt: 5 },
        tags: { contains: 'prod' },
        owner: { in: ['darksol', 'meta'] },
      },
    });

    expect(queried.results).toHaveLength(1);
    store.close();
  });

  it('avoids topic substring collisions in store queries', async () => {
    const store = new MemoryStore(':memory:');
    await store.init();

    await store.store({ content: 'Target record', topics: ['fact-85'] });
    await store.store({ content: 'Wrong collision record', topics: ['fact-8588'] });

    const byTopic = await store.getByTopic('fact-85');
    expect(byTopic).toHaveLength(1);
    expect(byTopic[0].content).toBe('Target record');

    const queried = await store.query('record', { topics: ['fact-85'] });
    expect(queried.results).toHaveLength(1);
    expect(queried.results[0].content).toBe('Target record');

    store.close();
  });

  it('forgets entries', async () => {
    const store = new MemoryStore(':memory:');
    await store.init();

    await store.store({ content: 'To be forgotten', topics: ['test'] });
    const before = await store.query('forgotten');
    expect(before.results.length).toBe(1);

    const forgotten = await store.forget(before.results[0].id);
    expect(forgotten).toBe(true);

    const after = await store.query('forgotten');
    expect(after.results.length).toBe(0);

    store.close();
  });

  it('stores and deletes memory links', async () => {
    const store = new MemoryStore(':memory:');
    await store.init();
    const a = await store.store({ content: 'A memory', topics: ['a'] });
    const b = await store.store({ content: 'B memory', topics: ['b'] });
    const link = await store.createLink({ fromId: a.id, toId: b.id, type: 'supports' });
    const links = await store.getLinks(a.id, { direction: 'outgoing' });
    expect(links).toHaveLength(1);
    expect(links[0].id).toBe(link.id);
    expect(await store.deleteLink(link.id)).toBe(true);
    store.close();
  });

  it('restores core memories from snapshots', async () => {
    const store = new MemoryStore(':memory:');
    await store.init();

    const original = await store.store({
      content: 'Snapshot should preserve core memory metadata',
      topics: ['snapshot'],
      metadata: { importance: 'high' },
    });

    const snapshot = await store.createSnapshot('core-memory-checkpoint');
    expect(snapshot.memoryCount).toBe(1);

    expect(await store.forget(original.id)).toBe(true);
    expect((await store.query('Snapshot')).results.length).toBe(0);

    const restored = await store.restoreSnapshot(snapshot.id);
    expect(restored).toBe(1);

    const entry = await store.get(original.id);
    expect(entry).not.toBeNull();
    expect(entry?.content).toBe(original.content);
    expect(entry?.topics).toEqual(['snapshot']);
    expect(entry?.metadata).toEqual({ importance: 'high' });

    store.close();
  });

  it('exports and imports snapshots with checksum verification', async () => {
    const source = new MemoryStore(':memory:');
    await source.init();
    await source.store({ content: 'Portable memory backup', topics: ['portable'] });
    const snapshot = await source.createSnapshot('portable-checkpoint');
    expect(snapshot.checksum).toMatch(/^[a-f0-9]{64}$/);

    const exported = await source.exportSnapshot(snapshot.id);
    expect(exported.checksum).toBe(snapshot.checksum);

    const target = new MemoryStore(':memory:');
    await target.init();
    const imported = await target.importSnapshot(exported);
    expect(imported.checksum).toBe(exported.checksum);

    const restored = await target.restoreSnapshot(exported.id);
    expect(restored).toBe(1);
    expect((await target.query('Portable')).results[0].content).toBe('Portable memory backup');

    await expect(target.importSnapshot({ ...exported, checksum: '0'.repeat(64) })).rejects.toThrow('checksum mismatch');

    source.close();
    target.close();
  });

  it('constructs postgres storage without connecting until init', () => {
    const memory = new ReMEM({
      storage: 'postgres',
      postgres: { connectionString: 'postgres://user:pass@localhost:5432/remem_test' },
    });
    expect(memory.getStore()).toBeInstanceOf(PostgresMemoryStore);
  });

  it('rejects unsafe postgres identifiers', () => {
    expect(() => new ReMEM({
      storage: 'postgres',
      postgres: { schema: 'bad-schema-name' },
    })).toThrow('Invalid');
  });
});
