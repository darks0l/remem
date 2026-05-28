/**
 * ReMEM — Core Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ReMEM, MemoryStore, PostgresMemoryStore } from '../src/index.js';

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
