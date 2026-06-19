# ReMEM Hermes Quickstart

Use this when a Hermes-style harness needs durable thread/run memory, artifacts, and shared team lanes.

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

## 3. Store thread/run memory

```typescript
await hermes.rememberTurn({
  role: 'user',
  content: 'The rollout lane should keep artifacts and release decisions together.',
  threadId: 'release-thread',
  runId: 'run-42',
});

await hermes.rememberArtifact({
  kind: 'release-plan',
  content: 'v0.13.0 focuses on doctor, setup validation, quickstarts, and benchmark cache support.',
  threadId: 'release-thread',
  runId: 'run-42',
  topics: ['release', 'roadmap'],
});
```

## 4. Use shared namespaces

```typescript
await hermes.rememberShared({
  namespace: ['team', 'hermes'],
  content: 'Hermes release memory should preserve thread, run, and artifact context.',
  visibility: 'shared',
  topics: ['hermes', 'release'],
});

const shared = await hermes.recallShared(['team', 'hermes'], 'release memory', {
  limit: 6,
});
```

Use shared namespaces for knowledge that should be intentionally reusable across runs. Keep private or user-specific memory scoped by agent/user settings and metadata.

## 5. Check runtime health

```bash
remem doctor --db ./data/remem.db --json
remem validate-config --config ./.remem/remem.config.json --json
```

`doctor` reports package/runtime/config/storage/snapshot checks plus optional embedding and LLM endpoint probes.
