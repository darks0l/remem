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

export const metadataFilterValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
export type MetadataFilterValue = z.infer<typeof metadataFilterValueSchema>;

export const metadataFilterOperatorSchema = z.object({
  eq: metadataFilterValueSchema.optional(),
  in: z.array(metadataFilterValueSchema).min(1).optional(),
  contains: z.union([z.string(), z.number(), z.boolean()]).optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  exists: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: 'Metadata operator filter must include at least one operator',
});

export type MetadataFilterOperator = z.infer<typeof metadataFilterOperatorSchema>;

export const metadataFilterSchema = z.union([metadataFilterValueSchema, metadataFilterOperatorSchema]);
export type MetadataFilter = z.infer<typeof metadataFilterSchema>;

export const queryOptionsSchema = z.object({
  limit: z.number().min(1).max(100).default(10),
  topics: z.array(z.string()).optional(),
  metadata: z.record(metadataFilterSchema).optional(),
  minAccessCount: z.number().optional(),
  since: z.number().optional(), // unix timestamp ms
  until: z.number().optional(),
});

export type QueryOptions = z.infer<typeof queryOptionsSchema>;

export const queryResultSchema = z.object({
  id: z.string(),
  content: z.string(),
  topics: z.array(z.string()),
  metadata: z.record(z.unknown()).default({}),
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
// Memory Link Types
// ============================================================================

export const defaultMemoryLinkTypes = [
  'about',
  'caused_by',
  'contradicts',
  'supports',
  'follows',
  'same_session',
  'same_project',
  'same_person',
] as const;

export const memoryLinkSchema = z.object({
  id: z.string().uuid(),
  fromId: z.string().uuid(),
  toId: z.string().uuid(),
  type: z.string().min(1),
  metadata: z.record(z.unknown()).default({}),
  createdAt: z.number(),
});

export type MemoryLink = z.infer<typeof memoryLinkSchema>;

export const memoryLinkInputSchema = z.object({
  fromId: z.string().uuid(),
  toId: z.string().uuid(),
  type: z.string().min(1),
  metadata: z.record(z.unknown()).optional().default({}),
});

export type MemoryLinkInput = z.infer<typeof memoryLinkInputSchema>;

export const linkedMemoryQueryOptionsSchema = z.object({
  direction: z.enum(['outgoing', 'incoming', 'both']).default('both'),
  types: z.array(z.string()).optional(),
  limit: z.number().min(1).max(100).default(20),
});

export type LinkedMemoryQueryOptions = z.infer<typeof linkedMemoryQueryOptionsSchema>;

export const queryWithNeighborsOptionsSchema = queryOptionsSchema.extend({
  hops: z.union([z.literal(1), z.literal(2)]).default(1),
  linkTypes: z.array(z.string()).optional(),
  includeBaseResults: z.boolean().default(true),
  neighborLimit: z.number().min(1).max(100).default(25),
  minNeighborScore: z.number().min(0).max(1).default(0.2),
  linkTypeWeights: z.record(z.number().min(0).max(2)).optional(),
  includePathDetails: z.boolean().default(false),
});

export type QueryWithNeighborsOptions = z.infer<typeof queryWithNeighborsOptionsSchema>;

export const neighborPathSchema = z.object({
  fromId: z.string(),
  toId: z.string(),
  throughId: z.string(),
  type: z.string(),
  hop: z.number().min(1),
  score: z.number().min(0).max(2),
});

export type NeighborPath = z.infer<typeof neighborPathSchema>;

export const smartRecallProfileSchema = z.enum(['fast', 'deep', 'agent-safe', 'ops-debug']);
export type SmartRecallProfile = z.infer<typeof smartRecallProfileSchema>;

export const smartRecallOptionsSchema = queryWithNeighborsOptionsSchema.extend({
  profile: smartRecallProfileSchema.default('fast'),
  includeProcedural: z.boolean().default(true),
  proceduralLimit: z.number().min(1).max(50).default(5),
  includeRecent: z.boolean().default(false),
  recentLimit: z.number().min(1).max(50).default(5),
});

export type SmartRecallOptions = z.infer<typeof smartRecallOptionsSchema>;

export const smartRecallResultSchema = queryResultSchema.extend({
  sourceLane: z.enum(['semantic', 'graph', 'procedural', 'recent']),
  reasons: z.array(z.string()).default([]),
  combinedScore: z.number(),
});

export type SmartRecallResult = z.infer<typeof smartRecallResultSchema>;

export const smartRecallResponseSchema = z.object({
  results: z.array(smartRecallResultSchema),
  totalAvailable: z.number(),
  query: z.string(),
  tookMs: z.number(),
  profile: smartRecallProfileSchema,
  lanes: z.object({
    semantic: z.number(),
    graph: z.number(),
    procedural: z.number(),
    recent: z.number(),
  }),
});

export type SmartRecallResponse = z.infer<typeof smartRecallResponseSchema>;

export const dreamMemoryLayerSchema = z.enum(['identity', 'semantic', 'procedural']);
export type DreamMemoryLayer = z.infer<typeof dreamMemoryLayerSchema>;

export const dreamOptionsSchema = z.object({
  query: z.string().default('What long-memory patterns matter most right now?'),
  layers: z.array(dreamMemoryLayerSchema).default(['identity', 'semantic', 'procedural']),
  limit: z.number().min(1).max(50).default(12),
  metadata: z.record(metadataFilterSchema).optional(),
  topicAllowlist: z.array(z.string()).optional(),
});

export type DreamOptions = z.infer<typeof dreamOptionsSchema>;

export const dreamResponseSchema = z.object({
  query: z.string(),
  title: z.string(),
  content: z.string(),
  themes: z.array(z.string()),
  actions: z.array(z.string()),
  sourceIds: z.array(z.string()),
  sourceLayers: z.array(dreamMemoryLayerSchema),
  sourceCount: z.number(),
  modelUsed: z.string().optional(),
  tookMs: z.number(),
});

export type DreamResponse = z.infer<typeof dreamResponseSchema>;

export const contextPackOptionsSchema = smartRecallOptionsSchema.extend({
  maxChars: z.number().min(500).max(50_000).default(6_000),
  includeDream: z.boolean().default(false),
  includeRecent: z.boolean().default(true),
  includeMetadata: z.boolean().default(false),
});

export type ContextPackOptions = z.infer<typeof contextPackOptionsSchema>;

export const contextPackSectionSchema = z.object({
  kind: z.enum(['overview', 'recall', 'recent', 'dream']),
  title: z.string(),
  content: z.string(),
  sourceIds: z.array(z.string()).default([]),
});

export type ContextPackSection = z.infer<typeof contextPackSectionSchema>;

export const contextPackResponseSchema = z.object({
  query: z.string(),
  profile: smartRecallProfileSchema,
  content: z.string(),
  sections: z.array(contextPackSectionSchema),
  sourceIds: z.array(z.string()),
  maxChars: z.number(),
  usedChars: z.number(),
  truncated: z.boolean(),
  tookMs: z.number(),
});

export type ContextPackResponse = z.infer<typeof contextPackResponseSchema>;

export const memoryHealthOptionsSchema = z.object({
  staleAgeMs: z.number().min(1).default(7 * 24 * 60 * 60 * 1000),
  maxSnapshotAgeMs: z.number().min(1).default(24 * 60 * 60 * 1000),
  minSnapshotMemories: z.number().min(1).default(10),
  maxUntaggedRatio: z.number().min(0).max(1).default(0.25),
  duplicateSampleLimit: z.number().min(1).max(50).default(10),
});

export type MemoryHealthOptions = z.input<typeof memoryHealthOptionsSchema>;

export const memoryHealthCheckSchema = z.object({
  name: z.string(),
  status: z.enum(['pass', 'warn', 'fail']),
  detail: z.string(),
  value: z.unknown().optional(),
  action: z.string().optional(),
  command: z.string().optional(),
});

export type MemoryHealthCheck = z.infer<typeof memoryHealthCheckSchema>;

export const memoryHealthRecommendationSchema = z.object({
  priority: z.enum(['low', 'medium', 'high']),
  action: z.string(),
  reason: z.string(),
  command: z.string().optional(),
});

export type MemoryHealthRecommendation = z.infer<typeof memoryHealthRecommendationSchema>;

export const memoryHealthResponseSchema = z.object({
  score: z.number().min(0).max(100),
  status: z.enum(['healthy', 'watch', 'attention']),
  checkedAt: z.number(),
  checks: z.array(memoryHealthCheckSchema),
  recommendations: z.array(memoryHealthRecommendationSchema),
  stats: z.object({
    coreCount: z.number(),
    layerCount: z.number(),
    snapshotCount: z.number(),
    eventCount: z.number(),
    duplicateGroups: z.number(),
    staleCount: z.number(),
    untaggedCount: z.number(),
  }),
});

export type MemoryHealthResponse = z.infer<typeof memoryHealthResponseSchema>;

export const namespaceInputSchema = z.union([
  z.string().min(1),
  z.array(z.string().min(1)).min(1),
]);

export type NamespaceInput = z.infer<typeof namespaceInputSchema>;

export const namespaceQueryScopeSchema = z.object({
  visibility: z.enum(['private', 'shared', 'all']).default('all'),
  includeDescendants: z.boolean().default(false),
});

export type NamespaceQueryScope = z.infer<typeof namespaceQueryScopeSchema>;

// ============================================================================
// External Knowledge / Code Graph Types
// ============================================================================

export const knowledgeNodeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).default('Node'),
  name: z.string().min(1).optional(),
  kind: z.string().min(1).optional(),
  content: z.string().optional(),
  summary: z.string().optional(),
  path: z.string().optional(),
  language: z.string().optional(),
  weight: z.number().min(0).max(2).optional(),
  metadata: z.record(z.unknown()).optional().default({}),
});

