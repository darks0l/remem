/**
 * ReMEM — HTTP adapter tests
 */

import { afterEach, describe, expect, it } from 'vitest';
import { HttpAdapter, MemoryStore } from '../src/index.js';

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
});
