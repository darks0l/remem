/**
 * ReMEM — RLM-Style Memory REPL
 * Recursive Language Model loop for navigating memory programmatically.
 *
 * RLM Core Insight (from "Recursive Language Models"):
 * Treat the memory store as an external environment. Instead of retrieving
 * and truncating (losing detail), let the model write code to navigate it.
 *
 * The model never sees all memory at once — only constant-size metadata
 * about the store structure and what it's already observed. This enables
 * arbitrarily large memory stores without context window overflow.
 *
 * Design:
 * - Root model call: receives query + environment metadata (constant size)
 * - Model generates JavaScript to navigate: query layers, get chunks, recurse
 * - Executor runs the JS safely (Function constructor, not eval)
 * - Next iteration: model sees only what it observed, decides next action
 * - Loop until model returns __done or maxDepth reached
 */

import type { LLMMessage, QueryResult } from './types.js';
import type { MemoryStoreLike } from './storage-types.js';
import { LayerManager } from './layers.js';
import { ModelAbstraction } from './model.js';

// ─── Safe Function Executor ──────────────────────────────────────────────────

type MemoryAction =
  | { action: 'observe'; data: unknown }
  | { action: 'done'; answer: string };

interface REPLObservation {
  iteration: number;
  code: string;
  result: unknown;
  action: MemoryAction;
}

interface MemoryREPLOptions {
  /** Memory store for actual operations */
  store: MemoryStoreLike;
  /** Layer manager (optional — enables layer-aware navigation) */
  layers?: LayerManager;
  /** LLM for the REPL loop */
  model?: ModelAbstraction;
  /** Max recursion depth (default: 5) */
  maxDepth?: number;
  /** Max entries to return in final answer (default: 20) */
  maxResults?: number;
  /** Custom system prompt for the REPL model */
  systemPrompt?: string;
}

const DEFAULT_SYSTEM_PROMPT = `You are a memory navigation assistant. The user has a large memory store containing thoughts, facts, preferences, and context.

Your job is to navigate the memory store by writing JavaScript code. You NEVER see the full memory — you only see metadata and what you observe from your own queries.

AVAILABLE API (in the 'mem' object):
- mem.query(text, { limit })       — search memories by text, returns { results: [...], total }
- mem.get(id)                       — get a single memory entry by ID
- mem.getRecent(n)                  — get N most recently accessed memories
- mem.getByTopic(topic, limit)      — get memories by topic tag
- mem.layers.stats()                 — get per-layer memory counts
- mem.layers.query(text, opts)      — query across specific layers with weighted retrieval
- mem.layers.fireProcedural(text)   — fire procedural rules matching context text

NAVIGATION STRATEGY:
1. Start by querying broad terms to understand what's in memory
2. Then dig into specific layers or topics that look relevant
3. Load the actual content of interesting entries with mem.get(id)
4. Synthesize what you found into a coherent answer

RESPONSE FORMAT — return EXACTLY one of:

  // When you have a complete answer:
  ({ action: "done", answer: "Your synthesized answer here." })

  // When you need to observe more before answering:
  ({ action: "observe", data: { what: "description of what you're checking", findings: "what you expect to find" } })

IMPORTANT:
- Always return valid JavaScript object literals, not statements
- Do NOT use await, async, fetch, require, import, or any Node.js APIs
- The 'mem' object methods are already Promise-aware when used with await inside your code
- You can write multi-line code that calls multiple mem methods and returns an observation
- Be specific in your queries — don't just ask for everything at once
- After observing results, build on them with more targeted queries
- If you have enough to answer, say done!

MAX DEPTH: If you reach the recursion limit without enough information, fall back to your best direct query and answer.`;

export class MemoryREPL {
  private store: MemoryStoreLike;
  private layers?: LayerManager;
  private model?: ModelAbstraction;
  private maxDepth: number;
  private maxResults: number;
  private systemPrompt: string;

  constructor(options: MemoryREPLOptions) {
    this.store = options.store;
    this.layers = options.layers;
    this.model = options.model;
    this.maxDepth = options.maxDepth ?? 5;
    this.maxResults = options.maxResults ?? 20;
    this.systemPrompt = options.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
  }

