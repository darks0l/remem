# ReMEM Roadmap

## Current focus

ReMEM is in the phase where imported knowledge graphs, durable memory lanes, and runtime surfaces need to feel like one product instead of a pile of adjacent primitives.

## Near-term priorities

### 1. Knowledge graph operations

Keep pushing imported codebase/knowledge graphs from "can ingest" to "actually useful in production".

Work items:

- expand first-class graph inspection beyond `knowledge-overview` / `knowledge-subgraph`
- tighten resource-grant examples for MCP and other scoped graph bridges
- add richer graph filtering by node label, owner, and connection class

### 2. Agent-native context packaging

Make it easier for agents to turn long memory into bounded, reusable prompt context.

Work items:

- improve `contextPack()` defaults for code-heavy and operator-heavy workloads
- add stronger examples for multi-lane recall (`semantic`, `graph`, `procedural`, `recent`)
- ship more opinionated profiles for coding, ops, and research agents

### 3. Release and package polish

Keep the npm package easy to trust and easy to integrate.

Work items:

- keep CLI / HTTP / core runtime contracts aligned with regression coverage
- refresh docs and roadmap/changelog hygiene as features land
- keep packed artifacts lean and verify export/type/runtime alignment before every publish

### 4. Benchmarks and proof

ReMEM should keep earning its claims with public, inspectable evidence.

Work items:

- expand benchmark coverage for larger memory sets and graph-heavy recall
- separate ingestion, indexing, and retrieval costs more clearly in published results
- keep pack, signature, and provenance hygiene strong for public releases

## Release gates

Before publishing:

- `npm run lint`
- `npm test`
- `npm run build`
- `npm pack --dry-run --json`
- `node ~/.git-hooks/secret-scan.js npm`
- confirm `README.md`, `CHANGELOG.md`, and `package.json` reflect the exact version being released
