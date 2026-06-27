import { describe, expect, it } from 'vitest';
import { ReMEM, createCodebaseMemoryAdapter, type KnowledgeGraphArtifact } from '../src/index.js';

function graphFixture(): KnowledgeGraphArtifact {
  return {
    source: 'codebase-memory-mcp',
    project: 'checkout-service',
    artifactPath: '.codebase-memory/graph.json',
    nodes: [
      {
        id: 'fn:ProcessOrder',
        label: 'Function',
        name: 'ProcessOrder',
        path: 'src/orders.ts',
        language: 'typescript',
        summary: 'Coordinates order validation and payment capture.',
      },
      {
        id: 'fn:ChargeCard',
        label: 'Function',
        name: 'ChargeCard',
        path: 'src/payments.ts',
        language: 'typescript',
        summary: 'Captures a card payment through the payment gateway.',
      },
      {
        id: 'route:POST /orders',
        label: 'Route',
        name: 'POST /orders',
        path: 'src/routes.ts',
        summary: 'Creates an order.',
      },
    ],
    edges: [
      { from: 'route:POST /orders', to: 'fn:ProcessOrder', type: 'HTTP_CALLS' },
      { from: 'fn:ProcessOrder', to: 'fn:ChargeCard', type: 'CALLS' },
      { from: 'missing', to: 'fn:ChargeCard', type: 'CALLS' },
    ],
  };
}

describe('knowledge graph ingestion', () => {
  it('registers external graph artifacts without importing rows', async () => {
    const memory = new ReMEM({ storage: 'memory', dbPath: ':memory:' });
    await memory.init();

    const result = await memory.registerKnowledgeArtifact({
      source: 'codebase-memory-mcp',
      project: 'remem',
      artifactPath: '.codebase-memory/graph.db.zst',
      format: 'sqlite',
      compression: 'zstd',
      checksum: 'sha256:test',
    });

    expect(result).toMatchObject({
      source: 'codebase-memory-mcp',
      project: 'remem',
      artifactPath: '.codebase-memory/graph.db.zst',
    });

    const query = await memory.query('graph.db.zst', { limit: 1 });
    expect(query.results[0]?.metadata).toMatchObject({
      source: 'remem.knowledge.artifact',
      knowledgeSource: 'codebase-memory-mcp',
      format: 'sqlite',
      compression: 'zstd',
    });
  });

  it('stores graph nodes as memories and graph edges as traversable links', async () => {
    const memory = new ReMEM({ storage: 'memory', dbPath: ':memory:' });
    await memory.init();

    const result = await memory.ingestKnowledgeGraph(graphFixture());
    expect(result).toMatchObject({
      source: 'codebase-memory-mcp',
      project: 'checkout-service',
      nodesStored: 3,
      edgesLinked: 2,
      skippedEdges: 1,
    });

    const direct = await memory.query('ProcessOrder', { limit: 5 });
    expect(direct.results).toHaveLength(1);
    expect(direct.results[0].metadata).toMatchObject({
      source: 'remem.knowledge.node',
      externalId: 'fn:ProcessOrder',
      label: 'Function',
      namespace: 'knowledge/codebase-memory-mcp/checkout-service',
      visibility: 'shared',
    });

    const multiTerm = await memory.query('ProcessOrder knowledge graph', { limit: 5 });
    expect(multiTerm.results.map((entry) => entry.metadata?.name)).toContain('ProcessOrder');

    const withNeighbors = await memory.queryWithNeighbors('ProcessOrder', {
      limit: 5,
      hops: 1,
      includeBaseResults: true,
      includePathDetails: true,
    });

    expect(withNeighbors.linksTraversed).toBeGreaterThanOrEqual(1);
    expect(withNeighbors.results.map((entry) => entry.metadata?.name)).toContain('ChargeCard');
    expect(withNeighbors.paths?.some((path) => path.type === 'knowledge:calls')).toBe(true);
  });

  it('exposes a codebase-memory shaped adapter', async () => {
    const memory = new ReMEM({ storage: 'memory', dbPath: ':memory:' });
    await memory.init();
    const adapter = createCodebaseMemoryAdapter(memory);

    await adapter.ingestGraph(graphFixture());
    const search = await adapter.searchGraph('ChargeCard');
    expect(search.results[0]?.metadata?.name).toBe('ChargeCard');

    const impact = await adapter.impact('ProcessOrder');
    expect(impact.results.map((entry) => entry.metadata?.name)).toContain('ChargeCard');

    const scopedImpact = await adapter.impact('ProcessOrder', {
      project: 'checkout-service',
      limit: 2,
      neighborLimit: 2,
    });
    expect(scopedImpact.results.length).toBeGreaterThan(0);
    expect(scopedImpact.results.every((entry) => entry.metadata?.project === 'checkout-service')).toBe(true);
  });
});
