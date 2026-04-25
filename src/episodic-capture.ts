/**
 * ReMEM — Episodic Capture Pipeline
 * Automatic event capture for the episodic memory layer.
 *
 * v0.5.0: Episodic capture pipeline
 * - Event buffering + batched writes to MemoryStore
 * - Importance scoring based on event type + content analysis
 * - Deduplication of rapid similar events
 * - Integration via EventSource adapters or direct capture()
 *
 * Usage:
 *   const pipeline = new EpisodicCapturePipeline(remem);
 *   pipeline.capture({ type: 'user.message', content: '...', metadata: {...} });
 *   pipeline.capture({ type: 'decision', content: 'Agreed to build X', metadata: { importance: 0.9 }});
 *   pipeline.start(); // start flush interval
 */

import { randomUUID } from 'crypto';
import type { LayeredMemoryEntry, MemoryLayer } from './types.js';

// ============================================================================
// Event Types & Interfaces
// ============================================================================

export type CaptureEventType =
  // Core agent events
  | 'agent.turn'
  | 'agent.response'
  | 'agent.tool_call'
  | 'agent.tool_result'
  | 'agent.error'
  // User interaction
  | 'user.message'
  | 'user.feedback'
  | 'user.question'
  // Memory operations
  | 'memory.store'
  | 'memory.query'
  | 'memory.recall'
  // Session events
  | 'session.start'
  | 'session.end'
  | 'session.compaction'
  // Decisions & learnings
  | 'decision'
  | 'learning'
  | 'goal.set'
  | 'goal.achieved'
  // Drift events
  | 'identity.drift'
  | 'identity.correction';

export interface CaptureEvent {
  id?: string;
  type: CaptureEventType;
  /** Human-readable content describing the event */
  content: string;
  /** Raw metadata about the event (sender, channel, model, tool name, etc.) */
  metadata?: Record<string, unknown>;
  /** Unix timestamp ms — defaults to Date.now() */
  timestamp?: number;
  /** Override auto-computed importance (0-1). Auto-computed if not set. */
  importanceOverride?: number;
  /** Skip deduplication for this event (e.g., decisions should never be deduped) */
  noDedup?: boolean;
}

export interface CaptureOptions {
  /** Batch flush interval in ms (default: 1000) */
  flushIntervalMs?: number;
  /** Max events per batch before forced flush (default: 50) */
  maxBatchSize?: number;
  /** Deduplication window in ms — suppress events identical in type+content (default: 2000) */
  dedupWindowMs?: number;
  /** Store to a specific layer (default: 'episodic') */
  layer?: MemoryLayer;
}

// ============================================================================
// Importance Scorer
// ============================================================================

/** Keywords that indicate high-importance content */
const HIGH_IMPORTANCE_PATTERNS = [
  'decision', 'agreed', 'decided', 'commit', 'ship', 'deploy', 'publish',
  'fix', 'bug', 'broken', 'hack', 'workaround', 'important', 'critical',
  'priority', 'blocker', 'ship it', 'go', 'no-go', 'approved', 'rejected',
  'refactor', 'architecture', 'design', 'strategy', 'plan',
];

const LOW_IMPORTANCE_PATTERNS = [
  'ping', 'pong', 'heartbeat', 'typing', 'read', 'check', 'ACK', 'ok', 'yes',
  'noop', 'noop', 'null', 'skip', 'ignore', 'watermark',
];

const TYPE_IMPORTANCE: Partial<Record<CaptureEventType, number>> = {
  'decision': 0.9,
  'goal.achieved': 0.95,
  'identity.drift': 0.8,
  'identity.correction': 0.8,
  'agent.error': 0.7,
  'learning': 0.75,
  'user.feedback': 0.65,
  'user.question': 0.55,
  'goal.set': 0.7,
  'memory.store': 0.5,
  'memory.query': 0.3,
  'memory.recall': 0.4,
  'session.start': 0.2,
  'session.end': 0.3,
  'session.compaction': 0.1,
  'agent.turn': 0.4,
  'agent.response': 0.4,
  'agent.tool_call': 0.5,
  'agent.tool_result': 0.45,
  'user.message': 0.5,
};

