/**
 * ReMEM — Memory Consolidation
 * Deduplication, merging, and conflict resolution across memory layers.
 *
 * v0.6.0: Memory consolidation
 * - Similarity-based deduplication: merge near-duplicate entries on store
 * - Cross-layer conflict resolution: contradiction detection + supersession
 * - Cross-layer promotion: frequently-accessed episodic entries promoted to semantic
 * - Periodic consolidation: full deduplication pass over all layers
 *
 * Usage:
 *   const consolidator = new MemoryConsolidator(remem, embeddingService);
 *   await consolidator.deduplicateLayer('semantic');
 *   await consolidator.promoteFrequentEpisodic();
 */

import { randomUUID } from 'crypto';
import type { LayeredMemoryEntry, MemoryLayer } from './types.js';
import type { EmbeddingService } from './embeddings.js';

export interface ConsolidationOptions {
  /** Cosine similarity threshold for deduplication (0-1). Default: 0.85 */
  similarityThreshold?: number;
  /** Minimum access count to trigger episodic promotion. Default: 5 */
  promotionAccessThreshold?: number;
  /** Run consolidation on every store() call. Default: false (manual only) */
  autoOnStore?: boolean;
  /** Merge strategy for near-duplicates */
  mergeStrategy?: 'newer_wins' | 'older_wins' | 'concatenate' | 'supersede';
}

export interface ConsolidationResult {
  deduplicated: number;
  promoted: number;
  superseded: number;
  errors: string[];
}

export interface SimilarityPair {
  entryA: LayeredMemoryEntry;
  entryB: LayeredMemoryEntry;
  similarity: number;
}

const DEFAULT_OPTIONS: Required<ConsolidationOptions> = {
  similarityThreshold: 0.85,
  promotionAccessThreshold: 5,
  autoOnStore: false,
  mergeStrategy: 'newer_wins',
};

/**
 * MemoryConsolidator
 *
 * Handles:
 * 1. Deduplication — find and merge near-duplicate entries using embeddings
 * 2. Conflict resolution — detect contradictions, mark one as superseded
 * 3. Cross-layer promotion — promote frequently-accessed episodic entries to semantic
 * 4. Periodic full consolidation — run over all layers to clean up
 */
export class MemoryConsolidator {
  private remem: {
    store(input: { content: string; topics?: string[]; metadata?: Record<string, unknown> }, layer?: MemoryLayer): LayeredMemoryEntry;
    getLayerManager?(): {
      store(input: { content: string; topics?: string[]; metadata?: Record<string, unknown> }, layer?: MemoryLayer): LayeredMemoryEntry;
      getAllEntries(): LayeredMemoryEntry[];
      forget(id: string): boolean;
      getStats(): Record<MemoryLayer, { count: number; maxEntries: number; ttlMs: number; weight: number }>;
    };
    getEmbeddingService?(): EmbeddingService | null;
    persistLayerEntry?(entry: LayeredMemoryEntry, opts?: any): Promise<void>;
  };
  private embeddingService: EmbeddingService | null;
  private options: Required<ConsolidationOptions>;

  constructor(
    remem: MemoryConsolidator['remem'],
    embeddingService: EmbeddingService | null = null,
    options: ConsolidationOptions = {}
  ) {
    this.remem = remem;
    this.embeddingService = embeddingService ?? remem.getEmbeddingService?.() ?? null;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  // =========================================================================
  // Similarity-Based Deduplication
  // =========================================================================

  /**
   * Find all near-duplicate pairs in a layer.
   * Uses embedding cosine similarity when available, keyword fallback otherwise.
   */
  async findSimilarPairs(layer: MemoryLayer): Promise<SimilarityPair[]> {
    const layerManager = this.remem.getLayerManager?.();
    if (!layerManager) return [];

    const entries = layerManager.getAllEntries().filter((e: LayeredMemoryEntry) => e.layer === layer);
    const pairs: SimilarityPair[] = [];

    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const similarity = await this.computeSimilarity(entries[i], entries[j]);
        if (similarity >= this.options.similarityThreshold) {
          pairs.push({ entryA: entries[i], entryB: entries[j], similarity });
        }
      }
    }

