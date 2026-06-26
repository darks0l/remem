import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { MemoryStore, ReMEM, type LayeredMemoryEntry } from '../src/index.js';

function expiredLayerEntry(now: number): LayeredMemoryEntry {
  return {
    id: randomUUID(),
    content: 'Expired episodic scratch memory',
    topics: ['scratch'],
    metadata: {},
    createdAt: now - 10_000,
    accessedAt: now - 10_000,
    accessCount: 0,
    layer: 'episodic',
    expiresAt: now - 1,
    importance: 0.2,
  };
}

describe('storage maintenance', () => {
  it('dry-runs and applies expired/orphan storage pruning', async () => {
    const now = Date.now();
    const store = new MemoryStore(':memory:');
    await store.init();

    const kept = await store.store({ content: 'Live memory', topics: ['live'] });
    const expired = expiredLayerEntry(now);
    await store.persistLayerEntry(expired);
    await store.createLink({ fromId: randomUUID(), toId: kept.id, type: 'related' });
    await store.storeEmbedding(randomUUID(), 'AAAA', 1, 'test-model');

    const dryRun = await store.maintenance({ dryRun: true, now });
    expect(dryRun).toMatchObject({
      dryRun: true,
      expiredLayerEntries: 1,
      orphanLinks: 1,
      orphanEmbeddings: 1,
      compacted: false,
    });
    expect(await store.loadAllLayerEntries()).toHaveLength(1);
    expect(await store.getLinks(kept.id)).toHaveLength(1);

    const applied = await store.maintenance({ now, compact: true });
    expect(applied).toMatchObject({
      dryRun: false,
      expiredLayerEntries: 1,
      orphanLinks: 1,
      orphanEmbeddings: 1,
      compacted: true,
    });
    expect(await store.loadAllLayerEntries()).toHaveLength(0);
    expect(await store.getLinks(kept.id)).toHaveLength(0);
    expect(await store.maintenance({ dryRun: true, now })).toMatchObject({
      expiredLayerEntries: 0,
      orphanLinks: 0,
      orphanEmbeddings: 0,
    });
  });

  it('exposes storage maintenance through ReMEM with scope', async () => {
    const memory = new ReMEM({
      storage: 'memory',
      dbPath: ':memory:',
      storageConfig: { agentId: 'agent-maint', userId: 'user-maint' },
    });
    await memory.init();

    const result = await memory.storageMaintenance({ dryRun: true });
    expect(result.dryRun).toBe(true);
    expect(result.scoped).toEqual({ agentId: 'agent-maint', userId: 'user-maint' });
  });
});
