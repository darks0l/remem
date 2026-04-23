/**
 * ReMEM — Core Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ReMEM, MemoryStore } from '../src/index.js';

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

  it('closes cleanly', () => {
    memory.close();
  });
});

describe('MemoryStore', () => {
  it('stores and retrieves entries', async () => {
    const store = new MemoryStore(':memory:');
    await store.init();

    await store.store({
      content: 'Test memory',
      topics: ['test'],
    });

    const { results } = await store.query('test');
    expect(results.length).toBe(1);

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
});