    return pairs;
  }

  /**
   * Compute similarity between two entries.
   * Uses embeddings when available, keyword Jaccard fallback.
   */
  async computeSimilarity(a: LayeredMemoryEntry, b: LayeredMemoryEntry): Promise<number> {
    // If we have the embedding service and entries have embeddings stored, use cosine similarity
    if (this.embeddingService) {
      try {
        const embA = await this.getEntryEmbedding(a.id);
        const embB = await this.getEntryEmbedding(b.id);
        if (embA && embB) {
          return this.cosineSimilarity(embA, embB);
        }
      } catch {
        // Fall through to keyword similarity
      }
    }

    // Keyword-based similarity fallback
    return this.keywordSimilarity(a.content, b.content);
  }

  private async getEntryEmbedding(entryId: string): Promise<number[] | null> {
    // Try to get from layer manager's entry embeddings map
    const layerManager = this.remem.getLayerManager?.();
    if (layerManager && 'entryEmbeddings' in layerManager) {
      const embeddings = (layerManager as any).entryEmbeddings as Map<string, number[]>;
      return embeddings.get(entryId) ?? null;
    }
    return null;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);
  }

  private keywordSimilarity(textA: string, textB: string): number {
    const tokensA = new Set(textA.toLowerCase().split(/\W+/).filter(Boolean));
    const tokensB = new Set(textB.toLowerCase().split(/\W+/).filter(Boolean));
    const intersection = [...tokensA].filter((t) => tokensB.has(t)).length;
    const union = new Set([...tokensA, ...tokensB]).size;
    return union > 0 ? intersection / union : 0;
  }

  // =========================================================================
  // Merge Strategies
  // =========================================================================

  /**
   * Merge two entries according to the configured merge strategy.
   * Returns the merged entry content + metadata.
   */
  merge(a: LayeredMemoryEntry, b: LayeredMemoryEntry): { content: string; topics: string[]; metadata: Record<string, unknown> } {
    const strategy = this.options.mergeStrategy;

    // Determine which entry "wins" for content
    const older = a.createdAt <= b.createdAt ? a : b;
    const newer = a.createdAt <= b.createdAt ? b : a;
    const winner = strategy === 'older_wins' ? older : newer;
    const loser = winner === older ? newer : older;

    let content: string;
    let topics: string[];
    let metadata: Record<string, unknown>;

    switch (strategy) {
      case 'newer_wins':
      case 'older_wins': {
        // Winner content, merged topics and metadata
        content = winner.content;
        topics = [...new Set([...a.topics, ...b.topics])];
        metadata = { ...a.metadata, ...b.metadata, mergedFrom: [a.id, b.id], winner: winner.id, consolidatedAt: Date.now() };
        break;
      }
      case 'concatenate': {
        // Chronological concatenation: older first, newer second
        content = `${older.content}\n---\n${newer.content}`;
        topics = [...new Set([...a.topics, ...b.topics])];
        metadata = { ...a.metadata, ...b.metadata, mergedFrom: [a.id, b.id], consolidatedAt: Date.now() };
        break;
      }
      case 'supersede': {
        // Keep winner content, loser is marked as superseded via supersededBy field (set by caller)
        content = winner.content;
        topics = winner.topics;
        metadata = { ...winner.metadata, supersededBy: winner.id, consolidatedAt: Date.now() };
        break;
      }
      default:
        content = winner.content;
        topics = winner.topics;
        metadata = { ...winner.metadata };
    }

    return { content, topics, metadata };
  }

  // =========================================================================
  // Deduplicate a Layer
  // =========================================================================

  /**
   * Run deduplication over a specific layer.
   * Finds similar pairs, merges them, and deletes the merged entries.
   * @returns Number of entries deduplicated
   */
  async deduplicateLayer(layer: MemoryLayer): Promise<ConsolidationResult> {
    const result: ConsolidationResult = { deduplicated: 0, promoted: 0, superseded: 0, errors: [] };
    const layerManager = this.remem.getLayerManager?.();
    if (!layerManager) {
      result.errors.push('No layer manager available');
      return result;
    }

    const pairs = await this.findSimilarPairs(layer);
    const processedIds = new Set<string>();

    for (const pair of pairs) {
      // Skip if either entry was already processed in this run
      if (processedIds.has(pair.entryA.id) || processedIds.has(pair.entryB.id)) continue;

      const merged = this.merge(pair.entryA, pair.entryB);
      const winner = pair.entryB.createdAt >= pair.entryA.createdAt ? pair.entryB : pair.entryA;

      try {
        // Store merged entry
        const newEntry = this.remem.store(
          {
            content: merged.content,
            topics: merged.topics,
            metadata: {
              ...merged.metadata,
              consolidatedFrom: [pair.entryA.id, pair.entryB.id],
              similarity: pair.similarity,
            },
          },
          layer
        );

        // Delete the old entries
        layerManager.forget(pair.entryA.id);
        layerManager.forget(pair.entryB.id);
        processedIds.add(pair.entryA.id);
        processedIds.add(pair.entryB.id);
        result.deduplicated++;

        // If strategy was supersede, count as superseded
        if (this.options.mergeStrategy === 'supersede') {
          result.superseded++;
        }

        // Generate embedding for the new merged entry if embedding service is available
        if (this.embeddingService && newEntry.id) {
          try {
            const vec = await this.embeddingService.embed(merged.content);
            const encoded = Buffer.from(new Float32Array(vec).buffer).toString('base64');
            await this.remem.persistLayerEntry?.(
              { ...newEntry, content: merged.content } as LayeredMemoryEntry,
              {}
            );
            // Store the embedding vector in layer manager
            if (layerManager && 'setEntryEmbedding' in layerManager) {
              (layerManager as any).setEntryEmbedding(newEntry.id, vec);
            }
          } catch (err) {
            result.errors.push(`Embedding generation failed for ${newEntry.id}: ${err}`);
          }
        }
      } catch (err) {
        result.errors.push(`Merge failed for ${pair.entryA.id}+${pair.entryB.id}: ${err}`);
      }
    }

    return result;
  }

  // =========================================================================
  // Cross-Layer Conflict Resolution
  // =========================================================================

  /**
   * Detect contradictions between entries in the same layer.
   * Uses negation pattern matching to find conflicting statements.
   *
   * e.g., "User prefers dark mode" vs "User prefers light mode"
   */
  async detectConflicts(layer: MemoryLayer): Promise<Array<{ older: LayeredMemoryEntry; newer: LayeredMemoryEntry }>> {
    const layerManager = this.remem.getLayerManager?.();
    if (!layerManager) return [];

    const entries = layerManager.getAllEntries().filter((e: LayeredMemoryEntry) => e.layer === layer);
    const conflicts: Array<{ older: LayeredMemoryEntry; newer: LayeredMemoryEntry }> = [];

    const NEGATION_PATTERNS = [
      /prefer(s|ring|red)?\s+not\s+/i,
      /prefer(s|ring|red)?\s+instead\s+/i,
      /no\s+longer\s+/i,
      /changed\s+to\s+/i,
      /now\s+(use|pref|like)\s+/i,
      /switched\s+to\s+/i,
      /from\s+\w+\s+to\s+\w+\s+transition/i,
    ];

    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const a = entries[i];
        const b = entries[j];

        const aHasNegation = NEGATION_PATTERNS.some((p) => p.test(a.content));
        const bHasNegation = NEGATION_PATTERNS.some((p) => p.test(b.content));

        // Only flag if one has negation and they share topics
        if (aHasNegation !== bHasNegation) {
          const sharedTopics = a.topics.filter((t: string) => b.topics.includes(t));
          if (sharedTopics.length > 0) {
            // The one WITHOUT negation is the original fact, the one WITH is the contradiction
            const older = aHasNegation ? b : a;
            const newer = aHasNegation ? a : b;
            conflicts.push({ older, newer });
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * Resolve conflicts by marking older entries as superseded.
   * Keeps the newest (most recent) entry as authoritative.
   */
  async resolveConflicts(layer: MemoryLayer): Promise<ConsolidationResult> {
    const result: ConsolidationResult = { deduplicated: 0, promoted: 0, superseded: 0, errors: [] };
    const layerManager = this.remem.getLayerManager?.();
    if (!layerManager) {
      result.errors.push('No layer manager available');
      return result;
    }

    const conflicts = await this.detectConflicts(layer);

    for (const { older, newer } of conflicts) {
      try {
        // Mark older as superseded by newer
        older.supersededBy = newer.id;
        older.validUntil = newer.createdAt; // older was true until newer's creation time

        // Persist the updated older entry
        await this.remem.persistLayerEntry?.(older, {});
        result.superseded++;
      } catch (err) {
        result.errors.push(`Conflict resolution failed for ${older.id}: ${err}`);
      }
    }

    return result;
  }

  // =========================================================================
  // Cross-Layer Promotion
  // =========================================================================

  /**
   * Promote frequently-accessed episodic entries to semantic layer.
   * Entries with accessCount >= promotionAccessThreshold that are still in episodic
   * after 10 minutes get promoted to semantic layer (they're important enough to keep longer).
   */
  async promoteFrequentEpisodic(): Promise<ConsolidationResult> {
    const result: ConsolidationResult = { deduplicated: 0, promoted: 0, superseded: 0, errors: [] };
    const layerManager = this.remem.getLayerManager?.();
    if (!layerManager) {
      result.errors.push('No layer manager available');
      return result;
    }

    const entries = layerManager.getAllEntries().filter((e: LayeredMemoryEntry) => e.layer === 'episodic');
    const now = Date.now();
    const EPISODIC_KEEP_MS = 10 * 60 * 1000; // 10 minutes

    for (const entry of entries) {
      // Only promote if:
      // 1. Access count exceeds threshold
      // 2. Entry has been in episodic for at least 10 minutes (not just a transient event)
      if (entry.accessCount >= this.options.promotionAccessThreshold &&
          (now - entry.createdAt) >= EPISODIC_KEEP_MS) {
        try {
          // Store a copy in semantic layer
          const promoted = this.remem.store(
            {
              content: entry.content,
              topics: [...entry.topics, 'promoted-from-episodic'],
              metadata: {
                ...entry.metadata,
                promotedFrom: entry.id,
                originalLayer: 'episodic',
                originalCreatedAt: entry.createdAt,
                promotedAt: now,
                accessCount: entry.accessCount,
              },
            },
            'semantic'
          );

          // Mark original as superseded (superseded by promoted version)
          entry.supersededBy = promoted.id;
          entry.validUntil = now;
          await this.remem.persistLayerEntry?.(entry, {});

          // Delete original from episodic
          layerManager.forget(entry.id);
          result.promoted++;
        } catch (err) {
          result.errors.push(`Promotion failed for ${entry.id}: ${err}`);
        }
      }
    }

    return result;
  }

  // =========================================================================
  // Full Periodic Consolidation
  // =========================================================================

  /**
   * Run full consolidation over all layers.
   * 1. Deduplicate each layer
   * 2. Resolve conflicts in semantic and identity layers
   * 3. Promote frequent episodic entries
   *
   * @param layers Layers to consolidate. Defaults to all.
   */
  async consolidateAll(
    layers: MemoryLayer[] = ['episodic', 'semantic', 'identity', 'procedural']
  ): Promise<ConsolidationResult> {
    const result: ConsolidationResult = { deduplicated: 0, promoted: 0, superseded: 0, errors: [] };

    for (const layer of layers) {
      // Step 1: Deduplicate
      const dedupResult = await this.deduplicateLayer(layer);
      result.deduplicated += dedupResult.deduplicated;
      result.superseded += dedupResult.superseded;
      result.errors.push(...dedupResult.errors);

      // Step 2: Resolve conflicts (semantic and identity layers only)
      if (layer === 'semantic' || layer === 'identity') {
        const conflictResult = await this.resolveConflicts(layer);
        result.superseded += conflictResult.superseded;
        result.errors.push(...conflictResult.errors);
      }
    }

    // Step 3: Promote frequent episodic entries
    const promotionResult = await this.promoteFrequentEpisodic();
    result.promoted += promotionResult.promoted;
    result.errors.push(...promotionResult.errors);

    return result;
  }
}
