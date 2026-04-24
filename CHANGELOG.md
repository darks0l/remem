# Changelog

All notable changes to ReMEM are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.3.1] — 2026-04-24

### Fixed

- **Layers are now persisted to SQLite** — `LayerManager` entries are stored in a `layered_memories` table. Restarting the process no longer wipes layer data. Call `memory.enableLayers()` after `memory.init()` to restore persisted entries.
- **HTTP adapter POST body reader** — `readBody()` was a stub returning empty string. POST to `/memory` now correctly reads the request body.
- **HTTP adapter CORS** — Added `PUT` and `DELETE` to allowed methods, `Authorization` to allowed headers.
- **SQLite atomic writes** — `persist()` now writes to a `.tmp` file then renames, preventing corruption on crash.
- **SQLite WAL mode hint** — Enables `PRAGMA journal_mode=WAL` and `PRAGMA synchronous=NORMAL` on init for better concurrent write handling.
- **Default storage is now SQLite** — Previously defaulted to in-memory. Now correctly defaults to `sqlite` with file `./remem.db`.
- **Agent/user scoping columns** — `memory` and `layered_memories` tables now have `agent_id` and `user_id` columns for multi-agent support.

### Added

- **Snapshot/restore system** — `createSnapshot(label)`, `restoreSnapshot(id)`, `listSnapshots()`, `deleteSnapshot(id)`. Essential for long-running agents that restart or migrate. Persists full layer state to SQLite.
- **`LayerManager.restoreEntry()`** — Restores a `LayeredMemoryEntry` directly into the layer store without re-assigning layer. Used by `ReMEM.init()` to hydrate layers from SQLite.
- **`enableLayers()` is now async** — Can await initialization. Returns after restoring any persisted layer entries.
- **`storeProcedural()` and `storeInLayer()` are now async** — Persist entries to SQLite after storing in the layer manager.

### Security

- Atomic file writes prevent partial/corrupt SQLite files on unexpected process termination.

---

## [0.3.0] — 2026-04-24

### Added

- **Identity Layer** — `ConstitutionManager` + `DriftDetector` + `ConstitutionInjector`. Import identity from SOUL.md/IDENTITY.md, detect drift via pattern matching + LLM self-evaluation, inject corrections into context.
- **Procedural Memory Layer** — Fourth tier. `storeProcedural(input, trigger)` stores triggered rules. `fireProcedural(context)` returns matching rules.
- **Temporal Validity** — Semantic layer entries now carry `validFrom`/`validUntil` timestamps. Old facts are marked superseded instead of deleted.
- **Self-Edit Supersession** — `selfEdit: true` in layer config auto-detects contradictions and chains supersession.
- **Hierarchical Layers** — `LayerManager` with four weighted tiers: episodic (1h TTL), semantic (7d), identity (30d), procedural (30d).
- **Drift Detection** — Dual-method detection: fast pattern matching + LLM self-evaluation. Returns `aligned | minor | moderate | critical`.
- **Event sourcing** — Append-only event log (`memory.stored`, `memory.queried`, `memory.forgotten`, `snapshot.created`, etc.) persisted to SQLite.
- **ModelAbstraction** — Unified LLM interface: Bankr, OpenAI, Anthropic, Ollama.

---

## [0.2.0] — 2026-04-24

### Added

- **Hierarchical LayerManager** — Three-tier weighted retrieval: episodic, semantic, identity.
- **Weighted query scoring** — `layer_weight * content_relevance * importance`.
- **TTL-based eviction** — Automatic expiry of old entries per layer.
- **Auto-assign layer** — Keyword-based layer assignment from content/topics.
- **Importance weighting** — Entries can carry explicit importance scores.
- **`getLayerStats()`** — Per-layer entry counts and configuration.

---

## [0.1.0] — 2026-04-24

### Added

- **MemoryStore** — SQLite/sql.js-backed persistent storage.
- **QueryEngine** — LLM-assisted query decomposition and reranking.
- **Recursive query** — `recursiveQuery()` with iterative refinement loop.
- **HTTP Adapter** — REST API for remote memory access.
- **`rememConfigSchema`** — Zod-validated configuration with `storage`, `llm`, `dbPath`.
