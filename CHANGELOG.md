# Changelog

All notable changes to ReMEM are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added

- Added knowledge resource URI and required-scope metadata for external graph artifacts and imported codebase graphs so MCP/resource bridges can validate resource identity and permissions before exposing graph memory snapshots.
- Added `authorizeKnowledgeResourceAccess()` plus URI/scope schemas for lightweight grant checks in host integrations.
- Added optional `resourceGrant` filtering to codebase graph subgraph and `Codebase Graph as memory` snapshots so adapter output omits graph nodes and links outside the caller's granted scopes.

## [0.19.0] - 2026-06-29

### Added

- Expanded `createCodebaseMemoryAdapter()` with `subgraph`, `explain`, `entrypoints`, `owners`, `deadzones`, and `overview` helpers for agent-native code graph inspection.
- Added typed codebase graph option/result exports so downstream tools can consume graph context, owner summaries, entrypoint candidates, and isolated-node diagnostics directly.
- Added weighted code graph ingestion and traversal: portable knowledge nodes/edges can carry explicit weights, ReMEM infers sensible defaults for code node/edge types, and neighbor traversal now factors node and connection weights into graph recall scores.
- Added the `Codebase Graph as memory` snapshot surface with selectable connection filters, display modes (`memory`, `graph`, `context`, `inventory`), dense connection output, and LLM-ready context snapshots for whole-repo codebase ingestion.

### Fixed

- `searchGraph()` now honors the top-level `project` option by translating it into ReMEM metadata filters.

## [0.18.0] - 2026-06-26

### Added

- Added `memory.registerKnowledgeArtifact()` to store durable pointers to external knowledge graph artifacts such as `.codebase-memory/graph.db.zst`.
- Added `memory.ingestKnowledgeGraph()` to import portable node/edge graphs as ReMEM memories and traversable memory links.
- Added `createCodebaseMemoryAdapter()` with `registerArtifact`, `ingestGraph`, `searchGraph`, `architecture`, `impact`, and prompt-context helpers for codebase intelligence tools.
- Added `remem knowledge-artifact` and `remem knowledge-ingest` for CLI-driven artifact registration and JSON/JSON.GZ graph ingestion.
- Added `POST /knowledge/artifact` and `POST /knowledge/ingest` for HTTP runtimes and MCP bridges.
- Added regression coverage for knowledge artifact registration, graph ingestion, link traversal, and the codebase adapter.

### Changed

- README now documents external/codebase knowledge interop alongside storage maintenance, adapters, and advanced HTTP routes.

## [0.17.0] - 2026-06-26

### Added

- Added `memory.storageMaintenance()` for dry-run capable storage cleanup of expired layered memories, dangling memory links, orphan embeddings, and optional SQLite compaction.
- Added `remem storage-maintenance --json` for agent-readable storage maintenance reports.
- Added `POST /storage/maintenance` for HTTP runtimes that need to inspect or apply storage cleanup remotely.
- Added regression coverage for the core storage maintenance API, CLI JSON contract, and HTTP route.

### Changed

- README now documents storage maintenance alongside stats, health triage, snapshots, and advanced HTTP routes.

## [0.16.0] - 2026-06-25

### Added

- Added `memory.health()` for first-class memory triage reports with score, status, checks, and concrete maintenance recommendations.
- Added `remem health --json` and `POST /memory/health` for agent-readable health checks covering snapshot coverage/freshness, exact duplicate content, stale never-recalled memories, topic coverage, and layer pressure.
- Added health regression coverage across the core API, CLI, and HTTP adapter.

### Changed

- README now documents the health command as the maintenance companion to stats, context packs, dream passes, and consolidation.

## [0.15.0] - 2026-06-23

### Added

- Added `memory.stats()` for compact memory inventory reports with core memory count, layer count, snapshot count, event count, top topics, and oldest/newest memory timestamps.
- Added `remem stats --json` for agent-readable memory shape checks from the CLI.

