/**
 * ReMEM — Hierarchical Memory Layers
 * Episodic / Semantic / Identity with TTL-based eviction and weighted retrieval
 */

import { randomUUID } from 'crypto';
import {
  type LayerConfig,
  type LayeredMemoryEntry,
  type MemoryLayer,
  type QueryOptions,
  type QueryResult,
  type StoreMemoryInput,
  layerConfigSchema,
} from './types.js';

// ============================================================================
// Layer Manager — manages the three-tier memory hierarchy
// ============================================================================

export type { LayerConfig };

export const DEFAULT_LAYER_CONFIG: Required<LayerConfig> = {
  episodic: { ttlMs: 3_600_000, maxEntries: 1000, weight: 0.2 },      // 1 hour
  semantic: { ttlMs: 604_800_000, maxEntries: 5000, weight: 0.3 },   // 7 days
  identity: { ttlMs: 2_592_000_000, maxEntries: 500, weight: 0.5 },   // 30 days
};

export class LayerManager {
  private entries: Map<string, LayeredMemoryEntry> = new Map();
  private config: Required<LayerConfig>;

  constructor(config?: Partial<LayerConfig>) {
    const merged = {
      episodic: { ...DEFAULT_LAYER_CONFIG.episodic, ...config?.episodic },
      semantic: { ...DEFAULT_LAYER_CONFIG.semantic, ...config?.semantic },
      identity: { ...DEFAULT_LAYER_CONFIG.identity, ...config?.identity },
    };
    this.config = layerConfigSchema.parse(merged) as Required<LayerConfig>;
  }

  /**
   * Store an entry in the appropriate layer.
   * If layer is not specified, auto-assigns based on topics and content.
   */
  store(input: StoreMemoryInput, layer?: MemoryLayer): LayeredMemoryEntry {
    const assignedLayer = layer ?? this.autoAssignLayer(input);
    const now = Date.now();
    const layerCfg = this.config[assignedLayer];

    const entry: LayeredMemoryEntry = {
      id: randomUUID(),
      content: input.content,
      topics: input.topics ?? [],
      metadata: input.metadata ?? {},
      createdAt: now,
      accessedAt: now,
      accessCount: 0,
      layer: assignedLayer,
      expiresAt: now + layerCfg.ttlMs,
      importance: input.metadata?.importance as number ?? 0.5,
    };

    // Enforce max entries for this layer
    this.evictIfNeeded(assignedLayer);

    this.entries.set(entry.id, entry);
    return entry;
  }

  /**
   * Get an entry by ID.
   */
  get(id: string): LayeredMemoryEntry | null {
    const entry = this.entries.get(id);
    if (!entry) return null;

    // Check if expired
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.entries.delete(id);
      return null;
    }

