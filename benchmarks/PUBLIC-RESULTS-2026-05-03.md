# ReMEM Context Window Benchmark Results — 2026-05-03

These are reproducible synthetic benchmarks for `@darksol/remem` v0.6.5.

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

## Results summary

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
| Topic-filtered exact ID | 0% | 90.83% | 90.83% | 0.908 | 1.61ms | 1.77ms |

### Small semantic embedding run, 80 memories

Source file: `benchmarks/results/context-window-2026-05-03T14-52-48-397Z-80m-30q.json`

- Approx corpus: **5,681 tokens**
- Simulated fixed window: **711 tokens**
- Corpus/window pressure: **8.0x**
- Queries: **30**, all outside the fixed window
- Embeddings: Ollama `nomic-embed-text` at `http://192.168.68.69:11434`

| Scenario | Fixed recall@1 | ReMEM recall@1 | ReMEM recall@5 | MRR | Avg query | p95 query | Store time |
|---|---:|---:|---:|---:|---:|---:|---:|
| Exact codename | 0% | 100% | 100% | 1.000 | 0.42ms | 0.84ms | 27.94ms |
| Natural language, no embeddings | 0% | 0% | 0% | 0.000 | 0.24ms | 0.26ms | 16.74ms |
| Topic-filtered exact ID | 0% | 93.33% | 93.33% | 0.933 | 0.29ms | 0.46ms | 13.36ms |
| Semantic embeddings | 0% | 100% | 100% | 1.000 | 32.93ms | 39.16ms | 4,743.33ms |

## Interpretation

1. **Fixed context fails by construction.** Every query targets a fact outside the simulated recent window, so fixed-context recall is 0%.
2. **Exact external memory scales into a multi-million-token stored corpus in this benchmark.** Exact-codename retrieval hit 100% recall@5 at 50,000 memories / ~3.6M approximate corpus tokens, with ~50ms average query latency in this local in-memory run.
3. **This is not the same as increasing the model's native context window.** ReMEM keeps the prompt small and retrieves relevant external memories when asked.
4. **Natural-language recall needs semantic retrieval or better lexical scoring.** The no-embedding natural-language baseline scored 0%. This is an honest limitation of the current fallback query path, not a result to hide.
5. **Semantic embeddings work in the small run.** The 80-memory embedding run reached 100% recall@1/@5 on natural semantic queries, but embedding ingestion took ~4.7s for 80 memories. Larger semantic benchmarks need concurrent/cached embedding support before making large-scale semantic claims.
6. **Topic filtering needs tightening.** Topic filters currently use SQL `LIKE` over serialized JSON topics, so short IDs such as `fact-85` can collide with `fact-8588`. This explains the 89-93% topic-filtered exact-ID recall and gives us a concrete improvement target.

## Safe public claim

> In a reproducible synthetic fixed-window stress test, ReMEM retrieved facts stored outside a simulated active context window from a ~3.6M-token stored memory corpus. Fixed recent context scored 0% recall because the facts were outside the window; ReMEM exact-codename lookup reached 100% recall@5 with ~50ms average query latency in a local in-memory run. A small embedding-backed semantic run reached 100% recall@1/@5, while exposing embedding ingestion as the bottleneck we need to optimize next.

Short version:

> ReMEM does not make the model's native context window bigger. It gives agents a searchable external memory layer, letting them work over far more history than fits in the prompt.

## Not safe to claim yet

- “ReMEM gives any model infinite context.”
- “100% semantic recall at millions of tokens.”
- “Production latency is 50ms.” These numbers are local/in-memory and synthetic.
- “No degraded service” without qualification. Exact lookup stayed strong; semantic ingestion still needs optimization.
- “Topic filtering is exact.” It currently needs a fix.

## Next serious benchmark work

- Add exact JSON topic matching instead of serialized `LIKE` topic filters.
- Add a benchmark mode that precomputes/caches embeddings.
- Add concurrent embedding ingestion controls.
- Add a larger semantic run after ingestion is improved.
- Add real-world transcript/document memory datasets once we have a privacy-safe corpus.
