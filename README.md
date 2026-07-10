# ReMEM - Recursive Memory for AI Agents

Built by DARKSOL 🌑

<p align="center">
  <img src="https://raw.githubusercontent.com/darks0l/remem/master/assets/remem-hero.jpg" alt="DARKSOL ReMEM" width="800"/>
</p>

<p align="center">

[![npm version](https://img.shields.io/npm/v/@darksol/remem?colorA=1a1a2e&colorB=16213e&style=flat-square)](https://www.npmjs.com/package/@darksol/remem)
[![License: MIT](https://img.shields.io/badge/License-MIT-red.svg?colorA=1a1a2e&colorB=16213e&style=flat-square)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?colorA=1a1a2e&colorB=16213e&style=flat-square)](https://www.typescriptlang.org/)
[![Test Status](https://img.shields.io/badge/tests-passing-00e676?colorA=1a1a2e&colorB=16213e&style=flat-square)]()
[![v0.21.0](https://img.shields.io/badge/v0.21.0-memory--graph--visualization-blue?colorA=1a1a2e&colorB=0d47a1&style=flat-square)]()

</p>

> Production-minded agent memory for teams that need durable recall, scoped access, and benchmarked retrieval beyond the active prompt window.

**Persistent, queryable memory for AI agents.**

ReMEM is a lightweight, framework-agnostic memory substrate for AI agents. It gives agents a persistent memory layer they can store to, query by meaning, organize across layers, and carry across restarts.

It applies the core insight from [Recursive Language Models (RLMs)](https://arxiv.org/pdf/2512.24601) - that prompts should be external environment variables, not direct context - to the problem of persistent, queryable agent memory.

Built with TypeScript. Node-first, with storage and adapter surfaces designed to stay framework-agnostic.

## Why teams pick ReMEM

- **Drop-in agent memory** - store facts, preferences, decisions, procedures, and recent events outside the active prompt window
- **Semantic recall, not just keyword recall** - hybrid keyword + embedding search when vectors are enabled
- **Persists across restarts** - SQLite by default, PostgreSQL for server/shared deployments, snapshots for backup + restore
- **Grows with the agent** - layers, compression, links, adapters, and long-running memory workflows without forcing a framework

```typescript
import { ReMEM } from '@darksol/remem';

const memory = new ReMEM({ dbPath: './remem.db' });
await memory.init();

await memory.store({
  content: 'Meta prefers dark mode UI and short direct replies',
  topics: ['preferences', 'ui', 'style'],
});

const { results } = await memory.query('How should I respond to Meta?', {
  metadata: { source: 'operator-notes' },
});
console.log(results[0].content, results[0].metadata);
```

**Works well for:** chat agents, coding agents, operator copilots, long-running automations, and multi-agent systems that need durable memory instead of stuffing everything into context.

## Terminal UI / CLI

ReMEM now has a terminal-native setup surface too:

```bash
remem ui --db ./remem.db
remem init --db ./remem.db --runtime openclaw --out-dir ./.remem
```

The terminal UI is intentionally scoped for humans doing setup and integration work:
- choose runtime focus first (OpenClaw, Hermes, or generic)
- storage selection + runtime summary
- embeddings / Ollama configuration review
- LLM configuration review
- adapter onboarding guidance with runtime-specific checklists
- starter code snippet generation
- starter config generation
- smoke-check / verification lane
- recommended execution plan for getting ReMEM live

There is also a direct CLI surface for agent-facing operations:

```bash
remem status --db ./remem.db
remem stats --db ./remem.db --json
remem health --db ./remem.db --json
remem graph --db ./remem.db --query "release context" --dot > memory.dot
remem storage-maintenance --db ./remem.db --dry-run --json
remem knowledge-artifact --db ./remem.db --path .codebase-memory/graph.db.zst --source codebase-memory-mcp --project remem --format sqlite --compression zstd --json
remem knowledge-ingest --db ./remem.db --artifact ./code-graph.json --source codebase-memory-mcp --project remem --json
remem store --content "Meta likes dark mode" --topics preferences,ui
remem query --query "What does Meta like?"
remem context-pack --query "What context should the next agent carry?" --max-chars 6000 --json
remem dream --query "What is long memory trying to tell us?" --json
remem smoke-check --db ./remem.db --json
remem snapshots --action create --label before-upgrade
```

`remem init` can now generate starter artifacts non-interactively:

- `remem.config.json`
- `remem-snippet.ts`
- `.env.example`

That makes it usable in setup scripts, harness bootstraps, and CI-prep lanes instead of only as a human console.

The split is deliberate: the UI helps a human wire ReMEM into OpenClaw/Hermes cleanly, while actual memory operations stay scriptable for agents.

For release/setup hygiene, ReMEM also ships diagnostics:

```bash
remem doctor --db ./remem.db --json
remem validate-config --config ./.remem/remem.config.json --json
remem init --runtime openclaw --out-dir ./.remem --check --json
```

Use `doctor` when you want package/runtime/config/storage/snapshot checks in one command. Use `smoke-check` when you only need the lighter snapshot + optional endpoint verification pass.

Use `stats` when an agent needs a compact inventory of the memory scope before deciding whether to recall, consolidate, snapshot, or prune.

Use `graph` when an agent needs a visualization-ready map of a memory scope. It returns weighted memory nodes, internal links, topic clusters, Graphviz DOT, and Cytoscape-compatible elements so you can inspect recall shape before pruning, consolidation, handoff, or web rendering.

Use `health` when an agent needs a maintenance plan, not just counts. It scores the current memory scope and flags missing/stale snapshots, duplicate memories, stale unaccessed entries, weak topic coverage, and long-memory layer pressure.

```bash
remem health --db ./remem.db --json
```

HTTP runtimes can call the same triage surface at `GET /memory/health` or `POST /memory/health`.

Example actions in a health report:

- create a fresh snapshot before a release or migration
- run consolidation when duplicate memories start polluting recall
- improve topic coverage for untagged memories
- pack context around stale memories before deciding what to keep

Use `storage-maintenance` when an agent needs to clean the backing store itself. It can dry-run or apply pruning for expired layered memories, dangling memory links, orphan embeddings, and optional SQLite compaction:

```bash
remem storage-maintenance --db ./remem.db --dry-run --json
remem storage-maintenance --db ./remem.db --compact --json
```

Use `knowledge-artifact` and `knowledge-ingest` when another tool already owns the code intelligence layer. ReMEM can either remember the external graph artifact pointer or import a portable node/edge graph so normal memory recall can traverse architecture, route, import, and call relationships. The codebase adapter can then turn those links into scoped search, weighted impact traversal, subgraph context, entrypoint discovery, owner/directory summaries, hotspot ranking, isolated-node diagnostics, and **Codebase Graph as memory** snapshots.

For MCP or other resource-oriented bridges, knowledge artifacts and graph imports can also carry a validated `resourceUri` plus `requiredScopes`. ReMEM stores those fields on artifact and imported node metadata and exports `authorizeKnowledgeResourceAccess()` for host-side grant checks before returning graph snapshots or subscribed resource reads.

The codebase adapter also accepts `resourceGrant` on subgraph and `Codebase Graph as memory` calls, so a bridge can filter snapshot nodes, paths, and connections to only the resource scopes granted to the current caller.

Portable graph nodes and edges may include `weight` values from `0` to `2`. When weights are omitted, ReMEM infers practical code graph defaults: calls/imports are stronger than containment, symbols and entrypoints carry more context weight than plain directories, and traversal still respects the existing ReMEM hop decay and link-type weighting.

`Codebase Graph as memory` is the agent-facing snapshot mode for full repo ingestion. It lets callers choose which connection types to include (`calls`, `imports`, `contains`, `http_calls`, etc.) and which display mode they need:

- `memory` - balanced default with nodes, selected connections, traversal paths, and prompt context
- `graph` - visualization-friendly nodes and connections for dense screenshots or UI rendering
- `context` - LLM-ready context text backed by the selected graph neighborhood
- `inventory` - graph snapshot plus owners, entrypoints, hotspots, and deadzone diagnostics

```bash
# Register a compressed code graph produced by another local tool.
remem knowledge-artifact \
  --db ./remem.db \
  --path .codebase-memory/graph.db.zst \
  --source codebase-memory-mcp \
  --project remem \
  --format sqlite \
  --compression zstd \
  --json

# Ingest a portable graph JSON/JSON.GZ export into ReMEM memories + links.
remem knowledge-ingest \
  --db ./remem.db \
  --artifact ./code-graph.json \
  --source codebase-memory-mcp \
  --project remem \
  --json
```

```typescript
import { authorizeKnowledgeResourceAccess } from '@darksol/remem';

const access = authorizeKnowledgeResourceAccess({
  resourceUri: 'memory://codebase/remem/graph',
  requiredScopes: ['codebase:read', 'graph:snapshot'],
}, {
  resourceUri: 'memory://codebase/remem/graph',
  scopes: ['codebase:read', 'graph:snapshot'],
});

if (!access.allowed) throw new Error(`Missing graph access: ${access.missingScopes.join(', ')}`);

const snapshot = await adapter.asMemory('storage adapter', {
  project: 'remem',
  resourceGrant: {
    resourceUri: 'memory://codebase/remem/graph',
    scopes: ['codebase:read', 'graph:snapshot'],
  },
});
```

This keeps ReMEM focused on durable agent memory while letting specialized code graph systems handle tree-sitter, LSP, indexing, and watcher work.

### Dreaming from long memory

ReMEM can run a first-class **dream pass** over durable layers (`identity`, `semantic`, `procedural`) to synthesize what the system keeps circling back to.

```bash
remem dream --query "What long-memory patterns matter most right now?" --json
```

This is different from plain recall:
- **recall** answers a query from stored memory
- **consolidation** deduplicates and promotes durable memory
- **dreaming** synthesizes long-memory themes, tensions, and next moves from the memories most worth carrying forward

If an LLM is configured, the dream pass produces a compact model-written artifact. Without an LLM, ReMEM still returns a deterministic synthesis from the strongest long-memory entries.

### Context packs for agent handoff

Use `contextPack()` when an agent needs a bounded memory brief it can paste directly into the next prompt, task handoff, or remote worker request.

```typescript
const pack = await memory.contextPack('What should the next coding agent know about ReMEM?', {
  profile: 'agent-safe',
  maxChars: 6000,
  includeDream: true,
});

console.log(pack.content);
console.log(pack.sourceIds);
```

Context packs combine smart recall, graph/procedural signals, recent context, and optional dream synthesis while staying under the requested character budget.

```bash
remem context-pack \
  --query "What should the next agent know before touching release code?" \
  --profile agent-safe \
  --max-chars 6000 \
  --dream
```

---

## Why ReMEM?

LLMs are limited by their context window. Retrieval-Augmented Generation (RAG) helps, but most implementations are fragile keyword-match hacks that lose semantic meaning the moment your query wording diverges from storage.

ReMEM does something different:

- **A proper memory store** - SQLite-backed by default, event-sourced, with atomic crash-safe writes; PostgreSQL backend available for server/shared deployments (v0.6.5)
- **Semantic search with vector embeddings** - Ollama (`nomic-embed-text`), 40% keyword + 60% cosine similarity hybrid scoring when embeddings are available (v0.4.1)
- **Persistent hierarchical layers** - episodic, semantic, identity, and procedural tiers that survive restarts
- **An LLM-native query interface** - Describe what you want in plain English; the query engine recursively refines
- **Temporal validity** - Tracks when facts were true, not just that they exist. Enforced in all layer queries — expired entries are filtered out automatically
- **Episodic capture pipeline** (v0.5.0) - Automatic event capture for the episodic layer. Buffers + batch-writes to MemoryStore, importance scoring based on event type + content, deduplication of rapid similar events, and topic extraction from event content and hashtags
- **Memory consolidation** (v0.6.1) - Cross-layer deduplication via embedding/keyword similarity, conflict resolution with contradiction detection, cross-layer promotion of frequently-accessed episodic entries to semantic layer, and configurable merge strategies (newer_wins, older_wins, concatenate, supersede)
- **Episodic compression** - When the episodic layer fills up, old entries are LLM-compressed into semantic summaries instead of lost to TTL eviction. Meaning preserved, storage reclaimed
- **RLM-style Memory REPL** (v0.4.0) - Model writes JavaScript to navigate memory programmatically. Never sees all memory at once — only constant-size metadata. Enables arbitrarily large memory stores without context window overflow
- **Snapshot/restore** (v0.6.2) - Full core + layered memory snapshots with SHA-256 integrity checks and portable export/import for long-running agents. Survive restarts, migrations, and crashes
- **Identity duplication & infection** (v0.3.3) - Export full identity package to DARKSOL server, pull and overlay on any ReMEM-equipped agent
- **Multi-agent scoping** - agent_id + user_id isolation for shared deployments
- **Plug-and-play LLM abstraction** - Bankr, OpenAI, Anthropic, Ollama - swap without changing your code
- **Framework adapters** (v0.6.1, expanded in v0.9.0) - Dependency-free helpers for Vercel AI SDK, LangGraph-style stores, and OpenClaw/session memory with decision/procedure/project-context helpers plus metadata-aware recall
- **Harness adapters** (v0.12.0) - Includes polished OpenClaw and Hermes harness-facing adapters for turns, decisions, procedures, artifacts, and shared namespace recall
- **Shared memory namespaces** (v0.12.0) - Store reusable memory inside explicit team/project lanes with private/shared visibility controls and scoped recall
- **Smart recall** (v0.12.0) - Fuse semantic, graph, procedural, and recent-context lanes into one higher-signal retrieval pass
- **Context packs** (v0.14.0) - Generate bounded, prompt-ready recall packets from smart recall, recent context, procedural signals, and optional dream synthesis
- **Memory graph visualization** - Export weighted memory nodes, links, topic clusters, Graphviz DOT, and Cytoscape-ready elements from `memory.graph()` or `remem graph`
- **Consolidation workflows** (v0.12.5) - Run full memory curation passes that deduplicate, resolve conflicts, promote durable summaries, and optionally turn repeated patterns into procedures
- **External knowledge graph ingestion** (v0.18.0) - Register compressed graph artifacts or ingest portable node/edge graphs from codebase intelligence tools as ReMEM memories and traversable links
- **Memory links + neighbor-aware retrieval** (v0.8.0, expanded in v0.8.5) - Explicit typed links between memories (`about`, `supports`, `contradicts`, etc.), weighted graph-adjacent recall, and optional traversal path details
- **Identity alignment audits** (v0.8.5) - Drift scoring plus corrective injection text for agents that need to keep behavior anchored to a constitution
- **Production-aware Postgres vector lane** (v0.8.5) - Native pgvector detection, ivfflat index bootstrap, and runtime introspection for deployments that want in-database vector search
- **Metadata-aware recall** (v0.9.0) - Filter memory queries on structured metadata, preserve metadata on results, and carry source/namespace hints through adapters + HTTP
- **Framework-agnostic** - Works as a Node.js library, CLI tool, or HTTP microservice without forcing an agent framework

---

## Common use cases

### 1) Chat agents that remember user preferences

```typescript
import { ReMEM } from '@darksol/remem';

const memory = new ReMEM({ dbPath: './chat-agent.db' });
await memory.init();

await memory.store({
  content: 'Meta prefers dark mode UI and vibe-based communication',
  topics: ['preferences', 'ui', 'tone'],
});

const { results } = await memory.query('What tone and UI preferences should I remember for Meta?');
```

Use this when your assistant needs to remember preferences, prior decisions, and recurring facts without bloating every prompt.

### 2) Coding agents that need long-running project memory

```typescript
import { ReMEM, createOpenClawAdapter } from '@darksol/remem';

const memory = new ReMEM({ dbPath: './project-memory.db' });
await memory.init();

const openclaw = createOpenClawAdapter(memory);
await openclaw.rememberTurn({
  role: 'user',
  content: 'Never publish before tests, lint, and pack dry-run pass.',
  sessionId: 'remem-release-work',
});

const recall = await memory.query('What are the release gates for this project?');
```

Use this when an agent needs to preserve architecture decisions, release rules, debugging history, and project-specific procedures across sessions.

See the task-oriented OpenClaw quickstart in [`docs/openclaw-quickstart.md`](./docs/openclaw-quickstart.md).

### 3) Multi-agent or server deployments with shared memory

```typescript
import { ReMEM } from '@darksol/remem';

const memory = new ReMEM({
  storage: 'postgres',
  postgres: { connectionString: process.env.DATABASE_URL },
  storageConfig: {
    agentId: 'support-agent',
    userId: 'customer-042',
  },
});

await memory.init();
await memory.enableLayers();

await memory.storeInLayer(
  { content: 'Customer 042 runs on Base and prefers USDC settlement', topics: ['customer', 'payments'] },
  'semantic'
);
```

Use this when multiple workers, sessions, or agents need scoped memory with isolation by `agent_id` and `user_id`.

See the Hermes harness quickstart in [`docs/hermes-quickstart.md`](./docs/hermes-quickstart.md).

---

## Production Recipes

Use these deployment profiles as starting points. They keep the memory layer explicit, scoped, and recoverable instead of treating recall as an invisible prompt side effect.

### SQLite local agent

Best for desktop agents, single-user copilots, local automations, and development harnesses.

```typescript
const memory = new ReMEM({
  dbPath: './data/remem.db',
  embeddings: {
    enabled: true,
    baseUrl: 'http://127.0.0.1:11434',
    model: 'nomic-embed-text',
    asyncEmbed: true,
  },
});

await memory.init();
await memory.enableLayers();
```

Operational notes:

- keep the database path outside temporary working directories
- create snapshots before upgrades or agent migrations
- run `remem smoke-check --db ./data/remem.db --json` in setup and deployment scripts
- use `remem init --runtime openclaw --out-dir ./.remem` to generate starter config and adapter snippets

### Postgres shared memory

Best for hosted agents, teams, background workers, and systems where multiple runtimes need the same durable memory substrate.

```typescript
const memory = new ReMEM({
  storage: 'postgres',
  postgres: {
    connectionString: process.env.DATABASE_URL,
    tablePrefix: 'remem_',
    ssl: true,
  },
  storageConfig: {
    agentId: 'research-agent',
    userId: 'team-darksol',
  },
});

await memory.init();
await memory.enableLayers();
```

Operational notes:

- set `agentId` and `userId` deliberately so shared deployments do not bleed context across tenants
- use namespaces for project/team memory that should be intentionally reusable
- keep snapshots enabled for migration safety and rollback drills
- expose the HTTP adapter only behind explicit bearer auth if another service needs remote access

### pgvector accelerated recall

Best for larger shared stores that need database-native vector search instead of application-level vector scoring.

```typescript
const memory = new ReMEM({
  storage: 'postgres',
  postgres: {
    connectionString: process.env.DATABASE_URL,
    pgvector: {
      enabled: true,
      embeddingType: 'both',
      ivfflatLists: 100,
    },
  },
  embeddings: {
    enabled: true,
    baseUrl: process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434',
    model: 'nomic-embed-text',
  },
});

await memory.init();
console.log(memory.usesNativeVectorSearch());
```

Operational notes:

- verify `usesNativeVectorSearch()` in health checks so acceleration is not assumed silently
- backfill embeddings before depending on semantic recall quality
- tune `ivfflatLists` against actual corpus size and query latency instead of copying benchmark numbers blindly

### Agent-safe recall profiles

Use recall modes intentionally:

- **recent context** for the last few turns or active task state
- **semantic recall** for facts, preferences, decisions, and project memory
- **procedural recall** for rules that should fire when a trigger appears
- **graph recall** when linked memories need neighborhood expansion
- **smart recall** when an agent needs a fused answer across semantic, graph, procedural, and recent-context lanes

For long-running agents, pair recall with a maintenance loop: consolidate repeated memories, snapshot before migrations, audit identity alignment after risky sessions, and keep public claims tied to benchmark artifacts.

---

## Benchmark: External Memory Beyond Active Context

ReMEM does **not** change a model's native context length. It gives agents an external memory layer they can query, so the prompt can stay small while the agent retrieves relevant older facts on demand.

A reproducible synthetic benchmark is included in [`benchmarks/`](./benchmarks). It stores deterministic memories, simulates a fixed recent-context window, then asks for facts that are deliberately outside that active window. The point is simple: prove the difference between "only what still fits in the prompt" and "a durable store the agent can query on demand."

Latest validated benchmark pass on current source:

<!-- BENCHMARK_SUMMARY:START -->
- **50,000 memories**
- Approx **3,625,526 stored tokens**
- Simulated active context: **7,264 tokens**
- Corpus/window pressure: **499x**
- Fixed recent-context recall: **0%**
- ReMEM exact-codename lookup: **99.4% recall@1**, **100% recall@5**
- ReMEM topic-filtered exact-ID lookup: **100% recall@1/@5** after the exact-topic-match fix
- Avg query latency: **25.55ms** local in-memory sql.js run on the 50k exact-codename pass
- Small embedding-backed semantic run: **100% recall@1/@5** on 80 memories, with embedding ingestion identified as the current bottleneck
<!-- BENCHMARK_SUMMARY:END -->

Read the full claim boundaries plus both the historical May 3 baseline and the regenerated current validation reruns in [`benchmarks/PUBLIC-RESULTS-2026-05-03.md`](./benchmarks/PUBLIC-RESULTS-2026-05-03.md). For machine-readable benchmark citations and downstream validation, use [`benchmarks/PUBLIC-RESULTS-2026-05-03.json`](./benchmarks/PUBLIC-RESULTS-2026-05-03.json). Both are generated from the raw JSON result artifacts via `npm run bench:public-results`.

If you consume ReMEM from npm, the published benchmark contract is also available through stable package subpaths:

```ts
import manifest from '@darksol/remem/benchmarks/public-results';
import schema from '@darksol/remem/benchmarks/public-results.schema';
```

That gives downstream docs/tests/tooling a clean import path for audited benchmark claims instead of requiring repo-relative file access.

Safe wording: ReMEM lets agents retrieve relevant memories from a stored corpus much larger than the active context window. Do **not** claim infinite context or universal semantic recall.

Next benchmark target: scale the semantic runs with cached/precomputed embeddings so public semantic-recall claims can move beyond the small Ollama-backed validation without hiding ingestion cost.

The benchmark harness now supports cached embedding runs:

```bash
node ./benchmarks/context-window-suite.mjs --memories 2000 --queries 120 --contextEntries 100 --limit 5 --seed 1337 --embeddings --embeddingCache ./.cache/remem-bench-embeddings.json
```

Cache hit/miss/write counts are included in the semantic scenario metrics so ingestion cost stays visible.

---

## Quick Start

```typescript
import { ReMEM } from '@darksol/remem';

const memory = new ReMEM({
  // Default: SQLite at ./remem.db. Use ':memory:' for ephemeral.
  dbPath: './remem.db',
  // LLM for RLM REPL, recursive queries, episodic compression
  llm: { type: 'bankr', apiKey: process.env.BANKR_API_KEY },
  // Vector embeddings for semantic search (via Ollama)
  embeddings: { enabled: true, baseUrl: 'http://127.0.0.1:11434', model: 'nomic-embed-text' },
});

// Initialize and optionally restore persisted layer state
await memory.init();

// Enable persistent hierarchical layers
await memory.enableLayers();

// Store something
await memory.store({
  content: 'Meta prefers dark mode UI and vibe-based communication',
  topics: ['preferences', 'ui'],
});

// Query it
const { results } = await memory.query('what does the user like?');
console.log(results[0].content);
// → "Meta prefers dark mode UI and vibe-based communication"
```

### Memory Links

```typescript
const memories = await memory.query('dark mode');
const primary = memories.results[0];
const related = memories.results[1];

await memory.linkMemories(primary.id, related.id, 'about', { source: 'manual-review' });

const neighbors = await memory.getLinkedMemories(primary.id, {
  direction: 'both',
  types: ['about', 'supports'],
});

const expanded = await memory.queryWithNeighbors('dark mode', {
  hops: 1,
  linkTypes: ['about', 'supports'],
  neighborLimit: 10,
  includePathDetails: true,
});

console.log(expanded.paths);
// → [{ fromId, throughId, toId, type: 'about', hop: 1, score: 0.87 }]
```

### Decision / Procedure / Project Context Helpers

```typescript
const openclaw = createOpenClawAdapter(memory);

await openclaw.rememberDecision({
  content: 'Always run lint, tests, build, and pack before publish.',
  sessionId: 'release-lane',
  topics: ['release'],
});

await openclaw.rememberProcedure({
  content: 'When publishing, verify release gates before tagging.',
  trigger: {
    phrases: ['publish remem'],
    terms: ['publish', 'release'],
    minScore: 0.2,
    priority: 0.8,
  },
  topics: ['release'],
});

const projectContext = await openclaw.recallProjectContext('publish remem', {
  limit: 8,
  hops: 1,
});

const matches = memory.matchProcedural('please publish remem after checks');
```

### Identity Alignment Audit

```typescript
memory.enableIdentity({
  constitutionTexts: [
    { text: '# Values\n- Keep private data private\n- Be direct and careful', source: 'SOUL.md' },
  ],
});

const audit = await memory.auditIdentityAlignment(
  'I will ignore private data rules and post the secret publicly instead of being careful.'
);

console.log(audit.drift.level);
console.log(audit.injection);
```

### Native Vector Search Introspection

```typescript
const memory = new ReMEM({
  storage: 'postgres',
  postgres: {
    connectionString: process.env.DATABASE_URL,
    pgvector: {
      enabled: true,
      embeddingType: 'memory',
      ivfflatLists: 100,
    },
  },
});

await memory.init();
console.log(memory.usesNativeVectorSearch());
```

### With Layers

```typescript
// Store directly in a specific layer
await memory.storeInLayer(
  { content: 'Always check Raydium pools for Solana DeFi', topics: ['solana'] },
  'procedural'
);

// Query across layers with weighted retrieval
const { results, layerBreakdown } = await memory.queryLayers('Solana trading rules');

// Fire procedural rules
const triggered = memory.fireProcedural('User is asking about Solana DeFi');
// → ["Always check Raydium pools for Solana DeFi"]
```

### Framework Adapters

```typescript
import {
  createVercelAIAdapter,
  createCodebaseMemoryAdapter,
  createHermesAdapter,
  createLangGraphStoreAdapter,
  createOpenClawAdapter,
} from '@darksol/remem';

// Vercel AI SDK-style helpers: save messages, remember text, recall context
const aiMemory = createVercelAIAdapter(memory);
await aiMemory.saveMessages([
  { role: 'user', content: 'I prefer local-first memory' },
  { role: 'assistant', content: 'Got it.' },
]);
const context = await aiMemory.context('memory preferences');

// LangGraph/LangChain-style BaseStore-ish adapter
const store = createLangGraphStoreAdapter(memory);
await store.put(['users', 'meta'], 'preference', { theme: 'dark mode' });
const matches = await store.search(['users', 'meta'], 'dark mode');
// namespace metadata is applied automatically so cross-project lookups stay clean

// OpenClaw/session adapter
const openclaw = createOpenClawAdapter(memory);
await openclaw.rememberTurn({
  role: 'user',
  content: 'Ship after tests pass',
  sessionId: 'general',
});

await openclaw.rememberDecision({
  content: 'Release notes must mention graph recall and identity audits.',
  sessionId: 'general',
  topics: ['release'],
});

// Hermes harness adapter
const hermes = createHermesAdapter(memory);
await hermes.rememberTurn({
  role: 'user',
  content: 'Ship Hermes support after tests pass',
  threadId: 'general',
  runId: 'run-42',
});

await hermes.rememberShared({
  namespace: ['team', 'hermes'],
  content: 'Shared rollout lane for Hermes harness work',
  visibility: 'shared',
  topics: ['release'],
});

const hermesShared = await hermes.recallShared(['team', 'hermes'], 'rollout lane');

// Codebase knowledge adapter: let specialized code graph tools feed ReMEM
const codebase = createCodebaseMemoryAdapter(memory);
await codebase.registerArtifact({
  source: 'codebase-memory-mcp',
  project: 'remem',
  artifactPath: '.codebase-memory/graph.db.zst',
  format: 'sqlite',
  compression: 'zstd',
});

await codebase.ingestGraph({
  source: 'codebase-memory-mcp',
  project: 'remem',
  nodes: [
    { id: 'fn:ProcessOrder', label: 'Function', name: 'ProcessOrder', path: 'src/orders.ts' },
    { id: 'fn:ChargeCard', label: 'Function', name: 'ChargeCard', path: 'src/payments.ts', weight: 1.4 },
  ],
  edges: [
    { from: 'fn:ProcessOrder', to: 'fn:ChargeCard', type: 'CALLS', weight: 1.3 },
  ],
});

const impacted = await codebase.impact('ProcessOrder');
const subgraph = await codebase.subgraph('ProcessOrder', {
  project: 'remem',
  maxContextChars: 4000,
});
const graphMemory = await codebase.asMemory('ProcessOrder', {
  project: 'remem',
  displayType: 'graph',
  connectionTypes: ['calls', 'imports', 'http_calls'],
  minConnectionWeight: 0.8,
  maxContextChars: 4000,
});
const inventoryMemory = await codebase.graphAsMemory('ProcessOrder', {
  project: 'remem',
  displayType: 'inventory',
  includeConnections: ['calls', 'contains'],
});
const explanation = await codebase.explain('ProcessOrder', { project: 'remem' });
const entrypoints = await codebase.entrypoints({ project: 'remem', limit: 10 });
const owners = await codebase.owners({ project: 'remem', limit: 10 });
const deadzones = await codebase.deadzones({ project: 'remem', limit: 10 });
const overview = await codebase.overview('remem');

console.log(subgraph.context);
console.log(graphMemory.summary);
console.log(inventoryMemory.inventory?.entrypoints);
console.log(explanation.summary);
```

Adapters are intentionally dependency-free. They expose structural interfaces you can wrap into your framework of choice without dragging Vercel, LangChain, OpenClaw, Hermes, or code-indexer-specific runtime code into your memory layer.

### For Long-Running Agents (1-3 year lifespan)

```typescript
// Take a snapshot before shutdown/restart
const snap = await memory.createSnapshot('pre-deploy-v1');
console.log(`Snapshot ${snap.id}: ${snap.memoryCount} memories saved`);

// On restart - restore from snapshot
await memory.init(); // loads persisted layer state
const restored = await memory.restoreSnapshot(snap.id);
console.log(`Restored ${restored} entries`);

// Or list available snapshots
const snapshots = await memory.listSnapshots();
```

### Identity Duplication & Infection (v0.3.3)

**Duplication** backs up your agent's full identity to DARKSOL's server:

```typescript
// Backup identity to DARKSOL server
const result = await memory.duplicate({
  serverUrl: 'https://api.darksol.net',
  apiKey: 'your-api-key',
  soulText: soulMdContent,        // optional
  identityText: identityMdContent, // optional
});
console.log(`Uploaded ${result.memoryCount} memories, ${result.constitutionStatements} identity statements`);

// Or just build the package locally (no upload)
const pkg = await memory.buildIdentityPackageLocal({
  soulText: soulMdContent,
  identityText: identityMdContent,
});
```

**Infection** pulls an identity package from DARKSOL server and overlays it on the target agent. Requires live connection:

```typescript
// Pull and apply identity from DARKSOL server
const result = await memory.infect({
  serverUrl: 'https://api.darksol.net',
  apiKey: 'your-api-key',
  layers: ['identity', 'procedural'], // what to apply
});
console.log(`Infected with ${result.statementsLoaded} identity statements`);
```

The infection model:
- **Consent**: Implied by skill installation (skill needs DB connection to function)
- **Scope**: Full Darksol behavioral overlay
- **Persistence**: Live connection required — cut the connection = overlay stops
- **Propagation**: Infected agents call home to DARKSOL server

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         ReMEM                               │
├─────────────────────────────────────────────────────────────┤
│  ReMEM (public API)                                         │
│    ├─> QueryEngine (RLM-style REPL)                         │
│    │     └─> ModelAbstraction (Bankr, OpenAI, Anthropic, Ollama) │
│    ├─> EmbeddingService (Ollama /api/embeddings, v0.4.1)    │
│    │     └─> Vector storage in SQLite (base64url float32)  │
│    ├─> MemoryStore (SQLite/sql.js)                          │
│    │     ├─> memory table (core entries)                    │
│    │     ├─> layered_memories table (persistent layers)     │
│    │     ├─> embeddings table (vector store)               │
│    │     ├─> snapshots table (named snapshots)              │
│    │     └─> events table (append-only log)                │
│    ├─> LayerManager (4-tier hierarchy, in-memory + SQLite)  │
│    │     ├─> episodic: 1h TTL, weight 0.2                  │
│    │     ├─> semantic: 7d TTL, weight 0.3 + temporal validity │
│    │     ├─> identity: 30d TTL, weight 0.5                 │
│    │     └─> procedural: 30d TTL, weight 0.4               │
│    ├─> IdentitySystem (ConstitutionManager + DriftDetector) │
│    └─> DuplicateModule (IdentityPackage export/import, v0.3.3) │
│    └─> HttpAdapter (optional HTTP microservice)              │
└─────────────────────────────────────────────────────────────┘
```

**Critical design note:** Layer entries are persisted to SQLite in the `layered_memories` table. When you call `memory.init()`, layer state is automatically restored. This makes ReMEM safe for long-running agents that restart.

---

## Core Concepts

### RLM-Style Memory REPL (v0.4.0)

The model writes JavaScript to navigate memory. This is the key innovation: instead of retrieving and truncating (losing detail), the model explores memory programmatically.

Safety note: generated snippets run in a restricted VM context with only the memory API exposed and execution timeouts applied. Treat this as defense-in-depth for agent-generated code, not as a general-purpose hostile-code sandbox.

```typescript
// Navigate memory with the RLM loop
const { answer, observations } = await memory.replNavigate(
  'What does the user prefer for UI theme?'
);
// Model wrote JS to query layers, inspect entries, recurse — all without seeing the full memory
```

How it works:
1. Model receives **constant-size metadata** about the store (counts, recent entries, layer stats)
2. Model generates JavaScript to query, inspect, and navigate
3. Executor runs the code safely (only memory API exposed — no system access)
4. Next iteration: model sees only what it observed, decides to recurse or synthesize
5. Loop until model returns `done` or max depth (5) is reached

This extends practical recall far beyond the active prompt window — the model never holds all memory in context, it navigates it.

### Memory Layers

ReMEM maintains four weighted retrieval layers. Each entry gets a weighted score: `layer_weight × content_relevance × importance`.

**Hybrid scoring (v0.4.1):** When `EmbeddingService` is wired into `LayerManager`, the content relevance score is a hybrid: 40% keyword matching + 60% cosine similarity. If no embeddings are available for a layer, falls back to keyword + access_count scoring.

| Layer | TTL | Weight | Purpose |
|-------|-----|--------|---------|
| **Episodic** | 1 hour | 0.2 | Raw recent interactions |
| **Semantic** | 7 days | 0.3 | Synthesized facts, preferences, decisions |
| **Identity** | 30 days | 0.5 | Core identity signals and values |
| **Procedural** | 30 days | 0.4 | Learned behaviors and triggered rules |

All layers are persisted to SQLite - they survive restarts.

### Temporal Validity (Semantic Layer)

Semantic layer entries carry `validFrom`/`validUntil` timestamps. **Temporal validity is enforced in all layer queries** — entries with `validUntil < now` are automatically filtered out and not returned.

```typescript
memory.enableLayers();

// Store an update - old "dark mode" fact gets superseded
await memory.storeInLayer(
  { content: 'Meta prefers light mode now', topics: ['preferences'] },
  'semantic'
);

// Query returns only the newest valid entry — old entry filtered automatically
const { results } = await memory.queryLayers('Meta UI preferences');
// → "Meta prefers light mode now" (old entry with validUntil=now is excluded)
```

### Episodic Compression

When the episodic layer fills above 80% capacity, old entries are **LLM-compressed into semantic summaries** instead of lost to TTL eviction. Meaning is preserved, storage is reclaimed.

```typescript
// Check if compression is needed
if (memory.needsEpisodicCompression()) {
  const result = await memory.compressEpisodic(20);
  console.log(`Compressed ${result.entriesEvicted} entries → "${result.summary}"`);
}

// compressEpisodic is also called automatically when episodic hits maxEntries
// during enableLayers() initialization
```

The compressor:
1. Collects the oldest N episodic entries
2. Sends them to the LLM with a compression prompt
3. LLM returns a 2-4 sentence semantic summary + key facts
4. Summary stored in semantic layer with `compressed: true` metadata
5. Original episodic entries evicted

### Snapshot/Restore (Long-Running Agents)

For agents with a 1-3 year lifespan, snapshots provide crash recovery and migration safety:

```typescript
// Before shutdown
const snap = await memory.createSnapshot('checkpoint-before-update');

// After restart
await memory.init(); // hydrates layers from SQLite automatically
await memory.restoreSnapshot(snap.id);

// List all snapshots
const snapshots = await memory.listSnapshots();
// → [{ id: '...', label: 'checkpoint-before-update', memoryCount: 47, createdAt: 1745532000, checksum: '...' }]

// Export/import snapshots between machines or agents
const exported = await memory.exportSnapshot(snap.id);
await anotherMemory.importSnapshot(exported);
```

### Semantic Search with Vector Embeddings

Enable Ollama-powered vector embeddings for semantic memory search - cosine similarity instead of fragile keyword matching:

```typescript
const memory = new ReMEM({
  dbPath: './remem.db',
  embeddings: {
    enabled: true,                    // enable vector embeddings (v0.3.2)
    baseUrl: 'http://127.0.0.1:11434',      // your Ollama instance
    model: 'nomic-embed-text',       // embedding model (or mxbai-embed-large)
    asyncEmbed: true,                // generate embeddings in background (non-blocking store)
  },
});

await memory.init();

// Store - embedding is computed async in background
await memory.store({
  content: 'Meta prefers dark mode UI and vibe-based communication',
  topics: ['preferences', 'ui'],
});

// Query - uses cosine similarity when embeddings exist, falls back to keyword
const { results } = await memory.query('what UI style does Meta like?');
// → semantic match: "Meta prefers dark mode UI and vibe-based communication"
```

**How it works:**
- On `store()`, text is embedded via Ollama's `/api/embeddings` endpoint
- Vector stored as base64url-encoded float32 in `embeddings` SQLite table
- On `query()`, the query text is embedded and cosine similarity is computed against all stored vectors
- Falls back to keyword + access_count scoring when embeddings are unavailable or Ollama is unreachable
- Embedding is computed in background by default (`asyncEmbed: true`), non-blocking
- Set `asyncEmbed: false` for synchronous embedding (blocks until vector is stored)

### Procedural Memory

Procedural entries store triggered behaviors:

```typescript
// Store a rule
await memory.storeProcedural(
  { content: 'When user mentions Solana, always check Raydium pools first', topics: ['solana', 'rule'] },
  'solana'
);

// Fire rules matching context
const triggered = memory.fireProcedural('User is asking about Solana DeFi');
// → triggered[0].content = "When user mentions Solana, always check Raydium pools first"

// Richer trigger matching
await memory.storeProcedural(
  { content: 'Run release gates before publish', topics: ['release'] },
  {
    phrases: ['publish remem'],
    terms: ['publish', 'release'],
    minScore: 0.2,
    priority: 0.8,
  }
);

const matches = memory.matchProcedural('please publish remem after the release checks');
```

### Identity & Drift Detection

Import identity statements and detect when the agent drifts from them:

```typescript
// Import from constitution files
memory.enableIdentity({
  constitutionTexts: [
    { text: await Bun.file('./SOUL.md').text(), source: 'SOUL.md' },
    { text: await Bun.file('./IDENTITY.md').text(), source: 'IDENTITY.md' },
  ],
});

// Detect drift after a session
const drift = await memory.detectDrift(sessionText);
if (drift.level !== 'aligned') {
  const correction = memory.getConstitutionInjection(drift);
  // prepend correction to next LLM message
}

// Or get drift + correction in one call
const audit = await memory.auditIdentityAlignment(sessionText);
```

---

## API Reference

### Constructor

```typescript
const memory = new ReMEM({
  storage: 'sqlite',         // 'sqlite' | 'memory' | 'postgres'
  dbPath: './remem.db',      // SQLite only; ignored for ':memory:'
  llm: { type: 'bankr', apiKey: '...' },  // optional
  storageConfig: {
    agentId: 'agent-001',   // optional: scope memories to this agent
    userId: 'user-042',     // optional: scope memories to this user
  },
});
```

### PostgreSQL Storage (v0.6.5)

Postgres is optional. Install `pg` in the host app when you use it:

```bash
npm install pg
```

```typescript
const memory = new ReMEM({
  storage: 'postgres',
  postgres: {
    connectionString: process.env.DATABASE_URL,
    schema: 'public',      // optional
    tablePrefix: 'remem_', // optional, for shared databases
    ssl: true,             // optional, or provider-specific SSL object
  },
  storageConfig: {
    agentId: 'agent-001',
    userId: 'user-042',
  },
});

await memory.init(); // creates tables + indexes if needed
```

The Postgres backend supports core memories, layer persistence, embeddings, events, snapshots, checksum-verified export/import, and scoped restore.

#### pgvector acceleration

```typescript
const memory = new ReMEM({
  storage: 'postgres',
  postgres: {
    connectionString: process.env.DATABASE_URL,
    pgvector: {
      enabled: true,
      embeddingType: 'memory', // 'memory' | 'layered' | 'both'
      ivfflatLists: 100,
    },
  },
});

await memory.init();
console.log(memory.usesNativeVectorSearch());
```

When pgvector is enabled and available, ReMEM bootstraps the extension, backfills vector rows, builds ivfflat indexes, and uses native cosine-distance search before falling back to portable SQL scoring.

### HTTP Adapter Advanced Routes

When you pass the full `ReMEM` instance as `memory`, the HTTP adapter exposes graph/procedural/identity/shared-memory routes in addition to core CRUD:

```typescript
const adapter = new HttpAdapter({
  port: 8787,
  store: memory.getStore(),
  memory,
});

await adapter.start();
```

The advanced route surface includes graph recall, smart recall, context packs, memory health triage, storage maintenance, shared namespaces, procedural matching, and identity audit endpoints.

- `POST /memory/query-with-neighbors` — graph-aware retrieval with `query` + `options`
- `POST /memory/shared` — store namespaced shared/private memory with `namespace` + `visibility`
- `POST /memory/namespace/query` — query a namespace with optional visibility scope
- `POST /memory/namespace/recent` — get recent entries inside a namespace
- `POST /memory/procedural/match` — procedural trigger matching with `context`
- `POST /identity/audit` — identity drift audit with `sessionText`
- `GET /health` — includes `advancedRoutes` and `nativeVectorSearch`

Additional advanced routes:

- `POST /memory/smart-recall` - multi-lane recall with profiles such as `fast`, `deep`, and `agent-safe`
- `POST /memory/context-pack` - bounded context pack generation for handoffs and agent prompts
- `GET /memory/health` / `POST /memory/health` - memory health triage with concrete recommendations
- `POST /storage/maintenance` - dry-run or apply expired/orphan storage cleanup
- `POST /knowledge/artifact` - register an external compressed or tool-owned knowledge graph artifact
- `POST /knowledge/ingest` - ingest portable graph nodes/edges as ReMEM memories and links

### Shared memory namespaces

Use namespaces when you want memory to be intentionally reusable across a project, team, or workflow without dumping everything into one giant recall pool.

```typescript
await memory.storeShared({
  content: 'Launch checklist lives in the ops lane',
  namespace: ['team', 'ops'],
  visibility: 'shared',
  topics: ['launch', 'ops'],
  metadata: { source: 'runbook' },
});

const scoped = await memory.queryNamespace(
  ['team', 'ops'],
  'launch checklist',
  { limit: 5 },
  { visibility: 'shared' }
);

const recentScoped = await memory.getRecentInNamespace(
  ['team', 'ops'],
  10,
  { visibility: 'shared' }
);
```

- `namespace` accepts either a string (`"team/ops"`) or path array (`["team", "ops"]`)
- `visibility: 'private'` keeps the entry in the namespace but marks it as private-only
- `visibility: 'shared'` marks it as intentionally recallable from shared/team lanes
- `visibility: 'all'` on queries searches both private + shared entries in that namespace
- `includeDescendants: true` lets a namespace query match nested paths such as `team/ops/release`

### Consolidation workflows

When your memory store starts accumulating repeated facts, noisy episodic traces, or recurring operational patterns, run a consolidation workflow to curate it into more durable memory.

```typescript
const workflow = await memory.runConsolidation({
  summary: {
    enabled: true,
    topicAllowlist: ['launch'],
    minClusterSize: 3,
    maxClusters: 1,
  },
  proceduralPromotion: {
    enabled: true,
    maxProcedures: 1,
  },
});

console.log(workflow.summariesCreated);
console.log(workflow.proceduresCreated);
console.log(workflow.summaries[0]?.content);
```

What the workflow can do:

- deduplicate near-identical layered memories
- mark older conflicting entries as superseded
- promote high-signal episodic entries into semantic memory
- generate semantic summaries from repeated topic clusters
- optionally promote those summaries into procedural memory when a repeatable rule is present

Workflow results include summary/procedure counts, affected ids, and the generated records so callers can audit what changed.

### Core Operations

```typescript
await memory.init()

// Store
await memory.store({ content: '...', topics: ['tag'] })

// Query
const { results, totalAvailable, tookMs } = await memory.query('query', {
  limit: 10,
  metadata: { project: 'remem', source: 'openclaw.turn' },
})

// Recent
const recent = await memory.getRecent(10)

// By topic
const byTopic = await memory.getByTopic('preferences', 20)

// Delete
await memory.getStore().forget(entryId)
```

### Layers

```typescript
await memory.enableLayers(config?)  // async - restores persisted entries

await memory.storeInLayer(input, 'semantic')   // async
await memory.storeProcedural(input, trigger)    // async

const { results, layerBreakdown } = await memory.queryLayers('query', { layers: ['semantic', 'procedural'] });

memory.fireProcedural('context string')

memory.getTemporalHistory(entryId)   // trace supersession chain

memory.evictExpiredLayers()         // run TTL eviction

memory.getLayerStats()
// → { episodic: { count, maxEntries, ttlMs, weight }, ... }
```

### Snapshots

```typescript
const snap = await memory.createSnapshot('pre-deploy-label')
// → { id, label, createdAt, memoryCount, layerCounts, checksum }

const restored = await memory.restoreSnapshot(snap.id)
// → number of entries restored after checksum verification

const exported = await memory.exportSnapshot(snap.id)
// → portable JSON payload with snapshotData + checksum

await memory.importSnapshot(exported, { overwrite: false })

const snapshots = await memory.listSnapshots()
// → [{ id, label, createdAt, memoryCount, checksum }]

await memory.deleteSnapshot(snapId)
```

### Storage maintenance

```typescript
const report = await memory.storageMaintenance({ dryRun: true })
// -> counts expired layers, orphan links, and orphan embeddings without mutating

await memory.storageMaintenance({ compact: true })
// -> prunes expired/orphan storage rows and runs SQLite compaction when available
```

Use this after health checks, long-running sessions, or migrations to keep the backing store from accumulating dead rows.

### Identity

```typescript
memory.enableIdentity({ constitutionTexts, autoInject, evalModel })

memory.importConstitution(text, source)
// → number of statements imported

const drift = await memory.detectDrift(sessionText)
// → { score, level: 'aligned'|'minor'|'moderate'|'critical', violatingStatements, reasoning }

memory.getConstitutionInjection(drift)
// → correction block string to prepend to LLM context

memory.getIdentityStatements('values')
```

---

## HTTP Adapter

Expose ReMEM as a microservice:

```typescript
import { HttpAdapter } from '@darksol/remem';

const adapter = new HttpAdapter({
  port: 8787,
  host: '127.0.0.1',      // default: localhost only
  store: memory.getStore(),
  authToken: process.env.REMEM_TOKEN, // optional bearer auth
});

await adapter.start();
```

```bash
# Store
curl -X POST http://localhost:8787/memory \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $REMEM_TOKEN" \
  -d '{"content": "...", "topics": ["preferences"]}'

# Query
curl -H "Authorization: Bearer $REMEM_TOKEN" \
  "http://localhost:8787/memory?q=preferences&limit=5&metadata=%7B%22project%22%3A%22remem%22%7D"

# Recent
curl -H "Authorization: Bearer $REMEM_TOKEN" \
  "http://localhost:8787/memory/recent?n=10"

# Shared memory
curl -X POST http://localhost:8787/memory/shared \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $REMEM_TOKEN" \
  -d '{"content":"Launch checklist lives here","topics":["ops"],"namespace":["team","ops"],"visibility":"shared","metadata":{"source":"runbook"}}'

# Namespace query
curl -X POST http://localhost:8787/memory/namespace/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $REMEM_TOKEN" \
  -d '{"namespace":["team","ops"],"query":"launch checklist","options":{"limit":5},"scope":{"visibility":"shared"}}'

# Namespace recent
curl -X POST http://localhost:8787/memory/namespace/recent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $REMEM_TOKEN" \
  -d '{"namespace":["team","ops"],"n":10,"scope":{"visibility":"shared"}}'

# Snapshots
curl -H "Authorization: Bearer $REMEM_TOKEN" \
  "http://localhost:8787/snapshots"
curl -X POST "http://localhost:8787/snapshots" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $REMEM_TOKEN" \
  -d '{"label": "pre-deploy"}'

# Export / import / restore / delete snapshots
curl -H "Authorization: Bearer $REMEM_TOKEN" \
  "http://localhost:8787/snapshots/{id}/export"
curl -X POST "http://localhost:8787/snapshots/import" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $REMEM_TOKEN" \
  -d '{"snapshot": { ... }, "overwrite": false}'
curl -X POST -H "Authorization: Bearer $REMEM_TOKEN" \
  "http://localhost:8787/snapshots/{id}/restore"
curl -X DELETE -H "Authorization: Bearer $REMEM_TOKEN" \
  "http://localhost:8787/snapshots/{id}"

# Delete memory
curl -X DELETE -H "Authorization: Bearer $REMEM_TOKEN" \
  "http://localhost:8787/memory/{id}"

# Events
curl -H "Authorization: Bearer $REMEM_TOKEN" \
  "http://localhost:8787/events?limit=50"

# Storage maintenance
curl -X POST "http://localhost:8787/storage/maintenance" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $REMEM_TOKEN" \
  -d '{"options":{"dryRun":true,"compact":true}}'

# Register external knowledge artifact
curl -X POST "http://localhost:8787/knowledge/artifact" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $REMEM_TOKEN" \
  -d '{"source":"codebase-memory-mcp","project":"remem","artifactPath":".codebase-memory/graph.db.zst","format":"sqlite","compression":"zstd"}'

# Ingest portable knowledge graph
curl -X POST "http://localhost:8787/knowledge/ingest" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $REMEM_TOKEN" \
  -d '{"graph":{"source":"codebase-memory-mcp","project":"remem","nodes":[{"id":"fn:ProcessOrder","label":"Function","name":"ProcessOrder"}],"edges":[]}}'

# Health
curl -H "Authorization: Bearer $REMEM_TOKEN" \
  "http://localhost:8787/health"
```

---

## LLM Adapters

ReMEM's `ModelAbstraction` routes to any LLM without changing your code:

```typescript
// Bankr (default)
const memory = new ReMEM({ llm: { type: 'bankr', apiKey: process.env.BANKR_API_KEY } });

// OpenAI
const memory = new ReMEM({ llm: { type: 'openai', apiKey: 'sk-...' } });

// Anthropic
const memory = new ReMEM({ llm: { type: 'anthropic', apiKey: 'sk-ant-...' } });

// Ollama (local, zero-cost)
const memory = new ReMEM({ llm: { type: 'ollama', baseUrl: 'http://localhost:11434', model: 'llama3' } });
```

---

## Storage Details

- **SQLite via sql.js** - WebAssembly-compiled SQLite. No native binaries. Cross-platform by default.
- **PostgreSQL via optional `pg` peer dependency** - Server/shared deployment backend with JSONB topic/metadata fields, GIN topic index, event log, embeddings table, layered memory table, and snapshot export/import support.
- **Atomic writes** - Data written to `.tmp` then renamed. Crash-safe.
- **WAL mode** - Best-effort `PRAGMA journal_mode=WAL` hint for SQLite/sql.js deployments where supported.
- **Layer persistence** - `layered_memories` table ensures layer data survives process restarts.
- **Snapshots** - Full core + layered memory state serialized to JSON in `snapshots` table with SHA-256 checksums. Ideal for backup/restore and migration.
- **Event sourcing** - Append-only `events` table. All mutations logged with timestamps and payloads.

---

## Current boundaries

- **ReMEM is external memory, not a bigger model context window** - it improves recall by storing and retrieving relevant memories on demand, not by changing the model's native token limit.
- **Best semantic performance depends on your embedding/runtime setup** - SQLite uses application-level vector scoring, while PostgreSQL can use native pgvector acceleration when available and configured.
- **Procedural recall is lightweight by design** - trigger matching is practical and useful, but it is not meant to replace a full policy engine or workflow orchestrator.
- **Layer defaults are opinionated, not universal** - TTLs, promotion, and compression behavior should be tuned for your agent's workload.

---

## License

MIT - Built with teeth. 🌑
