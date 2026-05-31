#!/usr/bin/env node
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const resultsDir = path.join(__dirname, 'results');
const outputPath = path.join(__dirname, 'PUBLIC-RESULTS-2026-05-03.md');
const outputJsonPath = path.join(__dirname, 'PUBLIC-RESULTS-2026-05-03.json');

function pct(value) {
  return `${(value * 100).toFixed(value === 1 || value === 0 ? 0 : 1)}%`;
}

function ms(value) {
  return `${Number(value).toFixed(2)}ms`;
}

function scenarioByName(result, name) {
  return result.scenarios.find((scenario) => scenario.name === name);
}

function readResults() {
  return readdirSync(resultsDir)
    .filter((name) => name.endsWith('.json') && name.startsWith('context-window-'))
    .map((name) => {
      const fullPath = path.join(resultsDir, name);
      return {
        file: `benchmarks/results/${name}`,
        data: JSON.parse(readFileSync(fullPath, 'utf8')),
      };
    })
    .sort((a, b) => a.data.timestamp.localeCompare(b.data.timestamp));
}

function groupRuns(results) {
  const byMemoryCount = new Map();
  for (const result of results) {
    const key = result.data.config.totalMemories;
    if (!byMemoryCount.has(key)) byMemoryCount.set(key, []);
    byMemoryCount.get(key).push(result);
  }
  return byMemoryCount;
}

function findRun(runs, predicate) {
  const match = runs.find(predicate);
  if (!match) throw new Error('Expected benchmark run not found');
  return match;
}

function labelForScenario(name) {
  switch (name) {
    case exactNames.exact:
      return 'Exact codename';
    case exactNames.natural:
      return 'Natural language, no embeddings';
    case exactNames.topic:
      return 'Topic-filtered exact ID';
    case exactNames.semantic:
      return 'Semantic embeddings';
    default:
      return name;
  }
}

function renderScenarioRow(result, name) {
  const scenario = scenarioByName(result.data, name);
  if (!scenario) throw new Error(`Missing scenario ${name} in ${result.file}`);
  return `| ${labelForScenario(name)} | ${pct(scenario.metrics.fixedContextRecallAt1)} | ${pct(scenario.metrics.rememRecallAt1)} | ${pct(scenario.metrics.rememRecallAtK)} | ${scenario.metrics.rememMRR.toFixed(3)} | ${ms(scenario.metrics.avgQueryMs)} | ${ms(scenario.metrics.p95QueryMs)} |`;
}

function renderCorpusSection(title, run) {
  const { corpusApproxTokens, fixedWindowApproxTokens, effectiveCorpusToWindowMultiple } = run.data.contextPressure;
  const environment = run.data.environment ?? {};
  return [
    `### ${title}`,
    '',
    `Source file: \`${run.file}\``,
    '',
    `- Approx corpus: **${corpusApproxTokens.toLocaleString()} tokens**`,
    `- Simulated fixed window: **${fixedWindowApproxTokens.toLocaleString()} tokens**`,
    `- Corpus/window pressure: **${effectiveCorpusToWindowMultiple}x**`,
    `- Queries: **${run.data.config.queryCount}**, all outside the fixed window`,
    ...(environment.node ? [`- Runtime: **Node ${environment.node}** on **${environment.platform}/${environment.arch}**`] : []),
    '',
    '| Scenario | Fixed recall@1 | ReMEM recall@1 | ReMEM recall@5 | MRR | Avg query | p95 query |',
    '|---|---:|---:|---:|---:|---:|---:|',
    renderScenarioRow(run, exactNames.exact),
    renderScenarioRow(run, exactNames.natural),
    renderScenarioRow(run, exactNames.topic),
  ].join('\n');
}

function scenarioManifest(run, scenarioName) {
  const scenario = scenarioByName(run.data, scenarioName);
  if (!scenario) throw new Error(`Missing scenario ${scenarioName} in ${run.file}`);
  return {
    name: scenario.name,
    label: labelForScenario(scenarioName),
    sourceFile: run.file,
    queryStyle: scenario.queryStyle,
    queryTopics: scenario.queryTopics,
    embeddings: scenario.embeddings,
    metrics: scenario.metrics,
  };
}