### Changed

- CLI help now includes the stats command alongside status, diagnostics, recall, context-pack, and dream workflows.

## [0.14.0] - 2026-06-22

### Added

- Added first-class Context Pack generation via `memory.contextPack()`, `remem context-pack`, and `POST /memory/context-pack` for bounded prompt-ready recall packets.
- Added Context Pack regression coverage across the core API, CLI, and HTTP adapter.

### Fixed

- Layered memory schemas now tolerate persisted `null` supersession fields from existing stores when matching procedural memories.

## [0.13.0] - 2026-06-19

### Added

- Added `remem doctor` for package/runtime/config/storage/snapshot diagnostics with machine-readable JSON output.
- Added `remem validate-config` for schema validation of generated or hand-written `remem.config.json` files without echoing secret-bearing config values.
- Added `remem init --check` / `--doctor` support so generated starter artifacts can be validated immediately after creation.
- Added production deployment recipes for SQLite local agents, Postgres shared memory, pgvector acceleration, and agent-safe recall profiles.
- Added task-oriented OpenClaw and Hermes quickstarts under `docs/`.
- Added cached embedding support to the context-window benchmark harness via `--embeddingCache`, with cache hit/miss/write counts included in semantic scenario metrics.
- Added a v0.13.0 roadmap focused on release hygiene, adoption, diagnostics, setup validation, and stronger benchmark credibility.

### Changed

- Expanded benchmark documentation with clearer public claim boundaries and the next semantic benchmark refresh plan.
- Updated the npm package allowlist so `ROADMAP.md` and quickstart docs ship with the package.

## [0.12.9] - 2026-06-18

### Added

- Added a machine-readable `--json` mode across the new `remem` CLI surface so agent/runtime integrations can consume stable command output.
- Added a first-class `remem smoke-check` command with real runtime verification, including snapshot roundtrip checks plus optional embedding and LLM endpoint probes.
- Added non-interactive `remem init` artifact generation for starter config, runtime-specific adapter snippets, and `.env.example` scaffolding.
- Added regression coverage for CLI help/status/query flows, smoke-check output, and generated init artifacts.
- Added a first-class long-memory `dream` workflow on the core ReMEM API and CLI (`remem dream`) that synthesizes durable themes, actions, and source provenance from `identity`, `semantic`, and `procedural` memory.

### Changed

- Extracted setup/onboarding generation into shared helpers so the terminal UI and CLI init lane use the same config, snippet, and guidance surface.
- Tightened the terminal setup flow so smoke checks now run real verification instead of only reporting static capability summaries.
- Positioned ReMEM more explicitly as a memory system that can synthesize from long-term memory, not only store, query, and consolidate it.

## [0.12.7] - 2026-06-10

### Added

- Added a first-class `remem` CLI with direct commands for memory writes, layered/procedural workflows, namespace recall, snapshots, and consolidation runs.
- Added a terminal-native `remem ui` / `remem init` setup console focused on human onboarding instead of day-to-day agent memory operations.
- Added runtime-specific setup guidance and starter snippets for OpenClaw and Hermes integrations.

### Changed

- Refocused the terminal UI around runtime selection, storage/embedding/model setup, adapter onboarding, starter config generation, smoke checks, and execution planning.
- Clarified README and CLI help text so the UI is positioned as a setup/integration surface while agents keep using the direct CLI/API.

## [0.12.5] - 2026-06-09

### Added

- Added first-class consolidation workflows via `runConsolidation()` so ReMEM can run dedupe, conflict resolution, episodic promotion, summary generation, and optional procedural promotion through one API.
- Added LLM-backed topic-cluster summary generation that stores durable semantic memories with provenance metadata (`summaryOf`, `summaryTopic`, `sourceLayers`, `consolidatedAt`).
- Added optional procedural promotion from generated summaries so repeated operational patterns can be converted into procedural memory automatically.
- Added regression coverage for full consolidation workflows, including generated summary storage and procedural promotion.

