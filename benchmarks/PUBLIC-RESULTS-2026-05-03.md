# ReMEM Context Window Benchmark Results - 2026-05-03

These are reproducible synthetic benchmarks for `@darksol/remem`.

The test asks a narrow question:

> Can ReMEM retrieve facts that are deliberately outside a simulated fixed recent-context window?

It does **not** claim that ReMEM changes a model's native context length. It tests a practical agent pattern: keep the model's active context small, store/retrieve memory externally, and pull back the right fact when needed.

## Harness

- Script: `benchmarks/context-window-suite.mjs`
- Storage: in-memory sql.js via ReMEM `storage: 'memory'`
- Dataset: deterministic synthetic records with unique fact IDs, codenames, PINs, checksums, and answer tokens
- Fixed-context baseline: newest N records only
- Query sampling: only records outside that fixed window
- Metrics: fixed recall@1, ReMEM recall@1, ReMEM recall@K, MRR, store time, average/p50/p95 query latency
- Seed: `1337`
- This file is generated from raw result JSON by `benchmarks/generate-public-results.mjs`
- Machine-readable companion: `benchmarks/PUBLIC-RESULTS-2026-05-03.json`

## Reproducibility notes

- Each raw JSON result now carries runtime metadata (node, platform, arch, CLI args, cwd) so benchmark claims can be tied back to the execution environment instead of only the high-level config.
- Historical May 3 artifacts predate that metadata field, so they remain valid for the original scores but are less provenance-rich than the latest validation reruns.
- Latest 50k validation runtime: runtime metadata unavailable.

## Results summary

This file serves two purposes:

1. Preserve the original May 3 benchmark artifacts that backed the first public benchmark release.
2. Record the latest validation reruns on current source after the exact-topic-match fix, so benchmark claims do not mix historical bug-affected topic-filter numbers with current behavior.

### Historical baseline: May 3 release pass

### Core retrieval, 50,000 memories / multi-million-token corpus

Source file: `benchmarks/results/context-window-2026-05-03T15-00-07-882Z-50000m-500q.json`

- Approx corpus: **3,625,526 tokens**
- Simulated fixed window: **7,264 tokens**
- Corpus/window pressure: **499.16x**
- Queries: **500**, all outside the fixed window

| Scenario | Fixed recall@1 | ReMEM recall@1 | ReMEM recall@5 | MRR | Avg query | p95 query |
|---|---:|---:|---:|---:|---:|---:|
| Exact codename | 0% | 99.4% | 100% | 0.997 | 49.98ms | 61.14ms |
| Natural language, no embeddings | 0% | 0% | 0% | 0.000 | 42.21ms | 42.78ms |
| Topic-filtered exact ID | 0% | 89.6% | 89.6% | 0.896 | 43.35ms | 44.01ms |

### Core retrieval, 10,000 memories

Source file: `benchmarks/results/context-window-2026-05-03T14-52-32-122Z-10000m-250q.json`

- Approx corpus: **720,631 tokens**
- Simulated fixed window: **7,214 tokens**
- Corpus/window pressure: **99.9x**
- Queries: **250**, all outside the fixed window

| Scenario | Fixed recall@1 | ReMEM recall@1 | ReMEM recall@5 | MRR | Avg query | p95 query |
|---|---:|---:|---:|---:|---:|---:|
| Exact codename | 0% | 99.2% | 100% | 0.996 | 10.00ms | 12.41ms |
| Natural language, no embeddings | 0% | 0% | 0% | 0.000 | 8.24ms | 8.67ms |
| Topic-filtered exact ID | 0% | 89.6% | 89.6% | 0.896 | 8.82ms | 9.17ms |

### Core retrieval, 2,000 memories

Source file: `benchmarks/results/context-window-2026-05-03T14-52-06-069Z-2000m-120q.json`

- Approx corpus: **143,650 tokens**
- Simulated fixed window: **7,214 tokens**
- Corpus/window pressure: **19.91x**
- Queries: **120**, all outside the fixed window

| Scenario | Fixed recall@1 | ReMEM recall@1 | ReMEM recall@5 | MRR | Avg query | p95 query |
|---|---:|---:|---:|---:|---:|---:|
| Exact codename | 0% | 100% | 100% | 1.000 | 1.94ms | 2.49ms |
| Natural language, no embeddings | 0% | 0% | 0% | 0.000 | 1.46ms | 1.59ms |
| Topic-filtered exact ID | 0% | 90.8% | 90.8% | 0.908 | 1.61ms | 1.77ms |

### Small semantic embedding run, 80 memories

Source file: `benchmarks/results/context-window-2026-05-03T14-52-48-397Z-80m-30q.json`

- Approx corpus: **5,681 tokens**
- Simulated fixed window: **711 tokens**
- Corpus/window pressure: **8x**
- Queries: **30**, all outside the fixed window
- Embeddings: Ollama `nomic-embed-text` at `http://192.168.68.69:11434`

