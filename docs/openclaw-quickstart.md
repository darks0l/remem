# ReMEM OpenClaw Quickstart

Use this when OpenClaw needs durable project/session memory without bloating every prompt.

## 1. Generate starter files

```bash
remem init --runtime openclaw --db ./data/remem.db --out-dir ./.remem --check --json
```

This writes:

- `remem.config.json`
- `remem-snippet.ts`
- `.env.example`

It also validates the generated config and runs doctor checks when `--check` is set.

## 2. Wire the adapter

```typescript
import { ReMEM, createOpenClawAdapter } from '@darksol/remem';

const memory = new ReMEM({ dbPath: './data/remem.db' });
await memory.init();
await memory.enableLayers();

const openclaw = createOpenClawAdapter(memory);
```

## 3. Remember turns, decisions, and procedures

```typescript
await openclaw.rememberTurn({
  role: 'user',
  content: 'Always run release gates before publishing ReMEM.',
  sessionId: 'release-lane',
});

await openclaw.rememberDecision({
  content: 'Use npm pack dry-run and secret scan before every publish.',
  sessionId: 'release-lane',
  topics: ['release', 'npm'],
});

await openclaw.rememberProcedure({
  content: 'When publishing, verify lint, tests, build, pack, and secret scan.',
  trigger: {
    phrases: ['publish remem', 'release remem'],
    terms: ['publish', 'release'],
    minScore: 0.2,
    priority: 0.8,
  },
  topics: ['release'],
});
```

## 4. Recall useful context

```typescript
const context = await openclaw.recallProjectContext('publish remem', {
  limit: 8,
  hops: 1,
});
```

For a fused agent-safe pass across semantic, graph, procedural, and recent memory:

```typescript
const recall = await memory.smartRecall('What should I remember before publishing?', {
  profile: 'agent-safe',
  includeRecent: true,
  includeProcedural: true,
  limit: 8,
});
```

## 5. Check runtime health

```bash
remem doctor --db ./data/remem.db --json
remem smoke-check --db ./data/remem.db --json
```

Use `doctor` in setup/CI lanes and `smoke-check` when you only need a lightweight runtime verification pass.
