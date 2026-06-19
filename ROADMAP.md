# ReMEM Roadmap

## v0.13.0 - Release Hygiene and Adoption

Status: shipped in `v0.13.0`.

Goal: make ReMEM easier to install, verify, and trust in real agent deployments without expanding the API surface faster than the docs and smoke checks can support.

### 1. `remem doctor`

Add a dedicated diagnostic command that checks the full local/runtime setup and exits with machine-readable status.

Expected checks:

- package version, Node version, and resolved binary path
- database path writability and snapshot roundtrip
- layer restore health
- optional Postgres connectivity
- optional pgvector availability and native vector-search status
- optional Ollama embedding endpoint health
- optional LLM endpoint health
- generated config validity

Expected outputs:

- human-readable terminal summary
- `--json` mode for agents and CI
- non-zero exit codes for hard failures
- warnings for optional capabilities that are unavailable

### 2. Better Setup Validation

Tighten setup flows so generated artifacts can be validated immediately.

Work items:

- add a validation command for `remem.config.json`
- have `remem init` optionally run a smoke check after writing starter files
- add tests that verify generated OpenClaw and Hermes snippets stay in sync with public adapter APIs
- document the clean path from `remem init` to first stored/queryable memory

### 3. OpenClaw and Hermes Quickstarts

Turn the current adapter examples into task-oriented quickstarts.

OpenClaw quickstart should cover:

- remembering turns, decisions, procedures, and project context
- scoped recall across session/project boundaries
- using `smartRecall()` when the agent needs recent + durable + procedural context

Hermes quickstart should cover:

- thread/run memory
- artifacts
- shared namespaces
- team/project recall lanes

### 4. Production Recipe Hardening

Keep production guidance close to real deployment questions.

Work items:

- expand SQLite, Postgres, pgvector, and HTTP adapter recipes with copy/paste starter configs
- add security notes for auth tokens, public HTTP exposure, and tenant scoping
- add snapshot/migration guidance for long-running agents
- add a compact release checklist for package consumers upgrading between minor versions

### 5. Benchmark Refresh

Move benchmark credibility forward without over-claiming.

Work items:

- add cached/precomputed embedding support to the benchmark harness
- run larger semantic retrieval passes at 2k and 10k memory sizes
- separate ingestion timing from query latency in generated reports
- keep raw artifact hashes and public manifest verification as release gates

### Release Gates

Before publishing v0.13.0:

- `npm run lint`
- `npm test`
- `npm run build`
- `npm run bench:public-results:verify`
- `npm pack --dry-run --json`
- `node ~/.git-hooks/secret-scan.js npm`
- README and CHANGELOG reflect the exact package version
