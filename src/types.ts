/**
 * ReMEM — Core Types
 * Recursive Memory for AI Agents
 */

import { z } from 'zod';

// ============================================================================
// Memory Entry Types
// ============================================================================

export const memoryEntrySchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  topics: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).default({}),
  createdAt: z.number(), // unix timestamp ms
  accessedAt: z.number(), // unix timestamp ms
  accessCount: z.number().default(0),
});

export type MemoryEntry = z.infer<typeof memoryEntrySchema>;

export const storeMemoryInputSchema = z.object({
  content: z.string().min(1),
  topics: z.array(z.string()).optional().default([]),
  metadata: z.record(z.unknown()).optional().default({}),
});

export type StoreMemoryInput = z.infer<typeof storeMemoryInputSchema>;

// ============================================================================
// Query Types
// ============================================================================

export const queryOptionsSchema = z.object({
  limit: z.number().min(1).max(100).default(10),
  topics: z.array(z.string()).optional(),
  minAccessCount: z.number().optional(),
  since: z.number().optional(), // unix timestamp ms
  until: z.number().optional(),
});

export type QueryOptions = z.infer<typeof queryOptionsSchema>;

export const queryResultSchema = z.object({
  id: z.string(),
  content: z.string(),
  topics: z.array(z.string()),
  relevanceScore: z.number().optional(),
  createdAt: z.number(),
  accessedAt: z.number(),
  accessCount: z.number(),
});

export type QueryResult = z.infer<typeof queryResultSchema>;

export const queryResponseSchema = z.object({
  results: z.array(queryResultSchema),
  totalAvailable: z.number(),
  query: z.string(),
  tookMs: z.number(),
});

export type QueryResponse = z.infer<typeof queryResponseSchema>;

// ============================================================================
// Model Abstraction Types
// ============================================================================

export const modelConfigSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('bankr'),
    apiKey: z.string().min(1),
    baseUrl: z.string().url().optional(),
  }),
  z.object({
    type: z.literal('openai'),
    apiKey: z.string().min(1),
    model: z.string().optional().default('gpt-4o'),
    baseUrl: z.string().url().optional(),
  }),
  z.object({
    type: z.literal('anthropic'),
    apiKey: z.string().min(1),
    model: z.string().optional().default('claude-sonnet-4-6'),
    baseUrl: z.string().url().optional(),
  }),
  z.object({
    type: z.literal('ollama'),
    baseUrl: z.string().url().default('http://localhost:11434'),
    model: z.string().default('llama3'),
  }),
]);

export type ModelConfig = z.infer<typeof modelConfigSchema>;

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  raw: unknown;
}

// ============================================================================
// Adapter Types
// ============================================================================

export interface Adapter {
  name: string;
  store(entry: MemoryEntry): Promise<void>;
  query(text: string, options?: QueryOptions): Promise<QueryResponse>;
  getRecent(n?: number): Promise<QueryResult[]>;
  getByTopic(topic: string, limit?: number): Promise<QueryResult[]>;
}

// ============================================================================
// ReMEM Config
// ============================================================================

export const embeddingConfigSchema = z.object({
  /** Enable vector embeddings for semantic search (default: false) */
  enabled: z.boolean().default(false),
  /** Ollama base URL (e.g. http://192.168.68.73:11434) */
  baseUrl: z.string().default('http://localhost:11434'),
  /** Embedding model to use (e.g. 'nomic-embed-text', 'mxbai-embed-large') */
  model: z.string().default('nomic-embed-text'),
  /** Embedding dimension (auto-detected on first embed if not set) */
  dimension: z.number().optional(),
  /** Whether to generate embeddings async in background (non-blocking store) */
  asyncEmbed: z.boolean().default(true),
});

export type EmbeddingConfig = z.infer<typeof embeddingConfigSchema>;

export const rememConfigSchema = z.object({
  storage: z.enum(['sqlite', 'postgres', 'memory']).default('sqlite'),
  storageConfig: z.record(z.unknown()).optional(),
  llm: modelConfigSchema.optional(),
  adapter: z.string().optional(),
  dbPath: z.string().optional(), // for sqlite
  embeddings: embeddingConfigSchema.optional(),
});

export type ReMEMConfig = z.infer<typeof rememConfigSchema>;

// ============================================================================
// Event Log Types
// ============================================================================

export const eventTypeSchema = z.enum([
  'memory.stored',
  'memory.queried',
  'memory.accessed',
  'memory.forgotten',
  'memory.superseded',
  'snapshot.created',
  'snapshot.restored',
  'identity.constitution_updated',
  'identity.drift_detected',
  'identity.drift_correction_injected',
]);

