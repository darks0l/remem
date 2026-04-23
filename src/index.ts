/**
 * ReMEM — Main Entry Point
 * Recursive Memory for AI Agents
 */

import { MemoryStore } from './store.js';
import { ModelAbstraction } from './model.js';
import { QueryEngine } from './query.js';
import {
  rememConfigSchema,
  type ReMEMConfig,
  type StoreMemoryInput,
  type QueryOptions,
  type QueryResponse,
  type QueryResult,
} from './types.js';

/**
 * ReMEM — RLM-Style Memory System
 *
 * @example
 * const memory = new ReMEM({
 *   storage: 'sqlite',
 *   llm: { type: 'bankr', apiKey: process.env.BANKR_API_KEY },
 * });
 *
 * await memory.init();
 * await memory.store({ content: "User prefers dark mode", topics: ['preferences'] });
 * const results = await memory.query("What UI preferences?");
 */
export class ReMEM {
  private _store: MemoryStore;
  private model?: ModelAbstraction;
  private engine: QueryEngine;

  constructor(config: ReMEMConfig) {
    const validated = rememConfigSchema.parse(config);

    // Initialize storage
    const dbPath = validated.dbPath ?? ':memory:';
    this._store = new MemoryStore(dbPath);

    // Initialize model if provided
    if (validated.llm) {
      this.model = new ModelAbstraction(validated.llm);
    }

    // Initialize query engine (store initialized in init())
    this.engine = new QueryEngine({
      store: this._store,
      model: this.model,
    });
  }

  /**
   * Initialize the memory store. Must be called before use.
   */
  async init(): Promise<void> {
    await this._store.init();
  }

  /**
   * Store a new memory entry.
   */
  async store(input: StoreMemoryInput): Promise<void> {
    await this.engine.store(input);
  }

  /**
   * Query memory using natural language.
   */
  async query(query: string, options?: QueryOptions): Promise<QueryResponse> {
    return this.engine.query(query, options);
  }

  /**
   * Get recent memory entries.
   */
  async getRecent(n: number = 10): Promise<QueryResult[]> {
    return this.engine.getRecent(n);
  }

  /**
   * Get entries by topic.
   */
  async getByTopic(topic: string, limit: number = 20): Promise<QueryResult[]> {
    return this.engine.getByTopic(topic, limit);
  }

  /**
   * Recursive query — RLM-style iterative refinement.
   */
  async recursiveQuery(
    initialQuery: string,
    maxDepth?: number
  ): Promise<{ answer: string; memories: QueryResult[] }> {
    return this.engine.recursiveQuery(initialQuery, maxDepth ?? 3);
  }

  /**
   * Get the underlying MemoryStore for advanced operations.
   */
  getStore(): MemoryStore {
    return this._store;
  }

  /**
   * Get the model name if configured.
   */
  getModelName(): string | undefined {
    return this.model?.name();
  }

  /**
   * Close the memory store and release resources.
   */
  close(): void {
    this._store.close();
  }
}

// Re-export everything
export { MemoryStore } from './store.js';
export { ModelAbstraction } from './model.js';
export { QueryEngine } from './query.js';
export * from './types.js';