### Changed

- Promoted the consolidation subsystem from a lower-level helper to a product-level workflow surface suitable for long-running agent memory maintenance.
- Updated README docs to present ReMEM as a self-curating memory system, not just a retrieval layer.

## [0.12.0] - 2026-06-06

### Added

- Added shared-memory namespace APIs on the core ReMEM surface: `storeShared()`, `queryNamespace()`, and `getRecentInNamespace()`.
- Added smart multi-lane recall via `smartRecall()` with semantic, graph, procedural, and recent-context fusion profiles.
- Added Hermes as a first-class harness adapter alongside OpenClaw with helpers for turns, artifacts, decisions, procedures, and shared namespace recall.
- Added HTTP routes for shared-memory and smart-recall workflows.
- Added regression coverage for shared namespace visibility, Hermes adapter flows, smart recall, and HTTP namespace routes.

### Changed

- Upgraded the LangGraph-style adapter to use namespace-aware shared/private memory semantics instead of plain topic-only scoping.
- Refreshed README examples, release metadata, and package docs to reflect shared memory lanes, Hermes support, and smart recall.

## [0.11.0] - 2026-06-02

### Added

- Added a GitHub Actions CI workflow that runs install, lint, test, build, benchmark-artifact verification, and npm pack validation on pushes and pull requests.
- Added regression coverage proving scoped memory visibility so agent/user-specific records stay isolated while globally scoped memories remain readable.
- Added baseline-vs-current benchmark delta reporting to the public benchmark manifest and markdown summary.

### Changed

- Enforced agent/user scoping on ReMEM read paths across query, semantic query, recent/topic recall, direct lookup, and forget operations in both SQLite and PostgreSQL stores.
- Updated the public benchmark generator to refresh the README benchmark summary from checked-in result artifacts instead of leaving the package README hand-maintained.
- Refreshed generated dist output, benchmark artifacts, and package metadata for the scope-aware memory release.

## [0.10.0] - 2026-05-31

### Changed

- Corrected benchmark-facing docs after the exact-topic-match fix and added fresh 2026-05-31 validation result artifacts for 2k / 10k / 50k context-window reruns.
- Updated README benchmark claims to distinguish historical May 3 baseline numbers from current-source validation results.
- Added a generated benchmark-summary workflow (`npm run bench:public-results`) so public benchmark claims can be regenerated directly from checked-in raw JSON artifacts instead of hand-editing the summary file.
- Added benchmark runtime provenance to raw JSON artifacts and surfaced it in the public-results docs; also ship the summary generator script in the npm package so benchmark claims can be regenerated from packaged artifacts.
- Added a machine-readable public benchmark manifest (`benchmarks/PUBLIC-RESULTS-2026-05-03.json`) plus tests that validate both the published claim structure and the SHA-256 fingerprints of each checked-in raw benchmark artifact.
- Replaced the README's hardcoded passing-test-count badge with a non-rotating status badge and added docs hygiene coverage so public package metadata does not silently drift as the test suite grows.
- Refactored the benchmark public-results generator into a deterministic write path with an output-directory option, then added regression coverage that re-runs the generator and verifies the checked-in markdown + JSON artifacts still match the raw benchmark results.

## [0.9.0] - 2026-05-27

### Added

- Added metadata-aware query filtering across SQLite, Postgres, layered memory, and semantic recall paths.
- Added metadata passthrough on `QueryResult` so callers can preserve provenance, namespace, source, and structured operational hints.
- Added HTTP query support for structured `metadata` filters and adapter-level metadata-aware context rendering.

### Changed

- LangGraph and OpenClaw adapters now preserve source/namespace hints in recall output for cleaner production memory workflows.
- README/examples/release metadata now reflect the metadata-aware recall release and current passing test count.

## [0.8.5] - 2026-05-25

### Added

