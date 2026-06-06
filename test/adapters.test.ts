/**
 * ReMEM — framework adapter tests
 */

import { describe, expect, it } from 'vitest';
import {
  ReMEM,
  createHermesAdapter,
  createLangGraphStoreAdapter,
  createOpenClawAdapter,
  createVercelAIAdapter,
} from '../src/index.js';

async function createMemory() {
  const memory = new ReMEM({ storage: 'memory', dbPath: ':memory:' });
  await memory.init();
  return memory;
}

describe('framework adapters', () => {
  it('Vercel AI adapter stores messages and returns context', async () => {
    const memory = await createMemory();
    const adapter = createVercelAIAdapter(memory);

    await adapter.saveMessages([
      { role: 'user', content: 'I prefer local-first memory systems' },
      { role: 'assistant', content: 'Got it.' },
    ]);

    const context = await adapter.context('local-first');
    expect(context).toContain('local-first');
    memory.close();
  });

  it('LangGraph store adapter supports put/search/get/listNamespaces', async () => {
    const memory = await createMemory();
    const adapter = createLangGraphStoreAdapter(memory);

    await adapter.put(['users', 'meta'], 'preference', { theme: 'dark mode' });

    const results = await adapter.search(['users', 'meta'], 'dark mode');
    expect(results.length).toBeGreaterThan(0);
    expect(String(results[0].value)).toContain('dark mode');

    const namespaces = await adapter.listNamespaces();
    expect(namespaces.some((ns) => ns.join('/') === 'users/meta')).toBe(true);

    const found = await adapter.get(['users', 'meta'], 'dark mode');
    expect(found?.value).toContain('dark mode');
    memory.close();
  });

  it('LangGraph store adapter respects shared/private namespace visibility', async () => {
    const memory = await createMemory();
    const adapter = createLangGraphStoreAdapter(memory);

    await adapter.put(['team', 'shared'], 'public-note', { text: 'shared launch note' }, { visibility: 'shared' });
    await adapter.put(['team', 'private'], 'private-note', { text: 'private launch note' }, { visibility: 'private' });

    const sharedResults = await adapter.search(['team', 'shared'], 'launch', { limit: 5 }, { visibility: 'shared' });
    expect(sharedResults.length).toBeGreaterThan(0);
    expect(String(sharedResults[0].value)).toContain('shared launch note');

    const hiddenPrivate = await adapter.search(['team', 'private'], 'launch', { limit: 5 }, { visibility: 'shared' });
    expect(hiddenPrivate).toHaveLength(0);

    const sharedNamespaces = await adapter.listNamespaces({ visibility: 'shared' });
    expect(sharedNamespaces.some((ns) => ns.join('/') === 'team/shared')).toBe(true);
    expect(sharedNamespaces.some((ns) => ns.join('/') === 'team/private')).toBe(false);

    memory.close();
  });

  it('OpenClaw adapter remembers turns and recalls context', async () => {
    const memory = await createMemory();
    const adapter = createOpenClawAdapter(memory);

    await adapter.rememberTurn({
      role: 'user',
      content: 'Ship v0.6.1 after adapters pass tests',
      sessionId: 'general',
    });

    const context = await adapter.recallContext('Ship v0.6.1 after adapters pass tests');
    expect(context).toContain('Ship v0.6.1');
    expect(context).toContain('[openclaw.turn]');
    memory.close();
  });

  it('OpenClaw adapter remembers decisions and procedures', async () => {
    const memory = await createMemory();
    await memory.enableLayers();
    const adapter = createOpenClawAdapter(memory);

    await adapter.rememberDecision({
      content: 'Always run lint, tests, build, and pack before publish.',
      sessionId: 'release-lane',
      topics: ['release'],
    });

    await adapter.rememberProcedure({
      content: 'When publishing, verify release gates before tagging.',
      trigger: { phrases: ['publish remem'], terms: ['publish'], minScore: 0.2 },
      topics: ['release'],
    });

    const projectContext = await adapter.recallProjectContext('publish', { limit: 5, hops: 1 });
    expect(projectContext).toContain('publish');

    const procedural = memory.matchProcedural('please publish remem after checks');
    expect(procedural.length).toBeGreaterThan(0);
    expect(procedural[0].entry.content).toContain('release gates');
    memory.close();
  });

  it('Hermes adapter remembers turns, artifacts, decisions, procedures, and shared namespace context', async () => {
    const memory = await createMemory();
    await memory.enableLayers();
    const adapter = createHermesAdapter(memory);

    await adapter.rememberTurn({
      role: 'user',
      content: 'Ship the harness adapter after tests pass',
      threadId: 'hermes-general',
      runId: 'run-1',
    });

    await adapter.rememberArtifact({
      kind: 'plan',
      content: 'Hermes adapter rollout plan',
      threadId: 'hermes-general',
      topics: ['release'],
    });

    await adapter.rememberDecision({
      content: 'Hermes needs first-class harness parity with OpenClaw.',
      threadId: 'hermes-general',
      runId: 'run-1',
      topics: ['release'],
    });

    await adapter.rememberProcedure({
      content: 'Before shipping Hermes integrations, verify harness-facing memory flows.',
      trigger: { phrases: ['ship hermes'], terms: ['hermes', 'ship'], minScore: 0.2 },
      topics: ['release'],
    });

    await adapter.rememberShared({
      namespace: ['team', 'hermes'],
      content: 'Shared Hermes rollout note',
      visibility: 'shared',
      topics: ['release'],
    });

    const context = await adapter.recallContext('harness adapter');
    expect(context).toContain('Ship the harness adapter');
    expect(context).toContain('[hermes.turn]');

    const sharedContext = await adapter.recallShared(['team', 'hermes'], 'rollout', { limit: 5 }, { visibility: 'shared' });
    expect(sharedContext).toContain('Shared Hermes rollout note');

    const procedural = memory.matchProcedural('please ship hermes after checks');
    expect(procedural.length).toBeGreaterThan(0);
    expect(procedural[0].entry.content).toContain('verify harness-facing memory flows');

    memory.close();
  });
});