const results = readResults();
const grouped = groupRuns(results);

const historical50k = findRun(grouped.get(50000) ?? [], (run) => run.data.timestamp.startsWith('2026-05-03') && run.data.scenarios.length === 3);
const historical10k = findRun(grouped.get(10000) ?? [], (run) => run.data.timestamp.startsWith('2026-05-03'));
const historical2k = findRun(grouped.get(2000) ?? [], (run) => run.data.timestamp.startsWith('2026-05-03'));
const historicalSemantic80 = findRun(grouped.get(80) ?? [], (run) => run.data.timestamp.startsWith('2026-05-03'));

const latest2k = (grouped.get(2000) ?? []).at(-1);
const latest10k = (grouped.get(10000) ?? []).at(-1);
const latest50k = (grouped.get(50000) ?? []).at(-1);

if (!latest2k || !latest10k || !latest50k) {
  throw new Error('Missing latest validation reruns for 2k / 10k / 50k');
}

const exactNames = {
  exact: 'core exact codename',
  natural: 'core natural language no embeddings',
  topic: 'core topic-filtered exact id',
  semantic: 'core semantic embeddings',
};

const semanticScenario = scenarioByName(historicalSemantic80.data, exactNames.semantic);
const semanticTopicScenario = scenarioByName(historicalSemantic80.data, exactNames.topic);
const semanticExactScenario = scenarioByName(historicalSemantic80.data, exactNames.exact);
const semanticNaturalScenario = scenarioByName(historicalSemantic80.data, exactNames.natural);
const latest50kEnvironment = latest50k.data.environment ?? {};

const latestRuns = [latest2k, latest10k, latest50k];
const latestValidationRows = latestRuns.map((run) => {
  const exact = scenarioByName(run.data, exactNames.exact);
  const topic = scenarioByName(run.data, exactNames.topic);
  if (!exact || !topic) throw new Error(`Missing validation scenarios in ${run.file}`);
  return {
    corpusSize: run.data.config.totalMemories,
    sourceFile: run.file,
    fixedRecallAt1: exact.metrics.fixedContextRecallAt1,
    exactCodenameRecallAt1: exact.metrics.rememRecallAt1,
    exactCodenameRecallAt5: exact.metrics.rememRecallAtK,
    topicFilteredExactIdRecallAt1: topic.metrics.rememRecallAt1,
    topicFilteredExactIdRecallAt5: topic.metrics.rememRecallAtK,
    avgExactCodenameQueryMs: exact.metrics.avgQueryMs,
    avgTopicFilteredQueryMs: topic.metrics.avgQueryMs,
  };
});
const latestRows = latestValidationRows.map((row) =>
  `| ${row.corpusSize.toLocaleString()} memories | \`${row.sourceFile}\` | ${pct(row.fixedRecallAt1)} | ${pct(row.exactCodenameRecallAt1)} | ${pct(row.exactCodenameRecallAt5)} | ${pct(row.topicFilteredExactIdRecallAt1)} | ${ms(row.avgExactCodenameQueryMs)} | ${ms(row.avgTopicFilteredQueryMs)} |`
);

const safeClaim50k = scenarioByName(latest50k.data, exactNames.exact);
if (!safeClaim50k || !semanticScenario || !semanticTopicScenario || !semanticExactScenario || !semanticNaturalScenario) {
  throw new Error('Expected benchmark scenarios missing from result artifacts');
}

