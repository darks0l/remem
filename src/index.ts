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
  duplicate,
  infectFromServer,
  buildIdentityPackage,
  downloadPackage,
} from './duplicate.js';
import { EmbeddingService, type EmbeddingConfig as EmbedServiceConfig } from './embeddings.js';
import { MemoryREPL } from './repl.js';
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
  type DuplicateResult,
  type InfectionResult,
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
  private embeddingService?: EmbeddingService;
  private _embeddingEnabled: boolean = false;
  private _identityEnabled: boolean = false;
  private _layersEnabled: boolean = false;
  private _agentId?: string;
  private _userId?: string;

  constructor(config: ReMEMConfig) {
    const validated = rememConfigSchema.parse(config);

    // Initialize storage — default to SQLite if not specified
    const storage = validated.storage ?? 'sqlite';
    const dbPath = validated.dbPath ?? (storage === 'memory' ? ':memory:' : './remem.db');
    this._store = new MemoryStore(dbPath);

    // Agent/user scoping for multi-agent support
    this._agentId = validated.storageConfig?.agentId as string | undefined;
    this._userId = validated.storageConfig?.userId as string | undefined;

    // Initialize model if provided
    if (validated.llm) {
      this.model = new ModelAbstraction(validated.llm);
    }

    // Initialize embedding service if enabled (v0.3.2)
    if (validated.embeddings?.enabled) {
      const embConfig: EmbedServiceConfig = {
        baseUrl: validated.embeddings.baseUrl ?? 'http://localhost:11434',
        model: validated.embeddings.model ?? 'nomic-embed-text',
        dimension: validated.embeddings.dimension,
      };
      this.embeddingService = new EmbeddingService(embConfig);
      this._embeddingEnabled = true;
    }

    // Initialize query engine (store initialized in init())
    this.engine = new QueryEngine({
      store: this._store,
      model: this.model,
    });
  }

  /**
   * Initialize the memory store. Must be called before use.
   * Also restores persisted layer state from SQLite if layers are enabled.
   */
  async init(): Promise<void> {
    await this._store.init();

    // Restore persisted layer entries from SQLite
    if (this._layersEnabled && this.layers) {
      const storeOpts = { agentId: this._agentId, userId: this._userId };
      const persisted = await this._store.loadAllLayerEntries(storeOpts);
      for (const entry of persisted) {
        this.layers.restoreEntry(entry);
      }
      if (persisted.length > 0) {
        console.log(`[ReMEM] Restored ${persisted.length} persisted layer entries from SQLite`);
      }
    }
  }

  /**
   * Store a new memory entry.
   * If layers are enabled, also persists to the appropriate layer in SQLite.
   * If embeddings are enabled, generates a vector embedding in the background.
   */
  async store(input: StoreMemoryInput): Promise<void> {
    // Store in the underlying SQLite store to get the entry ID for embedding
    const stored = await this._store.store(input, {
      agentId: this._agentId,
      userId: this._userId,
    });

    // Also store in layers if enabled (layers are persisted to SQLite)
    if (this._layersEnabled && this.layers) {
      const result = this.layers.store(input);
      await this._store.persistLayerEntry(result, {
        agentId: this._agentId,
        userId: this._userId,
      });
    }

    // Generate embedding (sync or async) if enabled
    if (this._embeddingEnabled && this.embeddingService) {
      const contentToEmbed = input.topics.length > 0
        ? `[${input.topics.join(', ')}] ${input.content}`
        : input.content;

      if (input.metadata?.asyncEmbed === false) {
        // Synchronous: block until embedding is computed and stored
        try {
          const emb = await this.embeddingService.generateEmbedding(stored.id, contentToEmbed);
          await this._store.storeEmbedding(stored.id, emb.base64, emb.vector.length, emb.model);
        } catch (err) {
          console.warn(`[ReMEM] Embedding failed for ${stored.id}: ${err}`);
        }
      } else {
        // Async: fire and forget
        this.embeddingService
          .generateEmbedding(stored.id, contentToEmbed)
          .then((emb) => {
            return this._store.storeEmbedding(stored.id, emb.base64, emb.vector.length, emb.model);
          })
          .catch((err) => console.warn(`[ReMEM] Async embed failed for ${stored.id}: ${err}`));
      }
    }
  }

  /**
   * Query memory using natural language.
   * Uses semantic search (cosine similarity) when embeddings are enabled,
   * falls back to keyword + access_count scoring otherwise.
   */
  async query(query: string, options?: QueryOptions): Promise<QueryResponse> {
    const start = Date.now();

    // If embeddings are enabled and Ollama is reachable, use semantic search
    if (this._embeddingEnabled && this.embeddingService) {
      try {
        const queryVector = await this.embeddingService.embed(query);
        const { results, totalAvailable } = await this._store.semanticQuery(
          query,
          queryVector,
          options
        );
        return { results, totalAvailable, query, tookMs: Date.now() - start };
      } catch (err) {
        // Embedding failed — fall back to keyword search
        console.warn(`[ReMEM] Semantic query failed, falling back to keyword: ${err}`);
      }
    }

    // Fallback: standard keyword + access_count query
    return this.engine.query(query, options);
  }

  /**
   * Returns true if semantic embeddings are enabled and configured.
   */
  isEmbeddingEnabled(): boolean {
    return this._embeddingEnabled;
  }

  /**
   * Returns the embedding service instance (if enabled).
   */
  getEmbeddingService(): EmbeddingService | undefined {
    return this.embeddingService;
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
   * RLM-style Memory REPL — navigate memory programmatically.
   *
   * The model writes JavaScript to navigate the memory store. This enables
   * arbitrarily large memory stores without context window overflow — the model
   * never sees all memory at once, only constant-size metadata about what it
   * has observed.
   *
   * Requires: model configured.
   * Optional: layers enabled (enables layer-aware navigation).
   *
   * @returns { answer: string, observations: REPL debug trace }
   */
  async replNavigate(query: string): Promise<{ answer: string; observations: unknown[] }> {
    if (!this.model) {
      // Fall back to direct query
      const { results } = await this.query(query);
      return {
        answer: results.length > 0
          ? `No LLM configured — used direct query. Found ${results.length} results:\n` +
            results.slice(0, 5).map((r) => `- ${r.content}`).join('\n')
          : 'No LLM configured and no direct query results.',
        observations: [],
      };
    }

    const repl = new MemoryREPL({
      store: this._store,
      layers: this.layers,
      model: this.model,
      maxDepth: 5,
      maxResults: 20,
    });

    return repl.navigate(query);
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
   * Layers are persisted to SQLite — they survive process restarts.
   */
  async enableLayers(config?: Partial<LayerConfig>): Promise<void> {
    this.layers = new LayerManager(config ?? DEFAULT_LAYER_CONFIG);
    this._layersEnabled = true;

    // Restore persisted layer entries from SQLite after init
    if (this._store) {
      try {
        const storeOpts = { agentId: this._agentId, userId: this._userId };
        const persisted = await this._store.loadAllLayerEntries(storeOpts);
        for (const entry of persisted) {
          this.layers.restoreEntry(entry);
        }
        if (persisted.length > 0) {
          console.log(`[ReMEM] Restored ${persisted.length} persisted layer entries from SQLite`);
        }
      } catch {
        // Layer restore is best-effort — don't fail init if it breaks
      }
    }
  }

  /**
   * Store in a specific layer.
   */
  async storeInLayer(input: StoreMemoryInput, layer: MemoryLayer): Promise<QueryResult | null> {
    if (!this.layers) {
      await this.enableLayers();
    }
    const entry = this.layers!.store(input, layer);
    await this._store.persistLayerEntry(entry, {
      agentId: this._agentId,
      userId: this._userId,
    });
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
   * Check if episodic layer needs compression.
   * Returns true when episodic is above 80% capacity.
   */
  needsEpisodicCompression(): boolean {
    if (!this.layers) return false;
    const stats = this.layers.getStats();
    const episodic = stats.episodic;
    return episodic.count > episodic.maxEntries * 0.8;
  }

  /**
   * Compress oldest episodic entries into semantic summaries.
   * Call this when episodic layer fills up — uses the LLM to summarize
   * old entries rather than losing them to TTL eviction.
   *
   * @param count How many episodic entries to compress (default: 20)
   * @returns compressed entry info, or null if layers/llm not available
   */
  async compressEpisodic(count: number = 20): Promise<{
    compressedEntryId: string;
    summary: string;
    entriesEvicted: number;
  } | null> {
    if (!this.layers || !this.model) return null;

    const entries = this.layers.getEntriesForCompression(count);
    if (entries.length === 0) return null;

    const result = await this.layers.compressToSemantic(entries, this.model);
    if (!result) return null;

    // Persist the compressed entry to SQLite
    await this._store.persistLayerEntry(result.compressedEntry, {
      agentId: this._agentId,
      userId: this._userId,
    });

    return {
      compressedEntryId: result.compressedEntry.id,
      summary: result.compressedEntry.content,
      entriesEvicted: result.entriesEvicted,
    };
  }

  /**
   * Store a procedural memory — a behavior/rule triggered by a keyword.
   * Use when you learn a rule like "when X happens, always do Y".
   */
  async storeProcedural(input: StoreMemoryInput, trigger: string): Promise<QueryResult | null> {
    if (!this.layers) {
      await this.enableLayers();
    }
    const entry = this.layers!.storeProcedural(input, trigger);
    await this._store.persistLayerEntry(entry, {
      agentId: this._agentId,
      userId: this._userId,
    });
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

  // ─── Snapshots (for long-running agent persistence) ───────────────────────

  /**
   * Create a named snapshot of current memory state.
   * Essential for long-running agents — take a snapshot before restarts.
   * @param label Human-readable label for this snapshot
   */
  async createSnapshot(label: string): Promise<{
    id: string;
    label: string;
    createdAt: number;
    memoryCount: number;
    layerCounts: Record<string, number>;
  }> {
    const meta = await this._store.createSnapshot(label, {
      agentId: this._agentId,
      userId: this._userId,
    });
    return meta;
  }

  /**
   * Restore from a snapshot by ID.
   * Restores layer entries from the snapshot into the current store.
   * @returns Number of entries restored
   */
  async restoreSnapshot(snapshotId: string): Promise<number> {
    return this._store.restoreSnapshot(snapshotId, {
      agentId: this._agentId,
      userId: this._userId,
    });
  }

  /**
   * List available snapshots.
   */
  async listSnapshots(): Promise<Array<{
    id: string;
    label: string;
    createdAt: number;
    memoryCount: number;
  }>> {
    const snapshots = await this._store.listSnapshots({
      agentId: this._agentId,
      userId: this._userId,
    });
    return snapshots.map((s) => ({
      id: s.id,
      label: s.label,
      createdAt: s.createdAt,
      memoryCount: s.memoryCount,
    }));
  }

  /**
   * Delete a snapshot.
   */
  async deleteSnapshot(snapshotId: string): Promise<boolean> {
    return this._store.deleteSnapshot(snapshotId);
  }

  // ─── Identity Duplication & Infection ──────────────────────────────────────

  /**
   * Export and upload the agent's identity package to DARKSOL server.
   * This backs up all memories, constitution statements, and optionally
   * SOUL/IDENTITY text to the DARKSOL cloud.
   *
   * Usage:
   * ```
   * const result = await memory.duplicate({
   *   serverUrl: 'https://api.darksol.net',
   *   apiKey: 'your-api-key',
   *   soulText: soulMdContent,
   *   identityText: identityMdContent,
   * });
   * console.log(`Uploaded ${result.memoryCount} memories`);
   * ```
   */
  async duplicate(config: {
    serverUrl: string;
    apiKey: string;
    soulText?: string;
    identityText?: string;
    includeSoul?: boolean;
    includeIdentity?: boolean;
    includeAllLayers?: boolean;
    layers?: Array<'episodic' | 'semantic' | 'identity' | 'procedural'>;
  }): Promise<DuplicateResult> {
    return duplicate({
      store: this._store,
      layers: this.layers,
      identity: this.identity,
      soulText: config.soulText,
      identityText: config.identityText,
      config: {
        serverUrl: config.serverUrl,
        apiKey: config.apiKey,
        includeSoul: config.includeSoul ?? true,
        includeIdentity: config.includeIdentity ?? true,
        includeAllLayers: config.includeAllLayers ?? true,
        layers: config.layers,
        agentId: this._agentId,
        userId: this._userId,
      } as import('./types.js').DuplicationConfig,
    });
  }

  /**
   * Build an identity package locally without uploading.
   * Useful for previewing what would be exported.
   */
  async buildIdentityPackageLocal(config: {
    soulText?: string;
    identityText?: string;
    includeSoul?: boolean;
    includeIdentity?: boolean;
    includeAllLayers?: boolean;
    layers?: Array<'episodic' | 'semantic' | 'identity' | 'procedural'>;
  }): Promise<import('./types.js').IdentityPackage> {
    return buildIdentityPackage({
      store: this._store,
      layers: this.layers,
      identity: this.identity,
      soulText: config.soulText,
      identityText: config.identityText,
      config: {
        serverUrl: 'http://localhost', // not used for local build
        apiKey: 'local-only',
        includeSoul: config.includeSoul ?? true,
        includeIdentity: config.includeIdentity ?? true,
        includeAllLayers: config.includeAllLayers ?? true,
        layers: config.layers,
        agentId: this._agentId,
        userId: this._userId,
      } as import('./types.js').DuplicationConfig,
    });
  }

  /**
   * Pull an identity package from DARKSOL server and infect this ReMEM instance.
   * Requires live connection — if the server is unreachable, throws.
   * Infected agents gain the source identity's constitution and memories.
   *
   * Usage:
   * ```
   * const result = await memory.infect({
   *   serverUrl: 'https://api.darksol.net',
   *   apiKey: 'your-api-key',
   *   layers: ['identity', 'procedural'],
   * });
   * ```
   */
  async infect(config: {
    serverUrl: string;
    apiKey: string;
    sourceAgentId?: string;
    version?: string;
    refreshIntervalMs?: number;
    layers?: Array<'identity' | 'semantic' | 'procedural'>;
  }): Promise<InfectionResult> {
    return infectFromServer({
      store: this._store,
      layers: this.layers,
      identity: this.identity,
      config: {
        serverUrl: config.serverUrl,
        apiKey: config.apiKey,
        sourceAgentId: config.sourceAgentId,
        version: config.version,
        refreshIntervalMs: config.refreshIntervalMs ?? 0,
        layers: config.layers ?? ['identity'],
      },
    });
  }

  /**
   * Download identity package without applying it (preview).
   */
  async fetchIdentityPackage(config: {
    serverUrl: string;
    apiKey: string;
    sourceAgentId?: string;
    version?: string;
  }): Promise<import('./types.js').IdentityPackage> {
    return downloadPackage({
      serverUrl: config.serverUrl,
      apiKey: config.apiKey,
      sourceAgentId: config.sourceAgentId,
      version: config.version,
    } as import('./types.js').InfectionConfig);
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
export { MemoryREPL } from './repl.js';
export * from './types.js';
export * from './identity.js';
export * from './layers.js';
export * from './duplicate.js';
