/**
 * ReMEM — Query Engine
 * RLM-style REPL for navigating memory programmatically
 */

import type { LLMMessage, QueryOptions, QueryResponse, QueryResult, StoreMemoryInput } from './types.js';
import type { MemoryStoreLike } from './storage-types.js';
import { ModelAbstraction } from './model.js';

export interface QueryEngineConfig {
  store: MemoryStoreLike;
  model?: ModelAbstraction;
  systemPrompt?: string;
}

const DEFAULT_SYSTEM_PROMPT = `You are a memory query assistant. The user has a memory store with entries containing thoughts, facts, preferences, and context.

Your job is to translate natural language queries into precise memory queries. For each query:
1. Identify what the user is looking for
2. Suggest which topics to search
3. Determine appropriate time ranges or access patterns

Memory entries have these fields:
- id: UUID
- content: the memory text
- topics: string tags (e.g., ['preferences', 'ui', 'project-x'])
- createdAt: unix timestamp ms
- accessedAt: unix timestamp ms
- accessCount: how many times this entry was accessed

Respond with a query plan in JSON.`;

export class QueryEngine {
  private _store: MemoryStoreLike;
  private model?: ModelAbstraction;
  private systemPrompt: string;

  constructor(config: QueryEngineConfig) {
    this._store = config.store;
    this.model = config.model;
    this.systemPrompt = config.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
  }

  /**
   * Query memory using natural language.
   * If a model is configured, uses LLM-assisted query decomposition.
   * Otherwise falls back to direct keyword search.
   */
  async query(query: string, options?: QueryOptions): Promise<QueryResponse> {
    const start = Date.now();

    if (this.model) {
      return this.queryWithLLM(query, options, start);
    }

    return this.queryDirect(query, options, start);
  }

  /**
   * Direct keyword-based query (no LLM).
   */
  private async queryDirect(
    query: string,
    options: QueryOptions | undefined,
    start: number
  ): Promise<QueryResponse> {
    const { results, totalAvailable } = await this._store.query(query, options);

    return {
      results,
      totalAvailable,
      query,
      tookMs: Date.now() - start,
    };
  }

  /**
   * LLM-assisted query decomposition.
   * The model analyzes the query and generates optimized search terms.
   */
  private async queryWithLLM(
    query: string,
    options: QueryOptions | undefined,
    start: number
  ): Promise<QueryResponse> {
    if (!this.model) throw new Error('No model configured');

    // Step 1: Ask the model to decompose the query
    const messages: LLMMessage[] = [
      { role: 'system', content: this.systemPrompt },
      {
        role: 'user',
        content: `Query: "${query}"
        
What topics should I search? What keywords? Respond with a brief search strategy.`,
      },
    ];

    const decomposition = await this.model.chat(messages, { temperature: 0.3, maxTokens: 256 });
    const searchText = decomposition.content.trim();

    // Step 2: Execute the query against the store
    const { results, totalAvailable } = await this._store.query(searchText, options);

    // Step 3: If we got results, optionally ask the model to rerank them
    if (results.length > 0) {
      const reranked = await this.rerankResults(query, results);
      return {
        results: reranked,
        totalAvailable,
        query,
        tookMs: Date.now() - start,
      };
    }

    return {
      results: [],
      totalAvailable: 0,
      query,
      tookMs: Date.now() - start,
    };
  }

  /**
   * Ask the LLM to rerank results by relevance to the query.
   */
  private async rerankResults(query: string, results: QueryResult[]): Promise<QueryResult[]> {
    if (!this.model || results.length === 0) return results;

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content:
          'You are a relevance ranker. Rate each memory entry from 0-1 for how relevant it is to the query. Return JSON array of scores in order.',
      },
      {
        role: 'user',
        content: `Query: "${query}"

Memory entries:
${results.map((r, i) => `[${i}] ${r.content}`).join('\n')}

Respond with a JSON array of scores (0-1) matching the order above. Example: [0.9, 0.3, 0.8]`,
      },
    ];

    try {
      const response = await this.model.chat(messages, { temperature: 0.1, maxTokens: 256 });
      const scores = JSON.parse(response.content.trim()) as number[];

      const scored = results.map((r, i) => ({
        result: r,
        score: scores[i] ?? 0,
      }));

      scored.sort((a, b) => b.score - a.score);

      return scored.map((s) => ({
        ...s.result,
        relevanceScore: s.score,
      }));
    } catch {
      // If reranking fails, return original order
      return results;
    }
  }

  /**
   * Store a new memory entry.
   */
  async store(input: StoreMemoryInput): Promise<void> {
    await this._store.store(input);
  }

  /**
   * Get recent memory entries.
   */
  async getRecent(n: number = 10): Promise<QueryResult[]> {
    return this._store.getRecent(n);
  }

  /**
   * Get entries by topic.
   */
  async getByTopic(topic: string, limit: number = 20): Promise<QueryResult[]> {
    return this._store.getByTopic(topic, limit);
  }

  /**
   * Recursive query — the RLM-style loop.
   * Keep refining until the answer is complete.
   */
  async recursiveQuery(
    initialQuery: string,
    maxDepth: number = 3
  ): Promise<{ answer: string; memories: QueryResult[] }> {
    if (!this.model) {
      const { results } = await this.query(initialQuery);
      return { answer: 'No LLM configured — cannot synthesize answer.', memories: results };
    }

    const memories: QueryResult[] = [];
    let currentQuery = initialQuery;
    const contextParts: string[] = [];

    for (let depth = 0; depth < maxDepth; depth++) {
      const { results } = await this._store.query(currentQuery, { limit: 5 });

      if (results.length === 0) break;

      memories.push(...results);

      // Build context for next iteration
      const newContext = results
        .map((r) => `[${depth}] ${r.content}`)
        .join('\n');
      contextParts.push(newContext);

      // Ask the model if it has enough context
      const messages: LLMMessage[] = [
        {
          role: 'system',
          content:
            'You are a helpful assistant with access to a memory store. Based on the retrieved memories, answer the query. If you need more information, ask a follow-up query.',
        },
        {
          role: 'user',
          content: `Query: ${initialQuery}

Retrieved memories:
${contextParts.join('\n---\n')}

Do you have enough to answer the query fully? If yes, provide the answer. If no, ask a specific follow-up query to find more information.`,
        },
      ];

      const response = await this.model.chat(messages, { temperature: 0.5, maxTokens: 512 });
      const content = response.content.trim();

      // Simple heuristic: if the response is short and looks like a follow-up question, continue
      if (content.length < 100 && (content.includes('?') || content.toLowerCase().includes('more'))) {
        currentQuery = content;
        continue;
      }

      return { answer: content, memories };
    }

    // Max depth reached
    const finalMessages: LLMMessage[] = [
      {
        role: 'system',
        content: 'You are a helpful assistant. Summarize the retrieved memories into a coherent answer.',
      },
      {
        role: 'user',
        content: `Query: ${initialQuery}\n\nMemories:\n${contextParts.join('\n---\n')}`,
      },
    ];

    const finalResponse = await this.model.chat(finalMessages, { temperature: 0.5, maxTokens: 512 });

    return { answer: finalResponse.content.trim(), memories };
  }
}