    // Update access metadata
    entry.accessedAt = Date.now();
    entry.accessCount++;
    return entry;
  }

  /**
   * Query across all layers with weighted retrieval.
   * Entries from higher-weight layers rank higher, but content match still matters.
   */
  query(
    text: string,
    options?: QueryOptions & { layers?: MemoryLayer[] }
  ): { results: QueryResult[]; totalAvailable: number; layerBreakdown: Record<MemoryLayer, number> } {
    const layers = options?.layers ?? (['episodic', 'semantic', 'identity'] as MemoryLayer[]);
    const now = Date.now();

    let allEntries: Array<LayeredMemoryEntry & { weightedScore: number }> = [];

    for (const layer of layers) {
      const layerCfg = this.config[layer];

      for (const entry of this.entries.values()) {
        if (entry.layer !== layer) continue;

        // Skip expired
        if (entry.expiresAt && now > entry.expiresAt) {
          this.entries.delete(entry.id);
          continue;
        }

        // Topic filter
        if (options?.topics && options.topics.length > 0) {
          const hasTopic = options.topics.some((t) =>
            entry.topics.some((et) => et.toLowerCase().includes(t.toLowerCase()))
          );
          if (!hasTopic) continue;
        }

        // Time range filter
        if (options?.since && entry.createdAt < options.since) continue;
        if (options?.until && entry.createdAt > options.until) continue;

        // Access count filter
        if (options?.minAccessCount && entry.accessCount < options.minAccessCount) continue;

        // Content relevance score
        const contentScore = this.simpleRelevance(entry.content, text);

        // Weighted score: layer weight * content relevance * importance
        const weightedScore = layerCfg.weight * contentScore * (0.5 + entry.importance);

        allEntries.push({ ...entry, weightedScore });
      }
    }

    // Sort by weighted score
    allEntries.sort((a, b) => b.weightedScore - a.weightedScore);

    // Layer breakdown for stats
    const layerBreakdown = {
      episodic: 0,
      semantic: 0,
      identity: 0,
    } as Record<MemoryLayer, number>;
    for (const entry of allEntries) {
      layerBreakdown[entry.layer]++;
    }

    const limit = options?.limit ?? 10;
    const results: QueryResult[] = allEntries.slice(0, limit).map((entry) => ({
      id: entry.id,
      content: entry.content,
      topics: entry.topics,
      relevanceScore: entry.weightedScore,
      createdAt: entry.createdAt,
      accessedAt: entry.accessedAt,
      accessCount: entry.accessCount,
    }));

    return {
      results,
      totalAvailable: allEntries.length,
      layerBreakdown,
    };
  }

  /**
   * Get recent entries across all layers.
   */
  getRecent(n: number = 10, layers?: MemoryLayer[]): QueryResult[] {
    const targetLayers = layers ?? (['episodic', 'semantic', 'identity'] as MemoryLayer[]);
    const now = Date.now();

    const entries: Array<LayeredMemoryEntry & { weightedScore: number }> = [];

    for (const entry of this.entries.values()) {
      if (!targetLayers.includes(entry.layer)) continue;
      if (entry.expiresAt && now > entry.expiresAt) {
        this.entries.delete(entry.id);
        continue;
      }

      // Weight by layer priority
      const layerWeight = this.config[entry.layer].weight;
      const weightedScore = layerWeight * (entry.accessCount + 1);
      entries.push({ ...entry, weightedScore });
    }

    entries.sort((a, b) => b.weightedScore - a.weightedScore);

    return entries.slice(0, n).map((entry) => ({
      id: entry.id,
      content: entry.content,
      topics: entry.topics,
      relevanceScore: entry.weightedScore,
      createdAt: entry.createdAt,
      accessedAt: entry.accessedAt,
      accessCount: entry.accessCount,
    }));
  }

  /**
   * Get entries by topic across all layers.
   */
  getByTopic(topic: string, limit: number = 20): QueryResult[] {
    const now = Date.now();
    const results: Array<QueryResult & { weightedScore: number }> = [];

    for (const entry of this.entries.values()) {
      if (entry.layer === 'episodic') continue; // topics usually go to semantic or identity
      if (entry.expiresAt && now > entry.expiresAt) {
        this.entries.delete(entry.id);
        continue;
      }

      if (!entry.topics.some((t) => t.toLowerCase().includes(topic.toLowerCase()))) continue;

      const layerWeight = this.config[entry.layer].weight;
      results.push({
        id: entry.id,
        content: entry.content,
        topics: entry.topics,
        relevanceScore: layerWeight * (entry.accessCount + 1),
        createdAt: entry.createdAt,
        accessedAt: entry.accessedAt,
        accessCount: entry.accessCount,
        weightedScore: layerWeight,
      });
    }

    results.sort((a, b) => b.weightedScore - a.weightedScore);

    return results.slice(0, limit).map(({ weightedScore, ...r }) => r as QueryResult);
  }

  /**
   * Forget an entry.
   */
  forget(id: string): boolean {
    return this.entries.delete(id);
  }

  /**
   * Evict entries from a specific layer if over maxEntries.
   * Evicts oldest accessed entries first.
   */
  private evictIfNeeded(layer: MemoryLayer): void {
    const cfg = this.config[layer];
    const layerEntries = [...this.entries.values()].filter((e) => e.layer === layer);

    if (layerEntries.length >= cfg.maxEntries) {
      // Sort by accessedAt ascending (oldest first)
      layerEntries.sort((a, b) => a.accessedAt - b.accessedAt);

      const toRemove = layerEntries.slice(0, Math.ceil(cfg.maxEntries * 0.1)); // Remove 10%
      for (const entry of toRemove) {
        this.entries.delete(entry.id);
      }
    }
  }

  /**
   * Run TTL-based eviction. Call periodically (e.g., on init or query).
   */
  evictExpired(): number {
    const now = Date.now();
    let evicted = 0;

    for (const [id, entry] of this.entries.entries()) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.entries.delete(id);
        evicted++;
      }
    }

    return evicted;
  }

  /**
   * Auto-assign layer based on content analysis.
   */
  private autoAssignLayer(input: StoreMemoryInput): MemoryLayer {
    const text = `${input.content} ${(input.topics ?? []).join(' ')}`.toLowerCase();

    // Identity keywords
    const identityKeywords = ['i am', 'i prefer', 'my values', 'my goals', 'my boundaries', 'i always', 'i never'];
    if (identityKeywords.some((k) => text.includes(k))) return 'identity';

    // Semantic keywords
    const semanticKeywords = ['project', 'decision', 'agreed', 'remember', 'context', 'learned', 'figured out'];
    if (semanticKeywords.some((k) => text.includes(k))) return 'semantic';

    // Default to episodic for everything else
    return 'episodic';
  }

  /**
   * Get stats for each layer.
   */
  getStats(): Record<MemoryLayer, { count: number; maxEntries: number; ttlMs: number; weight: number }> {
    const now = Date.now();
    const counts = { episodic: 0, semantic: 0, identity: 0 } as Record<MemoryLayer, number>;

    for (const entry of this.entries.values()) {
      if (entry.expiresAt && now > entry.expiresAt) continue;
      counts[entry.layer]++;
    }

    return {
      episodic: { count: counts.episodic, ...this.config.episodic },
      semantic: { count: counts.semantic, ...this.config.semantic },
      identity: { count: counts.identity, ...this.config.identity },
    };
  }

  private simpleRelevance(content: string, query: string): number {
    const lower = content.toLowerCase();
    const terms = query.toLowerCase().split(/\s+/);
    const matches = terms.filter((t) => lower.includes(t)).length;
    return matches / Math.max(terms.length, 1);
  }
}
