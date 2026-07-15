# ReMEM Hermes Quickstart

Use this when a Hermes-style harness needs durable thread/run memory, artifacts, and shared team lanes.

This is the clean path from `remem init` to a harness lane that remembers turns, rollout artifacts, and reusable team context.

## 1. Generate starter files

```bash
remem init --runtime hermes --db ./data/remem.db --out-dir ./.remem --check --json
```

The generated config is immediately validated, and `--check` runs doctor diagnostics against the selected runtime settings.

## 2. Wire the adapter

```typescript
import { ReMEM, createHermesAdapter } from '@darksol/remem';

const memory = new ReMEM({ dbPath: './data/remem.db' });
await memory.init();
await memory.enableLayers();

const hermes = createHermesAdapter(memory);
```

## 3. Store thread/run memory, decisions, and artifacts together

```typescript
await hermes.rememberTurn({
  role: 'user',
  content: 'The rollout lane should keep artifacts and release decisions together.',
  threadId: 'release-thread',
  runId: 'run-42',
  metadata: {
    project: 'remem',
    workflow: 'release',
  },
});

await hermes.rememberArtifact({
  kind: 'release-plan',
  content: 'v0.13.0 focuses on doctor, setup validation, quickstarts, and benchmark cache support.',
  threadId: 'release-thread',
  runId: 'run-42',
  topics: ['release', 'roadmap'],
  metadata: {
    project: 'remem',
    workflow: 'release',
  },
});

await hermes.rememberDecision({
  content: 'Hermes rollout memory should preserve thread, run, and artifact context together.',
  threadId: 'release-thread',
  runId: 'run-42',
  topics: ['release'],
  metadata: {
    project: 'remem',
    workflow: 'release',
  },
});

await hermes.rememberProcedure({
  content: 'Before shipping a Hermes release lane, verify thread memory, artifacts, and shared namespace recall.',
  trigger: {
    phrases: ['ship hermes release'],
    terms: ['ship', 'hermes', 'release'],
    minScore: 0.2,
    priority: 0.8,
  },
  topics: ['release', 'ops'],
  metadata: {
    project: 'remem',
    workflow: 'release',
  },
});
```

This keeps the current run anchored in normal memory while preserving the higher-signal decision in the semantic layer and the procedure in procedural memory.

## 4. Use shared namespaces for team and project recall lanes

```typescript
await hermes.rememberShared({
  namespace: ['team', 'remem', 'hermes'],
  content: 'Hermes release memory should preserve thread, run, and artifact context.',
  visibility: 'shared',
  topics: ['hermes', 'release'],
  metadata: {
    project: 'remem',
    audience: 'team',
  },
});

await hermes.rememberShared({
  namespace: ['team', 'remem', 'release'],
  content: 'Release lanes must validate config, doctor, smoke-check, and pack dry-run before publish.',
  visibility: 'shared',
  topics: ['release', 'ops'],
  metadata: {
    project: 'remem',
    audience: 'team',
  },
});

const hermesLane = await hermes.recallShared(['team', 'remem', 'hermes'], 'release memory', {
  limit: 6,
});

const releaseLane = await hermes.recallShared(
  ['team', 'remem', 'release'],
  'publish checklist',
  { limit: 6 },
  { visibility: 'shared' }
);

const allReleaseLane = await memory.queryNamespace(
  ['team', 'remem', 'release'],
  'release',
  { limit: 8 },
  { visibility: 'all', includeDescendants: true }
);
```

Use shared namespaces for knowledge that should be intentionally reusable across runs. Keep private or user-specific memory scoped by agent/user settings and metadata. Use nested paths like `team/remem/release` when a harness needs both broad team recall and narrower workflow lanes.

## 5. Check runtime health and starter artifacts

```bash
remem doctor --db ./data/remem.db --json
remem validate-config --config ./.remem/remem.config.json --json
remem smoke-check --db ./data/remem.db --json
```

`doctor` reports package/runtime/config/storage/snapshot checks plus optional embedding and LLM endpoint probes. `smoke-check` is the lighter gate when a harness bootstrap only needs to verify the storage/runtime lane before first use.