| Scenario | Fixed recall@1 | ReMEM recall@1 | ReMEM recall@5 | MRR | Avg query | p95 query | Store time |
|---|---:|---:|---:|---:|---:|---:|---:|
| Exact codename | 0% | 100% | 100% | 1.000 | 0.42ms | 0.84ms | 27.94ms |
| Natural language, no embeddings | 0% | 0% | 0% | 0.000 | 0.24ms | 0.26ms | 16.74ms |
| Topic-filtered exact ID | 0% | 93.3% | 93.3% | 0.933 | 0.29ms | 0.46ms | 13.36ms |
| Semantic embeddings | 0% | 100% | 100% | 1.000 | 32.93ms | 39.16ms | 4743.33ms |

## Validation rerun on current source

These reruns were executed after the exact-topic-match fix landed in source. Their role is narrow but important: validate whether the old topic-filtered undercount was real, and replace bug-affected exact-ID numbers with current-source results.

### Corrected topic-filtered exact-ID results

| Corpus size | Source file | Fixed recall@1 | ReMEM exact-codename recall@1 | ReMEM exact-codename recall@5 | ReMEM topic-filtered exact-ID recall@1/@5 | Avg exact-codename query | Avg topic-filtered query |
|---|---|---:|---:|---:|---:|---:|---:|
| 2,000 memories | `benchmarks/results/context-window-2026-05-31T02-31-09-008Z-2000m-120q.json` | 0% | 100% | 100% | 100% | 1.01ms | 0.84ms |
| 10,000 memories | `benchmarks/results/context-window-2026-05-31T02-35-33-564Z-10000m-250q.json` | 0% | 99.2% | 100% | 100% | 4.95ms | 4.25ms |
| 50,000 memories | `benchmarks/results/context-window-2026-05-31T02-36-21-642Z-50000m-500q.json` | 0% | 99.4% | 100% | 100% | 25.55ms | 22.25ms |

## Interpretation

1. **Fixed context fails by construction.** Every query targets a fact outside the simulated recent window, so fixed-context recall is 0%.
2. **Exact external memory scales into a multi-million-token stored corpus in this benchmark.** Exact-codename retrieval hit 100% recall@5 at 50,000 memories / ~3.6M approximate corpus tokens, with ~25.55ms average query latency in the latest 50k local in-memory validation pass.
3. **This is not the same as increasing the model's native context window.** ReMEM keeps the prompt small and retrieves relevant external memories when asked.
4. **Natural-language recall needs semantic retrieval or better lexical scoring.** The no-embedding natural-language baseline scored 0%. This is an honest limitation of the current fallback query path, not a result to hide.
5. **Semantic embeddings work in the small run.** The 80-memory embedding run reached 100% recall@1/@5 on natural semantic queries, but embedding ingestion took ~4743ms for 80 memories. Larger semantic benchmarks need concurrent/cached embedding support before making large-scale semantic claims.
6. **The topic-filter undercount was real and is now corrected.** The original 89-93% topic-filtered exact-ID scores were caused by serialized-topic substring collisions. After the exact-match fix, the latest reruns returned 100% topic-filtered exact-ID recall across 2k, 10k, and 50k corpora in this harness.

## Safe public claim

> In a reproducible synthetic fixed-window stress test, ReMEM retrieved facts stored outside a simulated active context window from a ~3.6M-token stored memory corpus. Fixed recent context scored 0% recall because the facts were outside the window; ReMEM exact-codename lookup reached 100% recall@5 with ~25.55ms average query latency in the latest local in-memory validation run. After the exact-topic-match fix, topic-filtered exact-ID retrieval also reached 100% recall@1/@5 across 2k, 10k, and 50k validation reruns. A small embedding-backed semantic run reached 100% recall@1/@5, while exposing embedding ingestion as the bottleneck we need to optimize next.

Short version:

> ReMEM does not make the model's native context window bigger. It gives agents a searchable external memory layer, letting them work over far more history than fits in the prompt.

## Not safe to claim yet

- “ReMEM gives any model infinite context.”
- “100% semantic recall at millions of tokens.”
- “Production latency is 26ms.” These numbers are local/in-memory and synthetic.
- “No degraded service” without qualification. Exact lookup stayed strong; semantic ingestion still needs optimization.
- “Natural-language retrieval works without embeddings.” It does not in this harness.

## Next serious benchmark work

- Add a benchmark mode that precomputes/caches embeddings.
- Add concurrent embedding ingestion controls.
- Add a larger semantic run after ingestion is improved.
- Add real-world transcript/document memory datasets once we have a privacy-safe corpus.
- Consider splitting benchmark docs into `historical-baseline` vs `current-validation` files if we want cleaner citation paths for README/npm consumers.
