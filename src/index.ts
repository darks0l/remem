/**
 * ReMEM — Main Entry Point
 * Recursive Memory for AI Agents
 */

import { MemoryStore } from './store.js';
import { ModelAbstraction } from './model.js';
import { QueryEngine } from './query.js';
import {
  createIdentitySystem,
  type IdentitySystem,
} from './identity.js';
import { LayerManager, DEFAULT_LAYER_CONFIG, type LayerConfig } from './layers.js';
import {
  rememConfigSchema,
  type ReMEMConfig,
  type StoreMemoryInput,
  type QueryOptions,
  type QueryResponse,
  type QueryResult,
  type ConstitutionStatement,
  type DriftResult,
  type MemoryLayer,
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
  private identity?: IdentitySystem;
  private layers?: LayerManager;
  private _identityEnabled: boolean = false;
  private _layersEnabled: boolean = false;

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

  // ─── Identity Layer ───────────────────────────────────────────────────────

  /**
   * Enable identity layer with optional constitution import.
   */
  enableIdentity(config?: {
    constitutionTexts?: Array<{ text: string; source: string }>;
    autoInject?: boolean;
    evalModel?: ModelAbstraction['config'];
  }): void {
    const identityConfig = {
      autoInject: config?.autoInject ?? true,
      evalModel: config?.evalModel ?? (this.model ? this.model.config : undefined),
      driftThreshold: 0.3,
      criticalThreshold: 0.7,
    };

    this.identity = createIdentitySystem(identityConfig);
    this._identityEnabled = true;

    // Import constitution texts
    if (config?.constitutionTexts) {
      for (const { text, source } of config.constitutionTexts) {
        this.identity.constitution.importFromText(text, source);
      }
    }
  }

  /**
   * Add an identity statement.
   */
  addIdentityStatement(
    text: string,
    category: ConstitutionStatement['category'],
    weight?: number
  ): ConstitutionStatement | null {
    if (!this.identity) return null;
    return this.identity.constitution.addStatement(text, category, weight);
  }

  /**
   * Import identity constitution from text (e.g., SOUL.md content).
   */
  importConstitution(text: string, source: string): number {
    if (!this.identity) {
      this.enableIdentity();
    }
    return this.identity!.constitution.importFromText(text, source);
  }

  /**
   * Detect identity drift in the current session context.
   */
  async detectDrift(sessionText: string): Promise<DriftResult> {
    if (!this.identity) {
      return {
        score: 0,
        level: 'aligned',
        violatingStatements: [],
        reasoning: 'Identity layer not enabled.',
        detectedAt: Date.now(),
      };
    }
    return this.identity.detector.detectDrift(sessionText, { method: 'both' });
  }

  /**
   * Get constitution injection block if drift is detected.
   * Use this to prepend correction context to LLM messages.
   */
  getConstitutionInjection(drift: DriftResult): string {
    if (!this.identity) return '';
    if (drift.level === 'aligned') return '';
    return this.identity.injector.buildInjection(drift);
  }

  /**
   * Get all identity statements.
   */
  getIdentityStatements(category?: ConstitutionStatement['category']): ConstitutionStatement[] {
    if (!this.identity) return [];
    return this.identity.constitution.getStatements(category);
  }

  /**
   * Check if identity layer is enabled.
   */
  isIdentityEnabled(): boolean {
    return this._identityEnabled;
  }

  // ─── Hierarchical Layers ─────────────────────────────────────────────────

  /**
   * Enable hierarchical memory layers (episodic / semantic / identity).
   */
  enableLayers(config?: Partial<LayerConfig>): void {
    this.layers = new LayerManager(config ?? DEFAULT_LAYER_CONFIG);
    this._layersEnabled = true;
  }

  /**
   * Store in a specific layer.
   */
  storeInLayer(input: StoreMemoryInput, layer: MemoryLayer): QueryResult | null {
    if (!this.layers) {
      this.enableLayers();
    }
    const entry = this.layers!.store(input, layer);
    return {
      id: entry.id,
      content: entry.content,
      topics: entry.topics,
      relevanceScore: entry.importance,
      createdAt: entry.createdAt,
      accessedAt: entry.accessedAt,
      accessCount: entry.accessCount,
    };
  }

  /**
   * Query across layers with weighted retrieval.
   */
  queryLayers(
    query: string,
    options?: QueryOptions & { layers?: MemoryLayer[] }
  ): ReturnType<LayerManager['query']> | null {
    if (!this.layers) return null;
    return this.layers.query(query, options);
  }

  /**
   * Get layer stats.
   */
  getLayerStats(): ReturnType<LayerManager['getStats']> | null {
    if (!this.layers) return null;
    return this.layers.getStats();
  }

  /**
   * Evict expired entries from all layers.
   */
  evictExpiredLayers(): number {
    if (!this.layers) return 0;
    return this.layers.evictExpired();
  }

  /**
   * Store a procedural memory — a behavior/rule triggered by a keyword.
   * Use when you learn a rule like "when X happens, always do Y".
   */
  storeProcedural(input: StoreMemoryInput, trigger: string): QueryResult | null {
    if (!this.layers) {
      this.enableLayers();
    }
    const entry = this.layers!.storeProcedural(input, trigger);
    return {
      id: entry.id,
      content: entry.content,
      topics: entry.topics,
      relevanceScore: entry.importance,
      createdAt: entry.createdAt,
      accessedAt: entry.accessedAt,
      accessCount: entry.accessCount,
    };
  }

  /**
   * Fire procedural rules matching the given context.
   * Returns rules whose trigger keyword appears in the context.
   */
  fireProcedural(context: string): QueryResult[] {
    if (!this.layers) return [];
    const triggered = this.layers.fireProcedural(context);
    return triggered.map((entry) => ({
      id: entry.id,
      content: entry.content,
      topics: entry.topics,
      relevanceScore: entry.importance,
      createdAt: entry.createdAt,
      accessedAt: entry.accessedAt,
      accessCount: entry.accessCount,
    }));
  }

  /**
   * Get the temporal history of an entry — trace its supersession chain.
   * Returns all versions from newest to oldest.
   */
  getTemporalHistory(entryId: string): QueryResult[] {
    if (!this.layers) return [];

    const history: QueryResult[] = [];
    let current = this.layers.get(entryId);

    if (!current) return [];

    // Walk the supersession chain backward (newest to oldest)
    while (current) {
      history.push({
        id: current.id,
        content: current.content,
        topics: current.topics,
        relevanceScore: current.importance,
        createdAt: current.createdAt,
        accessedAt: current.accessedAt,
        accessCount: current.accessCount,
      });
      const nextId: string | undefined = current.supersededBy;
      current = nextId ? this.layers.get(nextId) ?? null : null;
    }

    return history;
  }

  /**
   * Check if layers are enabled.
   */
  isLayersEnabled(): boolean {
    return this._layersEnabled;
  }

  // ─── Utilities ───────────────────────────────────────────────────────────

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
export * from './identity.js';
export * from './layers.js';
