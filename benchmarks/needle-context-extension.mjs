#!/usr/bin/env node
/**
 * ReMEM factual benchmark harness.
 *
 * Measures whether ReMEM can recover facts that are deliberately outside a
 * simulated fixed context window. This is not a claim about model IQ; it is a
 * retrieval/context-extension stress test with reproducible synthetic data.
 */
import { performance } from 'node:perf_hooks';
import { ReMEM } from '../dist/index.mjs';

function arg(name, fallback) {
  const ix = process.argv.indexOf(`--${name}`);
  if (ix >= 0 && process.argv[ix + 1]) return process.argv[ix + 1];
  return fallback;
}

function mulberry32(seed) {
  return function rand() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rand, arr) {
  return arr[Math.floor(rand() * arr.length)];
}

function approxTokens(s) {
  return Math.ceil(String(s).length / 4);
}

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))] ?? 0;
}

const total = Number(arg('memories', '2000'));
const queries = Number(arg('queries', '120'));
const contextEntries = Number(arg('contextEntries', '100'));
const seed = Number(arg('seed', '1337'));
const limit = Number(arg('limit', '5'));
const useLayers = process.argv.includes('--layers');
const useEmbeddings = process.argv.includes('--embeddings');
const exactTopics = process.argv.includes('--exactTopics');
const useQueryTopics = process.argv.includes('--queryTopics');
const embeddingBaseUrl = arg('embeddingBaseUrl', process.env.OLLAMA_URL || 'http://192.168.68.73:11434');
const embeddingModel = arg('embeddingModel', 'nomic-embed-text');

const rand = mulberry32(seed);
const domains = ['wallet', 'agent', 'card', 'oracle', 'router', 'terminal', 'memory', 'vault'];
const adjectives = ['black', 'silver', 'neon', 'quiet', 'rapid', 'ghost', 'amber', 'crimson', 'violet', 'iron'];
const nouns = ['raven', 'claw', 'signal', 'ember', 'cipher', 'anchor', 'mirror', 'switch', 'dagger', 'comet'];

const corpus = [];
for (let i = 0; i < total; i++) {
  const code = `${pick(rand, adjectives)}-${pick(rand, nouns)}-${String(i).padStart(5, '0')}`;
  const pin = Math.floor(100000 + rand() * 900000).toString();
  const domain = pick(rand, domains);
  const decoy = `${pick(rand, adjectives)}-${pick(rand, nouns)}-${String(total - i).padStart(5, '0')}`;
  corpus.push({
    id: `fact-${i}`,
    domain,
    code,
    pin,
    content: `FACT_ID fact-${i}: The ${domain} test record has recovery codename ${code} and verification PIN ${pin}. Decoy phrase ${decoy}.`,
    topics: ['benchmark', domain, `fact-${i}`],
  });
}

const memory = new ReMEM({
  storage: 'memory',
  dbPath: ':memory:',
  ...(useEmbeddings ? { embeddings: { enabled: true, baseUrl: embeddingBaseUrl, model: embeddingModel } } : {}),
});
await memory.init();
if (useLayers) await memory.enableLayers();

const storeStart = performance.now();
for (const item of corpus) {
  if (useLayers) {
    await memory.storeInLayer({ content: item.content, topics: item.topics, metadata: { factId: item.id, pin: item.pin, code: item.code, asyncEmbed: false } }, 'semantic');
  } else {
    await memory.store({ content: item.content, topics: item.topics, metadata: { factId: item.id, pin: item.pin, code: item.code, asyncEmbed: false } });
  }
}
const storeMs = performance.now() - storeStart;

// Query only facts outside the simulated recent context window.
const eligibleMax = Math.max(0, total - contextEntries - 1);
const sampled = new Set();
while (sampled.size < Math.min(queries, eligibleMax + 1)) {
  sampled.add(Math.floor(rand() * (eligibleMax + 1)));
}
const queryItems = [...sampled].map((i) => corpus[i]);
const recentWindow = corpus.slice(-contextEntries);

const latencies = [];
let top1 = 0;
let topK = 0;
let mrr = 0;
let fixedContextHits = 0;
let totalReturned = 0;
const misses = [];

for (const item of queryItems) {
  const q = exactTopics ? item.code : `What is the verification PIN for ${item.domain} record ${item.id} with codename ${item.code}?`;

  if (recentWindow.some((x) => x.id === item.id)) fixedContextHits++;

  const t0 = performance.now();
  const res = useLayers
    ? await memory.queryLayers(q, { limit, layers: ['semantic'], ...(useQueryTopics ? { topics: [item.id] } : {}) })
    : await memory.query(q, { limit, ...(useQueryTopics ? { topics: [item.id] } : {}) });
  const took = performance.now() - t0;
  latencies.push(took);

  const results = (useLayers ? (res?.results ?? []) : res.results) ?? [];
  totalReturned += results.length;
  const rank = results.findIndex((r) => r.content.includes(`FACT_ID ${item.id}:`));
  if (rank === 0) top1++;
  if (rank >= 0 && rank < limit) {
    topK++;
    mrr += 1 / (rank + 1);
  } else if (misses.length < 8) {
    misses.push({ id: item.id, code: item.code, pin: item.pin, query: q, top: results.slice(0, 3).map((r) => r.content.slice(0, 140)) });
  }
}

const corpusChars = corpus.reduce((sum, x) => sum + x.content.length, 0);
const recentChars = recentWindow.reduce((sum, x) => sum + x.content.length, 0);
const result = {
  benchmark: 'remem-needle-context-extension-v1',
  timestamp: new Date().toISOString(),
  config: {
    totalMemories: total,
    queryCount: queryItems.length,
    simulatedContextEntries: contextEntries,
    resultLimit: limit,
    seed,
    mode: useLayers ? 'layers.semantic' : 'core',
    queryStyle: exactTopics ? 'exact-codename' : 'natural-language',
    queryTopics: useQueryTopics,
    embeddings: useEmbeddings ? { baseUrl: embeddingBaseUrl, model: embeddingModel } : false,
  },
  contextPressure: {
    corpusApproxTokens: approxTokens('x'.repeat(corpusChars)),
    fixedWindowApproxTokens: approxTokens('x'.repeat(recentChars)),
    effectiveCorpusToWindowMultiple: Number((corpusChars / Math.max(1, recentChars)).toFixed(2)),
    note: 'Queries target facts outside the fixed recent window, so fixed-context baseline should only hit if sampling/window config is wrong.',
  },
  metrics: {
    fixedContextRecallAt1: fixedContextHits / queryItems.length,
    rememRecallAt1: top1 / queryItems.length,
    rememRecallAtK: topK / queryItems.length,
    rememMRR: mrr / queryItems.length,
    avgReturned: totalReturned / queryItems.length,
    storeMs: Number(storeMs.toFixed(2)),
    avgQueryMs: Number((latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2)),
    p50QueryMs: Number(percentile(latencies, 0.5).toFixed(2)),
    p95QueryMs: Number(percentile(latencies, 0.95).toFixed(2)),
  },
  misses,
};

console.log(JSON.stringify(result, null, 2));
await memory.close?.();