- Added weighted graph recall details to `queryWithNeighbors()`, including optional traversal path metadata and configurable link-type weights.
- Added richer procedural matching with structured triggers (`terms`, `phrases`, `topics`, `regex`, `priority`, `minScore`) plus public `matchProcedural()` results.
- Added `auditIdentityAlignment()` for one-call identity drift evaluation + corrective injection output.
- Expanded the OpenClaw adapter with `rememberDecision()`, `rememberProcedure()`, and `recallProjectContext()` helpers for session/project memory workflows.
- Added advanced HTTP routes for graph recall, procedural matching, and identity audit when the full ReMEM runtime is provided to `HttpAdapter`.
- Added native vector-search introspection via `usesNativeVectorSearch()` and health-surface reporting for pgvector-backed deployments.

### Changed

- Improved pattern-based identity drift detection to catch soft contradiction/override language instead of only primitive negation hits.
- pgvector initialization now graduates from passive compatibility to an explicit accelerated lane with extension detection, backfill, and ivfflat bootstrap.
- README/examples/release metadata now reflect the agent-memory operations release and current passing test count.

## [0.8.0] - 2026-05-23

### Added

- Added typed memory links across SQLite and PostgreSQL stores with `createLink`, `getLinks`, `deleteLink`, and scoped lookup support.
- Added public ReMEM APIs for linked-memory workflows: `linkMemories`, `getLinkedMemories`, `unlinkMemories`, and `queryWithNeighbors`.
- Added exported link schemas/types plus a default link taxonomy (`about`, `caused_by`, `contradicts`, `supports`, `follows`, `same_session`, `same_project`, `same_person`).
- Added snapshot/export/restore support for linked memory graphs so relationships survive backup and migration flows.
- Added regression coverage for link creation, neighbor traversal, and export surface checks.

### Changed

- Snapshot payload version now uses `0.8.0` for linked-memory capable snapshots.
- README and release metadata now reflect the linked-memory release and current passing test count.

## [0.7.0] - 2026-05-10

### Changed

- Minor release pass to roll up the latest benchmark/documentation packaging updates under a fresh publish version.
- Refreshed release metadata and README version references for the current npm/GitHub ship.

## [0.6.6] - 2026-05-03

### Added

- Added reproducible `benchmarks/context-window-suite.mjs` for fixed-context-window pressure testing.
- Added raw benchmark result artifacts for 2k, 10k, 50k, and small semantic-embedding runs.
- Added public-facing benchmark documentation with explicit claim boundaries and limitations.

### Changed

- README now summarizes the benchmark honestly: ReMEM provides searchable external memory beyond the active prompt window, not native infinite context.
- npm package now includes benchmark harness/docs/results for reproducibility.

## [0.6.5] - 2026-05-02

### Added

- Added `PostgresMemoryStore` with optional `pg` peer dependency for server/shared deployments.
- Added `storage: 'postgres'` support in `ReMEM`, with `postgres.connectionString`, `schema`, `tablePrefix`, `ssl`, and injectable `pool` config.
- Added PostgreSQL schema bootstrap for core memory, layered memory, snapshots, embeddings, and events tables.
- Added JSONB topic/metadata storage plus indexes for scoped agent/user queries and topic filters.
- Exported storage interfaces/types from the package root: `MemoryStoreLike`, `SnapshotMeta`, `SnapshotExport`, and `StoreMemoryOptions`.

### Changed

- Generalized internal store consumers (`QueryEngine`, `HttpAdapter`, REPL, duplication helpers, `ReMEM`) to depend on `MemoryStoreLike` instead of the SQLite-only class.
- Snapshot payload version now uses `0.6.5` when created by the Postgres backend.

## [0.6.2] - 2026-05-02

### Added

- Added SHA-256 snapshot checksums and checksum verification before restore/export/import.
- Added portable snapshot `exportSnapshot(id)` and `importSnapshot(snapshot)` APIs.
- Added HTTP snapshot export/import routes.