  /**
   * Navigate memory using the RLM loop.
   * Model writes JS to explore, executor runs it, results feed back into next iteration.
   */
  async navigate(query: string): Promise<{ answer: string; observations: REPLObservation[] }> {
    const observations: REPLObservation[] = [];

    // Build the environment metadata (constant size — the "screen" in RLM terms)
    const envMeta = await this.buildEnvironmentMetadata();
    let currentContext = `Query: ${query}\n\nStore metadata:\n${envMeta}`;

    for (let depth = 0; depth < this.maxDepth; depth++) {
      // Build messages for this iteration
      const messages: LLMMessage[] = [
        { role: 'system', content: this.systemPrompt },
        { role: 'user', content: currentContext },
      ];

      // Call the model
      const response = await this.model!.chat(messages, {
        temperature: 0.4,
        maxTokens: 1024,
      });

      const raw = response.content.trim();
      let parsed: MemoryAction;

      try {
        // Try to extract and parse the JS object from the response
        const objectMatch = raw.match(/\{[\s\S]*\}/);
        if (!objectMatch) {
          // Not a valid object — treat as text answer
          parsed = { action: 'done', answer: raw };
        } else {
          parsed = JSON.parse(objectMatch[0]) as MemoryAction;
        }
      } catch {
        // JSON parse failed — treat the raw text as an answer
        parsed = { action: 'done', answer: raw };
      }

      if (parsed.action === 'done') {
        return {
          answer: parsed.answer,
          observations,
        };
      }

      // Execute the model's code to observe memory state
      const code = this.extractCode(raw);
      if (code) {
        const result = await this.executeCode(code);
        const observation: REPLObservation = {
          iteration: depth + 1,
          code,
          result,
          action: { action: 'observe', data: result },
        };
        observations.push(observation);

        // Build next context: show what was observed
        currentContext = `Query: ${query}\n\n## Iteration ${depth + 1} Observations:\n${this.formatObservation(result)}\n\nContinue exploring or synthesize your answer.`;
      } else {
        // No code found — model should have said done
        const observation: REPLObservation = {
          iteration: depth + 1,
          code: '(no code)',
          result: raw,
          action: { action: 'observe', data: raw },
        };
        observations.push(observation);
        currentContext = `Query: ${query}\n\n## Iteration ${depth + 1}:\n${raw}\n\nIf you have enough, return { action: "done", answer: "..." }. Otherwise continue exploring.`;
      }
    }

    // Max depth reached — fall back to direct query
    const { results } = await this.store.query(query, { limit: this.maxResults });
    const fallback = `Recursion limit reached. Direct query found ${results.length} relevant memories:\n\n${
      results
        .slice(0, 10)
        .map((r) => `- ${r.content}`)
        .join('\n')
    }`;

    return { answer: fallback, observations };
  }

  /**
   * Build constant-size metadata about the store environment.
   * This is what the RLM paper calls the "screen" — fixed size regardless of memory size.
   */
  private async buildEnvironmentMetadata(): Promise<string> {
    const lines: string[] = [];

    // Core store stats
    try {
      const recent = await this.store.getRecent(5);
      lines.push(`Recent memories (5): ${recent.length} available`);
      if (recent.length > 0) {
        for (const r of recent.slice(0, 3)) {
          lines.push(`  - [${new Date(r.createdAt).toISOString().slice(0, 10)}] ${r.content.slice(0, 80)}`);
        }
      }
    } catch { /* ignore */ }

    // Layer stats
    if (this.layers) {
      const stats = this.layers.getStats();
      lines.push(`\nLayer counts:`);
      for (const [layer, s] of Object.entries(stats)) {
        lines.push(`  - ${layer}: ${s.count}/${s.maxEntries} (ttl: ${Math.round(s.ttlMs / 3600000)}h)`);
      }
    }

    // Embedding stats hint
    lines.push(`\nEmbeddings: ${this.store ? 'available (semantic search enabled)' : 'not configured'}`);

    return lines.join('\n');
  }

  /**
   * Extract executable JavaScript code from the model's response.
   * Looks for the first { ... } object containing mem.* calls.
   */
  private extractCode(response: string): string | null {
    // Find the object literal in the response
    const match = response.match(/(\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})/);
    if (!match) return null;

    const obj = match[1];
    // Basic sanity check: must contain mem. or return
    if (!obj.includes('mem.') && !obj.includes('return')) return null;

