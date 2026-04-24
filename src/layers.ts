/**
 * ReMEM — Hierarchical Memory Layers
 * Episodic / Semantic / Identity / Procedural
 * with TTL-based eviction, weighted retrieval, temporal validity, and self-edit
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
// Layer Manager — manages the four-tier memory hierarchy
// ============================================================================

export type { LayerConfig };

export const DEFAULT_LAYER_CONFIG: Required<LayerConfig> = {
  episodic: { ttlMs: 3_600_000, maxEntries: 1000, weight: 0.2 },       // 1 hour
  semantic: { ttlMs: 604_800_000, maxEntries: 5000, weight: 0.3, selfEdit: false, temporalValidity: true }, // 7 days
  identity: { ttlMs: 2_592_000_000, maxEntries: 500, weight: 0.5 },    // 30 days
  procedural: { ttlMs: 2_592_000_000, maxEntries: 500, weight: 0.4 },    // 30 days
};

export interface SupersessionResult {
  superseded: boolean;
  supersededEntryId?: string;
  newEntry?: LayeredMemoryEntry;
  reason?: string;
}

export class LayerManager {
  private entries: Map<string, LayeredMemoryEntry> = new Map();
  private config: Required<LayerConfig>;

  constructor(config?: Partial<LayerConfig>) {
    const merged = {
      episodic: { ...DEFAULT_LAYER_CONFIG.episodic, ...config?.episodic },
      semantic: { ...DEFAULT_LAYER_CONFIG.semantic, ...config?.semantic },
      identity: { ...DEFAULT_LAYER_CONFIG.identity, ...config?.identity },
      procedural: { ...DEFAULT_LAYER_CONFIG.procedural, ...config?.procedural },
    };
    this.config = layerConfigSchema.parse(merged) as Required<LayerConfig>;
  }

  /**
   * Store an entry in the appropriate layer.
   * If layer is not specified, auto-assigns based on topics and content.
   * For semantic layer with selfEdit=true, detects contradictions and auto-supersedes.
   */
  store(input: StoreMemoryInput, layer?: MemoryLayer): LayeredMemoryEntry {
    const assignedLayer = layer ?? this.autoAssignLayer(input);
    const now = Date.now();
    const layerCfg = this.config[assignedLayer];

    let supersedesId: string | undefined;

    // Self-edit: check for supersession on semantic layer BEFORE creating entry
    if (assignedLayer === 'semantic' && (layerCfg as { selfEdit?: boolean }).selfEdit) {
      const result = this.checkSupersession(input, assignedLayer);
      if (result.superseded && result.supersededEntryId) {
        // Mark the old entry as superseded
        const old = this.entries.get(result.supersededEntryId);
        if (old) {
          old.validUntil = now;
          this.entries.set(old.id, old);
        }
        supersedesId = result.supersededEntryId;
      }
    }

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
      // Temporal validity (semantic layer)
      validFrom: (assignedLayer === 'semantic' && (layerCfg as { temporalValidity?: boolean }).temporalValidity) ? now : undefined,
      validUntil: undefined, // null means still valid
      // Self-edit supersession chain
      supersedes: supersedesId,
      supersededBy: undefined,
    };

    // Enforce max entries for this layer
    this.evictIfNeeded(assignedLayer);

    this.entries.set(entry.id, entry);
    return entry;
  }

  /**
   * Check if new input should supersede an existing semantic entry.
   * Detects contradictions by keyword negation patterns.
   */
  private checkSupersession(input: StoreMemoryInput, layer: MemoryLayer): SupersessionResult {
    const text = `${input.content} ${(input.topics ?? []).join(' ')}`.toLowerCase();

    for (const entry of this.entries.values()) {
      if (entry.layer !== layer) continue;
      if (entry.supersededBy) continue; // already superseded

      // Pattern: new entry contains negation of existing fact
      // e.g., existing: "User prefers dark mode" | new: "User prefers light mode"
      const negationPatterns = [
        /prefer(s|ring|red)?\s+not\s+/i,
        /prefer(s|ring|red)?\s+instead\s+/i,
        /no\s+longer\s+/i,
        /changed\s+to\s+/i,
        /now\s+uses?\s+/i,
        /switched\s+to\s+/i,
      ];

      const hasNegation = negationPatterns.some(p => p.test(text));
      if (!hasNegation) continue;

      // Check if they refer to the same subject/topic
      const existingTopics = entry.topics.join(' ').toLowerCase();
      const inputTopics = (input.topics ?? []).join(' ').toLowerCase();

      // Same content core or overlapping topics = potential supersession
      const contentOverlap = this.simpleRelevance(entry.content, input.content) > 0.5;
      const topicOverlap = existingTopics && inputTopics &&
        (existingTopics.split(' ').some((w: string) => inputTopics.includes(w)) ||
         inputTopics.split(' ').some(w => existingTopics.includes(w)));

      if (contentOverlap || topicOverlap) {
        return {
          superseded: true,
          supersededEntryId: entry.id,
          reason: 'Contradiction detected — newer entry supersedes older',
        };
      }
    }

    return { superseded: false };
  }

  /**
   * Store a procedural memory — a triggered behavior/rule.
   * trigger: keyword/pattern that fires this rule
   * condition: when this text appears in context
   * action: what to do when triggered
   */
  storeProcedural(input: StoreMemoryInput, trigger: string): LayeredMemoryEntry {
    const meta = { ...input.metadata, trigger };
    return this.store({ ...input, metadata: meta }, 'procedural');
  }

  /**
   * Fire procedural rules matching the given context text.
   * Returns rules whose trigger keyword appears in the context.
   */
  fireProcedural(context: string): LayeredMemoryEntry[] {
    const triggered: LayeredMemoryEntry[] = [];
    const ctx = context.toLowerCase();

    for (const entry of this.entries.values()) {
      if (entry.layer !== 'procedural') continue;

      const trigger = (entry.metadata?.trigger as string)?.toLowerCase();
      if (trigger && ctx.includes(trigger)) {
        triggered.push(entry);
      }
    }

    return triggered;
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
    const layers = options?.layers ?? (['episodic', 'semantic', 'identity', 'procedural'] as MemoryLayer[]);
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
      procedural: 0,
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
    const targetLayers = layers ?? (['episodic', 'semantic', 'identity', 'procedural'] as MemoryLayer[]);
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

    // Procedural keywords — learned behaviors, rules, triggers
    const proceduralKeywords = ['when', 'if', 'always do', 'rule:', 'trigger:', 'procedure:', 'always use', 'never use', 'do this when'];
    if (proceduralKeywords.some((k) => text.includes(k))) return 'procedural';

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
    const counts = { episodic: 0, semantic: 0, identity: 0, procedural: 0 } as Record<MemoryLayer, number>;

    for (const entry of this.entries.values()) {
      if (entry.expiresAt && now > entry.expiresAt) continue;
      counts[entry.layer]++;
    }

    return {
      episodic: { count: counts.episodic, ...this.config.episodic },
      semantic: { count: counts.semantic, ...this.config.semantic },
      identity: { count: counts.identity, ...this.config.identity },
      procedural: { count: counts.procedural, ...this.config.procedural },
    };
  }

  private simpleRelevance(content: string, query: string): number {
    const lower = content.toLowerCase();
    const terms = query.toLowerCase().split(/\s+/);
    const matches = terms.filter((t) => lower.includes(t)).length;
    return matches / Math.max(terms.length, 1);
  }
}