### Fixed

- Fixed snapshot/restore to include and restore core `store()` memories, not just layered memories.
- Snapshot metadata now counts both core memories and layered memories.
- Snapshot payloads now preserve core memory ids, topics, metadata, timestamps, and access counts for migration-safe restores.
- Added regression coverage for core memory snapshot restore and snapshot export/import checksum verification.
- `storage: 'postgres'` now throws a clear not-implemented error instead of behaving like SQLite.
- Refreshed package lock metadata to match the published package version.

## [0.6.1] - 2026-04-25

### Fixed

- Exported documented public APIs from the package root: `HttpAdapter`, `MemoryConsolidator`, and `EpisodicCapturePipeline`.
- Fixed optional `topics` handling when embeddings are enabled. `store()` and `storeInLayer()` now normalize input before embedding generation.
- Fixed `HttpAdapter` typing by storing the optional model field on the class.
- Hardened `HttpAdapter`: localhost binding by default, optional bearer auth, configurable CORS origin, body size limit, input validation, proper 4xx/201 status codes, and snapshot routes.
- Persisted consolidation-generated layered embeddings through the store when supported.
- Tightened release gate: publish now requires lint, tests, build, and pack dry-run.
- Added dependency-free framework adapters: `createVercelAIAdapter`, `createLangGraphStoreAdapter`, and `createOpenClawAdapter`.
- Added package export, HTTP adapter, and framework adapter tests.
- Restricted npm package contents to built artifacts and docs.

## [0.6.0] - 2026-04-25

### Added

- **`MemoryConsolidator`** - memory deduplication, conflict resolution, and cross-layer promotion:
  - `findSimilarPairs(layer)` - find near-duplicate entries using embeddings or keyword similarity
  - `deduplicateLayer(layer)` - merge + delete near-duplicates (configurable similarity threshold 0.85)
  - `detectConflicts(layer)` - detect contradictory entries via negation pattern matching
  - `resolveConflicts(layer)` - mark older contradictions as superseded with temporal validity
  - `promoteFrequentEpisodic()` - promote episodic entries with high access count (>=5) to semantic layer after 10 minutes
  - `consolidateAll(layers?)` - full periodic consolidation over all layers
  - Configurable merge strategies: `newer_wins`, `older_wins`, `concatenate`, `supersede`
  - 21 new tests covering all consolidation features

### Changed

- **Test suite expanded** - from 40/40 to 61/61 passing (21 new consolidation tests)

## [0.5.0] - 2026-04-25

### Added

- **`EpisodicCapturePipeline`** - dedicated automatic event capture for the episodic memory layer:
  - `capture(event)` / `captureBatch(events)` - buffer events with importance scoring
  - `start()` / `stop()` - manage flush interval (default 1s interval, configurable)
  - **Importance scoring** - type-based base scores (decisions=0.9, goal.achieved=0.95, errors=0.7, etc.) + keyword boosting/reduction + content length factors
  - **Deduplication** - suppresses rapid identical events (2s window, configurable). `noDedup=true` bypasses
  - **Topic extraction** - auto-extracts topics from event type prefix, semantic keywords, and `#hashtags` in content
  - **Batch flushing** - buffers up to 50 events (configurable) before forced flush, or interval-based
  - **Stats** - `getStats()` returns eventCount, droppedCount, bufferSize, started state
  - 24 new tests covering all capture pipeline features

### Changed

- **Test suite expanded** - from 16/16 to 40/40 passing (24 new episodic capture tests)

## [0.4.1] - 2026-04-25

### Added