export type KnowledgeNode = z.infer<typeof knowledgeNodeSchema>;

export const knowledgeEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  type: z.string().min(1),
  weight: z.number().min(0).max(2).optional(),
  metadata: z.record(z.unknown()).optional().default({}),
});

export type KnowledgeEdge = z.infer<typeof knowledgeEdgeSchema>;

export const knowledgeGraphArtifactSchema = z.object({
  source: z.string().min(1).default('external-knowledge'),
  project: z.string().min(1).optional(),
  version: z.string().optional(),
  generatedAt: z.number().optional(),
  artifactPath: z.string().optional(),
  nodes: z.array(knowledgeNodeSchema).default([]),
  edges: z.array(knowledgeEdgeSchema).default([]),
  metadata: z.record(z.unknown()).optional().default({}),
});

export type KnowledgeGraphArtifact = z.infer<typeof knowledgeGraphArtifactSchema>;

export const knowledgeIngestOptionsSchema = z.object({
  source: z.string().min(1).optional(),
  project: z.string().min(1).optional(),
  namespace: namespaceInputSchema.optional(),
  visibility: z.enum(['private', 'shared']).default('shared'),
  topic: z.string().min(1).default('knowledge-graph'),
  linkTypePrefix: z.string().default('knowledge'),
});

export type KnowledgeIngestOptions = z.infer<typeof knowledgeIngestOptionsSchema>;

