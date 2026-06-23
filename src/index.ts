/**
 * ReMEM — Main Entry Point
 * Recursive Memory for AI Agents
 */

import { MemoryStore } from './store.js';
import { PostgresMemoryStore, type PostgresStoreConfig } from './postgres-store.js';
import type { MemoryStoreLike } from './storage-types.js';
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
import { MemoryConsolidator, type ConsolidationWorkflowOptions, type ConsolidationWorkflowResult } from './consolidate.js';
import {
  linkedMemoryQueryOptionsSchema,
  queryWithNeighborsOptionsSchema,
  rememConfigSchema,
  smartRecallOptionsSchema,
  dreamOptionsSchema,
  contextPackOptionsSchema,
  type LinkedMemoryQueryOptions,
  type ContextPackOptions,
  type ContextPackResponse,
  type ContextPackSection,
  type DreamMemoryLayer,
  type DreamOptions,
  type DreamResponse,
  type MemoryLink,
  type NeighborPath,
  type ProceduralMatch,
  type ProceduralTrigger,
  type QueryWithNeighborsOptions,
  type ReMEMConfig,
  type SmartRecallOptions,
  type SmartRecallResult,
  type SmartRecallResponse,
  type StoreMemoryInput,
  type QueryOptions,
  type QueryResponse,
  type QueryResult,
  type ConstitutionStatement,
  type DriftResult,
  type MemoryLayer,
  type NamespaceInput,
  type NamespaceQueryScope,
  type DuplicateResult,
  type InfectionResult,
  namespaceInputSchema,
  namespaceQueryScopeSchema,
  storeMemoryInputSchema,
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
  private _store: MemoryStoreLike;
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

  private normalizeNamespace(namespace: NamespaceInput): string {
    const parsed = namespaceInputSchema.parse(namespace);
    return Array.isArray(parsed) ? parsed.join('/') : parsed;
  }

  private buildScopedMetadataFilters(
    scope?: NamespaceQueryScope,
    namespace?: string,
    existing?: QueryOptions['metadata']
  ): QueryOptions['metadata'] {
    const parsedScope = namespaceQueryScopeSchema.parse(scope ?? {});
    const metadata: NonNullable<QueryOptions['metadata']> = { ...(existing ?? {}) };

    if (namespace) {
      metadata.namespace = parsedScope.includeDescendants
        ? { contains: namespace }
        : namespace;
    }

    if (parsedScope.visibility === 'private') {
      metadata.visibility = { in: ['private'] };
    } else if (parsedScope.visibility === 'shared') {
      metadata.visibility = { in: ['shared'] };
    } else {
      metadata.visibility = { in: ['private', 'shared'] };
    }

    return metadata;
  }

  constructor(config: ReMEMConfig) {
    const validated = rememConfigSchema.parse(config);

    // Initialize storage — default to SQLite if not specified
    const storage = validated.storage ?? 'sqlite';
    if (storage === 'postgres') {
      this._store = new PostgresMemoryStore({
        ...(validated.storageConfig ?? {}),
        ...(validated.postgres ?? {}),
      } as PostgresStoreConfig);
    } else {
      const dbPath = validated.dbPath ?? (storage === 'memory' ? ':memory:' : './remem.db');
      this._store = new MemoryStore(dbPath);
    }

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
   * Also restores persisted layer state from the configured store if layers are enabled.
   */
  async init(): Promise<void> {
    await this._store.init();

    // Restore persisted layer entries from the configured store
    if (this._layersEnabled && this.layers) {
      const storeOpts = { agentId: this._agentId, userId: this._userId };
      const persisted = await this._store.loadAllLayerEntries(storeOpts);
      for (const entry of persisted) {
        this.layers.restoreEntry(entry);
      }
      if (persisted.length > 0) {
        console.log(`[ReMEM] Restored ${persisted.length} persisted layer entries from storage`);
      }
    }
  }

  /**
   * Store a new memory entry.
   * If layers are enabled, also persists to the appropriate layer in SQLite.
   * If embeddings are enabled, generates a vector embedding in the background.
   */
  async store(input: StoreMemoryInput): Promise<void> {
    const normalized = storeMemoryInputSchema.parse(input);

    // Store in the underlying store to get the entry ID for embedding
    const stored = await this._store.store(normalized, {
      agentId: this._agentId,
      userId: this._userId,
    });

    // Also store in layers if enabled (layers are persisted to the configured store)
    if (this._layersEnabled && this.layers) {
      const result = this.layers.store(normalized);
      await this._store.persistLayerEntry(result, {
        agentId: this._agentId,
        userId: this._userId,
      });
    }

    // Generate embedding (sync or async) if enabled
    if (this._embeddingEnabled && this.embeddingService) {
      const contentToEmbed = normalized.topics.length > 0
        ? `[${normalized.topics.join(', ')}] ${normalized.content}`
        : normalized.content;

      if (normalized.metadata?.asyncEmbed === false) {
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
          options,
          { agentId: this._agentId, userId: this._userId }
        );
        return { results, totalAvailable, query, tookMs: Date.now() - start };
      } catch (err) {
        // Embedding failed — fall back to keyword search
        console.warn(`[ReMEM] Semantic query failed, falling back to keyword: ${err}`);
      }
    }

    // Fallback: standard keyword + access_count query
    const { results, totalAvailable } = await this._store.query(query, options, {
      agentId: this._agentId,
      userId: this._userId,
    });
    return { results, totalAvailable, query, tookMs: Date.now() - start };
  }

  async linkMemories(fromId: string, toId: string, type: string, metadata: Record<string, unknown> = {}): Promise<MemoryLink> {
    return this._store.createLink({ fromId, toId, type, metadata }, {
      agentId: this._agentId,
      userId: this._userId,
    });
  }

  async getLinkedMemories(memoryId: string, options?: LinkedMemoryQueryOptions): Promise<Array<{ link: MemoryLink; memory: QueryResult | null }>> {
    const opts = linkedMemoryQueryOptionsSchema.parse(options ?? {});
    const links = await this._store.getLinks(memoryId, opts, {
      agentId: this._agentId,
      userId: this._userId,
    });

    return Promise.all(links.map(async (link) => {
      const otherId = link.fromId === memoryId ? link.toId : link.fromId;
      return {
        link,
        memory: await this._store.getEntryById(otherId, {
          agentId: this._agentId,
          userId: this._userId,
        }),
      };
    }));
  }

  async unlinkMemories(linkId: string): Promise<boolean> {
    return this._store.deleteLink(linkId);
  }

  async queryWithNeighbors(query: string, options?: QueryWithNeighborsOptions): Promise<QueryResponse & { linksTraversed: number; paths?: NeighborPath[] }> {
    const opts = queryWithNeighborsOptionsSchema.parse(options ?? {});
    const base = await this.query(query, opts);
    const merged = new Map<string, QueryResult>();
    const paths: NeighborPath[] = [];

    if (opts.includeBaseResults) {
      for (const result of base.results) merged.set(result.id, result);
    }

    let frontier = base.results.map((r) => ({ id: r.id, sourceId: r.id, score: r.relevanceScore ?? 0.6 }));
    const seen = new Set(frontier.map((item) => item.id));
    let linksTraversed = 0;

    for (let hop = 0; hop < opts.hops; hop++) {
      const nextFrontier: Array<{ id: string; sourceId: string; score: number }> = [];
      for (const item of frontier) {
        const neighbors = await this.getLinkedMemories(item.id, {
          direction: 'both',
          types: opts.linkTypes,
          limit: opts.neighborLimit,
        });
        linksTraversed += neighbors.length;

        for (const neighbor of neighbors) {
          if (!neighbor.memory) continue;

          const linkWeight = opts.linkTypeWeights?.[neighbor.link.type] ?? this.defaultLinkWeight(neighbor.link.type);
          const hopDecay = Math.max(0.2, 0.9 - hop * 0.15);
          const neighborScore = Math.min(1.5, (item.score || 0.6) * hopDecay * linkWeight);
          if (neighborScore < opts.minNeighborScore) continue;

          if (opts.includePathDetails) {
            paths.push({
              fromId: item.sourceId,
              toId: neighbor.memory.id,
              throughId: item.id,
              type: neighbor.link.type,
              hop: hop + 1,
              score: neighborScore,
            });
          }

          const existing = merged.get(neighbor.memory.id);
          const enriched: QueryResult = {
            ...neighbor.memory,
            metadata: neighbor.memory.metadata ?? {},
            relevanceScore: Math.max(existing?.relevanceScore ?? 0, neighborScore, neighbor.memory.relevanceScore ?? 0),
          };
          merged.set(neighbor.memory.id, enriched);

          if (!seen.has(neighbor.memory.id)) {
            seen.add(neighbor.memory.id);
            nextFrontier.push({ id: neighbor.memory.id, sourceId: item.sourceId, score: neighborScore });
          }
        }
      }
      frontier = nextFrontier;
      if (frontier.length === 0) break;
    }

    const results = Array.from(merged.values())
      .sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0))
      .slice(0, opts.limit);

    return {
      results,
      totalAvailable: results.length,
      query,
      tookMs: base.tookMs,
      linksTraversed,
      ...(opts.includePathDetails ? { paths } : {}),
    };
  }

  async smartRecall(query: string, options?: SmartRecallOptions): Promise<SmartRecallResponse> {
    const start = Date.now();
    const opts = smartRecallOptionsSchema.parse(options ?? {});

    const profileDefaults: Record<SmartRecallOptions['profile'], Partial<SmartRecallOptions>> = {
      fast: { hops: 1, includeRecent: false, includeProcedural: true, limit: 8 },
      deep: { hops: 2, includeRecent: true, includeProcedural: true, limit: 12, recentLimit: 6 },
      'agent-safe': { hops: 1, includeRecent: true, includeProcedural: true, limit: 8, minNeighborScore: 0.3 },
      'ops-debug': { hops: 2, includeRecent: true, includeProcedural: true, limit: 15, recentLimit: 10, proceduralLimit: 10 },
    };

    const merged = { ...profileDefaults[opts.profile], ...opts } as SmartRecallOptions;
    const semanticBase = await this.query(query, merged);
    const graphBase = await this.queryWithNeighbors(query, {
      ...merged,
      includeBaseResults: true,
    });

    const proceduralMatches = merged.includeProcedural
      ? this.matchProcedural(query).slice(0, merged.proceduralLimit)
      : [];

    const recentResults = merged.includeRecent
      ? (await this.getRecent(merged.recentLimit)).filter((entry) => {
          if (merged.topics && merged.topics.length > 0 && !merged.topics.some((topic) => entry.topics.includes(topic))) return false;
          if (merged.minAccessCount && entry.accessCount < merged.minAccessCount) return false;
          if (merged.metadata && this._store.matchMetadata && !this._store.matchMetadata(entry.metadata ?? {}, merged.metadata)) return false;
          return true;
        })
      : [];

    const mergedResults = new Map<string, import('./types.js').SmartRecallResult>();

    const upsert = (
      result: QueryResult,
      sourceLane: 'semantic' | 'graph' | 'procedural' | 'recent',
      combinedScore: number,
      reasons: string[]
    ) => {
      const existing = mergedResults.get(result.id);
      const nextReasons = Array.from(new Set([...(existing?.reasons ?? []), ...reasons]));
      const nextScore = Math.max(existing?.combinedScore ?? 0, combinedScore);
      const nextLane = (existing?.combinedScore ?? -1) > combinedScore ? existing!.sourceLane : sourceLane;

      mergedResults.set(result.id, {
        ...result,
        metadata: result.metadata ?? {},
        relevanceScore: Math.max(result.relevanceScore ?? 0, existing?.relevanceScore ?? 0),
        sourceLane: nextLane,
        reasons: nextReasons,
        combinedScore: nextScore,
      });
    };

    for (const result of semanticBase.results) {
      upsert(result, 'semantic', result.relevanceScore ?? 0.4, [`semantic:${(result.relevanceScore ?? 0).toFixed(2)}`]);
    }

    for (const result of graphBase.results) {
      const score = Math.min(1.5, (result.relevanceScore ?? 0.35) + 0.12);
      upsert(result, 'graph', score, ['graph:linked-neighbor']);
    }

    for (const match of proceduralMatches) {
      upsert(
        {
          id: match.entry.id,
          content: match.entry.content,
          topics: match.entry.topics,
          metadata: match.entry.metadata,
          relevanceScore: match.score,
          createdAt: match.entry.createdAt,
          accessedAt: match.entry.accessedAt,
          accessCount: match.entry.accessCount,
        },
        'procedural',
        Math.min(1.5, match.score + 0.2),
        match.reasons.map((reason) => `procedural:${reason}`)
      );
    }

    for (const result of recentResults) {
      const recencyBoost = 0.15 + Math.min(0.2, result.accessCount * 0.02);
      upsert(result, 'recent', (result.relevanceScore ?? 0.2) + recencyBoost, ['recent:active-context']);
    }

    const results = Array.from(mergedResults.values())
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .slice(0, merged.limit);

    return {
      results,
      totalAvailable: mergedResults.size,
      query,
      tookMs: Date.now() - start,
      profile: merged.profile,
      lanes: {
        semantic: semanticBase.results.length,
        graph: Math.max(0, graphBase.results.length - semanticBase.results.length),
        procedural: proceduralMatches.length,
        recent: recentResults.length,
      },
    };
  }

  async dream(options?: DreamOptions): Promise<DreamResponse> {
    const start = Date.now();
    const opts = dreamOptionsSchema.parse(options ?? {});

    if (!this.layers) {
      await this.enableLayers();
    }

    const layerManager = this.layers;
    if (!layerManager) {
      return {
        query: opts.query,
        title: 'Dream from long memory',
        content: 'Long-memory dreaming is unavailable because layers are not enabled.',
        themes: [],
        actions: [],
        sourceIds: [],
        sourceLayers: opts.layers,
        sourceCount: 0,
        tookMs: Date.now() - start,
      };
    }

    const queryTerms = new Set(
      opts.query
        .toLowerCase()
        .split(/\W+/)
        .filter((term) => term.length >= 3)
    );

    const scopedEntries = layerManager
      .getAllEntries()
      .filter((entry) => opts.layers.includes(entry.layer as DreamMemoryLayer))
      .filter((entry) => {
        if (opts.topicAllowlist?.length && !opts.topicAllowlist.some((topic) => entry.topics.includes(topic))) return false;
        if (opts.metadata && this._store.matchMetadata && !this._store.matchMetadata(entry.metadata ?? {}, opts.metadata)) return false;
        return true;
      });

    const scoredEntries = scopedEntries
      .map((entry) => {
        const text = `${entry.content} ${entry.topics.join(' ')}`.toLowerCase();
        const termHits = [...queryTerms].filter((term) => text.includes(term)).length;
        const score = termHits * 5 + entry.accessCount * 1.5 + entry.importance * 10 + (entry.layer === 'identity' ? 4 : entry.layer === 'procedural' ? 3 : 2);
        return { entry, score };
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.entry.createdAt - a.entry.createdAt;
      })
      .slice(0, opts.limit);

    const entries = scoredEntries.map((item) => item.entry);
    const sourceIds = entries.map((entry) => entry.id);
    const sourceLayers = Array.from(new Set(entries.map((entry) => entry.layer as DreamMemoryLayer)));

    const topicCounts = new Map<string, number>();
    for (const entry of entries) {
      for (const topic of entry.topics) {
        topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
      }
    }

    const themes = [...topicCounts.entries()]
      .filter(([topic]) => !topic.startsWith('session:'))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([topic]) => topic);

    const actions = entries
      .filter((entry) => entry.layer === 'procedural' || entry.topics.includes('decision') || entry.topics.includes('procedure'))
      .slice(0, 4)
      .map((entry) => entry.content);

    if (!entries.length) {
      return {
        query: opts.query,
        title: 'Dream from long memory',
        content: 'No long-memory entries matched this dream pass yet.',
        themes: [],
        actions: [],
        sourceIds: [],
        sourceLayers: opts.layers,
        sourceCount: 0,
        tookMs: Date.now() - start,
      };
    }

    const model = this.getModel();
    if (model) {
      const sourceBlock = entries.map((entry, index) => {
        const layer = entry.layer.toUpperCase();
        const topics = entry.topics.join(', ');
        return `${index + 1}. [${layer}] ${entry.content}\nTopics: ${topics}`;
      }).join('\n\n');

      const response = await model.chat([
        {
          role: 'system',
          content: 'You are synthesizing an agent dream from long-term memory. Be compact, concrete, and forward-looking. Return strict JSON with keys title, content, themes, actions.',
        },
        {
          role: 'user',
          content: `Dream query: ${opts.query}\n\nUse only these long-memory sources:\n\n${sourceBlock}\n\nReturn JSON shaped like {"title":"...","content":"...","themes":["..."],"actions":["..."]}. Themes/actions should each have 2-4 short items.`,
        },
      ], { temperature: 0.4, maxTokens: 700 });

      try {
        const parsed = JSON.parse(response.content) as { title?: string; content?: string; themes?: string[]; actions?: string[] };
        return {
          query: opts.query,
          title: parsed.title?.trim() || 'Dream from long memory',
          content: parsed.content?.trim() || entries.map((entry) => entry.content).join('\n'),
          themes: Array.isArray(parsed.themes) ? parsed.themes.slice(0, 4) : themes,
          actions: Array.isArray(parsed.actions) ? parsed.actions.slice(0, 4) : actions,
          sourceIds,
          sourceLayers,
          sourceCount: entries.length,
          modelUsed: this.getModelName(),
          tookMs: Date.now() - start,
        };
      } catch {
        // fall through to deterministic synthesis
      }
    }

    return {
      query: opts.query,
      title: 'Dream from long memory',
      content: [
        `Long memory keeps circling back to ${themes.length ? themes.join(', ') : 'a few durable themes'}.`,
        `Most salient signals: ${entries.slice(0, 3).map((entry) => entry.content).join(' | ')}`,
        actions.length ? `Operational pull: ${actions.join(' | ')}` : 'Operational pull: consolidate durable rules and turn repeated patterns into procedures.',
      ].join('\n\n'),
      themes,
      actions,
      sourceIds,
      sourceLayers,
      sourceCount: entries.length,
      tookMs: Date.now() - start,
    };
  }

  async contextPack(query: string, options?: ContextPackOptions): Promise<ContextPackResponse> {
    const start = Date.now();
    const opts = contextPackOptionsSchema.parse({
      profile: 'agent-safe',
      includeRecent: true,
      ...options,
    });

    const recall = await this.smartRecall(query, opts);
    const seenIds = new Set<string>();
    const sourceIds: string[] = [];
    const sections: ContextPackSection[] = [];
    let truncated = false;

    const rememberSources = (ids: string[]) => {
      for (const id of ids) {
        if (!seenIds.has(id)) {
          seenIds.add(id);
          sourceIds.push(id);
        }
      }
    };

    const formatResult = (result: SmartRecallResult | QueryResult, index: number) => {
      const lane = 'sourceLane' in result ? ` lane=${result.sourceLane}` : '';
      const score = 'combinedScore' in result
        ? ` score=${result.combinedScore.toFixed(2)}`
        : typeof result.relevanceScore === 'number'
          ? ` score=${result.relevanceScore.toFixed(2)}`
          : '';
      const topics = result.topics.length ? ` topics=${result.topics.join(',')}` : '';
      const metadata = opts.includeMetadata && Object.keys(result.metadata ?? {}).length
        ? ` metadata=${JSON.stringify(result.metadata)}`
        : '';
      const reasons = 'reasons' in result && result.reasons.length
        ? ` reasons=${result.reasons.join('|')}`
        : '';
      return `${index + 1}. [${result.id}]${lane}${score}${topics}${reasons}${metadata}\n${result.content}`;
    };

    const addSection = (section: ContextPackSection) => {
      const next = this.renderContextPack(query, recall.profile, [...sections, section], opts.maxChars);
      if (next.truncated && sections.length > 0) {
        truncated = true;
        return;
      }
      sections.push({
        ...section,
        content: next.sectionContents[next.sectionContents.length - 1] ?? section.content,
      });
      truncated = truncated || next.truncated;
      rememberSources(section.sourceIds);
    };

    addSection({
      kind: 'overview',
      title: 'Recall overview',
      content: [
        `profile: ${recall.profile}`,
        `lanes: semantic=${recall.lanes.semantic}, graph=${recall.lanes.graph}, procedural=${recall.lanes.procedural}, recent=${recall.lanes.recent}`,
        `totalAvailable: ${recall.totalAvailable}`,
      ].join('\n'),
      sourceIds: [],
    });

    if (recall.results.length) {
      addSection({
        kind: 'recall',
        title: 'High-signal memories',
        content: recall.results.map(formatResult).join('\n\n'),
        sourceIds: recall.results.map((result) => result.id),
      });
    }

    if (opts.includeRecent) {
      const recent = (await this.getRecent(opts.recentLimit)).filter((entry) => !seenIds.has(entry.id));
      if (recent.length) {
        addSection({
          kind: 'recent',
          title: 'Recent context',
          content: recent.map(formatResult).join('\n\n'),
          sourceIds: recent.map((entry) => entry.id),
        });
      }
    }

    if (opts.includeDream) {
      const dream = await this.dream({
        query,
        layers: ['identity', 'semantic', 'procedural'],
        limit: Math.min(Math.max(opts.limit, 4), 20),
        metadata: opts.metadata,
        topicAllowlist: opts.topics,
      });
      if (dream.content && dream.sourceCount > 0) {
        addSection({
          kind: 'dream',
          title: dream.title,
          content: [
            dream.content,
            dream.themes.length ? `themes: ${dream.themes.join(', ')}` : '',
            dream.actions.length ? `actions: ${dream.actions.join(' | ')}` : '',
          ].filter(Boolean).join('\n'),
          sourceIds: dream.sourceIds,
        });
      }
    }

    const rendered = this.renderContextPack(query, recall.profile, sections, opts.maxChars);

    return {
      query,
      profile: recall.profile,
      content: rendered.content,
      sections: sections.map((section, index) => ({
        ...section,
        content: rendered.sectionContents[index] ?? section.content,
      })),
      sourceIds,
      maxChars: opts.maxChars,
      usedChars: rendered.content.length,
      truncated: truncated || rendered.truncated,
      tookMs: Date.now() - start,
    };
  }

  private renderContextPack(query: string, profile: SmartRecallOptions['profile'], sections: ContextPackSection[], maxChars: number) {
    const header = `# ReMEM Context Pack\nquery: ${query}\nprofile: ${profile}\n`;
    const sectionContents: string[] = [];
    let content = header;
    let truncated = false;

    for (const section of sections) {
      const prefix = `\n## ${section.title}\n`;
      const available = maxChars - content.length - prefix.length;
      if (available <= 0) {
        truncated = true;
        break;
      }

      let body = section.content;
      if (body.length > available) {
        body = `${body.slice(0, Math.max(0, available - 24)).trimEnd()}\n[truncated]`;
        truncated = true;
      }

      sectionContents.push(body);
      content += `${prefix}${body}\n`;
      if (truncated) break;
    }

    return {
      content: content.slice(0, maxChars),
      sectionContents,
      truncated,
    };
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

  usesNativeVectorSearch(): boolean {
    return Boolean(this._store.supportsNativeVectorSearch?.());
  }

  private defaultLinkWeight(type: string): number {
    switch (type) {
      case 'supports':
      case 'about':
        return 1;
      case 'same_project':
      case 'same_person':
        return 0.9;
      case 'follows':
      case 'caused_by':
        return 0.8;
      case 'contradicts':
        return 0.55;
      default:
        return 0.75;
    }
  }

  /**
   * Get the layer manager for advanced layer/consolidation operations.
   */
  getLayerManager(): LayerManager | undefined {
    return this.layers;
  }

  /**
   * Persist a layer entry. Exposed for advanced consolidation workflows.
   */
  async persistLayerEntry(entry: import('./types.js').LayeredMemoryEntry): Promise<void> {
    await this._store.persistLayerEntry(entry, {
      agentId: this._agentId,
      userId: this._userId,
    });
  }

  /**
   * Persist a vector embedding for a layered memory entry.
   */
  async persistLayerEmbedding(entryId: string, vector: number[], model: string): Promise<void> {
    const base64 = EmbeddingService.encodeVector(vector);
    await this._store.storeEmbedding(entryId, base64, vector.length, model, 'layered');
  }

  /**
   * Get recent memory entries.
   */
  async getRecent(n: number = 10): Promise<QueryResult[]> {
    return this._store.getRecent(n, {
      agentId: this._agentId,
      userId: this._userId,
    });
  }

  /**
   * Return a compact inventory of the configured memory scope.
   * Useful for health checks, release audits, and agent context budgeting.
   */
  async stats(): Promise<{
    coreCount: number;
    layerCount: number;
    snapshotCount: number;
    eventCount: number;
    topics: Array<{ topic: string; count: number }>;
    layers: ReturnType<LayerManager['getStats']> | null;
    oldestMemoryAt: number | null;
    newestMemoryAt: number | null;
  }> {
    const scope = { agentId: this._agentId, userId: this._userId };
    const [coreEntries, layerEntries, snapshots] = await Promise.all([
      this._store.getAllEntries(scope),
      this._store.loadAllLayerEntries(scope),
      this._store.listSnapshots(scope),
    ]);

    const topicCounts = new Map<string, number>();
    let oldestMemoryAt: number | null = null;
    let newestMemoryAt: number | null = null;

    for (const entry of coreEntries) {
      oldestMemoryAt = oldestMemoryAt === null ? entry.createdAt : Math.min(oldestMemoryAt, entry.createdAt);
      newestMemoryAt = newestMemoryAt === null ? entry.createdAt : Math.max(newestMemoryAt, entry.createdAt);
      for (const topic of entry.topics) {
        topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
      }
    }

    const topics = [...topicCounts.entries()]
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic));

    return {
      coreCount: coreEntries.length,
      layerCount: layerEntries.length,
      snapshotCount: snapshots.length,
      eventCount: this._store.getEventLog().length,
      topics,
      layers: this.getLayerStats(),
      oldestMemoryAt,
      newestMemoryAt,
    };
  }

  /**
   * Get entries by topic.
   */
  async getByTopic(topic: string, limit: number = 20): Promise<QueryResult[]> {
    return this._store.getByTopic(topic, limit, {
      agentId: this._agentId,
      userId: this._userId,
    });
  }

  async storeShared(input: StoreMemoryInput & { namespace: NamespaceInput; visibility?: 'private' | 'shared' }): Promise<void> {
    const { namespace: rawNamespace, visibility: rawVisibility, ...rest } = input;
    const namespace = this.normalizeNamespace(rawNamespace);
    const visibility = rawVisibility ?? 'shared';
    const topics = Array.from(new Set([...(rest.topics ?? []), namespace]));

    await this.store({
      content: rest.content,
      topics,
      metadata: {
        ...(rest.metadata ?? {}),
        namespace,
        visibility,
      },
    });
  }

  async queryNamespace(
    namespace: NamespaceInput,
    query: string,
    options?: QueryOptions,
    scope?: NamespaceQueryScope
  ): Promise<QueryResponse> {
    const normalizedNamespace = this.normalizeNamespace(namespace);
    const queryOptions = queryWithNeighborsOptionsSchema.pick({
      limit: true,
      topics: true,
      metadata: true,
      minAccessCount: true,
      since: true,
      until: true,
    }).parse({
      ...(options ?? {}),
      topics: Array.from(new Set([...(options?.topics ?? []), normalizedNamespace])),
      metadata: this.buildScopedMetadataFilters(scope, normalizedNamespace, options?.metadata),
    });
    return this.query(query, queryOptions);
  }

  async getRecentInNamespace(
    namespace: NamespaceInput,
    n: number = 10,
    scope?: NamespaceQueryScope
  ): Promise<QueryResult[]> {
    const normalizedNamespace = this.normalizeNamespace(namespace);
    const recent = await this.getRecent(Math.max(n * 3, n));
    const filters = this.buildScopedMetadataFilters(scope, normalizedNamespace);

    return recent
      .filter((entry) => this._store.matchMetadata ? this._store.matchMetadata(entry.metadata ?? {}, filters ?? {}) : true)
      .slice(0, n);
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

  async auditIdentityAlignment(sessionText: string): Promise<{
    drift: DriftResult;
    injection: string;
    topStatements: ConstitutionStatement[];
  }> {
    const drift = await this.detectDrift(sessionText);
    return {
      drift,
      injection: this.getConstitutionInjection(drift),
      topStatements: drift.violatingStatements.slice(0, 5),
    };
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
    // Wire EmbeddingService into LayerManager if available
    this.layers = new LayerManager(config ?? DEFAULT_LAYER_CONFIG, this.embeddingService);
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

        // Restore entry embeddings from SQLite
        if (this.embeddingService) {
          for (const entry of persisted) {
            try {
              const stored = await this._store.getEmbedding(entry.id);
              if (stored) {
                const vector = EmbeddingService.decodeVector(stored.base64, stored.dimension);
                this.layers.setEntryEmbedding(entry.id, vector);
              }
            } catch {
              // Best-effort embedding restore
            }
          }
        }
      } catch {
        // Layer restore is best-effort — don't fail init if it breaks
      }
    }

    // Auto-compress episodic if over capacity after restore
    if (this.needsEpisodicCompression() && this.model) {
      this.compressEpisodic(20).catch(() => {/* best-effort */});
    }
  }

  /**
   * Store in a specific layer.
   */
  async storeInLayer(input: StoreMemoryInput, layer: MemoryLayer): Promise<QueryResult | null> {
    const normalized = storeMemoryInputSchema.parse(input);

    if (!this.layers) {
      await this.enableLayers();
    }
    const entry = this.layers!.store(normalized, layer);
    await this._store.persistLayerEntry(entry, {
      agentId: this._agentId,
      userId: this._userId,
    });

    // Generate embedding and store in LayerManager for hybrid layer scoring
    if (this.embeddingService) {
      const contentToEmbed = normalized.topics.length > 0
        ? `[${normalized.topics.join(', ')}] ${normalized.content}`
        : normalized.content;

      this.embeddingService
        .generateEmbedding(entry.id, contentToEmbed)
        .then(async (emb) => {
          await this._store.storeEmbedding(entry.id, emb.base64, emb.vector.length, emb.model);
          this.layers!.setEntryEmbedding(entry.id, emb.vector);
        })
        .catch((err) => console.warn(`[ReMEM] Layer embedding failed for ${entry.id}: ${err}`));
    }

    // Check episodic capacity — auto-compress if needed
    if (this.needsEpisodicCompression() && this.model) {
      this.compressEpisodic(20).catch(() => {/* best-effort */});
    }

    return {
      id: entry.id,
      content: entry.content,
      topics: entry.topics,
      metadata: entry.metadata,
      relevanceScore: entry.importance,
      createdAt: entry.createdAt,
      accessedAt: entry.accessedAt,
      accessCount: entry.accessCount,
    };
  }

  /**
   * Query across layers with weighted retrieval.
   * Uses hybrid scoring (keyword + semantic embeddings) when embedding service is available.
   */
  async queryLayers(
    query: string,
    options?: QueryOptions & { layers?: MemoryLayer[] }
  ): Promise<Awaited<ReturnType<LayerManager['query']>> | null> {
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
  async storeProcedural(input: StoreMemoryInput, trigger: string | Partial<ProceduralTrigger>): Promise<QueryResult | null> {
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
      metadata: entry.metadata,
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
    return this.matchProcedural(context).map((match) => ({
      id: match.entry.id,
      content: match.entry.content,
      topics: match.entry.topics,
      metadata: match.entry.metadata,
      relevanceScore: match.score,
      createdAt: match.entry.createdAt,
      accessedAt: match.entry.accessedAt,
      accessCount: match.entry.accessCount,
    }));
  }

  matchProcedural(context: string): ProceduralMatch[] {
    if (!this.layers) return [];
    return this.layers.matchProcedural(context);
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
        metadata: current.metadata,
        relevanceScore: current.importance,
        createdAt: current.createdAt,
        accessedAt: current.accessedAt,
        accessCount: current.accessCount,
      });
      const nextId: string | undefined = current.supersededBy ?? undefined;
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
    checksum: string | null;
  }> {
    const meta = await this._store.createSnapshot(label, {
      agentId: this._agentId,
      userId: this._userId,
    });
    return meta;
  }

  /**
   * Restore from a snapshot by ID.
   * Verifies checksum, then restores core and layered entries from the snapshot into the current store.
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
    checksum: string | null;
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
      checksum: s.checksum,
    }));
  }

  /**
   * Export a snapshot as portable JSON.
   */
  async exportSnapshot(snapshotId: string) {
    return this._store.exportSnapshot(snapshotId);
  }

  /**
   * Import a portable snapshot JSON export.
   */
  async importSnapshot(snapshot: Awaited<ReturnType<MemoryStoreLike['exportSnapshot']>>, opts?: { overwrite?: boolean }) {
    return this._store.importSnapshot(snapshot, opts);
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
  getStore(): MemoryStoreLike {
    return this._store;
  }

  /**
   * Get the model name if configured.
   */
  getModelName(): string | undefined {
    return this.model?.name();
  }

  /**
   * Get the configured model client for advanced workflows.
   */
  getModel(): ModelAbstraction | undefined {
    return this.model;
  }

  /**
   * Run a first-class consolidation workflow: dedupe, conflict resolution,
   * promotion, optional summary generation, and optional procedural promotion.
   */
  async runConsolidation(options: ConsolidationWorkflowOptions = {}): Promise<ConsolidationWorkflowResult> {
    if (!this.layers) {
      await this.enableLayers();
    }
    const consolidator = new MemoryConsolidator(this, this.embeddingService ?? null, options);
    return consolidator.runWorkflow(options);
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
export { PostgresMemoryStore } from './postgres-store.js';
export type { MemoryStoreLike, SnapshotExport, SnapshotMeta, StoreMemoryOptions } from './storage-types.js';
export { ModelAbstraction } from './model.js';
export { QueryEngine } from './query.js';
export { MemoryREPL } from './repl.js';
export { HttpAdapter } from './http.js';
export { MemoryConsolidator } from './consolidate.js';
export { EpisodicCapturePipeline } from './episodic-capture.js';
export {
  createVercelAIAdapter,
  createHermesAdapter,
  createLangGraphStoreAdapter,
  createOpenClawAdapter,
} from './adapters.js';
export type { ReMEMAdapterOptions } from './adapters.js';
export * from './types.js';
export * from './identity.js';
export * from './layers.js';
export * from './duplicate.js';