- **Hybrid keyword + semantic scoring in LayerManager** - `EmbeddingService` is now wired into `LayerManager` constructor. `query()` uses 40% keyword relevance + 60% cosine similarity when embeddings are available. `query()` is now `async` (pre-computes query embedding once).
- **`setEntryEmbedding(id, vector)` on LayerManager** - stores pre-computed embedding vectors for semantic similarity scoring. `forget()` cleans up stored embeddings.
- **`needsEpisodicCompression()` on LayerManager** - moved from ReMEM class so it's accessible on the layer manager directly.
- **Auto-compression on restore** - `enableLayers()` compresses episodic entries if above 80% capacity after restoring from SQLite.
- **Auto-compression on store** - `storeInLayer()` triggers compression check after each store, compressing oldest entries when episodic fills up.
- **Embedding generation on storeInLayer** - generates embedding and stores it in `LayerManager` for hybrid layer scoring.

### Changed

- **`queryLayers()` on ReMEM is now `async`** - mirrors the async `LayerManager.query()`.
- **`layers.query()` in REPL executor is now `async`** - required for async LayerManager query.

## [0.4.0] - 2026-04-25

### Added

- **`MemoryREPL` class** - RLM-style memory navigation. Model writes JavaScript to navigate the memory store programmatically. Executor runs code safely, results feed back into next iteration. Model never sees all memory at once - only constant-size environment metadata.
- **`ReMEM.replNavigate(query)`** - RLM-style memory navigation. Returns `{ answer: string, observations: REPLObservation[] }`. Enables arbitrarily large memory stores without context window overflow.
- **`ReMEM.needsEpisodicCompression()`** - Returns `true` when episodic layer is above 80% capacity.
- **`ReMEM.compressEpisodic(count)`** - LLM-compresses oldest episodic entries into semantic summaries. Meaning preserved instead of lost to TTL eviction. Returns compressed entry info.
- **`LayerManager.getEntriesForCompression(count)`** - Returns oldest episodic entries for compression.
- **`LayerManager.compressToSemantic(entries, model)`** - LLM-compresses episodic entries into a semantic summary entry with `compressed: true` metadata.
- **`LayerManager.query()` temporal validity enforcement** - Entries with `validUntil < now` or `validFrom > now` are now filtered out of query results. Previously the fields existed but were not enforced.

### Changed

- **`query()` uses semantic search** when embeddings are enabled (from v0.3.2).
- **Temporal validity now enforced** - `validFrom`/`validUntil` fields on semantic layer entries are respected in all layer queries.

## [0.3.2] - 2026-04-24

### Added

- **Semantic Search with Vector Embeddings** - `EmbeddingService` generates embeddings via Ollama's `/api/embeddings` endpoint (default: `nomic-embed-text`). Vectors stored as base64url-encoded float32 in new `embeddings` SQLite table.
- **`semanticQuery()` in MemoryStore** - Hybrid search: cosine similarity when embeddings exist, falls back to keyword + access_count scoring when they don't.
- **`EmbeddingConfig` in ReMEM config** - `embeddings: { enabled, baseUrl, model, dimension?, asyncEmbed }` in constructor config.
- **`isEmbeddingEnabled()` and `getEmbeddingService()`** - Public API to inspect embedding configuration.
- **`EmbeddingService.encodeVector()` / `decodeVector()`** - Float32 ↔ base64url encoding for compact SQLite storage.
- **`EmbeddingService.cosineSimilarity()`** - Static method for computing semantic similarity between vectors.

### Changed

- **`query()` now uses semantic search** when embeddings are enabled - queries Ollama for a query vector, then computes cosine similarity against all stored memory vectors.
- **`store()` is now async on embedding** - when `asyncEmbed: true` (default), embedding computation is fire-and-forget (non-blocking). Set `asyncEmbed: false` to block until the vector is stored.

### Technical

- New `embeddings` table with `memory_id`, `vector_base64`, `dimension`, `model`, `embedding_type` columns.
- `embeddings` table indices on `memory_id` and `embedding_type`.
- Auto-detects embedding dimension on first embed call if not explicitly configured.

---

## [0.3.1] - 2026-04-24

### Fixed