const publicResultsManifest = {
  generatedAt: new Date().toISOString(),
  generator: 'benchmarks/generate-public-results.mjs',
  benchmark: 'remem-context-window-suite-v1',
  claimBoundary: {
    summary: 'Synthetic fixed-window stress test measuring retrieval of facts deliberately placed outside a simulated active context window.',
    safeShortClaim: "ReMEM does not make the model's native context window bigger. It gives agents a searchable external memory layer, letting them work over far more history than fits in the prompt.",
    notSafeToClaim: [
      'ReMEM gives any model infinite context.',
      '100% semantic recall at millions of tokens.',
      `Production latency is ${safeClaim50k.metrics.avgQueryMs.toFixed(0)}ms.`,
      'Natural-language retrieval works without embeddings.',
    ],
  },
  harness: {
    script: 'benchmarks/context-window-suite.mjs',
    storage: "in-memory sql.js via ReMEM storage: 'memory'",
    seed: 1337,
    metrics: ['fixed recall@1', 'ReMEM recall@1', 'ReMEM recall@K', 'MRR', 'store time', 'average/p50/p95 query latency'],
  },
  historicalBaseline: {
    releasedAt: '2026-05-03',
    runs: {
      memories2000: {
        sourceFile: historical2k.file,
        contextPressure: historical2k.data.contextPressure,
        queryCount: historical2k.data.config.queryCount,
        scenarios: [
          scenarioManifest(historical2k, exactNames.exact),
          scenarioManifest(historical2k, exactNames.natural),
          scenarioManifest(historical2k, exactNames.topic),
        ],
      },
      memories10000: {
        sourceFile: historical10k.file,
        contextPressure: historical10k.data.contextPressure,
        queryCount: historical10k.data.config.queryCount,
        scenarios: [
          scenarioManifest(historical10k, exactNames.exact),
          scenarioManifest(historical10k, exactNames.natural),
          scenarioManifest(historical10k, exactNames.topic),
        ],
      },
      memories50000: {
        sourceFile: historical50k.file,
        contextPressure: historical50k.data.contextPressure,
        queryCount: historical50k.data.config.queryCount,
        scenarios: [
          scenarioManifest(historical50k, exactNames.exact),
          scenarioManifest(historical50k, exactNames.natural),
          scenarioManifest(historical50k, exactNames.topic),
        ],
      },
      semantic80: {
        sourceFile: historicalSemantic80.file,
        contextPressure: historicalSemantic80.data.contextPressure,
        queryCount: historicalSemantic80.data.config.queryCount,
        scenarios: [
          scenarioManifest(historicalSemantic80, exactNames.exact),
          scenarioManifest(historicalSemantic80, exactNames.natural),
          scenarioManifest(historicalSemantic80, exactNames.topic),
          scenarioManifest(historicalSemantic80, exactNames.semantic),
        ],
      },
    },
  },
  currentValidation: {
    rerunDate: '2026-05-31',
    latest50kEnvironment,
    correctedTopicFilteredExactId: latestValidationRows,
  },
};

