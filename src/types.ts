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

export const rememConfigSchema = z.object({
  storage: z.enum(['sqlite', 'postgres', 'memory']).default('sqlite'),
  storageConfig: z.record(z.unknown()).optional(),
  llm: modelConfigSchema.optional(),
  adapter: z.string().optional(),
  dbPath: z.string().optional(), // for sqlite
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
  'snapshot.created',
  'snapshot.restored',
]);

export type EventType = z.infer<typeof eventTypeSchema>;

export const memoryEventSchema = z.object({
  id: z.string().uuid(),
  type: eventTypeSchema,
  timestamp: z.number(),
  payload: z.record(z.unknown()),
});

export type MemoryEvent = z.infer<typeof memoryEventSchema>;
