# ReMEM - Recursive Memory for AI Agents

<p align="center">
  <img src="https://raw.githubusercontent.com/darks0l/remem/main/assets/darksol-banner.png" alt="DARKSOL" width="800"/>
</p>

<p align="center">

[![npm version](https://img.shields.io/npm/v/@darksol/remem?colorA=1a1a2e&colorB=16213e&style=flat-square)](https://www.npmjs.com/package/@darksol/remem)
[![License: MIT](https://img.shields.io/badge/License-MIT-red.svg?colorA=1a1a2e&colorB=16213e&style=flat-square)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?colorA=1a1a2e&colorB=16213e&style=flat-square)](https://www.typescriptlang.org/)
[![Test Status](https://img.shields.io/badge/tests-67%2F67%20passing-00e676?colorA=1a1a2e&colorB=16213e&style=flat-square)]()
[![v0.6.1](https://img.shields.io/badge/v0.6.1-memory%20consolidation%20-blue?colorA=1a1a2e&colorB=0d47a1&style=flat-square)]()

</p>

> ⚠️ **IN TESTING** - This project is under active development. API surface may change.

**Recursively extend any LLM's context window by treating memory as an external, queryable environment.**

ReMEM is a lightweight, framework-agnostic memory substrate for AI agents. It applies the core insight from [Recursive Language Models (RLMs)](https://arxiv.org/pdf/2512.24601) - that prompts should be external environment variables, not direct context - to the problem of persistent, queryable agent memory.

Built with TypeScript. Runs anywhere.

---

## Why ReMEM?

LLMs are limited by their context window. Retrieval-Augmented Generation (RAG) helps, but most implementations are fragile keyword-match hacks that lose semantic meaning the moment your query wording diverges from storage.

ReMEM does something different:

- **A proper memory store** - SQLite-backed, event-sourced, with atomic crash-safe writes
- **Semantic search with vector embeddings** - Ollama (`nomic-embed-text`), 40% keyword + 60% cosine similarity hybrid scoring when embeddings are available (v0.4.1)
- **Persistent hierarchical layers** - episodic, semantic, identity, and procedural tiers that survive restarts
- **An LLM-native query interface** - Describe what you want in plain English; the query engine recursively refines
- **Temporal validity** - Tracks when facts were true, not just that they exist. Enforced in all layer queries — expired entries are filtered out automatically
- **Episodic capture pipeline** (v0.5.0) - Automatic event capture for the episodic layer. Buffers + batch-writes to MemoryStore, importance scoring based on event type + content, deduplication of rapid similar events, and topic extraction from event content and hashtags
- **Memory consolidation** (v0.6.1) - Cross-layer deduplication via embedding/keyword similarity, conflict resolution with contradiction detection, cross-layer promotion of frequently-accessed episodic entries to semantic layer, and configurable merge strategies (newer_wins, older_wins, concatenate, supersede)
- **Episodic compression** - When the episodic layer fills up, old entries are LLM-compressed into semantic summaries instead of lost to TTL eviction. Meaning preserved, storage reclaimed
- **RLM-style Memory REPL** (v0.4.0) - Model writes JavaScript to navigate memory programmatically. Never sees all memory at once — only constant-size metadata. Enables arbitrarily large memory stores without context window overflow
- **Snapshot/restore** - Full memory snapshots for long-running agents. Survive restarts, migrations, and crashes
- **Identity duplication & infection** (v0.3.3) - Export full identity package to DARKSOL server, pull and overlay on any ReMEM-equipped agent
- **Multi-agent scoping** - agent_id + user_id isolation for shared deployments
- **Plug-and-play LLM abstraction** - Bankr, OpenAI, Anthropic, Ollama - swap without changing your code
- **Framework adapters** (v0.6.1) - Dependency-free helpers for Vercel AI SDK, LangGraph-style stores, and OpenClaw/session memory
- **Framework-agnostic** - Works as a library (Node.js/Deno), CLI tool, or HTTP microservice

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
  embeddings: { enabled: true, baseUrl: 'http://192.168.68.73:11434', model: 'nomic-embed-text' },
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

// OpenClaw/session adapter
const openclaw = createOpenClawAdapter(memory);
await openclaw.rememberTurn({
  role: 'user',
  content: 'Ship after tests pass',
  sessionId: 'general',
});
```

Adapters are intentionally dependency-free. They expose structural interfaces you can wrap into your framework of choice without dragging Vercel, LangChain, or OpenClaw into your runtime.

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

This extends the context window **universally** — the model never holds all memory in context, it navigates it.

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
// → [{ id: '...', label: 'checkpoint-before-update', memoryCount: 47, createdAt: 1745532000 }]
```

### Semantic Search with Vector Embeddings

Enable Ollama-powered vector embeddings for semantic memory search - cosine similarity instead of fragile keyword matching:

```typescript
const memory = new ReMEM({
  dbPath: './remem.db',
  embeddings: {
    enabled: true,                    // enable vector embeddings (v0.3.2)
    baseUrl: 'http://192.168.68.73:11434',  // your Ollama instance
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
```

---

## API Reference

### Constructor

```typescript
const memory = new ReMEM({
  storage: 'sqlite',         // 'sqlite' | 'memory' | 'postgres' (postgres planned)
  dbPath: './remem.db',      // ignored for ':memory:'
  llm: { type: 'bankr', apiKey: '...' },  // optional
  storageConfig: {
    agentId: 'agent-001',   // optional: scope memories to this agent
    userId: 'user-042',     // optional: scope memories to this user
  },
});
```

### Core Operations

```typescript
await memory.init()

// Store
await memory.store({ content: '...', topics: ['tag'] })

// Query
const { results, totalAvailable, tookMs } = await memory.query('query', { limit: 10 })

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
// → { id, label, createdAt, memoryCount, layerCounts }

const restored = await memory.restoreSnapshot(snap.id)
// → number of entries restored

const snapshots = await memory.listSnapshots()
// → [{ id, label, createdAt, memoryCount }]

await memory.deleteSnapshot(snapId)
```

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
  "http://localhost:8787/memory?q=preferences&limit=5"

# Recent
curl -H "Authorization: Bearer $REMEM_TOKEN" \
  "http://localhost:8787/memory/recent?n=10"

# Snapshots
curl -H "Authorization: Bearer $REMEM_TOKEN" \
  "http://localhost:8787/snapshots"
curl -X POST "http://localhost:8787/snapshots" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $REMEM_TOKEN" \
  -d '{"label": "pre-deploy"}'

# Restore / delete snapshots
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
- **Atomic writes** - Data written to `.tmp` then renamed. Crash-safe.
- **WAL mode** - Enables `PRAGMA journal_mode=WAL` for better concurrent write handling.
- **Layer persistence** - `layered_memories` table ensures layer data survives process restarts.
- **Snapshots** - Full memory state serialized to JSON in `snapshots` table. Ideal for backup/restore and migration.
- **Event sourcing** - Append-only `events` table. All mutations logged with timestamps and payloads.

---

## Limitations (v0.3.1)

- **No vector embeddings** - Retrieval uses keyword matching + LLM reranking. For production semantic search, consider pairing with a vector DB (sqlite-vss, pgvector) in a future release.
- **No PostgreSQL backend** - The config schema accepts `postgres` but only `sqlite` and `memory` are implemented.
- **Procedural layer uses keyword triggers** - `fireProcedural()` is simple `ctx.includes(trigger)`. Not a full rule engine.
- **Drift detection pattern-matching is fragile** - Only fires on specific negation patterns (`prefer not`, `no longer`, `changed to`, etc.). LLM fallback requires a separate eval model.
- **Episodic layer TTL is short (1h)** - May need tuning for long-running automation agents.

---

## License

MIT - Built with teeth. 🌑