export const knowledgeIngestResultSchema = z.object({
  source: z.string(),
  project: z.string().optional(),
  namespace: z.string(),
  nodesStored: z.number(),
  edgesLinked: z.number(),
  skippedEdges: z.number(),
  nodeMemoryIds: z.record(z.string()),
});

export type KnowledgeIngestResult = z.infer<typeof knowledgeIngestResultSchema>;

export const knowledgeArtifactRegistrationSchema = z.object({
  source: z.string().min(1).default('external-knowledge'),
  project: z.string().min(1).optional(),
  artifactPath: z.string().min(1),
  format: z.string().min(1).default('json'),
  compression: z.string().min(1).optional(),
  checksum: z.string().optional(),
  generatedAt: z.number().optional(),
  metadata: z.record(z.unknown()).optional().default({}),
});

export type KnowledgeArtifactRegistration = z.infer<typeof knowledgeArtifactRegistrationSchema>;

export type KnowledgeArtifactRegistrationResult = {
  id: string;
  source: string;
  project?: string;
  artifactPath: string;
};

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

export const postgresStorageConfigSchema = z.object({
  connectionString: z.string().optional(),
  schema: z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/).optional(),
  tablePrefix: z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/).optional(),
  ssl: z.union([z.boolean(), z.record(z.unknown())]).optional(),
  pgvector: z.object({
    enabled: z.boolean().default(false),
    embeddingType: z.enum(['memory', 'layered', 'both']).default('memory'),
    ivfflatLists: z.number().min(1).max(5000).default(100),
  }).optional(),
  pool: z.unknown().optional(),
});

export type PostgresStorageConfig = z.infer<typeof postgresStorageConfigSchema>;

