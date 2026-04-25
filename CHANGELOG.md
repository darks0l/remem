# Changelog

All notable changes to ReMEM are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.5.0] — 2026-04-25

### Added

- **`EpisodicCapturePipeline`** — dedicated automatic event capture for the episodic memory layer:
  - `capture(event)` / `captureBatch(events)` — buffer events with importance scoring
  - `start()` / `stop()` — manage flush interval (default 1s interval, configurable)
  - **Importance scoring** — type-based base scores (decisions=0.9, goal.achieved=0.95, errors=0.7, etc.) + keyword boosting/reduction + content length factors
  - **Deduplication** — suppresses rapid identical events (2s window, configurable). `noDedup=true` bypasses
  - **Topic extraction** — auto-extracts topics from event type prefix, semantic keywords, and `#hashtags` in content
  - **Batch flushing** — buffers up to 50 events (configurable) before forced flush, or interval-based
  - **Stats** — `getStats()` returns eventCount, droppedCount, bufferSize, started state
  - 24 new tests covering all capture pipeline features

### Changed

- **Test suite expanded** — from 16/16 to 40/40 passing (24 new episodic capture tests)

## [0.4.1] — 2026-04-25

### Added

- **Hybrid keyword + semantic scoring in LayerManager** — `EmbeddingService` is now wired into `LayerManager` constructor. `query()` uses 40% keyword relevance + 60% cosine similarity when embeddings are available. `query()` is now `async` (pre-computes query embedding once).
- **`setEntryEmbedding(id, vector)` on LayerManager** — stores pre-computed embedding vectors for semantic similarity scoring. `forget()` cleans up stored embeddings.
- **`needsEpisodicCompression()` on LayerManager** — moved from ReMEM class so it's accessible on the layer manager directly.
- **Auto-compression on restore** — `enableLayers()` compresses episodic entries if above 80% capacity after restoring from SQLite.
- **Auto-compression on store** — `storeInLayer()` triggers compression check after each store, compressing oldest entries when episodic fills up.
- **Embedding generation on storeInLayer** — generates embedding and stores it in `LayerManager` for hybrid layer scoring.

### Changed

- **`queryLayers()` on ReMEM is now `async`** — mirrors the async `LayerManager.query()`.
- **`layers.query()` in REPL executor is now `async`** — required for async LayerManager query.

## [0.4.0] — 2026-04-25

### Added

- **`MemoryREPL` class** — RLM-style memory navigation. Model writes JavaScript to navigate the memory store programmatically. Executor runs code safely, results feed back into next iteration. Model never sees all memory at once — only constant-size environment metadata.
- **`ReMEM.replNavigate(query)`** — RLM-style memory navigation. Returns `{ answer: string, observations: REPLObservation[] }`. Enables arbitrarily large memory stores without context window overflow.
- **`ReMEM.needsEpisodicCompression()`** — Returns `true` when episodic layer is above 80% capacity.
- **`ReMEM.compressEpisodic(count)`** — LLM-compresses oldest episodic entries into semantic summaries. Meaning preserved instead of lost to TTL eviction. Returns compressed entry info.
- **`LayerManager.getEntriesForCompression(count)`** — Returns oldest episodic entries for compression.
- **`LayerManager.compressToSemantic(entries, model)`** — LLM-compresses episodic entries into a semantic summary entry with `compressed: true` metadata.
- **`LayerManager.query()` temporal validity enforcement** — Entries with `validUntil < now` or `validFrom > now` are now filtered out of query results. Previously the fields existed but were not enforced.

### Changed

- **`query()` uses semantic search** when embeddings are enabled (from v0.3.2).
- **Temporal validity now enforced** — `validFrom`/`validUntil` fields on semantic layer entries are respected in all layer queries.

## [0.3.2] — 2026-04-24

### Added

- **Semantic Search with Vector Embeddings** — `EmbeddingService` generates embeddings via Ollama's `/api/embeddings` endpoint (default: `nomic-embed-text`). Vectors stored as base64url-encoded float32 in new `embeddings` SQLite table.
- **`semanticQuery()` in MemoryStore** — Hybrid search: cosine similarity when embeddings exist, falls back to keyword + access_count scoring when they don't.
- **`EmbeddingConfig` in ReMEM config** — `embeddings: { enabled, baseUrl, model, dimension?, asyncEmbed }` in constructor config.
- **`isEmbeddingEnabled()` and `getEmbeddingService()`** — Public API to inspect embedding configuration.
- **`EmbeddingService.encodeVector()` / `decodeVector()`** — Float32 ↔ base64url encoding for compact SQLite storage.
- **`EmbeddingService.cosineSimilarity()`** — Static method for computing semantic similarity between vectors.

### Changed

- **`query()` now uses semantic search** when embeddings are enabled — queries Ollama for a query vector, then computes cosine similarity against all stored memory vectors.
- **`store()` is now async on embedding** — when `asyncEmbed: true` (default), embedding computation is fire-and-forget (non-blocking). Set `asyncEmbed: false` to block until the vector is stored.

### Technical

- New `embeddings` table with `memory_id`, `vector_base64`, `dimension`, `model`, `embedding_type` columns.
- `embeddings` table indices on `memory_id` and `embedding_type`.
- Auto-detects embedding dimension on first embed call if not explicitly configured.

---

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