export type EventType = z.infer<typeof eventTypeSchema>;

export const memoryEventSchema = z.object({
  id: z.string().uuid(),
  type: eventTypeSchema,
  timestamp: z.number(),
  payload: z.record(z.unknown()),
});

export type MemoryEvent = z.infer<typeof memoryEventSchema>;

// ============================================================================
// Identity & Constitution Types
// ============================================================================

export const identityCategorySchema = z.enum(['values', 'boundaries', 'preferences', 'goals']);
export type IdentityCategory = z.infer<typeof identityCategorySchema>;

export const constitutionStatementSchema = z.object({
  id: z.string().uuid(),
  text: z.string().min(1),
  category: identityCategorySchema,
  weight: z.number().min(0).max(1).default(0.5),
  source: z.string().optional(), // e.g. 'SOUL.md', 'IDENTITY.md', 'manual'
  createdAt: z.number(),
});

export type ConstitutionStatement = z.infer<typeof constitutionStatementSchema>;

export const constitutionSchema = z.object({
  statements: z.array(constitutionStatementSchema),
  version: z.string().default('1.0'),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type Constitution = z.infer<typeof constitutionSchema>;

export const driftResultSchema = z.object({
  score: z.number().min(0).max(1),
  level: z.enum(['aligned', 'minor', 'moderate', 'critical']),
  violatingStatements: z.array(constitutionStatementSchema),
  reasoning: z.string(),
  detectedAt: z.number(),
});

export type DriftResult = z.infer<typeof driftResultSchema>;

export const identityConfigSchema = z.object({
  constitution: constitutionSchema.optional(),
  driftThreshold: z.number().min(0).max(1).default(0.3),
  criticalThreshold: z.number().min(0).max(1).default(0.7),
  autoInject: z.boolean().default(true),
  evalModel: modelConfigSchema.optional(), // separate eval model (local Ollama preferred for cost)
});

export type IdentityConfig = z.infer<typeof identityConfigSchema>;

// ============================================================================
// Hierarchical Memory Layer Types
// ============================================================================

export const memoryLayerSchema = z.enum(['episodic', 'semantic', 'identity', 'procedural']);
export type MemoryLayer = z.infer<typeof memoryLayerSchema>;

export const layerConfigSchema = z.object({
  episodic: z.object({
    ttlMs: z.number().default(3_600_000),    // 1 hour
    maxEntries: z.number().default(1000),
    weight: z.number().default(0.2),
  }),
  semantic: z.object({
    ttlMs: z.number().default(604_800_000),  // 7 days
    maxEntries: z.number().default(5000),
    weight: z.number().default(0.3),
    // Temporal self-edit options
    selfEdit: z.boolean().default(false),    // auto-supersede conflicting entries
    temporalValidity: z.boolean().default(true), // track validFrom/validUntil
  }),
  identity: z.object({
    ttlMs: z.number().default(2_592_000_000), // 30 days
    maxEntries: z.number().default(500),
    weight: z.number().default(0.5),
  }),
  procedural: z.object({
    ttlMs: z.number().default(2_592_000_000), // 30 days (long-term rules)
    maxEntries: z.number().default(500),
    weight: z.number().default(0.4),
    trigger: z.string().optional(),            // keyword that fires this rule
  }),
});

export type LayerConfig = z.infer<typeof layerConfigSchema>;

// Extended memory entry with layer info
export const layeredMemoryEntrySchema = memoryEntrySchema.extend({
  layer: memoryLayerSchema.default('episodic'),
  expiresAt: z.number().optional(),
  importance: z.number().min(0).max(1).default(0.5),
  // Temporal validity (semantic layer)
  validFrom: z.number().optional(),  // when this fact became true
  validUntil: z.number().optional(), // when this fact stopped being true (null = still valid)
  // Self-edit supersession chain
  supersedes: z.string().optional(),  // id of the entry this one supersedes (older version)
  supersededBy: z.string().optional(), // id of the entry that supersedes this one
});

export type LayeredMemoryEntry = z.infer<typeof layeredMemoryEntrySchema>;

// ============================================================================
// Identity Drift Event (stored in event log)
// ============================================================================

export const driftEventSchema = z.object({
  driftResult: driftResultSchema,
  correctionInjected: z.boolean().default(false),
  correctionText: z.string().optional(),
});

export type DriftEvent = z.infer<typeof driftEventSchema>;