function scoreImportance(event: CaptureEvent): number {
  // Explicit override wins
  if (event.importanceOverride !== undefined) {
    return Math.max(0, Math.min(1, event.importanceOverride));
  }

  // Start with type-based score
  let score = TYPE_IMPORTANCE[event.type] ?? 0.5;
  const lower = event.content.toLowerCase();

  // Boost for high-importance keywords
  for (const pattern of HIGH_IMPORTANCE_PATTERNS) {
    if (lower.includes(pattern)) {
      score = Math.min(1.0, score + 0.15);
      break;
    }
  }

  // Reduce for low-importance patterns
  for (const pattern of LOW_IMPORTANCE_PATTERNS) {
    if (lower.includes(pattern)) {
      score = Math.max(0.1, score - 0.2);
      break;
    }
  }

  // Very short content is usually lower value
  if (event.content.length < 20) {
    score = Math.max(0.1, score - 0.1);
  }

  // Very long content is higher value (more substance)
  if (event.content.length > 500) {
    score = Math.min(1.0, score + 0.1);
  }

  return Math.max(0, Math.min(1, score));
}

// ============================================================================
// Deduplication
// ============================================================================

interface DedupKey {
  type: CaptureEventType;
  contentHash: number;
}

/** Simple string hash for deduplication */
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h = ((h << 5) - h) + c;
    h = h & h; // 32-bit overflow
  }
  return h;
}

function makeDedupKey(event: CaptureEvent): DedupKey {
  // Normalize content: lowercase, trim, collapse whitespace
  const normalized = event.content.toLowerCase().replace(/\s+/g, ' ').trim();
  return {
    type: event.type,
    contentHash: hashString(normalized),
  };
}

// ============================================================================
// Episodic Capture Pipeline
// ============================================================================

export class EpisodicCapturePipeline {
  private remem: {
    store(input: { content: string; topics?: string[]; metadata?: Record<string, unknown> }, layer?: MemoryLayer): LayeredMemoryEntry;
    getLayerManager?(): {
      store(input: { content: string; topics?: string[]; metadata?: Record<string, unknown> }, layer?: MemoryLayer): LayeredMemoryEntry;
    };
  };
  private eventBuffer: Array<CaptureEvent> = [];
  private dedupSet: Map<string, { key: DedupKey; expiresAt: number }> = new Map();
  private flushIntervalMs: number;
  private maxBatchSize: number;
  private dedupWindowMs: number;
  private layer: MemoryLayer;
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private started = false;
  private eventCount = 0;
  private droppedCount = 0;

  constructor(remem: EpisodicCapturePipeline['remem'], options: CaptureOptions = {}) {
    this.remem = remem;
    this.flushIntervalMs = options.flushIntervalMs ?? 1000;
    this.maxBatchSize = options.maxBatchSize ?? 50;
    this.dedupWindowMs = options.dedupWindowMs ?? 2000;
    this.layer = options.layer ?? 'episodic';
  }

  /**
   * Capture a single event into the episodic layer.
   * Events are buffered and flushed in batches.
   */
  capture(event: CaptureEvent): void {
    const now = Date.now();
    this.eventCount++; // count ALL capture attempts, including suppressed duplicates

    const enriched: CaptureEvent = {
      ...event,
      id: event.id ?? randomUUID(),
      timestamp: event.timestamp ?? now,
    };

    // Deduplication check (skip if noDedup=true)
    if (!enriched.noDedup) {
      const key = makeDedupKey(enriched);
      const keyStr = `${key.type}::${key.contentHash}`;
      const existing = this.dedupSet.get(keyStr);

      if (existing && now < existing.expiresAt) {
        this.droppedCount++;
        return; // Suppressed duplicate
      }

      // Register dedup entry
      this.dedupSet.set(keyStr, { key, expiresAt: now + this.dedupWindowMs });
    }

    this.eventBuffer.push(enriched);

    // Force flush if batch is full
    if (this.eventBuffer.length >= this.maxBatchSize) {
      this.flush().catch((err) => console.error('[EpisodicCapture] flush error:', err));
    }
  }

  /**
   * Capture multiple events at once.
   */
  captureBatch(events: CaptureEvent[]): void {
    for (const event of events) {
      this.capture(event);
    }
  }