export const rememConfigSchema = z.object({
  storage: z.enum(['sqlite', 'postgres', 'memory']).default('sqlite'),
  storageConfig: z.record(z.unknown()).optional(),
  postgres: postgresStorageConfigSchema.optional(),
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
  'memory.linked',
  'memory.unlinked',
  'memory.superseded',
  'snapshot.created',
  'snapshot.restored',
  'storage.maintenance',
  'knowledge.ingested',
  'knowledge.artifact_registered',
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
  supersedes: z.string().nullish(),  // id of the entry this one supersedes (older version)
  supersededBy: z.string().nullish(), // id of the entry that supersedes this one
});

export type LayeredMemoryEntry = z.infer<typeof layeredMemoryEntrySchema>;

export const proceduralTriggerSchema = z.object({
  terms: z.array(z.string()).optional().default([]),
  phrases: z.array(z.string()).optional().default([]),
  topics: z.array(z.string()).optional().default([]),
  excludeTerms: z.array(z.string()).optional().default([]),
  regex: z.string().optional(),
  match: z.enum(['any', 'all']).default('any'),
  minScore: z.number().min(0).max(1).default(0.25),
  priority: z.number().min(0).max(1).default(0.5),
});

export type ProceduralTrigger = z.infer<typeof proceduralTriggerSchema>;

export const proceduralMatchSchema = z.object({
  entry: layeredMemoryEntrySchema,
  score: z.number().min(0).max(2),
  reasons: z.array(z.string()),
});

export type ProceduralMatch = z.infer<typeof proceduralMatchSchema>;

// ============================================================================
// Identity Drift Event (stored in event log)
// ============================================================================

export const driftEventSchema = z.object({
  driftResult: driftResultSchema,
  correctionInjected: z.boolean().default(false),
  correctionText: z.string().optional(),
});

export type DriftEvent = z.infer<typeof driftEventSchema>;

// ============================================================================
// Identity Package — Duplication & Infection Types
// ============================================================================

export const identityPackageSchema = z.object({
  version: z.string().default('1.0'),
  agentId: z.string().optional(),
  userId: z.string().optional(),
  exportedAt: z.number(),
  constitution: z.object({
    statements: z.array(constitutionStatementSchema),
    version: z.string().default('1.0'),
    createdAt: z.number(),
    updatedAt: z.number(),
  }),
  memories: z.array(layeredMemoryEntrySchema),
  soul: z.object({
    content: z.string(),
    source: z.string().optional(),
  }).optional(),
  identity: z.object({
    content: z.string(),
    source: z.string().optional(),
  }).optional(),
  metadata: z.record(z.unknown()).default({}),
});

export type IdentityPackage = z.infer<typeof identityPackageSchema>;

export const duplicationConfigSchema = z.object({
  /** DARKSOL server URL (e.g. https://api.darksol.net) */
  serverUrl: z.string().url(),
  /** API key for the server */
  apiKey: z.string().min(1),
  /** Include SOUL.md content in export */
  includeSoul: z.boolean().default(true),
  /** Include IDENTITY.md content in export */
  includeIdentity: z.boolean().default(true),
  /** Include all memory layers in export */
  includeAllLayers: z.boolean().default(true),
  /** Only include specific layers */
  layers: z.array(memoryLayerSchema).optional(),
  /** Custom agent/user ID for scoping */
  agentId: z.string().optional(),
  userId: z.string().optional(),
});

export type DuplicationConfig = z.infer<typeof duplicationConfigSchema>;

export const infectionConfigSchema = z.object({
  /** DARKSOL server URL */
  serverUrl: z.string().url(),
  /** API key for the server */
  apiKey: z.string().min(1),
  /** Source agent ID to infect FROM (optional — defaults to user\'s primary) */
  sourceAgentId: z.string().optional(),
  /** Identity package version to pull (optional — defaults to latest) */
  version: z.string().optional(),
  /** Auto-refresh interval in ms (0 = no auto-refresh) */
  refreshIntervalMs: z.number().default(0),
  /** Layers to apply from the package */
  layers: z.array(z.enum(['identity', 'semantic', 'procedural'])).default(['identity']),
});

export type InfectionConfig = z.infer<typeof infectionConfigSchema>;

export type DuplicateResult = {
  packageSizeBytes: number;
  memoryCount: number;
  constitutionStatements: number;
  exportedAt: number;
  serverUploadUrl?: string;
  serverUploadResponse?: unknown;
};

export type InfectionResult = {
  packageVersion: string;
  statementsLoaded: number;
  memoriesLoaded: number;
  layersApplied: string[];
  infectedAt: number;
  liveConnection: boolean;
};
