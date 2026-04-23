# ReMEM — Recursive Memory for AI Agents

**ReMEM** is a framework-agnostic, RLM-style memory substrate for AI agents. Memory is a queryable environment, not a context buffer.

## Core Principle

Instead of cramming memory into a context window, ReMEM provides a **REPL-like query layer** over a persistent memory store. The agent writes programs against memory — querying, traversing, and recursively refining — without filling the context window.

```
Agent → Query Engine → MemoryStore (SQLite)
              ↑
        Model Abstraction
    (Bankr / Ollama / OpenAI / Anthropic)
```

## Features

- **RLM-Style Query Engine** — `memory.query()`, `memory.getRecent()`, `memory.getByTopic()`
- **Symbolic Memory Navigation** — agent writes programs against memory
- **Model Agnostic** — plug in any LLM: Bankr, OpenAI, Anthropic, Ollama
- **Framework Agnostic** — HTTP adapter, easy to extend to LangChain/AutoGen/CrewAI
- **Persistent Storage** — SQLite by default, swap for Postgres/other
- **Event Sourcing** — full audit trail of memory operations

## Quick Start

```typescript
import { ReMEM } from '@darksol/remem';

const memory = new ReMEM({
  storage: 'sqlite',
  llm: {
    type: 'bankr',           // or 'openai', 'anthropic', 'ollama'
    apiKey: process.env.BANKR_API_KEY,
  },
});

await memory.store({
  content: "User prefers dark mode UI",
  topics: ['preferences', 'ui'],
});

const results = await memory.query("What UI preferences has the user mentioned?");
// → returns structured, relevant entries
```

## Architecture

- `MemoryStore` — SQLite-backed document store with event log
- `QueryEngine` — REPL-style query interface
- `ModelAbstraction` — unified LLM interface (Bankr, Ollama, OpenAI, Anthropic)
- `Adapter` — framework connector interface (HTTP, LangChain, AutoGen, CrewAI)

## Status

v0.1.0 — scaffolding, core types + interfaces defined.

## License

MIT
