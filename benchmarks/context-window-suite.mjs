#!/usr/bin/env node
/**
 * ReMEM context-window benchmark suite.
 *
 * Goal: produce defensible public numbers for memory retrieval under simulated
 * context pressure. The benchmark is synthetic by design, deterministic by seed,
 * and separates exact-key lookup, lexical retrieval, and semantic embedding
 * retrieval instead of blending them into one marketing number.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { ReMEM } from '../dist/index.mjs';

const args = new Map();
for (let i = 2; i < process.argv.length; i++) {
  const key = process.argv[i];
  if (!key.startsWith('--')) continue;
  const next = process.argv[i + 1];
  if (!next || next.startsWith('--')) args.set(key.slice(2), true);
  else args.set(key.slice(2), next), i++;
}
const get = (name, fallback) => args.has(name) ? args.get(name) : fallback;
const num = (name, fallback) => Number(get(name, fallback));
const flag = (name) => args.get(name) === true;

function mulberry32(seed) {
  return function rand() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pick(rand, arr) { return arr[Math.floor(rand() * arr.length)]; }
function approxTokens(text) { return Math.ceil(String(text).length / 4); }
function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))];
}
function mean(values) { return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0; }
function round(n, d = 4) { return Number(n.toFixed(d)); }
function nowSlug() { return new Date().toISOString().replace(/[:.]/g, '-'); }

function makeCorpus(total, seed) {
  const rand = mulberry32(seed);
  const domains = ['wallet', 'agent', 'card', 'oracle', 'router', 'terminal', 'memory', 'vault', 'bridge', 'indexer'];
  const adjectives = ['black', 'silver', 'neon', 'quiet', 'rapid', 'ghost', 'amber', 'crimson', 'violet', 'iron', 'lunar', 'signal'];
  const nouns = ['raven', 'claw', 'ember', 'cipher', 'anchor', 'mirror', 'switch', 'dagger', 'comet', 'engine', 'shard'];
  const intents = ['recover', 'audit', 'route', 'verify', 'hydrate', 'compact', 'restore', 'settle'];
  const corpus = [];
  for (let i = 0; i < total; i++) {
    const domain = pick(rand, domains);
    const code = `${pick(rand, adjectives)}-${pick(rand, nouns)}-${String(i).padStart(5, '0')}`;
    const pin = Math.floor(100000 + rand() * 900000).toString();
    const checksum = Math.floor(10000000 + rand() * 90000000).toString(16);
    const intent = pick(rand, intents);
    const decoy = `${pick(rand, adjectives)}-${pick(rand, nouns)}-${String(total - i).padStart(5, '0')}`;
    corpus.push({
      id: `fact-${i}`,
      domain,
      code,
      pin,
      checksum,
      intent,
      topics: ['benchmark', domain, intent, `fact-${i}`],
      content: [
        `FACT_ID fact-${i}: The ${domain} ${intent} test record has recovery codename ${code}.`,
        `Its verification PIN is ${pin}, checksum ${checksum}, and canonical answer token ANSWER_${i}_${pin}.`,
        `This record is intentionally mixed with decoy phrase ${decoy} to test retrieval precision.`
      ].join(' '),
    });
  }
  return corpus;
}

function fixedContextAnswer(recentWindow, item) {
  return recentWindow.some((x) => x.id === item.id);
}

function buildQuery(item, style) {
  if (style === 'exact-code') return item.code;
  if (style === 'exact-id') return item.id;
  if (style === 'semantic') return `Which stored ${item.domain} ${item.intent} memory contains the verification PIN for codename ${item.code}?`;
  return `What is the verification PIN for ${item.domain} record ${item.id} with codename ${item.code}?`;
}

function sampleOutsideWindow(corpus, queryCount, contextEntries, seed) {
  const rand = mulberry32(seed ^ 0x9E3779B9);
  const eligibleMax = Math.max(0, corpus.length - contextEntries - 1);
  const sampled = new Set();
  const target = Math.min(queryCount, eligibleMax + 1);
  while (sampled.size < target) sampled.add(Math.floor(rand() * (eligibleMax + 1)));
  return [...sampled].map((i) => corpus[i]);
}

async function createMemory({ embeddings, embeddingBaseUrl, embeddingModel }) {
  const memory = new ReMEM({
    storage: 'memory',
    dbPath: ':memory:',
    ...(embeddings ? { embeddings: { enabled: true, baseUrl: embeddingBaseUrl, model: embeddingModel } } : {}),
  });
  await memory.init();
  return memory;
}

async function runScenario({ name, corpus, queryItems, recentWindow, queryStyle, limit, embeddings, embeddingBaseUrl, embeddingModel, queryTopics }) {
  const memory = await createMemory({ embeddings, embeddingBaseUrl, embeddingModel });
  const storeStart = performance.now();
  let storeFailures = 0;
  for (let i = 0; i < corpus.length; i++) {
    const item = corpus[i];
    try {
      await memory.store({
        content: item.content,
        topics: item.topics,
        metadata: { factId: item.id, pin: item.pin, code: item.code, asyncEmbed: false },
      });
    } catch {
      storeFailures++;
    }
    if (flag('progress') && (i + 1) % Math.max(1, Math.floor(corpus.length / 10)) === 0) {
      console.error(`[${name}] stored ${i + 1}/${corpus.length}`);
    }
  }
  const storeMs = performance.now() - storeStart;

  const latencies = [];
  let fixedHits = 0, top1 = 0, topK = 0, mrr = 0, totalReturned = 0;
  const misses = [];
  for (const item of queryItems) {
    if (fixedContextAnswer(recentWindow, item)) fixedHits++;
    const query = buildQuery(item, queryStyle);
    const t0 = performance.now();
    const res = await memory.query(query, { limit, ...(queryTopics ? { topics: [item.id] } : {}) });
    latencies.push(performance.now() - t0);
    const results = res.results ?? [];
    totalReturned += results.length;
    const rank = results.findIndex((r) => r.content.includes(`FACT_ID ${item.id}:`) && r.content.includes(`ANSWER_${item.id.slice(5)}_${item.pin}`));
    if (rank === 0) top1++;
    if (rank >= 0 && rank < limit) {
      topK++;
      mrr += 1 / (rank + 1);
    } else if (misses.length < 5) {
      misses.push({ id: item.id, query, expectedPin: item.pin, top: results.slice(0, 3).map((r) => r.content.slice(0, 180)) });
    }
  }
  await memory.close?.();

  const qn = Math.max(1, queryItems.length);
  return {
    name,
    queryStyle,
    embeddings: embeddings ? { baseUrl: embeddingBaseUrl, model: embeddingModel } : false,
    queryTopics,
    metrics: {
      fixedContextRecallAt1: round(fixedHits / qn),
      rememRecallAt1: round(top1 / qn),
      rememRecallAtK: round(topK / qn),
      rememMRR: round(mrr / qn),
      avgReturned: round(totalReturned / qn, 2),
      storeMs: round(storeMs, 2),
      avgStoreMsPerMemory: round(storeMs / corpus.length, 2),
      storeFailures,
      avgQueryMs: round(mean(latencies), 2),
      p50QueryMs: round(percentile(latencies, 0.5), 2),
      p95QueryMs: round(percentile(latencies, 0.95), 2),
    },
    misses,
  };
}

function markdown(result) {
  const lines = [];
  lines.push(`# ReMEM Context Window Benchmark — ${result.timestamp.slice(0, 10)}`);
  lines.push('');
  lines.push('Synthetic, deterministic benchmark for testing retrieval from memory entries that are deliberately outside a simulated fixed recent-context window.');
  lines.push('');
  lines.push('## Configuration');
  lines.push('');
  lines.push(`- Total memories: ${result.config.totalMemories.toLocaleString()}`);
  lines.push(`- Query count: ${result.config.queryCount}`);
  lines.push(`- Simulated fixed window: ${result.config.contextEntries} recent entries`);
  lines.push(`- Approx corpus tokens: ${result.contextPressure.corpusApproxTokens.toLocaleString()}`);
  lines.push(`- Approx fixed-window tokens: ${result.contextPressure.fixedWindowApproxTokens.toLocaleString()}`);
  lines.push(`- Corpus/window pressure: ${result.contextPressure.effectiveCorpusToWindowMultiple}x`);
  lines.push(`- Seed: ${result.config.seed}`);
  lines.push('');
  lines.push('## Results');
  lines.push('');
  lines.push('| Scenario | Query style | Embeddings | Fixed recall@1 | ReMEM recall@1 | ReMEM recall@K | MRR | Avg query | p95 query | Store time |');
  lines.push('|---|---|---:|---:|---:|---:|---:|---:|---:|---:|');
  for (const s of result.scenarios) {
    lines.push(`| ${s.name} | ${s.queryStyle} | ${s.embeddings ? s.embeddings.model : 'no'} | ${(s.metrics.fixedContextRecallAt1 * 100).toFixed(1)}% | ${(s.metrics.rememRecallAt1 * 100).toFixed(1)}% | ${(s.metrics.rememRecallAtK * 100).toFixed(1)}% | ${s.metrics.rememMRR.toFixed(3)} | ${s.metrics.avgQueryMs}ms | ${s.metrics.p95QueryMs}ms | ${s.metrics.storeMs}ms |`);
  }
  lines.push('');
  lines.push('## Interpretation');
  lines.push('');
  lines.push('- Fixed-context baseline should be 0% because every query targets a record outside the simulated recent window.');
  lines.push('- Exact-key retrieval measures whether ReMEM can recover known identifiers outside the context window.');
  lines.push('- Natural-language retrieval without embeddings is intentionally included as a negative/limitation baseline.');
  lines.push('- Embedding-backed retrieval measures semantic recall, but ingestion time includes local embedding generation and is hardware/model dependent.');
  lines.push('');
  lines.push('## Public claim boundary');
  lines.push('');
  lines.push('Safe: claim the exact numbers in the table for this harness/config/seed. Do not generalize to all agent memory workloads, all models, or all semantic queries.');
  return lines.join('\n');
}

const total = num('memories', 2000);
const queries = num('queries', 120);
const contextEntries = num('contextEntries', 100);
const limit = num('limit', 5);
const seed = num('seed', 1337);
const outDir = String(get('outDir', 'benchmarks/results'));
const embeddingBaseUrl = String(get('embeddingBaseUrl', process.env.OLLAMA_URL || 'http://192.168.68.69:11434'));
const embeddingModel = String(get('embeddingModel', 'nomic-embed-text'));
const includeEmbeddings = flag('embeddings');

const corpus = makeCorpus(total, seed);
const queryItems = sampleOutsideWindow(corpus, queries, contextEntries, seed);
const recentWindow = corpus.slice(-contextEntries);
const corpusText = corpus.map((x) => x.content).join('\n');
const recentText = recentWindow.map((x) => x.content).join('\n');

const scenarios = [
  { name: 'core exact codename', queryStyle: 'exact-code', embeddings: false, queryTopics: false },
  { name: 'core natural language no embeddings', queryStyle: 'natural', embeddings: false, queryTopics: false },
  { name: 'core topic-filtered exact id', queryStyle: 'exact-id', embeddings: false, queryTopics: true },
];
if (includeEmbeddings) {
  scenarios.push({ name: 'core semantic embeddings', queryStyle: 'semantic', embeddings: true, queryTopics: false });
}

const result = {
  benchmark: 'remem-context-window-suite-v1',
  timestamp: new Date().toISOString(),
  config: { totalMemories: total, queryCount: queryItems.length, contextEntries, limit, seed },
  contextPressure: {
    corpusApproxTokens: approxTokens(corpusText),
    fixedWindowApproxTokens: approxTokens(recentText),
    effectiveCorpusToWindowMultiple: round(corpusText.length / Math.max(1, recentText.length), 2),
  },
  scenarios: [],
};

for (const scenario of scenarios) {
  console.error(`Running ${scenario.name}...`);
  result.scenarios.push(await runScenario({
    ...scenario,
    corpus,
    queryItems,
    recentWindow,
    limit,
    embeddingBaseUrl,
    embeddingModel,
  }));
}

mkdirSync(outDir, { recursive: true });
const base = `context-window-${nowSlug()}-${total}m-${queryItems.length}q`;
const jsonPath = path.join(outDir, `${base}.json`);
const mdPath = path.join(outDir, `${base}.md`);
writeFileSync(jsonPath, JSON.stringify(result, null, 2));
writeFileSync(mdPath, markdown(result));
console.log(JSON.stringify({ jsonPath, mdPath, result }, null, 2));
