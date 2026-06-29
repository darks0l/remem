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
        weight: 1.4,
        summary: 'Captures a card payment through the payment gateway.',
      },
      {
        id: 'route:POST /orders',
        label: 'Route',
        name: 'POST /orders',
        path: 'src/routes.ts',
        summary: 'Creates an order.',
      },
      {
        id: 'fn:UnusedCoupon',
        label: 'Function',
        name: 'UnusedCoupon',
        path: 'src/coupons.ts',
        language: 'typescript',
        weight: 1.6,
        summary: 'Unused coupon helper with no known graph edges.',
      },
    ],
    edges: [
      { from: 'route:POST /orders', to: 'fn:ProcessOrder', type: 'HTTP_CALLS' },
      { from: 'fn:ProcessOrder', to: 'fn:ChargeCard', type: 'CALLS', weight: 1.3 },
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
      nodesStored: 4,
      edgesLinked: 2,
      skippedEdges: 1,
    });

    const direct = await memory.query('ProcessOrder', { limit: 5 });
    expect(direct.results).toHaveLength(1);
    expect(direct.results[0].metadata).toMatchObject({
      source: 'remem.knowledge.node',
      externalId: 'fn:ProcessOrder',
      label: 'Function',
      graphWeight: 1.1,
      namespace: 'knowledge/codebase-memory-mcp/checkout-service',
      visibility: 'shared',
    });

    const weightedNode = await memory.query('ChargeCard', { limit: 1 });
    expect(weightedNode.results[0].metadata).toMatchObject({
      graphWeight: 1.4,
      nodeWeight: 1.4,
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
    expect(withNeighbors.paths?.find((path) => path.type === 'knowledge:calls')?.score).toBeGreaterThan(1);
  });

  it('exposes a codebase-memory shaped adapter', async () => {
    const memory = new ReMEM({ storage: 'memory', dbPath: ':memory:' });
    await memory.init();
    const adapter = createCodebaseMemoryAdapter(memory);

    await adapter.ingestGraph(graphFixture());
    expect(adapter.name).toBe('Codebase Graph as memory');
    expect(adapter.key).toBe('codebase-memory');

    const search = await adapter.searchGraph('ChargeCard');
    expect(search.results[0]?.metadata?.name).toBe('ChargeCard');

    const scopedMiss = await adapter.searchGraph('ChargeCard', { project: 'other-project', limit: 5 });
    expect(scopedMiss.results).toHaveLength(0);

    const impact = await adapter.impact('ProcessOrder');
    expect(impact.results.map((entry) => entry.metadata?.name)).toContain('ChargeCard');

    const scopedImpact = await adapter.impact('ProcessOrder', {
      project: 'checkout-service',
      limit: 2,
      neighborLimit: 2,
    });
    expect(scopedImpact.results.length).toBeGreaterThan(0);
    expect(scopedImpact.results.every((entry) => entry.metadata?.project === 'checkout-service')).toBe(true);

    const subgraph = await adapter.subgraph('ProcessOrder', { project: 'checkout-service', maxContextChars: 800 });
    expect(subgraph.linksTraversed).toBeGreaterThanOrEqual(1);
    expect(subgraph.context).toContain('ProcessOrder');

    const callsOnly = await adapter.asMemory('ProcessOrder', {
      project: 'checkout-service',
      displayType: 'graph',
      connectionTypes: ['calls'],
      limit: 5,
      neighborLimit: 5,
    });
    expect(callsOnly.name).toBe('Codebase Graph as memory');
    expect(callsOnly.displayType).toBe('graph');
    expect(callsOnly.summary).toContain('selected connections');
    expect(callsOnly.connections.length).toBeGreaterThanOrEqual(1);
    expect(callsOnly.connections.every((connection) => connection.type === 'knowledge:calls')).toBe(true);
    expect(callsOnly.nodes.map((entry) => entry.metadata?.name)).toContain('ChargeCard');

    const inventorySnapshot = await adapter.graphAsMemory('ProcessOrder', {
      project: 'checkout-service',
      displayType: 'inventory',
      includeConnections: ['http_calls', 'calls'],
      limit: 5,
      neighborLimit: 5,
    });
    expect(inventorySnapshot.inventory?.owners.some((owner) => owner.owner === 'src')).toBe(true);
    expect(inventorySnapshot.connections.every((connection) => ['knowledge:http_calls', 'knowledge:calls'].includes(connection.type))).toBe(true);

    const explanation = await adapter.explain('ProcessOrder', { project: 'checkout-service' });
    expect(explanation.summary).toContain('connects to');

    const owners = await adapter.owners({ project: 'checkout-service', limit: 5 });
    expect(owners.some((owner) => owner.owner === 'src')).toBe(true);

    const entrypoints = await adapter.entrypoints({ project: 'checkout-service', limit: 5 });
    expect(entrypoints.some((entry) => entry.node.metadata?.label === 'Route')).toBe(true);
    expect(entrypoints[0].weight).toBeGreaterThan(1);

    const deadzones = await adapter.deadzones({ project: 'checkout-service', limit: 5 });
    expect(deadzones.some((entry) => entry.node.metadata?.name === 'UnusedCoupon')).toBe(true);
    expect(deadzones[0].weight).toBe(1.6);

    const overview = await adapter.overview('checkout-service');
    expect(overview.labels.Function).toBe(3);
  });
});