    return obj;
  }

  /**
   * Execute model-generated code safely.
   * Uses Function constructor — no eval, no require, no Node.js globals.
   * Only exposes the safe memory API.
   */
  private executeCode(code: string): Promise<unknown> {
    // Build safe executor with only the memory API
    const memAPI = this.buildMemoryAPI();

    // Wrap in async IIFE so we can use await inside the generated code
    const executor = new Function(
      'mem',
      `return (async () => { ${code} })()`
    );

    try {
      return executor(memAPI) as Promise<unknown>;
    } catch (err) {
      return Promise.resolve({ __error: String(err) });
    }
  }

  /**
   * Build the safe memory API exposed to model-generated code.
   * Only exposes query/retrieve operations — no mutation, no system access.
   */
  private buildMemoryAPI() {
    const store = this.store;
    const layers = this.layers;

    return {
      // Core store operations
      query: async (text: string, opts?: { limit?: number; topics?: string[] }): Promise<unknown> => {
        try {
          const result = await store.query(text, { limit: opts?.limit ?? 10 });
          return {
            count: result.results.length,
            total: result.totalAvailable,
            entries: result.results.map((r) => ({
              id: r.id,
              content: r.content.slice(0, 200),
              topics: r.topics,
              relevance: r.relevanceScore,
            })),
          };
        } catch (err) {
          return { __error: `query failed: ${err}` };
        }
      },

      get: async (id: string): Promise<unknown> => {
        try {
          const entry = await store.get(id);
          if (!entry) return { __error: 'not found' };
          return {
            id: entry.id,
            content: entry.content,
            topics: entry.topics,
            createdAt: entry.createdAt,
            accessedAt: entry.accessedAt,
            accessCount: entry.accessCount,
          };
        } catch (err) {
          return { __error: `get failed: ${err}` };
        }
      },

      getRecent: async (n: number = 10): Promise<unknown> => {
        try {
          const results = await store.getRecent(n);
          return {
            count: results.length,
            entries: results.map((r) => ({
              id: r.id,
              content: r.content.slice(0, 150),
              topics: r.topics,
            })),
          };
        } catch (err) {
          return { __error: `getRecent failed: ${err}` };
        }
      },

      getByTopic: async (topic: string, limit: number = 20): Promise<unknown> => {
        try {
          const results = await store.getByTopic(topic, limit);
          return {
            count: results.length,
            topic,
            entries: results.map((r) => ({
              id: r.id,
              content: r.content.slice(0, 150),
              topics: r.topics,
            })),
          };
        } catch (err) {
          return { __error: `getByTopic failed: ${err}` };
        }
      },

      // Layer-aware navigation
      layers: {
        stats: (): unknown => {
          if (!layers) return { __error: 'layers not enabled' };
          return layers.getStats();
        },

        query: async (text: string, opts?: { layers?: string[]; limit?: number }): Promise<unknown> => {
          if (!layers) return { __error: 'layers not enabled' };
          try {
            const result = await layers.query(text, {
              limit: opts?.limit ?? 10,
              layers: opts?.layers as never,
            });
            return {
              count: result.results.length,
              total: result.totalAvailable,
              layerBreakdown: result.layerBreakdown,
              entries: result.results.map((r) => ({
                id: r.id,
                content: r.content.slice(0, 150),
                topics: r.topics,
                relevance: r.relevanceScore,
              })),
            };
          } catch (err) {
            return { __error: `layer query failed: ${err}` };
          }
        },

        fireProcedural: (context: string): unknown => {
          if (!layers) return { __error: 'layers not enabled' };
          try {
            const triggered = layers.fireProcedural(context);
            return {
              count: triggered.length,
              rules: triggered.map((e) => ({
                id: e.id,
                content: e.content,
                trigger: e.metadata?.trigger,
              })),
            };
          } catch (err) {
            return { __error: `fireProcedural failed: ${err}` };
          }
        },

        getTemporalHistory: (entryId: string): unknown => {
          if (!layers) return { __error: 'layers not enabled' };
          try {
            const history = (layers as unknown as { getTemporalHistory: (id: string) => QueryResult[] }).getTemporalHistory(entryId);
            return {
              count: history.length,
              entries: history.map((r) => ({
                id: r.id,
                content: r.content.slice(0, 150),
              })),
            };
          } catch (err) {
            return { __error: `getTemporalHistory failed: ${err}` };
          }
        },
      },
    };
  }

  /**
   * Format observation result for display to the model in next iteration.
   */
  private formatObservation(result: unknown): string {
    if (!result) return '  (no result)';

    // Handle error objects
    if (typeof result === 'object' && result !== null && '__error' in (result as Record<string, unknown>)) {
      return `  ERROR: ${(result as { __error: string }).__error}`;
    }

    // Handle structured results
    if (typeof result === 'object' && result !== null) {
      const r = result as Record<string, unknown>;

      if ('count' in r && 'entries' in r) {
        const entries = r.entries as Array<Record<string, unknown>>;
        if (entries.length === 0) return '  No entries found.';
        return entries
          .slice(0, 5)
          .map((e) => `  - [${e.id?.toString().slice(0, 8)}] ${String(e.content).slice(0, 100)}`)
          .join('\n');
      }

      if ('total' in r) {
        return `  Found ${r.total} total, showing ${r.count ?? 0}`;
      }
    }

    // Fall back to JSON
    const json = JSON.stringify(result, null, 2);
    return json.length > 500 ? json.slice(0, 500) + '...' : json;
  }
}
