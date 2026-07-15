# ReMEM OpenClaw Quickstart

Use this when OpenClaw needs durable project/session memory without bloating every prompt.

This is the shortest clean path from `remem init` to first stored and queryable memory in an OpenClaw lane.

## 1. Generate starter files

```bash
remem init --runtime openclaw --db ./data/remem.db --out-dir ./.remem --check --json
```

This writes:

- `remem.config.json`
- `remem-snippet.ts`
- `.env.example`

It also validates the generated config and runs doctor checks when `--check` is set.

Use the generated `remem-snippet.ts` as the starter integration point and keep `remem.config.json` checked in when you want agent/runtime defaults to stay explicit.

## 2. Wire the adapter

```typescript
import { ReMEM, createOpenClawAdapter } from '@darksol/remem';

const memory = new ReMEM({ dbPath: './data/remem.db' });
await memory.init();
await memory.enableLayers();

const openclaw = createOpenClawAdapter(memory);
```

## 3. Remember turns, decisions, and procedures in one lane

```typescript
await openclaw.rememberTurn({
  role: 'user',
  content: 'Always run release gates before publishing ReMEM.',
  sessionId: 'release-lane',
  metadata: {
    project: 'remem',
    lane: 'release',
  },
});

await openclaw.rememberDecision({
  content: 'Use npm pack dry-run and secret scan before every publish.',
  sessionId: 'release-lane',
  topics: ['release', 'npm'],
  metadata: {
    project: 'remem',
    lane: 'release',
  },
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
  metadata: {
    project: 'remem',
    lane: 'release',
  },
});
```

This gives you:

- raw turn history via `openclaw.turn`
- durable semantic memory for decisions
- procedural triggers for release actions

## 4. Recall useful context across session and project boundaries

```typescript
const sessionContext = await openclaw.recallContext('release gates', {
  limit: 6,
  topics: ['session:release-lane'],
  metadata: { project: 'remem' },
});

const decisionsOnly = await memory.query('publish checklist', {
  limit: 6,
  topics: ['decision', 'session:release-lane'],
  metadata: { project: 'remem', lane: 'release' },
});

const projectContext = await openclaw.recallProjectContext('publish remem', {
  limit: 8,
  topics: ['release', 'session:release-lane'],
  hops: 1,
});
```

Use `recallContext()` when metadata scoping matters. Use `recallProjectContext()` when you want graph-neighbor expansion from the memories already in the release lane.

For a fused agent-safe pass across semantic, graph, procedural, and recent memory:

```typescript
const recall = await memory.smartRecall('What should I remember before publishing?', {
  profile: 'agent-safe',
  includeRecent: true,
  includeProcedural: true,
  limit: 8,
  metadata: { project: 'remem' },
});
```

When the next agent needs a prompt-ready handoff instead of raw query results:

```typescript
const pack = await memory.contextPack('What should the next release agent know?', {
  profile: 'agent-safe',
  maxChars: 4000,
  includeDream: false,
  metadata: { project: 'remem' },
});
```

## 5. Check runtime health and generated config

```bash
remem validate-config --config ./.remem/remem.config.json --json
remem doctor --db ./data/remem.db --json
remem smoke-check --db ./data/remem.db --json
```

Use `validate-config` right after `remem init` in automation lanes, `doctor` in setup/CI lanes, and `smoke-check` when you only need a lightweight runtime verification pass.
