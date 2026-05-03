# ReMEM Benchmarks

This directory contains reproducible benchmark harnesses for ReMEM.

## Context-window suite

`context-window-suite.mjs` measures whether ReMEM can retrieve facts that are deliberately outside a simulated fixed recent-context window.

It is synthetic by design. The goal is not to claim human memory, model intelligence, or universal semantic accuracy. The goal is to measure retrieval behavior under controlled context pressure.

### What it tests

- Deterministic synthetic memory corpus with unique fact IDs, codenames, PINs, and answer tokens.
- Fixed-context baseline using only the newest N records.
- ReMEM retrieval over the full memory store.
- Exact-key lookup, natural-language no-embedding baseline, topic-filtered lookup, and optional semantic embedding retrieval.
- Recall@1, Recall@K, MRR, query latency, store time, and corpus/window pressure.

### Run

Build first:

```bash
npm run build
```

Core context-pressure runs:

```bash
node ./benchmarks/context-window-suite.mjs --memories 2000 --queries 120 --contextEntries 100 --limit 5 --seed 1337
node ./benchmarks/context-window-suite.mjs --memories 10000 --queries 250 --contextEntries 100 --limit 5 --seed 1337
node ./benchmarks/context-window-suite.mjs --memories 50000 --queries 500 --contextEntries 100 --limit 5 --seed 1337
```

Small semantic embedding run with local Ollama:

```bash
node ./benchmarks/context-window-suite.mjs --memories 80 --queries 30 --contextEntries 10 --limit 5 --seed 1337 --embeddings --embeddingBaseUrl http://192.168.68.69:11434 --progress
```

Outputs are written to `benchmarks/results/*.json` and `benchmarks/results/*.md`.

## Claim boundaries

Safe public wording should cite the exact harness, config, and seed.

Do not claim:

- ReMEM universally extends every model's context window.
- 100% semantic recall at large scale.
- Production latency from synthetic in-memory sql.js results.
- Embedding ingestion performance independent of hardware/model.

Do claim, if supported by the included result files:

- In this synthetic fixed-window stress test, fixed recent context had 0% recall because queried facts were outside the window.
- ReMEM exact-codename lookup recovered outside-window records at 100% recall@5 across 50,000 memories / ~3.6M approximate corpus tokens, with ~50ms average query latency in this local in-memory run.
- Small embedding-backed semantic retrieval recovered outside-window records at 100% recall@1/@5 on 80 memories, while exposing embedding ingestion as the current bottleneck.

## Current findings worth improving

- Natural-language core lookup without embeddings is intentionally weak and scored 0% in this harness because the fallback query path is literal substring matching.
- Topic filtering currently uses SQL `LIKE` against serialized topic JSON. Short topic IDs such as `fact-85` can collide with `fact-8588`, which lowered topic-filtered exact-ID recall. This is useful evidence for tightening topic matching before relying on it publicly.