const output = `# ReMEM Context Window Benchmark Results - 2026-05-03

These are reproducible synthetic benchmarks for \`@darksol/remem\`.

The test asks a narrow question:

> Can ReMEM retrieve facts that are deliberately outside a simulated fixed recent-context window?

It does **not** claim that ReMEM changes a model's native context length. It tests a practical agent pattern: keep the model's active context small, store/retrieve memory externally, and pull back the right fact when needed.

## Harness

- Script: \`benchmarks/context-window-suite.mjs\`
- Storage: in-memory sql.js via ReMEM \`storage: 'memory'\`
- Dataset: deterministic synthetic records with unique fact IDs, codenames, PINs, checksums, and answer tokens
- Fixed-context baseline: newest N records only
- Query sampling: only records outside that fixed window
- Metrics: fixed recall@1, ReMEM recall@1, ReMEM recall@K, MRR, store time, average/p50/p95 query latency
- Seed: \`1337\`
- This file is generated from raw result JSON by \`benchmarks/generate-public-results.mjs\`
- Machine-readable companion: \`benchmarks/PUBLIC-RESULTS-2026-05-03.json\`

## Reproducibility notes

- Each raw JSON result now carries runtime metadata (node, platform, arch, CLI args, cwd) so benchmark claims can be tied back to the execution environment instead of only the high-level config.
- Historical May 3 artifacts predate that metadata field, so they remain valid for the original scores but are less provenance-rich than the latest validation reruns.
- Latest 50k validation runtime: ${latest50kEnvironment.node ? `**Node ${latest50kEnvironment.node}** on **${latest50kEnvironment.platform}/${latest50kEnvironment.arch}**` : 'runtime metadata unavailable'}.

## Results summary

This file serves two purposes:

1. Preserve the original May 3 benchmark artifacts that backed the first public benchmark release.
2. Record the latest validation reruns on current source after the exact-topic-match fix, so benchmark claims do not mix historical bug-affected topic-filter numbers with current behavior.

### Historical baseline: May 3 release pass

${renderCorpusSection('Core retrieval, 50,000 memories / multi-million-token corpus', historical50k)}

${renderCorpusSection('Core retrieval, 10,000 memories', historical10k)}

${renderCorpusSection('Core retrieval, 2,000 memories', historical2k)}

### Small semantic embedding run, 80 memories

Source file: \`${historicalSemantic80.file}\`

- Approx corpus: **${historicalSemantic80.data.contextPressure.corpusApproxTokens.toLocaleString()} tokens**
- Simulated fixed window: **${historicalSemantic80.data.contextPressure.fixedWindowApproxTokens.toLocaleString()} tokens**
- Corpus/window pressure: **${historicalSemantic80.data.contextPressure.effectiveCorpusToWindowMultiple}x**
- Queries: **${historicalSemantic80.data.config.queryCount}**, all outside the fixed window
- Embeddings: Ollama \`${semanticScenario.embeddings?.model}\` at \`${semanticScenario.embeddings?.baseUrl}\`

| Scenario | Fixed recall@1 | ReMEM recall@1 | ReMEM recall@5 | MRR | Avg query | p95 query | Store time |
|---|---:|---:|---:|---:|---:|---:|---:|
| Exact codename | ${pct(semanticExactScenario.metrics.fixedContextRecallAt1)} | ${pct(semanticExactScenario.metrics.rememRecallAt1)} | ${pct(semanticExactScenario.metrics.rememRecallAtK)} | ${semanticExactScenario.metrics.rememMRR.toFixed(3)} | ${ms(semanticExactScenario.metrics.avgQueryMs)} | ${ms(semanticExactScenario.metrics.p95QueryMs)} | ${ms(semanticExactScenario.metrics.storeMs)} |
| Natural language, no embeddings | ${pct(semanticNaturalScenario.metrics.fixedContextRecallAt1)} | ${pct(semanticNaturalScenario.metrics.rememRecallAt1)} | ${pct(semanticNaturalScenario.metrics.rememRecallAtK)} | ${semanticNaturalScenario.metrics.rememMRR.toFixed(3)} | ${ms(semanticNaturalScenario.metrics.avgQueryMs)} | ${ms(semanticNaturalScenario.metrics.p95QueryMs)} | ${ms(semanticNaturalScenario.metrics.storeMs)} |
| Topic-filtered exact ID | ${pct(semanticTopicScenario.metrics.fixedContextRecallAt1)} | ${pct(semanticTopicScenario.metrics.rememRecallAt1)} | ${pct(semanticTopicScenario.metrics.rememRecallAtK)} | ${semanticTopicScenario.metrics.rememMRR.toFixed(3)} | ${ms(semanticTopicScenario.metrics.avgQueryMs)} | ${ms(semanticTopicScenario.metrics.p95QueryMs)} | ${ms(semanticTopicScenario.metrics.storeMs)} |
| Semantic embeddings | ${pct(semanticScenario.metrics.fixedContextRecallAt1)} | ${pct(semanticScenario.metrics.rememRecallAt1)} | ${pct(semanticScenario.metrics.rememRecallAtK)} | ${semanticScenario.metrics.rememMRR.toFixed(3)} | ${ms(semanticScenario.metrics.avgQueryMs)} | ${ms(semanticScenario.metrics.p95QueryMs)} | ${ms(semanticScenario.metrics.storeMs)} |

## Validation rerun on current source

These reruns were executed after the exact-topic-match fix landed in source. Their role is narrow but important: validate whether the old topic-filtered undercount was real, and replace bug-affected exact-ID numbers with current-source results.

### Corrected topic-filtered exact-ID results

| Corpus size | Source file | Fixed recall@1 | ReMEM exact-codename recall@1 | ReMEM exact-codename recall@5 | ReMEM topic-filtered exact-ID recall@1/@5 | Avg exact-codename query | Avg topic-filtered query |
|---|---|---:|---:|---:|---:|---:|---:|
${latestRows.join('\n')}

## Interpretation

1. **Fixed context fails by construction.** Every query targets a fact outside the simulated recent window, so fixed-context recall is 0%.
2. **Exact external memory scales into a multi-million-token stored corpus in this benchmark.** Exact-codename retrieval hit 100% recall@5 at 50,000 memories / ~3.6M approximate corpus tokens, with ~${safeClaim50k.metrics.avgQueryMs.toFixed(2)}ms average query latency in the latest 50k local in-memory validation pass.
3. **This is not the same as increasing the model's native context window.** ReMEM keeps the prompt small and retrieves relevant external memories when asked.
4. **Natural-language recall needs semantic retrieval or better lexical scoring.** The no-embedding natural-language baseline scored 0%. This is an honest limitation of the current fallback query path, not a result to hide.
5. **Semantic embeddings work in the small run.** The 80-memory embedding run reached 100% recall@1/@5 on natural semantic queries, but embedding ingestion took ~${semanticScenario.metrics.storeMs.toFixed(0)}ms for 80 memories. Larger semantic benchmarks need concurrent/cached embedding support before making large-scale semantic claims.
6. **The topic-filter undercount was real and is now corrected.** The original 89-93% topic-filtered exact-ID scores were caused by serialized-topic substring collisions. After the exact-match fix, the latest reruns returned 100% topic-filtered exact-ID recall across 2k, 10k, and 50k corpora in this harness.

## Safe public claim

> In a reproducible synthetic fixed-window stress test, ReMEM retrieved facts stored outside a simulated active context window from a ~3.6M-token stored memory corpus. Fixed recent context scored 0% recall because the facts were outside the window; ReMEM exact-codename lookup reached 100% recall@5 with ~${safeClaim50k.metrics.avgQueryMs.toFixed(2)}ms average query latency in the latest local in-memory validation run. After the exact-topic-match fix, topic-filtered exact-ID retrieval also reached 100% recall@1/@5 across 2k, 10k, and 50k validation reruns. A small embedding-backed semantic run reached 100% recall@1/@5, while exposing embedding ingestion as the bottleneck we need to optimize next.

Short version:

> ReMEM does not make the model's native context window bigger. It gives agents a searchable external memory layer, letting them work over far more history than fits in the prompt.

## Not safe to claim yet

- “ReMEM gives any model infinite context.”
- “100% semantic recall at millions of tokens.”
- “Production latency is ${safeClaim50k.metrics.avgQueryMs.toFixed(0)}ms.” These numbers are local/in-memory and synthetic.
- “No degraded service” without qualification. Exact lookup stayed strong; semantic ingestion still needs optimization.
- “Natural-language retrieval works without embeddings.” It does not in this harness.

## Next serious benchmark work

- Add a benchmark mode that precomputes/caches embeddings.
- Add concurrent embedding ingestion controls.
- Add a larger semantic run after ingestion is improved.
- Add real-world transcript/document memory datasets once we have a privacy-safe corpus.
- Consider splitting benchmark docs into \`historical-baseline\` vs \`current-validation\` files if we want cleaner citation paths for README/npm consumers.
`;

writeFileSync(outputPath, output);
writeFileSync(outputJsonPath, `${JSON.stringify(publicResultsManifest, null, 2)}\n`);
console.log(`Wrote ${outputPath}`);
console.log(`Wrote ${outputJsonPath}`);