- **Layers are now persisted to SQLite** - `LayerManager` entries are stored in a `layered_memories` table. Restarting the process no longer wipes layer data. Call `memory.enableLayers()` after `memory.init()` to restore persisted entries.
- **HTTP adapter POST body reader** - `readBody()` was a stub returning empty string. POST to `/memory` now correctly reads the request body.
- **HTTP adapter CORS** - Added `PUT` and `DELETE` to allowed methods, `Authorization` to allowed headers.
- **SQLite atomic writes** - `persist()` now writes to a `.tmp` file then renames, preventing corruption on crash.
- **SQLite WAL mode hint** - Enables `PRAGMA journal_mode=WAL` and `PRAGMA synchronous=NORMAL` on init for better concurrent write handling.
- **Default storage is now SQLite** - Previously defaulted to in-memory. Now correctly defaults to `sqlite` with file `./remem.db`.
- **Agent/user scoping columns** - `memory` and `layered_memories` tables now have `agent_id` and `user_id` columns for multi-agent support.

### Added

- **Snapshot/restore system** - `createSnapshot(label)`, `restoreSnapshot(id)`, `listSnapshots()`, `deleteSnapshot(id)`. Essential for long-running agents that restart or migrate. Persists full layer state to SQLite.
- **`LayerManager.restoreEntry()`** - Restores a `LayeredMemoryEntry` directly into the layer store without re-assigning layer. Used by `ReMEM.init()` to hydrate layers from SQLite.
- **`enableLayers()` is now async** - Can await initialization. Returns after restoring any persisted layer entries.
- **`storeProcedural()` and `storeInLayer()` are now async** - Persist entries to SQLite after storing in the layer manager.

### Security

- Atomic file writes prevent partial/corrupt SQLite files on unexpected process termination.

---

## [0.3.0] - 2026-04-24

### Added

- **Identity Layer** - `ConstitutionManager` + `DriftDetector` + `ConstitutionInjector`. Import identity from SOUL.md/IDENTITY.md, detect drift via pattern matching + LLM self-evaluation, inject corrections into context.
- **Procedural Memory Layer** - Fourth tier. `storeProcedural(input, trigger)` stores triggered rules. `fireProcedural(context)` returns matching rules.
- **Temporal Validity** - Semantic layer entries now carry `validFrom`/`validUntil` timestamps. Old facts are marked superseded instead of deleted.
- **Self-Edit Supersession** - `selfEdit: true` in layer config auto-detects contradictions and chains supersession.
- **Hierarchical Layers** - `LayerManager` with four weighted tiers: episodic (1h TTL), semantic (7d), identity (30d), procedural (30d).
- **Drift Detection** - Dual-method detection: fast pattern matching + LLM self-evaluation. Returns `aligned | minor | moderate | critical`.
- **Event sourcing** - Append-only event log (`memory.stored`, `memory.queried`, `memory.forgotten`, `snapshot.created`, etc.) persisted to SQLite.
- **ModelAbstraction** - Unified LLM interface: Bankr, OpenAI, Anthropic, Ollama.

---

## [0.2.0] - 2026-04-24

### Added

- **Hierarchical LayerManager** - Three-tier weighted retrieval: episodic, semantic, identity.
- **Weighted query scoring** - `layer_weight * content_relevance * importance`.
- **TTL-based eviction** - Automatic expiry of old entries per layer.
- **Auto-assign layer** - Keyword-based layer assignment from content/topics.
- **Importance weighting** - Entries can carry explicit importance scores.
- **`getLayerStats()`** - Per-layer entry counts and configuration.

---

## [0.1.0] - 2026-04-24

### Added

- **MemoryStore** - SQLite/sql.js-backed persistent storage.
- **QueryEngine** - LLM-assisted query decomposition and reranking.
- **Recursive query** - `recursiveQuery()` with iterative refinement loop.
- **HTTP Adapter** - REST API for remote memory access.
- **`rememConfigSchema`** - Zod-validated configuration with `storage`, `llm`, `dbPath`.
