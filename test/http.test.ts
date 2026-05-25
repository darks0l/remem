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
      body: JSON.stringify({ content: 'HTTP remembers sharp teeth', topics: ['http'] }),
    });
    expect(created.status).toBe(201);

    const queried = await fetch('http://127.0.0.1:18911/memory?q=sharp&limit=5');
    expect(queried.status).toBe(200);
    const body = await readJson(queried) as { results: Array<{ content: string }> };
    expect(body.results[0].content).toContain('sharp teeth');

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