  /**
   * Start the periodic flush interval.
   * Call once after registering event sources.
   */
  start(): void {
    if (this.started) return;
    this.started = true;

    this.intervalHandle = setInterval(() => {
      if (this.eventBuffer.length > 0) {
        this.flush().catch((err) => console.error('[EpisodicCapture] flush error:', err));
      }

      // Clean up expired dedup entries
      const now = Date.now();
      for (const [key, val] of this.dedupSet.entries()) {
        if (now >= val.expiresAt) this.dedupSet.delete(key);
      }
    }, this.flushIntervalMs);
  }

  /**
   * Stop the flush interval and flush remaining events.
   */
  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }

    // Final flush
    if (this.eventBuffer.length > 0) {
      this.flush().catch((err) => console.error('[EpisodicCapture] final flush error:', err));
    }
    this.started = false;
  }

  /**
   * Flush the event buffer to MemoryStore.
   */
  async flush(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    const batch = this.eventBuffer.splice(0, this.eventBuffer.length);

    for (const event of batch) {
      const importance = scoreImportance(event);

      // Auto-extract topics from event type
      const topics = this.extractTopics(event);

      // Compose episodic content
      const content = this.formatEvent(event);

      const entry = this.remem.store(
        {
          content,
          topics,
          metadata: {
            ...event.metadata,
            captureEventId: event.id,
            captureEventType: event.type,
            importance,
            capturedAt: event.timestamp,
          },
        },
        this.layer
      );

      // Also store embedding if layer manager supports it
      if (
        this.remem.getLayerManager &&
        typeof entry.id === 'string'
      ) {
        // Embedding generation would happen async via EmbeddingService
        // This is fire-and-forget — non-blocking
        void this.generateEmbedding(entry.id, content).catch(() => {/* ignore */});
      }
    }
  }

  /**
   * Extract topics from event type and content.
   */
  private extractTopics(event: CaptureEvent): string[] {
    const topics: string[] = [event.type.split('.')[0]]; // e.g. 'user' from 'user.message'

    switch (event.type) {
      case 'decision':
        topics.push('decision');
        break;
      case 'learning':
        topics.push('learning');
        break;
      case 'goal.set':
      case 'goal.achieved':
        topics.push('goal');
        break;
      case 'identity.drift':
      case 'identity.correction':
        topics.push('identity', 'drift');
        break;
      case 'agent.error':
        topics.push('error');
        break;
      case 'user.message':
        topics.push('user-interaction');
        if ((event.metadata?.channel as string)?.includes('discord')) topics.push('discord');
        break;
      case 'session.compaction':
        topics.push('session', 'maintenance');
        break;
    }

    // Extract hashtags from content
    const hashtags = event.content.match(/#[a-zA-Z][\w-]*/g);
    if (hashtags) {
      topics.push(...hashtags.map((t: string) => t.slice(1).toLowerCase()));
    }

    return [...new Set(topics)]; // deduplicate
  }

  /**
   * Format an event into a human-readable episodic memory string.
   */
  private formatEvent(event: CaptureEvent): string {
    const ts = event.timestamp ? new Date(event.timestamp).toISOString().slice(0, 19).replace('T', ' ') : '';

    const metaStr = event.metadata
      ? Object.entries(event.metadata)
          .filter(([k]) => !['importance', 'capturedAt'].includes(k as string))
          .slice(0, 5)
          .map(([k, v]) => `${k}=${String(v).slice(0, 50)}`)
          .join(' ')
      : '';

    const importance = scoreImportance(event);
    const importanceLabel =
      importance >= 0.8 ? '🔴' :
      importance >= 0.6 ? '🟡' :
      importance >= 0.4 ? '🟢' : '⚪';

    return `[${event.type}] ${event.content}${metaStr ? ` (${metaStr})` : ''} ${importanceLabel} ${ts}`.trim();
  }

  /**
   * Generate embedding for a stored entry (async, non-blocking).
   * Returns early if no embedding service available.
   */
  private async generateEmbedding(_entryId: string, _content: string): Promise<void> {
    // This would call EmbeddingService.embed() if available
    // Non-blocking — we don't wait for it
    // In a full implementation, this would be wired through getLayerManager()
  }

  /**
   * Get capture statistics.
   */
  getStats(): {
    eventCount: number;
    droppedCount: number;
    bufferSize: number;
    started: boolean;
  } {
    return {
      eventCount: this.eventCount,
      droppedCount: this.droppedCount,
      bufferSize: this.eventBuffer.length,
      started: this.started,
    };
  }
}
