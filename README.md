# ReMEM — Recursive Memory for AI Agents

> ⚠️ **IN TESTING** — This project is under active development. API surface may change.

> **Recursively extend any LLM's context window by treating memory as an external, queryable environment.**

ReMEM is a lightweight, framework-agnostic memory substrate for AI agents. It applies the core insight from [Recursive Language Models (RLMs)](https://arxiv.org/pdf/2512.24601) — that prompts should be external environment variables, not direct context — to the problem of persistent, queryable agent memory.

Built with TypeScript. Runs anywhere.

---

## Why ReMEM?

LLMs are limited by their context window. Retrieval-Augmented Generation (RAG) helps, but most implementations are fragile keyword-match hacks that lose semantic meaning the moment your query wording diverges from storage.

ReMEM does something different. It gives you:

- **A proper memory store** — SQLite-backed, with event-sourced writes and full-text search
- **An LLM-native query interface** — Describe what you want in plain English; the query engine recursively refines
- **Hierarchical memory** — episodic, semantic, identity, and procedural layers with weighted retrieval
- **Plug-and-play LLM abstraction** — Bankr, OpenAI, Anthropic, Ollama — swap without changing your code
- **Framework-agnostic** — Works as a library (Node.js/Deno), CLI tool, or HTTP service

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   ReMEM                         │
├─────────────────────────────────────────────────┤
│  ReMEM (public API)                             │
│    └─> QueryEngine (RLM-style REPL)            │
│          └─> ModelAbstraction (LLM router)       │
│    └─> MemoryStore (SQLite/sql.js)              │
│          └─> EventStore (append-only events)    │
│    └─> HttpAdapter (optional HTTP interface)    │
└─────────────────────────────────────────────────┘
```

## Quick Start

```typescript
import { ReMEM } from '@darksol/remem';

const memory = new ReMEM({
  storage: 'memory',   // 'memory' | 'file' | 'sqlite'
  dbPath: ':memory:',  // ignored for 'memory' storage
});

await memory.init();

// Store something
await memory.store({
  content: 'Meta prefers dark mode UI and vibe-based communication',
  topics: ['preferences', 'ui'],
});

// Query it
const { results } = await memory.query('what does the user like?');
console.log(results[0].content);
// → "Meta prefers dark mode UI and vibe-based communication"

// Or use it as a CLI
// npx @darksol/remem-cli store --content "..." --topics ui,preferences
// npx @darksol/remem-cli query --text "what does the user like?"
```

## Core Concepts

### Memory Layers

ReMEM maintains four weighted retrieval layers:

| Layer | TTL | Weight | Purpose |
|-------|-----|--------|---------|
| **Episodic** | 1 hour | 0.2 | Recent, raw interactions |
| **Semantic** | 7 days | 0.3 | Synthesized facts and preferences |
| **Identity** | 30 days | 0.5 | Core identity signals |
| **Procedural** | 30 days | 0.4 | Learned behaviors and rules |

### Temporal Validity (Semantic Layer)

Semantic layer entries carry `validFrom`/`validUntil` timestamps. When you correct a fact, the old entry gets marked as superseded with a `validUntil` — ReMEM tracks the full history without losing it.

```typescript
// Self-edit mode: contradictions auto-supersede
memory.enableLayers({ semantic: { selfEdit: true, temporalValidity: true } });

// Store an update — old "dark mode" fact gets superseded automatically
await memory.store({ content: 'Meta prefers light mode now', topics: ['preferences'] });

// Query returns the newest valid entry
const { results } = await memory.queryLayers('Meta UI preferences');
// → "Meta prefers light mode now" (old "dark mode" entry marked superseded)
```

### Procedural Memory

Procedural entries store learned behaviors/rules triggered by keywords:

```typescript
// Store a procedural rule
memory.storeProcedural(
  { content: 'When user mentions Solana, always check Raydium pools first', topics: ['solana', 'rule'] },
  'solana'
);

// Fire rules matching context
const triggered = memory.fireProcedural('User is asking about Solana DeFi');
// → ["When user mentions Solana, always check Raydium pools first"]
```

### Query-Time Recursive Refinement

ReMEM's query engine works like a thinking process, not a lookup:

1. Parse the query — extract intent and constraints
2. First-pass retrieval — fetch candidate memories from all layers
3. Recursive refinement — LLM judges relevance, identifies gaps, re-queries
4. Synthesis — blend results into a coherent response

The number of refinement cycles is configurable (default: 2).

## HTTP Adapter

Expose ReMEM as a microservice:

```typescript
import { createReMEMHttpAdapter } from '@darksol/remem/adapters/http';

const adapter = createReMEMHttpAdapter({ port: 3000 });
await adapter.start();
```

```bash
curl -X POST http://localhost:3000/store \
  -H "Content-Type: application/json" \
  -d '{"content": "...", "topics": ["preferences"]}'

curl "http://localhost:3000/query?text=what+does+the+user+like"
```

## CLI

```bash
npx @darksol/remem store --content "User likes dark mode" --topics preferences
npx @darksol/remem query --text "what does the user like"
npx @darksol/remem recent --limit 10
npx @darksol/remem topics --list
```

## LLM Adapters

ReMEM ships with a `ModelAbstraction` that routes to any LLM:

```typescript
// Bankr (default — uses internal gateway)
const memory = new ReMEM();

// OpenAI
memory.configure({ modelProvider: 'openai', modelApiKey: 'sk-...' });

// Anthropic
memory.configure({ modelProvider: 'anthropic', modelApiKey: 'sk-ant-...' });

// Ollama (local)
memory.configure({ modelProvider: 'ollama', modelBaseUrl: 'http://localhost:11434' });
```

## License

MIT — Built with teeth. 🌑
